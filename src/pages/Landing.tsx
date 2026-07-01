import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  BadgeDollarSign,
  Bot,
  BookOpen,
  CircleHelp,
  Flame,
  GraduationCap,
  Headset,
  Puzzle,
  Sparkles,
  ShieldCheck,
  Trophy,
  Users,
  WalletCards,
  ArrowRight,
  Youtube,
  X,
} from "lucide-react";
import ReviewsMarquee from "../components/ReviewsMarquee";
import FeatureBento from "../components/FeatureBento";
import Globe from "../components/Globe";
import pawnPointIcon from "../assets/App tab icon.png";
import accLogo from "../assets/chess/acc-favicon-512.png";
import chessableLogo from "../assets/chess/chessable-transparent.png";
import chessSaLogo from "../assets/chess/chessa.png";
import ecuLogo from "../assets/chess/ecu-transparent.png";
import fideLogo from "../assets/chess/fide_transparent_512.png";
import lichessLogo from "../assets/chess/lichess-transparent.png";
import pawnLogo from "../assets/chess/chess-pawn-favicon-512.png";
import usChessLogo from "../assets/chess/uschess-transparent.png";

const chessLogos = [
  { src: accLogo, alt: "Chess academy logo" },
  { src: chessableLogo, alt: "Chessable logo" },
  { src: usChessLogo, alt: "US Chess logo" },
  { src: fideLogo, alt: "FIDE logo" },
  { src: chessSaLogo, alt: "Chess SA logo" },
  { src: pawnLogo, alt: "Chess pawn logo" },
  { src: lichessLogo, alt: "Lichess logo", className: "pp-logo-mark-light" },
  { src: ecuLogo, alt: "European Chess Union logo" },
];

const featureCards = [
  {
    title: "AI Guided Training",
    text: "Personalized study plans that target your exact weaknesses.",
    icon: Sparkles,
    tone: "text-pink-400",
  },
  {
    title: "Group-Only Courses",
    text: "Private courses built exclusively for your training group.",
    icon: GraduationCap,
    tone: "text-amber-400",
  },
  {
    title: "SquareBase Library",
    text: "A private chess intelligence hub for study files.",
    icon: BookOpen,
    tone: "text-emerald-400",
  },
  {
    title: "Training Groups",
    text: "A focused space for teammates to share progress together.",
    icon: Users,
    tone: "text-blue-400",
  },
  {
    title: "AI Training Bots",
    text: "Practice sessions powered by our dedicated AI bots.",
    icon: Bot,
    tone: "text-sky-400",
  },
  {
    title: "Puzzles Included",
    text: "Tactical puzzles to enhance in game tactical capabilities.",
    icon: Puzzle,
    tone: "text-rose-400",
  },
  {
    title: "XP Gains",
    text: "Earn XP as you complete your training sessions.",
    icon: Flame,
    tone: "text-orange-400",
  },
  {
    title: "Leaderboards & Ranks",
    text: "Climb ranks and track progress on leaderboards.",
    icon: Trophy,
    tone: "text-violet-400",
  },
];

export default function Landing() {
  const [, navigate] = useLocation();
  const [isLight] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [faqOpenIdx, setFaqOpenIdx] = useState<number | null>(null);
  const featuresRef = useRef<HTMLDivElement | null>(null);
  const faqSectionRef = useRef<HTMLDivElement | null>(null);
  const year = useMemo(() => new Date().getFullYear(), []);

  const goToLogin = () => navigate("/login");
  const goToPricing = () => navigate("/checkout");
  const scrollToFeatures = () => featuresRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const scrollToFaqs = () => faqSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          } else {
            entry.target.classList.remove("visible");
          }
        });
      },
      { threshold: 0.25, rootMargin: "0px 0px -10% 0px" },
    );
    const nodes = document.querySelectorAll<HTMLElement>(".pp-landing .fade-in");
    nodes.forEach((node) => {
      node.classList.remove("visible");
      observer.observe(node);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    let observer: MutationObserver | null = null;

    const styleBubble = () => {
      const bubble = document.querySelector<HTMLElement>(
        'aqx-voice-bubble[campaign-id="2868f229-620f-481b-af01-d0cd99ca97f7"]',
      );
      if (!bubble) return false;
      bubble.style.position = "fixed";
      bubble.style.left = "16px";
      bubble.style.right = "auto";
      bubble.style.bottom = "16px";
      bubble.style.top = "auto";
      bubble.style.zIndex = "60";
      bubble.style.display = "block";
      bubble.style.visibility = "visible";
      bubble.style.opacity = "1";
      return true;
    };

    if (!styleBubble()) {
      observer = new MutationObserver(() => {
        if (styleBubble() && observer) {
          observer.disconnect();
          observer = null;
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-atlas-voice-bubble="true"]');
    const existingBubble = document.querySelector<HTMLElement>(
      'aqx-voice-bubble[campaign-id="2868f229-620f-481b-af01-d0cd99ca97f7"]',
    );
    const createBubble = () => {
      if (cancelled) return;
      const currentBubble = document.querySelector<HTMLElement>(
        'aqx-voice-bubble[campaign-id="2868f229-620f-481b-af01-d0cd99ca97f7"]',
      );
      if (currentBubble) {
        styleBubble();
        return;
      }
      const bubble = document.createElement("aqx-voice-bubble");
      bubble.setAttribute("campaign-id", "2868f229-620f-481b-af01-d0cd99ca97f7");
      bubble.setAttribute("size", "sm");
      document.body.appendChild(bubble);
      styleBubble();
    };

    if (!existingBubble) {
      if (existingScript && customElements.get("aqx-voice-bubble")) {
        createBubble();
      } else {
        const script = existingScript || document.createElement("script");
        if (!existingScript) {
          script.src = "https://cdn.youratlas.com/scripts/aqx-voice-bubble.prod.min.js";
          script.async = true;
          script.dataset.atlasVoiceBubble = "true";
          script.onload = createBubble;
          document.head.appendChild(script);
        } else {
          script.addEventListener("load", createBubble, { once: true });
        }
      }
    } else {
      styleBubble();
    }

    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
    };
  }, []);

  const faqItems = useMemo(
    () => [
      {
        icon: CircleHelp,
        question: "What is Pawn Point?",
        answer: "Pawn Point is a premium chess training platform built to help you improve solo or alongside your group with focused study tools.",
      },
      {
        icon: WalletCards,
        question: "How does membership work?",
        answer: "Membership unlocks full access to courses, SquareBase, training groups, rankings, and the rest of the platform with monthly billing.",
      },
      {
        icon: ShieldCheck,
        question: "Can I cancel anytime?",
        answer: "Yes. You can cancel from account settings at any time.",
      },
      {
        icon: Users,
        question: "Do you offer group training?",
        answer: "Yes. You can join or create private training groups to share curated material, track progress, and improve together.",
      },
      {
        icon: BadgeDollarSign,
        question: "How much does Pawn Point Pro cost?",
        answer: "The current plan is $25 per month. Visit the checkout page for the latest pricing.",
      },
      {
        icon: Headset,
        question: "How can I reach support?",
        answer: "Use the contact option on the site and we will help with billing, access, or any other question about your account.",
      },
    ],
    [],
  );

  return (
    <div
      className={`pp-landing min-h-screen relative overflow-hidden ${
        isLight ? "bg-[#f7f7fb] text-slate-900" : "bg-[#050608] text-white"
      }`}
    >
      <div className="pp-landing-bg fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="pp-grid-base" />
        <div className="pp-grid-layer pp-grid-layer-primary" />
        <div className="pp-grid-layer pp-grid-layer-secondary" />
        <div className="pp-grid-vignette" />
      </div>

      <div className="relative z-10">
      <div className="fixed inset-x-0 top-0 z-40 px-4 pt-4 sm:px-6">
        <div
          className={`mx-auto grid h-16 w-full max-w-6xl grid-cols-[1fr_auto] items-center gap-4 rounded-[22px] border px-4 sm:px-5 md:h-[72px] md:grid-cols-[1fr_auto_1fr] ${
            isLight
              ? "border-slate-300/80 bg-white/80 text-slate-900"
              : "border-white/14 bg-black/12 text-white backdrop-blur-xl"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-white/12">
              <img src={pawnPointIcon} alt="Pawn Point logo" className="h-full w-full object-cover" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight">Pawn Point</span>
          </div>
          <div className="hidden md:flex items-center gap-3 text-sm font-semibold">
            <div className="inline-flex items-center gap-1 rounded-full px-1 py-1">
              <button
                type="button"
                onClick={scrollToFeatures}
                className={`rounded-full px-4 py-1.5 transition ${isLight ? "text-slate-700 hover:text-slate-900 hover:bg-black/5" : "text-white/90 hover:text-white hover:bg-white/10"}`}
              >
                Features
              </button>
              <button
                type="button"
                onClick={goToPricing}
                className={`rounded-full px-4 py-1.5 transition ${isLight ? "text-slate-700 hover:text-slate-900 hover:bg-black/5" : "text-white/90 hover:text-white hover:bg-white/10"}`}
              >
                Pricing
              </button>
              <button
                type="button"
                onClick={scrollToFaqs}
                className={`rounded-full px-4 py-1.5 transition ${isLight ? "text-slate-700 hover:text-slate-900 hover:bg-black/5" : "text-white/90 hover:text-white hover:bg-white/10"}`}
              >
                FAQs
              </button>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 md:gap-3">
            <button
              onClick={goToLogin}
              className={`hidden rounded-xl px-3 py-2 text-sm font-semibold transition sm:inline-flex ${
                isLight ? "bg-white text-slate-900 hover:bg-slate-100" : "bg-white text-black hover:bg-white/90"
              }`}
            >
              Log in
            </button>
          </div>
        </div>
      </div>

      <main className="pp-hero-shell relative max-w-6xl w-full mx-auto px-4 sm:px-6">
        <section className="pp-hero-copy w-full flex flex-col items-center text-center">
          <div className="w-full max-w-6xl">
            <h1 className="pp-hero-title fade-in">
              <span className="pp-hero-title-script">Master the game.</span>
              <span className="pp-hero-title-solid">Measure the progress.</span>
            </h1>
            <p
              className={`fade-in delay-1 mx-auto mt-5 max-w-2xl text-sm leading-7 sm:text-base ${
                isLight ? "text-slate-700" : "text-white/78"
              }`}
            >
              All-in-one chess training platform built to help players improve faster, track progress, and train with purpose.
            </p>
            <div className="mt-8 fade-in delay-2 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                onClick={goToLogin}
                className="rounded-xl bg-[#f4f1ea] px-5 py-3 text-sm font-semibold text-[#181713] shadow-[0_18px_45px_rgba(255,255,255,0.08)] transition hover:bg-white"
              >
                Get started
              </button>
              <button
                onClick={scrollToFeatures}
                className="rounded-xl border border-white/16 bg-black/20 px-5 py-3 text-sm font-semibold text-white/86 transition hover:border-white/28 hover:bg-white/8 hover:text-white"
              >
                Learn more
              </button>
            </div>
          </div>
        </section>
        <section className="pp-logo-carousel" aria-label="Chess organization logos">
          <div className="pp-logo-carousel-track">
            {[...chessLogos, ...chessLogos].map((logo, idx) => (
              <div className="pp-logo-carousel-item" key={`${logo.alt}-${idx}`} aria-hidden={idx >= chessLogos.length}>
                <img className={logo.className} src={logo.src} alt={idx < chessLogos.length ? logo.alt : ""} />
              </div>
            ))}
          </div>
        </section>
      </main>
      <section ref={featuresRef} className="relative w-full px-4 sm:px-6 pt-[7.5rem] pb-20">
        <FeatureBento />
        <div className="hidden max-w-6xl mx-auto">
          <div className="text-center pb-10 sm:pb-12 fade-in">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em] ${
                isLight ? "border-slate-200 text-slate-600" : "border-white/15 text-white/70"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isLight ? "bg-pink-500" : "bg-pink-300"}`} />
              Our Features
            </div>
            <div className="mt-4 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
              Your complete chess training ecosystem.
            </div>
            <p className={`mt-3 text-base sm:text-lg ${isLight ? "text-slate-600" : "text-white/70"}`}>
              Everything you need to train smarter — courses, SquareBase, puzzles, AI bots, and group training working as one.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featureCards.map((feature, idx) => {
              const Icon = feature.icon;
              const delayClass = idx % 3 === 1 ? "delay-1" : idx % 3 === 2 ? "delay-2" : "";
              return (
                <div
                  key={feature.title}
                  className={`fade-in ${delayClass} rounded-2xl border p-5 text-left bg-transparent transition ${
                    isLight
                      ? "border-slate-200 text-slate-900 hover:border-slate-300"
                      : "border-white/10 text-white hover:border-white/30"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border bg-transparent ${
                      isLight ? "border-slate-200" : "border-white/10"
                    } ${feature.tone}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="mt-4 text-base font-semibold">{feature.title}</div>
                  <p className={`mt-2 text-sm leading-relaxed ${isLight ? "text-slate-600" : "text-white/70"}`}>
                    {feature.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <section className="relative w-full px-4 py-24 sm:px-6">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="fade-in max-w-xl">
            <h2 className="whitespace-nowrap text-[clamp(1.45rem,5vw,3.5rem)] font-semibold tracking-tight text-white">
              Users Across the globe
            </h2>
            <p className="mt-5 text-sm leading-7 text-white/68 sm:text-base">
              A focused training network for serious players, clubs, and coaches. Pawn Point connects improvement, progress, and competition into one shared chess ecosystem.
            </p>
          </div>

          <div className="fade-in delay-1 flex justify-center lg:justify-end">
            <div className="h-[340px] w-full max-w-[560px] sm:h-[460px] lg:h-[540px]" aria-hidden="true">
              <Globe />
            </div>
          </div>
        </div>
      </section>
      <section ref={faqSectionRef} className="relative w-full px-4 sm:px-6 pb-24">
        <div className="mx-auto max-w-6xl px-1 py-2 text-white sm:px-0">
          <div className="fade-in">
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
              Here are the most asked questions based from our users.
            </p>
          </div>

          <div className="mt-12 grid gap-x-8 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
            {faqItems.map((item, idx) => {
              const Icon = item.icon;
              const delayClass = idx % 3 === 1 ? "delay-1" : idx % 3 === 2 ? "delay-2" : "";

              return (
                <article
                  key={item.question}
                  className={`fade-in ${delayClass} rounded-2xl border border-white/10 bg-transparent p-5 transition hover:border-white/20`}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/90">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight text-white">
                    {item.question}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-white/65 sm:text-[15px]">
                    {item.answer}
                  </p>
                </article>
              );
            })}
          </div>

          <div className="hidden fade-in delay-2 mt-12 rounded-[30px] border border-white/10 bg-white/[0.03] px-6 py-8 text-center shadow-[0_20px_50px_rgba(0,0,0,0.18)] sm:px-8 sm:py-10">
            <h3 className="text-2xl font-semibold tracking-tight text-white">
              Book a demo
            </h3>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
              Schedule a conversation with the Pawn Point team
            </p>
            <button
              type="button"
              onClick={() => {
                setContactOpen(true);
                setFaqOpen(false);
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black shadow-[0_14px_30px_rgba(255,255,255,0.12)] transition hover:bg-white/90"
            >
              Book a Demo
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
      <div className="relative w-screen left-1/2 -translate-x-1/2 pb-24">
        <ReviewsMarquee />
      </div>
      <footer className={`relative w-full overflow-hidden ${isLight ? "text-slate-900" : "text-white"}`}>
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 h-px ${
            isLight
              ? "bg-gradient-to-r from-transparent via-slate-300/90 to-transparent"
              : "bg-gradient-to-r from-transparent via-white/18 to-transparent"
          }`}
        />
        <div className="w-full px-6 sm:px-10 py-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3 drop-shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <div className="h-10 w-10 overflow-hidden rounded-xl">
                <img src={pawnPointIcon} alt="Pawn Point logo" className="h-full w-full object-cover" />
              </div>
              <div className="text-xl font-bold tracking-tight">Pawn Point</div>
            </div>

            <div className="flex flex-wrap gap-5 text-sm font-semibold">
              <a
                href="/checkout"
                className={`transition ${isLight ? "text-slate-600 hover:text-slate-900" : "text-white/72 hover:text-white"}`}
              >
                Membership Plans
              </a>
              <button
                type="button"
                onClick={() => {
                  setContactOpen(true);
                  setFaqOpen(false);
                }}
                className={`transition ${isLight ? "text-slate-600 hover:text-slate-900" : "text-white/72 hover:text-white"}`}
              >
                Contact Us
              </button>
              <button
                type="button"
                onClick={() => {
                  setFaqOpen(true);
                  setFaqOpenIdx(null);
                  setContactOpen(false);
                }}
                className={`transition ${isLight ? "text-slate-600 hover:text-slate-900" : "text-white/72 hover:text-white"}`}
              >
                FAQ
              </button>
              <a
                href="https://www.youtube.com/@Pawn-Point"
                target="_blank"
                rel="noreferrer"
                aria-label="Pawn Point YouTube"
                className={`inline-flex items-center justify-center transition ${
                  isLight ? "text-slate-600 hover:text-slate-900" : "text-white/72 hover:text-white"
                }`}
              >
                <Youtube className="h-4 w-4" />
              </a>
            </div>

          </div>

          <div
            className={`mt-6 flex flex-col gap-3 text-xs md:flex-row md:items-center md:justify-between ${
              isLight ? "text-slate-500" : "text-white/58"
            }`}
          >
            <div>(c) {year} Pawn Point. All rights reserved.</div>
            <div className="flex flex-wrap gap-4">
              <a
                href="/terms-of-use"
                className={isLight ? "hover:text-slate-800" : "hover:text-white"}
              >
                Terms of Use
              </a>
              <a
                href="/privacy-policy"
                className={isLight ? "hover:text-slate-800" : "hover:text-white"}
              >
                Privacy
              </a>
              <a
                href="/cookie-policy"
                className={isLight ? "hover:text-slate-800" : "hover:text-white"}
              >
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
      </div>
      {contactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setContactOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            className={`relative z-10 w-full max-w-md rounded-2xl border p-6 shadow-2xl ${
              isLight ? "bg-white text-slate-900 border-slate-200" : "bg-[#111827] text-white border-white/10"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="text-lg font-semibold">Contact Us</div>
              <button
                type="button"
                onClick={() => setContactOpen(false)}
                className={isLight ? "text-slate-600 hover:text-slate-900" : "text-white/70 hover:text-white"}
                aria-label="Close contact dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className={`mt-3 text-sm ${isLight ? "text-slate-600" : "text-white/70"}`}>
              Please contact officialpawnpoint@gmail.com
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setContactOpen(false)}
                className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  isLight
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "bg-white text-black hover:bg-white/90"
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {faqOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setFaqOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            className={`relative z-10 w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${
              isLight ? "bg-white text-slate-900 border-slate-200" : "bg-[#111827] text-white border-white/10"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="text-lg font-semibold">FAQ</div>
              <button
                type="button"
                onClick={() => setFaqOpen(false)}
                className={isLight ? "text-slate-600 hover:text-slate-900" : "text-white/70 hover:text-white"}
                aria-label="Close FAQ dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {faqItems.map((item, idx) => {
                const isOpen = faqOpenIdx === idx;
                return (
                  <div
                    key={item.question}
                    className={`rounded-xl border px-4 py-3 ${
                      isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-white/5"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setFaqOpenIdx((prev) => (prev === idx ? null : idx))}
                      className="w-full flex items-center justify-between gap-4 text-left"
                    >
                      <span className="font-semibold">{item.question}</span>
                      <span className={`text-lg ${isLight ? "text-slate-500" : "text-white/70"}`}>
                        {isOpen ? "-" : "+"}
                      </span>
                    </button>
                    {isOpen && (
                      <p className={`mt-3 text-sm ${isLight ? "text-slate-600" : "text-white/70"}`}>
                        {item.answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setFaqOpen(false)}
                className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  isLight
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "bg-white text-black hover:bg-white/90"
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
