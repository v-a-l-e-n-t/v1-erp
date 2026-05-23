import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VracSession } from '@/types/vrac';

const VRAC_SESSION_KEY = 'vrac_session';

interface VerifyVracLoginRow {
    user_id: string;
    client_id: string;
    user_nom: string | null;
    client_nom: string;
    client_nom_affichage: string;
}

export const useVracAuth = () => {
    const [session, setSession] = useState<VracSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const checkSession = useCallback(() => {
        const savedSession = localStorage.getItem(VRAC_SESSION_KEY);
        if (savedSession) {
            try {
                const parsed = JSON.parse(savedSession) as VracSession;
                setSession(parsed);
            } catch (e) {
                localStorage.removeItem(VRAC_SESSION_KEY);
                setSession(null);
            }
        } else {
            setSession(null);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        checkSession();
    }, [checkSession]);

    const login = useCallback(async (password: string): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            // Le hash est calcule server-side (bcrypt) via la RPC verify_vrac_login.
            // Fallback transparent pour les anciens hashes SHA-256, qui sont
            // automatiquement reecrits en bcrypt au premier login reussi.
            const { data, error: rpcError } = await (supabase as any).rpc(
                'verify_vrac_login',
                { p_password: password },
            );

            if (rpcError) {
                console.error('Login error:', rpcError);
                setError(`Erreur technique: ${rpcError.message || 'Erreur inconnue'}`);
                setLoading(false);
                return false;
            }

            const rows = (data ?? []) as VerifyVracLoginRow[];
            if (rows.length === 0) {
                setError('Mot de passe incorrect');
                setLoading(false);
                return false;
            }

            const row = rows[0];
            const newSession: VracSession = {
                user_id: row.user_id,
                client_id: row.client_id,
                client_nom: row.client_nom,
                client_nom_affichage: row.client_nom_affichage,
                user_nom: row.user_nom ?? '',
                authenticated_at: new Date().toISOString(),
            };

            localStorage.setItem(VRAC_SESSION_KEY, JSON.stringify(newSession));
            setSession(newSession);
            setLoading(false);
            return true;
        } catch (e) {
            console.error('Login exception:', e);
            setError('Une erreur est survenue');
            setLoading(false);
            return false;
        }
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(VRAC_SESSION_KEY);
        setSession(null);
    }, []);

    const isAuthenticated = session !== null;

    return {
        session,
        loading,
        error,
        login,
        logout,
        isAuthenticated,
        refreshSession: checkSession,
    };
};

// Generation d'un mot de passe aleatoire (alphabet sans confusion).
// Utilise par l'admin pour creer un compte VRAC ; le hash est calcule server-side
// par la RPC set_vrac_password.
export const generateVracPassword = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const length = 8;
    let password = '';
    const randomValues = new Uint32Array(length);
    crypto.getRandomValues(randomValues);

    for (let i = 0; i < length; i++) {
        password += chars[randomValues[i] % chars.length];
    }
    return password;
};
