import { z } from 'zod';

// Schema for a single reception
export const receptionSchema = z.object({
  quantity: z.string()
    .transform(val => val.trim() === '' ? '0' : val)
    .refine(val => !isNaN(parseFloat(val)), 'Quantité invalide')
    .refine(val => parseFloat(val) >= 0, 'La quantité doit être positive')
    .refine(val => parseFloat(val) <= 10000000, 'Quantité trop élevée (max 10 000 000 kg)'),
  provenance: z.string()
    .trim()
    .min(1, 'La provenance est requise')
    .max(100, 'La provenance ne peut pas dépasser 100 caractères')
});

// Schema for the full bilan form
export const bilanFormSchema = z.object({
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide'),
  spheres_initial: z.string()
    .transform(val => val.trim() === '' ? '0' : val)
    .refine(val => !isNaN(parseFloat(val)), 'Valeur invalide')
    .refine(val => parseFloat(val) >= 0, 'La valeur doit être positive')
    .refine(val => parseFloat(val) <= 10000000, 'Valeur trop élevée'),
  bouteilles_initial: z.string()
    .transform(val => val.trim() === '' ? '0' : val)
    .refine(val => !isNaN(parseFloat(val)), 'Valeur invalide')
    .refine(val => parseFloat(val) >= 0, 'La valeur doit être positive')
    .refine(val => parseFloat(val) <= 10000000, 'Valeur trop élevée'),
  reservoirs_initial: z.string()
    .transform(val => val.trim() === '' ? '0' : val)
    .refine(val => !isNaN(parseFloat(val)), 'Valeur invalide')
    .refine(val => parseFloat(val) >= 0, 'La valeur doit être positive')
    .refine(val => parseFloat(val) <= 10000000, 'Valeur trop élevée'),
  receptions: z.array(receptionSchema)
    .min(0),
  sorties_vrac: z.string()
    .transform(val => val.trim() === '' ? '0' : val)
    .refine(val => !isNaN(parseFloat(val)), 'Valeur invalide')
    .refine(val => parseFloat(val) >= 0, 'La valeur doit être positive')
    .refine(val => parseFloat(val) <= 10000000, 'Valeur trop élevée'),
  sorties_conditionnees: z.string()
    .transform(val => val.trim() === '' ? '0' : val)
    .refine(val => !isNaN(parseFloat(val)), 'Valeur invalide')
    .refine(val => parseFloat(val) >= 0, 'La valeur doit être positive')
    .refine(val => parseFloat(val) <= 10000000, 'Valeur trop élevée'),
  fuyardes: z.string()
    .transform(val => val.trim() === '' ? '0' : val)
    .refine(val => !isNaN(parseFloat(val)), 'Valeur invalide')
    .refine(val => parseFloat(val) >= 0, 'La valeur doit être positive')
    .refine(val => parseFloat(val) <= 10000000, 'Valeur trop élevée'),
  spheres_final: z.string()
    .transform(val => val.trim() === '' ? '0' : val)
    .refine(val => !isNaN(parseFloat(val)), 'Valeur invalide')
    .refine(val => parseFloat(val) >= 0, 'La valeur doit être positive')
    .refine(val => parseFloat(val) <= 10000000, 'Valeur trop élevée'),
  bouteilles_final: z.string()
    .transform(val => val.trim() === '' ? '0' : val)
    .refine(val => !isNaN(parseFloat(val)), 'Valeur invalide')
    .refine(val => parseFloat(val) >= 0, 'La valeur doit être positive')
    .refine(val => parseFloat(val) <= 10000000, 'Valeur trop élevée'),
  reservoirs_final: z.string()
    .transform(val => val.trim() === '' ? '0' : val)
    .refine(val => !isNaN(parseFloat(val)), 'Valeur invalide')
    .refine(val => parseFloat(val) >= 0, 'La valeur doit être positive')
    .refine(val => parseFloat(val) <= 10000000, 'Valeur trop élevée'),
  notes: z.string()
    .max(1000, 'Les notes ne peuvent pas dépasser 1000 caractères')
});

export type BilanFormValidation = z.infer<typeof bilanFormSchema>;
