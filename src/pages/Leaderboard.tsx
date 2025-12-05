import { useEffect, useState } from "react";
import { AppShell } from "../components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { useAuth } from "../hooks/useAuth";
import { type UserProfile } from "../lib/mockApi";
import { Shield, Sparkles, Zap, Trophy } from "lucide-react";
import { db } from "../lib/firebase";
import { onValue, ref } from "firebase/database";

export default function Leaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
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
  }, [user]);

  if (!user || loading) {
    return (
      <AppShell>
        <div className="text-white/70 text-sm">Loading leaderboard...</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-col items-center gap-3">
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
            <CardTitle className="text-3xl font-extrabold text-white text-center">
              {user.chessUsername || user.displayName}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm text-white/80 items-stretch">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <Zap className="h-5 w-5 text-emerald-300" />
              <div>
                <div className="text-lg font-semibold text-white">{user.totalXp}</div>
                <div className="text-xs text-white/70">Total XP</div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <Trophy className="h-5 w-5 text-emerald-300" />
              <div>
                <div className="text-lg font-semibold text-white">{user.level}</div>
                <div className="text-xs text-white/70">Level</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand.pink" />
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {entries.map((entry, index) => {
              const name =
                entry.chessUsername || entry.displayName || (entry.email ? entry.email.split("@")[0] : "Player");
              return (
                <div
                  key={`${entry.id || entry.email || entry.displayName || index}`}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center">
                      {index + 1}
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
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
