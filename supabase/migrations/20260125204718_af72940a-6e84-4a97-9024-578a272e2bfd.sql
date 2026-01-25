-- Migration: Refonte SIGMA vers Dépôt LUB (avec DROP des fonctions dépendantes)
-- Description:
-- 1. Supprimer les fonctions dépendantes du type warehouse_type
-- 2. Renommer 'sigma' en 'depot_lub' dans warehouse_type ENUM
-- 3. Renommer les tables sigma_stock et sigma_stock_history
-- 4. Recréer toutes les fonctions avec nouveaux noms

-- =============================================
-- PHASE 0: Supprimer les fonctions dépendantes de warehouse_type
-- =============================================

DROP FUNCTION IF EXISTS calculate_theoretical_stock(warehouse_type, stock_client_type, bottle_type);
DROP FUNCTION IF EXISTS create_stock_movement(warehouse_type, stock_client_type, movement_type, date, integer, integer, character varying, bottle_origin, warehouse_type, warehouse_type, text);
DROP FUNCTION IF EXISTS get_stock_movements_paginated(warehouse_type, stock_client_type, date, integer, integer);
DROP FUNCTION IF EXISTS update_stock_movement(uuid, date, integer, integer, character varying, bottle_origin, text);
DROP FUNCTION IF EXISTS can_reduce_sigma_stock(stock_client_type, bottle_type, integer);

-- =============================================
-- PHASE 1: Renommer ENUM warehouse_type
-- =============================================

-- Créer le nouveau type ENUM avec 'depot_lub' au lieu de 'sigma'
CREATE TYPE warehouse_type_new AS ENUM (
  'bouteilles_neuves',
  'consignes',
  'stock_outils',
  'bouteilles_hs',
  'reconfiguration',
  'depot_lub'
);

-- Migrer la colonne warehouse dans stock_movements
ALTER TABLE stock_movements
  ALTER COLUMN warehouse TYPE warehouse_type_new USING (
    CASE WHEN warehouse::text = 'sigma' THEN 'depot_lub'::warehouse_type_new
    ELSE warehouse::text::warehouse_type_new END
  );

-- Migrer la colonne destination_warehouse dans stock_movements
ALTER TABLE stock_movements
  ALTER COLUMN destination_warehouse TYPE warehouse_type_new USING (
    CASE WHEN destination_warehouse::text = 'sigma' THEN 'depot_lub'::warehouse_type_new
    ELSE destination_warehouse::text::warehouse_type_new END
  );

-- Migrer la colonne source_warehouse dans stock_movements
ALTER TABLE stock_movements
  ALTER COLUMN source_warehouse TYPE warehouse_type_new USING (
    CASE WHEN source_warehouse::text = 'sigma' THEN 'depot_lub'::warehouse_type_new
    ELSE source_warehouse::text::warehouse_type_new END
  );

-- Migrer la colonne warehouse dans stock_inventories
ALTER TABLE stock_inventories
  ALTER COLUMN warehouse TYPE warehouse_type_new USING (
    CASE WHEN warehouse::text = 'sigma' THEN 'depot_lub'::warehouse_type_new
    ELSE warehouse::text::warehouse_type_new END
  );

-- Supprimer l'ancien type et renommer le nouveau
DROP TYPE warehouse_type;
ALTER TYPE warehouse_type_new RENAME TO warehouse_type;

-- =============================================
-- PHASE 2: Renommer les tables
-- =============================================

-- Renommer sigma_stock en depot_lub_stock
ALTER TABLE sigma_stock RENAME TO depot_lub_stock;

-- Renommer sigma_stock_history en depot_lub_stock_history
ALTER TABLE sigma_stock_history RENAME TO depot_lub_stock_history;

-- Renommer les index
ALTER INDEX IF EXISTS idx_sigma_stock_history_client RENAME TO idx_depot_lub_stock_history_client;
ALTER INDEX IF EXISTS idx_sigma_stock_history_date RENAME TO idx_depot_lub_stock_history_date;

-- Mettre à jour les triggers
DROP TRIGGER IF EXISTS sigma_stock_updated_at ON depot_lub_stock;

CREATE OR REPLACE FUNCTION update_depot_lub_stock_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER depot_lub_stock_updated_at
  BEFORE UPDATE ON depot_lub_stock
  FOR EACH ROW
  EXECUTE FUNCTION update_depot_lub_stock_timestamp();

-- Supprimer l'ancienne fonction de trigger si elle existe
DROP FUNCTION IF EXISTS update_sigma_stock_timestamp();

-- =============================================
-- PHASE 3: Recréer calculate_theoretical_stock avec nouveau type
-- =============================================

CREATE OR REPLACE FUNCTION calculate_theoretical_stock(
  p_warehouse warehouse_type,
  p_client stock_client_type,
  p_bottle_type bottle_type
) RETURNS INTEGER AS $$
DECLARE
  v_last_inventory RECORD;
  v_entries INTEGER;
  v_exits INTEGER;
  v_theoretical INTEGER;
BEGIN
  SELECT inventory_date, 
         CASE WHEN p_bottle_type = 'B6' THEN quantity_b6 ELSE quantity_b12 END as quantity
  INTO v_last_inventory
  FROM stock_inventories
  WHERE warehouse = p_warehouse AND client = p_client
  ORDER BY inventory_date DESC
  LIMIT 1;
  
  IF v_last_inventory IS NULL THEN
    v_last_inventory.inventory_date := '1900-01-01'::DATE;
    v_last_inventory.quantity := 0;
  END IF;
  
  SELECT COALESCE(SUM(
    CASE WHEN p_bottle_type = 'B6' THEN quantity_b6 ELSE quantity_b12 END
  ), 0) INTO v_entries
  FROM stock_movements
  WHERE warehouse = p_warehouse 
    AND client = p_client
    AND movement_type = 'entree'
    AND movement_date > v_last_inventory.inventory_date;
  
  SELECT COALESCE(SUM(
    CASE WHEN p_bottle_type = 'B6' THEN quantity_b6 ELSE quantity_b12 END
  ), 0) INTO v_exits
  FROM stock_movements
  WHERE warehouse = p_warehouse 
    AND client = p_client
    AND movement_type = 'sortie'
    AND movement_date > v_last_inventory.inventory_date;
  
  v_theoretical := v_last_inventory.quantity + v_entries - v_exits;
  
  RETURN v_theoretical;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PHASE 4: Recréer les fonctions RPC avec nouveaux noms
-- =============================================

-- 4.1 get_depot_lub_stock (remplace get_sigma_stock)
CREATE OR REPLACE FUNCTION get_depot_lub_stock(
  p_client stock_client_type,
  p_bottle_type bottle_type
) RETURNS INTEGER AS $$
DECLARE
  v_stock INTEGER;
BEGIN
  SELECT current_stock INTO v_stock
  FROM depot_lub_stock
  WHERE client = p_client AND bottle_type = p_bottle_type;

  RETURN COALESCE(v_stock, 0);
END;
$$ LANGUAGE plpgsql;

-- 4.2 update_depot_lub_stock (remplace update_sigma_stock)
CREATE OR REPLACE FUNCTION update_depot_lub_stock(
  p_client stock_client_type,
  p_bottle_type bottle_type,
  p_quantity INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO depot_lub_stock (client, bottle_type, current_stock)
  VALUES (p_client, p_bottle_type, p_quantity)
  ON CONFLICT (client, bottle_type)
  DO UPDATE SET
    current_stock = p_quantity,
    updated_at = NOW();
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 4.3 decrement_depot_lub_stock (remplace decrement_sigma_stock)
CREATE OR REPLACE FUNCTION decrement_depot_lub_stock(
  p_client stock_client_type,
  p_quantity_b6 INTEGER,
  p_quantity_b12 INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_b6 INTEGER;
  v_current_b12 INTEGER;
BEGIN
  SELECT COALESCE(current_stock, 0) INTO v_current_b6
  FROM depot_lub_stock WHERE client = p_client AND bottle_type = 'B6';

  SELECT COALESCE(current_stock, 0) INTO v_current_b12
  FROM depot_lub_stock WHERE client = p_client AND bottle_type = 'B12';

  v_current_b6 := COALESCE(v_current_b6, 0);
  v_current_b12 := COALESCE(v_current_b12, 0);

  IF v_current_b6 < COALESCE(p_quantity_b6, 0) OR v_current_b12 < COALESCE(p_quantity_b12, 0) THEN
    RETURN FALSE;
  END IF;

  IF COALESCE(p_quantity_b6, 0) > 0 THEN
    UPDATE depot_lub_stock
    SET current_stock = current_stock - p_quantity_b6, updated_at = NOW()
    WHERE client = p_client AND bottle_type = 'B6';
  END IF;

  IF COALESCE(p_quantity_b12, 0) > 0 THEN
    UPDATE depot_lub_stock
    SET current_stock = current_stock - p_quantity_b12, updated_at = NOW()
    WHERE client = p_client AND bottle_type = 'B12';
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 4.4 increment_depot_lub_stock (nouvelle fonction)
CREATE OR REPLACE FUNCTION increment_depot_lub_stock(
  p_client stock_client_type,
  p_quantity_b6 INTEGER,
  p_quantity_b12 INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
  IF COALESCE(p_quantity_b6, 0) > 0 THEN
    INSERT INTO depot_lub_stock (client, bottle_type, current_stock)
    VALUES (p_client, 'B6', p_quantity_b6)
    ON CONFLICT (client, bottle_type)
    DO UPDATE SET
      current_stock = depot_lub_stock.current_stock + p_quantity_b6,
      updated_at = NOW();
  END IF;

  IF COALESCE(p_quantity_b12, 0) > 0 THEN
    INSERT INTO depot_lub_stock (client, bottle_type, current_stock)
    VALUES (p_client, 'B12', p_quantity_b12)
    ON CONFLICT (client, bottle_type)
    DO UPDATE SET
      current_stock = depot_lub_stock.current_stock + p_quantity_b12,
      updated_at = NOW();
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 4.5 can_reduce_depot_lub_stock
CREATE OR REPLACE FUNCTION can_reduce_depot_lub_stock(
  p_client stock_client_type,
  p_bottle_type bottle_type,
  p_new_quantity INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_total_used INTEGER := 0;
  v_warehouse warehouse_type;
BEGIN
  FOR v_warehouse IN SELECT unnest(ARRAY['bouteilles_neuves', 'consignes', 'stock_outils', 'bouteilles_hs', 'reconfiguration']::warehouse_type[])
  LOOP
    v_total_used := v_total_used + calculate_theoretical_stock(v_warehouse, p_client, p_bottle_type);
  END LOOP;

  IF p_new_quantity < v_total_used THEN
    RETURN jsonb_build_object(
      'can_reduce', false,
      'error', 'Stock Dépôt LUB insuffisant pour couvrir les stocks existants',
      'total_used', v_total_used,
      'requested', p_new_quantity
    );
  END IF;

  RETURN jsonb_build_object('can_reduce', true);
END;
$$ LANGUAGE plpgsql;

-- 4.6 update_depot_lub_stock_with_history
CREATE OR REPLACE FUNCTION update_depot_lub_stock_with_history(
  p_client stock_client_type,
  p_bottle_type bottle_type,
  p_new_quantity INTEGER,
  p_change_type TEXT DEFAULT 'configuration',
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_previous_stock INTEGER;
  v_change_amount INTEGER;
BEGIN
  SELECT COALESCE(current_stock, 0) INTO v_previous_stock
  FROM depot_lub_stock
  WHERE client = p_client AND bottle_type = p_bottle_type;

  IF v_previous_stock IS NULL THEN
    v_previous_stock := 0;
  END IF;

  v_change_amount := p_new_quantity - v_previous_stock;

  INSERT INTO depot_lub_stock (client, bottle_type, current_stock)
  VALUES (p_client, p_bottle_type, p_new_quantity)
  ON CONFLICT (client, bottle_type)
  DO UPDATE SET
    current_stock = p_new_quantity,
    updated_at = NOW();

  INSERT INTO depot_lub_stock_history (
    client, bottle_type, previous_stock, new_stock, change_amount, change_type, notes
  ) VALUES (
    p_client, p_bottle_type, v_previous_stock, p_new_quantity, v_change_amount, p_change_type, p_notes
  );

  RETURN jsonb_build_object(
    'success', true,
    'previous_stock', v_previous_stock,
    'new_stock', p_new_quantity,
    'change_amount', v_change_amount
  );
END;
$$ LANGUAGE plpgsql;

-- 4.7 get_depot_lub_stock_history
CREATE OR REPLACE FUNCTION get_depot_lub_stock_history(
  p_client stock_client_type DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id UUID,
  client stock_client_type,
  bottle_type bottle_type,
  previous_stock INTEGER,
  new_stock INTEGER,
  change_amount INTEGER,
  change_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    h.client,
    h.bottle_type,
    h.previous_stock,
    h.new_stock,
    h.change_amount,
    h.change_type,
    h.notes,
    h.created_at
  FROM depot_lub_stock_history h
  WHERE (p_client IS NULL OR h.client = p_client)
  ORDER BY h.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- 4.8 update_depot_lub_stock_threshold
CREATE OR REPLACE FUNCTION update_depot_lub_stock_threshold(
  p_client stock_client_type,
  p_bottle_type bottle_type,
  p_threshold INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE depot_lub_stock
  SET alert_threshold = p_threshold, updated_at = NOW()
  WHERE client = p_client AND bottle_type = p_bottle_type;

  IF NOT FOUND THEN
    INSERT INTO depot_lub_stock (client, bottle_type, current_stock, alert_threshold)
    VALUES (p_client, p_bottle_type, 0, p_threshold);
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PHASE 5: Recréer create_stock_movement avec miroirs depot_lub
-- =============================================

CREATE OR REPLACE FUNCTION create_stock_movement(
  p_warehouse warehouse_type,
  p_client stock_client_type,
  p_movement_type movement_type,
  p_movement_date DATE,
  p_quantity_b6 INTEGER,
  p_quantity_b12 INTEGER,
  p_bon_number VARCHAR DEFAULT NULL,
  p_origin bottle_origin DEFAULT NULL,
  p_destination_warehouse warehouse_type DEFAULT NULL,
  p_source_warehouse warehouse_type DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_main_id UUID;
  v_mirror_id UUID;
  v_current_stock_b6 INTEGER;
  v_current_stock_b12 INTEGER;
  v_depot_lub_stock_b6 INTEGER;
  v_depot_lub_stock_b12 INTEGER;
BEGIN
  IF p_movement_date > CURRENT_DATE THEN
    RETURN jsonb_build_object('success', false, 'error', 'Les dates futures ne sont pas autorisées');
  END IF;

  -- For entries into Bouteilles Neuves FROM depot_lub
  IF p_warehouse = 'bouteilles_neuves' AND p_movement_type = 'entree' AND p_source_warehouse = 'depot_lub' THEN
    SELECT COALESCE(current_stock, 0) INTO v_depot_lub_stock_b6
    FROM depot_lub_stock WHERE client = p_client AND bottle_type = 'B6';

    SELECT COALESCE(current_stock, 0) INTO v_depot_lub_stock_b12
    FROM depot_lub_stock WHERE client = p_client AND bottle_type = 'B12';

    v_depot_lub_stock_b6 := COALESCE(v_depot_lub_stock_b6, 0);
    v_depot_lub_stock_b12 := COALESCE(v_depot_lub_stock_b12, 0);

    IF NOT decrement_depot_lub_stock(p_client, COALESCE(p_quantity_b6, 0), COALESCE(p_quantity_b12, 0)) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Stock Dépôt LUB insuffisant',
        'details', jsonb_build_object(
          'required_b6', COALESCE(p_quantity_b6, 0),
          'required_b12', COALESCE(p_quantity_b12, 0),
          'available_b6', v_depot_lub_stock_b6,
          'available_b12', v_depot_lub_stock_b12
        )
      );
    END IF;
  END IF;

  -- For exits from depot_lub to bouteilles_neuves
  IF p_warehouse = 'depot_lub' AND p_movement_type = 'sortie' AND p_destination_warehouse = 'bouteilles_neuves' THEN
    SELECT COALESCE(current_stock, 0) INTO v_depot_lub_stock_b6
    FROM depot_lub_stock WHERE client = p_client AND bottle_type = 'B6';

    SELECT COALESCE(current_stock, 0) INTO v_depot_lub_stock_b12
    FROM depot_lub_stock WHERE client = p_client AND bottle_type = 'B12';

    v_depot_lub_stock_b6 := COALESCE(v_depot_lub_stock_b6, 0);
    v_depot_lub_stock_b12 := COALESCE(v_depot_lub_stock_b12, 0);

    IF v_depot_lub_stock_b6 < COALESCE(p_quantity_b6, 0) OR v_depot_lub_stock_b12 < COALESCE(p_quantity_b12, 0) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Stock Dépôt LUB insuffisant',
        'details', jsonb_build_object(
          'required_b6', COALESCE(p_quantity_b6, 0),
          'required_b12', COALESCE(p_quantity_b12, 0),
          'available_b6', v_depot_lub_stock_b6,
          'available_b12', v_depot_lub_stock_b12
        )
      );
    END IF;

    PERFORM decrement_depot_lub_stock(p_client, COALESCE(p_quantity_b6, 0), COALESCE(p_quantity_b12, 0));
  END IF;

  -- For exits from other warehouses
  IF p_movement_type = 'sortie' AND p_warehouse != 'depot_lub' THEN
    v_current_stock_b6 := calculate_theoretical_stock(p_warehouse, p_client, 'B6');
    v_current_stock_b12 := calculate_theoretical_stock(p_warehouse, p_client, 'B12');

    IF v_current_stock_b6 < COALESCE(p_quantity_b6, 0) OR v_current_stock_b12 < COALESCE(p_quantity_b12, 0) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Stock local insuffisant',
        'details', jsonb_build_object(
          'available_b6', v_current_stock_b6,
          'available_b12', v_current_stock_b12,
          'required_b6', p_quantity_b6,
          'required_b12', p_quantity_b12
        )
      );
    END IF;
  END IF;

  -- Create main movement
  INSERT INTO stock_movements (
    warehouse, client, movement_type, movement_date,
    quantity_b6, quantity_b12, bon_number, origin,
    destination_warehouse, source_warehouse, notes
  ) VALUES (
    p_warehouse, p_client, p_movement_type, p_movement_date,
    COALESCE(p_quantity_b6, 0), COALESCE(p_quantity_b12, 0), p_bon_number, p_origin,
    p_destination_warehouse, p_source_warehouse, p_notes
  ) RETURNING id INTO v_main_id;

  -- If inventory, create stock_inventories record
  IF p_movement_type = 'inventaire' THEN
    INSERT INTO stock_inventories (
      warehouse, client, inventory_date, quantity_b6, quantity_b12, notes
    ) VALUES (
      p_warehouse, p_client, p_movement_date,
      COALESCE(p_quantity_b6, 0), COALESCE(p_quantity_b12, 0), p_notes
    );
  END IF;

  -- Create mirror for inter-warehouse transfers
  IF p_movement_type = 'sortie' AND p_destination_warehouse IS NOT NULL THEN
    IF p_warehouse = 'depot_lub' AND p_destination_warehouse = 'bouteilles_neuves' THEN
      INSERT INTO stock_movements (
        warehouse, client, movement_type, movement_date,
        quantity_b6, quantity_b12, bon_number,
        source_warehouse, linked_movement_id, notes
      ) VALUES (
        'bouteilles_neuves', p_client, 'entree', p_movement_date,
        COALESCE(p_quantity_b6, 0), COALESCE(p_quantity_b12, 0), p_bon_number,
        'depot_lub', v_main_id, p_notes
      ) RETURNING id INTO v_mirror_id;

      UPDATE stock_movements SET linked_movement_id = v_mirror_id WHERE id = v_main_id;

    ELSIF p_warehouse != 'depot_lub' AND p_destination_warehouse != 'depot_lub' THEN
      INSERT INTO stock_movements (
        warehouse, client, movement_type, movement_date,
        quantity_b6, quantity_b12, bon_number,
        source_warehouse, linked_movement_id, notes
      ) VALUES (
        p_destination_warehouse, p_client, 'entree', p_movement_date,
        COALESCE(p_quantity_b6, 0), COALESCE(p_quantity_b12, 0), p_bon_number,
        p_warehouse, v_main_id, p_notes
      ) RETURNING id INTO v_mirror_id;

      UPDATE stock_movements SET linked_movement_id = v_mirror_id WHERE id = v_main_id;
    END IF;
  END IF;

  -- Mirror for entry from depot_lub
  IF p_movement_type = 'entree' AND p_source_warehouse = 'depot_lub' AND p_warehouse = 'bouteilles_neuves' THEN
    INSERT INTO stock_movements (
      warehouse, client, movement_type, movement_date,
      quantity_b6, quantity_b12, bon_number,
      destination_warehouse, linked_movement_id, notes
    ) VALUES (
      'depot_lub', p_client, 'sortie', p_movement_date,
      COALESCE(p_quantity_b6, 0), COALESCE(p_quantity_b12, 0), p_bon_number,
      'bouteilles_neuves', v_main_id, p_notes
    ) RETURNING id INTO v_mirror_id;

    UPDATE stock_movements SET linked_movement_id = v_mirror_id WHERE id = v_main_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'movement_id', v_main_id,
    'mirror_id', v_mirror_id
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PHASE 6: Recréer get_stock_movements_paginated avec filtrage avancé
-- =============================================

CREATE OR REPLACE FUNCTION get_stock_movements_paginated(
  p_warehouse warehouse_type,
  p_client stock_client_type,
  p_filter_type TEXT DEFAULT 'all',
  p_year INTEGER DEFAULT NULL,
  p_month DATE DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_specific_date DATE DEFAULT NULL,
  p_limit INTEGER DEFAULT 30,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id UUID,
  warehouse warehouse_type,
  client stock_client_type,
  movement_type movement_type,
  movement_date DATE,
  bon_number VARCHAR,
  origin bottle_origin,
  quantity_b6 INTEGER,
  quantity_b12 INTEGER,
  destination_warehouse warehouse_type,
  source_warehouse warehouse_type,
  linked_movement_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ,
  total_count BIGINT
) AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  CASE p_filter_type
    WHEN 'year' THEN
      v_start_date := make_date(COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER), 1, 1);
      v_end_date := make_date(COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER), 12, 31);
    WHEN 'month' THEN
      IF p_month IS NOT NULL THEN
        v_start_date := DATE_TRUNC('month', p_month)::DATE;
        v_end_date := (DATE_TRUNC('month', p_month) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
      ELSE
        v_start_date := DATE_TRUNC('month', CURRENT_DATE)::DATE;
        v_end_date := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
      END IF;
    WHEN 'range' THEN
      v_start_date := p_start_date;
      v_end_date := p_end_date;
    WHEN 'day' THEN
      v_start_date := p_specific_date;
      v_end_date := p_specific_date;
    ELSE
      v_start_date := NULL;
      v_end_date := NULL;
  END CASE;

  RETURN QUERY
  SELECT
    sm.id,
    sm.warehouse,
    sm.client,
    sm.movement_type,
    sm.movement_date,
    sm.bon_number,
    sm.origin,
    sm.quantity_b6,
    sm.quantity_b12,
    sm.destination_warehouse,
    sm.source_warehouse,
    sm.linked_movement_id,
    sm.notes,
    sm.created_at,
    COUNT(*) OVER() as total_count
  FROM stock_movements sm
  WHERE sm.warehouse = p_warehouse
    AND sm.client = p_client
    AND (v_start_date IS NULL OR sm.movement_date >= v_start_date)
    AND (v_end_date IS NULL OR sm.movement_date <= v_end_date)
  ORDER BY sm.movement_date DESC, sm.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PHASE 7: Recréer update_stock_movement avec édition complète
-- =============================================

CREATE OR REPLACE FUNCTION update_stock_movement(
  p_movement_id UUID,
  p_movement_type movement_type DEFAULT NULL,
  p_movement_date DATE DEFAULT NULL,
  p_quantity_b6 INTEGER DEFAULT NULL,
  p_quantity_b12 INTEGER DEFAULT NULL,
  p_bon_number VARCHAR DEFAULT NULL,
  p_origin bottle_origin DEFAULT NULL,
  p_destination_warehouse warehouse_type DEFAULT NULL,
  p_source_warehouse warehouse_type DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_movement RECORD;
  v_linked_id UUID;
  v_new_movement_type movement_type;
  v_new_movement_date DATE;
  v_new_quantity_b6 INTEGER;
  v_new_quantity_b12 INTEGER;
BEGIN
  SELECT * INTO v_movement FROM stock_movements WHERE id = p_movement_id;

  IF v_movement IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mouvement non trouvé');
  END IF;

  v_new_movement_type := COALESCE(p_movement_type, v_movement.movement_type);
  v_new_movement_date := COALESCE(p_movement_date, v_movement.movement_date);
  v_new_quantity_b6 := COALESCE(p_quantity_b6, v_movement.quantity_b6);
  v_new_quantity_b12 := COALESCE(p_quantity_b12, v_movement.quantity_b12);

  IF v_new_movement_date > CURRENT_DATE THEN
    RETURN jsonb_build_object('success', false, 'error', 'Les dates futures ne sont pas autorisées');
  END IF;

  UPDATE stock_movements SET
    movement_type = v_new_movement_type,
    movement_date = v_new_movement_date,
    quantity_b6 = v_new_quantity_b6,
    quantity_b12 = v_new_quantity_b12,
    bon_number = COALESCE(p_bon_number, bon_number),
    origin = CASE WHEN p_origin IS NULL THEN origin ELSE p_origin END,
    destination_warehouse = CASE WHEN p_destination_warehouse IS NULL THEN destination_warehouse ELSE p_destination_warehouse END,
    source_warehouse = CASE WHEN p_source_warehouse IS NULL THEN source_warehouse ELSE p_source_warehouse END,
    notes = CASE WHEN p_notes IS NULL THEN notes ELSE p_notes END,
    updated_at = NOW()
  WHERE id = p_movement_id;

  v_linked_id := v_movement.linked_movement_id;
  IF v_linked_id IS NOT NULL THEN
    UPDATE stock_movements SET
      movement_type = CASE
        WHEN v_new_movement_type = 'sortie' THEN 'entree'::movement_type
        WHEN v_new_movement_type = 'entree' THEN 'sortie'::movement_type
        ELSE movement_type
      END,
      movement_date = v_new_movement_date,
      quantity_b6 = v_new_quantity_b6,
      quantity_b12 = v_new_quantity_b12,
      bon_number = COALESCE(p_bon_number, bon_number),
      notes = CASE WHEN p_notes IS NULL THEN notes ELSE p_notes END,
      updated_at = NOW()
    WHERE id = v_linked_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'movement_id', p_movement_id);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PHASE 8: Supprimer les anciennes fonctions
-- =============================================

DROP FUNCTION IF EXISTS get_sigma_stock(stock_client_type, bottle_type);
DROP FUNCTION IF EXISTS update_sigma_stock(stock_client_type, bottle_type, INTEGER);
DROP FUNCTION IF EXISTS decrement_sigma_stock(stock_client_type, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS update_sigma_stock_with_history(stock_client_type, bottle_type, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_sigma_stock_history(stock_client_type, INTEGER, INTEGER);

-- =============================================
-- PHASE 9: Mettre à jour les politiques RLS
-- =============================================

DROP POLICY IF EXISTS "Allow all on sigma_stock" ON depot_lub_stock;
DROP POLICY IF EXISTS "Allow all on sigma_stock_history" ON depot_lub_stock_history;

CREATE POLICY "Allow all on depot_lub_stock" ON depot_lub_stock FOR ALL USING (true);
CREATE POLICY "Allow all on depot_lub_stock_history" ON depot_lub_stock_history FOR ALL USING (true);