import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  BadgeDollarSign,
  Bot,
  BookOpen,
  CircleHelp,
  CheckCircle2,
  ChevronDown,
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
import BlurText from "../components/BlurText";
import Aurora from "../components/Aurora";
import pawnPointIcon from "../assets/App tab icon.png";
import pawnPointAdVideo from "../assets/PawnPointAD.mp4";

const heroHighlights = [
  "No credit card required",
  "Start in minutes",
  "Built for serious players",
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
  const landingVideoRef = useRef<HTMLVideoElement | null>(null);
  const year = useMemo(() => new Date().getFullYear(), []);

  const goToLogin = () => navigate("/login");
  const goToSignup = () => navigate("/signup");
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
    const video = landingVideoRef.current;
    if (!video) return;

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
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
      <div className="pp-landing-bg absolute inset-x-0 top-0 h-screen pointer-events-none" aria-hidden="true">
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
          <Aurora colorStops={["#5227FF", "#7cff67", "#5227FF"]} amplitude={1} blend={0.5} />
        </div>
        <div className="pp-landing-radial" />
        <div className="pp-landing-dots" />
        <div className="pp-landing-vignette" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#050608]" />
      </div>

      <div className="relative z-10">
      <div className="relative px-4 pt-4 sm:px-6">
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
              className={`hidden rounded-full px-3 py-2 text-sm font-semibold transition sm:inline-flex ${
                isLight ? "text-slate-900 hover:bg-black/5" : "text-white/95 hover:text-white hover:bg-white/8"
              }`}
            >
              Log in
            </button>
            <button
              onClick={goToSignup}
              className={`rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition ${
                isLight
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "bg-white text-black hover:bg-white/90"
              }`}
            >
              Get Started Free
            </button>
          </div>
        </div>
      </div>

      <main className="relative max-w-6xl w-full mx-auto px-4 sm:px-6 pb-20 pt-12 sm:pt-16 min-h-[calc(100vh-72px)] flex items-center">
        <section className="w-full flex flex-col items-center text-center">
          <div className="w-full max-w-5xl">
            <BlurText
              text="Where Serious Players Get Better"
              delay={100}
              className="mx-auto text-4xl max-[540px]:text-3xl max-[480px]:max-w-[10ch] max-[480px]:text-[1.75rem] sm:text-5xl md:text-6xl font-semibold leading-[0.95] tracking-tight"
              direction="top"
              threshold={0.1}
              stepDuration={0.35}
            />
            <BlurText
              text="Designed for players who take improvement seriously."
              delay={50}
              className={`mt-6 text-base sm:text-lg md:text-xl leading-relaxed block ${
                isLight ? "text-slate-700" : "text-white/80"
              }`}
              direction="top"
              threshold={0.1}
              stepDuration={0.35}
            />
            <div className="mt-8 fade-in flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
              <button
                onClick={goToSignup}
                className="w-full sm:w-auto rounded-full bg-white hover:bg-white/90 text-black px-5 py-3 text-sm font-semibold transition"
              >
                Get Started Free
              </button>
              <div className="block w-full rounded-full border border-white/12 bg-white/4 backdrop-blur-sm sm:inline-flex sm:w-auto">
                <button
                  onClick={goToLogin}
                  className={`block w-full rounded-full px-5 py-3 text-center text-sm font-semibold leading-tight transition ${
                    isLight ? "text-slate-900 hover:bg-black/5" : "text-white/95 hover:text-white hover:bg-white/10"
                  }`}
                >
                  I already have an account
                </button>
              </div>
            </div>
            <div className="mt-5 fade-in flex flex-wrap items-center justify-center gap-4 text-[12px] sm:text-[13px] font-league-spartan">
              {heroHighlights.map((item) => (
                <div key={item} className="flex items-center gap-2 text-white/65">
                  <CheckCircle2
                    className="h-3.5 w-3.5 text-emerald-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.75)]"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-col items-center">
              <div className="h-px w-24 bg-white/15" />
              <ChevronDown className="mt-4 h-5 w-5 text-white/50 animate-bounce" aria-hidden="true" />
            </div>
          </div>
        </section>
      </main>
      <section ref={featuresRef} className="relative w-full px-4 sm:px-6 pb-20">
        <div className="max-w-6xl mx-auto">
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
      <section className="relative w-full px-4 sm:px-6 pb-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="fade-in text-center text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
            See Pawn Point in motion.
          </h2>
          <div className="fade-in mt-8 overflow-hidden rounded-[30px] border border-white/10 bg-black/30 shadow-[0_30px_120px_rgba(0,0,0,0.4)] backdrop-blur-sm">
            <div className="relative">
              <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_48%)]" />
              <video
                ref={landingVideoRef}
                src={pawnPointAdVideo}
                className="aspect-video w-full bg-black object-cover"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
              />
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

          <div className="fade-in delay-2 mt-12 rounded-[30px] border border-white/10 bg-white/[0.03] px-6 py-8 text-center shadow-[0_20px_50px_rgba(0,0,0,0.18)] sm:px-8 sm:py-10">
            <h3 className="text-2xl font-semibold tracking-tight text-white">
              Get in touch
            </h3>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
              Why not send us a message
            </p>
            <button
              type="button"
              onClick={() => {
                setContactOpen(true);
                setFaqOpen(false);
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black shadow-[0_14px_30px_rgba(255,255,255,0.12)] transition hover:bg-white/90"
            >
              Get In Touch
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
