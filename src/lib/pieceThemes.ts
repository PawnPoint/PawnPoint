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

import freestyleWhitePawn from "../assets/Freestyle White Pawn.png";
import freestyleWhiteRook from "../assets/Freestyle White Rook.png";
import freestyleWhiteKnight from "../assets/Freestyle White Knight.png";
import freestyleWhiteBishop from "../assets/Freestyle White Bishop.png";
import freestyleWhiteQueen from "../assets/Freestyle White Queen.png";
import freestyleWhiteKing from "../assets/Freestyle White King.png";
import freestyleBlackPawn from "../assets/Freestyle Black Pawn.png";
import freestyleBlackRook from "../assets/Freestyle Black Rook.png";
import freestyleBlackKnight from "../assets/Freestyle Black Knight.png";
import freestyleBlackBishop from "../assets/Freestyle Black Bishop.png";
import freestyleBlackQueen from "../assets/Freestyle Black Queen.png";
import freestyleBlackKing from "../assets/Freestyle Black King.png";
import lichessWhitePawn from "../assets/Lichess White Pawn.svg";
import lichessWhiteRook from "../assets/Lichess White Rook.svg";
import lichessWhiteKnight from "../assets/Lichess White Knight.svg";
import lichessWhiteBishop from "../assets/Lichess White Bishop.svg";
import lichessWhiteQueen from "../assets/Lichess White Queen.svg";
import lichessWhiteKing from "../assets/Lichess White King.svg";
import lichessBlackPawn from "../assets/Lichess Black Pawn.svg";
import lichessBlackRook from "../assets/Lichess Black Rook.svg";
import lichessBlackKnight from "../assets/Lichess Black Knight.svg";
import lichessBlackBishop from "../assets/Lichess Black Bishop.svg";
import lichessBlackQueen from "../assets/Lichess Black Queen.svg";
import lichessBlackKing from "../assets/Lichess Black King.svg";

export type PieceTheme = {
  w: { p: string; r: string; n: string; b: string; q: string; k: string };
  b: { p: string; r: string; n: string; b: string; q: string; k: string };
};

export const PIECE_THEMES: Record<string, PieceTheme> = {
  chesscom: {
    w: { p: whitePawn, r: whiteRook, n: whiteKnight, b: whiteBishop, q: whiteQueen, k: whiteKing },
    b: { p: blackPawn, r: blackRook, n: blackKnight, b: blackBishop, q: blackQueen, k: blackKing },
  },
  freestyle: {
    w: {
      p: freestyleWhitePawn,
      r: freestyleWhiteRook,
      n: freestyleWhiteKnight,
      b: freestyleWhiteBishop,
      q: freestyleWhiteQueen,
      k: freestyleWhiteKing,
    },
    b: {
      p: freestyleBlackPawn,
      r: freestyleBlackRook,
      n: freestyleBlackKnight,
      b: freestyleBlackBishop,
      q: freestyleBlackQueen,
      k: freestyleBlackKing,
    },
  },
  lichess: {
    w: {
      p: lichessWhitePawn,
      r: lichessWhiteRook,
      n: lichessWhiteKnight,
      b: lichessWhiteBishop,
      q: lichessWhiteQueen,
      k: lichessWhiteKing,
    },
    b: {
      p: lichessBlackPawn,
      r: lichessBlackRook,
      n: lichessBlackKnight,
      b: lichessBlackBishop,
      q: lichessBlackQueen,
      k: lichessBlackKing,
    },
  },
};

export const DEFAULT_PIECE_THEME = "chesscom";

export function resolvePieceTheme(theme?: string) {
  const key = theme && PIECE_THEMES[theme] ? theme : DEFAULT_PIECE_THEME;
  return { key, pieces: PIECE_THEMES[key] };
}
