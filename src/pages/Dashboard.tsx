import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { AppShell } from "../components/AppShell";
import { useAuth } from "../hooks/useAuth";
import { getDashboard } from "../lib/mockApi";
import { Play } from "lucide-react";
import southKnightImg from "../assets/The South Knight.png";

export default function Dashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [topTwitchChannel, setTopTwitchChannel] = useState("chess");
  const twitchParent = useMemo(
    () => (typeof window !== "undefined" ? window.location.hostname || "localhost" : "localhost"),
    [],
  );

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  const { data } = useQuery({
    queryKey: ["dashboard", user?.id],
    enabled: !!user,
    queryFn: () => getDashboard(user!),
  });

  if (!user) return null;

  useEffect(() => {
    let cancelled = false;
    const fetchTopChessStream = async () => {
      try {
        const query = {
          operationName: "DirectoryAllBrowsePage_Game",
          variables: {
            name: "Chess",
            options: {
              sort: "VIEWER_COUNT",
              recommendationsContext: { platform: "web" },
              requestID: "pawnpoint",
              limit: 1,
              platform: "web",
              tags: [],
            },
          },
          extensions: {
            persistedQuery: {
              version: 1,
              // Hash used by Twitch web client for game directory queries
              sha256Hash: "fcb82e9785a1fd8e97ab3c4b8d4288b7d2e0bc1c1d318cc031ee332b2f7f9a9b",
            },
          },
        };
        const res = await fetch("https://gql.twitch.tv/gql", {
          method: "POST",
          headers: {
            "Client-ID": "kimne78kx3ncx6brgo4mv6wki5h1ko",
            "Content-Type": "application/json",
          },
          body: JSON.stringify([query]),
        });
        const json = await res.json();
        const edge = json?.[0]?.data?.game?.streams?.edges?.[0];
        const channelLogin = edge?.node?.broadcaster?.login || edge?.node?.broadcaster?.displayName;
        if (!cancelled && channelLogin) {
          setTopTwitchChannel(channelLogin.toLowerCase());
        }
      } catch (err) {
        console.warn("Failed to fetch top chess stream, using default channel.", err);
      }
    };
    fetchTopChessStream();
    return () => {
      cancelled = true;
    };
  }, []);

  const twitchSrc = useMemo(() => {
    const base = `https://player.twitch.tv/?channel=${encodeURIComponent(topTwitchChannel)}`;
    const params = `&parent=${encodeURIComponent(twitchParent)}&muted=true&autoplay=false`;
    return base + params;
  }, [topTwitchChannel, twitchParent]);

  return (
    <AppShell>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Hi, {user.chessUsername || user.displayName}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                Level {user.level}
              </div>
              <div className="px-3 py-1 rounded-full bg-brand.pink/20 text-white border border-white/20">
                {user.subscriptionActive ? user.subscriptionPlan : "Free"}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm text-white/70">
              <span>Total XP</span>
              <span className="text-white font-semibold">{user.totalXp}</span>
            </div>
            <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40 shadow-inner">
              <div className="flex items-center justify-between px-3 py-2 text-xs text-white/70 border-b border-white/10">
                <span className="font-semibold text-white">Chess TV</span>
                <span className="uppercase tracking-wide text-[10px] text-white/60">Live on Twitch</span>
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
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle>Suggested Courses</CardTitle>
              <Button variant="outline" onClick={() => navigate("/courses")}>
                Browse all
              </Button>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4">
              {(data?.suggested || []).map((course) => (
                <div key={course.id} className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                  <img src={course.thumbnailUrl} alt={course.title} className="h-28 w-full object-cover" />
                  <div className="p-4 space-y-2">
                    <div className="text-sm text-brand.pink uppercase tracking-wide">Suggested</div>
                    <div className="font-semibold">{course.title}</div>
                    <p className="text-sm text-white/70 line-clamp-3">{course.description}</p>
                    <Button className="w-full" onClick={() => navigate(`/lesson/${course.id}`)}>
                      Continue
                    </Button>
                  </div>
                </div>
              ))}
              {!data && <div className="text-white/70 text-sm">Loading dashboard...</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-2">
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5 text-emerald-300" />
                AI Practice
              </CardTitle>
              <p className="text-white/75 text-sm">
                Sharpen openings, tactics, and endgames with adaptive difficulty and live XP tracking.
              </p>
            </CardHeader>
            <CardContent className="grid md:grid-cols-[1fr_auto] gap-4 items-center">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full overflow-hidden border border-white/10 shadow-lg">
                  <img src={southKnightImg} alt="The South Knight" className="h-full w-full object-cover" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-white/70">Train with the South Knight</div>
                  <div className="text-base font-semibold text-white">Custom sparring sessions, instant XP.</div>
                </div>
              </div>
              <div className="flex flex-col gap-3 w-full md:w-auto">
                <Button size="lg" onClick={() => navigate("/practice")}>
                  Play Training Bot
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
