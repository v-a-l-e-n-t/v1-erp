// Hook unifie d'introspection des 3 systemes d'auth qui coexistent
// dans l'app :
//   - admin : Supabase Auth | app_auth_session (RPC verify_login) | dashboard_authenticated (legacy)
//   - vrac  : vrac_session (RPC verify_vrac_login)
//
// Utilise par ProtectedRoute (variantes admin / vrac) et par les pages qui
// ont encore une garde inline (defense en profondeur).

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AuthRole = 'admin' | 'vrac';

interface AuthState {
  isAuthorized: boolean | null;  // null = en cours de verification
}

function readAdminFlags(): { localAuth: boolean; sessionAuth: boolean; appAuth: boolean } {
  return {
    localAuth: localStorage.getItem('isAuthenticated') === 'true',
    sessionAuth: sessionStorage.getItem('dashboard_authenticated') === 'true',
    appAuth: !!localStorage.getItem('app_auth_session'),
  };
}

function readVracFlag(): boolean {
  return !!localStorage.getItem('vrac_session');
}

export function useAuthGuard(role: AuthRole = 'admin'): AuthState {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const evaluate = async () => {
      if (role === 'vrac') {
        if (!cancelled) setIsAuthorized(readVracFlag());
        return;
      }

      // admin : verifie les 3 sources
      const { data: { session } } = await supabase.auth.getSession();
      const flags = readAdminFlags();
      if (!cancelled) {
        setIsAuthorized(!!session || flags.localAuth || flags.sessionAuth || flags.appAuth);
      }
    };

    evaluate();

    // Re-evalue sur changement Supabase session (admin uniquement)
    let subscription: { unsubscribe: () => void } | null = null;
    if (role === 'admin') {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (cancelled) return;
        const flags = readAdminFlags();
        setIsAuthorized(!!session || flags.localAuth || flags.sessionAuth || flags.appAuth);
      });
      subscription = data.subscription;
    }

    // Re-evalue sur changement localStorage (autre onglet)
    const onStorage = () => {
      if (cancelled) return;
      if (role === 'vrac') {
        setIsAuthorized(readVracFlag());
      } else {
        const flags = readAdminFlags();
        // Pas de re-fetch de la session Supabase ici (rare et la subscription
        // ci-dessus s'en charge si elle change).
        setIsAuthorized((prev) => !!flags.localAuth || flags.sessionAuth || flags.appAuth || prev === true);
      }
    };
    window.addEventListener('storage', onStorage);

    // Event custom emis par useAppAuth (cf hook source)
    const onAppAuthChanged = () => {
      if (cancelled || role !== 'admin') return;
      const flags = readAdminFlags();
      setIsAuthorized((prev) => !!flags.localAuth || flags.sessionAuth || flags.appAuth || prev === true);
    };
    window.addEventListener('app-auth:changed', onAppAuthChanged);

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('app-auth:changed', onAppAuthChanged);
    };
  }, [role]);

  return { isAuthorized };
}
