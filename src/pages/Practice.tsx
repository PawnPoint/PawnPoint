import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/ui/Button";
import { Rocket, Swords, X } from "lucide-react";
import { Chess, Color, PieceSymbol, Square } from "chess.js";
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
import southKnight from "../assets/The South Knight.png";
import { awardXp } from "../lib/mockApi";
import { useAuth } from "../hooks/useAuth";
import { resolveBoardTheme } from "../lib/boardThemes";

const openingLines = [
  "Welcome to the board. Don't blink—you'll miss your chance.",
  "The South Knight arrives. Let's see if you survive more than ten moves.",
  "I hope you brought a plan. You'll need more than hope to beat me.",
  "I don't take prisoners. Make your first move count.",
  "The game begins. Step carefully—I strike from angles you can't see.",
];

const neutralLines = [
  "Your move reveals more than you think.",
  "I see through your strategy like glass.",
  "That square belongs to me now.",
  "You're playing checkers—I'm playing war.",
  "The board is shrinking for you.",
  "Pressure makes diamonds—or it breaks players.",
  "Every move you make is another chance for me to punish you.",
  "You're opening doors you won't be able to close.",
];

const weakMoveLines = [
  "You sure about that?",
  "I've seen better moves in the pawn section.",
  "That move screams panic.",
  "I smelled that blunder from the opening.",
  "Your pieces look uncomfortable.",
  "Bold. Wrong, but bold.",
  "That's the kind of move I feed on.",
];

const strongMoveLines = [
  "Impressive. But you won't keep that up.",
  "A good move—finally.",
  "Even the sun shines on a pawn some days.",
  "I felt that one. Let's see what else you've got.",
  "Alright, you earned my attention.",
];

const attackLines = [
  "I warned you—I strike from the side.",
  "Your king looks lonely. Let me help.",
  "Check is just the beginning.",
  "I'm not here to trade. I'm here to crush.",
  "You opened the door. I'm walking through.",
];

const sacrificeLines = [
  "A little chaos never hurt me.",
  "I don't need pieces. I need initiative.",
  "Sacrifices are the language of the brave.",
  "I'm all-in. Try to keep up.",
];

const endgameLines = [
  "This board belongs to me now.",
  "Your king is running out of places to hide.",
  "No more tricks. Just consequences.",
  "Every move brings you closer to checkmate.",
  "I already see the end. Do you?",
];

const winLines = [
  "Game over. Welcome to the South.",
  "Checkmate. Remember the name—South Knight.",
  "Another challenger falls.",
  "You played well. I played better.",
  "That's how a knight ends a battle.",
];

const userWinLines = [
  "Well played. Even warriors fall.",
  "You earned that one. Respect.",
  "I'll be back—stronger.",
  "Good game. Don't get comfortable.",
];

const bestEngineSettings = {
  skill: 20,
  movetime: 1000,
  depth: 14,
  label: "Strong",
};

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

type EngineLine = {
  move: string;
  score: number; // centipawns; mate scores mapped to large +/- values
  type: "cp" | "mate";
};

function parseBestMove(raw: string): { from: Square; to: Square; promotion?: PieceSymbol } | null {
  const tokens = raw.trim().split(/\s+/);
  const idx = tokens.indexOf("bestmove");
  if (idx === -1 || !tokens[idx + 1]) return null;
  const moveStr = tokens[idx + 1];
  if (moveStr.length < 4) return null;
  const from = moveStr.slice(0, 2) as Square;
  const to = moveStr.slice(2, 4) as Square;
  const promotionChar = moveStr[4];
  const promo = promotionChar ? (promotionChar as PieceSymbol) : undefined;
  return { from, to, promotion: promo };
}

export default function Practice() {
  const { user } = useAuth();
  const gameRef = useRef(new Chess());
  const engineRef = useRef<Worker | null>(null);
  const gameIdRef = useRef<{ value: number }>({ value: 0 });
  const pendingSearchRef = useRef<{ fen: string; gameId: number; fullmove: number } | null>(null);
  const multipvRef = useRef<{ gameId: number; entries: EngineLine[] }>({
    gameId: 0,
    entries: [],
  });
  const [blunderSchedule, setBlunderSchedule] = useState<number>(25);
  const [showSetup, setShowSetup] = useState(false);
  const [playerColor, setPlayerColor] = useState<Color>("w");
  const [customFen, setCustomFen] = useState("");
  const [fenError, setFenError] = useState("");
  const [fen, setFen] = useState(gameRef.current.fen());
  const [selected, setSelected] = useState<Square | null>(null);
  const [dragFrom, setDragFrom] = useState<Square | null>(null);
  const [status, setStatus] = useState<string>("Engine loading...");
  const [engineReady, setEngineReady] = useState(false);
  const [engineMessage, setEngineMessage] = useState<string>("Booting Stockfish...");
  const [engineThinking, setEngineThinking] = useState(false);
  const [orientation, setOrientation] = useState<Color>("w");
  const [botChat, setBotChat] = useState<string[]>([]);
  const botMoveCountRef = useRef<{ value: number }>({ value: 0 });
  const [lastMoveSquares, setLastMoveSquares] = useState<Square[]>([]);
  const gameOverAwardedRef = useRef<{ value: boolean }>({ value: false });
  const [redSquares, setRedSquares] = useState<Set<string>>(new Set());
  const [arrowStart, setArrowStart] = useState<{ row: number; col: number; square: Square } | null>(null);
  const [arrowTarget, setArrowTarget] = useState<{ row: number; col: number; square: Square } | null>(null);
  const [arrows, setArrows] = useState<
    { start: { row: number; col: number; square: Square }; end: { row: number; col: number; square: Square } }[]
  >([]);
  const [arrowMoved, setArrowMoved] = useState(false);
  const [suppressContextToggle, setSuppressContextToggle] = useState(false);
  const boardColors = resolveBoardTheme(user?.boardTheme).colors;
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

  const awardResultXp = (result: "win" | "loss" | "draw") => {
    if (gameOverAwardedRef.current.value) return;
    gameOverAwardedRef.current.value = true;
    const xpGain = result === "win" ? 150 : result === "loss" ? 75 : 112;
    if (user) {
      awardXp(user.id, xpGain, { source: `practice_${result}` });
    }
  };

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

  const board = useMemo(() => {
    const g = new Chess(fen);
    const rows = g.board();
    return orientation === "w" ? rows : rows.slice().reverse().map((row) => row.slice().reverse());
  }, [fen, orientation]);

  const legalMoves = useMemo(() => {
    if (!selected) return [];
    const g = new Chess(fen);
    return g.moves({ square: selected, verbose: true });
  }, [fen, selected]);

  const pushBotLine = (line: string) => {
    setBotChat(line ? [line] : []);
  };

  const pushRandom = (list: string[]) => {
    if (!list.length) return;
    const pick = list[Math.floor(Math.random() * list.length)];
    pushBotLine(pick);
  };

  const maybeBotSpeak = (lineList: string[]) => {
    // Speak only every 5th bot move after it has played, plus game start and end events.
    const count = botMoveCountRef.current.value;
    if (count > 0 && count % 5 === 0) {
      pushRandom(lineList);
    }
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

  const materialScore = (fenString: string, perspective: Color) => {
    const g = new Chess(fenString);
    const values: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    let score = 0;
    g.board().forEach((row) =>
      row.forEach((piece) => {
        if (!piece) return;
        const delta = values[piece.type];
        score += piece.color === perspective ? delta : -delta;
      }),
    );
    return score;
  };

  useEffect(() => {
    if (typeof Worker === "undefined") {
      setEngineMessage("Workers are not supported in this browser.");
      setStatus("Engine unavailable in this browser.");
      return;
    }

    const supportsSharedBuffer = typeof SharedArrayBuffer === "function" && crossOriginIsolated;
    // Prefer threaded WASM when available; otherwise fall back to single-thread WASM, then asm.js as a final fallback.
    const workerPaths = [
      supportsSharedBuffer ? "/stockfish/stockfish.js" : null,
      "/stockfish/stockfish-lite-single.js",
      "/stockfish/stockfish-asm.js",
    ].filter(Boolean) as string[];

    const spawnWorker = (path: string) => new Worker(path);

    let fallbackTimer: number | null = null;
    const startFallbackTimer = () => {
      if (fallbackTimer) {
        window.clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      fallbackTimer = window.setTimeout(() => {
        setEngineMessage((msg) => `${msg} (no response yet, trying fallback...)`);
        tryNextFallback();
      }, 4000);
    };

    const engine = spawnWorker(workerPaths[0]);
    setEngineMessage(`Loading engine from ${workerPaths[0]}...`);
    engineRef.current = engine;

    let currentPathIdx = 0;
    const tryNextFallback = () => {
      const nextIdx = currentPathIdx + 1;
      if (nextIdx >= workerPaths.length) {
        setEngineMessage("Engine failed to load.");
        setStatus("Engine unavailable. Check console for details.");
        setEngineReady(false);
        return;
      }
      // Terminate the previous worker before switching.
      engineRef.current?.terminate();
      currentPathIdx = nextIdx;
      const nextPath = workerPaths[nextIdx];
      setEngineMessage(`Retrying with fallback engine (${nextPath}).`);
      const fallback = spawnWorker(nextPath);
      engineRef.current = fallback;
      fallback.onmessage = engine.onmessage as any;
      fallback.onerror = engine.onerror as any;
      fallback.postMessage("uci");
      fallback.postMessage("isready");
      startFallbackTimer();
    };

    const handleMessage = (event: MessageEvent<any>) => {
      const msg =
        typeof event.data === "string"
          ? event.data
          : typeof event.data?.data === "string"
            ? event.data.data
            : "";
      if (!msg) return;

      if (msg.includes(" multipv ")) {
        const ctx = pendingSearchRef.current;
        const match = msg.match(
          /multipv\s+(\d+).*?score\s+(cp|mate)\s+(-?\d+).*?\spv\s+([a-h][1-8][a-h][1-8][qrbn]?)/i,
        );
        if (ctx && match) {
          const idx = Math.max(1, parseInt(match[1], 10)) - 1;
          const scoreRaw = match[3];
          const moveStr = match[4];
          const noise = (Math.random() * 5) * (Math.random() < 0.5 ? -1 : 1);
          const scoreVal = parseInt(scoreRaw, 10) + noise;
          const type = match[2] === "mate" ? "mate" : "cp";
          const score =
            type === "mate" ? (scoreVal >= 0 ? 100000 - Math.abs(scoreVal) : -100000 + Math.abs(scoreVal)) : scoreVal;
          const currentEntries = multipvRef.current.gameId === ctx.gameId ? multipvRef.current.entries : [];
          const nextEntries = [...currentEntries];
          nextEntries[idx] = { move: moveStr, score, type };
          multipvRef.current = { gameId: ctx.gameId, entries: nextEntries };
        }
      }

      if (msg === "uciok") {
        setEngineMessage("Engine online. Initialising...");
        startFallbackTimer();
        return;
      }
      if (msg === "readyok") {
        setEngineReady(true);
        setEngineMessage("Stockfish ready. Start a game to play.");
        setStatus("Ready to play.");
        if (fallbackTimer) {
          window.clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }
        return;
      }

      if (msg.startsWith("bestmove")) {
        setEngineThinking(false);
        setEngineMessage("Bot moved.");
        const ctx = pendingSearchRef.current;
        if (!ctx || ctx.gameId !== gameIdRef.current.value) return;
        const mpv = multipvRef.current;
        let parsed: ReturnType<typeof parseBestMove> | null = null;
        if (mpv.gameId === ctx.gameId && mpv.entries.length) {
          const entries = [...mpv.entries]
            .map((entry, idx) => ({ ...entry, idx }))
            .filter((e) => e?.move)
            .sort((a, b) => (b?.score ?? -999999) - (a?.score ?? -999999));
          if (entries.length) {
            const best = entries[0];
            const bestScore = best.score ?? 0;
            const hasMate = best.type === "mate";
            const moveNumber = botMoveCountRef.current.value + 1;
            let chosen = best;

            if (!hasMate && entries.length > 1) {
              const topMoves = entries.slice(0, Math.min(5, entries.length));
              const candidates = topMoves.filter(
                (m, idx) => idx > 0 && idx <= 4 && bestScore - (m.score ?? bestScore) <= 100,
              );
              if (moveNumber === blunderSchedule && bestScore > -500) {
                const targetDrop = randInt(150, 250);
                const blunderPick =
                  topMoves.find((e) => (bestScore - (e.score ?? bestScore)) >= targetDrop) || topMoves[topMoves.length - 1];
                chosen = blunderPick;
                setBlunderSchedule(moveNumber + randInt(25, 30));
              } else if (candidates.length) {
                chosen = candidates[randInt(0, candidates.length - 1)];
              } else {
                chosen = topMoves[0];
              }
            }

            const fakeMsg = `bestmove ${chosen.move}`;
            parsed = parseBestMove(fakeMsg);
          }
        }
        if (!parsed) {
          parsed = parseBestMove(msg);
        }
        if (!parsed) {
          setStatus("Bot could not find a move.");
          return;
        }
        const g = new Chess(ctx.fen);
        const botColor: Color = ctx.fen.includes(" w ") ? "b" : "w";
        const beforeScore = materialScore(ctx.fen, botColor);
        const move = g.move({
          from: parsed.from,
          to: parsed.to,
          promotion: (parsed.promotion || "q") as PieceSymbol,
        });
        if (!move) {
          setStatus("Bot produced an invalid move.");
          return;
        }
        gameRef.current = g;
        setFen(g.fen());
        setSelected(null);
        setDragFrom(null);
        setLastMoveSquares([parsed.from, parsed.to]);
        const afterScore = materialScore(g.fen(), botColor);
        const delta = afterScore - beforeScore;
        botMoveCountRef.current.value += 1;
        if (g.isCheckmate()) {
          pushRandom(winLines);
          awardResultXp("loss");
        } else if (g.isDraw()) {
          awardResultXp("draw");
          setStatus("Draw. Your move.");
        } else {
          if (g.isCheck()) {
            maybeBotSpeak(attackLines);
          } else if (delta <= -1) {
            maybeBotSpeak(sacrificeLines);
          } else if (delta >= 1) {
            maybeBotSpeak(attackLines);
          } else {
            const totalPieces = g.board().flat().filter(Boolean).length;
            if (totalPieces <= 10 && afterScore > 1) {
              maybeBotSpeak(endgameLines);
            } else {
              maybeBotSpeak(neutralLines);
            }
          }
          setStatus(g.isCheck() ? "Your move (check)." : "Your move.");
        }
        pendingSearchRef.current = null;
      }
    };

    engine.onmessage = handleMessage as any;
    engine.onerror = (error) => {
      console.error("Stockfish worker error", error);
      const failedPath = workerPaths[currentPathIdx];
      setEngineMessage(
        `Engine failed to load from ${failedPath}. If on localhost, keep the Vite dev server running so the file is served.`,
      );
      setStatus("Engine unavailable. Trying fallback...");
      setEngineReady(false);
      tryNextFallback();
    };

    engine.postMessage("uci");
    engine.postMessage("isready");
    startFallbackTimer();

    return () => {
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      engine.terminate();
    };
  }, []);

  const getFullmoveNumber = (fenString: string) => {
    try {
      const parts = fenString.trim().split(/\s+/);
      const num = parseInt(parts[5], 10);
      return Number.isFinite(num) ? num : 1;
    } catch {
      return 1;
    }
  };

  const requestBotMove = (positionFen: string) => {
    if (!engineRef.current || !engineReady) {
      setStatus("Engine is not ready yet.");
      return;
    }
    const fullmove = getFullmoveNumber(positionFen);
    pendingSearchRef.current = {
      fen: positionFen,
      gameId: gameIdRef.current.value,
      fullmove,
    };
    multipvRef.current = { gameId: gameIdRef.current.value, entries: [] };
    setEngineThinking(true);
    setEngineMessage(`Thinking (${bestEngineSettings.label})...`);
    engineRef.current.postMessage("stop");
    engineRef.current.postMessage(`setoption name Skill Level value ${bestEngineSettings.skill}`);
    engineRef.current.postMessage("setoption name MultiPV value 5");
    engineRef.current.postMessage(`position fen ${positionFen}`);
    const searchDepth = Math.min(14, Math.max(12, bestEngineSettings.depth || 12));
    engineRef.current.postMessage(`go depth ${searchDepth}`);
  };

  const startGame = () => {
    if (!engineReady) {
      setStatus("Engine still loading. Please wait a moment.");
      return;
    }
    setFenError("");
    gameIdRef.current.value += 1;
    botMoveCountRef.current.value = 0;
    setBlunderSchedule(randInt(25, 30));
    let startFen = "";
    const trimmed = customFen.trim();
    if (trimmed) {
      try {
        const parsed = new Chess(trimmed);
        startFen = parsed.fen();
      } catch {
        setFenError("Invalid FEN. Please check the format.");
        return;
      }
    }
    const g = startFen ? new Chess(startFen) : new Chess();
    gameRef.current = g;
    setFen(g.fen());
    setSelected(null);
    setDragFrom(null);
    setLastMoveSquares([]);
    gameOverAwardedRef.current.value = false;
    setOrientation(playerColor);
    setEngineThinking(false);
    setStatus(playerColor === "b" ? "Bot thinking..." : "Your move.");
    setShowSetup(false);
    pendingSearchRef.current = null;
    engineRef.current?.postMessage("ucinewgame");
    const preset = bestEngineSettings;
    engineRef.current?.postMessage(`setoption name Skill Level value ${preset.skill}`);
    engineRef.current?.postMessage(
      `setoption name Skill Level Probability value ${Math.min(100, preset.skill * 5)}`,
    );
    pushRandom(openingLines);
    if (playerColor === "b") {
      // Bot plays first if user chose Black
      window.setTimeout(() => requestBotMove(g.fen()), 250);
    }
  };

  const handleSquareClick = (rowIdx: number, colIdx: number) => {
    setArrowStart(null);
    setArrowTarget(null);
    setArrows([]);
    setRedSquares(new Set());
    const target = squareName(rowIdx, colIdx);
    const g = new Chess(fen);
    if (g.turn() !== playerColor) return;
    if (selected === target) {
      setSelected(null);
      return;
    }
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
    const g = new Chess(fen);
    if (g.turn() !== playerColor) return;
    const beforeScore = materialScore(fen, playerColor);
    if (from === to) {
      setSelected(null);
      setDragFrom(null);
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
    gameRef.current = g;
    setFen(g.fen());
    setSelected(null);
    setLastMoveSquares([from, to]);
    const afterScore = materialScore(g.fen(), playerColor);
    const delta = afterScore - beforeScore;
    // Only allow bot speaking every 5 moves from its own counter; user moves do not trigger speech.
    setStatus(
      g.isCheckmate()
        ? "You delivered mate!"
        : g.isCheck()
          ? "Bot in check. Bot thinking..."
          : "Bot thinking...",
    );
    if (g.isGameOver()) {
      if (g.isCheckmate()) {
        pushRandom(userWinLines);
        awardResultXp("win");
      } else if (g.isDraw()) {
        awardResultXp("draw");
      }
      return;
    }
    requestBotMove(g.fen());
  };

  useEffect(() => {
    const g = new Chess(fen);
    if (g.isGameOver()) {
      if (g.isCheckmate()) {
        setStatus(g.turn() === playerColor ? "You are checkmated." : "You delivered checkmate!");
      } else {
        setStatus("Game over.");
      }
    }
  }, [fen, playerColor]);

  return (
    <AppShell>
      <div className="flex flex-col gap-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-bold flex items-center gap-2">
              <Rocket className="h-5 w-5 text-emerald-300" />
              Practice vs Bot
            </div>
            <div className="text-sm text-white/60">Choose your color, then play on a live board.</div>
          </div>
          <div />
        </div>

        <div className="grid grid-cols-[minmax(320px,1fr)_260px] gap-4 items-start">
          <div className="relative">
            <div className="relative inline-block pl-8 pb-8 w-full max-w-[840px]">
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
                          draggable={!!piece}
                          onDragStart={(e) => {
                            const g = new Chess(fen);
                            const sqName = squareName(rIdx, cIdx);
                            const targetPiece = g.get(sqName);
                            if (targetPiece && targetPiece.color === g.turn() && g.turn() === playerColor) {
                              setDragFrom(sqName);
                              e.dataTransfer?.setData("text/plain", sqName);
                            } else {
                              e.preventDefault();
                            }
                          }}
                          onDragOver={(e) => {
                            if (dragFrom) e.preventDefault();
                          }}
                          onDrop={(e) => {
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
                              setDragCursor(true);
                              startArrow(rIdx, cIdx);
                            } else if (e.button === 0 && piece) {
                              // lock cursor for piece drag start
                              setDragCursor(true);
                            }
                          }}
                          onMouseEnter={(e) => handleRightDrag(rIdx, cIdx, e.buttons)}
                          onMouseMove={(e) => handleRightDrag(rIdx, cIdx, e.buttons)}
                          onMouseUp={(e) => {
                            if (e.button === 2) {
                              e.preventDefault();
                              handleRightUp();
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
                              } ${piece.color === "b" && piece.type === "k" ? "scale-110 translate-y-0.5" : ""}`}
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
                          id="arrowhead-practice-current"
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
                            markerEnd="url(#arrowhead-practice-current)"
                          />
                        );
                      })()}
                    </svg>
                  )}
                  {arrows.map((arrow, idx) => (
                    <svg key={`arrow-${idx}`} className="absolute inset-0 pointer-events-none" viewBox="0 0 100 100">
                      <defs>
                        <marker
                          id={`arrowhead-practice-${idx}`}
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
                            markerEnd={`url(#arrowhead-practice-${idx})`}
                          />
                        );
                      })()}
                    </svg>
                  ))}
                </div>
              </div>

              <div className="pointer-events-none absolute left-0 top-0 bottom-6 grid grid-rows-8 text-xs font-semibold text-white/80">
                {(orientation === "w"
                  ? Array.from({ length: 8 }, (_v, idx) => 8 - idx)
                  : Array.from({ length: 8 }, (_v, idx) => idx + 1)
                ).map((label) => (
                  <span key={`rank-${label}`} className="flex items-center justify-end pr-2">
                    {label}
                  </span>
                ))}
              </div>

              <div className="pointer-events-none absolute left-6 right-0 bottom-0 grid grid-cols-8 text-xs font-semibold text-white/80">
                {(orientation === "w" ? "abcdefgh".split("") : "hgfedcba".split("")).map((label) => (
                  <span key={`file-${label}`} className="text-center pt-1">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900 border border-white/10 text-white p-4 shadow-xl space-y-3">
            <div className="w-full flex flex-col items-center gap-3">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border border-white/10 bg-white/5 shadow-lg">
                <img
                  src={southKnight}
                  alt="Bot avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-sm text-white/70">The South Knight</div>
            </div>

            <div className="flex items-center justify-between">
              <div className="font-semibold">Session</div>
              <div className="flex items-center gap-2 text-xs text-white/70">
                <span className="flex items-center gap-1">
                  <Swords className="h-4 w-4" />
                  {playerColor === "w" ? "White" : "Black"}
                </span>
              </div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-sm text-white/80 min-h-[64px]">
              <div className="font-semibold text-white">{status}</div>
              {botChat.length ? (
                <div className="mt-2 space-y-1">
                  {botChat.map((line, idx) => (
                    <div key={`${line}-${idx}`} className="leading-relaxed text-white/80">
                      {line}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-1 text-white/60">Awaiting moves...</div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="w-full" onClick={() => setShowSetup(true)}>
                New Game
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showSetup && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 text-white border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <div className="text-lg font-semibold">Start Practice Game</div>
                <div className="text-xs text-white/60">Pick your color and bot level.</div>
              </div>
              <button
                className="p-2 rounded-full hover:bg-white/10 text-white/70"
                onClick={() => setShowSetup(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <div className="text-sm text-white/80">Your color</div>
                <div className="flex gap-2">
                  {(["w", "b"] as Color[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => setPlayerColor(c)}
                      className={`flex-1 rounded-xl border px-3 py-3 text-sm ${
                        playerColor === c ? "border-pink-400 bg-white/10" : "border-white/10 bg-white/5"
                      }`}
                    >
                      {c === "w" ? "White" : "Black"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-white/80">Custom starting position (FEN)</div>
                <textarea
                  value={customFen}
                  onChange={(e) => setCustomFen(e.target.value)}
                  placeholder="Optional: paste FEN to start from a specific position"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-pink-400"
                  rows={2}
                />
                {fenError && <div className="text-xs text-amber-300">{fenError}</div>}
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowSetup(false)}>
                  Cancel
                </Button>
                <Button onClick={startGame} disabled={!engineReady}>
                  {engineReady ? "Start" : "Engine loading..."}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}




