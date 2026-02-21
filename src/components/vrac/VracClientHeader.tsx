import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Fuel } from 'lucide-react';

interface VracClientHeaderProps {
    clientName: string;
    userName?: string;
    onLogout: () => void;
}

const logoMap: Record<string, string> = {
    'SIMAM': '/images/logo-simam.png',
    'VIVO_ENERGIES': '/images/logo-vivo.png',
    'TOTAL_ENERGIES': '/images/logo-total.png',
    'PETRO_IVOIRE': '/images/logo-petro.png',
};

const VracClientHeader: React.FC<VracClientHeaderProps> = ({ clientName, userName, onLogout }) => {
    const logoSrc = logoMap[clientName];

    return (
        <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/20">
                        <Fuel className="w-5 h-5 text-primary" />
                        <span className="font-bold text-primary text-sm">GPL VRAC</span>
                    </div>
                    {logoSrc ? (
                        <img src={logoSrc} alt={clientName} className="h-8 max-w-[120px] object-contain" />
                    ) : (
                        <span className="font-semibold text-foreground">{clientName}</span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {userName && (
                        <span className="text-sm text-muted-foreground hidden sm:inline">
                            {userName}
                        </span>
                    )}
                    <Button variant="ghost" size="sm" onClick={onLogout}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Déconnexion
                    </Button>
                </div>
            </div>
        </header>
    );
};

export default VracClientHeader;
