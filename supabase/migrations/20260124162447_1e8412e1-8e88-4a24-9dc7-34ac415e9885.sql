-- Migration: Add sigma_stock_history table and improve error messages
-- Description:
-- 1. Create sigma_stock_history table to track all stock configuration changes
-- 2. Update create_stock_movement to return available stock in error details

-- 1. Create sigma_stock_history table
CREATE TABLE IF NOT EXISTS sigma_stock_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client stock_client_type NOT NULL,
  bottle_type bottle_type NOT NULL,
  previous_stock INTEGER NOT NULL DEFAULT 0,
  new_stock INTEGER NOT NULL DEFAULT 0,
  change_amount INTEGER NOT NULL DEFAULT 0,
  change_type TEXT NOT NULL CHECK (change_type IN ('configuration', 'ajustement', 'initialisation')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- Index for efficient queries
CREATE INDEX idx_sigma_stock_history_client ON sigma_stock_history(client);
CREATE INDEX idx_sigma_stock_history_date ON sigma_stock_history(created_at DESC);

-- RLS
ALTER TABLE sigma_stock_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on sigma_stock_history" ON sigma_stock_history FOR ALL USING (true);

-- 2. Create function to update sigma stock with history tracking
CREATE OR REPLACE FUNCTION update_sigma_stock_with_history(
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
  -- Get current stock
  SELECT COALESCE(current_stock, 0) INTO v_previous_stock
  FROM sigma_stock
  WHERE client = p_client AND bottle_type = p_bottle_type;

  IF v_previous_stock IS NULL THEN
    v_previous_stock := 0;
  END IF;

  v_change_amount := p_new_quantity - v_previous_stock;

  -- Insert or update sigma_stock
  INSERT INTO sigma_stock (client, bottle_type, current_stock)
  VALUES (p_client, p_bottle_type, p_new_quantity)
  ON CONFLICT (client, bottle_type)
  DO UPDATE SET
    current_stock = p_new_quantity,
    updated_at = NOW();

  -- Record in history
  INSERT INTO sigma_stock_history (
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

-- 3. Update create_stock_movement to return available stock in Dépôt Lub error
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
  v_sigma_stock_b6 INTEGER;
  v_sigma_stock_b12 INTEGER;
BEGIN
  -- Validate: no future dates
  IF p_movement_date > CURRENT_DATE THEN
    RETURN jsonb_build_object('success', false, 'error', 'Les dates futures ne sont pas autorisées');
  END IF;

  -- For entries into Bouteilles Neuves, check and decrement SIGMA
  IF p_warehouse = 'bouteilles_neuves' AND p_movement_type = 'entree' THEN
    -- Get current SIGMA stock for detailed error message
    SELECT COALESCE(current_stock, 0) INTO v_sigma_stock_b6
    FROM sigma_stock WHERE client = p_client AND bottle_type = 'B6';

    SELECT COALESCE(current_stock, 0) INTO v_sigma_stock_b12
    FROM sigma_stock WHERE client = p_client AND bottle_type = 'B12';

    v_sigma_stock_b6 := COALESCE(v_sigma_stock_b6, 0);
    v_sigma_stock_b12 := COALESCE(v_sigma_stock_b12, 0);

    IF NOT decrement_sigma_stock(p_client, COALESCE(p_quantity_b6, 0), COALESCE(p_quantity_b12, 0)) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Stock Dépôt Lub insuffisant',
        'details', jsonb_build_object(
          'required_b6', COALESCE(p_quantity_b6, 0),
          'required_b12', COALESCE(p_quantity_b12, 0),
          'available_b6', v_sigma_stock_b6,
          'available_b12', v_sigma_stock_b12
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

  -- If this is an inventory, also create a record in stock_inventories
  IF p_movement_type = 'inventaire' THEN
    INSERT INTO stock_inventories (
      warehouse, client, inventory_date, quantity_b6, quantity_b12, notes
    ) VALUES (
      p_warehouse, p_client, p_movement_date,
      COALESCE(p_quantity_b6, 0), COALESCE(p_quantity_b12, 0), p_notes
    );
  END IF;

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

-- 4. Function to get sigma stock history
CREATE OR REPLACE FUNCTION get_sigma_stock_history(
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
  FROM sigma_stock_history h
  WHERE (p_client IS NULL OR h.client = p_client)
  ORDER BY h.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;