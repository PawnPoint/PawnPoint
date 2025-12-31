import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { AppShell } from "../components/AppShell";
import { useAuth } from "../hooks/useAuth";
import { getDashboard } from "../lib/mockApi";
import { Play, Flame } from "lucide-react";
import southKnightImg from "../assets/The South Knight.png";

export default function Dashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [topTwitchChannel, setTopTwitchChannel] = useState<string | null>(null);
  const featuredChannels = useMemo(
    () => [
      "gothamchess",
      "gmhikaru",
      "jesse_feb",
      "chesscom",
      "botezlive",
      "chessbrah",
      "annacramling",
      "thechessnerd",
      "dinabelenkaya",
      "chessdojo",
      "chesstopia1",
      "chess24",
      "wittyalien",
      "ericrosen",
    ],
    [],
  );
  const twitchParent = useMemo(
    () => (typeof window !== "undefined" ? window.location.hostname || "localhost" : "localhost"),
    [],
  );

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  const { data } = useQuery({
    queryKey: ["dashboard", user?.id, user?.groupId, user?.accountType],
    enabled: !!user,
    queryFn: () => getDashboard(user!),
  });

  if (!user) return null;

  useEffect(() => {
    let cancelled = false;
    const fetchTopChessStream = async () => {
      try {
        // Single GQL query asking for the live stream status of all featured channels.
        const fields = featuredChannels
          .map(
            (login, idx) => `
            c${idx}: user(login: "${login}") {
              login
              displayName
              stream {
                id
                viewersCount
              }
            }`,
          )
          .join("\n");
        const gqlQuery = { query: `query FeaturedLive { ${fields} }` };

        const res = await fetch("https://gql.twitch.tv/gql", {
          method: "POST",
          headers: {
            "Client-ID": "kimne78kx3ncx6brgo4mv6wki5h1ko",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(gqlQuery),
        });
        const json = await res.json();
        const data = json?.data || {};
        const liveChannels: { login: string; viewers: number }[] = Object.values(data)
          .map((entry: any) => {
            if (!entry?.stream?.id || !entry?.login) return null;
            return { login: entry.login.toLowerCase(), viewers: entry.stream.viewersCount ?? 0 };
          })
          .filter(Boolean) as { login: string; viewers: number }[];

        if (!cancelled) {
          if (liveChannels.length > 0) {
            const pick = liveChannels[Math.floor(Math.random() * liveChannels.length)];
            setTopTwitchChannel(pick.login);
          } else {
            setTopTwitchChannel("chess");
          }
        }
      } catch (err) {
        console.warn("Failed to fetch top chess stream, using default channel.", err);
        if (!cancelled) setTopTwitchChannel("chess");
      }
    };
    fetchTopChessStream();
    return () => {
      cancelled = true;
    };
  }, []);

  const twitchSrc = useMemo(() => {
    if (!topTwitchChannel) return "";
    const base = `https://player.twitch.tv/?channel=${encodeURIComponent(topTwitchChannel)}`;
    const params = `&parent=${encodeURIComponent(twitchParent)}&muted=true&autoplay=true&playsinline=true`;
    return base + params;
  }, [topTwitchChannel, twitchParent]);

  return (
    <AppShell>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="card-solid lg:col-span-1 bg-[#2d3749] border border-white/10">
          <CardHeader>
            <div className="flex items-center gap-3 flex-wrap">
              <CardTitle className="text-xl sm:text-2xl">Hi, {user.chessUsername || user.displayName}</CardTitle>
              <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-sm">
                Level {user.level}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm text-white/70">
              <span>Total XP</span>
              <span className="text-white font-semibold">{user.totalXp}</span>
            </div>
              <div className="rounded-xl overflow-hidden border shadow-inner" style={{ backgroundColor: "#111724", borderColor: "#111724" }}>
                <div className="flex items-center justify-between px-3 py-3 text-xs text-white/70 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm">Chess TV</span>
                    <span className="uppercase tracking-wide text-[10px] text-white/60">Live on Twitch</span>
                  </div>
                </div>
                <div className="aspect-video bg-black">
                  <iframe
                    title="Chess TV"
                    src={twitchSrc}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
                <div className="flex items-center justify-between px-3 py-3 text-white border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <Flame className="h-8 w-8 text-amber-400 animate-pulse drop-shadow-lg" />
                    <div>
                      <div className="text-xs text-white/70">Daily streak</div>
                      <div className="text-base font-semibold leading-none">{user.streak || 0} days</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-white/60">Earn XP each day to keep the flame lit.</div>
                </div>
              </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Card className="card-solid bg-[#2d3749] border border-white/10">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle>Suggested Courses</CardTitle>
              <Button variant="outline" className="bg-white/5 hover:bg-white/10 border-white/20" onClick={() => navigate("/courses")}>
                Browse all
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                {(data?.suggested || []).map((course) => (
                  <div
                    key={course.id}
                    className="rounded-xl border overflow-hidden flex flex-col h-full"
                    style={{ backgroundColor: "#111724", borderColor: "#111724" }}
                  >
                    <img src={course.thumbnailUrl} alt={course.title} className="h-28 w-full object-cover" />
                    <div className="p-4 flex flex-col gap-2 flex-1">
                      <div className="text-sm text-brand.pink uppercase tracking-wide">Suggested</div>
                      <div className="font-semibold text-white">{course.title}</div>
                      <p className="text-sm text-white/80 line-clamp-3 flex-1">{course.description}</p>
                      <Button
                        className="w-full mt-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white shadow-none"
                        onClick={() => navigate(`/courses/${course.id}`)}
                      >
                        Continue
                      </Button>
                    </div>
                  </div>
                ))}
                {!data && <div className="text-white/70 text-sm">Loading dashboard...</div>}
              </div>

              <div
                className="rounded-xl border p-4 grid md:grid-cols-[1fr_auto] gap-4 items-center"
                style={{ backgroundColor: "#111724", borderColor: "#111724" }}
              >
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-full overflow-hidden border border-white/10 shadow-lg">
                    <img src={southKnightImg} alt="The South Knight" className="h-full w-full object-cover" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-white/70 flex items-center gap-2">
                      <Play className="h-4 w-4 text-emerald-300" />
                      AI Practice
                    </div>
                    <div className="text-base font-semibold text-white">Custom sparring sessions, instant XP.</div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 w-full md:w-auto">
                  <Button
                    size="lg"
                    className="bg-white/10 hover:bg-white/20 border border-white/20 text-white shadow-none"
                    onClick={() => navigate("/practice")}
                  >
                    Play Training Bot
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
