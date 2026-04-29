import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'app_auth_session';
// Legacy keys still read by ProtectedRoute / pages — we keep them in sync to
// avoid touching every page right now.
const LEGACY_LS_AUTH = 'isAuthenticated';
const LEGACY_LS_USER_NAME = 'user_name';
const LEGACY_SS_DASHBOARD = 'dashboard_authenticated';

export interface AppAuthSession {
  user_id: string;
  user_name: string;
  authenticated_at: string; // ISO timestamp
}

interface VerifyLoginRow {
  user_id: string;
  full_name: string;
  logged_at: string;
}

const AUTH_CHANGED_EVENT = 'app-auth:changed';

function persist(session: AppAuthSession | null) {
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    localStorage.setItem(LEGACY_LS_AUTH, 'true');
    localStorage.setItem(LEGACY_LS_USER_NAME, session.user_name);
    sessionStorage.setItem(LEGACY_SS_DASHBOARD, 'true');
  } else {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_LS_AUTH);
    localStorage.removeItem(LEGACY_LS_USER_NAME);
    sessionStorage.removeItem(LEGACY_SS_DASHBOARD);
  }
  // Notifie toutes les instances de useAppAuth dans le même onglet
  // (les events "storage" ne se propagent qu'entre onglets différents).
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
}

function read(): AppAuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppAuthSession;
  } catch {
    return null;
  }
}

export function useAppAuth() {
  const [session, setSession] = useState<AppAuthSession | null>(() => read());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-sync sur :
  // - changement dans un autre onglet (event "storage")
  // - changement dans le même onglet via une autre instance du hook
  //   (event custom "app-auth:changed" émis par persist())
  useEffect(() => {
    const sync = () => setSession(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) sync();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(AUTH_CHANGED_EVENT, sync);
    };
  }, []);

  const login = useCallback(async (code: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await (supabase as any).rpc(
        'verify_login',
        { p_code: code },
      );
      if (rpcError) {
        setError('Erreur technique. Réessayez.');
        return false;
      }
      const rows = (data ?? []) as VerifyLoginRow[];
      if (rows.length === 0) {
        setError('Code incorrect');
        return false;
      }
      const row = rows[0];
      const newSession: AppAuthSession = {
        user_id: row.user_id,
        user_name: row.full_name,
        authenticated_at: row.logged_at ?? new Date().toISOString(),
      };
      persist(newSession);
      setSession(newSession);
      return true;
    } catch {
      setError('Erreur réseau');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    persist(null);
    setSession(null);
  }, []);

  return {
    session,
    loading,
    error,
    isAuthenticated: session !== null,
    login,
    logout,
  };
}
