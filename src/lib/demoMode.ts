// Mode démonstration de la landing.
//
// Quand activé (flag de session), le client Supabase est intercepté pour
// renvoyer des DONNÉES FICTIVES locales — aucun appel n'est fait à la vraie
// base de production. Les vrais utilisateurs (non-démo) ne sont jamais affectés.
//
// Le flag vit en sessionStorage : il disparaît à la fermeture de l'onglet et
// ne se propage pas entre onglets, ce qui limite naturellement sa portée.

const DEMO_KEY = 'gp_demo';

/** Le mode démo est-il actif ? Lu à chaque appel (bascule runtime). */
export function isDemo(): boolean {
  try {
    return sessionStorage.getItem(DEMO_KEY) === '1';
  } catch {
    return false;
  }
}

/** Active le mode démo. */
export function enterDemo(): void {
  try {
    sessionStorage.setItem(DEMO_KEY, '1');
  } catch {
    /* ignore */
  }
}

/** Désactive le mode démo. */
export function exitDemo(): void {
  try {
    sessionStorage.removeItem(DEMO_KEY);
  } catch {
    /* ignore */
  }
}
