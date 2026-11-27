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

-- ---------------------------------------------------------------------
-- 12. Galerie photo (gérée par les administrateurs)
--     accueil = true : photo visible de tous, sur la page d'accueil (aucune personne reconnaissable)
--     accueil = false : photo réservée aux adhérents (onglet Galerie de l'espace membre)
-- ---------------------------------------------------------------------
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  legende text,
  album text,
  accueil boolean not null default false,
  ordre int not null default 100,
  cree_le timestamptz not null default now()
);
alter table public.photos enable row level security;
drop policy if exists photo_lecture on public.photos;
create policy photo_lecture on public.photos for select using (accueil or est_membre() or est_admin());
drop policy if exists photo_gestion on public.photos;
create policy photo_gestion on public.photos for all using (est_admin()) with check (est_admin());
grant select on public.photos to anon, authenticated;
grant insert, update, delete on public.photos to authenticated;

insert into public.photos (image_url, legende, album, accueil, ordre)
select * from (values
  ('https://framerusercontent.com/images/u24jE1XFwpIS1ZTudAPbwhz8.jpg', 'Jardin Majorelle', 'Voyages', true, 1),
  ('https://framerusercontent.com/images/Hhr8UCPbAO7x1jNY8RVDG6gGq5s.jpg', 'Madère', 'Voyages', true, 2),
  ('https://framerusercontent.com/images/iIVUFH0jRRuu4b6rtMNVIpdowu8.jpg', 'Agave', 'Collections', true, 3),
  ('https://framerusercontent.com/images/nNFsqvAFZ62Gc4uVcCCjZdkaQ.jpg', 'Cierge', 'Collections', true, 4),
  ('https://framerusercontent.com/images/3IFb9YLmwND3KZxWa42klDHQxF4.jpg', 'Epiphyllum', 'Collections', true, 5),
  ('https://framerusercontent.com/images/EiFCYebHOmQ4xh2kTo7DoCMPVY.jpg', 'Cactus', 'Voyages', true, 6)
) v(image_url, legende, album, accueil, ordre)
where not exists (select 1 from public.photos);

-- ---------------------------------------------------------------------
-- 13. Salon de discussion des adhérents (messages en direct)
-- ---------------------------------------------------------------------
create table if not exists public.discussion (
  id uuid primary key default gen_random_uuid(),
  email text not null default mon_email(),
  auteur text not null,
  texte text not null check (char_length(texte) between 1 and 1000),
  cree_le timestamptz not null default now()
);
create index if not exists discussion_date on public.discussion (cree_le desc);
alter table public.discussion enable row level security;
drop policy if exists discussion_lecture on public.discussion;
create policy discussion_lecture on public.discussion for select using (est_membre() or est_admin());
drop policy if exists discussion_ecriture on public.discussion;
create policy discussion_ecriture on public.discussion for insert with check ((est_membre() or est_admin()) and email = mon_email());
drop policy if exists discussion_suppression on public.discussion;
create policy discussion_suppression on public.discussion for delete using (email = mon_email() or est_admin());
grant select, insert, delete on public.discussion to authenticated;
alter table public.discussion replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.discussion;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 14. Billets : chaque inscription à un événement reçoit un numéro (QR code), contrôlé à l'entrée
-- ---------------------------------------------------------------------
alter table public.inscriptions add column if not exists billet text;
alter table public.inscriptions add column if not exists scanne_le timestamptz;
create unique index if not exists inscriptions_billet on public.inscriptions (billet) where billet is not null;

create or replace function public.code_billet() returns text
language plpgsql volatile as $$
declare a text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; c text := ''; i int;
begin
  for i in 1..8 loop c := c || substr(a, 1 + floor(random() * 32)::int, 1); end loop;
  return 'ACS-' || substr(c, 1, 4) || '-' || substr(c, 5, 4);
end $$;

create or replace function public.avant_inscription() returns trigger
language plpgsql as $$
begin
  if new.evenement_id is not null and new.billet is null then
    loop
      new.billet := code_billet();
      exit when not exists (select 1 from inscriptions where billet = new.billet);
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists inscription_billet on public.inscriptions;
create trigger inscription_billet before insert on public.inscriptions for each row execute function public.avant_inscription();

update public.inscriptions set billet = code_billet() where evenement_id is not null and billet is null;

-- Contrôle à l'entrée (administrateurs) : renvoie l'état du billet, et le marque « entré » si valider = true
create or replace function public.controler_billet(code text, valider boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r record; e record; n text; etat text;
begin
  if not est_admin() then return jsonb_build_object('etat', 'refuse'); end if;
  select * into r from inscriptions where billet = upper(trim(code));
  if not found then return jsonb_build_object('etat', 'inconnu'); end if;
  select titre, date_label into e from evenements where id = r.evenement_id;
  select nullif(trim(coalesce(prenom, '') || ' ' || coalesce(nom, '')), '') into n from adherents where lower(email) = lower(r.email) limit 1;
  etat := case when r.statut in ('abandonne', 'rembourse') then 'annule' when r.scanne_le is not null then 'deja' else 'ok' end;
  if valider and etat = 'ok' then update inscriptions set scanne_le = now() where id = r.id; end if;
  return jsonb_build_object('etat', etat, 'id', r.id, 'nom', coalesce(n, r.email), 'email', r.email, 'personnes', r.nb_personnes,
    'statut', r.statut, 'montant', r.montant, 'evenement', e.titre, 'date', e.date_label, 'billet', r.billet, 'scanne_le', r.scanne_le);
end $$;
revoke all on function public.controler_billet(text, boolean) from public, anon;
grant execute on function public.controler_billet(text, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- 15. Collection personnelle des adhérents (plantes, semis, rusticité, échanges)
-- ---------------------------------------------------------------------
create table if not exists public.plantes (
  id uuid primary key default gen_random_uuid(),
  email text not null default mon_email(),
  auteur text,
  espece text not null check (char_length(espece) between 1 and 200),
  genre text,
  type text,
  statut text not null default 'collection' check (statut in ('collection', 'semis')),
  code text,                -- n° d'inventaire personnel
  origine text,             -- pays, localité
  n_collecte text,          -- numéro de terrain (SB 127, L 1016…)
  reference text,           -- référence du lot de graines
  fournisseur text,         -- vendeur, producteur, donateur
  semis text,               -- date ou année du semis
  methode text,             -- sachet, terrine…
  nb_graines int check (nb_graines >= 0),
  nb_leves int check (nb_leves >= 0),
  nb_vivants int check (nb_vivants >= 0),
  acquis text,              -- date ou année d'acquisition
  rempotage text,
  exposition text,
  substrat int check (substrat between 1 and 6),
  t_min numeric(4,1),
  arrosage text,
  exemplaires int not null default 1 check (exemplaires >= 0),
  notes text check (char_length(notes) <= 2000),
  a_echanger boolean not null default false,
  graines_a_donner boolean not null default false,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
create index if not exists plantes_email on public.plantes (email);
create index if not exists plantes_echange on public.plantes (a_echanger, graines_a_donner) where a_echanger or graines_a_donner;
alter table public.plantes enable row level security;
drop policy if exists plante_lecture on public.plantes;
create policy plante_lecture on public.plantes for select using (email = mon_email() or est_admin());
drop policy if exists plante_ajout on public.plantes;
create policy plante_ajout on public.plantes for insert with check (email = mon_email() and (est_membre() or est_admin()));
drop policy if exists plante_modif on public.plantes;
create policy plante_modif on public.plantes for update using (email = mon_email()) with check (email = mon_email());
drop policy if exists plante_suppression on public.plantes;
create policy plante_suppression on public.plantes for delete using (email = mon_email());
grant select, insert, update, delete on public.plantes to authenticated;

create or replace function public.plante_maj() returns trigger language plpgsql as $$
begin new.modifie_le := now(); return new; end $$;
drop trigger if exists plante_maj on public.plantes;
create trigger plante_maj before update on public.plantes for each row execute function public.plante_maj();

-- Bourse d'échange : les plantes proposées par les autres adhérents.
-- L'adresse e-mail n'est donnée que si l'adhérent apparaît dans l'annuaire.
create or replace function public.echanges() returns table (
  id uuid, espece text, type text, statut text, origine text, n_collecte text, exemplaires int,
  a_echanger boolean, graines_a_donner boolean, auteur text, contact text, modifie_le timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.espece, p.type, p.statut, p.origine, p.n_collecte, p.exemplaires, p.a_echanger, p.graines_a_donner,
         coalesce(nullif(trim(concat_ws(' ', a.prenom, left(a.nom, 1) || '.')), '.'), p.auteur),
         case when a.annuaire then a.email end, p.modifie_le
  from plantes p join adherents a on a.email = p.email and a.actif
  where (p.a_echanger or p.graines_a_donner) and (est_membre() or est_admin())
  order by p.modifie_le desc
  limit 500
$$;
revoke all on function public.echanges() from public, anon;
grant execute on function public.echanges() to authenticated;

-- =====================================================================================
-- 16. Salon : demandes d'emplacement des exposants (formulaire public) et réglages
-- =====================================================================================
create table if not exists public.salon_reglages (
    edition int primary key,
    ouvert boolean not null default true,
    date_limite date,
    tarif_pro numeric(8,2),          -- contribution indicative par mètre linéaire
    tarif_amateur numeric(8,2),
    message text,                    -- texte affiché au-dessus du formulaire
    maj_le timestamptz not null default now()
);
alter table public.salon_reglages enable row level security;
drop policy if exists salon_reglages_lecture on public.salon_reglages;
create policy salon_reglages_lecture on public.salon_reglages for select using (true);
drop policy if exists salon_reglages_gestion on public.salon_reglages;
create policy salon_reglages_gestion on public.salon_reglages for all using (est_admin()) with check (est_admin());
insert into public.salon_reglages (edition, ouvert) values (2027, true) on conflict (edition) do nothing;

create table if not exists public.demandes_salon (
    id uuid primary key default gen_random_uuid(),
    cree_le timestamptz not null default now(),
    edition int not null,
    source text not null default 'en ligne' check (source in ('en ligne', 'papier')),
    profil text not null check (profil in ('Amateur', 'Professionnel')),
    nom text not null check (char_length(nom) between 2 and 120),
    contact text check (char_length(contact) <= 120),
    email text not null check (char_length(email) <= 160 and email like '%@%'),
    telephone text check (char_length(telephone) <= 40),
    ville text check (char_length(ville) <= 120),
    departement text check (char_length(departement) <= 3),
    siret text check (char_length(siret) <= 20),
    categorie text not null check (char_length(categorie) between 2 and 60),
    zone_1 text not null check (zone_1 in ('Petite salle', 'Entre les salles', 'Grande salle', 'Terrain de sport')),
    zone_2 text check (zone_2 in ('Petite salle', 'Entre les salles', 'Grande salle', 'Terrain de sport')),
    metres numeric(5,1) not null check (metres > 0 and metres <= 40),
    commentaire text check (char_length(commentaire) <= 1500),
    -- réservé au bureau
    statut text not null default 'nouvelle' check (statut in ('nouvelle', 'acceptee', 'attente', 'refusee', 'annulee')),
    zone_attribuee text check (zone_attribuee in ('Petite salle', 'Entre les salles', 'Grande salle', 'Terrain de sport')),
    metres_attribues numeric(5,1),
    stand text check (char_length(stand) <= 10),
    contribution numeric(8,2),
    paye boolean not null default false,
    note text check (char_length(note) <= 1500),
    maj_le timestamptz not null default now()
);
create index if not exists demandes_salon_edition on public.demandes_salon (edition, cree_le);
alter table public.demandes_salon enable row level security;
-- n'importe qui peut déposer une demande, sans toucher aux champs du bureau ; seuls les admins lisent et gèrent
drop policy if exists demande_depot on public.demandes_salon;
create policy demande_depot on public.demandes_salon for insert to anon, authenticated
    with check (statut = 'nouvelle' and source = 'en ligne' and zone_attribuee is null and metres_attribues is null and stand is null and contribution is null and paye = false and note is null
                and edition in (select edition from public.salon_reglages where ouvert));
drop policy if exists demande_gestion on public.demandes_salon;
create policy demande_gestion on public.demandes_salon for all using (est_admin()) with check (est_admin());
grant insert on public.demandes_salon to anon, authenticated;
grant select, update, delete on public.demandes_salon to authenticated;
grant select on public.salon_reglages to anon, authenticated;
grant insert, update, delete on public.salon_reglages to authenticated;
drop trigger if exists demandes_salon_maj on public.demandes_salon;
create or replace function public.demande_salon_maj() returns trigger language plpgsql as $$ begin new.maj_le := now(); return new; end $$;
create trigger demandes_salon_maj before update on public.demandes_salon for each row execute function public.demande_salon_maj();

-- ---------------------------------------------------------------------
-- 17. Campagnes d'adhésion : une ligne par année, affichée sur la page Adhésion
--     à partir de la date « ouverture » (1er décembre de l'année précédente par défaut)
-- ---------------------------------------------------------------------
create table if not exists public.campagnes_adhesion (
  id         uuid primary key default gen_random_uuid(),
  annee      int  not null unique check (annee between 2020 and 2100),
  ouverture  date not null,
  tarif      int  not null default 20 check (tarif between 0 and 1000),
  lien       text check (lien is null or lien ~ '^https://'),
  message    text check (message is null or length(message) <= 500),
  maj_le     timestamptz not null default now()
);
alter table public.campagnes_adhesion enable row level security;
drop policy if exists campagne_adh_lecture on public.campagnes_adhesion;
create policy campagne_adh_lecture on public.campagnes_adhesion for select using (true);
drop policy if exists campagne_adh_admin on public.campagnes_adhesion;
create policy campagne_adh_admin on public.campagnes_adhesion for all using (est_admin()) with check (est_admin());
grant select on public.campagnes_adhesion to anon, authenticated;
grant insert, update, delete on public.campagnes_adhesion to authenticated;
insert into public.campagnes_adhesion (annee, ouverture, tarif, lien) values
  (2026, '2025-12-01', 20, 'https://www.armorique-cactus-succulentes.com/collect/choice/649064-n-campagne-d-adhesion-2026'),
  (2027, '2026-12-01', 20, null)
on conflict (annee) do nothing;

-- ---------------------------------------------------------------------
-- 18. Salon : liste publique des exposants acceptés et dépliant en PDF
-- ---------------------------------------------------------------------
alter table public.salon_reglages add column if not exists liste_publiee boolean not null default false;
alter table public.salon_reglages add column if not exists depliant_url text check (depliant_url is null or depliant_url ~ '^https://');
alter table public.salon_reglages add column if not exists depliant_publie boolean not null default false;

-- Exposants acceptés de la dernière édition dont la liste est publiée.
-- Seuls les champs du dépliant sortent : jamais d'e-mail, de téléphone ni de SIRET.
-- Les amateurs sont nommés par leur prénom et l'initiale du nom, comme dans le dépliant.
create or replace function public.exposants_salon() returns table (
  edition int, stand text, zone text, nom text, dep text, categorie text, profil text)
language sql stable security definer set search_path = public as $$
  with r as (select s.edition from salon_reglages s where s.liste_publiee order by s.edition desc limit 1)
  select d.edition, d.stand, d.zone_attribuee,
         case when d.profil = 'Amateur' then regexp_replace(trim(d.nom), '^(\S+)\s+(\S).*$', '\1 \2.') else trim(d.nom) end,
         d.departement, d.categorie, d.profil
  from demandes_salon d join r on r.edition = d.edition
  where d.statut = 'acceptee' and d.zone_attribuee is not null
  order by d.zone_attribuee, nullif(regexp_replace(coalesce(d.stand, ''), '\D', '', 'g'), '')::int nulls last, d.nom
$$;
revoke all on function public.exposants_salon() from public;
grant execute on function public.exposants_salon() to anon, authenticated;

-- 19. Boutique : formats ou tailles d'un article (un par ligne : nom ; prix)
alter table public.produits add column if not exists variantes text;

-- 20. Galerie : petite version (800 px) de chaque photo pour les vignettes
alter table public.photos add column if not exists vignette_url text;

-- 21. Rappels de l'administration : bandeau en haut de l'admin, visible tant que ce n'est pas fait
create table if not exists public.rappels_admin (
  id           uuid primary key default gen_random_uuid(),
  titre        text not null check (length(titre) <= 200),
  details      text check (details is null or length(details) <= 2000),
  echeance     date,
  a_partir_du  date not null,
  chaque_annee boolean not null default false,
  fait         boolean not null default false,
  fait_le      timestamptz,
  cree_le      timestamptz not null default now()
);
alter table public.rappels_admin enable row level security;
drop policy if exists rappels_admin_gestion on public.rappels_admin;
create policy rappels_admin_gestion on public.rappels_admin for all using (est_admin()) with check (est_admin());
grant select, insert, update, delete on public.rappels_admin to authenticated;
insert into public.rappels_admin (titre, details, echeance, a_partir_du, chaque_annee)
select 'Renouveler la remise association de Framer (formule Basic)',
       'L''année gratuite de la formule Basic se termine le 22 novembre 2027. Répondre au fil d''e-mail avec Sam (support@framer.com) pour redemander une année gratuite, avec le justificatif de l''association (loi 1901). En attendant leur réponse, couper le renouvellement automatique dans Framer › Settings › Plans pour ne pas être prélevé.',
       '2027-11-22', '2027-10-22', true
where not exists (select 1 from public.rappels_admin where titre like 'Renouveler la remise association de Framer%');

-- =====================================================================================
-- 22. Salon : dates, planning des bénévoles (postes, créneaux, inscriptions) et rétroplanning
-- =====================================================================================
alter table public.salon_reglages add column if not exists date_debut date;
alter table public.salon_reglages add column if not exists date_fin date;
alter table public.salon_reglages add column if not exists planning_ouvert boolean not null default true;
update public.salon_reglages set date_debut = '2027-06-12', date_fin = '2027-06-13' where edition = 2027 and date_debut is null;

create or replace function public.mon_adherent_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from adherents where email = mon_email() and actif limit 1
$$;
grant execute on function public.mon_adherent_id() to authenticated;

-- Liste des postes, gardée d'une année sur l'autre
create table if not exists public.salon_postes (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null check (length(nom) between 2 and 80),
  description text check (description is null or length(description) <= 500),
  ordre       int not null default 0,
  actif       boolean not null default true
);
-- Créneaux d'une édition : un poste, un jour, une plage horaire, un nombre de places
create table if not exists public.salon_creneaux (
  id       uuid primary key default gen_random_uuid(),
  edition  int not null,
  poste_id uuid not null references public.salon_postes(id) on delete cascade,
  jour     date not null,
  debut    time not null,
  fin      time not null,
  places   int not null default 2 check (places between 1 and 50),
  note     text check (note is null or length(note) <= 300),
  cree_le  timestamptz not null default now()
);
create index if not exists salon_creneaux_edition on public.salon_creneaux (edition, jour, debut);
-- Inscriptions : un adhérent, ou le conjoint enregistré dans sa fiche (conjoint = true)
create table if not exists public.salon_benevoles (
  id          uuid primary key default gen_random_uuid(),
  creneau_id  uuid not null references public.salon_creneaux(id) on delete cascade,
  adherent_id uuid not null references public.adherents(id) on delete cascade,
  conjoint    boolean not null default false,
  cree_le     timestamptz not null default now(),
  unique (creneau_id, adherent_id, conjoint)
);
alter table public.salon_postes enable row level security;
alter table public.salon_creneaux enable row level security;
alter table public.salon_benevoles enable row level security;
drop policy if exists salon_postes_lecture on public.salon_postes;
create policy salon_postes_lecture on public.salon_postes for select using (est_membre());
drop policy if exists salon_postes_gestion on public.salon_postes;
create policy salon_postes_gestion on public.salon_postes for all using (est_admin()) with check (est_admin());
drop policy if exists salon_creneaux_lecture on public.salon_creneaux;
create policy salon_creneaux_lecture on public.salon_creneaux for select using (est_membre());
drop policy if exists salon_creneaux_gestion on public.salon_creneaux;
create policy salon_creneaux_gestion on public.salon_creneaux for all using (est_admin()) with check (est_admin());
drop policy if exists salon_benevoles_lecture on public.salon_benevoles;
create policy salon_benevoles_lecture on public.salon_benevoles for select using (est_membre());
-- un adhérent s'inscrit lui-même ou inscrit son conjoint (s'il est renseigné dans sa fiche) ; un admin inscrit qui il veut
drop policy if exists salon_benevoles_ajout on public.salon_benevoles;
create policy salon_benevoles_ajout on public.salon_benevoles for insert with check (
  est_admin() or (adherent_id = mon_adherent_id()
    and (not conjoint or exists (select 1 from adherents a where a.id = adherent_id and coalesce(trim(a.conjoint), '') <> ''))
    and exists (select 1 from salon_creneaux c join salon_reglages r on r.edition = c.edition where c.id = creneau_id and r.planning_ouvert)));
drop policy if exists salon_benevoles_retrait on public.salon_benevoles;
create policy salon_benevoles_retrait on public.salon_benevoles for delete using (est_admin() or adherent_id = mon_adherent_id());
grant select on public.salon_postes, public.salon_creneaux, public.salon_benevoles to authenticated;
grant insert, update, delete on public.salon_postes, public.salon_creneaux to authenticated;
grant insert, delete on public.salon_benevoles to authenticated;

-- créneau complet : refusé
create or replace function public.salon_benevole_places() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform 1 from salon_creneaux where id = new.creneau_id for update;
  if (select count(*) from salon_benevoles where creneau_id = new.creneau_id) >= (select places from salon_creneaux where id = new.creneau_id) then
    raise exception 'Ce créneau est complet.';
  end if;
  return new;
end $$;
drop trigger if exists salon_benevoles_places on public.salon_benevoles;
create trigger salon_benevoles_places before insert on public.salon_benevoles for each row execute function public.salon_benevole_places();

-- noms des inscrits, visibles des adhérents (prénom nom, ou nom du conjoint)
create or replace function public.planning_salon(ed int)
returns table (id uuid, creneau_id uuid, adherent_id uuid, conjoint boolean, nom text)
language sql stable security definer set search_path = public as $$
  select b.id, b.creneau_id, b.adherent_id, b.conjoint,
         case when b.conjoint then trim(a.conjoint) else trim(coalesce(a.prenom, '') || ' ' || coalesce(a.nom, '')) end
  from salon_benevoles b
  join salon_creneaux c on c.id = b.creneau_id
  join adherents a on a.id = b.adherent_id
  where c.edition = ed and est_membre()
  order by b.cree_le
$$;
revoke all on function public.planning_salon(int) from public, anon;
grant execute on function public.planning_salon(int) to authenticated;

-- Postes de départ (modifiables dans l'admin)
insert into public.salon_postes (nom, ordre)
select v.nom, v.ordre from (values
  ('Montage', 10), ('Implantation', 20), ('Manutention', 30), ('Accueil et caisse d''entrée', 40),
  ('Stand boutique ACS', 50), ('Buvette', 60), ('Distribution des repas', 70),
  ('Tombola : présentation et distribution', 80), ('Démontage', 90)) as v(nom, ordre)
where not exists (select 1 from public.salon_postes);

-- Rétroplanning de préparation (bureau) : chaque tâche est fixée « X semaines avant le salon »
create table if not exists public.salon_taches (
  id            uuid primary key default gen_random_uuid(),
  edition       int not null,
  titre         text not null check (length(titre) between 2 and 200),
  details       text check (details is null or length(details) <= 1000),
  semaines_avant int not null default 4 check (semaines_avant between -12 and 104),
  responsable   text check (responsable is null or length(responsable) <= 80),
  cle           boolean not null default false,
  fait          boolean not null default false,
  fait_le       timestamptz,
  cree_le       timestamptz not null default now()
);
alter table public.salon_taches enable row level security;
drop policy if exists salon_taches_gestion on public.salon_taches;
create policy salon_taches_gestion on public.salon_taches for all using (est_admin()) with check (est_admin());
grant select, insert, update, delete on public.salon_taches to authenticated;

-- Liste de départ pour 2027 (à adapter dans l'admin)
insert into public.salon_taches (edition, titre, semaines_avant, cle)
select 2027, v.titre, v.sem, v.cle from (values
  ('Confirmer la réservation de la salle avec la mairie', 36, true),
  ('Ouvrir les demandes des exposants sur le site', 26, true),
  ('Demander l''autorisation de buvette', 20, true),
  ('Vérifier l''assurance de l''association pour le salon', 16, false),
  ('Rassembler les lots de la tombola', 12, false),
  ('Relancer les exposants des années précédentes', 12, false),
  ('Préparer l''affiche et les flyers', 10, false),
  ('Ouvrir le planning des bénévoles aux adhérents', 8, true),
  ('Faire le plan d''implantation des stands', 6, true),
  ('Diffuser l''annonce (presse, réseaux, affichage)', 5, false),
  ('Clore les demandes et confirmer les emplacements', 4, true),
  ('Publier la liste des exposants et le dépliant', 3, false),
  ('Commander les repas et faire les courses de la buvette', 2, false),
  ('Imprimer le planning des bénévoles, préparer la caisse', 1, true),
  ('Bilan, remerciements et comptes du salon', -2, false)) as v(titre, sem, cle)
where not exists (select 1 from public.salon_taches where edition = 2027);

-- 23. Galerie : album (sous-dossier) dans chaque catégorie
alter table public.photos add column if not exists serie text check (serie is null or length(serie) <= 120);

-- 24. Accès aux pages du site : réservée aux adhérents ou ouverte à tous (réglé dans l'administration)
create table if not exists public.pages_acces (
  page    text primary key check (length(page) between 2 and 40),
  reserve boolean not null default true
);
alter table public.pages_acces enable row level security;
drop policy if exists pages_acces_lecture on public.pages_acces;
create policy pages_acces_lecture on public.pages_acces for select using (true);
drop policy if exists pages_acces_gestion on public.pages_acces;
create policy pages_acces_gestion on public.pages_acces for all using (est_admin()) with check (est_admin());
grant select on public.pages_acces to anon, authenticated;
grant insert, update, delete on public.pages_acces to authenticated;
insert into public.pages_acces (page, reserve) values ('boutique', true), ('semestriels', true) on conflict (page) do nothing;

-- 25. Agenda : les événements sont réservés aux adhérents par défaut (seuls les salons restent publics)
alter table public.evenements alter column reserve_membres set default true;

-- 26. Statistiques des campagnes e-mail (remontées de Brevo par la fonction « stats-emails »)
alter table public.campagnes add column if not exists stats jsonb;
create table if not exists public.campagne_suivi (
  campagne_id uuid not null references public.campagnes(id) on delete cascade,
  email       text not null,
  delivre     boolean not null default false,
  ouvert      boolean not null default false,
  clic        boolean not null default false,
  erreur      text,
  dernier     text,
  maj_le      timestamptz not null default now(),
  primary key (campagne_id, email)
);
alter table public.campagne_suivi enable row level security;
drop policy if exists campagne_suivi_admin on public.campagne_suivi;
create policy campagne_suivi_admin on public.campagne_suivi for all using (est_admin()) with check (est_admin());
grant select, insert, update, delete on public.campagne_suivi to authenticated;

-- 27. Groupes de destinataires des campagnes : bénévoles et exposants du salon, choix à la main
alter table public.campagnes add column if not exists edition int;         -- salon visé (groupes bénévoles / exposants)
alter table public.campagnes add column if not exists emails  text[];      -- cible « choix » : adresses cochées une à une
alter table public.campagnes drop constraint if exists campagnes_cible_check;
alter table public.campagnes add constraint campagnes_cible_check check (cible in
  ('tous', 'a_jour', 'retard', 'bureau', 'evenement', 'test', 'benevoles', 'non_benevoles', 'exposants', 'exposants_tous', 'choix'));

-- Logique commune : qui reçoit pour une cible donnée (sert aussi à afficher le nombre avant d'enregistrer)
create or replace function public.destinataires_cible(p_cible text, p_evenement uuid default null, p_edition int default null, p_emails text[] default null)
returns table (email text, prenom text)
language plpgsql stable security definer set search_path = public as $$
declare an int := extract(year from now())::int; ed int;
begin
  if not est_admin() then raise exception 'réservé aux administrateurs'; end if;
  ed := coalesce(p_edition, (select max(edition) from salon_reglages));
  if p_cible = 'test' then
    return query select a.email, a.prenom from adherents a where a.email = mon_email();
  elsif p_cible = 'evenement' then
    return query select distinct i.email, a.prenom from inscriptions i left join adherents a on a.email = i.email
      where i.evenement_id = p_evenement and i.statut in ('valide', 'en_attente');
  elsif p_cible in ('exposants', 'exposants_tous') then
    -- exposants (souvent non adhérents) : une adresse par demande, sans doublon
    return query select distinct on (lower(d.email)) d.email, null::text from demandes_salon d
      where d.edition = ed
        and (case when p_cible = 'exposants' then d.statut = 'acceptee' else d.statut not in ('refusee', 'annulee') end)
      order by lower(d.email);
  else
    return query select a.email, a.prenom from adherents a
      where a.actif and a.recoit_emails is not false
        and (p_cible = 'tous'
          or (p_cible = 'a_jour' and coalesce(a.cotisation_annee, 0) >= an)
          or (p_cible = 'retard' and coalesce(a.cotisation_annee, 0) < an)
          or (p_cible = 'bureau' and a.fonction_bureau is not null)
          or (p_cible = 'choix' and lower(a.email) = any (select lower(x) from unnest(coalesce(p_emails, '{}'::text[])) x))
          or (p_cible in ('benevoles', 'non_benevoles') and (p_cible = 'benevoles') = exists (
                select 1 from salon_benevoles b join salon_creneaux cr on cr.id = b.creneau_id
                where b.adherent_id = a.id and cr.edition = ed)));
  end if;
end $$;
grant execute on function public.destinataires_cible(text, uuid, int, text[]) to authenticated;

create or replace function public.destinataires(c uuid) returns table (email text, prenom text)
language plpgsql stable security definer set search_path = public as $$
declare k record;
begin
  if not est_admin() then raise exception 'réservé aux administrateurs'; end if;
  select * into k from campagnes where id = c;
  return query select * from destinataires_cible(k.cible, k.evenement_id, k.edition, k.emails);
end $$;
grant execute on function public.destinataires(uuid) to authenticated;


-- 28. (retiré le 23/11/2026 : les Actualités font doublon avec l'Agenda)
drop table if exists public.actualites;

-- 29. Salon : surface des stands en m² (la colonne « metres » contient désormais des m²) et tables de 0,80 × 1,80 m
comment on column public.demandes_salon.metres is 'surface demandée en m² (mètres linéaires jusqu''au salon 2026)';
comment on column public.demandes_salon.metres_attribues is 'surface attribuée en m²';
alter table public.demandes_salon add column if not exists tables smallint check (tables between 0 and 20);
alter table public.demandes_salon add column if not exists tables_attribuees smallint check (tables_attribuees between 0 and 20);
drop policy if exists demande_depot on public.demandes_salon;
create policy demande_depot on public.demandes_salon for insert to anon, authenticated
    with check (statut = 'nouvelle' and source = 'en ligne' and zone_attribuee is null and metres_attribues is null and tables_attribuees is null
                and stand is null and contribution is null and paye = false and note is null
                and edition in (select edition from public.salon_reglages where ouvert));

-- 30. Fiches producteurs du salon : un clic sur un exposant de la liste publique ouvre sa fiche
create table if not exists public.producteurs (
  id           uuid primary key default gen_random_uuid(),
  nom          text not null unique check (char_length(nom) between 2 and 120),   -- tel qu'il apparaît dans la liste des exposants
  specialites  text check (char_length(specialites) <= 200),
  ville        text check (char_length(ville) <= 120),
  departement  text check (char_length(departement) <= 3),
  presentation text check (char_length(presentation) <= 4000),
  site_web     text check (char_length(site_web) <= 300),
  photo_url    text,
  visible      boolean not null default true,
  maj_le       timestamptz not null default now()
);
alter table public.producteurs enable row level security;
drop policy if exists producteurs_lecture on public.producteurs;
create policy producteurs_lecture on public.producteurs for select using (visible or est_admin());
drop policy if exists producteurs_admin on public.producteurs;
create policy producteurs_admin on public.producteurs for all using (est_admin()) with check (est_admin());
grant select on public.producteurs to anon, authenticated;
grant insert, update, delete on public.producteurs to authenticated;

-- 31. Bibliothèque : index des meilleurs livres (réservé aux adhérents)
create table if not exists public.livres (
  id               uuid primary key default gen_random_uuid(),
  titre            text not null check (char_length(titre) between 2 and 200),
  auteurs          text check (char_length(auteurs) <= 200),
  editeur          text check (char_length(editeur) <= 120),
  annee            int check (annee between 1700 and 2100),
  pages            int check (pages between 1 and 20000),
  langue           text check (char_length(langue) <= 40),
  isbn             text check (char_length(isbn) <= 40),
  genres           text check (char_length(genres) <= 300),          -- familles et thèmes abordés, séparés par des virgules
  caracteristiques text check (char_length(caracteristiques) <= 2000),
  avis             text check (char_length(avis) <= 2000),           -- pourquoi on le recommande
  couverture_url   text,
  ordre            int not null default 100,
  cree_le          timestamptz not null default now()
);
alter table public.livres enable row level security;
drop policy if exists livres_lecture on public.livres;
create policy livres_lecture on public.livres for select using (est_membre() or est_admin());
drop policy if exists livres_admin on public.livres;
create policy livres_admin on public.livres for all using (est_admin()) with check (est_admin());
grant select, insert, update, delete on public.livres to authenticated;

insert into public.livres (titre, auteurs, editeur, annee, pages, langue, isbn, genres, caracteristiques, ordre)
select * from (values
  ('Taxonomie des Cactaceae (vol. 1 et 2)', 'Joël Lodé', 'Cactus-Aventures', 2015, 1436, 'Français', '978-84-617-2974-6',
   'Cactaceae, taxonomie, génétique (ADN)', 'Deux grands volumes A4 reliés et un index des synonymes. Classification des cactées fondée surtout sur la génétique moléculaire ; 2 360 espèces et sous-espèces, 9 500 photos. Les volumes 3 à 6 (2026) décrivent les espèces.', 10),
  ('Aizoaceae', 'Ernst van Jaarsveld', 'Ulmer', 2005, 239, 'Français', '978-2-84138-224-8',
   'Aizoaceae, ficoïdes, Afrique du Sud', 'Ouvrage relié consacré à la famille des Aizoaceae (ficoïdes). Épuisé, à chercher d’occasion.', 20),
  ('Lithops, joyaux du veld', 'Steven A. Hammer (trad. Mickaël Legrand)', 'Éditions Quæ', 2010, null, 'Français', '978-2-7592-0851-7',
   'Lithops, Aizoaceae, culture, Afrique australe', 'Édition française revue et augmentée de « Lithops, Treasures of the Veld ». Photographies de Christopher Barnhill, clé botanique de Jonathan Clark.', 30),
  ('Portraits de cactées', 'Rod et Ken Preston-Mafham', 'Ulmer', 2003, null, 'Français', '978-2-84138-213-2',
   'Cactaceae, cactées globulaires, identification', '1 094 espèces de cactées globulaires en couleur, avec nom scientifique, synonymes, dimensions, aiguillons, fleurs et répartition. Épuisé.', 40)
) v(titre, auteurs, editeur, annee, pages, langue, isbn, genres, caracteristiques, ordre)
where not exists (select 1 from public.livres);


-- 32. Comptabilité : plan comptable de l'association, écritures rattachées à un poste et à un compte de trésorerie,
--     budget prévisionnel par poste, soldes d'ouverture. Saisie réservée au trésorier, lecture pour tous les admins.
alter table public.adherents add column if not exists saisie_compta boolean not null default false;
create or replace function public.peut_saisir_compta() returns boolean
language sql stable security definer set search_path = public as $$
  select est_admin() and (
    exists (select 1 from adherents where email = mon_email() and saisie_compta)
    -- tant que personne n'a reçu le droit de saisie, tous les admins peuvent saisir
    or not exists (select 1 from adherents where saisie_compta and actif)
  )
$$;
grant execute on function public.peut_saisir_compta() to authenticated;

create table if not exists public.plan_comptable (
  compte   text primary key check (compte ~ '^[0-9]{3,8}$'),
  intitule text not null check (char_length(intitule) between 2 and 120),
  classe   int not null check (classe between 1 and 8),
  actif    boolean not null default true
);
alter table public.plan_comptable enable row level security;
drop policy if exists plan_lecture on public.plan_comptable;
create policy plan_lecture on public.plan_comptable for select using (est_admin());
drop policy if exists plan_saisie on public.plan_comptable;
create policy plan_saisie on public.plan_comptable for all using (peut_saisir_compta()) with check (peut_saisir_compta());
grant select, insert, update, delete on public.plan_comptable to authenticated;
insert into public.plan_comptable (compte, intitule, classe, actif) values
  ('110000', 'Report à nouveau excédentaire (solde créditeur)', 1, true),
  ('119000', 'Report à nouveau (solde débiteur)', 1, false),
  ('120000', 'Résultat de l''exercice (excédent)', 1, true),
  ('129000', 'Résultat de l''exercice (déficit)', 1, false),
  ('401000', 'Fournisseurs', 4, true),
  ('411000', 'Clients', 4, true),
  ('467000', 'Divers - comptes débiteurs et produits à recevoir', 4, true),
  ('511200', 'Chèques à encaisser', 5, true),
  ('512001', 'Banques - Compte Courant', 5, true),
  ('512002', 'Banques - Compte Paypal', 5, true),
  ('512003', 'Banques - Livret A', 5, true),
  ('512004', 'Banques - Zettle', 5, false),
  ('517001', 'Compte en ligne - Armorique cactus succulentes', 5, false),
  ('517002', 'Compte en ligne - Armorique cactus succulentes', 5, true),
  ('531001', 'Caisse - Caisse - Espèces', 5, true),
  ('580000', 'Virements internes', 5, true),
  ('601000', 'Achats de matières premières (ex : boissons, alimentation)', 6, false),
  ('601100', 'Achats pour Buvette Expo', 6, true),
  ('601200', 'Achats pour Repas Expo', 6, true),
  ('601300', 'Achats pour Repas A.G', 6, true),
  ('601400', 'Achats pour Réunion Asso', 6, true),
  ('604000', 'Achats de prestations de services', 6, false),
  ('604100', 'Frais de gardiennage', 6, true),
  ('606000', 'Achats non stockés de matières et fournitures', 6, false),
  ('606110', 'Frais de carburant', 6, true),
  ('606300', 'Petit matériel (<600€) ou fournitures pour activités', 6, true),
  ('606400', 'Fournitures administratives (ex : papeterie, fournitures bureau)', 6, true),
  ('606800', 'Achats pour Salon des plantes exotiques', 6, true),
  ('607000', 'Achat de marchandises revendues telles quelles (ex : T-shirts)', 6, false),
  ('607100', 'Achat d''Étiquettes', 6, false),
  ('607200', 'Achat de Chabasite', 6, true),
  ('607300', 'Achat de Gravier', 6, true),
  ('607400', 'Achat de Ponce', 6, true),
  ('607410', 'Achat de Perlite', 6, true),
  ('607420', 'Achat de Pouzzolane', 6, true),
  ('607500', 'Achat de Galettes saucisses', 6, false),
  ('607600', 'Achat de de Pots', 6, true),
  ('607700', 'Achat de Plantes', 6, true),
  ('607800', 'Achat T-shirt', 6, true),
  ('613000', 'Locations de matériel pour expo', 6, true),
  ('613100', 'Locations Logiciel AssoConnect', 6, true),
  ('613500', 'Locations de véhicules', 6, false),
  ('613510', 'Locations mobilières salle communale', 6, false),
  ('616000', 'Primes d''assurances (ex : assurances de l''association, responsabilité civile, incendie)', 6, true),
  ('618000', 'Divers', 6, false),
  ('618001', 'Evénement, donation, participation', 6, false),
  ('622000', 'Rémunérations d''intermédiaires et honoraires', 6, true),
  ('623000', 'Publicité, publications, relations publiques', 6, true),
  ('623801', 'Don Associatif', 6, true),
  ('625000', 'Déplacements, missions et réceptions', 6, true),
  ('625100', 'Voyages et déplacements', 6, true),
  ('625200', 'Traiteur repas A.G', 6, false),
  ('625300', 'Traiteur repas Expo vente Bédée', 6, true),
  ('625600', 'Sortie ACS et missions (Avec repas et déplacement)', 6, false),
  ('625700', 'Repas bénévole', 6, true),
  ('626000', 'Frais postaux et de télécommunications', 6, true),
  ('627000', 'Services bancaires CMB', 6, true),
  ('627100', 'Services bancaires commission CB Zettle', 6, false),
  ('627200', 'Services bancaires Commission Paypal', 6, true),
  ('628100', 'Remboursement de cautions', 6, false),
  ('628140', 'Tombola bénévoles', 6, true),
  ('654000', 'Pertes sur créances irrécouvrables', 6, true),
  ('658600', 'Cotisations versées aux associations', 6, false),
  ('701100', 'Ventes Buvette', 7, true),
  ('701120', 'Vente Magazine ACS', 7, true),
  ('701130', 'Vente cagettes', 7, true),
  ('702100', 'Vente de Tickets de Tombola', 7, true),
  ('706000', 'Ventes de prestations de services', 7, false),
  ('707000', 'Ventes de marchandises', 7, false),
  ('707100', 'Ventes de Plantes', 7, true),
  ('707101', 'Vente T-Shirt', 7, true),
  ('707102', 'Vente d''Engrais', 7, true),
  ('707200', 'Ventes de Chabasite', 7, true),
  ('707300', 'Ventes de Pots', 7, true),
  ('707400', 'Ventes d''Étiquettes', 7, true),
  ('707500', 'Ventes de Gravier', 7, true),
  ('707520', 'Vente de Pouzzolane', 7, true),
  ('707600', 'Ventes de Ponce', 7, true),
  ('707700', 'Ventes de Galettes saucisses', 7, false),
  ('707800', 'Reprise invendus', 7, true),
  ('708000', 'Produits des activités annexes', 7, false),
  ('708500', 'Frais de port sur vente facturées', 7, false),
  ('708800', 'Autres recettes d''activités', 7, true),
  ('708810', 'Participation Voyage', 7, false),
  ('708820', 'Ventes Repas Expo Bédée', 7, true),
  ('708830', 'Vente Repas', 7, false),
  ('709000', 'Rabais, remises et ristournes accordés par l''association', 7, false),
  ('740600', 'Subventions d''exploitation - Autres', 7, false),
  ('754000', 'Dons et Collectes', 7, true),
  ('756000', 'Adhésions', 7, true),
  ('758000', 'Produits divers de gestion courante', 7, true),
  ('760000', 'Produits financiers', 7, false),
  ('770000', 'Produits exceptionnels', 7, true),
  ('861000', 'Mise à disposition gratuite de biens', 8, true),
  ('870000', 'Dons en nature', 8, true),
  ('890000', 'Bilan', 8, false)
on conflict (compte) do nothing;

alter table public.ecritures add column if not exists compte text references public.plan_comptable(compte);   -- poste (classe 6 ou 7)
alter table public.ecritures add column if not exists tresorerie text references public.plan_comptable(compte); -- 512…, 531…, 511…
alter table public.ecritures add column if not exists tiers text check (char_length(tiers) <= 120);
alter table public.ecritures add column if not exists evenement text check (char_length(evenement) <= 80);       -- « Salon 2027 », « AG 2027 »…
alter table public.ecritures add column if not exists avance_par text check (char_length(avance_par) <= 120);    -- note de frais : qui a avancé
alter table public.ecritures add column if not exists rembourse boolean not null default false;
alter table public.ecritures add column if not exists pointe boolean not null default false;                     -- rapproché avec le relevé
drop policy if exists ecriture_admin on public.ecritures;
drop policy if exists ecriture_lecture on public.ecritures;
create policy ecriture_lecture on public.ecritures for select using (est_admin());
drop policy if exists ecriture_saisie on public.ecritures;
create policy ecriture_saisie on public.ecritures for all using (peut_saisir_compta()) with check (peut_saisir_compta());

create table if not exists public.budgets (
  exercice int not null,
  compte   text not null references public.plan_comptable(compte),
  montant  numeric(10,2) not null default 0,
  primary key (exercice, compte)
);
create table if not exists public.soldes_ouverture (
  exercice int not null,
  compte   text not null references public.plan_comptable(compte),
  montant  numeric(10,2) not null default 0,
  primary key (exercice, compte)
);
alter table public.budgets enable row level security;
alter table public.soldes_ouverture enable row level security;
drop policy if exists budgets_lecture on public.budgets;
create policy budgets_lecture on public.budgets for select using (est_admin());
drop policy if exists budgets_saisie on public.budgets;
create policy budgets_saisie on public.budgets for all using (peut_saisir_compta()) with check (peut_saisir_compta());
drop policy if exists soldes_lecture on public.soldes_ouverture;
create policy soldes_lecture on public.soldes_ouverture for select using (est_admin());
drop policy if exists soldes_saisie on public.soldes_ouverture;
create policy soldes_saisie on public.soldes_ouverture for all using (peut_saisir_compta()) with check (peut_saisir_compta());
grant select, insert, update, delete on public.budgets, public.soldes_ouverture to authenticated;
alter table public.ecritures drop constraint if exists ecritures_sens_check;
alter table public.ecritures add constraint ecritures_sens_check check (sens in ('recette', 'depense', 'virement'));

-- 33. Bibliothèque visible de tous (page Cultiver)
drop policy if exists livres_lecture on public.livres;
create policy livres_lecture on public.livres for select using (true);
grant select on public.livres to anon;

-- 34. Bibliothèque : 4 favoris affichés d'emblée, le reste en dépliant ; mots-clés limités aux plantes
alter table public.livres add column if not exists favori boolean not null default false;
comment on column public.livres.genres is 'genres et familles de plantes abordés, séparés par des virgules (servent de filtres)';
update public.livres set favori = true, ordre = 10, genres = 'Aizoaceae' where titre like 'Aizoaceae%';
update public.livres set favori = true, ordre = 20, genres = 'Aizoaceae, Lithops' where titre like 'Lithops%';
update public.livres set favori = true, ordre = 30, genres = 'Cactaceae' where titre like 'Taxonomie%';
update public.livres set favori = true, ordre = 40, genres = 'Cactaceae' where titre like 'Portraits%';

-- 35. Articles « Cultiver » ajoutés depuis l'administration, sur le modèle des guides (page /article#<slug>)
create table if not exists public.articles (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique,
  titre      text not null check (char_length(titre) between 2 and 160),
  source     text check (char_length(source) <= 120),        -- ex. « N°4 · Septembre 2026 · p. 6 »
  chapo      text check (char_length(chapo) <= 600),
  photo_url  text,
  corps      text not null default '' check (char_length(corps) <= 60000),
  photo2_url text, legende2 text check (char_length(legende2) <= 200),
  photo3_url text, legende3 text check (char_length(legende3) <= 200),
  ordre      int not null default 100,
  publie     boolean not null default false,
  cree_le    timestamptz not null default now()
);
create or replace function public.articles_slug() returns trigger language plpgsql as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := trim(both '-' from regexp_replace(lower(translate(new.titre,
      'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœæÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝŸŒÆ’''',
      'aaaaaaceeeeiiiinooooouuuuyyoaaaaaaaceeeeiiiinooooouuuuyyoa  ')), '[^a-z0-9]+', '-', 'g'));
    if exists (select 1 from public.articles where slug = new.slug and id <> new.id) then new.slug := new.slug || '-' || substr(new.id::text, 1, 4); end if;
  end if;
  return new;
end $$;
drop trigger if exists articles_slug on public.articles;
create trigger articles_slug before insert or update on public.articles for each row execute function public.articles_slug();
alter table public.articles enable row level security;
drop policy if exists articles_lecture on public.articles;
create policy articles_lecture on public.articles for select using (publie or est_admin());
drop policy if exists articles_admin on public.articles;
create policy articles_admin on public.articles for all using (est_admin()) with check (est_admin());
grant select on public.articles to anon, authenticated;
grant insert, update, delete on public.articles to authenticated;
