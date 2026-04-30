import { formatFr } from '@/utils/sphereStockCompute';
import {
  CAPACITE_VOLUMIQUE_L,
  computeMarketerKg,
  DENSITE_BUTANE_GAZ_AIR,
  parseFr,
  PRESSION_ATMOSPHERIQUE,
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

const SPHERE_ORDER: SphereId[] = ['S03', 'S02', 'S01'];

const BORDER = 'border border-black';
const CELL = `${BORDER} px-1.5 py-[2px]`;
const GREY = 'bg-[#d9d9d9]';
const GREY_LIGHT = 'bg-[#f0f0f0]';
const YELLOW = 'bg-[#fff200]';

function fmtDt(s: string | null | undefined): string {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtNumOrEmpty(n: number | null | undefined, decimals: number): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '';
  return formatFr(n, decimals);
}

/** Format toujours visible — affiche la valeur ou "—". */
function fmtNumOrDash(n: number | null | undefined, decimals: number): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return formatFr(n, decimals);
}

interface SphereDataset {
  filled: boolean;
  avantInputs: ReceptionStateInputs;
  apresInputs: ReceptionStateInputs;
  result: ReceptionResult;
}

const EMPTY_INPUTS: ReceptionStateInputs = {
  jauge_mm: '', hauteur_min_mm: '', hauteur_max_mm: '',
  volume_min_L: '', volume_max_L: '',
  densite_recue: '', densite_bac: '',
  temperature_liquide_C: '', temp_liq_min_C: '', temp_liq_max_C: '',
  densite_liq_min: '', densite_liq_max: '',
  temperature_gaz_C: '', temp_gaz_min_C: '', temp_gaz_max_C: '',
  airdensity_min: '', airdensity_max: '',
  pression_relative_bar: '',
};

const EMPTY_RESULT: ReceptionResult = {
  avant: {
    volume_liquide: null, volume_gazeux: null, pression_absolue: null,
    densite_15C_melange: null, rho_butane_liq: null, rho_air: null,
    masse_liquide: null, masse_gazeuse: null, masse_totale: null,
  },
  apres: {
    volume_liquide: null, volume_gazeux: null, pression_absolue: null,
    densite_15C_melange: null, rho_butane_liq: null, rho_air: null,
    masse_liquide: null, masse_gazeuse: null, masse_totale: null,
  },
  masse_transferee: null,
};

/** Bloc résultats d'une sphère (slot dans la mise en page Excel). */
function SphereBlock({
  sphereId,
  data,
}: {
  sphereId: SphereId;
  data: SphereDataset;
}) {
  const { filled, avantInputs: av, apresInputs: ap, result } = data;
  const cap = CAPACITE_VOLUMIQUE_L[sphereId];

  // Helpers : retourne "" pour les slots vides, valeur formatée sinon.
  const v = (n: number | null | undefined, d: number) =>
    filled ? fmtNumOrEmpty(n, d) : '';
  const i = (s: string | undefined, d: number) => {
    if (!filled) return '';
    const n = parseFr(s ?? '');
    return Number.isFinite(n) ? formatFr(n, d) : '';
  };

  return (
    <table className="w-full border-collapse text-[8px]">
      {/* Sphere header */}
      <thead>
        <tr>
          <th className={`${CELL} text-left bg-white w-[24%] font-normal`}>
            DESIGNATION GAZ
          </th>
          <th colSpan={4} className={`${CELL} ${GREY} font-bold text-[9px]`}>
            SPHERE {sphereId.replace('S0', 'S0')}
          </th>
        </tr>
        <tr>
          <th className={`${BORDER} bg-white`} />
          <th colSpan={2} className={`${CELL} ${GREY_LIGHT} font-bold text-center`}>
            AVANT
          </th>
          <th colSpan={2} className={`${CELL} ${GREY_LIGHT} font-bold text-center`}>
            APRES
          </th>
        </tr>
        <tr>
          <th className={`${BORDER} bg-white`} />
          <th className={`${CELL} font-normal italic text-center`}>Liquide</th>
          <th className={`${CELL} font-normal italic text-center`}>Gaz</th>
          <th className={`${CELL} font-normal italic text-center`}>Liquide</th>
          <th className={`${CELL} font-normal italic text-center`}>Gaz</th>
        </tr>
      </thead>
      <tbody>
        {/* Densités */}
        <tr>
          <td className={`${CELL} text-left`}>Densité D'origine à 15°C</td>
          <td colSpan={2} className={`${CELL} text-right tabular-nums`}>
            {i(av.densite_recue, 4) || '0,0000'}
          </td>
          <td colSpan={2} className={`${CELL} ${GREY} text-right tabular-nums`}>
            {i(ap.densite_recue, 4)}
          </td>
        </tr>
        <tr>
          <td className={`${CELL} text-left`}>Densité BAC à 15°C</td>
          <td colSpan={2} className={`${CELL} text-right tabular-nums`}>
            {i(av.densite_bac, 4) || '0,0000'}
          </td>
          <td colSpan={2} className={`${CELL} ${GREY} text-right tabular-nums`}>
            {filled ? fmtNumOrEmpty(result.apres.densite_15C_melange, 4) : ''}
          </td>
        </tr>

        {/* Capacité */}
        <tr>
          <td className={`${CELL} text-left`}>CAPACITE STOCKAGE (LITRE)</td>
          <td className={`${CELL} text-right tabular-nums`}>{formatFr(cap, 0)}</td>
          <td className={`${CELL} text-right tabular-nums`}>{formatFr(cap, 0)}</td>
          <td className={`${CELL} text-right tabular-nums`}>{formatFr(cap, 0)}</td>
          <td className={`${CELL} text-right tabular-nums`}>{formatFr(cap, 0)}</td>
        </tr>

        {/* Jauge */}
        <tr>
          <td className={`${CELL} text-left`}>JAUGE (millimetre)</td>
          <td className={`${CELL} ${YELLOW} text-right tabular-nums font-bold`}>
            {i(av.jauge_mm, 0)}
          </td>
          <td className={`${CELL} ${GREY}`} />
          <td className={`${CELL} ${YELLOW} text-right tabular-nums font-bold`}>
            {i(ap.jauge_mm, 0)}
          </td>
          <td className={`${CELL} ${GREY}`} />
        </tr>
        <tr>
          <td className={`${CELL} text-left`}>Volume Liquide (Litre)</td>
          <td className={`${CELL} text-right tabular-nums`}>{v(result.avant.volume_liquide, 0)}</td>
          <td className={`${CELL} ${GREY}`} />
          <td className={`${CELL} text-right tabular-nums`}>{v(result.apres.volume_liquide, 0)}</td>
          <td className={`${CELL} ${GREY}`} />
        </tr>
        <tr>
          <td className={`${CELL} text-left`}>Volume Gazeux (Litre)</td>
          <td className={`${CELL} ${GREY}`} />
          <td className={`${CELL} text-right tabular-nums`}>{v(result.avant.volume_gazeux, 0)}</td>
          <td className={`${CELL} ${GREY}`} />
          <td className={`${CELL} text-right tabular-nums`}>{v(result.apres.volume_gazeux, 0)}</td>
        </tr>

        {/* Températures */}
        <tr>
          <td className={`${CELL} text-left`}>TEMPERATURE (°C)</td>
          <td className={`${CELL} ${YELLOW} text-right tabular-nums font-bold`}>
            {i(av.temperature_liquide_C, 2)}
          </td>
          <td className={`${CELL} ${YELLOW} text-right tabular-nums font-bold`}>
            {i(av.temperature_gaz_C, 2)}
          </td>
          <td className={`${CELL} ${YELLOW} text-right tabular-nums font-bold`}>
            {i(ap.temperature_liquide_C, 2)}
          </td>
          <td className={`${CELL} ${YELLOW} text-right tabular-nums font-bold`}>
            {i(ap.temperature_gaz_C, 2)}
          </td>
        </tr>
        <tr>
          <td className={`${CELL} text-left`}>Masse Volumique Butane Liquide à T° Ambiante (Kg/L)</td>
          <td className={`${CELL} text-right tabular-nums`}>{v(result.avant.rho_butane_liq, 4)}</td>
          <td className={`${CELL} ${GREY}`} />
          <td className={`${CELL} text-right tabular-nums`}>{v(result.apres.rho_butane_liq, 4)}</td>
          <td className={`${CELL} ${GREY}`} />
        </tr>
        <tr>
          <td className={`${CELL} text-left`}>Masse Volumique Air Sec à T° Ambiante à P. Atmosph. (Kg/L)</td>
          <td className={`${CELL} ${GREY}`} />
          <td className={`${CELL} text-right tabular-nums`}>{v(result.avant.rho_air, 7)}</td>
          <td className={`${CELL} ${GREY}`} />
          <td className={`${CELL} text-right tabular-nums`}>{v(result.apres.rho_air, 7)}</td>
        </tr>
        <tr>
          <td className={`${CELL} text-left`}>Densité Butane gazeux / Air sec</td>
          <td className={`${CELL} ${GREY}`} />
          <td className={`${CELL} text-right tabular-nums`}>{formatFr(DENSITE_BUTANE_GAZ_AIR, 3)}</td>
          <td className={`${CELL} ${GREY}`} />
          <td className={`${CELL} text-right tabular-nums`}>{formatFr(DENSITE_BUTANE_GAZ_AIR, 3)}</td>
        </tr>
        <tr>
          <td className={`${CELL} text-left`}>PRESSION RELATIVE (Bar)</td>
          <td className={`${CELL} ${GREY}`} />
          <td className={`${CELL} ${YELLOW} text-right tabular-nums font-bold`}>
            {i(av.pression_relative_bar, 5)}
          </td>
          <td className={`${CELL} ${GREY}`} />
          <td className={`${CELL} ${YELLOW} text-right tabular-nums font-bold`}>
            {i(ap.pression_relative_bar, 5)}
          </td>
        </tr>
        <tr>
          <td className={`${CELL} text-left`}>Pression Absolue (Bar)</td>
          <td className={`${CELL} ${GREY}`} />
          <td className={`${CELL} text-right tabular-nums`}>
            {filled ? formatFr(result.avant.pression_absolue, 5) : formatFr(PRESSION_ATMOSPHERIQUE, 5)}
          </td>
          <td className={`${CELL} ${GREY}`} />
          <td className={`${CELL} text-right tabular-nums`}>
            {filled ? formatFr(result.apres.pression_absolue, 5) : formatFr(PRESSION_ATMOSPHERIQUE, 5)}
          </td>
        </tr>

        {/* Masses */}
        <tr>
          <td className={`${CELL} text-left`}>MASSE (KG)</td>
          <td className={`${CELL} text-right tabular-nums`}>{v(result.avant.masse_liquide, 0)}</td>
          <td className={`${CELL} text-right tabular-nums`}>{v(result.avant.masse_gazeuse, 0)}</td>
          <td className={`${CELL} text-right tabular-nums`}>{v(result.apres.masse_liquide, 0)}</td>
          <td className={`${CELL} text-right tabular-nums`}>{v(result.apres.masse_gazeuse, 0)}</td>
        </tr>
        <tr>
          <td className={`${CELL} ${GREY_LIGHT} text-left font-semibold`}>MASSE LIQUIDE + GAZ (KG)</td>
          <td colSpan={2} className={`${CELL} text-right tabular-nums font-bold`}>
            {v(result.avant.masse_totale, 0)}
          </td>
          <td colSpan={2} className={`${CELL} text-right tabular-nums font-bold`}>
            {v(result.apres.masse_totale, 0)}
          </td>
        </tr>
        <tr>
          <td className={`${CELL} ${GREY_LIGHT} text-left font-semibold`}>MASSE TRANSFEREE (KG)</td>
          <td colSpan={4} className={`${CELL} text-right tabular-nums font-bold text-red-600`}>
            {v(result.masse_transferee, 0)}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** Bloc métadonnées (1 par sphère = 1 colonne). */
function MetadataBlock({ header }: { header: ReceptionHeader }) {
  return (
    <table className="w-full border-collapse text-[8px]">
      <tbody>
        <tr>
          <td className={`${CELL} text-left bg-white w-[40%]`}>DEPOT</td>
          <td className={`${CELL} ${GREY_LIGHT} text-left font-semibold`}>{header.depot || ''}</td>
        </tr>
        <tr>
          <td className={`${CELL} text-left bg-white`}>PRODUIT</td>
          <td className={`${CELL} ${GREY_LIGHT} text-left font-semibold`}>{header.produit || ''}</td>
        </tr>
        <tr>
          <td className={`${CELL} text-left bg-white`}>ORIGINE</td>
          <td className={`${CELL} ${GREY_LIGHT} text-left font-semibold`}>{header.origine_navire || ''}</td>
        </tr>
        <tr>
          <td className={`${CELL} text-left bg-white`}>INSPECTEUR</td>
          <td className={`${CELL} ${GREY_LIGHT} text-left font-semibold`}>{header.inspecteur || ''}</td>
        </tr>
      </tbody>
    </table>
  );
}

function DatesBlock({ header }: { header: ReceptionHeader }) {
  const dates: { label: string; value: string }[] = [
    { label: 'DATE / HEURE MISE SOUS DOUANE', value: fmtDt(header.date_mise_sous_douane) },
    { label: 'DATE / HEURE DEBUT TRANSFERT', value: fmtDt(header.date_debut_transfert) },
    { label: 'DATE / FIN TRANSFERT', value: fmtDt(header.date_fin_transfert) },
    { label: 'DATE / HEURE DEBLOCAGE', value: fmtDt(header.date_deblocage) },
    { label: 'DATE / HEURE JAUGE CONTROLE', value: fmtDt(header.date_jauge_controle) },
  ];
  return (
    <table className="w-full border-collapse text-[8px] mt-1">
      <tbody>
        {dates.map((d) => (
          <tr key={d.label}>
            <td className={`${CELL} text-left bg-white w-[60%]`}>{d.label}</td>
            <td className={`${CELL} text-left bg-white tabular-nums`}>{d.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ReceptionPrint({
  sphereId,
  header,
  avantInputs,
  apresInputs,
  result,
  marketer,
  occurredAt: _occurredAt,
}: Props) {
  // 3 datasets : seul celui qui correspond à la sphère saisie est rempli.
  const datasets: Record<SphereId, SphereDataset> = {
    S01: { filled: sphereId === 'S01', avantInputs, apresInputs, result },
    S02: { filled: sphereId === 'S02', avantInputs, apresInputs, result },
    S03: { filled: sphereId === 'S03', avantInputs, apresInputs, result },
  };
  // Slots non remplis : on injecte des inputs vides pour qu'aucune valeur ne fuite.
  SPHERE_ORDER.forEach((id) => {
    if (!datasets[id].filled) {
      datasets[id] = {
        filled: false,
        avantInputs: EMPTY_INPUTS,
        apresInputs: EMPTY_INPUTS,
        result: EMPTY_RESULT,
      };
    }
  });

  const numero = header.numero_reception?.trim()
    ? `N° ${header.numero_reception}`
    : 'N° 00X / 2026';

  const mk = computeMarketerKg(marketer, result.masse_transferee);
  const cumul = result.masse_transferee ?? 0;

  return (
    <>
      {/* Force A4 paysage avec marges minimales pour rentrer sur 1 page */}
      <style>{`
        @page { size: A4 landscape; margin: 6mm; }
        @media print {
          html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .reception-print-root { font-size: 7px; }
          .reception-print-root table { font-size: 7px; }
          .reception-print-root td, .reception-print-root th { padding: 1px 3px !important; line-height: 1.05; }
        }
      `}</style>
    <div className="reception-print-root bg-white text-black p-2 print:p-0 font-sans w-full mx-auto">
      {/* ========== Bandeau supérieur : logo + titre ========== */}
      <div className="grid grid-cols-[70px_1fr] items-center gap-2 mb-1.5">
        <img
          src="/saepp-logo.png"
          alt="SAEPP"
          className="h-12 w-12 object-contain"
          onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
        />
        <div className={`${BORDER} ${GREY} px-2 py-1 font-bold text-center text-[10px] tracking-wide`}>
          ETAT DE RECEPTION BUTANE {numero}
        </div>
      </div>

      {/* ========== 3 colonnes métadonnées ========== */}
      <div className="grid grid-cols-3 gap-1.5 mb-1.5">
        {SPHERE_ORDER.map((id) => (
          <div key={id}>
            <MetadataBlock header={header} />
            <DatesBlock header={header} />
          </div>
        ))}
      </div>

      {/* ========== 3 sphères côte à côte ========== */}
      <div className="grid grid-cols-3 gap-1.5 mb-1.5">
        {SPHERE_ORDER.map((id) => (
          <SphereBlock key={id} sphereId={id} data={datasets[id]} />
        ))}
      </div>

      {/* ========== Bandeau marketer + cumul réception ========== */}
      <div className="grid grid-cols-[1fr_1fr] gap-2 mb-1.5">
        <table className="w-full border-collapse text-[8px]">
          <thead>
            <tr>
              <th className={`${CELL} ${GREY_LIGHT} text-left font-bold`} colSpan={3}>
                REPARTITION PAR MARKETER (KG)
              </th>
            </tr>
            <tr>
              <th className={`${CELL} ${GREY_LIGHT} text-center font-bold`}>PETROIVOIRE</th>
              <th className={`${CELL} ${GREY_LIGHT} text-center font-bold`}>TOTAL CI</th>
              <th className={`${CELL} ${GREY_LIGHT} text-center font-bold`}>VIVO</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={`${CELL} text-right tabular-nums font-semibold`}>
                {fmtNumOrDash(mk.PETROIVOIRE, 0)}
              </td>
              <td className={`${CELL} text-right tabular-nums font-semibold`}>
                {fmtNumOrDash(mk.TOTAL_CI, 0)}
              </td>
              <td className={`${CELL} text-right tabular-nums font-semibold`}>
                {fmtNumOrDash(mk.VIVO, 0)}
              </td>
            </tr>
          </tbody>
        </table>
        <table className="w-full border-collapse text-[9px]">
          <thead>
            <tr>
              <th className={`${CELL} ${GREY_LIGHT} text-center font-bold text-red-600`}>
                CUMUL RECEPTION
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={`${CELL} text-right tabular-nums font-bold text-red-600 text-[12px]`}>
                {fmtNumOrDash(cumul, 0)} kg
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ========== Zones de signature SAEPP / SBI / DOUANE ========== */}
      <div className="grid grid-cols-3 gap-1.5 mb-1.5">
        {['DEPOT', 'SBI', 'DOUANE'].map((label) => (
          <div key={label}>
            <div className={`${CELL} ${GREY_LIGHT} text-left font-bold text-[7px] tracking-wide`}>
              {label}
            </div>
            <div className={`${BORDER} bg-white h-[28px] print:h-[24px]`} />
          </div>
        ))}
      </div>

      {/* ========== Bandeau cumul + marketer (vue récap unique) ========== */}
      <div className="grid grid-cols-[1fr_1fr_1fr_1fr] mb-1">
        <div className={`${CELL} ${GREY_LIGHT} font-bold text-center text-[9px]`} style={{ gridColumn: '1 / span 4' }}>
          REPARTITION PAR MARKETER (KG)
        </div>
      </div>
      <div className="grid grid-cols-4 mb-1 text-[7px]">
        <div className={`${CELL} ${GREY_LIGHT} font-bold text-center`}>CUMUL RECEPTION</div>
        <div className={`${CELL} ${GREY_LIGHT} font-bold text-center`}>PETROIVOIRE</div>
        <div className={`${CELL} ${GREY_LIGHT} font-bold text-center`}>TOTAL CI</div>
        <div className={`${CELL} ${GREY_LIGHT} font-bold text-center`}>CUMUL</div>
      </div>
      <div className="grid grid-cols-4 mb-2 text-[8px]">
        <div className={`${CELL} text-right tabular-nums font-bold text-red-600`}>
          {fmtNumOrDash(cumul, 0)}
        </div>
        <div className={`${CELL} text-right tabular-nums`}>{fmtNumOrDash(mk.PETROIVOIRE, 0)}</div>
        <div className={`${CELL} text-right tabular-nums`}>{fmtNumOrDash(mk.TOTAL_CI, 0)}</div>
        <div className={`${CELL} text-right tabular-nums font-bold`}>
          {fmtNumOrDash(
            (mk.PETROIVOIRE ?? 0) + (mk.TOTAL_CI ?? 0) + (mk.VIVO ?? 0),
            0,
          )}
        </div>
      </div>

      {/* ========== Pied : signature finale DEPOT / PETROCI / DOUANE ========== */}
      <div className="grid grid-cols-3 mt-3 pt-1 border-t border-black text-[8px] uppercase font-bold tracking-wide">
        <div>DEPOT</div>
        <div className="text-center">PETROCI</div>
        <div className="text-right">DOUANE</div>
      </div>
    </div>
    </>
  );
}
