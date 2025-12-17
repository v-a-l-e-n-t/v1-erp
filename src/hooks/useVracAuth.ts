import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VracSession, VracUser, VracClient } from '@/types/vrac';

const VRAC_SESSION_KEY = 'vrac_session';

// Simple hash function for password comparison
// Note: In production, use bcrypt or similar on the server side
const simpleHash = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const useVracAuth = () => {
    const [session, setSession] = useState<VracSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load session from localStorage on mount
    useEffect(() => {
        const savedSession = localStorage.getItem(VRAC_SESSION_KEY);
        if (savedSession) {
            try {
                const parsed = JSON.parse(savedSession) as VracSession;
                setSession(parsed);
            } catch (e) {
                localStorage.removeItem(VRAC_SESSION_KEY);
            }
        }
        setLoading(false);
    }, []);

    const login = useCallback(async (password: string): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            const passwordHash = await simpleHash(password);

            // Find user by password hash
            const { data: users, error: fetchError } = await supabase
                .from('vrac_users')
                .select('id, nom, client_id, actif, vrac_clients(id, nom, nom_affichage)')
                .eq('password_hash', passwordHash)
                .eq('actif', true)
                .limit(1) as { data: (VracUser & { vrac_clients: VracClient })[] | null; error: unknown };

            if (fetchError) {
                console.error('Login error:', fetchError);
                setError('Erreur de connexion. Veuillez réessayer.');
                setLoading(false);
                return false;
            }

            if (!users || users.length === 0) {
                setError('Mot de passe incorrect');
                setLoading(false);
                return false;
            }

            const user = users[0] as VracUser & { vrac_clients: VracClient };

            if (!user.vrac_clients) {
                setError('Configuration client invalide');
                setLoading(false);
                return false;
            }

            // Update last_login
            await supabase
                .from('vrac_users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', user.id);

            // Create session
            const newSession: VracSession = {
                user_id: user.id,
                client_id: user.client_id,
                client_nom: user.vrac_clients.nom,
                client_nom_affichage: user.vrac_clients.nom_affichage,
                user_nom: user.nom,
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
    };
};

// Utility function to generate a secure random password
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

// Hash password for storage
export const hashPassword = simpleHash;
