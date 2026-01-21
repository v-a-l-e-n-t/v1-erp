-- =============================================
-- STOCK MODULE - Complete Migration
-- =============================================

-- 1. ENUMS
-- =============================================

-- Warehouse types (Magasins)
CREATE TYPE warehouse_type AS ENUM (
  'bouteilles_neuves',  -- Bouteilles Neuves - CE
  'consignes',          -- Consignes - CE
  'stock_outils',       -- Stock Outils - CE
  'bouteilles_hs',      -- Bouteilles HS - DV
  'reconfiguration',    -- Reconfiguration - DV
  'sigma'               -- SIGMA (source centrale)
);

-- Client types
CREATE TYPE stock_client_type AS ENUM (
  'petro_ivoire',
  'total_energies',
  'vivo_energy'
);

-- Bottle types
CREATE TYPE bottle_type AS ENUM (
  'B6',
  'B12'
);

-- Movement types
CREATE TYPE movement_type AS ENUM (
  'entree',     -- Ajout de stock
  'sortie',     -- Retrait de stock
  'inventaire'  -- Correction du stock réel
);

-- Bottle origin (for entries)
CREATE TYPE bottle_origin AS ENUM (
  'fabrique',    -- Fabriqué
  'requalifie'   -- Requalifié
);

-- 2. TABLES
-- =============================================

-- SIGMA Stock Configuration (source of truth for SIGMA)
CREATE TABLE sigma_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client stock_client_type NOT NULL,
  bottle_type bottle_type NOT NULL,
  current_stock INTEGER NOT NULL DEFAULT 0,
  alert_threshold INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client, bottle_type)
);

-- Stock Movements
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse warehouse_type NOT NULL,
  client stock_client_type NOT NULL,
  movement_type movement_type NOT NULL,
  movement_date DATE NOT NULL,
  bon_number VARCHAR(100),
  origin bottle_origin,
  quantity_b6 INTEGER DEFAULT 0,
  quantity_b12 INTEGER DEFAULT 0,
  -- For inter-warehouse transfers
  destination_warehouse warehouse_type,
  source_warehouse warehouse_type,
  -- Link to mirror movement (for inter-warehouse transfers)
  linked_movement_id UUID REFERENCES stock_movements(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  -- Constraints
  CONSTRAINT valid_quantities CHECK (quantity_b6 >= 0 AND quantity_b12 >= 0),
  CONSTRAINT at_least_one_quantity CHECK (quantity_b6 > 0 OR quantity_b12 > 0),
  CONSTRAINT no_future_date CHECK (movement_date <= CURRENT_DATE)
);

-- Inventory snapshots (for theoretical stock calculation)
CREATE TABLE stock_inventories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse warehouse_type NOT NULL,
  client stock_client_type NOT NULL,
  inventory_date DATE NOT NULL,
  quantity_b6 INTEGER DEFAULT 0,
  quantity_b12 INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- 3. INDEXES
-- =============================================

CREATE INDEX idx_stock_movements_warehouse ON stock_movements(warehouse);
CREATE INDEX idx_stock_movements_client ON stock_movements(client);
CREATE INDEX idx_stock_movements_date ON stock_movements(movement_date);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX idx_stock_movements_linked ON stock_movements(linked_movement_id);
CREATE INDEX idx_stock_inventories_warehouse_client ON stock_inventories(warehouse, client);
CREATE INDEX idx_stock_inventories_date ON stock_inventories(inventory_date DESC);

-- 4. FUNCTIONS
-- =============================================

-- Function to get current SIGMA stock for a client/bottle type
CREATE OR REPLACE FUNCTION get_sigma_stock(
  p_client stock_client_type,
  p_bottle_type bottle_type
) RETURNS INTEGER AS $$
DECLARE
  v_stock INTEGER;
BEGIN
  SELECT current_stock INTO v_stock
  FROM sigma_stock
  WHERE client = p_client AND bottle_type = p_bottle_type;
  
  RETURN COALESCE(v_stock, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to update SIGMA stock
CREATE OR REPLACE FUNCTION update_sigma_stock(
  p_client stock_client_type,
  p_bottle_type bottle_type,
  p_quantity INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO sigma_stock (client, bottle_type, current_stock)
  VALUES (p_client, p_bottle_type, p_quantity)
  ON CONFLICT (client, bottle_type)
  DO UPDATE SET 
    current_stock = p_quantity,
    updated_at = NOW();
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement SIGMA stock (for entries into Bouteilles Neuves)
CREATE OR REPLACE FUNCTION decrement_sigma_stock(
  p_client stock_client_type,
  p_quantity_b6 INTEGER,
  p_quantity_b12 INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_b6 INTEGER;
  v_current_b12 INTEGER;
BEGIN
  -- Get current stocks
  SELECT COALESCE(current_stock, 0) INTO v_current_b6
  FROM sigma_stock WHERE client = p_client AND bottle_type = 'B6';
  
  SELECT COALESCE(current_stock, 0) INTO v_current_b12
  FROM sigma_stock WHERE client = p_client AND bottle_type = 'B12';
  
  -- Check if sufficient stock
  IF v_current_b6 < COALESCE(p_quantity_b6, 0) OR v_current_b12 < COALESCE(p_quantity_b12, 0) THEN
    RETURN FALSE;
  END IF;
  
  -- Decrement B6
  IF p_quantity_b6 > 0 THEN
    UPDATE sigma_stock 
    SET current_stock = current_stock - p_quantity_b6, updated_at = NOW()
    WHERE client = p_client AND bottle_type = 'B6';
  END IF;
  
  -- Decrement B12
  IF p_quantity_b12 > 0 THEN
    UPDATE sigma_stock 
    SET current_stock = current_stock - p_quantity_b12, updated_at = NOW()
    WHERE client = p_client AND bottle_type = 'B12';
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate theoretical stock for a warehouse/client
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
  -- Get last inventory
  SELECT inventory_date, 
         CASE WHEN p_bottle_type = 'B6' THEN quantity_b6 ELSE quantity_b12 END as quantity
  INTO v_last_inventory
  FROM stock_inventories
  WHERE warehouse = p_warehouse AND client = p_client
  ORDER BY inventory_date DESC
  LIMIT 1;
  
  -- If no inventory, start from 0
  IF v_last_inventory IS NULL THEN
    v_last_inventory.inventory_date := '1900-01-01'::DATE;
    v_last_inventory.quantity := 0;
  END IF;
  
  -- Sum entries after last inventory
  SELECT COALESCE(SUM(
    CASE WHEN p_bottle_type = 'B6' THEN quantity_b6 ELSE quantity_b12 END
  ), 0) INTO v_entries
  FROM stock_movements
  WHERE warehouse = p_warehouse 
    AND client = p_client
    AND movement_type = 'entree'
    AND movement_date > v_last_inventory.inventory_date;
  
  -- Sum exits after last inventory
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

-- RPC: Create movement with optional mirror (for inter-warehouse transfers)
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
BEGIN
  -- Validate: no future dates
  IF p_movement_date > CURRENT_DATE THEN
    RETURN jsonb_build_object('success', false, 'error', 'Les dates futures ne sont pas autorisées');
  END IF;

  -- For entries into Bouteilles Neuves, check and decrement SIGMA
  IF p_warehouse = 'bouteilles_neuves' AND p_movement_type = 'entree' THEN
    IF NOT decrement_sigma_stock(p_client, COALESCE(p_quantity_b6, 0), COALESCE(p_quantity_b12, 0)) THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Stock SIGMA insuffisant',
        'details', jsonb_build_object(
          'required_b6', p_quantity_b6,
          'required_b12', p_quantity_b12
        )
      );
    END IF;
  END IF;

  -- For exits, check if sufficient stock
  IF p_movement_type = 'sortie' THEN
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

  -- Create mirror movement for inter-warehouse transfers (excluding SIGMA)
  IF p_movement_type = 'sortie' 
     AND p_destination_warehouse IS NOT NULL 
     AND p_destination_warehouse != 'sigma'
     AND p_warehouse != 'sigma' THEN
    
    INSERT INTO stock_movements (
      warehouse, client, movement_type, movement_date,
      quantity_b6, quantity_b12, bon_number,
      source_warehouse, linked_movement_id, notes
    ) VALUES (
      p_destination_warehouse, p_client, 'entree', p_movement_date,
      COALESCE(p_quantity_b6, 0), COALESCE(p_quantity_b12, 0), p_bon_number,
      p_warehouse, v_main_id, p_notes
    ) RETURNING id INTO v_mirror_id;
    
    -- Link the main movement to the mirror
    UPDATE stock_movements SET linked_movement_id = v_mirror_id WHERE id = v_main_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'movement_id', v_main_id,
    'mirror_id', v_mirror_id
  );
END;
$$ LANGUAGE plpgsql;

-- RPC: Update stock movement
CREATE OR REPLACE FUNCTION update_stock_movement(
  p_movement_id UUID,
  p_movement_date DATE,
  p_quantity_b6 INTEGER,
  p_quantity_b12 INTEGER,
  p_bon_number VARCHAR DEFAULT NULL,
  p_origin bottle_origin DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_movement RECORD;
  v_linked_id UUID;
BEGIN
  -- Get current movement
  SELECT * INTO v_movement FROM stock_movements WHERE id = p_movement_id;
  
  IF v_movement IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mouvement non trouvé');
  END IF;

  -- Validate: no future dates
  IF p_movement_date > CURRENT_DATE THEN
    RETURN jsonb_build_object('success', false, 'error', 'Les dates futures ne sont pas autorisées');
  END IF;

  -- Update main movement
  UPDATE stock_movements SET
    movement_date = p_movement_date,
    quantity_b6 = COALESCE(p_quantity_b6, 0),
    quantity_b12 = COALESCE(p_quantity_b12, 0),
    bon_number = p_bon_number,
    origin = p_origin,
    notes = p_notes,
    updated_at = NOW()
  WHERE id = p_movement_id;

  -- Update linked movement if exists
  v_linked_id := v_movement.linked_movement_id;
  IF v_linked_id IS NOT NULL THEN
    UPDATE stock_movements SET
      movement_date = p_movement_date,
      quantity_b6 = COALESCE(p_quantity_b6, 0),
      quantity_b12 = COALESCE(p_quantity_b12, 0),
      bon_number = p_bon_number,
      notes = p_notes,
      updated_at = NOW()
    WHERE id = v_linked_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'movement_id', p_movement_id);
END;
$$ LANGUAGE plpgsql;

-- RPC: Delete stock movement (with linked movement)
CREATE OR REPLACE FUNCTION delete_stock_movement(
  p_movement_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_movement RECORD;
  v_linked_id UUID;
BEGIN
  -- Get current movement
  SELECT * INTO v_movement FROM stock_movements WHERE id = p_movement_id;
  
  IF v_movement IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mouvement non trouvé');
  END IF;

  v_linked_id := v_movement.linked_movement_id;

  -- Delete linked movement first (if exists)
  IF v_linked_id IS NOT NULL THEN
    DELETE FROM stock_movements WHERE id = v_linked_id;
  END IF;

  -- Delete main movement
  DELETE FROM stock_movements WHERE id = p_movement_id;

  RETURN jsonb_build_object(
    'success', true, 
    'deleted_id', p_movement_id,
    'deleted_linked_id', v_linked_id
  );
END;
$$ LANGUAGE plpgsql;

-- RPC: Get movements with pagination
CREATE OR REPLACE FUNCTION get_stock_movements_paginated(
  p_warehouse warehouse_type,
  p_client stock_client_type,
  p_month DATE DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
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
  -- Calculate month range if provided
  IF p_month IS NOT NULL THEN
    v_start_date := DATE_TRUNC('month', p_month)::DATE;
    v_end_date := (DATE_TRUNC('month', p_month) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  END IF;

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
    AND (p_month IS NULL OR (sm.movement_date >= v_start_date AND sm.movement_date <= v_end_date))
  ORDER BY sm.movement_date DESC, sm.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- RPC: Check if SIGMA stock can be reduced
CREATE OR REPLACE FUNCTION can_reduce_sigma_stock(
  p_client stock_client_type,
  p_bottle_type bottle_type,
  p_new_quantity INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_total_used INTEGER := 0;
  v_warehouse warehouse_type;
BEGIN
  -- Calculate total stock used across all warehouses for this client/bottle
  FOR v_warehouse IN SELECT unnest(ARRAY['bouteilles_neuves', 'consignes', 'stock_outils', 'bouteilles_hs', 'reconfiguration']::warehouse_type[])
  LOOP
    v_total_used := v_total_used + calculate_theoretical_stock(v_warehouse, p_client, p_bottle_type);
  END LOOP;

  IF p_new_quantity < v_total_used THEN
    RETURN jsonb_build_object(
      'can_reduce', false,
      'error', 'Stock SIGMA insuffisant pour couvrir les stocks existants',
      'total_used', v_total_used,
      'requested', p_new_quantity
    );
  END IF;

  RETURN jsonb_build_object('can_reduce', true);
END;
$$ LANGUAGE plpgsql;

-- 5. RLS POLICIES
-- =============================================

ALTER TABLE sigma_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_inventories ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (can be restricted later)
CREATE POLICY "Allow all on sigma_stock" ON sigma_stock FOR ALL USING (true);
CREATE POLICY "Allow all on stock_movements" ON stock_movements FOR ALL USING (true);
CREATE POLICY "Allow all on stock_inventories" ON stock_inventories FOR ALL USING (true);

-- 6. TRIGGERS
-- =============================================

-- Update updated_at on sigma_stock
CREATE OR REPLACE FUNCTION update_sigma_stock_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sigma_stock_updated_at
  BEFORE UPDATE ON sigma_stock
  FOR EACH ROW
  EXECUTE FUNCTION update_sigma_stock_timestamp();

-- Update updated_at on stock_movements
CREATE OR REPLACE FUNCTION update_stock_movements_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stock_movements_updated_at
  BEFORE UPDATE ON stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_movements_timestamp();
