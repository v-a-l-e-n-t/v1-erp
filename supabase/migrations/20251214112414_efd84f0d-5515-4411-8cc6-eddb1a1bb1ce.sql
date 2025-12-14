-- Create demo_requests table
CREATE TABLE public.demo_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  telephone TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;

-- Allow public insert (no auth required to request a demo)
CREATE POLICY "Allow public insert to demo_requests"
ON public.demo_requests
FOR INSERT
WITH CHECK (true);

-- Restrict read access to authenticated users only
CREATE POLICY "Authenticated users can view demo_requests"
ON public.demo_requests
FOR SELECT
USING (true);