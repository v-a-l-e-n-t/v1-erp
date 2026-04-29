import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Gauge, Thermometer, Flame, Activity } from 'lucide-react';
import {
  CAPACITE_VOLUMIQUE_L,
  padDecimalsFr,
  type SphereId,
  type SphereInputStrings,
} from '@/utils/sphereStockCompute';
import { ResultsPanel } from './ResultsPanel';
import type { UseSphereStock } from '@/hooks/useSphereStock';

interface SphereStockBlockProps {
  sphereId: SphereId;
  sphere: UseSphereStock;
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: (v: string) => string;
  placeholder?: string;
  inputMode?: 'decimal' | 'numeric';
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  inputMode = 'decimal',
}: FieldProps) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground font-medium">
        {label}
      </Label>
      <Input
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => {
          if (onBlur) {
            const next = onBlur(e.target.value);
            if (next !== e.target.value) onChange(next);
          }
        }}
        placeholder={placeholder}
        className="h-8 text-sm font-mono tabular-nums"
      />
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  unit,
}: {
  icon: typeof Gauge;
  title: string;
  unit?: string;
}) {
  return (
    <div className="flex items-center gap-2 mt-3 mb-1 -mx-4 px-4 py-1.5 bg-primary text-primary-foreground">
      <Icon className="h-3.5 w-3.5" />
      <span className="text-[11px] uppercase tracking-widest font-bold">
        {title}
      </span>
      {unit && (
        <span className="text-[10px] font-mono opacity-90">({unit})</span>
      )}
    </div>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium mt-1.5 mb-0.5">
      {children}
    </div>
  );
}

export function SphereStockBlock({ sphereId, sphere }: SphereStockBlockProps) {
  const { input, result, setField } = sphere;

  const set =
    (key: keyof SphereInputStrings) =>
    (v: string) =>
      setField(key, v);

  const blur4 = (v: string) => padDecimalsFr(v, 4);
  const blur3 = (v: string) => padDecimalsFr(v, 3);
  const blur2 = (v: string) => padDecimalsFr(v, 2);
  const blur0 = (v: string) => padDecimalsFr(v, 0);

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="py-3 px-4 border-b bg-muted/30">
        <div className="flex items-baseline justify-between">
          <h3 className="font-bold text-orange-500 tracking-tight">
            Sphère {sphereId}
          </h3>
          <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
            Cap. {CAPACITE_VOLUMIQUE_L[sphereId].toLocaleString('fr-FR')} L
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {/* Champ 1 — Densité */}
        <SectionHeader icon={Activity} title="Densité" />
        <Field
          label="Densité produit (4 déc.)"
          value={input.densite15}
          onChange={set('densite15')}
          onBlur={blur4}
          placeholder="0,5841"
        />

        {/* Champ 2 — Jauge */}
        <SectionHeader icon={Gauge} title="Jauge du jour" unit="mm" />
        <Field
          label="Valeur (mm)"
          value={input.jauge}
          onChange={set('jauge')}
          onBlur={blur0}
          inputMode="numeric"
          placeholder="2697"
        />
        <SubLabel>Encadrement hauteur (mm)</SubLabel>
        <div className="grid grid-cols-2 gap-2">
          <Field label="H min" value={input.hMin} onChange={set('hMin')} onBlur={blur0} />
          <Field label="H max" value={input.hMax} onChange={set('hMax')} onBlur={blur0} />
        </div>
        <SubLabel>Correspondance volume (L)</SubLabel>
        <div className="grid grid-cols-2 gap-2">
          <Field label="V min" value={input.vMin} onChange={set('vMin')} onBlur={blur0} />
          <Field label="V max" value={input.vMax} onChange={set('vMax')} onBlur={blur0} />
        </div>

        {/* Champ 3 — Température liquide */}
        <SectionHeader icon={Thermometer} title="T° liquide" unit="°C" />
        <Field
          label="Valeur (°C)"
          value={input.tLiq}
          onChange={set('tLiq')}
          onBlur={blur2}
          placeholder="23,68"
        />
        <SubLabel>Encadrement T° (°C)</SubLabel>
        <div className="grid grid-cols-2 gap-2">
          <Field label="T min" value={input.tLiqMin} onChange={set('tLiqMin')} onBlur={blur2} />
          <Field label="T max" value={input.tLiqMax} onChange={set('tLiqMax')} onBlur={blur2} />
        </div>
        <SubLabel>Correspondance densité</SubLabel>
        <div className="grid grid-cols-2 gap-2">
          <Field
            label="D min"
            value={input.dLiqMin}
            onChange={set('dLiqMin')}
            onBlur={blur4}
          />
          <Field
            label="D max"
            value={input.dLiqMax}
            onChange={set('dLiqMax')}
            onBlur={blur4}
          />
        </div>

        {/* Champ 4 — Température gaz */}
        <SectionHeader icon={Flame} title="T° gaz" unit="°C" />
        <Field
          label="Valeur (°C)"
          value={input.tGaz}
          onChange={set('tGaz')}
          onBlur={blur2}
          placeholder="23,51"
        />
        <SubLabel>Encadrement T° (°C)</SubLabel>
        <div className="grid grid-cols-2 gap-2">
          <Field label="T min" value={input.tGazMin} onChange={set('tGazMin')} onBlur={blur2} />
          <Field label="T max" value={input.tGazMax} onChange={set('tGazMax')} onBlur={blur2} />
        </div>
        <SubLabel>Correspondance densité</SubLabel>
        <div className="grid grid-cols-2 gap-2">
          <Field
            label="D min"
            value={input.dGazMin}
            onChange={set('dGazMin')}
            onBlur={blur4}
          />
          <Field
            label="D max"
            value={input.dGazMax}
            onChange={set('dGazMax')}
            onBlur={blur4}
          />
        </div>

        {/* Champ 5 — Pression */}
        <SectionHeader icon={Activity} title="Pression relative" unit="bar" />
        <Field
          label="Valeur (3 déc.)"
          value={input.pression}
          onChange={set('pression')}
          onBlur={blur3}
          placeholder="1,273"
        />

        <div className="pt-3">
          <ResultsPanel result={result} />
        </div>
      </CardContent>
    </Card>
  );
}
