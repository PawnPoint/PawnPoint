import { useEffect, useMemo, useState } from "react";
import { Loader2, Minus, Search, TrendingDown, TrendingUp } from "lucide-react";

import { AppShell } from "../components/AppShell";
import { useAuth } from "../hooks/useAuth";
import { getGlobalXpLeaderboard, type UserProfile } from "../lib/mockApi";
import { formatRankBandRange, rankBands, resolveRankBand, type RankBandKey } from "../lib/ranks";
import avatarFallback from "../assets/Easter Default.png";

const pageBackground = {
  backgroundColor: "#000000",
  minHeight: "100vh",
  color: "#f3ede3",
} as const;

const backgroundOverlay = (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <div className="pp-dashboard-grain" />
  </div>
);

const wholeNumber = new Intl.NumberFormat("en-US");

const rankBandTextClass: Record<RankBandKey, string> = {
  gold: "text-[#e8ca73]",
  diamond: "text-[#93d9ea]",
  ascendant: "text-[#8bd8bc]",
  immortal: "text-[#ebb6de]",
  radiant: "text-[#b8c0ff]",
};

type RankedPlayer = {
  id: string;
  name: string;
  avatarUrl?: string;
  xp: number;
  level: number;
  streak: number;
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
      const rankBand = resolveRankBand(level);

      return {
        id: entry.id,
        name,
        avatarUrl: entry.avatarUrl,
        xp,
        level,
        streak,
        trend: Math.max(-18, Math.min(52, trendBase)),
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

function PlayerAvatar({ player, className }: { player: Pick<RankedPlayer, "avatarUrl" | "name">; className: string }) {
  return (
    <img
      src={player.avatarUrl || avatarFallback}
      alt={player.name}
      className={`${className} rounded-full border border-white/12 bg-white/5 object-cover`}
      loading="lazy"
      decoding="async"
      onError={(event) => {
        event.currentTarget.src = avatarFallback;
      }}
    />
  );
}

function TrendIcon({ trend }: { trend: number }) {
  if (trend > 0) return <TrendingUp className="h-4 w-4 text-emerald-400" />;
  if (trend < 0) return <TrendingDown className="h-4 w-4 text-rose-400" />;
  return <Minus className="h-4 w-4 text-[#8d8374]" />;
}

function PodiumCard({ player, featured = false }: { player?: RankedPlayer; featured?: boolean }) {
  if (!player) return null;

  return (
    <article
      className={`relative flex min-h-[190px] flex-col items-center justify-center rounded-2xl border border-white/14 bg-[#151515] px-6 py-7 text-center ${
        featured ? "scale-[1.04] bg-[radial-gradient(circle_at_50%_10%,rgba(214,197,162,0.13),#151515_58%)]" : ""
      }`}
    >
      <div className="relative">
        <PlayerAvatar player={player} className={featured ? "h-20 w-20" : "h-16 w-16"} />
        <span
          className={`absolute -bottom-1 -right-2 inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-black px-1.5 text-xs font-semibold ${
            featured ? "bg-[#d6c5a2] text-black" : "bg-[#272727] text-white"
          }`}
        >
          #{player.bandRank}
        </span>
      </div>
      <h3 className="mt-5 text-lg font-semibold text-white">{player.name}</h3>
      <p className="mt-1 text-xs text-[#8d8374]">
        {player.rankBandLabel} · Overall #{wholeNumber.format(player.globalRank)}
      </p>
      <div className="mt-5 flex items-center gap-4 text-sm text-[#b5aa9a]">
        <span>
          Level <strong className="text-white">Lv. {wholeNumber.format(player.level)}</strong>
        </span>
        <span className="h-3 w-px bg-white/12" />
        <span>
          XP <strong className="text-white">{wholeNumber.format(player.xp)}</strong>
        </span>
      </div>
    </article>
  );
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
        if (mounted) setEntries(nextEntries || []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const allPlayers = useMemo(() => buildRankedPlayers(entries, user?.id), [entries, user?.id]);
  const defaultBandKey =
    allPlayers.find((player) => player.isCurrentUser)?.rankBand ||
    rankBands.find((band) => allPlayers.some((player) => player.rankBand === band.key))?.key ||
    rankBands[0].key;

  useEffect(() => {
    if (!selectedBand) setSelectedBand(defaultBandKey);
  }, [defaultBandKey, selectedBand]);

  const activeBandKey = selectedBand || defaultBandKey;
  const activeBand = rankBands.find((band) => band.key === activeBandKey) || rankBands[0];
  const activeBandPlayers = allPlayers.filter((player) => player.rankBand === activeBand.key);
  const searchQuery = searchTerm.trim().toLowerCase();
  const searchedPlayers = searchQuery
    ? allPlayers.filter((player) => player.name.toLowerCase().includes(searchQuery))
    : [];
  const visiblePlayers = searchQuery ? searchedPlayers : activeBandPlayers;
  const topThree = activeBandPlayers.slice(0, 3);
  const podiumLayout = [topThree[1], topThree[0], topThree[2]];
  const currentPlayer = allPlayers.find((player) => player.isCurrentUser) || null;

  return (
    <AppShell backgroundStyle={pageBackground} backgroundOverlay={backgroundOverlay} variant="dashboard-editorial">
      <div className="min-h-full px-4 py-8 text-[#f3ede3] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1180px]">
          <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">Global Ranks</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#b5aa9a]">
                Track the strongest Pawn Point players by level, XP, and active rank band.
              </p>
            </div>

            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8d8374]" />
              <input
                type="text"
                placeholder="Search players..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-12 w-full rounded-lg border border-white/18 bg-[#242424] pl-11 pr-4 text-sm text-white outline-none placeholder:text-[#8d8374] focus:border-white/50"
              />
            </div>
          </header>

          <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
            {rankBands.map((band) => {
              const count = allPlayers.filter((player) => player.rankBand === band.key).length;
              const active = band.key === activeBand.key && !searchQuery;
              return (
                <button
                  key={band.key}
                  type="button"
                  onClick={() => {
                    setSelectedBand(band.key);
                    setSearchTerm("");
                  }}
                  className={`shrink-0 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "border-white/24 bg-white/18 text-white"
                      : "border-white/12 bg-white/[0.03] text-[#b5aa9a] hover:border-white/26 hover:text-white"
                  }`}
                >
                  <span className={active ? "text-white" : rankBandTextClass[band.key]}>{band.label}</span>
                  <span className="ml-2 text-[#8d8374]">{wholeNumber.format(count)}</span>
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="mt-10 flex min-h-[420px] items-center justify-center rounded-2xl border border-white/12 bg-[#121212]">
              <Loader2 className="h-6 w-6 animate-spin text-[#d6c5a2]" />
            </div>
          ) : (
            <>
              {!searchQuery && (
                <section className="mt-10 grid items-end gap-4 md:grid-cols-3">
                  <PodiumCard player={podiumLayout[0]} />
                  <PodiumCard player={podiumLayout[1]} featured />
                  <PodiumCard player={podiumLayout[2]} />
                </section>
              )}

              <section className="mt-8 overflow-hidden rounded-2xl border border-white/12 bg-[#111111]">
                <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">
                      {searchQuery ? "Search results" : `${activeBand.label} leaderboard`}
                    </h2>
                    <p className="mt-1 text-sm text-[#8d8374]">
                      {searchQuery
                        ? `${visiblePlayers.length} matching player${visiblePlayers.length === 1 ? "" : "s"}`
                        : `${formatRankBandRange(activeBand)} · ${activeBandPlayers.length} player${activeBandPlayers.length === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  {currentPlayer && !searchQuery && (
                    <div className="rounded-lg border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-[#b5aa9a]">
                      Your rank: <span className="font-semibold text-white">#{currentPlayer.bandRank}</span> in{" "}
                      <span className={rankBandTextClass[currentPlayer.rankBand]}>{currentPlayer.rankBandLabel}</span>
                    </div>
                  )}
                </div>

                <div className="hidden grid-cols-[76px_1fr_110px_130px_110px_90px] gap-4 border-b border-white/10 px-5 py-3 text-xs uppercase tracking-[0.16em] text-[#8d8374] md:grid">
                  <div>Rank</div>
                  <div>Player</div>
                  <div>Level</div>
                  <div>XP</div>
                  <div>Streak</div>
                  <div>Trend</div>
                </div>

                {visiblePlayers.length ? (
                  <div>
                    {visiblePlayers.map((player) => (
                      <div
                        key={`${searchQuery ? "search" : activeBand.key}-${player.id}-${player.globalRank}`}
                        className={`grid gap-4 border-b border-white/[0.07] px-5 py-4 last:border-b-0 md:grid-cols-[76px_1fr_110px_130px_110px_90px] md:items-center ${
                          player.isCurrentUser ? "bg-white/[0.06]" : "hover:bg-white/[0.035]"
                        }`}
                      >
                        <div className="hidden text-sm font-medium text-[#d6c5a2] md:block">
                          #{searchQuery ? player.globalRank : player.bandRank}
                        </div>

                        <div className="flex min-w-0 items-center gap-3">
                          <div className="text-sm font-medium text-[#d6c5a2] md:hidden">
                            #{searchQuery ? player.globalRank : player.bandRank}
                          </div>
                          <PlayerAvatar player={player} className="h-10 w-10" />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-white">
                              {player.isCurrentUser ? `${player.name} (You)` : player.name}
                            </div>
                            <div className="text-xs text-[#8d8374]">
                              {player.rankBandLabel} · Overall #{wholeNumber.format(player.globalRank)}
                            </div>
                          </div>
                        </div>

                        <div className="text-sm text-white">Lv. {wholeNumber.format(player.level)}</div>
                        <div className="text-sm text-[#b5aa9a]">{wholeNumber.format(player.xp)} XP</div>
                        <div className="text-sm text-[#b5aa9a]">{wholeNumber.format(player.streak)} days</div>
                        <div className="flex items-center gap-2 text-sm text-[#b5aa9a]">
                          <TrendIcon trend={player.trend} />
                          <span>{player.trend > 0 ? `+${player.trend}` : player.trend}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-6 py-14 text-center text-sm text-[#b5aa9a]">
                    {searchQuery ? "No players matched this search." : "No players are available in this rank right now."}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
