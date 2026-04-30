import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gauge, Thermometer, Flame, Activity, FlaskConical } from 'lucide-react';
import { padDecimalsFr } from '@/utils/sphereStockCompute';
import {
  autoFillFromKey,
  type ReceptionStateInputs,
  type SphereId,
} from '@/utils/receptionCompute';

interface Props {
  title: 'AVANT transfert' | 'APRÈS transfert';
  sphereId: SphereId;
  inputs: ReceptionStateInputs;
  onChange: (next: ReceptionStateInputs) => void;
}

const blur = (decimals: number) => (v: string) => padDecimalsFr(v, decimals);

function Field({
  label,
  value,
  onChange,
  onBlur,
  inputMode = 'decimal',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: (v: string) => string;
  inputMode?: 'decimal' | 'numeric';
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground font-medium">{label}</Label>
      <Input
        type="text"
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => {
          if (onBlur) {
            const next = onBlur(e.target.value);
            if (next !== e.target.value) onChange(next);
          }
        }}
        className="h-8 text-sm font-mono tabular-nums"
      />
    </div>
  );
}

function Section({
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
      <span className="text-[11px] uppercase tracking-widest font-bold">{title}</span>
      {unit && <span className="text-[10px] font-mono opacity-90">({unit})</span>}
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

export function ReceptionStateInputsBlock({
  title,
  sphereId,
  inputs,
  onChange,
}: Props) {
  const setField = (key: keyof ReceptionStateInputs) => (v: string) => {
    const patch = autoFillFromKey(sphereId, key, v);
    onChange({ ...inputs, [key]: v, ...(patch ?? {}) });
  };

  const blur4 = blur(4);
  const blur3 = blur(3);
  const blur2 = blur(2);
  const blur0 = blur(0);

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="py-3 px-4 border-b bg-muted/30">
        <h3 className="font-bold text-orange-500 tracking-tight">{title}</h3>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {/* Densités */}
        <Section icon={FlaskConical} title="Densité 15°C" />
        <div className="grid grid-cols-2 gap-2">
          <Field
            label="Densité reçue (4 déc.)"
            value={inputs.densite_recue}
            onChange={setField('densite_recue')}
            onBlur={blur4}
            placeholder="0,5841"
          />
          <Field
            label="Densité bac (4 déc.)"
            value={inputs.densite_bac}
            onChange={setField('densite_bac')}
            onBlur={blur4}
            placeholder="0,5774"
          />
        </div>

        {/* Jauge */}
        <Section icon={Gauge} title="Jauge du jour" unit="mm" />
        <Field
          label="Valeur (mm)"
          value={inputs.jauge_mm}
          onChange={setField('jauge_mm')}
          onBlur={blur0}
          inputMode="numeric"
          placeholder="2697"
        />
        <SubLabel>Encadrement hauteur (mm)</SubLabel>
        <div className="grid grid-cols-2 gap-2">
          <Field label="H min" value={inputs.hauteur_min_mm} onChange={setField('hauteur_min_mm')} onBlur={blur0} />
          <Field label="H max" value={inputs.hauteur_max_mm} onChange={setField('hauteur_max_mm')} onBlur={blur0} />
        </div>
        <SubLabel>Correspondance volume (L)</SubLabel>
        <div className="grid grid-cols-2 gap-2">
          <Field label="V min" value={inputs.volume_min_L} onChange={setField('volume_min_L')} onBlur={blur0} />
          <Field label="V max" value={inputs.volume_max_L} onChange={setField('volume_max_L')} onBlur={blur0} />
        </div>

        {/* Température liquide */}
        <Section icon={Thermometer} title="T° liquide" unit="°C" />
        <Field
          label="Valeur (°C)"
          value={inputs.temperature_liquide_C}
          onChange={setField('temperature_liquide_C')}
          onBlur={blur2}
          placeholder="23,68"
        />
        <SubLabel>Encadrement T° (°C)</SubLabel>
        <div className="grid grid-cols-2 gap-2">
          <Field label="T min" value={inputs.temp_liq_min_C} onChange={setField('temp_liq_min_C')} onBlur={blur2} />
          <Field label="T max" value={inputs.temp_liq_max_C} onChange={setField('temp_liq_max_C')} onBlur={blur2} />
        </div>
        <SubLabel>Correspondance densité</SubLabel>
        <div className="grid grid-cols-2 gap-2">
          <Field label="D min" value={inputs.densite_liq_min} onChange={setField('densite_liq_min')} onBlur={blur4} />
          <Field label="D max" value={inputs.densite_liq_max} onChange={setField('densite_liq_max')} onBlur={blur4} />
        </div>

        {/* Température gaz */}
        <Section icon={Flame} title="T° gaz" unit="°C" />
        <Field
          label="Valeur (°C)"
          value={inputs.temperature_gaz_C}
          onChange={setField('temperature_gaz_C')}
          onBlur={blur2}
          placeholder="23,51"
        />
        <SubLabel>Encadrement T° (°C)</SubLabel>
        <div className="grid grid-cols-2 gap-2">
          <Field label="T min" value={inputs.temp_gaz_min_C} onChange={setField('temp_gaz_min_C')} onBlur={blur2} />
          <Field label="T max" value={inputs.temp_gaz_max_C} onChange={setField('temp_gaz_max_C')} onBlur={blur2} />
        </div>
        <SubLabel>Correspondance densité air</SubLabel>
        <div className="grid grid-cols-2 gap-2">
          <Field label="D min" value={inputs.airdensity_min} onChange={setField('airdensity_min')} onBlur={blur4} />
          <Field label="D max" value={inputs.airdensity_max} onChange={setField('airdensity_max')} onBlur={blur4} />
        </div>

        {/* Pression */}
        <Section icon={Activity} title="Pression relative" unit="bar" />
        <Field
          label="Valeur (3 déc.)"
          value={inputs.pression_relative_bar}
          onChange={setField('pression_relative_bar')}
          onBlur={blur3}
          placeholder="1,273"
        />
      </CardContent>
    </Card>
  );
}
