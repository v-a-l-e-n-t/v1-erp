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
import DemoChooserDialog from '@/components/landing/DemoChooserDialog';
import LoginDialog from '@/components/LoginDialog';
import {
  ArrowRight, ArrowUpRight, BarChart3, ClipboardCheck, Truck, Ship, Factory,
  Gauge as GaugeIcon, Menu, X, Activity, Building2, ShieldCheck, Quote, Star, TrendingUp,
} from 'lucide-react';
import '@/components/landing/landing.css';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const modules = [
  { id: '01', icon: Factory, title: 'Production', body: 'Lignes de production et de traitement, équipes, postes, arrêts et cadences suivis en continu.', unit: 'par ligne', big: true },
  { id: '02', icon: GaugeIcon, title: 'Stockage', body: 'Bacs, réservoirs, capacités : niveaux, masses et mouvements calculés au plus juste.', unit: 'toutes capacités' },
  { id: '03', icon: Ship, title: 'Réceptions', body: 'Navire, camion ou pipeline, avec contrôles avant et après transfert.', unit: 'multi-sources' },
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
  { who: 'Chef de quart', role: 'Production', msg: 'Je saisis le poste directement sur la ligne. On voit enfin où le temps se perd, étape par étape.' },
  { who: "Responsable d'exploitation", role: 'Exploitation', msg: 'Plusieurs classeurs Excel remplacés par un seul écran. Le bilan matière tombe en quelques minutes.' },
  { who: 'Responsable distribution', role: 'Distribution', msg: 'Chargements et bons de transfert tracés au même endroit. Plus aucun document perdu.' },
];

const faqs = [
  { q: 'Est-ce adapté à mon type d’installation ?', a: "Oui. GazPILOTE s'adapte à votre activité (GPL, GNL, hydrocarbures, gaz industriels…) et à vos capacités de stockage — bacs, réservoirs, cigares — comme à vos lignes de production." },
  { q: 'Les données sont-elles sécurisées ?', a: 'Infrastructure cloud sécurisée, authentification, journalisation des accès et sauvegardes. Chaque modification sensible est tracée.' },
  { q: 'Plusieurs sites sont-ils gérés ?', a: 'Oui — pilotage centralisé de plusieurs sites ou centres, avec des bilans et historiques distincts, depuis une seule interface.' },
  { q: 'Puis-je importer mes fichiers Excel ?', a: "L'import Excel est automatisé : jaugeage des capacités, mouvements de stock, ventes et bons de transfert. Vos historiques ne sont pas perdus." },
  { q: 'Est-ce utilisable depuis le terrain ?', a: 'Interface responsive : saisie des postes, arrêts, réceptions et inspections depuis un mobile ou une tablette sur site.' },
  { q: 'Comment se passe le déploiement ?', a: 'Nous configurons vos lignes, produits, capacités de stockage et partenaires, importons vos données, puis formons vos équipes.' },
];

const Landing = () => {
  const navigate = useNavigate();
  const root = useRef<HTMLDivElement>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const openDemo = () => setChooserOpen(true);

  const scrollTo = (id: string) => {
    setMobileNav(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.lp-boot', { opacity: 0, duration: 0.45, stagger: 0.06 })
        .from('.lp-hero-line', { yPercent: 115, duration: 0.85, stagger: 0.1 }, '-=0.1')
        .from('.lp-hero-sub', { y: 16, opacity: 0, duration: 0.55 }, '-=0.45')
        .from('.lp-hero-cta', { y: 14, opacity: 0, duration: 0.5, stagger: 0.1 }, '-=0.35')
        .from('.lp-hero-panel', { y: 40, opacity: 0, duration: 0.8 }, '-=0.7');

      gsap.from('.lp-flow-progress', {
        scaleX: 0, ease: 'none',
        scrollTrigger: { trigger: '.lp-pid', start: 'top 70%', end: 'bottom 75%', scrub: 1 },
      });
      gsap.from('.lp-progress-fill', {
        scaleX: 0, duration: 1.1, ease: 'power2.out',
        scrollTrigger: { trigger: '.lp-progress-fill', start: 'top 88%', once: true },
      });

      gsap.to('.lp-hero-grid', { yPercent: 16, ease: 'none', scrollTrigger: { trigger: '.lp-hero', start: 'top top', end: 'bottom top', scrub: 1 } });
      gsap.to('.lp-glow', { yPercent: 28, ease: 'none', scrollTrigger: { trigger: '.lp-hero', start: 'top top', end: 'bottom top', scrub: 1 } });

      gsap.set('.lp-reveal', { y: 32, opacity: 0 });
      ScrollTrigger.batch('.lp-reveal', {
        start: 'top 88%',
        onEnter: (els) => gsap.to(els, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.08, overwrite: true }),
      });

      gsap.utils.toArray<HTMLElement>('[data-countup]').forEach((el) => {
        const target = Number(el.dataset.target || '0');
        const suffix = el.dataset.suffix || '';
        const obj = { v: 0 };
        ScrollTrigger.create({
          trigger: el, start: 'top 92%', once: true,
          onEnter: () => gsap.to(obj, { v: target, duration: 1.4, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(obj.v).toString() + suffix; } }),
        });
      });
    });
  }, { scope: root });

  const accentBtn = 'bg-[hsl(28_92%_52%)] text-white font-semibold hover:bg-[hsl(28_92%_46%)]';
  const ghostBtn = 'bg-transparent border-[hsl(220_14%_84%)] text-[hsl(222_24%_13%)] hover:bg-[hsl(40_22%_95%)]';

  return (
    <div ref={root} className="lp min-h-screen relative overflow-x-hidden">
      {/* ===================== HEADER ===================== */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[hsl(40_33%_98%)]/85 backdrop-blur-xl border-b border-[hsl(220_16%_90%)]">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => scrollTo('lp-top')} className="flex items-center gap-2.5">
            <img src="/images/gp-logo.jpeg" alt="GazPILOTE" className="h-9 w-auto rounded-md" />
            <span className="lp-display text-xl tracking-tight text-[hsl(222_24%_13%)]">GazPILOTE</span>
          </button>

          <nav className="hidden md:flex items-center gap-8 text-sm text-[hsl(220_10%_46%)]">
            {[['Produit', 'features'], ['Cycle', 'cycle'], ['Avis', 'logs'], ['FAQ', 'faq']].map(([l, id]) => (
              <button key={id} onClick={() => scrollTo(id)} className="lp-navlink hover:text-[hsl(222_24%_13%)] transition-colors">{l}</button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" onClick={() => setLoginOpen(true)} className="h-9 text-[hsl(222_24%_13%)] hover:bg-[hsl(40_22%_95%)]">Connexion</Button>
            <Button onClick={openDemo} className={`h-9 gap-1.5 ${accentBtn}`}>Démo <ArrowRight className="h-4 w-4" /></Button>
          </div>

          <button className="md:hidden p-2 text-[hsl(222_24%_13%)]" onClick={() => setMobileNav((o) => !o)} aria-label="Menu">
            {mobileNav ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {mobileNav && (
          <div className="md:hidden border-t border-[hsl(220_16%_90%)] bg-[hsl(40_33%_98%)] px-5 py-4 flex flex-col gap-3">
            {[['Produit', 'features'], ['Cycle', 'cycle'], ['Avis', 'logs'], ['FAQ', 'faq']].map(([l, id]) => (
              <button key={id} onClick={() => scrollTo(id)} className="text-left py-1.5 text-sm">{l}</button>
            ))}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className={`flex-1 ${ghostBtn}`} onClick={() => { setMobileNav(false); setLoginOpen(true); }}>Connexion</Button>
              <Button className={`flex-1 ${accentBtn}`} onClick={() => { setMobileNav(false); openDemo(); }}>Démo</Button>
            </div>
          </div>
        )}
      </header>

      {/* ===================== HERO ===================== */}
      <section id="lp-top" className="lp-hero relative isolate px-4 sm:px-6 pt-28 sm:pt-36 pb-16 overflow-hidden">
        <div className="lp-hero-grid lp-grid lp-grid-fade absolute inset-0 z-0" />
        <div className="lp-glow w-[38rem] h-[38rem] -top-40 -right-28 z-0" />

        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-12 items-center">
            <div>
              <div className="lp-boot lp-eyebrow mb-6"><span className="num">/</span> Système de gestion 360°</div>
              <h1 className="lp-display text-[2.9rem] sm:text-6xl lg:text-[4.6rem] mb-6 text-[hsl(222_24%_13%)]">
                <span className="block overflow-hidden"><span className="lp-hero-line inline-block">Votre site d'hydrocarbure,</span></span>
                <span className="block overflow-hidden"><span className="lp-hero-line inline-block text-[hsl(28_92%_52%)]">sous contrôle.</span></span>
              </h1>
              <p className="lp-hero-sub text-[hsl(220_10%_46%)] text-base sm:text-lg max-w-xl mb-8 leading-relaxed">
                Réception, stockage, production, ventes : pilotez votre activité depuis un seul espace,
                mis à jour en temps réel. Conçu pour les industries du gaz et du pétrole.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" onClick={openDemo} className={`lp-hero-cta h-12 px-7 gap-2 ${accentBtn} shadow-lg shadow-[hsl(28_92%_52%)]/20`}>
                  Demander une démo <ArrowRight className="h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => setLoginOpen(true)} className={`lp-hero-cta h-12 px-7 gap-2 ${ghostBtn}`}>
                  Accéder à votre espace
                </Button>
              </div>
              <div className="lp-boot mt-8 lp-mono text-[11px] tracking-[0.16em] text-[hsl(220_10%_46%)]">
                GPL · GNL · HYDROCARBURES · GAZ INDUSTRIELS — NOTRE OUTIL S'ADAPTE À VOS OPÉRATIONS
              </div>
            </div>

            {/* Panneau produit clair */}
            <div className="lp-hero-panel">
              <div className="lp-panel rounded-2xl p-3">
                <div className="flex items-center gap-1.5 px-2 pb-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-[hsl(220_14%_84%)]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[hsl(220_14%_84%)]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[hsl(220_14%_84%)]" />
                  <span className="ml-2 lp-mono text-[11px] text-[hsl(220_10%_46%)]">tableau de bord · live</span>
                </div>
                <div className="rounded-xl bg-[hsl(40_22%_97%)] border border-[hsl(220_16%_92%)] p-4 sm:p-5">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div>
                      <p className="lp-mono text-[10px] uppercase tracking-wider text-[hsl(220_10%_46%)]">Production</p>
                      <p className="text-lg sm:text-xl font-bold text-[hsl(222_24%_13%)]">2 450<span className="text-xs text-[hsl(220_10%_46%)] ml-0.5">T</span></p>
                    </div>
                    <div>
                      <p className="lp-mono text-[10px] uppercase tracking-wider text-[hsl(220_10%_46%)]">Disponibilité</p>
                      <p className="text-lg sm:text-xl font-bold text-[hsl(28_92%_52%)]"><span data-countup data-target="94" data-suffix="">0</span>%</p>
                    </div>
                    <div>
                      <p className="lp-mono text-[10px] uppercase tracking-wider text-[hsl(220_10%_46%)]">Bilan</p>
                      <p className="text-lg sm:text-xl font-bold text-emerald-600">conforme</p>
                    </div>
                  </div>
                  <div className="flex items-end justify-between h-28 gap-1.5 border-t border-[hsl(220_16%_92%)] pt-4">
                    {[42, 65, 53, 78, 61, 88, 70, 95, 82, 74, 90, 68].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-[hsl(28_92%_52%)]/35 to-[hsl(28_92%_52%)]" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between lp-mono text-[11px] text-[hsl(220_10%_46%)]">
                    <span>Production / 12 jours</span>
                    <span className="text-emerald-600 flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> +12,4 %</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== BENTO FEATURES ===================== */}
      <section id="features" className="scroll-mt-20 px-4 sm:px-6 py-20 sm:py-28 bg-[hsl(40_22%_96%)] border-y border-[hsl(220_16%_90%)]">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <div className="max-w-xl">
              <div className="lp-reveal lp-eyebrow mb-4"><span className="num">01</span><span className="bar" /> Modules</div>
              <h2 className="lp-reveal lp-h2 text-4xl sm:text-5xl text-[hsl(222_24%_13%)]">Un instrument<br />pour chaque opération.</h2>
            </div>
            <p className="lp-reveal text-[hsl(220_10%_46%)] max-w-sm">
              Chaque module pilote une étape réelle de votre activité. Tous reliés au même bilan matière.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 auto-rows-[minmax(170px,auto)]">
            {modules.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.id} className={`lp-reveal lp-bento-cell group p-6 sm:p-7 flex flex-col ${m.big ? 'lg:col-span-2 lg:row-span-2 bg-[hsl(222_24%_13%)] border-transparent' : ''}`}>
                  <div className="flex items-center justify-between mb-auto">
                    <span className={`lp-mono text-xs tracking-[0.2em] ${m.big ? 'text-white/55' : 'text-[hsl(220_10%_46%)]'}`}>MOD.{m.id}</span>
                    <span className={`h-10 w-10 rounded-lg flex items-center justify-center ${m.big ? 'bg-[hsl(28_92%_52%)]' : 'bg-[hsl(28_92%_52%)]/10'}`}>
                      <Icon className={`h-5 w-5 ${m.big ? 'text-white' : 'text-[hsl(28_92%_52%)]'}`} />
                    </span>
                  </div>
                  <h3 className={`mt-6 text-xl ${m.big ? 'sm:text-3xl text-white' : 'text-[hsl(222_24%_13%)]'} font-semibold group-hover:text-[hsl(28_92%_52%)] transition-colors`}>{m.title}</h3>
                  <p className={`mt-2 text-sm leading-relaxed ${m.big ? 'text-white/65' : 'text-[hsl(220_10%_46%)]'}`}>{m.body}</p>
                  <span className="mt-4 lp-mono text-[11px] tracking-[0.15em] text-[hsl(28_92%_52%)]">▸ {m.unit}</span>
                  {m.big && (
                    <div className="mt-6 flex items-end justify-between h-16 gap-1.5">
                      {[40, 62, 50, 78, 58, 88, 72, 95].map((h, i) => (
                        <div key={i} className="flex-1 rounded-sm bg-[hsl(28_92%_52%)]/70" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================== WORKFLOW ===================== */}
      <section id="cycle" className="lp-pid scroll-mt-20 px-4 sm:px-6 py-20 sm:py-28">
        <div className="container mx-auto max-w-6xl">
          <div className="max-w-xl mb-14">
            <div className="lp-reveal lp-eyebrow mb-4"><span className="num">02</span><span className="bar" /> Synoptique</div>
            <h2 className="lp-reveal lp-h2 text-4xl sm:text-5xl text-[hsl(222_24%_13%)]">De la réception<br />au bilan du jour.</h2>
          </div>
          <div className="relative">
            <div className="hidden lg:block absolute top-8 left-[9%] right-[9%] h-px bg-[hsl(220_16%_88%)]">
              <div className="lp-flow-progress h-full bg-[hsl(28_92%_52%)]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-4">
              {flow.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div key={f.label} className="lp-reveal relative flex flex-col items-center text-center">
                    <div className="relative z-10 h-16 w-16 rounded-2xl bg-white border border-[hsl(220_14%_84%)] flex items-center justify-center mb-4 shadow-sm">
                      <Icon className="h-7 w-7 text-[hsl(28_92%_52%)]" />
                      <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[hsl(28_92%_52%)] text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    </div>
                    <h3 className="font-semibold text-lg text-[hsl(222_24%_13%)]">{f.label}</h3>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Capabilities */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mt-20">
            {capabilities.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.title} className="lp-reveal lp-card rounded-xl p-5 sm:p-6">
                  <Icon className="h-6 w-6 text-[hsl(28_92%_52%)] mb-4" />
                  <div className="lp-display text-xl sm:text-2xl text-[hsl(222_24%_13%)] mb-1">{c.title}</div>
                  <div className="lp-mono text-[11px] tracking-[0.1em] text-[hsl(220_10%_46%)] uppercase">{c.sub}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================== BÉNÉFICES ===================== */}
      <section className="px-4 sm:px-6 py-20 sm:py-28 bg-[hsl(40_22%_96%)] border-y border-[hsl(220_16%_90%)]">
        <div className="container mx-auto max-w-6xl grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <div className="lp-reveal lp-eyebrow mb-4"><span className="num">03</span><span className="bar" /> Pourquoi</div>
            <h2 className="lp-reveal lp-h2 text-4xl sm:text-5xl text-[hsl(222_24%_13%)] mb-6">Chaque kilo compté.<br />Chaque écart expliqué.</h2>
            <p className="lp-reveal text-[hsl(220_10%_46%)] mb-8 max-w-lg leading-relaxed">
              GazPILOTE rapproche automatiquement vos entrées, votre production et vos sorties.
              Quand il y a un écart, vous savez exactement d'où il vient.
            </p>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 mb-9">
              {benefits.map((b) => (
                <div key={b} className="lp-reveal flex items-center gap-2.5 text-sm text-[hsl(222_24%_13%)]">
                  <span className="text-[hsl(28_92%_52%)] font-bold">+</span> {b}
                </div>
              ))}
            </div>
            <Button size="lg" onClick={() => navigate('/dashboard')} className={`lp-reveal h-12 px-7 gap-2 ${accentBtn}`}>
              Explorer la plateforme <ArrowUpRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="lp-reveal lp-panel rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <span className="font-semibold text-[hsl(222_24%_13%)]">Performance du mois</span>
              <span className="lp-mono text-[10px] text-emerald-600 flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Synchronisé</span>
            </div>
            <div className="space-y-2.5 mb-6">
              <div className="flex justify-between text-sm"><span className="text-[hsl(220_10%_46%)]">Objectif de production</span><span className="font-bold text-[hsl(222_24%_13%)]">78 %</span></div>
              <div className="h-2.5 bg-[hsl(40_20%_92%)] rounded-full overflow-hidden">
                <div className="lp-progress-fill h-full bg-[hsl(28_92%_52%)] rounded-full" style={{ width: '78%' }} />
              </div>
              <div className="flex justify-between text-sm"><span className="text-[hsl(220_10%_46%)]">Écart de bilan</span><span className="font-bold text-emerald-600">conforme</span></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[['Entrées', '▰▰▰'], ['Sorties', '▰▰▱'], ['Écart', 'OK']].map(([l, v]) => (
                <div key={l} className="rounded-xl bg-[hsl(40_20%_95%)] p-3.5 text-center">
                  <p className="lp-mono text-[10px] uppercase text-[hsl(220_10%_46%)]">{l}</p>
                  <p className="text-sm font-bold text-[hsl(222_24%_13%)] mt-0.5">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===================== AVIS ===================== */}
      <section id="logs" className="scroll-mt-20 px-4 sm:px-6 py-20 sm:py-28">
        <div className="container mx-auto max-w-6xl">
          <div className="max-w-xl mb-12">
            <div className="lp-reveal lp-eyebrow mb-4"><span className="num">04</span><span className="bar" /> Sur le terrain</div>
            <h2 className="lp-reveal lp-h2 text-4xl sm:text-5xl text-[hsl(222_24%_13%)]">Ce qu'en disent<br />les opérateurs.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {logs.map((l, i) => (
              <figure key={i} className="lp-reveal lp-card rounded-2xl p-6 flex flex-col">
                <Quote className="h-7 w-7 text-[hsl(28_92%_52%)]/30 mb-4" />
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, k) => <Star key={k} className="h-4 w-4 fill-[hsl(28_92%_52%)] text-[hsl(28_92%_52%)]" />)}
                </div>
                <blockquote className="text-[15px] leading-relaxed text-[hsl(222_16%_22%)] flex-1">« {l.msg} »</blockquote>
                <figcaption className="mt-6 flex items-center gap-3 pt-5 border-t border-[hsl(220_16%_90%)]">
                  <span className="h-10 w-10 rounded-full bg-[hsl(28_92%_52%)]/12 text-[hsl(28_92%_52%)] flex items-center justify-center font-bold text-sm">
                    {l.who.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-[hsl(222_24%_13%)]">{l.who}</span>
                    <span className="block text-xs text-[hsl(220_10%_46%)]">{l.role}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== FAQ ===================== */}
      <section id="faq" className="scroll-mt-20 px-4 sm:px-6 py-20 sm:py-28 bg-[hsl(40_22%_96%)] border-y border-[hsl(220_16%_90%)]">
        <div className="container mx-auto max-w-6xl grid lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16">
          <div>
            <div className="lp-reveal lp-eyebrow mb-4"><span className="num">05</span><span className="bar" /> Questions fréquentes</div>
            <h2 className="lp-reveal lp-h2 text-4xl sm:text-5xl text-[hsl(222_24%_13%)] mb-4">Vous vous demandez<br />sûrement…</h2>
            <p className="lp-reveal text-[hsl(220_10%_46%)] mb-6">Une autre question ? On répond vite.</p>
            <Button variant="outline" onClick={() => setDemoOpen(true)} className={`lp-reveal gap-2 ${ghostBtn}`}>
              Nous contacter <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="lp-reveal">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border-[hsl(220_16%_88%)]">
                  <AccordionTrigger className="text-left text-base font-semibold text-[hsl(222_24%_13%)] hover:no-underline hover:text-[hsl(28_92%_52%)]">
                    <span className="lp-mono text-xs text-[hsl(28_92%_52%)] mr-3">{String(i + 1).padStart(2, '0')}</span>{f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-[hsl(220_10%_46%)] leading-relaxed text-[15px] pl-8">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* ===================== CTA ===================== */}
      <section className="px-4 sm:px-6 py-20 sm:py-28">
        <div className="container mx-auto max-w-5xl">
          <div className="relative overflow-hidden rounded-3xl bg-[hsl(222_24%_13%)] px-6 py-14 sm:px-12 sm:py-20 text-center">
            <div className="lp-glow w-[30rem] h-[30rem] left-1/2 -translate-x-1/2 -bottom-40" />
            <div className="relative">
              <div className="lp-reveal lp-eyebrow text-white/60 mb-5 justify-center"><span className="num text-[hsl(28_92%_56%)]">→</span> Initialiser</div>
              <h2 className="lp-reveal lp-display text-4xl sm:text-6xl text-white mb-6">Reprenez le contrôle<br />de vos <span className="text-[hsl(28_92%_56%)]">opérations.</span></h2>
              <p className="lp-reveal text-white/65 text-lg mb-10 max-w-xl mx-auto">
                Remplacez vos classeurs Excel par un véritable poste de pilotage. Démo en conditions réelles.
              </p>
              <div className="lp-reveal flex flex-col sm:flex-row gap-3 justify-center">
                <Button size="lg" onClick={openDemo} className={`h-12 px-8 gap-2 ${accentBtn}`}>Demander une démo <ArrowRight className="h-5 w-5" /></Button>
                <Button size="lg" variant="outline" onClick={() => setLoginOpen(true)} className="h-12 px-8 gap-2 bg-transparent border-white/25 text-white hover:bg-white/10 hover:text-white">Se connecter</Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="px-4 sm:px-6 py-10 border-t border-[hsl(220_16%_90%)]">
        <div className="container mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/images/gp-logo.jpeg" alt="GazPILOTE" className="h-8 w-auto rounded" />
            <span className="lp-display text-base text-[hsl(222_24%_13%)]">GazPILOTE</span>
          </div>
          <p className="lp-mono text-xs text-[hsl(220_10%_46%)]">© {new Date().getFullYear()} GazPILOTE · ERP pour l'industrie gaz &amp; pétrole</p>
        </div>
      </footer>

      <DemoChooserDialog open={chooserOpen} onOpenChange={setChooserOpen} onContact={() => { setChooserOpen(false); setDemoOpen(true); }} />
      <DemoRequestDialog open={demoOpen} onOpenChange={setDemoOpen} />
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
};

export default Landing;
