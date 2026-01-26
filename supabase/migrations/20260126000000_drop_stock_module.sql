-- Migration: Suppression complète du module Stock
-- Cette migration supprime toutes les tables, fonctions et types liés au module stock

-- =============================================
-- PHASE 1: Supprimer les politiques RLS
-- =============================================

DROP POLICY IF EXISTS "Allow all on depot_lub_stock" ON depot_lub_stock;
DROP POLICY IF EXISTS "Allow all on depot_lub_stock_history" ON depot_lub_stock_history;
DROP POLICY IF EXISTS "Allow all on sigma_stock" ON sigma_stock;
DROP POLICY IF EXISTS "Allow all on sigma_stock_history" ON sigma_stock_history;
DROP POLICY IF EXISTS "Allow all on stock_movements" ON stock_movements;
DROP POLICY IF EXISTS "Allow all on stock_inventories" ON stock_inventories;

-- =============================================
-- PHASE 2: Supprimer les triggers
-- =============================================

DROP TRIGGER IF EXISTS depot_lub_stock_updated_at ON depot_lub_stock;
DROP TRIGGER IF EXISTS sigma_stock_updated_at ON sigma_stock;
DROP TRIGGER IF EXISTS stock_movements_updated_at ON stock_movements;

-- =============================================
-- PHASE 3: Supprimer les fonctions
-- =============================================

-- Fonctions depot_lub
DROP FUNCTION IF EXISTS get_depot_lub_stock(stock_client_type, bottle_type);
DROP FUNCTION IF EXISTS update_depot_lub_stock(stock_client_type, bottle_type, INTEGER);
DROP FUNCTION IF EXISTS increment_depot_lub_stock(stock_client_type, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS decrement_depot_lub_stock(stock_client_type, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS can_reduce_depot_lub_stock(stock_client_type, bottle_type, INTEGER);
DROP FUNCTION IF EXISTS update_depot_lub_stock_with_history(stock_client_type, bottle_type, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_depot_lub_stock_history(stock_client_type, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS update_depot_lub_stock_threshold(stock_client_type, bottle_type, INTEGER);
DROP FUNCTION IF EXISTS update_depot_lub_stock_timestamp();

-- Fonctions sigma (anciennes)
DROP FUNCTION IF EXISTS get_sigma_stock(stock_client_type, bottle_type);
DROP FUNCTION IF EXISTS update_sigma_stock(stock_client_type, bottle_type, INTEGER);
DROP FUNCTION IF EXISTS decrement_sigma_stock(stock_client_type, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS can_reduce_sigma_stock(stock_client_type, bottle_type, INTEGER);
DROP FUNCTION IF EXISTS update_sigma_stock_with_history(stock_client_type, bottle_type, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_sigma_stock_history(stock_client_type, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS update_sigma_stock_timestamp();

-- Fonctions stock_movements
DROP FUNCTION IF EXISTS calculate_theoretical_stock(warehouse_type, stock_client_type, bottle_type);
DROP FUNCTION IF EXISTS create_stock_movement(warehouse_type, stock_client_type, movement_type, date, INTEGER, INTEGER, VARCHAR, bottle_origin, warehouse_type, warehouse_type, TEXT);
DROP FUNCTION IF EXISTS get_stock_movements_paginated(warehouse_type, stock_client_type, TEXT, INTEGER, DATE, DATE, DATE, DATE, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_stock_movements_paginated(warehouse_type, stock_client_type, DATE, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS update_stock_movement(UUID, movement_type, DATE, INTEGER, INTEGER, VARCHAR, bottle_origin, warehouse_type, warehouse_type, TEXT);
DROP FUNCTION IF EXISTS update_stock_movement(UUID, DATE, INTEGER, INTEGER, VARCHAR, bottle_origin, TEXT);
DROP FUNCTION IF EXISTS delete_stock_movement(UUID);

-- =============================================
-- PHASE 4: Supprimer les tables
-- =============================================

DROP TABLE IF EXISTS depot_lub_stock_history CASCADE;
DROP TABLE IF EXISTS depot_lub_stock CASCADE;
DROP TABLE IF EXISTS sigma_stock_history CASCADE;
DROP TABLE IF EXISTS sigma_stock CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS stock_inventories CASCADE;

-- =============================================
-- PHASE 5: Supprimer les types ENUM
-- =============================================

DROP TYPE IF EXISTS warehouse_type CASCADE;
DROP TYPE IF EXISTS stock_client_type CASCADE;
DROP TYPE IF EXISTS movement_type CASCADE;
DROP TYPE IF EXISTS bottle_type CASCADE;
DROP TYPE IF EXISTS bottle_origin CASCADE;
