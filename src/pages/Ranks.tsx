import { cloneElement, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "../components/AppShell";
import { useAuth } from "../hooks/useAuth";
import { getGlobalXpLeaderboard, type UserProfile } from "../lib/mockApi";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import goldIcon from "../assets/Gold.png";
import diamondIcon from "../assets/Diamond.png";
import ascendantIcon from "../assets/Ascendant.png";
import immortalIcon from "../assets/Immortal.png";
import radiantIcon from "../assets/Radiant.png";

type RankKey = "gold" | "diamond" | "ascendant" | "immortal" | "radiant";

const rankBands: {
  key: RankKey;
  label: string;
  min: number;
  max?: number;
  accent: string;
  logo: JSX.Element;
}[] = [
  {
    key: "gold",
    label: "Gold",
    min: 1,
    max: 50,
    accent: "from-amber-400 to-amber-600",
    logo: <img src={goldIcon} alt="Gold rank" className="h-6 w-6 object-contain" />,
  },
  {
    key: "diamond",
    label: "Diamond",
    min: 51,
    max: 100,
    accent: "from-cyan-300 to-blue-500",
    logo: <img src={diamondIcon} alt="Diamond rank" className="h-6 w-6 object-contain" />,
  },
  {
    key: "ascendant",
    label: "Ascendant",
    min: 101,
    max: 200,
    accent: "from-emerald-300 to-teal-500",
    logo: <img src={immortalIcon} alt="Ascendant rank" className="h-6 w-6 object-contain" />,
  },
  {
    key: "immortal",
    label: "Immortal",
    min: 201,
    max: 400,
    accent: "from-fuchsia-300 to-purple-500",
    logo: <img src={ascendantIcon} alt="Immortal rank" className="h-6 w-6 object-contain" />,
  },
  {
    key: "radiant",
    label: "Radiant",
    min: 401,
    max: undefined,
    accent: "from-indigo-300 to-purple-600",
    logo: <img src={radiantIcon} alt="Radiant rank" className="h-6 w-6 object-contain" />,
  },
];

const levelForUser = (user: UserProfile | null | undefined) =>
  Math.max(1, typeof user?.level === "number" ? user.level : Math.floor((user?.totalXp || 0) / 100) + 1);

const getBandForLevel = (level: number) =>
  rankBands.find((band) => level >= band.min && (band.max === undefined || level <= band.max)) || rankBands[0];

const formatXp = (xp?: number) => {
  if (!xp && xp !== 0) return "—";
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
        users: { id: string; name: string; xp: number; level: number }[];
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
        });
      const position =
        user?.id && users.findIndex((u) => u.id === user.id) >= 0 ? users.findIndex((u) => u.id === user.id) + 1 : null;
      // show top 5 plus the user if not already included
      let list = users.slice(0, 5);
      if (position && position > 5) {
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
  const selectedIcon = useMemo(
    () => cloneElement(selectedBand.logo, { className: "h-32 w-32 sm:h-44 sm:w-44 object-contain" }),
    [selectedBand.logo]
  );
  const selectedPosition = bandData[selectedBand.key].position;

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
    <AppShell>
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
        <div
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            background: "linear-gradient(135deg, #05000f, #0d0620, #140429)",
            backgroundSize: "200% 200%",
            animation: "ranksGradientMove 20s ease-in-out infinite",
          }}
          aria-hidden="true"
        />
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
                <div className={`rounded-full bg-gradient-to-br ${selectedBand.accent} p-[5px] shadow-2xl`}>
                  <div className="flex h-40 w-40 sm:h-52 sm:w-52 items-center justify-center rounded-full bg-black/70">
                    {selectedIcon}
                  </div>
                </div>
                {selectedBand.key === currentBand.key ? (
                  <button
                    className="mt-2 rounded-full bg-white/20 hover:bg-white/30 px-4 py-2 text-sm font-semibold"
                    onClick={scrollToSpot}
                  >
                    View your spot
                  </button>
                ) : null}
                <div className="text-lg font-semibold">{selectedBand.label}</div>
                <div className="text-xs text-white/70">
                  Levels {selectedBand.min} - {selectedBand.max ? selectedBand.max : "500+"}
                </div>
                <div className="text-xs text-purple-100">
                  {selectedBand.key === currentBand.key ? "Your current rank" : "Browse ranks"}
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

          {loading && (
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading ranks...
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
