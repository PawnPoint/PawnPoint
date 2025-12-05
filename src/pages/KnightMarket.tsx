import { AppShell } from "../components/AppShell";
import { Button } from "../components/ui/Button";
import { Sparkles, Gem, Crown, Wand2, ShieldHalf, Gift } from "lucide-react";

const items = [
  {
    title: "Grandmaster's Cloak",
    description: "Unlock a dramatic arrival animation.",
    price: 0,
    icon: <Crown className="h-10 w-10 text-indigo-200" />,
    action: "Purchase",
    accent: "from-[#1b1c3c] via-[#10122a] to-[#08091a] border-[#3b3f70]/50",
    glow: "shadow-[0_0_35px_10px_rgba(99,102,241,0.25)]",
  },
  {
    title: "Arcane Knight Trail",
    description: "Leave a luminous trail behind your moves.",
    price: 500,
    icon: <ShieldHalf className="h-10 w-10 text-cyan-200" />,
    action: "500",
    accent: "from-[#0f1b32] via-[#0b1326] to-[#060b18] border-[#3ea8ff]/40",
    glow: "shadow-[0_0_35px_10px_rgba(56,189,248,0.25)]",
  },
  {
    title: "Mystic Board Skin",
    description: "A crystalline board for your battles.",
    price: 0,
    icon: <Wand2 className="h-10 w-10 text-amber-200" />,
    action: "Purchase",
    accent: "from-[#2b1c0f] via-[#130d08] to-[#0a0705] border-[#fbbf24]/30",
    glow: "shadow-[0_0_35px_10px_rgba(251,191,36,0.18)]",
  },
  {
    title: "Enchanted Move Trails",
    description: "Glowing move indicators on every play.",
    price: 300,
    icon: <Sparkles className="h-10 w-10 text-indigo-200" />,
    action: "300",
    accent: "from-[#14113a] via-[#0e0c29] to-[#08081a] border-[#818cf8]/30",
    glow: "shadow-[0_0_35px_10px_rgba(129,140,248,0.25)]",
  },
];

export default function KnightMarket() {
  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 pb-16">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500/50 to-slate-900/60 border border-indigo-300/30 flex items-center justify-center">
            <Gift className="h-6 w-6 text-indigo-100" />
          </div>
          <div>
            <div className="text-sm text-indigo-200 font-semibold uppercase tracking-[0.2em]">Knight</div>
            <div className="text-3xl font-bold text-white">Market</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {items.map((item) => (
            <div
              key={item.title}
              className={`relative overflow-hidden rounded-3xl border ${item.accent} bg-gradient-to-br ${item.glow} px-6 py-8`}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_35%)] pointer-events-none" />
              <div className="flex flex-col items-center text-center gap-4 relative">
                <div className="h-24 w-24 rounded-full bg-black/30 border border-white/10 flex items-center justify-center">
                  {item.icon}
                </div>
                <div className="text-xl font-bold tracking-wide text-white">{item.title}</div>
                <div className="text-sm text-white/60 max-w-xs">{item.description}</div>
                <div className="flex items-center gap-2 text-cyan-100 font-semibold">
                  {item.price > 0 && <Gem className="h-5 w-5" />}
                  {item.price > 0 ? item.price : ""}
                </div>
                <Button
                  variant="outline"
                  className="bg-indigo-600/30 border-indigo-300/30 hover:bg-indigo-500/40 min-w-[140px]"
                >
                  {item.action}
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-center">
          <Button className="px-6">Cash in XP</Button>
        </div>
      </div>
    </AppShell>
  );
}
