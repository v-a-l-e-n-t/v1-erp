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
      acc.recharges_b28 += (ligne.recharges_petro_b28 || 0) + (ligne.recharges_total_b28 || 0) + (ligne.recharges_vivo_b28 || 0);
      acc.recharges_b38 += (ligne.recharges_petro_b38 || 0) + (ligne.recharges_total_b38 || 0) + (ligne.recharges_vivo_b38 || 0);

      // Consignes
      acc.consignes_b6 += (ligne.consignes_petro_b6 || 0) + (ligne.consignes_total_b6 || 0) + (ligne.consignes_vivo_b6 || 0);
      acc.consignes_b12 += (ligne.consignes_petro_b12 || 0) + (ligne.consignes_total_b12 || 0) + (ligne.consignes_vivo_b12 || 0);
      acc.consignes_b28 += (ligne.consignes_petro_b28 || 0) + (ligne.consignes_total_b28 || 0) + (ligne.consignes_vivo_b28 || 0);
      acc.consignes_b38 += (ligne.consignes_petro_b38 || 0) + (ligne.consignes_total_b38 || 0) + (ligne.consignes_vivo_b38 || 0);

      // Par client
      acc.petro_b6 += (ligne.recharges_petro_b6 || 0) + (ligne.consignes_petro_b6 || 0);
      acc.petro_b12 += (ligne.recharges_petro_b12 || 0) + (ligne.consignes_petro_b12 || 0);
      acc.petro_b28 += (ligne.recharges_petro_b28 || 0) + (ligne.consignes_petro_b28 || 0);
      acc.petro_b38 += (ligne.recharges_petro_b38 || 0) + (ligne.consignes_petro_b38 || 0);

      acc.total_b6 += (ligne.recharges_total_b6 || 0) + (ligne.consignes_total_b6 || 0);
      acc.total_b12 += (ligne.recharges_total_b12 || 0) + (ligne.consignes_total_b12 || 0);
      acc.total_b28 += (ligne.recharges_total_b28 || 0) + (ligne.consignes_total_b28 || 0);
      acc.total_b38 += (ligne.recharges_total_b38 || 0) + (ligne.consignes_total_b38 || 0);

      acc.vivo_b6 += (ligne.recharges_vivo_b6 || 0) + (ligne.consignes_vivo_b6 || 0);
      acc.vivo_b12 += (ligne.recharges_vivo_b12 || 0) + (ligne.consignes_vivo_b12 || 0);
      acc.vivo_b28 += (ligne.recharges_vivo_b28 || 0) + (ligne.consignes_vivo_b28 || 0);
      acc.vivo_b38 += (ligne.recharges_vivo_b38 || 0) + (ligne.consignes_vivo_b38 || 0);

      return acc;
    },
    {
      recharges_b6: 0, recharges_b12: 0, recharges_b28: 0, recharges_b38: 0,
      consignes_b6: 0, consignes_b12: 0, consignes_b28: 0, consignes_b38: 0,
      petro_b6: 0, petro_b12: 0, petro_b28: 0, petro_b38: 0,
      total_b6: 0, total_b12: 0, total_b28: 0, total_b38: 0,
      vivo_b6: 0, vivo_b12: 0, vivo_b28: 0, vivo_b38: 0,
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

  // Calcul du tonnage (B6 = 6kg, B12 = 12.5kg, B28 = 28kg, B38 = 38kg)
  const totalB6 = cumuls.recharges_b6 + cumuls.consignes_b6;
  const totalB12 = cumuls.recharges_b12 + cumuls.consignes_b12;
  const totalB28 = cumuls.recharges_b28 + cumuls.consignes_b28;
  const totalB38 = cumuls.recharges_b38 + cumuls.consignes_b38;

  const tonnageProduit = (totalB6 * 6 + totalB12 * 12.5 + totalB28 * 28 + totalB38 * 38) / 1000; // En tonnes

  return (

    <div className="h-full">
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 h-full overflow-y-auto">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Récapitulatif Production</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {/* Tonnage produit */}
            <div className="bg-card p-3 rounded-lg border shadow-sm">
              <p className="text-xs text-muted-foreground mb-1">Tonnage Produit</p>
              <p className="text-2xl font-bold text-primary">{tonnageProduit.toFixed(3)} T</p>
            </div>

            {/* Recharges */}
            <div className="bg-card p-3 rounded-lg border shadow-sm">
              <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Cumul Recharges</p>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm">B6</span>
                  <span className="font-mono font-bold">{cumuls.recharges_b6}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">B12</span>
                  <span className="font-mono font-bold">{cumuls.recharges_b12}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">B28</span>
                  <span className="font-mono font-bold">{cumuls.recharges_b28}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">B38</span>
                  <span className="font-mono font-bold">{cumuls.recharges_b38}</span>
                </div>
              </div>
            </div>

            {/* Consignes */}
            <div className="bg-card p-3 rounded-lg border shadow-sm">
              <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Cumul Consignes</p>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm">B6</span>
                  <span className="font-mono font-bold">{cumuls.consignes_b6}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">B12</span>
                  <span className="font-mono font-bold">{cumuls.consignes_b12}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">B28</span>
                  <span className="font-mono font-bold">{cumuls.consignes_b28}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">B38</span>
                  <span className="font-mono font-bold">{cumuls.consignes_b38}</span>
                </div>
              </div>
            </div>

            {/* Temps d'arrêt */}
            <div className="bg-card p-3 rounded-lg border shadow-sm">
              <p className="text-xs text-muted-foreground mb-1">Temps d'Arrêt Total</p>
              <p className="text-xl font-bold text-destructive">
                {heuresArret}h {minutesArret}min
              </p>
            </div>
          </div>

          <div className="border-t border-primary/10 my-4"></div>

          {/* Cumuls par client */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">Détail par Client</h4>

            <div className="bg-card p-3 rounded-lg border shadow-sm">
              <p className="text-xs font-bold text-orange-500 mb-2">PETRO IVOIRE</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">B6:</span> <span className="font-medium">{cumuls.petro_b6}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">B12:</span> <span className="font-medium">{cumuls.petro_b12}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">B28:</span> <span className="font-medium">{cumuls.petro_b28}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">B38:</span> <span className="font-medium">{cumuls.petro_b38}</span></div>
              </div>
            </div>

            <div className="bg-card p-3 rounded-lg border shadow-sm">
              <p className="text-xs font-bold text-blue-600 mb-2">TOTAL ENERGIES</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">B6:</span> <span className="font-medium">{cumuls.total_b6}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">B12:</span> <span className="font-medium">{cumuls.total_b12}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">B28:</span> <span className="font-medium">{cumuls.total_b28}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">B38:</span> <span className="font-medium">{cumuls.total_b38}</span></div>
              </div>
            </div>

            <div className="bg-card p-3 rounded-lg border shadow-sm">
              <p className="text-xs font-bold text-yellow-600 mb-2">VIVO ENERGIES</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">B6:</span> <span className="font-medium">{cumuls.vivo_b6}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">B12:</span> <span className="font-medium">{cumuls.vivo_b12}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">B28:</span> <span className="font-medium">{cumuls.vivo_b28}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">B38:</span> <span className="font-medium">{cumuls.vivo_b38}</span></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
