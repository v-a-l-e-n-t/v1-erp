import { formatFr } from '@/utils/sphereStockCompute';
import {
  CAPACITE_VOLUMIQUE_L,
  computeMarketerKg,
  DENSITE_BUTANE_GAZ_AIR,
  parseFr,
  type MarketerSplit,
  type ReceptionResult,
  type ReceptionStateInputs,
  type SphereId,
} from '@/utils/receptionCompute';
import type { ReceptionHeader } from '@/pages/Reception';

interface Props {
  sphereId: SphereId;
  header: ReceptionHeader;
  avantInputs: ReceptionStateInputs;
  apresInputs: ReceptionStateInputs;
  result: ReceptionResult;
  marketer: MarketerSplit;
  occurredAt: Date;
}

function formatDateLong(d: Date): string {
  return d
    .toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
    .toUpperCase();
}

function formatDt(s: string | null | undefined): string {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const BORDER = 'border border-black';
const CELL = `${BORDER} px-2 py-1`;
const GREY = 'bg-[#d9d9d9]';
const BLUE = 'bg-blue-50';
const GREEN = 'bg-green-50';

interface CellProps {
  children?: React.ReactNode;
  bold?: boolean;
  bg?: string;
  align?: 'left' | 'right' | 'center';
  colSpan?: number;
}

function C({ children, bold, bg, align = 'right', colSpan }: CellProps) {
  return (
    <td
      colSpan={colSpan}
      className={[
        CELL,
        'tabular-nums',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
        bg,
        bold && 'font-bold',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </td>
  );
}

function L({ children }: { children: React.ReactNode }) {
  return <td className={`${CELL} text-left whitespace-nowrap`}>{children}</td>;
}

export function ReceptionPrint({
  sphereId,
  header,
  avantInputs,
  apresInputs,
  result,
  marketer,
  occurredAt,
}: Props) {
  const { avant, apres, masse_transferee } = result;
  const mk = computeMarketerKg(marketer, masse_transferee);

  return (
    <div className="bg-white text-black p-6 print:p-3 font-sans text-[11px] leading-tight w-full max-w-[1200px] mx-auto">
      {/* Entête */}
      <div className="grid grid-cols-[1fr_2fr_1fr] items-center gap-4 mb-3">
        <div className="flex items-center gap-2">
          <img
            src="/saepp-logo.png"
            alt="SAEPP"
            className="h-12 w-12 object-contain"
            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
          />
          <div className="text-blue-700 font-bold text-[12px] tracking-wide">
            {formatDateLong(occurredAt)}
          </div>
        </div>
        <div className={`text-center ${GREY} ${BORDER} px-3 py-2 font-bold text-[13px]`}>
          RÉCEPTION BUTANE — SPHÈRE {sphereId}
        </div>
        <div className="flex items-center justify-end gap-3 text-[12px]">
          <span className="font-semibold">N° :</span>
          <span className="font-bold tabular-nums">
            {header.numero_reception || '—'}
          </span>
        </div>
      </div>

      {/* Métadonnées */}
      <table className="w-full border-collapse mb-4 text-[10px]">
        <tbody>
          <tr>
            <L>Dépôt</L>
            <C bg={GREY} align="left">{header.depot || '—'}</C>
            <L>Produit</L>
            <C bg={GREY} align="left">{header.produit || '—'}</C>
            <L>Navire</L>
            <C bg={GREY} align="left">{header.origine_navire || '—'}</C>
            <L>Inspecteur</L>
            <C bg={GREY} align="left">{header.inspecteur || '—'}</C>
          </tr>
          <tr>
            <L>Mise sous douane</L>
            <C align="left">{formatDt(header.date_mise_sous_douane)}</C>
            <L>Début transfert</L>
            <C align="left">{formatDt(header.date_debut_transfert)}</C>
            <L>Fin transfert</L>
            <C align="left">{formatDt(header.date_fin_transfert)}</C>
            <L>Déblocage</L>
            <C align="left">{formatDt(header.date_deblocage)}</C>
          </tr>
        </tbody>
      </table>

      {/* Tableau résultats */}
      <table className="w-full border-collapse text-[10.5px]">
        <thead>
          <tr>
            <th className={`${CELL} text-left bg-white`}>GRANDEUR</th>
            <th colSpan={2} className={`${CELL} ${BLUE} font-bold`}>
              AVANT TRANSFERT
            </th>
            <th colSpan={2} className={`${CELL} ${GREEN} font-bold`}>
              APRÈS TRANSFERT
            </th>
          </tr>
          <tr>
            <th className={`${BORDER} bg-white`} />
            <th className={`${CELL} font-normal italic text-center`}>liquide</th>
            <th className={`${CELL} font-normal italic text-center`}>Gaz</th>
            <th className={`${CELL} font-normal italic text-center`}>liquide</th>
            <th className={`${CELL} font-normal italic text-center`}>Gaz</th>
          </tr>
          <tr>
            <th className={`${BORDER} bg-white`} />
            <th colSpan={2} className={`${CELL} ${GREY} font-bold text-center`}>
              SPHERE {sphereId}
            </th>
            <th colSpan={2} className={`${CELL} ${GREY} font-bold text-center`}>
              SPHERE {sphereId}
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Densité 15°C reçue / bac */}
          <tr>
            <L>Densité reçue à 15°C</L>
            <C colSpan={2} bold align="center">{formatFr(parseFr(avantInputs.densite_recue), 4)}</C>
            <C colSpan={2} bold align="center">{formatFr(parseFr(apresInputs.densite_recue), 4)}</C>
          </tr>
          <tr>
            <L>Densité bac à 15°C</L>
            <C colSpan={2} bold align="center">{formatFr(parseFr(avantInputs.densite_bac), 4)}</C>
            <C colSpan={2} bold align="center">{formatFr(parseFr(apresInputs.densite_bac), 4)}</C>
          </tr>

          <tr><td className="border-0 h-1" colSpan={5} /></tr>

          <tr>
            <L>CAPACITE STOCKAGE (LITRE)</L>
            <C>{formatFr(CAPACITE_VOLUMIQUE_L[sphereId], 0)}</C>
            <C>{formatFr(CAPACITE_VOLUMIQUE_L[sphereId], 0)}</C>
            <C>{formatFr(CAPACITE_VOLUMIQUE_L[sphereId], 0)}</C>
            <C>{formatFr(CAPACITE_VOLUMIQUE_L[sphereId], 0)}</C>
          </tr>
          <tr>
            <L>JAUGE (mm)</L>
            <C bold>{formatFr(parseFr(avantInputs.jauge_mm), 0)}</C>
            <C bg={GREY} />
            <C bold>{formatFr(parseFr(apresInputs.jauge_mm), 0)}</C>
            <C bg={GREY} />
          </tr>
          <tr>
            <L>Volume Liquide (L)</L>
            <C>{formatFr(avant.volume_liquide, 0)}</C>
            <C bg={GREY} />
            <C>{formatFr(apres.volume_liquide, 0)}</C>
            <C bg={GREY} />
          </tr>
          <tr>
            <L>Volume Gazeux (L)</L>
            <C bg={GREY} />
            <C>{formatFr(avant.volume_gazeux, 0)}</C>
            <C bg={GREY} />
            <C>{formatFr(apres.volume_gazeux, 0)}</C>
          </tr>

          <tr><td className="border-0 h-1" colSpan={5} /></tr>

          <tr>
            <L>TEMPERATURE (°C)</L>
            <C>{formatFr(parseFr(avantInputs.temperature_liquide_C), 2)}</C>
            <C>{formatFr(parseFr(avantInputs.temperature_gaz_C), 2)}</C>
            <C>{formatFr(parseFr(apresInputs.temperature_liquide_C), 2)}</C>
            <C>{formatFr(parseFr(apresInputs.temperature_gaz_C), 2)}</C>
          </tr>
          <tr>
            <L>Masse Volumique Butane Liquide (Kg/L)</L>
            <C>{formatFr(avant.rho_butane_liq, 4)}</C>
            <C bg={GREY} />
            <C>{formatFr(apres.rho_butane_liq, 4)}</C>
            <C bg={GREY} />
          </tr>
          <tr>
            <L>Masse Volumique Air Sec (Kg/L)</L>
            <C bg={GREY} />
            <C>{formatFr(avant.rho_air, 7)}</C>
            <C bg={GREY} />
            <C>{formatFr(apres.rho_air, 7)}</C>
          </tr>
          <tr>
            <L>Densité Butane gazeux / Air sec</L>
            <C bg={GREY} />
            <C>{formatFr(DENSITE_BUTANE_GAZ_AIR, 3)}</C>
            <C bg={GREY} />
            <C>{formatFr(DENSITE_BUTANE_GAZ_AIR, 3)}</C>
          </tr>
          <tr>
            <L>Pression Absolue (bar)</L>
            <C bg={GREY} />
            <C>{formatFr(avant.pression_absolue, 5)}</C>
            <C bg={GREY} />
            <C>{formatFr(apres.pression_absolue, 5)}</C>
          </tr>

          <tr><td className="border-0 h-1" colSpan={5} /></tr>

          <tr>
            <L>MASSE (KG)</L>
            <C>{formatFr(avant.masse_liquide, 0)}</C>
            <C>{formatFr(avant.masse_gazeuse, 0)}</C>
            <C>{formatFr(apres.masse_liquide, 0)}</C>
            <C>{formatFr(apres.masse_gazeuse, 0)}</C>
          </tr>
          <tr>
            <L>MASSE LIQUIDE + GAZ (KG)</L>
            <C colSpan={2} bold align="center">{formatFr(avant.masse_totale, 0)}</C>
            <C colSpan={2} bold align="center">{formatFr(apres.masse_totale, 0)}</C>
          </tr>
        </tbody>
      </table>

      {/* Masse transférée */}
      <div className="grid grid-cols-2 gap-4 mt-5 items-center">
        <div className="flex items-center gap-3 justify-center">
          <span className="text-[12px] font-semibold">MASSE TRANSFÉRÉE :</span>
          <span
            className={`${BORDER} px-3 py-1 font-bold text-[16px] tabular-nums ${
              masse_transferee !== null && masse_transferee < 0
                ? 'bg-red-100 text-red-600'
                : 'bg-yellow-100 text-red-600'
            }`}
          >
            {formatFr(masse_transferee, 0)} kg
          </span>
        </div>
        <div className="text-[10px] uppercase tracking-wide font-semibold text-right">
          Sphère {sphereId} · Réception {header.numero_reception || '—'}
        </div>
      </div>

      {/* Marketer split */}
      {(parseFr(marketer.PETROIVOIRE) > 0 ||
        parseFr(marketer.TOTAL_CI) > 0 ||
        parseFr(marketer.VIVO) > 0) && (
        <table className="w-full border-collapse text-[10px] mt-4">
          <thead>
            <tr>
              <th className={`${CELL} ${GREY} text-left`} colSpan={4}>
                RÉPARTITION PAR MARKETER
              </th>
            </tr>
            <tr>
              <th className={`${CELL} text-left`}>Marketer</th>
              <th className={`${CELL} text-right`}>%</th>
              <th className={`${CELL} text-right`}>Quantité (kg)</th>
              <th className={`${CELL} text-left`}>Note</th>
            </tr>
          </thead>
          <tbody>
            {(['PETROIVOIRE', 'TOTAL_CI', 'VIVO'] as const).map((m) => (
              <tr key={m}>
                <L>{m.replace('_', ' ')}</L>
                <C>{formatFr(parseFr(marketer[m]), 2)} %</C>
                <C bold>{formatFr(mk[m], 0)} kg</C>
                <td className={`${CELL} text-left text-muted-foreground`} />
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pied : signatures */}
      <div className="grid grid-cols-2 mt-10 text-[10px] font-bold uppercase tracking-wide">
        <div className="border-t border-black pt-2">Responsable Mouvement</div>
        <div className="border-t border-black pt-2 text-right">Chef de Département Exploitation</div>
      </div>
    </div>
  );
}
