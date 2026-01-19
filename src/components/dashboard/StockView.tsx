// StockView - À reconstruire
import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DateRange } from 'react-day-picker';

interface StockViewProps {
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  filterType: 'all' | 'year' | 'month' | 'period' | 'day';
  setFilterType: (type: 'all' | 'year' | 'month' | 'period' | 'day') => void;
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  availableMonths: string[];
}

export default function StockView(props: StockViewProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Module Stock</h2>
          <p className="text-sm text-muted-foreground mt-1">
            En cours de reconstruction...
          </p>
        </div>
        <Button onClick={() => navigate('/stock')}>
          <Package className="mr-2 h-4 w-4" />
          Saisie
        </Button>
      </div>

      <div className="p-8 text-center text-muted-foreground border rounded-lg">
        <p className="text-lg font-medium">Module Stock en cours de reconstruction...</p>
        <p className="text-sm mt-2">La logique de calcul sera reprise depuis zéro.</p>
      </div>
    </div>
  );
}
