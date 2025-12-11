import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/ui/Button";
import { Rocket, Swords, X, Download } from "lucide-react";
import { Chess, Color, PieceSymbol, Square } from "chess.js";
import macCursorOpen from "../assets/Mac Cursor Open Hand.png";
import macCursorClosed from "../assets/Mac Cursor Closed Hand.png";
import southKnight from "../assets/The South Knight.png";
import southPawn from "../assets/The South Pawn.png";
import southBishop from "../assets/The South Bishop.png";
import { awardXp } from "../lib/mockApi";
import { useAuth } from "../hooks/useAuth";
import { resolveBoardTheme } from "../lib/boardThemes";
import { resolvePieceTheme } from "../lib/pieceThemes";

const knightLines = {
  opening: [
  "Welcome to the board. Don't blink-you'll miss your chance.",
  "The South Knight arrives. Let's see if you survive more than ten moves.",
  "I hope you brought a plan. You'll need more than hope to beat me.",
  "I don't take prisoners. Make your first move count.",
  "The game begins. Step carefully-I strike from angles you can't see.",
],
  neutral: [
  "Your move reveals more than you think.",
  "I see through your strategy like glass.",
  "That square belongs to me now.",
  "You're playing checkers-I'm playing war.",
  "The board is shrinking for you.",
  "Pressure makes diamonds-or it breaks players.",
  "Every move you make is another chance for me to punish you.",
  "You're opening doors you won't be able to close.",
],
  weak: [
  "You sure about that?",
  "I've seen better moves in the pawn section.",
  "That move screams panic.",
  "I smelled that blunder from the opening.",
  "Your pieces look uncomfortable.",
  "Bold. Wrong, but bold.",
  "That's the kind of move I feed on.",
],
  strong: [
  "Impressive. But you won't keep that up.",
  "A good move-finally.",
  "Even the sun shines on a pawn some days.",
  "I felt that one. Let's see what else you've got.",
  "Alright, you earned my attention.",
],
  attack: [
  "I warned you-I strike from the side.",
  "Your king looks lonely. Let me help.",
  "Check is just the beginning.",
  "I'm not here to trade. I'm here to crush.",
  "You opened the door. I'm walking through.",
],
  sacrifice: [
  "A little chaos never hurt me.",
  "I don't need pieces. I need initiative.",
  "Sacrifices are the language of the brave.",
  "I'm all-in. Try to keep up.",
],
  endgame: [
  "This board belongs to me now.",
  "Your king is running out of places to hide.",
  "No more tricks. Just consequences.",
  "Every move brings you closer to checkmate.",
  "I already see the end. Do you?",
],
  win: [
  "Game over. Welcome to the South.",
  "Checkmate. Remember the name-South Knight.",
  "Another challenger falls.",
  "You played well. I played better.",
  "That's how a knight ends a battle.",
],
  defeat: [
  "Well played. Even warriors fall.",
  "You earned that one. Respect.",
  "I'll be back-stronger.",
  "Good game. Don't get comfortable.",
],
};

const pawnLines = {
  opening: [
    "Small? Me? Watch closely. I become anything I want on the 8th rank.",
    "I may start as a pawn… but I don’t plan on staying one.",
    "Everyone underestimates the pawn—perfect. Makes my victories feel better.",
    "Let’s see what you’ve prepared. I’m curious. Curious… and ready.",
  ],
  neutral: [
    "I only need one square. One step. One chance. Then I take the whole board.",
    "You think you stopped me? Cute. I have seven more brothers.",
    "Ah, strategy… I like watching you try.",
    "Move aside, big pieces. Let the future queen through.",
    "Every file is a battlefield, and I’m built for war.",
  ],
  promotion: [
    "Just eight steps between ‘pawn’ and ‘problem.’ Which one do you want first?",
    "I don’t climb the board… I ascend.",
    "Promotion isn’t the goal—it’s the expectation.",
    "I’m not walking to the 8th rank. I’m marching.",
    "Call me ambitious… or call me Your Majesty in a few moves.",
  ],
  capture: [
    "Out of my way. The throne is calling.",
    "Another one falls. My path gets clearer.",
    "Tiny? Yes. Harmless? No.",
  ],
  attacked: [
    "Cornered? Good. That’s when pawns become legends.",
    "Pressure? I was built under pressure.",
    "Hit me if you must… but I only need one breakthrough.",
  ],
  blunder: [
    "Hmm… that didn’t look right. Whatever. Still winning.",
    "Oh? Was that bad? I learn by doing… and you learn by losing.",
    "Mistake? I call it improvisation.",
  ],
  losing: [
    "You think I’m done? Pawns fight hardest when cornered.",
    "If I make it to promotion… you’re finished. Simple.",
    "Go ahead, push me down. I’ll get back up with a crown.",
  ],
  winning: [
    "This board feels small… or maybe I’m just too strong.",
    "I told you: underestimate the pawn, overpay in losses.",
    "Look at that—one step closer to greatness.",
  ],
  endgame: [
    "Only a few of us remain. Perfect. Less noise while I rise.",
    "Endgame? That’s where pawns become monsters.",
    "One square. One dream. One crown.",
  ],
  win: [
    "From pawn… to ruler. Story of my life.",
    "I warned you—I don’t stay weak for long.",
    "This board is mine now. Next opponent.",
    "Promotion achieved. Checkmate delivered.",
  ],
  defeat: [
    "Even kings fall. I’ll rise again.",
    "You won this one… but my ambition doesn’t die.",
    "A setback? Hardly. I start every game reborn.",
  ],
};
type BotLineCategory = "opening" | "neutral" | "attack" | "sacrifice" | "endgame" | "win" | "defeat";

const bishopLines = {
  opening: [
    "The diagonals are mine to command. Shall we begin?",
    "Let’s see if you can navigate the subtleties of long-range warfare.",
    "Be careful—my influence often arrives before I do.",
    "A single diagonal can decide a game. I intend to control them all.",
  ],
  neutral: [
    "Your position… is developing in interestingly exploitable ways.",
    "Long-term pressure is my specialty. I hope you’re patient.",
    "I see lines you haven’t even imagined yet.",
    "A bishop doesn’t rush. We wait, and then we strike.",
    "Every square you weaken becomes my invitation.",
  ],
  attack: [
    "Elegant. Precise. Expected.",
    "You left that diagonal open? I’ll make use of it.",
    "Ah, a weakness. How thoughtful of you.",
    "I’ll take initiative from here.",
    "Feel that tension? That’s me, tightening the diagonals.",
    "You're running out of safe squares.",
    "Your king seems… uncomfortable. Shall I assist with that?",
    "Pressure is a language, and I speak it fluently.",
    "Removed. Efficiently.",
    "One less obstacle between us.",
    "Control the diagonals, control the game.",
  ],
  sacrifice: [
    "Hmm… that may not have been ideal. But the game continues.",
    "Even vision can blur. Let’s correct the course.",
    "Curious. I misjudged that plan. Let’s see how you answer.",
  ],
  endgame: [
    "Fewer pieces… clearer diagonals.",
    "Now we see who truly understands structure.",
    "Precision matters most in the end.",
  ],
  win: [
    "The diagonals favor me today.",
    "Your position collapses exactly as predicted.",
    "Order restored. The board is mine once again.",
    "All lines converged to this moment. Checkmate.",
    "A beautiful finish. I hope you took notes.",
    "Strategy triumphs again.",
  ],
  defeat: [
    "Even masters misjudge a position. I will adjust.",
    "You’ve gained the advantage… for now.",
    "A strategic setback, nothing more.",
    "Even the wisest fall. I will return sharper.",
    "A rare miscalculation. Well played.",
    "I concede… for now.",
  ],
};

const getBotLines = (botId: string, category: BotLineCategory): string[] => {
  if (botId === "pawn") {
    switch (category) {
      case "opening":
        return pawnLines.opening;
      case "neutral":
        return pawnLines.neutral;
      case "attack":
        return [...pawnLines.capture, ...pawnLines.winning];
      case "sacrifice":
        return pawnLines.blunder;
      case "endgame":
        return pawnLines.endgame;
      case "win":
        return pawnLines.win;
      case "defeat":
        return pawnLines.defeat;
      default:
        return pawnLines.neutral;
    }
  } else if (botId === "bishop") {
    return bishopLines[category] || [];
  }
  return knightLines[category] || [];
};

const botPresets = {
  knight: {
    id: "knight",
    name: "The South Knight",
    avatar: southKnight,
    skill: 20,
    depth: 20,
    label: "2500 Elo",
    difficulty: "2500 Elo",
  },
  bishop: {
    id: "bishop",
    name: "The South Bishop",
    avatar: southBishop,
    skill: 10,
    depth: 12,
    label: "1500 Elo",
    difficulty: "1500 Elo",
  },
  pawn: {
    id: "pawn",
    name: "The South Pawn",
    avatar: southPawn,
    skill: 2,
    depth: 5,
    label: "800 Elo",
    difficulty: "800 Elo",
  },
} as const;
const practiceBots = [botPresets.knight, botPresets.bishop, botPresets.pawn];
type BotId = keyof typeof botPresets;
type BotBrainState = { losingMode: boolean; lastEvalCp: number; lastMateThreat: boolean };
const freshBotState = (): Record<BotId, BotBrainState> => ({
  pawn: { losingMode: false, lastEvalCp: 0, lastMateThreat: false },
  bishop: { losingMode: false, lastEvalCp: 0, lastMateThreat: false },
  knight: { losingMode: false, lastEvalCp: 0, lastMateThreat: false },
});

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
  const startFenRef = useRef<string>(gameRef.current.fen());
  const engineRef = useRef<Worker | null>(null);
  const gameIdRef = useRef<{ value: number }>({ value: 0 });
  const pendingSearchRef = useRef<{ fen: string; gameId: number; fullmove: number } | null>(null);
  const multipvRef = useRef<{ gameId: number; entries: EngineLine[] }>({
    gameId: 0,
    entries: [],
  });
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
  const { key: pieceThemeKey, pieces: pieceSet } = useMemo(() => resolvePieceTheme(user?.pieceTheme), [user?.pieceTheme]);
  const [botModalOpen, setBotModalOpen] = useState(false);
  const [botId, setBotId] = useState<BotId>(practiceBots[0].id);
  const activeBot = practiceBots.find((b) => b.id === botId) || practiceBots[0];
  const botIdRef = useRef<BotId>(botId);
  const botStateRef = useRef<Record<BotId, BotBrainState>>(freshBotState());
  const [promotionPending, setPromotionPending] = useState<{ from: Square; to: Square } | null>(null);
  const [moveList, setMoveList] = useState<string[]>([]);
  useEffect(() => {
    botIdRef.current = botId;
    botStateRef.current[botId] = { losingMode: false, lastEvalCp: 0, lastMateThreat: false };
  }, [botId]);
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
    return piece.color === "w" ? pieceSet.w[piece.type] : pieceSet.b[piece.type];
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

  const moveRows = useMemo(
    () =>
      moveList.reduce<{ num: number; white: string; black: string }[]>((acc, move, idx) => {
        if (idx % 2 === 0) {
          acc.push({ num: acc.length + 1, white: move, black: "" });
        } else {
          acc[acc.length - 1].black = move;
        }
        return acc;
      }, []),
    [moveList],
  );

  const pushBotLine = (line: string) => {
    setBotChat(line ? [line] : []);
  };

  const pushRandom = (list: string[], category?: BotLineCategory) => {
    const source = category ? getBotLines(botIdRef.current, category) : list;
    if (!source.length) return;
    const pick = source[Math.floor(Math.random() * source.length)];
    pushBotLine(pick);
  };

  const maybeBotSpeak = (lineList: string[], category?: BotLineCategory) => {
    // Speak only every 5th bot move after it has played, plus game start and end events.
    const count = botMoveCountRef.current.value;
    if (count > 0 && count % 5 === 0) {
      pushRandom(lineList, category);
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

  const rebuildGameFromHistory = (expectedFen?: string) => {
    const baseFen = startFenRef.current;
    const restored = baseFen ? new Chess(baseFen) : new Chess();
    moveList.forEach((san) => {
      try {
        restored.move(san, { sloppy: true });
      } catch {
        // ignore invalid SAN while rebuilding
      }
    });
    if (expectedFen && restored.fen() !== expectedFen) {
      try {
        return new Chess(expectedFen);
      } catch {
        return restored;
      }
    }
    return restored;
  };

  const sortEngineLines = (entries: EngineLine[]) =>
    entries
      .filter((entry) => entry && entry.move)
      .map((entry) => ({ ...entry }))
      .sort((a, b) => (b?.score ?? -999999) - (a?.score ?? -999999));

  type BotMoveContext = {
    entries: EngineLine[];
    moveNumber: number;
    materialBalance: number;
    botState: BotBrainState;
  };

  type BotMoveResult = {
    move: EngineLine | null;
    bestScore: number;
    mateThreat: boolean;
    aboutToLose: boolean;
  };

  const getSouthPawnMove = (ctx: BotMoveContext): BotMoveResult => {
    const ordered = sortEngineLines(ctx.entries);
    const best = ordered[0];
    if (!best) {
      return { move: null, bestScore: 0, mateThreat: false, aboutToLose: false };
    }
    const bestScore = best.score ?? 0;
    const mateThreat = best.type === "mate" && best.score < 0;
    const aboutToLose = mateThreat || bestScore <= -500 || ctx.materialBalance <= -5;
    const rescueMode = ctx.botState.losingMode || aboutToLose;
    if (rescueMode) {
      return { move: best, bestScore, mateThreat, aboutToLose };
    }
    const maxDrop = 300;
    const sloppy = ordered.filter((entry, idx) => {
      if (idx === 0) return false;
      if (entry.type === "mate" && entry.score < 0) return false;
      const drop = (best.score ?? 0) - (entry.score ?? 0);
      return drop >= 60 && drop <= maxDrop;
    });
    const backups = ordered.filter((entry, idx) => idx > 0 && !(entry.type === "mate" && entry.score < 0));
    let pick: EngineLine | null = sloppy.length ? sloppy[randInt(0, sloppy.length - 1)] : null;
    if (!pick && backups.length) {
      pick = backups[randInt(0, backups.length - 1)];
    }
    if (!pick) {
      pick = best;
    } else {
      const drop = (best.score ?? 0) - (pick.score ?? 0);
      if (drop > maxDrop) {
        const safer = ordered.find(
          (entry, idx) => idx > 0 && (best.score ?? 0) - (entry.score ?? 0) <= maxDrop && !(entry.type === "mate" && entry.score < 0),
        );
        pick = safer || best;
      }
    }
    return { move: pick, bestScore, mateThreat, aboutToLose: false };
  };

  const getBishopMove = (ctx: BotMoveContext): BotMoveResult => {
    const ordered = sortEngineLines(ctx.entries);
    const best = ordered[0];
    if (!best) {
      return { move: null, bestScore: 0, mateThreat: false, aboutToLose: false };
    }
    const bestScore = best.score ?? 0;
    const mateThreat = best.type === "mate" && best.score < 0;
    const aboutToLose = mateThreat || bestScore <= -400 || ctx.materialBalance <= -3;
    const rescueMode = ctx.botState.losingMode || aboutToLose;
    if (rescueMode) {
      return { move: best, bestScore, mateThreat, aboutToLose };
    }

    const close = ordered.filter((entry, idx) => {
      const drop = (best.score ?? 0) - (entry.score ?? 0);
      return idx === 0 || (drop <= 150 && !(entry.type === "mate" && entry.score < 0));
    });
    const positional = ordered.filter((entry, idx) => {
      if (idx === 0) return false;
      if (entry.type === "mate" && entry.score < 0) return false;
      const drop = (best.score ?? 0) - (entry.score ?? 0);
      return drop > 150 && drop <= 300;
    });

    let pick: EngineLine | null = null;
    const roll = Math.random();
    if (roll < 0.75 && close.length) {
      pick = close[randInt(0, close.length - 1)];
    } else if (positional.length) {
      pick = positional[randInt(0, positional.length - 1)];
    } else if (close.length) {
      pick = close[randInt(0, close.length - 1)];
    }

    if (!pick) pick = best;

    const dropFromBest = (best.score ?? 0) - (pick?.score ?? best.score ?? 0);
    if (dropFromBest > 350 || (pick?.type === "mate" && pick.score < 0)) {
      pick = close[0] || best;
    }

    return { move: pick, bestScore, mateThreat, aboutToLose: false };
  };

  const getSouthKnightMove = (ctx: BotMoveContext): BotMoveResult => {
    const ordered = sortEngineLines(ctx.entries);
    const best = ordered[0];
    if (!best) {
      return { move: null, bestScore: 0, mateThreat: false, aboutToLose: false };
    }
    const bestScore = best.score ?? 0;
    const mateThreat = best.type === "mate" && best.score < 0;
    const aboutToLose = mateThreat && bestScore < 0;
    const second = ordered.find((entry, idx) => idx > 0 && !(entry.type === "mate" && entry.score < 0));
    const options: EngineLine[] = [best];
    if (second) {
      const drop = (best.score ?? 0) - (second.score ?? best.score ?? 0);
      if (drop <= 35) {
        options.push(second);
      }
    }
    const pick = options[randInt(0, options.length - 1)];
    return { move: pick, bestScore, mateThreat, aboutToLose };
  };

  const getBotMoveDecision = (botId: BotId, ctx: BotMoveContext): BotMoveResult => {
    if (botId === "pawn") return getSouthPawnMove(ctx);
    if (botId === "bishop") return getBishopMove(ctx);
    return getSouthKnightMove(ctx);
  };

  const getBotSearchDepth = (botId: BotId, fenString: string): number => {
    const botColor: Color = fenString.includes(" w ") ? "b" : "w";
    const material = materialScore(fenString, botColor);
    const state = botStateRef.current[botId];
    if (botId === "pawn") {
      const emergency = state.losingMode || state.lastMateThreat || state.lastEvalCp <= -500 || material <= -5;
      return emergency ? 22 : randInt(4, 6);
    }
    if (botId === "bishop") {
      const emergency = state.losingMode || state.lastMateThreat || state.lastEvalCp <= -400 || material <= -3;
      return emergency ? 22 : randInt(10, 14);
    }
    return randInt(18, 22);
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
          const botId = botIdRef.current;
          const botColor: Color = ctx.fen.includes(" w ") ? "b" : "w";
          const materialBalance = materialScore(ctx.fen, botColor);
          const decision = getBotMoveDecision(botId, {
            entries: mpv.entries,
            moveNumber: botMoveCountRef.current.value + 1,
            materialBalance,
            botState: botStateRef.current[botId],
          });
          if (decision.move) {
            parsed = parseBestMove(`bestmove ${decision.move.move}`);
          }
          const previousState = botStateRef.current[botId];
          const stabilizedPawn =
            botId === "pawn" &&
            previousState.losingMode &&
            !decision.aboutToLose &&
            decision.bestScore > -300 &&
            !decision.mateThreat &&
            materialBalance > -4;
          const stabilizedBishop =
            botId === "bishop" &&
            previousState.losingMode &&
            !decision.aboutToLose &&
            decision.bestScore > -200 &&
            !decision.mateThreat &&
            materialBalance > -2;
          const nextLosingMode =
            botId === "pawn"
              ? decision.aboutToLose
                ? true
                : stabilizedPawn
                  ? false
                  : previousState.losingMode
              : botId === "bishop"
                ? decision.aboutToLose
                  ? true
                  : stabilizedBishop
                    ? false
                    : previousState.losingMode
                : false;
          botStateRef.current[botId] = {
            losingMode: nextLosingMode,
            lastEvalCp: decision.bestScore,
            lastMateThreat: decision.mateThreat,
          };
        }
        if (!parsed) {
          parsed = parseBestMove(msg);
        }
        if (!parsed) {
          setStatus("Bot could not find a move.");
          return;
        }
        let g = rebuildGameFromHistory(ctx.fen);
        const botColor: Color = ctx.fen.includes(" w ") ? "b" : "w";
        const beforeScore = materialScore(ctx.fen, botColor);
        let move: ReturnType<Chess["move"]> | null = null;
        try {
          move = g.move({
            from: parsed.from,
            to: parsed.to,
            promotion: (parsed.promotion || "q") as PieceSymbol,
          });
        } catch {
          move = null;
        }
        if (!move) {
          // Try once more directly from the engine fen in case history reconstruction missed something.
          try {
            g = new Chess(ctx.fen);
            move = g.move({
              from: parsed.from,
              to: parsed.to,
              promotion: (parsed.promotion || "q") as PieceSymbol,
            });
          } catch {
            move = null;
          }
        }
        if (!move) {
          setStatus("Bot produced an invalid move.");
          return;
        }
        gameRef.current = g;
        setFen(g.fen());
        setSelected(null);
        setDragFrom(null);
        setLastMoveSquares([parsed.from, parsed.to]);
        if (move?.san) {
          setMoveList((prev) => [...prev, move.san]);
        }
        const afterScore = materialScore(g.fen(), botColor);
        const delta = afterScore - beforeScore;
        botMoveCountRef.current.value += 1;
        if (botMoveCountRef.current.value === 1) {
          pushRandom([], "opening");
        }
        if (g.isCheckmate()) {
          pushRandom(getBotLines(botIdRef.current, "win"), "win");
          awardResultXp("loss");
        } else if (g.isDraw()) {
          awardResultXp("draw");
          setStatus("Draw. Your move.");
        } else {
          if (g.isCheck()) {
            maybeBotSpeak(getBotLines(botIdRef.current, "attack"), "attack");
          } else if (delta <= -1) {
            maybeBotSpeak(getBotLines(botIdRef.current, "sacrifice"), "sacrifice");
          } else if (delta >= 1) {
            maybeBotSpeak(getBotLines(botIdRef.current, "attack"), "attack");
          } else {
            const totalPieces = g.board().flat().filter(Boolean).length;
            if (totalPieces <= 10 && afterScore > 1) {
              maybeBotSpeak(getBotLines(botIdRef.current, "endgame"), "endgame");
            } else {
              maybeBotSpeak(getBotLines(botIdRef.current, "neutral"), "neutral");
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
    const preset = botPresets[botIdRef.current] || botPresets.knight;
    const fullmove = getFullmoveNumber(positionFen);
    pendingSearchRef.current = {
      fen: positionFen,
      gameId: gameIdRef.current.value,
      fullmove,
    };
    multipvRef.current = { gameId: gameIdRef.current.value, entries: [] };
    setEngineThinking(true);
    setEngineMessage(`Thinking (${preset.label})...`);
    engineRef.current.postMessage("stop");
    engineRef.current.postMessage(`setoption name Skill Level value ${preset.skill}`);
    engineRef.current.postMessage("setoption name MultiPV value 5");
    engineRef.current.postMessage(`position fen ${positionFen}`);
    const searchDepth = getBotSearchDepth(botIdRef.current, positionFen);
    engineRef.current.postMessage(`go depth ${searchDepth}`);
  };

  const handleDownloadPgn = () => {
    try {
      // build PGN from current game
      const pgn = gameRef.current.pgn();
      const blob = new Blob([pgn], { type: "application/x-chess-pgn" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `practice-${Date.now()}.pgn`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      console.warn("Failed to download PGN", err);
      setStatus("Could not download PGN right now.");
    }
  };

  const startGame = () => {
    if (!engineReady) {
      setStatus("Engine still loading. Please wait a moment.");
      return;
    }
    setFenError("");
    gameIdRef.current.value += 1;
    botMoveCountRef.current.value = 0;
    botStateRef.current = freshBotState();
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
    startFenRef.current = g.fen();
    gameRef.current = g;
    setFen(g.fen());
    setSelected(null);
    setDragFrom(null);
    setLastMoveSquares([]);
    setMoveList([]);
    setPromotionPending(null);
    gameOverAwardedRef.current.value = false;
    setOrientation(playerColor);
    setEngineThinking(false);
    setStatus(playerColor === "b" ? "Bot thinking..." : "Your move.");
    setShowSetup(false);
    pendingSearchRef.current = null;
    engineRef.current?.postMessage("ucinewgame");
    const preset = botPresets[botIdRef.current] || botPresets.knight;
    engineRef.current?.postMessage(`setoption name Skill Level value ${preset.skill}`);
    engineRef.current?.postMessage(
      `setoption name Skill Level Probability value ${Math.min(100, preset.skill * 5)}`,
    );
    pushRandom(getBotLines(botIdRef.current, "opening"), "opening");
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

  const attemptMove = (from: Square, to: Square, promotionOverride?: PieceSymbol) => {
    const g = rebuildGameFromHistory(fen);
    if (g.turn() !== playerColor) return;
    const beforeScore = materialScore(fen, playerColor);
    if (from === to) {
      setSelected(null);
      setDragFrom(null);
      return;
    }
    let moved: ReturnType<Chess["move"]> | null = null;
    try {
      const verbose = g.moves({ square: from, verbose: true }) as any[];
      const candidate = verbose.find((m) => m.to === to);
      const needsPromotion = candidate?.flags?.includes("p");
      if (needsPromotion && !promotionOverride) {
        setPromotionPending({ from, to });
        setStatus("Choose promotion piece.");
        setSelected(null);
        setDragFrom(null);
        return;
      }
      const promo = promotionOverride || (candidate?.promotion as PieceSymbol) || "q";
      moved = g.move({ from, to, promotion: promo });
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
    setPromotionPending(null);
    if (moved?.san) {
      setMoveList((prev) => [...prev, moved.san]);
    }
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
        pushRandom(getBotLines(botIdRef.current, "defeat"), "defeat");
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="text-xl font-bold flex items-center gap-2">
              <Rocket className="h-5 w-5 text-emerald-300" />
              Practice vs Bot
            </div>
            <div className="text-sm text-white/60">Choose your color, then play on a live board.</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(360px,1fr)_320px] gap-4 items-start">
          <div className="relative">
            <div className="relative block pl-6 sm:pl-8 pb-6 sm:pb-8 w-full max-w-[840px] mx-auto">
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
                      const isRed = redSquares.has(sq);
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
                          } ${piece ? "cursor-piece" : "cursor-auto"}`}
                          style={
                            {
                              backgroundColor: isRed
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
                          {isLastMove && !isRed && (
                            <div className="absolute inset-0 bg-yellow-400/50 pointer-events-none z-0" />
                          )}
                          {isLegal && (
                            <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
                              <div className="h-3 w-3 rounded-full bg-pink-400/80" />
                            </div>
                          )}
                          {piece ? (
                            <img
                              src={pieceSprite(piece) || ""}
                              alt=""
                              className={`relative z-10 w-full h-full object-contain ${
                                pieceThemeKey === "freestyle" ? "p-1" : "p-1"
                              } ${
                                pieceThemeKey === "freestyle" && piece.color === "b" && piece.type === "p"
                                  ? "scale-110"
                                  : ""
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

          <div className="flex flex-col gap-4">
            <div className="rounded-2xl bg-slate-900 border border-white/10 text-white p-4 shadow-xl space-y-3">
              <div className="w-full flex flex-col items-center gap-3">
                <div className="w-24 h-24 rounded-2xl overflow-hidden border border-white/10 bg-white/5 shadow-lg">
                  <img
                    src={activeBot.avatar}
                    alt="Bot avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-sm text-white/70">{activeBot.name}</div>
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
                <Button variant="ghost" className="w-full" onClick={() => setBotModalOpen(true)}>
                  Choose Bot
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setShowSetup(true)}>
                  New Game
                </Button>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900 border border-white/10 p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Moves</div>
                <Button variant="ghost" size="sm" onClick={handleDownloadPgn} className="gap-2">
                  <Download className="h-4 w-4" />
                  PGN
                </Button>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 max-h-60 overflow-y-auto text-sm text-white/80">
                {moveRows.length === 0 ? (
                  <div className="text-white/60 text-sm">No moves yet.</div>
                ) : (
                  <div className="space-y-1">
                    {moveRows.map((row) => (
                      <div key={row.num} className="flex gap-2">
                        <span className="text-white/60 w-8 shrink-0">{row.num}.</span>
                        <span className="w-20">{row.white}</span>
                        <span className="w-20">{row.black}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {botModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 text-white border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <div className="text-lg font-semibold">Choose Bot</div>
                <div className="text-xs text-white/60">Pick who you want to spar with.</div>
              </div>
              <button
                className="p-2 rounded-full hover:bg-white/10 text-white/70"
                onClick={() => setBotModalOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {practiceBots.map((bot) => (
                <button
                  key={bot.id}
                  onClick={() => {
                    setBotId(bot.id);
                    setBotModalOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 rounded-xl border px-3 py-3 text-left ${
                    bot.id === botId ? "border-pink-400 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="h-12 w-12 rounded-lg overflow-hidden border border-white/10 bg-white/5">
                    <img src={bot.avatar} alt={bot.name} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">{bot.name}</div>
                    <div className="text-xs text-white/60">{bot.difficulty || bot.label}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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

      {promotionPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 text-white border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <div className="text-lg font-semibold">Choose promotion</div>
                <div className="text-xs text-white/60">Select the piece to promote your pawn.</div>
              </div>
              <button
                className="p-2 rounded-full hover:bg-white/10 text-white/70"
                onClick={() => setPromotionPending(null)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              {(["q", "r", "b", "n"] as PieceSymbol[]).map((sym) => (
                <Button
                  key={sym}
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    if (promotionPending) {
                      attemptMove(promotionPending.from, promotionPending.to, sym);
                    }
                  }}
                >
                  Promote to {sym === "q" ? "Queen" : sym === "r" ? "Rook" : sym === "b" ? "Bishop" : "Knight"}
                </Button>
              ))}
              <Button variant="ghost" className="w-full col-span-2" onClick={() => setPromotionPending(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
