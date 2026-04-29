import {
  CAPACITE_VOLUMIQUE_L,
  RATIO_GAZ_AIR,
  formatFr,
  parseFr,
  SPHERE_IDS,
  type GlobalSummary,
  type SphereId,
  type SphereInputStrings,
  type SphereResult,
} from '@/utils/sphereStockCompute';

interface StockSpherePrintProps {
  spheres: Record<SphereId, { input: SphereInputStrings; result: SphereResult }>;
  summary: GlobalSummary;
  occurredAt: Date;
  /** En-tête, ex. "STOCK BUTANE OUVERTURE" — l'heure est ajoutée à droite. */
  title?: string;
}

/**
 * Format "1 365 T 887" :
 * tonnes (kg / 1000, padding zéro à 4 chiffres avec espace milliers)
 * + " T " + 3 derniers digits (kg modulo 1000) zéro-padés.
 */
function formatTonnesKg(kg: number | null): string {
  if (kg === null || !Number.isFinite(kg)) return '—';
  const sign = kg < 0 ? '-' : '';
  const abs = Math.abs(kg);
  const tonnes = Math.trunc(abs / 1000);
  const reste = Math.round(abs - tonnes * 1000);
  const tonnesPadded = tonnes < 10000 ? tonnes.toString().padStart(4, '0') : tonnes.toString();
  // Sépare les milliers : "0915" → "0 915", "13658" → "13 658"
  const len = tonnesPadded.length;
  const split = len - 3;
  const tonnesFr = tonnesPadded.slice(0, split) + ' ' + tonnesPadded.slice(split);
  return `${sign}${tonnesFr} T ${reste.toString().padStart(3, '0')}`;
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

function formatHour(d: Date): string {
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}h${m}`;
}

const BORDER = 'border border-black';
const CELL = `${BORDER} px-2 py-1`;
const GREY_BG = 'bg-[#d9d9d9]';
const YELLOW_BG = 'bg-[#fff200]';
const ORANGE_BG = 'bg-[#fbe5d6]';

interface CellProps {
  children?: React.ReactNode;
  highlight?: boolean;
  grey?: boolean;
  bold?: boolean;
  colSpan?: number;
  align?: 'left' | 'right' | 'center';
}

function Cell({
  children,
  highlight,
  grey,
  bold,
  colSpan,
  align = 'right',
}: CellProps) {
  return (
    <td
      colSpan={colSpan}
      className={[
        CELL,
        'tabular-nums',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
        highlight && YELLOW_BG,
        grey && GREY_BG,
        bold && 'font-bold',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </td>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <td className={`${CELL} text-left whitespace-nowrap`}>{children}</td>;
}

function Spacer() {
  return (
    <tr>
      <td className="border-0 h-2" />
      <td className="border-0 h-2" colSpan={6} />
    </tr>
  );
}

export function StockSpherePrint({
  spheres,
  summary,
  occurredAt,
  title = 'STOCK BUTANE OUVERTURE',
}: StockSpherePrintProps) {
  const fullTitle = `${title}  à ${formatHour(occurredAt)}`;
  const get = (id: SphereId) => spheres[id];

  return (
    <div className="bg-white text-black p-6 print:p-3 font-sans text-[11px] leading-tight w-full max-w-[1200px] mx-auto">
      {/* ------------------------------------------------------------------ */}
      {/* En-tête : logo + date | titre | stock du jour                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-[1fr_2fr_1fr] items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <img
            src="/saepp-logo.png"
            alt="SAEPP"
            className="h-12 w-12 object-contain"
            onError={(e) => {
              // Fallback discret si le logo n'est pas (encore) déposé.
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="text-blue-700 font-bold text-[12px] tracking-wide">
            {formatDateLong(occurredAt)}
          </div>
        </div>
        <div
          className={`text-center ${GREY_BG} ${BORDER} px-3 py-2 font-bold text-[13px]`}
        >
          {fullTitle}
        </div>
        <div className="flex items-center justify-end gap-3 text-[12px]">
          <span className="font-semibold">STOCK DU JOUR :</span>
          <span className="text-red-600 font-bold text-[15px] tabular-nums">
            {formatTonnesKg(summary.stockJour)}
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Tableau principal                                                   */}
      {/* ------------------------------------------------------------------ */}
      <table className="w-full border-collapse text-[10.5px]">
        <colgroup>
          <col style={{ width: '23%' }} />
          {SPHERE_IDS.map(() => (
            <>
              <col style={{ width: `${77 / 6}%` }} />
              <col style={{ width: `${77 / 6}%` }} />
            </>
          ))}
        </colgroup>

        <thead>
          {/* Ligne 1 : "DESIGNATION SPHERE" + "SPHERE 01/02/03" */}
          <tr>
            <th className={`${CELL} text-left`}>DESIGNATION SPHERE</th>
            {SPHERE_IDS.map((id) => (
              <th
                key={id}
                colSpan={2}
                className={`${CELL} ${GREY_BG} font-bold`}
              >
                SPHERE {id.replace('S0', '0')}
              </th>
            ))}
          </tr>
          {/* Ligne 2 : "liquide" / "Gaz" */}
          <tr>
            <th className={`${BORDER} bg-white`} />
            {SPHERE_IDS.map((id, idx) => (
              <>
                <th
                  key={id + 'L'}
                  className={`${CELL} font-normal italic text-center`}
                >
                  {idx === 0 ? 'liquide' : 'Liquide'}
                </th>
                <th key={id + 'G'} className={`${CELL} font-normal italic text-center`}>
                  Gaz
                </th>
              </>
            ))}
          </tr>
          {/* Ligne 3 : "SPHERE S01 / S02 / S03" en gris clair */}
          <tr>
            <th className={`${BORDER} bg-white`} />
            {SPHERE_IDS.map((id) => (
              <th
                key={id + 'sub'}
                colSpan={2}
                className={`${CELL} ${GREY_BG} font-bold text-center`}
              >
                SPHERE {id}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* Densité 15°C — valeur fusionnée sur liquide+Gaz */}
          <tr>
            <Label>Densité BAC à 15°C</Label>
            {SPHERE_IDS.map((id) => (
              <Cell key={id + 'd15'} colSpan={2} bold align="center">
                {formatFr(parseFr(get(id).input.densite15), 4)}
              </Cell>
            ))}
          </tr>

          <Spacer />

          {/* Capacité — valeur sur les deux cellules */}
          <tr>
            <Label>CAPACITE STOCKAGE (LITRE)</Label>
            {SPHERE_IDS.map((id) => (
              <>
                <Cell key={id + 'cl'}>{formatFr(CAPACITE_VOLUMIQUE_L[id], 0)}</Cell>
                <Cell key={id + 'cg'}>{formatFr(CAPACITE_VOLUMIQUE_L[id], 0)}</Cell>
              </>
            ))}
          </tr>

          {/* Jauge — yellow liquide, grey Gaz */}
          <tr>
            <Label>JAUGE (millimetre)</Label>
            {SPHERE_IDS.map((id) => (
              <>
                <Cell key={id + 'j'} highlight bold>
                  {formatFr(parseFr(get(id).input.jauge), 0)}
                </Cell>
                <Cell key={id + 'jg'} grey />
              </>
            ))}
          </tr>
          <tr>
            <Label>Volume Liquide (Litre)</Label>
            {SPHERE_IDS.map((id) => (
              <>
                <Cell key={id + 'vl'}>{formatFr(get(id).result.volumeLiquide, 0)}</Cell>
                <Cell key={id + 'vlg'} grey />
              </>
            ))}
          </tr>
          <tr>
            <Label>Volume Gazeux (Litre)</Label>
            {SPHERE_IDS.map((id) => (
              <>
                <Cell key={id + 'vgl'} grey />
                <Cell key={id + 'vg'}>{formatFr(get(id).result.volumeGazeux, 0)}</Cell>
              </>
            ))}
          </tr>

          <Spacer />

          {/* Températures — yellow sur les 2 cellules */}
          <tr>
            <Label>TEMPERATURE (°C)</Label>
            {SPHERE_IDS.map((id) => (
              <>
                <Cell key={id + 'tl'} highlight>
                  {formatFr(parseFr(get(id).input.tLiq), 2)}
                </Cell>
                <Cell key={id + 'tg'} highlight>
                  {formatFr(parseFr(get(id).input.tGaz), 2)}
                </Cell>
              </>
            ))}
          </tr>
          <tr>
            <Label>Masse Volumique Butane Liquide à T° Ambiante (Kg/L)</Label>
            {SPHERE_IDS.map((id) => (
              <>
                <Cell key={id + 'mb'}>{formatFr(get(id).result.densiteButaneLiq, 4)}</Cell>
                <Cell key={id + 'mbg'} grey />
              </>
            ))}
          </tr>
          <tr>
            <Label>Masse Volumique Air Sec à T° Ambiante à P. Atmosph. (Kg/L)</Label>
            {SPHERE_IDS.map((id) => (
              <>
                <Cell key={id + 'mal'} grey />
                <Cell key={id + 'ma'}>{formatFr(get(id).result.masseVolAirGaz, 7)}</Cell>
              </>
            ))}
          </tr>
          <tr>
            <Label>Densité Butane gazeux / Air sec</Label>
            {SPHERE_IDS.map((id) => (
              <>
                <Cell key={id + 'dl'} grey />
                <Cell key={id + 'd'}>{formatFr(RATIO_GAZ_AIR, 3)}</Cell>
              </>
            ))}
          </tr>
          {/* Pression relative (yellow, sans label) */}
          <tr>
            <Label></Label>
            {SPHERE_IDS.map((id) => (
              <>
                <Cell key={id + 'pdl'} grey />
                <Cell key={id + 'pd'} highlight>
                  {formatFr(parseFr(get(id).input.pression), 5)}
                </Cell>
              </>
            ))}
          </tr>
          <tr>
            <Label>Pression Absolue (Bar)</Label>
            {SPHERE_IDS.map((id) => (
              <>
                <Cell key={id + 'pal'} grey />
                <Cell key={id + 'pa'}>{formatFr(get(id).result.pAbs, 5)}</Cell>
              </>
            ))}
          </tr>

          <Spacer />

          {/* Masses */}
          <tr>
            <Label>MASSE (KG)</Label>
            {SPHERE_IDS.map((id) => (
              <>
                <Cell key={id + 'ml'}>{formatFr(get(id).result.masseLiq, 0)}</Cell>
                <Cell key={id + 'mg'}>{formatFr(get(id).result.masseGaz, 0)}</Cell>
              </>
            ))}
          </tr>
          {/* MASSE LIQUIDE + GAZ — fusionné colSpan=2, sans gris */}
          <tr>
            <Label>MASSE LIQUIDE + GAZ (KG)</Label>
            {SPHERE_IDS.map((id) => (
              <Cell key={id + 'mt'} colSpan={2} bold align="center">
                {formatFr(get(id).result.masseTotale, 0)}
              </Cell>
            ))}
          </tr>
          {/* Creux — fusionné colSpan=2, sans gris, 4 décimales */}
          <tr>
            <Label>Creux</Label>
            {SPHERE_IDS.map((id) => (
              <Cell key={id + 'cr'} colSpan={2} align="center">
                {formatFr(get(id).result.creux, 4)}
              </Cell>
            ))}
          </tr>
        </tbody>
      </table>

      {/* ------------------------------------------------------------------ */}
      {/* Bandeau STOCK EXPLOITABLE / NIVEAU DE CREUX                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-2 gap-6 mt-6 items-center">
        <div className="flex items-center gap-3 justify-center">
          <span className="text-[12px] font-semibold">STOCK EXPLOITABLE :</span>
          <span
            className={`${YELLOW_BG} ${BORDER} px-3 py-1 font-bold text-[14px] tabular-nums text-red-600`}
          >
            {formatTonnesKg(summary.stockExploitable)}
          </span>
        </div>
        <div className="flex items-center gap-3 justify-center">
          <span className="text-[12px] font-semibold">NIVEAU DE CREUX :</span>
          <span
            className={`${ORANGE_BG} ${BORDER} px-3 py-1 font-bold text-[14px] tabular-nums`}
          >
            {formatTonnesKg(summary.creuxTotal)}
          </span>
        </div>
      </div>

      {/* Pied : signatures (sans noms) */}
      <div className="grid grid-cols-2 mt-10 text-[10px] font-bold uppercase tracking-wide">
        <div>Responsable Mouvement</div>
        <div className="text-right">Chef de Département Exploitation</div>
      </div>
    </div>
  );
}
