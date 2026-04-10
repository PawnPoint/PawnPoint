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
import { resolveRankBand } from "../lib/ranks";
import pawnPointIcon from "../assets/App tab icon.png";
import avatarFallback from "../assets/Easter Default.png";

const backgroundStyle = {
  backgroundColor: "#141413",
  minHeight: "100vh",
  color: "#f3ede3",
} as const;

const backgroundOverlay = (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <div className="pp-dashboard-ambient" />
    <div className="pp-dashboard-grain" />
  </div>
);

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

function StatusRailItem({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="pp-dashboard-status-item">
      <div className="pp-dashboard-status-icon">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="pp-dashboard-label">{label}</div>
        <div className="pp-dashboard-status-value mt-2">{value}</div>
        <div className="pp-dashboard-status-detail">{detail}</div>
      </div>
    </div>
  );
}

function TrainingTask({
  label,
  detail,
  done,
  onStart,
}: {
  label: string;
  detail: string;
  done: boolean;
  onStart: () => void;
}) {
  return (
    <div className="pp-dashboard-task" data-done={done ? "true" : "false"}>
      <div className="flex items-start gap-3">
        <div className="pp-dashboard-task-state">
          {done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
        </div>
        <div>
          <p className="text-sm font-semibold text-[#f3ede3]">{label}</p>
          <p className="mt-1 text-xs leading-6 text-[#b5aa9a]">{detail}</p>
        </div>
      </div>

      {!done && (
        <button type="button" onClick={onStart} className="pp-dashboard-task-button">
          Start
        </button>
      )}
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
  const rankBand = resolveRankBand(Math.max(1, user.level || 1));
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
      detail: "Pattern-recognition warm-up to lock in your tactical vision.",
      done: solvedPuzzleTypes.includes("easy"),
    },
    {
      label: "Medium Puzzle",
      detail: "Calculation sprint focused on initiative and clean conversion.",
      done: solvedPuzzleTypes.includes("medium"),
    },
    {
      label: "Hard Puzzle",
      detail: "Tournament-pressure finish with no loose moves allowed.",
      done: solvedPuzzleTypes.includes("hard"),
    },
  ];

  const statusItems = [
    {
      icon: Zap,
      label: "Level",
      value: `Lv. ${wholeNumber.format(Math.max(1, user.level || 1))}`,
      detail: `${rankBand.label} rank`,
    },
    {
      icon: Star,
      label: "Total XP",
      value: wholeNumber.format(totalXp),
      detail: `+${wholeNumber.format(dailyXp)} today`,
    },
    {
      icon: BookOpen,
      label: "Courses in Progress",
      value: wholeNumber.format(coursesInProgress),
      detail:
        completedCourses > 0
          ? `${wholeNumber.format(completedCourses)} completed`
          : "Momentum is building",
    },
    {
      icon: Trophy,
      label: "Global Rank",
      value: `#${wholeNumber.format(leaderboard.rank)}`,
      detail: `${compactNumber.format(leaderboard.total)} tracked players`,
    },
  ];

  const heroFacts = [
    {
      icon: TrendingUp,
      value: `${wholeNumber.format(weeklyXp)} XP this week`,
    },
    {
      icon: Flame,
      value: streak > 0 ? `${wholeNumber.format(streak)} day streak` : "Start a fresh streak",
    },
    {
      icon: Target,
      value:
        xpToNextLevel > 0
          ? `${wholeNumber.format(xpToNextLevel)} XP to next level`
          : "Level objective complete",
    },
  ];

  const focusLabel = allCoursesCompleted
    ? "Review Lab"
    : featuredCourse
      ? formatCategory(featuredCourse.category)
      : "Opening prep";

  const todayBrief = featuredCourse
    ? `Resume ${featuredCourse.title} and push it another clean block forward.`
    : allCoursesCompleted
      ? "Every course is complete. Review your strongest lines or sharpen up with puzzles."
      : "Build early momentum with puzzles, then move directly into your next course.";

  return (
    <AppShell
      backgroundStyle={backgroundStyle}
      backgroundOverlay={backgroundOverlay}
      variant="dashboard-editorial"
    >
      <div className="pp-dashboard-page mx-auto max-w-[1400px] space-y-6 pb-8">
        <section className="pp-dashboard-card pp-dashboard-card--hero px-6 py-7 sm:px-8 sm:py-9 xl:px-10 xl:py-10">
          <div className="pp-dashboard-hero-grid">
            <div className="flex flex-col justify-between gap-8">
              <div className="space-y-6">
                <h1 className="pp-dashboard-display max-w-4xl">{greeting}, {firstName}</h1>
                <p className="pp-dashboard-lede">
                  Your next move starts here. Build pressure, convert edges, and keep every session
                  pointed at world-class standards.
                </p>
                <div className="pp-dashboard-actions">
                  <button
                    type="button"
                    onClick={() => navigate(primaryCourseHref)}
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
                    Open Daily Training
                  </button>
                </div>
              </div>

              <div className="pp-dashboard-meta-row">
                {heroFacts.map(({ icon: Icon, value }) => (
                  <div key={value} className="pp-dashboard-meta-item">
                    <Icon className="h-4 w-4 text-[#d6c5a2]" />
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pp-dashboard-brief">
              <div className="pp-dashboard-brief-header">
                <div className="flex items-center gap-4">
                  <div className="pp-dashboard-avatar flex h-16 w-16 items-center justify-center overflow-hidden rounded-[16px] border border-white/10 bg-white/[0.04]">
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
                    <div className="pp-dashboard-overline">Training Brief</div>
                    <h2 className="mt-2 text-xl font-semibold text-[#f3ede3]">{displayName}</h2>
                    <p className="mt-1 text-sm text-[#b5aa9a]">
                      {user.groupName || "Solo training program"}
                    </p>
                  </div>
                </div>

                <span className="pp-dashboard-chip">{rankBand.label}</span>
              </div>

              <div>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-[#b5aa9a]">Daily target</span>
                  <span className="font-semibold text-[#f3ede3]">
                    {wholeNumber.format(completedTrainingBlocks)} / {wholeNumber.format(dailyPuzzleGoal)} types
                  </span>
                </div>
                <div className="pp-dashboard-progress mt-3 h-2.5">
                  <span style={{ width: `${dailyGoalProgress}%` }} />
                </div>
              </div>

              <div className="pp-dashboard-brief-facts">
                <div className="pp-dashboard-fact">
                  <div className="pp-dashboard-label flex items-center gap-2">
                    <Flame className="h-3.5 w-3.5 text-[#d6c5a2]" />
                    Streak
                  </div>
                  <p className="mt-3 text-base font-semibold text-[#f3ede3]">
                    {streak > 0 ? `${wholeNumber.format(streak)} days` : "Start today"}
                  </p>
                </div>
                <div className="pp-dashboard-fact">
                  <div className="pp-dashboard-label flex items-center gap-2">
                    <Brain className="h-3.5 w-3.5 text-[#d6c5a2]" />
                    Focus
                  </div>
                  <p className="mt-3 text-base font-semibold text-[#f3ede3]">{focusLabel}</p>
                </div>
                <div className="pp-dashboard-fact">
                  <div className="pp-dashboard-label flex items-center gap-2">
                    <Crown className="h-3.5 w-3.5 text-[#d6c5a2]" />
                    Global
                  </div>
                  <p className="mt-3 text-base font-semibold text-[#f3ede3]">
                    #{wholeNumber.format(leaderboard.rank)}
                  </p>
                </div>
              </div>

              <div className="pp-dashboard-focus-note">
                <div className="pp-dashboard-overline">Today&apos;s brief</div>
                <p className="mt-2 text-sm">{todayBrief}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="pp-dashboard-status-rail">
          {statusItems.map((item) => (
            <StatusRailItem key={item.label} {...item} />
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.55fr_0.9fr]">
          <div className="pp-dashboard-card pp-dashboard-card--feature p-6 sm:p-8">
            <div className="pp-dashboard-section-head">
              <div className="pp-dashboard-section-copy">
                <div className="pp-dashboard-overline">Current Study</div>
                <h3 className="pp-dashboard-heading mt-3">Continue Learning</h3>
                <p className="mt-3">
                  {allCoursesCompleted
                    ? "Every course is complete. Step back into any finished line whenever you want a clean review session."
                    : "Pick up exactly where your training edge left off."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/courses")}
                className="pp-dashboard-link-btn"
              >
                View all courses
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-7 pp-dashboard-feature-grid">
              <div className="pp-dashboard-feature-media">
                {featuredCourse ? (
                  <img src={featuredCourse.thumbnailUrl} alt={featuredCourse.title} />
                ) : (
                  <div className="pp-dashboard-feature-fallback">
                    {allCoursesCompleted ? (
                      <Trophy className="h-12 w-12" />
                    ) : (
                      <BookOpen className="h-12 w-12" />
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-between gap-6">
                <div className="space-y-5">
                  <div className="flex flex-wrap gap-2">
                    <span className="pp-dashboard-chip">
                      {allCoursesCompleted
                        ? "All Complete"
                        : featuredCourse
                          ? formatCategory(featuredCourse.category)
                          : "Training"}
                    </span>
                    <span className="pp-dashboard-chip">
                      {allCoursesCompleted
                        ? `${wholeNumber.format(completedCourses)} Courses`
                        : featuredCourse
                          ? formatDifficulty(featuredCourse.difficulty)
                          : "Structured"}
                    </span>
                  </div>

                  <div>
                    <h4 className="pp-dashboard-heading">
                      {allCoursesCompleted
                        ? "All courses completed"
                        : featuredCourse
                          ? featuredCourse.title
                          : "Build your next training block"}
                    </h4>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-[#b5aa9a]">
                      {allCoursesCompleted
                        ? "Your training library is fully complete. Use review mode to revisit critical ideas and keep the patterns sharp."
                        : featuredCourse
                          ? featuredCourse.description
                          : "Your courses will appear here as soon as your training library is ready."}
                    </p>
                  </div>

                  <div className="pp-dashboard-feature-facts sm:grid sm:grid-cols-2 sm:gap-x-6">
                    <div className="pp-dashboard-feature-stat">
                      <div className="pp-dashboard-label">Next lesson</div>
                      <p className="mt-3 text-sm font-semibold text-[#f3ede3]">{featuredNextLesson}</p>
                    </div>
                    <div className="pp-dashboard-feature-stat">
                      <div className="pp-dashboard-label">Course progress</div>
                      <p className="mt-3 text-sm font-semibold text-[#f3ede3]">
                        {allCoursesCompleted
                          ? "100% complete"
                          : featuredCourse
                            ? `${wholeNumber.format(featuredPercent)}% complete`
                            : "Ready to begin"}
                      </p>
                    </div>
                  </div>

                  <div className="pp-dashboard-feature-progress">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-[#b5aa9a]">Progress</span>
                      <span className="font-semibold text-[#f3ede3]">
                        {wholeNumber.format(featuredPercent)}%
                      </span>
                    </div>
                    <div className="pp-dashboard-progress mt-3 h-2.5">
                      <span style={{ width: `${featuredPercent}%` }} />
                    </div>
                  </div>
                </div>

                <div className="pp-dashboard-actions">
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
              <div className="mt-7 border-t border-[rgba(214,197,162,0.14)] pt-5">
                <div className="pp-dashboard-feature-course-list md:grid-cols-3">
                  {suggestedCourses.map((course) => {
                    const courseProgress = progressByCourse[course.id]?.progressPercent || 0;
                    const active = course.id === featuredCourse?.id;

                    return (
                      <button
                        key={course.id}
                        type="button"
                        onClick={() => setSelectedPreviewCourseId(course.id)}
                        data-active={active ? "true" : "false"}
                        className="pp-dashboard-course-chip"
                      >
                        <img
                          src={course.thumbnailUrl}
                          alt={course.title}
                          className="h-14 w-14 rounded-[12px] object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#f3ede3]">{course.title}</p>
                          <p className="mt-1 text-xs text-[#8d8374]">
                            {formatCategory(course.category)} • {wholeNumber.format(courseProgress)}%
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-[#8d8374]" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="pp-dashboard-card pp-dashboard-card--compact p-6 sm:p-7">
            <div className="pp-dashboard-section-head">
              <div className="pp-dashboard-section-copy">
                <div className="pp-dashboard-overline">Daily Ladder</div>
                <h3 className="pp-dashboard-heading mt-3">Daily Training</h3>
                <p className="mt-3">Stack your puzzle ladder and keep the streak alive.</p>
              </div>
              <div className="pp-dashboard-chip">
                Today {wholeNumber.format(dailyPuzzleCount)} puzzle{dailyPuzzleCount === 1 ? "" : "s"}
              </div>
            </div>

            <div className="mt-7 border-t border-[rgba(214,197,162,0.14)] pt-5">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-[#b5aa9a]">Puzzle type tracker</span>
                <span className="font-semibold text-[#f3ede3]">{dailyGoalProgress}%</span>
              </div>
              <div className="pp-dashboard-progress mt-3 h-2.5">
                <span style={{ width: `${dailyGoalProgress}%` }} />
              </div>
              <p className="mt-3 text-xs text-[#8d8374]">Streak window resets in {countdownLabel}</p>
            </div>

            <div className="pp-dashboard-task-list mt-6">
              {trainingTasks.map((task) => (
                <TrainingTask
                  key={task.label}
                  label={task.label}
                  detail={task.detail}
                  done={task.done}
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
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <div className="pp-dashboard-card p-6 sm:p-8">
            <div className="pp-dashboard-section-head">
              <div className="pp-dashboard-section-copy">
                <div className="pp-dashboard-overline">Seven-Day Read</div>
                <h3 className="pp-dashboard-heading mt-3">Performance</h3>
                <p className="mt-3">XP earned across the last seven days.</p>
              </div>
              <div className="pp-dashboard-chip">Last 7 days</div>
            </div>

            <div className="mt-6 pp-dashboard-analytic-grid">
              <div className="pp-dashboard-analytic-stat">
                <div className="pp-dashboard-label">Weekly Total</div>
                <p className="mt-3 text-xl font-semibold text-[#f3ede3]">{wholeNumber.format(weeklyXp)} XP</p>
                <p className="mt-2 text-xs text-[#8d8374]">Rolling seven-day output</p>
              </div>
              <div className="pp-dashboard-analytic-stat">
                <div className="pp-dashboard-label">Best Day</div>
                <p className="mt-3 text-xl font-semibold text-[#f3ede3]">{wholeNumber.format(bestDayXp)} XP</p>
                <p className="mt-2 text-xs text-[#8d8374]">
                  {bestDayPoint ? `${bestDayPoint.label} peak` : "No activity yet"}
                </p>
              </div>
              <div className="pp-dashboard-analytic-stat">
                <div className="pp-dashboard-label">Daily Average</div>
                <p className="mt-3 text-xl font-semibold text-[#f3ede3]">
                  {wholeNumber.format(averageDailyXp)} XP
                </p>
                <p className="mt-2 text-xs text-[#8d8374]">Average across the last seven days</p>
              </div>
            </div>

            <div className="pp-dashboard-chart-wrap">
              <svg
                className="h-full w-full"
                viewBox={`0 0 ${chart.width} ${chart.height}`}
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="ppDashboardAreaEditorial" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#d6c5a2" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#d6c5a2" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {chart.gridLines.map((line, index) => (
                  <line
                    key={index}
                    x1="0"
                    y1={line}
                    x2={chart.width}
                    y2={line}
                    stroke="rgba(214, 197, 162, 0.12)"
                    strokeDasharray="4 8"
                  />
                ))}

                {chart.areaPath && <path d={chart.areaPath} fill="url(#ppDashboardAreaEditorial)" />}
                {chart.linePath && (
                  <path
                    d={chart.linePath}
                    fill="none"
                    stroke="#d6c5a2"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {chart.points.map((point) => (
                  <g key={`${point.label}-${point.x}`}>
                    <circle cx={point.x} cy={point.y} r="5" fill="#141413" stroke="#d6c5a2" strokeWidth="2" />
                  </g>
                ))}
              </svg>
            </div>

            <div className="pp-dashboard-chart-labels">
              {history.map((point) => (
                <div key={point.label}>{point.label}</div>
              ))}
            </div>

            <p className="mt-4 text-xs text-[#8d8374]">
              Peak day reference: {wholeNumber.format(chart.maxValue)} XP
            </p>
          </div>

          <div className="pp-dashboard-card p-6 sm:p-7">
            <div className="pp-dashboard-section-head">
              <div className="pp-dashboard-section-copy">
                <div className="pp-dashboard-overline">Board Standing</div>
                <h3 className="pp-dashboard-heading mt-3">Global Leaderboard</h3>
                <p className="mt-3">The strongest profiles on the board right now.</p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/ranks")}
                className="pp-dashboard-quiet-btn"
              >
                View all
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="pp-dashboard-leaderboard mt-6">
              {leaderboard.rows.map((entry) => {
                const label =
                  entry.chessUsername || entry.displayName || entry.email?.split("@")[0] || "Player";

                return (
                  <div
                    key={`${entry.id}-${entry.rank}`}
                    data-current={entry.isCurrentUser ? "true" : "false"}
                    className="pp-dashboard-leader-row"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="pp-dashboard-leader-rank">#{entry.rank}</div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#f3ede3]">
                          {entry.isCurrentUser ? `${label} (You)` : label}
                        </p>
                        <p className="mt-1 text-xs text-[#8d8374]">
                          {wholeNumber.format(entry.totalXp || 0)} XP
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-[#f3ede3]">
                        Lv. {wholeNumber.format(Math.max(1, entry.level || 1))}
                      </p>
                      <p className="mt-1 text-xs text-[#8d8374]">
                        {entry.isCurrentUser ? "Your standing" : "Elite pace"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <footer className="pp-dashboard-footer px-1 pt-4">
          <div className="flex flex-col gap-6 py-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 overflow-hidden rounded-[14px] border border-[rgba(214,197,162,0.14)] bg-white/[0.03]">
                <img src={pawnPointIcon} alt="Pawn Point logo" className="h-full w-full object-cover" />
              </div>
              <div>
                <p className="text-lg font-semibold text-[#f3ede3]">Pawn Point</p>
                <p className="text-sm text-[#b5aa9a]">
                  Built to set the standard for world-class chess training.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-5 text-sm font-semibold">
              <a href="/checkout">Membership Plans</a>
              <button
                type="button"
                onClick={() => {
                  setContactOpen(true);
                  setFaqOpen(false);
                }}
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
              >
                FAQ
              </button>
              <a
                href="https://www.youtube.com/@Pawn-Point"
                target="_blank"
                rel="noreferrer"
                aria-label="Pawn Point YouTube"
                className="inline-flex items-center justify-center"
              >
                <Youtube className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-[rgba(214,197,162,0.14)] py-6 text-xs md:flex-row md:items-center md:justify-between">
            <div>(c) {year} Pawn Point. All rights reserved.</div>
            <div className="flex flex-wrap gap-4">
              <a href="/terms-of-use">Terms of Use</a>
              <a href="/privacy-policy">Privacy</a>
              <a href="/cookie-policy">Cookie Policy</a>
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
            className="pp-dashboard-modal relative z-10 w-full max-w-md p-6 text-[#f3ede3]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="pp-dashboard-overline">Contact</div>
                <div className="mt-3 text-lg font-semibold">Contact Us</div>
                <p className="mt-2 text-sm leading-7 text-[#b5aa9a]">
                  Reach the Pawn Point team directly for support and business enquiries.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setContactOpen(false)}
                className="pp-dashboard-modal-close"
                aria-label="Close contact dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-6 border-t border-[rgba(214,197,162,0.14)] pt-6 text-sm text-[#f3ede3]">
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
            className="pp-dashboard-modal relative z-10 w-full max-w-2xl p-6 text-[#f3ede3]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="pp-dashboard-overline">Reference</div>
                <div className="mt-3 text-lg font-semibold">FAQ</div>
                <p className="mt-2 text-sm leading-7 text-[#b5aa9a]">
                  Core answers for members, teams, and future Pawn Point players.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFaqOpen(false)}
                className="pp-dashboard-modal-close"
                aria-label="Close FAQ dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6">
              {FAQ_ITEMS.map((item, index) => {
                const open = faqOpenIdx === index;
                return (
                  <div key={item.question} className="pp-dashboard-faq-item">
                    <button
                      type="button"
                      onClick={() => setFaqOpenIdx((current) => (current === index ? null : index))}
                      className="flex w-full items-center justify-between gap-4 text-left"
                    >
                      <span className="font-semibold text-[#f3ede3]">{item.question}</span>
                      <span className="text-xl text-[#8d8374]">{open ? "-" : "+"}</span>
                    </button>
                    {open && <p className="mt-3 text-sm leading-7 text-[#b5aa9a]">{item.answer}</p>}
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

