import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Menu,
  X,
  LogOut,
  Home,
  BookOpen,
  Trophy,
  Target,
  UserRound,
  Settings,
  MessageCircle,
  Moon,
  Sun,
  XCircle,
  Gift,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { Button } from "./ui/Button";
import pawnPointIcon from "../assets/Pawn Point Icon.png";
import { setAdminStatus } from "../lib/mockApi";

const links = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "All Courses", href: "/courses", icon: BookOpen },
  { label: "Leaderboards", href: "/leaderboard", icon: Trophy },
  { label: "Practice", href: "/practice", icon: Target },
];

const mobileLinks = [
  ...links,
  { label: "Profile", href: "/profile", icon: UserRound },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout, setUser } = useAuth();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isLight, setIsLight] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackMood, setFeedbackMood] = useState("Meh");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState("");

  const nameLabel = user?.chessUsername || user?.displayName || user?.email?.split("@")[0] || "Player";
  const initials =
    nameLabel
      ?.split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "PP";
  const level = user?.level ?? 1;
  const xp = user?.totalXp ?? 0;

  const emotions = [
    { label: "Angry", emoji: "😠" },
    { label: "Dislike", emoji: "🙁" },
    { label: "Meh", emoji: "😐" },
    { label: "Happy", emoji: "🙂" },
    { label: "Excited", emoji: "🤩" },
  ];

  const themeBg = isLight ? "bg-slate-50 text-slate-900" : "bg-slate-950 text-white";
  const headerBg = isLight ? "border-slate-200 bg-white/90" : "border-white/10 bg-slate-950/80";
  const navText = isLight ? "text-slate-700" : "text-white/80";
  const isMehMood = feedbackMood === "Meh";
  const canSubmitFeedback = feedbackText.trim().length > 0;

  const closeFeedback = () => {
    setFeedbackOpen(false);
    setFeedbackMood("Meh");
    setFeedbackText("");
    setFeedbackStatus("");
  };

  const handleFeedbackSubmit = async () => {
    if (!canSubmitFeedback) return;
    const key = feedbackText.trim();
    const isAdminKey = key === "TSEC0ADMIN";
    const isStandardKey = key === "TSEC0STANDARD";

    if (!isMehMood && (isAdminKey || isStandardKey)) {
      setFeedbackStatus("Admin keys only work when MEH is selected.");
      return;
    }

    if (isMehMood && (isAdminKey || isStandardKey)) {
      if (isAdminKey) {
        const updated = await setAdminStatus(true);
        if (updated) {
          setUser(updated);
          setFeedbackStatus("Admin privileges unlocked. Editing tools are now visible.");
        } else {
          setFeedbackStatus("Key rejected. No status change applied.");
        }
      } else if (isStandardKey) {
        const updated = await setAdminStatus(false);
        if (updated) {
          setUser(updated);
          setFeedbackStatus("Admin privileges removed. You are back to standard access.");
        } else {
          setFeedbackStatus("Key rejected. No status change applied.");
        }
      }
      setFeedbackText("");
      return;
    }

    if (feedbackText.trim()) {
      closeFeedback();
    }
  };

  return (
    <div className={`min-h-screen ${themeBg}`}>
      <header className={`sticky top-0 z-20 border-b ${headerBg} backdrop-blur`}>
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-[0_12px_30px_rgba(0,0,0,0.25)] overflow-hidden">
              <img src={pawnPointIcon} alt="Pawn Point logo" className="h-full w-full object-cover" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight">Pawn Point</span>
          </div>

          <nav className={`hidden md:flex items-center gap-6 text-sm ${navText}`}>
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 hover:text-white ${isLight ? "hover:text-slate-900" : ""}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3 relative">
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className={`relative flex items-center gap-3 rounded-full border px-3 py-2 hover:bg-white/10 transition ${
                isLight ? "border-slate-200 bg-white text-slate-900" : "border-white/10 bg-white/5 text-white"
              }`}
              aria-haspopup="menu"
              aria-expanded={profileOpen}
            >
              {user?.avatarUrl ? (
                <div className="h-9 w-9 rounded-full overflow-hidden border border-white/20 shadow-glow">
                  <img src={user.avatarUrl} alt="Profile avatar" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-sm font-bold text-white shadow-glow">
                  {initials}
                </div>
              )}
              <div className="text-left">
                <div className="text-xs text-white/60">Level {level}</div>
                <div className="text-sm font-semibold text-white/90">{xp} XP</div>
              </div>
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-14 w-56 rounded-2xl bg-slate-800 shadow-2xl border border-white/10 py-3">
                <div className="px-4 pb-3">
                  <div className="flex items-center gap-3">
                    {user?.avatarUrl ? (
                      <div className="h-8 w-8 rounded-full overflow-hidden border border-white/20 shadow-glow">
                        <img src={user.avatarUrl} alt="Profile avatar" className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                        {initials}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-semibold text-white">{nameLabel}</div>
                      <div className="text-xs text-emerald-300 font-semibold">
                        LVL {level} | {xp} XP
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-2 space-y-1 text-sm text-white/80">
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 text-left"
                    onClick={() => {
                      navigate("/profile");
                      setProfileOpen(false);
                    }}
                  >
                    <UserRound className="h-4 w-4" />
                    My Profile
                  </button>
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 text-left"
                    onClick={() => {
                      navigate("/settings");
                      setProfileOpen(false);
                    }}
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 text-left"
                    onClick={() => {
                      setFeedbackOpen(true);
                      setFeedbackMood("Meh");
                      setFeedbackText("");
                      setFeedbackStatus("");
                    }}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Feedback
                  </button>
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 text-left"
                    onClick={() => {
                      logout();
                      navigate("/login");
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
                <div className="flex items-center justify-between px-4 pt-3 text-xs text-white/60">
                  <span>Theme</span>
                  <button
                    className="flex items-center gap-2 rounded-full bg-white/10 px-2 py-1 text-white hover:bg-white/20 transition"
                    onClick={() => setIsLight((v) => !v)}
                  >
                    {isLight ? <Sun className="h-4 w-4 text-amber-300" /> : <Moon className="h-4 w-4 text-amber-300" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          <button className="md:hidden text-white/80" onClick={() => setOpen((v) => !v)} aria-label="Toggle navigation">
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open && (
          <div className="md:hidden border-t border-white/10 bg-slate-900/95 backdrop-blur">
            <div className="px-4 py-4 space-y-4">
              {user && (
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  {user?.avatarUrl ? (
                    <div className="h-10 w-10 rounded-full overflow-hidden border border-white/15 shadow-glow">
                      <img src={user.avatarUrl} alt="Profile avatar" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-sm font-bold text-white shadow-glow">
                      {initials}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-semibold">{nameLabel}</div>
                    <div className="text-xs text-white/60">
                      LVL {level} • {xp} XP
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {mobileLinks.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white"
                    onClick={() => setOpen(false)}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
                  onClick={() => setIsLight((v) => !v)}
                >
                  {isLight ? <Sun className="h-4 w-4 text-amber-300" /> : <Moon className="h-4 w-4 text-amber-300" />}
                  <span>Theme</span>
                </button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="flex-1 min-w-[140px]"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>

      {feedbackOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-800 text-white shadow-2xl border border-white/10 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Feedback</h2>
              <button onClick={closeFeedback} className="p-1 rounded-full hover:bg-white/10 text-white/70">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 text-sm text-white/80">How do you feel about Pawn Point?</div>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {emotions.map(({ label, emoji }) => {
                const active = feedbackMood === label;
                return (
                  <button
                    key={label}
                    onClick={() => {
                      setFeedbackMood(label);
                      setFeedbackStatus("");
                    }}
                    className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-2 text-xs ${
                      active
                        ? "border-blue-400 bg-blue-500/20 text-white"
                        : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-lg">{emoji}</span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 text-sm text-white/80">Tell us why</div>
            <div className="mt-2">
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value.slice(0, 500))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-pink-400"
                rows={4}
                placeholder="Share your thoughts..."
              />
              <div className="text-right text-xs text-white/60">{feedbackText.length}/500</div>
            </div>
            <Button
              className={`w-full mt-4 justify-center ${canSubmitFeedback ? "" : "bg-white/10 text-white/50 shadow-none pointer-events-none"}`}
              onClick={handleFeedbackSubmit}
            >
              Submit Feedback
            </Button>
            {feedbackStatus && (
              <div className="mt-3 text-sm text-emerald-200 bg-emerald-500/10 border border-emerald-300/30 rounded-xl px-3 py-2">
                {feedbackStatus}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
