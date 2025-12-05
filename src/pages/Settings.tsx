import { useMemo, useState, useEffect, type ElementType } from "react";
import {
  LogOut,
  UserRound,
  LayoutGrid,
  RotateCcw,
  Mail,
  ShieldOff,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import {
  getCourses,
  getProgress,
  resetCourseProgress,
  setSuggestedCourses,
  setChessUsername,
  updateBoardTheme,
  type Course,
} from "../lib/mockApi";
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
import { BOARD_THEMES, resolveBoardTheme } from "../lib/boardThemes";

type SettingAction =
  | { type: "button"; label: string; onClick: () => void; variant?: "primary" | "ghost" | "outline" }
  | { type: "toggle"; value: boolean; onToggle: (next: boolean) => void; disabled?: boolean }
  | { type: "disabled"; label: string };

type SettingItem = {
  key: string;
  title: string;
  description: string;
  accent: string;
  icon: ElementType;
  action: SettingAction;
  highlight?: string;
  danger?: boolean;
};

type ChessProfile = {
  username: string;
  name?: string;
  followers?: number;
  country?: string;
  lastOnline?: number;
  status?: string;
  title?: string;
  avatar?: string;
};

type Option = { label: string; value: string };

export default function Settings() {
  const { user, logout, setUser } = useAuth();
  const [linkedUsername, setLinkedUsername] = useState<string>(() => {
    if (user?.chessUsername) return user.chessUsername;
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split("@")[0];
    return "YourUsername";
  });
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountInput, setAccountInput] = useState("");
  const [accountStatus, setAccountStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [accountError, setAccountError] = useState<string | null>(null);
  const [fetchedProfile, setFetchedProfile] = useState<ChessProfile | null>(null);
  const [boardModalOpen, setBoardModalOpen] = useState(false);
  const [boardTheme, setBoardTheme] = useState(() => resolveBoardTheme(user?.boardTheme).key);
  const [pieceTheme, setPieceTheme] = useState(pieceOptions[0].value);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetCourses, setResetCourses] = useState<{ course: Course; percent: number }[]>([]);
  const [resetLoading, setResetLoading] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const sampleFen = "k5rr/5R2/8/2p1P1p1/1p2Q3/1P6/K2p4/3b4 w - - 0 1";
  const sampleSquares = useMemo(() => buildBoard(sampleFen), []);

  useEffect(() => {
    if (user?.chessUsername) setLinkedUsername(user.chessUsername);
    else if (user?.displayName) setLinkedUsername(user.displayName);
    else if (user?.email) setLinkedUsername(user.email.split("@")[0]);
  }, [user]);

  useEffect(() => {
    setBoardTheme(resolveBoardTheme(user?.boardTheme).key);
  }, [user?.boardTheme]);

  const fetchTopOpenings = async (username: string): Promise<string[]> => {
    // chess.com archives list
    const archivesResp = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}/games/archives`);
    if (!archivesResp.ok) throw new Error("Could not read game archives for this user.");
    const archivesData = (await archivesResp.json()) as { archives?: string[] };
    const archives = archivesData.archives || [];
    const latest = archives[archives.length - 1];
    if (!latest) return [];
    const gamesResp = await fetch(latest);
    if (!gamesResp.ok) return [];
    const gamesData = (await gamesResp.json()) as { games?: any[] };
    const counts: Record<string, number> = {};
    (gamesData.games || []).slice(-50).forEach((g) => {
      const opening = g?.opening || g?.eco || g?.eco_url;
      if (!opening || typeof opening !== "string") return;
      const name = opening.toLowerCase();
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);
  };

  const mapOpeningsToCourses = (openings: string[], courses: Course[]): string[] => {
    const lowerCourses = courses.map((c) => ({ id: c.id, title: c.title.toLowerCase(), course: c }));
    const picks: string[] = [];
    openings.forEach((op) => {
      const tokens = op.toLowerCase().split(/[^a-z]+/).filter(Boolean);
      const primary = tokens[0] || op.toLowerCase();
      const match = lowerCourses.find(
        (c) =>
          c.title.includes(primary) ||
          tokens.some((t) => t.length > 3 && c.title.includes(t)) ||
          (primary.includes("sicilian") && c.title.includes("dragon")),
      );
      if (match && !picks.includes(match.id)) picks.push(match.id);
    });
    if (!picks.length && courses.length) {
      picks.push(courses[0].id);
    }
    return picks.slice(0, 3);
  };

  const chessUsername = useMemo(() => linkedUsername, [linkedUsername]);
  const handleResetCourse = async (courseId: string) => {
    if (!user) return;
    setResettingId(courseId);
    try {
      await resetCourseProgress(user.id, courseId);
      setResetCourses((prev) => prev.filter((item) => item.course.id !== courseId));
    } finally {
      setResettingId(null);
    }
  };

  const items: SettingItem[] = [
    {
      key: "logout",
      title: "Log Out",
      description: "Sign out from PawnPoint on this device.",
      accent: "bg-emerald-600",
      icon: LogOut,
      action: {
        type: "button",
        label: "Log Out",
        variant: "outline",
        onClick: () => logout(),
      },
    },
    {
      key: "chess",
      title: "Chess.com Account",
      description: "Your account is connected with the following chess.com username:",
      highlight: chessUsername,
      accent: "bg-emerald-700",
      icon: UserRound,
      action: {
        type: "button",
        label: "Change Account",
        variant: "outline",
        onClick: () => {
          setAccountInput(linkedUsername || "");
          setAccountError(null);
          setFetchedProfile(null);
          setAccountStatus("idle");
          setAccountModalOpen(true);
        },
      },
    },
    {
      key: "board",
      title: "Board and Theme Customization",
      description: "Customize your chessboard and chess pieces.",
      accent: "bg-emerald-700",
      icon: LayoutGrid,
      action: {
        type: "button",
        label: "Set up Preferences",
        variant: "outline",
        onClick: () => {
          setBoardModalOpen(true);
        },
      },
    },
    {
      key: "reset",
      title: "Reset Progress",
      description: "Choose which courses to reset",
      accent: "bg-emerald-700",
      icon: RotateCcw,
      action: {
        type: "button",
        label: "Reset Progress",
        variant: "outline",
        onClick: async () => {
          if (!user) return;
          setResetModalOpen(true);
          setResetLoading(true);
          try {
            const [courses, progress] = await Promise.all([getCourses(), getProgress(user.id)]);
            const list = Object.entries(progress || {})
              .map(([courseId, entry]) => {
                const course = courses.find((c) => c.id === courseId);
                if (!course) return null;
                const percent = entry.progressPercent ?? entry.percent ?? 0;
                if (percent <= 0) return null;
                return { course, percent };
              })
              .filter(Boolean) as { course: Course; percent: number }[];
            setResetCourses(list);
          } finally {
            setResetLoading(false);
          }
        },
      },
    },
    {
      key: "email",
      title: "Change Email",
      description: `Your account is registered with: ${user?.email || "unknown"}`,
      accent: "bg-emerald-700",
      icon: Mail,
      action: {
        type: "button",
        label: "Change Email",
        variant: "outline",
        onClick: () => {},
      },
    },
    {
      key: "delete",
      title: "Delete Account",
      description:
        "Important: Deleting your account will permanently remove all your progress and data. This action cannot be undone.",
      accent: "bg-rose-700",
      icon: ShieldOff,
      danger: true,
      action: {
        type: "button",
        label: "Delete Account",
        variant: "outline",
        onClick: () => {},
      },
    },
  ];

  const handleLookupChessCom = async () => {
    const inputRaw = accountInput.trim();
    const username = inputRaw.toLowerCase();
    if (!username) {
      setAccountError("Enter a chess.com username.");
      return;
    }
    setAccountStatus("loading");
    setAccountError(null);
    setFetchedProfile(null);
    try {
      const resp = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}`);
      if (!resp.ok) {
        throw new Error("User not found on chess.com");
      }
      const data = (await resp.json()) as any;
      const profile: ChessProfile = {
        username: data.username,
        name: data.name,
        followers: data.followers,
        country: data.country,
        lastOnline: data.last_online,
        status: data.status,
        title: data.title,
        avatar: data.avatar,
      };
      setFetchedProfile(profile);
      setAccountStatus("success");
    } catch (err: any) {
      setAccountStatus("error");
      setAccountError(err?.message || "Could not find that user. Check the spelling and try again.");
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>
        <div className="rounded-3xl bg-slate-900/90 border border-white/10 shadow-2xl overflow-hidden">
          <div className="divide-y divide-white/5">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.key}
                  className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between hover:bg-white/5"
                >
                  <div className="flex items-start gap-4">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center text-white ${item.accent}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-lg font-semibold text-white">{item.title}</div>
              <div className="text-sm text-white/70 leading-snug">{item.description}</div>
              {item.highlight && <div className="text-sm font-semibold text-emerald-300">{item.highlight}</div>}
            </div>
          </div>

                  <div className="min-w-[140px] flex justify-end">
                    {(() => {
                      const action = item.action;
                      if (action.type === "button") {
                        return (
                          <Button
                            variant={action.variant ?? "outline"}
                            className={`w-full sm:w-auto ${item.danger ? "border-rose-300 text-rose-100 hover:bg-rose-500/20" : ""}`}
                            onClick={action.onClick}
                          >
                            {action.label}
                          </Button>
                        );
                      }
                      if (action.type === "toggle") {
                        return (
                          <button
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                              action.value ? "bg-emerald-500" : "bg-white/20"
                            }`}
                            onClick={() => action.onToggle(!action.value)}
                            disabled={action.disabled}
                            aria-pressed={action.value}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                                action.value ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                        );
                      }
                      return (
                        <div className="rounded-full bg-slate-600 text-white/80 px-4 py-2 text-sm select-none">
                          {action.label}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {accountModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 text-white border border-white/10 shadow-2xl relative">
            <button
              className="absolute right-3 top-3 text-white/70 hover:text-white"
              onClick={() => setAccountModalOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="px-6 py-6 space-y-4">
              <div>
                <div className="text-xl font-bold">Change your Chess.com account</div>
                <div className="text-sm text-white/70 mt-1">We will use this information to:</div>
              </div>

              <div className="space-y-2 text-sm text-white/80">
                {[
                  "Recommend you the best courses to study",
                  "Analyze your games and tell you where you make mistakes",
                  "Break down your chess skills and what to improve",
                ].map((line, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5" />
                    <span>{line}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.08em] text-white/50">Chess.com username</label>
                <div className="flex items-center gap-2">
                  <input
                    value={accountInput}
                    onChange={(e) => setAccountInput(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="Chess.com username"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleLookupChessCom();
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    className="whitespace-nowrap"
                    onClick={handleLookupChessCom}
                    disabled={accountStatus === "loading"}
                  >
                    {accountStatus === "loading" ? "Searching..." : "Link"}
                  </Button>
                </div>
                {accountError && <div className="text-xs text-rose-300">{accountError}</div>}
                {accountStatus === "success" && fetchedProfile && (
                  <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-3 text-sm space-y-1">
                    <div className="font-semibold text-emerald-200 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      {fetchedProfile.username}
                    </div>
                    {fetchedProfile.title && <div className="text-white/80">Title: {fetchedProfile.title}</div>}
                    <div className="text-white/70">
                      {formatLastOnline(fetchedProfile.lastOnline) || "Activity data unavailable"}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Button
                  className="w-full justify-center"
                  onClick={async () => {
                    if (accountStatus !== "success" || !fetchedProfile) {
                      await handleLookupChessCom();
                      return;
                    }
                    try {
                      setAccountStatus("loading");
                      const inputRaw = accountInput.trim();
                      const lookupName = fetchedProfile.username.toLowerCase();
                      const openings = await fetchTopOpenings(lookupName);
                      const courses = await getCourses();
                      const courseIds = mapOpeningsToCourses(openings, courses);
                      setSuggestedCourses(courseIds, inputRaw || fetchedProfile.username);
                      setLinkedUsername(inputRaw || fetchedProfile.username);
                      const updated = await setChessUsername(inputRaw || fetchedProfile.username);
                      if (updated) setUser(updated);
                      setAccountStatus("success");
                      setAccountModalOpen(false);
                    } catch (err: any) {
                      setAccountStatus("error");
                      setAccountError(err?.message || "Could not fetch openings to build recommendations.");
                    }
                  }}
                >
                  {accountStatus === "success" ? "Save account" : accountStatus === "loading" ? "Working..." : "Continue"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {boardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-4xl rounded-3xl bg-slate-900 text-white border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="text-lg font-semibold">Board customization</div>
              <button className="text-white/70 hover:text-white" onClick={() => setBoardModalOpen(false)} aria-label="Close">
                ×
              </button>
            </div>
            <div className="p-5 space-y-6">
              <div className="rounded-2xl bg-slate-800/70 border border-white/10 p-4">
                <div className="text-white mb-3 font-semibold">Active Piece: White Queen</div>
                <div className="flex flex-col gap-3 items-center">
                  <div className="relative inline-block">
                    <div className="grid grid-cols-8 grid-rows-8 w-[360px] aspect-square overflow-hidden rounded-xl border border-white/10">
                      {sampleSquares.map((sq) => (
                        <div
                          key={sq.name}
                          className="relative flex items-center justify-center text-xs font-semibold"
                          style={{
                            background: sq.isLight ? boardColors[boardTheme]?.light || boardColors.brown.light : boardColors[boardTheme]?.dark || boardColors.brown.dark,
                            color: "#111",
                          }}
                        >
                          {sq.isHighlight && (
                            <div
                              className="absolute inset-0"
                              style={{ backgroundColor: highlightPreviewColor, opacity: 0.8 }}
                            />
                          )}
                      {sq.piece && (
                        <img
                          src={pieceSpriteFromFen(sq.piece)}
                          alt=""
                          className="relative z-10 h-[36px] w-[36px] object-contain"
                          draggable={false}
                        />
                      )}
                        {sq.coord && (
                          <div className="absolute left-1 bottom-1 text-[10px] text-black/70">{sq.coord}</div>
                        )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 text-sm text-white">
                <Select label="Board" value={boardTheme} onChange={(v) => setBoardTheme(v)} options={boardOptions} />
                <Select label="Pieces" value={pieceTheme} onChange={(v) => setPieceTheme(v)} options={pieceOptions} />
              </div>

              <div className="flex justify-end">
                <Button
                  className="px-6"
                  onClick={async () => {
                    const resolved = resolveBoardTheme(boardTheme).key;
                    const updated = await updateBoardTheme(resolved);
                    if (updated) setUser(updated);
                    setBoardModalOpen(false);
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {resetModalOpen && (
        <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/60 px-4 py-10 overflow-y-auto">
          <div className="w-full max-w-5xl rounded-2xl bg-slate-900 text-white border border-white/10 shadow-2xl p-6 space-y-4">
            <button
              className="flex items-center gap-2 text-sm text-white/70"
              onClick={() => setResetModalOpen(false)}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <div className="text-2xl font-bold">Reset Progress</div>
            {resetLoading ? (
              <div className="text-white/70 text-sm">Loading your courses…</div>
            ) : resetCourses.length === 0 ? (
              <div className="text-white/70 text-sm">You have no courses with earned XP to reset.</div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {resetCourses.map(({ course, percent }) => (
                  <div
                    key={course.id}
                    className="rounded-xl border border-white/10 bg-slate-800/60 p-4 flex items-center gap-4"
                  >
                    <div className="h-14 w-14 rounded-xl overflow-hidden bg-white/5 flex items-center justify-center">
                      <img src={course.thumbnailUrl} alt={course.title} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="font-semibold text-white">{course.title}</div>
                      <div className="flex items-center gap-2 text-xs text-white/70">
                        <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-emerald-400"
                            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                          />
                        </div>
                        <span className="font-semibold text-white">{percent}%</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="min-w-[88px]"
                      disabled={resettingId === course.id}
                      onClick={() => handleResetCourse(course.id)}
                    >
                      {resettingId === course.id ? "Resetting..." : "Reset"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
function formatLastOnline(ts?: number) {
  if (!ts) return null;
  const diff = Date.now() / 1000 - ts;
  if (diff < 3600) return "Active recently";
  if (diff < 86400) return "Active today";
  const days = Math.floor(diff / 86400);
  return `Active ${days}d ago`;
}

const boardOptions: Option[] = Object.keys(BOARD_THEMES).map((key) => ({
  label: key.charAt(0).toUpperCase() + key.slice(1),
  value: key,
}));
const pieceOptions: Option[] = [{ label: "chess.com", value: "chesscom" }];
const defaultPieces = {
  w: { p: whitePawn, r: whiteRook, n: whiteKnight, b: whiteBishop, q: whiteQueen, k: whiteKing },
  b: { p: blackPawn, r: blackRook, n: blackKnight, b: blackBishop, q: blackQueen, k: blackKing },
} as const;

const boardColors = BOARD_THEMES;
const highlightPreviewColor = "#f3cd4b";

function buildBoard(fen: string) {
  const rows = fen.split(" ")[0].split("/");
  const squares: { name: string; piece: string | null; isLight: boolean; isHighlight?: boolean; coord?: string }[] = [];
  rows.forEach((row, rIdx) => {
    let file = 0;
    row.split("").forEach((ch) => {
      if (/[1-8]/.test(ch)) {
        const emptyCount = Number(ch);
        for (let i = 0; i < emptyCount; i++) {
          const name = `${"abcdefgh"[file]}${8 - rIdx}`;
          squares.push({ name, piece: null, isLight: (file + rIdx) % 2 === 0, coord: name });
          file++;
        }
      } else {
        const name = `${"abcdefgh"[file]}${8 - rIdx}`;
        squares.push({ name, piece: ch, isLight: (file + rIdx) % 2 === 0, coord: name });
        file++;
      }
    });
  });
  const highlights = ["d3", "e2", "e5", "f3"];
  return squares.map((sq) => ({ ...sq, isHighlight: highlights.includes(sq.name) }));
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: Option[];
}) {
  return (
    <div className="space-y-1">
      <div className="text-white/80 text-sm">{label}</div>
      <div className="relative">
        <button className="w-full flex items-center justify-between rounded-xl bg-slate-800 border border-white/10 px-3 py-3 text-white text-sm">
          <span>{options.find((o) => o.value === value)?.label || value}</span>
          <ChevronDown className="h-4 w-4 text-white/60" />
        </button>
        <select
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function pieceSpriteFromFen(symbol: string) {
  if (!symbol || symbol.length === 0) return "";
  const isWhite = symbol === symbol.toUpperCase();
  const type = symbol.toLowerCase() as "p" | "n" | "b" | "r" | "q" | "k";
  return isWhite ? defaultPieces.w[type] : defaultPieces.b[type];
}
