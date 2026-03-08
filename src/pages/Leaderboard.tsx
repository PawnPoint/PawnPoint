import { useState } from "react";
import { AppShell } from "../components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Sparkles, Crown } from "lucide-react";

const pageBackground = {
  backgroundImage: `
    radial-gradient(1200px 600px at 50% -10%, rgba(255, 255, 255, 0.03), transparent 60%),
    linear-gradient(180deg, #0b1220 0%, #0d1628 25%, #0b1220 45%, #0a0f1c 60%, #070a12 75%, #000000 92%)
  `,
  minHeight: "100vh",
  color: "#ffffff",
} as const;

const standingsNames = [
  "Juan-Louis",
  "Zac",
  "Karli",
  "Amy",
  "Lillith",
  "Zander",
  "Wayde",
  "Chris",
  "Jonny",
  "KG",
  "Tayla",
  "Mia",
  "Rosty",
  "Emilio",
  "Ruan",
  "Saklesh",
  "Zenzo",
  "Nano",
  "Khanya",
  "Ryan",
  "Joshua",
];

const midStandingsNames = [
  "Ian",
  "Ethan",
  "Caydence",
  "Tiaan",
  "Alexander(bear)",
  "Elandre",
  "Charlize",
  "Nelita",
  "Mila-ne",
  "Markie",
  "johan",
  "Arina",
  "LXR",
  "Anicka",
  "Lienke",
  "Kabir",
  "Rachael",
  "Darius(1)",
  "Carson",
  "keagan",
  "Cathri Botha",
  "Alexander",
  "Emily",
  "Liam",
  "Seyan",
  "Liam(twin)",
  "Milan (twin)",
  "kevin",
  "Arno",
  "Zai",
  "Maxinmus",
  "Darius(2)",
  "Ruben",
  "Sebastian",
  "AmarokGJ",
];

const standingsGroups = [
  { label: "Group standings", names: standingsNames },
  { label: "Mid players standings", names: midStandingsNames },
];

export default function Leaderboard() {
  const [standingsIndex, setStandingsIndex] = useState(0);
  const activeStandings = standingsGroups[standingsIndex];

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
              <div className="text-xs text-white/60">{activeStandings.label}</div>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
                <div className="text-xs text-white/50">
                  Leaderboard {standingsIndex + 1} of {standingsGroups.length}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="min-w-[110px] disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={() =>
                      setStandingsIndex(
                        (prev) => (prev - 1 + standingsGroups.length) % standingsGroups.length,
                      )
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    className="min-w-[110px] disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={() =>
                      setStandingsIndex((prev) => (prev + 1) % standingsGroups.length)
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
