import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import {
  addClubParticipant,
  getClubLeaderboard,
  removeClubParticipant,
  type ClubLeaderboardEntry,
  type UserProfile,
  updateClubPerformance,
  resetAllXp,
} from "../lib/mockApi";
import { Sparkles, ChevronDown, Crown } from "lucide-react";
import { db } from "../lib/firebase";
import { onValue, ref } from "firebase/database";

const pageBackground = {
  backgroundImage: `
    radial-gradient(1200px 600px at 50% -10%, rgba(255, 255, 255, 0.03), transparent 60%),
    linear-gradient(180deg, #0b1220 0%, #0d1628 25%, #0b1220 45%, #0a0f1c 60%, #070a12 75%, #000000 92%)
  `,
  minHeight: "100vh",
  color: "#ffffff",
} as const;

const getDisplayName = (entry: UserProfile) =>
  entry.chessUsername || entry.displayName || (entry.email ? entry.email.split("@")[0] : "Player");

export default function Leaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"xp" | "club">("xp");
  const [clubEntries, setClubEntries] = useState<ClubLeaderboardEntry[]>([]);
  const [clubLoading, setClubLoading] = useState(true);
  const [clubError, setClubError] = useState("");
  const [addName, setAddName] = useState("");
  const [addRating, setAddRating] = useState("");
  const [addPerformance, setAddPerformance] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingPerformance, setEditingPerformance] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [xpSearch, setXpSearch] = useState("");
  const [clubSearch, setClubSearch] = useState("");
  const clubPath = user?.groupId
    ? `groups/${user.groupId}/clubLeaderboard`
    : user
      ? `users/${user.id}/clubLeaderboard`
      : "clubLeaderboard";
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [rankChangeXp, setRankChangeXp] = useState<number | null>(null);
  const [xpDeltaToday, setXpDeltaToday] = useState(0);

  useEffect(() => {
    const key = "pawnpoint_xp_reset_v1";
    const alreadyReset = localStorage.getItem(key);
    if (!alreadyReset) {
      resetAllXp().finally(() => localStorage.setItem(key, "done"));
    }
  }, []);

  useEffect(() => {
    if (!user || mode !== "xp") return;
    const leaderboardRef = ref(db, "users");
    const unsubscribe = onValue(
      leaderboardRef,
      (snap) => {
        const val = (snap.val() || {}) as Record<string, UserProfile>;
        const list = Object.values(val || {}).filter((entry) => typeof entry?.totalXp === "number");
        const sorted = list.sort((a, b) => {
          const diff = (b.totalXp || 0) - (a.totalXp || 0);
          if (diff !== 0) return diff;
          const timeA = a.xpReachedAt ?? a.createdAt ?? 0;
          const timeB = b.xpReachedAt ?? b.createdAt ?? 0;
          return timeA - timeB;
        });
        setEntries(sorted);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsubscribe();
  }, [user, mode]);

  useEffect(() => {
    if (!user || mode !== "club") return;
    setClubLoading(true);
    setClubError("");
    getClubLeaderboard(user)
      .then((list) => setClubEntries(list))
      .catch(() => setClubError("Could not load group leaderboard."))
      .finally(() => setClubLoading(false));

    const clubRef = ref(db, clubPath);
    const unsubscribe = onValue(
      clubRef,
      (snap) => {
        const val = (snap.val() || {}) as Record<string, ClubLeaderboardEntry>;
        const list = Object.values(val || {}).map((entry) => ({
          ...entry,
          rating: Math.max(0, Math.round(entry.rating || 0)),
          performance:
            entry.performance !== undefined && entry.performance !== null ? Math.round(entry.performance) : undefined,
        }));
        setClubEntries(list);
        setClubLoading(false);
      },
      () => setClubLoading(false),
    );
    return () => unsubscribe();
  }, [user, mode, clubPath]);

  const sortedClubEntries = useMemo(
    () =>
      [...clubEntries].sort((a, b) => {
        const rDiff = (b.rating || 0) - (a.rating || 0);
        if (rDiff !== 0) return rDiff;
        const pDiff = (b.performance || 0) - (a.performance || 0);
        if (pDiff !== 0) return pDiff;
        return (a.name || "").localeCompare(b.name || "");
      }),
    [clubEntries],
  );

  const xpRows = useMemo(
    () =>
      entries.map((entry, index) => ({
        entry,
        rank: index + 1,
      })),
    [entries],
  );

  const filteredXpRows = useMemo(() => {
    const term = xpSearch.trim().toLowerCase();
    if (!term) return xpRows;
    return xpRows.filter(({ entry }) => {
      const name =
        entry.chessUsername || entry.displayName || (entry.email ? entry.email.split("@")[0] : "Player");
      return name.toLowerCase().includes(term);
    });
  }, [xpRows, xpSearch]);

  const clubRows = useMemo(
    () =>
      sortedClubEntries.map((entry, idx) => ({
        entry,
        rank: idx + 1,
      })),
    [sortedClubEntries],
  );

  const userRankXp = useMemo(() => {
    if (!user) return null;
    const idx = xpRows.findIndex(({ entry }) => entry.id === user.id);
    return idx >= 0 ? idx + 1 : null;
  }, [user, xpRows]);

  const userRankClub = useMemo(() => {
    if (!user) return null;
    const idx = clubRows.findIndex(({ entry }) => entry.id === user.id);
    return idx >= 0 ? idx + 1 : null;
  }, [user, clubRows]);

  useEffect(() => {
    if (!user || mode !== "xp" || userRankXp === null) {
      setRankChangeXp(null);
      return;
    }
    const key = `pp_rank_${user.id}_xp`;
    const prevRaw = localStorage.getItem(key);
    const prev = prevRaw ? parseInt(prevRaw, 10) : NaN;
    if (!Number.isNaN(prev)) {
      setRankChangeXp(prev - userRankXp);
    } else {
      setRankChangeXp(0);
    }
    localStorage.setItem(key, String(userRankXp));
  }, [user, mode, userRankXp]);

  useEffect(() => {
    if (!user || mode !== "xp") {
      setXpDeltaToday(0);
      return;
    }
    const key = `pp_xp_today_${user.id}`;
    const today = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem(key);
    let base = user.totalXp || 0;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { date: string; base: number };
        if (parsed?.date === today && typeof parsed.base === "number") {
          base = parsed.base;
        } else {
          localStorage.setItem(key, JSON.stringify({ date: today, base }));
        }
      } catch {
        localStorage.setItem(key, JSON.stringify({ date: today, base }));
      }
    } else {
      localStorage.setItem(key, JSON.stringify({ date: today, base }));
    }
    const delta = (user.totalXp || 0) - base;
    setXpDeltaToday(delta > 0 ? delta : 0);
  }, [user, mode, user?.totalXp]);

  const xpLeadText = useMemo(() => {
    if (!user || mode !== "xp") return null;
    if (!userRankXp) return "Earn XP to appear on the leaderboard.";
    if (userRankXp === 1) {
      if (xpRows.length > 1) {
        const lead = (xpRows[0].entry.totalXp || 0) - (xpRows[1].entry.totalXp || 0);
        const secondName = getDisplayName(xpRows[1].entry);
        return `You lead #2 ${secondName} by ${lead} XP.`;
      }
      return "You're in first place. Keep it going!";
    }
    const currentRow = xpRows[userRankXp - 1];
    const aheadRow = xpRows[userRankXp - 2];
    const needed = Math.max(1, (aheadRow.entry.totalXp || 0) - (currentRow.entry.totalXp || 0) + 1);
    const aheadName = getDisplayName(aheadRow.entry);
    return `Gain ${needed} XP to pass #${userRankXp - 1} ${aheadName}.`;
  }, [user, mode, userRankXp, xpRows]);

  const filteredClubRows = useMemo(() => {
    const term = clubSearch.trim().toLowerCase();
    if (!term) return clubRows;
    return clubRows.filter(({ entry }) => entry.name.toLowerCase().includes(term));
  }, [clubRows, clubSearch]);

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.isAdmin) {
      setClubError("Only admins can add participants.");
      return;
    }
    const rating = Number(addRating);
    const performance = addPerformance.trim() ? Number(addPerformance) : undefined;
    if (!addName.trim()) {
      setClubError("Name is required.");
      return;
    }
    if (!Number.isFinite(rating)) {
      setClubError("Rating must be a number.");
      return;
    }
    setSaving(true);
    setClubError("");
    try {
      await addClubParticipant(user, { name: addName, rating, performance });
      setAddName("");
      setAddRating("");
      setAddPerformance("");
    } catch (err: any) {
      setClubError(err?.message || "Failed to add participant.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePerformance = async (id: string) => {
    if (!user?.isAdmin) {
      setClubError("Only admins can update performance.");
      return;
    }
    const raw = editingPerformance[id];
    const performance = raw !== undefined ? Number(raw) : undefined;
    if (raw !== undefined && raw !== "" && !Number.isFinite(performance)) {
      setClubError("Performance must be a number.");
      return;
    }
    setUpdatingId(id);
    setClubError("");
    try {
      await updateClubPerformance(user, id, { performance });
    } catch (err: any) {
      setClubError(err?.message || "Failed to update performance.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (id: string) => {
    if (!user?.isAdmin) {
      setClubError("Only admins can remove participants.");
      return;
    }
    setRemovingId(id);
    setClubError("");
    try {
      await removeClubParticipant(user, id);
    } catch (err: any) {
      setClubError(err?.message || "Failed to remove participant.");
    } finally {
      setRemovingId(null);
    }
  };

  if (!user || (mode === "xp" && loading)) {
    return (
      <AppShell>
        <div className="text-white/70 text-sm">Loading leaderboard...</div>
      </AppShell>
    );
  }

  return (
    <AppShell backgroundStyle={pageBackground}>
      <div className="space-y-6">
        <div className="text-center space-y-1" style={{ fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif" }}>
          <h1 className="text-3xl sm:text-4xl font-extrabold">
            Compete. Climb. <span className="gradient-heading">Dominate</span> your group.
          </h1>
        </div>
        <div className="flex justify-center">
          <div
            aria-hidden="true"
            className="h-[3px] w-24 rounded-full bg-gradient-to-r from-amber-200/70 via-amber-300/80 to-amber-200/70 shadow-[0_8px_24px_rgba(251,191,36,0.25)]"
          />
        </div>
        <div className="flex flex-col gap-6 max-w-6xl mx-auto">
          <Card className="w-full" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.45)" }}>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-brand.pink" />
                Standings
              </CardTitle>
              <div className="relative">
                <button
                  className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/90 hover:bg-white/10"
                  onClick={() => setViewMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={viewMenuOpen}
                >
                  <span className="text-white/80">{mode === "xp" ? "XP Standings" : "Group Standings"}</span>
                  <ChevronDown className={`h-4 w-4 transition ${viewMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {viewMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl backdrop-blur-sm py-2 text-sm text-white">
                    {[
                      { key: "xp", label: "XP Standings" },
                      { key: "club", label: "Group Standings" },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        className={`w-full text-left px-4 py-2 hover:bg-white/10 ${
                          mode === opt.key ? "bg-white/5 text-white" : "text-white/80"
                        }`}
                        onClick={() => {
                          setMode(opt.key as "xp" | "club");
                          setViewMenuOpen(false);
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-white/60">
                {mode === "xp"
                  ? userRankXp
                    ? `You are #${userRankXp} on the XP leaderboard.`
                    : "Your XP rank will appear once you've earned points."
                  : userRankClub
                    ? `You are #${userRankClub} on your group's standings.`
                    : "Your group rank will appear once you're listed in standings."}
              </div>
            {mode === "xp" ? (
              <div className="flex items-center gap-2">
                <input
                  value={xpSearch}
                  onChange={(e) => setXpSearch(e.target.value)}
                  placeholder="Search players"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-pink-400"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  value={clubSearch}
                  onChange={(e) => setClubSearch(e.target.value)}
                  placeholder="Search group players"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-pink-400"
                />
              </div>
            )}
            {mode === "xp" ? (
              <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1 standings-scroll">
                {filteredXpRows.map(({ entry, rank }) => {
                  const name =
                    entry.chessUsername || entry.displayName || (entry.email ? entry.email.split("@")[0] : "Player");
                  const isLeader = rank === 1;
                  const isTopThree = rank <= 3;
                  const isCurrentUser = user && (entry.id === user.id || entry.email === user.email);
                  return (
                    <div
                      key={`${entry.id || entry.email || entry.displayName || rank}`}
                      className={`flex items-center justify-between rounded-lg p-3 transition hover:-translate-y-[2px] hover:bg-white/10 ${
                        isLeader
                          ? "border border-amber-300/40 bg-white/10 shadow-[0_8px_28px_rgba(251,191,36,0.18)]"
                          : "border border-white/10 bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`relative h-10 min-w-[54px] rounded-xl flex items-center justify-center ${
                            isLeader
                              ? "bg-gradient-to-br from-amber-200 via-amber-300 to-amber-200 text-slate-900 font-bold shadow-[0_8px_28px_rgba(251,191,36,0.18)] border border-amber-300/60"
                              : "bg-white/10 text-white"
                          }`}
                        >
                          {rank}
                          {isCurrentUser && rankChangeXp !== null && rankChangeXp !== 0 && (
                            <span
                              className={`absolute -right-1 -bottom-1 text-[10px] ${
                                rankChangeXp > 0
                                  ? "text-emerald-300"
                                  : rankChangeXp < 0
                                    ? "text-amber-300"
                                    : "text-white/60"
                              }`}
                            >
                              {rankChangeXp > 0 ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      <div className="flex flex-col">
                          <div
                            className={`font-semibold text-white flex items-center gap-1.5 ${
                              isTopThree ? "text-lg" : ""
                            }`}
                            style={isTopThree ? { fontFamily: "'Inter', system-ui" } : undefined}
                          >
                            {name}
                            {isLeader && <Crown className="h-4 w-4 text-amber-200" aria-hidden="true" />}
                          </div>
                          <div className="text-xs text-white/60">Level {entry.level}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`font-semibold ${isTopThree ? "text-xl text-emerald-100" : "text-emerald-200"}`}
                          style={isTopThree ? { fontFamily: "'Inter', system-ui" } : undefined}
                        >
                          {entry.totalXp} XP
                        </div>
                        {isCurrentUser && xpDeltaToday > 0 && (
                          <div className="text-xs text-emerald-300/80">+{xpDeltaToday} XP today</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                {user?.isAdmin && (
                  <form onSubmit={handleAddParticipant} className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-sm font-semibold text-white">Group Standings Controls (Admin)</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        value={addName}
                        onChange={(e) => setAddName(e.target.value)}
                        placeholder="Name"
                        className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-pink-400"
                      />
                      <input
                        value={addRating}
                        onChange={(e) => setAddRating(e.target.value)}
                        placeholder="Rating"
                        type="number"
                        className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-pink-400"
                      />
                      <input
                        value={addPerformance}
                        onChange={(e) => setAddPerformance(e.target.value)}
                        placeholder="Performance"
                        type="number"
                        className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-pink-400"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-white/60">
                      <span>Add participants and set their performance.</span>
                      <Button type="submit" size="sm" disabled={saving}>
                        {saving ? "Saving..." : "Add participant"}
                      </Button>
                    </div>
                    {clubError && <div className="text-xs text-amber-300">{clubError}</div>}
                  </form>
                )}

                {clubLoading ? (
                <div className="text-white/70 text-sm">Loading group leaderboard...</div>
                ) : sortedClubEntries.length === 0 ? (
                  <div className="text-white/60 text-sm">No club entries yet.</div>
                ) : (
                  <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1 standings-scroll">
                    {filteredClubRows.map(({ entry, rank }) => {
                      const isLeader = rank === 1;
                      const isTopThree = rank <= 3;
                      const isCurrentUser = user && (entry.id === user.id || entry.email === user.email);
                      return (
                        <div
                          key={entry.id}
                        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg p-3 transition hover:-translate-y-[2px] hover:bg-white/10 ${
                          isLeader
                            ? "border border-amber-300/40 bg-white/10 shadow-[0_8px_28px_rgba(251,191,36,0.18)]"
                            : "border border-white/10 bg-white/5"
                        }`}
                        >
                        <div className="flex items-center gap-3">
                            <div
                              className={`relative h-10 min-w-[54px] rounded-xl flex items-center justify-center ${
                                isLeader
                                  ? "bg-gradient-to-br from-amber-200 via-amber-300 to-amber-200 text-slate-900 font-bold shadow-[0_8px_28px_rgba(251,191,36,0.18)] border border-amber-300/60"
                                  : "bg-white/10 text-white"
                              }`}
                            >
                              {rank}
                              {isCurrentUser && rankChangeXp !== null && rankChangeXp !== 0 && (
                                <span
                                  className={`absolute -right-1 -bottom-1 text-[10px] ${
                                    rankChangeXp > 0
                                      ? "text-emerald-300"
                                      : rankChangeXp < 0
                                        ? "text-amber-300"
                                        : "text-white/60"
                                  }`}
                                >
                                  {rankChangeXp > 0 ? "↑" : "↓"}
                                </span>
                              )}
                            </div>
                          <div>
                            <div
                              className={`font-semibold text-white flex items-center gap-1.5 ${
                                isTopThree ? "text-lg" : ""
                              }`}
                              style={isTopThree ? { fontFamily: "'Inter', system-ui" } : undefined}
                            >
                              {entry.name}
                              {isLeader && <Crown className="h-4 w-4 text-amber-200" aria-hidden="true" />}
                            </div>
                            <div className="text-xs text-white/60">
                              Rating {entry.rating}
                              {entry.performance !== undefined ? ` • Performance ${entry.performance}` : ""}
                            </div>
                          </div>
                        </div>
                        {user?.isAdmin ? (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                            <input
                              type="number"
                              value={
                                editingPerformance[entry.id] !== undefined
                                  ? editingPerformance[entry.id]
                                  : entry.performance ?? ""
                              }
                              onChange={(e) =>
                                setEditingPerformance((prev) => ({
                                  ...prev,
                                  [entry.id]: e.target.value,
                                }))
                              }
                              className="w-full sm:w-28 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-pink-400"
                              placeholder="Performance"
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdatePerformance(entry.id)}
                                disabled={updatingId === entry.id}
                              >
                                {updatingId === entry.id ? "Saving..." : "Save"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemove(entry.id)}
                                disabled={removingId === entry.id}
                              >
                                {removingId === entry.id ? "Removing..." : "Delete"}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm font-semibold text-emerald-200">
                            Performance {entry.performance ?? "N/A"}
                          </div>
                        )}
                      </div>
                    );
                    })}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
        {mode === "xp" && xpLeadText && (
          <Card className="w-full">
            <CardContent className="text-center text-white" style={{ fontFamily: "'Inter', system-ui" }}>
              <div className="text-xl sm:text-2xl font-semibold">{xpLeadText}</div>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </AppShell>
  );
}
