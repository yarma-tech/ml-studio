"use client";

import Link from "next/link";
import { useRef, useEffect, useState, type ReactNode } from "react";

/* ═══════════════════════════════════════════
   SCROLL-REVEAL WRAPPER
   ═══════════════════════════════════════════ */

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════
   HERO — APP PREVIEW MOCKUP
   ═══════════════════════════════════════════ */

const STEPS = ["Charger", "Explorer", "Cible", "Préparer", "Entraîner", "Résultats"];
const MODELS = [
  { name: "Random Forest", value: 94, color: "bg-rose-400" },
  { name: "Gradient Boost", value: 91, color: "bg-amber-400" },
  { name: "SVM", value: 87, color: "bg-violet-400" },
  { name: "Logistic Reg.", value: 83, color: "bg-sky-400" },
];

function AppPreview() {
  return (
    <div className="relative">
      {/* Desktop browser mockup */}
      <div
        className="rounded-2xl overflow-hidden bg-white border border-white/80"
        style={{
          transform: "perspective(2400px) rotateY(-6deg) rotateX(3deg)",
          boxShadow:
            "0 50px 100px -20px rgba(0,0,0,0.10), 0 30px 60px -30px rgba(0,0,0,0.08)",
        }}
      >
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50/80 border-b border-gray-100">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-300" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
          </div>
          <div className="flex-1 text-center">
            <span className="text-[10px] text-gray-400 bg-white px-4 py-0.5 rounded-md border border-gray-100 inline-block">
              ml-studio.app/studio
            </span>
          </div>
        </div>

        {/* App content */}
        <div className="p-5 space-y-4">
          {/* Stepper */}
          <div className="flex gap-1.5 overflow-hidden">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={`text-[9px] px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${
                  i === 5
                    ? "bg-rose-50 text-rose-600"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {s}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-3">
            {/* Chart area */}
            <div className="col-span-3 border border-gray-100 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-gray-500 mb-3">
                Performance des modèles
              </p>
              <div className="space-y-2">
                {MODELS.map((m) => (
                  <div key={m.name} className="flex items-center gap-2">
                    <span className="text-[8px] text-gray-400 w-16 text-right truncate">
                      {m.name}
                    </span>
                    <div className="flex-1 bg-gray-50 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${m.color}`}
                        style={{ width: `${m.value}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-bold text-gray-600 w-7">
                      {m.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Best model card */}
            <div className="col-span-2 border border-gray-100 rounded-xl p-3 flex flex-col items-center justify-center text-center">
              <p className="text-[9px] text-gray-400 mb-1">Meilleur modèle</p>
              <span className="text-2xl mb-1">🏆</span>
              <p className="text-[10px] font-bold text-gray-800">Random Forest</p>
              <p className="text-[9px] text-emerald-500 font-semibold">
                94.2% accuracy
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile mockup — overlapping */}
      <div
        className="absolute -bottom-6 -right-4 w-36 rounded-2xl overflow-hidden bg-white border border-white/80 hidden md:block"
        style={{
          transform: "perspective(2400px) rotateY(5deg)",
          boxShadow: "0 30px 60px -15px rgba(0,0,0,0.12)",
        }}
      >
        <div className="px-3 py-2 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
          <span className="text-[8px] font-bold text-gray-700">ML Studio</span>
          <span className="text-[8px] text-gray-400">☰</span>
        </div>
        <div className="p-3">
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
            <span className="text-xl block mb-1">📁</span>
            <span className="text-[7px] text-gray-400">Glisser un fichier</span>
          </div>
          <div className="mt-2 space-y-1">
            <div className="bg-gray-50 rounded h-1.5 w-full" />
            <div className="bg-gray-50 rounded h-1.5 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   GRADIENT MESH BACKGROUND (reusable)
   ═══════════════════════════════════════════ */

const MESH_GRADIENT = `
  radial-gradient(ellipse 80% 50% at 20% 40%, rgba(255,176,136,0.35) 0%, transparent 70%),
  radial-gradient(ellipse 60% 80% at 80% 30%, rgba(255,143,171,0.30) 0%, transparent 70%),
  radial-gradient(ellipse 50% 60% at 50% 80%, rgba(196,181,253,0.20) 0%, transparent 70%),
  linear-gradient(180deg, #FFF8F5 0%, #FFF0EE 50%, #F8F0FF 100%)
`;

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

/* ═══════════════════════════════════════════
   FEATURES DATA
   ═══════════════════════════════════════════ */

const FEATURES: {
  icon: string;
  title: string;
  desc: string;
  span: string;
  gradient: string;
  border: string;
  visual?: ReactNode;
}[] = [
  {
    icon: "📁",
    title: "Upload intelligent",
    desc: "Glissez-déposez vos fichiers CSV ou Excel. Détection automatique des types de colonnes et aperçu instantané.",
    span: "col-span-6 md:col-span-4",
    gradient: "from-orange-50 to-amber-50",
    border: "border-orange-100/50",
    visual: (
      <div className="hidden md:block ml-8 mt-2">
        <div className="w-32 border-2 border-dashed border-orange-200 rounded-xl p-4 text-center bg-white/50">
          <span className="text-2xl block mb-1">📊</span>
          <span className="text-[10px] text-gray-400">data.csv</span>
          <div className="mt-2 h-1.5 bg-orange-100 rounded-full overflow-hidden">
            <div className="h-full w-3/4 bg-orange-400 rounded-full" />
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: "🔍",
    title: "Exploration visuelle",
    desc: "Statistiques, distributions et corrélations en un coup d'oeil.",
    span: "col-span-6 md:col-span-2",
    gradient: "from-sky-50 to-blue-50",
    border: "border-sky-100/50",
    visual: (
      <div className="flex items-end gap-1 mt-4 h-12">
        {[40, 65, 55, 80, 45, 70, 60].map((h, i) => (
          <div
            key={i}
            className="flex-1 bg-sky-200 rounded-t transition-all hover:bg-sky-300"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    ),
  },
  {
    icon: "🎯",
    title: "Sélection guidée",
    desc: "L'IA vous aide à choisir vos features et votre variable cible.",
    span: "col-span-6 md:col-span-2",
    gradient: "from-emerald-50 to-green-50",
    border: "border-emerald-100/50",
  },
  {
    icon: "🚀",
    title: "Entraînement multi-modèles",
    desc: "Comparez Random Forest, SVM, Gradient Boosting et plus. Hyperparameter tuning en un clic.",
    span: "col-span-6 md:col-span-4",
    gradient: "from-violet-50 to-purple-50",
    border: "border-violet-100/50",
    visual: (
      <div className="hidden md:block ml-8 space-y-1.5 mt-2">
        {["Random Forest", "SVM", "Gradient Boosting"].map((m) => (
          <div
            key={m}
            className="bg-white/70 rounded-lg px-3 py-1.5 text-[10px] font-medium text-gray-600 flex items-center gap-2"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
            {m}
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: "⚙️",
    title: "Préparation automatique",
    desc: "Gestion des valeurs manquantes, encodage et normalisation en automatique.",
    span: "col-span-6 md:col-span-3",
    gradient: "from-amber-50 to-yellow-50",
    border: "border-amber-100/50",
  },
  {
    icon: "📊",
    title: "Résultats détaillés",
    desc: "Métriques, matrices de confusion, importance des features et export de modèles.",
    span: "col-span-6 md:col-span-3",
    gradient: "from-rose-50 to-pink-50",
    border: "border-rose-100/50",
  },
];

/* ═══════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════ */

export default function Home() {
  return (
    <div className="bg-white min-h-screen text-gray-900 overflow-hidden">
      {/* ─── NAVIGATION ─── */}
      <nav className="relative z-10 max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🧠</span>
          <span className="font-heading font-bold text-lg tracking-tight">
            ML Studio
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm text-gray-500 font-medium">
          <a
            href="#features"
            className="hover:text-gray-900 transition-colors"
          >
            Fonctionnalités
          </a>
          <a href="#how" className="hover:text-gray-900 transition-colors">
            Comment ça marche
          </a>
          <a href="#" className="hover:text-gray-900 transition-colors">
            Contact
          </a>
        </div>

        <Link
          href="/studio"
          className="bg-gray-900 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-gray-800 transition-colors"
        >
          Commencer
        </Link>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative px-4 lg:px-8 pt-4 pb-24">
        <div
          className="max-w-7xl mx-auto rounded-[2.5rem] overflow-hidden relative"
          style={{ background: MESH_GRADIENT }}
        >
          {/* Grain texture overlay */}
          <div
            className="absolute inset-0 opacity-[0.025] pointer-events-none"
            style={{ backgroundImage: NOISE_SVG }}
          />

          <div className="relative px-8 lg:px-16 py-20 lg:py-28">
            <div className="grid lg:grid-cols-2 gap-16 lg:gap-8 items-center">
              {/* Left column — Text */}
              <div>
                {/* Announcement badge */}
                <div className="animate-[fadeUp_0.6s_ease-out_both] inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm border border-white/80 rounded-full px-4 py-1.5 text-xs font-medium text-gray-600 mb-8 shadow-sm">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  Nouveau : description des colonnes par IA
                </div>

                {/* Main heading */}
                <h1 className="animate-[fadeUp_0.6s_ease-out_0.1s_both] font-heading text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-[1.05] tracking-tight text-gray-900">
                  Entraînez vos modèles{" "}
                  <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 bg-clip-text text-transparent">
                    en quelques clics
                  </span>
                </h1>

                {/* Subtitle */}
                <p className="animate-[fadeUp_0.6s_ease-out_0.2s_both] mt-6 text-lg text-gray-500 leading-relaxed max-w-lg">
                  La plateforme no-code pour apprendre le Machine Learning.
                  Uploadez vos données, explorez, entraînez et comparez — sans
                  écrire une seule ligne de code.
                </p>

                {/* CTA buttons */}
                <div className="animate-[fadeUp_0.6s_ease-out_0.3s_both] mt-8 flex flex-wrap gap-4">
                  <Link
                    href="/studio"
                    className="group bg-gray-900 text-white px-7 py-3.5 rounded-full text-sm font-semibold hover:bg-gray-800 transition-all hover:shadow-lg hover:shadow-gray-900/20"
                  >
                    Commencer gratuitement
                    <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </Link>
                  <a
                    href="#how"
                    className="px-7 py-3.5 rounded-full text-sm font-semibold border border-gray-300/60 bg-white/50 backdrop-blur-sm text-gray-700 hover:bg-white transition-all"
                  >
                    Voir comment ça marche
                  </a>
                </div>
              </div>

              {/* Right column — Mockup */}
              <div className="animate-[fadeUp_0.8s_ease-out_0.4s_both] relative lg:pl-8">
                <AppPreview />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TRUST BAR ─── */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <Reveal>
          <p className="text-center text-xs font-medium text-gray-400 uppercase tracking-widest mb-8">
            Utilisé par les étudiants de
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-4">
            {[
              "HEC Montréal",
              "Polytechnique",
              "UQAM",
              "McGill",
              "Université Laval",
            ].map((name) => (
              <span
                key={name}
                className="text-gray-300 font-heading font-bold text-lg tracking-tight select-none"
              >
                {name}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ─── FEATURES BENTO GRID ─── */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <Reveal>
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-rose-500 uppercase tracking-widest mb-3">
              Fonctionnalités
            </p>
            <h2 className="font-heading text-4xl lg:text-5xl font-extrabold tracking-tight">
              Tout ce qu&apos;il faut pour
              <br />
              apprendre le ML
            </h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-6 gap-4">
          {FEATURES.map((f, i) => (
            <Reveal
              key={f.title}
              className={`${f.span} bg-gradient-to-br ${f.gradient} rounded-2xl p-8 border ${f.border} hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300`}
              delay={i * 80}
            >
              <div className={f.visual ? "flex items-start justify-between" : ""}>
                <div>
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-lg shadow-sm mb-4">
                    {f.icon}
                  </div>
                  <h3 className="font-heading font-bold text-xl mb-2">
                    {f.title}
                  </h3>
                  <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
                    {f.desc}
                  </p>
                </div>
                {f.visual}
              </div>
              {/* Visual without flex parent */}
              {!f.visual ? null : null}
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how" className="py-24 bg-gray-50/50">
        <div className="max-w-5xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-xs font-semibold text-rose-500 uppercase tracking-widest mb-3">
                Comment ça marche
              </p>
              <h2 className="font-heading text-4xl lg:text-5xl font-extrabold tracking-tight">
                3 étapes, zéro code
              </h2>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                num: "01",
                icon: "📁",
                title: "Uploadez",
                desc: "Glissez votre fichier CSV ou Excel. Nous détectons automatiquement les types de colonnes et les données manquantes.",
              },
              {
                num: "02",
                icon: "⚙️",
                title: "Configurez",
                desc: "Choisissez votre variable cible, sélectionnez vos features et lancez l'entraînement de plusieurs modèles en parallèle.",
              },
              {
                num: "03",
                icon: "📊",
                title: "Comparez",
                desc: "Visualisez les performances, explorez les métriques détaillées et exportez le meilleur modèle.",
              },
            ].map((step, i) => (
              <Reveal key={step.num} delay={i * 150}>
                <div className="relative bg-white rounded-2xl p-8 border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all duration-300 h-full">
                  <span className="font-heading text-5xl font-extrabold text-gray-100 select-none">
                    {step.num}
                  </span>
                  <span className="text-2xl block mt-4 mb-3">{step.icon}</span>
                  <h3 className="font-heading font-bold text-xl mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── STATS ─── */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6">
          <Reveal>
            <div className="grid grid-cols-3 gap-8 text-center">
              {[
                { value: "6+", label: "Algorithmes disponibles" },
                { value: "0", label: "Lignes de code requises" },
                { value: "<5 min", label: "Pour vos premiers résultats" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="font-heading text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-rose-500 to-violet-500 bg-clip-text text-transparent">
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">{stat.label}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="px-4 lg:px-8 pb-24">
        <Reveal>
          <div
            className="max-w-5xl mx-auto rounded-[2rem] overflow-hidden relative py-20 px-8 text-center"
            style={{ background: MESH_GRADIENT }}
          >
            <div
              className="absolute inset-0 opacity-[0.025] pointer-events-none"
              style={{ backgroundImage: NOISE_SVG }}
            />
            <div className="relative">
              <h2 className="font-heading text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
                Prêt à entraîner votre
                <br />
                premier modèle ?
              </h2>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                Commencez en quelques secondes. Aucune installation,
                aucune inscription requise.
              </p>
              <Link
                href="/studio"
                className="group inline-flex items-center bg-gray-900 text-white px-8 py-4 rounded-full text-sm font-semibold hover:bg-gray-800 transition-all hover:shadow-lg hover:shadow-gray-900/20"
              >
                Commencer maintenant
                <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-gray-100 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="text-lg">🧠</span>
                <span className="font-heading font-bold text-lg tracking-tight">
                  ML Studio
                </span>
              </div>
              <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
                Plateforme no-code de Machine Learning pour les étudiants.
              </p>
            </div>

            <div className="flex gap-16 text-sm">
              <div>
                <p className="font-semibold text-gray-900 mb-3">Produit</p>
                <div className="space-y-2 text-gray-500">
                  <p>
                    <Link
                      href="/studio"
                      className="hover:text-gray-900 transition-colors"
                    >
                      Studio
                    </Link>
                  </p>
                  <p>
                    <a
                      href="#features"
                      className="hover:text-gray-900 transition-colors"
                    >
                      Fonctionnalités
                    </a>
                  </p>
                </div>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-3">Ressources</p>
                <div className="space-y-2 text-gray-500">
                  <p>
                    <a
                      href="#how"
                      className="hover:text-gray-900 transition-colors"
                    >
                      Comment ça marche
                    </a>
                  </p>
                  <p>
                    <a
                      href="#"
                      className="hover:text-gray-900 transition-colors"
                    >
                      Contact
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
            © {new Date().getFullYear()} ML Studio. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
}
