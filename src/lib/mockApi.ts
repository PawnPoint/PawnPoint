import { nanoid } from "./nanoid";
import { db } from "./firebase";
import { get, onValue, ref, remove, set, update } from "firebase/database";
import { DEFAULT_BOARD_THEME, resolveBoardTheme } from "./boardThemes";
import { DEFAULT_PIECE_THEME, resolvePieceTheme } from "./pieceThemes";

export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
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
  lastStreakAt?: number;
  pawns?: number;
  chessUsername?: string;
  onlineRating?: number;
  totalXp: number;
  level: number;
  isAdmin: boolean;
  createdAt?: number;
  xpReachedAt?: number;
  boardTheme?: string;
  pieceTheme?: string;
};

export type Group = {
  id: string;
  name: string;
  code: string;
  createdBy: string;
  createdAt: number;
};

export type GroupMember = {
  id: string;
  displayName: string;
  email?: string;
  role: "admin" | "member";
  joinedAt?: number;
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
  squareBase: "pawnpoint_square_base",
};

export const DEFAULT_COURSE_THUMBNAIL = "/pieces/wQ.png";

const COURSES_PATH = "courses";
const XP_HISTORY_PATH = "xpHistory";
const SQUARE_BASE_PATH = "squareBaseBooks";
const LOCAL_THUMBNAILS = ["/pieces/wB.png", "/pieces/bQ.png", "/pieces/wN.png", "/pieces/bK.png"];
const DEFAULT_GROUP_NAME = "My Group";
const MATCHMAKING_TIMEOUT_MS = 2 * 60 * 1000;

type DataScope = {
  scope: "group" | "personal" | "public";
  cacheKey: string;
  groupId?: string | null;
  userId?: string | null;
};
const sampleCourses: Course[] = [
  {
    id: "course-london",
    title: "The London System",
    description: "Club-ready white repertoire that keeps pressure and teaches universal plans.",
    category: "white_opening",
    difficulty: "beginner",
    thumbnailUrl: LOCAL_THUMBNAILS[0],
    accentColor: "#ec4899",
    lessons: [
      { id: "l1", title: "Why Play the London", summary: "Principles and key themes." },
      { id: "l2", title: "Typical Structures", summary: "Plans in classical pawn chains." },
      { id: "l3", title: "Model Game Review", summary: "Club-level example with blunders fixed." },
    ],
    chapters: {
      "london-1": {
        id: "london-1",
        title: "Foundations",
        index: 0,
        subsections: {
          "london-video-1": {
            id: "london-video-1",
            type: "video",
            title: "Why play the London",
            videoUrl: "https://www.youtube.com/embed/GlOQ8k8ZHbM",
            index: 0,
          },
        },
      },
      "london-2": {
        id: "london-2",
        title: "Plans vs ...d5 and ...g6",
        index: 1,
        subsections: {
          "london-video-2": {
            id: "london-video-2",
            type: "video",
            title: "Hitting kingside fianchettos",
            videoUrl: "https://www.youtube.com/embed/oo8g52D0F8E",
            index: 0,
          },
        },
      },
    },
  },
];

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

function readUser(): UserProfile | null {
  const raw = localStorage.getItem(STORAGE_KEYS.user);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as UserProfile;
    if (parsed.isAdmin === undefined) {
      parsed.isAdmin = false;
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
    const today = startOfDayMs(new Date());
    const lastStreakDay = startOfDayMs(new Date(parsed.lastStreakAt || parsed.createdAt || Date.now()));
    if (today - lastStreakDay > 24 * 60 * 60 * 1000) {
      parsed.streak = 0;
      parsed.lastStreakAt = lastStreakDay;
      writeUser(parsed);
    }
    if (parsed.pawns === undefined) {
      parsed.pawns = 0;
      writeUser(parsed);
    }
    if (parsed.accountType === undefined) {
      parsed.accountType = parsed.groupId ? "group" : undefined;
      writeUser(parsed);
    }
    parsed.groupId = parsed.groupId ?? null;
    parsed.groupCode = parsed.groupCode ?? null;
    parsed.groupName = parsed.groupName ?? null;
    parsed.groupRole = parsed.groupRole ?? null;
    parsed.unlockedPfps = parsed.unlockedPfps || [];
    parsed.unlockedTaglines = parsed.unlockedTaglines || [];
    parsed.unlockedVideos = parsed.unlockedVideos || [];
    parsed.unlockedSets = parsed.unlockedSets || [];
    parsed.taglinesEnabled = parsed.taglinesEnabled ?? true;
    parsed.selectedTagline = parsed.selectedTagline ?? "";
    parsed.onlineRating = typeof parsed.onlineRating === "number" ? parsed.onlineRating : 1000;
    parsed.boardTheme = resolveBoardTheme(parsed.boardTheme).key;
    parsed.pieceTheme = resolvePieceTheme(parsed.pieceTheme).key;
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
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
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
  if (trimmed.startsWith("/") || trimmed.startsWith("data:")) return trimmed;
  return DEFAULT_COURSE_THUMBNAIL;
}

function cleanSubsection(sub: Subsection): Subsection {
  const base: any = { ...sub };
  if (typeof base.index !== "number") {
    delete base.index;
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
    const chapters: Record<string, Chapter> = {};
    Object.entries(course.chapters || {}).forEach(([chId, chapter]) => {
      if (!chapter) return;
      const subsections: Record<string, Subsection> = {};
      Object.entries(chapter.subsections || {}).forEach(([subId, sub]) => {
        if (!sub) return;
        subsections[subId] = cleanSubsection(sub);
      });
      chapters[chId] = { ...chapter, subsections: reindexSubsections(subsections) };
    });
    next[id] = {
      ...course,
      thumbnailUrl: sanitizeThumbnail(course.thumbnailUrl),
      chapters,
    };
  });
  return next;
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

const REMOVED_COURSE_IDS = new Set([
  "course-trompowsky",
  "course-pieces",
  "course-dragon",
  "course-skills",
  "course-endgame",
]);

const SAMPLE_COURSE_RECORD = stripUndefinedDeep(normalizeCourseRecord(toRecord(sampleCourses)));

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
      return patched;
    }
    // if nothing exists, return empty (no auto-seed)
    return {};
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

export function listenCourses(callback: (courses: Course[]) => void, user?: UserProfile | null): () => void {
  const scope = resolveScope(user);
  const { path } = scopedPath(COURSES_PATH, user);
  const coursesRef = ref(db, path);
  const off = onValue(
    coursesRef,
    (snap) => {
      const val = snap.val();
      if (val) {
        const record = Array.isArray(val) ? toRecord(val.filter(Boolean) as Course[]) : (val as CourseRecord);
        callback(toList(stripUndefinedDeep(normalizeCourseRecord(record))));
      }
    },
    () => {
      const local = toList(stripUndefinedDeep(readCoursesLocal(scope)));
      callback(local);
    },
  );
  return () => off();
}

export function listenCourse(
  courseId: string,
  callback: (course: Course | null) => void,
  user?: UserProfile | null,
): () => void {
  const scope = resolveScope(user);
  const { path } = scopedPath(`${COURSES_PATH}/${courseId}`, user);
  const courseRef = ref(db, path);
  const off = onValue(
    courseRef,
    (snap) => {
      const val = snap.val() as Course | null;
      const normalized =
        val && val.id
          ? stripUndefinedDeep(normalizeCourseRecord({ [val.id]: val as Course })[val.id])
          : val
            ? { ...val, thumbnailUrl: DEFAULT_COURSE_THUMBNAIL }
            : null;
      callback(normalized || null);
    },
    () => {
      const local = readCoursesLocal(scope);
      callback(local[courseId] || null);
    },
  );
  return () => off();
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

type XpEvent = {
  id?: string;
  ts: number;
  amount: number;
  courseId?: string;
  subsectionId?: string;
  source?: string;
  type?: Subsection["type"];
};

const XP_HISTORY_RETENTION_DAYS = 7;

function startOfDayMs(date: Date): number {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
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
  const payload: XpEvent = {
    ts,
    amount: Math.max(0, event.amount),
  };
  if (event.courseId) payload.courseId = event.courseId;
  if (event.subsectionId) payload.subsectionId = event.subsectionId;
  if (event.type) payload.type = event.type;
  if (event.source) payload.source = event.source;
  const id = nanoid();
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
  options?: { source?: string; courseId?: string; subsectionId?: string; type?: Subsection["type"] },
) {
  const xpGain = Math.max(0, amount);
  if (!xpGain) return;
  const today = startOfDayMs(new Date());
  const userNodeRef = ref(db, `users/${userId}`);
  let nextStreak = 1;
  try {
    const snap = await get(userNodeRef);
    const existingUser = snap.val() || {};
    const priorStreak = existingUser.streak || 0;
    const lastStreakAt = startOfDayMs(
      new Date(existingUser.lastStreakAt || existingUser.xpReachedAt || existingUser.createdAt || 0),
    );
    if (lastStreakAt === today) {
      nextStreak = priorStreak || 1;
    } else if (today - lastStreakAt === 24 * 60 * 60 * 1000) {
      nextStreak = (priorStreak || 0) + 1;
    } else {
      nextStreak = 1;
    }
    const newTotal = (existingUser.totalXp || 0) + xpGain;
    await persistTotalXp(userId, newTotal, { streak: nextStreak, lastStreakAt: today });
  } catch (err) {
    console.warn("Failed to update XP in Firebase, continuing locally", err);
    const localUser = readUser();
    const baseTotal = localUser && localUser.id === userId ? localUser.totalXp || 0 : 0;
    const lastStreakAt =
      localUser?.lastStreakAt !== undefined
        ? startOfDayMs(new Date(localUser.lastStreakAt))
        : startOfDayMs(new Date(localUser?.xpReachedAt || localUser?.createdAt || 0));
    if (localUser) {
      if (lastStreakAt === today) {
        nextStreak = localUser.streak || 1;
      } else if (today - lastStreakAt === 24 * 60 * 60 * 1000) {
        nextStreak = (localUser.streak || 0) + 1;
      } else {
        nextStreak = 1;
      }
    }
    await persistTotalXp(userId, baseTotal + xpGain, { streak: nextStreak, lastStreakAt: today });
  }
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
  if (!course?.chapters) return 0;
  return Object.values(course.chapters).reduce((sum, ch) => sum + Object.keys(ch.subsections || {}).length, 0);
}

function courseSubsectionIds(course: Course | null): string[] {
  if (!course?.chapters) return [];
  return Object.values(course.chapters).flatMap((ch) => Object.keys(ch.subsections || {}));
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
  const baseProfile: UserProfile =
    localUser && localUser.email === email
      ? {
          ...localUser,
          accountType: localUser.accountType ?? (localUser.groupId ? "group" : undefined),
          groupId: localUser.groupId ?? null,
          groupCode: localUser.groupCode ?? null,
          groupName: localUser.groupName ?? null,
          groupRole: localUser.groupRole ?? (localUser.groupId ? "member" : null),
          isAdmin: localUser.isAdmin ?? false,
          chessUsername: localUser.chessUsername || localUser.displayName || localUser.email.split("@")[0],
          createdAt: localUser.createdAt ?? Date.now(),
          xpReachedAt: localUser.xpReachedAt ?? localUser.createdAt ?? Date.now(),
          unlockedPfps: localUser.unlockedPfps || [],
          unlockedTaglines: localUser.unlockedTaglines || [],
          unlockedVideos: localUser.unlockedVideos || [],
          unlockedSets: localUser.unlockedSets || [],
          selectedTagline: localUser.selectedTagline ?? "",
          taglinesEnabled: localUser.taglinesEnabled ?? true,
          onlineRating: typeof localUser.onlineRating === "number" ? localUser.onlineRating : 1000,
          boardTheme: resolveBoardTheme(localUser.boardTheme).key,
          pieceTheme: resolvePieceTheme(localUser.pieceTheme).key,
        }
      : {
          id: idOverride || nanoid(),
          email,
          displayName: displayName || email.split("@")[0],
          chessUsername: displayName || email.split("@")[0],
          avatarUrl: undefined,
          totalXp: 120,
          level: 2,
          streak: 1,
          pawns: 0,
          onlineRating: 1000,
          isAdmin: false,
          createdAt: Date.now(),
          xpReachedAt: Date.now(),
          accountType: undefined,
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
          lastStreakAt: startOfDayMs(new Date()),
          boardTheme: DEFAULT_BOARD_THEME,
          pieceTheme: DEFAULT_PIECE_THEME,
        };

  const userNodeRef = ref(db, `users/${baseProfile.id}`);
  try {
    const snap = await get(userNodeRef);
    const remote = snap.val() as UserProfile | null;
    const inferredAccountType =
      remote?.accountType ??
      baseProfile.accountType ??
      (remote?.groupId || baseProfile.groupId ? "group" : undefined);
    const merged: UserProfile = {
      ...baseProfile,
      ...(remote || {}),
      email: baseProfile.email,
      displayName: baseProfile.displayName || remote?.displayName || baseProfile.email.split("@")[0],
      chessUsername:
        remote?.chessUsername || baseProfile.chessUsername || baseProfile.displayName || baseProfile.email.split("@")[0],
      createdAt: remote?.createdAt ?? baseProfile.createdAt,
      xpReachedAt: remote?.xpReachedAt ?? baseProfile.xpReachedAt ?? baseProfile.createdAt ?? Date.now(),
      pawns: remote?.pawns ?? baseProfile.pawns ?? 0,
      onlineRating: remote?.onlineRating ?? baseProfile.onlineRating ?? 1000,
      totalXp: remote?.totalXp ?? baseProfile.totalXp,
      level: remote?.level ?? baseProfile.level,
      // group/account scope
      accountType: inferredAccountType,
      groupId: remote?.groupId ?? baseProfile.groupId ?? null,
      groupCode: remote?.groupCode ?? baseProfile.groupCode ?? null,
      groupName: remote?.groupName ?? baseProfile.groupName ?? null,
      groupRole: remote?.groupRole ?? baseProfile.groupRole ?? (remote?.groupId || baseProfile.groupId ? "member" : null),
      unlockedPfps: remote?.unlockedPfps || baseProfile.unlockedPfps || [],
      unlockedTaglines: remote?.unlockedTaglines || baseProfile.unlockedTaglines || [],
      unlockedVideos: remote?.unlockedVideos || baseProfile.unlockedVideos || [],
      unlockedSets: remote?.unlockedSets || baseProfile.unlockedSets || [],
      selectedTagline: remote?.selectedTagline ?? baseProfile.selectedTagline ?? "",
      taglinesEnabled: remote?.taglinesEnabled ?? baseProfile.taglinesEnabled ?? true,
      lastStreakAt: remote?.lastStreakAt ?? baseProfile.lastStreakAt ?? startOfDayMs(new Date()),
      boardTheme: resolveBoardTheme(remote?.boardTheme || baseProfile.boardTheme).key,
      pieceTheme: resolvePieceTheme(remote?.pieceTheme || baseProfile.pieceTheme).key,
    };
    writeUser(merged);
    const safePayload = stripUndefinedShallow(merged);
    await update(userNodeRef, safePayload);
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
  const updated: UserProfile = { ...user, isAdmin };
  writeUser(updated);
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
  const updated: UserProfile = { ...user, chessUsername: username, displayName: user.displayName || username };
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

export async function choosePersonalAccount(): Promise<UserProfile | null> {
  const user = readUser();
  if (!user) return null;
  const nextIsAdmin = user.groupRole === "admin" ? false : user.isAdmin;
  const updated: UserProfile = {
    ...user,
    accountType: "personal",
    groupId: null,
    groupCode: null,
    groupName: null,
    groupRole: null,
    isAdmin: nextIsAdmin,
  };
  writeUser(updated);
  try {
    await update(ref(db, `users/${user.id}`), {
      accountType: "personal",
      groupId: null,
      groupCode: null,
      groupName: null,
      groupRole: null,
      isAdmin: updated.isAdmin,
    });
  } catch (err) {
    console.warn("Failed to persist personal account choice", err);
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
  const updated: UserProfile = {
    ...user,
    accountType: "group",
    groupId,
    groupCode: group.code,
    groupName: group.name,
    groupRole: "admin",
    isAdmin: true,
  };
  writeUser(updated);
  try {
    await update(ref(db, `users/${user.id}`), {
      accountType: "group",
      groupId,
      groupCode: group.code,
      groupName: group.name,
      groupRole: "admin",
      isAdmin: true,
    });
  } catch (err) {
    console.warn("Failed to sync group details to user profile", err);
  }
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
  const group: Group = {
    id: groupId,
    name: groupData.name || DEFAULT_GROUP_NAME,
    code: groupData.code || formatGroupCode(digits),
    createdBy: groupData.createdBy,
    createdAt: groupData.createdAt || Date.now(),
  };
  const member: GroupMember = {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    role: "member",
    joinedAt: Date.now(),
  };
  try {
    await update(ref(db, `groups/${groupId}/members/${user.id}`), member);
  } catch (err) {
    console.warn("Failed to record membership in Firebase", err);
  }
  const updated: UserProfile = {
    ...user,
    accountType: "group",
    groupId,
    groupCode: group.code,
    groupName: group.name,
    groupRole: "member",
  };
  writeUser(updated);
  try {
    await update(ref(db, `users/${user.id}`), {
      accountType: "group",
      groupId,
      groupCode: group.code,
      groupName: group.name,
      groupRole: "member",
    });
  } catch (err) {
    console.warn("Failed to sync group join to user profile", err);
  }
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
  const nextIsAdmin = user.groupRole === "admin" ? false : user.isAdmin;
  const updated: UserProfile = {
    ...user,
    accountType: "personal",
    groupId: null,
    groupCode: null,
    groupName: null,
    groupRole: null,
    isAdmin: nextIsAdmin,
  };
  writeUser(updated);
  try {
    await update(ref(db, `users/${user.id}`), {
      accountType: "personal",
      groupId: null,
      groupCode: null,
      groupName: null,
      groupRole: null,
      isAdmin: updated.isAdmin,
    });
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
      isAdmin: false,
    });
  } catch (err) {
    console.warn("Failed to reset member profile after removal", err);
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
          isAdmin: false,
        });
      } catch (err) {
        console.warn("Failed to reset member after deletion", err);
      }
    }),
  );
  const nextIsAdmin = admin.groupRole === "admin" ? false : admin.isAdmin;
  const updated: UserProfile = {
    ...admin,
    accountType: "personal",
    groupId: null,
    groupCode: null,
    groupName: null,
    groupRole: null,
    isAdmin: nextIsAdmin,
  };
  writeUser(updated);
  try {
    await update(ref(db, `users/${admin.id}`), {
      accountType: "personal",
      groupId: null,
      groupCode: null,
      groupName: null,
      groupRole: null,
      isAdmin: updated.isAdmin,
    });
  } catch (err) {
    console.warn("Failed to sync profile after deleting group", err);
  }
  await fetchCourseRecord(updated).catch(() => undefined);
  return updated;
}

export async function getCourses(search?: string, category?: string, user?: UserProfile | null): Promise<Course[]> {
  const record = await fetchCourseRecord(user);
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
  const record = await fetchCourseRecord(user);
  return record[id] || null;
}

export async function createCourse(course: Omit<Course, "id"> & { id?: string }): Promise<Course> {
  const user = readUser();
  const record = await fetchCourseRecord(user);
  const newCourse: Course = {
    ...course,
    id: course.id || nanoid(),
    lessons: course.lessons.map((lesson) => ({ ...lesson, id: lesson.id || nanoid() })),
  };
  const normalizedCourse: Course = {
    ...newCourse,
    thumbnailUrl: sanitizeThumbnail(newCourse.thumbnailUrl),
  };
  record[normalizedCourse.id] = normalizedCourse;
  await writeCourseRecord(record, user);
  return normalizedCourse;
}

export async function updateCourse(course: Course): Promise<Course> {
  const user = readUser();
  const record = await fetchCourseRecord(user);
  const normalizedCourse: Course = {
    ...course,
    thumbnailUrl: sanitizeThumbnail(course.thumbnailUrl),
  };
  record[normalizedCourse.id] = normalizedCourse;
  await writeCourseRecord(record, user);
  return record[course.id];
}

export async function deleteCourse(id: string): Promise<void> {
  const user = readUser();
  const record = await fetchCourseRecord(user);
  delete record[id];
  await writeCourseRecord(record, user);
}

export async function addChapter(courseId: string, title: string, index: number): Promise<Chapter | null> {
  const user = readUser();
  const record = await fetchCourseRecord(user);
  const course = record[courseId];
  if (!course) return null;
  const chapterId = nanoid();
  const chapter: Chapter = { id: chapterId, title, index, subsections: {} };
  const chapters = course.chapters || {};
  chapters[chapterId] = chapter;
  record[courseId] = { ...course, chapters };
  await writeCourseRecord(record, user);
  return chapter;
}

export async function deleteChapter(courseId: string, chapterId: string): Promise<void> {
  const user = readUser();
  const record = await fetchCourseRecord(user);
  const course = record[courseId];
  if (!course?.chapters) return;
  delete course.chapters[chapterId];
  record[courseId] = { ...course };
  await writeCourseRecord(record, user);
}

export async function updateChapter(
  courseId: string,
  chapterId: string,
  updates: Partial<Pick<Chapter, "title" | "index">>,
): Promise<Chapter | null> {
  const user = readUser();
  const record = await fetchCourseRecord(user);
  const course = record[courseId];
  if (!course?.chapters?.[chapterId]) return null;
  const nextChapter = { ...course.chapters[chapterId], ...updates };
  course.chapters[chapterId] = nextChapter;
  record[courseId] = { ...course };
  await writeCourseRecord(record, user);
  return nextChapter;
}

export async function saveSubsection(
  courseId: string,
  chapterId: string,
  subsection: Subsection,
): Promise<Subsection | null> {
  const user = readUser();
  const record = await fetchCourseRecord(user);
  const course = record[courseId];
  if (!course) return null;
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
  chapters[chapterId] = { ...chapter, subsections: reindexed };
  record[courseId] = { ...course, chapters };
  await writeCourseRecord(record, user);
  return reindexed[id];
}

export async function reorderSubsections(
  courseId: string,
  chapterId: string,
  orderedIds: string[],
): Promise<Record<string, Subsection> | null> {
  const user = readUser();
  const record = await fetchCourseRecord(user);
  const course = record[courseId];
  const chapter = course?.chapters?.[chapterId];
  const subs = chapter?.subsections;
  if (!course || !chapter || !subs) return null;

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
  course.chapters![chapterId] = { ...chapter, subsections: reindexed };
  record[courseId] = { ...course };
  await writeCourseRecord(record, user);
  return reindexed;
}

export async function deleteSubsection(courseId: string, chapterId: string, subsectionId: string): Promise<void> {
  const user = readUser();
  const record = await fetchCourseRecord(user);
  const course = record[courseId];
  if (!course?.chapters?.[chapterId]?.subsections) return;
  delete course.chapters[chapterId].subsections![subsectionId];
  record[courseId] = { ...course };
  await writeCourseRecord(record, user);
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
  return {
    ...u,
    unlockedPfps: u.unlockedPfps || [],
    unlockedTaglines: u.unlockedTaglines || [],
    unlockedVideos: u.unlockedVideos || [],
    unlockedSets: u.unlockedSets || [],
    selectedTagline: u.selectedTagline ?? "",
    taglinesEnabled: u.taglinesEnabled ?? true,
    onlineRating: typeof u.onlineRating === "number" ? u.onlineRating : 1000,
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
  const history = buildXpHistory(xpEvents, { startFrom: user.createdAt });
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
  const scope = resolveScope(user);
  const { path } = scopedPath("clubLeaderboard", user);
  const fallback = () => readClubLeaderboardLocal(scope);
  try {
    const snap = await get(ref(db, path));
    if (snap.exists()) {
      const val = snap.val() as Record<string, ClubLeaderboardEntry>;
      const list = Object.values(val || {}).map((entry) => normalizeClubEntry(entry || {}));
      writeClubLeaderboardLocal(list, scope);
      return list;
    }
    return fallback();
  } catch (err) {
    console.warn("Failed to load club leaderboard from Firebase", err);
    return fallback();
  }
}

export async function addClubParticipant(
  admin: UserProfile | null,
  payload: { name: string; rating: number; performance?: number },
): Promise<ClubLeaderboardEntry[]> {
  if (!admin?.isAdmin) throw new Error("Only admins can add participants.");
  const entry = normalizeClubEntry({ ...payload, addedBy: admin.id });
  const scope = resolveScope(admin);
  const { path } = scopedPath("clubLeaderboard", admin);
  const list = [...readClubLeaderboardLocal(scope), entry];
  writeClubLeaderboardLocal(list, scope);
  try {
    await set(ref(db, `${path}/${entry.id}`), stripUndefinedShallow(entry));
  } catch (err) {
    console.warn("Failed to sync club participant to Firebase", err);
  }
  return list;
}

export async function updateClubPerformance(
  admin: UserProfile | null,
  id: string,
  updates: { rating?: number; performance?: number },
): Promise<ClubLeaderboardEntry[]> {
  if (!admin?.isAdmin) throw new Error("Only admins can update performance.");
  const scope = resolveScope(admin);
  const { path } = scopedPath("clubLeaderboard", admin);
  const existing = readClubLeaderboardLocal(scope);
  const nextEntries = existing.map((entry) =>
    entry.id === id
      ? normalizeClubEntry({
          ...entry,
          rating: updates.rating !== undefined ? updates.rating : entry.rating,
          performance: updates.performance !== undefined ? updates.performance : entry.performance,
        })
      : entry,
  );
  writeClubLeaderboardLocal(nextEntries);
  const payload = stripUndefinedShallow({
    rating: updates.rating !== undefined ? Math.max(0, Math.round(updates.rating)) : undefined,
    performance: updates.performance !== undefined ? Math.round(updates.performance) : undefined,
  });
  try {
    await update(ref(db, `${path}/${id}`), payload);
  } catch (err) {
    console.warn("Failed to update club performance", err);
  }
  return nextEntries;
}

export async function removeClubParticipant(admin: UserProfile | null, id: string): Promise<ClubLeaderboardEntry[]> {
  if (!admin?.isAdmin) throw new Error("Only admins can remove participants.");
  const scope = resolveScope(admin);
  const { path } = scopedPath("clubLeaderboard", admin);
  const existing = readClubLeaderboardLocal(scope).filter((entry) => entry.id !== id);
  writeClubLeaderboardLocal(existing, scope);
  try {
    await remove(ref(db, `${path}/${id}`));
  } catch (err) {
    console.warn("Failed to remove club participant from Firebase", err);
  }
  return existing;
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
  if (!admin?.isAdmin) throw new Error("Only admins can add books.");
  const trimmedUrl = (payload.url || "").trim();
  if (!trimmedUrl) throw new Error("PDF URL is required.");
  const book = normalizeSquareBaseBook({
    ...payload,
    url: trimmedUrl,
    addedBy: admin.id,
    addedByName: admin.displayName || admin.email || "Admin",
  });
  const scope = resolveScope(admin);
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
  if (!admin?.isAdmin) throw new Error("Only admins can remove books.");
  const scope = resolveScope(admin);
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
