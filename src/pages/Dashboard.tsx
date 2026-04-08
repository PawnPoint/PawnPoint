import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  type LucideIcon,
  BookOpen,
  Brain,
  Check,
  ChevronRight,
  Circle,
  Crown,
  Flame,
  Play,
  Puzzle,
  Star,
  Target,
  TrendingUp,
  Trophy,
  X,
  Youtube,
  Zap,
} from "lucide-react";
import { useLocation } from "wouter";

import { AppShell } from "../components/AppShell";
import { useAuth } from "../hooks/useAuth";
import {
  getDashboard,
  getGlobalXpLeaderboard,
  getProgress,
  type Course,
  type CourseProgress,
  type DailyPuzzleType,
  type UserProfile,
} from "../lib/mockApi";
import pawnPointIcon from "../assets/App tab icon.png";
import avatarFallback from "../assets/Easter Default.png";

const backgroundStyle = {
  backgroundColor: "#03050a",
  minHeight: "100vh",
  color: "#ffffff",
} as const;

const backgroundOverlay = (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <div className="pp-dashboard-ambient" />
    <div className="pp-dashboard-gridlines" />
    <div className="pp-dashboard-halo pp-dashboard-halo--one" />
    <div className="pp-dashboard-halo pp-dashboard-halo--two" />
  </div>
);

const heroParticles = [
  { left: "6%", top: "16%", size: 7, delay: "0s", duration: "9.5s", driftX: "24px", rise: "-36px" },
  { left: "12%", top: "70%", size: 5, delay: "1.2s", duration: "11.5s", driftX: "-16px", rise: "-42px" },
  { left: "19%", top: "34%", size: 8, delay: "0.6s", duration: "10.8s", driftX: "15px", rise: "-28px" },
  { left: "27%", top: "12%", size: 4, delay: "2s", duration: "8.8s", driftX: "-10px", rise: "-22px" },
  { left: "34%", top: "62%", size: 7, delay: "1.5s", duration: "12.2s", driftX: "20px", rise: "-38px" },
  { left: "43%", top: "26%", size: 10, delay: "0.2s", duration: "13.5s", driftX: "-18px", rise: "-30px" },
  { left: "51%", top: "80%", size: 5, delay: "2.6s", duration: "11.8s", driftX: "15px", rise: "-34px" },
  { left: "60%", top: "18%", size: 8, delay: "0.9s", duration: "10.2s", driftX: "-13px", rise: "-26px" },
  { left: "68%", top: "55%", size: 5, delay: "2.8s", duration: "11.1s", driftX: "18px", rise: "-24px" },
  { left: "77%", top: "22%", size: 7, delay: "0.4s", duration: "12.8s", driftX: "-20px", rise: "-40px" },
  { left: "85%", top: "72%", size: 4, delay: "1.9s", duration: "9.2s", driftX: "12px", rise: "-26px" },
  { left: "92%", top: "40%", size: 8, delay: "1.3s", duration: "12.1s", driftX: "-12px", rise: "-32px" },
  { left: "24%", top: "78%", size: 6, delay: "3s", duration: "10.4s", driftX: "11px", rise: "-21px" },
  { left: "72%", top: "74%", size: 6, delay: "2.3s", duration: "10.9s", driftX: "-15px", rise: "-29px" },
] as const;

const pageStyles = `
.pp-dashboard-page {
  --pp-border: rgba(148, 163, 184, 0.16);
  --pp-panel: linear-gradient(180deg, rgba(9, 15, 30, 0.94) 0%, rgba(5, 8, 18, 0.98) 100%);
  --pp-panel-soft: linear-gradient(180deg, rgba(12, 18, 34, 0.9) 0%, rgba(5, 8, 18, 0.96) 100%);
  position: relative;
}

.pp-dashboard-ambient {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 15% 12%, rgba(59, 130, 246, 0.16), transparent 28%),
    radial-gradient(circle at 82% 18%, rgba(96, 165, 250, 0.16), transparent 24%),
    radial-gradient(circle at 50% 100%, rgba(14, 165, 233, 0.08), transparent 30%),
    linear-gradient(180deg, #03050a 0%, #07101f 48%, #03050a 100%);
}

.pp-dashboard-gridlines {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(148, 163, 184, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.05) 1px, transparent 1px);
  background-size: 72px 72px;
  opacity: 0.42;
  mask-image: linear-gradient(180deg, rgba(255, 255, 255, 0.85), transparent 92%);
}

.pp-dashboard-halo {
  position: absolute;
  border-radius: 999px;
  filter: blur(90px);
  opacity: 0.9;
}

.pp-dashboard-halo--one {
  top: -8%;
  left: -8%;
  height: 280px;
  width: 280px;
  background: rgba(59, 130, 246, 0.18);
}

.pp-dashboard-halo--two {
  right: -4%;
  top: 18%;
  height: 340px;
  width: 340px;
  background: rgba(14, 165, 233, 0.14);
}

.pp-dashboard-card {
  position: relative;
  overflow: hidden;
  border-radius: 28px;
  border: 1px solid var(--pp-border);
  background: var(--pp-panel);
  backdrop-filter: blur(22px);
  box-shadow: 0 24px 80px rgba(2, 8, 23, 0.45);
}

.pp-dashboard-card::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 32%);
  pointer-events: none;
}

.pp-dashboard-card::after {
  content: "";
  position: absolute;
  inset: auto -10% -35% auto;
  height: 220px;
  width: 220px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.22) 0%, rgba(59, 130, 246, 0.08) 35%, transparent 72%);
  opacity: 0;
  transition: opacity 240ms ease;
  pointer-events: none;
}

.pp-dashboard-card:hover::after,
.pp-dashboard-card.pp-dashboard-card--glow::after {
  opacity: 1;
}

.pp-dashboard-card--soft {
  background: var(--pp-panel-soft);
}

.pp-dashboard-card--hero {
  background:
    radial-gradient(circle at top right, rgba(96, 165, 250, 0.16), transparent 34%),
    linear-gradient(180deg, rgba(10, 18, 34, 0.96) 0%, rgba(4, 8, 18, 0.98) 100%);
}

.pp-dashboard-particles {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.pp-dashboard-particle {
  position: absolute;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(255, 255, 255, 1) 0%, rgba(191, 219, 254, 0.9) 28%, rgba(59, 130, 246, 0.55) 52%, transparent 78%);
  box-shadow:
    0 0 16px rgba(255, 255, 255, 0.32),
    0 0 34px rgba(59, 130, 246, 0.24);
  opacity: 0.55;
  animation: pp-dashboard-particle-float var(--particle-duration, 12s) ease-in-out infinite;
  animation-delay: var(--particle-delay, 0s);
}

@keyframes pp-dashboard-particle-float {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(0.92);
    opacity: 0.3;
  }

  50% {
    transform: translate3d(var(--particle-drift-x, 0px), var(--particle-rise, -24px), 0) scale(1.15);
    opacity: 1;
  }
}

.pp-dashboard-kicker {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  border-radius: 999px;
  border: 1px solid rgba(96, 165, 250, 0.22);
  background: rgba(96, 165, 250, 0.08);
  padding: 0.5rem 0.85rem;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(191, 219, 254, 0.92);
}

.pp-dashboard-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(255, 255, 255, 0.04);
  padding: 0.45rem 0.8rem;
  font-size: 0.78rem;
  color: rgba(226, 232, 240, 0.72);
}

.pp-dashboard-primary-btn,
.pp-dashboard-secondary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  border-radius: 999px;
  padding: 0.95rem 1.3rem;
  font-size: 0.95rem;
  font-weight: 700;
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    background 180ms ease,
    box-shadow 180ms ease;
}

.pp-dashboard-primary-btn {
  border: 1px solid rgba(96, 165, 250, 0.3);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.94), rgba(37, 99, 235, 0.84));
  color: white;
  box-shadow: 0 18px 40px rgba(37, 99, 235, 0.28);
}

.pp-dashboard-secondary-btn {
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.04);
  color: white;
}

.pp-dashboard-primary-btn:hover,
.pp-dashboard-secondary-btn:hover {
  transform: translateY(-2px);
}

.pp-dashboard-secondary-btn:hover {
  border-color: rgba(96, 165, 250, 0.22);
  background: rgba(96, 165, 250, 0.08);
}

.pp-dashboard-progress {
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
}

.pp-dashboard-progress > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(56, 189, 248, 0.95), rgba(59, 130, 246, 0.95));
  box-shadow: 0 0 24px rgba(59, 130, 246, 0.25);
}

.pp-dashboard-metric {
  min-height: 164px;
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease;
}

.pp-dashboard-metric:hover {
  transform: translateY(-5px);
  border-color: rgba(96, 165, 250, 0.28);
  box-shadow: 0 20px 60px rgba(2, 8, 23, 0.52);
}

.pp-dashboard-avatar {
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.06),
    0 22px 55px rgba(2, 8, 23, 0.45),
    0 0 40px rgba(59, 130, 246, 0.14);
}

.pp-dashboard-course-chip {
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    background 180ms ease;
}

.pp-dashboard-course-chip:hover {
  transform: translateY(-2px);
  border-color: rgba(96, 165, 250, 0.26);
  background: rgba(96, 165, 250, 0.08);
}

.pp-dashboard-leader-row {
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    background 180ms ease;
}

.pp-dashboard-leader-row:hover {
  transform: translateY(-1px);
  border-color: rgba(148, 163, 184, 0.22);
  background: rgba(255, 255, 255, 0.05);
}

.pp-dashboard-leader-row[data-current="true"] {
  border-color: rgba(96, 165, 250, 0.34);
  background: linear-gradient(90deg, rgba(37, 99, 235, 0.2), rgba(7, 14, 27, 0.95));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 0 0 1px rgba(59, 130, 246, 0.1),
    0 24px 55px rgba(2, 8, 23, 0.38);
}

.pp-dashboard-footer {
  border-top: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(2, 6, 23, 0.55);
}

@media (max-width: 1024px) {
  .pp-dashboard-card {
    border-radius: 24px;
  }
}
`;

const FAQ_ITEMS = [
  {
    question: "What is Pawn Point?",
    answer:
      "Pawn Point is a premium chess training platform built to sharpen calculation, structure training, and help serious players improve faster.",
  },
  {
    question: "How does membership work?",
    answer:
      "Membership unlocks the full training stack: courses, puzzles, rankings, and the broader Pawn Point improvement system.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. Subscription changes can be handled from your account settings and apply to future access periods.",
  },
  {
    question: "Do you support group training?",
    answer:
      "Yes. Pawn Point supports groups for clubs, teams, and coaches who want a shared training environment and rankings.",
  },
] as const;

const divisionBands = [
  { label: "Bronze", min: 1, max: 10 },
  { label: "Silver", min: 11, max: 25 },
  { label: "Gold", min: 26, max: 60 },
  { label: "Diamond", min: 61, max: 150 },
  { label: "Master", min: 151, max: 300 },
  { label: "Elite", min: 301, max: Number.POSITIVE_INFINITY },
] as const;

const wholeNumber = new Intl.NumberFormat("en-US");
const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const dailyPuzzleTrackerOrder: DailyPuzzleType[] = ["easy", "medium", "hard"];

type DashboardHistoryPoint = {
  label: string;
  day: string;
  total: number;
};

type RankedPlayer = UserProfile & {
  rank: number;
  isCurrentUser: boolean;
};

function resolveDivision(level: number) {
  return divisionBands.find((band) => level >= band.min && level <= band.max) || divisionBands[0];
}

function formatCategory(category: Course["category"]) {
  const labels: Record<Course["category"], string> = {
    white_opening: "White Opening",
    black_opening: "Black Opening",
    middlegame: "Middlegame",
    endgame: "Endgame",
    skills: "Skills",
    beginner: "Beginner",
  };
  return labels[category] || "Training";
}

function formatDifficulty(difficulty: Course["difficulty"]) {
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
}

function buildFallbackHistory(): DashboardHistoryPoint[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const label = date.toLocaleDateString("en-US", { weekday: "short" });
    return { label, day: label, total: 0 };
  });
}

function buildChart(history: DashboardHistoryPoint[]) {
  const width = 620;
  const height = 220;
  const paddingX = 18;
  const paddingY = 18;
  const safeHistory = history.length ? history : buildFallbackHistory();
  const maxValue = Math.max(...safeHistory.map((point) => point.total), 20);
  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingY * 2;
  const points = safeHistory.map((point, index) => {
    const x =
      safeHistory.length === 1
        ? width / 2
        : paddingX + (index / (safeHistory.length - 1)) * usableWidth;
    const y = height - paddingY - (point.total / maxValue) * usableHeight;
    return {
      ...point,
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
    };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : "";

  const gridLines = [0.25, 0.5, 0.75].map(
    (ratio) => Number((height - paddingY - usableHeight * ratio).toFixed(2)),
  );

  return {
    width,
    height,
    points,
    maxValue,
    linePath,
    areaPath,
    gridLines,
  };
}

function sortPlayers(entries: UserProfile[]) {
  return [...entries].sort((left, right) => {
    const xpDiff = (right.totalXp || 0) - (left.totalXp || 0);
    if (xpDiff !== 0) return xpDiff;
    const leftTime = left.xpReachedAt ?? left.createdAt ?? 0;
    const rightTime = right.xpReachedAt ?? right.createdAt ?? 0;
    return leftTime - rightTime;
  });
}

function buildLeaderboard(entries: UserProfile[], currentUser: UserProfile): {
  rows: RankedPlayer[];
  rank: number;
  total: number;
} {
  const byId = new Map<string, UserProfile>();

  [...entries, currentUser].forEach((entry) => {
    const key = entry.id || entry.email || entry.displayName;
    if (!byId.has(key)) {
      byId.set(key, entry);
    }
  });

  const ranked = sortPlayers(Array.from(byId.values())).map((entry, index) => ({
    ...entry,
    rank: index + 1,
    isCurrentUser: entry.id === currentUser.id,
  }));

  const currentRank = ranked.find((entry) => entry.id === currentUser.id)?.rank ?? 1;
  let rows = ranked.slice(0, 5);

  if (currentRank > 5) {
    rows = [...ranked.slice(0, 4), ranked[currentRank - 1]];
  }

  return {
    rows,
    rank: currentRank,
    total: ranked.length,
  };
}

function resolveNextLesson(course: Course | undefined, progress: CourseProgress | undefined) {
  if (!course) return "Pick your next study block";
  if (!course.lessons?.length) return `${formatDifficulty(course.difficulty)} focus block`;

  const completed = progress?.completedLessonIds.length ?? 0;
  const nextIndex = Math.min(completed, Math.max(course.lessons.length - 1, 0));
  const nextLesson = course.lessons[nextIndex];

  if (progress?.progressPercent === 100) {
    return `Review: ${course.lessons[course.lessons.length - 1]?.title || course.title}`;
  }

  return nextLesson?.title || `${formatDifficulty(course.difficulty)} focus block`;
}

function selectFeaturedCourse(
  courses: Course[],
  progressByCourse: Record<string, CourseProgress>,
): {
  courseEntries: { course: Course; progress: number; index: number }[];
  featuredEntry?: { course: Course; progress: number; index: number };
  allCompleted: boolean;
} {
  const courseEntries = courses.map((course, index) => ({
    course,
    progress: progressByCourse[course.id]?.progressPercent || 0,
    index,
  }));

  const incompleteEntries = courseEntries
    .filter((entry) => entry.progress < 100)
    .sort((left, right) => {
      const leftPriority = left.progress > 0 ? 0 : 1;
      const rightPriority = right.progress > 0 ? 0 : 1;
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
      if (leftPriority === 0) {
        const progressDiff = right.progress - left.progress;
        if (progressDiff !== 0) return progressDiff;
      }
      return left.index - right.index;
    });

  return {
    courseEntries,
    featuredEntry: incompleteEntries[0],
    allCompleted: courseEntries.length > 0 && incompleteEntries.length === 0,
  };
}

function resolveBadgeTone(rank: number) {
  if (rank === 1) return "bg-amber-400/16 text-amber-300";
  if (rank === 2) return "bg-slate-300/16 text-slate-200";
  if (rank === 3) return "bg-orange-400/16 text-orange-300";
  return "bg-white/[0.06] text-slate-300";
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  glow = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  glow?: boolean;
}) {
  return (
    <div
      className={`pp-dashboard-card pp-dashboard-card--soft pp-dashboard-metric p-5 sm:p-6 ${
        glow ? "pp-dashboard-card--glow" : ""
      }`}
    >
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[12px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className="text-[30px] font-semibold tracking-[-0.04em] text-white">{value}</p>
          <p className="text-sm text-blue-300/85">{detail}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-400/14 bg-blue-500/10 text-blue-300">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function TrainingTask({
  label,
  detail,
  done,
  onStart,
  emphasized = false,
}: {
  label: string;
  detail: string;
  done: boolean;
  onStart: () => void;
  emphasized?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-4 transition-colors ${
        emphasized
          ? "border-blue-400/22 bg-blue-500/10"
          : "border-white/8 bg-white/[0.035]"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
              done
                ? "border-blue-400/18 bg-blue-500/18 text-blue-300"
                : "border-white/8 bg-white/5 text-slate-400"
            }`}
          >
            {done ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{label}</p>
            <p className="mt-1 text-xs text-slate-400">{detail}</p>
          </div>
        </div>

        {!done && (
          <button
            type="button"
            onClick={onStart}
            className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-white transition hover:border-blue-400/20 hover:bg-blue-500/[0.12]"
          >
            Start
          </button>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [contactOpen, setContactOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [faqOpenIdx, setFaqOpenIdx] = useState<number | null>(null);

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", user?.id, user?.groupId, user?.accountType],
    queryFn: () => getDashboard(user!),
    enabled: !!user,
  });

  const progressQuery = useQuery({
    queryKey: ["dashboard-progress", user?.id],
    queryFn: () => getProgress(user!.id),
    enabled: !!user,
  });

  const globalLeaderboardQuery = useQuery({
    queryKey: ["dashboard-global-ranks"],
    queryFn: () => getGlobalXpLeaderboard(500),
    enabled: !!user,
    staleTime: 60_000,
  });

  if (!user) return null;

  const [clockNow, setClockNow] = useState(() => Date.now());
  const [selectedPreviewCourseId, setSelectedPreviewCourseId] = useState<string | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const nowHour = new Date().getHours();
  const greeting = nowHour < 12 ? "Good morning" : nowHour < 18 ? "Good afternoon" : "Good evening";
  const year = new Date().getFullYear();
  const firstName =
    user.displayName?.trim().split(" ")[0] ||
    user.chessUsername?.trim().split(" ")[0] ||
    user.email.split("@")[0] ||
    "Player";
  const displayName =
    user.chessUsername || user.displayName || user.email.split("@")[0] || firstName;
  const division = resolveDivision(Math.max(1, user.level || 1));
  const totalXp = Math.max(0, user.totalXp || 0);
  const dailyXp = Math.max(0, user.dailyXp || 0);
  const dailyPuzzleCount = Math.max(0, user.dailyPuzzleCount || 0);
  const streak = Math.max(0, user.streak || 0);
  const xpToNextLevel = Math.max(0, user.level * 100 - totalXp);
  const history = dashboardQuery.data?.xpHistory?.length
    ? dashboardQuery.data.xpHistory
    : buildFallbackHistory();
  const chart = buildChart(history);
  const weeklyXp = history.reduce((sum, point) => sum + point.total, 0);
  const bestDayXp = history.reduce((max, point) => Math.max(max, point.total), 0);
  const averageDailyXp = history.length ? Math.round(weeklyXp / history.length) : 0;

  const progressByCourse = progressQuery.data || {};
  const progressList = Object.values(progressByCourse);
  const coursesInProgress = progressList.filter(
    (progress) => progress.progressPercent > 0 && progress.progressPercent < 100,
  ).length;
  const completedCourses = progressList.filter((progress) => progress.progressPercent === 100).length;

  const suggestedCourses = dashboardQuery.data?.suggested || [];
  const availableCourses = dashboardQuery.data?.courses || suggestedCourses;
  const featuredCourseSelection = selectFeaturedCourse(availableCourses, progressByCourse);
  const allCoursesCompleted = featuredCourseSelection.allCompleted;
  const selectedPreviewCourse =
    availableCourses.find((course) => course.id === selectedPreviewCourseId) ||
    suggestedCourses.find((course) => course.id === selectedPreviewCourseId);
  const featuredCourse = selectedPreviewCourse || featuredCourseSelection.featuredEntry?.course;
  const featuredProgress = featuredCourse ? progressByCourse[featuredCourse.id] : undefined;
  const featuredPercent = allCoursesCompleted ? 100 : featuredProgress?.progressPercent || 0;
  const featuredNextLesson = allCoursesCompleted
    ? "Pick any finished course and review the key lessons."
    : resolveNextLesson(featuredCourse, featuredProgress);
  const primaryCourseHref = allCoursesCompleted
    ? "/courses"
    : featuredCourse
      ? `/courses/${featuredCourse.id}`
      : "/courses";
  const primaryCourseActionLabel = allCoursesCompleted
    ? "Review Courses"
    : featuredPercent > 0
      ? "Continue Learning"
      : "Explore Courses";

  useEffect(() => {
    if (!selectedPreviewCourseId) return;
    const exists = availableCourses.some((course) => course.id === selectedPreviewCourseId);
    if (!exists) {
      setSelectedPreviewCourseId(null);
    }
  }, [availableCourses, selectedPreviewCourseId]);

  const leaderboard = buildLeaderboard(globalLeaderboardQuery.data || [], user);
  const solvedPuzzleTypes = dailyPuzzleTrackerOrder.filter((type) =>
    Array.isArray(user.dailyPuzzleTypes) ? user.dailyPuzzleTypes.includes(type) : false,
  );
  const dailyPuzzleGoal = 3;
  const completedTrainingBlocks = Math.min(solvedPuzzleTypes.length, dailyPuzzleGoal);
  const dailyGoalProgress = Math.min(100, Math.round((completedTrainingBlocks / dailyPuzzleGoal) * 100));
  const streakDeadlineAt =
    user.streakDeadlineAt && user.streakDeadlineAt > 0
      ? user.streakDeadlineAt
      : (() => {
          const next = new Date();
          next.setHours(24, 0, 0, 0);
          return next.getTime();
        })();
  const streakCountdownMs = Math.max(0, streakDeadlineAt - clockNow);
  const countdownHours = Math.floor(streakCountdownMs / (1000 * 60 * 60));
  const countdownMinutes = Math.floor((streakCountdownMs % (1000 * 60 * 60)) / (1000 * 60));
  const countdownSeconds = Math.floor((streakCountdownMs % (1000 * 60)) / 1000);
  const countdownLabel = `${String(countdownHours).padStart(2, "0")}:${String(
    countdownMinutes,
  ).padStart(2, "0")}:${String(countdownSeconds).padStart(2, "0")}`;
  const bestDayPoint = history.reduce<DashboardHistoryPoint | null>(
    (best, point) => (!best || point.total > best.total ? point : best),
    null,
  );

  const trainingTasks = [
    {
      label: "Easy Puzzle",
      detail: "Pattern recognition warm-up to lock in tactical vision.",
      done: solvedPuzzleTypes.includes("easy"),
    },
    {
      label: "Medium Puzzle",
      detail: "Calculation sprint focused on initiative and conversion.",
      done: solvedPuzzleTypes.includes("medium"),
    },
    {
      label: "Hard Puzzle",
      detail: "Tournament-pressure finish with no loose moves allowed.",
      done: solvedPuzzleTypes.includes("hard"),
    },
  ];

  const metricCards = [
    {
      icon: Zap,
      label: "Level",
      value: `Lv. ${wholeNumber.format(Math.max(1, user.level || 1))}`,
      detail: `${division.label} division`,
      glow: true,
    },
    {
      icon: Star,
      label: "Total XP",
      value: wholeNumber.format(totalXp),
      detail: `+${wholeNumber.format(dailyXp)} today`,
      glow: false,
    },
    {
      icon: BookOpen,
      label: "Courses in Progress",
      value: wholeNumber.format(coursesInProgress),
      detail:
        completedCourses > 0
          ? `${wholeNumber.format(completedCourses)} completed`
          : "Momentum is building",
      glow: false,
    },
    {
      icon: Trophy,
      label: "Global Rank",
      value: `#${wholeNumber.format(leaderboard.rank)}`,
      detail: `${compactNumber.format(leaderboard.total)} tracked players`,
      glow: true,
    },
  ];

  return (
    <AppShell backgroundStyle={backgroundStyle} backgroundOverlay={backgroundOverlay}>
      <style>{pageStyles}</style>

      <div className="pp-dashboard-page mx-auto max-w-[1400px]">
        <section className="pp-dashboard-card pp-dashboard-card--hero pp-dashboard-card--glow px-6 py-7 sm:px-8 sm:py-9 xl:px-10 xl:py-10">
          <div className="pp-dashboard-particles" aria-hidden="true">
            {heroParticles.map((particle, index) => (
              <span
                key={`${particle.left}-${particle.top}-${index}`}
                className="pp-dashboard-particle"
                style={{
                  left: particle.left,
                  top: particle.top,
                  width: `${particle.size}px`,
                  height: `${particle.size}px`,
                  ["--particle-delay" as const]: particle.delay,
                  ["--particle-duration" as const]: particle.duration,
                  ["--particle-drift-x" as const]: particle.driftX,
                  ["--particle-rise" as const]: particle.rise,
                }}
              />
            ))}
          </div>
          <div className="relative z-10 grid items-center gap-8 xl:grid-cols-[1.4fr_0.95fr] xl:gap-10">
            <div className="flex flex-col items-center text-center">
              <h1 className="max-w-3xl text-[2.6rem] font-semibold leading-none tracking-[-0.06em] text-white sm:text-[3.25rem] xl:text-[3.9rem]">
                {greeting}, {firstName}
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Your next move starts here. Build pressure, convert edges, and keep every session
                pointed at world-class standards.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    navigate(primaryCourseHref)
                  }
                  className="pp-dashboard-primary-btn"
                >
                  <Play className="h-4 w-4" />
                  {primaryCourseActionLabel}
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/puzzles")}
                  className="pp-dashboard-secondary-btn"
                >
                  <Puzzle className="h-4 w-4" />
                  Start Daily Training
                </button>
              </div>

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <div className="pp-dashboard-pill">
                  <TrendingUp className="h-3.5 w-3.5 text-blue-300" />
                  {wholeNumber.format(weeklyXp)} XP this week
                </div>
                <div className="pp-dashboard-pill">
                  <Flame className="h-3.5 w-3.5 text-blue-300" />
                  {streak > 0 ? `${wholeNumber.format(streak)} day streak` : "Start a fresh streak"}
                </div>
                <div className="pp-dashboard-pill">
                  <Target className="h-3.5 w-3.5 text-blue-300" />
                  {xpToNextLevel > 0
                    ? `${wholeNumber.format(xpToNextLevel)} XP to next level`
                    : "Level objective complete"}
                </div>
              </div>
            </div>

            <div className="pp-dashboard-card pp-dashboard-card--soft p-6 sm:p-7">
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="pp-dashboard-avatar flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] text-xl font-semibold text-white">
                      <img
                        src={user.avatarUrl || avatarFallback}
                        alt={displayName}
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.src = avatarFallback;
                        }}
                      />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white">{displayName}</h2>
                      <p className="mt-1 text-sm text-slate-400">
                        {user.groupName || "Solo training program"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-full border border-blue-400/18 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
                    {division.label}
                  </div>
                </div>

                <div className="mt-7">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-slate-400">Daily target</span>
                    <span className="font-semibold text-white">
                      {wholeNumber.format(completedTrainingBlocks)} / {wholeNumber.format(dailyPuzzleGoal)} types
                    </span>
                  </div>
                  <div className="pp-dashboard-progress mt-3 h-3">
                    <span style={{ width: `${dailyGoalProgress}%` }} />
                  </div>
                </div>

                <div className="mt-7 grid gap-3 sm:grid-cols-3 xl:grid-cols-3">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-400">
                      <Flame className="h-3.5 w-3.5 text-blue-300" />
                      Streak
                    </div>
                    <p className="mt-3 text-lg font-semibold text-white">
                      {streak > 0 ? `${wholeNumber.format(streak)} days` : "Start today"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-400">
                      <Brain className="h-3.5 w-3.5 text-blue-300" />
                      Focus
                    </div>
                    <p className="mt-3 text-lg font-semibold text-white">
                      {allCoursesCompleted
                        ? "Review Lab"
                        : featuredCourse
                          ? formatCategory(featuredCourse.category)
                          : "Opening prep"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-400">
                      <Crown className="h-3.5 w-3.5 text-blue-300" />
                      Global
                    </div>
                    <p className="mt-3 text-lg font-semibold text-white">
                      #{wholeNumber.format(leaderboard.rank)}
                    </p>
                  </div>
                </div>

                <div className="mt-7 rounded-2xl border border-blue-400/12 bg-blue-500/[0.08] px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-blue-200/80">
                    Today&apos;s focus
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {featuredCourse
                      ? `Resume ${featuredCourse.title} and push it another clean block forward.`
                      : allCoursesCompleted
                        ? "Congrats! All Courses completed. Review a finished course or sharpen up with puzzles."
                        : "Build momentum with puzzles first, then move into your next course."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_0.95fr]">
          <div className="pp-dashboard-card pp-dashboard-card--glow p-6 sm:p-8">
            <div className="relative z-10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white sm:text-xl">Continue Learning</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {allCoursesCompleted
                      ? "Every course is complete. Jump back in for review whenever you want."
                      : "Pick up exactly where your training edge left off."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/courses")}
                  className="pp-dashboard-pill transition hover:border-blue-400/20 hover:bg-blue-500/10"
                >
                  View all courses
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-7 grid gap-6 xl:grid-cols-[0.95fr_1.2fr]">
                <div className="overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/60">
                  {featuredCourse ? (
                    <img
                      src={featuredCourse.thumbnailUrl}
                      alt={featuredCourse.title}
                      className="h-full min-h-[250px] w-full object-cover"
                    />
                  ) : (
                    <div className="flex min-h-[250px] h-full items-center justify-center bg-gradient-to-br from-blue-500/20 to-slate-950">
                      {allCoursesCompleted ? (
                        <Trophy className="h-14 w-14 text-blue-200" />
                      ) : (
                        <BookOpen className="h-14 w-14 text-blue-200" />
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="pp-dashboard-pill">
                        {allCoursesCompleted
                          ? "All Complete"
                          : featuredCourse
                            ? formatCategory(featuredCourse.category)
                            : "Training"}
                      </span>
                      <span className="pp-dashboard-pill">
                        {allCoursesCompleted
                          ? `${wholeNumber.format(completedCourses)} Courses`
                          : featuredCourse
                            ? formatDifficulty(featuredCourse.difficulty)
                            : "Structured"}
                      </span>
                    </div>

                    <h4 className="mt-4 text-[2rem] font-semibold leading-none tracking-[-0.05em] text-white">
                      {allCoursesCompleted
                        ? "Congrats! All Courses completed"
                        : featuredCourse
                          ? featuredCourse.title
                          : "Build your next training block"}
                    </h4>

                    <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                      {allCoursesCompleted
                        ? "Your training library is fully complete. Use review mode to revisit critical ideas and keep the patterns sharp."
                        : featuredCourse
                          ? featuredCourse.description
                          : "Your courses will appear here as soon as your training library is ready."}
                    </p>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                          Next lesson
                        </p>
                        <p className="mt-2 text-sm font-semibold text-white">{featuredNextLesson}</p>
                      </div>

                      <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                          Course progress
                        </p>
                        <p className="mt-2 text-sm font-semibold text-white">
                          {allCoursesCompleted
                            ? "100% complete"
                            : featuredCourse
                            ? `${wholeNumber.format(featuredPercent)}% complete`
                            : "Ready to begin"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="text-slate-400">Progress</span>
                        <span className="font-semibold text-white">
                          {wholeNumber.format(featuredPercent)}%
                        </span>
                      </div>
                      <div className="pp-dashboard-progress mt-3 h-2.5">
                        <span style={{ width: `${featuredPercent}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => navigate(primaryCourseHref)}
                      className="pp-dashboard-primary-btn"
                    >
                      {allCoursesCompleted ? "Review Now" : featuredPercent > 0 ? "Continue" : "Begin Course"}
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate("/practice")}
                      className="pp-dashboard-secondary-btn"
                    >
                      Practice
                    </button>
                  </div>
                </div>
              </div>

              {suggestedCourses.length > 0 && !allCoursesCompleted && (
                <div className="mt-7 grid gap-3 md:grid-cols-3">
                  {suggestedCourses.map((course) => {
                    const courseProgress = progressByCourse[course.id]?.progressPercent || 0;
                    const active = course.id === featuredCourse?.id;

                    return (
                      <button
                        key={course.id}
                        type="button"
                        onClick={() => setSelectedPreviewCourseId(course.id)}
                        className={`pp-dashboard-course-chip flex items-center gap-4 rounded-2xl border px-4 py-4 text-left ${
                          active
                            ? "border-blue-400/24 bg-blue-500/10"
                            : "border-white/8 bg-white/[0.035]"
                        }`}
                      >
                        <img
                          src={course.thumbnailUrl}
                          alt={course.title}
                          className="h-14 w-14 rounded-2xl object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{course.title}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {formatCategory(course.category)} | {wholeNumber.format(courseProgress)}%
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="pp-dashboard-card p-6 sm:p-7">
            <div className="relative z-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white sm:text-xl">Daily Training</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Stack your puzzle ladder and keep the streak alive.
                  </p>
                </div>
                <div className="rounded-2xl border border-blue-400/14 bg-blue-500/10 px-3 py-2 text-right">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-blue-200/80">Today</div>
                  <div className="mt-1 text-sm font-semibold text-white">
                    {wholeNumber.format(dailyPuzzleCount)} puzzle{dailyPuzzleCount === 1 ? "" : "s"}
                  </div>
                </div>
              </div>

              <div className="mt-7 rounded-2xl border border-white/8 bg-white/[0.035] p-4">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-slate-400">Puzzle type tracker</span>
                  <span className="font-semibold text-white">{dailyGoalProgress}%</span>
                </div>
                <div className="pp-dashboard-progress mt-3 h-2.5">
                  <span style={{ width: `${dailyGoalProgress}%` }} />
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Streak window resets in {countdownLabel}
                </p>
              </div>

              <div className="mt-5 space-y-3">
                {trainingTasks.map((task, index) => (
                  <TrainingTask
                    key={task.label}
                    label={task.label}
                    detail={task.detail}
                    done={task.done}
                    emphasized={index === 2 && !task.done}
                    onStart={() => navigate("/puzzles")}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => navigate("/puzzles")}
                className="pp-dashboard-primary-btn mt-6 w-full"
              >
                Open Daily Puzzle Board
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <div className="pp-dashboard-card pp-dashboard-card--glow p-6 sm:p-8">
            <div className="relative z-10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white sm:text-xl">Performance</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    XP earned over the last seven days.
                  </p>
                </div>
                <div className="pp-dashboard-pill">Last 7 days</div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                    Weekly Total
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {wholeNumber.format(weeklyXp)} XP
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Rolling seven-day output</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                    Best Day
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {wholeNumber.format(bestDayXp)} XP
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {bestDayPoint ? `${bestDayPoint.label} peak` : "No activity yet"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                    Daily Average
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {wholeNumber.format(averageDailyXp)} XP
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Average across the last seven days</p>
                </div>
              </div>

              <div className="mt-8 h-[240px]">
                <svg
                  className="h-full w-full"
                  viewBox={`0 0 ${chart.width} ${chart.height}`}
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="ppDashboardArea" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {chart.gridLines.map((line, index) => (
                    <line
                      key={index}
                      x1="0"
                      y1={line}
                      x2={chart.width}
                      y2={line}
                      stroke="rgba(148, 163, 184, 0.12)"
                      strokeDasharray="5 7"
                    />
                  ))}

                  {chart.areaPath && <path d={chart.areaPath} fill="url(#ppDashboardArea)" />}
                  {chart.linePath && (
                    <path
                      d={chart.linePath}
                      fill="none"
                      stroke="#60a5fa"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {chart.points.map((point) => (
                    <g key={`${point.label}-${point.x}`}>
                      <circle cx={point.x} cy={point.y} r="8" fill="rgba(96, 165, 250, 0.16)" />
                      <circle cx={point.x} cy={point.y} r="4" fill="#60a5fa" />
                    </g>
                  ))}
                </svg>
              </div>

              <div className="mt-4 flex justify-between gap-2 px-1">
                {history.map((point) => (
                  <div key={point.label} className="text-[11px] text-slate-500">
                    {point.label}
                  </div>
                ))}
              </div>

              <p className="mt-4 text-xs text-slate-500">
                Peak day target: {wholeNumber.format(chart.maxValue)} XP
              </p>
            </div>
          </div>

          <div className="pp-dashboard-card p-6 sm:p-7">
            <div className="relative z-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white sm:text-xl">Global Leaderboard</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    The strongest profiles on the board right now.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/ranks")}
                  className="text-sm font-semibold text-blue-300 transition hover:text-blue-200"
                >
                  View all
                </button>
              </div>

              <div className="mt-6 space-y-3">
                {leaderboard.rows.map((entry) => {
                  const label =
                    entry.chessUsername || entry.displayName || entry.email?.split("@")[0] || "Player";

                  return (
                    <div
                      key={`${entry.id}-${entry.rank}`}
                      data-current={entry.isCurrentUser ? "true" : "false"}
                      className="pp-dashboard-leader-row flex items-center justify-between gap-4 rounded-2xl border border-white/8 px-4 py-4"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold ${resolveBadgeTone(
                            entry.rank,
                          )}`}
                        >
                          {entry.rank}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {entry.isCurrentUser ? `${label} (You)` : label}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {wholeNumber.format(entry.totalXp || 0)} XP
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-white">
                          Lv. {wholeNumber.format(Math.max(1, entry.level || 1))}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {entry.isCurrentUser ? "Your standing" : "Elite pace"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <footer className="pp-dashboard-footer mt-10 rounded-[28px] px-6 py-8 sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                <img src={pawnPointIcon} alt="Pawn Point logo" className="h-full w-full object-cover" />
              </div>
              <div>
                <p className="text-lg font-semibold text-white">Pawn Point</p>
                <p className="text-sm text-slate-400">
                  Built to set the standard for world-class chess training.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-5 text-sm font-semibold">
              <a href="/checkout" className="text-slate-300 transition hover:text-white">
                Membership Plans
              </a>
              <button
                type="button"
                onClick={() => {
                  setContactOpen(true);
                  setFaqOpen(false);
                }}
                className="text-slate-300 transition hover:text-white"
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
                className="text-slate-300 transition hover:text-white"
              >
                FAQ
              </button>
              <a
                href="https://www.youtube.com/@Pawn-Point"
                target="_blank"
                rel="noreferrer"
                aria-label="Pawn Point YouTube"
                className="inline-flex items-center justify-center text-slate-300 transition hover:text-white"
              >
                <Youtube className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-white/8 pt-6 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
            <div>(c) {year} Pawn Point. All rights reserved.</div>
            <div className="flex flex-wrap gap-4">
              <a href="/terms-of-use" className="transition hover:text-white">
                Terms of Use
              </a>
              <a href="/privacy-policy" className="transition hover:text-white">
                Privacy
              </a>
              <a href="/cookie-policy" className="transition hover:text-white">
                Cookie Policy
              </a>
            </div>
          </div>
        </footer>
      </div>

      {contactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setContactOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="pp-dashboard-card pp-dashboard-card--glow relative z-10 w-full max-w-md p-6 text-white"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">Contact Us</div>
                <p className="mt-2 text-sm text-slate-400">
                  Reach the Pawn Point team directly for support and business enquiries.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setContactOpen(false)}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:text-white"
                aria-label="Close contact dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-5 rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-4 text-sm text-white">
              officialpawnpoint@gmail.com
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setContactOpen(false)}
                className="pp-dashboard-primary-btn"
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
            className="absolute inset-0 bg-black/70"
            onClick={() => setFaqOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="pp-dashboard-card relative z-10 w-full max-w-2xl p-6 text-white"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">FAQ</div>
                <p className="mt-2 text-sm text-slate-400">
                  Core answers for members, teams, and future Pawn Point players.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFaqOpen(false)}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:text-white"
                aria-label="Close FAQ dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {FAQ_ITEMS.map((item, index) => {
                const open = faqOpenIdx === index;
                return (
                  <div
                    key={item.question}
                    className="rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-4"
                  >
                    <button
                      type="button"
                      onClick={() => setFaqOpenIdx((current) => (current === index ? null : index))}
                      className="flex w-full items-center justify-between gap-4 text-left"
                    >
                      <span className="font-semibold text-white">{item.question}</span>
                      <span className="text-xl text-slate-400">{open ? "-" : "+"}</span>
                    </button>
                    {open && <p className="mt-3 text-sm leading-7 text-slate-400">{item.answer}</p>}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setFaqOpen(false)}
                className="pp-dashboard-primary-btn"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

