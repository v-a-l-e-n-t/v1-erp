import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SphereResult {
  hauteur_mm: number;
  temperature_liquide_c: number;
  temperature_gazeuse_c: number;
  pression_sphere_barg: number;
  densite_d15: number;
  volume_liquide_l: number;
  volume_gazeux_l: number;
  masse_volumique_butane_kgl: number;
  masse_total_liquide_kg: number;
  masse_total_gaz_kg: number;
  masse_liquide_gaz_kg: number;
  creux_kg: number;
}

interface SphereCalculationPrintProps {
  results: SphereResult[];
  capaciteStockage: number;
}

export const SphereCalculationPrint = ({ results, capaciteStockage }: SphereCalculationPrintProps) => {
  const formattedDate = format(new Date(), "EEEE dd MMMM yyyy", { locale: fr });
  
  // Calculs globaux
  const densiteButaneGazAir = 2.004;
  const masseVolAirSec = 0.001175;
  
  // Stock du jour = somme des masses liquide+gaz des 3 sphères
  const stockDuJourKg = results.reduce((sum, r) => sum + r.masse_liquide_gaz_kg, 0);
  const stockDuJourTonnes = stockDuJourKg / 1000;
  
  // Stock exploitable = Stock du jour - 450000 kg = Stock du jour - 450 tonnes
  const stockExploitableTonnes = stockDuJourTonnes - 450;
  
  // Niveau de creux = somme des 3 creux
  const creuxTotalKg = results.reduce((sum, r) => sum + r.creux_kg, 0);
  const creuxTotalTonnes = creuxTotalKg / 1000;

  const getPressionAbsolue = (pressionBarg: number) => pressionBarg + 1.01325;

  const formatNumber = (num: number, decimals: number = 0) => {
    return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',').replace('.', ',');
  };

  return (
    <div className="print-container print:block">
      <style>{`
        @page {
          size: A4 landscape;
          margin: 8mm;
        }
        
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-container {
            display: block !important;
          }
        }
        
        .page {
          width: 297mm;
          height: 210mm;
          padding: 12mm 10mm;
          background: white;
          margin: 0 auto;
          position: relative;
          font-family: Arial, sans-serif;
        }
        
        .header-row {
          display: table;
          width: 100%;
          margin-bottom: 8px;
          border-collapse: collapse;
        }
        
        .header-cell {
          display: table-cell;
          vertical-align: middle;
          padding: 6px 8px;
          border: 1.5px solid #000;
        }
        
        .header-left {
          width: 22%;
          background: white;
        }
        
        .logo-section {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .logo {
          width: 42px;
          height: 42px;
          background: #FF6B1A;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .logo-text {
          color: white;
          font-size: 11px;
          font-weight: bold;
          text-align: center;
          line-height: 1.1;
        }
        
        .date-text {
          font-size: 11px;
          font-weight: bold;
          color: #000;
          line-height: 1.3;
        }
        
        .header-center {
          width: 43%;
          background: #C0C0C0;
          text-align: center;
          padding: 10px;
        }
        
        .main-title {
          font-size: 16px;
          font-weight: bold;
          color: #000;
          letter-spacing: 0.3px;
        }
        
        .header-right {
          width: 35%;
          background: #C0C0C0;
          text-align: left;
          padding: 8px 12px;
        }
        
        .stock-jour {
          display: flex;
          align-items: center;
          justify-content: flex-start;
        }
        
        .stock-label {
          font-size: 10px;
          font-weight: bold;
          color: #000;
          white-space: nowrap;
        }
        
        .stock-value {
          font-size: 20px;
          font-weight: bold;
          color: #D20000;
          margin-left: 15px;
          letter-spacing: 0.5px;
        }
        
        .main-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8.5px;
        }
        
        .main-table td {
          border: 1.2px solid #000;
          padding: 3px 5px;
          vertical-align: middle;
          line-height: 1.2;
        }
        
        .label-col {
          width: 33.33%;
          background: white;
          font-weight: bold;
          text-align: left;
          padding-left: 8px;
          font-size: 8px;
        }
        
        .sphere-title {
          background: #A9A9A9;
          text-align: center;
          font-weight: bold;
          font-size: 11px;
          padding: 5px;
          color: #000;
        }
        
        .sphere-subtitle {
          background: white;
          text-align: center;
          font-size: 8.5px;
          padding: 3px;
          font-weight: normal;
        }
        
        .sphere-code {
          background: #D3D3D3;
          text-align: center;
          font-size: 9px;
          padding: 4px;
          font-weight: bold;
        }
        
        .data-value {
          background: #E8E8E8;
          text-align: right;
          font-size: 9px;
          font-weight: normal;
          padding-right: 8px;
        }
        
        .data-value-bold {
          background: #E8E8E8;
          text-align: right;
          font-size: 9px;
          font-weight: bold;
          padding-right: 8px;
        }
        
        .highlighted-yellow {
          background: #FFFF00 !important;
          font-weight: bold;
          text-align: right;
          padding-right: 8px;
        }
        
        .empty-white {
          background: white;
        }
        
        .section-title {
          background: white;
          font-weight: bold;
          text-align: left;
          padding-left: 8px;
          font-size: 8px;
        }
        
        .small-text {
          font-size: 7.5px;
        }
        
        .footer-boxes {
          display: table;
          width: 100%;
          margin-top: 10px;
          border-collapse: collapse;
        }
        
        .footer-box {
          display: table-cell;
          width: 50%;
          padding: 8px 12px;
          border: 1.5px solid #000;
        }
        
        .footer-left {
          background: #FFE4B5;
          border-right: none;
        }
        
        .footer-right {
          background: #E8E8E8;
          border-left: 1.5px solid #000;
        }
        
        .footer-content {
          display: flex;
          align-items: center;
        }
        
        .footer-label {
          font-size: 10px;
          font-weight: bold;
          color: #000;
          white-space: nowrap;
        }
        
        .footer-value-red {
          font-size: 18px;
          font-weight: bold;
          color: #D20000;
          margin-left: 12px;
          letter-spacing: 0.5px;
        }
        
        .signature-row {
          display: table;
          width: 100%;
          margin-top: 25px;
          border-collapse: collapse;
        }
        
        .signature-cell {
          display: table-cell;
          width: 50%;
          text-align: center;
          font-size: 9px;
          font-weight: bold;
          padding: 8px;
        }
        
        .doc-info {
          position: absolute;
          bottom: 8mm;
          left: 10mm;
          font-size: 7.5px;
          color: #333;
          font-weight: normal;
        }
      `}</style>

      <div className="page">
        {/* HEADER */}
        <div className="header-row">
          <div className="header-cell header-left">
            <div className="logo-section">
              <div className="logo">
                <div className="logo-text">SBM</div>
              </div>
              <div className="date-text">{formattedDate}</div>
            </div>
          </div>
          <div className="header-cell header-center">
            <div className="main-title">STOCK BUTANE OUVERTURE</div>
          </div>
          <div className="header-cell header-right">
            <div className="stock-jour">
              <span className="stock-label">STOCK DU JOUR :</span>
              <span className="stock-value">{formatNumber(stockDuJourTonnes, 3)}T</span>
            </div>
          </div>
        </div>

        {/* MAIN TABLE */}
        <table className="main-table">
          {/* Row 1: Sphere Headers */}
          <tr>
            <td className="label-col">DESIGNATION SPHERE</td>
            {results.map((_, i) => (
              <td key={i} className="sphere-title" colSpan={2}>SPHERE {String(i + 1).padStart(2, '0')}</td>
            ))}
          </tr>
          
          {/* Row 2: Liquide/Gaz */}
          <tr>
            <td className="empty-white"></td>
            {results.map((_, i) => (
              <>
                <td key={`liq-${i}`} className="sphere-subtitle">liquide</td>
                <td key={`gaz-${i}`} className="sphere-subtitle">Gaz</td>
              </>
            ))}
          </tr>
          
          {/* Row 3: Sphere Codes */}
          <tr>
            <td className="empty-white"></td>
            {results.map((_, i) => (
              <td key={i} className="sphere-code" colSpan={2}>SPHERE S{String(i + 1).padStart(2, '0')}</td>
            ))}
          </tr>
          
          {/* Row 4: Densité BAC */}
          <tr>
            <td className="section-title">Densité BAC à 15°C</td>
            {results.map((r, i) => (
              <td key={i} className="data-value" colSpan={2}>{r.densite_d15.toFixed(4)}</td>
            ))}
          </tr>
          
          {/* Row 5: Empty */}
          <tr>
            <td className="empty-white"></td>
            {results.map((_, i) => (
              <>
                <td key={`e1-${i}`} className="empty-white"></td>
                <td key={`e2-${i}`} className="empty-white"></td>
              </>
            ))}
          </tr>
          
          {/* Row 6-20: Continue with all rows mapped for 3 spheres */}
          <tr>
            <td className="section-title">CAPACITE STOCKAGE (LITRE)</td>
            {results.map((_, i) => (
              <>
                <td key={`cap-liq-${i}`} className="data-value">{formatNumber(capaciteStockage)}</td>
                <td key={`cap-gaz-${i}`} className="data-value">{formatNumber(capaciteStockage)}</td>
              </>
            ))}
          </tr>
          
          <tr>
            <td className="section-title">JAUGE (millimetre)</td>
            {results.map((r, i) => (
              <td key={i} className="highlighted-yellow" colSpan={2}>{formatNumber(r.hauteur_mm)}</td>
            ))}
          </tr>
          
          <tr>
            <td className="section-title">Volume Liquide (Litre)</td>
            {results.map((r, i) => (
              <>
                <td key={`vol-liq-${i}`} className="data-value">{formatNumber(Math.round(r.volume_liquide_l))}</td>
                <td key={`vol-empty-${i}`} className="empty-white"></td>
              </>
            ))}
          </tr>
          
          <tr>
            <td className="section-title">Volume Gazeux (Litre)</td>
            {results.map((r, i) => (
              <>
                <td key={`vol-empty2-${i}`} className="empty-white"></td>
                <td key={`vol-gaz-${i}`} className="data-value">{formatNumber(Math.round(r.volume_gazeux_l))}</td>
              </>
            ))}
          </tr>
          
          {/* Row 10: Empty */}
          <tr>
            <td className="empty-white"></td>
            <td className="empty-white"></td>
            <td className="empty-white"></td>
          </tr>
          
          <tr>
            <td className="empty-white"></td>
            {results.map((_, i) => (
              <>
                <td key={`e3-${i}`} className="empty-white"></td>
                <td key={`e4-${i}`} className="empty-white"></td>
              </>
            ))}
          </tr>

          <tr>
            <td className="section-title">TEMPERATURE (°C)</td>
            {results.map((r, i) => (
              <>
                <td key={`temp-liq-${i}`} className="highlighted-yellow">{r.temperature_liquide_c.toFixed(2)}</td>
                <td key={`temp-gaz-${i}`} className="highlighted-yellow">{r.temperature_gazeuse_c.toFixed(2)}</td>
              </>
            ))}
          </tr>
          
          <tr>
            <td className="section-title small-text">Masse Volumique Butane Liquide à T° Ambiante (Kg/L)</td>
            {results.map((r, i) => (
              <>
                <td key={`mv-${i}`} className="data-value">{r.masse_volumique_butane_kgl.toFixed(4)}</td>
                <td key={`mv-empty-${i}`} className="empty-white"></td>
              </>
            ))}
          </tr>
          
          {/* Row 13: Masse Volumique Air Sec */}
          <tr>
            <td className="section-title small-text">Masse Volumique Air Sec à T° Ambiante à P. Atmosph. (Kg/L)</td>
            {results.map((_, i) => (
              <>
                <td key={`mvair-empty-${i}`} className="empty-white"></td>
                <td key={`mvair-${i}`} className="data-value">{masseVolAirSec.toFixed(7)}</td>
              </>
            ))}
          </tr>
          
          {/* Row 14: Densité Butane gazeux */}
          <tr>
            <td className="section-title">Densité Butane gazeux / Air sec</td>
            {results.map((_, i) => (
              <>
                <td key={`dens-empty-${i}`} className="empty-white"></td>
                <td key={`dens-${i}`} className="data-value">{densiteButaneGazAir.toFixed(3)}</td>
              </>
            ))}
          </tr>
          
          {/* Row 15: Empty with pression value */}
          <tr>
            <td className="empty-white"></td>
            {results.map((r, i) => (
              <>
                <td key={`press-empty-${i}`} className="empty-white"></td>
                <td key={`press-${i}`} className="highlighted-yellow">{r.pression_sphere_barg.toFixed(5)}</td>
              </>
            ))}
          </tr>
          
          {/* Row 16: Pression Absolue */}
          <tr>
            <td className="section-title">Pression Absolue (Bar)</td>
            {results.map((r, i) => (
              <>
                <td key={`pressabs-empty-${i}`} className="empty-white"></td>
                <td key={`pressabs-${i}`} className="data-value">{getPressionAbsolue(r.pression_sphere_barg).toFixed(5)}</td>
              </>
            ))}
          </tr>
          
          {/* Row 17: Empty */}
          <tr>
            <td className="empty-white"></td>
            {results.map((_, i) => (
              <>
                <td key={`e5-${i}`} className="empty-white"></td>
                <td key={`e6-${i}`} className="empty-white"></td>
              </>
            ))}
          </tr>
          
          {/* Row 18: MASSE */}
          <tr>
            <td className="section-title">MASSE (KG)</td>
            {results.map((r, i) => (
              <>
                <td key={`masse-liq-${i}`} className="data-value-bold">{formatNumber(Math.round(r.masse_total_liquide_kg))}</td>
                <td key={`masse-gaz-${i}`} className="data-value-bold">{formatNumber(Math.round(r.masse_total_gaz_kg))}</td>
              </>
            ))}
          </tr>
          
          {/* Row 19: MASSE LIQUIDE + GAZ */}
          <tr>
            <td className="section-title">MASSE LIQUIDE + GAZ (KG)</td>
            {results.map((r, i) => (
              <>
                <td key={`massetot-empty-${i}`} className="empty-white"></td>
                <td key={`massetot-${i}`} className="data-value-bold">{formatNumber(Math.round(r.masse_liquide_gaz_kg))}</td>
              </>
            ))}
          </tr>
          
          {/* Row 20: Creux */}
          <tr>
            <td className="section-title">Creux</td>
            {results.map((r, i) => (
              <>
                <td key={`creux-empty-${i}`} className="empty-white"></td>
                <td key={`creux-${i}`} className="data-value">{formatNumber(r.creux_kg, 4)}</td>
              </>
            ))}
          </tr>
        </table>

        {/* FOOTER BOXES */}
        <div className="footer-boxes">
          <div className="footer-box footer-left">
            <div className="footer-content">
              <span className="footer-label">STOCK EXPLOITABLE :</span>
              <span className="footer-value-red">{formatNumber(stockExploitableTonnes, 3)}T</span>
            </div>
          </div>
          <div className="footer-box footer-right">
            <div className="footer-content">
              <span className="footer-label">NIVEAU DE CREUX :</span>
              <span className="footer-value-red">{formatNumber(creuxTotalTonnes, 3)}T</span>
            </div>
          </div>
        </div>

        {/* SIGNATURE SECTION */}
        <div className="signature-row">
          <div className="signature-cell">RESPONSABLE MOUVEMENT</div>
          <div className="signature-cell">CHEF DE DEPARTEMENT EXPLOITATION</div>
        </div>

        {/* DOCUMENT INFO */}
        <div className="doc-info">
          MDD-004-GSG-01&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;OCTOBRE 2023
        </div>
      </div>
    </div>
  );
};