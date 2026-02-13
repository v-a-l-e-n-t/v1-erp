import { Progress } from '@/components/ui/progress';

interface RondeProgressBarProps {
  filled: number;
  total: number;
}

export default function RondeProgressBar({ filled, total }: RondeProgressBarProps) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
  const isComplete = filled >= total;

  return (
    <div className="flex items-center gap-3">
      <Progress value={pct} className="flex-1 h-2.5" />
      <span className={`text-sm font-medium whitespace-nowrap ${isComplete ? 'text-green-600' : 'text-slate-600'}`}>
        {filled} / {total} points
      </span>
    </div>
  );
}
