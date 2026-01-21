import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Compass } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Subtle background gradient */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/[0.03] rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-6 h-16 flex items-center">
          <span className="text-xl font-bold text-primary">GazPILOT</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 pt-16">
        <div className="text-center max-w-xl mx-auto">
          {/* 404 Number */}
          <div className="relative mb-6">
            <span className="text-[180px] sm:text-[220px] font-black text-primary/[0.07] leading-none select-none tracking-tighter">
              404
            </span>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-primary/10 flex items-center justify-center">
                <Compass className="h-12 w-12 sm:h-16 sm:w-16 text-primary" />
              </div>
            </div>
          </div>

          {/* Message */}
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3">
            Page introuvable
          </h1>
          <p className="text-muted-foreground mb-2">
            La page que vous recherchez n'existe pas ou a été déplacée.
          </p>
          <p className="text-sm text-muted-foreground/70 mb-10">
            <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">{location.pathname}</code>
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={() => navigate("/")}
              className="gap-2 min-w-[180px]"
            >
              <Home className="h-4 w-4" />
              Accueil
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => navigate(-1)}
              className="gap-2 min-w-[180px] text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <span className="text-xs text-muted-foreground/50">GazPILOT ERP</span>
      </footer>
    </div>
  );
};

export default NotFound;
