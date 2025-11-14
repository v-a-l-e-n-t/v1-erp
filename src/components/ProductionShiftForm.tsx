import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus, Save } from "lucide-react";
import { ArretProductionForm } from "./ArretProductionForm";
import { LigneProductionForm } from "./LigneProductionForm";
import { ProductionRecapitulatif } from "./ProductionRecapitulatif";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  ProductionShift,
  ArretProduction,
  LigneProduction,
  ShiftType,
  ChefLigne,
  ChefQuart,
  SHIFT_HOURS
} from "@/types/production";

export const ProductionShiftForm = () => {
  const [loading, setLoading] = useState(false);
  const [chefsLigne, setChefsLigne] = useState<ChefLigne[]>([]);
  const [chefsQuart, setChefsQuart] = useState<ChefQuart[]>([]);
  const [shift, setShift] = useState<ProductionShift>({
    date: new Date().toISOString().split('T')[0],
    shift_type: '10h-19h',
    chef_quart_id: '',
    heure_debut_theorique: '10:00',
    heure_fin_theorique: '19:00',
    heure_debut_reelle: '10:00',
    heure_fin_reelle: '19:00',
    bouteilles_produites: 0
  });
  const [lignes, setLignes] = useState<LigneProduction[]>([]);
  const [arrets, setArrets] = useState<ArretProduction[]>([]);

  useEffect(() => {
    loadChefsLigne();
    loadChefsQuart();
  }, []);

  useEffect(() => {
    const hours = SHIFT_HOURS[shift.shift_type];
    setShift(prev => ({
      ...prev,
      heure_debut_theorique: hours.debut,
      heure_fin_theorique: hours.fin,
      heure_debut_reelle: hours.debut,
      heure_fin_reelle: hours.fin
    }));
  }, [shift.shift_type]);

  const loadChefsLigne = async () => {
    const { data, error } = await (supabase as any)
      .from('chefs_ligne')
      .select('*')
      .order('nom');

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les chefs de ligne",
        variant: "destructive"
      });
      return;
    }

    setChefsLigne(data || []);
  };

  const loadChefsQuart = async () => {
    const { data, error } = await (supabase as any)
      .from('chefs_quart')
      .select('*')
      .order('nom');

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les chefs de quart",
        variant: "destructive"
      });
      return;
    }

    setChefsQuart(data || []);
  };

  const handleShiftChange = (field: keyof ProductionShift, value: any) => {
    setShift(prev => ({ ...prev, [field]: value }));
  };

  const addLigne = () => {
    if (lignes.length >= 5) {
      toast({
        title: "Limite atteinte",
        description: "Vous ne pouvez ajouter que 5 lignes maximum",
        variant: "destructive"
      });
      return;
    }
    setLignes(prev => [
      ...prev,
      {
        numero_ligne: prev.length + 1,
        chef_ligne_id: '',
        recharges_petro_b6: undefined,
        recharges_petro_b12: undefined,
        recharges_total_b6: undefined,
        recharges_total_b12: undefined,
        recharges_vivo_b6: undefined,
        recharges_vivo_b12: undefined,
        consignes_petro_b6: undefined,
        consignes_petro_b12: undefined,
        consignes_total_b6: undefined,
        consignes_total_b12: undefined,
        consignes_vivo_b6: undefined,
        consignes_vivo_b12: undefined
      }
    ]);
  };

  const updateLigne = (index: number, field: keyof LigneProduction, value: any) => {
    setLignes(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeLigne = (index: number) => {
    setLignes(prev => prev.filter((_, i) => i !== index));
  };

  const addArret = () => {
    setArrets(prev => [
      ...prev,
      {
        heure_debut: '',
        heure_fin: '',
        type_arret: 'maintenance_corrective',
        lignes_concernees: [],
        description: '',
        action_corrective: ''
      }
    ]);
  };

  const updateArret = (index: number, field: keyof ArretProduction, value: any) => {
    setArrets(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeArret = (index: number) => {
    setArrets(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    if (!shift.chef_quart_id) {
      toast({
        title: "Validation",
        description: "Veuillez sélectionner un chef de quart",
        variant: "destructive"
      });
      return false;
    }

    if (!shift.heure_debut_reelle || !shift.heure_fin_reelle) {
      toast({
        title: "Validation",
        description: "Veuillez renseigner les heures de début et fin réelles",
        variant: "destructive"
      });
      return false;
    }

    for (let i = 0; i < arrets.length; i++) {
      const arret = arrets[i];
      if (!arret.heure_debut || !arret.heure_fin) {
        toast({
          title: "Validation",
          description: `Arrêt #${i + 1}: heures de début et fin requises`,
          variant: "destructive"
        });
        return false;
      }

      if (!arret.lignes_concernees || arret.lignes_concernees.length === 0) {
        toast({
          title: "Validation",
          description: `Arrêt #${i + 1}: veuillez sélectionner au moins une ligne`,
          variant: "destructive"
        });
        return false;
      }

      if (arret.type_arret === 'panne_ligne' && !arret.etape_ligne) {
        toast({
          title: "Validation",
          description: `Arrêt #${i + 1}: étape de ligne requise pour les pannes`,
          variant: "destructive"
        });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Calculer les totaux à partir des lignes de production
      let tonnageTotal = 0;
      let cumulRechargesTotal = 0;
      let cumulConsignesTotal = 0;
      let bouteillesProduites = 0;

      lignes.forEach(ligne => {
        tonnageTotal += ligne.tonnage_ligne || 0;
        cumulRechargesTotal += (ligne.cumul_recharges_b6 || 0) + (ligne.cumul_recharges_b12 || 0);
        cumulConsignesTotal += (ligne.cumul_consignes_b6 || 0) + (ligne.cumul_consignes_b12 || 0);
        bouteillesProduites += (ligne.cumul_recharges_b6 || 0) + (ligne.cumul_recharges_b12 || 0) + 
                               (ligne.cumul_consignes_b6 || 0) + (ligne.cumul_consignes_b12 || 0);
      });

      // Calculer le temps d'arrêt total en minutes
      let tempsArretTotalMinutes = 0;
      arrets.forEach(arret => {
        if (arret.heure_debut && arret.heure_fin) {
          const [heureD, minD] = arret.heure_debut.split(':').map(Number);
          const [heureF, minF] = arret.heure_fin.split(':').map(Number);
          let dureeMinutes = (heureF * 60 + minF) - (heureD * 60 + minD);
          
          // Gérer les cas où l'arrêt traverse minuit
          if (dureeMinutes < 0) {
            dureeMinutes += 24 * 60;
          }
          
          tempsArretTotalMinutes += dureeMinutes;
        }
      });

      const shiftData = {
        ...shift,
        bouteilles_produites: bouteillesProduites,
        tonnage_total: parseFloat(tonnageTotal.toFixed(3)),
        cumul_recharges_total: cumulRechargesTotal,
        cumul_consignes_total: cumulConsignesTotal,
        temps_arret_total_minutes: tempsArretTotalMinutes
      };

      const { data: insertedShift, error: shiftError } = await (supabase as any)
        .from('production_shifts')
        .insert(shiftData)
        .select()
        .single();

      if (shiftError) {
        if (shiftError.code === '23505') {
          toast({
            title: "Erreur",
            description: "Un shift existe déjà pour cette date, type et ligne",
            variant: "destructive"
          });
        } else {
          throw shiftError;
        }
        return;
      }

      // Enregistrer les lignes de production avec tous les champs
      if (lignes.length > 0 && insertedShift) {
        const lignesData = lignes.map(ligne => ({
          shift_id: insertedShift.id,
          numero_ligne: ligne.numero_ligne,
          chef_ligne_id: ligne.chef_ligne_id || null,
          recharges_petro_b6: ligne.recharges_petro_b6 || 0,
          recharges_petro_b12: ligne.recharges_petro_b12 || 0,
          recharges_total_b6: ligne.recharges_total_b6 || 0,
          recharges_total_b12: ligne.recharges_total_b12 || 0,
          recharges_vivo_b6: ligne.recharges_vivo_b6 || 0,
          recharges_vivo_b12: ligne.recharges_vivo_b12 || 0,
          consignes_petro_b6: ligne.consignes_petro_b6 || 0,
          consignes_petro_b12: ligne.consignes_petro_b12 || 0,
          consignes_total_b6: ligne.consignes_total_b6 || 0,
          consignes_total_b12: ligne.consignes_total_b12 || 0,
          consignes_vivo_b6: ligne.consignes_vivo_b6 || 0,
          consignes_vivo_b12: ligne.consignes_vivo_b12 || 0,
          cumul_recharges_b6: ligne.cumul_recharges_b6 || 0,
          cumul_recharges_b12: ligne.cumul_recharges_b12 || 0,
          cumul_consignes_b6: ligne.cumul_consignes_b6 || 0,
          cumul_consignes_b12: ligne.cumul_consignes_b12 || 0,
          tonnage_ligne: ligne.tonnage_ligne || 0
        }));

        const { error: lignesError } = await (supabase as any)
          .from('lignes_production')
          .insert(lignesData);

        if (lignesError) throw lignesError;
      }

      if (arrets.length > 0 && insertedShift) {
        const arretsData = arrets.map(arret => ({
          ...arret,
          shift_id: insertedShift.id
        }));

        const { error: arretsError } = await (supabase as any)
          .from('arrets_production')
          .insert(arretsData);

        if (arretsError) throw arretsError;
      }

      toast({
        title: "Succès",
        description: "Données de production enregistrées avec succès"
      });

      setShift({
        date: new Date().toISOString().split('T')[0],
        shift_type: '10h-19h',
        chef_quart_id: '',
        heure_debut_theorique: '10:00',
        heure_fin_theorique: '19:00',
        heure_debut_reelle: '10:00',
        heure_fin_reelle: '19:00',
        bouteilles_produites: 0
      });
      setLignes([]);
      setArrets([]);

    } catch (error: any) {
      console.error('Error saving production data:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer les données",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {(lignes.length > 0 || arrets.length > 0) && (
        <ProductionRecapitulatif lignes={lignes} arrets={arrets} />
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Informations du Shift</CardTitle>
          <CardDescription>
            Enregistrer les données de production du shift
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={shift.date}
                onChange={(e) => handleShiftChange('date', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="heure-debut">Heure Début *</Label>
              <Input
                id="heure-debut"
                type="time"
                value={shift.heure_debut_reelle}
                onChange={(e) => handleShiftChange('heure_debut_reelle', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="heure-fin">Heure Fin *</Label>
              <Input
                id="heure-fin"
                type="time"
                value={shift.heure_fin_reelle}
                onChange={(e) => handleShiftChange('heure_fin_reelle', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="shift-type">Shift *</Label>
              <Select
                value={shift.shift_type}
                onValueChange={(value) => handleShiftChange('shift_type', value as ShiftType)}
              >
                <SelectTrigger id="shift-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10h-19h">Shift 1</SelectItem>
                  <SelectItem value="20h-5h">Shift 2</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="chef-quart">Chef de Quart *</Label>
              <Select
                value={shift.chef_quart_id}
                onValueChange={(value) => handleShiftChange('chef_quart_id', value)}
              >
                <SelectTrigger id="chef-quart">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {chefsQuart.map((chef) => (
                    <SelectItem key={chef.id} value={chef.id}>
                      {chef.prenom} {chef.nom}
                    </SelectItem>
                  ))}
                  {chefsLigne.map((chef) => (
                    <SelectItem key={chef.id} value={chef.id}>
                      {chef.prenom} {chef.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lignes de Production</CardTitle>
              <CardDescription>
                Ajouter les données de production pour chaque ligne
              </CardDescription>
            </div>
            <Button
              type="button"
              onClick={addLigne}
              variant="outline"
              size="sm"
              disabled={lignes.length >= 5}
            >
              <Plus className="h-4 w-4 mr-2" />
              AJOUTER LIGNE {lignes.length + 1}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {lignes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucune ligne ajoutée. Cliquez sur "AJOUTER LIGNE 1" pour commencer.
            </p>
          ) : (
            <div className="space-y-4">
            {lignes.map((ligne, index) => (
              <LigneProductionForm
                key={index}
                ligne={ligne}
                index={index}
                chefsLigne={chefsLigne}
                onUpdate={updateLigne}
                onRemove={removeLigne}
                isB12Only={index === 4}
              />
            ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Arrêts de production</CardTitle>
              <CardDescription>
                Enregistrer les interruptions de production
              </CardDescription>
            </div>
            <Button
              type="button"
              onClick={addArret}
              variant="outline"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              AJOUTER UN ARRÊT
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {arrets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucun arrêt enregistré. Cliquez sur "AJOUTER UN ARRÊT" pour commencer.
            </p>
          ) : (
            arrets.map((arret, index) => (
              <ArretProductionForm
                key={index}
                arret={arret}
                index={index}
                onUpdate={updateArret}
                onRemove={removeArret}
              />
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Enregistrement...' : 'Enregistrer les données'}
        </Button>
      </div>
    </form>
  );
};
