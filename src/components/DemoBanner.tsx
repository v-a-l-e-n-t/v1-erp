import { useLocation, useNavigate } from 'react-router-dom';
import { FlaskConical, X } from 'lucide-react';
import { isDemo, exitDemo } from '@/lib/demoMode';

/**
 * Bandeau permanent affiché tant que le MODE DÉMO est actif.
 * Consomme useLocation() pour se réévaluer à chaque navigation (entrée/sortie
 * de démo passent toujours par une navigation).
 */
const DemoBanner = () => {
  useLocation(); // force la réévaluation à chaque changement de route
  const navigate = useNavigate();

  if (!isDemo()) return null;

  const quit = () => {
    exitDemo();
    navigate('/');
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-[100] bg-primary text-primary-foreground shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.3)]">
      <div className="container mx-auto px-4 h-11 flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 font-medium">
          <FlaskConical className="h-4 w-4" />
          <span className="hidden sm:inline">Mode démonstration — données fictives, aucune donnée réelle.</span>
          <span className="sm:hidden">Mode démo · données fictives</span>
        </span>
        <button
          onClick={quit}
          className="flex items-center gap-1.5 rounded-md bg-primary-foreground/15 hover:bg-primary-foreground/25 px-3 py-1 font-medium transition-colors"
        >
          Quitter la démo <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default DemoBanner;
