import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Minus,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { AppShell } from "../components/AppShell";
import { useAuth } from "../hooks/useAuth";
import { getGlobalXpLeaderboard, type UserProfile } from "../lib/mockApi";
import avatarFallback from "../assets/Easter Default.png";

const pageBackground = {
  backgroundColor: "#0a0e1a",
  minHeight: "100vh",
  color: "#ffffff",
} as const;

const wholeNumber = new Intl.NumberFormat("en-US");

const rankBands = [
  {
    key: "gold",
    label: "Gold",
    min: 1,
    max: 50,
    accent: "from-amber-400/25 to-amber-700/10",
    border: "border-amber-400/20",
    text: "text-amber-200",
  },
  {
    key: "diamond",
    label: "Diamond",
    min: 51,
    max: 100,
    accent: "from-cyan-300/20 to-blue-500/10",
    border: "border-cyan-400/20",
    text: "text-cyan-200",
  },
  {
    key: "ascendant",
    label: "Ascendant",
    min: 101,
    max: 200,
    accent: "from-emerald-300/20 to-teal-500/10",
    border: "border-emerald-400/20",
    text: "text-emerald-200",
  },
  {
    key: "immortal",
    label: "Immortal",
    min: 201,
    max: 400,
    accent: "from-fuchsia-300/20 to-purple-500/10",
    border: "border-fuchsia-400/20",
    text: "text-fuchsia-200",
  },
  {
    key: "radiant",
    label: "Radiant",
    min: 401,
    max: undefined,
    accent: "from-indigo-300/20 to-purple-600/10",
    border: "border-indigo-400/20",
    text: "text-indigo-200",
  },
] as const;

const regionPool = [
  "Europe",
  "North America",
  "Europe",
  "Asia",
  "Asia",
  "Asia",
  "Europe",
  "South America",
  "Africa",
  "North America",
] as const;

type RankBand = (typeof rankBands)[number];
type RankBandKey = RankBand["key"];

type RankedPlayer = {
  id: string;
  name: string;
  avatarUrl?: string;
  xp: number;
  level: number;
  streak: number;
  region: string;
  trend: number;
  weeklyGain: number;
  isCurrentUser: boolean;
  globalRank: number;
  bandRank: number;
  rankBand: RankBandKey;
  rankBandLabel: string;
};

function hashString(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function resolveRankBand(level: number): RankBand {
  return rankBands.find((band) => level >= band.min && (band.max === undefined || level <= band.max)) || rankBands[0];
}

function formatRankBandRange(band: RankBand) {
  return band.max === undefined ? `Levels ${band.min}+` : `Levels ${band.min} - ${band.max}`;
}

function buildRankedPlayers(entries: UserProfile[], currentUserId?: string | null): RankedPlayer[] {
  const enriched = entries
    .map((entry, index) => {
      const name = entry.chessUsername || entry.displayName || entry.email?.split("@")[0] || "Player";
      const seed = hashString(`${entry.id}:${name}:${index}`);
      const xp = Math.max(0, Math.round(entry.totalXp || 0));
      const level = Math.max(1, Math.round(entry.level || Math.floor(xp / 100) + 1));
      const streak = Math.max(0, Math.round(entry.streak || 0));
      const weeklyGain = Math.max(90, Math.round((entry.dailyXp || 0) * 3.5 + streak * 18 + (seed % 280)));
      const trendBase = Math.round((entry.dailyXp || 0) / 10 + streak * 1.5 + ((seed % 9) - 4));
      const trend = Math.max(-18, Math.min(52, trendBase));
      const rankBand = resolveRankBand(level);

      return {
        id: entry.id,
        name,
        avatarUrl: entry.avatarUrl,
        xp,
        level,
        streak,
        region: regionPool[seed % regionPool.length],
        trend,
        weeklyGain,
        isCurrentUser: entry.id === currentUserId,
        globalRank: 0,
        bandRank: 0,
        rankBand: rankBand.key,
        rankBandLabel: rankBand.label,
      };
    })
    .sort((left, right) => {
      const levelDiff = right.level - left.level;
      if (levelDiff !== 0) return levelDiff;
      const xpDiff = right.xp - left.xp;
      if (xpDiff !== 0) return xpDiff;
      return left.name.localeCompare(right.name);
    });

  const bandCounts = new Map<RankBandKey, number>();

  return enriched.map((player, index) => {
    const nextBandRank = (bandCounts.get(player.rankBand) || 0) + 1;
    bandCounts.set(player.rankBand, nextBandRank);
    return {
      ...player,
      globalRank: index + 1,
      bandRank: nextBandRank,
    };
  });
}

function PlayerAvatar({
  player,
  sizeClass,
}: {
  player: Pick<RankedPlayer, "avatarUrl" | "name">;
  sizeClass: string;
}) {
  return (
    <img
      src={player.avatarUrl || avatarFallback}
      alt={player.name}
      className={`${sizeClass} rounded-full border border-white/10 bg-white/5 object-cover`}
      onError={(event) => {
        event.currentTarget.src = avatarFallback;
      }}
    />
  );
}

function PodiumCard({
  player,
  featured = false,
}: {
  player?: RankedPlayer;
  featured?: boolean;
}) {
  if (!player) {
    return <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6" />;
  }

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.03] p-6 backdrop-blur-sm transition-all duration-300 ${
        featured ? "shadow-2xl shadow-blue-500/12" : ""
      }`}
    >
      {featured && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-blue-500/10 to-transparent" />
      )}

      <div className="relative flex flex-col items-center gap-4 text-center">
        <div className="relative">
          <div
            className={`absolute -inset-1 rounded-full blur-xl ${
              featured ? "bg-gradient-to-r from-blue-500/25 to-cyan-400/20 opacity-100" : "opacity-0"
            }`}
          />
          <div className="relative">
            <PlayerAvatar player={player} sizeClass={featured ? "h-24 w-24" : "h-20 w-20"} />
            <div
              className={`absolute -bottom-1 -right-1 flex items-center justify-center rounded-full border-2 border-[#0a0e1a] ${
                featured
                  ? "h-8 w-8 bg-gradient-to-br from-blue-500 to-blue-600"
                  : "h-7 w-7 bg-white/10"
              }`}
            >
              <span className="text-xs font-semibold text-white">#{player.bandRank}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className={featured ? "text-lg font-semibold text-white" : "text-base font-semibold text-white"}>
            {player.name}
          </h3>
          <p className="mt-1 text-xs text-white/45">
            {player.rankBandLabel} · Overall #{wholeNumber.format(player.globalRank)}
          </p>
          {player.isCurrentUser && (
            <div className="mt-2 inline-flex rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-200">
              You
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-sm text-white/60">
          <div>
            <span className="text-white/45">Level </span>
            <span className="font-medium text-white">Lv. {wholeNumber.format(player.level)}</span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          <div>
            <span className="text-white/45">XP </span>
            <span className="font-medium text-white">{wholeNumber.format(player.xp)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrendIcon({ trend }: { trend: number }) {
  if (trend > 0) return <TrendingUp className="h-4 w-4 text-emerald-400" />;
  if (trend < 0) return <TrendingDown className="h-4 w-4 text-rose-400" />;
  return <Minus className="h-4 w-4 text-white/30" />;
}

export default function Ranks() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<UserProfile[]>([]);
  const [selectedBand, setSelectedBand] = useState<RankBandKey | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const nextEntries = await getGlobalXpLeaderboard(500);
        if (mounted) {
          setEntries(nextEntries || []);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const allPlayers = useMemo(() => buildRankedPlayers(entries, user?.id), [entries, user?.id]);

  const matchedPlayers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return allPlayers.filter((player) => player.name.toLowerCase().includes(term));
  }, [allPlayers, searchTerm]);

  const defaultBandKey =
    allPlayers.find((player) => player.isCurrentUser)?.rankBand ||
    rankBands.find((band) => allPlayers.some((player) => player.rankBand === band.key))?.key ||
    rankBands[0].key;

  const firstMatchedBand = matchedPlayers[0]?.rankBand;

  useEffect(() => {
    if (!allPlayers.length) return;
    if (firstMatchedBand && firstMatchedBand !== selectedBand) {
      setSelectedBand(firstMatchedBand);
      return;
    }
    if (!selectedBand) {
      setSelectedBand(defaultBandKey);
    }
  }, [allPlayers.length, defaultBandKey, firstMatchedBand, selectedBand]);

  const activeBandKey = selectedBand || defaultBandKey;
  const activeBand = rankBands.find((band) => band.key === activeBandKey) || rankBands[0];
  const activeBandPlayers = allPlayers.filter((player) => player.rankBand === activeBand.key);
  const highlightedPlayerIds = new Set(
    matchedPlayers.filter((player) => player.rankBand === activeBand.key).map((player) => player.id),
  );
  const topThree = activeBandPlayers.slice(0, 3);
  const podiumLayout = [topThree[1], topThree[0], topThree[2]];

  const currentPlayer = allPlayers.find((player) => player.isCurrentUser) || null;

  return (
    <AppShell backgroundStyle={pageBackground}>
      <div className="min-h-screen bg-[#0a0e1a] text-white">
        <div className="mx-auto max-w-[1400px] px-6 py-8">
          <div className="mb-8">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-4xl font-semibold tracking-[-0.04em] text-white">Global Rankings</h1>
                <p className="mt-2 text-sm text-white/50">
                  Click a rank to open that leaderboard. Only one rank board is shown at a time.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {rankBands.map((band) => {
                  const count = allPlayers.filter((player) => player.rankBand === band.key).length;
                  const active = band.key === activeBand.key;
                  return (
                    <button
                      key={band.key}
                      type="button"
                      onClick={() => setSelectedBand(band.key)}
                      className={`rounded-lg border px-4 py-2 text-sm transition-all duration-200 ${
                        active
                          ? `${band.border} bg-gradient-to-r ${band.accent} ${band.text}`
                          : "border-white/10 bg-white/[0.04] text-white/65 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {band.label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search players..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/[0.05] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 transition-colors focus:border-white/20 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
            <div className="space-y-6">
              {loading ? (
                <div className="flex min-h-[340px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-300" />
                </div>
              ) : (
                <>
                  <section className={`rounded-2xl border bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 backdrop-blur-sm ${activeBand.border}`}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className={`inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${activeBand.text}`}>
                          {activeBand.label}
                        </div>
                        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
                          {activeBand.label} leaderboard
                        </h2>
                        <p className="mt-1 text-sm text-white/60">
                          {formatRankBandRange(activeBand)} | {activeBandPlayers.length} player{activeBandPlayers.length === 1 ? "" : "s"} shown
                        </p>
                      </div>

                      {searchTerm.trim() ? (
                        matchedPlayers.length ? (
                          <div className="rounded-xl border border-blue-400/16 bg-blue-500/10 px-4 py-3 text-sm text-white/80">
                            {matchedPlayers[0].name} is #{matchedPlayers[0].bandRank} in {matchedPlayers[0].rankBandLabel} and overall #{matchedPlayers[0].globalRank}.
                          </div>
                        ) : (
                          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/60">
                            No players matched this search.
                          </div>
                        )
                      ) : null}
                    </div>
                  </section>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="md:order-2">
                      <PodiumCard player={podiumLayout[1]} featured />
                    </div>
                    <div className="md:order-1">
                      <PodiumCard player={podiumLayout[0]} />
                    </div>
                    <div className="md:order-3">
                      <PodiumCard player={podiumLayout[2]} />
                    </div>
                  </div>

                  <section className={`overflow-hidden rounded-2xl border bg-gradient-to-b from-white/[0.05] to-white/[0.02] backdrop-blur-sm ${activeBand.border}`}>
                    <div className={`border-b border-white/10 bg-gradient-to-r ${activeBand.accent} px-6 py-5`}>
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className={`inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${activeBand.text}`}>
                            Active Rank
                          </div>
                          <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
                            {activeBand.label}
                          </h3>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-right">
                          <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">Top level</div>
                          <div className="mt-1 text-lg font-semibold text-white">
                            {activeBandPlayers[0] ? `Lv. ${wholeNumber.format(activeBandPlayers[0].level)}` : "No players"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {activeBandPlayers.length ? (
                      <div>
                        <div className="grid grid-cols-[70px_1fr_110px_110px_110px_70px] gap-4 border-b border-white/10 bg-white/[0.03] px-6 py-4">
                          <div className="text-xs uppercase tracking-wider text-white/40">Rank</div>
                          <div className="text-xs uppercase tracking-wider text-white/40">Player</div>
                          <div className="text-xs uppercase tracking-wider text-white/40">Level</div>
                          <div className="text-xs uppercase tracking-wider text-white/40">XP</div>
                          <div className="text-xs uppercase tracking-wider text-white/40">Streak</div>
                          <div className="text-xs uppercase tracking-wider text-white/40">Trend</div>
                        </div>

                        <div>
                          {activeBandPlayers.map((player) => {
                            const highlighted = highlightedPlayerIds.has(player.id);
                            return (
                              <div
                                key={`${activeBand.key}-${player.id}-${player.bandRank}`}
                                className={`grid grid-cols-[70px_1fr_110px_110px_110px_70px] gap-4 border-b border-white/[0.05] px-6 py-4 transition-colors duration-150 hover:bg-white/[0.04] ${
                                  highlighted
                                    ? "bg-blue-500/[0.12]"
                                    : player.isCurrentUser
                                      ? "bg-blue-500/[0.08]"
                                      : "bg-white/[0.02]"
                                }`}
                              >
                                <div className="flex items-center">
                                  <span className="text-sm font-medium text-white/70">#{player.bandRank}</span>
                                </div>

                                <div className="flex items-center gap-3">
                                  <PlayerAvatar player={player} sizeClass="h-10 w-10" />
                                  <div className="min-w-0">
                                    <div className="truncate text-sm text-white/90">
                                      {player.isCurrentUser ? `${player.name} (You)` : player.name}
                                    </div>
                                    <div className="text-xs text-white/40">
                                      Overall #{wholeNumber.format(player.globalRank)}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center">
                                  <span className="text-sm font-medium text-white">Lv. {wholeNumber.format(player.level)}</span>
                                </div>

                                <div className="flex items-center">
                                  <span className="text-sm text-white/70">{wholeNumber.format(player.xp)}</span>
                                </div>

                                <div className="flex items-center">
                                  <span className="text-sm text-white/70">{wholeNumber.format(player.streak)} days</span>
                                </div>

                                <div className="flex items-center justify-center">
                                  <TrendIcon trend={player.trend} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="px-6 py-10 text-center text-sm text-white/50">
                        No players are available in this rank right now.
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 backdrop-blur-sm">
                <h3 className="mb-4 text-sm text-white/50">Your Rank</h3>
                {currentPlayer ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <PlayerAvatar player={currentPlayer} sizeClass="h-12 w-12" />
                      <div className="flex-1">
                        <div className="mb-1 text-sm text-white/90">{currentPlayer.name}</div>
                        <div className="text-xs text-white/50">
                          #{currentPlayer.bandRank} in {currentPlayer.rankBandLabel}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-3">
                      <div>
                        <div className="mb-1 text-xs text-white/40">Level</div>
                        <div className="text-sm font-medium text-white/90">
                          Lv. {wholeNumber.format(currentPlayer.level)}
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 text-xs text-white/40">Overall</div>
                        <div className="text-sm font-medium text-white/90">
                          #{wholeNumber.format(currentPlayer.globalRank)}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-white/50">Sign in to see your position.</div>
                )}
              </div>

              <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 backdrop-blur-sm">
                <h3 className="mb-4 text-sm text-white/50">Ranks</h3>
                <div className="space-y-2">
                  {rankBands.map((band) => {
                    const count = allPlayers.filter((player) => player.rankBand === band.key).length;
                    const active = band.key === activeBand.key;
                    return (
                      <button
                        key={band.key}
                        type="button"
                        onClick={() => setSelectedBand(band.key)}
                        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                          active
                            ? `${band.border} bg-gradient-to-r ${band.accent}`
                            : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                        }`}
                      >
                        <div>
                          <div className={`text-sm font-semibold ${active ? "text-white" : band.text}`}>{band.label}</div>
                          <div className="text-xs text-white/45">{formatRankBandRange(band)}</div>
                        </div>
                        <div className="text-sm text-white/70">{wholeNumber.format(count)}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
