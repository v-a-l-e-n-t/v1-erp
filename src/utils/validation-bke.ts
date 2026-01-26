import { z } from 'zod';
import { BKE_RECEPTION_CLIENTS } from '@/types/balance-bke';

// Schema for a single reception (Bouaké - avec client au lieu de navire)
export const receptionBkeSchema = z.object({
  quantity: z.string()
    .transform(val => val.trim() === '' ? '0' : val)
    .refine(val => !isNaN(parseFloat(val)), 'Quantité invalide')
    .refine(val => parseFloat(val) >= 0, 'La quantité doit être positive')
    .refine(val => parseFloat(val) <= 100000000000, 'Quantité trop élevée (max 100 000 000 000 kg)'),
  client: z.string()
    .trim()
    .refine(val => val === '' || BKE_RECEPTION_CLIENTS.includes(val as any), 'Client invalide')
    .optional()
    .default(''),
  reception_no: z.string()
    .trim()
    .max(100, 'Le N° réception ne peut pas dépasser 100 caractères')
    .optional()
    .default('')
});

// Schema for the full bilan form (Bouaké)
export const bilanBkeFormSchema = z.object({
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide'),
  // Bac stockage au lieu de Sphères
  bac_stockage_initial: z.string()
    .transform(val => val.trim() === '' ? '0' : val)
    .refine(val => !isNaN(parseFloat(val)), 'Valeur invalide')
    .refine(val => parseFloat(val) >= 0, 'La valeur doit être positive')
    .refine(val => parseFloat(val) <= 100000000000, 'Valeur trop élevée'),
  bouteilles_initial: z.string()
    .transform(val => val.trim() === '' ? '0' : val)
    .refine(val => !isNaN(parseFloat(val)), 'Valeur invalide')
    .refine(val => parseFloat(val) >= 0, 'La valeur doit être positive')
    .refine(val => parseFloat(val) <= 100000000000, 'Valeur trop élevée'),
  // PAS de reservoirs_initial à Bouaké
  receptions: z.array(receptionBkeSchema)
    .min(0),
  // PAS de sorties vrac à Bouaké
  // Sorties conditionnées par client
  sorties_conditionnees_petro_ivoire: z.string()
    .transform(val => val.trim() === '' ? '0' : val)
    .refine(val => !isNaN(parseFloat(val)), 'Valeur invalide')
    .refine(val => parseFloat(val) >= 0, 'La valeur doit être positive')
    .refine(val => parseFloat(val) <= 100000000000, 'Valeur trop élevée'),
  sorties_conditionnees_vivo_energies: z.string()
    .transform(val => val.trim() === '' ? '0' : val)
    .refine(val => !isNaN(parseFloat(val)), 'Valeur invalide')
    .refine(val => parseFloat(val) >= 0, 'La valeur doit être positive')
    .refine(val => parseFloat(val) <= 100000000000, 'Valeur trop élevée'),
  sorties_conditionnees_total_energies: z.string()
    .transform(val => val.trim() === '' ? '0' : val)
    .refine(val => !isNaN(parseFloat(val)), 'Valeur invalide')
    .refine(val => parseFloat(val) >= 0, 'La valeur doit être positive')
    .refine(val => parseFloat(val) <= 100000000000, 'Valeur trop élevée'),
  // Retour marché par client
  fuyardes_petro_ivoire: z.string()
    .transform(val => val.trim() === '' ? '0' : val)
    .refine(val => !isNaN(parseFloat(val)), 'Valeur invalide')
    .refine(val => parseFloat(val) >= 0, 'La valeur doit être positive')
    .refine(val => parseFloat(val) <= 100000000000, 'Valeur trop élevée'),
  fuyardes_vivo_energies: z.string()
    .transform(val => val.trim() === '' ? '0' : val)
    .refine(val => !isNaN(parseFloat(val)), 'Valeur invalide')
    .refine(val => parseFloat(val) >= 0, 'La valeur doit être positive')
    .refine(val => parseFloat(val) <= 100000000000, 'Valeur trop élevée'),
  fuyardes_total_energies: z.string()
    .transform(val => val.trim() === '' ? '0' : val)
    .refine(val => !isNaN(parseFloat(val)), 'Valeur invalide')
    .refine(val => parseFloat(val) >= 0, 'La valeur doit être positive')
    .refine(val => parseFloat(val) <= 100000000000, 'Valeur trop élevée'),
  // Bac stockage au lieu de Sphères
  bac_stockage_final: z.string()
    .transform(val => val.trim() === '' ? '0' : val)
    .refine(val => !isNaN(parseFloat(val)), 'Valeur invalide')
    .refine(val => parseFloat(val) >= 0, 'La valeur doit être positive')
    .refine(val => parseFloat(val) <= 100000000000, 'Valeur trop élevée'),
  bouteilles_final: z.string()
    .transform(val => val.trim() === '' ? '0' : val)
    .refine(val => !isNaN(parseFloat(val)), 'Valeur invalide')
    .refine(val => parseFloat(val) >= 0, 'La valeur doit être positive')
    .refine(val => parseFloat(val) <= 100000000000, 'Valeur trop élevée'),
  // PAS de reservoirs_final à Bouaké
  notes: z.string()
    .max(1000, 'Les notes ne peuvent pas dépasser 1000 caractères')
});

export type BilanBkeFormValidation = z.infer<typeof bilanBkeFormSchema>;
