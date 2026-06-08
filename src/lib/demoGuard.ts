import { toast } from 'sonner';
import { isDemo } from './demoMode';

/**
 * En MODE DÉMO, bloque une action d'écriture/impression et affiche un message.
 * Renvoie `true` si l'action a été bloquée (l'appelant doit alors `return`).
 *
 * @example
 *   if (demoBlock('supprimer un bilan')) return;
 */
export function demoBlock(action: string): boolean {
  if (isDemo()) {
    toast.warning(`Vous ne pouvez pas ${action} en mode démonstration.`);
    return true;
  }
  return false;
}
