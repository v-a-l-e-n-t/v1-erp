import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Fuel, RefreshCw } from 'lucide-react';

interface VracAdminHeaderProps {
    onRefresh?: () => void;
    loading?: boolean;
}

const VracAdminHeader: React.FC<VracAdminHeaderProps> = ({ onRefresh, loading }) => {
    const navigate = useNavigate();

    return (
        <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/20">
                        <Fuel className="w-5 h-5 text-primary" />
                        <span className="font-bold text-primary text-sm">CHARGEMENT VRAC</span>
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold">Administration VRAC</h1>
                        <p className="text-xs text-muted-foreground">Gestion complète des chargements</p>
                    </div>
                </div>
                {onRefresh && (
                    <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Actualiser
                    </Button>
                )}
            </div>
        </header>
    );
};

export default VracAdminHeader;
