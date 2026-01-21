-- Migration: Drop stock tables
-- Description: Supprimer les tables sigma_stock et stock_movements

DROP TABLE IF EXISTS public.sigma_stock CASCADE;
DROP TABLE IF EXISTS public.stock_movements CASCADE;

-- Drop associated functions
DROP FUNCTION IF EXISTS update_sigma_stock_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_stock_movements_updated_at() CASCADE;