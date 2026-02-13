import { Check, Loader2 } from 'lucide-react';

interface RondeAutoSaveIndicatorProps {
  saving: boolean;
  lastSaved: Date | null;
}

export default function RondeAutoSaveIndicator({ saving, lastSaved }: RondeAutoSaveIndicatorProps) {
  if (saving) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Sauvegarde...
      </span>
    );
  }

  if (lastSaved) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-green-600">
        <Check className="h-3 w-3" />
        Sauvegardé
      </span>
    );
  }

  return null;
}
