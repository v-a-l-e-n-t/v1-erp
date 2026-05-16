import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toIsoDate } from '@/utils/bonsTransfert';

interface DatePickerFieldProps {
  value: string; // ISO YYYY-MM-DD
  onChange: (iso: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Sélecteur de date stylé (Popover + Calendar shadcn).
 * Travaille en `string` ISO (YYYY-MM-DD) pour rester compatible avec Supabase
 * et les inputs natifs. Locale fr.
 */
export function DatePickerField({
  value,
  onChange,
  placeholder = 'Choisir une date',
  className,
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(value + 'T00:00:00') : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
          {selected ? format(selected, 'dd MMMM yyyy', { locale: fr }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            if (d) {
              onChange(toIsoDate(d));
              setOpen(false);
            }
          }}
          locale={fr}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
