import { useEffect } from 'react';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  BON_EXPIRY_ALERT_DAYS,
  daysLeft,
} from '@/utils/bonsTransfert';
import type { BonClient } from '@/types/bons';

// Toast ID unique pour pouvoir l'updater plutôt que d'en empiler plusieurs
const EXPIRY_TOAST_ID = 'bons-expiry-alert';

// Délais (ms)
const STARTUP_DELAY = 5_000;   // attendre 5 s après connexion / refresh
const TOAST_DURATION = 5 * 60 * 1000; // toast persistant 5 minutes

/**
 * Surveillance globale d'expiration des bons de transfert.
 *
 * Comportement :
 * - 5 s après le mount (= connexion / refresh), interroge Supabase.
 * - Si au moins un bon disponible expire d'ici 3 jours (incluant les déjà
 *   expirés), affiche un toast d'alerte non-dismissible, durée 5 minutes,
 *   sans bouton de fermeture.
 * - Sur refresh, le composant remonte → le process reprend depuis le départ.
 *
 * Mounté une fois au niveau racine de l'app pour couvrir toutes les pages.
 */
export function BonsExpiryWatcher() {
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        // On récupère uniquement les bons à statut `disponible` dont la date
        // d'édition est au-delà du seuil. Pour simplifier on récupère tout et
        // on filtre côté client (volumes faibles, < quelques milliers).
        const { data, error } = await (supabase as any)
          .from('bons_transfert')
          .select('id, client, numero_bon, date_edition')
          .eq('statut', 'disponible');

        if (error || !data) return;

        const at_risk = (data as Array<{
          client: BonClient;
          numero_bon: string;
          date_edition: string | null;
        }>)
          .map((b) => ({ ...b, jours: daysLeft(b.date_edition) }))
          .filter((b) => b.jours != null && (b.jours as number) <= BON_EXPIRY_ALERT_DAYS);

        if (at_risk.length === 0) return;

        const expired = at_risk.filter((b) => (b.jours as number) <= 0);
        const soon = at_risk.filter((b) => (b.jours as number) > 0);

        // Titre adapté aux 3 cas (que des expirés, que des bientôt, mixte)
        let title: string;
        if (expired.length > 0 && soon.length > 0) {
          title = `⚠️ ${expired.length} expiré(s) + ${soon.length} bientôt expiré(s)`;
        } else if (expired.length > 0) {
          title = `⚠️ ${expired.length} bon(s) expiré(s)`;
        } else {
          title = `⚠️ ${soon.length} bon(s) arrivant à expiration`;
        }

        // Liste des numéros : expirés en pastille rouge / texte blanc.
        const numeros = (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {expired.map((b) => (
              <span
                key={b.numero_bon}
                className="font-mono text-xs px-2 py-0.5 rounded bg-red-600 text-white"
              >
                {b.numero_bon}
              </span>
            ))}
            {soon.map((b) => (
              <span
                key={b.numero_bon}
                className="font-mono text-xs px-2 py-0.5 rounded bg-orange-100 text-black"
              >
                {b.numero_bon}
              </span>
            ))}
          </div>
        );

        toast.warning(title, {
          id: EXPIRY_TOAST_ID,
          description: numeros,
          duration: TOAST_DURATION,
          dismissible: true,
          closeButton: true,
          icon: <AlertTriangle className="h-5 w-5 text-orange-600" />,
          classNames: {
            closeButton:
              '!left-auto !right-2 !top-2 !bg-red-600 !text-white !border-red-600 hover:!bg-red-700',
          },
        });
      } catch (e) {
        // silencieux : ne doit jamais casser la plateforme
        console.error('BonsExpiryWatcher error', e);
      }
    }, STARTUP_DELAY);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
