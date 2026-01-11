import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Chess, Color, PieceSymbol, Square } from "chess.js";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/ui/Button";
import { awardXp } from "../lib/mockApi";
import macCursorOpen from "../assets/Mac Cursor Open Hand.png";
import macCursorClosed from "../assets/Mac Cursor Closed Hand.png";
import { resolveBoardTheme } from "../lib/boardThemes";
import { resolvePieceTheme } from "../lib/pieceThemes";
import { useAuth } from "../hooks/useAuth";
import puzzlesData from "../lib/puzzles_sample.json";

const pageBackground = {
  backgroundImage: `
    radial-gradient(1200px 600px at 50% -10%, rgba(255, 255, 255, 0.03), transparent 60%),
    linear-gradient(180deg, #0b1220 0%, #0d1628 25%, #0b1220 45%, #0a0f1c 60%, #070a12 75%, #000000 92%)
  `,
  minHeight: "100vh",
  color: "#ffffff",
} as const;

type PuzzleCategory = "endgame" | "middlegame" | "opening";
type Puzzle = { id: string; fen: string; moves: string[]; rating: number | null; themes?: string; gameUrl?: string; openingTags?: string };

export default function Puzzles() {
  const { user } = useAuth();
  const [category, setCategory] = useState<PuzzleCategory | null>(null);
  const [current, setCurrent] = useState<Puzzle | null>(null);
  const [fen, setFen] = useState("");
  const [orientation, setOrientation] = useState<Color>("w");
  const [selected, setSelected] = useState<Square | null>(null);
  const [status, setStatus] = useState("Select a category to start.");
  const [difficulty, setDifficulty] = useState<"easy" | "intermediate" | "advanced">("easy");
  const [userColor, setUserColor] = useState<Color>("w");
  const [solved, setSolved] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [revealMode, setRevealMode] = useState(false);
  const [lastMoveSquares, setLastMoveSquares] = useState<Square[]>([]);
  const [dragFrom, setDragFrom] = useState<Square | null>(null);
  const [arrowStart, setArrowStart] = useState<{ row: number; col: number; square: Square } | null>(null);
  const [arrowTarget, setArrowTarget] = useState<{ row: number; col: number; square: Square } | null>(null);
  const [arrowMoved, setArrowMoved] = useState(false);
  const [arrows, setArrows] = useState<
    { start: { row: number; col: number; square: Square }; end: { row: number; col: number; square: Square } }[]
  >([]);
  const solutionIndexRef = useRef(0);
  const boardColors = resolveBoardTheme(user?.boardTheme).colors;
  const { key: pieceThemeKey, pieces: pieceSet } = useMemo(() => resolvePieceTheme(user?.pieceTheme), [user?.pieceTheme]);

  const loadPuzzle = (cat: PuzzleCategory) => {
    const pool = (puzzlesData as Record<string, Puzzle[]>)[cat] || [];
    if (!pool.length) return;
    const pickPool = (() => {
      const filtered = pool.filter((p) => {
        const rating = p.rating ?? 0;
        if (difficulty === "easy") return rating < 1000;
        if (difficulty === "intermediate") return rating >= 1000 && rating < 2000;
        return rating >= 2000 && rating <= 2800;
      });
      return filtered.length ? filtered : pool;
    })();
    const pick = pickPool[Math.floor(Math.random() * pickPool.length)];
    setCurrent(pick);
    const g = new Chess(pick.fen);
    solutionIndexRef.current = 0;
    let last: Square[] = [];
    if (pick.moves.length > 0) {
      const firstMove = pick.moves[solutionIndexRef.current];
      const moved = g.move(uciToObj(firstMove));
      if (moved) {
        last = [moved.from, moved.to];
        solutionIndexRef.current += 1;
      }
    }
    setFen(g.fen());
    setLastMoveSquares(last);
    setUserColor(g.turn());
    setOrientation("w");
    setSelected(null);
    setStatus(pick.themes || pick.openingTags || pick.id);
    setSolved(false);
    setRevealMode(false);
    setArrows([]);
    setArrowStart(null);
    setArrowTarget(null);
    setArrowMoved(false);
  };

  useEffect(() => {
    if (category) {
      loadPuzzle(category);
    }
  }, [category, difficulty]);

  useEffect(() => {
    setArrows([]);
    setArrowStart(null);
    setArrowTarget(null);
    setArrowMoved(false);
  }, [orientation]);

  const board = useMemo(() => {
    const g = fen ? new Chess(fen) : new Chess();
    const rows = g.board();
    return orientation === "w" ? rows : rows.slice().reverse().map((row) => row.slice().reverse());
  }, [fen, orientation]);

  const currentTurn = useMemo<Color>(() => {
    try {
      const g = new Chess(fen);
      return g.turn();
    } catch {
      return "w";
    }
  }, [fen]);

  const squareName = (rowIdx: number, colIdx: number): Square => {
    const file = "abcdefgh"[orientation === "w" ? colIdx : 7 - colIdx];
    const rank = orientation === "w" ? 8 - rowIdx : rowIdx + 1;
    return `${file}${rank}` as Square;
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
    if (sq === arrowStart.square) {
      setArrowMoved(false);
      setArrowTarget(null);
      return;
    }
    setArrowMoved(true);
    setArrowTarget({ row: rowIdx, col: colIdx, square: sq });
  };

  const handleRightUp = () => {
    if (arrowStart && arrowMoved && arrowTarget) {
      setArrows((prev) => {
        const exists = prev.find(
          (a) => a.start.square === arrowStart.square && a.end.square === arrowTarget.square,
        );
        if (exists) {
          return prev.filter(
            (a) => !(a.start.square === arrowStart.square && a.end.square === arrowTarget.square),
          );
        }
        return [...prev, { start: arrowStart, end: arrowTarget }];
      });
    }
    setArrowMoved(false);
    setArrowStart(null);
    setArrowTarget(null);
  };

  const pieceSprite = (piece: { color: Color; type: PieceSymbol } | null) => {
    if (!piece) return null;
    return piece.color === "w" ? pieceSet.w[piece.type] : pieceSet.b[piece.type];
  };

  const pawnScaleClass = (piece: { color: Color; type: PieceSymbol } | null) => {
    if (!piece) return "";
    if (pieceThemeKey === "chesscom") {
      if (piece.type === "p") return piece.color === "w" ? "scale-110" : "scale-90";
      if (piece.type === "k" && piece.color === "b") return "scale-110 translate-y-[1px]";
    }
    if (pieceThemeKey === "freestyle" && piece.type === "p" && piece.color === "b") return "scale-110";
    return "";
  };

  const uciToObj = (uci: string) => {
    const from = uci.slice(0, 2) as Square;
    const to = uci.slice(2, 4) as Square;
    const promotion = uci[4] as PieceSymbol | undefined;
    return { from, to, promotion };
  };

  const applyNextOpponentMoves = (g: Chess, moves: string[], playerColor: Color) => {
    let last: Square[] = [];
    while (solutionIndexRef.current < moves.length) {
      const uci = moves[solutionIndexRef.current];
      const move = g.move(uciToObj(uci));
      if (!move) break;
      solutionIndexRef.current += 1;
      last = [move.from, move.to];
      if (g.turn() === playerColor) break;
    }
    setFen(g.fen());
    if (last.length) setLastMoveSquares(last);
  };

  const attemptMove = (from: Square, to: Square) => {
    if (!current || solved) return;
    const g = new Chess(fen);
    if (g.turn() !== userColor) {
      setStatus(userColor === "w" ? "White to move." : "Black to move.");
      setToast({ message: "Wait for your move.", tone: "error" });
      return;
    }
    let move: ReturnType<Chess["move"]> | null = null;
    try {
      move = g.move({ from, to, promotion: "q" });
    } catch {
      move = null;
    }
    if (!move) {
      setSelected(null);
      return;
    }
    const expected = current.moves[solutionIndexRef.current];
    if (!expected) {
      setSelected(null);
      return;
    }
    const playedUci = `${move.from}${move.to}${move.promotion || ""}`;
    if (playedUci !== expected) {
      setStatus("Incorrect move. Try again.");
      setToast({ message: "Incorrect move. Try again.", tone: "error" });
      setSelected(null);
      return;
    }
    // correct move
    solutionIndexRef.current += 1;
    setFen(g.fen());
    setSelected(null);
    setLastMoveSquares([move.from, move.to]);
    if (solutionIndexRef.current >= current.moves.length) {
      handleSolved(current);
      return;
    }
    applyNextOpponentMoves(g, current.moves, userColor);
    if (solutionIndexRef.current >= current.moves.length) {
      handleSolved(current);
    } else {
      setStatus("Your turn.");
    }
  };

  const handleSquareClick = (rowIdx: number, colIdx: number) => {
    const target = squareName(rowIdx, colIdx);
    const g = new Chess(fen);
    if (selected === target) {
      setSelected(null);
      return;
    }
    if (selected) {
      attemptMove(selected, target);
      return;
    }
    const piece = g.get(target);
    if (piece && piece.color === g.turn()) {
      setSelected(target);
    }
  };

  const resetCategory = () => {
    setCategory(null);
    setCurrent(null);
    setFen("");
    setSelected(null);
    setSolved(false);
    solutionIndexRef.current = 0;
    setStatus("Select a category to start.");
  };

  const handleSolved = (puzzle: Puzzle) => {
    setSolved(true);
    setStatus("Puzzle solved! +100 XP");
    setToast({ message: "Puzzle solved! +100 XP", tone: "success" });
    if (user?.id) {
      awardXp(user.id, 100, { source: "puzzle", subsectionId: puzzle.id });
    }
    // brief delay so the user can see the toast before loading the next puzzle
    setTimeout(() => {
      if (category) {
        loadPuzzle(category);
      }
    }, 500);
  };

  return (
    <AppShell backgroundStyle={pageBackground}>
      <div className="flex flex-col gap-4 text-white">
        {!category && (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="rounded-2xl border border-white/10 bg-black px-6 py-6 space-y-3 text-center max-w-sm w-full">
              <div className="text-lg font-semibold">Choose puzzle category</div>
              <div className="space-y-2">
                <div className="grid grid-cols-3 text-xs text-emerald-300 px-1 text-center">
                  <span>Easy</span>
                  <span>Intermediate</span>
                  <span>Advanced</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={1}
                  value={difficulty === "easy" ? 0 : difficulty === "intermediate" ? 1 : 2}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setDifficulty(val === 0 ? "easy" : val === 1 ? "intermediate" : "advanced");
                  }}
                  className="w-full accent-emerald-400"
                />
                <div className="flex justify-between px-1 text-emerald-300">
                  <span className="text-lg leading-none">•</span>
                  <span className="text-lg leading-none">•</span>
                  <span className="text-lg leading-none">•</span>
                </div>
              </div>
              <div className="flex flex-col gap-3 w-full">
                {(["endgame", "middlegame", "opening"] as PuzzleCategory[]).map((cat) => {
                  const label = cat === "endgame" ? "Endgame" : cat === "middlegame" ? "Middle Game" : "Opening";
                  return (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-3 text-sm uppercase tracking-wide"
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {category && current && (
          <div className="flex flex-col items-center gap-4">
            <div className="relative block pb-6 sm:pb-8 w-full max-w-[720px] mx-auto">
              <div
                className="rounded-[28px] overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.45)] w-full"
                style={{ backgroundColor: boardColors.dark }}
              >
                <div className="pp-board relative grid grid-cols-8 grid-rows-8 w-full max-w-[720px] aspect-square mx-auto">
                  {board.map((row, rIdx) =>
                    row.map((piece, cIdx) => {
                      const sq = squareName(rIdx, cIdx);
                      const isLightSquare = (rIdx + cIdx) % 2 === 0;
                      const isLastMove = lastMoveSquares.includes(sq);
                      const legalMoves = (() => {
                        if (!selected) return [];
                        try {
                          const g = new Chess(fen);
                          return g.moves({ square: selected, verbose: true }).map((m) => m.to);
                        } catch {
                          return [];
                        }
                      })();
                      const isLegal = legalMoves.includes(sq);
                      return (
                        <button
                          key={`${rIdx}-${cIdx}`}
                          onClick={() => handleSquareClick(rIdx, cIdx)}
                          draggable={!!piece && piece.color === currentTurn}
                          onContextMenu={(e) => {
                            e.preventDefault();
                          }}
                          onMouseDown={(e) => {
                            if (e.button === 2) {
                              e.preventDefault();
                              startArrow(rIdx, cIdx);
                            }
                          }}
                          onMouseEnter={(e) => handleRightDrag(rIdx, cIdx, e.buttons)}
                          onMouseMove={(e) => handleRightDrag(rIdx, cIdx, e.buttons)}
                          onMouseUp={(e) => {
                            if (e.button === 2) {
                              e.preventDefault();
                              handleRightUp();
                            }
                          }}
                          onDragStart={(e) => {
                            if (piece && piece.color === currentTurn) {
                              const sqName = squareName(rIdx, cIdx);
                              setDragFrom(sqName);
                              e.dataTransfer?.setData("text/plain", sqName);
                            } else {
                              e.preventDefault();
                            }
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const from = dragFrom || (e.dataTransfer?.getData("text/plain") as Square | null);
                            const to = squareName(rIdx, cIdx);
                            if (from) {
                              setDragFrom(null);
                              attemptMove(from, to);
                            }
                          }}
                          onDragEnd={() => setDragFrom(null)}
                          className={`w-full h-full flex items-center justify-center text-2xl font-semibold relative overflow-hidden ${
                            piece ? "cursor-piece" : "cursor-auto"
                          }`}
                          style={
                            {
                              backgroundColor: isLightSquare ? boardColors.light : boardColors.dark,
                              ...(piece
                                ? {
                                    "--cursor-open": `url(${macCursorOpen}) 8 8, grab`,
                                    "--cursor-closed": `url(${macCursorClosed}) 8 8, grabbing`,
                                  }
                                : {}),
                            } as CSSProperties
                          }
                        >
                          {isLastMove && <div className="absolute inset-0 bg-yellow-400/40 pointer-events-none" />}
                          {isLegal && (
                            <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
                              <div className="h-5 w-5 rounded-full bg-black/60" />
                            </div>
                          )}
                          {piece ? (
                            <img
                              src={pieceSprite(piece) || ""}
                              alt=""
                              className={`relative z-10 w-full h-full object-contain ${
                                pieceThemeKey === "freestyle" ? "p-1" : "p-1"
                              } ${pawnScaleClass(piece)}`}
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
                          id="arrowhead-puzzle-current"
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
                            markerEnd="url(#arrowhead-puzzle-current)"
                          />
                        );
                      })()}
                    </svg>
                  )}
                  {arrows.map((arrow, idx) => (
                    <svg key={`arrow-${idx}`} className="absolute inset-0 pointer-events-none" viewBox="0 0 100 100">
                      <defs>
                        <marker
                          id={`arrowhead-puzzle-${idx}`}
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
                            markerEnd={`url(#arrowhead-puzzle-${idx})`}
                          />
                        );
                      })()}
                    </svg>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black p-5 space-y-3 text-white w-full max-w-[720px] mx-auto">
              <div className="flex justify-center gap-3 flex-wrap">
                <Button
                  variant="outline"
                  className="min-w-[120px]"
                  onClick={() => {
                    if (category) {
                      loadPuzzle(category);
                    }
                  }}
                >
                  Next puzzle
                </Button>
                <Button variant="outline" className="min-w-[120px]" onClick={resetCategory}>
                  New category
                </Button>
                <Button
                  variant="outline"
                  className="min-w-[120px]"
                  onClick={() => setOrientation((prev) => (prev === "w" ? "b" : "w"))}
                >
                  Perspective
                </Button>
                <Button
                  variant="outline"
                  className="min-w-[120px]"
                  onClick={() => {
                    if (!current || solved) return;
                    setRevealMode(true);
                    const g = new Chess(current.fen);
                    solutionIndexRef.current = 0;
                    applyNextOpponentMoves(g, current.moves, g.turn());
                  }}
                >
                  Reveal solution
                </Button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className="fixed bottom-4 right-4 z-50">
            <div
              className={`rounded-lg px-4 py-3 shadow-lg flex items-center gap-3 border ${
                toast.tone === "success"
                  ? "bg-emerald-600 text-white border-emerald-300/70"
                  : "bg-red-600 text-white border-red-300/70"
              }`}
            >
              <span>{toast.message}</span>
              <button
                className="text-white/80 hover:text-white"
                onClick={() => setToast(null)}
                aria-label="Dismiss notification"
              >
                x
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}


