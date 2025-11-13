import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar } from 'lucide-react';
import { formatNumberWithSpaces } from '@/utils/sphereCalculations';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CalculationHistory {
  id: string;
  sphere_number: number;
  calculation_date: string;
  hauteur_mm: number;
  temperature_liquide_c: number;
  masse_liquide_gaz_kg: number;
  creux_kg: number;
}

export default function SphereHistory() {
  const navigate = useNavigate();
  const [calculations, setCalculations] = useState<CalculationHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCalculations();
  }, []);

  const loadCalculations = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('sphere_calculations')
        .select('id, sphere_number, calculation_date, hauteur_mm, temperature_liquide_c, masse_liquide_gaz_kg, creux_kg')
        .order('calculation_date', { ascending: false });

      if (error) throw error;

      setCalculations(data || []);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
      toast.error('Erreur lors du chargement de l\'historique');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-end">
          <Button onClick={() => navigate('/sphere-calculation')}>
            Nouveau calcul
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Historique des calculs
            </CardTitle>
            <CardDescription>
              Tous les calculs de sphères effectués
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Chargement...</p>
            ) : calculations.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Aucun calcul enregistré</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Sphère</TableHead>
                      <TableHead>Hauteur (mm)</TableHead>
                      <TableHead>Température (°C)</TableHead>
                      <TableHead>Masse Liquide+Gaz (kg)</TableHead>
                      <TableHead>Creux (kg)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calculations.map((calc) => (
                      <TableRow key={calc.id}>
                        <TableCell>
                          {format(new Date(calc.calculation_date), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </TableCell>
                        <TableCell>S{calc.sphere_number}</TableCell>
                        <TableCell>{formatNumberWithSpaces(calc.hauteur_mm)}</TableCell>
                        <TableCell>{calc.temperature_liquide_c}</TableCell>
                        <TableCell>{formatNumberWithSpaces(calc.masse_liquide_gaz_kg)}</TableCell>
                        <TableCell>{formatNumberWithSpaces(calc.creux_kg)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
