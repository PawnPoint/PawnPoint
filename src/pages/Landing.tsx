import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { BookOpen, CheckCircle2, Moon, Sparkles, Sun, Users, X } from "lucide-react";
import ReviewsMarquee from "../components/ReviewsMarquee";
import pawnPointIcon from "../assets/App tab icon.png";
import courseIcon from "../assets/Icon.png";
import squarebaseIcon from "../assets/Icon 2.png";
import groupsIcon from "../assets/Icon 3.png";

const heroHighlights = [
  "No credit card required",
  "Start in minutes",
  "Built for serious players",
];

const heroCards = [
  {
    key: "ai",
    title: "AI Guided Training",
    text: "Personalized drills that target your exact weaknesses.",
    icon: Sparkles,
  },
  {
    key: "ranks",
    title: "Training Groups",
    text: "Collaborate with teammates and track shared progress.",
    icon: Users,
  },
  {
    key: "squarebase",
    title: "SquareBase Library",
    text: "A Private Chess Intelligence hub for your study.",
    icon: BookOpen,
  },
];

const pricingFeatures = [
  "Unlimited Courses",
  "Our AI bots",
  "XP Gains",
  "Leaderboards and Ranks",
  "SquareBase",
  "Groups",
];

export default function Landing() {
  const [, navigate] = useLocation();
  const [isLight, setIsLight] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [faqOpenIdx, setFaqOpenIdx] = useState<number | null>(null);
  const featuresRef = useRef<HTMLDivElement | null>(null);
  const pricingRef = useRef<HTMLDivElement | null>(null);
  const year = useMemo(() => new Date().getFullYear(), []);

  const toggleTheme = () => setIsLight((prev) => !prev);
  const goToCourses = () => navigate("/courses");
  const goToLogin = () => navigate("/login");
  const goToSignup = () => navigate("/signup");
  const scrollToFeatures = () => featuresRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const scrollToPricing = () => pricingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

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
        answer: "Pawn Point is a premium chess training platform built to help you improve with clear daily structure.",
      },
      {
        question: "How does membership work?",
        answer: "Membership unlocks full access to courses, SquareBase, puzzles, and rankings with monthly billing.",
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
        isLight ? "bg-[#f7f7fb] text-slate-900" : "bg-[#0b0f1c] text-white"
      }`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div
          className={`absolute -left-24 top-24 h-72 w-72 ${
            isLight ? "bg-pink-300/30" : "bg-pink-500/20"
          } blur-[120px]`}
        />
        <div
          className={`absolute right-0 top-10 h-96 w-96 ${
            isLight ? "bg-purple-300/30" : "bg-purple-500/25"
          } blur-[160px]`}
        />
      </div>

      <div
        className={`relative ${
          isLight
            ? "bg-white/90 border-b border-slate-200"
            : "bg-[#0b0f1c]/90 border-b border-white/5"
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
              Courses
            </button>
            <button
              type="button"
              onClick={scrollToFeatures}
              className={`transition ${isLight ? "hover:text-slate-900" : "hover:text-white"}`}
            >
              SquareBase
            </button>
            <button
              type="button"
              onClick={scrollToFeatures}
              className={`transition ${isLight ? "hover:text-slate-900" : "hover:text-white"}`}
            >
              Groups
            </button>
            <button
              type="button"
              onClick={scrollToPricing}
              className={`transition ${isLight ? "hover:text-slate-900" : "hover:text-white"}`}
            >
              Pricing
            </button>
          </nav>
          <div className="flex items-center justify-end gap-2 md:gap-3">
            <button
              onClick={toggleTheme}
              className={`h-9 w-9 rounded-full border flex items-center justify-center transition ${
                isLight
                  ? "bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200"
                  : "bg-white/5 border-white/10 text-white hover:bg-white/10"
              }`}
              aria-label="Toggle theme"
            >
              {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
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
              className="rounded-full bg-[#e05a9c] hover:bg-[#d64f92] text-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition"
            >
              Get Started Free
            </button>
          </div>
        </div>
      </div>

      <main className="relative max-w-6xl w-full mx-auto px-4 sm:px-6 pb-20 pt-12 sm:pt-16 min-h-[calc(100vh-72px)] flex items-center">
        <section className="w-full flex flex-col items-center text-center">
          <div className="w-full max-w-4xl space-y-6 sm:space-y-7">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight">
              <span className="block">Become the</span>
              <span className="block">
                <span className="inline-block pp-gradient-player">Player</span> You Were Meant to Be
              </span>
            </h1>
            <p
              className={`text-lg leading-relaxed ${
                isLight ? "text-slate-700" : "text-white/80"
              }`}
            >
              Pawn Point gives you the roadmap to real improvement, Learn smarter and develop the skills that win games.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
              <button
                onClick={goToSignup}
                className="w-full sm:w-auto rounded-full bg-[#e05a9c] hover:bg-[#d64f92] text-white px-5 py-3 text-sm font-semibold transition"
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
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm">
              {heroHighlights.map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2
                    className={`h-4 w-4 ${isLight ? "text-pink-600" : "text-pink-300"}`}
                    aria-hidden="true"
                  />
                  <span className={isLight ? "text-slate-600" : "text-white/70"}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-10 w-full max-w-5xl grid gap-4 md:grid-cols-3">
            {heroCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.key}
                  className={`pp-feature-card rounded-2xl border p-5 text-left shadow-[0_20px_50px_rgba(0,0,0,0.35)] ${
                    isLight ? "bg-white/90 border-slate-200 text-slate-900" : "bg-white/5 border-white/10 text-white"
                  }`}
                >
                  <div className="pp-particles" aria-hidden="true">
                    <span className="pp-particle p1" />
                    <span className="pp-particle p2" />
                    <span className="pp-particle p3" />
                    <span className="pp-particle p4" />
                    <span className="pp-particle p5" />
                    <span className="pp-particle p6" />
                    <span className="pp-particle p7" />
                    <span className="pp-particle p8" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-xl border flex items-center justify-center ${
                        isLight ? "bg-pink-50 border-slate-200 text-pink-600" : "bg-white/10 border-white/10 text-pink-200"
                      }`}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="text-base font-semibold">{card.title}</div>
                  </div>
                  <p className={`mt-3 text-sm ${isLight ? "text-slate-600" : "text-white/70"}`}>
                    {card.text}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>
      <section ref={featuresRef} className="relative w-full px-4 sm:px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center pb-10 sm:pb-12">
            <div className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">Features</div>
          </div>
          <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center">
            <div className="fade-in flex justify-center md:justify-start">
              <div className="w-[280px] sm:w-[340px] md:w-[400px] h-[220px] sm:h-[260px] md:h-[300px] flex items-center justify-center">
                <img
                  src={courseIcon}
                  alt="Pawn Point courses"
                  className="h-full w-full object-contain rounded-3xl"
                />
              </div>
            </div>
            <div className="space-y-4 text-center fade-in delay-1">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold">Courses</h2>
              <p className={`text-base sm:text-lg md:text-xl ${isLight ? "text-slate-600" : "text-white/80"}`}>
                Group-exclusive courses, built to remain private. Whether created or followed, access is limited strictly to your training group.
              </p>
            </div>
          </div>
          <div className="mt-16 grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center">
            <div className="fade-in flex justify-center md:justify-start">
              <div className="w-[320px] sm:w-[390px] md:w-[460px] h-[250px] sm:h-[300px] md:h-[360px] flex items-center justify-center md:-translate-x-8">
                <img
                  src={squarebaseIcon}
                  alt="SquareBase"
                  className="h-full w-full object-contain rounded-3xl"
                />
              </div>
            </div>
            <div className="space-y-4 text-center fade-in delay-1">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold">SquareBase</h2>
              <p className={`text-base sm:text-lg md:text-xl ${isLight ? "text-slate-600" : "text-white/80"}`}>
                A Private Intelligence Hub for Chess Where Private Chess Study files live.
              </p>
            </div>
          </div>
          <div className="mt-16 grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center">
            <div className="fade-in flex justify-center md:justify-start">
              <div className="w-[320px] sm:w-[390px] md:w-[460px] h-[250px] sm:h-[300px] md:h-[360px] flex items-center justify-center md:-translate-x-8">
                <img
                  src={groupsIcon}
                  alt="Groups"
                  className="h-full w-full object-contain rounded-3xl"
                />
              </div>
            </div>
            <div className="space-y-4 text-center fade-in delay-1">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold">Groups</h2>
              <p className={`text-base sm:text-lg md:text-xl ${isLight ? "text-slate-600" : "text-white/80"}`}>
                A private training space with your teammates where structure, focus, and progression come together.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section ref={pricingRef} className="w-full px-4 sm:px-6 pb-24">
        <div className="max-w-4xl mx-auto flex justify-center">
          <div
            className={`w-full max-w-md rounded-3xl border p-8 text-center shadow-[0_24px_70px_rgba(0,0,0,0.45)] ${
              isLight ? "bg-white/90 border-slate-200 text-slate-900" : "bg-white/5 border-white/10 text-white"
            }`}
          >
            <div
              className={`text-sm uppercase tracking-[0.2em] ${
                isLight ? "text-slate-500" : "text-white/60"
              }`}
            >
              Monthly Plan
            </div>
            <div className="mt-4 text-4xl font-extrabold">$15</div>
            <div className={`text-sm ${isLight ? "text-slate-500" : "text-white/70"}`}>/ month</div>
            <div className={`mt-3 text-base ${isLight ? "text-slate-600" : "text-white/80"}`}>
              Unlock full access and cancel anytime.
            </div>
            <div className="mt-6 space-y-3 text-left">
              {pricingFeatures.map((feature) => (
                <div key={feature} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" aria-hidden="true" />
                  <span className={`text-sm ${isLight ? "text-slate-700" : "text-white/80"}`}>{feature}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={goToLogin}
              className="mt-8 w-full rounded-full bg-[#e05a9c] hover:bg-[#d64f92] text-white px-5 py-3 text-sm font-semibold transition"
            >
              Sign in to upgrade
            </button>
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
