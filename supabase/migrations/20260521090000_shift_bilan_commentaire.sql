-- Commentaire bilan par shift (saisi à la validation du formulaire production)
ALTER TABLE public.production_shifts
  ADD COLUMN IF NOT EXISTS bilan_commentaire text;
