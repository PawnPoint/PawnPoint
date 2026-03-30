import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useLocation } from "wouter";
import {
  Menu,
  X,
  LogOut,
  Home,
  Dumbbell,
  UserRound,
  Settings,
  MessageCircle,
  XCircle,
  Gift,
  ArrowLeft,
  Crown,
  ChevronDown,
  Clipboard,
  Puzzle,
  Archive,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { Button } from "./ui/Button";
import pawnPointIcon from "../assets/App tab icon.png";
import avatarFallback from "../assets/Easter Default.png";
import {
  choosePersonalAccount,
  createGroupForUser,
  joinGroupWithCode,
  setAdminStatus,
} from "../lib/mockApi";
import { PodiumBarsIcon } from "./icons/PodiumBars";

const baseLinks = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Courses", href: "/courses", icon: Archive },
  { label: "Global Ranks", href: "/ranks", icon: Crown },
  { label: "Standings", href: "/leaderboard", icon: PodiumBarsIcon },
  { label: "Practice", href: "/practice", icon: Dumbbell },
];

const mobileLinkTail = [
  { label: "Puzzles", href: "/puzzles", icon: Puzzle },
  { label: "SquareBase", href: "/squarebase", icon: Clipboard },
  { label: "Profile", href: "/profile", icon: UserRound },
  { label: "Settings", href: "/settings", icon: Settings },
];

const SOUTH_KNIGHTS_GROUP_ID = "south-knight";
const SOUTH_KNIGHTS_GROUP_CODE = "0055";

export function AppShell({
  children,
  backgroundStyle,
  backgroundOverlay,
}: {
  children: React.ReactNode;
  backgroundStyle?: CSSProperties;
  backgroundOverlay?: React.ReactNode;
}) {
  const { user, logout, setUser } = useAuth();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const isLight = false;
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackMood, setFeedbackMood] = useState("Meh");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState("");
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupMode, setGroupMode] = useState<"choose" | "join" | "create">("choose");
  const [groupName, setGroupName] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [groupError, setGroupError] = useState("");
  const [groupBusy, setGroupBusy] = useState(false);

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
  const avatarSrc = user?.avatarUrl || avatarFallback;
  const forceGroupChoice = !!user && !user.accountType;
  const canViewStandings =
    user?.groupId === SOUTH_KNIGHTS_GROUP_ID || user?.groupCode?.includes(SOUTH_KNIGHTS_GROUP_CODE);
  const navLinks = canViewStandings
    ? baseLinks
    : baseLinks.filter((link) => link.href !== "/leaderboard");
  const mobileLinks = [...navLinks, ...mobileLinkTail];

  const emotions = [
    { label: "Angry", emoji: "😠" },
    { label: "Dislike", emoji: "🙁" },
    { label: "Meh", emoji: "😐" },
    { label: "Happy", emoji: "🙂" },
    { label: "Excited", emoji: "🤩" },
  ];

  const themeBg = isLight ? "bg-white text-gray-900" : "bg-gray-950 text-white";
  const headerBg = isLight ? "border-gray-200 bg-white" : "border-gray-800 bg-gray-900";
  const navText = isLight ? "text-gray-700 hover:text-gray-900" : "text-gray-400 dark:hover:text-white";
  const isMehMood = feedbackMood === "Meh";
  const canSubmitFeedback = feedbackText.trim().length > 0;

  useEffect(() => {
    if (forceGroupChoice) {
      setGroupModalOpen(true);
      setGroupMode("choose");
      setGroupError("");
      setGroupName(user?.groupName || "");
      setGroupCode("");
    }
  }, [forceGroupChoice, user?.groupName]);

  useEffect(() => {
    document.body.classList.remove("theme-light");
    document.body.classList.add("theme-dark");
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
    localStorage.setItem("pawnpoint_theme", "dark");
  }, []);

  const practiceRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (practiceOpen && practiceRef.current && !practiceRef.current.contains(e.target as Node)) {
        setPracticeOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutside);
    return () => window.removeEventListener("mousedown", handleOutside);
  }, [practiceOpen]);

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

  const closeGroupModal = () => {
    if (forceGroupChoice) return;
    setGroupModalOpen(false);
    setGroupError("");
    setGroupMode("choose");
  };

  const handlePersonalAccount = async () => {
    setGroupBusy(true);
    setGroupError("");
    try {
      const updated = await choosePersonalAccount();
      if (updated) setUser(updated);
      setGroupModalOpen(false);
    } catch (err: any) {
      setGroupError(err?.message || "Could not switch to a personal account.");
    } finally {
      setGroupBusy(false);
    }
  };

  const executeCreateGroup = async (name: string) => {
    setGroupBusy(true);
    setGroupError("");
    try {
      const result = await createGroupForUser(name);
      if (result?.profile) {
        setUser(result.profile);
        setGroupModalOpen(false);
      }
    } catch (err: any) {
      setGroupError(err?.message || "Could not create the group. Try again.");
    } finally {
      setGroupBusy(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setGroupError("Name your group to continue.");
      return;
    }
    await executeCreateGroup(groupName.trim());
  };

  const handleJoinGroup = async () => {
    if (!groupCode.trim()) {
      setGroupError("Enter the group code shown to you.");
      return;
    }
    setGroupBusy(true);
    setGroupError("");
    try {
      const result = await joinGroupWithCode(groupCode.trim());
      if (result?.profile) {
        setUser(result.profile);
        setGroupModalOpen(false);
      }
    } catch (err: any) {
      setGroupError(err?.message || "Could not join that group.");
    } finally {
      setGroupBusy(false);
    }
  };

  return (
    <div className={`min-h-screen ${themeBg} relative overflow-x-hidden`} style={backgroundStyle}>
      {backgroundOverlay}
      <div className="relative z-10">
        <header className={`pp-shell-header sticky top-0 z-20 border-b ${headerBg}`}>
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg overflow-hidden flex items-center justify-center">
              <img src={pawnPointIcon} alt="Pawn Point logo" className="h-full w-full object-cover" />
            </div>
            <span className="text-lg font-bold tracking-tight">Pawn Point</span>
          </div>

          <nav className={`hidden md:flex items-center gap-1 text-sm font-medium ${navText}`}>
            {navLinks.map(({ href, label, icon: Icon }) => {
              const iconSize = Icon === PodiumBarsIcon ? "h-5 w-5" : "h-4 w-4";
              if (label === "Practice") {
                return (
                  <div key={href} className="relative" ref={practiceRef}>
                    <button
                      onClick={() => {
                        setPracticeOpen((v) => !v);
                        setProfileOpen(false);
                      }}
                      className={`flex items-center gap-2 rounded-md px-3 py-2 transition-colors ${
                        isLight
                          ? "hover:text-gray-900 hover:bg-gray-100"
                          : "hover:text-white hover:bg-gray-800"
                      }`}
                    >
                      <Icon className={iconSize} />
                      {label}
                      <ChevronDown className={`h-4 w-4 transition-transform ${practiceOpen ? "rotate-180" : ""}`} />
                    </button>
                    {practiceOpen && (
                      <div className={`absolute left-1/2 -translate-x-1/2 top-12 w-48 rounded-lg shadow-lg border z-50 ${
                        isLight
                          ? "bg-white border-gray-200"
                          : "bg-gray-800 border-gray-700"
                      } py-2 transform`}>
                        <button
                          className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                            isLight
                              ? "text-gray-700 hover:bg-gray-50"
                              : "text-gray-200 hover:bg-gray-700"
                          }`}
                          onClick={() => {
                            navigate("/practice");
                            setPracticeOpen(false);
                          }}
                        >
                          <Dumbbell className="h-4 w-4" />
                          Play AI
                        </button>
                        <button
                          className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                            isLight
                              ? "text-gray-700 hover:bg-gray-50"
                              : "text-gray-200 hover:bg-gray-700"
                          }`}
                          onClick={() => {
                            navigate("/puzzles");
                            setPracticeOpen(false);
                          }}
                        >
                          <Puzzle className="h-4 w-4" />
                          Puzzles
                        </button>
                        <button
                          className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                            isLight
                              ? "text-gray-700 hover:bg-gray-50"
                              : "text-gray-200 hover:bg-gray-700"
                          }`}
                          onClick={() => {
                            navigate("/squarebase");
                            setPracticeOpen(false);
                          }}
                        >
                          <Clipboard className="h-4 w-4" />
                          SquareBase
                        </button>
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 transition-colors ${
                    isLight
                      ? "hover:text-gray-900 hover:bg-gray-100"
                      : "hover:text-white hover:bg-gray-800"
                  }`}
                >
                  <Icon className={iconSize} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-2 relative">
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className={`relative flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                isLight
                  ? "border-gray-200 bg-gray-50 text-gray-900 hover:bg-gray-100"
                  : "border-gray-700 bg-gray-800 text-white hover:bg-gray-700"
              }`}
              aria-haspopup="menu"
              aria-expanded={profileOpen}
            >
              <div className={`h-8 w-8 rounded-full overflow-hidden border ${
                isLight ? "border-gray-200" : "border-gray-700"
              }`}>
                <img
                  src={avatarSrc}
                  alt="Profile avatar"
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.src = avatarFallback;
                  }}
                />
              </div>
              <div className="text-left">
                <div className="text-xs opacity-75">Level {level}</div>
                <div className="text-sm font-semibold">{xp} XP</div>
              </div>
            </button>
            {profileOpen && (
              <div className={`absolute left-1/2 -translate-x-1/2 top-14 w-56 rounded-lg shadow-lg border z-50 ${
                isLight
                  ? "bg-white border-gray-200"
                  : "bg-gray-800 border-gray-700"
              } py-2 transform`}>
                <div className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full overflow-hidden border ${
                      isLight ? "border-gray-200" : "border-gray-700"
                    }`}>
                      <img
                        src={avatarSrc}
                        alt="Profile avatar"
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.src = avatarFallback;
                        }}
                      />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{nameLabel}</div>
                      <div className="text-xs text-green-500 font-semibold">
                        LVL {level} | {xp} XP
                      </div>
                      {user?.accountType && (
                        <div className="text-[10px] opacity-50">
                          {user.accountType === "group" ? "Group account" : "Personal account"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className={`px-2 space-y-1 text-sm ${
                  isLight ? "text-gray-700" : "text-gray-300"
                }`}>
                  <button
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left ${
                      isLight
                        ? "hover:bg-gray-100"
                        : "hover:bg-gray-700"
                    }`}
                    onClick={() => {
                      navigate("/profile");
                      setProfileOpen(false);
                    }}
                  >
                    <UserRound className="h-4 w-4" />
                    My Profile
                  </button>
                  <button
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left ${
                      isLight
                        ? "hover:bg-gray-100"
                        : "hover:bg-gray-700"
                    }`}
                    onClick={() => {
                      navigate("/settings");
                      setProfileOpen(false);
                    }}
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                  <button
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left ${
                      isLight
                        ? "hover:bg-gray-100"
                        : "hover:bg-gray-700"
                    }`}
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
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left ${
                      isLight
                        ? "hover:bg-gray-100"
                        : "hover:bg-gray-700"
                    }`}
                    onClick={() => {
                      logout();
                      navigate("/login");
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            className="md:hidden h-10 w-10 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <div className={`pp-mobile-menu md:hidden border-t ${
            isLight ? "border-gray-200 bg-gray-50" : "border-gray-800 bg-gray-900"
          }`}>
            <div className="px-4 py-4 space-y-4">
              {user && (
                <div className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                  isLight
                    ? "border-gray-200 bg-white"
                    : "border-gray-700 bg-gray-800"
                }`}>
                  <div className={`h-10 w-10 rounded-lg overflow-hidden border ${
                    isLight ? "border-gray-200" : "border-gray-700"
                  }`}>
                    <img
                      src={avatarSrc}
                      alt="Profile avatar"
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.src = avatarFallback;
                      }}
                    />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{nameLabel}</div>
                    <div className="text-xs opacity-75">
                      LVL {level} • {xp} XP
                    </div>
                  </div>
                </div>
              )}
              <div className="pp-mobile-link-grid grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm font-medium">
                {mobileLinks.map(({ href, label, icon: Icon }) => {
                  const iconSize = Icon === PodiumBarsIcon ? "h-5 w-5" : "h-4 w-4";
                  return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-3 transition-colors ${
                      isLight
                        ? "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                        : "border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                    onClick={() => setOpen(false)}
                  >
                    <Icon className={iconSize} />
                    {label}
                  </Link>
                );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="flex-1 min-w-[120px]"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

        <main className="pp-shell-main w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1500px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {children}
        </main>
      </div>

      {groupModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4">
          <div className={`pp-modal w-full max-w-lg rounded-lg border p-6 space-y-4 ${
            isLight
              ? "bg-white border-gray-200 shadow-lg"
              : "bg-gray-900 border-gray-800 shadow-xl"
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">
                  {forceGroupChoice ? "Choose your account type" : "Switch account"}
                </div>
                <div className={`text-sm mt-1 ${
                  isLight ? "text-gray-600" : "text-gray-400"
                }`}>
                  Pick personal to keep your data private, or join/create a group to share courses and leaderboards only with members.
                </div>
              </div>
              {!forceGroupChoice && (
                <button
                  className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    isLight
                      ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                  }`}
                  onClick={closeGroupModal}
                  aria-label="Close group dialog"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {groupError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
                {groupError}
              </div>
            )}

            {groupMode === "choose" && (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  fullWidth
                  className="!justify-start !items-start text-left px-4 py-3"
                  onClick={handlePersonalAccount}
                  disabled={groupBusy}
                >
                  <div className="text-left flex flex-col items-start gap-1">
                    <div className="font-semibold text-sm">Personal Account</div>
                    <div className="text-xs opacity-75">Only you can see your courses and leaderboard data.</div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  className="!justify-start !items-start text-left px-4 py-3"
                  onClick={() => {
                    setGroupMode("join");
                    setGroupError("");
                  }}
                  disabled={groupBusy}
                >
                  <div className="text-left flex flex-col items-start gap-1">
                    <div className="font-semibold text-sm">Join a Group</div>
                    <div className="text-xs opacity-75">Use a #1234 code that was shared with you.</div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  className="!justify-start !items-start text-left px-4 py-3"
                  onClick={() => {
                    setGroupMode("create");
                    setGroupError("");
                  }}
                  disabled={groupBusy}
                >
                  <div className="text-left flex flex-col items-start gap-1">
                    <div className="font-semibold text-sm">Create a Group</div>
                    <div className="text-xs opacity-75">Generate a private code and invite teammates.</div>
                  </div>
                </Button>
              </div>
            )}

            {groupMode === "join" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm opacity-75">
                  <span>Enter the group code</span>
                  <button
                    className="flex items-center gap-1 opacity-75 hover:opacity-100 text-xs"
                    onClick={() => setGroupMode("choose")}
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Back
                  </button>
                </div>
                <input
                  value={groupCode}
                  onChange={(e) => setGroupCode(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isLight
                      ? "bg-white border-gray-300 text-gray-900"
                      : "bg-gray-800 border-gray-700 text-white"
                  }`}
                  placeholder="#1234"
                />
                <Button fullWidth onClick={handleJoinGroup} disabled={groupBusy}>
                  {groupBusy ? "Joining..." : "Join Group"}
                </Button>
              </div>
            )}

            {groupMode === "create" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm opacity-75">
                  <span>Name your group</span>
                  <button
                    className="flex items-center gap-1 opacity-75 hover:opacity-100 text-xs"
                    onClick={() => setGroupMode("choose")}
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Back
                  </button>
                </div>
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isLight
                      ? "bg-white border-gray-300 text-gray-900"
                      : "bg-gray-800 border-gray-700 text-white"
                  }`}
                  placeholder="Team Knights"
                />
                <Button fullWidth onClick={handleCreateGroup} disabled={groupBusy}>
                  {groupBusy ? "Creating..." : "Create Group"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {feedbackOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 px-4">
          <div className={`pp-modal w-full max-w-md rounded-lg border p-6 ${
            isLight
              ? "bg-white border-gray-200 shadow-lg"
              : "bg-gray-900 border-gray-800 shadow-xl"
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Feedback</h2>
              <button onClick={closeFeedback} className={`p-1 rounded-lg ${
                isLight
                  ? "hover:bg-gray-100 text-gray-600"
                  : "hover:bg-gray-800 text-gray-400"
              }`}>
                <XCircle className="h-4 w-4" />
              </button>
            </div>
            <div className={`text-sm mb-3 ${isLight ? "text-gray-600" : "text-gray-400"}`}>How do you feel about Pawn Point?</div>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {emotions.map(({ label, emoji }) => {
                const active = feedbackMood === label;
                return (
                  <button
                    key={label}
                    onClick={() => {
                      setFeedbackMood(label);
                      setFeedbackStatus("");
                    }}
                    className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs transition-colors ${
                      active
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300"
                        : isLight
                          ? "border-gray-200 bg-gray-50 text-gray-900 hover:bg-gray-100"
                          : "border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    <span className="text-base">{emoji}</span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
            <div className={`text-sm mb-2 ${isLight ? "text-gray-600" : "text-gray-400"}`}>Tell us why</div>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value.slice(0, 500))}
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 mb-2 ${
                isLight
                  ? "bg-white border-gray-300 text-gray-900"
                  : "bg-gray-800 border-gray-700 text-white"
              }`}
              rows={4}
              placeholder="Share your thoughts..."
            />
            <div className="text-right text-xs opacity-50 mb-4">{feedbackText.length}/500</div>
            <Button
              fullWidth
              onClick={handleFeedbackSubmit}
              disabled={!canSubmitFeedback}
            >
              Submit Feedback
            </Button>
            {feedbackStatus && (
              <div className="mt-3 text-sm bg-green-50 border border-green-200 text-green-800 rounded-lg px-3 py-2 dark:bg-green-950/30 dark:border-green-900/50 dark:text-green-300">
                {feedbackStatus}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
