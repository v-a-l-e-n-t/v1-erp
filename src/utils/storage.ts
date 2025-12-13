import { BilanEntry } from '@/types/balance';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatNumberValue } from './calculations';

export const loadEntries = async (): Promise<BilanEntry[]> => {
  try {
    const { data, error } = await (supabase as any)
      .from('bilan_entries')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error loading entries:', error);
      }
      throw new Error('Impossible de charger les données');
    }

    return (data || []).map((entry: any) => ({
      ...entry,
      receptions: Array.isArray(entry.receptions)
        ? (entry.receptions as Array<{ quantity: number; navire: string; reception_no: string }>)
        : []
    })) as BilanEntry[];
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error in loadEntries:', error);
    }
    throw new Error('Erreur lors du chargement des données');
  }
};

export const loadEntryByDate = async (date: string): Promise<BilanEntry | null> => {
  try {
    const { data, error } = await (supabase as any)
      .from('bilan_entries')
      .select('*')
      .eq('date', date)
      .maybeSingle();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error loading entry by date:', error);
      }
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      ...data,
      receptions: Array.isArray(data.receptions)
        ? (data.receptions as Array<{ quantity: number; navire: string; reception_no: string }>)
        : []
    } as BilanEntry;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error in loadEntryByDate:', error);
    }
    return null;
  }
};

export const saveEntry = async (entry: Omit<BilanEntry, 'user_id'>): Promise<boolean> => {
  try {
    const { error } = await (supabase as any)
      .from('bilan_entries')
      .insert(entry as any);

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error saving entry:', error);
      }
      throw new Error('Impossible d\'enregistrer le bilan');
    }

    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error in saveEntry:', error);
    }
    return false;
  }
};

export const updateEntry = async (entry: BilanEntry): Promise<boolean> => {
  try {
    const { error } = await (supabase as any)
      .from('bilan_entries')
      .update(entry as any)
      .eq('id', entry.id);

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error updating entry:', error);
      }
      throw new Error('Impossible de mettre à jour le bilan');
    }

    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error in updateEntry:', error);
    }
    return false;
  }
};

export const deleteEntry = async (id: string): Promise<boolean> => {
  try {
    const { error } = await (supabase as any)
      .from('bilan_entries')
      .delete()
      .eq('id', id);

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error deleting entry:', error);
      }
      throw new Error('Impossible de supprimer le bilan');
    }

    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error in deleteEntry:', error);
    }
    return false;
  }
};

export const exportToCSV = (entries: BilanEntry[]): void => {
  const headers = [
    'Date',
    'Stock initial (kg)',
    'Total Réception GPL (kg)',
    'Détail Réceptions',
    'Sorties vrac (kg)',
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
    const receptionsStr = entry.receptions.map(r => `${formatNumberValue(r.quantity)} Kg - ${r.reception_no ? `${r.reception_no} - ` : ''}${r.navire}`).join('; ');
    return [
      entry.date,
      formatNumberValue(entry.stock_initial),
      formatNumberValue(entry.reception_gpl),
      receptionsStr,
      formatNumberValue(entry.sorties_vrac),
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
  link.setAttribute('download', `bilan-matiere-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToExcel = (entries: BilanEntry[]): void => {
  // Prepare data for Excel with proper formatting
  const worksheetData: (string | number)[][] = [
    // Header row with styling
    [
      'Date',
      'Stock initial (kg)',
      'Total Réception GPL (kg)',
      'Détail Réceptions',
      'Sorties vrac (kg)',
      'Sorties conditionnées (kg)',
      'Retour marché (kg)',
      'Cumul sorties (kg)',
      'Stock théorique (kg)',
      'Stock final (kg)',
      'Bilan (kg)',
      'Nature',
      'Notes'
    ]
  ];

  // Add data rows
  entries.forEach(entry => {
    const receptionsStr = entry.receptions
      .map(r => `${formatNumberValue(r.quantity)} Kg - ${r.reception_no ? `${r.reception_no} - ` : ''}${r.navire}`)
      .join('; ');

    worksheetData.push([
      new Date(entry.date).toLocaleDateString('fr-FR'),
      entry.stock_initial,
      entry.reception_gpl,
      receptionsStr,
      entry.sorties_vrac,
      entry.sorties_conditionnees,
      entry.fuyardes,
      entry.cumul_sorties,
      entry.stock_theorique,
      entry.stock_final,
      entry.bilan,
      entry.nature,
      entry.notes || ''
    ]);
  });

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths for better readability
  ws['!cols'] = [
    { wch: 12 },  // Date
    { wch: 15 },  // Stock initial
    { wch: 20 },  // Total Réception GPL
    { wch: 40 },  // Détail Réceptions
    { wch: 15 },  // Sorties vrac
    { wch: 20 },  // Sorties conditionnées
    { wch: 12 },  // Retour marché
    { wch: 15 },  // Cumul sorties
    { wch: 16 },  // Stock théorique
    { wch: 12 },  // Stock final
    { wch: 12 },  // Bilan
    { wch: 12 },  // Nature
    { wch: 30 }   // Notes
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Bilans Matière GPL');

  // Generate file and download
  const fileName = `bilan-matiere-gpl-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export const exportIndividualToPDF = (entry: BilanEntry): void => {
  const doc = new jsPDF('p', 'mm', 'a4'); // portrait orientation

  // Add title
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text('Bilan Matière GPL', 105, 20, { align: 'center' });

  // Add date
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Date du bilan: ${new Date(entry.date).toLocaleDateString('fr-FR')}`, 105, 30, { align: 'center' });
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 105, 37, { align: 'center' });

  // Prepare table data with two columns
  const tableData: string[][] = [
    ['Stock initial (kg)', entry.stock_initial.toFixed(3)],
    ['Total Réception GPL (kg)', entry.reception_gpl.toFixed(3)],
  ];

  // Add reception details
  if (entry.receptions && entry.receptions.length > 0) {
    entry.receptions.forEach((r, idx) => {
      tableData.push([
        `  Réception ${idx + 1}`,
        `${r.quantity.toFixed(3)}kg - ${r.reception_no ? `${r.reception_no} - ` : ''}${r.navire}`
      ]);
    });
  }

  tableData.push(
    ['Sorties vrac (kg)', entry.sorties_vrac.toFixed(3)],
    ['Sorties conditionnées (kg)', entry.sorties_conditionnees.toFixed(3)],
    ['Retour marché (kg)', entry.fuyardes.toFixed(3)],
    ['Cumul sorties (kg)', entry.cumul_sorties.toFixed(3)],
    ['Stock théorique (kg)', entry.stock_theorique.toFixed(3)],
    ['Stock final (kg)', entry.stock_final.toFixed(3)],
    ['Bilan (kg)', entry.bilan.toFixed(3)],
    ['Nature', entry.nature]
  );

  if (entry.notes) {
    tableData.push(['Notes', entry.notes]);
  }

  // Create table
  autoTable(doc, {
    startY: 45,
    head: [['Description', 'Valeur']],
    body: tableData,
    styles: {
      fontSize: 11,
      cellPadding: 4,
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle'
    },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'bold' },
      1: { cellWidth: 100, halign: 'left' }
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250]
    },
    didParseCell: function (data) {
      // Color code specific rows
      if (data.section === 'body') {
        const label = data.row.raw[0];
        const value = data.row.raw[1];

        if (label === 'Nature' && data.column.index === 1) {
          if (value === 'Positif') {
            data.cell.styles.textColor = [34, 197, 94];
            data.cell.styles.fontStyle = 'bold';
          } else if (value === 'Négatif') {
            data.cell.styles.textColor = [239, 68, 68];
            data.cell.styles.fontStyle = 'bold';
          } else if (value === 'Neutre') {
            data.cell.styles.textColor = [234, 179, 8];
            data.cell.styles.fontStyle = 'bold';
          }
        }

        if (label === 'Bilan (T)' && data.column.index === 1) {
          const bilan = parseFloat(value);
          if (bilan > 0) {
            data.cell.styles.textColor = [34, 197, 94];
            data.cell.styles.fontStyle = 'bold';
          } else if (bilan < 0) {
            data.cell.styles.textColor = [239, 68, 68];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    }
  });

  // Add footer
  const pageCount = doc.getNumberOfPages();
  doc.setPage(pageCount);
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Page 1 sur 1`,
    doc.internal.pageSize.getWidth() / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: 'center' }
  );

  // Save the PDF
  const fileName = `bilan-${entry.date}.pdf`;
  doc.save(fileName);
};

export const exportToPDF = (entries: BilanEntry[]): void => {
  const doc = new jsPDF('l', 'mm', 'a4'); // landscape orientation

  // Add title
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text('Bilan Matière GPL - Historique', 14, 15);

  // Add date
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 14, 22);

  // Prepare table data
  const tableData = entries.map(entry => {
    const receptionsStr = entry.receptions
      .map(r => `${formatNumberValue(r.quantity)} Kg - ${r.reception_no ? `${r.reception_no} - ` : ''}${r.navire}`)
      .join('\n');

    return [
      new Date(entry.date).toLocaleDateString('fr-FR'),
      formatNumberValue(entry.stock_initial),
      formatNumberValue(entry.reception_gpl),
      receptionsStr,
      formatNumberValue(entry.sorties_vrac),
      formatNumberValue(entry.sorties_conditionnees),
      formatNumberValue(entry.fuyardes),
      formatNumberValue(entry.cumul_sorties),
      formatNumberValue(entry.stock_theorique),
      formatNumberValue(entry.stock_final),
      formatNumberValue(entry.bilan),
      entry.nature
    ];
  });

  // Create table
  autoTable(doc, {
    startY: 28,
    head: [[
      'Date',
      'Stock\ninitial (kg)',
      'Réception\nGPL (kg)',
      'Détail\nRéceptions',
      'Sorties\nvrac (kg)',
      'Sorties\ncond. (kg)',
      'Retour\nmarché\n(kg)',
      'Cumul\nsorties (kg)',
      'Stock\nthéo. (kg)',
      'Stock\nfinal (kg)',
      'Bilan\n(kg)',
      'Nature'
    ]],
    body: tableData,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: 'linebreak',
      halign: 'center'
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle'
    },
    columnStyles: {
      0: { cellWidth: 20 },  // Date
      1: { cellWidth: 18 },  // Stock initial
      2: { cellWidth: 18 },  // Réception GPL
      3: { cellWidth: 40 },  // Détail Réceptions
      4: { cellWidth: 18 },  // Sorties vrac
      5: { cellWidth: 18 },  // Sorties conditionnées
      6: { cellWidth: 16 },  // Retour marché
      7: { cellWidth: 18 },  // Cumul sorties
      8: { cellWidth: 18 },  // Stock théorique
      9: { cellWidth: 18 },  // Stock final
      10: { cellWidth: 16 }, // Bilan
      11: { cellWidth: 18 }  // Nature
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250]
    },
    didParseCell: function (data) {
      // Color code the nature column
      if (data.column.index === 11 && data.section === 'body') {
        const nature = data.cell.text[0];
        if (nature === 'Positif') {
          data.cell.styles.textColor = [34, 197, 94];
          data.cell.styles.fontStyle = 'bold';
        } else if (nature === 'Négatif') {
          data.cell.styles.textColor = [239, 68, 68];
          data.cell.styles.fontStyle = 'bold';
        } else if (nature === 'Neutre') {
          data.cell.styles.textColor = [234, 179, 8];
          data.cell.styles.fontStyle = 'bold';
        }
      }
      // Color code the bilan column
      if (data.column.index === 10 && data.section === 'body') {
        const bilan = parseFloat(data.cell.text[0]);
        if (bilan > 0) {
          data.cell.styles.textColor = [34, 197, 94];
          data.cell.styles.fontStyle = 'bold';
        } else if (bilan < 0) {
          data.cell.styles.textColor = [239, 68, 68];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  // Add footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} sur ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  const fileName = `bilan-matiere-gpl-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
