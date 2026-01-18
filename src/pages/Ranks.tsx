import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "../components/AppShell";
import { useAuth } from "../hooks/useAuth";
import { getGlobalXpLeaderboard, type UserProfile } from "../lib/mockApi";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import goldIcon from "../assets/Gold.png";
import diamondIcon from "../assets/Diamond.png";
import ascendantIcon from "../assets/Ascendant.png";
import immortalIcon from "../assets/Immortal.png";
import radiantIcon from "../assets/Radiant.png";

const pageBackground = {
  backgroundImage: `
    radial-gradient(1200px 600px at 50% -10%, rgba(255, 255, 255, 0.03), transparent 60%),
    linear-gradient(180deg, #0b1220 0%, #0d1628 25%, #0b1220 45%, #0a0f1c 60%, #070a12 75%, #000000 92%)
  `,
  minHeight: "100vh",
  color: "#ffffff",
} as const;

type RankKey = "gold" | "diamond" | "ascendant" | "immortal" | "radiant";

const rankBands: {
  key: RankKey;
  label: string;
  min: number;
  max?: number;
  accent: string;
  icon: string;
}[] = [
  {
    key: "gold",
    label: "Gold",
    min: 1,
    max: 50,
    accent: "from-amber-400 to-amber-600",
    icon: goldIcon,
  },
  {
    key: "diamond",
    label: "Diamond",
    min: 51,
    max: 100,
    accent: "from-cyan-300 to-blue-500",
    icon: diamondIcon,
  },
  {
    key: "ascendant",
    label: "Immortal",
    min: 101,
    max: 200,
    accent: "from-emerald-300 to-teal-500",
    icon: immortalIcon,
  },
  {
    key: "immortal",
    label: "Ascendant",
    min: 201,
    max: 400,
    accent: "from-fuchsia-300 to-purple-500",
    icon: ascendantIcon,
  },
  {
    key: "radiant",
    label: "Radiant",
    min: 401,
    max: undefined,
    accent: "from-indigo-300 to-purple-600",
    icon: radiantIcon,
  },
];

const levelForUser = (user: UserProfile | null | undefined) =>
  Math.max(1, typeof user?.level === "number" ? user.level : Math.floor((user?.totalXp || 0) / 100) + 1);

const getBandForLevel = (level: number) =>
  rankBands.find((band) => level >= band.min && (band.max === undefined || level <= band.max)) || rankBands[0];

const formatXp = (xp?: number) => {
  if (!xp && xp !== 0) return "";
  if (xp >= 1000000) return `${(xp / 1000000).toFixed(1)}M`;
  if (xp >= 1000) return `${(xp / 1000).toFixed(1)}k`;
  return xp.toString();
};

export default function Ranks() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<UserProfile[]>([]);
  const currentLevel = levelForUser(user);
  const currentBand = getBandForLevel(currentLevel);
  const [selectedIndex, setSelectedIndex] = useState(rankBands.findIndex((b) => b.key === currentBand.key));
  const spotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const data = await getGlobalXpLeaderboard(500);
        if (mounted) setEntries(data || []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

const bandData = useMemo(() => {
  const data: Record<
    RankKey,
    {
      users: { id: string; name: string; xp: number; level: number; rank: number }[];
      position: number | null;
    }
  > = {
    gold: { users: [], position: null },
    diamond: { users: [], position: null },
      ascendant: { users: [], position: null },
      immortal: { users: [], position: null },
      radiant: { users: [], position: null },
    };
    const normalized = entries.map((u) => ({
      id: u.id,
      name: u.chessUsername || u.displayName || u.email?.split("@")[0] || "Player",
      xp: u.totalXp || 0,
      level: levelForUser(u),
    }));
    rankBands.forEach((band) => {
      const users = normalized
        .filter((u) => u.level >= band.min && (band.max === undefined || u.level <= band.max))
        .sort((a, b) => {
          const diff = b.xp - a.xp;
          if (diff !== 0) return diff;
          return a.name.localeCompare(b.name);
        })
        .map((u, idx) => ({ ...u, rank: idx + 1 }));
      const position =
        user?.id && users.findIndex((u) => u.id === user.id) >= 0 ? users.findIndex((u) => u.id === user.id) + 1 : null;
      // show top 10 plus the user if not already included
      let list = users.slice(0, 10);
      if (position && position > 10) {
        const me = users.find((u) => u.id === user?.id);
        if (me) {
          list = [...list, { ...me }];
        }
      }
      data[band.key] = { users: list, position };
    });
    return data;
  }, [entries, user?.id]);

  useEffect(() => {
    const idx = rankBands.findIndex((b) => b.key === currentBand.key);
    if (idx >= 0) setSelectedIndex(idx);
  }, [currentBand.key]);

  const selectedBand = rankBands[selectedIndex] || rankBands[0];
  const selectedPosition = bandData[selectedBand.key].position;
  const selectedBandUsers = bandData[selectedBand.key].users;
  const [infoOpen, setInfoOpen] = useState(false);

  const selectedLeadText = (() => {
    if (!user) return null;
    const me = selectedBandUsers.find((u) => u.id === user.id);
    if (!me) return "Earn XP in this rank to place on the board.";
    if (me.rank === 1) {
      const second = selectedBandUsers.find((u) => u.rank === 2);
      if (second) {
        const leadLevels = Math.max(1, me.level - second.level);
        return `You lead #2 ${second.name} by ${leadLevels} level${leadLevels === 1 ? "" : "s"}.`;
      }
      return "You're leading this rank.";
    }
    const ahead = selectedBandUsers.find((u) => u.rank === me.rank - 1);
    if (ahead) {
      const neededLevels = Math.max(1, ahead.level - me.level + 1);
      return `Gain ${neededLevels} level${neededLevels === 1 ? "" : "s"} to pass #${ahead.rank} ${ahead.name}.`;
    }
    return null;
  })();

  const xpToNext = () => {
    const nextBand = rankBands[selectedIndex + 1];
    if (!nextBand) return null;
    const nextLevelStart = nextBand.min;
    const nextXpThreshold = (nextLevelStart - 1) * 100;
    const currentXp = user?.totalXp || 0;
    return Math.max(0, nextXpThreshold - currentXp);
  };

  const [showSpot, setShowSpot] = useState(false);

  useEffect(() => {
    if (showSpot && selectedBand.key !== currentBand.key) {
      setShowSpot(false);
    }
  }, [selectedBand.key, currentBand.key, showSpot]);

  const scrollToSpot = () => {
    setShowSpot(true);
    if (spotRef.current) {
      spotRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <AppShell backgroundStyle={pageBackground}>
      <style>
        {`
          @keyframes ranksGradientMove {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}
      </style>
      <div className="relative min-h-screen text-white">
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 space-y-6">
          <div className="flex flex-col items-center gap-6 min-h-[70vh] justify-center">
            <div className="flex items-center justify-center gap-4">
              <button
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-40"
                onClick={() => setSelectedIndex((idx) => Math.max(0, idx - 1))}
                disabled={selectedIndex === 0}
                aria-label="Previous rank"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex flex-col items-center text-center gap-2">
                <div
                  className={`relative h-[32rem] w-[26rem] sm:h-[36rem] sm:w-[36rem] rounded-[36px] bg-gradient-to-br ${selectedBand.accent} shadow-[0_60px_140px_rgba(0,0,0,0.7)] border border-white/15`}
                >
                  <div className="absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20">
                    <div className="flex items-center gap-2 text-white font-bold text-lg sm:text-xl" style={{ fontFamily: "'Inter', system-ui" }}>
                      <span>{selectedBand.label}</span>
                      <button
                        aria-label="Rank info"
                        className="h-6 w-6 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 text-xs font-semibold"
                        onClick={() => setInfoOpen(true)}
                      >
                        ?
                      </button>
                    </div>
                    <img
                      src={selectedBand.icon}
                      alt={`${selectedBand.label} rank`}
                      className="object-contain h-[10rem] w-[10rem] drop-shadow-2xl"
                    />
                  </div>
                  <div className="absolute inset-0 p-6 pt-48 sm:pt-52 flex flex-col gap-3 z-10">
                    {selectedLeadText && (
                      <div className="text-center text-white" style={{ fontFamily: "'Inter', system-ui" }}>
                        <div className="text-lg sm:text-xl font-semibold">{selectedLeadText}</div>
                      </div>
                    )}
                    <div className="rounded-2xl bg-black/30 border border-white/10 backdrop-blur-sm p-4 flex-1 overflow-y-auto space-y-2">
                      <div className="text-sm font-semibold text-white/80">Top players in this rank</div>
                      <div className="space-y-1">
                        {bandData[selectedBand.key].users.slice(0, 10).map((u) => (
                          <div
                            key={u.id}
                            className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm text-white"
                          >
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-lg bg-white/10 flex items-center justify-center text-xs font-semibold">
                                #{u.rank}
                              </div>
                              <div className="font-semibold">{u.name}</div>
                            </div>
                            <div className="text-white/70">{formatXp(u.xp)} XP</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <button
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-40"
                onClick={() => setSelectedIndex((idx) => Math.min(rankBands.length - 1, idx + 1))}
                disabled={selectedIndex === rankBands.length - 1}
                aria-label="Next rank"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {showSpot && (
            <div
              ref={spotRef}
              className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0b0719] via-[#0f0a25] to-[#130628] p-5 shadow-xl"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-xs uppercase tracking-[0.12em] text-purple-300/80">Your Spot</div>
                  <div className="text-xl font-semibold">{currentBand.label}</div>
                  <div className="text-sm text-white/60">
                    Levels {currentBand.min} - {currentBand.max ? currentBand.max : "500+"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-white/70">Position</div>
                  <div className="text-xl font-bold">{selectedPosition ? `#${selectedPosition}` : "—"}</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <div className="text-xs text-white/60">XP</div>
                  <div className="text-lg font-semibold">{formatXp(user?.totalXp || 0)} XP</div>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <div className="text-xs text-white/60">To next rank</div>
                  <div className="text-lg font-semibold">
                    {xpToNext() === null ? "Max rank" : `${formatXp(xpToNext() || 0)} XP`}
                  </div>
                </div>
              </div>
              <div className="mt-4 text-sm text-white/70">
                This view shows only your standing and progress toward the next rank across all players.
              </div>
            </div>
          )}

        </div>
        {infoOpen && <RankInfoModal band={selectedBand} onClose={() => setInfoOpen(false)} />}
      </div>
    </AppShell>
  );
}

function RankInfoModal({
  band,
  onClose,
}: {
  band: (typeof rankBands)[number];
  onClose: () => void;
}) {
  const levelLabel = `Levels ${band.min}–${band.max ? band.max : "500+"}`;
  const rankName = band.label;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="pp-modal w-full max-w-md rounded-2xl bg-slate-900 text-white border border-white/10 shadow-2xl">
        <div className="px-5 py-4 border-b border-white/10 space-y-1">
          <div className="text-lg font-semibold">{rankName} Rank</div>
          <div className="text-xs text-white/60">{levelLabel}</div>
        </div>
        <div className="p-5 space-y-4 text-sm text-white/80">
          <div>
            <div className="text-sm font-semibold text-white">About this Rank</div>
            <p className="mt-1">A premium tier for players in {levelLabel}, where competition tightens and progress signals real momentum.</p>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">How to Advance</div>
            <p className="mt-1">Earn XP from practice, matches, and achievements, outpace peers in this band, and push toward the next level.</p>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Objective</div>
            <p className="mt-1">Outperform your peers. Accumulate XP. Advance to the next tier.</p>
          </div>
        </div>
        <div className="flex justify-end px-5 pb-4">
          <button
            className="rounded-full bg-white/15 hover:bg-white/25 px-4 py-2 text-sm font-semibold"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}



