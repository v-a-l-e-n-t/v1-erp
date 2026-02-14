import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle } from 'lucide-react';
import type { StatutEquipement, InspectionEquipement, InspectionLigneRonde, LigneRondeUpdate } from '@/types/inspection';

interface RondeEquipementRowProps {
  equipement: InspectionEquipement;
  ligne: InspectionLigneRonde;
  disabled: boolean;
  onChange: (update: LigneRondeUpdate) => void;
}

const STATUS_CONFIG: { value: StatutEquipement; label: string; shortLabel: string; color: string; bg: string; ring: string }[] = [
  { value: 'OPERATIONNEL', label: 'Opérationnel', shortLabel: 'OK', color: 'text-white', bg: 'bg-green-600', ring: 'ring-green-600' },
  { value: 'DEGRADE', label: 'Dégradé', shortLabel: 'DEG', color: 'text-white', bg: 'bg-orange-500', ring: 'ring-orange-500' },
  { value: 'HORS_SERVICE', label: 'Hors Service', shortLabel: 'HS', color: 'text-white', bg: 'bg-red-600', ring: 'ring-red-600' },
];

const ROW_BG: Record<string, string> = {
  OPERATIONNEL: 'bg-green-50/50',
  DEGRADE: 'bg-orange-50/50',
  HORS_SERVICE: 'bg-red-50/50',
};

export default function RondeEquipementRow({ equipement, ligne, disabled, onChange }: RondeEquipementRowProps) {
  const [statut, setStatut] = useState<StatutEquipement | null>(ligne.statut);
  const [commentaire, setCommentaire] = useState(ligne.commentaire || '');
  const [urgent, setUrgent] = useState(ligne.urgent);

  useEffect(() => {
    setStatut(ligne.statut);
    setCommentaire(ligne.commentaire || '');
    setUrgent(ligne.urgent);
  }, [ligne.id]);

  const handleStatutChange = (newStatut: StatutEquipement) => {
    if (disabled) return;
    setStatut(newStatut);
    const newUrgent = newStatut === 'OPERATIONNEL' ? false : urgent;
    if (newStatut === 'OPERATIONNEL') setUrgent(false);
    onChange({ equipement_id: equipement.id, statut: newStatut, commentaire, urgent: newUrgent });
  };

  const handleCommentChange = (value: string) => {
    if (disabled) return;
    const trimmed = value.slice(0, 300);
    setCommentaire(trimmed);
    onChange({ equipement_id: equipement.id, statut, commentaire: trimmed, urgent });
  };

  const handleUrgentChange = (checked: boolean) => {
    if (disabled) return;
    setUrgent(checked);
    onChange({ equipement_id: equipement.id, statut, commentaire, urgent: checked });
  };

  const rowBg = statut ? ROW_BG[statut] || '' : '';
  const showUrgent = statut === 'DEGRADE' || statut === 'HORS_SERVICE';

  return (
    <div className={`p-3 rounded-lg border transition-colors ${rowBg}`}>
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        {/* Equipment info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{equipement.nom}</div>
          {equipement.description && (
            <div className="text-xs text-muted-foreground mt-0.5">{equipement.description}</div>
          )}
        </div>

        {/* Status buttons */}
        <div className="flex gap-2 flex-shrink-0">
          {STATUS_CONFIG.map(cfg => (
            <button
              key={cfg.value}
              type="button"
              disabled={disabled}
              onClick={() => handleStatutChange(cfg.value)}
              className={`
                px-4 py-2.5 rounded-lg text-sm font-bold transition-all min-w-[52px]
                ${statut === cfg.value
                  ? `${cfg.bg} ${cfg.color} ring-2 ${cfg.ring} ring-offset-2 shadow-md`
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
              `}
              title={cfg.label}
            >
              {cfg.shortLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Comment + Urgent */}
      {statut && (
        <div className="mt-2 flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <Textarea
              value={commentaire}
              onChange={e => handleCommentChange(e.target.value)}
              placeholder="Commentaire (optionnel, max 300 car.)"
              rows={1}
              maxLength={300}
              disabled={disabled}
              className="text-xs resize-none"
            />
            {commentaire.length > 0 && (
              <span className="text-[10px] text-muted-foreground">{commentaire.length}/300</span>
            )}
          </div>

          {showUrgent && (
            <label className={`flex items-center gap-1.5 flex-shrink-0 px-2 py-1 rounded cursor-pointer ${urgent ? 'bg-red-100 text-red-700' : 'text-slate-500'}`}>
              <Checkbox
                checked={urgent}
                onCheckedChange={(checked) => handleUrgentChange(!!checked)}
                disabled={disabled}
              />
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Urgent</span>
            </label>
          )}
        </div>
      )}
    </div>
  );
}
