import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/ui/Button";
import {
  Swords,
  X,
  Download,
  Play,
  Settings,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Check,
  Trash2,
} from "lucide-react";
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
import { useStockfishEval } from "../hooks/useStockfishEval";
import { EvaluationBar } from "../components/EvaluationBar";
import lichessBK from "../assets/Lichess Black King.svg";
import lichessBQ from "../assets/Lichess Black Queen.svg";
import lichessBR from "../assets/Lichess Black Rook.svg";
import lichessBB from "../assets/Lichess Black Bishop.svg";
import lichessBN from "../assets/Lichess Black Knight.svg";
import lichessBP from "../assets/Lichess Black Pawn.svg";
import lichessWK from "../assets/Lichess White King.svg";
import lichessWQ from "../assets/Lichess White Queen.svg";
import lichessWR from "../assets/Lichess White Rook.svg";
import lichessWB from "../assets/Lichess White Bishop.svg";
import lichessWN from "../assets/Lichess White Knight.svg";
import lichessWP from "../assets/Lichess White Pawn.svg";

type PracticeBoardProps = {
  embedded?: boolean;
  analysisMode?: boolean;
  showEvalBar?: boolean;
  importPgn?: string | null;
  hideAnalysisTools?: boolean;
};
type BoardSquare = { color: Color; type: PieceSymbol } | null;
type MoveCell = { san: string; idx: number };
type MoveRow = { num: number; white?: MoveCell; black?: MoveCell };
type VariationLine = { id: string; fromIndex: number; moves: string[]; label: string; baseMoves: string[] };

const emptyBoard = (): BoardSquare[][] =>
  Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));

const parseFenBoard = (fenString: string): BoardSquare[][] => {
  const board = emptyBoard();
  const boardPart = fenString.split(" ")[0] || "";
  const ranks = boardPart.split("/");
  if (ranks.length !== 8) return board;
  for (let r = 0; r < 8; r++) {
    const rank = ranks[r];
    let file = 0;
    for (const ch of rank) {
      if (file > 7) return emptyBoard();
      if (ch >= "1" && ch <= "8") {
        file += Number(ch);
        continue;
      }
      const lower = ch.toLowerCase();
      if (!"pnbrqk".includes(lower)) return emptyBoard();
      const color = ch === lower ? "b" : "w";
      board[r][file] = { color, type: lower as PieceSymbol };
      file += 1;
    }
    if (file !== 8) return emptyBoard();
  }
  return board;
};

const boardToFen = (board: BoardSquare[][]): string => {
  if (board.length !== 8) return "8/8/8/8/8/8/8/8";
  return board
    .map((row) => {
      let empty = 0;
      let out = "";
      for (let c = 0; c < 8; c++) {
        const piece = row[c];
        if (!piece) {
          empty += 1;
          continue;
        }
        if (empty) {
          out += String(empty);
          empty = 0;
        }
        const char = piece.color === "w" ? piece.type.toUpperCase() : piece.type;
        out += char;
      }
      if (empty) out += String(empty);
      return out || "8";
    })
    .join("/");
};

const getBoardFromFen = (fenString: string): BoardSquare[][] => {
  try {
    const g = new Chess(fenString);
    return g.board() as BoardSquare[][];
  } catch {
    return parseFenBoard(fenString);
  }
};

const getPieceAtSquare = (fenString: string, square: Square): BoardSquare => {
  try {
    const g = new Chess(fenString);
    return g.get(square) as BoardSquare;
  } catch {
    const coords = squareToCoords(square);
    if (!coords) return null;
    const board = parseFenBoard(fenString);
    return board[coords.row][coords.col];
  }
};

const squareToCoords = (square: Square): { row: number; col: number } | null => {
  const fileIdx = "abcdefgh".indexOf(square[0]);
  const rank = Number(square[1]);
  if (fileIdx < 0 || rank < 1 || rank > 8) return null;
  return { row: 8 - rank, col: fileIdx };
};

const countBoardPieces = (board: BoardSquare[][]): number =>
  board.reduce((sum, row) => sum + row.filter(Boolean).length, 0);

const resolveMoveIndexForFen = (
  moves: string[],
  fenString: string,
  baseFen?: string,
  preferredIdx?: number,
): number | null => {
  try {
    const g = baseFen ? new Chess(baseFen) : new Chess();
    let matchedIdx: number | null = null;
    if (g.fen() === fenString) {
      if (preferredIdx === 0) return 0;
      matchedIdx = 0;
    }
    for (let i = 0; i < moves.length; i++) {
      try {
        g.move(moves[i], { sloppy: true });
      } catch {
        break;
      }
      if (g.fen() === fenString) {
        const idx = i + 1;
        if (preferredIdx === idx) return idx;
        if (matchedIdx === null) {
          matchedIdx = idx;
        }
      }
    }
    return matchedIdx;
  } catch {
    return null;
  }
};

const buildMoveRows = (moves: string[], indexOffset: number): MoveRow[] => {
  const rows: MoveRow[] = [];
  moves.forEach((san, localIdx) => {
    const globalIdx = indexOffset + localIdx;
    const rowNum = Math.floor(globalIdx / 2) + 1;
    const isWhite = globalIdx % 2 === 0;
    let row = rows[rows.length - 1];
    if (!row || row.num !== rowNum) {
      row = { num: rowNum };
      rows.push(row);
    }
    if (isWhite) {
      row.white = { san, idx: globalIdx };
    } else {
      row.black = { san, idx: globalIdx };
    }
  });
  return rows;
};

const movesEqual = (a: string[], b: string[]): boolean => a.length === b.length && a.every((move, idx) => move === b[idx]);

const pageBackground = {
  backgroundImage: `
    radial-gradient(1200px 600px at 50% -10%, rgba(255, 255, 255, 0.03), transparent 60%),
    linear-gradient(180deg, #0b1220 0%, #0d1628 25%, #0b1220 45%, #0a0f1c 60%, #070a12 75%, #000000 92%)
  `,
  minHeight: "100vh",
  color: "#ffffff",
} as const;

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
  pv?: string[];
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

export function PracticeBoard({
  embedded = false,
  analysisMode = false,
  showEvalBar = false,
  importPgn = null,
  hideAnalysisTools = false,
}: PracticeBoardProps) {
  const { user } = useAuth();
  const isAnalysisMode = analysisMode;
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
  const [status, setStatus] = useState<string>(
    isAnalysisMode ? "Analysis mode: move any side. No opponent." : "Engine loading...",
  );
  const [engineReady, setEngineReady] = useState(!isAnalysisMode);
  const [engineMessage, setEngineMessage] = useState<string>(
    isAnalysisMode ? "Manual analysis (no engine opponent)." : "Booting Stockfish...",
  );
  const [engineThinking, setEngineThinking] = useState(false);
  const [orientation, setOrientation] = useState<Color>("w");
  const [botChat, setBotChat] = useState<string[]>(isAnalysisMode ? ["Manual analysis: move either side."] : []);
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
  const [boardEditorOpen, setBoardEditorOpen] = useState(false);
  const [editorFen, setEditorFen] = useState("");
  const [editorSideToMove, setEditorSideToMove] = useState<Color>("w");
  const editorOriginFenRef = useRef<string>("");
  const [editorSelectedPiece, setEditorSelectedPiece] = useState<{ color: Color; type: PieceSymbol } | null>(null);
  const editorDragFromRef = useRef<Square | null>(null);
  const editorDropHandledRef = useRef(false);
  const [variations, setVariations] = useState<VariationLine[]>([]);
  const [activeLine, setActiveLine] = useState<{ type: "main" } | { type: "variation"; id: string }>({ type: "main" });
  const [importText, setImportText] = useState("");
  const lastImportedPgnRef = useRef<string | null>(null);
  const editorPieceImages: Record<`${Color}${PieceSymbol}`, string> = {
    br: lichessBR,
    bn: lichessBN,
    bb: lichessBB,
    bq: lichessBQ,
    bk: lichessBK,
    bp: lichessBP,
    wr: lichessWR,
    wn: lichessWN,
    wb: lichessWB,
    wq: lichessWQ,
    wk: lichessWK,
    wp: lichessWP,
  };
  const boardColors = resolveBoardTheme(user?.boardTheme).colors;
  const { key: pieceThemeKey, pieces: pieceSet } = useMemo(() => resolvePieceTheme(user?.pieceTheme), [user?.pieceTheme]);
  const [botModalOpen, setBotModalOpen] = useState(false);
  const [botId, setBotId] = useState<BotId>(practiceBots[0].id);
  const activeBot = isAnalysisMode
    ? { ...practiceBots[0], name: "Analysis Board", label: "Manual review" }
    : practiceBots.find((b) => b.id === botId) || practiceBots[0];
  const botIdRef = useRef<BotId>(botId);
  const botStateRef = useRef<Record<BotId, BotBrainState>>(freshBotState());
  const [promotionPending, setPromotionPending] = useState<{ from: Square; to: Square } | null>(null);
  const [moveList, setMoveList] = useState<string[]>([]);
  const [xpToast, setXpToast] = useState<{ amount: number } | null>(null);
  const [makeMovesOpen, setMakeMovesOpen] = useState(false);
  const [multipvLines, setMultipvLines] = useState<EngineLine[]>([]);
  const analysisSearchIdRef = useRef(0);
  const [currentMoveIdx, setCurrentMoveIdx] = useState(0);
  const boardWrapRef = useRef<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [boardPixelSize, setBoardPixelSize] = useState(520);
  useEffect(() => {
    if (isAnalysisMode) return;
    botIdRef.current = botId;
    botStateRef.current[botId] = { losingMode: false, lastEvalCp: 0, lastMateThreat: false };
  }, [botId, isAnalysisMode]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const handleChange = () => setIsMobile(mq.matches);
    handleChange();
    if (mq.addEventListener) {
      mq.addEventListener("change", handleChange);
    } else {
      mq.addListener(handleChange);
    }
    return () => {
      if (mq.addEventListener) {
        mq.removeEventListener("change", handleChange);
      } else {
        mq.removeListener(handleChange);
      }
    };
  }, []);
  useEffect(() => {
    if (!isMobile || typeof window === "undefined") return;
    const node = boardWrapRef.current;
    if (!node) return;
    const updateSize = () => {
      const next = Math.round(node.getBoundingClientRect().width);
      if (next > 0) setBoardPixelSize(next);
    };
    updateSize();
    let observer: ResizeObserver | null = null;
    if ("ResizeObserver" in window) {
      observer = new ResizeObserver(updateSize);
      observer.observe(node);
    } else {
      window.addEventListener("resize", updateSize);
    }
    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, [isMobile]);
  const transparentPixel =
    "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
  const setDragCursor = (active: boolean) => {
    if (typeof document === "undefined") return;
    document.body.style.cursor = active ? `url(${macCursorClosed}) 8 8, grabbing` : "";
  };

  const xpToastTimeout = useRef<number | null>(null);
  const showXpToast = (amount: number) => {
    if (isAnalysisMode) return;
    setXpToast({ amount });
    if (xpToastTimeout.current) {
      clearTimeout(xpToastTimeout.current);
    }
    xpToastTimeout.current = window.setTimeout(() => setXpToast(null), 5000);
  };

  useEffect(() => {
    return () => {
      setDragCursor(false);
      if (xpToastTimeout.current) {
        clearTimeout(xpToastTimeout.current);
      }
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
    if (isAnalysisMode) return;
    if (gameOverAwardedRef.current.value) return;
    gameOverAwardedRef.current.value = true;
    const xpGain = result === "win" ? 150 : result === "loss" ? 75 : 112;
    if (user) {
      awardXp(user.id, xpGain, { source: `practice_${result}` });
      showXpToast(xpGain);
    }
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

  const squareName = (rowIdx: number, colIdx: number): Square => {
    const file = "abcdefgh"[orientation === "w" ? colIdx : 7 - colIdx];
    const rank = orientation === "w" ? 8 - rowIdx : rowIdx + 1;
    return `${file}${rank}` as Square;
  };

  const board = useMemo(() => {
    const rows = getBoardFromFen(fen);
    return orientation === "w" ? rows : rows.slice().reverse().map((row) => row.slice().reverse());
  }, [fen, orientation]);

  const legalMoves = useMemo(() => {
    if (!selected || boardEditorOpen) return [];
    try {
      const g = new Chess(fen);
      return g.moves({ square: selected, verbose: true });
    } catch {
      return [];
    }
  }, [fen, selected, boardEditorOpen]);

  const getVariationBaseMoves = (line: VariationLine) =>
    Array.isArray(line.baseMoves) ? line.baseMoves : moveList.slice(0, line.fromIndex);

  const getActiveMoves = () => {
    if (activeLine.type === "main") return moveList;
    const v = variations.find((vv) => vv.id === activeLine.id);
    if (!v) return moveList;
    const baseMoves = getVariationBaseMoves(v);
    return [...baseMoves, ...v.moves];
  };
  const activeMoves = useMemo(getActiveMoves, [activeLine, moveList, variations]);
  const activeVariation = useMemo(
    () => (activeLine.type === "variation" ? variations.find((line) => line.id === activeLine.id) || null : null),
    [activeLine, variations],
  );
  const variationBaseMoves = useMemo(() => {
    if (!activeVariation) return null;
    return getVariationBaseMoves(activeVariation);
  }, [activeVariation, moveList]);
  const variationBaseFen = useMemo(() => {
    if (!activeVariation || !variationBaseMoves) return null;
    try {
      const g = startFenRef.current ? new Chess(startFenRef.current) : new Chess();
      for (const san of variationBaseMoves) {
        if (!san) break;
        g.move(san, { sloppy: true });
      }
      return g.fen();
    } catch {
      return null;
    }
  }, [activeVariation, variationBaseMoves]);
  const variationLocalIdx = useMemo(() => {
    if (!activeVariation || !variationBaseFen || !variationBaseMoves) return null;
    const baseLength = variationBaseMoves.length;
    const preferredLocal =
      currentMoveIdx >= baseLength ? currentMoveIdx - baseLength : undefined;
    return resolveMoveIndexForFen(activeVariation.moves, fen, variationBaseFen, preferredLocal);
  }, [activeVariation, variationBaseMoves, variationBaseFen, fen, currentMoveIdx]);
  const safeMoveIdx = Math.min(currentMoveIdx, activeMoves.length);
  const displayOffset = activeVariation ? variationBaseMoves?.length ?? activeVariation.fromIndex : 0;
  const displayMoves = useMemo(() => (activeVariation ? activeVariation.moves : activeMoves), [activeVariation, activeMoves]);
  const rawDisplayMoveCount = activeVariation
    ? Math.max(0, variationLocalIdx ?? safeMoveIdx - displayOffset)
    : safeMoveIdx;
  const displayMoveCount = Math.min(rawDisplayMoveCount, displayMoves.length);
  const moveRows = useMemo(() => buildMoveRows(displayMoves, displayOffset), [displayMoves, displayOffset]);
  const activeMoveGlobalIdx = displayMoveCount > 0 ? displayOffset + displayMoveCount - 1 : -1;
  const canStepBack = safeMoveIdx > 0;
  const canStepForward = safeMoveIdx < activeMoves.length;
  useEffect(() => {
    if (currentMoveIdx > activeMoves.length) {
      setCurrentMoveIdx(activeMoves.length);
    }
  }, [currentMoveIdx, activeMoves.length]);
  useEffect(() => {
    if (activeVariation && variationLocalIdx !== null && variationBaseMoves) {
      const nextIdx = variationBaseMoves.length + variationLocalIdx;
      if (nextIdx !== currentMoveIdx) {
        setCurrentMoveIdx(nextIdx);
      }
      return;
    }
    const resolvedIdx = resolveMoveIndexForFen(activeMoves, fen, startFenRef.current, currentMoveIdx);
    if (resolvedIdx !== null && resolvedIdx !== currentMoveIdx) {
      setCurrentMoveIdx(resolvedIdx);
    }
  }, [activeVariation, variationLocalIdx, variationBaseMoves, activeMoves, fen, currentMoveIdx]);
  const updateEditorFenWithSide = (fenString: string, side: Color) => {
    try {
      const parts = fenString.split(" ");
      if (parts.length >= 2) {
        parts[1] = side;
        const next = parts.join(" ");
        setEditorFen(next);
        setFen(next);
        return next;
      }
    } catch {
      // ignore parse errors
    }
    setEditorFen(fenString);
    setFen(fenString);
    return fenString;
  };
  const findKingSquare = (g: Chess, color: Color): Square | null => {
    const boardMatrix = g.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = boardMatrix[r][c];
        if (piece && piece.type === "k" && piece.color === color) {
          const file = "abcdefgh"[c];
          const rank = 8 - r;
          return `${file}${rank}` as Square;
        }
      }
    }
    return null;
  };
  const applyEditorChange = ({
    target,
    piece,
    source,
  }: {
    target: Square;
    piece: { color: Color; type: PieceSymbol } | null;
    source?: Square | null;
  }): boolean => {
    try {
      const g = new Chess(fen);
      if (source && source !== target) {
        g.remove(source);
      }
      if (piece) {
        if (piece.type === "k") {
          const existingKing = findKingSquare(g, piece.color);
          if (existingKing && existingKing !== target) {
            g.remove(existingKing);
          }
        }
        const pieceCount = g.board().flat().filter(Boolean).length;
        const targetEmpty = !g.get(target);
        if (targetEmpty && pieceCount >= 32) {
          setStatus("Board editor: max 32 pieces allowed.");
          return false;
        }
        g.put({ type: piece.type, color: piece.color }, target);
        setLastMoveSquares(source && source !== target ? [source, target] : [target, target]);
      } else {
        g.remove(target);
        setLastMoveSquares([]);
      }
      const nextFen = updateEditorFenWithSide(g.fen(), editorSideToMove);
      setFen(nextFen);
      setEditorFen(nextFen);
      setStatus("Editing position...");
      return true;
    } catch {
      const board = parseFenBoard(fen);
      const targetCoords = squareToCoords(target);
      if (!targetCoords) return false;
      if (source && source !== target) {
        const fromCoords = squareToCoords(source);
        if (fromCoords) {
          board[fromCoords.row][fromCoords.col] = null;
        }
      }
      if (piece) {
        if (piece.type === "k") {
          for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
              const existing = board[r][c];
              if (existing && existing.type === "k" && existing.color === piece.color) {
                board[r][c] = null;
              }
            }
          }
        }
        const pieceCount = countBoardPieces(board);
        const targetEmpty = !board[targetCoords.row][targetCoords.col];
        if (targetEmpty && pieceCount >= 32) {
          setStatus("Board editor: max 32 pieces allowed.");
          return false;
        }
        board[targetCoords.row][targetCoords.col] = piece;
        setLastMoveSquares(source && source !== target ? [source, target] : [target, target]);
      } else {
        board[targetCoords.row][targetCoords.col] = null;
        setLastMoveSquares([]);
      }
      const nextFen = `${boardToFen(board)} ${editorSideToMove} - - 0 1`;
      setEditorFen(nextFen);
      setFen(nextFen);
      setStatus("Editing position...");
      return true;
    }
  };
  const goToMoveIndex = (
    index: number,
    opts?: { force?: boolean; movesOverride?: string[]; baseFenOverride?: string; lastMoveOverride?: [Square, Square] },
  ) => {
    if (boardEditorOpen) return;
    let moves = opts?.movesOverride ?? getActiveMoves();
    const target = Math.max(0, Math.min(index, moves.length));
    if (!opts?.force && target === currentMoveIdx + 1) {
      const currentPrefix = moves.slice(0, currentMoveIdx);
      const branches = variations.filter(
        (v) => v.fromIndex === currentMoveIdx && movesEqual(getVariationBaseMoves(v), currentPrefix),
      );
      if (branches.length) {
        // Auto-select the first matching variation (no user prompt).
        const branch = branches[0];
        setActiveLine({ type: "variation", id: branch.id });
        moves = [...getVariationBaseMoves(branch), ...branch.moves];
      }
    }
    let g: Chess;
    try {
      const base = opts?.baseFenOverride ?? startFenRef.current;
      g = base ? new Chess(base) : new Chess();
    } catch {
      g = new Chess();
    }
    let last: ReturnType<Chess["move"]> | null = null;
    for (let i = 0; i < target; i++) {
      const san = moves[i];
      try {
        last = g.move(san, { sloppy: true });
      } catch {
        break;
      }
    }
    gameRef.current = g;
    setFen(g.fen());
    setSelected(null);
    setDragFrom(null);
    setDragCursor(false);
    setPromotionPending(null);
    const highlight = opts?.lastMoveOverride ?? (last ? [last.from, last.to] : []);
    setLastMoveSquares(highlight || []);
    setCurrentMoveIdx(target);
    setEvalRefresh((k) => k + 1);
  };
  // variation selection UI removed: variations are auto-selected when stepping into branches.
  const openBoardEditor = () => {
    engineRef.current?.postMessage("stop");
    editorOriginFenRef.current = fen;
    setBoardEditorOpen(true);
    setEditorSelectedPiece({ color: "w", type: "p" });
    const parts = fen.split(" ");
    const side = parts[1] === "b" ? "b" : "w";
    setEditorSideToMove(side);
    try {
      const g = new Chess(fen);
      const nextFen = updateEditorFenWithSide(g.fen(), side);
      setFen(nextFen);
    } catch {
      const boardPart = boardToFen(parseFenBoard(fen));
      const nextFen = `${boardPart} ${side} - - 0 1`;
      setEditorFen(nextFen);
      setFen(nextFen);
    }
    setLastMoveSquares([]);
  };
  const cancelBoardEditor = () => {
    const back = editorOriginFenRef.current || fen;
    setBoardEditorOpen(false);
    setEditorSelectedPiece(null);
    setEditorFen(back);
    setFen(back);
    setLastMoveSquares([]);
    setSelected(null);
    setDragFrom(null);
  };
  const applyBoardEditor = () => {
    let g: Chess;
    try {
      g = new Chess(fen);
    } catch {
      setStatus("Board editor: place both kings before applying.");
      return;
    }
    setBoardEditorOpen(false);
    setEditorSelectedPiece(null);
    gameRef.current = g;
    const baseFen = g.fen();
    startFenRef.current = baseFen;
    setFen(baseFen);
    setMoveList([]);
    setVariations([]);
    setActiveLine({ type: "main" });
    setLastMoveSquares([]);
    setStatus("Custom position loaded.");
    setSelected(null);
    setDragFrom(null);
    setCurrentMoveIdx(0);
    // variation prompting removed
    setEvalRefresh((k) => k + 1);
  };
  const clearBoardEditor = () => {
    const emptyFen = `${boardToFen(emptyBoard())} ${editorSideToMove} - - 0 1`;
    setFen(emptyFen);
    setEditorFen(emptyFen);
    setLastMoveSquares([]);
  };
  const resetBoardEditor = () => {
    const base = new Chess().fen();
    setEditorSideToMove("w");
    setFen(base);
    setEditorFen(base);
    setLastMoveSquares([]);
  };
  const [importPanelOpen, setImportPanelOpen] = useState(true);
  const pvToSanLine = (pv: string[] | undefined, fenString: string) => {
    if (!pv?.length) return "";
    try {
      const g = new Chess(fenString);
      const parts = fenString.split(" ");
      const sideToMove = parts[1] === "b" ? "b" : "w";
      const baseMoveNumber = Number(parts[5] || "1") || 1;
      const sanMoves: string[] = [];
      for (const token of pv.slice(0, 10)) {
        // Engine may output UCI (e.g., g8c6) or SAN (e.g., Nf6). Try UCI first if it matches the pattern,
        // otherwise try SAN parsing.
        const uciMatch = /^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(token);
        let res: ReturnType<Chess['move']> | null = null;
        if (uciMatch) {
          const from = token.slice(0, 2) as Square;
          const to = token.slice(2, 4) as Square;
          const promotion = token[4] ? (token[4] as PieceSymbol) : undefined;
          try {
            res = g.move({ from, to, promotion }, { sloppy: true } as any);
          } catch {
            res = null;
          }
          // If UCI application failed, as a fallback try SAN parsing of the token
          if (!res) {
            try {
              res = g.move(token, { sloppy: true } as any);
            } catch {
              res = null;
            }
          }
        } else {
          try {
            res = g.move(token, { sloppy: true } as any);
          } catch {
            res = null;
          }
        }
        if (!res) break;
        sanMoves.push(res.san);
      }
      const withMoveNumbers = sanMoves.map((san, idx) => {
        const whiteToMove = sideToMove === "w";
        const plyOffset = whiteToMove ? idx : idx + 1;
        const moveNumber = baseMoveNumber + Math.floor(plyOffset / 2);
        const isWhiteMove = whiteToMove ? idx % 2 === 0 : idx % 2 === 1;
        if (isWhiteMove) {
          return `${moveNumber}. ${san}`;
        }
        if (!whiteToMove && idx === 0) {
          return `${moveNumber}... ${san}`;
        }
        return san;
      });
      return withMoveNumbers.join(" ");
    } catch {
      return pv.slice(0, 10).join(" ");
    }
  };

  const convertMoveTokenToSan = (token: string | undefined, fenString: string) => {
    if (!token) return "";
    // If token contains multiple moves separated by spaces, convert each and join.
    const parts = token.trim().split(/\s+/);
    try {
      const g = new Chess(fenString);
      const sanParts: string[] = [];
      for (const part of parts) {
        if (!part) continue;
        if (/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(part)) {
          const from = part.slice(0, 2) as Square;
          const to = part.slice(2, 4) as Square;
          const promotion = part[4] ? (part[4] as PieceSymbol) : undefined;
          const res = g.move({ from, to, promotion }, { sloppy: true } as any);
          if (res) {
            sanParts.push(res.san);
            continue;
          }
        }
        const res2 = g.move(part, { sloppy: true } as any);
        if (res2) sanParts.push(res2.san);
        else sanParts.push(part);
      }
      return sanParts.join(" ");
    } catch {
      return token;
    }
  };

  const recommendedLines = useMemo(() => {
    if (multipvLines.length) {
      return multipvLines.slice(0, 3).map((entry) => ({
        score:
          entry.type === "mate"
            ? entry.score > 0
              ? "Mate"
              : "Mate"
            : `${entry.score >= 0 ? "+" : ""}${(entry.score / 100).toFixed(1)}`,
        line: pvToSanLine(entry.pv, fen) || convertMoveTokenToSan(entry.move, fen) || entry.move,
      }));
    }
    return [
      { score: "+0.0", line: "Waiting for analysis..." },
      { score: "", line: "" },
      { score: "", line: "" },
    ];
  }, [multipvLines, fen]);

  useEffect(() => {
    if (!isAnalysisMode || !makeMovesOpen || boardEditorOpen) return;
    if (!engineRef.current || !engineReady) return;
    const searchId = ++analysisSearchIdRef.current;
    multipvRef.current = { gameId: searchId, entries: [] };
    setMultipvLines([]);
    engineRef.current.postMessage("stop");
    engineRef.current.postMessage("setoption name MultiPV value 3");
    engineRef.current.postMessage(`position fen ${fen}`);
    engineRef.current.postMessage("go depth 18");
    return () => {
      engineRef.current?.postMessage("stop");
    };
  }, [isAnalysisMode, makeMovesOpen, fen, engineReady, boardEditorOpen]);

  const [evalBarEnabled, setEvalBarEnabled] = useState(showEvalBar);
  const evalBarOn = analysisMode ? evalBarEnabled : showEvalBar;
  const [evalRefresh, setEvalRefresh] = useState(0);
  const evalState = useStockfishEval(evalBarOn && analysisMode && !boardEditorOpen ? fen : null, {
    depth: 16,
    throttleMs: 150,
    refreshKey: evalRefresh,
  });

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
      setArrows((prev) => {
        const exists = prev.find(
          (a) =>
            a.start.square === arrowStart.square &&
            a.end.square === arrowTarget.square,
        );
        if (exists) {
          return prev.filter(
            (a) =>
              !(
                a.start.square === arrowStart.square &&
                a.end.square === arrowTarget.square
              ),
          );
        }
        return [...prev, { start: arrowStart, end: arrowTarget }];
      });
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
    getActiveMoves().forEach((san) => {
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
        const activeId = multipvRef.current.gameId;
        const match = msg.match(/multipv\s+(\d+).*?score\s+(cp|mate)\s+(-?\d+).*?\spv\s+(.+)/i);
        if (activeId && match) {
          const idx = Math.max(1, parseInt(match[1], 10)) - 1;
          const type = match[2] === "mate" ? "mate" : "cp";
          const scoreVal = parseInt(match[3], 10);
          const pvMoves = match[4].trim().split(/\s+/).slice(0, 20);
          const moveStr = pvMoves[0];
          const score = type === "mate" ? (scoreVal >= 0 ? 100000 - Math.abs(scoreVal) : -100000 + Math.abs(scoreVal)) : scoreVal;
          const currentEntries = multipvRef.current.entries ?? [];
          const nextEntries = [...currentEntries];
          nextEntries[idx] = { move: moveStr, score, type, pv: pvMoves };
          multipvRef.current = { gameId: activeId, entries: nextEntries };
          setMultipvLines(nextEntries.filter(Boolean).slice(0, 3));
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
        if (isAnalysisMode) return;
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
          setMoveList((prev) => {
            const next = [...prev, move.san];
            setCurrentMoveIdx(next.length);
            return next;
          });
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
  }, [isAnalysisMode]);

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
    if (!isAnalysisMode && !engineReady) {
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
    setBoardEditorOpen(false);
    setEditorSelectedPiece(null);
    setVariations([]);
    setActiveLine({ type: "main" });
    setCurrentMoveIdx(0);
    setPromotionPending(null);
    setEvalRefresh((k) => k + 1);
    gameOverAwardedRef.current.value = false;
    setOrientation(playerColor);
    setEngineThinking(false);
    setStatus(
      isAnalysisMode ? "Analysis mode: move any side. No opponent." : playerColor === "b" ? "Bot thinking..." : "Your move.",
    );
    setShowSetup(false);
    pendingSearchRef.current = null;
    if (!isAnalysisMode) {
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
    }
  };

  const importPgnText = (raw: string, options?: { closePanel?: boolean }) => {
    const text = raw.trim();
    if (!text) {
      setStatus("Paste a PGN first.");
      return;
    }
    try {
      const parsed = new Chess();
      parsed.loadPgn(text, { strict: false });
      const history = parsed.history();
      const header = parsed.header?.() || {};
      const baseFen = (header.SetUp === "1" && header.FEN) || header.FEN || new Chess().fen();
      const playback = new Chess(baseFen);
      let lastMove: ReturnType<Chess["move"]> | null = null;
      history.forEach((san) => {
        try {
          lastMove = playback.move(san, { sloppy: true });
        } catch {
          /* ignore */
        }
      });
      startFenRef.current = baseFen;
      gameRef.current = playback;
      setMoveList(history);
      setVariations([]);
      setActiveLine({ type: "main" });
      setCurrentMoveIdx(history.length);
      setFen(playback.fen());
      setLastMoveSquares(lastMove ? [lastMove.from, lastMove.to] : []);
      setStatus("Game imported.");
      if (options?.closePanel) {
        setImportPanelOpen(false);
      }
      setEvalRefresh((k) => k + 1);
      goToMoveIndex(history.length, {
        force: true,
        movesOverride: history,
        baseFenOverride: baseFen,
        lastMoveOverride: lastMove ? [lastMove.from, lastMove.to] : undefined,
      });
    } catch {
      setStatus("Could not import game. Please check the PGN.");
    }
  };

  const handleImportGame = () => {
    importPgnText(importText, { closePanel: true });
  };

  useEffect(() => {
    if (!importPgn) return;
    const trimmed = importPgn.trim();
    if (!trimmed) return;
    if (lastImportedPgnRef.current === trimmed) return;
    lastImportedPgnRef.current = trimmed;
    setImportText(trimmed);
    importPgnText(trimmed, { closePanel: true });
  }, [importPgn]);

  const handleSquareClick = (rowIdx: number, colIdx: number) => {
    setArrowStart(null);
    setArrowTarget(null);
    setArrows([]);
    setRedSquares(new Set());
    const target = squareName(rowIdx, colIdx);
    if (boardEditorOpen) {
      applyEditorChange({ target, piece: editorSelectedPiece });
      return;
    }
    let g: Chess;
    try {
      g = new Chess(fen);
    } catch {
      return;
    }
    if (!isAnalysisMode && g.turn() !== playerColor) return;
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
    if (!isAnalysisMode) {
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
        setMoveList((prev) => {
          const next = [...prev, moved.san];
          setCurrentMoveIdx(next.length);
          return next;
        });
      }
      const afterScore = materialScore(g.fen(), playerColor);
      const delta = afterScore - beforeScore;
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
      return;
    }

    // variation prompting removed: proceed without showing prompts
    const lineMoves = getActiveMoves();
    const resolvedIdx = resolveMoveIndexForFen(lineMoves, fen, startFenRef.current, currentMoveIdx);
    const fallbackIdx = Math.min(currentMoveIdx, lineMoves.length);
    const moveIndex = resolvedIdx ?? fallbackIdx;
    if (resolvedIdx !== null && resolvedIdx !== currentMoveIdx) {
      setCurrentMoveIdx(resolvedIdx);
    }
    let baseGame: Chess;
    if (resolvedIdx === null) {
      try {
        baseGame = new Chess(fen);
      } catch {
        baseGame = startFenRef.current ? new Chess(startFenRef.current) : new Chess();
      }
    } else {
      baseGame = startFenRef.current ? new Chess(startFenRef.current) : new Chess();
      for (let i = 0; i < moveIndex; i++) {
        try {
          baseGame.move(lineMoves[i], { sloppy: true });
        } catch {
          break;
        }
      }
    }
    if (from === to) {
      setSelected(null);
      setDragFrom(null);
      return;
    }
    let moved: ReturnType<Chess["move"]> | null = null;
    try {
      const verbose = baseGame.moves({ square: from, verbose: true }) as any[];
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
      moved = baseGame.move({ from, to, promotion: promo });
    } catch {
      moved = null;
    }
    if (!moved) {
      setSelected(null);
      return;
    }
    if (!makeMovesOpen && !boardEditorOpen) {
      setMakeMovesOpen(true);
    }
    const newFen = baseGame.fen();
    gameRef.current = baseGame;
    setFen(newFen);
    setSelected(null);
    setLastMoveSquares([from, to]);
    setPromotionPending(null);

    const linePrefix = lineMoves.slice(0, moveIndex);
    const addVariationMove = (baseMoves: string[], san: string, currentIndex: number, targetId?: string) => {
      let newId: string | null = null;
      setVariations((prev) => {
        const idx = targetId ? prev.findIndex((v) => v.id === targetId) : -1;
        if (idx >= 0) {
          const v = prev[idx];
          const baseLength = Array.isArray(v.baseMoves) ? v.baseMoves.length : v.fromIndex;
          const kept = v.moves.slice(0, Math.max(0, currentIndex - baseLength));
          const nextVar = { ...v, moves: [...kept, san] };
          newId = nextVar.id;
          const copy = [...prev];
          copy[idx] = nextVar;
          return copy;
        }
        const id = `var-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        newId = id;
        const base = baseMoves.slice();
        return [
          ...prev,
          { id, fromIndex: base.length, baseMoves: base, moves: [san], label: `Line ${prev.length + 1}` },
        ];
      });
      return newId;
    };

    if (moved?.san) {
      if (activeLine.type === "main") {
        if (moveIndex < moveList.length && moveList[moveIndex] === moved.san) {
          setActiveLine({ type: "main" });
          setCurrentMoveIdx(moveIndex + 1);
        } else if (moveIndex === moveList.length) {
          setMoveList((prev) => {
            const next = [...prev, moved.san];
            setCurrentMoveIdx(next.length);
            return next;
          });
          setActiveLine({ type: "main" });
        } else {
          // Diverged from existing main moves: truncate the main move list and append the new move.
          setMoveList((prev) => {
            const next = prev.slice(0, moveIndex);
            next.push(moved.san);
            setCurrentMoveIdx(next.length);
            return next;
          });
          // Clear any stored variations since the main line changed.
          setVariations([]);
          setActiveLine({ type: "main" });
        }
      } else {
        const v = variations.find((vv) => vv.id === activeLine.id);
        const baseMoves = v ? getVariationBaseMoves(v) : [];
        const baseLength = baseMoves.length;
        // If the user edits the base portion of a variation, treat it like editing the main line: truncate main and apply change.
        if (moveIndex < baseLength) {
          setMoveList((prev) => {
            const next = prev.slice(0, moveIndex);
            next.push(moved.san);
            setCurrentMoveIdx(next.length);
            return next;
          });
          setVariations([]);
          setActiveLine({ type: "main" });
        } else if (!v) {
          // No matching variation found: fall back to truncating main.
          setMoveList((prev) => {
            const next = prev.slice(0, moveIndex);
            next.push(moved.san);
            setCurrentMoveIdx(next.length);
            return next;
          });
          setVariations([]);
          setActiveLine({ type: "main" });
        } else {
          const relativeIdx = moveIndex - baseLength;
          const matchesExisting = relativeIdx >= 0 && relativeIdx < v.moves.length && v.moves[relativeIdx] === moved.san;
          if (matchesExisting) {
            setActiveLine({ type: "variation", id: v.id });
            setCurrentMoveIdx(moveIndex + 1);
          } else {
            // Diverging inside the variation: truncate this variation's moves up to the divergence and append the new move.
            setVariations((prev) =>
              prev.map((vv) => {
                if (vv.id !== v.id) return vv;
                const kept = vv.moves.slice(0, Math.max(0, relativeIdx));
                return { ...vv, moves: [...kept, moved.san] };
              }),
            );
            setActiveLine({ type: "variation", id: v.id });
            setCurrentMoveIdx(moveIndex + 1);
          }
        }
      }
    }
    setEvalRefresh((k) => k + 1);
    setStatus(baseGame.isCheckmate() ? "Checkmate on the board." : baseGame.isCheck() ? "Check." : "Your move.");
  };

  useEffect(() => {
    try {
      const g = new Chess(fen);
      if (g.isGameOver()) {
        if (g.isCheckmate()) {
          setStatus(g.turn() === playerColor ? "You are checkmated." : "You delivered checkmate!");
        } else {
          setStatus("Game over.");
        }
      }
    } catch {
      // ignore invalid editor positions
    }
  }, [fen, playerColor]);

  const mobileEvalHeight = Math.max(240, boardPixelSize);

  const boardElement = (
    <div ref={boardWrapRef} className="pp-board-wrap relative block w-full max-w-[780px] mx-auto min-w-0">
      <div
        className="rounded-[28px] overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.45)] w-full"
        style={{ backgroundColor: boardColors.dark }}
      >
        <div className="pp-board relative grid grid-cols-8 grid-rows-8 w-full aspect-square mx-auto">
          {board.map((row, rIdx) =>
            row.map((piece, cIdx) => {
              const sq = squareName(rIdx, cIdx);
              const isLightSquare = (rIdx + cIdx) % 2 === 0;
              const isLegal = legalMoves.some((m) => m.to === sq);
              const isLastMove = lastMoveSquares.includes(sq);
              const isRed = redSquares.has(sq);
              return (
                <button
                  key={`${rIdx}-${cIdx}`}
                  onClick={() => handleSquareClick(rIdx, cIdx)}
                  draggable={!!piece}
                  onDragStart={(e) => {
                    const sqName = squareName(rIdx, cIdx);
                    if (boardEditorOpen) {
                      editorDragFromRef.current = sqName;
                      editorDropHandledRef.current = false;
                      const targetPiece = getPieceAtSquare(fen, sqName);
                      if (targetPiece) {
                        setEditorSelectedPiece({ color: targetPiece.color, type: targetPiece.type });
                        e.dataTransfer?.setData(
                          "application/x-chess-piece",
                          JSON.stringify({ color: targetPiece.color, type: targetPiece.type }),
                        );
                      }
                      return;
                    }
                    let g: Chess;
                    try {
                      g = new Chess(fen);
                    } catch {
                      e.preventDefault();
                      return;
                    }
                    const targetPiece = g.get(sqName);
                    if (targetPiece && (isAnalysisMode || (targetPiece.color === g.turn() && g.turn() === playerColor))) {
                      setDragFrom(sqName);
                      e.dataTransfer?.setData("text/plain", sqName);
                    } else {
                      e.preventDefault();
                    }
                  }}
                  onDragOver={(e) => {
                    if (boardEditorOpen || dragFrom) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    const to = squareName(rIdx, cIdx);
                    if (boardEditorOpen) {
                      e.preventDefault();
                      editorDropHandledRef.current = true;
                      const source = editorDragFromRef.current;
                      let piece = editorSelectedPiece;
                      if (!piece && source) {
                        const found = getPieceAtSquare(fen, source);
                        if (found) {
                          piece = { color: found.color, type: found.type };
                        }
                      }
                      applyEditorChange({ target: to, piece, source });
                      editorDragFromRef.current = null;
                      return;
                    }
                    e.preventDefault();
                    const from = dragFrom || (e.dataTransfer?.getData("text/plain") as Square | null);
                    if (from) {
                      attemptMove(from, to);
                    }
                    setDragFrom(null);
                    setDragCursor(false);
                  }}
                  onDragEnd={() => {
                    if (boardEditorOpen) {
                      if (editorDragFromRef.current && !editorDropHandledRef.current) {
                        applyEditorChange({ target: editorDragFromRef.current, piece: null, source: editorDragFromRef.current });
                      }
                      editorDragFromRef.current = null;
                      editorDropHandledRef.current = false;
                      return;
                    }
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
                    piece ? "cursor-piece" : "cursor-auto"
                  }`}
                  style={{
                    backgroundColor: isRed ? '#ef4444' : isLightSquare ? boardColors.light : boardColors.dark,
                    ...(piece
                      ? {
                          '--cursor-open': `url(${macCursorOpen}) 8 8, grab`,
                          '--cursor-closed': `url(${macCursorClosed}) 8 8, grabbing`,
                        }
                      : {}),
                  } as any}
                >
                  {isLastMove && !isRed && (
                    <div className="absolute inset-0 bg-yellow-400/50 pointer-events-none z-0" />
                  )}
                  {isLegal && (
                    <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
                      <div className="h-5 w-5 rounded-full bg-black/60" />
                    </div>
                  )}
                  {piece ? (
                    <img
                      src={pieceSprite(piece) || ''}
                      alt=""
                      className={`relative z-10 w-full h-full object-contain ${
                        pieceThemeKey === 'freestyle' ? 'p-1' : 'p-1'
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
                <marker id="arrowhead-practice-current" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
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
                <marker id={`arrowhead-practice-${idx}`} markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
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
    </div>
  );

  const content = (
    <>
      <div className="flex flex-col gap-4 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="text-xl font-bold flex items-center gap-2">
              <span className="sr-only">Practice</span>
            </div>
          </div>
        </div>

        {isAnalysisMode ? (
          <div
            className={`grid grid-cols-1 lg:grid-cols-[minmax(780px,1fr)_420px] justify-center gap-6 items-stretch ${
              embedded ? "pp-analysis-embedded" : ""
            }`}
          >
            <div className="flex justify-center w-full flex-shrink-0">
              <div className="pp-analysis-row w-full">
                <div className="pp-board-stack flex flex-col items-center w-full">
                  {boardElement}
                  {embedded && (
                    <div className="pp-moves-nav-mobile w-full px-2 mt-4">
                      <div className="grid grid-cols-[40px_1fr_1fr] gap-2">
                        <button
                          type="button"
                          className="h-10 w-10 rounded-lg bg-white/10 border border-white/10 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                          onClick={() => goToMoveIndex(0)}
                          disabled={!canStepBack}
                          aria-label="Back to start"
                        >
                          <ChevronsLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="h-10 rounded-lg bg-white/10 border border-white/10 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                          onClick={() => goToMoveIndex(currentMoveIdx - 1)}
                          disabled={!canStepBack}
                          aria-label="Previous move"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="h-10 rounded-lg bg-white text-slate-900 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                          onClick={() => goToMoveIndex(currentMoveIdx + 1)}
                          disabled={!canStepForward}
                          aria-label="Next move"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {evalBarOn && embedded && (
                  <div className="pp-eval-mobile flex flex-col items-center flex-shrink-0">
                    <EvaluationBar eval={evalState.eval} isThinking={evalState.isThinking} height={isMobile ? mobileEvalHeight : 520} />
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col lg:flex-row gap-4 items-center lg:items-start lg:self-center">
              {evalBarOn && (
                <div className="pp-eval-desktop flex flex-col items-center flex-shrink-0">
                  <EvaluationBar eval={evalState.eval} isThinking={evalState.isThinking} height={520} />
                </div>
              )}
              <div className="w-full max-w-2xl lg:w-full flex flex-col gap-4 lg:h-[780px] lg:max-h-[780px]">
                <div
                  className={`rounded-2xl bg-black border border-white/10 p-4 shadow-xl space-y-4 ${
                    hideAnalysisTools ? "hidden" : ""
                  }`}
                  aria-hidden={hideAnalysisTools || undefined}
                >
                  <div className="space-y-1">
                    <div className="text-lg font-semibold">Analysis</div>
                    <p className="text-sm text-white/70 leading-relaxed">
                      Select one of the options below or interact with the board.
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 divide-y divide-white/10 overflow-hidden">
                    {boardEditorOpen ? (
                      <div className="p-3 space-y-4">
                        <div className="flex items-center justify-between">
                          <button
                            className="p-2 rounded-lg hover:bg-white/10 border border-white/10"
                            onClick={cancelBoardEditor}
                            aria-label="Cancel board edit"
                          >
                            <ArrowLeft className="h-4 w-4" />
                          </button>
                          <button
                            className="p-2 rounded-lg hover:bg-emerald-500/20 border border-emerald-400/40 text-emerald-100"
                            onClick={applyBoardEditor}
                            aria-label="Apply position"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="space-y-2">
                          <div className="grid grid-cols-6 gap-2 rounded-lg bg-white/5 p-2 border border-white/10">
                            {[
                              { color: "b", type: "r", label: "R" },
                              { color: "b", type: "n", label: "N" },
                              { color: "b", type: "b", label: "B" },
                              { color: "b", type: "q", label: "Q" },
                              { color: "b", type: "k", label: "K" },
                              { color: "b", type: "p", label: "P" },
                            ].map((piece) => (
                              <button
                                key={`${piece.color}-${piece.type}`}
                                draggable
                                onDragStart={(e) => {
                                  const payload = { color: piece.color as Color, type: piece.type as PieceSymbol };
                                  setEditorSelectedPiece(payload);
                                  editorDragFromRef.current = null;
                                  editorDropHandledRef.current = false;
                                  e.dataTransfer?.setData("application/x-chess-piece", JSON.stringify(payload));
                                }}
                                className={`h-12 rounded-md border text-sm font-semibold ${
                                  editorSelectedPiece?.color === piece.color && editorSelectedPiece?.type === piece.type
                                    ? "border-emerald-400 bg-emerald-500/20"
                                    : "border-white/10 bg-black/40"
                                }`}
                                onClick={() =>
                                  setEditorSelectedPiece({ color: piece.color as Color, type: piece.type as PieceSymbol })
                                }
                              >
                                <img
                                  src={editorPieceImages[`${piece.color}${piece.type}` as `${Color}${PieceSymbol}`]}
                                  alt={`${piece.color === "w" ? "White" : "Black"} ${piece.type}`}
                                  className="h-full w-full object-contain"
                                />
                              </button>
                            ))}
                          </div>
                          <div className="grid grid-cols-6 gap-2 rounded-lg bg-white/5 p-2 border border-white/10">
                            {[
                              { color: "w", type: "r", label: "R" },
                              { color: "w", type: "n", label: "N" },
                              { color: "w", type: "b", label: "B" },
                              { color: "w", type: "q", label: "Q" },
                              { color: "w", type: "k", label: "K" },
                              { color: "w", type: "p", label: "P" },
                            ].map((piece) => (
                              <button
                                key={`${piece.color}-${piece.type}`}
                                draggable
                                onDragStart={(e) => {
                                  const payload = { color: piece.color as Color, type: piece.type as PieceSymbol };
                                  setEditorSelectedPiece(payload);
                                  editorDragFromRef.current = null;
                                  editorDropHandledRef.current = false;
                                  e.dataTransfer?.setData("application/x-chess-piece", JSON.stringify(payload));
                                }}
                                className={`h-12 rounded-md border text-sm font-semibold ${
                                  editorSelectedPiece?.color === piece.color && editorSelectedPiece?.type === piece.type
                                    ? "border-emerald-400 bg-emerald-500/20"
                                    : "border-white/10 bg-black/40"
                                }`}
                                onClick={() =>
                                  setEditorSelectedPiece({ color: piece.color as Color, type: piece.type as PieceSymbol })
                                }
                              >
                                <img
                                  src={editorPieceImages[`${piece.color}${piece.type}` as `${Color}${PieceSymbol}`]}
                                  alt={`${piece.color === "w" ? "White" : "Black"} ${piece.type}`}
                                  className="h-full w-full object-contain"
                                />
                              </button>
                            ))}
                          </div>
                          <div
                            className="mt-2 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70"
                            onDragOver={(e) => {
                              if (boardEditorOpen) e.preventDefault();
                            }}
                            onDrop={(e) => {
                              if (!boardEditorOpen) return;
                              e.preventDefault();
                              editorDropHandledRef.current = true;
                              if (editorDragFromRef.current) {
                                applyEditorChange({
                                  target: editorDragFromRef.current,
                                  piece: null,
                                  source: editorDragFromRef.current,
                                });
                              }
                              editorDragFromRef.current = null;
                            }}
                          >
                            Drag here to delete
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" className="w-full gap-2" onClick={clearBoardEditor}>
                            <Trash2 className="h-4 w-4" />
                            Clear
                          </Button>
                          <Button variant="outline" className="w-full" onClick={resetBoardEditor}>
                            Reset
                          </Button>
                        </div>
                        <div className="border-t border-white/10 pt-3 space-y-2">
                          <div className="text-xs text-white/60">Side to move:</div>
                          <div className="flex gap-2">
                            <button
                              className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                                editorSideToMove === "w"
                                  ? "border-emerald-400 bg-emerald-500/20 text-white"
                                  : "border-white/10 bg-white/5 text-white/70"
                              }`}
                              onClick={() => {
                                setEditorSideToMove("w");
                                updateEditorFenWithSide(fen, "w");
                              }}
                            >
                              White
                            </button>
                            <button
                              className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                                editorSideToMove === "b"
                                  ? "border-emerald-400 bg-emerald-500/20 text-white"
                                  : "border-white/10 bg-white/5 text-white/70"
                              }`}
                              onClick={() => {
                                setEditorSideToMove("b");
                                updateEditorFenWithSide(fen, "b");
                              }}
                            >
                              Black
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : makeMovesOpen ? (
                      <div className="p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button
                              className="p-2 rounded-lg hover:bg-white/10 border border-white/10"
                              onClick={() => setMakeMovesOpen(false)}
                              aria-label="Back to options"
                            >
                              <ArrowLeft className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEvalBarEnabled((v) => !v)}
                              className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${
                                evalBarOn ? "bg-emerald-500" : "bg-white/30"
                              }`}
                              aria-label="Toggle evaluation bar"
                              type="button"
                            >
                              <span
                                className={`h-5 w-5 rounded-full bg-black transform transition-transform ${
                                  evalBarOn ? "translate-x-4" : "translate-x-1"
                                }`}
                              />
                            </button>
                            <div>
                              <div className="font-semibold text-sm">Evaluate</div>
                              <div className="text-xs text-white/60">SF 17.1 Lite</div>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {recommendedLines.map((line, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-2 py-2 text-xs text-white/80"
                            >
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-white/10 border border-white/15 text-white/70 text-[11px]">
                                {idx + 1}
                              </span>
                              <span className="inline-flex items-center px-2 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold text-emerald-200">
                                {line.score}
                              </span>
                              <span className="whitespace-pre-wrap break-words text-[12px]">{line.line}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          className="w-full flex items-center justify-between px-3 py-3 text-sm font-semibold text-white hover:bg-white/5"
                          onClick={() => setMakeMovesOpen(true)}
                        >
                          <span>Make Moves</span>
                          <span className="text-white/50">{">"}</span>
                        </button>
                        <button
                          className="w-full flex items-center justify-between px-3 py-3 text-sm font-semibold text-white hover:bg-white/5"
                          onClick={() => {
                            setMakeMovesOpen(false);
                            openBoardEditor();
                          }}
                        >
                          <span>Board Editor</span>
                          <span className="text-white/50">{">"}</span>
                        </button>
                        <div>
                          <button
                            className="w-full flex items-center justify-between px-3 py-3 text-sm font-semibold text-white hover:bg-white/5"
                            onClick={() => setImportPanelOpen((v) => !v)}
                          >
                            <span>Import Your Game</span>
                            <span className="text-white/50">{importPanelOpen ? "v" : ">"}</span>
                          </button>
                          {importPanelOpen && (
                            <div className="px-3 pb-3 space-y-3">
                              <textarea
                                placeholder="Paste or enter your game..."
                                className="w-full rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                                rows={5}
                                value={importText}
                                onChange={(e) => setImportText(e.target.value)}
                              />
                              <div className="text-xs text-white/70 space-y-1">
                                <div>- PGN text format</div>
                              </div>
                              <Button className="w-full" variant="outline" onClick={handleImportGame}>
                                Import Game
                              </Button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="rounded-2xl bg-black border border-white/10 text-white shadow-xl flex flex-col flex-1 min-h-0">
                    <div className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-col gap-1">
                          <div className="font-semibold text-lg">Moves</div>
                          {activeLine.type === "variation" && (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-xs text-white/70 hover:text-white"
                              onClick={() => {
                                setActiveLine({ type: "main" });
                                const target = moveList.length;
                                goToMoveIndex(target, { force: true, movesOverride: moveList });
                              }}
                            >
                              <ArrowLeft className="h-3 w-3" />
                              Back to main line
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex rounded-full bg-white/10 p-1">
                            <button
                              className={`px-3 py-1 rounded-full text-sm ${
                                orientation === "w" ? "bg-white text-slate-900 font-semibold" : "text-white/80"
                              }`}
                              onClick={() => {
                                setOrientation("w");
                                setSelected(null);
                                setDragFrom(null);
                              }}
                            >
                              W
                            </button>
                            <button
                              className={`px-3 py-1 rounded-full text-sm ${
                                orientation === "b" ? "bg-white text-slate-900 font-semibold" : "text-white/80"
                              }`}
                              onClick={() => {
                                setOrientation("b");
                                setSelected(null);
                                setDragFrom(null);
                              }}
                            >
                              B
                            </button>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="bg-white/5 hover:bg-white/10"
                            onClick={handleDownloadPgn}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            PGN
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-h-0 overflow-auto px-4 pb-4">
                      {moveRows.length === 0 ? (
                        <div className="text-white/50 text-sm">No moves yet. Start playing.</div>
                      ) : (
                        <>
                          {moveRows.map((row) => {
                            const whiteActive = row.white?.idx === activeMoveGlobalIdx;
                            const blackActive = row.black?.idx === activeMoveGlobalIdx;
                            return (
                              <div
                                key={row.num}
                                className="grid grid-cols-[32px_1fr_1fr] items-center gap-2 sm:gap-3 text-xs sm:text-sm py-1"
                              >
                                <div className="text-white/50">{row.num}.</div>
                                <button
                                  className={`text-left text-white rounded-md px-2 py-1 ${
                                    whiteActive ? "bg-white/10" : ""
                                  } ${row.white ? "hover:text-pink-300" : "text-white/50"}`}
                                  disabled={!row.white}
                                  onClick={() => row.white && goToMoveIndex(row.white.idx + 1)}
                                >
                                  {row.white?.san || "-"}
                                </button>
                                <button
                                  className={`text-left text-white rounded-md px-2 py-1 ${
                                    blackActive ? "bg-white/10" : ""
                                  } ${row.black ? "hover:text-pink-300" : "text-white/50"}`}
                                  disabled={!row.black}
                                  onClick={() => row.black && goToMoveIndex(row.black.idx + 1)}
                                >
                                  {row.black?.san || ""}
                                </button>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                    {/* variation prompting UI removed; variations are auto-selected when stepping into branches */}
                    <div className="pp-moves-nav px-4 pb-4">
                      <div className="grid grid-cols-[40px_1fr_1fr] gap-2">
                        <button
                          type="button"
                          className="h-10 w-10 rounded-lg bg-white/10 border border-white/10 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                          onClick={() => goToMoveIndex(0)}
                          disabled={!canStepBack}
                          aria-label="Back to start"
                        >
                          <ChevronsLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="h-10 rounded-lg bg-white/10 border border-white/10 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                          onClick={() => goToMoveIndex(currentMoveIdx - 1)}
                          disabled={!canStepBack}
                          aria-label="Previous move"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="h-10 rounded-lg bg-white text-slate-900 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                          onClick={() => goToMoveIndex(currentMoveIdx + 1)}
                          disabled={!canStepForward}
                          aria-label="Next move"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(360px,1fr)_320px] gap-4 items-start">
            <div className="relative">{boardElement}</div>

            <div className="flex flex-col gap-4">
              <div className="rounded-2xl bg-black border border-white/10 text-white p-4 shadow-xl space-y-3">
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
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-sm text-white/80 min-h-[64px]">
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
                  <Button variant="outline" className="w-full gap-2" onClick={() => setBotModalOpen(true)}>
                    <Play className="h-4 w-4 text-white" />
                    Choose Bot
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setShowSetup(true)}>
                    New Game
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl bg-black border border-white/10 p-4 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">Moves</div>
                  <Button variant="ghost" size="sm" onClick={handleDownloadPgn} className="gap-2">
                    <Download className="h-4 w-4" />
                    PGN
                  </Button>
                </div>
                <div className="rounded-xl border border-white/10 bg-black p-3 max-h-60 overflow-y-auto text-sm text-white/80">
                  {moveRows.length === 0 ? (
                    <div className="text-white/60 text-sm">No moves yet.</div>
                  ) : (
                    <div className="space-y-1">
                      {moveRows.map((row) => (
                        <div key={row.num} className="flex gap-2">
                          <span className="text-white/60 w-8 shrink-0">{row.num}.</span>
                          <span className="w-20">{row.white?.san || ""}</span>
                          <span className="w-20">{row.black?.san || ""}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {!isAnalysisMode && botModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="pp-modal w-full max-w-md rounded-2xl bg-slate-900 text-white border border-white/10 shadow-2xl">
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

      {!isAnalysisMode && showSetup && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="pp-modal w-full max-w-md rounded-2xl bg-slate-900 text-white border border-white/10 shadow-2xl">
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
          <div className="pp-modal w-full max-w-sm rounded-2xl bg-slate-900 text-white border border-white/10 shadow-2xl">
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
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      {!isAnalysisMode && xpToast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-400/50 bg-emerald-500/20 px-4 py-3 text-white shadow-xl backdrop-blur">
            <div className="flex-1">
              <div className="text-sm font-semibold">XP Earned</div>
              <div className="text-sm text-emerald-100">+{xpToast.amount} XP added</div>
            </div>
            <button
              aria-label="Close XP notification"
              className="text-white/70 hover:text-white"
              onClick={() => {
                setXpToast(null);
                if (xpToastTimeout.current) {
                  clearTimeout(xpToastTimeout.current);
                }
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );

  if (embedded) {
    return content;
  }

  return <AppShell backgroundStyle={pageBackground}>{content}</AppShell>;
}

export default function Practice() {
  return <PracticeBoard />;
}





