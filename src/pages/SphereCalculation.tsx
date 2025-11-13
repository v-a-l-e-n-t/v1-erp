import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { calculateSphere, formatNumberWithSpaces, type SphereInputData, type CalibrationPoint, type SphereCalculationResult } from '@/utils/sphereCalculations';
import { ArrowLeft, Calculator, Printer } from 'lucide-react';
import { SphereCalculationPrint } from '@/components/SphereCalculationPrint';
import { useNavigate } from 'react-router-dom';
import { AutoBaremageImport } from '@/components/AutoBaremageImport';
import { SphereForm } from '@/components/SphereForm';

const sphereSchema = z.object({
  hauteur_mm: z.string().min(1, 'Hauteur requise'),
  temperature_liquide_c: z.string().min(1, 'Température liquide requise'),
  temperature_gazeuse_c: z.string().min(1, 'Température gazeuse requise'),
  pression_sphere_barg: z.string().min(1, 'Pression requise'),
  densite_d15: z.string().min(1, 'Densité requise'),
  tl_min: z.string().min(1, 'TL Min requise'),
  tl_max: z.string().min(1, 'TL Max requise'),
  d_min: z.string().min(1, 'D Min requise'),
  d_max: z.string().min(1, 'D Max requise'),
  tg_min: z.string().min(1, 'TG Min requise'),
  tg_max: z.string().min(1, 'TG Max requise'),
  ps_min: z.string().min(1, 'PS Min requise'),
  ps_max: z.string().min(1, 'PS Max requise'),
});

const formSchema = z.object({
  sphere1: sphereSchema,
  sphere2: sphereSchema,
  sphere3: sphereSchema,
});

export default function SphereCalculation() {
  const navigate = useNavigate();
  const [calibrationData, setCalibrationData] = useState<CalibrationPoint[]>([]);
  const [results, setResults] = useState<SphereCalculationResult[] | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [formValues, setFormValues] = useState<z.infer<typeof formSchema> | null>(null);
  const capaciteStockage = 3323413; // Capacité pour S1 (utilisé pour toutes)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sphere1: {
        hauteur_mm: '',
        temperature_liquide_c: '',
        temperature_gazeuse_c: '',
        pression_sphere_barg: '',
        densite_d15: '',
        tl_min: '',
        tl_max: '',
        d_min: '',
        d_max: '',
        tg_min: '',
        tg_max: '',
        ps_min: '',
        ps_max: '',
      },
      sphere2: {
        hauteur_mm: '',
        temperature_liquide_c: '',
        temperature_gazeuse_c: '',
        pression_sphere_barg: '',
        densite_d15: '',
        tl_min: '',
        tl_max: '',
        d_min: '',
        d_max: '',
        tg_min: '',
        tg_max: '',
        ps_min: '',
        ps_max: '',
      },
      sphere3: {
        hauteur_mm: '',
        temperature_liquide_c: '',
        temperature_gazeuse_c: '',
        pression_sphere_barg: '',
        densite_d15: '',
        tl_min: '',
        tl_max: '',
        d_min: '',
        d_max: '',
        tg_min: '',
        tg_max: '',
        ps_min: '',
        ps_max: '',
      },
    },
  });

  // Fonction helper pour auto-calculer TL
  const updateTLValues = (sphereName: 'sphere1' | 'sphere2' | 'sphere3', temp: number) => {
    const isInteger = temp === Math.floor(temp);
    if (isInteger) {
      form.setValue(`${sphereName}.tl_min`, temp.toString());
      form.setValue(`${sphereName}.tl_max`, '0');
    } else {
      form.setValue(`${sphereName}.tl_min`, Math.floor(temp).toString());
      form.setValue(`${sphereName}.tl_max`, Math.ceil(temp).toString());
    }
  };

  // Fonction helper pour auto-calculer TG
  const updateTGValues = (sphereName: 'sphere1' | 'sphere2' | 'sphere3', temp: number) => {
    const isHalfMultiple = (temp * 2) === Math.floor(temp * 2);
    if (isHalfMultiple) {
      form.setValue(`${sphereName}.tg_min`, temp.toString());
      form.setValue(`${sphereName}.tg_max`, '0');
    } else {
      const minTemp = Math.floor(temp * 2) / 2;
      const maxTemp = Math.ceil(temp * 2) / 2;
      form.setValue(`${sphereName}.tg_min`, minTemp.toString());
      form.setValue(`${sphereName}.tg_max`, maxTemp.toString());
    }
  };

  // Watchers pour sphere1
  const tempLiqS1 = form.watch('sphere1.temperature_liquide_c');
  const tempGazS1 = form.watch('sphere1.temperature_gazeuse_c');
  useEffect(() => {
    if (tempLiqS1 && tempLiqS1.trim() !== '') {
      const temp = parseFloat(tempLiqS1);
      if (!isNaN(temp) && temp >= 10) updateTLValues('sphere1', temp);
    }
  }, [tempLiqS1]);
  useEffect(() => {
    if (tempGazS1 && tempGazS1.trim() !== '') {
      const temp = parseFloat(tempGazS1);
      if (!isNaN(temp) && temp >= 10) updateTGValues('sphere1', temp);
    }
  }, [tempGazS1]);

  // Watchers pour sphere2
  const tempLiqS2 = form.watch('sphere2.temperature_liquide_c');
  const tempGazS2 = form.watch('sphere2.temperature_gazeuse_c');
  useEffect(() => {
    if (tempLiqS2 && tempLiqS2.trim() !== '') {
      const temp = parseFloat(tempLiqS2);
      if (!isNaN(temp) && temp >= 10) updateTLValues('sphere2', temp);
    }
  }, [tempLiqS2]);
  useEffect(() => {
    if (tempGazS2 && tempGazS2.trim() !== '') {
      const temp = parseFloat(tempGazS2);
      if (!isNaN(temp) && temp >= 10) updateTGValues('sphere2', temp);
    }
  }, [tempGazS2]);

  // Watchers pour sphere3
  const tempLiqS3 = form.watch('sphere3.temperature_liquide_c');
  const tempGazS3 = form.watch('sphere3.temperature_gazeuse_c');
  useEffect(() => {
    if (tempLiqS3 && tempLiqS3.trim() !== '') {
      const temp = parseFloat(tempLiqS3);
      if (!isNaN(temp) && temp >= 10) updateTLValues('sphere3', temp);
    }
  }, [tempLiqS3]);
  useEffect(() => {
    if (tempGazS3 && tempGazS3.trim() !== '') {
      const temp = parseFloat(tempGazS3);
      if (!isNaN(temp) && temp >= 10) updateTGValues('sphere3', temp);
    }
  }, [tempGazS3]);

  // Charger les données de barémage au montage
  useEffect(() => {
    loadCalibrationData();
  }, []);

  const loadCalibrationData = async () => {
    try {
      console.log('🔄 Chargement des données de barémage...');
      
      // Charger TOUTES les données sans limite
      let allData: CalibrationPoint[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await (supabase as any)
          .from('sphere_calibration')
          .select('height_mm, capacity_l')
          .eq('sphere_number', 1)
          .order('height_mm')
          .range(from, from + batchSize - 1);

        if (error) {
          console.error('❌ Erreur Supabase:', error);
          throw error;
        }

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          from += batchSize;
          hasMore = data.length === batchSize;
          console.log(`📦 Chargé ${allData.length} points...`);
        } else {
          hasMore = false;
        }
      }

      console.log(`✅ Total: ${allData.length} points de barémage chargés`);
      setCalibrationData(allData);
      
      if (allData.length === 0) {
        toast.error('Aucune donnée de barémage trouvée pour la Sphère 1');
      }
    } catch (error) {
      console.error('Erreur chargement barémage:', error);
      toast.error('Erreur lors du chargement des données de barémage');
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (calibrationData.length === 0) {
      toast.error('Données de barémage non disponibles');
      return;
    }

    setIsCalculating(true);

    try {
      const spheres = ['sphere1', 'sphere2', 'sphere3'] as const;
      const calculationResults: SphereCalculationResult[] = [];

      // Calculer pour chaque sphère
      for (let i = 0; i < spheres.length; i++) {
        const sphereData = values[spheres[i]];
        const inputData: SphereInputData = {
          sphere_number: i + 1,
          hauteur_mm: parseFloat(sphereData.hauteur_mm),
          temperature_liquide_c: parseFloat(sphereData.temperature_liquide_c),
          temperature_gazeuse_c: parseFloat(sphereData.temperature_gazeuse_c),
          pression_sphere_barg: parseFloat(sphereData.pression_sphere_barg),
          densite_d15: parseFloat(sphereData.densite_d15),
          tl_min: parseFloat(sphereData.tl_min),
          tl_max: parseFloat(sphereData.tl_max),
          d_min: parseFloat(sphereData.d_min),
          d_max: parseFloat(sphereData.d_max),
          tg_min: parseFloat(sphereData.tg_min),
          tg_max: parseFloat(sphereData.tg_max),
          ps_min: parseFloat(sphereData.ps_min),
          ps_max: parseFloat(sphereData.ps_max),
        };

        const result = calculateSphere(inputData, calibrationData);
        calculationResults.push(result);
      }

      setResults(calculationResults);
      setFormValues(values);
      setShowPreview(true);
      toast.success('Calculs effectués - Vérifiez l\'aperçu avant de valider');
    } catch (error: any) {
      console.error('Erreur calcul:', error);
      toast.error(error.message || 'Erreur lors du calcul');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleValidateAndSave = async () => {
    if (!results || !formValues) return;

    try {
      const spheres = ['sphere1', 'sphere2', 'sphere3'] as const;

      // Sauvegarder dans la base de données
      for (let i = 0; i < spheres.length; i++) {
        const sphereData = formValues[spheres[i]];
        const result = results[i];

        await (supabase as any).from('sphere_calculations').insert({
          sphere_number: i + 1,
          hauteur_mm: parseFloat(sphereData.hauteur_mm),
          temperature_liquide_c: parseFloat(sphereData.temperature_liquide_c),
          temperature_gazeuse_c: parseFloat(sphereData.temperature_gazeuse_c),
          pression_sphere_barg: parseFloat(sphereData.pression_sphere_barg),
          densite_d15: parseFloat(sphereData.densite_d15),
          tl_min: parseFloat(sphereData.tl_min),
          tl_max: parseFloat(sphereData.tl_max),
          d_min: parseFloat(sphereData.d_min),
          d_max: parseFloat(sphereData.d_max),
          tg_min: parseFloat(sphereData.tg_min),
          tg_max: parseFloat(sphereData.tg_max),
          ps_min: parseFloat(sphereData.ps_min),
          ps_max: parseFloat(sphereData.ps_max),
          volume_liquide_l: result.volume_liquide_l,
          volume_gazeux_l: result.volume_gazeux_l,
          masse_volumique_butane_kgl: result.masse_volumique_butane_kgl,
          masse_produit_kg: result.masse_produit_kg,
          masse_total_liquide_kg: result.masse_total_liquide_kg,
          masse_total_gaz_kg: result.masse_total_gaz_kg,
          masse_liquide_gaz_kg: result.masse_liquide_gaz_kg,
          creux_kg: result.creux_kg,
        });
      }

      toast.success('Calculs sauvegardés avec succès');
    } catch (error: any) {
      console.error('Erreur sauvegarde:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleCancel = () => {
    setShowPreview(false);
    setResults(null);
    setFormValues(null);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {!showPreview && (
        <div className="max-w-7xl mx-auto space-y-6 print:hidden">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au tableau de bord
          </Button>
          <Button variant="outline" onClick={() => navigate('/sphere-history')}>
            Voir l'historique
          </Button>
        </div>

        <AutoBaremageImport />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Calcul des 3 Sphères
            </CardTitle>
            <CardDescription>
              Saisir les données pour calculer les masses des 3 sphères
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <SphereForm form={form} sphereName="sphere1" sphereNumber={1} />
                <SphereForm form={form} sphereName="sphere2" sphereNumber={2} />
                <SphereForm form={form} sphereName="sphere3" sphereNumber={3} />

                <div className="flex gap-2">
                  <Button type="submit" disabled={isCalculating} className="flex-1">
                    {isCalculating ? 'Calcul en cours...' : 'Calculer'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        </div>
      )}

      {showPreview && results && formValues && (
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between print:hidden mb-6">
            <h2 className="text-2xl font-bold">Aperçu avant validation</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Annuler
              </Button>
              <Button onClick={handleValidateAndSave}>
                Valider et enregistrer
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimer
              </Button>
            </div>
          </div>
          
          <SphereCalculationPrint 
            results={results.map((r, i) => ({
              hauteur_mm: parseFloat(formValues[`sphere${i+1}` as keyof typeof formValues].hauteur_mm),
              temperature_liquide_c: parseFloat(formValues[`sphere${i+1}` as keyof typeof formValues].temperature_liquide_c),
              temperature_gazeuse_c: parseFloat(formValues[`sphere${i+1}` as keyof typeof formValues].temperature_gazeuse_c),
              pression_sphere_barg: parseFloat(formValues[`sphere${i+1}` as keyof typeof formValues].pression_sphere_barg),
              densite_d15: parseFloat(formValues[`sphere${i+1}` as keyof typeof formValues].densite_d15),
              volume_liquide_l: r.volume_liquide_l,
              volume_gazeux_l: r.volume_gazeux_l,
              masse_volumique_butane_kgl: r.masse_volumique_butane_kgl,
              masse_total_liquide_kg: r.masse_total_liquide_kg,
              masse_total_gaz_kg: r.masse_total_gaz_kg,
              masse_liquide_gaz_kg: r.masse_liquide_gaz_kg,
              creux_kg: r.creux_kg,
            }))}
            capaciteStockage={capaciteStockage}
          />
        </div>
      )}

    </div>
  );
}
