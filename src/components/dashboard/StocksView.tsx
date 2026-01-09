import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';

const StocksView = () => {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Gestion des Stocks</h2>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        État des Stocks
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center p-12 bg-muted/10 rounded-lg border border-dashed">
                        <p className="text-muted-foreground text-lg">En cours de développement</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default StocksView;
