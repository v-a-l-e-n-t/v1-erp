-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT, -- Snapshot of email at time of action
    details JSONB, -- Stores changes or full record
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can insert logs
CREATE POLICY "Users can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Admin/Authenticated users can view logs
CREATE POLICY "Users can view audit logs" ON public.audit_logs
    FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Add tracking columns to critical tables

-- agents
ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS last_modified_by TEXT,
ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMP WITH TIME ZONE;

-- bilan_entries
ALTER TABLE public.bilan_entries 
ADD COLUMN IF NOT EXISTS last_modified_by TEXT,
ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMP WITH TIME ZONE;

-- production_shifts
ALTER TABLE public.production_shifts 
ADD COLUMN IF NOT EXISTS last_modified_by TEXT,
ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMP WITH TIME ZONE;

-- vrac_demandes_chargement (corrected table name)
ALTER TABLE public.vrac_demandes_chargement 
ADD COLUMN IF NOT EXISTS last_modified_by TEXT,
ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMP WITH TIME ZONE;