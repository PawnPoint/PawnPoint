import { useState } from "react";
import { useLocation } from "wouter";
import { LogIn, Moon, Sun } from "lucide-react";
import pawnPointIcon from "../assets/Pawn Point Icon.png";

export default function Landing() {
  const [, navigate] = useLocation();
  const [isLight, setIsLight] = useState(false);

  const toggleTheme = () => setIsLight((prev) => !prev);

  return (
    <div
      className={`min-h-screen relative overflow-hidden ${
        isLight ? "bg-[#f7f7fb] text-slate-900" : "bg-[#0b0f1c] text-white"
      }`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div
          className={`absolute -left-24 top-24 h-72 w-72 ${
            isLight ? "bg-pink-300/30" : "bg-pink-500/20"
          } blur-[120px]`}
        />
        <div
          className={`absolute right-0 top-10 h-96 w-96 ${
            isLight ? "bg-purple-300/30" : "bg-purple-500/25"
          } blur-[160px]`}
        />
      </div>

      <div
        className={`relative ${
          isLight
            ? "bg-white/90 border-b border-slate-200"
            : "bg-[#0b0f1c]/90 border-b border-white/5"
        }`}
      >
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-[0_12px_30px_rgba(0,0,0,0.25)] overflow-hidden">
              <img src={pawnPointIcon} alt="Pawn Point logo" className="h-full w-full object-cover" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight">Pawn Point</span>
          </div>
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={toggleTheme}
              className={`h-9 w-9 rounded-full border flex items-center justify-center transition ${
                isLight
                  ? "bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200"
                  : "bg-white/5 border-white/10 text-white hover:bg-white/10"
              }`}
              aria-label="Toggle theme"
            >
              {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            <button
              onClick={() => navigate("/login")}
              className={`rounded-full px-3 py-2 text-sm font-semibold border transition ${
                isLight
                  ? "border-slate-200 bg-white text-slate-900 hover:bg-slate-100"
                  : "border-white/10 bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              Log in
            </button>
          </div>
          <div
            className={`hidden md:flex items-center gap-4 text-base font-semibold md:translate-x-[-8px] ${
              isLight ? "text-slate-700" : "text-white/80"
            }`}
          >
            <button
              onClick={() => navigate("/login")}
              className={`transition flex items-center gap-2 ${
                isLight ? "hover:text-slate-900" : "hover:text-white"
              }`}
            >
              <LogIn className="h-5 w-5" strokeWidth={2.5} />
              Log in
            </button>
            <button
              onClick={toggleTheme}
              className={`h-9 w-9 rounded-full border flex items-center justify-center transition ${
                isLight
                  ? "bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200"
                  : "bg-white/5 border-white/10 text-white hover:bg-white/10"
              }`}
              aria-label="Toggle theme"
            >
              {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <main className="relative max-w-6xl w-full mx-auto px-4 sm:px-6 pb-20 pt-10 sm:pt-12 min-h-[calc(100vh-64px)] flex items-center">
        <section className="w-full grid md:grid-cols-2 gap-10 sm:gap-12 items-center">
          <div className="space-y-6 relative flex flex-col items-center text-center md:items-start md:text-left">
            <div className="absolute -left-10 -top-6 h-20 w-20 rounded-full bg-pink-500/20 blur-3xl" />
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight text-[#ff0fb3] drop-shadow-[0_10px_35px_rgba(255,15,179,0.35)]">
              Become the Player You Were Meant to Be
            </h1>
            <p
              className={`text-lg leading-relaxed ${
                isLight ? "text-slate-700" : "text-white/80"
              }`}
            >
              Pawn Point gives you the roadmap to real improvement. Learn smarter, train efficient,
              and develop the skills that actually win games.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => navigate("/signup")}
                className="w-full sm:w-auto rounded-full bg-[#ff0fb3] hover:bg-pink-500 text-white px-5 py-3 text-sm font-semibold shadow-[0_10px_30px_rgba(255,15,179,0.35)] transition"
              >
                Start free
              </button>
              <button
                onClick={() => navigate("/login")}
                className={`w-full sm:w-auto rounded-full px-5 py-3 text-sm font-semibold border transition ${
                  isLight
                    ? "border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
                    : "border-white/15 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                I already have an account
              </button>
            </div>
          </div>
          <div className="relative flex justify-center items-center">
            <div className="absolute -inset-10 bg-gradient-to-br from-[#ff0fb3]/25 via-[#7c3aed]/20 to-[#0ea5e9]/25 blur-[140px]" />
            <div
              className={`relative w-full max-w-[320px] sm:max-w-[360px] aspect-square overflow-hidden rounded-[28px] sm:rounded-[32px] border ${
                isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"
              } shadow-[0_20px_60px_rgba(0,0,0,0.45)]`}
            >
              <img
                src={pawnPointIcon}
                alt="Pawn Point icon"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
