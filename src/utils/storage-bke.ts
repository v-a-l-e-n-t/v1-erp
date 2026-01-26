import { BilanBkeEntry } from '@/types/balance-bke';
import { supabase } from '@/integrations/supabase/client';
import { formatNumberValue } from './calculations';

// Table name for Bouaké bilans
const TABLE_NAME = 'bilan_bke_entries';

export const loadBkeEntries = async (): Promise<BilanBkeEntry[]> => {
  try {
    const { data, error } = await (supabase as any)
      .from(TABLE_NAME)
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error loading BKE entries:', error);
      }
      throw new Error('Impossible de charger les données');
    }

    return (data || []).map((entry: any) => ({
      ...entry,
      receptions: Array.isArray(entry.receptions)
        ? (entry.receptions as Array<{ quantity: number; client: string; reception_no: string }>)
        : []
    })) as BilanBkeEntry[];
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error in loadBkeEntries:', error);
    }
    throw new Error('Erreur lors du chargement des données');
  }
};

export const loadBkeEntryByDate = async (date: string): Promise<BilanBkeEntry | null> => {
  try {
    const { data, error } = await (supabase as any)
      .from(TABLE_NAME)
      .select('*')
      .eq('date', date)
      .maybeSingle();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error loading BKE entry by date:', error);
      }
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      ...data,
      receptions: Array.isArray(data.receptions)
        ? (data.receptions as Array<{ quantity: number; client: string; reception_no: string }>)
        : []
    } as BilanBkeEntry;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error in loadBkeEntryByDate:', error);
    }
    return null;
  }
};

export const saveBkeEntry = async (entry: Omit<BilanBkeEntry, 'user_id'>): Promise<boolean> => {
  try {
    const { error } = await (supabase as any)
      .from(TABLE_NAME)
      .insert(entry as any);

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error saving BKE entry:', error);
      }
      throw new Error('Impossible d\'enregistrer le bilan');
    }

    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error in saveBkeEntry:', error);
    }
    return false;
  }
};

export const updateBkeEntry = async (entry: BilanBkeEntry): Promise<boolean> => {
  try {
    const { error } = await (supabase as any)
      .from(TABLE_NAME)
      .update(entry as any)
      .eq('id', entry.id);

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error updating BKE entry:', error);
      }
      throw new Error('Impossible de mettre à jour le bilan');
    }

    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error in updateBkeEntry:', error);
    }
    return false;
  }
};

export const deleteBkeEntry = async (id: string): Promise<boolean> => {
  try {
    const { error } = await (supabase as any)
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error deleting BKE entry:', error);
      }
      throw new Error('Impossible de supprimer le bilan');
    }

    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error in deleteBkeEntry:', error);
    }
    return false;
  }
};

export const exportBkeToCSV = (entries: BilanBkeEntry[]): void => {
  const headers = [
    'Date',
    'Stock initial (kg)',
    'Total Réception GPL (kg)',
    'Détail Réceptions',
    'Sorties conditionnées (kg)',
    'Retour marché (kg)',
    'Cumul sorties (kg)',
    'Stock théorique (kg)',
    'Stock final (kg)',
    'Bilan (kg)',
    'Nature',
    'Notes'
  ];

  const rows = entries.map(entry => {
    const receptionsStr = entry.receptions.map(r =>
      `${formatNumberValue(r.quantity)} Kg - ${r.reception_no ? `${r.reception_no} - ` : ''}${r.client}`
    ).join('; ');
    return [
      entry.date,
      formatNumberValue(entry.stock_initial),
      formatNumberValue(entry.reception_gpl),
      receptionsStr,
      formatNumberValue(entry.sorties_conditionnees),
      formatNumberValue(entry.fuyardes),
      formatNumberValue(entry.cumul_sorties),
      formatNumberValue(entry.stock_theorique),
      formatNumberValue(entry.stock_final),
      formatNumberValue(entry.bilan),
      entry.nature,
      entry.notes || ''
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `bilan-matiere-bouake-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
