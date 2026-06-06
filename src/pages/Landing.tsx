import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Button } from '@/components/ui/button';
import DemoRequestDialog from '@/components/DemoRequestDialog';
import LoginDialog from '@/components/LoginDialog';
import {
  BarChart3, Truck, Calculator, Users, Shield, Zap, ArrowRight,
  CheckCircle2, TrendingUp, Database, MapPin, Ship, Factory,
  Gauge, ClipboardCheck, Menu, X,
} from 'lucide-react';
import '@/components/landing/landing.css';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const features = [
  { icon: BarChart3, title: 'Dashboard Temps Réel', description: "Suivez vos KPIs de production et ventes avec des tableaux de bord interactifs et des visualisations avancées." },
  { icon: Truck, title: 'Gestion Mandataires', description: "Analysez les performances de vos mandataires, destinations et clients avec des rapports détaillés." },
  { icon: Calculator, title: 'Calculs Automatisés', description: "Calculs précis des masses GPL dans vos sphères de stockage avec barémage intégré." },
  { icon: MapPin, title: 'Cartographie Interactive', description: "Visualisez vos zones de livraison sur une carte interactive de la Côte d'Ivoire." },
  { icon: Database, title: 'Historique Complet', description: "Accédez à l'historique détaillé de toutes vos opérations avec filtres avancés." },
  { icon: Users, title: "Gestion d'Équipe", description: "Suivez les performances de vos chefs de ligne et optimisez vos équipes de production." },
];

const stats = [
  { target: 100, suffix: 'K+', label: 'Transactions traitées' },
  { target: 85, suffix: '+', label: 'Destinations couvertes' },
  { target: 40, suffix: '+', label: 'Mandataires actifs' },
  { target: null as number | null, display: '24/7', label: 'Disponibilité' },
];

const workflow = [
  { icon: Ship, title: 'Réception', description: 'Réceptions navire & clients, barémage des sphères.' },
  { icon: Gauge, title: 'Stockage', description: 'Suivi temps réel des masses GPL en sphères.' },
  { icon: Factory, title: 'Production', description: 'Embouteillage par ligne, shifts et arrêts.' },
  { icon: Truck, title: 'Distribution', description: 'VRAC, mandataires, bons de transfert.' },
  { icon: ClipboardCheck, title: 'Bilan matière', description: 'Réconciliation automatique et écarts.' },
];

const benefits = [
  'Import Excel automatisé', 'Rapports exportables', 'Analyse par période',
  'Suivi des objectifs', 'Alertes intelligentes', 'Support dédié',
];

const clients = [
  { name: 'Petro Ivoire', logo: '/images/logo-petro.png' },
  { name: 'Vivo Energy', logo: '/images/logo-vivo.png' },
  { name: 'Total Energies', logo: '/images/logo-total.png' },
  { name: 'SIMAM', logo: '/images/logo-simam.png' },
];

const Landing = () => {
  const navigate = useNavigate();
  const root = useRef<HTMLDivElement>(null);
  const [demoDialogOpen, setDemoDialogOpen] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const scrollTo = (id: string) => {
    setMobileNavOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // ---- Header : descente douce au montage ----
      gsap.from('.lp-header', { y: -80, opacity: 0, duration: 0.7, ease: 'power3.out' });

      // ---- HERO : timeline séquencée ----
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.lp-hero-badge', { y: 24, opacity: 0, duration: 0.6 })
        .from('.lp-hero-word', { yPercent: 120, opacity: 0, duration: 0.9, stagger: 0.08 }, '-=0.2')
        .from('.lp-hero-sub', { y: 24, opacity: 0, duration: 0.7 }, '-=0.5')
        .from('.lp-hero-cta', { y: 20, opacity: 0, duration: 0.6, stagger: 0.12 }, '-=0.4')
        .from('.lp-hero-trust', { opacity: 0, duration: 0.6 }, '-=0.2')
        .from('.lp-hero-mockup', { y: 60, opacity: 0, scale: 0.96, duration: 1, ease: 'power3.out' }, '-=0.8')
        .from('.lp-float-card', { y: 30, opacity: 0, scale: 0.8, duration: 0.6, stagger: 0.15 }, '-=0.5');

      // Flottement continu des cartes KPI
      gsap.to('.lp-float-card', {
        y: '+=12', duration: 2.4, ease: 'sine.inOut',
        repeat: -1, yoyo: true, stagger: { each: 0.4, from: 'random' },
      });

      // Parallax des blobs du hero (lié au scroll)
      gsap.to('.lp-blob-1', {
        yPercent: 30, ease: 'none',
        scrollTrigger: { trigger: '.lp-hero', start: 'top top', end: 'bottom top', scrub: 1 },
      });
      gsap.to('.lp-blob-2', {
        yPercent: -20, ease: 'none',
        scrollTrigger: { trigger: '.lp-hero', start: 'top top', end: 'bottom top', scrub: 1 },
      });
      gsap.to('.lp-hero-mockup', {
        yPercent: 12, ease: 'none',
        scrollTrigger: { trigger: '.lp-hero', start: 'top top', end: 'bottom top', scrub: 1 },
      });

      // ---- Reveal générique au scroll (batch staggered) ----
      gsap.set('.lp-reveal', { y: 40, opacity: 0 });
      ScrollTrigger.batch('.lp-reveal', {
        start: 'top 85%',
        onEnter: (els) => gsap.to(els, {
          y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', stagger: 0.12, overwrite: true,
        }),
      });

      // ---- Count-up des statistiques ----
      const counters = gsap.utils.toArray<HTMLElement>('[data-countup]');
      counters.forEach((el) => {
        const target = Number(el.dataset.target || '0');
        const suffix = el.dataset.suffix || '';
        const obj = { val: 0 };
        ScrollTrigger.create({
          trigger: el,
          start: 'top 90%',
          once: true,
          onEnter: () => {
            gsap.to(obj, {
              val: target, duration: 1.6, ease: 'power2.out',
              onUpdate: () => { el.textContent = Math.round(obj.val).toString() + suffix; },
            });
          },
        });
      });

      // ---- Ligne du workflow : tracé au scroll ----
      gsap.from('.lp-flow-line', {
        scaleX: 0, ease: 'none',
        scrollTrigger: { trigger: '.lp-workflow', start: 'top 70%', end: 'bottom 70%', scrub: 1 },
      });

      // ---- Barre de progression du mockup bénéfices ----
      gsap.from('.lp-progress-fill', {
        scaleX: 0, duration: 1.2, ease: 'power2.out',
        scrollTrigger: { trigger: '.lp-progress-fill', start: 'top 85%', once: true },
      });

      // ---- CTA final : léger zoom à l'entrée ----
      gsap.from('.lp-cta-band', {
        scale: 0.95, opacity: 0, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: '.lp-cta-band', start: 'top 85%', once: true },
      });
    });
  }, { scope: root });

  return (
    <div ref={root} className="min-h-screen bg-background overflow-x-hidden">
      {/* ===================== HEADER ===================== */}
      <header className="lp-header fixed top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => scrollTo('lp-top')} className="flex items-center gap-2">
            <img src="/images/gp-logo.jpeg" alt="GazPILOTE" className="h-10 w-auto rounded-md" />
            <span className="text-xl font-bold text-primary">GazPILOTE</span>
          </button>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
            <button onClick={() => scrollTo('features')} className="hover:text-foreground transition-colors">Fonctionnalités</button>
            <button onClick={() => scrollTo('workflow')} className="hover:text-foreground transition-colors">Workflow</button>
            <button onClick={() => scrollTo('benefits')} className="hover:text-foreground transition-colors">Avantages</button>
            <button onClick={() => scrollTo('contact')} className="hover:text-foreground transition-colors">Contact</button>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" onClick={() => setLoginDialogOpen(true)}>Connexion</Button>
            <Button onClick={() => setDemoDialogOpen(true)} className="gap-1.5">
              Démo <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <button className="md:hidden p-2 text-foreground" onClick={() => setMobileNavOpen((o) => !o)} aria-label="Menu">
            {mobileNavOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileNavOpen && (
          <div className="md:hidden border-t border-border/60 bg-background/95 backdrop-blur-xl px-4 py-4 flex flex-col gap-3">
            <button onClick={() => scrollTo('features')} className="text-left py-1.5 text-sm font-medium">Fonctionnalités</button>
            <button onClick={() => scrollTo('workflow')} className="text-left py-1.5 text-sm font-medium">Workflow</button>
            <button onClick={() => scrollTo('benefits')} className="text-left py-1.5 text-sm font-medium">Avantages</button>
            <button onClick={() => scrollTo('contact')} className="text-left py-1.5 text-sm font-medium">Contact</button>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setMobileNavOpen(false); setLoginDialogOpen(true); }}>Connexion</Button>
              <Button className="flex-1" onClick={() => { setMobileNavOpen(false); setDemoDialogOpen(true); }}>Démo</Button>
            </div>
          </div>
        )}
      </header>

      {/* ===================== HERO ===================== */}
      <section id="lp-top" className="lp-hero relative isolate pt-28 sm:pt-36 pb-20 sm:pb-28 px-4 text-white overflow-hidden">
        <div className="lp-grid-overlay absolute inset-0 -z-10" />
        <div className="lp-blob lp-blob-1 -z-10 w-[34rem] h-[34rem] -top-32 -left-24" style={{ background: 'hsl(28 90% 55% / 0.35)' }} />
        <div className="lp-blob lp-blob-2 -z-10 w-[28rem] h-[28rem] top-20 -right-24" style={{ background: 'hsl(210 80% 50% / 0.25)' }} />

        <div className="container mx-auto max-w-6xl">
          <div className="text-center max-w-3xl mx-auto">
            <div className="lp-hero-badge inline-flex items-center gap-2 bg-white/10 border border-white/15 text-orange-200 px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium mb-6">
              <Zap className="h-4 w-4" />
              ERP nouvelle génération pour dépôts GPL
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.08] mb-6 tracking-tight">
              <span className="block overflow-hidden">
                <span className="lp-hero-word inline-block">Pilotez</span>{' '}
                <span className="lp-hero-word inline-block">votre</span>{' '}
                <span className="lp-hero-word inline-block">dépôt</span>{' '}
                <span className="lp-hero-word inline-block lp-gradient-text">GAZ</span>
              </span>
              <span className="block overflow-hidden">
                <span className="lp-hero-word inline-block">&</span>{' '}
                <span className="lp-hero-word inline-block lp-gradient-text">centre</span>{' '}
                <span className="lp-hero-word inline-block lp-gradient-text">emplisseur</span>
              </span>
              <span className="block overflow-hidden">
                <span className="lp-hero-word inline-block">en</span>{' '}
                <span className="lp-hero-word inline-block">toute</span>{' '}
                <span className="lp-hero-word inline-block">simplicité</span>
              </span>
            </h1>

            <p className="lp-hero-sub text-base sm:text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
              GazPILOTE centralise la production, le suivi des ventes, le bilan matière
              et l'analyse de vos performances — en temps réel, sur un seul écran.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" onClick={() => setDemoDialogOpen(true)} className="lp-hero-cta gap-2 text-base px-7 shadow-lg shadow-primary/30">
                Demander une démo <ArrowRight className="h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => setLoginDialogOpen(true)}
                className="lp-hero-cta gap-2 text-base px-7 bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white">
                Se connecter
              </Button>
            </div>

            <p className="lp-hero-trust mt-6 text-xs text-slate-400 flex items-center justify-center gap-2">
              <Shield className="h-3.5 w-3.5 text-success" />
              Données hébergées & sécurisées · Multi-sites (Abidjan · Bouaké)
            </p>
          </div>

          {/* Mockup dashboard */}
          <div className="lp-hero-mockup relative mt-16 max-w-4xl mx-auto">
            <div className="lp-glass rounded-2xl p-3 sm:p-4">
              <div className="flex items-center gap-1.5 px-2 pb-3">
                <span className="h-3 w-3 rounded-full bg-red-400/80" />
                <span className="h-3 w-3 rounded-full bg-amber-400/80" />
                <span className="h-3 w-3 rounded-full bg-green-400/80" />
                <span className="ml-3 text-xs text-slate-400">GazPILOTE · Tableau de bord production</span>
              </div>
              <div className="rounded-xl bg-slate-900/60 p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { l: 'Tonnage', v: '2 450 T', c: 'text-orange-400' },
                  { l: 'Réceptions', v: '20', c: 'text-blue-400' },
                  { l: 'Disponibilité', v: '94 %', c: 'text-green-400' },
                  { l: 'Bilan', v: '+0,3 %', c: 'text-emerald-400' },
                ].map((k) => (
                  <div key={k.l} className="rounded-lg bg-white/5 border border-white/10 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">{k.l}</p>
                    <p className={`text-lg sm:text-xl font-bold ${k.c}`}>{k.v}</p>
                  </div>
                ))}
                <div className="col-span-2 sm:col-span-4 rounded-lg bg-white/5 border border-white/10 p-4">
                  <div className="flex items-end justify-between h-24 sm:h-28 gap-1.5">
                    {[42, 65, 53, 78, 61, 88, 70, 95, 82, 74, 90, 68].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-primary/40 to-primary"
                        style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Cartes KPI flottantes */}
            <div className="lp-float-card hidden sm:flex absolute -left-6 top-1/3 items-center gap-3 rounded-xl px-4 py-3">
              <div className="h-9 w-9 rounded-lg bg-success/15 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Objectif</p>
                <p className="text-sm font-bold text-foreground">78 % atteint</p>
              </div>
            </div>
            <div className="lp-float-card hidden sm:flex absolute -right-6 bottom-10 items-center gap-3 rounded-xl px-4 py-3">
              <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center">
                <Gauge className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Sphères</p>
                <p className="text-sm font-bold text-foreground">25 074 T</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== LOGOS CLIENTS ===================== */}
      <section className="py-10 sm:py-12 border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <p className="lp-reveal text-center text-xs uppercase tracking-widest text-muted-foreground mb-7">
            La confiance des acteurs majeurs du GPL en Côte d'Ivoire
          </p>
          <div className="lp-marquee overflow-hidden">
            <div className="lp-marquee-track gap-12 sm:gap-16 items-center">
              {[...clients, ...clients, ...clients].map((c, i) => (
                <img key={i} src={c.logo} alt={c.name}
                  className="h-9 sm:h-11 w-auto object-contain opacity-70 grayscale hover:grayscale-0 hover:opacity-100 transition" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===================== STATS ===================== */}
      <section className="py-14 sm:py-20 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {stats.map((s, i) => (
              <div key={i} className="lp-reveal text-center">
                {s.target !== null ? (
                  <div className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-primary mb-1"
                    data-countup data-target={s.target} data-suffix={s.suffix}>
                    0{s.suffix}
                  </div>
                ) : (
                  <div className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-primary mb-1">{s.display}</div>
                )}
                <div className="text-xs sm:text-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== FEATURES ===================== */}
      <section id="features" className="scroll-mt-20 py-16 sm:py-24 px-4 bg-card border-y border-border">
        <div className="container mx-auto">
          <div className="text-center mb-12 sm:mb-16 max-w-2xl mx-auto">
            <span className="lp-reveal inline-block text-sm font-semibold text-primary uppercase tracking-wider mb-3">Fonctionnalités</span>
            <h2 className="lp-reveal text-3xl sm:text-4xl font-bold text-foreground mb-4">Tout ce dont vous avez besoin</h2>
            <p className="lp-reveal text-base sm:text-lg text-muted-foreground">
              Une suite complète d'outils pour gérer efficacement votre activité GPL, de bout en bout.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title}
                  className="lp-reveal group rounded-2xl border border-border bg-background p-6 hover:border-primary/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all">
                    <Icon className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================== WORKFLOW ===================== */}
      <section id="workflow" className="lp-workflow scroll-mt-20 py-16 sm:py-24 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12 sm:mb-16 max-w-2xl mx-auto">
            <span className="lp-reveal inline-block text-sm font-semibold text-primary uppercase tracking-wider mb-3">Workflow</span>
            <h2 className="lp-reveal text-3xl sm:text-4xl font-bold text-foreground mb-4">Tout le cycle GPL, sous contrôle</h2>
            <p className="lp-reveal text-base sm:text-lg text-muted-foreground">
              De la réception navire au bilan matière, chaque étape est suivie et réconciliée automatiquement.
            </p>
          </div>

          <div className="relative">
            {/* Ligne de connexion (desktop) */}
            <div className="hidden lg:block absolute top-8 left-[10%] right-[10%] h-0.5 bg-border">
              <div className="lp-flow-line h-full bg-primary" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {workflow.map((w, i) => {
                const Icon = w.icon;
                return (
                  <div key={w.title} className="lp-reveal relative text-center">
                    <div className="relative z-10 mx-auto h-16 w-16 rounded-2xl bg-card border-2 border-primary/30 flex items-center justify-center mb-4 shadow-sm">
                      <Icon className="h-7 w-7 text-primary" />
                      <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">{w.title}</h3>
                    <p className="text-sm text-muted-foreground px-2">{w.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ===================== BENEFITS ===================== */}
      <section id="benefits" className="scroll-mt-20 py-16 sm:py-24 px-4 bg-card border-y border-border">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <span className="lp-reveal inline-block text-sm font-semibold text-primary uppercase tracking-wider mb-3">Avantages</span>
              <h2 className="lp-reveal text-3xl sm:text-4xl font-bold text-foreground mb-5">
                Optimisez chaque aspect de votre activité
              </h2>
              <p className="lp-reveal text-base sm:text-lg text-muted-foreground mb-8">
                GazPILOTE vous offre une visibilité complète sur vos opérations,
                de la production à la livraison finale.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                {benefits.map((b) => (
                  <div key={b} className="lp-reveal flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-sm sm:text-base text-foreground">{b}</span>
                  </div>
                ))}
              </div>

              <Button size="lg" onClick={() => navigate('/dashboard')} className="lp-reveal gap-2 w-full sm:w-auto">
                Explorer la plateforme <ArrowRight className="h-5 w-5" />
              </Button>
            </div>

            <div className="lp-reveal relative">
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl p-6 sm:p-8">
                <div className="bg-background rounded-2xl shadow-xl p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">Performance du mois</span>
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Tonnage produit</span>
                      <span className="font-bold text-foreground">2 450 T</span>
                    </div>
                    <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                      <div className="lp-progress-fill h-full bg-primary rounded-full" style={{ width: '78%' }} />
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Objectif atteint</span>
                      <span className="font-bold text-primary">78 %</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    {[
                      { l: 'Sphères', v: '25 074 T' },
                      { l: 'VRAC', v: '11 852 T' },
                      { l: 'Écart', v: '+0,3 %' },
                    ].map((k) => (
                      <div key={k.l} className="rounded-lg bg-secondary/60 p-3 text-center">
                        <p className="text-[10px] uppercase text-muted-foreground">{k.l}</p>
                        <p className="text-sm font-bold text-foreground">{k.v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== CTA ===================== */}
      <section id="contact" className="scroll-mt-20 py-16 sm:py-24 px-4">
        <div className="container mx-auto">
          <div className="lp-cta-band relative overflow-hidden rounded-3xl bg-primary px-6 py-12 sm:px-12 sm:py-16 text-center">
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
            <div className="relative">
              <Shield className="h-12 w-12 text-primary-foreground mx-auto mb-6" />
              <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-4">
                Prêt à transformer votre gestion GPL ?
              </h2>
              <p className="text-base sm:text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
                Rejoignez les centres emplisseurs qui font confiance à GazPILOTE pour optimiser leurs opérations.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button size="lg" variant="secondary" onClick={() => setDemoDialogOpen(true)} className="gap-2 text-base px-8">
                  Demander une démo <ArrowRight className="h-5 w-5" />
                </Button>
                <Button size="lg" onClick={() => setLoginDialogOpen(true)}
                  className="gap-2 text-base px-8 bg-primary-foreground/10 text-primary-foreground border border-primary-foreground/30 hover:bg-primary-foreground/20">
                  Se connecter
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="py-10 px-4 border-t border-border bg-card">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/images/gp-logo.jpeg" alt="GazPILOTE" className="h-8 w-auto rounded" />
            <span className="font-bold text-primary text-lg">GazPILOTE</span>
          </div>
          <p className="text-muted-foreground text-sm text-center">
            © {new Date().getFullYear()} GAZPILOT — Tous droits réservés
          </p>
        </div>
      </footer>

      <DemoRequestDialog open={demoDialogOpen} onOpenChange={setDemoDialogOpen} />
      <LoginDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />
    </div>
  );
};

export default Landing;
