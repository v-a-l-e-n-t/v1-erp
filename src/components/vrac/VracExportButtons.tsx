import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as XLSX from 'xlsx-js-style';
import type { VracDemandeChargement } from '@/types/vrac';

interface VracExportButtonsProps {
    demandes: VracDemandeChargement[];
    dateLabel?: string;
}

const statusLabel = (s: string) => {
    if (s === 'en_attente') return 'En attente';
    if (s === 'charge') return 'Chargé';
    if (s === 'refusee') return 'Refusée';
    return s;
};

const VracExportButtons: React.FC<VracExportButtonsProps> = ({ demandes, dateLabel }) => {
    const [exportingExcel, setExportingExcel] = useState(false);

    const handleExcelExport = async () => {
        setExportingExcel(true);
        try {
            const wb = XLSX.utils.book_new();

            const headerStyle = {
                font: { bold: true, color: { rgb: 'FFFFFF' } },
                fill: { fgColor: { rgb: 'E07020' } },
                alignment: { horizontal: 'center' as const },
                border: {
                    top: { style: 'thin' as const, color: { rgb: '000000' } },
                    bottom: { style: 'thin' as const, color: { rgb: '000000' } },
                    left: { style: 'thin' as const, color: { rgb: '000000' } },
                    right: { style: 'thin' as const, color: { rgb: '000000' } },
                },
            };

            const headers = ['Date', 'Client', 'Tracteur', 'Citerne', 'Statut', 'Tonnage (kg)', 'Motif refus'];
            const data = demandes.map(d => [
                format(new Date(d.date_chargement), 'dd/MM/yyyy'),
                d.vrac_clients?.nom_affichage || '-',
                d.immatriculation_tracteur,
                d.immatriculation_citerne,
                statusLabel(d.statut),
                d.tonnage_charge ? Math.round(d.tonnage_charge * 1000) : '-',
                d.motif_refus || '',
            ]);

            const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

            // Apply header styles
            headers.forEach((_, i) => {
                const cell = XLSX.utils.encode_cell({ r: 0, c: i });
                if (ws[cell]) ws[cell].s = headerStyle;
            });

            // Column widths
            ws['!cols'] = [
                { wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 16 },
                { wch: 12 }, { wch: 14 }, { wch: 30 },
            ];

            XLSX.utils.book_append_sheet(wb, ws, 'Chargements VRAC');

            const fileName = `vrac_chargements_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
            XLSX.writeFile(wb, fileName);
        } finally {
            setExportingExcel(false);
        }
    };

    return (
        <div className="flex gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={handleExcelExport}
                disabled={exportingExcel || demandes.length === 0}
            >
                {exportingExcel ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                    <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
                )}
                Excel
            </Button>
        </div>
    );
};

export default VracExportButtons;
