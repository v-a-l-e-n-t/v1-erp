-- 1. Créer la table agents
create table if not exists public.agents (
  id uuid default gen_random_uuid() primary key,
  nom text not null,
  prenom text not null,
  role text not null check (role in ('chef_ligne', 'chef_quart', 'agent_exploitation', 'agent_mouvement')),
  actif boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Activer RLS avec politique permissive
alter table public.agents enable row level security;

create policy "Enable all access for all users" on public.agents for all using (true) with check (true);

-- 3. Migrer les Chefs de ligne existants
insert into public.agents (nom, prenom, role)
select nom, prenom, 'chef_ligne'
from public.chefs_ligne
where not exists (select 1 from public.agents where agents.nom = chefs_ligne.nom and agents.prenom = chefs_ligne.prenom);

-- 4. Migrer les Chefs de quart existants
insert into public.agents (nom, prenom, role)
select nom, prenom, 'chef_quart'
from public.chefs_quart
where not exists (select 1 from public.agents where agents.nom = chefs_quart.nom and agents.prenom = chefs_quart.prenom);

-- 5. Migrer les Agents d'Exploitation (depuis table bilan_entries)
insert into public.agents (nom, prenom, role)
select distinct
  split_part(trim(agent_name), ' ', 1) as nom,
  coalesce(nullif(substring(trim(agent_name) from position(' ' in trim(agent_name)) + 1), ''), '-') as prenom,
  'agent_exploitation'
from (
  select agent_exploitation_matin as agent_name from public.bilan_entries where agent_exploitation_matin is not null and agent_exploitation_matin != ''
  union
  select agent_exploitation_soir as agent_name from public.bilan_entries where agent_exploitation_soir is not null and agent_exploitation_soir != ''
) as sub
where not exists (
  select 1 from public.agents 
  where agents.nom = split_part(trim(agent_name), ' ', 1)
);

-- 6. Migrer les Agents de Mouvement (depuis table bilan_entries)
insert into public.agents (nom, prenom, role)
select distinct
  split_part(trim(agent_name), ' ', 1) as nom,
  coalesce(nullif(substring(trim(agent_name) from position(' ' in trim(agent_name)) + 1), ''), '-') as prenom,
  'agent_mouvement'
from (
  select agent_mouvement_matin as agent_name from public.bilan_entries where agent_mouvement_matin is not null and agent_mouvement_matin != ''
  union
  select agent_mouvement_soir as agent_name from public.bilan_entries where agent_mouvement_soir is not null and agent_mouvement_soir != ''
) as sub
where not exists (
  select 1 from public.agents 
  where agents.nom = split_part(trim(agent_name), ' ', 1)
);