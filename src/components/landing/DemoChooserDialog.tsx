import { useNavigate } from 'react-router-dom';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BarChart3, ArrowRight, ShieldCheck, MessageSquare } from 'lucide-react';
import { enterDemo } from '@/lib/demoMode';

interface DemoChooserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ouvre le formulaire de contact (lead). */
  onContact: () => void;
}

const DemoChooserDialog = ({ open, onOpenChange, onContact }: DemoChooserDialogProps) => {
  const navigate = useNavigate();

  const launchDashboard = () => {
    enterDemo();
    onOpenChange(false);
    navigate('/dashboard');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Découvrir GazPILOTE en démo</DialogTitle>
          <DialogDescription>
            Explorez l'interface réelle, alimentée par des données fictives.
          </DialogDescription>
        </DialogHeader>

        {/* Carte principale : Tableau de bord */}
        <button
          onClick={launchDashboard}
          className="group w-full text-left rounded-xl border border-border bg-card hover:border-primary/60 hover:shadow-lg transition-all p-5 flex items-start gap-4 mt-2"
        >
          <span className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary transition-colors">
            <BarChart3 className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
          </span>
          <span className="flex-1">
            <span className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Tableau de bord</span>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </span>
            <span className="block text-sm text-muted-foreground mt-1">
              KPIs, production, ventes, bilan matière et cartographie — en conditions réelles.
            </span>
          </span>
        </button>

        {/* Garantie confidentialité */}
        <p className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <ShieldCheck className="h-4 w-4 text-success flex-shrink-0" />
          Aucune donnée réelle n'est exposée — la démo utilise des données générées.
        </p>

        {/* Contact secondaire */}
        <div className="border-t border-border pt-4 mt-2 flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">Vous préférez être recontacté ?</span>
          <Button variant="outline" size="sm" onClick={onContact} className="gap-2">
            <MessageSquare className="h-4 w-4" /> Demander une démo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DemoChooserDialog;
