import { useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "../components/ui/Button";
import loginBg from "../assets/Login screen.png";
import pawnPointIcon from "../assets/App tab icon.png";
import { CheckCircle2, Key } from "lucide-react";

export default function Pricing() {
  const [, navigate] = useLocation();
  const gradientShiftKeyframes = `
    @keyframes pricingGradientShift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
  `;
  const typewriterKeyframes = `
    @keyframes pricingType {
      from { max-width: 0ch; }
      to { max-width: 32ch; }
    }
  `;
  const gradientTextStyle = useMemo(
    () =>
      ({
        color: "#ffffff",
        display: "inline-block",
        overflow: "hidden",
        whiteSpace: "nowrap",
        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        maxWidth: "0ch",
        animation: "pricingType 2.4s steps(32, end) forwards",
      }) as const,
    [],
  );

  return (
    <>
      <style>{`${gradientShiftKeyframes}\n${typewriterKeyframes}`}</style>
      <div className="min-h-screen relative bg-slate-950 text-white flex flex-col items-center justify-center px-4 py-10">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: `url(${loginBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-slate-950/50 to-black/60" />
        <div className="relative z-10 w-full max-w-5xl space-y-8">
          <div
            className="flex items-center justify-center gap-3 absolute left-1/2 -translate-x-1/2 z-20"
            style={{ top: "-200px" }}
          >
            <img src={pawnPointIcon} alt="Pawn Point logo" className="h-16 w-16 object-contain" />
            <div className="text-3xl font-semibold">Pawn Point</div>
          </div>

          <div
            className="rounded-3xl border border-white/10 backdrop-blur-xl p-8 shadow-2xl space-y-6 max-w-4xl mx-auto"
            style={{ backgroundColor: "#2d3749" }}
          >
            <div className="flex items-center justify-center gap-2 text-brand.pink">
              <span className="h-1 w-12 rounded-full bg-brand.pink" />
              <span className="h-1 w-12 rounded-full bg-brand.pink" />
              <span className="h-1 w-12 rounded-full bg-brand.pink" />
              <span className="h-1 w-12 rounded-full bg-brand.pink" />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4 text-white">
                <div
                  className="flex items-center gap-3 text-2xl font-bold"
                  style={{ fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif" }}
                >
                  <Key className="h-7 w-7 text-amber-300" />
                  <span style={gradientTextStyle} className="text-white">
                    Unlock your competitive edge
                  </span>
                </div>
                <ul className="space-y-3 text-xl text-white">
                  {[
                    "Elite Opening & Middlegame Library",
                    "Global Rankings & Standings",
                    "SquareBase",
                    "Training Groups",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-brand.pink" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-800/80 rounded-2xl border border-white/10 p-6 flex flex-col gap-6">
                <div className="flex items-start justify-between w-full">
                  <div className="text-2xl font-bold">Monthly Plan</div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-brand.pink">$25.00</div>
                    <div className="text-sm text-white/70">/ Month</div>
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-center text-sm text-white/70">
                  Checkout available in the app.
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" className="px-6" onClick={() => navigate("/dashboard")}>
                Back to App
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
