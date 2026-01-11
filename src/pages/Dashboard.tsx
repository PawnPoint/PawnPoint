import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ChevronDown, Clipboard, FileText, Brain, Puzzle } from "lucide-react";
import { useLocation } from "wouter";

import { AppShell } from "../components/AppShell";
import { Card } from "../components/ui/Card";
import { useAuth } from "../hooks/useAuth";
import { getDashboard } from "../lib/mockApi";
import southKnight from "../assets/The South Knight.png";

const backgroundStyle = {
  backgroundImage: `
    radial-gradient(1200px 600px at 50% -10%, rgba(255, 255, 255, 0.03), transparent 60%),
    linear-gradient(180deg, #0b1220 0%, #0d1628 25%, #0b1220 45%, #0a0f1c 60%, #070a12 75%, #000000 92%)
  `,
  minHeight: "100vh",
  color: "#ffffff",
} as const;

const pageStyles = `
.greeting h1 {
  text-shadow:
    0 2px 16px rgba(246, 211, 101, 0.18),
    0 0 1px rgba(255, 255, 255, 0.4);
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: -0.02em;
}

.greeting-gradient {
  background: linear-gradient(90deg, #f6d365, #fda085, #ffffff);
  text-shadow: 0 2px 12px rgba(246, 211, 101, 0.15);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.section-divider {
  width: 200px;
  height: 3px;
  margin: 16px auto 24px;
  background: linear-gradient(90deg, transparent, rgba(255, 215, 128, 0.6), transparent);
  border-radius: 999px;
  position: relative;
  overflow: hidden;
}

.section-divider::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 215, 128, 0.9), transparent);
  animation: dividerSlide 4s ease-in-out infinite;
}

@keyframes dividerSlide {
  0% { transform: translateX(-40%); opacity: 0.2; }
  50% { transform: translateX(40%); opacity: 1; }
  100% { transform: translateX(-40%); opacity: 0.2; }
}

.curated-card {
  background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.2)), #111724;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 18px;
  box-shadow: 0 30px 70px rgba(0,0,0,0.35);
  transition: transform 0.45s ease, opacity 0.35s ease, box-shadow 0.35s ease;
  cursor: pointer;
  backdrop-filter: blur(6px);
}

.curated-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 30px 80px rgba(0,0,0,0.4);
}

.hero-blend {
  position: relative;
  overflow: hidden;
}
.hero-blend::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -140px;
  height: 240px;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    rgba(11, 18, 32, 0) 0%,
    rgba(7, 10, 18, 0.7) 65%,
    #000000 100%
  );
}

.slider-arrow {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.15);
  height: 44px;
  width: 44px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: background 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
}

.slider-arrow:hover {
  background: rgba(255,255,255,0.16);
  transform: translateY(-1px);
  border-color: rgba(255,255,255,0.3);
}

@media (max-width: 768px) {
  .greeting h1 {
    flex-direction: column;
    gap: 6px;
  }

  .pp-course-card {
    width: min(72vw, 260px) !important;
    max-width: min(72vw, 260px) !important;
  }

  .pp-course-card--center {
    width: min(90vw, 360px) !important;
    max-width: min(90vw, 360px) !important;
  }

  #squarebase .pp-squarebase-reveal,
  #squarebase .cta-fade {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }

  .pp-playerhub .fade-in,
  .pp-playerhub .pp-playerhub-reveal {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
}

.arrow-pulse {
  animation: arrowFloat 1.6s ease-in-out infinite;
}

@keyframes flamePulse {
  0% { transform: scale(1) rotate(-2deg); filter: drop-shadow(0 0 8px rgba(252, 211, 77, 0.5)); }
  40% { transform: scale(1.08) rotate(2deg); filter: drop-shadow(0 0 16px rgba(252, 211, 77, 0.85)); }
  80% { transform: scale(1.03) rotate(-1deg); filter: drop-shadow(0 0 12px rgba(252, 211, 77, 0.7)); }
  100% { transform: scale(1) rotate(-2deg); filter: drop-shadow(0 0 8px rgba(252, 211, 77, 0.5)); }
}

.flame-pulse {
  animation: flamePulse 1.4s ease-in-out infinite;
}

@keyframes arrowFloat {
  0%, 100% { transform: translateY(0); opacity: 0.75; }
  50% { transform: translateY(8px); opacity: 1; }
}

@keyframes dashboardGreetSlide {
  0% { opacity: 0; transform: translateY(18px) scale(0.985); filter: blur(1px); }
  60% { opacity: 1; filter: blur(0.3px); }
  100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}

.feature-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  padding: 24px;
  transition:
    transform 0.35s ease,
    box-shadow 0.35s ease,
    background 0.35s ease;
  will-change: transform;
}

.feature-card:hover {
  transform: translateY(-8px);
  box-shadow:
    0 12px 30px rgba(0, 0, 0, 0.45);
  background: rgba(255, 255, 255, 0.06);
}

.main-course-lift {
  --lift: 0px;
  transition: transform 0.35s ease, box-shadow 0.35s ease;
}

.main-course-lift:hover {
  --lift: -10px;
  box-shadow: 0 26px 60px rgba(0, 0, 0, 0.45);
}

.flip-card {
  perspective: 1000px;
}

.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.6s ease;
}

.flip-card.flipped .flip-card-inner {
  transform: rotateY(180deg);
}

.flip-face {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  backface-visibility: hidden;
  border-radius: 16px;
}

.cta-fade {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.cta-fade.show {
  opacity: 1;
  transform: translateY(0);
}

#squarebase {
  position: relative;
  min-height: 100vh;
  width: 100vw;
  background: #000000;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10;
  overflow: visible;
}
#squarebase::before {
  content: "";
  position: absolute;
  top: -160px;
  left: 0;
  width: 100%;
  height: 260px;
  background: linear-gradient(
    180deg,
    rgba(11, 18, 32, 0) 0%,
    rgba(11, 18, 32, 0.55) 38%,
    rgba(7, 10, 18, 0.82) 64%,
    rgba(0, 0, 0, 0.95) 86%,
    #000000 100%
  );
  pointer-events: none;
}
`;

const rankBands = [
  { key: "gold", label: "Gold", min: 1, max: 50, accent: "from-amber-400 to-amber-600" },
  { key: "diamond", label: "Diamond", min: 51, max: 100, accent: "from-cyan-300 to-blue-500" },
  { key: "ascendant", label: "Ascendant", min: 101, max: 200, accent: "from-emerald-300 to-teal-500" },
  { key: "immortal", label: "Immortal", min: 201, max: 400, accent: "from-fuchsia-300 to-purple-500" },
  { key: "radiant", label: "Radiant", min: 401, max: undefined, accent: "from-indigo-300 to-purple-600" },
] as const;

const rankForLevel = (level: number) =>
  rankBands.find((band) => level >= band.min && (band.max === undefined || level <= band.max)) || rankBands[0];

type VisibleStates = "left" | "center" | "right" | "hidden";

export default function Dashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data } = useQuery({
    queryKey: ["dashboard", user?.id, user?.groupId, user?.accountType],
    queryFn: () => (user ? getDashboard(user) : Promise.resolve(null)),
    enabled: !!user,
  });

  const courses = data?.suggested ?? [];
  const [courseIndex, setCourseIndex] = useState(0);
  const [overlayOpacity, setOverlayOpacity] = useState(0);
  const squareBaseRef = useRef<HTMLDivElement | null>(null);
  const [squareBaseVisible, setSquareBaseVisible] = useState(false);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [gridVisible, setGridVisible] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const [profileVisible, setProfileVisible] = useState(false);
  const [squareFlips, setSquareFlips] = useState([false, false, false]);
  const squareTiles = [
    {
      icon: Clipboard,
      title: "Analysis Board",
      description: "Deep game analysis, simplified.",
    },
    {
      icon: FileText,
      title: "BlackBook OPX",
      description: "Black Book OPX scans a targets public games to generate an exploit-ready intelligence profile.",
    },
    {
      icon: Brain,
      title: "AI Training Program",
      description: "A chess plan that adapts as you improve.",
    },
  ];
  const autoScrollDone = useRef(false);

  useEffect(() => {
    if (!courses.length) return;
    if (courseIndex >= courses.length) {
      setCourseIndex(0);
    }
  }, [courses.length, courseIndex]);

  useEffect(() => {
    const handleScroll = () => {
      const start = 0;
      const squareTop =
        squareBaseRef.current?.getBoundingClientRect().top ?? window.innerHeight * 2;
      const absoluteSquareTop = squareTop + window.scrollY;
      const end = Math.max(
        start + 400,
        absoluteSquareTop - window.innerHeight * 0.2,
      );
      const y = window.scrollY;
      const t = Math.min(Math.max((y - start) / (end - start), 0), 1);
      setOverlayOpacity(Number(t.toFixed(3)));
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || autoScrollDone.current) return;
    const timer = setTimeout(() => {
      if (!squareBaseRef.current || autoScrollDone.current) return;
      autoScrollDone.current = true;
      // Aim the initial viewport to the seam between hero and SquareBase without revealing SquareBase.
      const seamOffset = squareBaseRef.current.offsetTop - window.innerHeight + 80;
      const target = Math.max(seamOffset, 0);
      window.scrollTo({ top: target, behavior: "smooth" });
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === squareBaseRef.current) {
            setSquareBaseVisible(entry.isIntersecting);
          }
        });
      },
      { threshold: 0.35, rootMargin: "0px 0px -10% 0px" },
    );
    if (squareBaseRef.current) observer.observe(squareBaseRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === gridRef.current) {
            setGridVisible(entry.isIntersecting);
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -15% 0px" },
    );
    if (gridRef.current) observer.observe(gridRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    const load = async () => {
      try {
        const res = await fetch("/api/twitch/chess-tv");
        if (!res.ok) throw new Error(`Twitch fetch failed: ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        if (data?.live && data?.selected?.user_login) {
          setTwitchChannel((data.selected.user_login as string).toLowerCase());
          setTwitchLabel(data.selected.user_name || data.selected.user_login || "Chess TV");
        } else {
          const fallback = twitchFallback[0];
          setTwitchChannel(fallback.channel);
          setTwitchLabel(fallback.label);
        }
      } catch {
        if (!cancelled) {
          const fallback = twitchFallback[0];
          setTwitchChannel(fallback.channel);
          setTwitchLabel(fallback.label);
        }
      }
    };

    load();
    timer = window.setInterval(load, 90_000);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, []);

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
      { threshold: 0.3, rootMargin: "0px 0px -5% 0px" },
    );
    const nodes = document.querySelectorAll<HTMLElement>(".fade-in");
    nodes.forEach((node) => {
      node.classList.remove("visible"); // ensure hidden until observed
      observer.observe(node);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === profileRef.current) {
            setProfileVisible(entry.isIntersecting);
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" },
    );
    if (profileRef.current) observer.observe(profileRef.current);
    return () => observer.disconnect();
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const firstName = useMemo(() => {
    const raw =
      user?.displayName ||
      user?.chessUsername ||
      user?.email?.split("@")[0] ||
      "Player";
    const parts = raw.trim().split(" ");
    return parts[0] || raw;
  }, [user?.chessUsername, user?.displayName, user?.email]);
  const level = Math.max(1, user?.level ?? 1);
  const xp = user?.totalXp ?? 0;
  const displayName = user?.chessUsername || user?.displayName || firstName;
  const rankInfo = rankForLevel(level);
  const levelBaseXp = Math.max(0, (level - 1) * 100);
  const xpIntoLevel = Math.max(0, xp - levelBaseXp);
  const xpToNextLevel = Math.max(0, level * 100 - xp);
  const levelProgress = Math.min(100, Math.max(0, Math.round((xpIntoLevel / 100) * 100)));
  const twitchParent = useMemo(
    () => (typeof window !== "undefined" ? window.location.hostname : "localhost"),
    [],
  );
  const [twitchChannel, setTwitchChannel] = useState<string | null>(null);
  const [twitchLabel, setTwitchLabel] = useState("Chess TV");
  const twitchFallback = useMemo(
    () => [
      { channel: "gmhikaru", label: "GM Hikaru" },
      { channel: "gothamchess", label: "GothamChess" },
      { channel: "botezlive", label: "BotezLive" },
      { channel: "chess", label: "Chess TV" },
      { channel: "chess24", label: "Chess24" },
      { channel: "imrosen", label: "Eric Rosen" },
      { channel: "penguingm1", label: "PenguinGM1" },
      { channel: "annacramling", label: "Anna Cramling" },
      { channel: "chessdojo", label: "ChessDojo" },
      { channel: "thebelenkaya", label: "Dina Belenkaya" },
      { channel: "wittyalien", label: "Witty Alien" },
      { channel: "akanemsko", label: "akaNemsko" },
    ],
    [],
  );

  const handlePrev = () => {
    if (!courses.length) return;
    setCourseIndex((prev) => (prev - 1 + courses.length) % courses.length);
  };

  const handleNext = () => {
    if (!courses.length) return;
    setCourseIndex((prev) => (prev + 1) % courses.length);
  };

  const toggleSquareFlip = (idx: number) => {
    setSquareFlips((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  };

  const handleSquareBaseExplore = () => {
    navigate("/squarebase?overlay=1");
  };

  const resolveState = (idx: number): VisibleStates => {
    if (!courses.length) return "hidden";
    const total = courses.length;
    const relative = (idx - courseIndex + total) % total;
    if (relative === 0) return "center";
    if (relative === 1) return "right";
    if (relative === total - 1) return "left";
    return "hidden";
  };

  const courseCards = courses.length ? courses : [];

  return (
    <AppShell backgroundStyle={backgroundStyle}>
      <style>{pageStyles}</style>
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.65) 55%, rgba(0,0,0,0.85) 100%)",
          opacity: overlayOpacity * 0.85,
          transition: "opacity 0s linear",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: "rgba(0,0,0,0.92)",
          opacity: overlayOpacity,
          transition: "opacity 0s linear",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />
      <div className="relative z-10 text-white">
        <div
          className="max-w-6xl mx-auto px-4 pt-16 pb-10 text-center greeting scroll-fade hero-blend"
          style={{
            minHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "32px",
          }}
        >
          <h1
            className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-white inline-flex items-center justify-center gap-3"
            style={{
              animation: "dashboardGreetSlide 0.9s ease forwards",
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
              letterSpacing: "-0.02em",
            }}
          >
            <span>{greeting},</span>
            <span
              className="greeting-gradient"
              style={{
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
                letterSpacing: "-0.02em",
              }}
            >
              {firstName}
            </span>
          </h1>
          <div className="mt-1 text-base sm:text-lg italic text-white/80" style={{ animation: "dashboardGreetSlide 1s ease forwards" }}>
            Your next move starts here.
          </div>
          <div className="section-divider" style={{ margin: "8px auto 16px" }} />
          {data?.suggested && data.suggested.length > 0 && (
              <div className="w-full flex flex-col items-center gap-3">
                <div className="text-lg font-semibold text-white/80 tracking-wide uppercase">
                  Curated for you
                </div>
                <div className="relative w-full max-w-4xl flex items-center justify-center">
                <div className="absolute inset-y-0 left-6 sm:left-10 md:left-14 flex items-center z-20 pointer-events-auto">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={data.suggested.length < 2}
                    className="p-3 rounded-full border border-white/20 bg-white/10 text-white/80 hover:text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex items-center justify-center w-full gap-2 px-2 relative overflow-visible" style={{ minHeight: "330px" }}>
                  <div
                    className="absolute inset-0 flex items-center justify-center transition-transform duration-500 ease-out"
                    style={{ transform: "translateX(0)" }}
                  >
                    <div className="flex items-center gap-4">
                      {[-1, 0, 1].map((offset) => {
                        const len = data.suggested.length;
                        const idx = ((courseIndex + offset) % len + len) % len;
                        const course = data.suggested[idx];
                        const translateX = offset * 240;
                        const isCenter = offset === 0;
                        const cardWidth = isCenter ? 320 : 220;
                        return (
                          <div
                            key={`${course.id}-${offset}`}
                            className={`pp-course-card rounded-2xl border overflow-hidden flex flex-col h-full transition-all duration-500 ease-out cursor-pointer ${
                              isCenter
                                ? "pp-course-card--center opacity-100 scale-100 z-10 curated-card main-course-lift"
                                : "pp-course-card--side opacity-50 scale-90 blur-[0.1px]"
                            }`}
                            style={{
                              backgroundColor: "#111724",
                              borderColor: "#111724",
                              width: `${cardWidth}px`,
                              maxWidth: `${cardWidth}px`,
                              transform: `translateX(${translateX}px) translateY(var(--lift, 0px))`,
                            }}
                            onClick={() => navigate(`/courses/${course.id}`)}
                          >
                            <img
                              src={course.thumbnailUrl}
                              alt={course.title}
                              className={`${isCenter ? "h-44" : "h-32"} w-full object-cover`}
                            />
                            <div className={`${isCenter ? "p-5 gap-3" : "p-3 gap-2"} flex flex-col flex-1`}>
                              <div className="text-sm text-brand.pink uppercase tracking-wide line-clamp-1">Suggested</div>
                              <div className={`${isCenter ? "text-xl" : "text-base"} font-semibold text-white line-clamp-2`}>
                                {course.title}
                              </div>
                              {isCenter ? (
                                <p className="text-sm text-white/80 line-clamp-4 flex-1">{course.description}</p>
                              ) : (
                                <p className="text-xs text-white/70 line-clamp-3 flex-1">{course.description}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="absolute inset-y-0 right-6 sm:right-10 md:right-14 flex items-center z-20 pointer-events-auto">
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={data.suggested.length < 2}
                    className="p-3 rounded-full border border-white/20 bg-white/10 text-white/80 hover:text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="arrow-pulse text-white/70 mt-10">
            <ChevronDown className="h-8 w-8" />
          </div>
        </div>

        <section
          id="squarebase"
          ref={squareBaseRef}
          className="relative w-screen left-1/2 -translate-x-1/2 min-h-screen px-4 flex items-center justify-center"
          style={{
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          }}
        >
          <div className="max-w-6xl w-full mx-auto flex flex-col items-center justify-center text-center space-y-12 relative z-10 py-12">
            <div
              className="space-y-4 pp-squarebase-reveal"
              style={{
                opacity: squareBaseVisible ? 1 : 0,
                transform: squareBaseVisible ? "translateY(0)" : "translateY(28px)",
                transition: "opacity 0.7s ease, transform 0.7s ease",
              }}
            >
              <div className="text-4xl sm:text-5xl font-extrabold text-white">SquareBase{"\u2122"}</div>
              <p className="text-white/80 text-base sm:text-lg italic">
                Your personal chess intelligence system.
              </p>
            </div>

            <div
              className="max-w-5xl w-full text-center pp-squarebase-reveal"
              style={{
                opacity: squareBaseVisible ? 1 : 0,
                transform: squareBaseVisible ? "translateY(0)" : "translateY(36px)",
                transition: "opacity 0.8s ease 120ms, transform 0.8s ease 120ms",
              }}
            >
              <div
                className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white"
                style={{ letterSpacing: "0.015em" }}
              >
                Built from how you think refined by how you play.
              </div>
            </div>

            <div
              ref={gridRef}
              className="w-full"
              style={{
                padding: "60px 0 120px",
              }}
            >
              <div
                className="max-w-5xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-3 justify-items-center justify-center gap-4 sm:gap-5 pp-squarebase-reveal"
                style={{
                  opacity: gridVisible ? 1 : 0,
                  transform: gridVisible ? "translateY(0)" : "translateY(40px)",
                  transition: "opacity 0.8s ease 180ms, transform 0.8s ease 180ms",
                }}
              >
                {squareTiles.map(({ icon: Icon, title, description }, idx) => (
                  <button
                    key={`ghost-block-${idx}`}
                    onClick={() => toggleSquareFlip(idx)}
                    className={`relative w-full max-w-[200px] sm:max-w-[220px] aspect-square mx-auto focus:outline-none ${
                      idx === 2 ? "pp-squarebase-brain" : ""
                    }`}
                    style={{ perspective: "1000px" }}
                  >
                    <div className={`flip-card ${squareFlips[idx] ? "flipped" : ""} h-full`}>
                      <div className="flip-card-inner h-full">
                        <div
                          className="flip-face rounded-2xl border border-white/20 bg-white/5 feature-card"
                          style={{ backdropFilter: "blur(10px)" }}
                        >
                          <Icon className="h-14 w-14 text-white/80" strokeWidth={2.5} />
                        </div>
                        <div
                          className="flip-face rounded-2xl border border-white/20 bg-white/10 feature-card text-center px-5 flex flex-col items-center justify-center gap-2"
                          style={{ transform: "rotateY(180deg)", backdropFilter: "blur(10px)" }}
                        >
                          <div className="text-lg font-semibold text-white leading-tight">{title}</div>
                          <div className="text-sm text-white/80 leading-snug max-w-[180px]">{description}</div>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className={`mt-[140px] flex justify-center cta-fade ${squareBaseVisible && !profileVisible ? "show" : ""}`} style={{ opacity: profileVisible ? 0 : undefined, transition: "opacity 0.6s ease, transform 0.6s ease" }}>
                <button
                  className="px-6 py-2 rounded-full bg-white text-black font-semibold shadow-[0_10px_30px_rgba(0,0,0,0.25)] hover:shadow-[0_14px_36px_rgba(0,0,0,0.3)] transition"
                  onClick={handleSquareBaseExplore}
                >
                  Explore
                </button>
              </div>
              <div className="max-w-6xl mx-auto px-4 md:px-0 mt-24 sm:mt-28 md:mt-48 pp-playerhub">
                <div className="text-left md:text-center mb-10" style={{ fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif" }}>
                  <div
                    className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white fade-in"
                  >
                    Player Hub
                  </div>
                  <div
                    className="text-sm sm:text-base italic text-white/70 mt-3 fade-in delay-1"
                  >
                    Your profile, puzzles, and quick actions
                  </div>
                </div>
                <div
                  ref={profileRef}
                  className="grid grid-cols-1 md:grid-cols-[minmax(0,540px)_minmax(0,1fr)] gap-10 md:gap-12 items-start mt-10 pp-playerhub-reveal"
                  style={{
                    opacity: profileVisible ? 1 : 0,
                    transform: profileVisible ? "translateY(0)" : "translateY(30px)",
                    transition: "opacity 0.7s ease 140ms, transform 0.7s ease 140ms",
                  }}
                >
                  <div className="flex flex-col gap-5 w-full max-w-[540px] justify-self-center md:justify-self-start">
                    <div className="rounded-2xl border border-white/15 bg-white/5 feature-card text-left flex flex-col gap-4 w-full">
                      <div className="flex items-start">
                        <div className="text-sm uppercase tracking-[0.12em] text-white/60">Player Profile</div>
                      </div>
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-24 w-24 rounded-full bg-white/10 border border-white/15 overflow-hidden flex items-center justify-center text-3xl font-bold shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
                          {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                          ) : (
                            <span>{firstName.slice(0, 1).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="text-2xl font-semibold text-white text-center">{displayName}</div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {[
                          { label: "Rank", value: rankInfo.label },
                          { label: "Level", value: `Lv. ${level}` },
                          { label: "Total XP", value: xp.toLocaleString() },
                        ].map((stat) => (
                          <div key={stat.label} className="rounded-xl bg-white/5 border border-white/10 p-3">
                            <div className="text-[11px] uppercase tracking-[0.12em] text-white/60">{stat.label}</div>
                            <div className="text-lg font-semibold text-white mt-1">{stat.value}</div>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
                        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-white/60">
                          <span>XP to next level</span>
                          <span className="text-white/80 tracking-normal uppercase">
                            {xpToNextLevel.toLocaleString()} XP
                          </span>
                        </div>
                        <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-400 via-rose-400 to-indigo-500"
                            style={{ width: `${levelProgress}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-white/60">
                          <span>Level {level}</span>
                          <span>{levelProgress}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="w-full max-w-xl flex flex-col gap-5 md:justify-self-end">
                    <div className="pp-playerhub-actions grid grid-cols-1 sm:grid-cols-2 gap-4 items-start justify-items-center md:justify-items-start">
                      <div className="pp-playerhub-card rounded-2xl border border-white/15 bg-white/5 aspect-square w-full max-w-[260px] flex flex-col items-center justify-center gap-3 text-center p-5 shadow-[0_18px_45px_rgba(0,0,0,0.35)] transition-transform duration-300 hover:-translate-y-2 md:justify-self-start">
                        <div className="pp-playerhub-icon h-24 w-24 rounded-full bg-white/10 border border-white/15 flex items-center justify-center shadow-[0_12px_30px_rgba(0,0,0,0.3)]">
                          <Puzzle className="h-10 w-10 text-white" />
                        </div>
                        <div className="pp-playerhub-title text-lg font-semibold text-white">Daily Puzzle</div>
                        <button
                          type="button"
                          onClick={() => navigate("/puzzles")}
                          className="pp-playerhub-button px-4 py-2 rounded-full bg-white text-black font-semibold shadow-[0_12px_30px_rgba(0,0,0,0.25)] hover:shadow-[0_14px_36px_rgba(0,0,0,0.3)] transition"
                        >
                          Solve Now
                        </button>
                      </div>
                      <div className="pp-playerhub-card rounded-2xl border border-white/15 bg-white/5 aspect-square w-full max-w-[260px] flex flex-col items-center justify-center gap-3 text-center p-5 shadow-[0_18px_45px_rgba(0,0,0,0.35)] transition-transform duration-300 hover:-translate-y-2 md:justify-self-start md:translate-x-3">
                        <div className="pp-playerhub-icon h-24 w-24 rounded-full overflow-hidden border border-white/15 shadow-[0_12px_30px_rgba(0,0,0,0.3)]">
                          <img src={southKnight} alt="South Knight" className="h-full w-full object-cover" />
                        </div>
                        <div className="pp-playerhub-title text-lg font-semibold text-white">South Knight</div>
                        <button
                          type="button"
                          onClick={() => navigate("/practice")}
                          className="pp-playerhub-button px-4 py-2 rounded-full bg-white text-black font-semibold shadow-[0_12px_30px_rgba(0,0,0,0.25)] hover:shadow-[0_14px_36px_rgba(0,0,0,0.3)] transition"
                        >
                          Play Now
                        </button>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-white/5 w-full aspect-video overflow-hidden shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
                      <div className="flex items-center justify-between px-4 pt-3 text-sm text-white/80">
                        <span className="font-semibold">Chess TV</span>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs border border-white/15">
                          {twitchLabel}
                        </span>
                      </div>
                      <div className="px-4 pb-3">
                        <div className="h-px w-full bg-white/10" />
                      </div>
                      <iframe
                        title="Twitch TV"
                        src={`https://player.twitch.tv/?channel=${encodeURIComponent(twitchChannel || "gmhikaru")}&parent=${encodeURIComponent(twitchParent)}&muted=true&autoplay=false`}
                        className="w-full h-[calc(100%-56px)]"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
