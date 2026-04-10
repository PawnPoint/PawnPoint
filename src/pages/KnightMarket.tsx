import { AppShell } from "../components/AppShell";
import { Button } from "../components/ui/Button";
import { Sparkles, Gem, Crown, Wand2, ShieldHalf, Gift } from "lucide-react";

const items = [
  {
    title: "Grandmaster's Cloak",
    description: "Unlock a dramatic arrival animation.",
    price: 0,
    icon: <Crown className="h-10 w-10 text-[#d6c5a2]" />,
    action: "Purchase",
  },
  {
    title: "Arcane Knight Trail",
    description: "Leave a luminous trail behind your moves.",
    price: 500,
    icon: <ShieldHalf className="h-10 w-10 text-[#d6c5a2]" />,
    action: "500",
  },
  {
    title: "Mystic Board Skin",
    description: "A crystalline board for your battles.",
    price: 0,
    icon: <Wand2 className="h-10 w-10 text-[#d6c5a2]" />,
    action: "Purchase",
  },
  {
    title: "Enchanted Move Trails",
    description: "Glowing move indicators on every play.",
    price: 300,
    icon: <Sparkles className="h-10 w-10 text-[#d6c5a2]" />,
    action: "300",
  },
];

export default function KnightMarket() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6 pb-16">
        <div className="rounded-[18px] border border-[rgba(214,197,162,0.14)] bg-[#1b1713] px-6 py-7 shadow-[0_24px_60px_rgba(0,0,0,0.22)]">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-[rgba(214,197,162,0.14)] bg-[#201a15]">
              <Gift className="h-6 w-6 text-[#d6c5a2]" />
            </div>
            <div>
              <div className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[#8d8374]">
                Knight Market
              </div>
              <div className="mt-3 text-4xl font-medium tracking-tight text-[#f3ede3] [font-family:'Newsreader',Georgia,serif]">
                Unlockables for your training profile
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#b5aa9a]">
                Cosmetics, trails, and board extras now sit inside the same editorial black system as the rest of
                the app.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.title}
              className="rounded-[18px] border border-[rgba(214,197,162,0.14)] bg-[#181410] px-6 py-8 shadow-[0_24px_60px_rgba(0,0,0,0.18)]"
            >
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-full border border-[rgba(214,197,162,0.14)] bg-[#201a15]">
                  {item.icon}
                </div>
                <div className="text-xl font-semibold tracking-wide text-[#f3ede3]">{item.title}</div>
                <div className="max-w-xs text-sm text-[#b5aa9a]">{item.description}</div>
                <div className="flex items-center gap-2 font-semibold text-[#d6c5a2]">
                  {item.price > 0 && <Gem className="h-5 w-5" />}
                  {item.price > 0 ? item.price : ""}
                </div>
                <Button
                  variant="outline"
                  className="min-w-[140px] border-[rgba(214,197,162,0.14)] bg-transparent text-[#f3ede3]"
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
