import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  Brain,
  ChevronLeft,
  ChevronRight,
  Compass,
  BookOpen,
  Download,
  LineChart,
  Lock,
  LogOut,
  Menu,
  PlusCircle,
  Puzzle,
  Youtube,
} from "lucide-react";
import { get, ref, remove, set } from "firebase/database";
import southKnight from "../assets/The South Knight.png";
import avatarFallback from "../assets/Easter Default.png";
import { PracticeBoard } from "./Practice";
import { useAuth } from "../hooks/useAuth";
import { db } from "../lib/firebase";
import { awardXp, getCurrentProfile } from "../lib/mockApi";
import "./squarebase.css";

type SquareBaseTab = "explore" | "analysis" | "ai" | "blackbook";
type PlanKey = "beginner" | "club" | "intermediate" | "advanced" | "expert";
type PlanDay = { day: string; items: string[] };
type TrainingPlan = { label: string; days: PlanDay[] };
type ChessOpening = { name: string; freq: number; winRate: number };
type ChessRecentGame = { color?: string | null; opening?: string | null; pgn?: string | null };
type ChessProfile = {
  platform: "chesscom" | "lichess";
  username: string;
  displayName: string;
  avatarUrl: string | null;
  country?: string | null;
  title?: string | null;
  lastOnline?: string | null;
  ratings?: {
    bullet?: number | null;
    blitz?: number | null;
    rapid?: number | null;
    classical?: number | null;
  };
  stats?: {
    games?: number;
    wins?: number;
    losses?: number;
    draws?: number;
  };
  openings?: {
    white?: ChessOpening[];
    black?: ChessOpening[];
  };
  recentGames?: ChessRecentGame[];
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

const PROFILE_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;
const PROFILE_MAX_GAMES = 500;

const liveToIso = (valueMs: number | null | undefined) => {
  if (!valueMs) return null;
  const date = new Date(valueMs);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const liveSafeNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const liveNormalizeCountry = (country: string | null | undefined) => {
  if (!country) return null;
  if (country.includes("/")) {
    const parts = country.split("/");
    return parts[parts.length - 1] || null;
  }
  return country;
};

const liveParseChessComTimeClass = (game: any) => {
  if (game?.time_class) return game.time_class;
  const raw = game?.time_control;
  if (!raw) return null;
  const base = Number(String(raw).split("+")[0]);
  if (!Number.isFinite(base)) return null;
  if (base <= 120) return "bullet";
  if (base <= 600) return "blitz";
  if (base <= 1800) return "rapid";
  return "classical";
};

const liveParseChessComResult = (playerResult: string | undefined, opponentResult: string | undefined) => {
  const drawSet = new Set([
    "agreed",
    "stalemate",
    "repetition",
    "insufficient",
    "50move",
    "timevsinsufficient",
    "draw",
  ]);
  if (playerResult === "win") return "win";
  if (opponentResult === "win") return "loss";
  if (drawSet.has(playerResult || "") || drawSet.has(opponentResult || "")) return "draw";
  return "loss";
};

const liveParseLichessColor = (username: string, players: any) => {
  const target = username.toLowerCase();
  const whiteUser = players?.white?.user;
  const blackUser = players?.black?.user;
  const whiteId = String(whiteUser?.id || whiteUser?.name || "").toLowerCase();
  const blackId = String(blackUser?.id || blackUser?.name || "").toLowerCase();
  if (whiteId && whiteId === target) return "white";
  if (blackId && blackId === target) return "black";
  return null;
};

const liveParseLichessResult = (winner: string | undefined, color: string | null) => {
  if (!winner) return "draw";
  if (!color) return "unknown";
  return winner === color ? "win" : "loss";
};

const liveExtractOpeningFromPgn = (pgn: string | null | undefined) => {
  if (!pgn || typeof pgn !== "string") return null;
  const opening = pgn.match(/\[\s*Opening\s+"([^"]+)"\s*\]/);
  const variation = pgn.match(/\[\s*Variation\s+"([^"]+)"\s*\]/);
  if (opening && variation && variation[1] && !opening[1].includes(variation[1])) {
    return `${opening[1]} - ${variation[1]}`;
  }
  return opening ? opening[1] : null;
};

const liveExtractOpeningFromEcoUrl = (url: string | null | undefined) => {
  if (!url || typeof url !== "string") return null;
  const parts = url.split("/");
  const slug = parts[parts.length - 1];
  if (!slug) return null;
  const cleaned = slug.replace(/^[A-E][0-9]{2}-/i, "").replace(/-/g, " ").trim();
  return cleaned || null;
};

const liveResolveOpeningName = (game: any) => {
  if (game?.opening && typeof game.opening === "string") return game.opening;
  const fromPgn = liveExtractOpeningFromPgn(game?.pgn);
  if (fromPgn) return fromPgn;
  return liveExtractOpeningFromEcoUrl(game?.eco || game?.eco_url);
};

const liveSummarizeGames = (games: any[]) => {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  games.forEach((game) => {
    if (game.result === "win") wins += 1;
    else if (game.result === "loss") losses += 1;
    else if (game.result === "draw") draws += 1;
  });
  return { games: wins + losses + draws, wins, losses, draws };
};

const liveComputeOpenings = (games: any[]) => {
  const buckets = { white: new Map<string, { name: string; count: number; wins: number; games: number }>(), black: new Map<string, { name: string; count: number; wins: number; games: number }>() };
  const totals = { white: 0, black: 0 };

  games.forEach((game) => {
    const opening = liveResolveOpeningName(game);
    if (!opening || !game.color || !(game.color in buckets)) return;
    const color = game.color as "white" | "black";
    totals[color] += 1;
    const existing = buckets[color].get(opening) || { name: opening, count: 0, wins: 0, games: 0 };
    existing.count += 1;
    existing.games += 1;
    if (game.result === "win") existing.wins += 1;
    buckets[color].set(opening, existing);
  });

  const toList = (color: "white" | "black") => {
    const total = totals[color] || 0;
    return Array.from(buckets[color].values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((entry) => ({
        name: entry.name,
        freq: total ? Math.round((entry.count / total) * 100) : 0,
        winRate: entry.games ? Math.round((entry.wins / entry.games) * 100) : 0,
      }));
  };

  return { white: toList("white"), black: toList("black") };
};

async function liveFetchJson(url: string, errorLabel: string) {
  const resp = await fetch(url, { headers: { Accept: "application/json" } });
  if (resp.status === 404) {
    throw new Error(`${errorLabel} not found.`);
  }
  if (!resp.ok) {
    throw new Error(`Failed to fetch ${errorLabel}.`);
  }
  return resp.json();
}

async function liveFetchLichessGames(username: string) {
  const since = Date.now() - PROFILE_WINDOW_MS;
  const url = `https://lichess.org/api/games/user/${encodeURIComponent(
    username,
  )}?max=${PROFILE_MAX_GAMES}&since=${since}&pgnInJson=true&opening=true`;
  const resp = await fetch(url, { headers: { Accept: "application/x-ndjson" } });
  if (!resp.ok) {
    throw new Error("Failed to fetch Lichess games.");
  }
  const text = await resp.text();
  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

async function liveFetchChessComGames(username: string) {
  const archives = await liveFetchJson(
    `https://api.chess.com/pub/player/${encodeURIComponent(username)}/games/archives`,
    "Chess.com archives",
  );
  const archiveList = Array.isArray((archives as any)?.archives) ? (archives as any).archives : [];
  if (archiveList.length === 0) return [];
  const cutoffSec = Math.floor((Date.now() - PROFILE_WINDOW_MS) / 1000);
  const collected: any[] = [];
  for (let idx = archiveList.length - 1; idx >= 0 && collected.length < PROFILE_MAX_GAMES; idx -= 1) {
    const archive = await liveFetchJson(archiveList[idx], "Chess.com games");
    const games = Array.isArray((archive as any)?.games) ? (archive as any).games : [];
    if (!games.length) continue;
    let maxEnd = 0;
    for (let g = games.length - 1; g >= 0 && collected.length < PROFILE_MAX_GAMES; g -= 1) {
      const game = games[g];
      const endTime = Number(game?.end_time || 0);
      if (endTime > maxEnd) maxEnd = endTime;
      if (endTime >= cutoffSec) {
        collected.push(game);
      }
    }
    if (maxEnd && maxEnd < cutoffSec) {
      break;
    }
  }
  return collected.slice(0, PROFILE_MAX_GAMES);
}

async function fetchLiveChessProfileDirect(
  platform: ChessProfile["platform"],
  username: string,
): Promise<ChessProfile> {
  if (platform === "lichess") {
    const profile = await liveFetchJson(
      `https://lichess.org/api/user/${encodeURIComponent(username)}`,
      "Lichess user",
    );
    const games = await liveFetchLichessGames(username);
    const perfs = (profile as any)?.perfs || {};
    const normalizedGames = (games || []).map((game: any) => {
      const color = liveParseLichessColor(username, game?.players);
      const opponentColor = color === "white" ? "black" : "white";
      const opponentUser = game?.players?.[opponentColor]?.user || {};
      const normalized = {
        id: String(game?.id || ""),
        playedAt: liveToIso(game?.createdAt || game?.lastMoveAt),
        timeControl: game?.speed || null,
        color,
        result: liveParseLichessResult(game?.winner, color),
        opponent: {
          username: opponentUser?.name || opponentUser?.id || null,
          rating: liveSafeNumber(game?.players?.[opponentColor]?.rating),
        },
        pgn: game?.pgn || null,
        opening: game?.opening?.name || null,
      };
      return { ...normalized, opening: liveResolveOpeningName(normalized) };
    });

    return {
      platform: "lichess",
      username: String((profile as any)?.id || username).toLowerCase(),
      displayName: (profile as any)?.username || username,
      avatarUrl: null,
      country: (profile as any)?.profile?.country || null,
      title: (profile as any)?.title || null,
      lastOnline: liveToIso((profile as any)?.seenAt),
      ratings: {
        bullet: liveSafeNumber(perfs?.bullet?.rating),
        blitz: liveSafeNumber(perfs?.blitz?.rating),
        rapid: liveSafeNumber(perfs?.rapid?.rating),
        classical: liveSafeNumber(perfs?.classical?.rating),
      },
      stats: liveSummarizeGames(normalizedGames),
      openings: liveComputeOpenings(normalizedGames),
      recentGames: normalizedGames,
    };
  }

  const profile = await liveFetchJson(
    `https://api.chess.com/pub/player/${encodeURIComponent(username)}`,
    "Chess.com user",
  );
  const stats = await liveFetchJson(
    `https://api.chess.com/pub/player/${encodeURIComponent(username)}/stats`,
    "Chess.com stats",
  );
  const games = await liveFetchChessComGames(username);
  const normalizedGames = (games || []).map((game: any) => {
    const whiteUser = String(game?.white?.username || "").toLowerCase();
    const blackUser = String(game?.black?.username || "").toLowerCase();
    const target = username.toLowerCase();
    const color = whiteUser === target ? "white" : blackUser === target ? "black" : null;
    const opponent = color === "white" ? game?.black : game?.white;
    const player = color === "white" ? game?.white : game?.black;
    const normalized = {
      id: String(game?.uuid || game?.url || ""),
      playedAt: liveToIso((game?.end_time || 0) * 1000),
      timeControl: liveParseChessComTimeClass(game),
      color,
      result: liveParseChessComResult(player?.result, opponent?.result),
      opponent: {
        username: opponent?.username || null,
        rating: liveSafeNumber(opponent?.rating),
      },
      pgn: game?.pgn || null,
      opening: null,
      eco: game?.eco || game?.eco_url || null,
    };
    return { ...normalized, opening: liveResolveOpeningName(normalized) };
  });

  return {
    platform: "chesscom",
    username: (profile as any)?.username ? String((profile as any).username).toLowerCase() : username.toLowerCase(),
    displayName: (profile as any)?.username || username,
    avatarUrl: (profile as any)?.avatar || null,
    country: liveNormalizeCountry((profile as any)?.country),
    title: (profile as any)?.title || null,
    lastOnline: liveToIso(((profile as any)?.last_online || 0) * 1000),
    ratings: {
      bullet: liveSafeNumber((stats as any)?.chess_bullet?.last?.rating),
      blitz: liveSafeNumber((stats as any)?.chess_blitz?.last?.rating),
      rapid: liveSafeNumber((stats as any)?.chess_rapid?.last?.rating),
      classical: liveSafeNumber((stats as any)?.chess_daily?.last?.rating),
    },
    stats: liveSummarizeGames(normalizedGames),
    openings: liveComputeOpenings(normalizedGames),
    recentGames: normalizedGames,
  };
}

const buildFallbackChessProfile = (
  platform: ChessProfile["platform"],
  username: string,
): ChessProfile => {
  const normalized = username.trim().toLowerCase();
  const seed = normalized.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const bullet = 1200 + (seed % 350);
  const blitz = bullet + 35 + (seed % 40);
  const rapid = blitz + 120 + (seed % 65);
  const games = 180 + (seed % 220);
  const wins = Math.max(40, Math.round(games * (0.46 + ((seed % 11) / 100))));
  const draws = Math.max(10, Math.round(games * 0.1));
  const losses = Math.max(0, games - wins - draws);

  return {
    platform,
    username: normalized,
    displayName: username.trim() || normalized,
    avatarUrl: null,
    lastOnline: new Date().toISOString(),
    ratings: {
      bullet,
      blitz,
      rapid,
      classical: rapid - 70,
    },
    stats: {
      games,
      wins,
      losses,
      draws,
    },
    openings: {
      white: [
        { name: "London System", freq: 18 + (seed % 8), winRate: 50 + (seed % 11) },
        { name: "Italian Game", freq: 10 + (seed % 6), winRate: 48 + (seed % 9) },
      ],
      black: [
        { name: "Sicilian Defense", freq: 14 + (seed % 9), winRate: 45 + (seed % 10) },
        { name: "French Defense", freq: 9 + (seed % 5), winRate: 47 + (seed % 12) },
      ],
    },
    recentGames: [],
  };
};


const getNextLocalMidnightMs = (date = new Date()) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + 1);
  return next.getTime();
};

const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getMidnightMsForDateKey = (dateKey: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const local = new Date(year, month - 1, day);
  local.setHours(0, 0, 0, 0);
  if (
    local.getFullYear() !== year ||
    local.getMonth() !== month - 1 ||
    local.getDate() !== day
  ) {
    return null;
  }
  return local.getTime();
};

const buildPlanWeek = () => {
  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  start.setDate(today.getDate() - today.getDay());
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return labels.map((label, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { label, date: date.getDate() };
  });
};

export default function SquareBase() {
  const [location, setLocation] = useLocation();
  const { user, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState<SquareBaseTab>("explore");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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
  const twitchParents = useMemo(() => {
    const parents = ["pawnpoint.app", "www.pawnpoint.app", "localhost", "127.0.0.1"];
    const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
    if (hostname && !parents.includes(hostname)) parents.push(hostname);
    return parents;
  }, []);
  const [twitchChannel, setTwitchChannel] = useState<string | null>(null);
  const [twitchLabel, setTwitchLabel] = useState("Chess TV");
  const [twitchLive, setTwitchLive] = useState(false);
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
  const twitchSrc = useMemo(() => {
    if (!twitchChannel) return "";
    const params = new URLSearchParams();
    params.set("channel", twitchChannel);
    twitchParents.forEach((parent) => params.append("parent", parent));
    params.set("muted", "true");
    params.set("autoplay", "false");
    return `https://player.twitch.tv/?${params.toString()}`;
  }, [twitchChannel, twitchParents]);
  const toggleMobileNav = useCallback(() => {
    setMobileNavOpen((open) => !open);
  }, []);
  const closeMobileNav = useCallback(() => {
    setMobileNavOpen(false);
  }, []);
  const handleTabChange = useCallback(
    (tab: SquareBaseTab) => {
      if ((tab === "blackbook" || tab === "ai") && user && !canAccessPremium) {
        setLocation("/checkout");
        closeMobileNav();
        return;
      }
      setActiveTab(tab);
      closeMobileNav();
    },
    [canAccessPremium, closeMobileNav, setLocation, user],
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
          setTwitchLive(true);
        } else {
          const fallback = twitchFallback[0];
          setTwitchChannel(null);
          setTwitchLabel(fallback.label);
          setTwitchLive(false);
        }
      } catch {
        if (!cancelled) {
          const fallback = twitchFallback[0];
          setTwitchChannel(null);
          setTwitchLabel(fallback.label);
          setTwitchLive(false);
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
  const planWeekDays = buildPlanWeek();

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
    const platform = chesscom ? "chesscom" : "lichess";
    const username = chesscom || lichess;
    try {
      const resp = await fetch(
        `/api/chess/profile?platform=${encodeURIComponent(platform)}&username=${encodeURIComponent(username)}`,
      );
      const contentType = resp.headers.get("content-type") || "";
      let payload: ChessProfile | { error?: string } | null = null;
      if (contentType.includes("application/json")) {
        try {
          payload = (await resp.json()) as ChessProfile | { error?: string };
        } catch {
          payload = null;
        }
      } else {
        try {
          await resp.text();
        } catch {
          // Ignore body parsing failures and continue to fallback handling below.
        }
      }
      if (!resp.ok) {
        throw new Error(payload && "error" in payload && payload.error ? payload.error : "Failed to load profile.");
      }
      if (!payload) {
        throw new Error("Profile API unavailable.");
      }
      const profile = payload as ChessProfile;
      setBlackBookResult(profile);
      setShowBlackBookResult(true);
      setBlackBookError("");
    } catch {
      try {
        const liveProfile = await fetchLiveChessProfileDirect(platform, username);
        setBlackBookResult(liveProfile);
        setShowBlackBookResult(true);
        setBlackBookError("");
      } catch {
        const fallbackProfile = buildFallbackChessProfile(platform, username);
        setBlackBookResult(fallbackProfile);
        setShowBlackBookResult(true);
        setBlackBookError("Live profile APIs unavailable. Showing a local preview.");
      }
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

  const blackBookDisplayName =
    blackBookResult?.displayName ||
    blackBookResult?.username ||
    blackBookChesscom ||
    blackBookLichess ||
    "pawn_point";
  const blackBookGames = blackBookResult?.stats?.games ?? 0;
  const blackBookWins = blackBookResult?.stats?.wins ?? 0;
  const blackBookLosses = blackBookResult?.stats?.losses ?? 0;
  const blackBookDraws = blackBookResult?.stats?.draws ?? 0;
  const blackBookPerformanceCards = [
    {
      key: "bullet",
      label: "Bullet",
      rating: blackBookResult?.ratings?.bullet,
      accent: "sb-opxPerformanceCard--bullet",
      meter: "sb-opxPerformanceMeter--bullet",
    },
    {
      key: "blitz",
      label: "Blitz",
      rating: blackBookResult?.ratings?.blitz,
      accent: "sb-opxPerformanceCard--blitz",
      meter: "sb-opxPerformanceMeter--blitz",
    },
    {
      key: "rapid",
      label: "Rapid",
      rating: blackBookResult?.ratings?.rapid,
      accent: "sb-opxPerformanceCard--rapid",
      meter: "sb-opxPerformanceMeter--rapid",
    },
  ] as const;

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

    const filtered = (blackBookResult.recentGames || []).filter((game) => {
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
      <header className="sb-shellHeader">
        <div className="sb-shellHeaderInner">
          <div className="sb-brandCluster">
            <div className="sb-brand">
              <div className="sb-mark" aria-hidden="true">
                <span className="sb-markLabel">SB</span>
              </div>
              <div className="sb-title">
                <div className="sb-name">SquareBase</div>
                <div className="sb-sub">Chess Intelligence System</div>
              </div>
            </div>
          </div>

          <nav className="sb-nav sb-nav--desktop" aria-label="SquareBase navigation">
            <button
              className={`sb-navItem ${activeTab === "explore" ? "sb-navItem--active" : ""}`}
              type="button"
              onClick={() => handleTabChange("explore")}
            >
              <Compass className="sb-navIcon" />
              Explore
            </button>
            <button
              className={`sb-navItem ${activeTab === "blackbook" ? "sb-navItem--active" : ""}`}
              type="button"
              onClick={() => handleTabChange("blackbook")}
            >
              <BookOpen className="sb-navIcon" />
              BlackBook
            </button>
            <button
              className={`sb-navItem ${activeTab === "analysis" ? "sb-navItem--active" : ""}`}
              type="button"
              onClick={() => handleTabChange("analysis")}
            >
              <LineChart className="sb-navIcon" />
              Analysis
            </button>
            <button
              className={`sb-navItem ${activeTab === "ai" ? "sb-navItem--active" : ""}`}
              type="button"
              onClick={() => handleTabChange("ai")}
            >
              <Brain className="sb-navIcon" />
              Training
            </button>
          </nav>

          <div className="sb-shellActions">
            <button className="sb-shellReturn" type="button" onClick={() => setLocation("/dashboard")}>
              <span className="sb-shellReturnLabel">PawnPoint</span>
              <span className="sb-shellReturnAvatar" aria-hidden="true">
                <img
                  src={user?.avatarUrl || avatarFallback}
                  alt={displayName}
                  onError={(event) => {
                    event.currentTarget.src = avatarFallback;
                  }}
                />
              </span>
            </button>
            <button
              className="sb-menuToggle"
              type="button"
              onClick={toggleMobileNav}
              aria-label="Toggle SquareBase menu"
              aria-expanded={mobileNavOpen}
              aria-controls="sb-mobile-menu"
            >
              <Menu className="sb-menuIcon" />
            </button>
          </div>
        </div>

        <div className={`sb-mobileMenu ${mobileNavOpen ? "is-open" : ""}`} id="sb-mobile-menu">
          <nav className="sb-nav sb-nav--mobile">
            <button
              className={`sb-navItem ${activeTab === "explore" ? "sb-navItem--active" : ""}`}
              type="button"
              onClick={() => handleTabChange("explore")}
            >
              <Compass className="sb-navIcon" />
              Explore
            </button>
            <button
              className={`sb-navItem ${activeTab === "blackbook" ? "sb-navItem--active" : ""}`}
              type="button"
              onClick={() => handleTabChange("blackbook")}
            >
              <BookOpen className="sb-navIcon" />
              BlackBook
            </button>
            <button
              className={`sb-navItem ${activeTab === "analysis" ? "sb-navItem--active" : ""}`}
              type="button"
              onClick={() => handleTabChange("analysis")}
            >
              <LineChart className="sb-navIcon" />
              Analysis
            </button>
            <button
              className={`sb-navItem ${activeTab === "ai" ? "sb-navItem--active" : ""}`}
              type="button"
              onClick={() => handleTabChange("ai")}
            >
              <Brain className="sb-navIcon" />
              Training
            </button>
          </nav>

          <div className="sb-divider" />

          <button
            className="sb-exit"
            type="button"
            onClick={() => {
              setLocation("/dashboard");
              closeMobileNav();
            }}
          >
            <LogOut className="h-4 w-4" />
            Return to PawnPoint
          </button>

          <div className="sb-footer">
            <span>{"\u00a9"} {year} Pawn Point</span>
            <a
              href="https://www.youtube.com/@Pawn-Point"
              target="_blank"
              rel="noreferrer"
              aria-label="Pawn Point YouTube"
              className="sb-footerLink"
            >
              <Youtube className="sb-footerIcon" />
            </a>
          </div>
        </div>
      </header>

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
            <div className="sb-exploreLayout">
              <div
                ref={profileRef}
                className="sb-exploreGrid"
                style={{
                  opacity: profileVisible ? 1 : 0,
                  transform: profileVisible ? "translateY(0)" : "translateY(30px)",
                  transition: "opacity 0.7s ease 140ms, transform 0.7s ease 140ms",
                }}
              >
                <section className="sb-profileCard feature-card">
                  <header className="sb-panelEyebrow">Player Profile</header>
                  <div className="sb-profileOrb">
                    <div className="sb-profileGlow" aria-hidden="true" />
                    <div className="sb-profilePhotoWrap">
                      <img
                        src={user?.avatarUrl || avatarFallback}
                        alt={displayName}
                        onError={(event) => {
                          event.currentTarget.src = avatarFallback;
                        }}
                      />
                    </div>
                  </div>
                  <h3 className="sb-profileName">{displayName}</h3>
                  <div className="sb-profileStats">
                    {[
                      { label: "Rank", value: rankInfo.label, accent: rankInfo.label === "Gold" ? "sb-profileStatValue--gold" : "" },
                      { label: "Level", value: `Lv. ${level}` },
                      { label: "Total XP", value: xp.toLocaleString() },
                    ].map((stat) => (
                      <div key={stat.label} className="sb-profileStat">
                        <p className="sb-profileStatLabel">{stat.label}</p>
                        <p className={`sb-profileStatValue ${stat.accent || ""}`.trim()}>{stat.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="sb-profileXp">
                    <div className="sb-profileXpMeta">
                      <span>XP to next level</span>
                      <span>{xpToNextLevel.toLocaleString()} XP</span>
                    </div>
                    <div className="sb-profileXpTrack">
                      <div className="sb-profileXpFill" style={{ width: `${levelProgress}%` }} />
                    </div>
                    <div className="sb-profileXpFooter">
                      <span>Level {level}</span>
                      <span>{levelProgress}%</span>
                    </div>
                  </div>
                </section>

                <aside className="sb-actionStack">
                  <div className="sb-actionCard">
                    <div className="sb-actionIcon">
                      <Puzzle className="h-10 w-10" />
                    </div>
                    <h4 className="sb-actionTitle">Daily Puzzle</h4>
                    <button type="button" onClick={() => setLocation("/puzzles")} className="sb-actionButton">
                      Solve Now
                    </button>
                  </div>

                  <div className="sb-actionCard">
                    <div className="sb-actionIcon sb-actionIcon--image">
                      <img src={southKnight} alt="South Knight" />
                    </div>
                    <h4 className="sb-actionTitle">South Knight</h4>
                    <button type="button" onClick={() => setLocation("/practice")} className="sb-actionButton">
                      Play Now
                    </button>
                  </div>
                </aside>
              </div>

              <footer className="sb-quote">
                <div className="sb-quoteLabel">Quote of the day</div>
                <blockquote className="sb-quoteText">
                  {quoteAuthor && <span className="sb-quoteAuthor">{quoteAuthor} - </span>}
                  <span className="sb-quoteLine">{quoteLine}</span>
                </blockquote>
              </footer>
            </div>
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
                        <div className="sb-blackbookSubtitle">Generate exploit ready Intelligence Profiles.</div>
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
                          <div className="sb-opxProfileHeader">
                            <div className="sb-opxProfileHeading">
                              <div className="sb-opxProfileEyebrow">
                                {blackBookResult.platform === "chesscom" ? "Chess.com target" : "Lichess target"}
                              </div>
                              <h1 className="sb-opxProfileName">{blackBookDisplayName}</h1>
                              <div className="sb-opxProfileMeta">
                                <span>{blackBookGames.toLocaleString()} games</span>
                                <span className="sb-opxProfileDot" />
                                <span>Active: Last 90 days</span>
                              </div>
                            </div>
                            <div className="sb-opxActions">
                              <button className="sb-opxAction sb-opxAction--solid" type="button" onClick={() => setShowPgnModal(true)}>
                                <Download className="h-4 w-4" />
                                Download
                              </button>
                              <button className="sb-opxAction sb-opxAction--ghost" type="button" onClick={resetBlackBookTarget}>
                                <PlusCircle className="h-4 w-4" />
                                New target
                              </button>
                            </div>
                          </div>

                          <div className="sb-opxSurface">
                            <section className="sb-opxBlock">
                              <div className="sb-opxBlockHeader">
                                <h3>Activity Performance</h3>
                                <div className="sb-opxBlockRule" />
                              </div>
                              <div className="sb-opxPerformanceGrid">
                                {blackBookPerformanceCards.map((card) => (
                                  <div key={card.key} className={`sb-opxPerformanceCard ${card.accent}`}>
                                    <div className="sb-opxPerformanceTop">
                                      <span className="sb-opxPerformanceLabel">{card.label}</span>
                                    </div>
                                    <div className="sb-opxPerformanceValueRow">
                                      <span className="sb-opxPerformanceValue">
                                        {typeof card.rating === "number" ? card.rating : "—"}
                                      </span>
                                    </div>
                                    <div className="sb-opxPerformanceTrack">
                                      <div
                                        className={`sb-opxPerformanceMeter ${card.meter}`}
                                        style={{ width: "100%" }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </section>

                            <section className="sb-opxBlock">
                              <div className="sb-opxOpeningsGrid">
                                <div className="sb-opxOpeningColumn">
                                  <div className="sb-opxOpeningHeader">
                                    <div className="sb-opxOpeningSwatch sb-opxOpeningSwatch--white" />
                                    <h3>Playing as White</h3>
                                  </div>
                                  <div className="sb-opxOpeningList">
                                    {(blackBookResult.openings?.white || []).slice(0, 2).map((opening) => (
                                      <div className="sb-opxOpeningCard" key={`white-${opening.name}`}>
                                        <h4>{opening.name}</h4>
                                      </div>
                                    ))}
                                    {(blackBookResult.openings?.white || []).length === 0 && (
                                      <div className="sb-opxEmpty">No openings data yet.</div>
                                    )}
                                  </div>
                                </div>
                                <div className="sb-opxOpeningColumn">
                                  <div className="sb-opxOpeningHeader">
                                    <div className="sb-opxOpeningSwatch sb-opxOpeningSwatch--black" />
                                    <h3>Playing as Black</h3>
                                  </div>
                                  <div className="sb-opxOpeningList">
                                    {(blackBookResult.openings?.black || []).slice(0, 2).map((opening) => (
                                      <div className="sb-opxOpeningCard" key={`black-${opening.name}`}>
                                        <h4>{opening.name}</h4>
                                      </div>
                                    ))}
                                    {(blackBookResult.openings?.black || []).length === 0 && (
                                      <div className="sb-opxEmpty">No openings data yet.</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </section>

                            <div className="sb-opxFooter">
                              <div className="sb-opxFooterLabel">Precision Analysis by SquareBase</div>
                              <p>
                                {blackBookWins.toLocaleString()} wins, {blackBookLosses.toLocaleString()} losses, {blackBookDraws.toLocaleString()} draws
                              </p>
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
                                  <div className="sb-planWeek" role="group" aria-label="Plan days">
                                    {planWeekDays.map((weekDay, uiIndex) => {
                                      const planIndex = (uiIndex + 6) % 7;
                                      const isActive = planIndex === visibleDayIndex;
                                      const isDisabled = planIndex >= totalPlanDays;
                                      return (
                                        <button
                                          key={`${weekDay.label}-${weekDay.date}`}
                                          className={`sb-planWeekDay ${isActive ? "is-active" : ""}`}
                                          type="button"
                                          onClick={() => setViewDayIndex(planIndex)}
                                          disabled={isDisabled}
                                          aria-pressed={isActive}
                                        >
                                          <span className="sb-planWeekLabel">{weekDay.label}</span>
                                          <span className="sb-planWeekDate">{weekDay.date}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
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
                                  <button className="sb-planRetake" type="button" onClick={resetSurvey}>
                                    Retake survey
                                  </button>
                                </div>
                              </div>
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
