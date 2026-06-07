import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Button } from '@/components/ui/button';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import DemoRequestDialog from '@/components/DemoRequestDialog';
import LoginDialog from '@/components/LoginDialog';
import {
  ArrowRight, BarChart3, ClipboardCheck, Truck, Ship, Factory,
  Gauge as GaugeIcon, Menu, X, Activity, Building2, ShieldCheck,
} from 'lucide-react';
import '@/components/landing/landing.css';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const modules = [
  { id: '01', icon: Factory, title: 'Production', body: 'Lignes de production et de traitement, équipes, postes, arrêts et cadences suivis en continu.', unit: 'par ligne' },
  { id: '02', icon: GaugeIcon, title: 'Stockage', body: 'Bacs, réservoirs, capacités : niveaux, masses et mouvements calculés au plus juste.', unit: 'toutes capacités' },
  { id: '03', icon: Ship, title: 'Réceptions', body: 'Réceptions navire, camion ou pipeline, avec contrôles avant et après transfert.', unit: 'multi-sources' },
  { id: '04', icon: Truck, title: 'Expéditions', body: 'Chargements vrac et conditionné, bons de transfert, clients et transporteurs.', unit: 'vrac & cond.' },
  { id: '05', icon: ClipboardCheck, title: 'Bilan matière', body: 'Réconciliation automatique des entrées et sorties, écarts expliqués, par site.', unit: 'temps réel' },
  { id: '06', icon: BarChart3, title: 'Pilotage & analyse', body: 'Tableaux de bord en direct, objectifs, historiques et exports PDF / Excel.', unit: 'live' },
];

const flow = [
  { icon: Ship, label: 'Réception' },
  { icon: GaugeIcon, label: 'Stockage' },
  { icon: Factory, label: 'Production' },
  { icon: Truck, label: 'Expédition' },
  { icon: ClipboardCheck, label: 'Bilan' },
];

const capabilities = [
  { icon: Activity, title: 'Temps réel', sub: 'Données mises à jour en continu' },
  { icon: Building2, title: 'Multi-sites', sub: 'Pilotage centralisé' },
  { icon: ClipboardCheck, title: 'Bilan matière', sub: 'Réconciliation automatique' },
  { icon: ShieldCheck, title: 'Traçable', sub: 'Historique & audit complet' },
];

const benefits = [
  'Import Excel automatisé', 'Exports PDF / Excel', 'Analyse jour / mois / période',
  'Suivi des objectifs', 'Multi-sites & multi-équipes', 'Historique & audit complet',
];

const logs = [
  { who: 'Chef de quart', msg: 'Je saisis le poste directement sur la ligne. On voit enfin où le temps se perd, étape par étape.' },
  { who: "Responsable d'exploitation", msg: 'Plusieurs classeurs Excel remplacés par un seul écran. Le bilan matière tombe en quelques minutes.' },
  { who: 'Responsable distribution', msg: 'Chargements et bons de transfert tracés au même endroit. Plus aucun document perdu.' },
];

const faqs = [
  { q: 'Est-ce adapté à mon type d’installation ?', a: "Oui. GazPILOTE s'adapte à votre activité (GPL, GNL, hydrocarbures, gaz industriels…) et à vos capacités de stockage — bacs, réservoirs, cigares — comme à vos lignes de production." },
  { q: 'Les données sont-elles sécurisées ?', a: 'Infrastructure cloud sécurisée, authentification, journalisation des accès et sauvegardes. Chaque modification sensible est tracée.' },
  { q: 'Plusieurs sites sont-ils gérés ?', a: 'Oui — pilotage centralisé de plusieurs sites ou centres, avec des bilans et historiques distincts, depuis une seule interface.' },
  { q: 'Puis-je importer mes fichiers Excel ?', a: "L'import Excel est automatisé : jaugeage des capacités, mouvements de stock, ventes et bons de transfert. Vos historiques ne sont pas perdus." },
  { q: 'Est-ce utilisable depuis le terrain ?', a: 'Interface responsive : saisie des postes, arrêts, réceptions et inspections depuis un mobile ou une tablette sur site.' },
  { q: 'Comment se passe le déploiement ?', a: 'Nous configurons vos lignes, produits, capacités de stockage et partenaires, importons vos données, puis formons vos équipes.' },
];

const tickerItems: [string, string][] = [
  ['PRODUCTION', 'SUIVIE'], ['STOCKAGE', 'TEMPS RÉEL'], ['RÉCEPTIONS', 'TRACÉES'],
  ['EXPÉDITIONS', 'VRAC & COND.'], ['BILAN MATIÈRE', 'AUTO'], ['MULTI-SITES', '✓'],
  ['CONFORMITÉ', 'HSE'], ['HISTORIQUE', 'COMPLET'],
];

const Landing = () => {
  const navigate = useNavigate();
  const root = useRef<HTMLDivElement>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const scrollTo = (id: string) => {
    setMobileNav(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.lp-boot', { opacity: 0, duration: 0.4, stagger: 0.06 })
        .from('.lp-hero-line', { yPercent: 115, duration: 0.85, stagger: 0.1 }, '-=0.1')
        .from('.lp-hero-sub', { y: 16, opacity: 0, duration: 0.55 }, '-=0.45')
        .from('.lp-hero-cta', { y: 14, opacity: 0, duration: 0.5, stagger: 0.1 }, '-=0.35')
        .from('.lp-instrument', { opacity: 0, y: 30, duration: 0.7 }, '-=0.8');

      const angleFor = (pct: number) => -90 + (pct / 100) * 180;
      gsap.fromTo('.lp-needle-g', { rotation: -90 },
        { rotation: angleFor(94), svgOrigin: '120 130', duration: 1.6, ease: 'power3.out', delay: 0.5 });

      const arc = root.current?.querySelector('.lp-gauge-fill') as SVGPathElement | null;
      if (arc) {
        const len = arc.getTotalLength();
        gsap.set(arc, { strokeDasharray: len, strokeDashoffset: len });
        gsap.to(arc, { strokeDashoffset: len * (1 - 0.94), duration: 1.6, ease: 'power3.out', delay: 0.5 });
      }

      gsap.from('.lp-flow-progress', {
        scaleX: 0, ease: 'none',
        scrollTrigger: { trigger: '.lp-pid', start: 'top 70%', end: 'bottom 75%', scrub: 1 },
      });

      gsap.to('.lp-hero-grid', {
        yPercent: 18, ease: 'none',
        scrollTrigger: { trigger: '.lp-hero', start: 'top top', end: 'bottom top', scrub: 1 },
      });
      gsap.to('.lp-glow', {
        yPercent: 30, ease: 'none',
        scrollTrigger: { trigger: '.lp-hero', start: 'top top', end: 'bottom top', scrub: 1 },
      });

      gsap.set('.lp-reveal', { y: 32, opacity: 0 });
      ScrollTrigger.batch('.lp-reveal', {
        start: 'top 88%',
        onEnter: (els) => gsap.to(els, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.08, overwrite: true }),
      });

      const gv = root.current?.querySelector('[data-gauge-val]') as HTMLElement | null;
      if (gv) {
        const o = { v: 0 };
        gsap.to(o, { v: 94, duration: 1.6, ease: 'power3.out', delay: 0.5, onUpdate: () => { gv.textContent = Math.round(o.v).toString(); } });
      }
    });
  }, { scope: root });

  return (
    <div ref={root} className="lp min-h-screen relative overflow-x-hidden">
      {/* ===================== HEADER ===================== */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[hsl(220_16%_6%)]/85 backdrop-blur-md border-b border-[hsl(210_30%_100%/0.08)]">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => scrollTo('lp-top')} className="flex items-center gap-2.5">
            <img src="/images/gp-logo.jpeg" alt="GazPILOTE" className="h-9 w-auto rounded" />
            <span className="lp-display text-xl tracking-tight">GazPILOTE</span>
          </button>

          <nav className="hidden md:flex items-center gap-8 text-sm text-[hsl(215_12%_56%)]">
            {[['Modules', 'modules'], ['Cycle', 'cycle'], ['Terrain', 'logs'], ['FAQ', 'faq']].map(([l, id]) => (
              <button key={id} onClick={() => scrollTo(id)} className="lp-navlink hover:text-[hsl(40_16%_92%)] transition-colors">{l}</button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" onClick={() => setLoginOpen(true)} className="text-[hsl(40_16%_92%)] hover:bg-white/10 hover:text-white h-9">Connexion</Button>
            <Button onClick={() => setDemoOpen(true)} className="h-9 gap-1.5 bg-[hsl(28_92%_56%)] text-[hsl(220_16%_6%)] font-semibold hover:bg-[hsl(28_92%_50%)]">
              Démo <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileNav((o) => !o)} aria-label="Menu">
            {mobileNav ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {mobileNav && (
          <div className="md:hidden border-t border-[hsl(210_30%_100%/0.08)] bg-[hsl(220_16%_6%)] px-5 py-4 flex flex-col gap-3">
            {[['Modules', 'modules'], ['Cycle', 'cycle'], ['Terrain', 'logs'], ['FAQ', 'faq']].map(([l, id]) => (
              <button key={id} onClick={() => scrollTo(id)} className="text-left py-1.5 text-sm">{l}</button>
            ))}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 bg-transparent border-white/20 hover:bg-white/10" onClick={() => { setMobileNav(false); setLoginOpen(true); }}>Connexion</Button>
              <Button className="flex-1 bg-[hsl(28_92%_56%)] text-[hsl(220_16%_6%)] font-semibold" onClick={() => { setMobileNav(false); setDemoOpen(true); }}>Démo</Button>
            </div>
          </div>
        )}
      </header>

      {/* ===================== HERO ===================== */}
      <section id="lp-top" className="lp-hero lp-scan lp-grain relative isolate px-4 sm:px-6 pt-28 sm:pt-32 pb-16 overflow-hidden">
        <div className="lp-hero-grid lp-grid lp-grid-fade absolute inset-0 z-0" />
        <div className="lp-glow w-[36rem] h-[36rem] -top-32 -right-24 z-0" />

        <div className="container mx-auto max-w-6xl relative z-10">

          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-12 items-center">
            <div>
              <div className="lp-boot lp-mono text-xs tracking-[0.22em] text-[hsl(28_92%_56%)] mb-5">SYSTEME DE GESTION 360°</div>
              <h1 className="lp-display text-[3rem] sm:text-7xl lg:text-[5.2rem] mb-6">
                <span className="block overflow-hidden"><span className="lp-hero-line inline-block">Votre site d'hydrocarbure,</span></span>
                <span className="block overflow-hidden"><span className="lp-hero-line inline-block text-[hsl(28_92%_56%)]">sous contrôle.</span></span>
              </h1>
              <p className="lp-hero-sub text-[hsl(215_12%_56%)] text-base sm:text-lg max-w-xl mb-8 leading-relaxed">
                Réception, stockage, production, ventes : pilotez votre activité depuis, 
                un seul espace, mis à jour en temps réel. 
                Conçu pour les industries du gaz et du pétrole.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" onClick={() => setDemoOpen(true)} className="lp-hero-cta h-12 px-7 gap-2 bg-[hsl(28_92%_56%)] text-[hsl(220_16%_6%)] font-semibold hover:bg-[hsl(28_92%_50%)]">
                  Demander une démo <ArrowRight className="h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => setLoginOpen(true)}
                  className="lp-hero-cta h-12 px-7 gap-2 bg-transparent border-[hsl(210_30%_100%/0.18)] text-[hsl(40_16%_92%)] hover:bg-white/5 hover:text-white">
                  Accéder votre espace
                </Button>
              </div>
              <div className="lp-boot mt-8 lp-mono text-[11px] tracking-[0.18em] text-[hsl(215_12%_56%)]">
                GPL · GNL · HYDROCARBURES · GAZ INDUSTRIELS — NOTRE OUTIL S'ADAPTE A VOS OPERATIONS
              </div>
            </div>

            {/* Instrument */}
            <div className="lp-instrument lp-panel lp-corners rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="lp-tag flex items-center gap-2"><Activity className="h-3.5 w-3.5 text-[hsl(28_92%_56%)]" /> CONSOLE · LIVE</span>
                <span className="flex items-center gap-1.5 lp-mono text-[10px] text-[hsl(150_65%_48%)]"><span className="lp-led lp-led-blink" /> OK</span>
              </div>

              <div className="flex flex-col items-center py-2">
                <svg viewBox="0 0 240 150" className="w-full max-w-[300px]">
                  <path d="M 20 130 A 100 100 0 0 1 220 130" fill="none" stroke="hsl(210 30% 100% / 0.12)" strokeWidth="10" strokeLinecap="round" />
                  <path className="lp-gauge-fill" d="M 20 130 A 100 100 0 0 1 220 130" fill="none" stroke="hsl(28 92% 56%)" strokeWidth="10" strokeLinecap="round" />
                  {Array.from({ length: 11 }).map((_, i) => {
                    const a = (-90 + i * 18) * Math.PI / 180;
                    const x1 = 120 + Math.sin(a) * 82, y1 = 130 - Math.cos(a) * 82;
                    const x2 = 120 + Math.sin(a) * 90, y2 = 130 - Math.cos(a) * 90;
                    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(210 30% 100% / 0.25)" strokeWidth="1.5" />;
                  })}
                  <g className="lp-needle-g">
                    <line x1="120" y1="130" x2="120" y2="52" stroke="hsl(28 92% 56%)" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="120" cy="130" r="7" fill="hsl(28 92% 56%)" />
                  </g>
                </svg>
                <div className="-mt-6 text-center">
                  <div className="lp-display text-5xl text-[hsl(40_16%_92%)]"><span data-gauge-val>0</span><span className="text-[hsl(28_92%_56%)] text-3xl align-top">%</span></div>
                  <div className="lp-tag mt-1">DISPONIBILITÉ · EXEMPLE</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-px mt-4 bg-[hsl(210_30%_100%/0.08)] border border-[hsl(210_30%_100%/0.08)] rounded">
                {[
                  { l: 'PRODUCTION', v: '▰▰▰', c: 'text-[hsl(28_92%_56%)]' },
                  { l: 'STOCK', v: '▰▰▱', c: 'text-[hsl(190_85%_55%)]' },
                  { l: 'BILAN', v: 'OK', c: 'text-[hsl(150_65%_48%)]' },
                ].map((r) => (
                  <div key={r.l} className="bg-[hsl(220_13%_8%)] p-3">
                    <div className="lp-tag mb-1">{r.l}</div>
                    <div className={`lp-mono text-base font-semibold ${r.c}`}>{r.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== TICKER ===================== */}
      <div className="lp-ticker relative overflow-hidden border-y border-[hsl(210_30%_100%/0.08)] bg-[hsl(220_14%_9%)] py-3">
        <div className="lp-ticker-track">
          {[...tickerItems, ...tickerItems].map(([l, v], i) => (
            <span key={i} className="flex items-center gap-2 px-6 lp-mono text-xs whitespace-nowrap">
              <span className="text-[hsl(215_12%_56%)] tracking-[0.18em]">{l}</span>
              <span className="text-[hsl(28_92%_56%)] font-semibold">{v}</span>
              <span className="text-[hsl(210_30%_100%/0.2)] ml-4">/</span>
            </span>
          ))}
        </div>
      </div>

      {/* ===================== MODULES ===================== */}
      <section id="modules" className="scroll-mt-20 px-4 sm:px-6 py-20 sm:py-28 relative">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <div className="max-w-xl">
              <h2 className="lp-reveal text-4xl sm:text-6xl">Des fonctionnalités<br />pour chaque opération.</h2>
            </div>
            <p className="lp-reveal text-[hsl(215_12%_56%)] max-w-sm">
              Chaque module pilote une étape réelle de votre activité. Tous reliés au même bilan matière.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[hsl(210_30%_100%/0.08)] border border-[hsl(210_30%_100%/0.08)] rounded-lg overflow-hidden">
            {modules.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.id} className="lp-reveal group bg-[hsl(220_13%_8%)] hover:bg-[hsl(220_12%_11%)] transition-colors p-6 sm:p-7 relative">
                  <div className="flex items-center justify-between mb-8">
                    <span className="lp-mono text-xs tracking-[0.2em] text-[hsl(215_12%_56%)]">MOD.{m.id}</span>
                    <Icon className="h-5 w-5 text-[hsl(28_92%_56%)]" />
                  </div>
                  <h3 className="text-2xl mb-2 group-hover:text-[hsl(28_92%_56%)] transition-colors">{m.title}</h3>
                  <p className="text-sm text-[hsl(215_12%_56%)] leading-relaxed mb-4">{m.body}</p>
                  <span className="lp-mono text-[11px] tracking-[0.15em] text-[hsl(190_85%_55%)]">▸ {m.unit}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================== P&ID (cycle) ===================== */}
      <section id="cycle" className="lp-pid scroll-mt-20 px-4 sm:px-6 py-20 sm:py-28 bg-[hsl(220_14%_9%)] border-y border-[hsl(210_30%_100%/0.08)] relative lp-grain">
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="max-w-xl mb-14">
            <h2 className="lp-reveal text-4xl sm:text-6xl">De la réception<br />au bilan du jour.</h2>
          </div>

          <div className="relative">
            <div className="hidden lg:block absolute top-9 left-[8%] right-[8%] h-px bg-[hsl(210_30%_100%/0.12)]">
              <svg className="absolute inset-0 w-full h-px overflow-visible" preserveAspectRatio="none">
                <line x1="0" y1="0.5" x2="100%" y2="0.5" stroke="hsl(28 92% 56% / 0.5)" strokeWidth="2" className="lp-flow-dash" />
              </svg>
              <div className="lp-flow-progress h-full bg-[hsl(28_92%_56%)] origin-left" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-4">
              {flow.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div key={f.label} className="lp-reveal relative flex flex-col items-center text-center">
                    <div className="relative z-10 h-[4.5rem] w-[4.5rem] rounded-full bg-[hsl(220_13%_8%)] border border-[hsl(210_30%_100%/0.14)] flex items-center justify-center mb-4">
                      <Icon className="h-7 w-7 text-[hsl(28_92%_56%)]" />
                      <span className="absolute -top-1.5 -right-1.5 lp-mono text-[10px] h-5 w-5 rounded-full bg-[hsl(28_92%_56%)] text-[hsl(220_16%_6%)] flex items-center justify-center font-semibold">{i + 1}</span>
                    </div>
                    <h3 className="text-lg">{f.label}</h3>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ===================== CAPACITÉS ===================== */}
      <section className="px-4 sm:px-6 py-16 sm:py-20">
        <div className="container mx-auto max-w-6xl grid grid-cols-2 lg:grid-cols-4 gap-px bg-[hsl(210_30%_100%/0.08)] border border-[hsl(210_30%_100%/0.08)] rounded-lg overflow-hidden">
          {capabilities.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.title} className="lp-reveal bg-[hsl(220_13%_8%)] p-6 sm:p-8">
                <Icon className="h-6 w-6 text-[hsl(28_92%_56%)] mb-4" />
                <div className="lp-display text-2xl sm:text-3xl text-[hsl(40_16%_92%)] mb-1">{c.title}</div>
                <div className="lp-mono text-[11px] tracking-[0.12em] text-[hsl(215_12%_56%)] uppercase">{c.sub}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===================== BÉNÉFICES ===================== */}
      <section className="px-4 sm:px-6 py-20 sm:py-28 bg-[hsl(220_14%_9%)] border-y border-[hsl(210_30%_100%/0.08)]">
        <div className="container mx-auto max-w-6xl grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <h2 className="lp-reveal text-4xl sm:text-6xl mb-6">Aucune perte injustifiée<br />Chaque écart expliqué.</h2>
            <p className="lp-reveal text-[hsl(215_12%_56%)] mb-8 max-w-lg leading-relaxed">
              GazPILOTE rapproche automatiquement vos entrées, votre production et vos sorties.
              Quand il y a un écart, vous savez exactement d'où il vient.
            </p>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 mb-9">
              {benefits.map((b) => (
                <div key={b} className="lp-reveal flex items-center gap-2.5 lp-mono text-sm text-[hsl(40_16%_92%)]">
                  <span className="text-[hsl(28_92%_56%)]">+</span> {b}
                </div>
              ))}
            </div>
            <Button size="lg" onClick={() => navigate('/dashboard')} className="lp-reveal h-12 px-7 gap-2 bg-[hsl(28_92%_56%)] text-[hsl(220_16%_6%)] font-semibold hover:bg-[hsl(28_92%_50%)]">
              Accéder au tableau de bord   <ArrowRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="lp-reveal lp-panel lp-corners rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <span className="lp-tag">PERFORMANCE</span>
              <span className="lp-mono text-[10px] text-[hsl(150_65%_48%)] flex items-center gap-1.5"><span className="lp-led" /> SYNC</span>
            </div>
            <div className="space-y-2.5 mb-6">
              <div className="flex justify-between lp-mono text-sm"><span className="text-[hsl(215_12%_56%)]">Objectif de production</span><span className="font-semibold">78 %</span></div>
              <div className="h-2 bg-[hsl(210_30%_100%/0.08)] rounded-full overflow-hidden">
                <div className="lp-flow-progress h-full bg-[hsl(28_92%_56%)] origin-left" style={{ width: '78%' }} />
              </div>
              <div className="flex justify-between lp-mono text-sm"><span className="text-[hsl(215_12%_56%)]">Écart de bilan</span><span className="text-[hsl(150_65%_48%)] font-semibold">conforme</span></div>
            </div>
            <div className="grid grid-cols-3 gap-px bg-[hsl(210_30%_100%/0.08)] border border-[hsl(210_30%_100%/0.08)] rounded">
              {[['ENTRÉES', '▰▰▰'], ['SORTIES', '▰▰▱'], ['ÉCART', 'OK']].map(([l, v]) => (
                <div key={l} className="bg-[hsl(220_13%_8%)] p-3 text-center">
                  <div className="lp-tag mb-1">{l}</div>
                  <div className="lp-mono text-sm font-semibold">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===================== FAQ ===================== */}
      <section id="faq" className="scroll-mt-20 px-4 sm:px-6 py-20 sm:py-28 bg-[hsl(220_14%_9%)] border-y border-[hsl(210_30%_100%/0.08)]">
        <div className="container mx-auto max-w-6xl grid lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16">
          <div>
            <div className="lp-reveal lp-mono text-xs tracking-[0.22em] text-[hsl(28_92%_56%)] mb-4">// MANUEL</div>
            <h2 className="lp-reveal text-4xl sm:text-5xl mb-4">Questions<br />fréquentes.</h2>
            <p className="lp-reveal text-[hsl(215_12%_56%)] mb-6">Une autre question ? On répond vite.</p>
            <Button variant="outline" onClick={() => setDemoOpen(true)} className="lp-reveal gap-2 bg-transparent border-[hsl(210_30%_100%/0.18)] hover:bg-white/5">
              Nous contacter <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="lp-reveal">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border-[hsl(210_30%_100%/0.1)]">
                  <AccordionTrigger className="text-left text-base hover:no-underline hover:text-[hsl(28_92%_56%)] text-[hsl(40_16%_92%)]">
                    <span className="lp-mono text-xs text-[hsl(28_92%_56%)] mr-3">{String(i + 1).padStart(2, '0')}</span>{f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-[hsl(215_12%_56%)] leading-relaxed text-[15px] pl-8">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* ===================== CTA ===================== */}
      <section className="lp-scan lp-grain relative px-4 sm:px-6 py-24 sm:py-32 overflow-hidden">
        <div className="lp-hero-grid lp-grid lp-grid-fade absolute inset-0 z-0" />
        <div className="lp-glow w-[34rem] h-[34rem] left-1/2 -translate-x-1/2 -bottom-40 z-0" />
        <div className="container mx-auto max-w-3xl text-center relative z-10">
          <div className="lp-reveal lp-mono text-xs tracking-[0.22em] text-[hsl(28_92%_56%)] mb-5">// INITIALISER</div>
          <h2 className="lp-reveal text-5xl sm:text-7xl mb-6">Reprenez le contrôle<br />de vos <span className="text-[hsl(28_92%_56%)]">opérations.</span></h2>
          <p className="lp-reveal text-[hsl(215_12%_56%)] text-lg mb-10 max-w-xl mx-auto">
            Remplacez vos classeurs Excel par un véritable poste de pilotage. Démo en conditions réelles.
          </p>
          <div className="lp-reveal flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={() => setDemoOpen(true)} className="h-12 px-8 gap-2 bg-[hsl(28_92%_56%)] text-[hsl(220_16%_6%)] font-semibold hover:bg-[hsl(28_92%_50%)]">
              Demander une démo <ArrowRight className="h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => setLoginOpen(true)}
              className="h-12 px-8 gap-2 bg-transparent border-[hsl(210_30%_100%/0.18)] text-[hsl(40_16%_92%)] hover:bg-white/5 hover:text-white">
              Se connecter
            </Button>
          </div>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="px-4 sm:px-6 py-8 border-t border-[hsl(210_30%_100%/0.08)]">
        <div className="container mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 lp-mono text-xs text-[hsl(215_12%_56%)]">
          <div className="flex items-center gap-2.5">
            <img src="/images/gp-logo.jpeg" alt="GazPILOTE" className="h-7 w-auto rounded" />
            <span className="lp-display text-base text-[hsl(40_16%_92%)]">GazPILOTE</span>
            <span className="flex items-center gap-1.5 ml-2"><span className="lp-led lp-led-blink" /> EN LIGNE</span>
          </div>
          <p>© {new Date().getFullYear()} GazPILOTE · ERP POUR L'INDUSTRIE GAZ &amp; PÉTROLE</p>
        </div>
      </footer>

      <DemoRequestDialog open={demoOpen} onOpenChange={setDemoOpen} />
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
};

export default Landing;
