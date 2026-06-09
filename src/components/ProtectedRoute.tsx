import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthGuard, type AuthRole } from '@/hooks/useAuthGuard';
import { isRouteAllowed, homeRoute } from '@/lib/routeAccess';

interface Props {
    /** 'admin' (default) ou 'vrac'. */
    role?: AuthRole;
    /** Route de redirection si non autorise. Defaut : "/" pour admin, "/vrac-login" pour vrac. */
    redirectTo?: string;
}

export const ProtectedRoute = ({ role = 'admin', redirectTo }: Props) => {
    const { isAuthorized } = useAuthGuard(role);
    const location = useLocation();
    const fallback = redirectTo ?? (role === 'vrac' ? '/vrac-login' : '/');

    if (isAuthorized === null) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <Navigate to={fallback} replace />;
    }

    // Utilisateur cloisonné (allowed_routes) : redirige vers sa route d'accueil
    // s'il tente d'accéder à une route non autorisée.
    if (role === 'admin' && !isRouteAllowed(location.pathname)) {
        return <Navigate to={homeRoute()} replace />;
    }

    return <Outlet />;
};

/** Sucre syntaxique : <VracProtectedRoute /> equivalent a <ProtectedRoute role="vrac" />. */
export const VracProtectedRoute = (props: Omit<Props, 'role'>) => (
    <ProtectedRoute role="vrac" {...props} />
);
