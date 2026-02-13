import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  BarChart3,
  Calculator,
  Users,
  ClipboardList,
  Truck,
  History,
  Settings,
  LayoutDashboard,
  Shield,
  UserCircle,
  ClipboardCheck,
  TrendingUp,
} from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  const sections = [
    {
      title: "Distribution",
      description: "Gestion des bilans et statistiques GPL",
      items: [
        {
          title: 'Nouveau Bilan',
          description: 'Saisir un nouveau bilan journalier',
          icon: FileText,
          path: '/new-bilan',
          color: 'text-blue-500',
        },
        {
          title: 'Dashboard & Historique',
          description: 'Statistiques et historique des bilans',
          icon: BarChart3,
          path: '/dashboard',
          color: 'text-green-500',
        },
        {
          title: 'Import Données',
          description: 'Import des ventes par mandataire',
          icon: Truck,
          path: '/import_data',
          color: 'text-amber-500',
        },
      ]
    },
    {
      title: "Production",
      description: "Suivi de la production et des stocks",
      items: [
        {
          title: 'Calcul Sphères',
          description: 'Calcul des masses (3 sphères)',
          icon: Calculator,
          path: '/sphere-calculation',
          color: 'text-purple-500',
        },
        {
          title: 'Historique Sphères',
          description: 'Historique des calculs de masse',
          icon: History,
          path: '/sphere-history',
          color: 'text-purple-400',
        },
        {
          title: 'Saisie Production',
          description: 'Données de production par poste',
          icon: ClipboardList,
          path: '/production-entry',
          color: 'text-orange-500',
        },
        {
          title: 'Gestion Agents',
          description: 'Gérer les équipes (Ligne, Quart, Exploitation)',
          icon: Users,
          path: '/agents',
          color: 'text-pink-500',
        },
      ]
    },
    {
      title: "VRAC",
      description: "Gestion des chargements VRAC",
      items: [
        {
          title: 'Espace Client',
          description: 'Portail de demande de chargement',
          icon: UserCircle,
          path: '/vrac',
          color: 'text-emerald-600',
        },
        {
          title: 'Dashboard Admin',
          description: 'Suivi des chargements en temps réel',
          icon: LayoutDashboard,
          path: '/vrac-chargements',
          color: 'text-blue-600',
        },
        {
          title: 'Administration',
          description: 'Configuration générale VRAC',
          icon: Shield,
          path: '/vrac-admin',
          color: 'text-slate-600',
        },
      ]
    },
    {
      title: "Inspection",
      description: "Ronde hebdomadaire d'état des installations",
      items: [
        {
          title: 'Tableau de Bord',
          description: 'État de la ronde en cours et KPIs',
          icon: ClipboardCheck,
          path: '/inspection',
          color: 'text-teal-500',
        },
        {
          title: 'Historique',
          description: 'Historique et tendances des inspections',
          icon: TrendingUp,
          path: '/inspection/historique',
          color: 'text-teal-400',
        },
        {
          title: 'Configuration',
          description: 'Gérer les zones, équipements et destinataires',
          icon: Settings,
          path: '/inspection/configuration',
          color: 'text-slate-500',
        },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50/50">
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              GazPILOT
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Centre de contrôle unifié
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6 sm:space-y-8 md:space-y-10">
        {sections.map((section) => (
          <div key={section.title} className="space-y-3 sm:space-y-4">
            <div className="border-b pb-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">{section.title}</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">{section.description}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Card
                    key={item.path}
                    className="hover:shadow-md transition-all duration-200 cursor-pointer group border-slate-200 hover:border-blue-200 bg-white"
                    onClick={() => navigate(item.path)}
                  >
                    <CardHeader className="p-3 sm:p-4">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2">
                        <div className={`p-1.5 sm:p-2 rounded-lg bg-slate-50 group-hover:bg-white transition-colors border border-slate-100 flex-shrink-0`}>
                          <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${item.color}`} />
                        </div>
                        <CardTitle className="text-sm sm:text-base font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">
                          {item.title}
                        </CardTitle>
                      </div>
                      <CardDescription className="text-xs line-clamp-2">
                        {item.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
