// StockStoreView - À reconstruire
import { StockCategory } from '@/types/stock';
import { StockEntryTable } from './StockEntryTable';

interface StockStoreViewProps {
    category: StockCategory;
}

export const StockStoreView = ({ category }: StockStoreViewProps) => {
    return (
        <div className="space-y-6">
            <StockEntryTable />
        </div>
    );
};
