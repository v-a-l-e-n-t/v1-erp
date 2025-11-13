import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { UseFormReturn } from 'react-hook-form';

interface SphereFormProps {
  form: UseFormReturn<any>;
  sphereName: 'sphere1' | 'sphere2' | 'sphere3';
  sphereNumber: number;
}

export const SphereForm = ({ form, sphereName, sphereNumber }: SphereFormProps) => {
  return (
    <div className="space-y-4 border rounded-lg p-4 bg-card">
      <h3 className="font-semibold text-lg text-orange-500">Sphère {sphereNumber}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name={`${sphereName}.hauteur_mm`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hauteur (mm)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`${sphereName}.temperature_liquide_c`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Temp. liquide (°C)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`${sphereName}.temperature_gazeuse_c`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Temp. gazeuse (°C)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`${sphereName}.pression_sphere_barg`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pression (Bar(g))</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`${sphereName}.densite_d15`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Densité D15</FormLabel>
              <FormControl>
                <Input type="number" step="0.0001" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="space-y-2">
        <h4 className="font-medium text-sm">Paramètres Température/Densité</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <FormField
            control={form.control}
            name={`${sphereName}.tl_min`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">TL Min</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`${sphereName}.tl_max`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">TL Max</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`${sphereName}.d_min`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">D Min</FormLabel>
                <FormControl>
                  <Input type="number" step="0.0001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`${sphereName}.d_max`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">D Max</FormLabel>
                <FormControl>
                  <Input type="number" step="0.0001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium text-sm">Paramètres Température Gazeuse/Poids Spécifique</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <FormField
            control={form.control}
            name={`${sphereName}.tg_min`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">TG Min</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`${sphereName}.tg_max`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">TG Max</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`${sphereName}.ps_min`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">PS Min</FormLabel>
                <FormControl>
                  <Input type="number" step="0.0001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`${sphereName}.ps_max`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">PS Max</FormLabel>
                <FormControl>
                  <Input type="number" step="0.0001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
};
