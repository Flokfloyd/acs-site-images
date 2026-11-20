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
