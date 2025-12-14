import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import DemoRequestDialog from '@/components/DemoRequestDialog';
import { 
  BarChart3, 
  Truck, 
  Calculator, 
  Users, 
  Shield, 
  Zap,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Database,
  MapPin
} from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();
  const [demoDialogOpen, setDemoDialogOpen] = useState(false);

  const features = [
    {
      icon: BarChart3,
      title: "Dashboard Temps Réel",
      description: "Suivez vos KPIs de production et ventes avec des tableaux de bord interactifs et des visualisations avancées."
    },
    {
      icon: Truck,
      title: "Gestion Mandataires",
      description: "Analysez les performances de vos mandataires, destinations et clients avec des rapports détaillés."
    },
    {
      icon: Calculator,
      title: "Calculs Automatisés",
      description: "Calculs précis des masses GPL dans vos sphères de stockage avec barémage intégré."
    },
    {
      icon: MapPin,
      title: "Cartographie Interactive",
      description: "Visualisez vos zones de livraison sur une carte interactive de la Côte d'Ivoire."
    },
    {
      icon: Database,
      title: "Historique Complet",
      description: "Accédez à l'historique détaillé de toutes vos opérations avec filtres avancés."
    },
    {
      icon: Users,
      title: "Gestion d'Équipe",
      description: "Suivez les performances de vos chefs de ligne et optimisez vos équipes de production."
    }
  ];

  const stats = [
    { value: "100K+", label: "Transactions traitées" },
    { value: "85+", label: "Destinations couvertes" },
    { value: "40+", label: "Mandataires actifs" },
    { value: "24/7", label: "Disponibilité" }
  ];

  const benefits = [
    "Import Excel automatisé",
    "Rapports exportables",
    "Analyse par période",
    "Suivi des objectifs",
    "Alertes intelligentes",
    "Support dédié"
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-primary">GazPILOT</span>
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            Connexion
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Zap className="h-4 w-4" />
            Plateforme de gestion GPL nouvelle génération
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Pilotez votre
            <span className="text-primary"> centre emplisseur </span>
            en toute simplicité
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            GazPILOT centralise la gestion de votre production GPL, le suivi des ventes par mandataire, 
            et l'analyse de vos performances en temps réel.
          </p>
          
          <Button size="lg" onClick={() => setDemoDialogOpen(true)} className="gap-2 text-lg px-8">
            Demander une démo
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-card border-y">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Une suite complète d'outils pour gérer efficacement votre activité GPL
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="group hover:shadow-lg hover:border-primary/50 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-card">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Optimisez chaque aspect de votre activité
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                GazPILOT vous offre une visibilité complète sur vos opérations, 
                de la production à la livraison finale.
              </p>
              
              <div className="grid sm:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
              
              <Button size="lg" onClick={() => navigate('/dashboard')} className="mt-8 gap-2">
                Explorer la plateforme
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-8">
                <div className="bg-card rounded-xl shadow-xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">Performance du mois</span>
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Tonnage produit</span>
                      <span className="font-bold text-foreground">2,450 T</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: '78%' }} />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Objectif atteint</span>
                      <span className="font-bold text-primary">78%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="bg-primary rounded-2xl p-8 md:p-12 text-center">
            <Shield className="h-12 w-12 text-primary-foreground mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Prêt à transformer votre gestion GPL ?
            </h2>
            <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              Rejoignez les centres emplisseurs qui font confiance à GazPILOT pour optimiser leurs opérations.
            </p>
            <Button 
              size="lg" 
              variant="secondary" 
              onClick={() => setDemoDialogOpen(true)} 
              className="gap-2 text-lg px-8"
            >
              Demander une démo
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t bg-card">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="font-bold text-primary text-lg">GazPILOT</span>
            <p className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} GAZPILOT - Tous droits réservés
            </p>
          </div>
        </div>
      </footer>

      <DemoRequestDialog open={demoDialogOpen} onOpenChange={setDemoDialogOpen} />
    </div>
  );
};

export default Landing;
