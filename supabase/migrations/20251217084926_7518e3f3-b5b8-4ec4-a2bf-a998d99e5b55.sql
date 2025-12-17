-- Add password_hash column to vrac_users
ALTER TABLE public.vrac_users
ADD COLUMN password_hash TEXT;