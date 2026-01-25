import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  Bot,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Flame,
  GraduationCap,
  Puzzle,
  Sparkles,
  Trophy,
  Users,
  Youtube,
  X,
} from "lucide-react";
import ReviewsMarquee from "../components/ReviewsMarquee";
import pawnPointIcon from "../assets/App tab icon.png";

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
  const [landingFaqOpenIdx, setLandingFaqOpenIdx] = useState<number | null>(0);
  const featuresRef = useRef<HTMLDivElement | null>(null);
  const faqSectionRef = useRef<HTMLDivElement | null>(null);
  const year = useMemo(() => new Date().getFullYear(), []);

  const goToLogin = () => navigate("/login");
  const goToSignup = () => navigate("/signup");
  const goToPricing = () => navigate("/pricing");
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

  const faqItems = useMemo(
    () => [
      {
        question: "What is Pawn Point?",
        answer: "Pawn Point is a premium chess training platform built to help you improve solo or with your friends simultaneously.",
      },
      {
        question: "How does membership work?",
        answer: "Membership unlocks full access to courses, SquareBase, Groups, and rankings with monthly billing.",
      },
      {
        question: "Can I cancel anytime?",
        answer: "Yes. You can cancel in account settings but will lose access upon cancellation.",
      },
      {
        question: "Do you offer group training?",
        answer: "Yes. You can join or create training groups to share curated content and progress together.",
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
      <div className="pp-landing-bg" aria-hidden="true">
        <div className="pp-landing-radial" />
        <div className="pp-landing-dots" />
        <div className="pp-landing-vignette" />
      </div>

      <div className="relative z-10">
      <div
        className={`relative ${
          isLight
            ? "bg-white/90 border-b border-slate-200"
            : "bg-black/30 border-b border-white/5 backdrop-blur-xl"
        }`}
      >
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 h-16 md:h-[72px] grid grid-cols-[1fr_auto] md:grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden flex items-center justify-center">
              <img src={pawnPointIcon} alt="Pawn Point logo" className="h-full w-full object-cover" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight">Pawn Point</span>
          </div>
          <nav
            className={`hidden md:flex items-center gap-6 text-sm font-semibold ${
              isLight ? "text-slate-600" : "text-white/70"
            }`}
          >
            <button
              type="button"
              onClick={scrollToFeatures}
              className={`transition ${isLight ? "hover:text-slate-900" : "hover:text-white"}`}
            >
              Features
            </button>
            <button
              type="button"
              onClick={goToPricing}
              className={`transition ${isLight ? "hover:text-slate-900" : "hover:text-white"}`}
            >
              Pricing
            </button>
            <button
              type="button"
              onClick={scrollToFaqs}
              className={`transition ${isLight ? "hover:text-slate-900" : "hover:text-white"}`}
            >
              FAQs
            </button>
          </nav>
          <div className="flex items-center justify-end gap-2 md:gap-3">
            <button
              onClick={goToLogin}
              className={`hidden sm:inline-flex rounded-full px-3 py-2 text-sm font-semibold border transition ${
                isLight
                  ? "border-slate-200 bg-white text-slate-900 hover:bg-slate-100"
                  : "border-white/10 bg-white/5 text-white hover:bg-white/10"
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
            <h1 className="text-5xl max-[540px]:text-4xl max-[480px]:text-3xl sm:text-6xl md:text-7xl font-semibold leading-tight tracking-tight font-league-spartan whitespace-nowrap">
              <span className="block sm:inline-block">
                <span className="gradient-text">Where Serious Players</span>
              </span>
              <span className="block sm:inline-block sm:ml-2">
                <span className="gradient-text">Get Better</span>
              </span>
            </h1>
            <p
              className={`mt-6 text-base sm:text-lg md:text-xl leading-relaxed md:whitespace-nowrap ${
                isLight ? "text-slate-700" : "text-white/80"
              }`}
            >
              Designed for players who take improvement seriously.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
              <button
                onClick={goToSignup}
                className="w-full sm:w-auto rounded-full bg-white hover:bg-white/90 text-black px-5 py-3 text-sm font-semibold transition"
              >
                Get Started Free
              </button>
              <button
                onClick={goToLogin}
                className={`w-full sm:w-auto rounded-full px-5 py-3 text-sm font-semibold border transition ${
                  isLight
                    ? "border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
                    : "border-white/15 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                I already have an account
              </button>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-[12px] sm:text-[13px] font-league-spartan">
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
                    className={`h-10 w-10 rounded-xl border flex items-center justify-center bg-transparent ${
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
      <section ref={faqSectionRef} className="relative w-full px-4 sm:px-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div>
              <h2 className="text-3xl sm:text-4xl font-semibold text-white font-league-spartan">
                Questions, answered clearly.
              </h2>
            </div>
            <div className="divide-y divide-white/15">
              {faqItems.map((item, idx) => {
                const isOpen = landingFaqOpenIdx === idx;
                return (
                  <div key={item.question} className="py-4">
                    <button
                      type="button"
                      onClick={() => setLandingFaqOpenIdx((prev) => (prev === idx ? null : idx))}
                      className="w-full flex items-center justify-between gap-4 text-left"
                      aria-expanded={isOpen}
                      aria-controls={`landing-faq-${idx}`}
                    >
                      <span className="text-sm sm:text-base font-semibold text-white">
                        {item.question}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-white/70 transition ${isOpen ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      />
                    </button>
                    {isOpen && (
                      <p id={`landing-faq-${idx}`} className="mt-3 text-sm text-white/70">
                        {item.answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
      <div className="w-full px-4 sm:px-6 pb-24">
        <ReviewsMarquee />
      </div>
      <footer
        className={`w-full border-t ${
          isLight ? "border-slate-200 bg-white/90 text-slate-900" : "border-white/10 bg-[#0b0f1c] text-white"
        }`}
      >
        <div className="w-full px-6 sm:px-10 py-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-xl overflow-hidden border ${
                  isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"
                }`}
              >
                <img src={pawnPointIcon} alt="Pawn Point logo" className="h-full w-full object-cover" />
              </div>
              <div className="text-xl font-bold tracking-tight">Pawn Point</div>
            </div>

            <div className="flex flex-wrap gap-5 text-sm font-semibold">
              <a
                href="/checkout"
                className={isLight ? "text-slate-600 hover:text-slate-900" : "text-white/70 hover:text-white"}
              >
                Membership Plans
              </a>
              <button
                type="button"
                onClick={() => {
                  setContactOpen(true);
                  setFaqOpen(false);
                }}
                className={isLight ? "text-slate-600 hover:text-slate-900" : "text-white/70 hover:text-white"}
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
                className={isLight ? "text-slate-600 hover:text-slate-900" : "text-white/70 hover:text-white"}
              >
                FAQ
              </button>
              <a
                href="https://www.youtube.com/@Pawn-Point"
                target="_blank"
                rel="noreferrer"
                aria-label="Pawn Point YouTube"
                className={`inline-flex items-center justify-center ${
                  isLight ? "text-slate-600 hover:text-slate-900" : "text-white/70 hover:text-white"
                }`}
              >
                <Youtube className="h-4 w-4" />
              </a>
            </div>

          </div>

          <div
            className={`mt-6 flex flex-col gap-3 text-xs md:flex-row md:items-center md:justify-between ${
              isLight ? "text-slate-500" : "text-white/60"
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
