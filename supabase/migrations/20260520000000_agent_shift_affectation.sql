-- Autorise la valeur 0 dans agents_lignes.numero_ligne pour représenter
-- l'affectation au Shift (les lignes 1-5 restent inchangées).
ALTER TABLE public.agents_lignes
  DROP CONSTRAINT IF EXISTS agents_lignes_numero_ligne_check;

ALTER TABLE public.agents_lignes
  ADD CONSTRAINT agents_lignes_numero_ligne_check
  CHECK (numero_ligne BETWEEN 0 AND 5);

COMMENT ON TABLE public.agents_lignes IS
  'Affectation multi-lignes d''un agent. numero_ligne=0 signifie affectation au Shift (hors ligne).';
