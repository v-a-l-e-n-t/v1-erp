import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute = () => {
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            // 1. Check Supabase session
            const { data: { session } } = await supabase.auth.getSession();

            // 2. Check Local Storage (LoginDialog)
            const localAuth = localStorage.getItem("isAuthenticated") === "true";

            // 3. Check Session Storage (PasswordGate)
            const sessionAuth = sessionStorage.getItem("dashboard_authenticated") === "true";

            setIsAuthorized(!!session || localAuth || sessionAuth);
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            const localAuth = localStorage.getItem("isAuthenticated") === "true";
            const sessionAuth = sessionStorage.getItem("dashboard_authenticated") === "true";
            setIsAuthorized(!!session || localAuth || sessionAuth);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (isAuthorized === null) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};
