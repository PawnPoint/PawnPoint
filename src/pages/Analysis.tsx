import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { Chess, Color, PieceSymbol, Square } from "chess.js";
import { AppShell } from "../components/AppShell";
import { resolveBoardTheme } from "../lib/boardThemes";
import { resolvePieceTheme } from "../lib/pieceThemes";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/Button";

type EvalLine = {
  multipv: number;
  score: string;
  raw: string;
};

export default function Analysis() {
  const { user } = useAuth();
  const [fen, setFen] = useState(new Chess().fen());
  const [orientation, setOrientation] = useState<Color>("w");
  const [selected, setSelected] = useState<Square | null>(null);
  const [importText, setImportText] = useState("");
  const [toolMode, setToolMode] = useState<"moves" | "editor" | "import" | "none">("none");
  const [evalOn, setEvalOn] = useState(false);
  const [lines, setLines] = useState<EvalLine[]>([]);
  const [evalScore, setEvalScore] = useState<number | null>(null);
  const evalPendingRef = useRef(false);
  const engineRef = useRef<Worker | null>(null);
  const boardColors = resolveBoardTheme(user?.boardTheme).colors;
  const { key: pieceThemeKey, pieces: pieceSet } = useMemo(() => resolvePieceTheme(user?.pieceTheme), [user?.pieceTheme]);

  const board = useMemo(() => {
    const g = new Chess(fen);
    const rows = g.board();
    return orientation === "w" ? rows : rows.slice().reverse().map((row) => row.slice().reverse());
  }, [fen, orientation]);

  const squareName = (rowIdx: number, colIdx: number): Square => {
    const file = "abcdefgh"[orientation === "w" ? colIdx : 7 - colIdx];
    const rank = orientation === "w" ? 8 - rowIdx : rowIdx + 1;
    return `${file}${rank}` as Square;
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

  const attemptMove = (from: Square, to: Square) => {
    const g = new Chess(fen);
    if (from === to) {
      setSelected(null);
      return;
    }
    let moved: ReturnType<Chess["move"]> | null = null;
    try {
      moved = g.move({ from, to, promotion: "q" });
    } catch {
      moved = null;
    }
    if (!moved) {
      setSelected(null);
      return;
    }
    setFen(g.fen());
    setSelected(null);
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
    if (piece) {
      setSelected(target);
    }
  };

  const handleImport = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      // try FEN first
      try {
        const g = new Chess(trimmed);
        setFen(g.fen());
        setImportText(trimmed);
        setMessage("Loaded position from FEN.");
        return;
      } catch {
        // try PGN
      }
      try {
        const g = new Chess();
        g.loadPgn(trimmed);
        setFen(g.fen());
        setImportText(trimmed);
        setMessage("Loaded game from PGN.");
      } catch {
        setMessage("Could not load FEN/PGN. Check the format.");
      }
    },
    [],
  );

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const text = e.dataTransfer.getData("text") || e.dataTransfer.getData("text/plain");
    if (text) {
      handleImport(text);
      return;
    }
    const file = e.dataTransfer.files?.[0];
    if (file) {
      file.text().then((t) => handleImport(t));
    }
  };

  // Engine setup and evaluation loop
  useEffect(() => {
    if (!evalOn) {
      setLines([]);
      setEvalScore(null);
      if (engineRef.current) {
        engineRef.current.terminate();
        engineRef.current = null;
      }
      return;
    }
    if (engineRef.current) return;
    const workerPaths = ["/stockfish/stockfish.js", "/stockfish/stockfish-lite-single.js", "/stockfish/stockfish-asm.js"];
    let idx = 0;
    const spawn = (path: string) => {
      try {
        return new Worker(path);
      } catch {
        return null;
      }
    };
    const trySpawn = () => {
      const worker = spawn(workerPaths[idx]);
      if (!worker) {
        idx += 1;
        if (idx < workerPaths.length) trySpawn();
        return;
      }
      engineRef.current = worker;
      worker.postMessage("uci");
      worker.postMessage("isready");
      worker.onmessage = (evt: MessageEvent) => {
        const msg = String(evt.data || "");
        if (msg.startsWith("info")) {
          parseInfo(msg);
        }
      };
    };
    trySpawn();
    return () => {
      engineRef.current?.terminate();
      engineRef.current = null;
    };
  }, [evalOn]);

  useEffect(() => {
    if (!evalOn || !engineRef.current) return;
    if (evalPendingRef.current) return;
    evalPendingRef.current = true;
    const worker = engineRef.current;
    worker.postMessage("stop");
    worker.postMessage(`position fen ${fen}`);
    worker.postMessage("setoption name MultiPV value 5");
    worker.postMessage("go depth 14");
    const timeout = setTimeout(() => {
      evalPendingRef.current = false;
    }, 1500);
    return () => clearTimeout(timeout);
  }, [fen, evalOn]);

  const parseInfo = (msg: string) => {
    const match = msg.match(/multipv (\d+).*score (cp (-?\d+)|mate (-?\d+)).*pv (.+)/);
    if (!match) return;
    const multipv = Number(match[1]);
    const cpVal = match[3] ? Number(match[3]) : undefined;
    const mateVal = match[4] ? Number(match[4]) : undefined;
    const pv = match[5];
    const score = mateVal !== undefined ? `M${mateVal}` : cpVal !== undefined ? (cpVal / 100).toFixed(1) : "0";
    setLines((prev) => {
      const filtered = prev.filter((l) => l.multipv !== multipv);
      const next = [...filtered, { multipv, score, raw: pv }];
      return next.sort((a, b) => a.multipv - b.multipv).slice(0, 5);
    });
    if (multipv === 1 && cpVal !== undefined) {
      setEvalScore(cpVal);
    }
  };

  const evalPercent = (() => {
    if (evalScore === null) return 50;
    const capped = Math.max(-500, Math.min(500, evalScore));
    return 50 + (capped / 500) * 50;
  })();

  return (
    <AppShell>
      <div className="flex flex-col gap-4 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
          <Button variant="outline" onClick={() => setOrientation((o) => (o === "w" ? "b" : "w"))}>
            Flip Board
          </Button>
          <Button variant="outline" onClick={() => setFen(new Chess().fen())}>
            Reset
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(360px,1fr)_320px] gap-4 items-start">
          <div className="relative">
            <div className="flex flex-col xl:flex-row gap-4 items-start">
              <div className="relative block pl-6 sm:pl-8 pb-6 sm:pb-8 w-full max-w-[720px] mx-auto">
                <div
                  className="rounded-[28px] overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.45)] w-full"
                  style={{ backgroundColor: boardColors.dark }}
                >
                  <div className="relative grid grid-cols-8 grid-rows-8 w-full max-w-[720px] aspect-square mx-auto">
                    {board.map((row, rIdx) =>
                      row.map((piece, cIdx) => {
                        const sq = squareName(rIdx, cIdx);
                        const isLightSquare = (rIdx + cIdx) % 2 === 0;
                        const isSelected = selected === sq;
                        return (
                          <button
                            key={`${rIdx}-${cIdx}`}
                            onClick={() => handleSquareClick(rIdx, cIdx)}
                            className={`w-full h-full flex items-center justify-center text-2xl font-semibold relative overflow-hidden ${
                              isSelected ? "ring-2 ring-pink-400" : ""
                            }`}
                            style={{
                              backgroundColor: isLightSquare ? boardColors.light : boardColors.dark,
                            }}
                          >
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
                  </div>
                </div>
              </div>

              {evalOn && (
                <div className="w-full xl:w-72 space-y-3 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-32 rounded-lg bg-black/50 border border-white/10 relative overflow-hidden">
                        <div
                          className="absolute left-0 right-0 bg-emerald-400"
                          style={{ bottom: 0, height: `${evalPercent}%`, transition: "height 0.2s ease" }}
                        />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">Evaluation</div>
                        <div className="text-xs text-white/60">Top 5 lines</div>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={evalOn}
                        onChange={() => setEvalOn((v) => !v)}
                        className="h-4 w-4"
                      />
                      <span className="text-white/70">Evaluate</span>
                    </label>
                  </div>
                  <div className="space-y-1 text-sm">
                    {lines.length === 0 && <div className="text-white/60">Waiting for engine...</div>}
                    {lines.map((l) => (
                      <div key={l.multipv} className="flex items-start gap-2 px-1">
                        <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-xs font-semibold">
                          {l.multipv}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-emerald-200">{l.score.startsWith("M") ? l.score : `+${l.score}`}</div>
                          <div className="text-white/70 text-xs truncate">{l.raw}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            className="rounded-2xl border border-white/10 bg-black p-5 space-y-3 text-white"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="text-lg font-semibold flex items-center justify-between">
              Tools
              <span className="text-xs text-white/60">Drag/drop PGN or FEN</span>
            </div>

            <div className="space-y-2">
              <Button
                className="w-full justify-between bg-white/5 hover:bg-white/10 border border-white/10 text-white shadow-none"
                onClick={() => {
                  setToolMode("moves");
                  setEvalOn(true);
                }}
              >
                <span>Make moves</span>
                <span className="text-xs text-white/60">{evalOn ? "Engine on" : "Engine off"}</span>
              </Button>
              <Button
                className="w-full justify-between bg-white/5 hover:bg-white/10 border border-white/10 text-white shadow-none"
                onClick={() => {
                  setToolMode("editor");
                  setFen(new Chess().fen());
                }}
              >
                <span>Board editor</span>
                <span className="text-xs text-white/60">Reset</span>
              </Button>
              <div className="rounded-xl border border-white/15 bg-white/5 p-3 space-y-2">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>Import PGN or FEN</span>
                  <span className="text-xs text-white/60">Paste or drop</span>
                </div>
                <textarea
                  value={importText}
                  onFocus={() => setToolMode("import")}
                  onChange={(e) => {
                    setToolMode("import");
                    setImportText(e.target.value);
                  }}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-pink-400"
                  placeholder="Paste PGN or FEN here, or drop a file/text."
                  rows={4}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 shadow-none"
                    onClick={() => {
                      setToolMode("import");
                      handleImport(importText);
                    }}
                  >
                    Load
                  </Button>
                  <Button variant="outline" className="flex-1 shadow-none" onClick={() => setImportText("")}>
                    Clear
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-white/15 bg-white/5 p-3 text-sm space-y-2">
                {toolMode === "moves" && (
                  <>
                    <div className="font-semibold">Analysis mode</div>
                    <div className="text-white/70">Click a piece then a target square to explore lines. Use the Evaluate toggle beside the board to show or hide the engine bar.</div>
                  </>
                )}
                {toolMode === "editor" && (
                  <>
                    <div className="font-semibold">Board editor</div>
                    <div className="text-white/70">Reset to the starting position, flip the board, then make moves freely.</div>
                  </>
                )}
                {toolMode === "import" && (
                  <>
                    <div className="font-semibold">Importing</div>
                    <div className="text-white/70">Paste or drop PGN/FEN above. The board will update instantly.</div>
                  </>
                )}
                {toolMode === "none" && (
                  <div className="text-white/70">Choose an option to get started.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
