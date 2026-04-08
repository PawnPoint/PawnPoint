import { useEffect, useState } from "react";
import { AppShell } from "../components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import { getStandingsBoards, hasGroupAdminAccess, updateStandingsBoard, type StandingsBoard } from "../lib/mockApi";
import { Sparkles, Crown, Loader2, Pencil, Plus, Trash2, ChevronUp, ChevronDown, X } from "lucide-react";

const pageBackground = {
  backgroundImage: `
    radial-gradient(1200px 600px at 50% -10%, rgba(255, 255, 255, 0.03), transparent 60%),
    linear-gradient(180deg, #0b1220 0%, #0d1628 25%, #0b1220 45%, #0a0f1c 60%, #070a12 75%, #000000 92%)
  `,
  minHeight: "100vh",
  color: "#ffffff",
} as const;

export default function Leaderboard() {
  const { user } = useAuth();
  const isAdmin = hasGroupAdminAccess(user);
  const [boards, setBoards] = useState<StandingsBoard[]>([]);
  const [standingsIndex, setStandingsIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [draftNames, setDraftNames] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getStandingsBoards(user);
        if (!mounted) return;
        setBoards(data);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Could not load the leaderboards.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.groupId, user?.id]);

  useEffect(() => {
    if (standingsIndex >= boards.length && boards.length > 0) {
      setStandingsIndex(0);
    }
  }, [boards.length, standingsIndex]);

  const activeStandings = boards[standingsIndex];

  const openEditor = () => {
    if (!activeStandings) return;
    setDraftNames([...activeStandings.names]);
    setNewName("");
    setMessage(null);
    setError(null);
    setIsEditing(true);
  };

  const closeEditor = () => {
    setDraftNames([]);
    setNewName("");
    setIsEditing(false);
  };

  const moveDraftName = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= draftNames.length) return;
    const next = [...draftNames];
    const [entry] = next.splice(index, 1);
    next.splice(nextIndex, 0, entry);
    setDraftNames(next);
  };

  const updateDraftName = (index: number, value: string) => {
    setDraftNames((prev) => prev.map((name, currentIndex) => (currentIndex === index ? value : name)));
  };

  const removeDraftName = (index: number) => {
    setDraftNames((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const addDraftName = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setDraftNames((prev) => [...prev, trimmed]);
    setNewName("");
  };

  const handleSave = async () => {
    if (!activeStandings || !user) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const result = await updateStandingsBoard(user, activeStandings.id, draftNames);
      setBoards(result.boards);
      setMessage(
        result.localOnly
          ? `${activeStandings.label} saved on this device only. Deploy the Firebase rules to sync it for everyone.`
          : `${activeStandings.label} updated.`,
      );
      closeEditor();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the leaderboard.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell backgroundStyle={pageBackground}>
      <div className="space-y-6">
        <div className="text-center space-y-1" style={{ fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif" }}>
          <h1 className="text-3xl sm:text-4xl font-extrabold">
            Group <span className="gradient-heading">Standings</span>
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
              <div className="flex items-center gap-2">
                <div className="text-xs text-white/60">{activeStandings?.label || "Loading leaderboard..."}</div>
                {isAdmin && activeStandings && !loading && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                    onClick={openEditor}
                    disabled={isEditing}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {message && <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">{message}</div>}
              {error && <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-100">{error}</div>}
              {loading ? (
                <div className="flex items-center justify-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-10 text-white/70">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading standings...
                </div>
              ) : activeStandings ? (
                <>
                  {isEditing ? (
                    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white">Edit {activeStandings.label}</div>
                          <div className="text-xs text-white/60">Move players, remove names, or add new ones.</div>
                        </div>
                        <button
                          type="button"
                          className="rounded-full bg-white/10 p-2 text-white/70 transition hover:bg-white/15 hover:text-white"
                          onClick={closeEditor}
                          aria-label="Close editor"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 standings-scroll">
                        {draftNames.map((name, index) => (
                          <div key={`${activeStandings.id}-draft-${index}`} className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#101827] px-3 py-3">
                            <div className="flex h-10 min-w-[48px] items-center justify-center rounded-xl bg-white/10 text-sm font-semibold text-white">
                              {index + 1}
                            </div>
                            <input
                              value={name}
                              onChange={(e) => updateDraftName(index, e.target.value)}
                              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-amber-300/60"
                              placeholder="Player name"
                            />
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                                onClick={() => moveDraftName(index, -1)}
                                disabled={index === 0}
                                aria-label={`Move ${name || "player"} up`}
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                                onClick={() => moveDraftName(index, 1)}
                                disabled={index === draftNames.length - 1}
                                aria-label={`Move ${name || "player"} down`}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon-sm"
                                onClick={() => removeDraftName(index)}
                                aria-label={`Remove ${name || "player"}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {draftNames.length === 0 && (
                          <div className="rounded-xl border border-dashed border-white/15 bg-black/20 px-4 py-6 text-center text-sm text-white/60">
                            This leaderboard is empty. Add the first name below.
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-3 sm:flex-row sm:items-center">
                        <input
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addDraftName();
                            }
                          }}
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-amber-300/60"
                          placeholder="Add new player name"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                          onClick={addDraftName}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                          onClick={closeEditor}
                          disabled={saving}
                        >
                          Cancel
                        </Button>
                        <Button type="button" onClick={handleSave} disabled={saving}>
                          {saving ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save changes"
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 standings-scroll">
                      {activeStandings.names.map((name, index) => {
                        const rank = index + 1;
                        const isLeader = rank === 1;
                        const isTopThree = rank <= 3;
                        return (
                          <div
                            key={`${name}-${rank}`}
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
                              </div>
                              <div>
                                <div
                                  className={`font-semibold text-white flex items-center gap-1.5 ${
                                    isTopThree ? "text-lg" : ""
                                  }`}
                                  style={isTopThree ? { fontFamily: "'Inter', system-ui" } : undefined}
                                >
                                  {name}
                                  {isLeader && <Crown className="h-4 w-4 text-amber-200" aria-hidden="true" />}
                                </div>
                                <div className="text-xs text-white/60">&nbsp;</div>
                              </div>
                            </div>
                            <div className="text-right text-white/40">&nbsp;</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-10 text-center text-white/70">
                  No leaderboard is available right now.
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
                <div className="text-xs text-white/50">
                  Leaderboard {boards.length ? standingsIndex + 1 : 0} of {boards.length}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="min-w-[110px] disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={isEditing || boards.length <= 1}
                    onClick={() =>
                      setStandingsIndex(
                        (prev) => (prev - 1 + boards.length) % boards.length,
                      )
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    className="min-w-[110px] disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={isEditing || boards.length <= 1}
                    onClick={() =>
                      setStandingsIndex((prev) => (prev + 1) % boards.length)
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
