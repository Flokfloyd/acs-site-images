-- =====================================================================
-- ACS — Espace membre et gestion
-- Base Supabase (Postgres). À exécuter une fois dans : SQL Editor > New query
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Adhérents : la liste des e-mails autorisés à se connecter
-- ---------------------------------------------------------------------
create table if not exists public.adherents (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique check (email = lower(email)),
  prenom          text,
  nom             text,
  role            text not null default 'membre' check (role in ('membre', 'admin')),
  cotisation_annee int,            -- dernière année de cotisation réglée (ex. 2026)
  actif           boolean not null default true,
  cree_le         timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. Agenda
-- ---------------------------------------------------------------------
create table if not exists public.evenements (
  id          uuid primary key default gen_random_uuid(),
  date_debut  date,                 -- sert au tri ; vide = date à confirmer
  date_label  text not null,        -- texte affiché : « Juin 2027 », « Samedi 14 mars »
  titre       text not null,
  lieu        text,
  description text,
  reserve_membres boolean not null default false, -- visible seulement connecté
  publie      boolean not null default true,
  cree_le     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. Semestriels
-- ---------------------------------------------------------------------
create table if not exists public.semestriels (
  id            uuid primary key default gen_random_uuid(),
  numero        int  not null unique,
  date_label    text not null,          -- « Septembre 2026 »
  titre         text,
  resume        text,
  sommaire      jsonb not null default '[]'::jsonb,  -- [["Édito", 2], ["Echeveria", 6]]
  nb_pages      int  not null default 16,
  pages_base_url text,                  -- dossier des pages p-01.jpg, p-02.jpg…
  couverture_url text,
  pdf_url       text,
  reserve_membres boolean not null default false,  -- lecture complète réservée
  publie        boolean not null default false,
  cree_le       timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. Qui est connecté ? (fonctions utilisées par les règles d'accès)
-- ---------------------------------------------------------------------
create or replace function public.mon_email() returns text
language sql stable as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

create or replace function public.est_membre() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from adherents where email = mon_email() and actif)
$$;

create or replace function public.est_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from adherents where email = mon_email() and actif and role = 'admin')
$$;

-- ---------------------------------------------------------------------
-- Annuaire des adhérents (coordonnées + carte)
-- ---------------------------------------------------------------------
alter table public.adherents add column if not exists conjoint    text;
alter table public.adherents add column if not exists telephone   text;
alter table public.adherents add column if not exists adresse     text;   -- visible des seuls admins
alter table public.adherents add column if not exists code_postal text;
alter table public.adherents add column if not exists ville       text;
alter table public.adherents add column if not exists lat         double precision; -- centre de la commune
alter table public.adherents add column if not exists lon         double precision;
alter table public.adherents add column if not exists annuaire    boolean not null default true; -- apparaît dans l'annuaire

-- Ce que voit un adhérent connecté : nom, commune, e-mail, téléphone (jamais l'adresse postale)
create or replace function public.annuaire()
returns table (id uuid, prenom text, nom text, conjoint text, email text, telephone text, code_postal text, ville text, lat double precision, lon double precision)
language sql stable security definer set search_path = public as $$
  select id, prenom, nom, conjoint, email, telephone, code_postal, ville, lat, lon
  from adherents
  where actif and annuaire and est_membre()
  order by nom, prenom
$$;
revoke all on function public.annuaire() from public, anon;
grant execute on function public.annuaire() to authenticated;

-- Chaque adhérent choisit d'apparaître ou non dans l'annuaire
create or replace function public.choisir_annuaire(visible boolean)
returns void language sql security definer set search_path = public as $$
  update adherents set annuaire = visible where email = mon_email()
$$;
revoke all on function public.choisir_annuaire(boolean) from public, anon;
grant execute on function public.choisir_annuaire(boolean) to authenticated;

-- ---------------------------------------------------------------------
-- Espace personnel : bureau, profil, adhésions, inscriptions, dons, messages
-- ---------------------------------------------------------------------
alter table public.adherents add column if not exists fonction_bureau text;   -- « Président », « Secrétaire »… vide = pas au bureau
alter table public.adherents add column if not exists ordre_bureau    int;
alter table public.adherents add column if not exists email_bureau    text;   -- adresse de contact affichée, si différente
alter table public.adherents add column if not exists recoit_emails   boolean not null default true;

create table if not exists public.adhesions (
  id        uuid primary key default gen_random_uuid(),
  email     text not null,
  annee     int  not null,
  formule   text not null default 'Année complète',   -- « Année complète pour un couple »…
  montant   numeric(8,2) not null default 20,
  debut     date,
  fin       date,
  recu_url  text,
  source    text,                                     -- « HelloAsso », « Chèque », « Espèces au salon »…
  cree_le   timestamptz not null default now()
);
create table if not exists public.inscriptions (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  formulaire text not null,                           -- « Sortie du 16 mai », « Commande boutique »…
  montant    numeric(8,2) not null default 0,
  statut     text not null default 'valide' check (statut in ('valide', 'en_attente', 'abandonne', 'rembourse')),
  reference  text,                                    -- n° de transaction du prestataire de paiement
  detail     text,
  cree_le    timestamptz not null default now()
);
create table if not exists public.dons (
  id       uuid primary key default gen_random_uuid(),
  email    text not null,
  montant  numeric(8,2) not null,
  le       date not null default current_date,
  recu_url text,
  cree_le  timestamptz not null default now()
);
create table if not exists public.messages (
  id        uuid primary key default gen_random_uuid(),
  sujet     text not null,
  contenu   text not null,
  envoye_le timestamptz not null default now(),
  auteur    text,
  cree_le   timestamptz not null default now()
);

alter table public.adhesions    enable row level security;
alter table public.inscriptions enable row level security;
alter table public.dons         enable row level security;
alter table public.messages     enable row level security;

drop policy if exists adhesion_lecture on public.adhesions;
create policy adhesion_lecture on public.adhesions for select using (lower(email) = mon_email() or est_admin());
drop policy if exists adhesion_gestion on public.adhesions;
create policy adhesion_gestion on public.adhesions for all using (est_admin()) with check (est_admin());
drop policy if exists inscription_lecture on public.inscriptions;
create policy inscription_lecture on public.inscriptions for select using (lower(email) = mon_email() or est_admin());
drop policy if exists inscription_gestion on public.inscriptions;
create policy inscription_gestion on public.inscriptions for all using (est_admin()) with check (est_admin());
drop policy if exists don_lecture on public.dons;
create policy don_lecture on public.dons for select using (lower(email) = mon_email() or est_admin());
drop policy if exists don_gestion on public.dons;
create policy don_gestion on public.dons for all using (est_admin()) with check (est_admin());
-- Messages : conservés 2 ans pour les adhérents
drop policy if exists message_lecture on public.messages;
create policy message_lecture on public.messages for select using ((est_membre() and envoye_le > now() - interval '2 years') or est_admin());
drop policy if exists message_gestion on public.messages;
create policy message_gestion on public.messages for all using (est_admin()) with check (est_admin());

-- Une adhésion enregistrée met à jour l'année de cotisation de l'adhérent
create or replace function public.apres_adhesion() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update adherents set cotisation_annee = greatest(coalesce(cotisation_annee, 0), new.annee)
  where email = lower(new.email);
  return new;
end $$;
drop trigger if exists adhesion_cotisation on public.adhesions;
create trigger adhesion_cotisation after insert or update on public.adhesions
  for each row execute function public.apres_adhesion();

-- Le bureau, visible des adhérents connectés
create or replace function public.bureau()
returns table (prenom text, nom text, fonction text, email text, telephone text)
language sql stable security definer set search_path = public as $$
  select prenom, nom, fonction_bureau, coalesce(email_bureau, email), telephone
  from adherents where actif and fonction_bureau is not null and est_membre()
  order by ordre_bureau nulls last, nom
$$;
revoke all on function public.bureau() from public, anon;
grant execute on function public.bureau() to authenticated;

-- Chacun met à jour ses propres coordonnées et préférences (jamais son rôle ni sa cotisation)
create or replace function public.maj_profil(p jsonb)
returns void language sql security definer set search_path = public as $$
  update adherents set
    conjoint      = coalesce(p->>'conjoint', conjoint),
    telephone     = coalesce(p->>'telephone', telephone),
    adresse       = coalesce(p->>'adresse', adresse),
    code_postal   = coalesce(p->>'code_postal', code_postal),
    ville         = coalesce(p->>'ville', ville),
    lat           = coalesce((p->>'lat')::double precision, lat),
    lon           = coalesce((p->>'lon')::double precision, lon),
    annuaire      = coalesce((p->>'annuaire')::boolean, annuaire),
    recoit_emails = coalesce((p->>'recoit_emails')::boolean, recoit_emails)
  where email = mon_email()
$$;
revoke all on function public.maj_profil(jsonb) from public, anon;
grant execute on function public.maj_profil(jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Règles d'accès (RLS) : appliquées par la base, pas seulement par l'écran
-- ---------------------------------------------------------------------
alter table public.adherents  enable row level security;
alter table public.evenements enable row level security;
alter table public.semestriels enable row level security;

-- Adhérents : chacun voit sa fiche, les admins voient et gèrent tout
drop policy if exists adh_lecture on public.adherents;
create policy adh_lecture on public.adherents for select
  using (email = mon_email() or est_admin());
drop policy if exists adh_gestion on public.adherents;
create policy adh_gestion on public.adherents for all
  using (est_admin()) with check (est_admin());

-- Agenda : public si publié (et non réservé), membres pour le réservé, admins tout
drop policy if exists evt_lecture on public.evenements;
create policy evt_lecture on public.evenements for select
  using ((publie and (not reserve_membres or est_membre())) or est_admin());
drop policy if exists evt_gestion on public.evenements;
create policy evt_gestion on public.evenements for all
  using (est_admin()) with check (est_admin());

-- Semestriels : idem
drop policy if exists sem_lecture on public.semestriels;
create policy sem_lecture on public.semestriels for select
  using (publie or est_admin());
drop policy if exists sem_gestion on public.semestriels;
create policy sem_gestion on public.semestriels for all
  using (est_admin()) with check (est_admin());

-- ---------------------------------------------------------------------
-- 6. Connexion réservée aux adhérents
--    Refuse la création d'un compte si l'e-mail n'est pas dans la liste.
--    À brancher dans : Authentication > Hooks > « Before User Created »
-- ---------------------------------------------------------------------
create or replace function public.hook_avant_creation(event jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e text := lower(event -> 'user' ->> 'email');
begin
  if exists (select 1 from adherents where email = e and actif) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403,
    'message', 'Cette adresse ne figure pas dans la liste des adhérents.'));
end $$;
grant execute on function public.hook_avant_creation(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_avant_creation(jsonb) from authenticated, anon, public;
grant select on public.adherents to supabase_auth_admin;

-- ---------------------------------------------------------------------
-- 7. Stockage des fichiers (couvertures, pages, PDF)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('semestriels', 'semestriels', true)
on conflict (id) do nothing;

drop policy if exists sem_fichiers_admin on storage.objects;
create policy sem_fichiers_admin on storage.objects for all
  using (bucket_id = 'semestriels' and public.est_admin())
  with check (bucket_id = 'semestriels' and public.est_admin());

-- ---------------------------------------------------------------------
-- 8. Données de départ (reprend le contenu actuel du site)
-- ---------------------------------------------------------------------
insert into public.evenements (date_debut, date_label, titre, lieu, description) values
  ('2027-06-01', 'Juin 2027', 'Salon de l’A.C.S. à Bédée', 'Bédée (35)', 'Date à confirmer · environ 40 exposants'),
  (null, 'À venir', 'Prochaine assemblée générale et réunions', null, 'Dates communiquées dans le semestriel')
on conflict do nothing;

insert into public.semestriels (numero, date_label, sommaire, pages_base_url, couverture_url, publie) values
  (1, 'Mars 2025', '[["Salon",4],["Programme",5],["Débuter",6],["Histoire d’une passion",7],["Étiquetage",8],["Astrophytum",11],["Pleiospilos",12],["Espagne",13],["AG",15]]',
     'https://raw.githubusercontent.com/Flokfloyd/acs-site-images/main/4-pages/n1/', 'https://raw.githubusercontent.com/Flokfloyd/acs-site-images/main/1-couvertures/couverture-n1.jpg', true),
  (2, 'Juillet 2025', '[["Salon",4],["Yannick",7],["Substrats",9],["Aeonium d’Arabie",12],["Agenda",16]]',
     'https://raw.githubusercontent.com/Flokfloyd/acs-site-images/main/4-pages/n2/', 'https://raw.githubusercontent.com/Flokfloyd/acs-site-images/main/1-couvertures/couverture-n2.jpg', true),
  (3, 'Février 2026', '[["Epiphyllum",4],["Semis",7],["Caisson",9],["Madère",10],["AG / agenda",16]]',
     'https://raw.githubusercontent.com/Flokfloyd/acs-site-images/main/4-pages/n3/', 'https://raw.githubusercontent.com/Flokfloyd/acs-site-images/main/1-couvertures/couverture-n3.jpg', true),
  (4, 'Septembre 2026', '[["Édito",2],["Printemps",4],["Echeveria",6],["Ouest américain",9],["Majorelle",12],["Bilan du salon",15],["Gerrardanthus",16]]',
     'https://raw.githubusercontent.com/Flokfloyd/acs-site-images/main/4-pages/n4/', 'https://raw.githubusercontent.com/Flokfloyd/acs-site-images/main/1-couvertures/couverture-n4.jpg', true)
on conflict (numero) do nothing;

-- Premier administrateur : remplacer l'adresse puis exécuter
-- insert into public.adherents (email, prenom, role, cotisation_annee)
-- values ('votre.adresse@exemple.fr', 'Prénom', 'admin', 2026);

-- ---------------------------------------------------------------------
-- 7. Droits d'accès du site (les nouveaux projets Supabase ne les donnent plus par défaut).
--    Les règles RLS ci-dessus limitent ensuite ce que chacun voit.
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on public.evenements, public.semestriels to anon;
grant select, insert, update, delete on public.adherents, public.adhesions, public.inscriptions, public.dons, public.messages, public.evenements, public.semestriels to authenticated;
grant execute on function public.mon_email(), public.est_membre(), public.est_admin() to anon, authenticated;

-- ---------------------------------------------------------------------
-- 8. Inscriptions aux événements de l'agenda
-- ---------------------------------------------------------------------
alter table public.evenements   add column if not exists inscription_ouverte boolean not null default false;
alter table public.evenements   add column if not exists prix   numeric(8,2) not null default 0;   -- par personne
alter table public.evenements   add column if not exists places int;                               -- vide = illimité
alter table public.inscriptions add column if not exists evenement_id uuid references public.evenements(id) on delete set null;
alter table public.inscriptions add column if not exists nb_personnes int not null default 1;

-- Nombre d'inscrits par événement (visible des adhérents)
create or replace function public.places_prises(evt uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(nb_personnes), 0)::int from inscriptions where evenement_id = evt and statut in ('valide', 'en_attente')
$$;
grant execute on function public.places_prises(uuid) to authenticated;

-- S'inscrire (ou modifier le nombre de personnes)
create or replace function public.s_inscrire(evt uuid, nb int, note text default null) returns text
language plpgsql security definer set search_path = public as $$
declare e record; deja int; libres int;
begin
  if not est_membre() then return 'Réservé aux adhérents.'; end if;
  select * into e from evenements where id = evt and publie and inscription_ouverte;
  if not found then return 'Les inscriptions ne sont pas ouvertes.'; end if;
  if nb < 1 or nb > 10 then return 'Nombre de personnes invalide.'; end if;
  select coalesce(sum(nb_personnes), 0) into deja from inscriptions where evenement_id = evt and email = mon_email() and statut in ('valide', 'en_attente');
  if e.places is not null then
    libres := e.places - places_prises(evt) + deja;
    if nb > libres then return 'Plus assez de places (' || greatest(libres, 0) || ' restante(s)).'; end if;
  end if;
  delete from inscriptions where evenement_id = evt and email = mon_email() and statut in ('valide', 'en_attente');
  insert into inscriptions (email, formulaire, montant, statut, evenement_id, nb_personnes, detail)
  values (mon_email(), e.titre || ' · ' || e.date_label, e.prix * nb, case when e.prix > 0 then 'en_attente' else 'valide' end, evt, nb, note);
  return 'ok';
end $$;
grant execute on function public.s_inscrire(uuid, int, text) to authenticated;

create or replace function public.se_desinscrire(evt uuid) returns void
language sql security definer set search_path = public as $$
  update inscriptions set statut = 'abandonne' where evenement_id = evt and email = mon_email() and statut in ('valide', 'en_attente')
$$;
grant execute on function public.se_desinscrire(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 9. Administration : agenda étendu, boutique, comptabilité, campagnes e-mail
-- ---------------------------------------------------------------------
alter table public.evenements add column if not exists date_fin date;   -- événement sur plusieurs jours
alter table public.evenements add column if not exists heure text;      -- « 14 h », « 9 h – 18 h »

create table if not exists public.produits (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null,
  categorie   text,                 -- Tee-shirts, Substrats, Engrais…
  prix        numeric(8,2) not null default 0,
  description text,
  image_url   text,
  stock       int,                  -- vide = non suivi
  actif       boolean not null default true,
  ordre       int not null default 0,
  cree_le     timestamptz not null default now()
);
alter table public.produits enable row level security;
drop policy if exists produit_lecture on public.produits;
create policy produit_lecture on public.produits for select using (actif or est_admin());
drop policy if exists produit_gestion on public.produits;
create policy produit_gestion on public.produits for all using (est_admin()) with check (est_admin());
grant select on public.produits to anon;
grant select, insert, update, delete on public.produits to authenticated;

create table if not exists public.ecritures (
  id        uuid primary key default gen_random_uuid(),
  le        date not null default current_date,
  sens      text not null default 'depense' check (sens in ('recette', 'depense')),
  libelle   text not null,
  categorie text,                   -- Salon, Semestriel, Boutique, Frais bancaires…
  montant   numeric(10,2) not null check (montant >= 0),
  moyen     text,                   -- Chèque, Espèces, Virement, Carte
  piece_url text,                   -- justificatif
  note      text,
  cree_le   timestamptz not null default now()
);
alter table public.ecritures enable row level security;
drop policy if exists ecriture_admin on public.ecritures;
create policy ecriture_admin on public.ecritures for all using (est_admin()) with check (est_admin());
grant select, insert, update, delete on public.ecritures to authenticated;

create table if not exists public.campagnes (
  id            uuid primary key default gen_random_uuid(),
  sujet         text not null,
  contenu       text not null,
  cible         text not null default 'tous' check (cible in ('tous', 'a_jour', 'retard', 'bureau', 'evenement', 'test')),
  evenement_id  uuid references public.evenements(id) on delete set null,
  dans_espace   boolean not null default true,  -- copie dans « Messages » de l'espace membre
  statut        text not null default 'brouillon' check (statut in ('brouillon', 'envoyee', 'erreur')),
  envoyee_le    timestamptz,
  nb_envois     int,
  erreur        text,
  auteur        text,
  cree_le       timestamptz not null default now()
);
alter table public.campagnes enable row level security;
drop policy if exists campagne_admin on public.campagnes;
create policy campagne_admin on public.campagnes for all using (est_admin()) with check (est_admin());
grant select, insert, update, delete on public.campagnes to authenticated;

-- Destinataires d'une campagne (utilisé par la fonction d'envoi, admins seulement)
create or replace function public.destinataires(c uuid) returns table (email text, prenom text)
language plpgsql stable security definer set search_path = public as $$
declare k record; an int := extract(year from now())::int;
begin
  if not est_admin() then raise exception 'réservé aux administrateurs'; end if;
  select * into k from campagnes where id = c;
  if k.cible = 'test' then
    return query select a.email, a.prenom from adherents a where a.email = mon_email();
  elsif k.cible = 'evenement' then
    return query select distinct i.email, a.prenom from inscriptions i left join adherents a on a.email = i.email
      where i.evenement_id = k.evenement_id and i.statut in ('valide', 'en_attente');
  else
    return query select a.email, a.prenom from adherents a
      where a.actif and a.recoit_emails is not false
        and (k.cible = 'tous'
          or (k.cible = 'a_jour' and coalesce(a.cotisation_annee, 0) >= an)
          or (k.cible = 'retard' and coalesce(a.cotisation_annee, 0) < an)
          or (k.cible = 'bureau' and a.fonction_bureau is not null));
  end if;
end $$;
grant execute on function public.destinataires(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 10. Codes personnels de connexion (mot de passe Supabase géré par la fonction « codes »)
-- ---------------------------------------------------------------------
alter table public.adherents add column if not exists code_envoye_le timestamptz;

-- ---------------------------------------------------------------------
-- 11. Sondages (créés par les admins, ouverts aux adhérents)
-- questions : [{ id, intitule, type: 'unique'|'multiple'|'nombre'|'texte', options: [..], obligatoire }]
-- ---------------------------------------------------------------------
create table if not exists public.sondages (
  id                 uuid primary key default gen_random_uuid(),
  titre              text not null,
  description        text,
  questions          jsonb not null default '[]'::jsonb,
  evenement_id       uuid references public.evenements(id) on delete set null,
  ouvert             boolean not null default false,
  cloture_le         date,                      -- dernier jour pour répondre (inclus)
  resultats_visibles boolean not null default false,  -- les adhérents voient les totaux
  auteur             text,
  cree_le            timestamptz not null default now()
);
create table if not exists public.reponses (
  id         uuid primary key default gen_random_uuid(),
  sondage_id uuid not null references public.sondages(id) on delete cascade,
  email      text not null,
  valeurs    jsonb not null default '{}'::jsonb,   -- { question_id: valeur }
  cree_le    timestamptz not null default now(),
  maj_le     timestamptz not null default now(),
  unique (sondage_id, email)
);
alter table public.sondages enable row level security;
alter table public.reponses enable row level security;

create or replace function public.sondage_ouvert(s uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from sondages where id = s and ouvert and (cloture_le is null or cloture_le >= current_date))
$$;

drop policy if exists sondage_lecture on public.sondages;
create policy sondage_lecture on public.sondages for select using ((ouvert and est_membre()) or est_admin());
drop policy if exists sondage_gestion on public.sondages;
create policy sondage_gestion on public.sondages for all using (est_admin()) with check (est_admin());

drop policy if exists reponse_lecture on public.reponses;
create policy reponse_lecture on public.reponses for select using (email = mon_email() or est_admin());
drop policy if exists reponse_ajout on public.reponses;
create policy reponse_ajout on public.reponses for insert with check (email = mon_email() and est_membre() and sondage_ouvert(sondage_id));
drop policy if exists reponse_modif on public.reponses;
create policy reponse_modif on public.reponses for update using (email = mon_email() and sondage_ouvert(sondage_id)) with check (email = mon_email());
drop policy if exists reponse_admin on public.reponses;
create policy reponse_admin on public.reponses for delete using (est_admin() or (email = mon_email() and sondage_ouvert(sondage_id)));

grant select, insert, update, delete on public.sondages, public.reponses to authenticated;
grant execute on function public.sondage_ouvert(uuid) to authenticated;

-- Totaux d'un sondage (sans les réponses libres, sans les noms) pour les adhérents si le bureau les rend visibles
create or replace function public.resultats_sondage(s uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare so record; q jsonb; res jsonb := '{}'::jsonb; t jsonb;
begin
  select * into so from sondages where id = s;
  if not found then return null; end if;
  if not (est_admin() or (est_membre() and so.resultats_visibles)) then raise exception 'résultats non publiés'; end if;
  for q in select * from jsonb_array_elements(so.questions) loop
    if q->>'type' in ('unique', 'multiple') then
      select coalesce(jsonb_object_agg(v, n), '{}'::jsonb) into t from (
        select v, count(*) n from reponses r,
          lateral jsonb_array_elements_text(case jsonb_typeof(r.valeurs->(q->>'id')) when 'array' then r.valeurs->(q->>'id') when 'string' then jsonb_build_array(r.valeurs->(q->>'id')) else '[]'::jsonb end) v
        where r.sondage_id = s group by v) x;
    elsif q->>'type' = 'nombre' then
      select jsonb_build_object('total', coalesce(sum(replace(r.valeurs->>(q->>'id'), ',', '.')::numeric), 0), 'reponses', count(*)) into t
      from reponses r where r.sondage_id = s and (r.valeurs->>(q->>'id')) ~ '^[0-9]+([.,][0-9]+)?$';
    else
      select jsonb_build_object('reponses', count(*)) into t from reponses r where r.sondage_id = s and coalesce(r.valeurs->>(q->>'id'), '') <> '';
    end if;
    res := res || jsonb_build_object(q->>'id', t);
  end loop;
  return jsonb_build_object('participants', (select count(*) from reponses where sondage_id = s), 'questions', res);
end $$;
grant execute on function public.resultats_sondage(uuid) to authenticated;
