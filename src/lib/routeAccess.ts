// Permissions d'accès par route pour les utilisateurs admin.
//
// Un utilisateur dont `allowed_routes` (en base, table app_users) est NULL ou
// vide a un accès COMPLET (comportement historique). S'il a une liste de
// routes, il est CLOISONNÉ : il ne peut accéder qu'à ces routes, et est
// redirigé vers sa première route autorisée ailleurs.
//
// La liste est transportée dans app_auth_session (cf useAppAuth) au login.

import { isDemo } from './demoMode';

interface StoredSession {
  allowed_routes?: string[] | null;
}

function readSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem('app_auth_session');
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

/** Liste des routes autorisées, ou null si accès complet (pas de restriction). */
export function getAllowedRoutes(): string[] | null {
  const ar = readSession()?.allowed_routes;
  return Array.isArray(ar) && ar.length > 0 ? ar : null;
}

/** Route d'accueil de l'utilisateur (sa 1re route autorisée, sinon /dashboard). */
export function homeRoute(): string {
  const ar = getAllowedRoutes();
  return ar ? ar[0] : '/dashboard';
}

/** Le chemin est-il autorisé pour l'utilisateur courant ? */
export function isRouteAllowed(path: string): boolean {
  if (isDemo()) return true; // la démo n'est pas restreinte
  const ar = getAllowedRoutes();
  if (!ar) return true; // accès complet
  return ar.some((r) => path === r || path.startsWith(r.endsWith('/') ? r : r + '/'));
}
