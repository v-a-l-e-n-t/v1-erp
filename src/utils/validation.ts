import { z } from 'zod';

// Schema for a single reception
export const receptionSchema = z.object({
  quantity: z.string()
    .transform(val => val.trim() === '' ? '0' : val)
    .refine(val => !isNaN(parseFloat(val)), 'Quantité invalide')
    .refine(val => parseFloat(val) >= 0, 'La quantité doit être positive')
    .refine(val => parseFloat(val) <= 10000000, 'Quantité trop élevée (max 10 000 000 kg)'),
  navire: z.string()
    .trim()
    .max(200, 'Le navire ne peut pas dépasser 200 caractères')
    .optional()
    .default(''),
  reception_no: z.string()
    .trim()
    .max(100, 'Le N° réception ne peut pas dépasser 100 caractères')
    .optional()
    .default('')
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
  // Sorties vrac par client
  sorties_vrac_simam: z.string()
    .transform(val => val.trim() === '' ? '0' : val)
    .refine(val => !isNaN(parseFloat(val)), 'Valeur invalide')
    .refine(val => parseFloat(val) >= 0, 'La valeur doit être positive')
    .refine(val => parseFloat(val) <= 10000000, 'Valeur trop élevée'),
  sorties_vrac_petro_ivoire: z.string()
    .transform(val => val.trim() === '' ? '0' : val)
    .refine(val => !isNaN(parseFloat(val)), 'Valeur invalide')
    .refine(val => parseFloat(val) >= 0, 'La valeur doit être positive')
    .refine(val => parseFloat(val) <= 10000000, 'Valeur trop élevée'),
  sorties_vrac_vivo_energies: z.string()
    .transform(val => val.trim() === '' ? '0' : val)
    .refine(val => !isNaN(parseFloat(val)), 'Valeur invalide')
    .refine(val => parseFloat(val) >= 0, 'La valeur doit être positive')
    .refine(val => parseFloat(val) <= 10000000, 'Valeur trop élevée'),
  sorties_vrac_total_energies: z.string()
    .transform(val => val.trim() === '' ? '0' : val)
    .refine(val => !isNaN(parseFloat(val)), 'Valeur invalide')
    .refine(val => parseFloat(val) >= 0, 'La valeur doit être positive')
    .refine(val => parseFloat(val) <= 10000000, 'Valeur trop élevée'),
  // Sorties conditionnées par client
  sorties_conditionnees_petro_ivoire: z.string()
    .transform(val => val.trim() === '' ? '0' : val)
    .refine(val => !isNaN(parseFloat(val)), 'Valeur invalide')
    .refine(val => parseFloat(val) >= 0, 'La valeur doit être positive')
    .refine(val => parseFloat(val) <= 10000000, 'Valeur trop élevée'),
  sorties_conditionnees_vivo_energies: z.string()
    .transform(val => val.trim() === '' ? '0' : val)
    .refine(val => !isNaN(parseFloat(val)), 'Valeur invalide')
    .refine(val => parseFloat(val) >= 0, 'La valeur doit être positive')
    .refine(val => parseFloat(val) <= 10000000, 'Valeur trop élevée'),
  sorties_conditionnees_total_energies: z.string()
    .transform(val => val.trim() === '' ? '0' : val)
    .refine(val => !isNaN(parseFloat(val)), 'Valeur invalide')
    .refine(val => parseFloat(val) >= 0, 'La valeur doit être positive')
    .refine(val => parseFloat(val) <= 10000000, 'Valeur trop élevée'),
  // Fuyardes par client
  fuyardes_petro_ivoire: z.string()
    .transform(val => val.trim() === '' ? '0' : val)
    .refine(val => !isNaN(parseFloat(val)), 'Valeur invalide')
    .refine(val => parseFloat(val) >= 0, 'La valeur doit être positive')
    .refine(val => parseFloat(val) <= 10000000, 'Valeur trop élevée'),
  fuyardes_vivo_energies: z.string()
    .transform(val => val.trim() === '' ? '0' : val)
    .refine(val => !isNaN(parseFloat(val)), 'Valeur invalide')
    .refine(val => parseFloat(val) >= 0, 'La valeur doit être positive')
    .refine(val => parseFloat(val) <= 10000000, 'Valeur trop élevée'),
  fuyardes_total_energies: z.string()
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
