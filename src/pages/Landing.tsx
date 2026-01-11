import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useLocation } from "wouter";
import { Crown, LogIn, Moon, Plus, Puzzle, Sun, Users, X } from "lucide-react";
import ReviewsMarquee from "../components/ReviewsMarquee";
import pawnPointIcon from "../assets/App tab icon.png";

export default function Landing() {
  const [, navigate] = useLocation();
  const [isLight, setIsLight] = useState(false);
  const [groupStage, setGroupStage] = useState(0);
  const [groupFlips, setGroupFlips] = useState([false, false, false]);
  const [contactOpen, setContactOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [faqOpenIdx, setFaqOpenIdx] = useState<number | null>(null);
  const groupSectionRef = useRef<HTMLDivElement | null>(null);
  const year = useMemo(() => new Date().getFullYear(), []);

  const toggleTheme = () => setIsLight((prev) => !prev);
  const goToCourses = () => navigate("/courses");
  const handleKeyActivate = (evt: KeyboardEvent) => {
    if (evt.key === "Enter" || evt.key === " ") {
      evt.preventDefault();
      goToCourses();
    }
  };

  const toggleGroupFlip = (idx: number) => {
    setGroupFlips((prev) => prev.map((value, i) => (i === idx ? !value : value)));
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const node = groupSectionRef.current;
    if (!node) return;
    let frame = 0;
    const handleScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const rect = node.getBoundingClientRect();
        const viewportHeight = window.innerHeight || 0;
        const scrollY = window.scrollY || 0;
        const sectionTop = rect.top + scrollY;
        const start = sectionTop - viewportHeight;
        const distance = Math.max(1, rect.height);
        const progress = Math.min(Math.max((scrollY - start) / distance, 0), 1);
        let nextStage = 0;
        if (progress > 0.1) nextStage = 1;
        if (progress > 0.45) nextStage = 2;
        if (progress > 0.75) nextStage = 3;
        setGroupStage((prev) => (nextStage > prev ? nextStage : prev));
      });
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  const groupBlocks = useMemo(
    () => [
      {
        key: "groups",
        icon: Users,
        headline: "Get Access to Private Training Groups",
        text: "Unlock exclusive training content curated specifically for your group.",
      },
      {
        key: "puzzles",
        icon: Puzzle,
        headline: "Unlock AI Powered Chess Puzzles",
        text: "Train with puzzles generated in real time to target your exact weaknesses.",
      },
      {
        key: "ranking",
        icon: Crown,
        headline: "Place on a Global Ranking League",
        text: "Compete against the best in Pawn Point to climb to the top of your league.",
      },
    ],
    [],
  );
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
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden flex items-center justify-center">
              <img src={pawnPointIcon} alt="Pawn Point logo" className="h-full w-full object-cover" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight">Pawn Point</span>
          </div>
          <div className="flex items-center gap-3 md:hidden">
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
              onClick={() => navigate("/login")}
              className={`rounded-full px-3 py-2 text-sm font-semibold border transition ${
                isLight
                  ? "border-slate-200 bg-white text-slate-900 hover:bg-slate-100"
                  : "border-white/10 bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              Log in
            </button>
          </div>
          <div
            className={`hidden md:flex items-center gap-4 text-base font-semibold md:translate-x-[-8px] ${
              isLight ? "text-slate-700" : "text-white/80"
            }`}
          >
            <button
              onClick={() => navigate("/login")}
              className={`transition flex items-center gap-2 ${
                isLight ? "hover:text-slate-900" : "hover:text-white"
              }`}
            >
              <LogIn className="h-5 w-5" strokeWidth={2.5} />
              Log in
            </button>
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
          </div>
        </div>
      </div>

      <main className="relative max-w-6xl w-full mx-auto px-4 sm:px-6 pb-20 pt-10 sm:pt-12 min-h-[calc(100vh-64px)] flex items-center">
        <section className="w-full grid md:grid-cols-2 gap-10 sm:gap-12 items-center">
          <div className="space-y-6 relative flex flex-col items-center text-center">
            <div className="pointer-events-none absolute -left-10 -top-6 h-20 w-20 rounded-full bg-pink-500/20 blur-3xl" />
            <div
              className="space-y-4 w-full cursor-pointer"
              role="button"
              tabIndex={0}
              onClick={goToCourses}
              onKeyDown={handleKeyActivate}
              aria-label="Go to course menu"
            >
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight text-[#ff0fb3] drop-shadow-[0_10px_35px_rgba(255,15,179,0.35)]">
                Become the Player You Were Meant to Be
              </h1>
              <p
                className={`text-lg leading-relaxed ${
                  isLight ? "text-slate-700" : "text-white/80"
                }`}
              >
                Pawn Point gives you the roadmap to real improvement. Learn smarter, train efficient,
                and develop the skills that win games.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
              <button
                onClick={() => navigate("/signup")}
                className="w-full sm:w-auto rounded-full bg-[#ff0fb3] hover:bg-pink-500 text-white px-5 py-3 text-sm font-semibold shadow-[0_10px_30px_rgba(255,15,179,0.35)] transition"
              >
                Start free
              </button>
              <button
                onClick={() => navigate("/login")}
                className={`w-full sm:w-auto rounded-full px-5 py-3 text-sm font-semibold border transition ${
                  isLight
                    ? "border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
                    : "border-white/15 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                I already have an account
              </button>
            </div>
          </div>
          <div className="relative flex justify-center items-center">
            <div className="pointer-events-none absolute -inset-10 bg-gradient-to-br from-[#ff0fb3]/25 via-[#7c3aed]/20 to-[#0ea5e9]/25 blur-[140px]" />
            <div
              className={`relative w-full max-w-[320px] sm:max-w-[360px] aspect-square overflow-hidden rounded-[28px] sm:rounded-[32px] border ${
                isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"
              } shadow-[0_20px_60px_rgba(0,0,0,0.45)] cursor-pointer`}
              role="button"
              tabIndex={0}
              aria-label="Open course menu"
              onClick={goToCourses}
              onKeyDown={handleKeyActivate}
            >
              <img
                src={pawnPointIcon}
                alt="Pawn Point icon"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </section>

      </main>
      <section
        ref={groupSectionRef}
        className="pp-landing-icons relative max-w-6xl w-full mx-auto px-4 sm:px-6 pb-24 flex flex-wrap items-center justify-center gap-8"
      >
        {groupBlocks.map((block, idx) => {
          const isVisible = groupStage >= idx + 1;
          const Icon = block.icon;
          const isFlipped = groupFlips[idx];
          const showPlus = block.key === "ranking";
          return (
            <div
              key={block.key}
              className="pp-landing-icon-card shrink-0 transition-all duration-700"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? "translateY(0px)" : "translateY(32px)",
                width: "240px",
                height: "240px",
              }}
            >
              <div
                className={`relative h-full w-full rounded-3xl border transition-transform duration-300 hover:-translate-y-2 ${
                  isLight
                    ? "bg-white/90 border-slate-200 shadow-[0_20px_50px_rgba(15,23,42,0.12)]"
                    : "bg-white/5 border-white/10 shadow-[0_22px_60px_rgba(0,0,0,0.5)]"
                }`}
                style={{ perspective: "1200px" }}
              >
                <button
                  type="button"
                  aria-pressed={isFlipped}
                  aria-label={`${block.headline} details`}
                  onClick={() => toggleGroupFlip(idx)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleGroupFlip(idx);
                    }
                  }}
                  className="h-full w-full rounded-3xl"
                >
                  <div
                    className="relative h-full w-full"
                    style={{
                      transformStyle: "preserve-3d",
                      transition: "transform 0.6s ease",
                      transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                    }}
                  >
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ backfaceVisibility: "hidden" }}
                    >
                      <div
                        className={`h-40 w-40 rounded-full border flex items-center justify-center transition-transform duration-300 ${
                          isLight
                            ? "bg-gradient-to-br from-white via-pink-100/70 to-purple-100/70 border-slate-200"
                            : "bg-gradient-to-br from-white/10 via-pink-500/15 to-purple-500/15 border-white/10"
                        } shadow-[0_18px_45px_rgba(0,0,0,0.35)]`}
                      >
                        <Icon
                          className={`h-16 w-16 ${isLight ? "text-pink-600" : "text-pink-200"}`}
                          strokeWidth={1.5}
                        />
                      </div>
                    </div>
                    <div
                      className="absolute inset-0 flex items-center justify-center px-5 text-center"
                      style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                    >
                      <div className="space-y-2">
                        <div className="text-lg font-semibold">{block.headline}</div>
                        <div className={`text-sm ${isLight ? "text-slate-700" : "text-white/80"}`}>
                          {block.text}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
                <div
                  className={`pointer-events-none absolute -left-10 top-6 h-36 w-36 rounded-full blur-[90px] ${
                    isLight ? "bg-pink-300/40" : "bg-pink-500/25"
                  }`}
                />
                {showPlus && (
                  <div
                    className={`pp-landing-plus pointer-events-none absolute -right-16 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full border flex items-center justify-center ${
                      isLight
                        ? "bg-white border-slate-200 text-slate-700"
                        : "bg-white/10 border-white/15 text-white"
                    }`}
                  >
                    <Plus className="h-4 w-4" strokeWidth={2.5} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
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
