-- Migration: Add production_modifications table for audit trail
-- Created: 2024-11-26
-- Purpose: Track all modifications made to production shifts

-- Create production_modifications table
CREATE TABLE IF NOT EXISTS production_modifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shift_id UUID NOT NULL REFERENCES production_shifts(id) ON DELETE CASCADE,
    modified_by UUID REFERENCES auth.users(id),
    modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    modification_type VARCHAR(20) NOT NULL CHECK (modification_type IN ('update', 'delete')),
    reason TEXT NOT NULL,
    changes JSONB NOT NULL,
    previous_values JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_production_modifications_shift_id ON production_modifications(shift_id);
CREATE INDEX IF NOT EXISTS idx_production_modifications_modified_by ON production_modifications(modified_by);
CREATE INDEX IF NOT EXISTS idx_production_modifications_modified_at ON production_modifications(modified_at DESC);

-- Add RLS policies
ALTER TABLE production_modifications ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can view modification history
CREATE POLICY "Allow authenticated users to view modifications"
    ON production_modifications
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Anyone authenticated can insert modifications (audit trail)
CREATE POLICY "Allow authenticated users to insert modifications"
    ON production_modifications
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Add comment
COMMENT ON TABLE production_modifications IS 'Audit trail for all modifications made to production shifts';
COMMENT ON COLUMN production_modifications.modification_type IS 'Type of modification: update or delete';
COMMENT ON COLUMN production_modifications.reason IS 'User-provided reason for the modification';
COMMENT ON COLUMN production_modifications.changes IS 'JSON object containing the new values';
COMMENT ON COLUMN production_modifications.previous_values IS 'JSON object containing the previous values';