import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LigneProduction, ArretProduction } from "@/types/production";

interface ProductionRecapitulatifProps {
  lignes: LigneProduction[];
  arrets: ArretProduction[];
}

export const ProductionRecapitulatif = ({ lignes, arrets }: ProductionRecapitulatifProps) => {
  // Calculs des cumuls
  const cumuls = lignes.reduce(
    (acc, ligne) => {
      // Recharges
      acc.recharges_b6 += (ligne.recharges_petro_b6 || 0) + (ligne.recharges_total_b6 || 0) + (ligne.recharges_vivo_b6 || 0);
      acc.recharges_b12 += (ligne.recharges_petro_b12 || 0) + (ligne.recharges_total_b12 || 0) + (ligne.recharges_vivo_b12 || 0);
      
      // Consignes
      acc.consignes_b6 += (ligne.consignes_petro_b6 || 0) + (ligne.consignes_total_b6 || 0) + (ligne.consignes_vivo_b6 || 0);
      acc.consignes_b12 += (ligne.consignes_petro_b12 || 0) + (ligne.consignes_total_b12 || 0) + (ligne.consignes_vivo_b12 || 0);
      
      // Par client
      acc.petro_b6 += (ligne.recharges_petro_b6 || 0) + (ligne.consignes_petro_b6 || 0);
      acc.petro_b12 += (ligne.recharges_petro_b12 || 0) + (ligne.consignes_petro_b12 || 0);
      acc.total_b6 += (ligne.recharges_total_b6 || 0) + (ligne.consignes_total_b6 || 0);
      acc.total_b12 += (ligne.recharges_total_b12 || 0) + (ligne.consignes_total_b12 || 0);
      acc.vivo_b6 += (ligne.recharges_vivo_b6 || 0) + (ligne.consignes_vivo_b6 || 0);
      acc.vivo_b12 += (ligne.recharges_vivo_b12 || 0) + (ligne.consignes_vivo_b12 || 0);
      
      return acc;
    },
    {
      recharges_b6: 0,
      recharges_b12: 0,
      consignes_b6: 0,
      consignes_b12: 0,
      petro_b6: 0,
      petro_b12: 0,
      total_b6: 0,
      total_b12: 0,
      vivo_b6: 0,
      vivo_b12: 0,
    }
  );

  // Calcul du temps d'arrêt total
  const tempsArretTotal = arrets.reduce((total, arret) => {
    if (!arret.heure_debut || !arret.heure_fin) return total;
    
    const [debutH, debutM] = arret.heure_debut.split(':').map(Number);
    const [finH, finM] = arret.heure_fin.split(':').map(Number);
    
    const debutMinutes = debutH * 60 + debutM;
    const finMinutes = finH * 60 + finM;
    
    let duree = finMinutes - debutMinutes;
    if (duree < 0) duree += 24 * 60; // Gestion passage minuit
    
    return total + duree;
  }, 0);

  const heuresArret = Math.floor(tempsArretTotal / 60);
  const minutesArret = tempsArretTotal % 60;

  const quantiteProduite = cumuls.recharges_b6 + cumuls.recharges_b12 + cumuls.consignes_b6 + cumuls.consignes_b12;

  return (
    <div className="sticky top-0 z-10 bg-background pb-4">
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Récapitulatif Production</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {/* Quantité produite */}
            <div className="bg-card p-2 rounded-lg border">
              <p className="text-xs text-muted-foreground">Quantité Produite</p>
              <p className="text-xl font-bold">{quantiteProduite}</p>
            </div>

            {/* Recharges */}
            <div className="bg-card p-2 rounded-lg border">
              <p className="text-xs text-muted-foreground">Cumul Recharges</p>
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">B6: {cumuls.recharges_b6}</p>
                <p className="text-sm font-semibold">B12: {cumuls.recharges_b12}</p>
              </div>
            </div>

            {/* Consignes */}
            <div className="bg-card p-2 rounded-lg border">
              <p className="text-xs text-muted-foreground">Cumul Consignes</p>
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">B6: {cumuls.consignes_b6}</p>
                <p className="text-sm font-semibold">B12: {cumuls.consignes_b12}</p>
              </div>
            </div>

            {/* Temps d'arrêt */}
            <div className="bg-card p-2 rounded-lg border">
              <p className="text-xs text-muted-foreground">Temps d'Arrêt Total</p>
              <p className="text-xl font-bold">
                {heuresArret}h {minutesArret}min
              </p>
            </div>
          </div>

          {/* Cumuls par client */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="bg-card p-2 rounded-lg border">
              <p className="text-xs font-semibold text-orange-500 mb-1">PETRO IVOIRE</p>
              <div className="space-y-0.5 text-xs">
                <p>B6: {cumuls.petro_b6}</p>
                <p>B12: {cumuls.petro_b12}</p>
                <p className="font-semibold pt-1 border-t">Total: {cumuls.petro_b6 + cumuls.petro_b12}</p>
              </div>
            </div>

            <div className="bg-card p-2 rounded-lg border">
              <p className="text-xs font-semibold text-orange-500 mb-1">TOTAL ENERGIES</p>
              <div className="space-y-0.5 text-xs">
                <p>B6: {cumuls.total_b6}</p>
                <p>B12: {cumuls.total_b12}</p>
                <p className="font-semibold pt-1 border-t">Total: {cumuls.total_b6 + cumuls.total_b12}</p>
              </div>
            </div>

            <div className="bg-card p-2 rounded-lg border">
              <p className="text-xs font-semibold text-orange-500 mb-1">VIVO ENERGIES</p>
              <div className="space-y-0.5 text-xs">
                <p>B6: {cumuls.vivo_b6}</p>
                <p>B12: {cumuls.vivo_b12}</p>
                <p className="font-semibold pt-1 border-t">Total: {cumuls.vivo_b6 + cumuls.vivo_b12}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
