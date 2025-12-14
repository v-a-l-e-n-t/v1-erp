import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, BarChart3, Calculator, Users, ClipboardList, Truck } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  const menuItems = [
    {
      title: 'Nouveau Bilan',
      description: 'Saisir un nouveau bilan journalier GPL',
      icon: FileText,
      path: '/new-bilan',
      color: 'text-blue-500',
    },
    {
      title: 'Dashboard & Historique',
      description: 'Consulter les statistiques et l\'historique des bilans',
      icon: BarChart3,
      path: '/dashboard',
      color: 'text-green-500',
    },
    {
      title: 'Calcul des Sphères',
      description: 'Calculer les masses des 3 sphères de stockage',
      icon: Calculator,
      path: '/sphere-calculation',
      color: 'text-purple-500',
    },
    {
      title: 'Saisie Production',
      description: 'Enregistrer les données de production par poste',
      icon: ClipboardList,
      path: '/production-entry',
      color: 'text-orange-500',
    },
    {
      title: 'Gestion Chefs de Ligne',
      description: 'Gérer les chefs de ligne et leurs affectations',
      icon: Users,
      path: '/chefs-ligne',
      color: 'text-pink-500',
    },
    {
      title: 'Import des Données',
      description: 'Import des ventes conditionnées par mandataire',
      icon: Truck,
      path: '/import_data',
      color: 'text-amber-500',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div>
            <h1 className="text-3xl font-bold text-primary">GazPILOT</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Système de pilotage d'un centre emplisseur
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">Accueil</h2>
          <p className="text-muted-foreground">
            Sélectionnez un module pour commencer
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.path}
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => navigate(item.path)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Icon className={`h-10 w-10 ${item.color} mb-2`} />
                  </div>
                  <CardTitle className="group-hover:text-primary transition-colors">
                    {item.title}
                  </CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Accéder
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
