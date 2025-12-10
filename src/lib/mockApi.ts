import { nanoid } from "./nanoid";
import { db } from "./firebase";
import { get, onValue, ref, remove, set, update } from "firebase/database";
import { DEFAULT_BOARD_THEME, resolveBoardTheme } from "./boardThemes";

export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  unlockedPfps?: string[];
  unlockedTaglines?: string[];
  unlockedVideos?: string[];
  unlockedSets?: string[];
  selectedTagline?: string;
  taglinesEnabled?: boolean;
  streak?: number;
  pawns?: number;
  chessUsername?: string;
  subscriptionPlan: "free" | "monthly" | "yearly";
  subscriptionActive: boolean;
  totalXp: number;
  level: number;
  isAdmin: boolean;
  createdAt?: number;
  xpReachedAt?: number;
  boardTheme?: string;
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
    }
  | {
      id: string;
      type: "study";
      title: string;
      pgn: string;
      index?: number;
    }
  | {
      id: string;
      type: "quiz";
      title: string;
      fen?: string;
      index?: number;
      trainerNote?: string;
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

const STORAGE_KEYS = {
  user: "pawnpoint_user",
  progress: "pawnpoint_progress",
  courses: "pawnpoint_courses",
  subscription: "pawnpoint_subscription",
  suggestions: "pawnpoint_suggestions",
  xpHistory: "pawnpoint_xp_history",
};

export const DEFAULT_COURSE_THUMBNAIL = "/pieces/wQ.png";

const COURSES_PATH = "courses";
const XP_HISTORY_PATH = "xpHistory";
const LOCAL_THUMBNAILS = ["/pieces/wB.png", "/pieces/bQ.png", "/pieces/wN.png", "/pieces/bK.png"];
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
  },
  {
    id: "course-dragon",
    title: "The Sicilian Dragon",
    description: "Dynamic counter-attacking weapon with clear tactical motifs.",
    category: "black_opening",
    difficulty: "intermediate",
    thumbnailUrl: LOCAL_THUMBNAILS[1],
    accentColor: "#34d399",
    lessons: [
      { id: "l4", title: "Move Order Basics", summary: "How to reach the Dragon safely." },
      { id: "l5", title: "Yugoslav Plans", summary: "Attacking setups and typical breaks." },
      { id: "l6", title: "Dragon Tactics Pack", summary: "Tactical drills you must know." },
    ],
  },
  {
    id: "course-skills",
    title: "Pawn Point Skills Lab",
    description: "Short drills to sharpen calculation, pattern spotting, and endgame instincts.",
    category: "skills",
    difficulty: "beginner",
    thumbnailUrl: LOCAL_THUMBNAILS[2],
    accentColor: "#a855f7",
    lessons: [
      { id: "l7", title: "Tactics Warmup", summary: "Pins, forks, and mates-in-two." },
      { id: "l8", title: "Endgame Basics", summary: "King activity and pawn races." },
      { id: "l9", title: "Defense Builder", summary: "Finding resources under pressure." },
    ],
  },
  {
    id: "course-endgame",
    title: "Endgame Essentials",
    description: "Build confidence in simplified positions with practical club scenarios.",
    category: "endgame",
    difficulty: "beginner",
    thumbnailUrl: LOCAL_THUMBNAILS[3],
    accentColor: "#06b6d4",
    lessons: [
      { id: "l10", title: "Opposition and Shouldering", summary: "King activity fundamentals." },
      { id: "l11", title: "Rook Endgame Traps", summary: "Practical drawing tricks." },
      { id: "l12", title: "Converting Small Edges", summary: "Technique at +1." },
    ],
  },
];

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
    if (parsed.pawns === undefined) {
      parsed.pawns = 0;
      writeUser(parsed);
    }
    parsed.unlockedPfps = parsed.unlockedPfps || [];
    parsed.unlockedTaglines = parsed.unlockedTaglines || [];
    parsed.unlockedVideos = parsed.unlockedVideos || [];
    parsed.unlockedSets = parsed.unlockedSets || [];
    parsed.taglinesEnabled = parsed.taglinesEnabled ?? true;
    parsed.selectedTagline = parsed.selectedTagline ?? "";
    parsed.boardTheme = resolveBoardTheme(parsed.boardTheme).key;
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

function toRecord(list: Course[]): CourseRecord {
  return list.reduce<CourseRecord>((acc, course) => {
    acc[course.id] = course;
    return acc;
  }, {});
}

function toList(record: CourseRecord): Course[] {
  return Object.values(record || {});
}

function readCoursesLocal(): CourseRecord {
  const raw = localStorage.getItem(STORAGE_KEYS.courses);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as CourseRecord | Course[];
    if (Array.isArray(parsed)) return normalizeCourseRecord(toRecord(parsed.filter(Boolean) as Course[]));
    return normalizeCourseRecord(parsed || {});
  } catch {
    return {};
  }
}

function writeCoursesLocal(record: CourseRecord) {
  try {
    const normalized = normalizeCourseRecord(record);
    const safe = stripUndefinedDeep(normalized);
    localStorage.setItem(STORAGE_KEYS.courses, JSON.stringify(safe));
  } catch {
    // ignore local write errors
  }
}

async function fetchCourseRecord(): Promise<CourseRecord> {
  try {
    const snap = await get(ref(db, COURSES_PATH));
    if (snap.exists()) {
      const val = snap.val() as CourseRecord | Course[];
      const record = Array.isArray(val) ? toRecord(val.filter(Boolean) as Course[]) : (val || {});
      return stripUndefinedDeep(normalizeCourseRecord(record));
    }
    // seed with sample courses if empty
    const seed = stripUndefinedDeep(normalizeCourseRecord(toRecord(sampleCourses)));
    await set(ref(db, COURSES_PATH), seed);
    writeCoursesLocal(seed);
    return seed;
  } catch (err) {
    const local = stripUndefinedDeep(normalizeCourseRecord(readCoursesLocal()));
    if (Object.keys(local).length) {
      return local;
    }
    console.warn("Failed to fetch courses from Firebase, using samples.", err);
    const fallback = stripUndefinedDeep(normalizeCourseRecord(toRecord(sampleCourses)));
    writeCoursesLocal(fallback);
    return fallback;
  }
}

async function writeCourseRecord(record: CourseRecord): Promise<void> {
  const normalized = normalizeCourseRecord(record);
  // Firebase disallows undefined in payloads; strip them deeply
  const safePayload = stripUndefinedDeep(normalized);
  try {
    await set(ref(db, COURSES_PATH), safePayload);
    writeCoursesLocal(safePayload);
  } catch (err) {
    writeCoursesLocal(safePayload);
    console.error("Failed to write courses to Firebase; saved locally instead.", err);
    throw new Error("Cloud save failed. Check network/Firebase rules.");
  }
}

export function listenCourses(callback: (courses: Course[]) => void): () => void {
  const coursesRef = ref(db, COURSES_PATH);
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
      const local = toList(stripUndefinedDeep(readCoursesLocal()));
      callback(local.length ? local : sampleCourses);
    },
  );
  return () => off();
}

export function listenCourse(courseId: string, callback: (course: Course | null) => void): () => void {
  const courseRef = ref(db, `${COURSES_PATH}/${courseId}`);
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
      const local = readCoursesLocal();
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
    ...event,
    ts,
    amount: Math.max(0, event.amount),
  };
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

async function persistTotalXp(userId: string, newTotal: number) {
  const timestamp = Date.now();
  const level = Math.floor(newTotal / 100) + 1;
  const payload = { totalXp: newTotal, level, xpReachedAt: timestamp };
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
  const userNodeRef = ref(db, `users/${userId}`);
  try {
    const snap = await get(userNodeRef);
    const existingUser = snap.val() || {};
    const newTotal = (existingUser.totalXp || 0) + xpGain;
    await persistTotalXp(userId, newTotal);
  } catch (err) {
    console.warn("Failed to update XP in Firebase, continuing locally", err);
    const localUser = readUser();
    const baseTotal = localUser && localUser.id === userId ? localUser.totalXp || 0 : 0;
    await persistTotalXp(userId, baseTotal + xpGain);
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
          boardTheme: resolveBoardTheme(localUser.boardTheme).key,
        }
      : {
          id: idOverride || nanoid(),
          email,
          displayName: displayName || email.split("@")[0],
          chessUsername: displayName || email.split("@")[0],
          avatarUrl: undefined,
          subscriptionPlan: "free",
          subscriptionActive: false,
          totalXp: 120,
          level: 2,
          streak: 1,
          pawns: 0,
          isAdmin: false,
          createdAt: Date.now(),
          xpReachedAt: Date.now(),
          unlockedPfps: [],
          unlockedTaglines: [],
          unlockedVideos: [],
          unlockedSets: [],
          selectedTagline: "",
          taglinesEnabled: true,
          boardTheme: DEFAULT_BOARD_THEME,
        };

  const userNodeRef = ref(db, `users/${baseProfile.id}`);
  try {
    const snap = await get(userNodeRef);
    const remote = snap.val() as UserProfile | null;
    const merged: UserProfile = {
      ...baseProfile,
      ...(remote || {}),
      email: baseProfile.email,
      displayName: baseProfile.displayName || remote?.displayName || baseProfile.email.split("@")[0],
      chessUsername:
        baseProfile.chessUsername || remote?.chessUsername || baseProfile.displayName || baseProfile.email.split("@")[0],
      createdAt: remote?.createdAt ?? baseProfile.createdAt,
      xpReachedAt: remote?.xpReachedAt ?? baseProfile.xpReachedAt ?? baseProfile.createdAt ?? Date.now(),
      pawns: remote?.pawns ?? baseProfile.pawns ?? 0,
      totalXp: remote?.totalXp ?? baseProfile.totalXp,
      level: remote?.level ?? baseProfile.level,
      subscriptionActive: remote?.subscriptionActive ?? baseProfile.subscriptionActive,
      subscriptionPlan: remote?.subscriptionPlan ?? baseProfile.subscriptionPlan,
      unlockedPfps: remote?.unlockedPfps || baseProfile.unlockedPfps || [],
      unlockedTaglines: remote?.unlockedTaglines || baseProfile.unlockedTaglines || [],
      unlockedVideos: remote?.unlockedVideos || baseProfile.unlockedVideos || [],
      unlockedSets: remote?.unlockedSets || baseProfile.unlockedSets || [],
      selectedTagline: remote?.selectedTagline ?? baseProfile.selectedTagline ?? "",
      taglinesEnabled: remote?.taglinesEnabled ?? baseProfile.taglinesEnabled ?? true,
      boardTheme: resolveBoardTheme(remote?.boardTheme || baseProfile.boardTheme).key,
    };
    writeUser(merged);
    await update(userNodeRef, merged);
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

export async function setChessUsername(username: string): Promise<UserProfile | null> {
  const user = readUser();
  if (!user) return null;
  const updated: UserProfile = { ...user, chessUsername: username, displayName: user.displayName || username };
  writeUser(updated);
  return updated;
}

export async function updateBoardTheme(theme: string): Promise<UserProfile | null> {
  const user = readUser();
  if (!user) return null;
  const resolved = resolveBoardTheme(theme).key;
  const updated: UserProfile = { ...user, boardTheme: resolved };
  writeUser(updated);
  try {
    await update(ref(db, `users/${user.id}`), { boardTheme: resolved });
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

export async function getCourses(search?: string, category?: string): Promise<Course[]> {
  const record = await fetchCourseRecord();
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

export async function getCourse(id: string): Promise<Course | null> {
  const record = await fetchCourseRecord();
  return record[id] || null;
}

export async function createCourse(course: Omit<Course, "id"> & { id?: string }): Promise<Course> {
  const record = await fetchCourseRecord();
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
  await writeCourseRecord(record);
  return normalizedCourse;
}

export async function updateCourse(course: Course): Promise<Course> {
  const record = await fetchCourseRecord();
  const normalizedCourse: Course = {
    ...course,
    thumbnailUrl: sanitizeThumbnail(course.thumbnailUrl),
  };
  record[normalizedCourse.id] = normalizedCourse;
  await writeCourseRecord(record);
  return record[course.id];
}

export async function deleteCourse(id: string): Promise<void> {
  const record = await fetchCourseRecord();
  delete record[id];
  await writeCourseRecord(record);
}

export async function addChapter(courseId: string, title: string, index: number): Promise<Chapter | null> {
  const record = await fetchCourseRecord();
  const course = record[courseId];
  if (!course) return null;
  const chapterId = nanoid();
  const chapter: Chapter = { id: chapterId, title, index, subsections: {} };
  const chapters = course.chapters || {};
  chapters[chapterId] = chapter;
  record[courseId] = { ...course, chapters };
  await writeCourseRecord(record);
  return chapter;
}

export async function deleteChapter(courseId: string, chapterId: string): Promise<void> {
  const record = await fetchCourseRecord();
  const course = record[courseId];
  if (!course?.chapters) return;
  delete course.chapters[chapterId];
  record[courseId] = { ...course };
  await writeCourseRecord(record);
}

export async function updateChapter(
  courseId: string,
  chapterId: string,
  updates: Partial<Pick<Chapter, "title" | "index">>,
): Promise<Chapter | null> {
  const record = await fetchCourseRecord();
  const course = record[courseId];
  if (!course?.chapters?.[chapterId]) return null;
  const nextChapter = { ...course.chapters[chapterId], ...updates };
  course.chapters[chapterId] = nextChapter;
  record[courseId] = { ...course };
  await writeCourseRecord(record);
  return nextChapter;
}

export async function saveSubsection(
  courseId: string,
  chapterId: string,
  subsection: Subsection,
): Promise<Subsection | null> {
  const record = await fetchCourseRecord();
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
  await writeCourseRecord(record);
  return reindexed[id];
}

export async function reorderSubsections(
  courseId: string,
  chapterId: string,
  orderedIds: string[],
): Promise<Record<string, Subsection> | null> {
  const record = await fetchCourseRecord();
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
  await writeCourseRecord(record);
  return reindexed;
}

export async function deleteSubsection(courseId: string, chapterId: string, subsectionId: string): Promise<void> {
  const record = await fetchCourseRecord();
  const course = record[courseId];
  if (!course?.chapters?.[chapterId]?.subsections) return;
  delete course.chapters[chapterId].subsections![subsectionId];
  record[courseId] = { ...course };
  await writeCourseRecord(record);
}

export async function getProgress(userId: string): Promise<Record<string, CourseProgress>> {
  const progress = await fetchProgress(userId);
  const result: Record<string, CourseProgress> = {};
  await Promise.all(
    Object.entries(progress).map(async ([courseId, val]) => {
      const course = await getCourse(courseId);
      const total = countTotalSubsections(course) || 1;
      const completedIds = Object.keys(val.completedSubsections || {});
      result[courseId] = {
        courseId,
        completedLessonIds: completedIds,
        progressPercent: val.percent ?? Math.round((completedIds.length / total) * 100),
        lastLessonId: completedIds[completedIds.length - 1],
      };
    }),
  );
  return result;
}

export async function getProgressForCourse(userId: string, courseId: string): Promise<CourseProgress | null> {
  const progress = await fetchProgress(userId);
  const entry = progress[courseId];
  const course = await getCourse(courseId);
  const total = countTotalSubsections(course) || 1;
  if (!entry) return null;
  const completedIds = Object.keys(entry.completedSubsections || {});
  return {
    courseId,
    completedLessonIds: completedIds,
    progressPercent: entry.percent ?? Math.round((completedIds.length / total) * 100),
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

  const courses = await getCourses();
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
    const list = Object.values(val || {}).filter((entry) => typeof entry?.totalXp === "number");
    const sorted = list.sort((a, b) => {
      const diff = (b.totalXp || 0) - (a.totalXp || 0);
      if (diff !== 0) return diff;
      const timeA = a.xpReachedAt ?? a.createdAt ?? 0;
      const timeB = b.xpReachedAt ?? b.createdAt ?? 0;
      return timeA - timeB;
    });
    return {
      locked: !user.subscriptionActive,
      entries: user.subscriptionActive ? sorted : sorted.slice(0, 3),
    };
  } catch (err) {
    console.warn("Failed to load leaderboard from Firebase", err);
    const entries = [
      { displayName: "AceKnight", totalXp: 900, level: 10 },
      { displayName: "ClubCrusher", totalXp: 740, level: 8 },
      { displayName: "TacticsTiger", totalXp: 620, level: 7 },
      {
        displayName: user.chessUsername || user.displayName,
        totalXp: user.totalXp,
        level: user.level,
      },
    ];
    return {
      locked: !user.subscriptionActive,
      entries: entries.slice(0, user.subscriptionActive ? entries.length : 3),
    };
  }
}

export async function subscribe(user: UserProfile, plan: "monthly" | "yearly"): Promise<UserProfile> {
  const updated = { ...user, subscriptionActive: true, subscriptionPlan: plan };
  writeUser(updated);
  return updated;
}

export async function completeSubsection(
  userId: string,
  courseId: string,
  subsectionId: string,
  type: Subsection["type"],
): Promise<CourseProgress> {
  const record = await fetchProgress(userId);
  const course = await getCourse(courseId);
  const total = countTotalSubsections(course) || 1;
  const existing = record[courseId] || { completedSubsections: {}, percent: 0 };
  const alreadyCompleted = !!existing.completedSubsections[subsectionId];
  existing.completedSubsections[subsectionId] = true;
  const completedCount = Object.keys(existing.completedSubsections).length;
  existing.percent = Math.min(100, Math.round((completedCount / total) * 100));
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
