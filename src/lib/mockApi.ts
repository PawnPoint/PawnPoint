import { nanoid } from "./nanoid";
import { auth, db } from "./firebase";
import { get, onValue, ref, remove, set, update } from "firebase/database";
import { DEFAULT_BOARD_THEME, resolveBoardTheme } from "./boardThemes";
import { DEFAULT_PIECE_THEME, resolvePieceTheme } from "./pieceThemes";
import {
  normalizeProfileAvatarValue,
  resolveProfileAvatarUrl,
} from "./profileAvatars";
import { uploadProfileAvatarToSupabase } from "./supabaseContent";

export type DailyPuzzleType = "easy" | "medium" | "hard";

export type ExternalRatingRecord = {
  username?: string;
  displayName?: string;
  rating?: number | null;
  bullet?: number | null;
  blitz?: number | null;
  rapid?: number | null;
  classical?: number | null;
  rapidHistory?: { date: string; rating: number }[];
  syncedAt?: number;
  manuallyEditedAt?: number;
};

export type ExternalRatings = {
  fide?: ExternalRatingRecord | null;
  chesscom?: ExternalRatingRecord | null;
  lichess?: ExternalRatingRecord | null;
};

export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  avatarKey?: string;
  avatarUrl?: string;
  accountType?: "personal" | "group";
  groupId?: string | null;
  groupCode?: string | null;
  groupName?: string | null;
  groupRole?: "admin" | "member" | null;
  unlockedPfps?: string[];
  unlockedTaglines?: string[];
  unlockedVideos?: string[];
  unlockedSets?: string[];
  selectedTagline?: string;
  taglinesEnabled?: boolean;
  streak?: number;
  bestStreak?: number;
  dailyXp?: number;
  dailyPuzzleCount?: number;
  dailyPuzzleTypes?: DailyPuzzleType[];
  dailyDate?: string;
  lastQualifiedDate?: string | null;
  lastStreakAt?: number;
  streakDeadlineAt?: number;
  pawns?: number;
  chessUsername?: string;
  onlineRating?: number;
  externalRatings?: ExternalRatings;
  totalXp: number;
  level: number;
  isAdmin: boolean;
  adminKeyUnlocked?: boolean;
  createdAt?: number;
  xpReachedAt?: number;
  boardTheme?: string;
  pieceTheme?: string;
  premiumAccess?: boolean;
  paypalSubscriptionId?: string | null;
  subscriptionStatus?: "active" | "cancelled" | "unknown";
  subscriptionUpdatedAt?: number | null;
  groupLocked?: boolean;
};

export type GroupRemovedMember = {
  removedAt: number;
  reason: "kicked" | "paused" | "other";
  removedBy?: string;
};

export type Group = {
  id: string;
  name: string;
  code: string;
  createdBy: string;
  createdAt: number;
  locked?: boolean;
  teamUrl?: string;
  avatarUrl?: string;
  pausedMembers?: Record<string, GroupMember>;
  removedMembers?: Record<string, GroupRemovedMember>;
};

export type GroupProfileSettings = Pick<Group, "id" | "name" | "code" | "teamUrl" | "avatarUrl">;

export type GroupMember = {
  id: string;
  displayName: string;
  email?: string;
  role: "admin" | "member";
  joinedAt?: number;
};

export type UserClubMembership = {
  id: string;
  name: string;
  code: string;
  role: "admin" | "member";
  locked?: boolean;
};

export type Lesson = {
  id: string;
  title: string;
  summary: string;
};

export type Course = {
  id: string;
  title: string;
  description: string;
  category: "white_opening" | "black_opening" | "middlegame" | "endgame" | "skills" | "beginner";
  difficulty: "beginner" | "intermediate" | "advanced";
  thumbnailUrl: string;
  accentColor: string;
  lessons: Lesson[]; // legacy
  chapters?: Record<string, Chapter>;
  isShared?: boolean;
  managedByGroupId?: string | null;
  contentUpdatedAt?: number;
};

export type Chapter = {
  id: string;
  title: string;
  index: number;
  subsections?: Record<string, Subsection>;
};

export type Subsection =
  | {
      id: string;
      type: "video";
      title: string;
      videoUrl: string;
      index?: number;
      trainerNote?: string;
      parentStudyId?: string;
    }
  | {
      id: string;
      type: "pgn";
      title: string;
      pgn: string;
      index?: number;
      fen?: string;
      parentStudyId?: string;
      trainerNote?: string;
    }
  | {
      id: string;
      type: "study";
      title: string;
      pgn?: string;
      fen?: string;
      index?: number;
      parentStudyId?: string;
      trainerNote?: string;
    }
  | {
      id: string;
      type: "quiz";
      title: string;
      fen?: string;
      index?: number;
      trainerNote?: string;
      parentStudyId?: string;
      questions: {
        id: string;
        prompt: string;
        options: string[];
        correctIndex: number;
      }[];
    };

export type CourseProgress = {
  courseId: string;
  completedLessonIds: string[];
  progressPercent: number;
  lastLessonId?: string;
};

export type ClubLeaderboardEntry = {
  id: string;
  name: string;
  rating: number;
  performance?: number;
  addedBy?: string;
  createdAt?: number;
};

export type StandingsBoard = {
  id: string;
  label: string;
  names: string[];
  updatedAt?: number;
  updatedBy?: string;
};

export type SquareBaseBook = {
  id: string;
  title: string;
  url: string;
  addedBy?: string;
  addedByName?: string;
  createdAt: number;
};

export type LiveMatchPlayer = {
  id: string;
  name: string;
  rating: number;
  color: "w" | "b";
  chessUsername?: string;
};

export type LiveMatch = {
  id: string;
  timeControl: string;
  players: Record<string, LiveMatchPlayer>;
  status: "pending" | "active";
  createdAt: number;
  moves?: Record<string, LiveMove>;
};

export type ChallengePayload = {
  id: string;
  fromId: string;
  fromName: string;
  fromChessUsername?: string;
  fromRating?: number;
  timeControl: string;
  createdAt: number;
};

export type LiveMove = {
  id?: string;
  from: string;
  to: string;
  promotion?: string;
  san: string;
  fen: string;
  by: string;
  ts: number;
};

export type MatchSignal = {
  id?: string;
  type: "resign" | "draw_offer" | "draw_accept" | "draw_reject";
  by: string;
  ts: number;
};

const STORAGE_KEYS = {
  user: "pawnpoint_user",
  progress: "pawnpoint_progress",
  courses: "pawnpoint_courses",
  suggestions: "pawnpoint_suggestions",
  xpHistory: "pawnpoint_xp_history",
  clubLeaderboard: "pawnpoint_club_leaderboard",
  standingsBoards: "pawnpoint_standings_boards",
  squareBase: "pawnpoint_square_base",
};

export const DEFAULT_COURSE_THUMBNAIL = "/pieces/wQ.png";

const COURSES_PATH = "courses";
const XP_HISTORY_PATH = "xpHistory";
const STREAKS_PATH = "streaks";
const SQUARE_BASE_PATH = "squareBaseBooks";
const STANDINGS_BOARDS_PATH = "standingsBoards";
const LOCAL_THUMBNAILS = ["/pieces/wB.png", "/pieces/bQ.png", "/pieces/wN.png", "/pieces/bK.png"];
const DEFAULT_GROUP_NAME = "My Group";
const PLATFORM_COURSE_EDITOR_USER_ID = "FeXOccEwugQBmJtcFgydgAnrlUA3";
const PLATFORM_COURSE_IDS = new Set([
  "4l3d1jubhd6j",
  "dlafpafud05u",
  "emzem6o8yv63",
  "igrx18bxsdcp",
  "j5ef2s59v94m",
  "s9qmng7usig8",
]);
const MATCHMAKING_TIMEOUT_MS = 2 * 60 * 1000;
const GROUP_REJOIN_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
export const USER_UPDATED_EVENT = "pawnpoint:user-updated";
const DEFAULT_STANDINGS_BOARDS: StandingsBoard[] = [
  {
    id: "group-standings",
    label: "Group standings",
    names: [
      "Juan-Louis",
      "Zac",
      "Karli",
      "Amy",
      "Lillith",
      "Zander",
      "Wayde",
      "Chris",
      "Jonny",
      "KG",
      "Tayla",
      "Mia",
      "Rosty",
      "Ruan",
      "Sakelish",
      "Zenzo",
      "Nano",
      "Khanya",
      "Ryan",
      "Emilio",
      "Joshua",
    ],
  },
  {
    id: "mid-players-standings",
    label: "Mid players standings",
    names: [
      "Ian",
      "Ethan",
      "Caydence",
      "Tiaan",
      "Alexander(bear)",
      "Elandre",
      "Charlize",
      "Nelita",
      "Mila-ne",
      "Markie",
      "johan",
      "LXR",
      "Arina",
      "Anicka",
      "Lienke",
      "Kabir",
      "Rachael",
      "Darius(1)",
      "Carson",
      "keagan",
      "Cathri Botha",
      "Alexander",
      "Emily",
      "Liam",
      "Seyan",
      "Liam(twin)",
      "Milan (twin)",
      "kevin",
      "Arno",
      "Zai",
      "Maxinmus",
      "Darius(2)",
      "Ruben",
      "Sebastian",
      "AmarokGJ",
    ],
  },
];

type DataScope = {
  scope: "group" | "personal" | "public";
  cacheKey: string;
  groupId?: string | null;
  userId?: string | null;
};
type ScopedResource = DataScope & { path: string };
function sanitizeDigits(input: string): string {
  const digits = (input || "").replace(/[^0-9]/g, "");
  if (!digits) return "";
  return digits.slice(-4).padStart(4, "0");
}

function normalizeTimeControl(key: string): string {
  const safe = (key || "").toLowerCase().replace(/[^a-z0-9_]/g, "");
  return safe || "rapid";
}

function normalizeChessUsername(name?: string | null): string {
  return (name || "").trim().toLowerCase();
}

function formatGroupCode(digits: string): string {
  const safe = sanitizeDigits(digits);
  return safe ? `#${safe}` : "";
}

function resolveScope(user?: UserProfile | null): DataScope {
  const active = user || readUser();
  if (active?.groupId) {
    return { scope: "group", cacheKey: `group-${active.groupId}`, groupId: active.groupId, userId: active.id };
  }
  if (active?.id) {
    return { scope: "personal", cacheKey: `user-${active.id}`, userId: active.id };
  }
  return { scope: "public", cacheKey: "public" };
}

function scopedPath(resource: string, user?: UserProfile | null) {
  const scope = resolveScope(user);
  const prefix =
    scope.scope === "group"
      ? `groups/${scope.groupId}/`
      : scope.scope === "personal"
        ? `users/${scope.userId}/`
        : "";
  return { ...scope, path: `${prefix}${resource}` };
}

function scopedStorageKey(base: string, scope: DataScope) {
  return `${base}:${scope.cacheKey}`;
}

function courseSubsectionsPath(courseId: string, chapterId: string, user?: UserProfile | null, isShared = false) {
  return isShared
    ? `${COURSES_PATH}/${courseId}/chapters/${chapterId}/subsections`
    : scopedPath(`${COURSES_PATH}/${courseId}/chapters/${chapterId}/subsections`, user).path;
}

function isPermissionDeniedError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err || "");
  return message.toLowerCase().includes("permission denied");
}

function resolveClubScope(user?: UserProfile | null): ScopedResource {
  const active = user || readUser();
  if (active?.groupId) {
    return {
      scope: "group",
      cacheKey: `group-${active.groupId}`,
      groupId: active.groupId,
      userId: active.id,
      path: `groups/${active.groupId}/clubLeaderboard`,
    };
  }
  if (active?.id) {
    return {
      scope: "personal",
      cacheKey: `user-${active.id}`,
      userId: active.id,
      path: `users/${active.id}/clubLeaderboard`,
    };
  }
  return { scope: "public", cacheKey: "public", path: "clubLeaderboard" };
}

function resolveStandingsBoardsScope(user?: UserProfile | null): ScopedResource {
  const active = user || readUser();
  if (active?.groupId) {
    return {
      scope: "group",
      cacheKey: `group-${active.groupId}`,
      groupId: active.groupId,
      userId: active.id,
      path: `groups/${active.groupId}/${STANDINGS_BOARDS_PATH}`,
    };
  }
  if (active?.id) {
    return {
      scope: "personal",
      cacheKey: `user-${active.id}`,
      userId: active.id,
      path: `users/${active.id}/${STANDINGS_BOARDS_PATH}`,
    };
  }
  return { scope: "public", cacheKey: "public", path: STANDINGS_BOARDS_PATH };
}

function hasSiteAdminAccess(profile?: Pick<UserProfile, "adminKeyUnlocked"> | null): boolean {
  return profile?.adminKeyUnlocked === true;
}

function isPlatformCourseEditor(profile?: Pick<UserProfile, "id"> | null): boolean {
  return profile?.id === PLATFORM_COURSE_EDITOR_USER_ID;
}

export function hasGroupAdminAccess(
  profile?: Pick<UserProfile, "adminKeyUnlocked" | "groupRole"> | null,
): boolean {
  return hasSiteAdminAccess(profile) || profile?.groupRole === "admin";
}

export function canEditCourse(
  course?: Pick<Course, "id" | "isShared" | "managedByGroupId"> | null,
  profile?: Pick<UserProfile, "id" | "adminKeyUnlocked" | "isAdmin"> | null,
): boolean {
  if (!course) return false;
  if (PLATFORM_COURSE_IDS.has(course.id)) {
    return isPlatformCourseEditor(profile);
  }
  return !!profile?.isAdmin || hasSiteAdminAccess(profile);
}

function resolveIsAdmin(profile: UserProfile): boolean {
  return hasSiteAdminAccess(profile);
}

const DAILY_PUZZLE_TYPE_ORDER: DailyPuzzleType[] = ["easy", "medium", "hard"];

function normalizeDailyPuzzleTypes(value: unknown): DailyPuzzleType[] {
  if (!Array.isArray(value)) return [];
  const unique = new Set<DailyPuzzleType>();
  value.forEach((entry) => {
    if (entry === "easy" || entry === "medium" || entry === "hard") {
      unique.add(entry);
    }
  });
  return DAILY_PUZZLE_TYPE_ORDER.filter((entry) => unique.has(entry));
}

function normalizeAvatarUrl(value: string | null | undefined) {
  return resolveProfileAvatarUrl(value);
}

function readUser(): UserProfile | null {
  const raw = localStorage.getItem(STORAGE_KEYS.user);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as UserProfile;
    if (parsed.isAdmin === undefined) {
      parsed.isAdmin = false;
      writeUser(parsed);
    }
    if (parsed.adminKeyUnlocked === undefined) {
      parsed.adminKeyUnlocked = false;
      writeUser(parsed);
    }
    if (parsed.createdAt === undefined) {
      parsed.createdAt = Date.now();
      writeUser(parsed);
    }
    if (parsed.lastStreakAt === undefined) {
      parsed.lastStreakAt = startOfDayMs(new Date(parsed.createdAt || Date.now()));
      writeUser(parsed);
    }
    if (parsed.bestStreak === undefined) {
      parsed.bestStreak = parsed.streak ?? 0;
      writeUser(parsed);
    }
    if (parsed.dailyDate === undefined) {
      const base = parsed.lastStreakAt || parsed.xpReachedAt || parsed.createdAt || Date.now();
      parsed.dailyDate = toLocalDateKey(new Date(base));
      writeUser(parsed);
    }
    if (parsed.dailyXp === undefined) {
      parsed.dailyXp = 0;
      writeUser(parsed);
    }
    if (parsed.dailyPuzzleCount === undefined) {
      parsed.dailyPuzzleCount = 0;
      writeUser(parsed);
    }
    if (parsed.dailyPuzzleTypes === undefined) {
      parsed.dailyPuzzleTypes = [];
      writeUser(parsed);
    }
    if (parsed.lastQualifiedDate === undefined) {
      parsed.lastQualifiedDate = parsed.lastStreakAt ? toLocalDateKey(new Date(parsed.lastStreakAt)) : null;
      writeUser(parsed);
    }
    if (parsed.streakDeadlineAt === undefined) {
      parsed.streakDeadlineAt = nextDayDeadlineMs(new Date());
      writeUser(parsed);
    }
    if (parsed.pawns === undefined) {
      parsed.pawns = 0;
      writeUser(parsed);
    }
    if (parsed.accountType === undefined) {
      parsed.accountType = parsed.groupId ? "group" : "personal";
      writeUser(parsed);
    }
    if (parsed.premiumAccess === undefined) {
      parsed.premiumAccess = false;
      writeUser(parsed);
    }
    if (parsed.paypalSubscriptionId === undefined) {
      parsed.paypalSubscriptionId = null;
      writeUser(parsed);
    }
    if (parsed.subscriptionStatus === undefined) {
      parsed.subscriptionStatus = parsed.premiumAccess ? "active" : undefined;
      writeUser(parsed);
    }
    if (parsed.subscriptionUpdatedAt === undefined) {
      parsed.subscriptionUpdatedAt = null;
      writeUser(parsed);
    }
    parsed.groupId = parsed.groupId ?? null;
    parsed.groupCode = parsed.groupCode ?? null;
    parsed.groupName = parsed.groupName ?? null;
    parsed.groupRole = parsed.groupRole ?? null;
    parsed.accountType = parsed.groupId ? "group" : parsed.accountType ?? "personal";
    parsed.groupLocked = parsed.groupId ? parsed.groupLocked : parsed.groupLocked ?? false;
    if (!parsed.groupId) {
      parsed.groupRole = null;
    }
    parsed.unlockedPfps = parsed.unlockedPfps || [];
    parsed.unlockedTaglines = parsed.unlockedTaglines || [];
    parsed.unlockedVideos = parsed.unlockedVideos || [];
    parsed.unlockedSets = parsed.unlockedSets || [];
    parsed.taglinesEnabled = parsed.taglinesEnabled ?? true;
    parsed.selectedTagline = parsed.selectedTagline ?? "";
    parsed.avatarKey = normalizeProfileAvatarValue(parsed.avatarKey ?? parsed.avatarUrl);
    parsed.avatarUrl = normalizeAvatarUrl(parsed.avatarKey);
    parsed.externalRatings = normalizeExternalRatings(parsed.externalRatings);
    parsed.onlineRating = typeof parsed.onlineRating === "number" ? parsed.onlineRating : 1000;
    parsed.dailyPuzzleTypes = normalizeDailyPuzzleTypes(parsed.dailyPuzzleTypes);
    parsed.boardTheme = resolveBoardTheme(parsed.boardTheme).key;
    parsed.pieceTheme = resolvePieceTheme(parsed.pieceTheme).key;
    const nextIsAdmin = resolveIsAdmin(parsed);
    if (parsed.isAdmin !== nextIsAdmin) {
      parsed.isAdmin = nextIsAdmin;
    }
    writeUser(parsed);
    if (parsed.xpReachedAt === undefined) {
      parsed.xpReachedAt = parsed.createdAt ?? Date.now();
      writeUser(parsed);
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeUser(user: UserProfile) {
  const nextValue = JSON.stringify(user);
  const previousValue = localStorage.getItem(STORAGE_KEYS.user);
  localStorage.setItem(STORAGE_KEYS.user, nextValue);
  if (previousValue !== nextValue && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(USER_UPDATED_EVENT, {
        detail: user,
      }),
    );
  }
}

function readSuggestions(): { courseIds: string[]; source?: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.suggestions);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.courseIds)) return null;
    return { courseIds: parsed.courseIds, source: parsed.source };
  } catch {
    return null;
  }
}

function writeSuggestions(courseIds: string[], source?: string) {
  localStorage.setItem(
    STORAGE_KEYS.suggestions,
    JSON.stringify({ courseIds: courseIds.slice(0, 5), source: source || "manual" }),
  );
}

function normalizeSquareBaseBook(raw: Partial<SquareBaseBook>): SquareBaseBook {
  return {
    id: raw.id || nanoid(),
    title: (raw.title || "").trim(),
    url: (raw.url || "").trim(),
    addedBy: raw.addedBy,
    addedByName: raw.addedByName,
    createdAt: raw.createdAt || Date.now(),
  };
}

function normalizeClubEntry(raw: Partial<ClubLeaderboardEntry>): ClubLeaderboardEntry {
  return {
    id: raw.id || nanoid(),
    name: (raw.name || "").trim() || "Player",
    rating: Math.max(0, Math.round(raw.rating || 0)),
    performance: raw.performance !== undefined ? Math.round(raw.performance) : undefined,
    addedBy: raw.addedBy,
    createdAt: raw.createdAt || Date.now(),
  };
}

function cloneDefaultStandingsBoards(): StandingsBoard[] {
  return DEFAULT_STANDINGS_BOARDS.map((board) => ({
    ...board,
    names: [...board.names],
  }));
}

function normalizeStandingsNames(boardId: string | undefined, names: string[]): string[] {
  const cleaned = names.map((name) => (name === "Saklesh" ? "Sakelish" : name));
  if (boardId !== "group-standings") return cleaned;
  const desiredOrder = ["Ruan", "Sakelish", "Zenzo", "Nano", "Khanya", "Ryan", "Emilio"];
  const desiredSet = new Set(desiredOrder);
  const present = new Set(cleaned.filter((name) => desiredSet.has(name)));
  let index = 0;
  const replacements = desiredOrder.filter((name) => present.has(name));
  return cleaned.map((name) => (desiredSet.has(name) ? replacements[index++] : name));
}

function normalizeStandingsBoard(raw: Partial<StandingsBoard>, fallback?: StandingsBoard): StandingsBoard {
  const namesSource = Array.isArray(raw.names) ? raw.names : fallback?.names || [];
  const boardId = raw.id || fallback?.id;
  return {
    id: boardId || nanoid(),
    label: (raw.label || fallback?.label || "Standings").trim() || "Standings",
    names: normalizeStandingsNames(
      boardId,
      namesSource.map((name) => (typeof name === "string" ? name.trim() : "")).filter(Boolean),
    ),
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : fallback?.updatedAt,
    updatedBy: typeof raw.updatedBy === "string" ? raw.updatedBy : fallback?.updatedBy,
  };
}

function mergeStandingsBoards(rawBoards?: Partial<StandingsBoard>[]): StandingsBoard[] {
  const incoming = new Map(
    (rawBoards || [])
      .filter((board): board is Partial<StandingsBoard> & { id: string } => typeof board?.id === "string")
      .map((board) => [board.id, board]),
  );
  return cloneDefaultStandingsBoards().map((board) => normalizeStandingsBoard(incoming.get(board.id) || board, board));
}

function readClubLeaderboardLocal(scope?: DataScope): ClubLeaderboardEntry[] {
  const resolved = scope || resolveScope();
  try {
    const raw = localStorage.getItem(scopedStorageKey(STORAGE_KEYS.clubLeaderboard, resolved));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => normalizeClubEntry(entry || {}));
  } catch {
    return [];
  }
}

function writeClubLeaderboardLocal(entries: ClubLeaderboardEntry[], scope?: DataScope) {
  const resolved = scope || resolveScope();
  try {
    localStorage.setItem(scopedStorageKey(STORAGE_KEYS.clubLeaderboard, resolved), JSON.stringify(entries));
  } catch {
    // ignore storage errors
  }
}

function readStandingsBoardsLocal(scope?: DataScope): StandingsBoard[] {
  const resolved = scope || resolveScope();
  try {
    const raw = localStorage.getItem(scopedStorageKey(STORAGE_KEYS.standingsBoards, resolved));
    if (!raw) return cloneDefaultStandingsBoards();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return cloneDefaultStandingsBoards();
    return mergeStandingsBoards(parsed);
  } catch {
    return cloneDefaultStandingsBoards();
  }
}

function writeStandingsBoardsLocal(boards: StandingsBoard[], scope?: DataScope) {
  const resolved = scope || resolveScope();
  try {
    localStorage.setItem(scopedStorageKey(STORAGE_KEYS.standingsBoards, resolved), JSON.stringify(boards));
  } catch {
    // ignore storage errors
  }
}

function readSquareBaseLocal(scope?: DataScope): SquareBaseBook[] {
  const resolved = scope || resolveScope();
  try {
    const raw = localStorage.getItem(scopedStorageKey(STORAGE_KEYS.squareBase, resolved));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => normalizeSquareBaseBook(entry || {}));
  } catch {
    return [];
  }
}

function writeSquareBaseLocal(entries: SquareBaseBook[], scope?: DataScope) {
  const resolved = scope || resolveScope();
  try {
    localStorage.setItem(scopedStorageKey(STORAGE_KEYS.squareBase, resolved), JSON.stringify(entries));
  } catch {
    // ignore storage errors
  }
}

type CourseRecord = Record<string, Course>;

function sanitizeThumbnail(url?: string): string {
  if (!url) return DEFAULT_COURSE_THUMBNAIL;
  const trimmed = url.trim();
  if (!trimmed) return DEFAULT_COURSE_THUMBNAIL;
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return trimmed;
    }
  } catch {
    // fall through to the default thumbnail for invalid URLs
  }
  return DEFAULT_COURSE_THUMBNAIL;
}

function cleanSubsection(sub: Subsection): Subsection {
  const base: any = { ...sub };
  if (typeof base.index !== "number") {
    delete base.index;
  }
  if ("pgn" in base) {
    const pgn = typeof base.pgn === "string" ? base.pgn.trim() : "";
    if (!pgn) {
      delete base.pgn;
    } else {
      base.pgn = pgn;
    }
  }
  if ("fen" in base) {
    const fen = typeof base.fen === "string" ? base.fen.trim() : "";
    if (!fen) {
      delete base.fen;
    } else {
      base.fen = fen;
    }
  }
  if ("trainerNote" in base) {
    const note = typeof base.trainerNote === "string" ? base.trainerNote.trim() : "";
    if (!note) {
      delete base.trainerNote;
    } else {
      base.trainerNote = note;
    }
  }
  Object.keys(base).forEach((key) => {
    if (base[key] === undefined) {
      delete base[key];
    }
  });
  return base as Subsection;
}

function normalizeChapterEntry(chapter: Chapter): Chapter {
  const subsections: Record<string, Subsection> = {};
  Object.entries(chapter.subsections || {}).forEach(([subId, sub]) => {
    if (!sub) return;
    subsections[subId] = cleanSubsection(sub);
  });
  return stripUndefinedDeep({
    ...chapter,
    subsections: reindexSubsections(subsections),
  });
}

function normalizeCourseEntry(course: Course): Course {
  const chapters: Record<string, Chapter> = {};
  Object.entries(course.chapters || {}).forEach(([chapterId, chapter]) => {
    if (!chapter) return;
    chapters[chapterId] = normalizeChapterEntry(chapter);
  });
  return stripUndefinedDeep({
    ...course,
    thumbnailUrl: sanitizeThumbnail(course.thumbnailUrl),
    chapters,
  });
}

function reindexSubsections(subsections: Record<string, Subsection>, orderedIds?: string[]): Record<string, Subsection> {
  const seen = new Set<string>();
  const ordered: string[] = [];
  const compareByIndex = (a: string, b: string) => {
    const ai = typeof subsections[a]?.index === "number" ? (subsections[a] as Subsection).index! : Number.MAX_SAFE_INTEGER;
    const bi = typeof subsections[b]?.index === "number" ? (subsections[b] as Subsection).index! : Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;
    return a.localeCompare(b);
  };
  const append = (ids: string[]) => {
    ids.forEach((id) => {
      if (subsections[id] && !seen.has(id)) {
        ordered.push(id);
        seen.add(id);
      }
    });
  };

  if (orderedIds?.length) {
    append(orderedIds);
  }
  append(Object.keys(subsections).sort(compareByIndex));

  return ordered.reduce<Record<string, Subsection>>((acc, id, idx) => {
    acc[id] = { ...subsections[id], index: idx };
    return acc;
  }, {});
}

function normalizeCourseRecord(record: CourseRecord): CourseRecord {
  const next: CourseRecord = {};
  Object.entries(record || {}).forEach(([id, course]) => {
    if (!course) return;
    next[id] = normalizeCourseEntry(course);
  });
  return next;
}

function countCourseContent(course: Course | null | undefined) {
  if (!course?.chapters) return 0;
  return Object.values(course.chapters).reduce((total, chapter) => {
    return total + Object.keys(chapter.subsections || {}).length;
  }, 0);
}

function chooseLatestCourseContent(left: Course | undefined, right: Course | undefined): Course | undefined {
  if (!left) return right;
  if (!right) return left;
  const leftUpdated = typeof left.contentUpdatedAt === "number" ? left.contentUpdatedAt : 0;
  const rightUpdated = typeof right.contentUpdatedAt === "number" ? right.contentUpdatedAt : 0;
  if (leftUpdated !== rightUpdated) return leftUpdated > rightUpdated ? left : right;
  return countCourseContent(left) >= countCourseContent(right) ? left : right;
}

function mergeCourseRecords(...records: CourseRecord[]): CourseRecord {
  const merged: CourseRecord = {};
  records.forEach((record) => {
    Object.entries(record || {}).forEach(([courseId, course]) => {
      const chosen = chooseLatestCourseContent(merged[courseId], course);
      if (chosen) merged[courseId] = chosen;
    });
  });
  return normalizeCourseRecord(merged);
}

function stripUndefinedDeep<T>(input: T): T {
  if (Array.isArray(input)) {
    return input.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (input && typeof input === "object") {
    const entries = Object.entries(input as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [k, v]) => {
      if (v === undefined) return acc;
      acc[k] = stripUndefinedDeep(v);
      return acc;
    }, {});
    return entries as unknown as T;
  }
  return input;
}

function stripUndefinedShallow<T extends Record<string, unknown>>(input: T): T {
  const next: Record<string, unknown> = {};
  Object.entries(input || {}).forEach(([key, value]) => {
    if (value !== undefined) {
      next[key] = value;
    }
  });
  return next as T;
}

function normalizeExternalRatingValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
}

function normalizeRatingHistory(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const history = value
    .map((entry) => {
      const date = typeof entry?.date === "string" ? entry.date.slice(0, 10) : "";
      const rating = normalizeExternalRatingValue(entry?.rating);
      if (!date || rating === null) return null;
      return { date, rating };
    })
    .filter((entry): entry is { date: string; rating: number } => !!entry)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-12);
  return history.length ? history : undefined;
}

function normalizeExternalRatingRecord(record: ExternalRatingRecord | null | undefined, source: keyof ExternalRatings) {
  if (!record || typeof record !== "object") return null;
  if (source === "fide") {
    const rating = normalizeExternalRatingValue(record.rating);
    if (rating === null) return null;
    return stripUndefinedShallow({
      rating,
      manuallyEditedAt: typeof record.manuallyEditedAt === "number" ? record.manuallyEditedAt : Date.now(),
    });
  }

  const username = String(record.username || "").trim();
  if (!username) return null;
  return stripUndefinedShallow({
    username,
    displayName: String(record.displayName || username).trim(),
    bullet: normalizeExternalRatingValue(record.bullet),
    blitz: normalizeExternalRatingValue(record.blitz),
    rapid: normalizeExternalRatingValue(record.rapid),
    classical: normalizeExternalRatingValue(record.classical),
    rapidHistory: normalizeRatingHistory(record.rapidHistory),
    syncedAt: typeof record.syncedAt === "number" ? record.syncedAt : Date.now(),
  });
}

function normalizeExternalRatings(ratings?: ExternalRatings | null): ExternalRatings {
  if (!ratings || typeof ratings !== "object") return {};
  return stripUndefinedShallow({
    fide: normalizeExternalRatingRecord(ratings.fide, "fide") || undefined,
    chesscom: normalizeExternalRatingRecord(ratings.chesscom, "chesscom") || undefined,
    lichess: normalizeExternalRatingRecord(ratings.lichess, "lichess") || undefined,
  });
}

function deriveExternalOnlineRating(ratings: ExternalRatings | undefined, fallback = 1000) {
  const chesscom = ratings?.chesscom;
  const lichess = ratings?.lichess;
  const fide = ratings?.fide;
  return (
    normalizeExternalRatingValue(chesscom?.rapid) ??
    normalizeExternalRatingValue(chesscom?.blitz) ??
    normalizeExternalRatingValue(lichess?.rapid) ??
    normalizeExternalRatingValue(lichess?.blitz) ??
    normalizeExternalRatingValue(fide?.rating) ??
    Math.max(0, Math.round(fallback || 1000))
  );
}

function buildUserSyncPayload(profile: UserProfile) {
  const hasGroup = !!profile.groupId;
  return stripUndefinedShallow({
    id: profile.id,
    email: profile.email,
    displayName: profile.displayName,
    avatarUrl: normalizeAvatarUrl(profile.avatarUrl),
    accountType: hasGroup ? "group" : profile.accountType ?? "personal",
    groupId: hasGroup ? profile.groupId : null,
    groupCode: hasGroup ? profile.groupCode ?? null : null,
    groupName: hasGroup ? profile.groupName ?? null : null,
    groupRole: hasGroup ? profile.groupRole ?? "member" : null,
    adminKeyUnlocked: profile.adminKeyUnlocked ?? false,
    createdAt: profile.createdAt ?? Date.now(),
    xpReachedAt: profile.xpReachedAt ?? profile.createdAt ?? Date.now(),
    totalXp: Math.max(0, profile.totalXp ?? 0),
    level: Math.max(1, profile.level ?? 1),
    streak: Math.max(0, profile.streak ?? 0),
    bestStreak: Math.max(0, profile.bestStreak ?? profile.streak ?? 0),
    dailyXp: Math.max(0, profile.dailyXp ?? 0),
    dailyPuzzleCount: Math.max(0, profile.dailyPuzzleCount ?? 0),
    dailyDate: profile.dailyDate ?? toLocalDateKey(new Date()),
    lastQualifiedDate: profile.lastQualifiedDate ?? null,
    lastStreakAt: profile.lastStreakAt ?? startOfDayMs(new Date()),
    streakDeadlineAt: profile.streakDeadlineAt ?? nextDayDeadlineMs(new Date()),
    pawns: Math.max(0, profile.pawns ?? 0),
    chessUsername: profile.chessUsername || profile.displayName || profile.email.split("@")[0],
    externalRatings: normalizeExternalRatings(profile.externalRatings),
    onlineRating: typeof profile.onlineRating === "number" ? profile.onlineRating : 1000,
    boardTheme: resolveBoardTheme(profile.boardTheme).key,
    pieceTheme: resolvePieceTheme(profile.pieceTheme).key,
    selectedTagline: profile.selectedTagline ?? "",
    taglinesEnabled: profile.taglinesEnabled ?? true,
    unlockedPfps: profile.unlockedPfps || [],
    unlockedTaglines: profile.unlockedTaglines || [],
    unlockedVideos: profile.unlockedVideos || [],
    unlockedSets: profile.unlockedSets || [],
    groupLocked: hasGroup ? (typeof profile.groupLocked === "boolean" ? profile.groupLocked : null) : null,
  });
}

function applyLocalAccountScope(profile: UserProfile, localProfile?: UserProfile | null): UserProfile {
  if (!localProfile || localProfile.id !== profile.id) return profile;
  const localHasGroup = !!localProfile.groupId;
  return {
    ...profile,
    accountType: localHasGroup ? "group" : localProfile.accountType ?? "personal",
    groupId: localHasGroup ? localProfile.groupId : null,
    groupCode: localHasGroup ? localProfile.groupCode ?? profile.groupCode ?? null : null,
    groupName: localHasGroup ? localProfile.groupName ?? profile.groupName ?? null : null,
    groupRole: localHasGroup ? localProfile.groupRole ?? profile.groupRole ?? "member" : null,
    groupLocked: localHasGroup
      ? (typeof localProfile.groupLocked === "boolean"
          ? localProfile.groupLocked
          : typeof profile.groupLocked === "boolean"
            ? profile.groupLocked
            : false)
      : false,
  };
}

const REMOVED_COURSE_IDS = new Set([
  "course-trompowsky",
  "course-pieces",
  "course-dragon",
  "course-skills",
  "course-endgame",
]);

const LEGACY_CREATED_COURSE_IDS = new Set([
  "course-london",
  "course-kings-indian",
  "course-how-to-use-your-pieces",
  "course-aggressive-italian",
  "course-french-defense",
  "course-dutch-defense",
]);

function applyCoursePatches(record: CourseRecord): { record: CourseRecord; changed: boolean } {
  let changed = false;
  const next: CourseRecord = {};
  Object.entries(record).forEach(([id, course]) => {
    if (REMOVED_COURSE_IDS.has(id)) {
      changed = true;
      return;
    }
    next[id] = course;
  });
  return { record: next, changed };
}

function toRecord(list: Course[]): CourseRecord {
  return list.reduce<CourseRecord>((acc, course) => {
    acc[course.id] = course;
    return acc;
  }, {});
}

function toList(record: CourseRecord): Course[] {
  return Object.values(record || {});
}

function readCoursesLocal(scope?: DataScope): CourseRecord {
  const resolved = scope || resolveScope();
  const raw = localStorage.getItem(scopedStorageKey(STORAGE_KEYS.courses, resolved));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as CourseRecord | Course[];
    if (Array.isArray(parsed)) return normalizeCourseRecord(toRecord(parsed.filter(Boolean) as Course[]));
    return normalizeCourseRecord(parsed || {});
  } catch {
    return {};
  }
}

function writeCoursesLocal(record: CourseRecord, scope?: DataScope) {
  const resolved = scope || resolveScope();
  try {
    const normalized = normalizeCourseRecord(record);
    const safe = stripUndefinedDeep(normalized);
    localStorage.setItem(scopedStorageKey(STORAGE_KEYS.courses, resolved), JSON.stringify(safe));
  } catch {
    // ignore local write errors
  }
}

function mutateLocalCourse(
  courseId: string,
  user: UserProfile | null | undefined,
  transform: (course: Course | undefined) => Course | undefined,
) {
  const scope = resolveScope(user);
  const record = readCoursesLocal(scope);
  const next = transform(record[courseId]);
  if (next) {
    record[courseId] = normalizeCourseEntry(next);
  } else {
    delete record[courseId];
  }
  writeCoursesLocal(record, scope);
}

function readSharedCoursesLocal(): CourseRecord {
  const raw = localStorage.getItem(scopedStorageKey(STORAGE_KEYS.courses, { scope: "public", cacheKey: "shared-courses" }));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as CourseRecord | Course[];
    if (Array.isArray(parsed)) return normalizeCourseRecord(toRecord(parsed.filter(Boolean) as Course[]));
    return normalizeCourseRecord(parsed || {});
  } catch {
    return {};
  }
}

function writeSharedCoursesLocal(record: CourseRecord) {
  try {
    const normalized = normalizeCourseRecord(record);
    const safe = stripUndefinedDeep(normalized);
    localStorage.setItem(scopedStorageKey(STORAGE_KEYS.courses, { scope: "public", cacheKey: "shared-courses" }), JSON.stringify(safe));
  } catch {
    // ignore shared local write errors
  }
}

function mutateSharedLocalCourse(
  courseId: string,
  transform: (course: Course | undefined) => Course | undefined,
) {
  const record = readSharedCoursesLocal();
  const next = transform(record[courseId]);
  if (next) {
    record[courseId] = normalizeCourseEntry({ ...next, isShared: true, managedByGroupId: null });
  } else {
    delete record[courseId];
  }
  writeSharedCoursesLocal(record);
}

async function writeCourseEntry(course: Course, user?: UserProfile | null): Promise<Course> {
  const normalized = normalizeCourseEntry(course);
  const { path } = scopedPath(`${COURSES_PATH}/${normalized.id}`, user);
  try {
    await set(ref(db, path), normalized);
    mutateLocalCourse(normalized.id, user, () => normalized);
    return normalized;
  } catch (err) {
    mutateLocalCourse(normalized.id, user, () => normalized);
    console.error("Failed to write course to Firebase; saved locally instead.", err);
    throw new Error("Cloud save failed. Check network/Firebase rules.");
  }
}

async function writeSharedCourseEntry(course: Course): Promise<Course> {
  const normalized = normalizeCourseEntry({
    ...course,
    isShared: true,
    managedByGroupId: null,
  });
  const path = `${COURSES_PATH}/${normalized.id}`;
  try {
    await set(ref(db, path), normalized);
    mutateSharedLocalCourse(normalized.id, () => normalized);
    return normalized;
  } catch (err) {
    mutateSharedLocalCourse(normalized.id, () => normalized);
    console.error("Failed to write shared course to Firebase; saved locally instead.", err);
    throw new Error("Cloud save failed. Check network/Firebase rules.");
  }
}

async function deleteCourseEntry(courseId: string, user?: UserProfile | null): Promise<void> {
  const { path } = scopedPath(`${COURSES_PATH}/${courseId}`, user);
  try {
    await remove(ref(db, path));
    mutateLocalCourse(courseId, user, () => undefined);
  } catch (err) {
    mutateLocalCourse(courseId, user, () => undefined);
    console.error("Failed to delete course from Firebase; removed local copy instead.", err);
    throw new Error("Cloud save failed. Check network/Firebase rules.");
  }
}

async function writeChapterEntry(
  courseId: string,
  chapter: Chapter,
  user?: UserProfile | null,
): Promise<Chapter> {
  const normalizedChapter = normalizeChapterEntry(chapter);
  const { path } = scopedPath(`${COURSES_PATH}/${courseId}/chapters/${normalizedChapter.id}`, user);
  try {
    await set(ref(db, path), normalizedChapter);
    mutateLocalCourse(courseId, user, (course) =>
      course
        ? {
            ...course,
            contentUpdatedAt: Date.now(),
            chapters: {
              ...(course.chapters || {}),
              [normalizedChapter.id]: normalizedChapter,
            },
          }
        : course,
    );
    return normalizedChapter;
  } catch (err) {
    mutateLocalCourse(courseId, user, (course) =>
      course
        ? {
            ...course,
            contentUpdatedAt: Date.now(),
            chapters: {
              ...(course.chapters || {}),
              [normalizedChapter.id]: normalizedChapter,
            },
          }
        : course,
    );
    console.error("Failed to write chapter to Firebase; saved locally instead.", err);
    throw new Error("Cloud save failed. Check network/Firebase rules.");
  }
}

async function updateChapterEntry(
  courseId: string,
  chapterId: string,
  payload: Partial<Pick<Chapter, "title" | "index">>,
  nextChapter: Chapter,
  user?: UserProfile | null,
): Promise<Chapter> {
  const normalizedChapter = normalizeChapterEntry(nextChapter);
  const { path } = scopedPath(`${COURSES_PATH}/${courseId}/chapters/${chapterId}`, user);
  const safePayload = stripUndefinedShallow(payload);
  try {
    await update(ref(db, path), safePayload);
    mutateLocalCourse(courseId, user, (course) =>
      course
        ? {
            ...course,
            contentUpdatedAt: Date.now(),
            chapters: {
              ...(course.chapters || {}),
              [chapterId]: normalizedChapter,
            },
          }
        : course,
    );
    return normalizedChapter;
  } catch (err) {
    mutateLocalCourse(courseId, user, (course) =>
      course
        ? {
            ...course,
            chapters: {
              ...(course.chapters || {}),
              [chapterId]: normalizedChapter,
            },
          }
        : course,
    );
    console.error("Failed to update chapter in Firebase; saved locally instead.", err);
    throw new Error("Cloud save failed. Check network/Firebase rules.");
  }
}

async function deleteChapterEntry(courseId: string, chapterId: string, user?: UserProfile | null): Promise<void> {
  const { path } = scopedPath(`${COURSES_PATH}/${courseId}/chapters/${chapterId}`, user);
  try {
    await remove(ref(db, path));
    mutateLocalCourse(courseId, user, (course) => {
      if (!course?.chapters?.[chapterId]) return course;
      const chapters = { ...course.chapters };
      delete chapters[chapterId];
      return { ...course, chapters, contentUpdatedAt: Date.now() };
    });
  } catch (err) {
    mutateLocalCourse(courseId, user, (course) => {
      if (!course?.chapters?.[chapterId]) return course;
      const chapters = { ...course.chapters };
      delete chapters[chapterId];
      return { ...course, chapters, contentUpdatedAt: Date.now() };
    });
    console.error("Failed to delete chapter from Firebase; removed local copy instead.", err);
    throw new Error("Cloud save failed. Check network/Firebase rules.");
  }
}

async function applySubsectionUpdates(
  courseId: string,
  chapterId: string,
  _updatesPayload: Record<string, unknown>,
  nextChapter: Chapter,
  user?: UserProfile | null,
): Promise<Chapter> {
  const normalizedChapter = normalizeChapterEntry(nextChapter);
  const { path } = scopedPath(`${COURSES_PATH}/${courseId}/chapters/${chapterId}`, user);
  try {
    await set(ref(db, path), normalizedChapter);
    mutateLocalCourse(courseId, user, (course) =>
      course
        ? {
            ...course,
            contentUpdatedAt: Date.now(),
            chapters: {
              ...(course.chapters || {}),
              [chapterId]: normalizedChapter,
            },
          }
        : course,
    );
    return normalizedChapter;
  } catch (err) {
    mutateLocalCourse(courseId, user, (course) =>
      course
        ? {
            ...course,
            contentUpdatedAt: Date.now(),
            chapters: {
              ...(course.chapters || {}),
              [chapterId]: normalizedChapter,
            },
          }
        : course,
    );
    console.error("Failed to update subsection data in Firebase; saved locally instead.", err);
    throw new Error("Cloud save failed. Check network/Firebase rules.");
  }
}

async function writeSharedChapterEntry(courseId: string, chapter: Chapter): Promise<Chapter> {
  const normalizedChapter = normalizeChapterEntry(chapter);
  const path = `${COURSES_PATH}/${courseId}/chapters/${normalizedChapter.id}`;
  try {
    await set(ref(db, path), normalizedChapter);
    mutateSharedLocalCourse(courseId, (course) =>
      course
        ? {
            ...course,
            contentUpdatedAt: Date.now(),
            chapters: {
              ...(course.chapters || {}),
              [normalizedChapter.id]: normalizedChapter,
            },
          }
        : course,
    );
    return normalizedChapter;
  } catch (err) {
    mutateSharedLocalCourse(courseId, (course) =>
      course
        ? {
            ...course,
            contentUpdatedAt: Date.now(),
            chapters: {
              ...(course.chapters || {}),
              [normalizedChapter.id]: normalizedChapter,
            },
          }
        : course,
    );
    console.error("Failed to write shared chapter to Firebase; saved locally instead.", err);
    throw new Error("Cloud save failed. Check network/Firebase rules.");
  }
}

async function updateSharedChapterEntry(
  courseId: string,
  chapterId: string,
  payload: Partial<Pick<Chapter, "title" | "index">>,
  nextChapter: Chapter,
): Promise<Chapter> {
  const normalizedChapter = normalizeChapterEntry(nextChapter);
  const path = `${COURSES_PATH}/${courseId}/chapters/${chapterId}`;
  const safePayload = stripUndefinedShallow(payload);
  try {
    await update(ref(db, path), safePayload);
    mutateSharedLocalCourse(courseId, (course) =>
      course
        ? {
            ...course,
            contentUpdatedAt: Date.now(),
            chapters: {
              ...(course.chapters || {}),
              [chapterId]: normalizedChapter,
            },
          }
        : course,
    );
    return normalizedChapter;
  } catch (err) {
    mutateSharedLocalCourse(courseId, (course) =>
      course
        ? {
            ...course,
            contentUpdatedAt: Date.now(),
            chapters: {
              ...(course.chapters || {}),
              [chapterId]: normalizedChapter,
            },
          }
        : course,
    );
    console.error("Failed to update shared chapter in Firebase; saved locally instead.", err);
    throw new Error("Cloud save failed. Check network/Firebase rules.");
  }
}

async function deleteSharedChapterEntry(courseId: string, chapterId: string): Promise<void> {
  const path = `${COURSES_PATH}/${courseId}/chapters/${chapterId}`;
  try {
    await remove(ref(db, path));
    mutateSharedLocalCourse(courseId, (course) => {
      if (!course?.chapters?.[chapterId]) return course;
      const chapters = { ...course.chapters };
      delete chapters[chapterId];
      return { ...course, chapters, contentUpdatedAt: Date.now() };
    });
  } catch (err) {
    mutateSharedLocalCourse(courseId, (course) => {
      if (!course?.chapters?.[chapterId]) return course;
      const chapters = { ...course.chapters };
      delete chapters[chapterId];
      return { ...course, chapters, contentUpdatedAt: Date.now() };
    });
    console.error("Failed to delete shared chapter from Firebase; removed local copy instead.", err);
    throw new Error("Cloud save failed. Check network/Firebase rules.");
  }
}

async function applySharedSubsectionUpdates(
  courseId: string,
  chapterId: string,
  _updatesPayload: Record<string, unknown>,
  nextChapter: Chapter,
): Promise<Chapter> {
  const normalizedChapter = normalizeChapterEntry(nextChapter);
  const path = `${COURSES_PATH}/${courseId}/chapters/${chapterId}`;
  try {
    await set(ref(db, path), normalizedChapter);
    mutateSharedLocalCourse(courseId, (course) =>
      course
        ? {
            ...course,
            contentUpdatedAt: Date.now(),
            chapters: {
              ...(course.chapters || {}),
              [chapterId]: normalizedChapter,
            },
          }
        : course,
    );
    return normalizedChapter;
  } catch (err) {
    mutateSharedLocalCourse(courseId, (course) =>
      course
        ? {
            ...course,
            contentUpdatedAt: Date.now(),
            chapters: {
              ...(course.chapters || {}),
              [chapterId]: normalizedChapter,
            },
          }
        : course,
    );
    console.error("Failed to update shared subsection data in Firebase; saved locally instead.", err);
    throw new Error("Cloud save failed. Check network/Firebase rules.");
  }
}

async function fetchCourseRecord(user?: UserProfile | null): Promise<CourseRecord> {
  const scope = resolveScope(user);
  const { path } = scopedPath(COURSES_PATH, user);
  try {
    const snap = await get(ref(db, path));
    if (snap.exists()) {
      const val = snap.val() as CourseRecord | Course[];
      const record = Array.isArray(val) ? toRecord(val.filter(Boolean) as Course[]) : (val || {});
      const normalized = stripUndefinedDeep(normalizeCourseRecord(record));
      const { record: patched, changed } = applyCoursePatches(normalized);
      if (changed) {
        try {
          await writeCourseRecord(patched, user);
        } catch (err) {
          console.warn("Failed to persist patched course record; using local copy.", err);
          writeCoursesLocal(patched, scope);
        }
      }
      const local = stripUndefinedDeep(normalizeCourseRecord(readCoursesLocal(scope)));
      const merged = stripUndefinedDeep(mergeCourseRecords(patched, local));
      writeCoursesLocal(merged, scope);
      return merged;
    }
    const local = stripUndefinedDeep(normalizeCourseRecord(readCoursesLocal(scope)));
    return local;
  } catch (err) {
    const local = stripUndefinedDeep(normalizeCourseRecord(readCoursesLocal(scope)));
    if (Object.keys(local).length) {
      const { record: patched, changed } = applyCoursePatches(local);
      if (changed) {
        writeCoursesLocal(patched, scope);
      }
      return patched;
    }
    console.warn("Failed to fetch courses; returning local/empty.", err);
    return {};
  }
}

async function fetchSharedCourseRecord(): Promise<CourseRecord> {
  try {
    const snap = await get(ref(db, COURSES_PATH));
    if (snap.exists()) {
      const val = snap.val() as CourseRecord | Course[];
      const record = Array.isArray(val) ? toRecord(val.filter(Boolean) as Course[]) : (val || {});
      const filtered = Object.fromEntries(
        Object.entries(record)
          .filter(([id]) => PLATFORM_COURSE_IDS.has(id))
          .map(([id, course]) => [id, { ...course, isShared: true, managedByGroupId: null }]),
      ) as CourseRecord;
      const normalized = stripUndefinedDeep(normalizeCourseRecord(filtered));
      const local = stripUndefinedDeep(normalizeCourseRecord(readSharedCoursesLocal()));
      const mergedBase = mergeCourseRecords(normalized, local);
      writeSharedCoursesLocal(mergedBase);
      return mergedBase;
    }
    return stripUndefinedDeep(normalizeCourseRecord(readSharedCoursesLocal()));
  } catch (err) {
    const local = stripUndefinedDeep(normalizeCourseRecord(readSharedCoursesLocal()));
    if (Object.keys(local).length) {
      return Object.fromEntries(
        Object.entries(local).filter(([id]) => PLATFORM_COURSE_IDS.has(id)),
      ) as CourseRecord;
    }
    if (!isPermissionDeniedError(err)) {
      console.warn("Failed to fetch shared courses; returning local/empty.", err);
    }
    return {};
  }
}

async function writeCourseRecord(record: CourseRecord, user?: UserProfile | null): Promise<void> {
  const scope = resolveScope(user);
  const { path } = scopedPath(COURSES_PATH, user);
  const normalized = normalizeCourseRecord(record);
  // Firebase disallows undefined in payloads; strip them deeply
  const safePayload = stripUndefinedDeep(normalized);
  try {
    await set(ref(db, path), safePayload);
    writeCoursesLocal(safePayload, scope);
  } catch (err) {
    writeCoursesLocal(safePayload, scope);
    console.error("Failed to write courses to Firebase; saved locally instead.", err);
    throw new Error("Cloud save failed. Check network/Firebase rules.");
  }
}

async function fetchCombinedCourseRecord(user?: UserProfile | null): Promise<CourseRecord> {
  const [sharedRecord, scopedRecord] = await Promise.all([
    fetchSharedCourseRecord(),
    fetchCourseRecord(user),
  ]);
  return {
    ...sharedRecord,
    ...scopedRecord,
  };
}

async function resolveCourseStorage(courseId: string, user?: UserProfile | null): Promise<{
  course: Course | null;
  isShared: boolean;
}> {
  const sharedRecord = await fetchSharedCourseRecord();
  if (sharedRecord[courseId]) {
    return { course: sharedRecord[courseId], isShared: true };
  }
  const scopedRecord = await fetchCourseRecord(user);
  return { course: scopedRecord[courseId] || null, isShared: false };
}

export function listenCourses(callback: (courses: Course[]) => void, user?: UserProfile | null): () => void {
  const scope = resolveScope(user);
  const { path } = scopedPath(COURSES_PATH, user);
  const scopedRef = ref(db, path);
  const sharedRef = ref(db, COURSES_PATH);
  let latestScoped = stripUndefinedDeep(normalizeCourseRecord(readCoursesLocal(scope)));
  let latestShared = stripUndefinedDeep(normalizeCourseRecord(readSharedCoursesLocal()));

  const emit = () => {
    callback(toList({ ...latestShared, ...latestScoped }));
  };

  const offScoped = onValue(
    scopedRef,
    (snap) => {
      const val = snap.val();
      latestScoped = val
        ? stripUndefinedDeep(
            normalizeCourseRecord(Array.isArray(val) ? toRecord(val.filter(Boolean) as Course[]) : (val as CourseRecord)),
          )
        : {};
      emit();
    },
    () => {
      latestScoped = stripUndefinedDeep(normalizeCourseRecord(readCoursesLocal(scope)));
      emit();
    },
  );

  const offShared = onValue(
    sharedRef,
    (snap) => {
      const val = snap.val();
      latestShared = val
        ? stripUndefinedDeep(
            normalizeCourseRecord(
              Object.fromEntries(
                Object.entries(Array.isArray(val) ? toRecord(val.filter(Boolean) as Course[]) : (val as CourseRecord))
                  .filter(([id]) => PLATFORM_COURSE_IDS.has(id))
                  .map(([id, course]) => [id, { ...course, isShared: true, managedByGroupId: null }]),
              ),
            ),
          )
        : {};
      emit();
    },
    () => {
      latestShared = stripUndefinedDeep(normalizeCourseRecord(readSharedCoursesLocal()));
      emit();
    },
  );

  emit();
  return () => {
    offScoped();
    offShared();
  };
}

export function listenCourse(
  courseId: string,
  callback: (course: Course | null) => void,
  user?: UserProfile | null,
): () => void {
  const scope = resolveScope(user);
  const isSharedCourse = PLATFORM_COURSE_IDS.has(courseId);
  const path = isSharedCourse ? `${COURSES_PATH}/${courseId}` : scopedPath(`${COURSES_PATH}/${courseId}`, user).path;
  const courseRef = ref(db, path);

  const emitMergedCourse = (firebaseCourse: Course | null) => {
    const local = isSharedCourse ? readSharedCoursesLocal() : readCoursesLocal(scope);
    const localCourse = local[courseId] ? normalizeCourseEntry(local[courseId]) : null;
    const immediate = chooseLatestCourseContent(firebaseCourse || undefined, localCourse || undefined) || null;
    callback(immediate);
  };

  const off = onValue(
    courseRef,
    (snap) => {
      const val = snap.val() as Course | null;
      const normalized =
        val && val.id
          ? stripUndefinedDeep(
              normalizeCourseRecord({
                [val.id]: isSharedCourse
                  ? { ...(val as Course), isShared: true, managedByGroupId: null }
                  : (val as Course),
              })[val.id],
            )
          : val
            ? { ...val, thumbnailUrl: DEFAULT_COURSE_THUMBNAIL }
            : null;
      emitMergedCourse(normalized || null);
    },
    () => {
      const local = isSharedCourse ? readSharedCoursesLocal() : readCoursesLocal(scope);
      emitMergedCourse(local[courseId] ? normalizeCourseEntry(local[courseId]) : null);
    },
  );
  return () => {
    off();
  };
}

function readProgress(): Record<string, CourseProgress> {
  const raw = localStorage.getItem(STORAGE_KEYS.progress);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeProgress(progress: Record<string, CourseProgress>) {
  localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(progress));
}

type ProgressRecord = {
  completedSubsections: Record<string, boolean>;
  percent: number;
  xpEarned?: number;
  lastUpdated?: number;
};

export function subsectionHasInlinePgn(subsection: Subsection | null | undefined): boolean {
  return !!subsection && typeof (subsection as { pgn?: string }).pgn === "string" && !!(subsection as { pgn?: string }).pgn?.trim();
}

function buildAttachedStudyIdSet(subsections: Subsection[]): Set<string> {
  return new Set(
    subsections
      .map((subsection) => ("parentStudyId" in subsection ? subsection.parentStudyId : undefined))
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0),
  );
}

export function isTrackableCourseSubsection(
  subsection: Subsection,
  attachedStudyIds?: ReadonlySet<string>,
): boolean {
  if (subsection.type === "video") return false;
  if (subsection.type !== "study") return true;
  return subsectionHasInlinePgn(subsection) || !attachedStudyIds?.has(subsection.id);
}

function listTrackableSubsections(course: Course | null): Subsection[] {
  if (!course?.chapters) return [];

  const subsections = Object.values(course.chapters).flatMap((chapter) => Object.values(chapter.subsections || {}));
  const attachedStudyIds = buildAttachedStudyIdSet(subsections);
  return subsections.filter((subsection) => isTrackableCourseSubsection(subsection, attachedStudyIds));
}

function normalizeStreakRow(base: Partial<StreakRow> | null | undefined, userId: string, today = toLocalDateKey()): StreakRow {
  const now = Date.now();
  return {
    user_id: userId,
    current_streak: Math.max(0, Number(base?.current_streak) || 0),
    best_streak: Math.max(0, Number(base?.best_streak) || 0),
    daily_xp: Math.max(0, Number(base?.daily_xp) || 0),
    daily_puzzles: Math.max(0, Number(base?.daily_puzzles) || 0),
    daily_date: base?.daily_date || today,
    last_qualified_date:
      typeof base?.last_qualified_date === "string" && base.last_qualified_date.trim().length
        ? base.last_qualified_date
        : null,
    deadline_at:
      Number.isFinite(Number(base?.deadline_at)) && Number(base?.deadline_at) > 0
        ? Number(base?.deadline_at)
        : nextDayDeadlineMs(new Date(now)),
  };
}

function rollStreakDayIfNeeded(row: StreakRow, today = toLocalDateKey()): { row: StreakRow; changed: boolean } {
  const next = normalizeStreakRow(row, row.user_id, today);
  let changed = false;

  if (next.daily_date !== today) {
    const previousDate = next.daily_date;
    const previousWasYesterday = isYesterday(today, previousDate);
    if (!previousWasYesterday || next.daily_puzzles < REQUIRED_DAILY_PUZZLES) {
      next.current_streak = 0;
    }
    next.daily_xp = 0;
    next.daily_puzzles = 0;
    next.daily_date = today;
    next.deadline_at = nextDayDeadlineMs();
    changed = true;
  } else if (!Number.isFinite(next.deadline_at) || next.deadline_at <= 0) {
    next.deadline_at = nextDayDeadlineMs();
    changed = true;
  }

  return { row: next, changed };
}

type XpEvent = {
  id?: string;
  ts: number;
  amount: number;
  courseId?: string;
  subsectionId?: string;
  source?: string;
  type?: Subsection["type"];
};

type StreakRow = {
  user_id: string;
  current_streak: number;
  best_streak: number;
  daily_xp: number;
  daily_puzzles: number;
  daily_date: string;
  last_qualified_date: string | null;
  deadline_at: number;
};

const XP_HISTORY_RETENTION_DAYS = 7;
const REQUIRED_DAILY_PUZZLES = 1;

function startOfDayMs(date: Date): number {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

function nextDayDeadlineMs(date = new Date()): number {
  const copy = new Date(date);
  copy.setHours(24, 0, 0, 0);
  return copy.getTime();
}

function toLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isYesterday(today: string, previous: string): boolean {
  const [yearStr, monthStr, dayStr] = today.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day) return false;
  const yesterday = new Date(year, month - 1, day);
  yesterday.setDate(yesterday.getDate() - 1);
  return toLocalDateKey(yesterday) === previous;
}

function pruneOldXpEvents(events: XpEvent[], maxAgeDays = XP_HISTORY_RETENTION_DAYS): XpEvent[] {
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  return (events || []).filter((evt) => (evt?.ts || 0) >= cutoff && typeof evt.amount === "number");
}

function readXpEventsLocal(userId: string): XpEvent[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.xpHistory}:${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return pruneOldXpEvents(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
}

function writeXpEventsLocal(userId: string, events: XpEvent[]) {
  try {
    localStorage.setItem(`${STORAGE_KEYS.xpHistory}:${userId}`, JSON.stringify(pruneOldXpEvents(events)));
  } catch {
    // ignore quota/localStorage errors
  }
}

async function recordXpEvent(userId: string, event: Omit<XpEvent, "id">) {
  const ts = event.ts || Date.now();
  const id = nanoid();
  const payload: XpEvent = {
    id,
    ts,
    amount: Math.max(0, event.amount),
  };
  if (event.courseId) payload.courseId = event.courseId;
  if (event.subsectionId) payload.subsectionId = event.subsectionId;
  if (event.type) payload.type = event.type;
  if (event.source) payload.source = event.source;
  try {
    await set(ref(db, `${XP_HISTORY_PATH}/${userId}/${id}`), payload);
  } catch (err) {
    console.warn("Failed to write XP event to Firebase; keeping local only", err);
  }
  const existing = readXpEventsLocal(userId);
  const merged = pruneOldXpEvents([...existing, { ...payload, id }]);
  writeXpEventsLocal(userId, merged);
}

async function persistTotalXp(userId: string, newTotal: number, extra?: Partial<UserProfile>) {
  const timestamp = Date.now();
  const level = Math.floor(newTotal / 100) + 1;
  const payload = { totalXp: newTotal, level, xpReachedAt: timestamp, ...(extra || {}) };
  const userNodeRef = ref(db, `users/${userId}`);
  try {
    await update(userNodeRef, payload);
  } catch (err) {
    console.warn("Failed to update XP in Firebase", err);
  }
  const user = readUser();
  if (user && user.id === userId) {
    const next: UserProfile = { ...user, ...payload };
    writeUser(next);
  }
  return payload;
}

export async function awardXp(
  userId: string,
  amount: number,
  options?: {
    source?: string;
    courseId?: string;
    subsectionId?: string;
    type?: Subsection["type"];
    puzzleType?: DailyPuzzleType;
  },
): Promise<{ streak: StreakRow; totalXp: number } | null> {
  const xpGain = Math.max(0, amount);
  if (!xpGain) return null;
  const authUid = auth.currentUser?.uid;
  if (!authUid) {
    console.warn("awardXp called without auth user; Firebase writes may fail.", { userId });
  } else if (authUid !== userId) {
    console.warn("awardXp userId mismatch; Firebase writes may fail.", { userId, authUid });
  }
  const today = toLocalDateKey();
  const userNodeRef = ref(db, `users/${userId}`);
  const streakNodeRef = ref(db, `${STREAKS_PATH}/${userId}`);
  const isPuzzleSolve = (options?.source || "").toLowerCase() === "puzzle";

  try {
    await recordXpEvent(userId, {
      amount: xpGain,
      courseId: options?.courseId,
      subsectionId: options?.subsectionId,
      type: options?.type,
      source: options?.source || "general",
    });
  } catch (err) {
    console.warn("Failed to log XP event", err);
  }

  let existingUser: UserProfile | null = null;
  let streakRow: StreakRow | null = null;

  try {
    const [userSnap, streakSnap] = await Promise.all([get(userNodeRef), get(streakNodeRef)]);
    existingUser = (userSnap.val() as UserProfile) || null;
    if (streakSnap.exists()) {
      streakRow = streakSnap.val() as StreakRow;
    }
  } catch (err) {
    console.warn("Failed to load streak data from Firebase, using local fallback", err);
  }

  const localUser = readUser();
  const baseUser = existingUser || (localUser && localUser.id === userId ? localUser : null);
  const fallbackRow = normalizeStreakRow(
    {
      user_id: userId,
      current_streak: baseUser?.streak ?? 0,
      best_streak: baseUser?.bestStreak ?? baseUser?.streak ?? 0,
      daily_xp: baseUser?.dailyXp ?? 0,
      daily_puzzles: baseUser?.dailyPuzzleCount ?? 0,
      daily_date: baseUser?.dailyDate ?? today,
      last_qualified_date: baseUser?.lastQualifiedDate ?? null,
      deadline_at: baseUser?.streakDeadlineAt ?? nextDayDeadlineMs(),
    },
    userId,
    today,
  );

  const normalizedStreak = normalizeStreakRow(streakRow || fallbackRow, userId, today);
  const { row: resolvedRow } = rollStreakDayIfNeeded(
    {
      ...fallbackRow,
      ...normalizedStreak,
    },
    today,
  );

  let nextDailyPuzzleTypes =
    resolvedRow.daily_date === (baseUser?.dailyDate ?? today)
      ? normalizeDailyPuzzleTypes(baseUser?.dailyPuzzleTypes)
      : [];

  resolvedRow.daily_xp += xpGain;
  if (isPuzzleSolve) {
    resolvedRow.daily_puzzles += 1;
    if (options?.puzzleType && !nextDailyPuzzleTypes.includes(options.puzzleType)) {
      nextDailyPuzzleTypes = normalizeDailyPuzzleTypes([...nextDailyPuzzleTypes, options.puzzleType]);
    }
  }

  let qualifiedNow = false;
  const alreadyQualifiedToday = resolvedRow.last_qualified_date === today;
  if (!alreadyQualifiedToday && resolvedRow.daily_puzzles >= REQUIRED_DAILY_PUZZLES) {
    if (resolvedRow.last_qualified_date && isYesterday(today, resolvedRow.last_qualified_date)) {
      resolvedRow.current_streak += 1;
    } else {
      resolvedRow.current_streak = 1;
    }
    resolvedRow.last_qualified_date = today;
    resolvedRow.best_streak = Math.max(resolvedRow.best_streak, resolvedRow.current_streak);
    qualifiedNow = true;
  }

  const baseTotal = baseUser?.totalXp ?? 0;
  const nextTotal = baseTotal + xpGain;
  let nextLastStreakAt = baseUser?.lastStreakAt;
  if (resolvedRow.last_qualified_date === today && !nextLastStreakAt) {
    nextLastStreakAt = Date.now();
  }
  if (qualifiedNow) {
    nextLastStreakAt = Date.now();
  }

  await persistTotalXp(userId, nextTotal, {
    streak: resolvedRow.current_streak,
    bestStreak: resolvedRow.best_streak,
    dailyXp: resolvedRow.daily_xp,
    dailyPuzzleCount: resolvedRow.daily_puzzles,
    dailyPuzzleTypes: nextDailyPuzzleTypes,
    dailyDate: resolvedRow.daily_date,
    lastQualifiedDate: resolvedRow.last_qualified_date,
    lastStreakAt: nextLastStreakAt,
    streakDeadlineAt: resolvedRow.deadline_at,
  });

  try {
    await set(streakNodeRef, resolvedRow);
  } catch (err) {
    console.warn("Failed to persist streak row", err);
  }
  return { streak: resolvedRow, totalXp: nextTotal };
}

export async function syncStreakStatus(userId: string): Promise<UserProfile | null> {
  const today = toLocalDateKey();
  const userNodeRef = ref(db, `users/${userId}`);
  const streakNodeRef = ref(db, `${STREAKS_PATH}/${userId}`);

  let existingUser: UserProfile | null = null;
  let streakRow: StreakRow | null = null;

  try {
    const [userSnap, streakSnap] = await Promise.all([get(userNodeRef), get(streakNodeRef)]);
    existingUser = (userSnap.val() as UserProfile) || null;
    if (streakSnap.exists()) {
      streakRow = streakSnap.val() as StreakRow;
    }
  } catch (err) {
    console.warn("Failed to sync streak status from Firebase, using local fallback", err);
  }

  const localUser = readUser();
  const baseUser = existingUser || (localUser && localUser.id === userId ? localUser : null);
  if (!baseUser) return null;

  const fallbackRow = normalizeStreakRow(
    {
      user_id: userId,
      current_streak: baseUser.streak ?? 0,
      best_streak: baseUser.bestStreak ?? baseUser.streak ?? 0,
      daily_xp: baseUser.dailyXp ?? 0,
      daily_puzzles: baseUser.dailyPuzzleCount ?? 0,
      daily_date: baseUser.dailyDate ?? today,
      last_qualified_date: baseUser.lastQualifiedDate ?? null,
      deadline_at: baseUser.streakDeadlineAt ?? nextDayDeadlineMs(),
    },
    userId,
    today,
  );

  const { row: resolvedRow, changed } = rollStreakDayIfNeeded(
    {
      ...fallbackRow,
      ...normalizeStreakRow(streakRow || fallbackRow, userId, today),
    },
    today,
  );

  const nextDailyPuzzleTypes =
    resolvedRow.daily_date === (baseUser.dailyDate ?? today)
      ? normalizeDailyPuzzleTypes(baseUser.dailyPuzzleTypes)
      : [];

  const profileUpdates: Partial<UserProfile> = {
    streak: resolvedRow.current_streak,
    bestStreak: resolvedRow.best_streak,
    dailyXp: resolvedRow.daily_xp,
    dailyPuzzleCount: resolvedRow.daily_puzzles,
    dailyPuzzleTypes: nextDailyPuzzleTypes,
    dailyDate: resolvedRow.daily_date,
    lastQualifiedDate: resolvedRow.last_qualified_date,
    streakDeadlineAt: resolvedRow.deadline_at,
  };

  const latestLocalUser = readUser();
  const currentLocalUser = latestLocalUser && latestLocalUser.id === userId ? latestLocalUser : null;
  const nextProfile = normalizeUser(applyLocalAccountScope({ ...baseUser, ...profileUpdates }, currentLocalUser));
  writeUser(nextProfile);

  if (changed) {
    try {
      await Promise.all([set(streakNodeRef, resolvedRow), update(userNodeRef, profileUpdates)]);
    } catch (err) {
      console.warn("Failed to persist streak rollover", err);
    }
  }

  return nextProfile;
}

export async function claimXpForPawns(userId: string): Promise<{ pawnsAdded: number; remainingXp: number } | null> {
  const user = readUser();
  if (!user || user.id !== userId) return null;
  const claimable = Math.floor((user.totalXp || 0) / 25);
  if (claimable <= 0) return { pawnsAdded: 0, remainingXp: user.totalXp };
  const xpSpent = claimable * 25;
  const newXp = Math.max(0, (user.totalXp || 0) - xpSpent);
  const newPawns = (user.pawns || 0) + claimable;

  await persistTotalXp(userId, newXp);
  const latest = readUser();
  const updatedLocal = latest && latest.id === userId ? { ...latest, pawns: newPawns } : { ...user, pawns: newPawns };
  writeUser(updatedLocal);
  const userNodeRef = ref(db, `users/${userId}`);
  try {
    await update(userNodeRef, { pawns: newPawns });
  } catch (err) {
    console.warn("Failed to update pawns/XP in Firebase", err);
  }

  try {
    await recordXpEvent(userId, {
      amount: 0,
      courseId: undefined,
      subsectionId: "xp_to_pawn_claim",
      source: "xp_to_pawns",
      type: undefined,
    });
  } catch (err) {
    console.warn("Failed to log XP-to-pawn claim", err);
  }

  return { pawnsAdded: claimable, remainingXp: newXp };
}

async function fetchXpEvents(userId: string): Promise<XpEvent[]> {
  const fallback = () => readXpEventsLocal(userId);
  try {
    const snap = await get(ref(db, `${XP_HISTORY_PATH}/${userId}`));
    if (snap.exists()) {
      const val = snap.val() as Record<string, XpEvent>;
      const list = Object.entries(val || {}).map(([id, evt]) => ({
        ...evt,
        id,
        ts: (evt && (evt as any).ts) || (evt && (evt as any).timestamp) || 0,
        amount: (evt && (evt as any).amount) ?? 0,
      }));
      const cleaned = pruneOldXpEvents(list);
      writeXpEventsLocal(userId, cleaned);
      return cleaned;
    }
    return fallback();
  } catch (err) {
    console.warn("Failed to fetch XP history, using local cache", err);
    return fallback();
  }
}

function buildXpHistory(
  events: XpEvent[],
  options?: { startFrom?: number },
): { label: string; day: string; total: number }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  const windowStartMs = todayMs - 6 * 24 * 60 * 60 * 1000;
  const effectiveStart = Math.min(todayMs, Math.max(windowStartMs, options?.startFrom ?? windowStartMs));

  const buckets: { key: number; label: string; total: number }[] = [];
  let cursor = effectiveStart;
  while (cursor <= todayMs) {
    const dayDate = new Date(cursor);
    const label = dayDate.toLocaleDateString("en-US", { weekday: "short" });
    buckets.push({ key: cursor, label, total: 0 });
    cursor += 24 * 60 * 60 * 1000;
  }
  if (!buckets.length) {
    const label = today.toLocaleDateString("en-US", { weekday: "short" });
    buckets.push({ key: todayMs, label, total: 0 });
  }

  const bucketMap = new Map<number, number>(buckets.map((bucket, idx) => [bucket.key, idx]));
  (events || []).forEach((evt) => {
    if (!evt?.ts) return;
    const dayKey = startOfDayMs(new Date(evt.ts));
    const idx = bucketMap.get(dayKey);
    if (idx === undefined) return;
    buckets[idx].total += Math.max(0, evt.amount);
  });

  return buckets.map((bucket) => ({
    day: bucket.label,
    label: bucket.label,
    total: Math.round(bucket.total),
  }));
}

function buildXpDistribution(events: XpEvent[]): { label: string; value: number; color: string }[] {
  const buckets: Record<string, number> = {};
  (events || []).forEach((evt) => {
    if (!evt?.amount) return;
    const type = evt.type;
    const source = (evt.source || "").toLowerCase();
    let key = "Other";
    if (type === "quiz" || source.includes("quiz")) key = "Quizzes";
    else if (type === "video" || source.includes("video")) key = "Videos";
    else if (source.includes("game") || source.includes("practice") || source.includes("match")) key = "Games";
    else if (source.includes("course") || type === "study") key = "Courses";
    buckets[key] = (buckets[key] || 0) + evt.amount;
  });
  const palette: Record<string, string> = {
    Quizzes: "#60a5fa",
    Videos: "#a855f7",
    Games: "#f59e0b",
    Courses: "#22d3ee",
    Other: "#94a3b8",
  };
  return Object.entries(buckets).map(([label, value]) => ({
    label,
    value: Math.round(value),
    color: palette[label] || "#94a3b8",
  }));
}

async function fetchProgress(userId: string): Promise<Record<string, ProgressRecord>> {
  try {
    const snap = await get(ref(db, `progress/${userId}`));
    if (snap.exists()) return snap.val() as Record<string, ProgressRecord>;
    return {};
  } catch {
    const local = readProgress();
    const filtered: Record<string, ProgressRecord> = {};
    Object.entries(local).forEach(([key, val]) => {
      const [courseId] = key.split(":").slice(-1);
      filtered[courseId] = {
        completedSubsections: (val as CourseProgress).completedLessonIds.reduce<Record<string, boolean>>(
          (acc, id) => ({ ...acc, [id]: true }),
          {},
        ),
        percent: (val as CourseProgress).progressPercent,
      };
    });
    return filtered;
  }
}

async function writeProgressForUser(userId: string, progress: Record<string, ProgressRecord>): Promise<void> {
  try {
    await set(ref(db, `progress/${userId}`), progress);
  } catch (err) {
    console.error("Failed to write progress to Firebase", err);
  }
}

function countTotalSubsections(course: Course | null): number {
  return listTrackableSubsections(course).length;
}

function courseSubsectionIds(course: Course | null): string[] {
  return listTrackableSubsections(course).map((subsection) => subsection.id);
}

function xpForSubsection(type: Subsection["type"]): number {
  if (type === "video") return 100;
  if (type === "study") return 150;
  return 200;
}

export async function ensureProfile(
  email: string,
  displayName?: string,
  idOverride?: string,
): Promise<UserProfile> {
  const localUser = readUser();
  const resolvedUserId = idOverride || localUser?.id || nanoid();
  const legacyLocalId =
    localUser && localUser.email === email && localUser.id !== resolvedUserId ? localUser.id : null;
  const baseProfile: UserProfile =
    localUser && localUser.email === email
      ? {
          ...localUser,
          id: resolvedUserId,
          accountType: localUser.accountType ?? (localUser.groupId ? "group" : undefined),
          groupId: localUser.groupId ?? null,
          groupCode: localUser.groupCode ?? null,
          groupName: localUser.groupName ?? null,
          groupRole: localUser.groupRole ?? (localUser.groupId ? "member" : null),
          isAdmin: localUser.isAdmin ?? false,
          adminKeyUnlocked: localUser.adminKeyUnlocked ?? false,
          chessUsername: localUser.chessUsername || localUser.displayName || localUser.email.split("@")[0],
          createdAt: localUser.createdAt ?? Date.now(),
          xpReachedAt: localUser.xpReachedAt ?? localUser.createdAt ?? Date.now(),
          unlockedPfps: localUser.unlockedPfps || [],
          unlockedTaglines: localUser.unlockedTaglines || [],
          unlockedVideos: localUser.unlockedVideos || [],
          unlockedSets: localUser.unlockedSets || [],
          selectedTagline: localUser.selectedTagline ?? "",
          taglinesEnabled: localUser.taglinesEnabled ?? true,
          premiumAccess: localUser.premiumAccess ?? false,
          paypalSubscriptionId: localUser.paypalSubscriptionId ?? null,
          subscriptionStatus: localUser.subscriptionStatus ?? (localUser.premiumAccess ? "active" : undefined),
          subscriptionUpdatedAt: localUser.subscriptionUpdatedAt ?? null,
          groupLocked: localUser.groupLocked ?? false,
          onlineRating: typeof localUser.onlineRating === "number" ? localUser.onlineRating : 1000,
          boardTheme: resolveBoardTheme(localUser.boardTheme).key,
          pieceTheme: resolvePieceTheme(localUser.pieceTheme).key,
        }
      : {
          id: resolvedUserId,
          email,
          displayName: displayName || email.split("@")[0],
          chessUsername: displayName || email.split("@")[0],
          avatarUrl: undefined,
          totalXp: 120,
          level: 2,
          streak: 0,
          bestStreak: 0,
          dailyXp: 0,
          dailyDate: toLocalDateKey(new Date()),
          lastQualifiedDate: null,
          pawns: 0,
          onlineRating: 1000,
          isAdmin: false,
          adminKeyUnlocked: false,
          createdAt: Date.now(),
          xpReachedAt: Date.now(),
          accountType: "personal",
          groupId: null,
          groupCode: null,
          groupName: null,
          groupRole: null,
          unlockedPfps: [],
          unlockedTaglines: [],
          unlockedVideos: [],
          unlockedSets: [],
          selectedTagline: "",
          taglinesEnabled: true,
          premiumAccess: false,
          paypalSubscriptionId: null,
          subscriptionStatus: undefined,
          subscriptionUpdatedAt: null,
          groupLocked: false,
          lastStreakAt: startOfDayMs(new Date()),
          boardTheme: DEFAULT_BOARD_THEME,
          pieceTheme: DEFAULT_PIECE_THEME,
        };

  const userNodeRef = ref(db, `users/${baseProfile.id}`);
  try {
    const snap = await get(userNodeRef);
    const remote = snap.val() as UserProfile | null;
    let legacyRemote: UserProfile | null = null;
    if (legacyLocalId) {
      try {
        const legacySnap = await get(ref(db, `users/${legacyLocalId}`));
        legacyRemote = legacySnap.val() as UserProfile | null;
      } catch {
        legacyRemote = null;
      }
    }
    const remoteProfile = {
      ...(legacyRemote || {}),
      ...(remote || {}),
    } as Partial<UserProfile>;
    const inferredGroupId = remoteProfile.groupId ?? baseProfile.groupId ?? null;
    const inferredAccountType = inferredGroupId
      ? "group"
      : remoteProfile.accountType ?? baseProfile.accountType ?? "personal";
    let merged: UserProfile = {
      ...baseProfile,
      ...remoteProfile,
      email: baseProfile.email,
      id: baseProfile.id,
      displayName: baseProfile.displayName || remoteProfile.displayName || baseProfile.email.split("@")[0],
      chessUsername:
        remoteProfile.chessUsername ||
        baseProfile.chessUsername ||
        baseProfile.displayName ||
        baseProfile.email.split("@")[0],
      createdAt: remoteProfile.createdAt ?? baseProfile.createdAt,
      xpReachedAt: remoteProfile.xpReachedAt ?? baseProfile.xpReachedAt ?? baseProfile.createdAt ?? Date.now(),
      pawns: remoteProfile.pawns ?? baseProfile.pawns ?? 0,
      externalRatings: normalizeExternalRatings(remoteProfile.externalRatings ?? baseProfile.externalRatings),
      onlineRating: remoteProfile.onlineRating ?? baseProfile.onlineRating ?? 1000,
      totalXp: remoteProfile.totalXp ?? baseProfile.totalXp,
      level: remoteProfile.level ?? baseProfile.level,
      streak: remoteProfile.streak ?? baseProfile.streak ?? 0,
      bestStreak:
        remoteProfile.bestStreak ??
        baseProfile.bestStreak ??
        remoteProfile.streak ??
        baseProfile.streak ??
        0,
      dailyXp: remoteProfile.dailyXp ?? baseProfile.dailyXp ?? 0,
      dailyDate: remoteProfile.dailyDate ?? baseProfile.dailyDate ?? toLocalDateKey(new Date()),
      lastQualifiedDate: remoteProfile.lastQualifiedDate ?? baseProfile.lastQualifiedDate ?? null,
      // group/account scope
      accountType: inferredAccountType,
      groupId: inferredGroupId,
      groupCode: remoteProfile.groupCode ?? baseProfile.groupCode ?? null,
      groupName: remoteProfile.groupName ?? baseProfile.groupName ?? null,
      groupRole:
        remoteProfile.groupRole ??
        baseProfile.groupRole ??
        (remoteProfile.groupId || baseProfile.groupId ? "member" : null),
      adminKeyUnlocked: remoteProfile.adminKeyUnlocked ?? baseProfile.adminKeyUnlocked ?? false,
      unlockedPfps: remoteProfile.unlockedPfps || baseProfile.unlockedPfps || [],
      unlockedTaglines: remoteProfile.unlockedTaglines || baseProfile.unlockedTaglines || [],
      unlockedVideos: remoteProfile.unlockedVideos || baseProfile.unlockedVideos || [],
      unlockedSets: remoteProfile.unlockedSets || baseProfile.unlockedSets || [],
      selectedTagline: remoteProfile.selectedTagline ?? baseProfile.selectedTagline ?? "",
      taglinesEnabled: remoteProfile.taglinesEnabled ?? baseProfile.taglinesEnabled ?? true,
      lastStreakAt: remoteProfile.lastStreakAt ?? baseProfile.lastStreakAt ?? startOfDayMs(new Date()),
      boardTheme: resolveBoardTheme(remoteProfile.boardTheme || baseProfile.boardTheme).key,
      pieceTheme: resolvePieceTheme(remoteProfile.pieceTheme || baseProfile.pieceTheme).key,
      premiumAccess: remoteProfile.premiumAccess ?? baseProfile.premiumAccess ?? false,
      paypalSubscriptionId: remoteProfile.paypalSubscriptionId ?? baseProfile.paypalSubscriptionId ?? null,
      subscriptionStatus:
        remoteProfile.subscriptionStatus ??
        baseProfile.subscriptionStatus ??
        (remoteProfile.premiumAccess ? "active" : undefined),
      subscriptionUpdatedAt: remoteProfile.subscriptionUpdatedAt ?? baseProfile.subscriptionUpdatedAt ?? null,
      groupLocked: remoteProfile.groupLocked ?? baseProfile.groupLocked ?? false,
      avatarKey:
        remoteProfile.avatarKey ??
        remoteProfile.avatarUrl ??
        baseProfile.avatarKey ??
        baseProfile.avatarUrl,
      avatarUrl: normalizeAvatarUrl(
        remoteProfile.avatarKey ??
          remoteProfile.avatarUrl ??
          baseProfile.avatarKey ??
          baseProfile.avatarUrl,
      ),
      isAdmin: false,
    };
    const dropGroup = () => {
      merged = {
        ...merged,
        accountType: "personal",
        groupId: null,
        groupCode: null,
        groupName: null,
        groupRole: null,
        groupLocked: false,
      };
    };
    if (merged.groupId) {
      try {
        const groupSnap = await get(ref(db, `groups/${merged.groupId}`));
        if (!groupSnap.exists()) {
          dropGroup();
        } else {
          const groupData = groupSnap.val() as Group & { members?: Record<string, GroupMember> };
          const members = groupData.members || {};
          let member = members[merged.id] ?? null;
          const legacyMember = legacyLocalId ? members[legacyLocalId] ?? null : null;
          let preservedLegacyAdmin = false;
          merged = {
            ...merged,
            groupCode: groupData.code || merged.groupCode || null,
            groupName: groupData.name || merged.groupName || null,
            groupLocked: typeof groupData.locked === "boolean" ? groupData.locked : merged.groupLocked,
          };

          if (!member && legacyLocalId) {
            preservedLegacyAdmin =
              legacyMember?.role === "admin" || groupData.createdBy === legacyLocalId;
            const migratedMember: GroupMember = {
              id: merged.id,
              displayName: legacyMember?.displayName || merged.displayName,
              email: legacyMember?.email || merged.email,
              role: preservedLegacyAdmin ? "admin" : "member",
              joinedAt: legacyMember?.joinedAt || Date.now(),
            };
            try {
              await set(ref(db, `groups/${merged.groupId}/members/${merged.id}`), migratedMember);
              member = migratedMember;
            } catch (err) {
              if (preservedLegacyAdmin) {
                try {
                  const fallbackMember: GroupMember = { ...migratedMember, role: "member" };
                  await set(ref(db, `groups/${merged.groupId}/members/${merged.id}`), fallbackMember);
                  member = fallbackMember;
                } catch {
                  member = null;
                }
              }
            }
          }

          if (member) {
            merged = {
              ...merged,
              accountType: "group",
              groupRole: member.role === "admin" ? "admin" : "member",
              adminKeyUnlocked: merged.adminKeyUnlocked === true,
            };
          } else if (groupData.removedMembers?.[merged.id]?.reason === "kicked") {
            dropGroup();
          } else {
            const restoredRole: GroupMember["role"] = groupData.createdBy === merged.id ? "admin" : "member";
            const restoredMember: GroupMember = {
              id: merged.id,
              displayName: merged.displayName,
              email: merged.email,
              role: restoredRole,
              joinedAt: Date.now(),
            };

            try {
              await set(ref(db, `groups/${merged.groupId}/members/${merged.id}`), restoredMember);
            } catch (err) {
              console.warn("Failed to restore missing group membership record", err);
            }

            merged = {
              ...merged,
              accountType: "group",
              groupRole: restoredRole,
              groupLocked: typeof groupData.locked === "boolean" ? groupData.locked : merged.groupLocked,
            };
          }
        }
      } catch {
        // If group lookup fails, keep the merged data unchanged.
      }
    }
    if (!merged.groupId) {
      merged.accountType = "personal";
      merged.groupRole = null;
    }
    merged.isAdmin = resolveIsAdmin(merged);
    writeUser(merged);
    const safePayload = buildUserSyncPayload(merged);
    try {
      await update(userNodeRef, safePayload);
    } catch (err) {
      console.warn("Failed to sync profile with Firebase, using local only", err);
    }
    return merged;
  } catch (err) {
    console.warn("Failed to sync profile with Firebase, using local only", err);
    writeUser(baseProfile);
    return baseProfile;
  }
}

export async function setAdminStatus(isAdmin: boolean): Promise<UserProfile | null> {
  const user = readUser();
  if (!user) return null;
  const updated: UserProfile = normalizeUser({ ...user, adminKeyUnlocked: isAdmin });
  writeUser(updated);
  try {
    await update(ref(db, `users/${user.id}`), {
      adminKeyUnlocked: updated.adminKeyUnlocked ?? false,
    });
  } catch (err) {
    console.warn("Failed to sync admin status", err);
  }
  return updated;
}

async function createLiveMatch(
  a: LiveMatchPlayer,
  b: LiveMatchPlayer,
  timeControl: string,
): Promise<LiveMatch> {
  const matchId = nanoid();
  const colorA: "w" | "b" = Math.random() < 0.5 ? "w" : "b";
  const colorB: "w" | "b" = colorA === "w" ? "b" : "w";
  const match: LiveMatch = {
    id: matchId,
    timeControl,
    status: "pending",
    createdAt: Date.now(),
    players: {
      [a.id]: { ...a, color: colorA },
      [b.id]: { ...b, color: colorB },
    },
  };
  await set(ref(db, `matches/${matchId}`), match);
  await set(ref(db, `userMatches/${a.id}`), { matchId, timeControl });
  await set(ref(db, `userMatches/${b.id}`), { matchId, timeControl });
  return match;
}

export async function enqueueMatchmaking(
  timeControl: string,
  user: UserProfile | null,
): Promise<
  | { status: "queued" }
  | { status: "matched"; matchId: string; opponent: LiveMatchPlayer; color: "w" | "b"; timeControl: string }
> {
  if (!user) throw new Error("Sign in to find a match.");
  const tc = normalizeTimeControl(timeControl);
  const queueRef = ref(db, `matchmaking/${tc}`);
  const now = Date.now();
  const snap = await get(queueRef);
  const waiting = (snap.exists() ? snap.val() : {}) as Record<string, any>;
  const candidates = Object.entries(waiting || {}).filter(
    ([id, entry]) => id !== user.id && now - (entry?.createdAt || 0) < MATCHMAKING_TIMEOUT_MS,
  );

  if (candidates.length) {
    const [oppId, entry] = candidates[0];
    await remove(ref(db, `matchmaking/${tc}/${oppId}`)).catch(() => {});
    const selfPlayer: LiveMatchPlayer = {
      id: user.id,
      name: user.chessUsername || user.displayName || user.email.split("@")[0],
      rating: user.onlineRating || 1000,
      color: "w",
      chessUsername: user.chessUsername,
    };
    const oppPlayer: LiveMatchPlayer = {
      id: oppId,
      name: entry?.name || entry?.displayName || "Player",
      rating: entry?.rating || 1000,
      color: "b",
      chessUsername: entry?.chessUsername,
    };
    const match = await createLiveMatch(selfPlayer, oppPlayer, tc);
    await remove(ref(db, `matchmaking/${tc}/${user.id}`)).catch(() => {});
    const myColor = match.players[user.id]?.color || "w";
    const opponent = match.players[oppId];
    return { status: "matched", matchId: match.id, opponent, color: myColor, timeControl: tc };
  }

  const entry = {
    id: user.id,
    name: user.chessUsername || user.displayName || user.email.split("@")[0],
    rating: user.onlineRating || 1000,
    chessUsername: user.chessUsername,
    createdAt: now,
  };
  await set(ref(db, `matchmaking/${tc}/${user.id}`), entry);
  return { status: "queued" };
}

export function listenForUserMatch(userId: string, callback: (matchId: string | null) => void): () => void {
  const userMatchRef = ref(db, `userMatches/${userId}`);
  const off = onValue(
    userMatchRef,
    (snap) => {
      const val = snap.val() as { matchId?: string } | null;
      callback(val?.matchId || null);
    },
    () => callback(null),
  );
  return () => off();
}

export async function cancelMatchSearch(timeControl: string, userId: string): Promise<void> {
  const tc = normalizeTimeControl(timeControl);
  await remove(ref(db, `matchmaking/${tc}/${userId}`)).catch(() => {});
}

export async function fetchMatch(matchId: string): Promise<LiveMatch | null> {
  try {
    const snap = await get(ref(db, `matches/${matchId}`));
    if (snap.exists()) return snap.val() as LiveMatch;
    return null;
  } catch {
    return null;
  }
}

export async function postMatchMove(matchId: string, move: LiveMove): Promise<void> {
  const movesRef = ref(db, `matches/${matchId}/moves`);
  const id = nanoid();
  const payload = { ...move, id, ts: move.ts || Date.now() };
  await set(ref(db, `matches/${matchId}/moves/${id}`), payload);
}

export function listenForMatchMoves(matchId: string, callback: (moves: LiveMove[]) => void): () => void {
  const movesRef = ref(db, `matches/${matchId}/moves`);
  const off = onValue(
    movesRef,
    (snap) => {
      const val = (snap.val() || {}) as Record<string, LiveMove>;
      const list = Object.values(val || {}).sort((a, b) => (a.ts || 0) - (b.ts || 0));
      callback(list);
    },
    () => callback([]),
  );
  return () => off();
}

export async function sendMatchSignal(
  matchId: string,
  signal: Omit<MatchSignal, "id" | "ts"> & { ts?: number },
): Promise<void> {
  const id = nanoid();
  const payload: MatchSignal = { ...signal, id, ts: signal.ts || Date.now() };
  await set(ref(db, `matches/${matchId}/signals/${id}`), payload);
}

export function listenForMatchSignals(matchId: string, callback: (signals: MatchSignal[]) => void): () => void {
  const signalsRef = ref(db, `matches/${matchId}/signals`);
  const off = onValue(
    signalsRef,
    (snap) => {
      const val = (snap.val() || {}) as Record<string, MatchSignal>;
      const list = Object.values(val || {}).sort((a, b) => (a.ts || 0) - (b.ts || 0));
      callback(list);
    },
    () => callback([]),
  );
  return () => off();
}

export async function sendFriendChallenge(
  targetChessUsername: string,
  challenger: UserProfile | null,
  timeControl: string,
): Promise<void> {
  if (!challenger) throw new Error("Sign in to send a challenge.");
  const normalizedTarget = normalizeChessUsername(targetChessUsername);
  if (!normalizedTarget) throw new Error("Enter a chess.com username.");

  const usersSnap = await get(ref(db, "users"));
  const usersVal = (usersSnap.exists() ? usersSnap.val() : {}) as Record<string, UserProfile>;
  const targetEntry = Object.entries(usersVal || {}).find(
    ([, profile]) => normalizeChessUsername(profile?.chessUsername || profile?.displayName) === normalizedTarget,
  );
  if (!targetEntry) throw new Error("Could not find a player with that chess.com username.");

  const [targetId, profile] = targetEntry;
  const challengeId = nanoid();
  const payload: ChallengePayload = {
    id: challengeId,
    fromId: challenger.id,
    fromName: challenger.chessUsername || challenger.displayName || challenger.email.split("@")[0],
    fromChessUsername: challenger.chessUsername,
    fromRating: challenger.onlineRating,
    timeControl: normalizeTimeControl(timeControl),
    createdAt: Date.now(),
  };
  await set(ref(db, `challenges/${targetId}/${challengeId}`), payload);
}

export function listenForChallenges(
  userId: string,
  callback: (challenge: ChallengePayload | null) => void,
): () => void {
  const challengesRef = ref(db, `challenges/${userId}`);
  const off = onValue(
    challengesRef,
    (snap) => {
      const val = (snap.val() || {}) as Record<string, ChallengePayload>;
      const latest = Object.values(val || {}).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
      callback(latest || null);
    },
    () => callback(null),
  );
  return () => off();
}

export async function respondToChallenge(userId: string, challengeId: string, action: "accept" | "decline") {
  const path = `challenges/${userId}/${challengeId}`;
  if (action === "decline") {
    await remove(ref(db, path)).catch(() => {});
    return;
  }
}

export async function acceptChallenge(
  challenge: ChallengePayload,
  recipient: UserProfile | null,
): Promise<LiveMatch | null> {
  if (!recipient) return null;
  const challengerSnap = await get(ref(db, `users/${challenge.fromId}`));
  const challenger = (challengerSnap.val() || {}) as UserProfile;
  const challengerPlayer: LiveMatchPlayer = {
    id: challenge.fromId,
    name: challenge.fromName || challenger.displayName || "Player",
    rating: challenge.fromRating || challenger.onlineRating || 1000,
    color: "w",
    chessUsername: challenge.fromChessUsername || challenger.chessUsername,
  };
  const recipientPlayer: LiveMatchPlayer = {
    id: recipient.id,
    name: recipient.chessUsername || recipient.displayName || recipient.email.split("@")[0],
    rating: recipient.onlineRating || 1000,
    color: "b",
    chessUsername: recipient.chessUsername,
  };
  const match = await createLiveMatch(challengerPlayer, recipientPlayer, normalizeTimeControl(challenge.timeControl));
  await remove(ref(db, `challenges/${recipient.id}/${challenge.id}`)).catch(() => {});
  return match;
}

export async function setChessUsername(username: string): Promise<UserProfile | null> {
  const user = readUser();
  if (!user) return null;
  const truncated = (username || "").slice(0, 9);
  const updated: UserProfile = { ...user, chessUsername: truncated, displayName: (user.displayName || truncated).slice(0, 9) };
  writeUser(updated);
  try {
    await update(ref(db, `users/${user.id}`), { chessUsername: username });
  } catch (err) {
    console.warn("Failed to sync chess username to Firebase", err);
  }
  return updated;
}

export async function updateUserEmail(email: string): Promise<UserProfile | null> {
  const user = readUser();
  if (!user) return null;
  const trimmed = email.trim();
  const fallbackName = trimmed.includes("@") ? trimmed.split("@")[0] : trimmed;
  const normalized = normalizeUser({
    ...user,
    email: trimmed,
    displayName: user.displayName || fallbackName,
    chessUsername: user.chessUsername || user.displayName || fallbackName,
  });
  writeUser(normalized);
  try {
    await update(ref(db, `users/${user.id}`), {
      email: normalized.email,
      displayName: normalized.displayName,
      chessUsername: normalized.chessUsername,
    });
  } catch (err) {
    console.warn("Failed to sync email change", err);
  }
  return normalized;
}

export async function resetAllXp(): Promise<void> {
  try {
    const snap = await get(ref(db, "users"));
    const val = (snap.val() || {}) as Record<string, UserProfile>;
    const updates: Record<string, Partial<UserProfile>> = {};
    Object.entries(val).forEach(([id, profile]) => {
      updates[id] = {
        ...profile,
        totalXp: 0,
        level: 1,
        xpReachedAt: Date.now(),
      };
    });
    await update(ref(db, "users"), updates);
    const me = readUser();
    if (me && updates[me.id]) {
      const next = { ...me, ...updates[me.id] };
      writeUser(next as UserProfile);
    }
  } catch (err) {
    console.warn("Failed to reset XP for all users", err);
  }
}

export async function updateOnlineRating(userId: string, rating: number): Promise<UserProfile | null> {
  const user = readUser();
  if (!user || user.id !== userId) return null;
  const safeRating = Math.max(0, Math.round(rating));
  const normalized = normalizeUser({ ...user, onlineRating: safeRating });
  writeUser(normalized);
  try {
    await update(ref(db, `users/${userId}`), { onlineRating: safeRating });
  } catch (err) {
    console.warn("Failed to sync online rating", err);
  }
  return normalized;
}

export async function updateExternalRatings(
  userId: string,
  ratings: ExternalRatings,
): Promise<UserProfile | null> {
  const user = readUser();
  if (!user || user.id !== userId) return null;
  const externalRatings = normalizeExternalRatings(ratings);
  const onlineRating = deriveExternalOnlineRating(externalRatings, user.onlineRating);
  const normalized = normalizeUser({ ...user, externalRatings, onlineRating });
  writeUser(normalized);
  try {
    await update(ref(db, `users/${userId}`), {
      externalRatings,
      onlineRating,
    });
  } catch (err) {
    console.warn("Failed to sync external ratings", err);
  }
  return normalized;
}

export async function updateBoardTheme(theme: string, pieceTheme?: string): Promise<UserProfile | null> {
  const user = readUser();
  if (!user) return null;
  const resolved = resolveBoardTheme(theme).key;
  const resolvedPiece = resolvePieceTheme(pieceTheme || user.pieceTheme).key;
  const updated: UserProfile = { ...user, boardTheme: resolved, pieceTheme: resolvedPiece };
  writeUser(updated);
  try {
    await update(ref(db, `users/${user.id}`), { boardTheme: resolved, pieceTheme: resolvedPiece });
  } catch (err) {
    console.warn("Failed to sync board theme", err);
  }
  return updated;
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
  return readUser();
}

export async function attachPaypalSubscription(subscriptionId: string): Promise<{ success: boolean; profile: UserProfile | null }> {
  const user = readUser();
  if (!user) return { success: false, profile: null };
  const baseUpdated: UserProfile = normalizeUser({
    ...user,
    premiumAccess: true,
    paypalSubscriptionId: subscriptionId,
    subscriptionStatus: "active",
    subscriptionUpdatedAt: Date.now(),
    groupLocked: false,
  });
  const restoreFields = await restoreOwnedGroupIfNeeded(baseUpdated);
  const updated: UserProfile = normalizeUser(restoreFields ? { ...baseUpdated, ...restoreFields } : baseUpdated);
  writeUser(updated);
  try {
    await update(
      ref(db, `users/${user.id}`),
      stripUndefinedShallow({
        premiumAccess: true,
        paypalSubscriptionId: subscriptionId,
        subscriptionStatus: "active",
        subscriptionUpdatedAt: updated.subscriptionUpdatedAt,
        groupLocked: updated.groupId ? updated.groupLocked : null,
        accountType: updated.accountType,
        groupId: updated.groupId,
        groupCode: updated.groupCode,
        groupName: updated.groupName,
        groupRole: updated.groupRole,
      }),
    );
  } catch (err) {
    console.warn("Failed to sync PayPal subscription to Firebase", err);
  }
  return { success: true, profile: updated };
}

export async function cancelPaypalSubscriptionLocally(): Promise<{ success: boolean; profile: UserProfile | null }> {
  const user = readUser();
  if (!user || !user.paypalSubscriptionId) return { success: false, profile: null };
  await pauseOwnedGroupIfNeeded(user);
  const updated: UserProfile = normalizeUser({
    ...user,
    premiumAccess: false,
    subscriptionStatus: "cancelled",
    subscriptionUpdatedAt: Date.now(),
    groupLocked: true,
  });
  writeUser(updated);
  try {
    await update(
      ref(db, `users/${user.id}`),
      stripUndefinedShallow({
        premiumAccess: false,
        subscriptionStatus: "cancelled",
        subscriptionUpdatedAt: updated.subscriptionUpdatedAt,
        groupLocked: updated.groupId ? true : null,
        accountType: updated.accountType,
        groupId: updated.groupId,
        groupCode: updated.groupCode,
        groupName: updated.groupName,
        groupRole: updated.groupRole,
      }),
    );
  } catch (err) {
    console.warn("Failed to sync cancellation to Firebase", err);
  }
  return { success: true, profile: updated };
}

export async function updateSubscriptionStatusFromWebhook(
  subscriptionId: string,
  status: "active" | "cancelled" | "suspended" | "expired" | "unknown",
): Promise<UserProfile | null> {
  const user = readUser();
  if (!user || user.paypalSubscriptionId !== subscriptionId) return null;
  const premiumAccess = status === "active";
  const baseUpdated: UserProfile = normalizeUser({
    ...user,
    premiumAccess,
    subscriptionStatus: status,
    subscriptionUpdatedAt: Date.now(),
    groupLocked: !premiumAccess,
  });
  let updated: UserProfile = baseUpdated;
  if (premiumAccess) {
    const restoreFields = await restoreOwnedGroupIfNeeded(baseUpdated);
    if (restoreFields) {
      updated = normalizeUser({ ...baseUpdated, ...restoreFields });
    }
  } else {
    await pauseOwnedGroupIfNeeded(user);
  }
  writeUser(updated);
  try {
    await update(
      ref(db, `users/${user.id}`),
      stripUndefinedShallow({
        premiumAccess,
        subscriptionStatus: status,
        subscriptionUpdatedAt: updated.subscriptionUpdatedAt,
        groupLocked: updated.groupId ? updated.groupLocked : null,
        accountType: updated.accountType,
        groupId: updated.groupId,
        groupCode: updated.groupCode,
        groupName: updated.groupName,
        groupRole: updated.groupRole,
      }),
    );
  } catch (err) {
    console.warn("Failed to sync webhook update to Firebase", err);
  }
  return updated;
}

export async function logout(): Promise<void> {
  localStorage.removeItem(STORAGE_KEYS.user);
}

async function generateGroupCode(): Promise<{ code: string; digits: string }> {
  for (let i = 0; i < 25; i++) {
    const digits = Math.floor(Math.random() * 10_000)
      .toString()
      .padStart(4, "0");
    const codeRef = ref(db, `groupCodes/${digits}`);
    const snap = await get(codeRef);
    if (!snap.exists()) {
      return { code: formatGroupCode(digits), digits };
    }
  }
  throw new Error("Could not generate a unique group code. Please try again.");
}

async function fetchGroupById(groupId: string): Promise<(Group & { members?: Record<string, GroupMember> }) | null> {
  try {
    const snap = await get(ref(db, `groups/${groupId}`));
    if (!snap.exists()) return null;
    return snap.val() as Group & { members?: Record<string, GroupMember> };
  } catch {
    return null;
  }
}

async function findOwnedGroupByCreator(
  userId: string,
): Promise<{ id: string; group: Group & { members?: Record<string, GroupMember> } } | null> {
  try {
    const snap = await get(ref(db, "groups"));
    if (!snap.exists()) return null;
    const val = snap.val() as Record<string, Group & { members?: Record<string, GroupMember> }>;
    const match = Object.entries(val).find(([, group]) => group?.createdBy === userId);
    if (!match) return null;
    const [groupId, group] = match;
    return { id: group.id || groupId, group: { ...group, id: group.id || groupId } };
  } catch {
    return null;
  }
}

async function pauseOwnedGroupIfNeeded(
  user: UserProfile,
): Promise<{ id: string; group: Group & { members?: Record<string, GroupMember> } } | null> {
  if (!user.groupId) return null;
  const groupData = await fetchGroupById(user.groupId);
  if (!groupData || groupData.createdBy !== user.id) return null;
  const members = groupData.members || {};
  const adminDisplayName = user.displayName || user.email || "Admin";
  const existingAdmin = members[user.id];
  const adminMember: GroupMember = {
    id: user.id,
    displayName: existingAdmin?.displayName || adminDisplayName,
    email: existingAdmin?.email || user.email,
    role: "admin",
    joinedAt: existingAdmin?.joinedAt || Date.now(),
  };
  const pausedMembers = Object.fromEntries(
    Object.entries(members).filter(([memberId]) => memberId !== user.id),
  );
  const memberIds = Object.keys(pausedMembers).filter(Boolean);
  await Promise.all(
    memberIds
      .filter((memberId) => memberId !== user.id)
      .map(async (memberId) => {
        try {
          await update(ref(db, `users/${memberId}`), {
            accountType: "personal",
            groupId: null,
            groupCode: null,
            groupName: null,
            groupRole: null,
            groupLocked: null,
          });
        } catch (err) {
          console.warn("Failed to remove member during pause", err);
        }
      }),
  );
  try {
    await update(ref(db, `groups/${user.groupId}`), {
      locked: true,
      members: { [user.id]: adminMember },
      pausedMembers,
    });
  } catch (err) {
    console.warn("Failed to lock group during pause", err);
  }
  return { id: groupData.id || user.groupId, group: { ...groupData, id: groupData.id || user.groupId } };
}

async function restoreOwnedGroupIfNeeded(user: UserProfile): Promise<Partial<UserProfile> | null> {
  let ownedGroup: { id: string; group: Group & { members?: Record<string, GroupMember> } } | null = null;
  if (user.groupId) {
    const existing = await fetchGroupById(user.groupId);
    if (existing && existing.createdBy === user.id) {
      ownedGroup = { id: existing.id || user.groupId, group: { ...existing, id: existing.id || user.groupId } };
    }
  }
  if (!ownedGroup) {
    ownedGroup = await findOwnedGroupByCreator(user.id);
  }
  if (!ownedGroup) return null;
  const displayName = user.displayName || user.email || "Player";
  const pausedMembers = ownedGroup.group.pausedMembers || {};
  const hasPausedMembers = Object.keys(pausedMembers).length > 0;
  if (!ownedGroup.group.locked && !hasPausedMembers) return null;
  const currentMembers = ownedGroup.group.members || {};
  const membersToRestore: Record<string, GroupMember> = {
    ...currentMembers,
    ...pausedMembers,
    [user.id]: {
      id: user.id,
      displayName,
      email: user.email,
      role: "admin",
      joinedAt: Date.now(),
    },
  };
  try {
    await update(ref(db, `groups/${ownedGroup.id}`), { locked: false, pausedMembers: null });
    await set(ref(db, `groups/${ownedGroup.id}/members`), membersToRestore);
  } catch (err) {
    console.warn("Failed to restore group ownership", err);
  }
  const restoreEntries = Object.entries(pausedMembers);
  await Promise.all(
    restoreEntries.map(async ([memberId, member]) => {
      try {
        const role = member?.role === "admin" ? "admin" : "member";
        await update(ref(db, `users/${memberId}`), {
          accountType: "group",
          groupId: ownedGroup!.id,
          groupCode: ownedGroup!.group.code || "",
          groupName: ownedGroup!.group.name || "Group",
          groupRole: role,
          groupLocked: false,
        });
      } catch (err) {
        console.warn("Failed to restore member after pause", err);
      }
    }),
  );
  return {
    accountType: "group",
    groupId: ownedGroup.id,
    groupCode: ownedGroup.group.code || user.groupCode || "",
    groupName: ownedGroup.group.name || user.groupName || "Group",
    groupRole: "admin",
    groupLocked: false,
  };
}

export async function choosePersonalAccount(): Promise<UserProfile | null> {
  const user = readUser();
  if (!user) return null;
  const updated: UserProfile = normalizeUser({
    ...user,
    accountType: "personal",
    groupId: null,
    groupCode: null,
    groupName: null,
    groupRole: null,
    groupLocked: false,
  });
  writeUser(updated);
  try {
    await update(ref(db, `users/${user.id}`), buildUserSyncPayload(updated));
  } catch (err) {
    console.warn("Failed to persist personal account choice", err);
  }
  await fetchCourseRecord(updated).catch(() => undefined);
  return updated;
}

export async function getUserClubMemberships(userId?: string | null): Promise<UserClubMembership[]> {
  const user = readUser();
  const activeUserId = userId || user?.id;
  if (!activeUserId) return [];
  try {
    const snap = await get(ref(db, "groups"));
    if (!snap.exists()) return [];
    const groups = snap.val() as Record<string, Group & { members?: Record<string, GroupMember> }>;
    return Object.entries(groups || {})
      .map(([id, group]) => {
        const member = group?.members?.[activeUserId];
        const isCreator = group?.createdBy === activeUserId;
        if (!member && !isCreator) return null;
        const role: GroupMember["role"] =
          member?.role === "admin" || member?.role === "member"
            ? member.role
            : isCreator
              ? "admin"
              : "member";
        return {
          id: group.id || id,
          name: group.name || DEFAULT_GROUP_NAME,
          code: group.code || "",
          role,
          locked: !!group.locked,
        };
      })
      .filter((group): group is UserClubMembership => !!group)
      .sort((left, right) => left.name.localeCompare(right.name));
  } catch (err) {
    console.warn("Failed to load user club memberships", err);
    return [];
  }
}

export async function switchActiveClub(groupId: string): Promise<UserProfile | null> {
  const user = readUser();
  if (!user) return null;
  const groupData = await fetchGroupById(groupId);
  if (!groupData) throw new Error("That club no longer exists.");
  if (groupData.locked) throw new Error("This club is paused. Ask the owner to resubscribe.");

  const member = groupData.members?.[user.id] ?? null;
  const isCreator = groupData.createdBy === user.id;
  if (!member && !isCreator) throw new Error("You are not a member of that club.");

  const role: GroupMember["role"] =
    member?.role === "admin" || member?.role === "member" ? member.role : isCreator ? "admin" : "member";
  if (!member && isCreator) {
    try {
      await set(ref(db, `groups/${groupData.id || groupId}/members/${user.id}`), {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        role,
        joinedAt: Date.now(),
      } satisfies GroupMember);
    } catch (err) {
      console.warn("Failed to restore creator membership", err);
    }
  }

  const updated: UserProfile = normalizeUser({
    ...user,
    accountType: "group",
    groupId: groupData.id || groupId,
    groupCode: groupData.code || "",
    groupName: groupData.name || DEFAULT_GROUP_NAME,
    groupRole: role,
    groupLocked: !!groupData.locked,
  });
  writeUser(updated);
  try {
    await update(ref(db, `users/${user.id}`), buildUserSyncPayload(updated));
  } catch (err) {
    console.warn("Failed to sync active club", err);
  }
  await fetchCourseRecord(updated).catch(() => undefined);
  return updated;
}

export async function createGroupForUser(
  name?: string,
): Promise<{ group: Group; profile: UserProfile } | null> {
  const user = readUser();
  if (!user) return null;
  const label = (name || "").trim() || `${user.displayName || "My"} Group`;
  const { code, digits } = await generateGroupCode();
  const groupId = nanoid();
  const group: Group = {
    id: groupId,
    name: label,
    code,
    createdBy: user.id,
    createdAt: Date.now(),
    locked: false,
  };
  const member: GroupMember = {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    role: "admin",
    joinedAt: Date.now(),
  };
  try {
    await set(ref(db, `groups/${groupId}`), { ...group, members: { [user.id]: member } });
    await set(ref(db, `groupCodes/${digits}`), groupId);
  } catch (err) {
    console.warn("Failed to create group in Firebase", err);
  }
  const updated: UserProfile = normalizeUser({
    ...user,
    accountType: "group",
    groupId,
    groupCode: group.code,
    groupName: group.name,
    groupRole: "admin",
    groupLocked: false,
  });
  try {
    await update(ref(db, `users/${user.id}`), buildUserSyncPayload(updated));
  } catch (err) {
    console.warn("Failed to sync group details to user profile", err);
  }
  writeUser(updated);
  await fetchCourseRecord(updated).catch(() => undefined);
  return { group, profile: updated };
}

export async function joinGroupWithCode(
  codeInput: string,
): Promise<{ group: Group; profile: UserProfile } | null> {
  const user = readUser();
  if (!user) return null;
  const digits = sanitizeDigits(codeInput);
  if (digits.length !== 4) throw new Error("Enter a valid 4-digit code.");
  const codeRef = ref(db, `groupCodes/${digits}`);
  const codeSnap = await get(codeRef);

  const ensureSouthKnightGroup = async () => {
    const groupId = "south-knight";
    const groupRef = ref(db, `groups/${groupId}`);
    let baseGroup: Group & { members?: Record<string, GroupMember> } | null = null;
    try {
      const existing = await get(groupRef);
      baseGroup =
        (existing.val() as Group & { members?: Record<string, GroupMember> }) || {
          id: groupId,
          name: "South Knight",
          code: formatGroupCode(digits),
          createdBy: "system",
          createdAt: Date.now(),
          locked: false,
          members: {},
        };
      await set(groupRef, baseGroup);
      await set(codeRef, groupId);
    } catch {
      baseGroup = {
        id: groupId,
        name: "South Knight",
        code: formatGroupCode(digits),
        createdBy: "system",
        createdAt: Date.now(),
        locked: false,
        members: {},
      };
    }
    return baseGroup;
  };

  let groupId: string;
  let groupData: (Group & { members?: Record<string, GroupMember> }) | null = null;
  if (!codeSnap.exists()) {
    if (digits === "0055") {
      groupData = await ensureSouthKnightGroup();
      groupId = groupData.id;
    } else {
      throw new Error("No group found for that code.");
    }
  } else {
    groupId = codeSnap.val() as string;
    groupData = await fetchGroupById(groupId);
    if (!groupData) {
      if (digits === "0055") {
        groupData = await ensureSouthKnightGroup();
      } else {
        throw new Error("That group no longer exists.");
      }
    }
  }
  if (groupData?.locked) {
    throw new Error("This group is paused. Ask the owner to resubscribe.");
  }
  const removal = groupData?.removedMembers?.[user.id];
  if (removal?.reason === "kicked") {
    const removedAtRaw = typeof removal.removedAt === "number" ? removal.removedAt : Number(removal.removedAt);
    const removedAt = Number.isFinite(removedAtRaw) && removedAtRaw > 0 ? removedAtRaw : Date.now();
    const cooldownEnds = removedAt + GROUP_REJOIN_COOLDOWN_MS;
    if (Date.now() < cooldownEnds) {
      const availableOn = toLocalDateKey(new Date(cooldownEnds));
      throw new Error(`You were removed from this group. Try again after ${availableOn}.`);
    }
  }
  const group: Group = {
    id: groupId,
    name: groupData.name || DEFAULT_GROUP_NAME,
    code: groupData.code || formatGroupCode(digits),
    createdBy: groupData.createdBy,
    createdAt: groupData.createdAt || Date.now(),
    locked: !!groupData.locked,
  };
  const previousMember = groupData?.members?.[user.id] ?? null;
  const existingMembers = Object.values(groupData?.members || {});
  const nextRole: GroupMember["role"] =
    previousMember?.role === "admin" || previousMember?.role === "member"
      ? previousMember.role
      : existingMembers.length === 0
        ? "admin"
        : "member";
  const member: GroupMember = {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    role: nextRole,
    joinedAt: Date.now(),
  };
  try {
    await update(ref(db, `groups/${groupId}/members/${user.id}`), member);
  } catch (err) {
    console.warn("Failed to record membership in Firebase", err);
    throw new Error("Could not join that group right now. Please try again.");
  }
  const resolvedGroupLocked = typeof groupData.locked === "boolean" ? groupData.locked : undefined;
  const updated: UserProfile = normalizeUser({
    ...user,
    accountType: "group",
    groupId,
    groupCode: group.code,
    groupName: group.name,
    groupRole: nextRole,
    groupLocked: resolvedGroupLocked,
  });
  try {
    await update(ref(db, `users/${user.id}`), buildUserSyncPayload(updated));
  } catch (err) {
    console.warn("Failed to sync group join to user profile", err);
    try {
      if (previousMember) {
        await set(ref(db, `groups/${groupId}/members/${user.id}`), previousMember);
      } else {
        await remove(ref(db, `groups/${groupId}/members/${user.id}`));
      }
    } catch (rollbackErr) {
      console.warn("Failed to roll back membership after profile sync failure", rollbackErr);
    }
    throw new Error("Could not finish joining the group. Please try again.");
  }
  writeUser(updated);
  await fetchCourseRecord(updated).catch(() => undefined);
  return { group, profile: updated };
}

export async function leaveGroup(): Promise<UserProfile | null> {
  const user = readUser();
  if (!user?.groupId) return user;
  try {
    await remove(ref(db, `groups/${user.groupId}/members/${user.id}`));
  } catch (err) {
    console.warn("Failed to remove membership from Firebase", err);
  }
  const updated: UserProfile = normalizeUser({
    ...user,
    accountType: "personal",
    groupId: null,
    groupCode: null,
    groupName: null,
    groupRole: null,
    groupLocked: false,
  });
  writeUser(updated);
  try {
    await update(ref(db, `users/${user.id}`), buildUserSyncPayload(updated));
  } catch (err) {
    console.warn("Failed to sync group exit", err);
  }
  await fetchCourseRecord(updated).catch(() => undefined);
  return updated;
}

export async function getGroupMembers(groupId?: string | null): Promise<GroupMember[]> {
  const activeGroup = groupId || readUser()?.groupId;
  if (!activeGroup) return [];
  try {
    const snap = await get(ref(db, `groups/${activeGroup}/members`));
    if (!snap.exists()) return [];
    const val = snap.val() as Record<string, GroupMember>;
    return Object.values(val || {}).map((member) => ({
      ...member,
      role: member.role === "admin" ? "admin" : "member",
    }));
  } catch (err) {
    console.warn("Failed to load group members", err);
    return [];
  }
}

export async function renameGroup(admin: UserProfile | null, newName: string): Promise<Group | null> {
  if (!admin?.groupId || admin.groupRole !== "admin") throw new Error("Only group admins can rename the group.");
  const name = newName.trim();
  if (!name) throw new Error("Enter a group name.");
  const groupRef = ref(db, `groups/${admin.groupId}`);
  try {
    await update(groupRef, { name });
  } catch (err) {
    console.warn("Failed to rename group in Firebase", err);
  }
  const members = await getGroupMembers(admin.groupId);
  await Promise.all(
    members.map(async (member) => {
      try {
        await update(ref(db, `users/${member.id}`), { groupName: name });
      } catch (err) {
        console.warn("Failed to sync member name update", err);
      }
    }),
  );
  const updatedProfile: UserProfile = { ...admin, groupName: name };
  if (admin.id === readUser()?.id) {
    writeUser(updatedProfile);
  }
  const existingGroup = await fetchGroupById(admin.groupId);
  return {
    id: admin.groupId,
    name,
    code: existingGroup?.code || admin.groupCode || "",
    createdBy: existingGroup?.createdBy || admin.id,
    createdAt: existingGroup?.createdAt || Date.now(),
    teamUrl: existingGroup?.teamUrl,
    avatarUrl: existingGroup?.avatarUrl,
  };
}

export async function getGroupProfileSettings(admin: UserProfile | null): Promise<GroupProfileSettings | null> {
  if (!admin?.groupId || admin.groupRole !== "admin") return null;
  const group = await fetchGroupById(admin.groupId);
  if (!group) return null;
  return {
    id: group.id || admin.groupId,
    name: group.name || admin.groupName || "Group",
    code: group.code || admin.groupCode || "",
    teamUrl: group.teamUrl || "",
    avatarUrl: group.avatarUrl || "",
  };
}

export async function updateGroupProfileSettings(
  admin: UserProfile | null,
  patch: { name?: string; teamUrl?: string; avatarUrl?: string },
): Promise<GroupProfileSettings | null> {
  if (!admin?.groupId || admin.groupRole !== "admin") throw new Error("Only group admins can edit team settings.");
  const group = await fetchGroupById(admin.groupId);
  if (!group) throw new Error("That team no longer exists.");

  const updates: Partial<Group> = {};
  const nextName = patch.name?.trim();
  if (nextName !== undefined) {
    if (!nextName) throw new Error("Enter a team name.");
    if (nextName.length > 32) throw new Error("Use 32 characters at maximum.");
    updates.name = nextName;
  }
  const nextUrl = patch.teamUrl?.trim().toLowerCase();
  if (nextUrl !== undefined) {
    if (nextUrl.length > 48) throw new Error("Use 48 characters at maximum.");
    if (nextUrl && !/^[a-z0-9][a-z0-9-]{0,47}$/.test(nextUrl)) {
      throw new Error("Use lowercase letters, numbers, and hyphens only.");
    }
    updates.teamUrl = nextUrl;
  }
  if (patch.avatarUrl !== undefined) {
    try {
      updates.avatarUrl = await uploadProfileAvatarToSupabase(`group-${admin.groupId}`, patch.avatarUrl);
    } catch (err) {
      console.warn("Supabase team profile picture upload failed; saving existing avatar value.", err);
      updates.avatarUrl = patch.avatarUrl;
    }
  }

  if (Object.keys(updates).length) {
    await update(ref(db, `groups/${admin.groupId}`), updates).catch((err) => {
      console.warn("Failed to update group profile settings", err);
      throw new Error("Could not save team settings.");
    });
  }

  if (updates.name) {
    const members = await getGroupMembers(admin.groupId);
    await Promise.all(
      members.map(async (member) => {
        try {
          await update(ref(db, `users/${member.id}`), { groupName: updates.name });
        } catch (err) {
          console.warn("Failed to sync team name update", err);
        }
      }),
    );
    if (admin.id === readUser()?.id) {
      writeUser({ ...admin, groupName: updates.name });
    }
  }

  const latest = await fetchGroupById(admin.groupId);
  return {
    id: latest?.id || admin.groupId,
    name: latest?.name || updates.name || admin.groupName || "Group",
    code: latest?.code || admin.groupCode || "",
    teamUrl: latest?.teamUrl || "",
    avatarUrl: latest?.avatarUrl || "",
  };
}

export async function removeGroupMember(
  admin: UserProfile | null,
  memberId: string,
): Promise<GroupMember[]> {
  if (!admin?.groupId || admin.groupRole !== "admin") throw new Error("Only admins can manage members.");
  if (memberId === admin.id) return getGroupMembers(admin.groupId);
  try {
    await remove(ref(db, `groups/${admin.groupId}/members/${memberId}`));
  } catch (err) {
    console.warn("Failed to remove member from group", err);
  }
  try {
    await update(ref(db, `users/${memberId}`), {
      accountType: "personal",
      groupId: null,
      groupCode: null,
      groupName: null,
      groupRole: null,
      groupLocked: null,
    });
  } catch (err) {
    console.warn("Failed to reset member profile after removal", err);
  }
  try {
    await set(ref(db, `groups/${admin.groupId}/removedMembers/${memberId}`), {
      removedAt: Date.now(),
      removedBy: admin.id,
      reason: "kicked",
    });
  } catch (err) {
    console.warn("Failed to record group removal cooldown", err);
  }
  return getGroupMembers(admin.groupId);
}

export async function deleteGroup(admin: UserProfile | null): Promise<UserProfile | null> {
  if (!admin?.groupId || admin.groupRole !== "admin") throw new Error("Only group admins can delete the group.");
  let members: GroupMember[] = [];
  let codeDigits = sanitizeDigits(admin.groupCode || "");
  const groupData = await fetchGroupById(admin.groupId);
  if (groupData) {
    members = Object.values(groupData.members || {}).map((m) => ({
      ...m,
      role: m.role === "admin" ? "admin" : "member",
    }));
    codeDigits = codeDigits || sanitizeDigits(groupData.code || "");
  }
  try {
    await remove(ref(db, `groups/${admin.groupId}`));
  } catch (err) {
    console.warn("Failed to delete group from Firebase", err);
  }
  if (codeDigits) {
    try {
      await remove(ref(db, `groupCodes/${codeDigits}`));
    } catch (err) {
      console.warn("Failed to clear group code mapping", err);
    }
  }
  await Promise.all(
    members.map(async (member) => {
      try {
        await update(ref(db, `users/${member.id}`), {
          accountType: "personal",
          groupId: null,
          groupCode: null,
          groupName: null,
          groupRole: null,
          groupLocked: null,
        });
      } catch (err) {
        console.warn("Failed to reset member after deletion", err);
      }
    }),
  );
  const updated: UserProfile = normalizeUser({
    ...admin,
    accountType: "personal",
    groupId: null,
    groupCode: null,
    groupName: null,
    groupRole: null,
  });
  writeUser(updated);
  try {
    await update(ref(db, `users/${admin.id}`), {
      accountType: "personal",
      groupId: null,
      groupCode: null,
      groupName: null,
      groupRole: null,
      groupLocked: null,
      adminKeyUnlocked: updated.adminKeyUnlocked ?? false,
    });
  } catch (err) {
    console.warn("Failed to sync profile after deleting group", err);
  }
  await fetchCourseRecord(updated).catch(() => undefined);
  return updated;
}

export async function getCourses(search?: string, category?: string, user?: UserProfile | null): Promise<Course[]> {
  const record = await fetchCombinedCourseRecord(user);
  let results = toList(record);
  if (category && category !== "all") {
    results = results.filter((c) => c.category === category);
  }
  if (search) {
    const q = search.toLowerCase();
    results = results.filter((c) => c.title.toLowerCase().includes(q));
  }
  return results;
}

export async function getCourse(id: string, user?: UserProfile | null): Promise<Course | null> {
  const record = await fetchCombinedCourseRecord(user);
  return record[id] || null;
}

export async function createCourse(course: Omit<Course, "id"> & { id?: string }): Promise<Course> {
  const user = readUser();
  const record = await fetchCourseRecord(user);
  const hasSubscription = !!(user?.premiumAccess || user?.subscriptionStatus === "active");
  if (user && !hasSubscription && Object.keys(record).length >= 3) {
    throw new Error("Free plan allows up to 3 courses. Subscribe to add more.");
  }
  const newCourse: Course = {
    ...course,
    id: course.id || nanoid(),
    lessons: course.lessons.map((lesson) => ({ ...lesson, id: lesson.id || nanoid() })),
  };
  const normalizedCourse: Course = {
    ...newCourse,
    thumbnailUrl: sanitizeThumbnail(newCourse.thumbnailUrl),
  };
  return writeCourseEntry(normalizedCourse, user);
}

export async function updateCourse(course: Course): Promise<Course> {
  const user = readUser();
  const { course: existing, isShared } = await resolveCourseStorage(course.id, user);
  if (isShared && !canEditCourse(existing, user)) {
    throw new Error("Only the assigned course editor can edit these platform courses.");
  }
  const normalizedCourse: Course = {
    ...(existing || {}),
    ...course,
    thumbnailUrl: sanitizeThumbnail(course.thumbnailUrl),
    chapters: course.chapters ?? existing?.chapters,
  };
  return isShared ? writeSharedCourseEntry(normalizedCourse) : writeCourseEntry(normalizedCourse, user);
}

export async function deleteCourse(id: string): Promise<void> {
  const user = readUser();
  const { course, isShared } = await resolveCourseStorage(id, user);
  if (isShared && !canEditCourse(course, user)) {
    throw new Error("Only the assigned course editor can edit these platform courses.");
  }
  if (isShared) {
    throw new Error("Protected platform courses cannot be deleted.");
  }
  await deleteCourseEntry(id, user);
}

export async function addChapter(courseId: string, title: string, index: number): Promise<Chapter | null> {
  const user = readUser();
  const { course, isShared } = await resolveCourseStorage(courseId, user);
  if (!course) return null;
  if (isShared && !canEditCourse(course, user)) {
    throw new Error("Only the assigned course editor can edit these platform courses.");
  }
  const chapterId = nanoid();
  const chapter: Chapter = { id: chapterId, title, index, subsections: {} };
  return isShared ? writeSharedChapterEntry(courseId, chapter) : writeChapterEntry(courseId, chapter, user);
}

export async function deleteChapter(courseId: string, chapterId: string): Promise<void> {
  const user = readUser();
  const { course, isShared } = await resolveCourseStorage(courseId, user);
  if (!course?.chapters) return;
  if (isShared && !canEditCourse(course, user)) {
    throw new Error("Only the assigned course editor can edit these platform courses.");
  }
  await (isShared ? deleteSharedChapterEntry(courseId, chapterId) : deleteChapterEntry(courseId, chapterId, user));
}

export async function updateChapter(
  courseId: string,
  chapterId: string,
  updates: Partial<Pick<Chapter, "title" | "index">>,
): Promise<Chapter | null> {
  const user = readUser();
  const { course, isShared } = await resolveCourseStorage(courseId, user);
  if (!course?.chapters?.[chapterId]) return null;
  if (isShared && !canEditCourse(course, user)) {
    throw new Error("Only the assigned course editor can edit these platform courses.");
  }
  const nextChapter = { ...course.chapters[chapterId], ...updates };
  return isShared
    ? updateSharedChapterEntry(
        courseId,
        chapterId,
        {
          title: nextChapter.title,
          index: nextChapter.index,
        },
        nextChapter,
      )
    : updateChapterEntry(
        courseId,
        chapterId,
        {
          title: nextChapter.title,
          index: nextChapter.index,
        },
        nextChapter,
        user,
      );
}

export async function saveSubsection(
  courseId: string,
  chapterId: string,
  subsection: Subsection,
): Promise<Subsection | null> {
  const user = readUser();
  const { course, isShared } = await resolveCourseStorage(courseId, user);
  if (!course) return null;
  if (isShared && !canEditCourse(course, user)) {
    throw new Error("Only the assigned course editor can edit these platform courses.");
  }
  const chapters = course.chapters || {};
  const chapter = chapters[chapterId];
  if (!chapter) return null;
  const subs = chapter.subsections || {};
  // clean existing subsections
  const cleanedExisting = Object.fromEntries(
    Object.entries(subs).map(([key, val]) => [key, cleanSubsection(val as Subsection)]),
  ) as Record<string, Subsection>;
  const id = subsection.id || nanoid();
  const nextIndex = typeof subsection.index === "number" ? subsection.index : Object.keys(cleanedExisting).length;
  cleanedExisting[id] = cleanSubsection({ ...subsection, id, index: nextIndex } as Subsection);
  const reindexed = reindexSubsections(cleanedExisting);
  const nextChapter = { ...chapter, subsections: reindexed };
  const subsectionsPath = courseSubsectionsPath(courseId, chapterId, user, isShared);
  const updates: Record<string, unknown> = {
    [`${subsectionsPath}/${id}`]: reindexed[id],
  };
  Object.entries(reindexed).forEach(([subId, sub]) => {
    if (subId === id) return;
    if (cleanedExisting[subId]?.index !== sub.index) {
      updates[`${subsectionsPath}/${subId}/index`] = sub.index;
    }
  });
  const persistedChapter = await (isShared
    ? applySharedSubsectionUpdates(courseId, chapterId, updates, nextChapter)
    : applySubsectionUpdates(courseId, chapterId, updates, nextChapter, user));
  return persistedChapter.subsections?.[id] || null;
}

export async function reorderSubsections(
  courseId: string,
  chapterId: string,
  orderedIds: string[],
): Promise<Record<string, Subsection> | null> {
  const user = readUser();
  const { course, isShared } = await resolveCourseStorage(courseId, user);
  const chapter = course?.chapters?.[chapterId];
  const subs = chapter?.subsections;
  if (!course || !chapter || !subs) return null;
  if (isShared && !canEditCourse(course, user)) {
    throw new Error("Only the assigned course editor can edit these platform courses.");
  }

  const seen = new Set<string>();
  const orderedEntries: [string, Subsection][] = [];
  orderedIds.forEach((id) => {
    if (subs[id] && !seen.has(id)) {
      orderedEntries.push([id, subs[id]]);
      seen.add(id);
    }
  });
  Object.entries(subs).forEach(([id, sub]) => {
    if (!seen.has(id)) {
      orderedEntries.push([id, sub]);
      seen.add(id);
    }
  });

  const reordered = orderedEntries.reduce<Record<string, Subsection>>((acc, [id, sub]) => {
    acc[id] = sub;
    return acc;
  }, {});

  const reindexed = reindexSubsections(reordered, orderedIds);
  const nextChapter = { ...chapter, subsections: reindexed };
  const subsectionsPath = courseSubsectionsPath(courseId, chapterId, user, isShared);
  const updates: Record<string, unknown> = {};
  Object.entries(reindexed).forEach(([id, sub]) => {
    if (subs[id]?.index !== sub.index) {
      updates[`${subsectionsPath}/${id}/index`] = sub.index;
    }
  });
  const persistedChapter = await (isShared
    ? applySharedSubsectionUpdates(courseId, chapterId, updates, nextChapter)
    : applySubsectionUpdates(courseId, chapterId, updates, nextChapter, user));
  return persistedChapter.subsections || null;
}

export async function deleteSubsection(courseId: string, chapterId: string, subsectionId: string): Promise<void> {
  const user = readUser();
  const { course, isShared } = await resolveCourseStorage(courseId, user);
  const chapter = course?.chapters?.[chapterId];
  const subs = chapter?.subsections;
  if (!course || !chapter || !subs?.[subsectionId]) return;
  if (isShared && !canEditCourse(course, user)) {
    throw new Error("Only the assigned course editor can edit these platform courses.");
  }
  const remaining = { ...subs };
  delete remaining[subsectionId];
  const reindexed = reindexSubsections(remaining);
  const nextChapter = { ...chapter, subsections: reindexed };
  const subsectionsPath = courseSubsectionsPath(courseId, chapterId, user, isShared);
  const updates: Record<string, unknown> = {
    [`${subsectionsPath}/${subsectionId}`]: null,
  };
  Object.entries(reindexed).forEach(([id, sub]) => {
    if (subs[id]?.index !== sub.index) {
      updates[`${subsectionsPath}/${id}/index`] = sub.index;
    }
  });
  await (isShared
    ? applySharedSubsectionUpdates(courseId, chapterId, updates, nextChapter)
    : applySubsectionUpdates(courseId, chapterId, updates, nextChapter, user));
}

export async function getProgress(userId: string): Promise<Record<string, CourseProgress>> {
  const progress = await fetchProgress(userId);
  const result: Record<string, CourseProgress> = {};
  await Promise.all(
    Object.entries(progress).map(async ([courseId, val]) => {
      const course = await getCourse(courseId, readUser());
      const total = countTotalSubsections(course);
      const validIds = courseSubsectionIds(course);
      const completedIds = Object.keys(val.completedSubsections || {}).filter((id) => validIds.includes(id));
      result[courseId] = {
        courseId,
        completedLessonIds: completedIds,
        progressPercent: total > 0 ? Math.round((completedIds.length / total) * 100) : 0,
        lastLessonId: completedIds[completedIds.length - 1],
      };
    }),
  );
  return result;
}

export async function getProgressForCourse(userId: string, courseId: string): Promise<CourseProgress | null> {
  const progress = await fetchProgress(userId);
  const entry = progress[courseId];
  const course = await getCourse(courseId, readUser());
  const total = countTotalSubsections(course);
  const validIds = courseSubsectionIds(course);
  if (!entry) return null;
  const completedIds = Object.keys(entry.completedSubsections || {}).filter((id) => validIds.includes(id));
  return {
    courseId,
    completedLessonIds: completedIds,
    progressPercent: total > 0 ? Math.round((completedIds.length / total) * 100) : 0,
    lastLessonId: completedIds[completedIds.length - 1],
  };
}

export async function resetCourseProgress(userId: string, courseId: string): Promise<void> {
  const progress = await fetchProgress(userId);
  if (progress[courseId]) {
    delete progress[courseId];
    await writeProgressForUser(userId, progress);
  }
  // also clear any local fallback progress cache
  const local = readProgress();
  if (local[courseId]) {
    delete local[courseId];
    writeProgress(local);
  }
}

type GiftConfig =
  | { type: "pfp"; value: string }
  | { type: "tagline"; value: string }
  | { type: "piece"; value: string }
  | { type: "video"; value: string };

function normalizeUser(u: UserProfile): UserProfile {
  const adminKeyUnlocked = u.adminKeyUnlocked ?? false;
  const isAdmin = resolveIsAdmin({ ...u, adminKeyUnlocked });
  const hasGroup = !!u.groupId;
  return {
    ...u,
    avatarKey: normalizeProfileAvatarValue(u.avatarKey ?? u.avatarUrl),
    avatarUrl: normalizeAvatarUrl(u.avatarKey ?? u.avatarUrl),
    adminKeyUnlocked,
    isAdmin,
    accountType: hasGroup ? "group" : u.accountType ?? "personal",
    groupCode: hasGroup ? u.groupCode ?? null : null,
    groupName: hasGroup ? u.groupName ?? null : null,
    groupRole: hasGroup ? u.groupRole ?? "member" : null,
    unlockedPfps: u.unlockedPfps || [],
    unlockedTaglines: u.unlockedTaglines || [],
    unlockedVideos: u.unlockedVideos || [],
    unlockedSets: u.unlockedSets || [],
    selectedTagline: u.selectedTagline ?? "",
    taglinesEnabled: u.taglinesEnabled ?? true,
    externalRatings: normalizeExternalRatings(u.externalRatings),
    onlineRating: typeof u.onlineRating === "number" ? u.onlineRating : 1000,
    premiumAccess: u.premiumAccess ?? false,
    paypalSubscriptionId: u.paypalSubscriptionId ?? null,
    subscriptionStatus: u.subscriptionStatus ?? (u.premiumAccess ? "active" : undefined),
    subscriptionUpdatedAt: u.subscriptionUpdatedAt ?? null,
    groupLocked: hasGroup ? u.groupLocked : false,
    bestStreak: u.bestStreak ?? u.streak ?? 0,
    dailyXp: u.dailyXp ?? 0,
    dailyPuzzleCount: u.dailyPuzzleCount ?? 0,
    dailyPuzzleTypes: normalizeDailyPuzzleTypes(u.dailyPuzzleTypes),
    dailyDate: u.dailyDate ?? toLocalDateKey(new Date()),
    lastQualifiedDate: u.lastQualifiedDate ?? null,
    streakDeadlineAt: u.streakDeadlineAt ?? nextDayDeadlineMs(new Date()),
    pieceTheme: resolvePieceTheme(u.pieceTheme).key,
    boardTheme: resolveBoardTheme(u.boardTheme).key,
  };
}

export async function unlockGift(userId: string, gift: GiftConfig): Promise<UserProfile | null> {
  const user = readUser();
  if (!user || user.id !== userId) return null;
  const normalized = normalizeUser(user);
  if (gift.type === "pfp") {
    if (!normalized.unlockedPfps!.includes(gift.value)) normalized.unlockedPfps!.push(gift.value);
  } else if (gift.type === "tagline") {
    if (gift.value && !normalized.unlockedTaglines!.includes(gift.value)) normalized.unlockedTaglines!.push(gift.value);
  } else if (gift.type === "video") {
    if (gift.value && !normalized.unlockedVideos!.includes(gift.value)) normalized.unlockedVideos!.push(gift.value);
  } else if (gift.type === "piece") {
    if (gift.value && !normalized.unlockedSets!.includes(gift.value)) normalized.unlockedSets!.push(gift.value);
  }
  writeUser(normalized);
  try {
    await update(ref(db, `users/${userId}`), {
      unlockedPfps: normalized.unlockedPfps,
      unlockedTaglines: normalized.unlockedTaglines,
      unlockedVideos: normalized.unlockedVideos,
      unlockedSets: normalized.unlockedSets,
    });
  } catch (err) {
    console.warn("Failed to sync unlocked gifts", err);
  }
  return normalized;
}

export async function updateProfileAvatar(
  userId: string,
  avatarValue: string,
): Promise<UserProfile | null> {
  const user = readUser();
  if (!user || user.id !== userId) return null;
  let resolvedAvatarValue = avatarValue;
  try {
    resolvedAvatarValue = await uploadProfileAvatarToSupabase(userId, avatarValue);
  } catch (err) {
    console.warn("Supabase profile picture upload failed; saving existing avatar value.", err);
  }
  const avatarKey = normalizeProfileAvatarValue(resolvedAvatarValue);
  const normalized = normalizeUser({
    ...user,
    avatarKey,
    avatarUrl: resolveProfileAvatarUrl(avatarKey),
  });
  writeUser(normalized);
  try {
    await update(ref(db, `users/${userId}`), {
      avatarKey: normalized.avatarKey,
      avatarUrl: normalized.avatarUrl,
    });
  } catch (err) {
    console.warn("Failed to sync avatar settings", err);
  }
  return normalized;
}

export async function updateTaglineSettings(
  userId: string,
  payload: { enabled?: boolean; selected?: string },
): Promise<UserProfile | null> {
  const user = readUser();
  if (!user || user.id !== userId) return null;
  const normalized = normalizeUser(user);
  if (payload.enabled !== undefined) normalized.taglinesEnabled = payload.enabled;
  if (payload.selected !== undefined) normalized.selectedTagline = payload.selected;
  writeUser(normalized);
  try {
    await update(ref(db, `users/${userId}`), {
      taglinesEnabled: normalized.taglinesEnabled,
      selectedTagline: normalized.selectedTagline,
    });
  } catch (err) {
    console.warn("Failed to sync tagline settings", err);
  }
  return normalized;
}

export async function updateLessonProgress(
  userId: string,
  courseId: string,
  lessonId: string,
): Promise<CourseProgress> {
  return completeSubsection(userId, courseId, lessonId, "study");
}

export async function getDashboard(user: UserProfile) {
  const xpEvents = await fetchXpEvents(user.id);
  const history = buildXpHistory(xpEvents);
  const distribution = buildXpDistribution(xpEvents);

  const courses = await getCourses(undefined, undefined, user);
  const overrides = readSuggestions();
  let suggested = courses.slice(0, 3);
  if (overrides?.courseIds?.length) {
    const mapped = overrides.courseIds
      .map((id) => courses.find((c) => c.id === id))
      .filter(Boolean) as Course[];
    if (mapped.length) {
      suggested = mapped.slice(0, 3);
    }
  }
  const desired = Math.min(3, courses.length);
  if (suggested.length < desired) {
    const seen = new Set(suggested.map((c) => c.id));
    for (const course of courses) {
      if (suggested.length >= desired) break;
      if (!seen.has(course.id)) {
        suggested.push(course);
        seen.add(course.id);
      }
    }
  }
  return {
    profile: user,
    courses,
    xpHistory: history,
    xpDistribution: distribution,
    suggested,
  };
}

export function setSuggestedCourses(courseIds: string[], source?: string) {
  writeSuggestions(courseIds, source);
}

export async function getLeaderboard(user: UserProfile) {
  try {
    const snap = await get(ref(db, "users"));
    const val = (snap.val() || {}) as Record<string, UserProfile>;
    let list = Object.values(val || {}).filter((entry) => typeof entry?.totalXp === "number");
    if (user.groupId && user.accountType === "group") {
      list = list.filter((entry) => entry.groupId === user.groupId);
    } else {
      list = list.filter((entry) => entry.id === user.id);
    }
    const sorted = list.sort((a, b) => {
      const diff = (b.totalXp || 0) - (a.totalXp || 0);
      if (diff !== 0) return diff;
      const timeA = a.xpReachedAt ?? a.createdAt ?? 0;
      const timeB = b.xpReachedAt ?? b.createdAt ?? 0;
      return timeA - timeB;
    });
    return {
      locked: false,
      entries: sorted,
    };
  } catch (err) {
    console.warn("Failed to load leaderboard from Firebase", err);
    const selfEntry = {
      displayName: user.chessUsername || user.displayName,
      totalXp: user.totalXp,
      level: user.level,
    };
    const entries =
      user.groupId && user.accountType === "group"
        ? [selfEntry]
        : [
            { displayName: "AceKnight", totalXp: 900, level: 10 },
            { displayName: "ClubCrusher", totalXp: 740, level: 8 },
            { displayName: "TacticsTiger", totalXp: 620, level: 7 },
            selfEntry,
          ];
    return {
      locked: false,
      entries,
    };
  }
}

export async function getGlobalXpLeaderboard(limit = 500): Promise<UserProfile[]> {
  try {
    const snap = await get(ref(db, "users"));
    const val = (snap.val() || {}) as Record<string, UserProfile>;
    const list = Object.values(val || {}).filter((entry) => typeof entry?.totalXp === "number");
    const sorted = list.sort((a, b) => {
      const diff = (b.totalXp || 0) - (a.totalXp || 0);
      if (diff !== 0) return diff;
      const timeA = a.xpReachedAt ?? a.createdAt ?? 0;
      const timeB = b.xpReachedAt ?? b.createdAt ?? 0;
      return timeA - timeB;
    });
    return sorted.slice(0, limit);
  } catch (err) {
    console.warn("Failed to load global leaderboard from Firebase", err);
    return [
      {
        id: "u1",
        displayName: "AceKnight",
        email: "ace@example.com",
        totalXp: 52000,
        level: 521,
        pawns: 0,
        streak: 0,
        isAdmin: false,
      },
      {
        id: "u2",
        displayName: "DiamondDynamo",
        email: "dynamo@example.com",
        totalXp: 18000,
        level: 181,
        pawns: 0,
        streak: 0,
        isAdmin: false,
      },
      {
        id: "u3",
        displayName: "GoldGrinder",
        email: "grinder@example.com",
        totalXp: 4500,
        level: 46,
        pawns: 0,
        streak: 0,
        isAdmin: false,
      },
    ];
  }
}

export async function getClubLeaderboard(user?: UserProfile | null): Promise<ClubLeaderboardEntry[]> {
  const scoped = resolveClubScope(user);
  const fallback = () => readClubLeaderboardLocal(scoped);
  try {
    const snap = await get(ref(db, scoped.path));
    if (snap.exists()) {
      const val = snap.val() as Record<string, ClubLeaderboardEntry>;
      const list = Object.values(val || {}).map((entry) => normalizeClubEntry(entry || {}));
      writeClubLeaderboardLocal(list, scoped);
      return list;
    }
    return fallback();
  } catch (err) {
    console.warn("Failed to load group leaderboard from Firebase", err);
    if (scoped.scope === "group") {
      throw err;
    }
    return fallback();
  }
}

export async function addClubParticipant(
  admin: UserProfile | null,
  payload: { name: string; rating: number; performance?: number },
): Promise<ClubLeaderboardEntry[]> {
  const scoped = resolveClubScope(admin);
  if (scoped.scope === "group") {
    if (!hasGroupAdminAccess(admin)) throw new Error("Only group admins can add participants.");
  } else if (!hasSiteAdminAccess(admin)) {
    throw new Error("Only admins can add participants.");
  }
  const entry = normalizeClubEntry({ ...payload, addedBy: admin?.id });
  const list = [...readClubLeaderboardLocal(scoped), entry];
  try {
    await set(ref(db, `${scoped.path}/${entry.id}`), stripUndefinedShallow(entry));
  } catch (err) {
    console.warn("Failed to sync club participant to Firebase", err);
    if (scoped.scope === "group") {
      throw new Error("Could not save the group leaderboard. Check your access or connection.");
    }
  }
  writeClubLeaderboardLocal(list, scoped);
  return list;
}

export async function updateClubPerformance(
  admin: UserProfile | null,
  id: string,
  updates: { rating?: number; performance?: number },
): Promise<ClubLeaderboardEntry[]> {
  const scoped = resolveClubScope(admin);
  if (scoped.scope === "group") {
    if (!hasGroupAdminAccess(admin)) throw new Error("Only group admins can update performance.");
  } else if (!hasSiteAdminAccess(admin)) {
    throw new Error("Only admins can update performance.");
  }
  const existing = readClubLeaderboardLocal(scoped);
  const nextEntries = existing.map((entry) =>
    entry.id === id
      ? normalizeClubEntry({
          ...entry,
          rating: updates.rating !== undefined ? updates.rating : entry.rating,
          performance: updates.performance !== undefined ? updates.performance : entry.performance,
        })
      : entry,
  );
  const payload = stripUndefinedShallow({
    rating: updates.rating !== undefined ? Math.max(0, Math.round(updates.rating)) : undefined,
    performance: updates.performance !== undefined ? Math.round(updates.performance) : undefined,
  });
  try {
    await update(ref(db, `${scoped.path}/${id}`), payload);
  } catch (err) {
    console.warn("Failed to update club performance", err);
    if (scoped.scope === "group") {
      throw new Error("Could not update the group leaderboard. Check your access or connection.");
    }
  }
  writeClubLeaderboardLocal(nextEntries, scoped);
  return nextEntries;
}

export async function removeClubParticipant(admin: UserProfile | null, id: string): Promise<ClubLeaderboardEntry[]> {
  const scoped = resolveClubScope(admin);
  if (scoped.scope === "group") {
    if (!hasGroupAdminAccess(admin)) throw new Error("Only group admins can remove participants.");
  } else if (!hasSiteAdminAccess(admin)) {
    throw new Error("Only admins can remove participants.");
  }
  const existing = readClubLeaderboardLocal(scoped).filter((entry) => entry.id !== id);
  try {
    await remove(ref(db, `${scoped.path}/${id}`));
  } catch (err) {
    console.warn("Failed to remove club participant from Firebase", err);
    if (scoped.scope === "group") {
      throw new Error("Could not update the group leaderboard. Check your access or connection.");
    }
  }
  writeClubLeaderboardLocal(existing, scoped);
  return existing;
}

export async function getStandingsBoards(user?: UserProfile | null): Promise<StandingsBoard[]> {
  const scoped = resolveStandingsBoardsScope(user);
  const fallback = () => readStandingsBoardsLocal(scoped);
  if (scoped.scope !== "group") {
    return fallback();
  }
  try {
    const snap = await get(ref(db, scoped.path));
    if (snap.exists()) {
      const val = snap.val() as Record<string, StandingsBoard>;
      const boards = mergeStandingsBoards(Object.values(val || {}));
      writeStandingsBoardsLocal(boards, scoped);
      return boards;
    }
    const defaults = fallback();
    writeStandingsBoardsLocal(defaults, scoped);
    return defaults;
  } catch (err) {
    console.warn("Failed to load standings boards from Firebase", err);
    return fallback();
  }
}

export async function updateStandingsBoard(
  admin: UserProfile | null,
  boardId: string,
  names: string[],
): Promise<{ boards: StandingsBoard[]; localOnly: boolean }> {
  if (!hasGroupAdminAccess(admin)) throw new Error("Only admins can edit the standings.");
  const scoped = resolveStandingsBoardsScope(admin);
  if (scoped.scope !== "group") {
    throw new Error("Standings editing is only available inside a group.");
  }
  const current = mergeStandingsBoards(readStandingsBoardsLocal(scoped));
  const target = current.find((board) => board.id === boardId);
  if (!target) throw new Error("That leaderboard could not be found.");
  const trimmedNames = names.map((name) => name.trim()).filter(Boolean);
  const nextBoards = current.map((board) =>
    board.id === boardId
      ? normalizeStandingsBoard(
          {
            ...board,
            names: trimmedNames,
            updatedAt: Date.now(),
            updatedBy: admin.id,
          },
          board,
        )
      : board,
  );
  const payload = nextBoards.reduce<Record<string, ReturnType<typeof stripUndefinedShallow>>>((acc, board) => {
    acc[board.id] = stripUndefinedShallow({
      id: board.id,
      label: board.label,
      names: board.names,
      updatedAt: board.updatedAt,
      updatedBy: board.updatedBy,
    });
    return acc;
  }, {});
  writeStandingsBoardsLocal(nextBoards, scoped);
  try {
    await set(ref(db, scoped.path), payload);
  } catch (err) {
    console.warn("Failed to save standings boards to Firebase", err);
    const message = String((err as { code?: string; message?: string } | null)?.code || (err as { message?: string } | null)?.message || "").toLowerCase();
    if (message.includes("permission_denied") || message.includes("permission denied")) {
      return { boards: nextBoards, localOnly: true };
    }
    throw new Error("Could not save the leaderboard. Your changes were kept on this device.");
  }
  return { boards: nextBoards, localOnly: false };
}

export async function getSquareBaseBooks(user?: UserProfile | null): Promise<SquareBaseBook[]> {
  const scope = resolveScope(user);
  const { path } = scopedPath(SQUARE_BASE_PATH, user);
  const fallback = () => readSquareBaseLocal(scope);
  try {
    const snap = await get(ref(db, path));
    if (snap.exists()) {
      const val = snap.val() as Record<string, SquareBaseBook> | null;
      const list = Object.values(val || {}).map((b) => normalizeSquareBaseBook(b || {}));
      writeSquareBaseLocal(list, scope);
      return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    return fallback();
  } catch (err) {
    console.warn("Failed to load Square Base books from Firebase", err);
    return fallback();
  }
}

export function listenSquareBaseBooks(
  callback: (books: SquareBaseBook[]) => void,
  user?: UserProfile | null,
): () => void {
  const scope = resolveScope(user);
  const { path } = scopedPath(SQUARE_BASE_PATH, user);
  const refPath = ref(db, path);
  const off = onValue(
    refPath,
    (snap) => {
      const val = snap.val() as Record<string, SquareBaseBook> | null;
      const list = Object.values(val || {}).map((b) => normalizeSquareBaseBook(b || {}));
      writeSquareBaseLocal(list, scope);
      callback(list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    },
    () => {
      callback(readSquareBaseLocal(scope));
    },
  );
  return () => off();
}

export async function addSquareBaseBook(
  admin: UserProfile | null,
  payload: { title: string; url: string },
): Promise<SquareBaseBook> {
  const scope = resolveScope(admin);
  if (scope === "group") {
    if (!hasGroupAdminAccess(admin)) throw new Error("Only admins can add books.");
  } else if (!hasSiteAdminAccess(admin)) {
    throw new Error("Only admins can add books.");
  }
  const trimmedUrl = (payload.url || "").trim();
  if (!trimmedUrl) throw new Error("PDF URL is required.");
  const book = normalizeSquareBaseBook({
    ...payload,
    url: trimmedUrl,
    addedBy: admin.id,
    addedByName: admin.displayName || admin.email || "Admin",
  });
  const { path } = scopedPath(SQUARE_BASE_PATH, admin);
  const next = [...readSquareBaseLocal(scope), book];
  writeSquareBaseLocal(next, scope);
  try {
    await set(ref(db, `${path}/${book.id}`), stripUndefinedShallow(book));
  } catch (err) {
    console.warn("Failed to sync Square Base book to Firebase", err);
  }
  return book;
}

export async function removeSquareBaseBook(admin: UserProfile | null, id: string): Promise<void> {
  const scope = resolveScope(admin);
  if (scope === "group") {
    if (!hasGroupAdminAccess(admin)) throw new Error("Only admins can remove books.");
  } else if (!hasSiteAdminAccess(admin)) {
    throw new Error("Only admins can remove books.");
  }
  const { path } = scopedPath(SQUARE_BASE_PATH, admin);
  const filtered = readSquareBaseLocal(scope).filter((b) => b.id !== id);
  writeSquareBaseLocal(filtered, scope);
  try {
    await remove(ref(db, `${path}/${id}`));
  } catch (err) {
    console.warn("Failed to remove Square Base book from Firebase", err);
  }
}

export async function completeSubsection(
  userId: string,
  courseId: string,
  subsectionId: string,
  type: Subsection["type"],
): Promise<CourseProgress> {
  const record = await fetchProgress(userId);
  const course = await getCourse(courseId, readUser());
  const total = countTotalSubsections(course);
  const validIds = courseSubsectionIds(course);
  const existing = record[courseId] || { completedSubsections: {}, percent: 0 };
  // prune any stale completions that no longer exist in the course
  existing.completedSubsections = Object.fromEntries(
    Object.keys(existing.completedSubsections || {})
      .filter((id) => validIds.includes(id))
      .map((id) => [id, true]),
  );
  const alreadyCompleted = !!existing.completedSubsections[subsectionId];
  existing.completedSubsections[subsectionId] = true;
  const completedCount = Object.keys(existing.completedSubsections).length;
  existing.percent = total > 0 ? Math.min(100, Math.round((completedCount / total) * 100)) : 0;
  existing.lastUpdated = Date.now();
  record[courseId] = existing;
  await writeProgressForUser(userId, record);

  // If already completed, just return progress without extra XP
  if (!alreadyCompleted) {
    const xpGain = xpForSubsection(type);
    await awardXp(userId, xpGain, { source: "course_progress", courseId, subsectionId, type });
  }

  return {
    courseId,
    completedLessonIds: Object.keys(existing.completedSubsections),
    progressPercent: existing.percent,
    lastLessonId: subsectionId,
  };
}
