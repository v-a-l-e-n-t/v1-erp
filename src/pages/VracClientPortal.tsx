import React, { useState, useEffect, useCallback } from 'react';
import { DateRange } from 'react-day-picker';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useVracAuth } from '@/hooks/useVracAuth';
import { VracDemandeChargement, VracDemandeFormData, VracStats } from '@/types/vrac';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

import VracLoginForm from '@/components/vrac/VracLoginForm';
import VracDemandeForm from '@/components/vrac/VracDemandeForm';
import VracDemandesList from '@/components/vrac/VracDemandesList';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Truck, Clock, CheckCircle, TrendingUp, CalendarDays, Calendar as CalendarIcon, FileSpreadsheet } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';


const VracClientPortal: React.FC = () => {
    const { session, isAuthenticated, logout, loading: authLoading, refreshSession } = useVracAuth();
    const [demandes, setDemandes] = useState<VracDemandeChargement[]>([]);

    // Default to current month
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
    });

    const [stats, setStats] = useState<VracStats>({
        total_demandes_jour: 0,
        demandes_en_attente: 0,
        demandes_chargees: 0,
        tonnage_total_jour: 0
    });
    const [loading, setLoading] = useState(false);
    const [editingDemande, setEditingDemande] = useState<VracDemandeChargement | null>(null);
    const { toast } = useToast();

    const loadDemandes = useCallback(async () => {
        if (!session) return;

        setLoading(true);
        try {
            let query = supabase
                .from('vrac_demandes_chargement')
                .select('*')
                .eq('client_id', session.client_id)
                .order('date_chargement', { ascending: false })
                .order('created_at', { ascending: false });

            // Apply Date Filter
            if (dateRange?.from) {
                const fromStr = format(dateRange.from, 'yyyy-MM-dd');
                const toStr = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : fromStr;
                query = query.gte('date_chargement', fromStr).lte('date_chargement', toStr);
            }

            const { data, error } = await query;

            if (error) throw error;

            const periodDemandes = (data || []) as VracDemandeChargement[];
            setDemandes(periodDemandes);

            // Calculate stats for the selected period
            setStats({
                total_demandes_jour: periodDemandes.length,
                demandes_en_attente: periodDemandes.filter(d => d.statut === 'en_attente').length,
                demandes_chargees: periodDemandes.filter(d => d.statut === 'charge').length,
                tonnage_total_jour: periodDemandes.reduce((sum, d) => sum + (d.tonnage_charge || 0), 0),
            });
        } catch (error) {
            console.error('Error loading demandes:', error);
            toast({
                title: 'Erreur',
                description: 'Impossible de charger les demandes',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [session, dateRange, toast]);

    useEffect(() => {
        if (isAuthenticated) {
            loadDemandes();
        }
    }, [isAuthenticated, loadDemandes]);

    const handleExport = () => {
        if (!demandes.length) return;

        const dataToExport = demandes.map(d => ({
            'Date': format(new Date(d.date_chargement), 'dd/MM/yyyy'),
            'Tracteur': d.immatriculation_tracteur,
            'Citerne': d.immatriculation_citerne,
            'Bon': d.numero_bon || '-',
            'Statut': d.statut === 'charge' ? 'Chargé' : 'En attente',
            'Tonnage (T)': d.tonnage_charge || 0,
            'Tonnage (Kg)': d.tonnage_charge ? d.tonnage_charge * 1000 : 0
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Chargements");

        // Auto-width columns roughly
        const wscols = Object.keys(dataToExport[0]).map(() => ({ wch: 20 }));
        ws['!cols'] = wscols;

        XLSX.writeFile(wb, `chargements_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

        toast({
            title: 'Export réussi',
            description: 'Le fichier Excel a été généré',
        });
    };

    const handleSubmitDemande = async (data: VracDemandeFormData): Promise<boolean> => {
        if (!session) return false;

        try {
            if (editingDemande) {
                // Update existing
                const { error } = await supabase
                    .from('vrac_demandes_chargement')
                    .update({
                        date_chargement: data.date_chargement,
                        immatriculation_tracteur: data.immatriculation_tracteur,
                        immatriculation_citerne: data.immatriculation_citerne,
                        numero_bon: data.numero_bon || null,
                    })
                    .eq('id', editingDemande.id);

                if (error) throw error;

                toast({
                    title: 'Modification enregistrée',
                    description: `La demande pour ${data.immatriculation_tracteur} a été mise à jour`,
                });
                setEditingDemande(null);
            } else {
                // Create new
                const { error } = await supabase.from('vrac_demandes_chargement').insert({
                    client_id: session.client_id,
                    user_id: session.user_id,
                    date_chargement: data.date_chargement,
                    immatriculation_tracteur: data.immatriculation_tracteur,
                    immatriculation_citerne: data.immatriculation_citerne,
                    numero_bon: data.numero_bon || null,
                });

                if (error) throw error;

                toast({
                    title: 'Camion ajouté',
                    description: `${data.immatriculation_tracteur} a été ajouté à la liste`,
                });
            }

            await loadDemandes();
            return true;
        } catch (error) {
            console.error('Error submitting demande:', error);
            toast({
                title: 'Erreur',
                description: 'Impossible de sauvegarder la demande',
                variant: 'destructive',
            });
            return false;
        }
    };

    const handleEditDemande = (demande: VracDemandeChargement) => {
        setEditingDemande(demande);
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to form
    };

    const handleCancelEdit = () => {
        setEditingDemande(null);
    };

    const handleDeleteDemande = async (id: string): Promise<void> => {
        try {
            const { error } = await supabase
                .from('vrac_demandes_chargement')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast({
                title: 'Camion supprimé',
                description: 'La demande a été supprimée',
            });

            if (editingDemande?.id === id) {
                setEditingDemande(null);
            }

            await loadDemandes();
        } catch (error) {
            console.error('Error deleting demande:', error);
            toast({
                title: 'Erreur',
                description: 'Impossible de supprimer la demande',
                variant: 'destructive',
            });
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-muted-foreground">Chargement...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <VracLoginForm onLoginSuccess={refreshSession} />;
    }



    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                            <Truck className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">Espace VRAC</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
                        {/* Export Button */}
                        <Button
                            variant="outline"
                            onClick={handleExport}
                            disabled={demandes.length === 0}
                            className="bg-white h-9"
                        >
                            <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
                            Export Excel
                        </Button>

                        {/* Date Range Picker */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    className={cn(
                                        "w-[240px] justify-start text-left font-normal bg-background h-9",
                                        !dateRange && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (
                                        dateRange.to ? (
                                            <>
                                                {format(dateRange.from, "d MMM", { locale: fr })} -{" "}
                                                {format(dateRange.to, "d MMM yyyy", { locale: fr })}
                                            </>
                                        ) : (
                                            format(dateRange.from, "PPP", { locale: fr })
                                        )
                                    ) : (
                                        <span>Choisir une période</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <div className="flex flex-col sm:flex-row">
                                    <div className="p-3 border-b sm:border-b-0 sm:border-r space-y-2 flex flex-col">
                                        <h4 className="font-medium text-sm mb-1 px-1">Rapide</h4>
                                        <Button
                                            variant="ghost"
                                            className="justify-start h-8 px-2 text-sm font-normal"
                                            onClick={() => setDateRange({ from: new Date(), to: new Date() })}
                                        >
                                            Aujourd'hui
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="justify-start h-8 px-2 text-sm font-normal"
                                            onClick={() => setDateRange({
                                                from: startOfMonth(new Date()),
                                                to: endOfMonth(new Date())
                                            })}
                                        >
                                            Ce Mois
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="justify-start h-8 px-2 text-sm font-normal"
                                            onClick={() => setDateRange({
                                                from: startOfYear(new Date()),
                                                to: endOfYear(new Date())
                                            })}
                                        >
                                            Cette Année
                                        </Button>
                                    </div>
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={dateRange?.from}
                                        selected={dateRange}
                                        onSelect={setDateRange}
                                        numberOfMonths={1}
                                        locale={fr}
                                    />
                                </div>
                            </PopoverContent>
                        </Popover>

                        <div className="h-6 w-px bg-border mx-1 hidden sm:block"></div>

                        {/* User Info */}
                        <div className="flex flex-col items-end mr-1 hidden sm:flex">
                            <span className="text-sm font-semibold text-foreground leading-none">{session?.client_nom_affichage}</span>
                            <span className="text-xs text-muted-foreground leading-none mt-1">{session?.user_nom}</span>
                        </div>

                        <Button
                            variant="ghost"
                            onClick={logout}
                            size="icon"
                            className="text-muted-foreground hover:text-foreground"
                            title="Déconnexion"
                        >
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-100">
                                    <CalendarDays className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-foreground">{stats.total_demandes_jour}</p>
                                    <p className="text-xs text-muted-foreground">Camions (Période)</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-amber-100">
                                    <Clock className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-foreground">{stats.demandes_en_attente}</p>
                                    <p className="text-xs text-muted-foreground">En attente</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-100">
                                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-foreground">{stats.demandes_chargees}</p>
                                    <p className="text-xs text-muted-foreground">Chargés</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-100">
                                    <TrendingUp className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-foreground">
                                        {(stats.tonnage_total_jour * 1000).toLocaleString('fr-FR')} kg
                                    </p>
                                    <p className="text-xs text-muted-foreground">Quantité chargée</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Add Form */}
                    <div className="lg:col-span-1">
                        <VracDemandeForm
                            onSubmit={handleSubmitDemande}
                            loading={loading}
                        />
                    </div>

                    {/* List */}
                    <div className="lg:col-span-2">
                        <Card className="border-border shadow-sm">
                            <CardContent className="p-0">
                                <VracDemandesList
                                    demandes={demandes}
                                    onDelete={handleDeleteDemande}
                                    onEdit={handleEditDemande}
                                    loading={loading}
                                    allowActions={true}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
            <Dialog open={!!editingDemande} onOpenChange={(open) => !open && handleCancelEdit()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Modifier la demande</DialogTitle>
                    </DialogHeader>
                    <VracDemandeForm
                        onSubmit={handleSubmitDemande}
                        loading={loading}
                        initialData={editingDemande}
                        onCancel={handleCancelEdit}
                        isDialog={true}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default VracClientPortal;
