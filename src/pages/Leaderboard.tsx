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
import { Sparkles, Zap, ChevronDown } from "lucide-react";
import { PodiumBarsIcon } from "../components/icons/PodiumBars";
import { db } from "../lib/firebase";
import { onValue, ref } from "firebase/database";

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
  const inGroup = !!user?.groupId && user?.accountType === "group";
  const clubPath = user?.groupId
    ? `groups/${user.groupId}/clubLeaderboard`
    : user
      ? `users/${user.id}/clubLeaderboard`
      : "clubLeaderboard";
  const [viewMenuOpen, setViewMenuOpen] = useState(false);

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
        let list = Object.values(val || {}).filter((entry) => typeof entry?.totalXp === "number");
        if (inGroup) {
          list = list.filter((entry) => entry.groupId === user.groupId);
        } else {
          list = list.filter((entry) => entry.id === user.id);
        }
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
  }, [user, mode, inGroup]);

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
    <AppShell>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="w-full max-w-xs self-start justify-self-center">
          <CardHeader className="flex flex-col items-center gap-4">
            <CardTitle className="text-3xl font-extrabold text-white text-center">
              {user.chessUsername || user.displayName}
            </CardTitle>
            <div className="flex items-center justify-center gap-4">
              <div className="relative h-28 w-28">
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-400 via-blue-400 to-purple-500 opacity-80" />
                <div className="relative h-full w-full rounded-full bg-slate-900 p-1">
                  <div className="h-full w-full rounded-full overflow-hidden bg-slate-800 border border-white/10">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-2xl font-bold text-white">
                        {(user.chessUsername || user.displayName || "Player").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="relative h-32 w-32 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-purple-500/60 blur-sm" />
                <div className="absolute inset-1 rounded-full border-2 border-purple-400/80 animate-pulse" />
                <div className="absolute inset-0 rounded-full bg-purple-600/20 animate-[spin_6s_linear_infinite]" />
                <div className="relative z-10 flex flex-col items-center justify-center rounded-full h-24 w-24 bg-slate-900 border border-purple-300/40 shadow-[0_0_20px_rgba(168,85,247,0.35)]">
                  <Zap className="h-6 w-6 text-purple-300" />
                  <div className="text-xl font-bold text-white">{user.totalXp}</div>
                  <div className="text-[11px] uppercase tracking-wide text-purple-200/80">XP</div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

          <Card className="lg:col-span-2">
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
              {inGroup
                ? "You are viewing private rankings for your group only."
                : "Personal account: only your own stats appear here."}
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
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {filteredXpRows.map(({ entry, rank }) => {
                  const name =
                    entry.chessUsername || entry.displayName || (entry.email ? entry.email.split("@")[0] : "Player");
                  return (
                    <div
                      key={`${entry.id || entry.email || entry.displayName || rank}`}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center">
                          {rank}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{name}</div>
                          <div className="text-xs text-white/60">Level {entry.level}</div>
                        </div>
                      </div>
                      <div className="font-semibold text-emerald-200">{entry.totalXp} XP</div>
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
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {filteredClubRows.map(({ entry, rank }) => (
                      <div
                        key={entry.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center">{rank}</div>
                          <div>
                            <div className="font-semibold text-white">{entry.name}</div>
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
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
