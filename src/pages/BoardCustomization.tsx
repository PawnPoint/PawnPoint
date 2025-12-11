import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronDown } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/ui/Button";
import { useLocation } from "wouter";
import { useAuth } from "../hooks/useAuth";
import { updateBoardTheme } from "../lib/mockApi";
import { BOARD_THEMES, resolveBoardTheme } from "../lib/boardThemes";
import { PIECE_THEMES, resolvePieceTheme } from "../lib/pieceThemes";

type Option = { label: string; value: string };

const boardOptions: Option[] = Object.keys(BOARD_THEMES).map((key) => ({
  label: key.charAt(0).toUpperCase() + key.slice(1),
  value: key,
}));
const pieceOptions: Option[] = Object.keys(PIECE_THEMES).map((key) => ({
  label: key.charAt(0).toUpperCase() + key.slice(1),
  value: key,
}));

const sampleFen =
  "k5rr/5R2/8/2p1P1p1/1p2Q3/1P6/K2p4/3b4 w - - 0 1"; // matches the mock layout roughly

const highlightPreviewColor = "#f3cd4b";

export default function BoardCustomization() {
  const [, navigate] = useLocation();
  const { user, setUser } = useAuth();
  const [boardTheme, setBoardTheme] = useState(() => resolveBoardTheme(user?.boardTheme).key);
  const [pieceTheme, setPieceTheme] = useState(() => resolvePieceTheme(user?.pieceTheme).key);

  useEffect(() => {
    setBoardTheme(resolveBoardTheme(user?.boardTheme).key);
  }, [user?.boardTheme]);
  useEffect(() => {
    setPieceTheme(resolvePieceTheme(user?.pieceTheme).key);
  }, [user?.pieceTheme]);

  const squares = useMemo(() => buildBoard(sampleFen), []);
  const highlightColor = highlightPreviewColor;
  const colors = resolveBoardTheme(boardTheme).colors;
  const activePieces = resolvePieceTheme(pieceTheme).pieces;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 pb-12">
        <button className="flex items-center gap-2 text-white/80 mb-4" onClick={() => navigate("/settings")}>
          <ChevronLeft className="h-5 w-5" />
          Back
        </button>
        <div className="text-2xl font-bold text-white mb-4">Board customization</div>

        <div className="rounded-3xl bg-slate-900 border border-white/10 p-5 shadow-2xl">
          <div className="space-y-6">
            <div className="rounded-2xl bg-slate-800/70 border border-white/10 p-4">
              <div className="text-white mb-3 font-semibold">Active Piece: White Queen</div>
              <div className="flex flex-col gap-3 items-center">
                <div className="relative inline-block">
                  <div className="grid grid-cols-8 grid-rows-8 w-[360px] aspect-square overflow-hidden rounded-xl border border-white/10">
                    {squares.map((sq) => (
                      <div
                        key={sq.name}
                        className="relative flex items-center justify-center text-xs font-semibold"
                        style={{ background: sq.isLight ? colors.light : colors.dark, color: "#111" }}
                      >
                        {sq.isHighlight && (
                          <div
                            className="absolute inset-0"
                            style={{ backgroundColor: highlightColor, opacity: 0.8 }}
                          />
                        )}
                        {sq.piece && (
                          <img
                            src={activePieces[sq.piece[0] as "w" | "b"][sq.piece[1] as any]}
                            alt=""
                            className={`relative z-10 h-[36px] w-[36px] object-contain ${
                              pieceTheme === "freestyle" ? "p-1" : ""
                            } ${
                              pieceTheme === "freestyle" && sq.piece === "p" ? "scale-110" : ""
                            }`}
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
              <Select
                label="Board"
                value={boardTheme}
                onChange={setBoardTheme}
                options={boardOptions}
              />
              <Select
                label="Pieces"
                value={pieceTheme}
                onChange={setPieceTheme}
                options={pieceOptions}
              />
            </div>

            <div className="flex justify-end">
              <Button
                className="px-6"
                onClick={async () => {
                  const resolved = resolveBoardTheme(boardTheme).key;
                  const resolvedPieces = resolvePieceTheme(pieceTheme).key;
                  const updated = await updateBoardTheme(resolved, resolvedPieces);
                  if (updated) setUser(updated);
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

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
  // simple highlights to mimic mock
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
