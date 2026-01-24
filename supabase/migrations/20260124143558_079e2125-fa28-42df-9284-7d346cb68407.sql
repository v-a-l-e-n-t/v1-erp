-- Migration: Fix stock inventory update and add 'ventes' origin

-- 1. Add 'ventes' to bottle_origin enum
ALTER TYPE bottle_origin ADD VALUE IF NOT EXISTS 'ventes';

-- 2. Fix create_stock_movement function to also insert into stock_inventories
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
        'error', 'Stock Dépôt Lub insuffisant',
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

  -- FIX: If this is an inventory, also create a record in stock_inventories
  -- This ensures calculate_theoretical_stock uses the new inventory as baseline
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