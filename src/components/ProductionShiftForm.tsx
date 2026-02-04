import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus, Save, FlaskConical } from "lucide-react";
import { ArretProductionForm } from "./ArretProductionForm";
import { LigneProductionForm } from "./LigneProductionForm";
import { ProductionRecapitulatif } from "./ProductionRecapitulatif";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ProductionShift,
  ArretProduction,
  LigneProduction,
  ShiftType,
  ChefLigne,
  ChefQuart,
  SHIFT_HOURS,
  ArretType,
  EtapeLigne,
  ArretProductionForm as ArretFormType
} from "@/types/production";

interface ProductionShiftFormProps {
  editMode?: boolean;
  initialData?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const ProductionShiftForm = ({ editMode = false, initialData, onSuccess, onCancel }: ProductionShiftFormProps = {}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [chefsLigne, setChefsLigne] = useState<ChefLigne[]>([]);
  const [chefsQuart, setChefsQuart] = useState<ChefQuart[]>([]);
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
  const [showTestButton, setShowTestButton] = useState(false);
  const [shift, setShift] = useState<ProductionShift>({
    date: new Date().toISOString().split('T')[0],
    shift_type: '10h-19h',
    chef_quart_id: '',
    heure_debut_theorique: '10:00',
    heure_fin_theorique: '19:00',
    heure_debut_reelle: '10:00',
    heure_fin_reelle: '19:00',
    bouteilles_produites: 0,
    chariste: 0,
    chariot: 0,
    agent_quai: 0,
    agent_saisie: 0,
    agent_atelier: 0
  });

  // Initialiser les 5 lignes dès le début
  const [lignes, setLignes] = useState<LigneProduction[]>([
    {
      numero_ligne: 1,
      chef_ligne_id: '',
      nombre_agents: 0,
      recharges_petro_b6: undefined,
      recharges_total_b6: undefined,
      recharges_vivo_b6: undefined,
      consignes_petro_b6: undefined,
      consignes_total_b6: undefined,
      consignes_vivo_b6: undefined,
      arrets: []
    },
    {
      numero_ligne: 2,
      chef_ligne_id: '',
      nombre_agents: 0,
      recharges_petro_b6: undefined,
      recharges_total_b6: undefined,
      recharges_vivo_b6: undefined,
      consignes_petro_b6: undefined,
      consignes_total_b6: undefined,
      consignes_vivo_b6: undefined,
      arrets: []
    },
    {
      numero_ligne: 3,
      chef_ligne_id: '',
      nombre_agents: 0,
      recharges_petro_b6: undefined,
      recharges_total_b6: undefined,
      recharges_vivo_b6: undefined,
      consignes_petro_b6: undefined,
      consignes_total_b6: undefined,
      consignes_vivo_b6: undefined,
      arrets: []
    },
    {
      numero_ligne: 4,
      chef_ligne_id: '',
      nombre_agents: 0,
      recharges_petro_b6: undefined,
      recharges_total_b6: undefined,
      recharges_vivo_b6: undefined,
      consignes_petro_b6: undefined,
      consignes_total_b6: undefined,
      consignes_vivo_b6: undefined,
      arrets: []
    },
    {
      numero_ligne: 5,
      chef_ligne_id: '',
      nombre_agents: 0,
      recharges_petro_b12: undefined,
      recharges_petro_b28: undefined,
      recharges_petro_b38: undefined,
      recharges_total_b12: undefined,
      recharges_total_b28: undefined,
      recharges_total_b38: undefined,
      recharges_vivo_b12: undefined,
      recharges_vivo_b28: undefined,
      recharges_vivo_b38: undefined,
      consignes_petro_b12: undefined,
      consignes_petro_b28: undefined,
      consignes_petro_b38: undefined,
      consignes_total_b12: undefined,
      consignes_total_b28: undefined,
      consignes_total_b38: undefined,
      consignes_vivo_b12: undefined,
      consignes_vivo_b28: undefined,
      consignes_vivo_b38: undefined,
      arrets: []
    }
  ]);


  useEffect(() => {
    loadChefsLigne();
    loadChefsQuart();
  }, []);

  // Raccourci clavier pour afficher/cacher le bouton de test (Ctrl+Alt+T)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setShowTestButton(prev => !prev);
        toast({
          title: showTestButton ? "Mode test désactivé" : "Mode test activé",
          description: showTestButton ? "Le bouton de test est masqué" : "Le bouton de test est maintenant visible",
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTestButton]);

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

  // Initialize form with existing data when in edit mode
  useEffect(() => {
    if (editMode && initialData) {
      console.log('Initializing form with data:', initialData);

      setShift({
        date: initialData.date || new Date().toISOString().split('T')[0],
        shift_type: initialData.shift_type || '10h-19h',
        chef_quart_id: initialData.chef_quart_id || '',
        heure_debut_theorique: initialData.heure_debut_theorique || '10:00',
        heure_fin_theorique: initialData.heure_fin_theorique || '19:00',
        heure_debut_reelle: initialData.heure_debut_reelle || '10:00',
        heure_fin_reelle: initialData.heure_fin_reelle || '19:00',
        bouteilles_produites: initialData.bouteilles_produites || 0,
        chariste: initialData.chariste || 0,
        chariot: initialData.chariot || 0,
        agent_quai: initialData.agent_quai || 0,
        agent_saisie: initialData.agent_saisie || 0,
        agent_atelier: initialData.agent_atelier || 0
      });

      if (initialData.lignes_production) {
        // Nouvelle structure : les arrêts sont par ligne avec numero_ligne
        // La durée est stockée uniquement dans lignes_production.temps_arret_ligne_minutes
        const arretsByLine: Record<number, any[]> = {};


        if (initialData.arrets_production && initialData.arrets_production.length > 0) {
          initialData.arrets_production.forEach((arret: any) => {
            // Nouvelle structure : numero_ligne
            if (arret.numero_ligne !== undefined) {
              const lineNum = Number(arret.numero_ligne);
              if (!arretsByLine[lineNum]) arretsByLine[lineNum] = [];
              arretsByLine[lineNum].push(arret);
            }
            // Ancienne structure (compatibilité) : lignes_concernees
            else if (arret.lignes_concernees) {
              let targetLines = arret.lignes_concernees;
              if (typeof targetLines === 'string') {
                try {
                  let parseStr = targetLines as string;
                  if (parseStr.startsWith('{')) {
                    parseStr = parseStr.replace('{', '[').replace('}', ']');
                  }
                  targetLines = JSON.parse(parseStr) as number[];
                } catch (e) {
                  targetLines = [];
                }
              }
              if (Array.isArray(targetLines)) {
                targetLines.forEach((lineNum: any) => {
                  const num = Number(lineNum);
                  if (!arretsByLine[num]) arretsByLine[num] = [];
                  arretsByLine[num].push(arret);
                });
              }
            }
          });
        }

        const safeLignes = initialData.lignes_production.map((ligne: any) => {
          const lineArrets = arretsByLine[ligne.numero_ligne] || [];
          const tempsArretTotal = ligne.temps_arret_ligne_minutes || 0;

          // Créer les arrêts pour le formulaire avec la durée
          let formArrets;
          if (lineArrets.length > 0) {
            // Si on a des arrêts détaillés
            if (tempsArretTotal > 0) {
              // Répartir la durée totale équitablement
              const dureePourChaque = tempsArretTotal / lineArrets.length;
              formArrets = lineArrets.map((arret: any) => ({
                numero_ligne: ligne.numero_ligne,
                duree_minutes: Math.round(dureePourChaque),
                type_arret: arret.type_arret || 'maintenance_corrective',
                ordre_intervention: arret.ordre_intervention || '',
                etape_ligne: arret.etape_ligne || undefined,
                description: arret.description || '',
                action_corrective: arret.action_corrective || ''
              }));
            } else {
              // Pas de durée stockée, afficher les arrêts avec durée 0 pour que l'utilisateur puisse les modifier
              formArrets = lineArrets.map((arret: any) => ({
                numero_ligne: ligne.numero_ligne,
                duree_minutes: 0,
                type_arret: arret.type_arret || 'maintenance_corrective',
                ordre_intervention: arret.ordre_intervention || '',
                etape_ligne: arret.etape_ligne || undefined,
                description: arret.description || '',
                action_corrective: arret.action_corrective || ''
              }));
            }
          } else if (tempsArretTotal > 0) {
            // Si pas d'arrêts détaillés mais temps_arret_ligne_minutes existe, créer un arrêt générique
            formArrets = [{
              numero_ligne: ligne.numero_ligne,
              duree_minutes: tempsArretTotal,
              type_arret: 'maintenance_corrective',
              ordre_intervention: '',
              etape_ligne: undefined,
              description: 'Arrêt importé depuis anciennes données',
              action_corrective: ''
            }];
          } else {
            formArrets = [];
          }

          return {
            ...ligne,
            arrets: formArrets
          };
        });
        setLignes(safeLignes);
      }
    }
  }, [editMode, initialData]);

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


  const updateLigne = (index: number, field: keyof LigneProduction, value: any) => {
    setLignes(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Fonction pour générer un nombre aléatoire entre min et max (inclus)
  const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  // Fonction pour remplir le formulaire avec des données aléatoires
  const fillRandomData = () => {
    // Types d'arrêts et étapes disponibles
    const arretTypes: ArretType[] = ['maintenance_corrective', 'manque_personnel', 'probleme_approvisionnement', 'panne_ligne', 'autre'];
    const etapes: EtapeLigne[] = ['BASCULES', 'PURGE', 'CONTROLE', 'ETANCHEITE', 'CAPSULAGE', 'VIDANGE', 'PALETTISEUR', 'TRI', 'AUTRE'];

    // Remplir le shift (uniquement les champs essentiels)
    const randomShiftType: ShiftType = Math.random() > 0.5 ? '10h-19h' : '20h-5h';
    const randomChefQuart = chefsQuart.length > 0 ? chefsQuart[randomInt(0, chefsQuart.length - 1)].id : (chefsLigne.length > 0 ? chefsLigne[randomInt(0, chefsLigne.length - 1)].id : '');

    setShift({
      date: new Date().toISOString().split('T')[0],
      shift_type: randomShiftType,
      chef_quart_id: randomChefQuart,
      heure_debut_theorique: SHIFT_HOURS[randomShiftType].debut,
      heure_fin_theorique: SHIFT_HOURS[randomShiftType].fin,
      heure_debut_reelle: SHIFT_HOURS[randomShiftType].debut,
      heure_fin_reelle: SHIFT_HOURS[randomShiftType].fin,
      bouteilles_produites: 0,
      chariste: 0,
      chariot: 0,
      agent_quai: 0,
      agent_saisie: 0,
      agent_atelier: 0
    });

    // Remplir les lignes
    const newLignes: LigneProduction[] = [];

    for (let i = 0; i < 5; i++) {
      const randomChefLigne = chefsLigne.length > 0 ? chefsLigne[randomInt(0, chefsLigne.length - 1)].id : '';

      // Lignes 1-4 (B6)
      if (i < 4) {
        const ligne: LigneProduction = {
          numero_ligne: i + 1,
          chef_ligne_id: randomChefLigne,
          nombre_agents: 0,
          recharges_petro_b6: randomInt(0, 999),
          recharges_total_b6: randomInt(0, 999),
          recharges_vivo_b6: randomInt(0, 999),
          consignes_petro_b6: randomInt(0, 999),
          consignes_total_b6: randomInt(0, 999),
          consignes_vivo_b6: randomInt(0, 999),
          arrets: []
        };

        // Ajouter 1 arrêt par ligne avec durée 10-90 min
        const typeArret = arretTypes[randomInt(0, arretTypes.length - 1)];
        const arret: ArretFormType = {
          numero_ligne: i + 1,
          duree_minutes: randomInt(10, 90),
          type_arret: typeArret,
          ordre_intervention: undefined,
          etape_ligne: typeArret === 'panne_ligne' ? etapes[randomInt(0, etapes.length - 1)] : undefined,
          description: undefined,
          action_corrective: undefined
        };
        ligne.arrets!.push(arret);

        newLignes.push(ligne);
      }
      // Ligne 5 (B12, B28, B38)
      else {
        const ligne: LigneProduction = {
          numero_ligne: 5,
          chef_ligne_id: randomChefLigne,
          nombre_agents: 0,
          recharges_petro_b12: randomInt(0, 999),
          recharges_petro_b28: randomInt(0, 999),
          recharges_petro_b38: randomInt(0, 999),
          recharges_total_b12: randomInt(0, 999),
          recharges_total_b28: randomInt(0, 999),
          recharges_total_b38: randomInt(0, 999),
          recharges_vivo_b12: randomInt(0, 999),
          recharges_vivo_b28: randomInt(0, 999),
          recharges_vivo_b38: randomInt(0, 999),
          consignes_petro_b12: randomInt(0, 999),
          consignes_petro_b28: randomInt(0, 999),
          consignes_petro_b38: randomInt(0, 999),
          consignes_total_b12: randomInt(0, 999),
          consignes_total_b28: randomInt(0, 999),
          consignes_total_b38: randomInt(0, 999),
          consignes_vivo_b12: randomInt(0, 999),
          consignes_vivo_b28: randomInt(0, 999),
          consignes_vivo_b38: randomInt(0, 999),
          arrets: []
        };

        // Ajouter 1 arrêt par ligne avec durée 10-90 min
        const typeArret = arretTypes[randomInt(0, arretTypes.length - 1)];
        const arret: ArretFormType = {
          numero_ligne: 5,
          duree_minutes: randomInt(10, 90),
          type_arret: typeArret,
          ordre_intervention: undefined,
          etape_ligne: typeArret === 'panne_ligne' ? etapes[randomInt(0, etapes.length - 1)] : undefined,
          description: undefined,
          action_corrective: undefined
        };
        ligne.arrets!.push(arret);

        newLignes.push(ligne);
      }
    }

    setLignes(newLignes);

    toast({
      title: "Données de test générées",
      description: "Le formulaire a été rempli avec des données aléatoires",
      className: "bg-blue-500 text-white border-blue-600"
    });
  };



  const validateForm = (): boolean => {
    // Validation des champs obligatoires du shift
    if (!shift.date) {
      toast({
        title: "Validation",
        description: "Veuillez renseigner tous les champs obligatoires",
        variant: "destructive"
      });
      return false;
    }

    if (!shift.chef_quart_id) {
      toast({
        title: "Validation",
        description: "Veuillez renseigner tous les champs obligatoires",
        variant: "destructive"
      });
      return false;
    }

    if (!shift.heure_debut_reelle || !shift.heure_fin_reelle) {
      toast({
        title: "Validation",
        description: "Veuillez renseigner tous les champs obligatoires",
        variant: "destructive"
      });
      return false;
    }

    // Validation des chefs de ligne (tous obligatoires)
    for (let i = 0; i < lignes.length; i++) {
      if (!lignes[i].chef_ligne_id) {
        toast({
          title: "Validation",
          description: "Veuillez renseigner tous les champs obligatoires",
          variant: "destructive"
        });
        return false;
      }
    }

    // Validation des arrêts par ligne
    for (let i = 0; i < lignes.length; i++) {
      const ligne = lignes[i];
      if (ligne.arrets && ligne.arrets.length > 0) {
        for (let j = 0; j < ligne.arrets.length; j++) {
          const arret = ligne.arrets[j];
          if (!arret.duree_minutes || arret.duree_minutes <= 0) {
            toast({
              title: "Validation",
              description: `Ligne ${ligne.numero_ligne} - Arrêt #${j + 1}: durée requise`,
              variant: "destructive"
            });
            return false;
          }

          if (arret.type_arret === 'panne_ligne' && !arret.etape_ligne) {
            toast({
              title: "Validation",
              description: `Ligne ${ligne.numero_ligne} - Arrêt #${j + 1}: étape de ligne requise`,
              variant: "destructive"
            });
            return false;
          }
        }
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      // Vérifier si un shift existe déjà pour cette date et ce type (skip in edit mode)
      if (!editMode) {
        const { data: existingShift, error: checkError } = await (supabase as any)
          .from('production_shifts')
          .select('id')
          .eq('date', shift.date)
          .eq('shift_type', shift.shift_type)
          .maybeSingle();

        if (checkError) {
          throw checkError;
        }

        if (existingShift) {
          setShowDuplicateAlert(true);
          setLoading(false);
          return;
        }
      }
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

      // Calculer arret_shift_cumul (somme de tous les temps_arret_ligne_minutes)
      let arretShiftCumul = 0;
      const allArrets: ArretProduction[] = [];

      lignes.forEach(ligne => {
        // Calculer le temps d'arrêt pour cette ligne
        const tempsArretLigne = (ligne.arrets || []).reduce((sum, arret) =>
          sum + (arret.duree_minutes || 0), 0
        );
        arretShiftCumul += tempsArretLigne;

        // Ajouter les arrêts à la liste (sans les durées, uniquement les infos descriptives)
        if (ligne.arrets && ligne.arrets.length > 0) {
          ligne.arrets.forEach(arret => {
            allArrets.push({
              type_arret: arret.type_arret,
              numero_ligne: ligne.numero_ligne,
              ordre_intervention: arret.ordre_intervention || undefined,
              etape_ligne: arret.etape_ligne || undefined,
              description: arret.description || undefined,
              action_corrective: arret.action_corrective || undefined
            });
          });
        }
      });

      const shiftData = {
        ...shift,
        chef_quart_id: shift.chef_quart_id || null,
        bouteilles_produites: bouteillesProduites,
        tonnage_total: parseFloat(tonnageTotal.toFixed(3)),
        cumul_recharges_total: cumulRechargesTotal,
        cumul_consignes_total: cumulConsignesTotal,
        temps_arret_total_minutes: arretShiftCumul,
        arret_shift_cumul: arretShiftCumul
      };

      let insertedShift: any;

      if (editMode && initialData?.id) {
        // UPDATE existing shift
        const { data: updatedShift, error: shiftError } = await (supabase as any)
          .from('production_shifts')
          .update(shiftData)
          .eq('id', initialData.id)
          .select()
          .single();

        if (shiftError) throw shiftError;
        insertedShift = updatedShift;

        // Delete existing lignes and arrets before inserting new ones
        await (supabase as any)
          .from('lignes_production')
          .delete()
          .eq('shift_id', initialData.id);

        await (supabase as any)
          .from('arrets_production')
          .delete()
          .eq('shift_id', initialData.id);

      } else {
        // INSERT new shift
        const { data: newShift, error: shiftError } = await (supabase as any)
          .from('production_shifts')
          .insert(shiftData)
          .select()
          .single();

        if (shiftError) {
          if (shiftError.code === '23505') {
            toast({
              title: "Erreur",
              description: "Un shift existe déjà pour cette date, type et ligne.",
              variant: "destructive"
            });
          } else {
            throw shiftError;
          }
          return;
        }
        insertedShift = newShift;
      }

      // Enregistrer les lignes de production avec tous les champs
      if (lignes.length > 0 && insertedShift) {
        const lignesData = lignes.map(ligne => {
          // Calculer le temps d'arrêt total pour cette ligne
          const tempsArretLigne = (ligne.arrets || []).reduce((sum, arret) =>
            sum + (arret.duree_minutes || 0), 0
          );

          return {
            shift_id: insertedShift.id,
            numero_ligne: ligne.numero_ligne,
            chef_ligne_id: ligne.chef_ligne_id || null,
            nombre_agents: ligne.nombre_agents || 0,
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
            tonnage_ligne: ligne.tonnage_ligne || 0,
            temps_arret_ligne_minutes: tempsArretLigne
          };
        });

        const { error: lignesError } = await (supabase as any)
          .from('lignes_production')
          .insert(lignesData);

        if (lignesError) throw lignesError;
      }

      if (allArrets.length > 0 && insertedShift) {
        const arretsData = allArrets.map(arret => ({
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
        description: editMode ? "Données de production modifiées avec succès" : "Données de production enregistrées avec succès",
        className: "bg-green-500 text-white border-green-600"
      });

      // Call onSuccess callback if provided (for modal close)
      if (onSuccess) {
        onSuccess();
      }

      // Réinitialiser tous les champs du formulaire (only in creation mode)
      if (!editMode) {
        setShift({
          date: new Date().toISOString().split('T')[0],
          shift_type: '10h-19h',
          chef_quart_id: '',
          heure_debut_theorique: '10:00',
          heure_fin_theorique: '19:00',
          heure_debut_reelle: '10:00',
          heure_fin_reelle: '19:00',
          bouteilles_produites: 0,
          chariste: 0,
          chariot: 0,
          agent_quai: 0,
          agent_saisie: 0,
          agent_atelier: 0
        });
        setLignes([
          {
            numero_ligne: 1,
            chef_ligne_id: '',
            nombre_agents: 0,
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
            consignes_vivo_b12: undefined,
            arrets: []
          },
          {
            numero_ligne: 2,
            chef_ligne_id: '',
            nombre_agents: 0,
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
            consignes_vivo_b12: undefined,
            arrets: []
          },
          {
            numero_ligne: 3,
            chef_ligne_id: '',
            nombre_agents: 0,
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
            consignes_vivo_b12: undefined,
            arrets: []
          },
          {
            numero_ligne: 4,
            chef_ligne_id: '',
            nombre_agents: 0,
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
            consignes_vivo_b12: undefined,
            arrets: []
          },
          {
            numero_ligne: 5,
            chef_ligne_id: '',
            nombre_agents: 0,
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
            consignes_vivo_b12: undefined,
            arrets: []
          }
        ]);

      }

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

  console.log('Rendering ProductionShiftForm, loading:', loading, 'editMode:', editMode);

  return (
    <>
      <AlertDialog open={showDuplicateAlert} onOpenChange={setShowDuplicateAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Shift déjà enregistré</AlertDialogTitle>
            <AlertDialogDescription>
              Un shift pour cette date ({shift.date}) et ce type ({shift.shift_type === '10h-19h' ? 'Shift 1' : 'Shift 2'})
              a déjà été enregistré dans le système.
              <br /><br />
              Si cet enregistrement précédent était une erreur, veuillez contacter l'administrateur
              pour le supprimer avant de pouvoir saisir à nouveau ces données.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Compris</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className={`flex flex-col lg:flex-row ${editMode ? '' : 'min-h-screen'} bg-background`}>
        {/* Sidebar Recapitulatif - Fixed on Desktop only in full page mode */}
        <aside className={`w-full lg:w-80 bg-background z-20 overflow-y-auto ${editMode ? 'border-b lg:border-b-0 lg:border-r' : 'lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:border-r'}`}>
          <ProductionRecapitulatif lignes={lignes} arrets={lignes.flatMap(l => l.arrets || [])} />
        </aside>

        {/* Main Content - Scrollable */}
        <main className={`flex-1 p-4 md:p-6 ${editMode ? '' : 'lg:ml-80'}`}>
          <div className={`${editMode ? '' : 'sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 -mx-4 px-4 -mt-4 pt-4 md:-mx-6 md:px-6 md:-mt-6 md:pt-6 mb-6 border-b pb-4'} flex items-center justify-between`}>
            {!editMode && <h1 className="text-2xl font-bold tracking-tight">Saisie Production</h1>}
            {!editMode && showTestButton && (
              <Button
                type="button"
                onClick={fillRandomData}
                variant="outline"
                size="sm"
                className="gap-2 border-blue-500 text-blue-600 hover:bg-blue-50"
              >
                <FlaskConical className="h-4 w-4" />
                Remplir avec données de test
              </Button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 max-w-[1600px] mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Informations du Shift</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Les champs avec un <span className="text-red-500">*</span> sont obligatoires
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="date">
                      Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={shift.date}
                      onChange={(e) => handleShiftChange('date', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="heure-debut">
                      Heure début réelle <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="heure-debut"
                      type="time"
                      value={shift.heure_debut_reelle}
                      onChange={(e) => handleShiftChange('heure_debut_reelle', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="heure-fin">
                      Heure fin réelle <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="heure-fin"
                      type="time"
                      value={shift.heure_fin_reelle}
                      onChange={(e) => handleShiftChange('heure_fin_reelle', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="shift-type">
                      Shift <span className="text-red-500">*</span>
                    </Label>
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
                    <Label htmlFor="chef-quart">
                      Chef de Quart <span className="text-red-500">*</span>
                    </Label>
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

                  <div>
                    <Label htmlFor="chariste">Cariste</Label>
                    <Input
                      id="chariste"
                      type="number"
                      min="0"
                      value={shift.chariste || ''}
                      onChange={(e) => handleShiftChange('chariste', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="chariot">Chariot</Label>
                    <Input
                      id="chariot"
                      type="number"
                      min="0"
                      value={shift.chariot || ''}
                      onChange={(e) => handleShiftChange('chariot', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="agent-quai">Agent de Quai</Label>
                    <Input
                      id="agent-quai"
                      type="number"
                      min="0"
                      value={shift.agent_quai || ''}
                      onChange={(e) => handleShiftChange('agent_quai', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="agent-saisie">Agent de Saisie</Label>
                    <Input
                      id="agent-saisie"
                      type="number"
                      min="0"
                      value={shift.agent_saisie || ''}
                      onChange={(e) => handleShiftChange('agent_saisie', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="agent-atelier">Agent Atelier</Label>
                    <Input
                      id="agent-atelier"
                      type="number"
                      min="0"
                      value={shift.agent_atelier || ''}
                      onChange={(e) => handleShiftChange('agent_atelier', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Lignes de Production</h2>
              {lignes.map((ligne, index) => (
                <LigneProductionForm
                  key={index}
                  index={index}
                  ligne={ligne}
                  chefsLigne={chefsLigne}
                  onUpdate={updateLigne}
                  isB12Only={index === 4}
                  isOpen={activeLineIndex === index}
                  onToggle={() => setActiveLineIndex(activeLineIndex === index ? null : index)}
                />
              ))}
            </div>

            <div className="flex justify-end pt-6">
              <Button type="submit" size="lg" disabled={loading}>
                {loading ? "Enregistrement..." : "Enregistrer le Shift"}
              </Button>
            </div>
          </form>
        </main>
      </div>
    </>
  );
};
