import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatSemaineISO, getKPIColor, getKPIColorHex, getWeekNumber, parseISOWeekToDate, calculateDisponibilite } from './inspection';
import type {
  InspectionRonde,
  InspectionLigneRonde,
  InspectionZone,
  InspectionSousZone,
  InspectionEquipement,
  GlobalKPI,
  StatutEquipement,
} from '@/types/inspection';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

const COLORS = {
  darkBlue: '#1B3A6B',
  green: '#1E8449',
  orange: '#E67E22',
  red: '#C0392B',
  lightGray: '#F1F5F9',
  white: '#FFFFFF',
  black: '#1E293B',
  mutedText: '#64748B',
};

const STATUT_COLORS: Record<StatutEquipement, string> = {
  OPERATIONNEL: COLORS.green,
  DEGRADE: COLORS.orange,
  HORS_SERVICE: COLORS.red,
};

const STATUT_LABELS: Record<StatutEquipement, string> = {
  OPERATIONNEL: 'OK',
  DEGRADE: 'Dégradé',
  HORS_SERVICE: 'Hors Service',
};

// PDF dimensions in mm (A4 landscape)
const W = 297;
const H = 210;
const MARGIN = 15;

export async function generateInspectionPDF(
  ronde: InspectionRonde,
  lignes: InspectionLigneRonde[],
  zones: InspectionZone[],
  sousZones: InspectionSousZone[],
  equipements: InspectionEquipement[],
  kpi: GlobalKPI,
): Promise<void> {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const weekNum = getWeekNumber(ronde.semaine_iso);
  const { start } = parseISOWeekToDate(ronde.semaine_iso);
  const dateStr = format(start, 'dd MMMM yyyy', { locale: fr });
  const footer = `Confidentiel — Dépôt GPL — Exploitation | Semaine ${weekNum}`;

  const addFooter = () => {
    pdf.setFontSize(7);
    pdf.setTextColor(COLORS.mutedText);
    pdf.text(footer, W / 2, H - 5, { align: 'center' });
  };

  // ========== SLIDE 1: COVER ==========
  pdf.setFillColor(COLORS.darkBlue);
  pdf.rect(0, 0, W, H, 'F');

  pdf.setTextColor(COLORS.white);
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.text('INSPECTION HEBDOMADAIRE', W / 2, 65, { align: 'center' });
  pdf.setFontSize(20);
  pdf.text('DÉPÔT GPL', W / 2, 80, { align: 'center' });

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Semaine ${weekNum} — Lundi ${dateStr}`, W / 2, 105, { align: 'center' });

  pdf.setFontSize(11);
  pdf.text(`Rédigé par : ${ronde.soumis_par || '—'} — Département Exploitation`, W / 2, 125, { align: 'center' });
  if (ronde.valide_par) {
    pdf.text(`Validé par : ${ronde.valide_par}`, W / 2, 135, { align: 'center' });
  }

  pdf.setFontSize(7);
  pdf.text(footer, W / 2, H - 5, { align: 'center' });

  // ========== SLIDE 2: GLOBAL DASHBOARD ==========
  pdf.addPage();
  pdf.setTextColor(COLORS.black);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DISPONIBILITÉ GLOBALE DU DÉPÔT', W / 2, 20, { align: 'center' });

  // Central gauge
  const gaugeColor = getKPIColorHex(kpi.couleur);
  const gaugeX = W / 2;
  const gaugeY = 65;
  pdf.setFillColor(gaugeColor);
  pdf.circle(gaugeX, gaugeY, 30, 'F');
  pdf.setTextColor(COLORS.white);
  pdf.setFontSize(26);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${kpi.disponibilite_globale.toFixed(1)}%`, gaugeX, gaugeY + 3, { align: 'center' });
  pdf.setFontSize(9);
  pdf.text('GLOBAL', gaugeX, gaugeY + 12, { align: 'center' });

  // Zone bars
  const barStartY = 110;
  const barHeight = 10;
  const barMaxWidth = 160;
  const barStartX = 70;

  pdf.setTextColor(COLORS.black);
  pdf.setFontSize(10);

  kpi.zones.forEach((z, i) => {
    const y = barStartY + i * 22;
    const barColor = getKPIColorHex(z.couleur);

    // Zone name
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(z.zone_libelle, MARGIN, y + 7);

    // Background bar
    pdf.setFillColor('#E2E8F0');
    pdf.roundedRect(barStartX, y, barMaxWidth, barHeight, 2, 2, 'F');

    // Filled bar
    const fillWidth = Math.max(2, (z.disponibilite_pct / 100) * barMaxWidth);
    pdf.setFillColor(barColor);
    pdf.roundedRect(barStartX, y, fillWidth, barHeight, 2, 2, 'F');

    // Percentage
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(barColor);
    pdf.text(`${z.disponibilite_pct.toFixed(0)}%`, barStartX + barMaxWidth + 5, y + 7);

    // Anomalies count
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(COLORS.mutedText);
    pdf.setFontSize(8);
    const anomCount = z.points_degrade + z.points_hors_service;
    pdf.text(`${anomCount} anomalie${anomCount > 1 ? 's' : ''}`, barStartX + barMaxWidth + 20, y + 7);
    pdf.setTextColor(COLORS.black);
  });

  // Bottom info boxes
  const boxY = barStartY + kpi.zones.length * 22 + 10;
  pdf.setFillColor('#FEF3C7');
  pdf.roundedRect(MARGIN, boxY, 80, 20, 2, 2, 'F');
  pdf.setFontSize(9);
  pdf.setTextColor(COLORS.black);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Anomalies totales : ${kpi.nb_anomalies}`, MARGIN + 5, boxY + 9);
  pdf.text(`Urgences : ${kpi.nb_urgences}`, MARGIN + 5, boxY + 16);

  pdf.setFillColor('#F0F9FF');
  pdf.roundedRect(W - MARGIN - 80, boxY, 80, 20, 2, 2, 'F');
  const deltaText = kpi.delta_vs_previous !== null
    ? `vs sem. précédente : ${kpi.delta_vs_previous > 0 ? '+' : ''}${kpi.delta_vs_previous.toFixed(1)} pts`
    : 'Pas de donnée précédente';
  pdf.setFont('helvetica', 'normal');
  pdf.text(deltaText, W - MARGIN - 75, boxY + 12);

  addFooter();

  // ========== SLIDES 3-5: ZONE DETAILS ==========
  const activeZones = zones.filter(z => z.actif).sort((a, b) => a.ordre - b.ordre);

  for (const zone of activeZones) {
    pdf.addPage();
    const zoneKPI = kpi.zones.find(z => z.zone_id === zone.id);
    const zoneColor = zoneKPI ? getKPIColorHex(zoneKPI.couleur) : COLORS.black;

    // Zone header
    pdf.setFillColor(COLORS.darkBlue);
    pdf.rect(0, 0, W, 25, 'F');
    pdf.setTextColor(COLORS.white);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(zone.libelle, MARGIN, 16);
    if (zoneKPI) {
      pdf.setFontSize(14);
      pdf.text(`${zoneKPI.disponibilite_pct.toFixed(0)}%`, W - MARGIN, 16, { align: 'right' });
    }

    const zoneSZ = sousZones.filter(sz => sz.zone_id === zone.id && sz.actif).sort((a, b) => a.ordre - b.ordre);
    const zoneEquips = equipements.filter(e => e.zone_id === zone.id && e.actif).sort((a, b) => a.ordre - b.ordre);

    let currentY = 35;

    if (zoneSZ.length > 0) {
      // Multiple sub-zones (e.g., Spheres)
      zoneSZ.forEach((sz, szIdx) => {
        const szEquips = zoneEquips.filter(e => e.sous_zone_id === sz.id);
        const szStatuts = szEquips.map(e => lignes.find(l => l.equipement_id === e.id)?.statut ?? null);
        const szDisp = calculateDisponibilite(szStatuts);
        const szColor = getKPIColorHex(getKPIColor(szDisp));

        // Sub-zone header
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(COLORS.darkBlue);
        pdf.text(`${sz.libelle}`, MARGIN, currentY);
        pdf.setTextColor(szColor);
        pdf.text(`${szDisp.toFixed(0)}%`, MARGIN + 60, currentY);
        currentY += 3;

        // Equipment table
        const tableData = szEquips.map(eq => {
          const l = lignes.find(x => x.equipement_id === eq.id);
          const st = l?.statut;
          return [
            eq.nom,
            st ? STATUT_LABELS[st] : '—',
            l?.commentaire || '',
            l?.urgent ? 'URGENT' : '',
          ];
        });

        pdf.autoTable({
          startY: currentY,
          margin: { left: MARGIN, right: MARGIN },
          head: [['Équipement', 'Statut', 'Commentaire', '']],
          body: tableData,
          styles: { fontSize: 8, cellPadding: 1.5 },
          headStyles: { fillColor: COLORS.darkBlue, textColor: COLORS.white, fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 45 },
            1: { cellWidth: 25 },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 18, textColor: COLORS.red, fontStyle: 'bold' },
          },
          didParseCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 1) {
              const val = data.cell.raw as string;
              if (val === 'OK') data.cell.styles.textColor = COLORS.green;
              else if (val === 'Dégradé') data.cell.styles.textColor = COLORS.orange;
              else if (val === 'Hors Service') data.cell.styles.textColor = COLORS.red;
            }
          },
        });

        currentY = pdf.lastAutoTable.finalY + 8;
      });
    } else {
      // Direct equipment (no sub-zones)
      const tableData = zoneEquips.filter(e => !e.sous_zone_id).map(eq => {
        const l = lignes.find(x => x.equipement_id === eq.id);
        const st = l?.statut;
        return [
          eq.nom,
          st ? STATUT_LABELS[st] : '—',
          l?.commentaire || '',
          l?.urgent ? 'URGENT' : '',
        ];
      });

      pdf.autoTable({
        startY: currentY,
        margin: { left: MARGIN, right: MARGIN },
        head: [['Équipement', 'Statut', 'Commentaire', '']],
        body: tableData,
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: COLORS.darkBlue, textColor: COLORS.white },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 30 },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 20, textColor: COLORS.red, fontStyle: 'bold' },
        },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 1) {
            const val = data.cell.raw as string;
            if (val === 'OK') data.cell.styles.textColor = COLORS.green;
            else if (val === 'Dégradé') data.cell.styles.textColor = COLORS.orange;
            else if (val === 'Hors Service') data.cell.styles.textColor = COLORS.red;
          }
        },
      });
    }

    addFooter();
  }

  // ========== SLIDE 6: ACTIONS TABLE ==========
  const anomalies = lignes
    .filter(l => l.statut === 'DEGRADE' || l.statut === 'HORS_SERVICE')
    .map(l => {
      const eq = equipements.find(e => e.id === l.equipement_id);
      const zone = eq ? zones.find(z => z.id === eq.zone_id) : null;
      const sz = eq?.sous_zone_id ? sousZones.find(s => s.id === eq.sous_zone_id) : null;
      return { ...l, equipement: eq, zone, sousZone: sz };
    })
    .sort((a, b) => {
      if (a.urgent && !b.urgent) return -1;
      if (!a.urgent && b.urgent) return 1;
      if (a.statut === 'HORS_SERVICE' && b.statut !== 'HORS_SERVICE') return -1;
      if (a.statut !== 'HORS_SERVICE' && b.statut === 'HORS_SERVICE') return 1;
      return 0;
    });

  if (anomalies.length > 0) {
    pdf.addPage();
    pdf.setFillColor(COLORS.darkBlue);
    pdf.rect(0, 0, W, 25, 'F');
    pdf.setTextColor(COLORS.white);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`ACTIONS ATTENDUES DE LA MAINTENANCE — Semaine ${weekNum}`, MARGIN, 16);

    const actionsData = anomalies.map(a => [
      a.zone?.libelle || '—',
      a.sousZone ? a.sousZone.libelle : '',
      a.equipement?.nom || '—',
      a.statut ? STATUT_LABELS[a.statut] : '—',
      a.commentaire || '—',
      a.urgent ? 'URGENT' : 'Normal',
    ]);

    pdf.autoTable({
      startY: 35,
      margin: { left: MARGIN, right: MARGIN },
      head: [['Zone', 'Sous-zone', 'Équipement', 'Statut', 'Anomalie constatée', 'Priorité']],
      body: actionsData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: COLORS.darkBlue, textColor: COLORS.white },
      columnStyles: {
        5: { fontStyle: 'bold' },
      },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 5) {
          data.cell.styles.textColor = data.cell.raw === 'URGENT' ? COLORS.red : COLORS.orange;
        }
        if (data.section === 'body' && data.column.index === 3) {
          const val = data.cell.raw as string;
          if (val === 'Hors Service') data.cell.styles.textColor = COLORS.red;
          else if (val === 'Dégradé') data.cell.styles.textColor = COLORS.orange;
        }
      },
      didDrawRow: (data: any) => {
        if (data.section === 'body') {
          const priorite = data.row.cells[5]?.raw;
          if (priorite === 'URGENT') {
            pdf.setFillColor('#FEF2F2');
            pdf.rect(data.settings.margin.left, data.row.y, W - data.settings.margin.left - data.settings.margin.right, data.row.height, 'F');
          }
        }
      },
    });

    addFooter();
  }

  // ========== SAVE ==========
  const fileName = `Rapport_Inspection_GPL_S${String(weekNum).padStart(2, '0')}_${format(start, 'yyyyMMdd')}.pdf`;
  pdf.save(fileName);
}
