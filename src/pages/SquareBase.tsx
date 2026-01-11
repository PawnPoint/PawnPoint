import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Brain, ChevronLeft, ChevronRight, Compass, BookOpen, LineChart, Lock, LogOut, Puzzle, Flame } from "lucide-react";
import { get, ref, remove, set } from "firebase/database";
import squareBaseLogo from "../assets/SquareBase Logo.png";
import southKnight from "../assets/The South Knight.png";
import { PracticeBoard } from "./Practice";
import { useAuth } from "../hooks/useAuth";
import { db } from "../lib/firebase";
import { awardXp, getCurrentProfile } from "../lib/mockApi";
import "./squarebase.css";

type PlanKey = "beginner" | "club" | "intermediate" | "advanced" | "expert";
type PlanDay = { day: string; items: string[] };
type TrainingPlan = { label: string; days: PlanDay[] };
type ChessProfile = {
  platform: "chesscom" | "lichess";
  username: string;
  displayName: string;
  avatarUrl: string | null;
  country: string | null;
  title: string | null;
  lastOnline: string | null;
  ratings: {
    bullet: number | null;
    blitz: number | null;
    rapid: number | null;
    classical: number | null;
  };
  stats: {
    games: number;
    wins: number;
    losses: number;
    draws: number;
  };
  openings?: {
    white: { name: string; freq: number; winRate: number }[];
    black: { name: string; freq: number; winRate: number }[];
  };
  recentGames: Array<{
    id: string;
    playedAt: string | null;
    timeControl: string | null;
    color: "white" | "black" | null;
    result: "win" | "loss" | "draw" | "unknown";
    opponent: { username: string | null; rating: number | null };
    pgn: string | null;
    opening?: string | null;
  }>;
};
type StoredPlanState = {
  planKey: PlanKey;
  planDayIndex: number;
  viewDayIndex: number;
  dayChecks: Record<number, boolean[]>;
  completedDays: Record<number, boolean>;
  pendingDayIndex: number | null;
  pendingUnlockDate: string | null;
  nextUnlockAt: number | null;
  updatedAt: number;
};

const rankBands = [
  { key: "gold", label: "Gold", min: 1, max: 50, accent: "from-amber-400 to-amber-600" },
  { key: "diamond", label: "Diamond", min: 51, max: 100, accent: "from-cyan-300 to-blue-500" },
  { key: "ascendant", label: "Ascendant", min: 101, max: 200, accent: "from-emerald-300 to-teal-500" },
  { key: "immortal", label: "Immortal", min: 201, max: 400, accent: "from-fuchsia-300 to-purple-500" },
  { key: "radiant", label: "Radiant", min: 401, max: undefined, accent: "from-indigo-300 to-purple-600" },
] as const;

const rankForLevel = (level: number) =>
  rankBands.find((band) => level >= band.min && (band.max === undefined || level <= band.max)) || rankBands[0];

const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getMidnightMsForDateKey = (dateKey: string) => {
  const [yearStr, monthStr, dayStr] = dateKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
};

const getNextLocalMidnightMs = (date = new Date()) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + 1);
  return next.getTime();
};

export default function SquareBase() {
  const [location, setLocation] = useLocation();
  const { user, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"explore" | "analysis" | "ai" | "blackbook">("explore");
  const initialOverlay = useMemo(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("overlay") === "1";
  }, []);
  const overlayFromLocation = useMemo(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("overlay") === "1";
  }, [location]);
  const [showOverlay, setShowOverlay] = useState(initialOverlay);
  const [overlayLeaving, setOverlayLeaving] = useState(false);
  const loadingHoldMs = 1100;
  const overlayTimers = useRef<number[]>([]);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const [profileVisible, setProfileVisible] = useState(false);
  const year = useMemo(() => new Date().getFullYear(), []);
  const isSouthKnightGroup =
    user?.groupId === "south-knight" || user?.groupCode?.includes("0055");
  const canAccessPremium =
    isSouthKnightGroup || user?.premiumAccess || user?.subscriptionStatus === "active";

  const chessQuotes = useMemo(
    () => [
      'Garry Kasparov - "Chess is mental torture."',
      'Magnus Carlsen - "Without the element of enjoyment, it is not worth trying to excel at anything."',
      'Bobby Fischer - "Chess demands total concentration."',
      'Anatoly Karpov - "Chess is everything: art, science, and sport."',
      'Vladimir Kramnik - "Chess is about logic and imagination."',
      'José Raúl Capablanca - "You may learn much more from a game you lose than from a game you win."',
      'Mikhail Tal - "You must take your opponent into a deep dark forest where 2+2=5."',
      'Emanuel Lasker - "When you see a good move, look for a better one."',
      'Paul Morphy - "The ability to play chess is the sign of a gentleman."',
      'Alexander Alekhine - "The task of positional play is to prepare the attack."',
      'Viswanathan Anand - "You cannot win without risk."',
      'Nigel Short - "Chess is brutal."',
      'Hikaru Nakamura - "If you don’t enjoy the fight, you won’t last."',
      'Judit Polgár - "Chess has always been my language."',
      'Mikhail Botvinnik - "Chess is a game of planning."',
      'Wilhelm Steinitz - "The king is a fighting piece."',
      'Siegbert Tarrasch - "Chess, like love, is a madness."',
      'Bent Larsen - "If you want to play good chess, you must risk something."',
      'Max Euwe - "Strategy requires thought, tactics require instinct."',
      'Gata Kamsky - "Every move has a story."',
      'Alireza Firouzja - "Confidence is everything at the board."',
      'Ian Nepomniachtchi - "Momentum decides games."',
      'Fabiano Caruana - "Precision matters more than speed."',
      'Sergey Karjakin - "Defense is an art."',
      'Levon Aronian - "Creativity is what separates players."',
      'Akiba Rubinstein - "Endgames are the soul of chess."',
      'Tigran Petrosian - "If your opponent has threats, you must answer them."',
      'Vasily Ivanchuk - "Chess is about understanding."',
      'Robert James Fischer - "I like the moment when I break a man’s ego."',
      'David Bronstein - "Chess is imagination."',
      'Savielly Tartakower - "No game was ever won by resigning."',
      'Richard Réti - "The goal of the opening is to reach a playable middlegame."',
      'André Danican Philidor - "Pawns are the soul of chess."',
      'Wesley So - "Calmness wins games."',
      'Teimour Radjabov - "Patience is a weapon."',
      'Hou Yifan - "Chess teaches discipline."',
      'Paul Keres - "Every position demands respect."',
      'Boris Spassky - "Chess is a struggle."',
      'Mikhail Chigorin - "Attack is the best form of defense."',
      'Viktor Korchnoi - "Fighting spirit is everything."',
      'John Nunn - "Accuracy defines strength."',
      'Susan Polgar - "Champions are made by consistency."',
      'Garry Kasparov - "You must believe in your move."',
      'Magnus Carlsen - "Pressure creates mistakes."',
      'Bobby Fischer - "I like a strong opponent."',
      'Anatoly Karpov - "Chess is patience."',
      'Mikhail Tal - "Risk is part of beauty."',
      'Emanuel Lasker - "Truth is found on the board."',
      'José Raúl Capablanca - "Simplicity is the highest form of clarity."',
      'Vladimir Kramnik - "Chess rewards understanding."',
    ],
    [],
  );

  const quoteOfDay = useMemo(() => {
    const today = new Date();
    const start = Date.UTC(2024, 0, 1);
    const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const daysSinceStart = Math.floor((todayUtc - start) / (1000 * 60 * 60 * 24));
    const idx = ((daysSinceStart % chessQuotes.length) + chessQuotes.length) % chessQuotes.length;
    return chessQuotes[idx];
  }, [chessQuotes]);

  const quoteAuthor = useMemo(() => {
    const dashIndex = quoteOfDay.indexOf(" - ");
    if (dashIndex === -1) return "";
    return quoteOfDay.slice(0, dashIndex);
  }, [quoteOfDay]);

  const quoteLine = useMemo(() => {
    const dashIndex = quoteOfDay.indexOf(" - ");
    if (dashIndex === -1) return quoteOfDay;
    return quoteOfDay.slice(dashIndex + 3);
  }, [quoteOfDay]);

  useEffect(() => {
    setShowOverlay(overlayFromLocation);
  }, [overlayFromLocation]);

  useEffect(() => {
    overlayTimers.current.forEach((t) => window.clearTimeout(t));
    overlayTimers.current = [];

    if (showOverlay) {
      setOverlayLeaving(false);
      overlayTimers.current.push(window.setTimeout(() => setOverlayLeaving(true), loadingHoldMs));
      overlayTimers.current.push(window.setTimeout(() => setShowOverlay(false), loadingHoldMs + 900));
    }

    return () => {
      overlayTimers.current.forEach((t) => window.clearTimeout(t));
      overlayTimers.current = [];
    };
  }, [showOverlay]);

  useEffect(() => {
    if (showOverlay) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
    document.body.style.overflow = "";
  }, [showOverlay]);

  useEffect(() => {
    if (!user) return;
    if (!canAccessPremium && (activeTab === "blackbook" || activeTab === "ai")) {
      setActiveTab("explore");
      setLocation("/checkout");
    }
  }, [activeTab, canAccessPremium, setLocation, user]);

  const contentVisible = !showOverlay;
  const firstName = useMemo(() => {
    const raw = user?.displayName || user?.chessUsername || user?.email?.split("@")[0] || "Player";
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
  const streak = user?.streak ?? 0;
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

  useEffect(() => {
    if (activeTab !== "explore" || typeof window === "undefined") return;
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
  }, [activeTab, twitchFallback]);

  useEffect(() => {
    if (typeof window === "undefined" || activeTab !== "explore" || !contentVisible) return;
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
      node.classList.remove("visible");
      observer.observe(node);
    });
    return () => observer.disconnect();
  }, [activeTab, contentVisible]);

  useEffect(() => {
    if (activeTab !== "explore" || !contentVisible) {
      setProfileVisible(false);
      return;
    }
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
  }, [activeTab, contentVisible]);

  const surveyQuestions = useMemo(
    () => [
      {
        id: "level",
        title: "1️⃣ Current Playing Level",
        prompt: "What best describes your current strength?",
        options: [
          "Beginner (0-800)",
          "Club Player (800-1200)",
          "Intermediate (1200-1600)",
          "Advanced (1600-2000)",
          "Expert / Title Track (2000+)",
        ],
      },
      {
        id: "goal",
        title: "2️⃣ Primary Goal",
        prompt: "What is your main objective right now?",
        options: [
          "Improve overall strength",
          "Gain rating fast",
          "Stop blundering",
          "Prepare for tournaments",
          "Learn openings properly",
          "Become a serious competitive player",
        ],
      },
      {
        id: "weakness",
        title: "3️⃣ Self-Assessment (Pick ONE Weakest Area)",
        prompt: "Where do you struggle the most?",
        options: [
          "Blunders & calculation",
          "Tactics",
          "Opening understanding",
          "Middlegame planning",
          "Endgames",
          "Time management",
          "Mental game",
        ],
      },
      {
        id: "style",
        title: "4️⃣ Playing Style",
        prompt: "Which style fits you best?",
        options: [
          "Aggressive / attacking",
          "Positional / strategic",
          "Tactical / dynamic",
          "Solid / defensive",
          "I don't know yet",
        ],
      },
      {
        id: "loss",
        title: "5️⃣ Typical Game Loss Reason",
        prompt: "When you lose, it's usually because of:",
        options: [
          "One big blunder",
          "Gradual positional squeeze",
          "Poor opening position",
          "Time trouble",
          "Psychological tilt",
        ],
      },
    ],
    [],
  );

  const trainingPlans = useMemo<Record<PlanKey, TrainingPlan>>(
    () => ({
      beginner: {
        label: "Beginner",
        days: [
          {
            day: "Day 1",
            items: [
              "Complete 15 easy tactics (hanging pieces, free captures)",
              "Practice basic opening principles (develop pieces, control centre)",
              "Checkmate drill: King + Queen vs King",
              "Play 1 game (10+0)",
            ],
          },
          {
            day: "Day 2",
            items: [
              "Complete 15 easy tactics (one-move threats, undefended pieces)",
              "Identify bad opening moves (5 examples)",
              "Checkmate drill: King + Rook vs King",
              "Play 1 game (10+0)",
            ],
          },
          {
            day: "Day 3",
            items: [
              "Complete 20 easy tactics (simple forks, checks)",
              "Practice castling early in sample positions",
              "Endgame drill: King + Pawn vs King (basic promotion)",
              "Play 1 game (10+5)",
            ],
          },
          {
            day: "Day 4",
            items: [
              "Complete 20 easy tactics (missed captures, basic mates)",
              "Opening exercise: choose the best developing move (5 positions)",
              "Endgame drill: Opposition basics",
              "Play 1 game (10+5)",
            ],
          },
          {
            day: "Day 5",
            items: [
              "Complete 25 easy tactics (mixed beginner patterns)",
              "Review opening principles (centre, development, king safety)",
              "Checkmate drill: King + Queen vs King (timed)",
              "Play 1 game (10+0)",
            ],
          },
          {
            day: "Day 6",
            items: [
              "Play 2-3 games (10+5)",
              "After each game, note the first blunder",
              "Identify one missed capture per game",
            ],
          },
          {
            day: "Day 7",
            items: [
              "Review 1 full game from the week",
              "List all pieces lost for free",
              "Replay correct moves in those positions",
            ],
          },
        ],
      },
      club: {
        label: "Club Player",
        days: [
          {
            day: "Day 1",
            items: [
              "Complete 20 medium tactics (forks, pins, skewers)",
              "Calculate 3 positions (2-3 moves deep)",
              "Endgame drill: King + Pawn vs King (opposition focus)",
              "Play 1 game (15+10)",
            ],
          },
          {
            day: "Day 2",
            items: [
              "Complete 20 medium tactics (discovered attacks, double threats)",
              "Opening review: main idea of your White opening",
              "Endgame drill: Rook vs Pawn (basic technique)",
              "Play 1 game (15+10)",
            ],
          },
          {
            day: "Day 3",
            items: [
              "Complete 25 medium tactics (mixed motifs)",
              "Calculate 3 positions (candidate moves first)",
              "Endgame drill: King activity in simplified endings",
              "Play 1 game (10+5)",
            ],
          },
          {
            day: "Day 4",
            items: [
              "Complete 20 medium tactics (defensive tactics, finding resources)",
              "Opening review: Black vs 1.e4 main plan",
              "Endgame drill: Basic rook endgame principles (active rook)",
              "Play 1 game (15+10)",
            ],
          },
          {
            day: "Day 5",
            items: [
              "Complete 25 medium tactics (accuracy over speed)",
              "Opening review: Black vs 1.d4 main plan",
              "Endgame drill: Convert extra pawn with correct king placement",
              "Play 1 game (10+5)",
            ],
          },
          {
            day: "Day 6",
            items: [
              "Play 2-3 games (15+10)",
              "Identify critical moments in each game",
              "Note one missed tactic per game",
            ],
          },
          {
            day: "Day 7",
            items: [
              "Review 1 full game deeply",
              "Write down 3 recurring mistakes",
              "Replay the game with improved moves",
            ],
          },
        ],
      },
      intermediate: {
        label: "Intermediate",
        days: [
          {
            day: "Day 1",
            items: [
              "Solve 25 hard tactics (calculation, forcing lines)",
              "Calculate 3 positions (3-4 moves deep, no moving pieces)",
              "Endgame drill: Lucena position",
              "Play 1 game (15+10)",
            ],
          },
          {
            day: "Day 2",
            items: [
              "Solve 25 hard tactics (defensive resources, zwischenzugs)",
              "Opening study: White opening middlegame plans",
              "Endgame drill: Philidor position",
              "Play 1 game (15+10)",
            ],
          },
          {
            day: "Day 3",
            items: [
              "Solve 30 mixed tactics (precision over speed)",
              "Calculate 3 positions (identify candidate moves first)",
              "Endgame drill: Rook activity and cut-off technique",
              "Play 1 game (10+5)",
            ],
          },
          {
            day: "Day 4",
            items: [
              "Solve 25 hard tactics (sacrifices, king attacks)",
              "Opening study: Black vs 1.e4 key structures",
              "Endgame drill: Minor piece endgame basics",
              "Play 1 game (15+10)",
            ],
          },
          {
            day: "Day 5",
            items: [
              "Solve 30 mixed tactics (complex combinations)",
              "Opening study: Black vs 1.d4 key structures",
              "Endgame drill: Converting extra pawn in rook endings",
              "Play 1 game (10+5)",
            ],
          },
          {
            day: "Day 6",
            items: [
              "Play 2-3 games (15+10)",
              "Mark all critical positions during review",
              "Identify one calculation mistake per game",
            ],
          },
          {
            day: "Day 7",
            items: [
              "Deep review 1 game from the week",
              "Write down 3 strategic mistakes",
              "Recalculate missed critical positions",
            ],
          },
        ],
      },
      advanced: {
        label: "Advanced",
        days: [
          {
            day: "Day 1",
            items: [
              "Solve 30 advanced tactics (multi-move combinations)",
              "Calculate 3 positions (4-5 moves deep, full variation trees)",
              "Endgame drill: Advanced Lucena variations",
              "Play 1 game (25+10)",
            ],
          },
          {
            day: "Day 2",
            items: [
              "Solve 30 advanced tactics (defensive resources, quiet moves)",
              "Opening study: White repertoire critical lines",
              "Endgame drill: Advanced Philidor positions",
              "Play 1 game (25+10)",
            ],
          },
          {
            day: "Day 3",
            items: [
              "Solve 35 mixed tactics (complex calculation)",
              "Calculate 3 positions (compare candidate evaluations)",
              "Endgame drill: Rook + pawn vs rook (practical technique)",
              "Play 1 game (15+10)",
            ],
          },
          {
            day: "Day 4",
            items: [
              "Solve 30 advanced tactics (sacrifices, king safety)",
              "Opening study: Black vs 1.e4 concrete preparation",
              "Endgame drill: Minor-piece endgames with extra pawn",
              "Play 1 game (25+10)",
            ],
          },
          {
            day: "Day 5",
            items: [
              "Solve 35 mixed tactics (accuracy under pressure)",
              "Opening study: Black vs 1.d4 concrete preparation",
              "Endgame drill: Conversion of technical advantages",
              "Play 1 game (15+10)",
            ],
          },
          {
            day: "Day 6",
            items: [
              "Play 2 long games (25+10)",
              "Identify all critical decision points",
              "Review calculation accuracy in those positions",
            ],
          },
          {
            day: "Day 7",
            items: [
              "Deep-review 1 game with engine comparison",
              "List 3 recurring strategic or technical issues",
              "Recalculate missed critical lines",
            ],
          },
        ],
      },
      expert: {
        label: "Expert",
        days: [
          {
            day: "Day 1",
            items: [
              "Solve 40 expert-level tactics (forcing lines, quiet moves)",
              "Calculate 3 positions (5-6 moves deep, full variation trees)",
              "Endgame drill: Complex rook endings (defensive + winning)",
              "Play 1 game (45+15)",
            ],
          },
          {
            day: "Day 2",
            items: [
              "Solve 40 expert-level tactics (defensive resources, counterplay)",
              "Opening prep: White repertoire critical novelties",
              "Endgame drill: Rook + minor piece endgames",
              "Play 1 game (45+15)",
            ],
          },
          {
            day: "Day 3",
            items: [
              "Solve 45 mixed expert tactics (precision under pressure)",
              "Calculate 3 positions (evaluate candidate moves deeply)",
              "Endgame drill: Opposite-coloured bishop endings",
              "Play 1 game (25+10)",
            ],
          },
          {
            day: "Day 4",
            items: [
              "Solve 40 expert-level tactics (sacrifices, king safety)",
              "Opening prep: Black vs 1.e4 concrete lines & move orders",
              "Endgame drill: Queen endgame fundamentals",
              "Play 1 game (45+15)",
            ],
          },
          {
            day: "Day 5",
            items: [
              "Solve 45 mixed expert tactics (long combinations)",
              "Opening prep: Black vs 1.d4 concrete lines & move orders",
              "Endgame drill: Converting minimal advantages",
              "Play 1 game (25+10)",
            ],
          },
          {
            day: "Day 6",
            items: [
              "Play 2 classical games (45+15)",
              "Identify all critical positions",
              "Analyse calculation accuracy and time usage",
            ],
          },
          {
            day: "Day 7",
            items: [
              "Deep-review 1 game with engine + human evaluation",
              "Write down 3 recurring weaknesses",
              "Recalculate all missed critical variations",
            ],
          },
        ],
      },
    }),
    [],
  );

  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, string>>({});
  const [surveyIndex, setSurveyIndex] = useState(0);
  const [planKey, setPlanKey] = useState<PlanKey | null>(null);
  const [showPlan, setShowPlan] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [planDayIndex, setPlanDayIndex] = useState(0);
  const [viewDayIndex, setViewDayIndex] = useState(0);
  const [dayChecks, setDayChecks] = useState<Record<number, boolean[]>>({});
  const [completedDays, setCompletedDays] = useState<Record<number, boolean>>({});
  const [nextUnlockAt, setNextUnlockAt] = useState<number | null>(null);
  const [pendingDayIndex, setPendingDayIndex] = useState<number | null>(null);
  const [pendingUnlockDate, setPendingUnlockDate] = useState<string | null>(null);
  const [showXpToast, setShowXpToast] = useState(false);
  const planDayXp = 115;
  const [blackBookChesscom, setBlackBookChesscom] = useState("");
  const [blackBookLichess, setBlackBookLichess] = useState("");
  const [showBlackBookResult, setShowBlackBookResult] = useState(false);
  const [blackBookResult, setBlackBookResult] = useState<ChessProfile | null>(null);
  const [blackBookError, setBlackBookError] = useState("");
  const [blackBookLoading, setBlackBookLoading] = useState(false);
  const [showPgnModal, setShowPgnModal] = useState(false);
  const [downloadColor, setDownloadColor] = useState<"white" | "black">("white");
  const [downloadOpening, setDownloadOpening] = useState("");
  const [downloadCount, setDownloadCount] = useState(25);
  const [downloadError, setDownloadError] = useState("");
  const surveyRef = useRef<HTMLDivElement | null>(null);
  const buildTimerRef = useRef<number | null>(null);
  const unlockTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const planHydratedRef = useRef(false);

  const resetSurvey = useCallback(() => {
    if (buildTimerRef.current) {
      window.clearTimeout(buildTimerRef.current);
    }
    if (unlockTimerRef.current) {
      window.clearTimeout(unlockTimerRef.current);
    }
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setSurveyAnswers({});
    setSurveyIndex(0);
    setPlanKey(null);
    setShowPlan(false);
    setIsBuilding(false);
    setPlanDayIndex(0);
    setViewDayIndex(0);
    setDayChecks({});
    setCompletedDays({});
    setNextUnlockAt(null);
    setPendingDayIndex(null);
    setPendingUnlockDate(null);
    setShowXpToast(false);
  }, []);

  useEffect(() => {
    return () => {
      if (buildTimerRef.current) {
        window.clearTimeout(buildTimerRef.current);
      }
      if (unlockTimerRef.current) {
        window.clearTimeout(unlockTimerRef.current);
      }
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    planHydratedRef.current = false;
    if (!user?.id) return;
    const userId = user.id;
    let active = true;
    const loadPlan = async () => {
      try {
        const snap = await get(ref(db, `squarebaseTraining/${userId}`));
        if (!active) return;
        if (snap.exists()) {
          const data = snap.val() as Partial<StoredPlanState>;
          if (data.planKey) {
            setPlanKey(data.planKey);
            setShowPlan(true);
          } else {
            setPlanKey(null);
            setShowPlan(false);
          }
          setPlanDayIndex(typeof data.planDayIndex === "number" ? data.planDayIndex : 0);
          setViewDayIndex(
            typeof data.viewDayIndex === "number"
              ? data.viewDayIndex
              : typeof data.planDayIndex === "number"
                ? data.planDayIndex
                : 0,
          );
          setDayChecks((data.dayChecks as Record<number, boolean[]>) ?? {});
          setCompletedDays((data.completedDays as Record<number, boolean>) ?? {});
          setPendingDayIndex(typeof data.pendingDayIndex === "number" ? data.pendingDayIndex : null);
          const rawNextUnlockAt = typeof data.nextUnlockAt === "number" ? data.nextUnlockAt : null;
          const rawPendingUnlockDate = typeof data.pendingUnlockDate === "string" ? data.pendingUnlockDate : null;
          const derivedUnlockDate =
            rawPendingUnlockDate ?? (rawNextUnlockAt !== null ? getLocalDateKey(new Date(rawNextUnlockAt)) : null);
          setPendingUnlockDate(derivedUnlockDate);
          const normalizedNextUnlockAt = derivedUnlockDate ? getMidnightMsForDateKey(derivedUnlockDate) : rawNextUnlockAt;
          setNextUnlockAt(typeof normalizedNextUnlockAt === "number" ? normalizedNextUnlockAt : null);
          setIsBuilding(false);
        }
      } catch (err) {
        console.warn("Failed to load SquareBase training plan", err);
      } finally {
        if (active) {
          planHydratedRef.current = true;
        }
      }
    };
    loadPlan();
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !planHydratedRef.current) return;
    const userId = user.id;
    const path = `squarebaseTraining/${userId}`;
    if (!planKey) {
      remove(ref(db, path)).catch((err) => console.warn("Failed to clear SquareBase training plan", err));
      return;
    }
    const payload: StoredPlanState = {
      planKey,
      planDayIndex,
      viewDayIndex,
      dayChecks,
      completedDays,
      pendingDayIndex,
      pendingUnlockDate,
      nextUnlockAt,
      updatedAt: Date.now(),
    };
    set(ref(db, path), payload).catch((err) => console.warn("Failed to save SquareBase training plan", err));
  }, [user?.id, planKey, planDayIndex, viewDayIndex, dayChecks, completedDays, pendingDayIndex, pendingUnlockDate, nextUnlockAt]);

  const goSurveyStep = (direction: number) => {
    setSurveyIndex((prev) => {
      const next = prev + direction;
      if (next < 0) return 0;
      if (next >= surveyQuestions.length) return surveyQuestions.length - 1;
      return next;
    });
  };

  const resolvePlanKey = (): PlanKey => {
    const level = surveyAnswers.level || "";
    if (level.startsWith("Beginner")) return "beginner";
    if (level.startsWith("Club")) return "club";
    if (level.startsWith("Intermediate")) return "intermediate";
    if (level.startsWith("Advanced")) return "advanced";
    if (level.startsWith("Expert")) return "expert";
    return "beginner";
  };

  const handleSurveySubmit = () => {
    if (isBuilding) return;
    const allAnswered = surveyQuestions.every((q) => surveyAnswers[q.id]);
    if (!allAnswered) return;
    const nextKey = resolvePlanKey();
    setPlanDayIndex(0);
    setViewDayIndex(0);
    setDayChecks({});
    setCompletedDays({});
    setNextUnlockAt(null);
    setPendingDayIndex(null);
    setPendingUnlockDate(null);
    setShowXpToast(false);
    if (unlockTimerRef.current) {
      window.clearTimeout(unlockTimerRef.current);
    }
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setPlanKey(nextKey);
    setShowPlan(false);
    setIsBuilding(true);
    if (buildTimerRef.current) {
      window.clearTimeout(buildTimerRef.current);
    }
    buildTimerRef.current = window.setTimeout(() => {
      setIsBuilding(false);
      setShowPlan(true);
    }, 5000);
  };

  const activePlan = planKey ? trainingPlans[planKey] : null;
  const allSurveyAnswered = surveyQuestions.every((q) => surveyAnswers[q.id]);
  const totalPlanDays = activePlan?.days.length ?? 0;
  const unlockedDayIndex = totalPlanDays > 0 ? Math.min(planDayIndex, totalPlanDays - 1) : 0;
  const visibleDayIndex = totalPlanDays > 0 ? Math.min(viewDayIndex, totalPlanDays - 1) : 0;
  const unlockedPlanDay = activePlan ? activePlan.days[unlockedDayIndex] : null;
  const visiblePlanDay = activePlan ? activePlan.days[visibleDayIndex] : null;
  const visibleDayChecks = visiblePlanDay
    ? dayChecks[visibleDayIndex] ?? Array(visiblePlanDay.items.length).fill(false)
    : [];
  const unlockedDayComplete = Boolean(completedDays[unlockedDayIndex]);
  const visibleDayComplete = Boolean(completedDays[visibleDayIndex]);
  const visibleDayLocked = activePlan ? visibleDayIndex > unlockedDayIndex : false;
  const canEditVisibleDay = !visibleDayLocked && visibleDayIndex === unlockedDayIndex && !visibleDayComplete;

  const showXpEarned = useCallback(() => {
    setShowXpToast(true);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setShowXpToast(false);
    }, 3000);
  }, []);

  const awardPlanXp = useCallback(
    (dayIndex: number) => {
      showXpEarned();
      if (!user?.id) return;
      void awardXp(user.id, planDayXp, { source: "squarebase_day", subsectionId: `day_${dayIndex + 1}` }).then(
        async () => {
          const updated = await getCurrentProfile();
          if (updated && updated.id === user.id) {
            setUser(updated);
          }
        },
      );
    },
    [planDayXp, setUser, showXpEarned, user?.id],
  );

  const completeDay = useCallback(() => {
    if (!activePlan) return;
    if (completedDays[unlockedDayIndex]) return;
    setCompletedDays((prev) => ({ ...prev, [unlockedDayIndex]: true }));
    awardPlanXp(unlockedDayIndex);
    const nextIndex = unlockedDayIndex + 1;
    if (nextIndex >= activePlan.days.length) return;
    setPendingDayIndex(nextIndex);
    const unlockAt = getNextLocalMidnightMs();
    setPendingUnlockDate(getLocalDateKey(new Date(unlockAt)));
    setNextUnlockAt(unlockAt);
  }, [activePlan, awardPlanXp, completedDays, unlockedDayIndex]);

  const handleDayCheck = useCallback(
    (itemIndex: number) => {
      if (!unlockedPlanDay) return;
      if (completedDays[unlockedDayIndex]) return;
      setDayChecks((prev) => {
        const current = prev[unlockedDayIndex] ?? Array(unlockedPlanDay.items.length).fill(false);
        const nextChecks = [...current];
        nextChecks[itemIndex] = !nextChecks[itemIndex];
        return { ...prev, [unlockedDayIndex]: nextChecks };
      });
    },
    [completedDays, unlockedDayIndex, unlockedPlanDay],
  );

  useEffect(() => {
    if (!unlockedPlanDay) return;
    const checks = dayChecks[unlockedDayIndex];
    if (!checks || checks.length !== unlockedPlanDay.items.length) return;
    if (!checks.every(Boolean)) return;
    if (completedDays[unlockedDayIndex]) return;
    completeDay();
  }, [completeDay, completedDays, dayChecks, unlockedDayIndex, unlockedPlanDay]);

  useEffect(() => {
    if (pendingDayIndex === null) return;
    if (unlockTimerRef.current) {
      window.clearTimeout(unlockTimerRef.current);
    }
    const todayKey = getLocalDateKey();
    const unlockDateKey =
      pendingUnlockDate ?? (typeof nextUnlockAt === "number" ? getLocalDateKey(new Date(nextUnlockAt)) : null);
    if (unlockDateKey && unlockDateKey <= todayKey) {
      setPlanDayIndex(pendingDayIndex);
      setViewDayIndex(pendingDayIndex);
      setPendingDayIndex(null);
      setNextUnlockAt(null);
      setPendingUnlockDate(null);
      return;
    }
    const unlockAt = unlockDateKey ? getMidnightMsForDateKey(unlockDateKey) : nextUnlockAt;
    if (unlockAt === null || unlockAt === undefined) return;
    const delay = Math.max(unlockAt - Date.now(), 0);
    unlockTimerRef.current = window.setTimeout(() => {
      setPlanDayIndex(pendingDayIndex);
      setViewDayIndex(pendingDayIndex);
      setPendingDayIndex(null);
      setNextUnlockAt(null);
      setPendingUnlockDate(null);
    }, delay);
    return () => {
      if (unlockTimerRef.current) {
        window.clearTimeout(unlockTimerRef.current);
      }
    };
  }, [nextUnlockAt, pendingDayIndex, pendingUnlockDate]);

  const movePlanDay = (direction: number) => {
    if (!activePlan) return;
    setViewDayIndex((prev) => {
      const next = prev + direction;
      if (next < 0) return 0;
      if (next >= activePlan.days.length) return activePlan.days.length - 1;
      return next;
    });
  };

  const handleBlackBookExecute = async () => {
    const chesscom = blackBookChesscom.trim();
    const lichess = blackBookLichess.trim();
    const usernameRe = /^[A-Za-z0-9_-]{2,30}$/;

    setBlackBookError("");
    if (!chesscom && !lichess) {
      setBlackBookError("Enter at least one username.");
      return;
    }
    if (chesscom && lichess) {
      setBlackBookError("Enter only one username.");
      return;
    }
    if ((chesscom && !usernameRe.test(chesscom)) || (lichess && !usernameRe.test(lichess))) {
      setBlackBookError("Use 2-30 characters: letters, numbers, - or _.");
      return;
    }

    setBlackBookLoading(true);
    setShowBlackBookResult(false);
    setBlackBookResult(null);
    try {
      const platform = chesscom ? "chesscom" : "lichess";
      const username = chesscom || lichess;
      const resp = await fetch(
        `/api/chess/profile?platform=${encodeURIComponent(platform)}&username=${encodeURIComponent(username)}`,
      );
      let payload: ChessProfile | { error?: string } | null = null;
      try {
        payload = (await resp.json()) as ChessProfile | { error?: string };
      } catch {
        payload = null;
      }
      if (!resp.ok) {
        const msg = payload && "error" in payload && payload.error ? payload.error : "Failed to load profile.";
        setBlackBookError(msg);
        return;
      }
      if (!payload) {
        setBlackBookError("Profile API unavailable. Try again.");
        return;
      }
      const profile = payload as ChessProfile;
      setBlackBookResult(profile);
      setShowBlackBookResult(true);
    } catch (err) {
      setBlackBookError("Failed to load profile.");
    } finally {
      setBlackBookLoading(false);
    }
  };

  const extractOpeningFromPgn = (pgn?: string | null) => {
    if (!pgn) return null;
    const match = pgn.match(/\[\s*Opening\s+"([^"]+)"\s*\]/);
    return match ? match[1] : null;
  };

  const resolveGameOpening = (game: ChessProfile["recentGames"][number]) =>
    game.opening || extractOpeningFromPgn(game.pgn);

  const resetBlackBookTarget = () => {
    setShowBlackBookResult(false);
    setBlackBookResult(null);
    setBlackBookError("");
    setBlackBookChesscom("");
    setBlackBookLichess("");
    setShowPgnModal(false);
  };

  useEffect(() => {
    if (!showPgnModal || !blackBookResult) return;
    const openings = downloadColor === "white" ? blackBookResult.openings?.white : blackBookResult.openings?.black;
    if (openings && openings.length > 0) {
      setDownloadOpening(openings[0].name);
    } else {
      setDownloadOpening("");
    }
  }, [blackBookResult, downloadColor, showPgnModal]);

  const handleDownloadPgn = () => {
    if (!blackBookResult) return;
    setDownloadError("");
    const targetColor = downloadColor;
    const openingName = downloadOpening;
    const count = Math.min(Math.max(Number(downloadCount) || 1, 1), 500);

    const filtered = blackBookResult.recentGames.filter((game) => {
      if (game.color !== targetColor) return false;
      if (!openingName) return true;
      return resolveGameOpening(game) === openingName;
    });

    const withPgn = filtered.filter((game) => Boolean(game.pgn));
    if (withPgn.length === 0) {
      setDownloadError("No PGN available for that selection.");
      return;
    }

    const selected = withPgn.slice(0, count);
    const content = selected.map((game) => game.pgn).join("\n\n");
    const blob = new Blob([content], { type: "application/x-chess-pgn" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${blackBookResult.username || "target"}-${targetColor}-games.pgn`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setShowPgnModal(false);
  };

  return (
    <div className="sb-root">
      <aside className="sb-sidebar">
        <div className="sb-brand">
          <div className="sb-mark" aria-hidden="true">
            <img src={squareBaseLogo} alt="SquareBase logo" className="sb-mark-img" />
          </div>
          <div className="sb-title">
            <div className="sb-name">SquareBase{"\u2122"}</div>
            <div className="sb-sub">Chess Intelligence System</div>
          </div>
        </div>

        <nav className="sb-nav">
          <button
            className={`sb-navItem ${activeTab === "explore" ? "sb-navItem--active" : ""}`}
            onClick={() => setActiveTab("explore")}
          >
            <Compass className="sb-navIcon" />
            Explore
          </button>
          <button
            className={`sb-navItem ${activeTab === "blackbook" ? "sb-navItem--active" : ""}`}
            onClick={() => {
              if (user && !canAccessPremium) {
                setLocation("/checkout");
                return;
              }
              setActiveTab("blackbook");
            }}
          >
            <BookOpen className="sb-navIcon" />
            BlackBook
          </button>
          <button
            className={`sb-navItem ${activeTab === "analysis" ? "sb-navItem--active" : ""}`}
            onClick={() => setActiveTab("analysis")}
          >
            <LineChart className="sb-navIcon" />
            Analysis
          </button>
          <button
            className={`sb-navItem ${activeTab === "ai" ? "sb-navItem--active" : ""}`}
            onClick={() => {
              if (user && !canAccessPremium) {
                setLocation("/checkout");
                return;
              }
              setActiveTab("ai");
            }}
          >
            <Brain className="sb-navIcon" />
            AI Training Plan
          </button>
        </nav>

        <div className="sb-divider" />

        <button className="sb-exit" onClick={() => setLocation("/dashboard")}>
          <LogOut className="h-4 w-4" />
          Return to PawnPoint
        </button>

        <div className="sb-footer">{"\u00a9"} {year} Pawn Point</div>
      </aside>

      <main className="sb-main">
        {activeTab === "explore" && <div className="sb-particles" aria-hidden="true" />}
        <div className="sb-mainInner">
          {activeTab === "explore" && (
            <header className="sb-hero">
              <h1 className="sb-heroTitle">SquareBase{"\u2122"}</h1>
              <p className="sb-heroTagline">Your Personal Chess Intelligence System.</p>
              <div className="sb-heroDivider" />
            </header>
          )}

          {contentVisible && activeTab === "explore" && (
            <>
              <div className="w-full max-w-6xl mx-auto px-4 md:px-0 -mt-6 sm:-mt-4 md:-mt-2">
                <div className="mb-4" />
                <div
                  ref={profileRef}
                  className="grid grid-cols-1 md:grid-cols-[minmax(0,540px)_minmax(0,1fr)] gap-10 md:gap-12 items-start mt-10"
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
                      <div className="grid grid-cols-3 gap-3">
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
                    <div className="rounded-2xl border border-white/15 bg-white/5 feature-card flex items-center justify-center gap-4 p-4 w-full shadow-[0_18px_45px_rgba(0,0,0,0.35)] h-[150px]">
                      <div className="h-16 w-16 rounded-full bg-white/10 border border-white/15 flex items-center justify-center shadow-[0_12px_30px_rgba(0,0,0,0.3)] shrink-0">
                        <Flame className="h-8 w-8 text-yellow-300 flame-pulse" />
                      </div>
                      <div className="flex flex-col gap-1 text-center">
                        <div className="text-4xl font-semibold text-white leading-tight">
                          {streak} day{streak === 1 ? "" : "s"}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="w-full max-w-xl flex flex-col gap-5 md:justify-self-end">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start justify-items-center md:justify-items-start">
                      <div className="rounded-2xl border border-white/15 bg-white/5 aspect-square w-full max-w-[260px] flex flex-col items-center justify-center gap-3 text-center p-5 shadow-[0_18px_45px_rgba(0,0,0,0.35)] transition-transform duration-300 hover:-translate-y-2 md:justify-self-start">
                        <div className="h-24 w-24 rounded-full bg-white/10 border border-white/15 flex items-center justify-center shadow-[0_12px_30px_rgba(0,0,0,0.3)]">
                          <Puzzle className="h-10 w-10 text-white" />
                        </div>
                        <div className="text-lg font-semibold text-white">Daily Puzzle</div>
                        <button
                          type="button"
                          onClick={() => setLocation("/puzzles")}
                          className="px-4 py-2 rounded-full bg-white text-black font-semibold shadow-[0_12px_30px_rgba(0,0,0,0.25)] hover:shadow-[0_14px_36px_rgba(0,0,0,0.3)] transition"
                        >
                          Solve Now
                        </button>
                      </div>
                      <div className="rounded-2xl border border-white/15 bg-white/5 aspect-square w-full max-w-[260px] flex flex-col items-center justify-center gap-3 text-center p-5 shadow-[0_18px_45px_rgba(0,0,0,0.35)] transition-transform duration-300 hover:-translate-y-2 md:justify-self-start md:translate-x-3">
                        <div className="h-24 w-24 rounded-full overflow-hidden border border-white/15 shadow-[0_12px_30px_rgba(0,0,0,0.3)]">
                          <img src={southKnight} alt="South Knight" className="h-full w-full object-cover" />
                        </div>
                        <div className="text-lg font-semibold text-white">South Knight</div>
                        <button
                          type="button"
                          onClick={() => setLocation("/practice")}
                          className="px-4 py-2 rounded-full bg-white text-black font-semibold shadow-[0_12px_30px_rgba(0,0,0,0.25)] hover:shadow-[0_14px_36px_rgba(0,0,0,0.3)] transition"
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
              <div className="sb-quote">
                <div className="sb-quoteLabel">Quote of the day</div>
                <div className="sb-quoteText">
                  {quoteAuthor && <span className="sb-quoteAuthor">{quoteAuthor} - </span>}
                  <span className="sb-quoteLine">{quoteLine}</span>
                </div>
              </div>
            </>
          )}

          {contentVisible && activeTab === "analysis" && (
            <div className="sb-analysis">
              <div className="sb-analysisBoard">
                <div className="sb-analysisBoardInner">
                  <PracticeBoard embedded analysisMode showEvalBar />
                </div>
              </div>
            </div>
          )}

          {contentVisible && activeTab === "blackbook" && (
            <div className="sb-analysis">
              <div className="sb-analysisBoard">
                <div className="sb-analysisBoardInner">
                  <div className="sb-blackbook">
                    {!showBlackBookResult || !blackBookResult ? (
                      <div className="sb-blackbookCard">
                        <div className="sb-blackbookTitle">BlackBook OPX</div>
                        <div className="sb-blackbookSubtitle">Enter targets username to begin AI Analysis.</div>
                        <div className="sb-blackbookFields">
                          <label className="sb-blackbookField">
                            <span>Chess.com username</span>
                            <input
                              className="sb-blackbookInput"
                              type="text"
                              value={blackBookChesscom}
                              onChange={(event) => setBlackBookChesscom(event.target.value)}
                              placeholder="chesscom_handle"
                              disabled={blackBookLichess.trim().length > 0}
                            />
                          </label>
                          <label className="sb-blackbookField">
                            <span>Lichess username</span>
                            <input
                              className="sb-blackbookInput"
                              type="text"
                              value={blackBookLichess}
                              onChange={(event) => setBlackBookLichess(event.target.value)}
                              placeholder="lichess_handle"
                              disabled={blackBookChesscom.trim().length > 0}
                            />
                          </label>
                        </div>
                        {blackBookError && <div className="sb-blackbookError">{blackBookError}</div>}
                        <button
                          className="sb-blackbookAction"
                          type="button"
                          onClick={handleBlackBookExecute}
                          disabled={blackBookLoading}
                        >
                          {blackBookLoading ? "Executing..." : "Execute"}
                        </button>
                      </div>
                    ) : (
                      <div className="sb-blackbookResult">
                        <div className="sb-opxUnified">
                          <div className="sb-opxHeader">
                            <div className="sb-opxIdentity">
                              <div className="sb-opxBadgeIcon" aria-hidden="true">
                                <span>OPX</span>
                              </div>
                              <div>
                                <div className="sb-opxName">
                                  {blackBookResult.displayName || blackBookResult.username || blackBookChesscom || blackBookLichess || "pawn_point"}
                                </div>
                                <div className="sb-opxMeta">
                                  {(blackBookResult.stats?.games ?? 0).toLocaleString()} games - Last 90 days
                                </div>
                              </div>
                            </div>
                            <div className="sb-opxActions">
                              <button className="sb-opxAction" type="button" onClick={() => setShowPgnModal(true)}>
                                Download
                              </button>
                              <button className="sb-opxAction" type="button" onClick={resetBlackBookTarget}>
                                New target
                              </button>
                            </div>
                          </div>

                          <div className="sb-opxSection">
                            <div className="sb-opxSectionTitle">Time Controls</div>
                            <div className="sb-opxRateRow">
                              <div className="sb-opxRateCard">
                                <div className="sb-opxRateValue">{blackBookResult.ratings?.bullet ?? "—"}</div>
                                <div className="sb-opxRateLabel">Bullet</div>
                              </div>
                              <div className="sb-opxRateCard">
                                <div className="sb-opxRateValue">{blackBookResult.ratings?.blitz ?? "—"}</div>
                                <div className="sb-opxRateLabel">Blitz</div>
                              </div>
                              <div className="sb-opxRateCard">
                                <div className="sb-opxRateValue">{blackBookResult.ratings?.rapid ?? "—"}</div>
                                <div className="sb-opxRateLabel">Rapid</div>
                              </div>
                            </div>
                          </div>

                          <div className="sb-opxSection">
                            <div className="sb-opxSectionTitle">Openings</div>
                            <div className="sb-opxOpeningsGrid">
                              <div>
                                <div className="sb-opxOpeningsLabel">White</div>
                                <div className="sb-opxList">
                                  {(blackBookResult.openings?.white || []).slice(0, 2).map((opening) => (
                                    <div className="sb-opxListItem" key={`white-${opening.name}`}>
                                      <div>
                                        <div className="sb-opxListName">{opening.name}</div>
                                        <div className="sb-opxListMeta">
                                          {opening.freq}% freq - {opening.winRate}% win
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  {(blackBookResult.openings?.white || []).length === 0 && (
                                    <div className="sb-opxEmpty">No openings data yet.</div>
                                  )}
                                </div>
                              </div>
                              <div>
                                <div className="sb-opxOpeningsLabel">Black</div>
                                <div className="sb-opxList">
                                  {(blackBookResult.openings?.black || []).slice(0, 2).map((opening) => (
                                    <div className="sb-opxListItem" key={`black-${opening.name}`}>
                                      <div>
                                        <div className="sb-opxListName">{opening.name}</div>
                                        <div className="sb-opxListMeta">
                                          {opening.freq}% freq - {opening.winRate}% win
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  {(blackBookResult.openings?.black || []).length === 0 && (
                                    <div className="sb-opxEmpty">No openings data yet.</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {contentVisible && activeTab === "ai" && (
            <div className="sb-analysis">
              <div className="sb-analysisBoard">
                <div className="sb-analysisBoardInner">
                  <div className="sb-surveyWrap">
                    <h1 className="sb-surveyHeading premium-light-purple elite-glow">AI Training Program</h1>
                    {showPlan && activePlan ? (
                      <div className="sb-planWrap">
                        <div className="sb-planTitle">{activePlan.label} 7-Day Plan</div>
                        {visiblePlanDay && (
                          <div className="sb-planStage">
                            <div className="sb-planNav">
                              <button
                                className="sb-planNavBtn"
                                onClick={() => movePlanDay(-1)}
                                aria-label="Previous day"
                                disabled={visibleDayIndex === 0}
                              >
                                <ChevronLeft size={18} />
                              </button>
                              <div className="sb-planSingle">
                                <div
                                  className={`sb-planCard ${visibleDayComplete ? "is-complete" : ""} ${visibleDayLocked ? "is-locked" : ""}`}
                                >
                                  {visibleDayLocked && (
                                    <div className="sb-planLockBadge" aria-label="Locked day" title="Locked">
                                      <Lock size={14} />
                                      <span>Locked</span>
                                    </div>
                                  )}
                                  <div className="sb-planDay">{visiblePlanDay.day}</div>
                                  <div className="sb-planItems">
                                    {visiblePlanDay.items.map((item, idx) => (
                                      <label className="sb-planItem" key={`${visiblePlanDay.day}-${idx}`}>
                                        <input
                                          type="checkbox"
                                          checked={Boolean(visibleDayChecks[idx])}
                                          onChange={() => handleDayCheck(idx)}
                                          disabled={!canEditVisibleDay}
                                        />
                                        <span>{item}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <button
                                className="sb-planNavBtn"
                                onClick={() => movePlanDay(1)}
                                aria-label="Next day"
                                disabled={visibleDayIndex >= totalPlanDays - 1}
                              >
                                <ChevronRight size={18} />
                              </button>
                            </div>
                            {unlockedDayComplete && pendingDayIndex !== null && visibleDayIndex === unlockedDayIndex && (
                              <div className="sb-planNext">Next day unlocks tomorrow.</div>
                            )}
                            {unlockedDayComplete &&
                              pendingDayIndex === null &&
                              visibleDayIndex === unlockedDayIndex &&
                              unlockedDayIndex === activePlan.days.length - 1 && (
                                <div className="sb-planNext">Plan complete. Great work.</div>
                              )}
                            <button className="sb-planRetake" type="button" onClick={resetSurvey}>
                              Retake survey
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="sb-surveyShell">
                        <button
                          className="sb-sliderBtn sb-sliderBtn--edge"
                          onClick={() => goSurveyStep(-1)}
                          aria-label="Previous question"
                          disabled={surveyIndex === 0 || isBuilding}
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <div className="sb-surveyTrack" ref={surveyRef}>
                          {(() => {
                            const q = surveyQuestions[surveyIndex];
                            if (!q) return null;
                            const isLast = surveyIndex === surveyQuestions.length - 1;
                            return (
                              <div className="sb-surveyCard" key={q.id}>
                                <div className="sb-surveyStep">{q.title}</div>
                                <div className="sb-surveyPrompt">{q.prompt}</div>
                                <div className="sb-surveyOptions">
                                  {q.options.map((option) => {
                                    const selected = surveyAnswers[q.id] === option;
                                    return (
                                      <label key={option} className={`sb-surveyOption ${selected ? "is-selected" : ""}`}>
                                        <input
                                          type="radio"
                                          name={q.id}
                                          value={option}
                                          checked={selected}
                                          onChange={() =>
                                            setSurveyAnswers((prev) => ({
                                              ...prev,
                                              [q.id]: option,
                                            }))
                                          }
                                        />
                                        <span>{option}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                                {isLast && (
                                  <button
                                    className="sb-surveySubmit"
                                    type="button"
                                    onClick={handleSurveySubmit}
                                    disabled={isBuilding || !allSurveyAnswered}
                                  >
                                    Submit
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        <button
                          className="sb-sliderBtn sb-sliderBtn--edge"
                          onClick={() => goSurveyStep(1)}
                          aria-label="Next question"
                          disabled={surveyIndex === surveyQuestions.length - 1 || isBuilding}
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {showPgnModal && blackBookResult && (
        <div className="sb-modal" role="dialog" aria-modal="true">
          <div className="sb-modalCard">
            <div className="sb-modalHeader">
              <div>
                <div className="sb-modalTitle">Download PGN</div>
                <div className="sb-modalSubtitle">Choose color, opening, and game count.</div>
              </div>
              <button className="sb-modalClose" type="button" onClick={() => setShowPgnModal(false)}>
                Close
              </button>
            </div>
            <div className="sb-modalBody">
              <div className="sb-opxDownloadFields">
                <label className="sb-opxDownloadField">
                  <span>Target color</span>
                  <select
                    className="sb-opxDownloadInput"
                    value={downloadColor}
                    onChange={(event) => setDownloadColor(event.target.value as "white" | "black")}
                  >
                    <option value="white">White</option>
                    <option value="black">Black</option>
                  </select>
                </label>
                <label className="sb-opxDownloadField">
                  <span>Opening</span>
                  <select
                    className="sb-opxDownloadInput"
                    value={downloadOpening}
                    onChange={(event) => setDownloadOpening(event.target.value)}
                  >
                    {(
                      downloadColor === "white"
                        ? blackBookResult.openings?.white
                        : blackBookResult.openings?.black
                    )?.length ? (
                      (downloadColor === "white" ? blackBookResult.openings?.white : blackBookResult.openings?.black || []).map(
                        (opening) => (
                          <option key={`${downloadColor}-${opening.name}`} value={opening.name}>
                            {opening.name}
                          </option>
                        ),
                      )
                    ) : (
                      <option value="">No openings available</option>
                    )}
                  </select>
                </label>
                <label className="sb-opxDownloadField">
                  <span>Amount of games</span>
                  <input
                    className="sb-opxDownloadInput"
                    type="number"
                    min={1}
                    max={500}
                    value={downloadCount}
                    onChange={(event) => setDownloadCount(Number(event.target.value))}
                  />
                </label>
              </div>
              {downloadError && <div className="sb-opxDownloadError">{downloadError}</div>}
              <div className="sb-opxDownloadActions">
                <button className="sb-opxAction sb-opxAction--ghost" type="button" onClick={() => setShowPgnModal(false)}>
                  Cancel
                </button>
                <button className="sb-opxAction" type="button" onClick={handleDownloadPgn}>
                  Download PGN
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showXpToast && (
        <div className="sb-toast sb-toast--xp" role="status" aria-live="polite">
          +{planDayXp} XP earned
        </div>
      )}

      {isBuilding && (
        <div className="sb-overlay sb-overlay--build">
          <div className="sb-overlay-card">
            <div style={{ fontSize: 20, fontWeight: 700 }}>Building...</div>
            <div style={{ opacity: 0.75, marginTop: 6 }}>Generating your training plan.</div>
            <div className="sb-loader-bar">
              <div />
            </div>
          </div>
        </div>
      )}

      {showOverlay && (
        <div className={`sb-overlay ${overlayLeaving ? "leaving" : ""}`}>
          <div className="sb-overlay-card">
            <div style={{ fontSize: 20, fontWeight: 700 }}>Loading SquareBase{"\u2122"}</div>
            <div style={{ opacity: 0.75, marginTop: 6 }}>Preparing your intelligence layer.</div>
            <div className="sb-loader-bar">
              <div />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
