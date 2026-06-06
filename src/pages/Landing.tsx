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
  BarChart3, Truck, Calculator, ArrowRight, ArrowUpRight,
  MapPin, Ship, Factory, Gauge, ClipboardCheck, Menu, X, Star,
  Quote, CheckCircle2,
} from 'lucide-react';
import '@/components/landing/landing.css';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const bento = [
  {
    icon: BarChart3, span: 'lg:col-span-2 lg:row-span-2', accent: true,
    title: 'Tableau de bord temps réel',
    body: "Tonnage, réceptions, disponibilité, bilan : tout est calculé en direct, à la ligne et au shift. Plus besoin d'attendre la fin du mois pour savoir où vous en êtes.",
  },
  { icon: Calculator, title: 'Masses sphères au gramme', body: 'Barémage intégré S01/S02/S03, calculs Decimal.js, lecture OCR des jauges.' },
  { icon: ClipboardCheck, title: 'Bilan matière auto', body: 'Stock théorique vs réel, écarts expliqués, par site.' },
  { icon: Truck, title: 'VRAC & mandataires', body: 'Chargements, bons de transfert, performance par mandataire.' },
  { icon: MapPin, title: 'Cartographie livraisons', body: 'Vos destinations sur une carte de la Côte d’Ivoire.' },
];

const workflow = [
  { icon: Ship, title: 'Réception', body: 'Navire & clients, barémage des sphères.' },
  { icon: Gauge, title: 'Stockage', body: 'Masses GPL suivies en temps réel.' },
  { icon: Factory, title: 'Production', body: 'Embouteillage, lignes, shifts, arrêts.' },
  { icon: Truck, title: 'Distribution', body: 'VRAC, mandataires, bons.' },
  { icon: ClipboardCheck, title: 'Bilan', body: 'Réconciliation & écarts.' },
];

const stats = [
  { target: 2, suffix: '', label: 'Sites pilotés', sub: 'Abidjan · Bouaké' },
  { target: 5, suffix: '', label: "Lignes d'embouteillage", sub: 'B6 ×4 + B12' },
  { target: 4, suffix: '', label: 'Marques distribuées', sub: 'Petro · Vivo · Total · SIMAM' },
  { target: null as number | null, display: 'Live', label: 'Données temps réel', sub: 'Mises à jour continues' },
];

const benefits = [
  'Import Excel automatisé', 'Rapports PDF / Excel exportables',
  'Analyse par jour, mois, période', 'Suivi des objectifs mensuels',
  'Multi-sites & multi-équipes', 'Historique complet & audit',
];

const testimonials = [
  { name: 'Chef de dépôt', role: 'Responsable exploitation', company: 'Centre emplisseur', quote: "On a remplacé cinq classeurs Excel par un seul écran. Le bilan matière qui prenait une demi-journée se fait maintenant en quelques minutes." },
  { name: 'Chef de quart', role: 'Production', company: 'Ligne d’embouteillage', quote: "Saisir les shifts et les arrêts directement sur place a tout changé. On voit enfin où on perd du temps, ligne par ligne." },
  { name: 'Responsable VRAC', role: 'Distribution', company: 'Portail clients', quote: "Les chargements VRAC et les bons de transfert sont enfin tracés au même endroit. Zéro bon perdu depuis qu’on est dessus." },
];

const faqs = [
  { q: 'Mes données sont-elles en sécurité ?', a: "Oui. Les données sont hébergées sur une infrastructure cloud sécurisée, avec authentification, journalisation des accès et sauvegardes. Chaque modification sensible est tracée." },
  { q: 'GazPILOTE gère-t-il plusieurs sites ?', a: "Absolument. La plateforme pilote aujourd’hui les sites d’Abidjan et de Bouaké, avec des bilans et historiques distincts par site, depuis une seule interface." },
  { q: 'Puis-je importer mes fichiers Excel existants ?', a: "Oui, l’import Excel est automatisé pour les bilans, les ventes mandataires, le barémage des sphères et les bons de transfert. Vos historiques ne sont pas perdus." },
  { q: 'Est-ce utilisable depuis le terrain ?', a: "L’interface est responsive : saisie des shifts, arrêts, réceptions et inspections directement depuis un mobile ou une tablette sur site." },
  { q: 'Comment se passe le déploiement ?', a: "Nous configurons vos lignes, marques, mandataires et sphères, importons vos données, puis formons vos équipes. La mise en route est rapide." },
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
  const [demoOpen, setDemoOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const scrollTo = (id: string) => {
    setMobileNav(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useGSAP(() => {
    // Header : bascule transparent → solide après le hero (toujours actif)
    ScrollTrigger.create({
      start: 90, end: 'max',
      onToggle: (self) => setScrolled(self.isActive),
    });

    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // HERO : lignes de titre en clip-reveal + cascade
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl.from('.lp-eyebrow-hero', { y: 16, opacity: 0, duration: 0.5 })
        .from('.lp-hero-line', { yPercent: 110, duration: 0.9, stagger: 0.1 }, '-=0.2')
        .from('.lp-hero-sub', { y: 18, opacity: 0, duration: 0.6 }, '-=0.5')
        .from('.lp-hero-cta', { y: 16, opacity: 0, duration: 0.5, stagger: 0.1 }, '-=0.35')
        .from('.lp-hero-trust', { opacity: 0, duration: 0.5 }, '-=0.2')
        .from('.lp-hero-panel', { y: 40, opacity: 0, duration: 0.9 }, '-=0.7');

      // Halo orange : léger parallax
      gsap.to('.lp-glow', {
        yPercent: 25, ease: 'none',
        scrollTrigger: { trigger: '.lp-hero', start: 'top top', end: 'bottom top', scrub: 1 },
      });

      // Reveals génériques
      gsap.set('.lp-reveal', { y: 34, opacity: 0 });
      ScrollTrigger.batch('.lp-reveal', {
        start: 'top 88%',
        onEnter: (els) => gsap.to(els, {
          y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', stagger: 0.1, overwrite: true,
        }),
      });

      // Count-up
      gsap.utils.toArray<HTMLElement>('[data-countup]').forEach((el) => {
        const target = Number(el.dataset.target || '0');
        const suffix = el.dataset.suffix || '';
        const obj = { val: 0 };
        ScrollTrigger.create({
          trigger: el, start: 'top 92%', once: true,
          onEnter: () => gsap.to(obj, {
            val: target, duration: 1.4, ease: 'power2.out',
            onUpdate: () => { el.textContent = Math.round(obj.val).toString() + suffix; },
          }),
        });
      });

      // Workflow : ligne tracée
      gsap.from('.lp-flow-line', {
        scaleX: 0, ease: 'none',
        scrollTrigger: { trigger: '.lp-workflow', start: 'top 65%', end: 'bottom 75%', scrub: 1 },
      });

      // Barre de progression
      gsap.from('.lp-progress-fill', {
        scaleX: 0, duration: 1.1, ease: 'power2.out',
        scrollTrigger: { trigger: '.lp-progress-fill', start: 'top 88%', once: true },
      });
    });
  }, { scope: root });

  return (
    <div ref={root} className="lp min-h-screen lp-dark overflow-x-hidden">
      {/* ===================== HEADER ===================== */}
      <header className={[
        'lp-header fixed top-0 inset-x-0 z-50 border-b',
        scrolled
          ? 'bg-[hsl(40_30%_98%)]/90 backdrop-blur-xl border-[hsl(240_12%_88%)] text-[hsl(240_10%_10%)]'
          : 'bg-transparent border-transparent text-[hsl(40_12%_96%)]',
      ].join(' ')}>
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => scrollTo('lp-top')} className="flex items-center gap-2.5">
            <img src="/images/gp-logo.jpeg" alt="GazPILOTE" className="h-9 w-auto rounded-md" />
            <span className="text-lg font-bold tracking-tight">GazPILOTE</span>
          </button>

          <nav className="hidden md:flex items-center gap-8 text-sm">
            {[['Produit', 'features'], ['Cycle GPL', 'workflow'], ['Témoignages', 'temoignages'], ['FAQ', 'faq']].map(([label, id]) => (
              <button key={id} onClick={() => scrollTo(id)}
                className="opacity-70 hover:opacity-100 transition-opacity">{label}</button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" onClick={() => setLoginOpen(true)}
              className={scrolled ? '' : 'text-white hover:bg-white/10 hover:text-white'}>
              Connexion
            </Button>
            <Button onClick={() => setDemoOpen(true)} className="lp-accent-btn gap-1.5 hover:opacity-90">
              Démo <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileNav((o) => !o)} aria-label="Menu">
            {mobileNav ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileNav && (
          <div className="md:hidden bg-[hsl(240_9%_7%)] text-[hsl(40_12%_96%)] border-t border-[hsl(0_0%_100%/0.09)] px-5 py-4 flex flex-col gap-3">
            {[['Produit', 'features'], ['Cycle GPL', 'workflow'], ['Témoignages', 'temoignages'], ['FAQ', 'faq']].map(([label, id]) => (
              <button key={id} onClick={() => scrollTo(id)} className="text-left py-1.5">{label}</button>
            ))}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white"
                onClick={() => { setMobileNav(false); setLoginOpen(true); }}>Connexion</Button>
              <Button className="flex-1 lp-accent-btn" onClick={() => { setMobileNav(false); setDemoOpen(true); }}>Démo</Button>
            </div>
          </div>
        )}
      </header>

      {/* ===================== HERO (sombre) ===================== */}
      <section id="lp-top" className="lp-hero lp-grain relative isolate px-4 sm:px-6 pt-32 sm:pt-40 pb-20 sm:pb-24 overflow-hidden">
        <div className="lp-techgrid absolute inset-0 z-0" />
        <div className="lp-glow w-[40rem] h-[40rem] -top-40 -right-32 z-0" />

        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-10 items-center">
            {/* Colonne texte (gauche) */}
            <div>
              <div className="lp-eyebrow-hero lp-eyebrow text-[hsl(40_12%_96%)]/70 mb-6">
                <span className="num">/</span> ERP GPL · Côte d’Ivoire
              </div>

              <h1 className="lp-display text-[2.6rem] sm:text-6xl lg:text-[4.4rem] mb-7">
                <span className="lp-line-mask"><span className="lp-hero-line inline-block">Votre dépôt GPL,</span></span>
                <span className="lp-line-mask"><span className="lp-hero-line inline-block">piloté <span className="text-[hsl(28_92%_56%)]">au gramme près.</span></span></span>
              </h1>

              <p className="lp-hero-sub text-base sm:text-lg text-[hsl(40_6%_64%)] max-w-xl mb-9 leading-relaxed">
                Réception navire, stockage en sphères, embouteillage, distribution VRAC et
                bilan matière — réunis sur un seul écran, en temps réel.
                Fini les classeurs Excel éparpillés.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" onClick={() => setDemoOpen(true)} className="lp-hero-cta lp-accent-btn gap-2 text-base px-7 h-12 hover:opacity-90">
                  Demander une démo <ArrowRight className="h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => setLoginOpen(true)}
                  className="lp-hero-cta gap-2 text-base px-7 h-12 bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white">
                  Accéder à la plateforme
                </Button>
              </div>

              <div className="lp-hero-trust mt-8 flex items-center gap-3 text-xs text-[hsl(40_6%_64%)]">
                <span className="flex -space-x-2">
                  {clients.map((c) => (
                    <span key={c.name} className="h-7 w-7 rounded-full bg-white ring-2 ring-[hsl(240_9%_7%)] flex items-center justify-center overflow-hidden">
                      <img src={c.logo} alt={c.name} className="h-5 w-5 object-contain" />
                    </span>
                  ))}
                </span>
                Déjà en production · Abidjan &amp; Bouaké
              </div>

              <button onClick={() => scrollTo('features')}
                className="lp-hero-trust hidden lg:flex items-center gap-2 mt-10 text-[11px] uppercase tracking-[0.18em] font-mono text-[hsl(40_6%_64%)] hover:text-white transition-colors">
                <span className="lp-scroll-cue inline-flex h-7 w-5 rounded-full border border-current items-center justify-center">
                  <span className="h-1.5 w-px bg-current" />
                </span>
                Découvrir
              </button>
            </div>

            {/* Colonne produit (droite) — panneau net */}
            <div className="lp-hero-panel">
              <div className="lp-panel rounded-2xl p-3">
                <div className="flex items-center gap-1.5 px-2 pb-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  <span className="ml-2 text-[11px] text-[hsl(40_6%_64%)] font-mono">production · live</span>
                </div>
                <div className="rounded-xl bg-[hsl(240_9%_7%)] border border-[hsl(0_0%_100%/0.06)] p-4 sm:p-5">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { l: 'Tonnage', v: '2 450 T', c: 'text-[hsl(28_92%_56%)]' },
                      { l: 'Disponibilité', v: '94 %', c: 'text-emerald-400' },
                      { l: 'Bilan', v: '+0,3 %', c: 'text-sky-400' },
                    ].map((k) => (
                      <div key={k.l}>
                        <p className="text-[10px] uppercase tracking-wider text-[hsl(40_6%_64%)] font-mono">{k.l}</p>
                        <p className={`text-lg sm:text-xl font-bold ${k.c}`}>{k.v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-end justify-between h-28 gap-1.5 border-t border-[hsl(0_0%_100%/0.06)] pt-4">
                    {[42, 65, 53, 78, 61, 88, 70, 95, 82, 74, 90, 68].map((h, i) => (
                      <div key={i} className="flex-1 rounded-sm bg-[hsl(28_92%_56%)]/80"
                        style={{ height: `${h}%`, opacity: 0.4 + (h / 160) }} />
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-[11px] text-[hsl(40_6%_64%)] font-mono">
                    <span>Production / 12 jours</span>
                    <span className="text-emerald-400">▲ 12,4 %</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== LOGOS (clair) ===================== */}
      <section className="lp-light px-4 sm:px-6 py-12 border-y border-[hsl(240_12%_88%)]">
        <div className="container mx-auto">
          <p className="lp-reveal text-center text-xs uppercase tracking-[0.2em] text-[hsl(240_6%_42%)] font-mono mb-8">
            Les marques qui transitent par nos dépôts
          </p>
          <div className="lp-marquee overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
            <div className="lp-marquee-track gap-16 items-center">
              {[...clients, ...clients, ...clients].map((c, i) => (
                <img key={i} src={c.logo} alt={c.name}
                  className="h-10 w-auto object-contain opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===================== BENTO FEATURES (clair) ===================== */}
      <section id="features" className="lp-light scroll-mt-20 px-4 sm:px-6 py-20 sm:py-28">
        <div className="container mx-auto max-w-6xl">
          <div className="max-w-2xl mb-12 sm:mb-16">
            <div className="lp-reveal lp-eyebrow text-[hsl(240_6%_42%)] mb-5">
              <span className="num">01</span><span className="bar" /> Fonctionnalités
            </div>
            <h2 className="lp-reveal lp-h2 text-3xl sm:text-5xl text-[hsl(240_10%_10%)]">
              Un poste de pilotage,<br />pas un tableur.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 auto-rows-[minmax(180px,auto)]">
            {bento.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title}
                  className={`lp-reveal lp-bento-cell p-6 sm:p-7 flex flex-col ${f.span || ''} ${f.accent ? 'bg-[hsl(240_9%_7%)] text-white border-transparent' : ''}`}>
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center mb-auto ${f.accent ? 'bg-[hsl(28_92%_56%)]' : 'bg-[hsl(28_92%_56%)]/10'}`}>
                    <Icon className={`h-5 w-5 ${f.accent ? 'text-[hsl(240_9%_7%)]' : 'text-[hsl(28_92%_56%)]'}`} />
                  </div>
                  <h3 className={`mt-6 text-lg sm:text-xl font-semibold ${f.accent ? 'text-white' : 'text-[hsl(240_10%_10%)]'} ${f.accent ? 'sm:text-2xl' : ''}`}>
                    {f.title}
                  </h3>
                  <p className={`mt-2 text-sm leading-relaxed ${f.accent ? 'text-[hsl(40_6%_64%)]' : 'text-[hsl(240_6%_42%)]'}`}>
                    {f.body}
                  </p>
                  {f.accent && (
                    <div className="mt-6 flex items-end justify-between h-16 gap-1.5">
                      {[40, 62, 50, 78, 58, 88, 72, 95].map((h, i) => (
                        <div key={i} className="flex-1 rounded-sm bg-[hsl(28_92%_56%)]/70" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================== WORKFLOW (sombre) ===================== */}
      <section id="workflow" className="lp-workflow lp-dark lp-grain scroll-mt-20 relative px-4 sm:px-6 py-20 sm:py-28 overflow-hidden">
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="max-w-2xl mb-14">
            <div className="lp-reveal lp-eyebrow text-[hsl(40_6%_64%)] mb-5">
              <span className="num">02</span><span className="bar" /> Le cycle GPL
            </div>
            <h2 className="lp-reveal lp-h2 text-3xl sm:text-5xl">
              De la cale du navire<br />au bilan du jour.
            </h2>
          </div>

          <div className="relative">
            <div className="hidden lg:block absolute top-7 left-0 right-0 h-px bg-[hsl(0_0%_100%/0.12)]">
              <div className="lp-flow-line h-full bg-[hsl(28_92%_56%)]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-6">
              {workflow.map((w, i) => {
                const Icon = w.icon;
                return (
                  <div key={w.title} className="lp-reveal relative">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="relative z-10 h-14 w-14 rounded-xl bg-[hsl(240_8%_11%)] border border-[hsl(0_0%_100%/0.12)] flex items-center justify-center">
                        <Icon className="h-6 w-6 text-[hsl(28_92%_56%)]" />
                      </span>
                      <span className="font-mono text-3xl font-bold text-white/15">0{i + 1}</span>
                    </div>
                    <h3 className="font-semibold text-lg mb-1">{w.title}</h3>
                    <p className="text-sm text-[hsl(40_6%_64%)]">{w.body}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats repensées */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px mt-20 bg-[hsl(0_0%_100%/0.08)] rounded-2xl overflow-hidden border border-[hsl(0_0%_100%/0.08)]">
            {stats.map((s, i) => (
              <div key={i} className="lp-reveal bg-[hsl(240_9%_7%)] p-6 sm:p-8">
                {s.target !== null ? (
                  <div className="text-4xl sm:text-5xl font-bold text-[hsl(28_92%_56%)] mb-2 tracking-tight"
                    data-countup data-target={s.target} data-suffix={s.suffix}>0</div>
                ) : (
                  <div className="text-4xl sm:text-5xl font-bold text-[hsl(28_92%_56%)] mb-2 tracking-tight">{s.display}</div>
                )}
                <div className="text-sm font-medium text-white">{s.label}</div>
                <div className="text-xs text-[hsl(40_6%_64%)] mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== BENEFITS / SHOWCASE (clair) ===================== */}
      <section className="lp-light scroll-mt-20 px-4 sm:px-6 py-20 sm:py-28 border-t border-[hsl(240_12%_88%)]">
        <div className="container mx-auto max-w-6xl grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <div className="lp-reveal lp-eyebrow text-[hsl(240_6%_42%)] mb-5">
              <span className="num">03</span><span className="bar" /> Pourquoi GazPILOTE
            </div>
            <h2 className="lp-reveal lp-h2 text-3xl sm:text-5xl text-[hsl(240_10%_10%)] mb-6">
              Chaque kilo compté.<br />Chaque écart expliqué.
            </h2>
            <p className="lp-reveal text-base sm:text-lg text-[hsl(240_6%_42%)] mb-8 leading-relaxed max-w-lg">
              GazPILOTE rapproche automatiquement vos entrées, votre production et vos
              sorties. Le bilan matière tombe juste — et quand il y a un écart, vous savez
              exactement d’où il vient.
            </p>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 mb-9">
              {benefits.map((b) => (
                <div key={b} className="lp-reveal flex items-center gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-[hsl(28_92%_56%)] flex-shrink-0" />
                  <span className="text-sm text-[hsl(240_10%_10%)]">{b}</span>
                </div>
              ))}
            </div>
            <Button size="lg" onClick={() => navigate('/dashboard')} className="lp-reveal lp-accent-btn gap-2 h-12 px-7 hover:opacity-90">
              Explorer la plateforme <ArrowUpRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="lp-reveal relative">
            <div className="rounded-3xl border border-[hsl(240_12%_88%)] bg-white shadow-[0_30px_80px_-40px_hsl(240_30%_20%/0.3)] p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <span className="font-semibold text-[hsl(240_10%_10%)]">Performance du mois</span>
                <span className="text-xs font-mono text-[hsl(240_6%_42%)]">Mai 2026</span>
              </div>
              <div className="space-y-2.5 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-[hsl(240_6%_42%)]">Tonnage produit</span>
                  <span className="font-bold text-[hsl(240_10%_10%)]">2 450 T</span>
                </div>
                <div className="h-2.5 bg-[hsl(40_20%_92%)] rounded-full overflow-hidden">
                  <div className="lp-progress-fill h-full bg-[hsl(28_92%_56%)] rounded-full" style={{ width: '78%' }} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[hsl(240_6%_42%)]">Objectif atteint</span>
                  <span className="font-bold text-[hsl(28_92%_56%)]">78 %</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[{ l: 'Sphères', v: '25 074 T' }, { l: 'VRAC', v: '11 852 T' }, { l: 'Écart', v: '+0,3 %' }].map((k) => (
                  <div key={k.l} className="rounded-xl bg-[hsl(40_20%_95%)] p-3.5 text-center">
                    <p className="text-[10px] uppercase text-[hsl(240_6%_42%)] font-mono">{k.l}</p>
                    <p className="text-sm font-bold text-[hsl(240_10%_10%)] mt-0.5">{k.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== TÉMOIGNAGES (clair) ===================== */}
      <section id="temoignages" className="lp-light scroll-mt-20 px-4 sm:px-6 py-20 sm:py-28 bg-[hsl(40_20%_95%)] border-y border-[hsl(240_12%_88%)]">
        <div className="container mx-auto max-w-6xl">
          <div className="max-w-2xl mb-12 sm:mb-16">
            <div className="lp-reveal lp-eyebrow text-[hsl(240_6%_42%)] mb-5">
              <span className="num">04</span><span className="bar" /> Sur le terrain
            </div>
            <h2 className="lp-reveal lp-h2 text-3xl sm:text-5xl text-[hsl(240_10%_10%)]">
              Ceux qui pilotent au quotidien.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t) => (
              <figure key={t.name} className="lp-reveal rounded-2xl border border-[hsl(240_12%_88%)] bg-white p-6 flex flex-col">
                <Quote className="h-7 w-7 text-[hsl(28_92%_56%)]/30 mb-4" />
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-[hsl(28_92%_56%)] text-[hsl(28_92%_56%)]" />
                  ))}
                </div>
                <blockquote className="text-[15px] leading-relaxed text-[hsl(240_10%_18%)] flex-1">
                  « {t.quote} »
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 pt-5 border-t border-[hsl(240_12%_90%)]">
                  <span className="h-10 w-10 rounded-full bg-[hsl(28_92%_56%)]/12 text-[hsl(28_92%_56%)] flex items-center justify-center font-bold text-sm">
                    {t.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-[hsl(240_10%_10%)]">{t.name}</span>
                    <span className="block text-xs text-[hsl(240_6%_42%)]">{t.role} · {t.company}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== FAQ (clair) ===================== */}
      <section id="faq" className="lp-light scroll-mt-20 px-4 sm:px-6 py-20 sm:py-28">
        <div className="container mx-auto max-w-6xl grid lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16">
          <div>
            <div className="lp-reveal lp-eyebrow text-[hsl(240_6%_42%)] mb-5">
              <span className="num">05</span><span className="bar" /> Questions fréquentes
            </div>
            <h2 className="lp-reveal lp-h2 text-3xl sm:text-4xl text-[hsl(240_10%_10%)] mb-4">
              Vous vous demandez<br />sûrement…
            </h2>
            <p className="lp-reveal text-[hsl(240_6%_42%)] mb-6">
              Une autre question ? Écrivez-nous, on répond vite.
            </p>
            <Button variant="outline" onClick={() => setDemoOpen(true)} className="lp-reveal gap-2">
              Nous contacter <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="lp-reveal">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border-[hsl(240_12%_88%)]">
                  <AccordionTrigger className="text-left text-base font-semibold text-[hsl(240_10%_10%)] hover:no-underline hover:text-[hsl(28_92%_56%)]">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-[hsl(240_6%_42%)] leading-relaxed text-[15px]">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* ===================== CTA (sombre) ===================== */}
      <section className="lp-dark lp-grain relative px-4 sm:px-6 py-24 sm:py-32 overflow-hidden">
        <div className="lp-glow w-[36rem] h-[36rem] left-1/2 -translate-x-1/2 -bottom-40 z-0" />
        <div className="container mx-auto max-w-3xl text-center relative z-10">
          <h2 className="lp-reveal lp-display text-4xl sm:text-6xl mb-6">
            Reprenez le contrôle<br />de votre <span className="text-[hsl(28_92%_56%)]">dépôt.</span>
          </h2>
          <p className="lp-reveal text-base sm:text-lg text-[hsl(40_6%_64%)] mb-10 max-w-xl mx-auto">
            Rejoignez les centres emplisseurs qui ont remplacé leurs classeurs Excel
            par un seul tableau de bord.
          </p>
          <div className="lp-reveal flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={() => setDemoOpen(true)} className="lp-accent-btn gap-2 text-base px-8 h-12 hover:opacity-90">
              Demander une démo <ArrowRight className="h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => setLoginOpen(true)}
              className="gap-2 text-base px-8 h-12 bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white">
              Se connecter
            </Button>
          </div>
        </div>
      </section>

      {/* ===================== FOOTER (sombre) ===================== */}
      <footer className="lp-dark px-4 sm:px-6 py-12 border-t border-[hsl(0_0%_100%/0.09)]">
        <div className="container mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2.5">
            <img src="/images/gp-logo.jpeg" alt="GazPILOTE" className="h-8 w-auto rounded" />
            <span className="font-bold text-lg">GazPILOTE</span>
          </div>
          <p className="text-sm text-[hsl(40_6%_64%)] text-center">
            © {new Date().getFullYear()} GAZPILOT — ERP pour dépôts GPL · Côte d’Ivoire
          </p>
        </div>
      </footer>

      <DemoRequestDialog open={demoOpen} onOpenChange={setDemoOpen} />
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
};

export default Landing;
