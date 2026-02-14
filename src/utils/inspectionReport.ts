import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getKPIColor, getKPIColorHex, getWeekNumber, parseISOWeekToDate, calculateDisponibilite } from './inspection';
import type {
  InspectionRonde,
  InspectionLigneRonde,
  InspectionZone,
  InspectionSousZone,
  InspectionEquipement,
  InspectionAnomalie,
  GlobalKPI,
  StatutEquipement,
} from '@/types/inspection';

const COLORS = {
  darkBlue: [27, 58, 107] as [number, number, number],
  green: [30, 132, 73] as [number, number, number],
  orange: [230, 126, 34] as [number, number, number],
  red: [192, 57, 43] as [number, number, number],
  lightGray: [241, 245, 249] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  black: [30, 41, 59] as [number, number, number],
  mutedText: [100, 116, 139] as [number, number, number],
  slateBar: [226, 232, 240] as [number, number, number],
  warmBg: [254, 243, 199] as [number, number, number],
  coolBg: [240, 249, 255] as [number, number, number],
  urgentBg: [254, 242, 242] as [number, number, number],
};

const STATUT_LABELS: Record<StatutEquipement, string> = {
  OPERATIONNEL: 'OK',
  DEGRADE: 'Dégradé',
  HORS_SERVICE: 'Hors Service',
};

function getStatutColor(statut: string): [number, number, number] {
  if (statut === 'OK') return COLORS.green;
  if (statut === 'Dégradé') return COLORS.orange;
  if (statut === 'Hors Service') return COLORS.red;
  return COLORS.black;
}

function kpiColorRGB(couleur: 'green' | 'orange' | 'red'): [number, number, number] {
  if (couleur === 'green') return COLORS.green;
  if (couleur === 'orange') return COLORS.orange;
  return COLORS.red;
}

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
  openAnomalies?: InspectionAnomalie[],
): Promise<void> {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const weekNum = getWeekNumber(ronde.semaine_iso);
  const { start } = parseISOWeekToDate(ronde.semaine_iso);
  const dateStr = format(start, 'dd MMMM yyyy', { locale: fr });

  // ========== SLIDE 1: COVER ==========
  pdf.setFillColor(...COLORS.darkBlue);
  pdf.rect(0, 0, W, H, 'F');

  pdf.setTextColor(...COLORS.white);
  pdf.setFontSize(32);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RAPPORT HEBDOMADAIRE', W / 2, 60, { align: 'center' });
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Departement Exploitation - Mouvement', W / 2, 78, { align: 'center' });

  pdf.setFontSize(14);
  pdf.text(`Semaine ${weekNum} — Lundi ${dateStr}`, W / 2, 105, { align: 'center' });

  pdf.setFontSize(11);
  pdf.text(`Redige par : ${ronde.soumis_par || '—'}`, W / 2, 125, { align: 'center' });
  if (ronde.valide_par) {
    pdf.text(`Valide par : ${ronde.valide_par}`, W / 2, 135, { align: 'center' });
  }

  // ========== SLIDE 2: GLOBAL DASHBOARD ==========
  pdf.addPage();
  pdf.setTextColor(...COLORS.black);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DISPONIBILITE GLOBALE DU DEPOT', W / 2, 22, { align: 'center' });

  // Central gauge
  const gaugeRGB = kpiColorRGB(kpi.couleur);
  const gaugeX = W / 2;
  const gaugeY = 65;
  pdf.setFillColor(...gaugeRGB);
  pdf.circle(gaugeX, gaugeY, 32, 'F');
  pdf.setTextColor(...COLORS.white);
  pdf.setFontSize(30);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${kpi.disponibilite_globale.toFixed(1)}%`, gaugeX, gaugeY + 4, { align: 'center' });
  pdf.setFontSize(10);
  pdf.text('GLOBAL', gaugeX, gaugeY + 14, { align: 'center' });

  // Zone bars
  const barStartY = 110;
  const barHeight = 10;
  const barMaxWidth = 160;
  const barStartX = 70;

  pdf.setTextColor(...COLORS.black);
  pdf.setFontSize(10);

  kpi.zones.forEach((z, i) => {
    const y = barStartY + i * 22;
    const barRGB = kpiColorRGB(z.couleur);

    // Zone name
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(...COLORS.black);
    pdf.text(z.zone_libelle, MARGIN, y + 7);

    // Background bar
    pdf.setFillColor(...COLORS.slateBar);
    pdf.rect(barStartX, y, barMaxWidth, barHeight, 'F');

    // Filled bar
    const fillWidth = Math.max(2, (z.disponibilite_pct / 100) * barMaxWidth);
    pdf.setFillColor(...barRGB);
    pdf.rect(barStartX, y, fillWidth, barHeight, 'F');

    // Percentage
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(...barRGB);
    pdf.text(`${z.disponibilite_pct.toFixed(0)}%`, barStartX + barMaxWidth + 5, y + 8);

    // Anomalies count
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...COLORS.mutedText);
    pdf.setFontSize(8);
    const anomCount = z.points_degrade + z.points_hors_service;
    pdf.text(`${anomCount} anomalie${anomCount > 1 ? 's' : ''}`, barStartX + barMaxWidth + 24, y + 8);
  });

  // Bottom info boxes
  const boxY = barStartY + kpi.zones.length * 22 + 10;
  pdf.setFillColor(...COLORS.warmBg);
  pdf.rect(MARGIN, boxY, 80, 20, 'F');
  pdf.setFontSize(9);
  pdf.setTextColor(...COLORS.black);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Anomalies totales : ${kpi.nb_anomalies}`, MARGIN + 5, boxY + 9);
  pdf.text(`Urgences : ${kpi.nb_urgences}`, MARGIN + 5, boxY + 16);

  pdf.setFillColor(...COLORS.coolBg);
  pdf.rect(W - MARGIN - 80, boxY, 80, 20, 'F');
  const deltaText = kpi.delta_vs_previous !== null
    ? `vs sem. precedente : ${kpi.delta_vs_previous > 0 ? '+' : ''}${kpi.delta_vs_previous.toFixed(1)} pts`
    : 'Pas de donnee precedente';
  pdf.setFont('helvetica', 'normal');
  pdf.text(deltaText, W - MARGIN - 75, boxY + 12);

  // ========== SLIDES 3-5: ZONE DETAILS ==========
  const activeZones = zones.filter(z => z.actif).sort((a, b) => a.ordre - b.ordre);

  for (const zone of activeZones) {
    pdf.addPage();

    // Zone header
    pdf.setFillColor(...COLORS.darkBlue);
    pdf.rect(0, 0, W, 28, 'F');
    pdf.setTextColor(...COLORS.white);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(zone.libelle, MARGIN, 18);

    const zoneKPI = kpi.zones.find(z => z.zone_id === zone.id);
    if (zoneKPI) {
      pdf.setFontSize(22);
      pdf.text(`${zoneKPI.disponibilite_pct.toFixed(0)}%`, W - MARGIN, 19, { align: 'right' });
    }

    const zoneSZ = sousZones.filter(sz => sz.zone_id === zone.id && sz.actif).sort((a, b) => a.ordre - b.ordre);
    const zoneEquips = equipements.filter(e => e.zone_id === zone.id && e.actif).sort((a, b) => a.ordre - b.ordre);

    let currentY = 38;

    if (zoneSZ.length > 0) {
      // Multiple sub-zones (e.g., Spheres)
      for (const sz of zoneSZ) {
        const szEquips = zoneEquips.filter(e => e.sous_zone_id === sz.id);
        const szStatuts = szEquips.map(e => lignes.find(l => l.equipement_id === e.id)?.statut ?? null);
        const szDisp = calculateDisponibilite(szStatuts);
        const szColorRGB = kpiColorRGB(getKPIColor(szDisp));

        // Sub-zone header
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...COLORS.darkBlue);
        pdf.text(sz.libelle, MARGIN, currentY);
        pdf.setTextColor(...szColorRGB);
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

        const result = autoTable(pdf, {
          startY: currentY,
          margin: { left: MARGIN, right: MARGIN },
          head: [['Equipement', 'Statut', 'Commentaire', '']],
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
              data.cell.styles.textColor = getStatutColor(val);
            }
          },
        });

        currentY = (pdf as any).lastAutoTable?.finalY ?? currentY + 30;
        currentY += 8;
      }
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

      autoTable(pdf, {
        startY: currentY,
        margin: { left: MARGIN, right: MARGIN },
        head: [['Equipement', 'Statut', 'Commentaire', '']],
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
            data.cell.styles.textColor = getStatutColor(val);
          }
        },
      });
    }

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
    pdf.setFillColor(...COLORS.darkBlue);
    pdf.rect(0, 0, W, 28, 'F');
    pdf.setTextColor(...COLORS.white);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`ACTIONS ATTENDUES DE LA MAINTENANCE`, MARGIN, 14);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Semaine ${weekNum}`, MARGIN, 23);

    const actionsData = anomalies.map(a => [
      a.zone?.libelle || '—',
      a.sousZone ? a.sousZone.libelle : '',
      a.equipement?.nom || '—',
      a.statut ? STATUT_LABELS[a.statut] : '—',
      a.commentaire || '—',
      a.urgent ? 'URGENT' : 'Normal',
    ]);

    autoTable(pdf, {
      startY: 38,
      margin: { left: MARGIN, right: MARGIN },
      head: [['Zone', 'Sous-zone', 'Equipement', 'Statut', 'Anomalie constatee', 'Priorite']],
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
          data.cell.styles.textColor = getStatutColor(val);
        }
      },
    });

  }

  // ========== SLIDE 7: SUIVI DES ANOMALIES OUVERTES ==========
  if (openAnomalies && openAnomalies.length > 0) {
    pdf.addPage();
    pdf.setFillColor(...COLORS.darkBlue);
    pdf.rect(0, 0, W, 28, 'F');
    pdf.setTextColor(...COLORS.white);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SUIVI DES ANOMALIES OUVERTES', MARGIN, 14);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${openAnomalies.length} anomalie${openAnomalies.length > 1 ? 's' : ''} en attente`, MARGIN, 23);

    const anomaliesData = openAnomalies.map(a => {
      const eq = equipements.find(e => e.id === a.equipement_id);
      const zone = zones.find(z => z.id === a.zone_id);
      const sz = a.sous_zone_id ? sousZones.find(s => s.id === a.sous_zone_id) : null;
      const joursOuverts = Math.max(1, Math.ceil((Date.now() - new Date(a.date_ouverture).getTime()) / (1000 * 60 * 60 * 24)));
      const dateOuverture = format(new Date(a.date_ouverture), 'dd/MM/yyyy', { locale: fr });
      return [
        zone?.libelle || '—',
        sz ? sz.libelle : '',
        eq?.nom || '—',
        a.statut_equipement_initial === 'HORS_SERVICE' ? 'Hors Service' : 'Degrade',
        dateOuverture,
        `${joursOuverts}`,
        a.urgent ? 'URGENT' : 'Normal',
      ];
    });

    autoTable(pdf, {
      startY: 38,
      margin: { left: MARGIN, right: MARGIN },
      head: [['Zone', 'Sous-zone', 'Equipement', 'Statut initial', 'Date ouverture', 'Nb Jours', 'Priorite']],
      body: anomaliesData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: COLORS.darkBlue, textColor: COLORS.white },
      columnStyles: {
        3: { fontStyle: 'bold' },
        5: { fontStyle: 'bold', halign: 'center' },
        6: { fontStyle: 'bold' },
      },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 3) {
          const val = data.cell.raw as string;
          data.cell.styles.textColor = getStatutColor(val);
        }
        if (data.section === 'body' && data.column.index === 5) {
          const jours = parseInt(data.cell.raw as string);
          if (jours > 14) data.cell.styles.textColor = COLORS.red;
          else if (jours > 7) data.cell.styles.textColor = COLORS.orange;
        }
        if (data.section === 'body' && data.column.index === 6) {
          data.cell.styles.textColor = data.cell.raw === 'URGENT' ? COLORS.red : COLORS.orange;
        }
      },
    });

  }

  // ========== SAVE ==========
  const fileName = `Rapport_Hebdomadaire_S${String(weekNum).padStart(2, '0')}_${format(start, 'yyyyMMdd')}.pdf`;
  pdf.save(fileName);
}
