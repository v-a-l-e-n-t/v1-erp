-- Migration: Create stock_movements table
-- Description: Table pour gérer les mouvements de stock de bouteilles GPL

-- Créer la table stock_movements
create table if not exists public.stock_movements (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  category text not null check (category in (
    'bouteilles_neuves',
    'bouteilles_hs',
    'reconfiguration',
    'consignes',
    'parc_ce',
    'stock_outils_vivo',
    'peinture'
  )),
  site text not null check (site in ('depot_vrac', 'centre_emplisseur')),
  movement_type text not null check (movement_type in ('entree', 'sortie', 'inventaire', 'transfert')),
  bottle_type text not null check (bottle_type in ('B6', 'B12', 'B28', 'B38')),
  quantity integer not null check (quantity >= 0),
  client text check (client in ('PI', 'TEMCI', 'VIVO', 'TOTAL')),
  motif text,
  provenance text,
  destination text,
  justification_ecart text,
  stock_theorique integer,
  stock_reel integer,
  ecart integer,
  user_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_modified_by text,
  last_modified_at timestamp with time zone
);

-- Activer RLS (Row Level Security)
alter table public.stock_movements enable row level security;

-- Politique permissive pour tous les utilisateurs (à ajuster selon les besoins)
create policy "Enable all access for all users" on public.stock_movements
  for all using (true) with check (true);

-- Créer les index pour améliorer les performances
create index if not exists idx_stock_movements_date on public.stock_movements(date);
create index if not exists idx_stock_movements_category on public.stock_movements(category);
create index if not exists idx_stock_movements_site on public.stock_movements(site);
create index if not exists idx_stock_movements_bottle_type on public.stock_movements(bottle_type);
create index if not exists idx_stock_movements_movement_type on public.stock_movements(movement_type);
create index if not exists idx_stock_movements_client on public.stock_movements(client) where client is not null;
create index if not exists idx_stock_movements_category_site_bottle on public.stock_movements(category, site, bottle_type, client);

-- Fonction pour mettre à jour updated_at automatiquement
create or replace function update_stock_movements_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Trigger pour updated_at
create trigger update_stock_movements_updated_at
  before update on public.stock_movements
  for each row
  execute function update_stock_movements_updated_at();