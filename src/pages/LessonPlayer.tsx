import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Chess, Color, PieceSymbol, Square } from "chess.js";
import { parse as parsePgn } from "@mliebelt/pgn-parser";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  LayoutList,
  Pencil,
  X,
  Trash2,
  Plus,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/ui/Button";
import whitePawn from "../assets/White Pawn.png";
import whiteRook from "../assets/White Rook.png";
import whiteKnight from "../assets/White Knight.png";
import whiteBishop from "../assets/White Bishop.png";
import whiteQueen from "../assets/White Queen.png";
import whiteKing from "../assets/White King.png";
import blackPawn from "../assets/Black Pawn.png";
import blackRook from "../assets/Black Rook.png";
import blackKnight from "../assets/Black Knight.png";
import blackBishop from "../assets/Black Bishop.png";
import blackQueen from "../assets/Black Queen.png";
import blackKing from "../assets/Black King.png";
import macCursorOpen from "../assets/Mac Cursor Open Hand.png";
import macCursorClosed from "../assets/Mac Cursor Closed Hand.png";
import { useAuth } from "../hooks/useAuth";
import { resolveBoardTheme } from "../lib/boardThemes";
import {
  addChapter,
  completeSubsection,
  getProgressForCourse,
  deleteChapter,
  deleteSubsection,
  getCourse,
  listenCourse,
  saveSubsection,
  updateChapter,
  type Chapter,
  type Course,
  type Subsection,
} from "../lib/mockApi";

type VideoSource =
  | { type: "youtube"; src: string }
  | { type: "html5"; src: string }
  | { type: "blocked"; reason: string };

type PgnToken = string | { comment?: string };

type YouTubeMatch = { id: string; startSeconds?: number };

function normalizeToUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  const withProtocol = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol);
  } catch {
    return null;
  }
}

function parseStartSeconds(url: URL | null): number | null {
  if (!url) return null;
  const raw = url.searchParams.get("t") ?? url.searchParams.get("start");
  if (!raw) return null;
  const asNumber = Number(raw);
  if (Number.isFinite(asNumber) && asNumber >= 0) return Math.floor(asNumber);
  const parts = raw.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?/i);
  if (!parts) return null;
  const [, h, m, s] = parts;
  const hours = Number(h) || 0;
  const mins = Number(m) || 0;
  const secs = Number(s) || 0;
  const total = hours * 3600 + mins * 60 + secs;
  return total > 0 ? total : null;
}

function cleanYouTubeId(candidate?: string | null): string | null {
  if (!candidate) return null;
  const cleaned = candidate.trim().replace(/[^-\w]/g, "");
  if (!cleaned) return null;
  return cleaned.length > 11 ? cleaned.slice(0, 11) : cleaned;
}

function extractYouTubeId(url: string): YouTubeMatch | null {
  const parsed = normalizeToUrl(url);
  const startSeconds = parseStartSeconds(parsed) ?? undefined;
  const host = parsed?.hostname.replace(/^www\./, "") || "";
  const pathParts = parsed?.pathname.split("/").filter(Boolean) || [];

  if (host === "youtu.be" && pathParts[0]) {
    const id = cleanYouTubeId(pathParts[0]);
    if (id) return { id, startSeconds };
  }

  if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
    const queryId = cleanYouTubeId(parsed?.searchParams.get("v"));
    if (queryId) return { id: queryId, startSeconds };
    if (pathParts.length >= 2 && ["embed", "shorts", "live", "v"].includes(pathParts[0])) {
      const id = cleanYouTubeId(pathParts[1]);
      if (id) return { id, startSeconds };
    }
  }

  const fallbackMatch = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{6,})/i);
  const fallbackId = cleanYouTubeId(fallbackMatch?.[1]);
  return fallbackId ? { id: fallbackId, startSeconds } : null;
}

function getVideoSource(url?: string): VideoSource | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  const yt = extractYouTubeId(trimmed);
  if (yt) {
    const params = new URLSearchParams({ rel: "0", modestbranding: "1" });
    if (typeof yt.startSeconds === "number") params.set("start", String(yt.startSeconds));
    return { type: "youtube", src: `https://www.youtube-nocookie.com/embed/${yt.id}?${params.toString()}` };
  }
  return { type: "html5", src: trimmed };
}

function safeMove(chess: Chess, san: string) {
  try {
    return chess.move(san, { sloppy: true });
  } catch {
    return null;
  }
}

function normalizeFenString(raw: string): string {
  const cleaned = raw.trim().split(/\s+/);
  while (cleaned.length < 6) {
    if (cleaned.length === 0) cleaned.push("");
    else if (cleaned.length === 1) cleaned.push("w");
    else if (cleaned.length === 2) cleaned.push("KQkq");
    else if (cleaned.length === 3) cleaned.push("-");
    else cleaned.push(cleaned.length === 4 ? "0" : "1");
  }
  const [placement, turn, castling, ep, half, full] = cleaned.slice(0, 6);
  const fixedTurn = turn?.toLowerCase() === "b" ? "b" : "w";
  const fixedCastling = /^(K?Q?k?q?|-)$/i.test(castling) ? castling : "-";
  const fixedEp = /^([a-h][36]|-)$/i.test(ep) ? ep : "-";
  const fixedHalf = Number.isFinite(Number(half)) ? String(Number(half)) : "0";
  const fixedFull = Number.isFinite(Number(full)) && Number(full) > 0 ? String(Number(full)) : "1";
  return [placement, fixedTurn, fixedCastling || "-", fixedEp || "-", fixedHalf, fixedFull].join(" ");
}

function loadFenOrNull(fen?: string | null): string | null {
  if (!fen) return null;
  try {
    const g = new Chess();
    const loaded = g.load(fen);
    // chess.js returns false on failure; undefined/true on success
    return loaded === false ? null : g.fen();
  } catch {
    return null;
  }
}

function extractQuizFen(subsection: Subsection | any): string | null {
  const candidateKeys = [
    subsection?.fen,
    subsection?.FEN,
    subsection?.startFen,
    subsection?.startFEN,
    subsection?.boardFen,
    subsection?.fenString,
    subsection?.position,
    subsection?.puzzleFen,
    subsection?.quizQuestions?.[0]?.fen,
    subsection?.quizQuestions?.[0]?.FEN,
    subsection?.quizQuestions?.[0]?.startFen,
    subsection?.quizQuestions?.[0]?.startFEN,
    subsection?.quizQuestions?.[0]?.fenString,
    subsection?.quizQuestions?.[0]?.position,
    subsection?.questions?.[0]?.fen,
    subsection?.questions?.[0]?.FEN,
    subsection?.questions?.[0]?.startFen,
    subsection?.questions?.[0]?.startFEN,
    subsection?.questions?.[0]?.fenString,
    subsection?.questions?.[0]?.position,
  ];
  const fenValue = candidateKeys.find((val) => typeof val === "string" && val.trim().length > 0);
  return fenValue ? normalizeFenString(fenValue) : null;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function stripPgnTags(raw: string): string {
  return raw
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("["))
    .join(" ")
    .replace(/;.*/g, "");
}

function stripParenthesesContent(text: string): string {
  let result = "";
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "(") {
      depth++;
      continue;
    }
    if (ch === ")") {
      if (depth > 0) depth--;
      continue;
    }
    if (depth === 0) result += ch;
  }
  return result;
}

function tokenizePgn(pgn: string): PgnToken[] {
  return pgn.split(/\s+/).filter(Boolean);
}

function sanitizeMove(token: string): string {
  let t = token.replace(/\u2026/g, "...");
  t = t.replace(/^\d+\.(\.\.)?/, "");
  t = t.replace(/[!?+#]+$/g, "");
  if (/^\$?\d+$/.test(t.trim())) return "";
  return t.trim();
}

function isMoveNumber(token: string) {
  return /^\d+\.+$/.test(token) || /^\d+\.\.\.$/.test(token);
}

function isResultToken(token: string) {
  return token === "1-0" || token === "0-1" || token === "1/2-1/2" || token === "*";
}

type ParsedMove = {
  move?: { san?: string; notation?: string };
  notation?: { notation?: string };
  san?: string;
  comment?: string;
  commentAfter?: string;
  commentBefore?: string;
  variations?: ParsedMove[][];
};

function parsePgnWithVariations(pgn: string): {
  mainline: MoveRecord[];
  rootVariations: MoveRecord[][];
  variationMap: Record<string, MoveRecord[][]>;
} {
  try {
    const games = parsePgn(pgn, { startRule: "games", sloppy: true }) as any[];
    const game = games?.[0];
    if (!game?.moves) return { mainline: [], rootVariations: [], variationMap: {} };

    const variationMap: Record<string, MoveRecord[][]> = {};

    const buildLine = (
      moves: ParsedMove[],
      chess: Chess,
      attachToRoot?: (vars: MoveRecord[][]) => void,
    ): MoveRecord[] => {
      const records: MoveRecord[] = [];
      moves.forEach((mv) => {
        const fenBefore = chess.fen();
        const san =
          mv?.notation?.notation ||
          mv?.move?.notation ||
          mv?.san ||
          (typeof mv?.move === "string" ? mv.move : "") ||
          "";
        const cleanedSan = san?.toString().trim();
        if (!cleanedSan) return;
        const variationLines = mv.variations?.map((variation) => buildLine(variation, new Chess(chess.fen()))) || [];
        if (variationLines.length) {
          variationMap[fenBefore] = variationLines;
          if (attachToRoot) attachToRoot(variationLines);
        }
        const move = safeMove(chess, cleanedSan);
        if (!move) return;
        const record: MoveRecord = {
          san: move.san,
          from: move.from as Square,
          to: move.to as Square,
          fen: chess.fen(),
          comment: (mv.commentAfter || mv.comment || mv.commentBefore || "").trim() || null,
          variations: variationLines.length ? variationLines : [],
        };
        records.push(record);
      });
      return records;
    };

    const rootVariations: MoveRecord[][] = [];
    const mainline = buildLine(game.moves as ParsedMove[], new Chess(), (vars) => rootVariations.push(...vars));
    if (game.variations?.length) {
      game.variations.forEach((variation: ParsedMove[]) => {
        rootVariations.push(buildLine(variation, new Chess()));
      });
    }
    return { mainline, rootVariations, variationMap };
  } catch {
    return { mainline: [], rootVariations: [], variationMap: {} };
  }
}

type MoveRecord = {
  san: string;
  from: Square;
  to: Square;
  fen: string;
  comment?: string | null;
  variations?: MoveRecord[][];
};

const piecePalette: { label: string; color: Color; type: PieceSymbol | "empty" }[] = [
  { label: "⚪P", color: "w", type: "p" },
  { label: "⚪N", color: "w", type: "n" },
  { label: "⚪B", color: "w", type: "b" },
  { label: "⚪R", color: "w", type: "r" },
  { label: "⚪Q", color: "w", type: "q" },
  { label: "⚪K", color: "w", type: "k" },
  { label: "⚫P", color: "b", type: "p" },
  { label: "⚫N", color: "b", type: "n" },
  { label: "⚫B", color: "b", type: "b" },
  { label: "⚫R", color: "b", type: "r" },
  { label: "⚫Q", color: "b", type: "q" },
  { label: "⚫K", color: "b", type: "k" },
  { label: "🧽", color: "w", type: "empty" },
];

export default function LessonPlayer({ id }: { id?: string }) {
  const { user } = useAuth();
  const boardColors = resolveBoardTheme(user?.boardTheme).colors;
  const isAdmin = !!user?.isAdmin;
  const gameRef = useRef(new Chess());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [fen, setFen] = useState(gameRef.current.fen());
  const [history, setHistory] = useState<MoveRecord[]>([]);
  const [selected, setSelected] = useState<Square | null>(null);
  const [orientation, setOrientation] = useState<Color>("w");
  const [editMode] = useState(false);
  const [selectedEdit, setSelectedEdit] = useState(piecePalette[0]);
  const [navOpen, setNavOpen] = useState(false);
  const [dragFrom, setDragFrom] = useState<Square | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  const [courseId, setCourseId] = useState(id || "");
  const [course, setCourse] = useState<Course | null>(null);
  const [loadingCourse, setLoadingCourse] = useState(false);
  const [chapterModal, setChapterModal] = useState<{
    mode: "create" | "edit";
    chapter?: Chapter;
    title: string;
    index: number;
  } | null>(null);
  const [subsectionModal, setSubsectionModal] = useState<{
    chapterId: string;
    mode: "create";
    type: Subsection["type"];
    title: string;
    videoUrl: string;
    pgn: string;
    fen: string;
    quizQuestions: { id: string; prompt: string }[];
    correctQuestionIndex: number;
    trainerNote: string;
  } | null>(null);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [activeSubsection, setActiveSubsection] = useState<Subsection | null>(null);
  const [activeMoveFen, setActiveMoveFen] = useState<string | null>(null);
  const [activeMoveIndex, setActiveMoveIndex] = useState<number>(-1);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingSubsection, setSavingSubsection] = useState(false);
  const [trainerNote, setTrainerNote] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizAwarded, setQuizAwarded] = useState(false);
  const [studyMainline, setStudyMainline] = useState<MoveRecord[]>([]);
  const [variationsByFen, setVariationsByFen] = useState<Record<string, MoveRecord[][]>>({});
  const [mainlineByFen, setMainlineByFen] = useState<Record<string, MoveRecord | undefined>>({});
  const [mainlineIndexByFen, setMainlineIndexByFen] = useState<Record<string, number>>({});
  const [studyError, setStudyError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [redSquares, setRedSquares] = useState<Set<string>>(new Set());
  const [arrowStart, setArrowStart] = useState<{ row: number; col: number; square: Square } | null>(null);
  const [arrowTarget, setArrowTarget] = useState<{ row: number; col: number; square: Square } | null>(null);
  const [arrows, setArrows] = useState<
    { start: { row: number; col: number; square: Square }; end: { row: number; col: number; square: Square } }[]
  >([]);
  const [arrowMoved, setArrowMoved] = useState(false);
  const [suppressContextToggle, setSuppressContextToggle] = useState(false);
  const [lastMoveSquares, setLastMoveSquares] = useState<Square[]>([]);
  const [completedSubsections, setCompletedSubsections] = useState<Set<string>>(new Set());
  const transparentPixel =
    "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
  const setDragCursor = (active: boolean) => {
    if (typeof document === "undefined") return;
    document.body.style.cursor = active ? `url(${macCursorClosed}) 8 8, grabbing` : "";
  };

  useEffect(() => {
    return () => {
      setDragCursor(false);
    };
  }, []);

  useEffect(() => {
    const clearCursor = () => setDragCursor(false);
    window.addEventListener("mouseup", clearCursor);
    window.addEventListener("dragend", clearCursor);
    return () => {
      window.removeEventListener("mouseup", clearCursor);
      window.removeEventListener("dragend", clearCursor);
    };
  }, []);

  useEffect(() => {
    const clearCursor = () => setDragCursor(false);
    window.addEventListener("mouseup", clearCursor);
    window.addEventListener("dragend", clearCursor);
    return () => {
      window.removeEventListener("mouseup", clearCursor);
      window.removeEventListener("dragend", clearCursor);
    };
  }, []);

  const board = useMemo(() => {
    const g = new Chess(fen);
    const rows = g.board();
    return orientation === "w" ? rows : rows.slice().reverse().map((row) => row.slice().reverse());
  }, [fen, orientation]);
  const isAtLatestMove = activeMoveIndex === -1 || activeMoveIndex === history.length - 1;
  const fileLabels = orientation === "w" ? "abcdefgh".split("") : "hgfedcba".split("");
  const rankLabels =
    orientation === "w"
      ? Array.from({ length: 8 }, (_v, idx) => 8 - idx)
      : Array.from({ length: 8 }, (_v, idx) => idx + 1);

  const legalMoves = useMemo(() => {
    if (!selected) return [];
    const g = new Chess(fen);
    return g.moves({ square: selected, verbose: true });
  }, [fen, selected]);

  const pieceSprite = (piece: { color: Color; type: PieceSymbol } | null) => {
    if (!piece) return null;
    const whiteMap: Record<PieceSymbol, string> = {
      p: whitePawn,
      r: whiteRook,
      n: whiteKnight,
      b: whiteBishop,
      q: whiteQueen,
      k: whiteKing,
    };
    const blackMap: Record<PieceSymbol, string> = {
      p: blackPawn,
      r: blackRook,
      n: blackKnight,
      b: blackBishop,
      q: blackQueen,
      k: blackKing,
    };
    return piece.color === "w" ? whiteMap[piece.type] : blackMap[piece.type];
  };

  const squareName = (rowIdx: number, colIdx: number): Square => {
    const file = "abcdefgh"[orientation === "w" ? colIdx : 7 - colIdx];
    const rank = orientation === "w" ? 8 - rowIdx : rowIdx + 1;
    return `${file}${rank}` as Square;
  };

  const handleSquareClick = (rowIdx: number, colIdx: number) => {
    setArrowStart(null);
    setArrowTarget(null);
    setArrows([]);
    setRedSquares(new Set());
    if (activeSubsection?.type === "quiz") return;
    const target = squareName(rowIdx, colIdx);
    if (editMode) {
      const g = new Chess();
      g.load(fen);
      if (selectedEdit.type === "empty") {
        g.remove(target);
      } else {
        g.put({ color: selectedEdit.color, type: selectedEdit.type as PieceSymbol }, target);
      }
      setFen(g.fen());
      return;
    }
    if (selected === target) {
      setSelected(null);
      return;
    }
    const g = new Chess(fen);
    const piece = g.get(target);
    if (selected) {
      attemptMove(selected, target);
      return;
    }
    if (piece && piece.color === g.turn()) {
      setSelected(target);
    }
  };

  const attemptMove = (from: Square, to: Square) => {
    if (activeSubsection?.type === "quiz" || activeSubsection?.type === "study") {
      setSelected(null);
      setDragFrom(null);
      setDragCursor(false);
      return;
    }
    if (editMode) return;
    if (!isAtLatestMove) {
      setSelected(null);
      setDragFrom(null);
      setDragCursor(false);
      return;
    }
    const g = new Chess(fen);
    const move = g.move({ from, to, promotion: "q" });
    if (move) {
      const newFen = g.fen();
      gameRef.current = g;
      setHistory((prev) => {
        const updated = [...prev, { san: move.san, from: move.from, to: move.to, fen: newFen }];
        setActiveMoveIndex(updated.length - 1);
        setActiveMoveFen(newFen);
        return updated;
      });
      setFen(newFen);
    }
    setSelected(null);
  };

  const movePairs = useMemo(() => {
    const pairs: { white?: MoveRecord; black?: MoveRecord }[] = [];
    history.forEach((m, idx) => {
      const pairIdx = Math.floor(idx / 2);
      if (!pairs[pairIdx]) pairs[pairIdx] = {};
      if (idx % 2 === 0) pairs[pairIdx].white = m;
      else pairs[pairIdx].black = m;
    });
    return pairs;
  }, [history]);

  const jumpToMove = (record: MoveRecord) => {
    setFen(record.fen);
    setSelected(null);
    setDragFrom(null);
    const idx = history.findIndex((m) => m.fen === record.fen && m.from === record.from && m.to === record.to);
    if (idx >= 0) {
      setActiveMoveIndex(idx);
    }
    setActiveMoveFen(record.fen);
  };

  useEffect(() => {
    if (courseId) return;
    setLoadingCourse(true);
    getCourse("course-london").then((fallback) => {
      setCourseId(fallback?.id || "course-london");
      setLoadingCourse(false);
    });
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;
    setLoadingCourse(true);
    const unsub = listenCourse(courseId, (c) => {
      setCourse(c);
      setLoadingCourse(false);
    });
    return () => unsub();
  }, [courseId]);

  useEffect(() => {
    let cancelled = false;
    const loadProgress = async () => {
      if (!user || !courseId) return;
      try {
        const prog = await getProgressForCourse(user.id, courseId);
        if (cancelled) return;
        setCompletedSubsections(new Set(prog?.completedLessonIds || []));
      } catch {
        if (!cancelled) setCompletedSubsections(new Set());
      }
    };
    loadProgress();
    return () => {
      cancelled = true;
    };
  }, [user?.id, courseId]);

  useEffect(() => {
    if (!subsectionModal) {
      setUploadError(null);
      setSaveError(null);
    } else if (subsectionModal.type !== "video") {
      setUploadError(null);
    }
  }, [subsectionModal]);

  const chapters = useMemo(() => {
    if (!course?.chapters) return [];
    return Object.values(course.chapters).sort((a, b) => a.index - b.index);
  }, [course]);

  const toggleChapter = (id: string) => {
    setExpandedChapters((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddChapter = async () => {
    if (!isAdmin || !courseId) return;
    setChapterModal({
      mode: "create",
      title: "",
      index: chapters.length,
    });
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!isAdmin || !courseId) return;
    const confirmed = window.confirm("Delete this chapter and its subsections?");
    if (!confirmed) return;
    await deleteChapter(courseId, chapterId);
  };

  const handleDeleteSubsection = async (chapterId: string, subsectionId: string) => {
    if (!isAdmin || !courseId) return;
    const confirmed = window.confirm("Delete this subsection?");
    if (!confirmed) return;
    await deleteSubsection(courseId, chapterId, subsectionId);
  };

  const handleCompleteSubsection = async (subsection: Subsection) => {
    if (!user || !courseId) return;
    if (subsection.type === "quiz") return;
    if (completedSubsections.has(subsection.id)) return;
    setCompletedSubsections((prev) => new Set(prev).add(subsection.id));
    await completeSubsection(user.id, courseId, subsection.id, subsection.type);
  };

  const loadStudyPgn = (pgn: string) => {
    setStudyError(null);
    try {
      // Parse using robust PGN parser first (preserves variations)
      let { mainline, variationMap } = parsePgnWithVariations(pgn);

      // If variation parsing failed, try plain chess.js linear loads
      if (!mainline.length) {
        const attempts = [pgn];
        for (const candidate of attempts) {
          const fallback = new Chess();
          if (fallback.loadPgn(candidate, { sloppy: true })) {
            const moves = fallback.history({ verbose: true });
            const records: MoveRecord[] = [];
            const replay = new Chess();
            moves.forEach((mv) => {
              replay.move(mv);
              records.push({
                san: mv.san,
                from: mv.from as Square,
                to: mv.to as Square,
                fen: replay.fen(),
                comment: (mv as unknown as { comment?: string }).comment || null,
                variations: [],
              });
            });
            mainline = records;
            variationMap = {};
            break;
          }
        }
      }

      // fallback: linearize tokens ignoring variation structure but preserving sequence
      if (!mainline.length) {
        const tokens = tokenizePgn(pgn);
        const linear = new Chess();
        const records: MoveRecord[] = [];
        tokens.forEach((tok) => {
          if (tok === "(" || tok === ")" || typeof tok === "object") return;
          const t = sanitizeMove(tok);
          if (!t || isResultToken(t) || isMoveNumber(t)) return;
          const move = safeMove(linear, t);
          if (move) {
            records.push({
              san: move.san,
              from: move.from as Square,
              to: move.to as Square,
              fen: linear.fen(),
              comment: null,
              variations: [],
            });
          }
        });
        if (records.length) {
          mainline = records;
          variationMap = {};
        }
      }

      // final manual linear parse: strip braces/parentheses/tags, split tokens, and apply SAN moves
      if (!mainline.length) {
        const base = normalizeWhitespace(stripParenthesesContent(stripPgnTags(pgn))).replace(/\{[^}]*\}/g, "");
        const tokens = base.split(/\s+/).filter(Boolean);
        const linear = new Chess();
        const records: MoveRecord[] = [];
        tokens.forEach((tok) => {
          const t = sanitizeMove(tok);
          if (!t || isResultToken(t) || isMoveNumber(t)) return;
          const move = safeMove(linear, t);
          if (move) {
            records.push({
              san: move.san,
              from: move.from as Square,
              to: move.to as Square,
              fen: linear.fen(),
              comment: null,
              variations: [],
            });
          }
        });
        if (records.length) {
          mainline = records;
          variationMap = {};
        }
      }

      if (!mainline.length) {
        setStudyError("Could not load this PGN, falling back to empty board.");
        setStudyMainline([]);
        setVariationsByFen({});
        setMainlineByFen({});
        setMainlineIndexByFen({});
        setHistory([]);
        setActiveMoveIndex(-1);
        setActiveMoveFen(null);
        setFen(new Chess().fen());
        setSelected(null);
        setDragFrom(null);
        return;
      }

      // Build lookup maps keyed by the FEN before each mainline move
      const buildMainlineLookup = (line: MoveRecord[]) => {
        const map: Record<string, MoveRecord> = {};
        const idxMap: Record<string, number> = {};
        const g = new Chess();
        line.forEach((mv, idx) => {
          const fenBefore = g.fen();
          map[fenBefore] = mv;
          idxMap[fenBefore] = idx;
          safeMove(g, mv.san);
        });
        return { map, idxMap };
      };
      const { map: mainlineMap, idxMap: mainlineIdxMap } = buildMainlineLookup(mainline);

      setStudyMainline(mainline);
      setVariationsByFen(variationMap);
      setMainlineByFen(mainlineMap);
      setMainlineIndexByFen(mainlineIdxMap);
      setHistory(mainline);
      // start at the beginning so root-level variations are visible
      setActiveMoveIndex(-1);
      setActiveMoveFen(null);
      setFen(new Chess().fen());
      setSelected(null);
      setDragFrom(null);
      setStudyError(null);
    } catch (err) {
      console.warn("Failed to load PGN", err);
      setStudyMainline([]);
      setVariationsByFen({});
      setMainlineByFen({});
      setMainlineIndexByFen({});
      setHistory([]);
      setActiveMoveIndex(-1);
      setActiveMoveFen(null);
      setFen(new Chess().fen());
      setStudyError("Could not load this PGN. Try another file or share the PGN text.");
    }
    setSelected(null);
    setDragFrom(null);
  };

  const handleSelectSubsection = (sub: Subsection) => {
    setActiveSubsection(sub);
    if (sub.type === "study" && sub.pgn) {
      setQuizAnswers([]);
      setSelectedOption(null);
      setTrainerNote(null);
      setStudyError(null);
      loadStudyPgn(sub.pgn);
      return;
    }

    if (sub.type === "quiz") {
      const fenText = extractQuizFen(sub);
      const nextFen = loadFenOrNull(fenText) || new Chess().fen();
      setFen(nextFen);
      const qs = (sub as any).questions || [];
      setQuizAnswers(qs.map(() => ""));
      setSelectedOption(null);
      setQuizFeedback(null);
      setQuizAwarded(false);
      setQuizSubmitting(false);
      setSelected(null);
      setDragFrom(null);
      setHistory([]);
      setStudyMainline([]);
      setActiveMoveIndex(-1);
      setActiveMoveFen(null);
      setStudyError(null);
      setTrainerNote(sub.trainerNote?.trim() || null);
      return;
    } else {
      setFen(new Chess().fen());
      setQuizAnswers([]);
      setSelectedOption(null);
      setQuizFeedback(null);
      setQuizAwarded(false);
      setQuizSubmitting(false);
      setSelected(null);
      setDragFrom(null);
      setHistory([]);
      setStudyMainline([]);
      setActiveMoveIndex(-1);
      setActiveMoveFen(null);
      setStudyError(null);
      setTrainerNote(sub.type === "video" ? sub.trainerNote?.trim() || null : null);
    }
  };

  // Keep quiz FEN in sync even after course reloads
  useEffect(() => {
    if (activeSubsection?.type !== "quiz") return;
    const fenValue = extractQuizFen(activeSubsection);
    const nextFen = loadFenOrNull(fenValue) || new Chess().fen();
    setFen(nextFen);
    setSelected(null);
    setDragFrom(null);
  }, [activeSubsection]);

  useEffect(() => {
    if (activeSubsection?.type !== "study") return;
    if (!history.length) {
      setActiveMoveIndex(-1);
      setActiveMoveFen(null);
      setFen(new Chess().fen());
      return;
    }
    // pause autoadvance when a branch exists from the current position
    const currentFen = activeMoveIndex >= 0 ? history[activeMoveIndex].fen : new Chess().fen();
    if (variationsByFen[currentFen]?.length) return;
  }, [history, activeMoveIndex, variationsByFen, setFen, activeSubsection]);

  useEffect(() => {
    if (!activeSubsection) {
      setTrainerNote(null);
      return;
    }
    if (activeSubsection.type === "study") {
      if (activeMoveIndex >= 0 && history[activeMoveIndex]) {
        const note = history[activeMoveIndex].comment?.trim();
        setTrainerNote(note || null);
      } else {
        setTrainerNote(null);
      }
      return;
    }
    if (activeSubsection.type === "video" || activeSubsection.type === "quiz") {
      const note = activeSubsection.trainerNote?.trim();
      setTrainerNote(note || null);
      return;
    }
    setTrainerNote(null);
  }, [activeSubsection, activeMoveIndex, history]);

  useEffect(() => {
    if (activeSubsection?.type === "study") {
      let record: MoveRecord | undefined;
      if (activeMoveIndex >= 0 && history[activeMoveIndex]) {
        record = history[activeMoveIndex];
      } else if (history.length) {
        record = history[history.length - 1];
      }
      if (record) {
        setLastMoveSquares([record.from as Square, record.to as Square]);
      } else {
        setLastMoveSquares([]);
      }
    } else {
      setLastMoveSquares([]);
    }
  }, [activeSubsection, activeMoveIndex, history]);

  const goPrevMove = () => {
    if (!history.length) return;
    const target =
      activeMoveIndex === -1 ? history.length - 1 : Math.max(0, activeMoveIndex - 1);
    setActiveMoveIndex(target);
    setActiveMoveFen(history[target].fen);
    setFen(history[target].fen);
    setSelected(null);
    setDragFrom(null);
  };

  const goNextMove = () => {
    if (!history.length) return;
    const currentFen = activeMoveIndex >= 0 ? history[activeMoveIndex].fen : new Chess().fen();
    if (variationsByFen[currentFen]?.length) return;
    const target =
      activeMoveIndex === -1 ? 0 : Math.min(history.length - 1, activeMoveIndex + 1);
    setActiveMoveIndex(target);
    setActiveMoveFen(history[target].fen);
    setFen(history[target].fen);
    setSelected(null);
    setDragFrom(null);
  };

  const showBoardControls = activeSubsection?.type !== "video";
  const showMovesList = activeSubsection?.type !== "video";
  const videoSource = getVideoSource(activeSubsection?.videoUrl);
  const isVideoSubsection = activeSubsection?.type === "video";
  const rawVideoUrl = isVideoSubsection ? activeSubsection.videoUrl?.trim() || "" : "";
  const videoLinkLabel = useMemo(() => {
    if (!rawVideoUrl) return "No video link provided yet.";
    if (rawVideoUrl.startsWith("data:")) return "Embedded video file (data URL)";
    const parsed = normalizeToUrl(rawVideoUrl);
    if (parsed) {
      if (parsed.hostname.replace(/^www\./, "").includes("youtube")) {
        return "Video ready";
      }
      const host = parsed.hostname.replace(/^www\./, "");
      const path = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "";
      return `Source: ${host}${path}`;
    }
    return rawVideoUrl.length > 80 ? `${rawVideoUrl.slice(0, 80)}...` : rawVideoUrl;
  }, [rawVideoUrl]);
  const showRawLink = !!rawVideoUrl && videoSource?.type !== "youtube";
  const videoBadge =
    videoSource?.type === "html5"
      ? "Hosted video"
      : videoSource?.type === "youtube"
      ? "Video"
      : videoSource?.type === "blocked"
      ? "Link unsupported"
      : rawVideoUrl
      ? "Link issue"
      : "No video linked";
  const videoHelperText = videoSource
    ? videoSource.type === "html5"
      ? "Custom player using your hosted video file."
      : null
    : rawVideoUrl
    ? "We couldn't read this link. Use a direct MP4/WEBM/HLS URL or a YouTube link."
    : "No video URL yet. Add one from the section editor to start playback.";

  const openVideoInNewTab = () => {
    if (!videoSource) return;
    window.open(videoSource.src, "_blank", "noopener,noreferrer");
  };

  const toggleRedSquare = (rowIdx: number, colIdx: number) => {
    const sq = squareName(rowIdx, colIdx);
    setRedSquares((prev) => {
      const next = new Set(prev);
      if (next.has(sq)) next.delete(sq);
      else next.add(sq);
      return next;
    });
  };

  const startArrow = (rowIdx: number, colIdx: number) => {
    const sq = squareName(rowIdx, colIdx);
    setArrowStart({ row: rowIdx, col: colIdx, square: sq });
    setArrowTarget(null);
    setArrowMoved(false);
  };

  const handleRightDrag = (rowIdx: number, colIdx: number, buttons: number) => {
    if (!arrowStart || buttons !== 2) return;
    const sq = squareName(rowIdx, colIdx);
    if (arrowStart.square === sq) {
      setArrowMoved(false);
      setArrowTarget(null);
      return;
    }
    setArrowMoved(true);
    setArrowTarget({ row: rowIdx, col: colIdx, square: sq });
  };

  const handleRightUp = () => {
    if (arrowStart && arrowMoved && arrowTarget) {
      setArrows((prev) => [...prev, { start: arrowStart, end: arrowTarget }]);
      setSuppressContextToggle(true);
    } else if (arrowStart && !arrowMoved) {
      toggleRedSquare(arrowStart.row, arrowStart.col);
      setSuppressContextToggle(true);
    }
    setArrowMoved(false);
    setArrowStart(null);
    setArrowTarget(null);
  };
  const resetVideoState = () => {
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    setIsScrubbing(false);
    setIsMuted(false);
    setVolume(1);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.pause();
    }
  };

  useEffect(() => {
    if (!isVideoSubsection) {
      resetVideoState();
      return;
    }
    if (videoSource?.type === "html5") {
      resetVideoState();
    }
  }, [isVideoSubsection, rawVideoUrl, videoSource]);

  useEffect(() => {
    if (videoSource?.type !== "html5") return;
    const el = videoRef.current;
    if (!el) return;
    el.volume = volume;
    el.muted = isMuted;
  }, [volume, isMuted, videoSource]);

  const handleTogglePlayback = () => {
    if (videoSource?.type !== "html5") return;
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play();
    } else {
      el.pause();
    }
  };

  const handleTimeUpdate = () => {
    const el = videoRef.current;
    if (!el || isScrubbing) return;
    setProgress(el.currentTime || 0);
  };

  const handleLoadedMetadata = () => {
    const el = videoRef.current;
    if (!el) return;
    setDuration(el.duration || 0);
  };

  const handleSeek = (value: number) => {
    const el = videoRef.current;
    setProgress(value);
    if (!el) return;
    el.currentTime = value;
  };

  const handleVolume = (value: number) => {
    const el = videoRef.current;
    const clamped = Math.min(1, Math.max(0, value));
    setVolume(clamped);
    if (!el) return;
    el.volume = clamped;
    setIsMuted(clamped === 0);
  };

  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    el.muted = nextMuted;
    if (!nextMuted && el.volume === 0) {
      handleVolume(0.5);
    }
  };

  const formatTime = (secs: number) => {
    if (!Number.isFinite(secs)) return "0:00";
    const total = Math.max(0, Math.floor(secs));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const currentVariations = useMemo(() => {
    if (activeSubsection?.type !== "study") return [];
    const currentFen = activeMoveIndex >= 0 ? history[activeMoveIndex].fen : new Chess().fen();
    return variationsByFen[currentFen] || [];
  }, [activeMoveIndex, activeSubsection, history, variationsByFen]);
  const quizBlock = useMemo(() => {
    if (activeSubsection?.type !== "quiz") return null;
    const qs = (activeSubsection as any).questions || [];
    if (qs.length) {
      const first = qs[0];
      if (first?.options?.length) {
        const idx = typeof first.correctIndex === "number" && first.correctIndex >= 0 ? first.correctIndex : 0;
        return { ...first, correctIndex: idx };
      }
      const asOptions = qs.map((q: any, idx: number) => q?.prompt || `Option ${idx + 1}`).filter(Boolean);
      if (asOptions.length) {
        const correctIdx = qs.findIndex((q: any) => typeof q?.correctIndex === "number" && q.correctIndex >= 0);
        return {
          id: first?.id || "derived",
          prompt: first?.prompt || "Select the correct option",
          options: asOptions,
          correctIndex: correctIdx >= 0 ? correctIdx : 0,
        };
      }
    }
    const legacy = (activeSubsection as any).quizQuestions || [];
    if (legacy.length) {
      return {
        id: "legacy",
        prompt: "Select the correct option",
        options: legacy.map((q: any, idx: number) => q.prompt || `Option ${idx + 1}`),
        correctIndex: 0,
      };
    }
    return null;
  }, [activeSubsection]);
  const currentMainlineMove = useMemo(() => {
    if (activeSubsection?.type !== "study") return null;
    const currentFen = activeMoveIndex >= 0 ? history[activeMoveIndex].fen : new Chess().fen();
    return mainlineByFen[currentFen] || null;
  }, [activeMoveIndex, activeSubsection, history, mainlineByFen]);
  const isBranchPoint = activeSubsection?.type === "study" && currentVariations.length > 0;

  const applyVariation = (branch: MoveRecord[] | null) => {
    // If selecting a variation, push current state so we can restore mainline
    if (branch && branch.length) {
      const branchSourceIndex = activeMoveIndex + 1;
      const prefix = branchSourceIndex >= 0 ? history.slice(0, branchSourceIndex) : [];
      const newHistory = [...prefix, ...branch];
      setHistory(newHistory);
      const nextIndex = prefix.length;
      const nextFen = newHistory[nextIndex]?.fen || new Chess().fen();
      setActiveMoveIndex(nextIndex);
      setActiveMoveFen(nextFen);
      setFen(nextFen);
      setSelected(null);
      setDragFrom(null);
      return;
    }

    // Selecting mainline: restore the last saved mainline state or advance the next mainline move
    const currentFen = activeMoveIndex >= 0 ? history[activeMoveIndex].fen : new Chess().fen();
    const mainlineMove = mainlineByFen[currentFen];
    const mainlineIdx = mainlineIndexByFen[currentFen];
    if (mainlineMove != null && mainlineIdx != null) {
      setHistory(studyMainline);
      setActiveMoveIndex(mainlineIdx);
      setActiveMoveFen(mainlineMove.fen);
      setFen(mainlineMove.fen);
    }
    setSelected(null);
    setDragFrom(null);
  };

  const handleDownloadStudy = () => {
    if (activeSubsection?.type !== "study" || !activeSubsection.pgn) return;
    const blob = new Blob([activeSubsection.pgn], { type: "application/x-chess-pgn" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = (activeSubsection.title || "study").replace(/[^a-z0-9-_]+/gi, "_");
    a.href = url;
    a.download = `${safeName || "study"}.pgn`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const submitQuizAnswer = async () => {
    if (activeSubsection?.type !== "quiz" || !quizBlock) return;
    if (selectedOption == null) {
      setQuizFeedback("Pick an option first.");
      return;
    }
    const isCorrect = selectedOption === (quizBlock.correctIndex ?? 0);
    if (!isCorrect) {
      setQuizFeedback("Not quite. Try again.");
      return;
    }
    if (!user) {
      setQuizFeedback("Sign in to earn XP for this quiz.");
      return;
    }
    if (!courseId) {
      setQuizFeedback("Course not loaded yet. Try again.");
      return;
    }
    if (quizAwarded) {
      setQuizFeedback("XP already awarded for this quiz.");
      return;
    }
    try {
      setQuizSubmitting(true);
      await completeSubsection(user.id, courseId, activeSubsection.id, activeSubsection.type);
      setQuizAwarded(true);
      setQuizFeedback("Correct! XP awarded.");
    } catch (err) {
      console.warn("Failed to award XP for quiz", err);
      setQuizFeedback("Could not award XP right now. Please try again.");
    } finally {
      setQuizSubmitting(false);
    }
  };


  return (
    <AppShell>
      <div className="flex flex-col xl:flex-row items-start gap-4 xl:gap-6">
        {showMovesList && (
          <div className="w-full xl:min-w-[240px] xl:max-w-[280px] rounded-2xl bg-slate-900 border border-white/10 text-white shadow-xl">
            <div className="p-4">
              <div className="font-semibold text-lg">{activeSubsection?.type === "quiz" ? "Options" : "Moves"}</div>
              <div className="text-xs text-white/60 mb-2">
                {activeSubsection?.type === "study" && studyError
                  ? studyError
                  : activeSubsection?.type === "quiz"
                  ? "Answer the questions below"
                  : "Played so far"}
              </div>
            </div>
            <div className="max-h-[480px] overflow-auto px-4 pb-4">
              {activeSubsection?.type === "quiz" ? (
                <div className="space-y-3">
                  {quizBlock ? (
                    <div className="space-y-3">
                      <div className="text-sm text-white/70 whitespace-pre-wrap">Select the correct option</div>
                      {quizBlock.options?.map((opt: string, idx: number) => (
                        <label
                          key={`${quizBlock.id || "opt"}-${idx}`}
                          className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 hover:border-pink-400"
                        >
                          <input
                            type="radio"
                            name="quiz-option"
                            className="h-4 w-4 text-pink-500"
                            checked={selectedOption === idx}
                            onChange={() => {
                              setSelectedOption(idx);
                              setQuizAnswers((prev) => {
                                const next = [...prev];
                                next[0] = opt;
                                return next;
                              });
                              setQuizFeedback(null);
                            }}
                          />
                          <span>{opt || `Option ${idx + 1}`}</span>
                        </label>
                      ))}
                      <div className="pt-1">
                        <Button
                          size="sm"
                          className="w-full justify-center"
                          disabled={selectedOption == null || quizSubmitting}
                          onClick={submitQuizAnswer}
                        >
                          {quizSubmitting ? "Submitting..." : "Submit"}
                        </Button>
                        {quizFeedback && (
                          <div className="mt-2 text-xs text-white/80" aria-live="polite">
                            {quizFeedback}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-white/60">No options available.</div>
                  )}
                </div>
              ) : activeSubsection?.type === "study" && isBranchPoint ? (
                <div className="space-y-2">
                  {currentMainlineMove && (
                    <button
                      className="w-full text-left rounded-lg bg-white/10 hover:bg-white/20 text-white px-3 py-2 text-sm"
                      onClick={() => applyVariation(null)}
                    >
                      Mainline: {currentMainlineMove.san}
                    </button>
                  )}
                  {currentVariations.map((variation, idx) => (
                    <button
                      key={`variation-${idx}`}
                      className="w-full text-left rounded-lg border border-white/10 hover:border-pink-400 text-white px-3 py-2 text-sm"
                      onClick={() => applyVariation(variation)}
                    >
                      Variation {idx + 1}: {variation[0]?.san || "Line"}
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  {movePairs.length === 0 && (
                    <div className="text-white/50 text-sm">No moves yet. Start playing.</div>
                  )}
                  {movePairs.map((pair, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-[32px_1fr_1fr] items-center gap-2 sm:gap-3 text-xs sm:text-sm py-1"
                    >
                      <div className="text-white/50">{idx + 1}.</div>
                      <button
                        className={`text-left text-white rounded-md px-2 py-1 ${
                          activeMoveFen === pair.white?.fen ? "bg-white/10" : ""
                        } ${pair.white ? "hover:text-pink-300" : "text-white/50"}`}
                        disabled={!pair.white}
                        onClick={() => pair.white && jumpToMove(pair.white)}
                      >
                        {pair.white?.san || "-"}
                      </button>
                      <button
                        className={`text-left text-white rounded-md px-2 py-1 ${
                          activeMoveFen === pair.black?.fen ? "bg-white/10" : ""
                        } ${pair.black ? "hover:text-pink-300" : "text-white/50"}`}
                        disabled={!pair.black}
                        onClick={() => pair.black && jumpToMove(pair.black)}
                      >
                        {pair.black?.san || ""}
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div>
              <div className="text-xl font-bold text-white">{course?.title || "Course"}</div>
              <div className="text-sm text-white/60">{course?.description || "Live course layout"}</div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button variant="ghost" className="bg-white/5 hover:bg-white/10 w-full sm:w-auto" onClick={() => setNavOpen(true)}>
                <LayoutList className="h-5 w-5 mr-2" />
                Chapters
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(360px,1fr)_300px] gap-4 items-start">
            <div className="relative">
              <div className="relative block pl-6 sm:pl-8 pb-6 sm:pb-8 w-full max-w-[840px] mx-auto">
                {activeSubsection?.type === "video" ? (
                  <div className="w-full rounded-[28px] overflow-hidden border border-white/10 bg-slate-900/80 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
                    <div className="flex flex-col gap-3 px-6 py-5 border-b border-white/10 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">Video subsection</div>
                        <div className="text-2xl font-bold text-white leading-tight">
                          {activeSubsection.title || "Video lesson"}
                        </div>
                        {videoHelperText && <div className="text-sm text-white/60">{videoHelperText}</div>}
                      </div>
                      <div className="flex items-center gap-2" />
                    </div>

                    <div className="relative bg-black">
                      {videoSource?.type === "blocked" && (
                        <div className="aspect-video w-full flex flex-col items-center justify-center gap-3 px-6 text-center text-white/80">
                          <div className="text-lg font-semibold text-white">Link not playable</div>
                          <p className="text-sm text-white/60 max-w-xl">{videoSource.reason}</p>
                          {rawVideoUrl && (
                            <div className="text-xs text-white/50 break-all max-w-lg bg-white/5 border border-white/10 px-3 py-2 rounded-lg">
                              {rawVideoUrl}
                            </div>
                          )}
                          <div className="text-xs text-white/60">
                            Use a YouTube link or a direct MP4/WEBM/HLS URL to play here.
                          </div>
                        </div>
                      )}

                      {videoSource?.type === "youtube" && (
                        <div className="relative w-full">
                          <iframe
                            key={videoSource.src}
                            src={videoSource.src}
                            title={activeSubsection.title || "Video lesson"}
                            className="w-full aspect-video"
                            loading="lazy"
                            referrerPolicy="origin-when-cross-origin"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                          />
                        </div>
                      )}

                      {videoSource?.type === "html5" && (
                        <div className="relative w-full">
                          <video
                            ref={videoRef}
                            key={videoSource.src}
                            src={videoSource.src}
                            className="w-full aspect-video object-contain bg-black"
                            playsInline
                            onLoadedMetadata={handleLoadedMetadata}
                            onTimeUpdate={handleTimeUpdate}
                            onEnded={() => setIsPlaying(false)}
                            onPause={() => setIsPlaying(false)}
                            onPlay={() => setIsPlaying(true)}
                            muted={isMuted}
                            crossOrigin="anonymous"
                          />

                          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-4 pb-4 pt-6">
                            <div className="flex items-center gap-3">
                              <button
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                                onClick={handleTogglePlayback}
                                aria-label={isPlaying ? "Pause" : "Play"}
                              >
                                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                              </button>
                              <div className="flex items-center gap-2 text-xs text-white/80 min-w-[110px]">
                                <span>{formatTime(progress)}</span>
                                <span className="text-white/40">/</span>
                                <span>{formatTime(duration)}</span>
                              </div>
                              <div className="flex-1">
                                <input
                                  type="range"
                                  min={0}
                                  max={Math.max(duration || 0, 0.1)}
                                  step="0.1"
                                  value={Math.min(progress, duration || 0)}
                                  onChange={(e) => handleSeek(Number(e.target.value))}
                                  onMouseDown={() => setIsScrubbing(true)}
                                  onMouseUp={() => setIsScrubbing(false)}
                                  onTouchStart={() => setIsScrubbing(true)}
                                  onTouchEnd={() => setIsScrubbing(false)}
                                  className="w-full accent-pink-400"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-3 text-white/80 text-xs">
                              <div className="flex items-center gap-3">
                                <button
                                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                                  onClick={toggleMute}
                                  aria-label={isMuted ? "Unmute" : "Mute"}
                                >
                                  {isMuted || volume === 0 ? (
                                    <VolumeX className="h-5 w-5" />
                                  ) : (
                                    <Volume2 className="h-5 w-5" />
                                  )}
                                </button>
                                <input
                                  type="range"
                                  min={0}
                                  max={1}
                                  step={0.05}
                                  value={volume}
                                  onChange={(e) => handleVolume(Number(e.target.value))}
                                  className="w-28 accent-pink-400"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-white/10 border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.15em] text-white/70">
                                  Custom player
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/70 px-3 py-1 text-xs text-white/80">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            Playing hosted video
                          </div>
                        </div>
                      )}

                      {!videoSource && (
                        <div className="aspect-video w-full flex flex-col items-center justify-center gap-3 px-6 text-center text-white/70">
                          <div className="text-lg font-semibold text-white">No video ready</div>
                          <p className="text-sm text-white/60 max-w-xl">
                            Add a direct MP4/WEBM/HLS link, a YouTube link, or upload a video file from the section editor
                            to start playback.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 px-6 py-4 border-t border-white/10 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <span className={`h-2 w-2 rounded-full ${videoSource ? "bg-emerald-400" : "bg-amber-400"}`} />
                        {videoLinkLabel}
                      </div>
                      {showRawLink && (
                        <div className="text-xs text-white/50 break-all max-w-full sm:max-w-[320px]">
                          {rawVideoUrl}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      className="rounded-[28px] overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.45)] w-full"
                      style={{ backgroundColor: boardColors.dark }}
                    >
                      <div className="relative grid grid-cols-8 grid-rows-8 w-full max-w-[840px] aspect-square mx-auto">
                        {board.map((row, rIdx) =>
                          row.map((piece, cIdx) => {
                            const sq = squareName(rIdx, cIdx);
                            const isLightSquare = (rIdx + cIdx) % 2 === 0;
                            const isSelected = selected === sq;
                            const isLegal = legalMoves.some((m) => m.to === sq);
                            const isLastMove = lastMoveSquares.includes(sq);
                            return (
                              <button
                                key={`${rIdx}-${cIdx}`}
                                onClick={() => handleSquareClick(rIdx, cIdx)}
                                draggable={!editMode && !!piece}
                                onDragStart={(e) => {
                                  if (editMode || !piece) return;
                                  const g = new Chess(fen);
                                  const sq = squareName(rIdx, cIdx);
                                  const targetPiece = g.get(sq);
                                  if (activeSubsection?.type === "quiz") {
                                    e.preventDefault();
                                    return;
                                  }
                                  if (activeSubsection?.type === "study") {
                                    e.preventDefault();
                                    setDragCursor(false);
                                    return;
                                  }
                                  if (!isAtLatestMove) {
                                    e.preventDefault();
                                    setDragCursor(false);
                                    return;
                                  }
                                  if (targetPiece && targetPiece.color === g.turn()) {
                                    setDragFrom(sq);
                                    e.dataTransfer?.setData("text/plain", sq);
                                    if (e.dataTransfer) {
                                      const img = new Image();
                                      img.src = transparentPixel;
                                      e.dataTransfer.setDragImage(img, 0, 0);
                                    }
                                    setDragCursor(true);
                                  } else {
                                    e.preventDefault();
                                  }
                                }}
                                onDragOver={(e) => {
                                  if (activeSubsection?.type === "quiz") return;
                                  if (!editMode && dragFrom) e.preventDefault();
                                }}
                                onDrop={(e) => {
                                  if (editMode || activeSubsection?.type === "quiz" || activeSubsection?.type === "study")
                                    return;
                                  e.preventDefault();
                                  const from = dragFrom || (e.dataTransfer?.getData("text/plain") as Square | null);
                                  const to = squareName(rIdx, cIdx);
                                  if (from) {
                                    attemptMove(from, to);
                                  }
                                  setDragFrom(null);
                                  setDragCursor(false);
                                }}
                                onDragEnd={() => {
                                  setDragFrom(null);
                                  setDragCursor(false);
                                }}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  if (suppressContextToggle) {
                                    setSuppressContextToggle(false);
                                    return;
                                  }
                                  if (!arrowStart && !arrowMoved) {
                                    toggleRedSquare(rIdx, cIdx);
                                  }
                                }}
                                onMouseDown={(e) => {
                                  if (e.button === 2) {
                                    e.preventDefault();
                                    startArrow(rIdx, cIdx);
                                  } else if (e.button === 0 && piece) {
                                    if (activeSubsection?.type === "study" || !isAtLatestMove) {
                                      setDragCursor(false);
                                    } else {
                                      setDragCursor(true);
                                    }
                                  }
                                }}
                                onMouseEnter={(e) => handleRightDrag(rIdx, cIdx, e.buttons)}
                                onMouseMove={(e) => handleRightDrag(rIdx, cIdx, e.buttons)}
                                onMouseUp={(e) => {
                                  if (e.button === 2) {
                                    e.preventDefault();
                                    handleRightUp();
                                  } else if (e.button === 0) {
                                    setDragCursor(false);
                                  }
                                }}
                                className={`w-full h-full flex items-center justify-center text-2xl font-semibold relative overflow-hidden ${
                                  isSelected ? "ring-2 ring-pink-400" : ""
                                } ${
                                  isLegal
                                    ? "after:absolute after:h-3 after:w-3 after:rounded-full after:bg-pink-400/70"
                                    : ""
                                } ${piece ? "cursor-piece" : "cursor-auto"}`}
                                style={
                                  {
                                    backgroundColor: redSquares.has(sq)
                                      ? "#ef4444"
                                      : isLightSquare
                                        ? boardColors.light
                                        : boardColors.dark,
                                    ...(piece
                                      ? {
                                          "--cursor-open": `url(${macCursorOpen}) 8 8, grab`,
                                          "--cursor-closed": `url(${macCursorClosed}) 8 8, grabbing`,
                                        }
                                      : {}),
                                  } as CSSProperties
                                }
                                data-has-piece={!!piece}
                                data-square={sq}
                                data-piece={piece ? `${piece.color}${piece.type}` : ""}
                                data-test="board-square"
                              >
                                {isLastMove && (
                                  <div className="absolute inset-0 bg-yellow-400/50 pointer-events-none z-0" />
                                )}
                                {piece ? (
                                  <img
                                    src={pieceSprite(piece) || ""}
                                    alt=""
                                    className={`relative z-10 w-full h-full object-contain ${
                                      piece.color === "w" && piece.type === "p" ? "p-0 scale-110" : "p-1"
                                    } ${
                                      piece.color === "b" && piece.type === "k" ? "scale-110 translate-y-0.5" : ""
                                    }`}
                                  />
                                ) : null}
                              </button>
                            );
                          }),
                        )}
                        {arrowStart && arrowTarget && (
                          <svg className="absolute inset-0 pointer-events-none" viewBox="0 0 100 100">
                            <defs>
                              <marker
                                id="arrowhead-lesson-current"
                                markerWidth="4"
                                markerHeight="4"
                                refX="2"
                                refY="2"
                                orient="auto"
                              >
                                <path d="M0,0 L0,4 L4,2 z" fill="rgba(234,179,8,0.8)" />
                              </marker>
                            </defs>
                            {(() => {
                              const toPct = (row: number, col: number) => ({
                                x: ((col + 0.5) / 8) * 100,
                                y: ((row + 0.5) / 8) * 100,
                              });
                              const start = toPct(arrowStart.row, arrowStart.col);
                              const end = toPct(arrowTarget.row, arrowTarget.col);
                              return (
                                <line
                                  x1={start.x}
                                  y1={start.y}
                                  x2={end.x}
                                  y2={end.y}
                                  stroke="rgba(234,179,8,0.8)"
                                  strokeWidth="1"
                                  markerEnd="url(#arrowhead-lesson-current)"
                                />
                              );
                            })()}
                          </svg>
                        )}
                        {arrows.map((arrow, idx) => (
                          <svg key={`arrow-${idx}`} className="absolute inset-0 pointer-events-none" viewBox="0 0 100 100">
                            <defs>
                              <marker
                                id={`arrowhead-lesson-${idx}`}
                                markerWidth="4"
                                markerHeight="4"
                                refX="2"
                                refY="2"
                                orient="auto"
                              >
                                <path d="M0,0 L0,4 L4,2 z" fill="rgba(234,179,8,0.8)" />
                              </marker>
                            </defs>
                            {(() => {
                              const toPct = (row: number, col: number) => ({
                                x: ((col + 0.5) / 8) * 100,
                                y: ((row + 0.5) / 8) * 100,
                              });
                              const start = toPct(arrow.start.row, arrow.start.col);
                              const end = toPct(arrow.end.row, arrow.end.col);
                              return (
                                <line
                                  x1={start.x}
                                  y1={start.y}
                                  x2={end.x}
                                  y2={end.y}
                                  stroke="rgba(234,179,8,0.8)"
                                  strokeWidth="1"
                                  markerEnd={`url(#arrowhead-lesson-${idx})`}
                                />
                              );
                            })()}
                          </svg>
                        ))}
                        {arrows.map((arrow, idx) => (
                          <svg key={`arrow-${idx}`} className="absolute inset-0 pointer-events-none" viewBox="0 0 100 100">
                            <defs>
                              <marker
                                id={`arrowhead-lesson-${idx}`}
                                markerWidth="4"
                                markerHeight="4"
                                refX="2"
                                refY="2"
                                orient="auto"
                              >
                                <path d="M0,0 L0,4 L4,2 z" fill="rgba(234,179,8,0.8)" />
                              </marker>
                            </defs>
                            {(() => {
                              const toPct = (row: number, col: number) => ({
                                x: ((col + 0.5) / 8) * 100,
                                y: ((row + 0.5) / 8) * 100,
                              });
                              const start = toPct(arrow.start.row, arrow.start.col);
                              const end = toPct(arrow.end.row, arrow.end.col);
                              return (
                                <line
                                  x1={start.x}
                                  y1={start.y}
                                  x2={end.x}
                                  y2={end.y}
                                  stroke="rgba(234,179,8,0.8)"
                                  strokeWidth="1"
                                  markerEnd={`url(#arrowhead-lesson-${idx})`}
                                />
                              );
                            })()}
                          </svg>
                        ))}
                      </div>
                    </div>

                    <div className="pointer-events-none absolute left-0 top-0 bottom-6 grid grid-rows-8 text-xs font-semibold text-white/80">
                      {rankLabels.map((label) => (
                        <span key={`rank-${label}`} className="flex items-center justify-end pr-2">
                          {label}
                        </span>
                      ))}
                    </div>

                    <div className="pointer-events-none absolute left-6 right-0 bottom-0 grid grid-cols-8 text-xs font-semibold text-white/80">
                      {fileLabels.map((label) => (
                        <span key={`file-${label}`} className="text-center pt-1">
                          {label}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {showBoardControls && (
                <div className="mt-3 flex items-center gap-2 text-white">
                  <div className="flex rounded-full bg-white/10 p-1">
                    <button
                      className={`px-3 py-1 rounded-full text-sm ${
                        orientation === "w" ? "bg-white text-slate-900 font-semibold" : "text-white/80"
                      }`}
                      onClick={() => setOrientation("w")}
                    >
                      W
                    </button>
                    <button
                      className={`px-3 py-1 rounded-full text-sm ${
                        orientation === "b" ? "bg-white text-slate-900 font-semibold" : "text-white/80"
                      }`}
                      onClick={() => setOrientation("b")}
                    >
                      B
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
                      aria-label="Prev move"
                      onClick={goPrevMove}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
                      aria-label="Next move"
                      onClick={goNextMove}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    {activeSubsection?.type === "study" && activeSubsection.pgn && (
                      <button
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
                        aria-label="Download PGN"
                        onClick={handleDownloadStudy}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {editMode && (
                <div className="mt-3 flex flex-wrap gap-2 text-white">
                  {piecePalette.map((p) => (
                    <button
                      key={`${p.label}-${p.type}`}
                      onClick={() => setSelectedEdit(p)}
                      className={`px-2 py-1 rounded-md border text-xs ${
                        selectedEdit === p ? "bg-pink-500 text-white border-pink-500" : "bg-white/5 border-white/10"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              {trainerNote && (
                <div className="rounded-xl bg-slate-900 border border-white/10 text-white p-4 shadow-lg">
                  <div className="font-semibold mb-2">Trainer Note</div>
                  <p className="text-sm text-white/80 whitespace-pre-wrap">{trainerNote}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {navOpen && (
        <div className="fixed inset-0 z-30 flex">
          <div className="flex-1 bg-black/50" onClick={() => setNavOpen(false)} />
          <div className="w-full max-w-md h-full bg-slate-900 text-white border-l border-white/10 shadow-2xl overflow-y-auto">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <div className="text-xl font-bold">{course?.title || "Course"}</div>
                <div className="text-sm text-white/60">Select a chapter or drill</div>
              </div>
              <button
                className="p-2 rounded-full hover:bg-white/10"
                onClick={() => setNavOpen(false)}
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={handleAddChapter} className="w-full justify-center">
                  Add chapter
                </Button>
              )}
              {loadingCourse && <div className="text-white/70 text-sm">Loading chapters...</div>}
              {!loadingCourse && chapters.length === 0 && (
                <div className="text-white/60 text-sm">No chapters yet.</div>
              )}
              {chapters.map((chapter) => {
                const expanded = expandedChapters[chapter.id];
                const subsections = Object.values(chapter.subsections || {});
                return (
                  <div
                    key={chapter.id}
                    className="rounded-xl border border-white/10 bg-white/5 hover:border-pink-400"
                  >
                    <div className="p-3 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold">{chapter.title}</div>
                        <div className="text-xs text-white/60">Items: {subsections.length}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                            setSubsectionModal({
                              chapterId: chapter.id,
                              mode: "create",
                              type: "video",
                              title: "",
                              videoUrl: "",
                              pgn: "",
                              fen: "",
                              quizQuestions: [{ id: "q1", prompt: "" }],
                              correctQuestionIndex: 1,
                              trainerNote: "",
                            })
                          }
                          aria-label="Add subsection"
                        >
                          <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteChapter(chapter.id)}
                              aria-label="Delete chapter"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="outline" onClick={() => toggleChapter(chapter.id)}>
                          {expanded ? "Close" : "Open"}
                        </Button>
                      </div>
                    </div>
                    {expanded && (
                      <div className="bg-white/10 border-t border-white/10">
                        {subsections.map((item) => (
                          <div
                            key={`${chapter.id}-${item.id}`}
                            className="flex items-center justify-between px-4 py-2 text-sm text-white/80 hover:bg-white/10 cursor-pointer"
                            onClick={() => handleSelectSubsection(item)}
                          >
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-white/40" />
                              <span className="capitalize text-white/60">{item.type}</span>
                              <span>{item.title}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {!isAdmin && (item.type === "video" || item.type === "study") && (
                                completedSubsections.has(item.id) ? (
                                  <span className="text-emerald-300 text-xs font-semibold">Completed</span>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCompleteSubsection(item);
                                    }}
                                  >
                                    Complete
                                  </Button>
                                )
                              )}
                              {isAdmin && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSubsection(chapter.id, item.id);
                                  }}
                                >
                                  Delete
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                        {subsections.length === 0 && (
                          <div className="px-4 py-2 text-xs text-white/60">No subsections yet.</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {chapterModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 text-white border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <div className="text-lg font-semibold">
                  {chapterModal.mode === "create" ? "Add chapter" : "Edit chapter"}
                </div>
                <div className="text-xs text-white/60">Admin-only</div>
              </div>
              <button
                className="p-2 rounded-full hover:bg-white/10 text-white/70"
                onClick={() => setChapterModal(null)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-white/80">Title</label>
                <input
                  value={chapterModal.title}
                  onChange={(e) => setChapterModal((prev) => (prev ? { ...prev, title: e.target.value } : prev))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-400"
                  placeholder="Chapter title"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-white/80">Order</label>
                <input
                  type="number"
                  value={chapterModal.index}
                  onChange={(e) =>
                    setChapterModal((prev) => (prev ? { ...prev, index: Number(e.target.value) } : prev))
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-400"
                  min={0}
                />
                <div className="text-xs text-white/60">Lower numbers appear first.</div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setChapterModal(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!courseId || !chapterModal.title.trim()) return;
                    if (chapterModal.mode === "create") {
                      await addChapter(courseId, chapterModal.title.trim(), chapterModal.index);
                    } else if (chapterModal.chapter) {
                      await updateChapter(courseId, chapterModal.chapter.id, {
                        title: chapterModal.title.trim(),
                        index: chapterModal.index,
                      });
                    }
                    setChapterModal(null);
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {subsectionModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 text-white border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <div className="text-lg font-semibold">Add subsection</div>
                <div className="text-xs text-white/60">Admin-only</div>
              </div>
              <button
                className="p-2 rounded-full hover:bg-white/10 text-white/70"
                onClick={() => setSubsectionModal(null)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-white/80">Type</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setTypeMenuOpen((v) => !v)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none hover:border-white/20 flex items-center justify-between capitalize"
                  >
                    <span>{subsectionModal.type}</span>
                    <span className="text-xs text-white/60">{typeMenuOpen ? "Hide" : "Show"}</span>
                  </button>
                  {typeMenuOpen && (
                    <div className="absolute z-20 mt-2 w-full rounded-2xl bg-slate-800 border border-white/10 shadow-2xl overflow-hidden">
                      {(["video", "study", "quiz"] as Subsection["type"][]).map((type) => (
                        <button
                          key={type}
                          onClick={() => {
                            setSubsectionModal((prev) => (prev ? { ...prev, type } : prev));
                            setTypeMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 capitalize"
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-white/80">Title</label>
                <input
                  value={subsectionModal.title}
                  onChange={(e) => setSubsectionModal((prev) => (prev ? { ...prev, title: e.target.value } : prev))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-400"
                  placeholder="Subsection title"
                />
              </div>

              {subsectionModal.type === "video" && (
                <div className="space-y-2">
                  <label className="text-sm text-white/80 flex items-center justify-between">
                    <span>Video URL or Upload</span>
                    <span className="text-xs text-white/60">No size limit</span>
                  </label>
                  <input
                    value={subsectionModal.videoUrl}
                    onChange={(e) =>
                      setSubsectionModal((prev) => (prev ? { ...prev, videoUrl: e.target.value } : prev))
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-400"
                    placeholder="https://..."
                  />
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadError(null);
                      const reader = new FileReader();
                      reader.onerror = () =>
                        setUploadError("Could not read the video file. Try again or use a hosted link instead.");
                      reader.onload = (ev) => {
                        const result = ev.target?.result;
                        if (typeof result === "string") {
                          setSubsectionModal((prev) => (prev ? { ...prev, videoUrl: result } : prev));
                        } else {
                          setUploadError("Could not process the video file. Please try another file or a URL.");
                        }
                      };
                      try {
                        reader.readAsDataURL(file);
                      } catch (err) {
                        setUploadError("Video is too large to inline here. Please host it (e.g., MP4 link) and paste the URL.");
                      }
                    }}
                    className="w-full text-sm text-white/80 file:mr-3 file:rounded-lg file:border-none file:bg-white/10 file:px-3 file:py-2 file:text-white hover:file:bg-white/20"
                  />
                  {uploadError && <div className="text-xs text-red-300">{uploadError}</div>}
                  <div className="space-y-2">
                    <label className="text-sm text-white/80">Trainer note (optional)</label>
                    <textarea
                      value={subsectionModal.trainerNote}
                      onChange={(e) =>
                        setSubsectionModal((prev) => (prev ? { ...prev, trainerNote: e.target.value } : prev))
                      }
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-400"
                      rows={2}
                      placeholder="Message to show in Trainer Note during this video"
                    />
                  </div>
                </div>
              )}

              {subsectionModal.type === "study" && (
                <div className="space-y-2">
                  <label className="text-sm text-white/80 flex items-center justify-between">
                    <span>PGN</span>
                    <span className="text-xs text-white/60">Paste or upload PGN</span>
                  </label>
                  <textarea
                    value={subsectionModal.pgn}
                    onChange={(e) => setSubsectionModal((prev) => (prev ? { ...prev, pgn: e.target.value } : prev))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-400"
                    rows={3}
                    placeholder="Paste PGN"
                  />
                  <input
                    type="file"
                    accept=".pgn,text/plain"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const result = ev.target?.result;
                        if (typeof result === "string") {
                          setSubsectionModal((prev) => (prev ? { ...prev, pgn: result } : prev));
                        }
                      };
                      reader.readAsText(file);
                    }}
                    className="w-full text-sm text-white/80 file:mr-3 file:rounded-lg file:border-none file:bg-white/10 file:px-3 file:py-2 file:text-white hover:file:bg-white/20"
                  />
                </div>
              )}

              {subsectionModal.type === "quiz" && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm text-white/80 flex items-center justify-between gap-2">
                      <span>Options</span>
                      <button
                        type="button"
                        onClick={() =>
                          setSubsectionModal((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  quizQuestions: [
                                    ...prev.quizQuestions,
                                    { id: `q${prev.quizQuestions.length + 1}`, prompt: "" },
                                  ],
                                }
                              : prev,
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
                      >
                        <Plus className="h-3 w-3" />
                        Add
                      </button>
                    </label>
                    <div className="space-y-3">
                      {subsectionModal.quizQuestions.map((q, idx) => (
                        <textarea
                          key={q.id}
                          value={q.prompt}
                          onChange={(e) =>
                            setSubsectionModal((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    quizQuestions: prev.quizQuestions.map((qq, i) =>
                                      i === idx ? { ...qq, prompt: e.target.value } : qq,
                                    ),
                                  }
                                : prev,
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-400"
                          rows={2}
                          placeholder={`Option ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-white/80">FEN</label>
                    <input
                      value={subsectionModal.fen}
                      onChange={(e) =>
                        setSubsectionModal((prev) => (prev ? { ...prev, fen: e.target.value } : prev))
                      }
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-400"
                      placeholder="e.g. rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-white/80">Correct option number</label>
                    <input
                      type="number"
                      min={1}
                      value={subsectionModal.correctQuestionIndex}
                      onChange={(e) =>
                        setSubsectionModal((prev) =>
                          prev ? { ...prev, correctQuestionIndex: Number(e.target.value) || 1 } : prev,
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-400"
                      placeholder="Enter the question number (e.g. 1)"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-white/80">Trainer note (optional)</label>
                    <textarea
                      value={subsectionModal.trainerNote}
                      onChange={(e) =>
                        setSubsectionModal((prev) => (prev ? { ...prev, trainerNote: e.target.value } : prev))
                      }
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-400"
                      rows={2}
                      placeholder="Message to show in Trainer Note during this quiz"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setSubsectionModal(null)}>
                  Cancel
                </Button>
                <Button
                  disabled={savingSubsection}
                  onClick={async () => {
                    if (!subsectionModal) return;
                    setSaveError(null);
                    if (!courseId) {
                      setSaveError("Course is still loading. Try again in a moment.");
                      return;
                    }
                    const trimmedTitle = subsectionModal.title.trim();
                    if (!trimmedTitle) {
                      setSaveError("Add a title for this subsection.");
                      return;
                    }
                    const trainerNote = subsectionModal.trainerNote.trim();
                    let payload: Subsection | null = null;

                    if (subsectionModal.type === "video") {
                      const rawUrl = subsectionModal.videoUrl.trim();
                      if (!rawUrl) {
                        setSaveError("Add a video link or upload a file before saving.");
                        return;
                      }
                      const parsedSource = getVideoSource(rawUrl);
                      if (!parsedSource) {
                        setSaveError("Video link is not valid. Use a direct MP4/WEBM/HLS URL or YouTube link.");
                        return;
                      }
                      if (parsedSource.type === "blocked") {
                        setSaveError(parsedSource.reason || "This video link cannot be played here.");
                        return;
                      }
                      if (rawUrl.startsWith("data:") && rawUrl.length > 4_000_000) {
                        setSaveError("Video is too large to inline. Please host it (e.g., MP4 link) and paste the URL.");
                        return;
                      }
                      payload = {
                        id: "",
                        type: "video",
                        title: trimmedTitle,
                        videoUrl: rawUrl,
                        ...(trainerNote ? { trainerNote } : {}),
                      };
                    } else if (subsectionModal.type === "study") {
                      payload = {
                        id: "",
                        type: "study",
                        title: trimmedTitle,
                        pgn: subsectionModal.pgn.trim(),
                      };
                    } else {
                      const optionsArr = subsectionModal.quizQuestions.map((q) => q.prompt.trim());
                      const correctIdx = Math.max(
                        0,
                        Math.min(optionsArr.length - 1, subsectionModal.correctQuestionIndex - 1),
                      );
                      const questions = [
                        {
                          id: "q1",
                          prompt: "Select the correct option",
                          options: optionsArr,
                          correctIndex: correctIdx,
                        },
                      ];
                      payload = {
                        id: "",
                        type: "quiz",
                        title: trimmedTitle,
                        fen: subsectionModal.fen.trim() || undefined,
                        ...(trainerNote ? { trainerNote } : {}),
                        questions,
                      };
                    }

                    if (!payload) return;
                    try {
                      setSavingSubsection(true);
                      await saveSubsection(courseId, subsectionModal.chapterId, payload);
                      setSubsectionModal(null);
                      setTypeMenuOpen(false);
                    } catch (err) {
                      console.error("Failed to save subsection", err);
                      setSaveError("Could not save. Check your connection and try again.");
                    } finally {
                      setSavingSubsection(false);
                    }
                  }}
                >
                  {savingSubsection ? "Saving..." : "Save"}
                </Button>
              </div>
              {saveError && <div className="text-xs text-red-300 pt-1 text-right">{saveError}</div>}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

