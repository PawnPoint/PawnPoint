import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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
  ArrowLeft,
  Crown,
  ChevronDown,
  Puzzle,
  Archive,
  Search,
  ListFilter,
  PanelLeftClose,
  PanelLeftOpen,
  LineChart,
  BookOpen,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { Button } from "./ui/Button";
import pawnPointIcon from "../assets/Pawn Point Icon.png";
import avatarFallback from "../assets/Easter Default.png";
import "../pages/dashboard-editorial.css";
import {
  choosePersonalAccount,
  createGroupForUser,
  getUserClubMemberships,
  joinGroupWithCode,
  setAdminStatus,
  switchActiveClub,
  type UserClubMembership,
} from "../lib/mockApi";
import { submitFeedbackInboxMessage } from "../lib/feedbackInbox";
import { PodiumBarsIcon } from "./icons/PodiumBars";
import { checkoutPath } from "../lib/checkoutRedirect";
import { canAccessBlackBook, hasActiveSubscription } from "../lib/access";

const baseLinks = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Courses", href: "/courses", icon: Archive },
  { label: "Global Ranks", href: "/ranks", icon: Crown },
  { label: "Standings", href: "/leaderboard", icon: PodiumBarsIcon },
  { label: "Practice", href: "/practice", icon: Dumbbell },
];

const mobileLinkTail = [
  { label: "Puzzles", href: "/puzzles", icon: Puzzle },
  { label: "Training", href: "/training", icon: Dumbbell },
  { label: "BlackBook", href: "/blackbook", icon: BookOpen },
  { label: "Profile", href: "/profile", icon: UserRound },
  { label: "Settings", href: "/settings", icon: Settings },
];

const SOUTH_KNIGHTS_GROUP_ID = "south-knight";
const SOUTH_KNIGHTS_GROUP_CODE = "0055";

export function AppShell({
  children,
  backgroundStyle,
  backgroundOverlay,
  variant = "dashboard-editorial",
}: {
  children: React.ReactNode;
  backgroundStyle?: CSSProperties;
  backgroundOverlay?: React.ReactNode;
  variant?: "default" | "dashboard-editorial";
}) {
  const { user, logout, setUser } = useAuth();
  const [location, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTrainingOnly, setSearchTrainingOnly] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspaceBusy, setWorkspaceBusy] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");
  const [clubMemberships, setClubMemberships] = useState<UserClubMembership[]>([]);
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
  const userHasActiveSubscription = hasActiveSubscription(user);
  const canViewStandings =
    user?.groupId === SOUTH_KNIGHTS_GROUP_ID || user?.groupCode?.includes(SOUTH_KNIGHTS_GROUP_CODE);
  const navLinks = canViewStandings
    ? baseLinks
    : baseLinks.filter((link) => link.href !== "/leaderboard");
  const mobileLinks = [...navLinks, ...mobileLinkTail];
  const trainingLinks = [
    { label: "Puzzles", href: "/puzzles", icon: Puzzle },
    { label: "Analysis", href: "/analysis", icon: LineChart },
    { label: "Training", href: "/training", icon: Dumbbell },
    { label: "BlackBook", href: "/blackbook", icon: BookOpen },
  ];
  const accountLinks = [
    { label: "Profile", href: "/profile", icon: UserRound },
    { label: "Settings", href: "/settings", icon: Settings },
  ];
  const allSearchLinks = [...navLinks, ...trainingLinks, ...accountLinks];
  const filteredSearchLinks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const scopedLinks = searchTrainingOnly ? trainingLinks : allSearchLinks;
    if (!query) return scopedLinks;
    return scopedLinks.filter((item) => {
      const haystack = `${item.label} ${item.href}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [allSearchLinks, searchQuery, searchTrainingOnly, trainingLinks]);
  const shellNavGroups = [
    { heading: undefined, items: navLinks },
    { heading: "Training", items: trainingLinks },
    { heading: "Account", items: accountLinks },
  ];
  const currentPageTitle =
    [...navLinks, ...trainingLinks, ...accountLinks].find((item) =>
      item.href === "/dashboard" ? location === item.href : location.startsWith(item.href.split("?")[0]),
    )?.label || "Workspace";
  const roleLabel =
    user?.accountType === "group" ? (user?.groupRole === "admin" ? "Admin" : "Student") : "Personal Workspace";
  const accountLabel =
    user?.accountType === "group" && user?.groupName
      ? user.groupName
      : user?.accountType === "personal"
        ? "Personal Workspace"
        : "Pawn Point";

  const emotions = [
    { label: "Angry", emoji: "😠" },
    { label: "Dislike", emoji: "🙁" },
    { label: "Meh", emoji: "😐" },
    { label: "Happy", emoji: "🙂" },
    { label: "Excited", emoji: "🤩" },
  ];

  const editorialShell = variant === "dashboard-editorial";
  const themeBg = isLight ? "bg-white text-gray-900" : "bg-gray-950 text-white";
  const headerBg = isLight ? "border-gray-200 bg-white" : "border-gray-800 bg-gray-900";
  const navText = isLight ? "text-gray-700 hover:text-gray-900" : "text-gray-400 dark:hover:text-white";
  const shellClassName = editorialShell ? "pp-shell-editorial" : themeBg;
  const shellStyle = editorialShell
    ? {
        ...backgroundStyle,
        background: "#141413",
        backgroundColor: "#141413",
        backgroundImage: "none",
        minHeight: "100vh",
        color: "#f3ede3",
      }
    : backgroundStyle;
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
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (practiceOpen && practiceRef.current && !practiceRef.current.contains(e.target as Node)) {
        setPracticeOpen(false);
      }
      if (workspaceOpen && workspaceRef.current && !workspaceRef.current.contains(e.target as Node)) {
        setWorkspaceOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutside);
    return () => window.removeEventListener("mousedown", handleOutside);
  }, [practiceOpen, workspaceOpen]);

  useEffect(() => {
    if (!user?.id) {
      setClubMemberships([]);
      return;
    }
    let cancelled = false;
    getUserClubMemberships(user.id)
      .then((memberships) => {
        if (!cancelled) setClubMemberships(memberships);
      })
      .catch(() => {
        if (!cancelled) setClubMemberships([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.groupId, user?.groupRole]);

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

    try {
      if (!user?.id) {
        setFeedbackStatus("Sign in before sending feedback.");
        return;
      }
      await submitFeedbackInboxMessage({
        senderId: user.id,
        senderName: user.displayName || user.chessUsername || undefined,
        senderEmail: user.email || undefined,
        mood: feedbackMood,
        message: feedbackText,
      });
      closeFeedback();
    } catch (err: any) {
      setFeedbackStatus(err?.message || "Could not send feedback right now.");
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
    if (!userHasActiveSubscription) {
      setGroupModalOpen(false);
      navigate(checkoutPath(location || "/dashboard"));
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

  const isActiveRoute = (href: string) => {
    if (href === "/dashboard") return location === href;
    if (href.includes("?")) return location === href;
    return location.startsWith(href);
  };

  const resetFloatingPanels = () => {
    setProfileOpen(false);
    setPracticeOpen(false);
    setSearchOpen(false);
    setWorkspaceOpen(false);
  };

  const handleNavigate = (href: string) => {
    if (href === "/blackbook" && !canAccessBlackBook(user)) {
      navigate(checkoutPath("/blackbook"));
      setOpen(false);
      resetFloatingPanels();
      return;
    }
    navigate(href);
    setOpen(false);
    resetFloatingPanels();
  };

  const openFeedbackPanel = () => {
    setFeedbackOpen(true);
    setFeedbackMood("Meh");
    setFeedbackText("");
    setFeedbackStatus("");
    setProfileOpen(false);
    setSearchOpen(false);
    setOpen(false);
  };

  const openSearchPanel = (trainingOnly = false) => {
    setSearchTrainingOnly(trainingOnly);
    setSearchOpen(true);
    setProfileOpen(false);
    setWorkspaceOpen(false);
  };

  const handleShellLogout = () => {
    logout();
    navigate("/login");
  };

  const handleWorkspacePersonal = async () => {
    setWorkspaceBusy(true);
    setWorkspaceError("");
    try {
      const updated = await choosePersonalAccount();
      if (updated) setUser(updated);
      setWorkspaceOpen(false);
    } catch (err: any) {
      setWorkspaceError(err?.message || "Could not switch workspace.");
    } finally {
      setWorkspaceBusy(false);
    }
  };

  const handleWorkspaceClub = async (clubId: string) => {
    if (clubId === user?.groupId) {
      setWorkspaceOpen(false);
      return;
    }
    setWorkspaceBusy(true);
    setWorkspaceError("");
    try {
      const updated = await switchActiveClub(clubId);
      if (updated) setUser(updated);
      setWorkspaceOpen(false);
    } catch (err: any) {
      setWorkspaceError(err?.message || "Could not switch club.");
    } finally {
      setWorkspaceBusy(false);
    }
  };

  const handleWorkspaceCreate = () => {
    setWorkspaceOpen(false);
    navigate("/settings?account=switch&mode=create");
  };

  const renderShellNavGroups = (mode: "desktop" | "mobile" = "desktop") => (
    <nav className={mode === "mobile" ? "pp-shell-nav-list pp-shell-nav-list--mobile" : "pp-shell-nav-list"}>
      {shellNavGroups.map((group, groupIndex) => (
        <div className="pp-shell-nav-group" key={group.heading || `primary-${groupIndex}`}>
          {group.heading && <div className="pp-shell-nav-heading">{group.heading}</div>}
          <div className="pp-shell-nav-items">
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = isActiveRoute(href);
              const iconSize = Icon === PodiumBarsIcon ? "h-5 w-5" : "h-4 w-4";
              return (
                <button
                  key={href}
                  type="button"
                  className={`pp-shell-nav-item ${active ? "is-active" : ""}`}
                  onClick={() => handleNavigate(href)}
                  aria-current={active ? "page" : undefined}
                  title={sidebarCollapsed && mode === "desktop" ? label : undefined}
                >
                  <Icon className={iconSize} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className={`min-h-screen relative overflow-x-hidden ${shellClassName}`} style={shellStyle}>
      {editorialShell ? (
        <>
          {backgroundOverlay}
          <div className={`pp-app-frame ${sidebarCollapsed ? "is-collapsed" : ""}`}>
            <aside className="pp-app-sidebar" aria-label="Main navigation">
              <div className="pp-workspace" ref={workspaceRef}>
                <button
                  type="button"
                  className="pp-workspace-switcher"
                  onClick={() => {
                    setWorkspaceOpen((value) => !value);
                    setSearchOpen(false);
                    setProfileOpen(false);
                  }}
                  aria-haspopup="menu"
                  aria-expanded={workspaceOpen}
                >
                  <span className="pp-workspace-mark">
                    <img src={pawnPointIcon} alt="" />
                  </span>
                  <span className="pp-workspace-copy">
                    <strong>{accountLabel}</strong>
                    <span>{roleLabel}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 pp-workspace-chevron" />
                </button>

                {workspaceOpen && (
                  <div className="pp-workspace-menu" role="menu">
                    {user?.accountType === "group" && user?.groupId && (
                      <button
                        type="button"
                        className="pp-workspace-menu-item is-active"
                        onClick={() => setWorkspaceOpen(false)}
                        disabled={workspaceBusy}
                      >
                        {user.groupName || accountLabel}
                      </button>
                    )}

                    <button
                      type="button"
                      className={`pp-workspace-menu-item ${user?.accountType === "personal" ? "is-active" : ""}`}
                      onClick={handleWorkspacePersonal}
                      disabled={workspaceBusy}
                    >
                      Personal Workspace
                    </button>

                    {clubMemberships
                      .filter((club) => club.id !== user?.groupId)
                      .map((club) => (
                        <button
                          type="button"
                          className="pp-workspace-menu-item"
                          key={club.id}
                          onClick={() => handleWorkspaceClub(club.id)}
                          disabled={workspaceBusy || club.locked}
                          title={club.locked ? "This club is paused" : undefined}
                        >
                          <span>{club.name}</span>
                          <em>{club.role === "admin" ? "Admin" : "Student"}</em>
                        </button>
                      ))}

                    {workspaceError && <div className="pp-workspace-error">{workspaceError}</div>}

                    <div className="pp-workspace-divider" />
                    <button type="button" className="pp-workspace-menu-item pp-workspace-create" onClick={handleWorkspaceCreate}>
                      <span aria-hidden="true">+</span>
                      Create Workspace
                    </button>
                  </div>
                )}
              </div>

              <div className="pp-sidebar-search">
                <button type="button" className="pp-sidebar-search-main" onClick={() => openSearchPanel(false)}>
                  <Search className="h-4 w-4" />
                  <span>Search</span>
                </button>
                <button
                  type="button"
                  className={`pp-sidebar-search-filter ${searchTrainingOnly ? "is-active" : ""}`}
                  onClick={() => openSearchPanel(true)}
                  aria-label="Search training tools"
                  title="Search training tools"
                >
                  <ListFilter className="h-4 w-4" />
                </button>
              </div>

              {renderShellNavGroups("desktop")}

              <div className="pp-sidebar-footer">
                <button type="button" className="pp-shell-nav-item" onClick={openFeedbackPanel}>
                  <MessageCircle className="h-4 w-4" />
                  <span>Feedback</span>
                </button>
                <button type="button" className="pp-shell-nav-item" onClick={handleShellLogout}>
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </button>
              </div>
            </aside>

            <div className="pp-app-content">
              <header className="pp-app-topbar">
                <div className="pp-topbar-left">
                  <button
                    type="button"
                    className="pp-shell-icon-button pp-sidebar-toggle"
                    onClick={() => setSidebarCollapsed((value) => !value)}
                    aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  >
                    {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    className="pp-shell-icon-button pp-mobile-nav-toggle"
                    onClick={() => setOpen(true)}
                    aria-label="Open navigation"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                  <div className="pp-shell-breadcrumb" aria-label="Breadcrumb">
                    <span>Pawn Point</span>
                    <span>/</span>
                    <strong>{currentPageTitle}</strong>
                  </div>
                </div>

                <div className="pp-topbar-spacer" aria-hidden="true" />
              </header>

              <main className="pp-shell-main pp-app-main">{children}</main>
            </div>
          </div>

          {open && (
            <div className="pp-mobile-shell" role="dialog" aria-modal="true" aria-label="Navigation menu">
              <button
                type="button"
                className="pp-mobile-shell-backdrop"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
              />
              <aside className="pp-mobile-shell-panel">
                <div className="pp-mobile-shell-head">
                  <div className="pp-workspace-mark">
                    <img src={pawnPointIcon} alt="" />
                  </div>
                  <div>
                    <strong>{accountLabel}</strong>
                    <span>{roleLabel}</span>
                  </div>
                  <button type="button" className="pp-shell-icon-button" onClick={() => setOpen(false)} aria-label="Close navigation">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                {renderShellNavGroups("mobile")}
                <div className="pp-sidebar-footer pp-sidebar-footer--mobile">
                  <button type="button" className="pp-shell-nav-item" onClick={openFeedbackPanel}>
                    <MessageCircle className="h-4 w-4" />
                    <span>Feedback</span>
                  </button>
                  <button type="button" className="pp-shell-nav-item" onClick={handleShellLogout}>
                    <LogOut className="h-4 w-4" />
                    <span>Log out</span>
                  </button>
                </div>
              </aside>
            </div>
          )}

          {searchOpen && (
            <div className="pp-command-overlay" role="dialog" aria-modal="true" aria-label="Quick navigation">
              <button type="button" className="pp-command-backdrop" onClick={() => setSearchOpen(false)} aria-label="Close search" />
              <div className="pp-command-panel">
                <div className="pp-command-input">
                  <Search className="h-4 w-4" />
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search pages and training tools"
                    aria-label="Search Pawn Point"
                  />
                  <button
                    type="button"
                    className={`pp-command-filter ${searchTrainingOnly ? "is-active" : ""}`}
                    onClick={() => setSearchTrainingOnly((value) => !value)}
                    aria-pressed={searchTrainingOnly}
                  >
                    <ListFilter className="h-4 w-4" />
                    <span>{searchTrainingOnly ? "Training" : "All"}</span>
                  </button>
                </div>
                <div className="pp-command-list">
                  {filteredSearchLinks.map(({ href, label, icon: Icon }) => (
                    <button key={href} type="button" onClick={() => handleNavigate(href)}>
                      <Icon className={Icon === PodiumBarsIcon ? "h-5 w-5" : "h-4 w-4"} />
                      <span>{label}</span>
                    </button>
                  ))}
                  {!filteredSearchLinks.length && (
                    <div className="pp-command-empty">No matching pages found.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
      <>
      {backgroundOverlay}
      <div className="relative z-10">
        <header
          className={`pp-shell-header sticky top-0 z-20 border-b ${
            editorialShell ? "pp-shell-header--editorial" : headerBg
          }`}
        >
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="pp-shell-brand-mark h-10 w-10 overflow-hidden flex items-center justify-center">
              <img src={pawnPointIcon} alt="Pawn Point logo" className="h-full w-full object-cover" />
            </div>
            <span className="pp-shell-brand text-lg font-bold tracking-tight">Pawn Point</span>
          </div>

          <nav className={`pp-shell-nav hidden md:flex items-center gap-1 text-sm font-medium ${editorialShell ? "" : navText}`}>
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
                      className={`pp-shell-nav-trigger flex items-center gap-2 px-3 py-2 transition-colors ${
                        editorialShell
                          ? "text-[#a59a89]"
                          : isLight
                            ? "rounded-md hover:text-gray-900 hover:bg-gray-100"
                            : "rounded-md hover:text-white hover:bg-gray-800"
                      }`}
                    >
                      <Icon className={iconSize} />
                      {label}
                      <ChevronDown className={`h-4 w-4 transition-transform ${practiceOpen ? "rotate-180" : ""}`} />
                    </button>
                    {practiceOpen && (
                      <div className={`pp-shell-popover absolute left-1/2 -translate-x-1/2 top-12 w-48 rounded-lg shadow-lg border z-50 ${
                        editorialShell
                          ? ""
                          : isLight
                            ? "bg-white border-gray-200"
                            : "bg-gray-800 border-gray-700"
                      } py-2 transform`}>
                        <button
                          className={`pp-shell-menu-item w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                            editorialShell
                              ? "text-[#f3ede3]"
                              : isLight
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
                          className={`pp-shell-menu-item w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                            editorialShell
                              ? "text-[#f3ede3]"
                              : isLight
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
                          className={`pp-shell-menu-item w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                            editorialShell
                              ? "text-[#f3ede3]"
                              : isLight
                                ? "text-gray-700 hover:bg-gray-50"
                                : "text-gray-200 hover:bg-gray-700"
                          }`}
                          onClick={() => {
                            navigate("/blackbook");
                            setPracticeOpen(false);
                          }}
                        >
                          <BookOpen className="h-4 w-4" />
                          BlackBook
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
                  className={`pp-shell-nav-link flex items-center gap-2 px-3 py-2 transition-colors ${
                    editorialShell
                      ? "text-[#a59a89]"
                      : isLight
                        ? "rounded-md hover:text-gray-900 hover:bg-gray-100"
                        : "rounded-md hover:text-white hover:bg-gray-800"
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
              className={`pp-shell-profile-trigger relative flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                editorialShell
                  ? ""
                  : isLight
                    ? "border-gray-200 bg-gray-50 text-gray-900 hover:bg-gray-100"
                    : "border-gray-700 bg-gray-800 text-white hover:bg-gray-700"
              }`}
              aria-haspopup="menu"
              aria-expanded={profileOpen}
            >
              <div className={`pp-shell-avatar-ring h-8 w-8 rounded-full overflow-hidden border ${
                editorialShell ? "" : isLight ? "border-gray-200" : "border-gray-700"
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
              <div className={`pp-shell-popover absolute left-1/2 -translate-x-1/2 top-14 w-56 rounded-lg shadow-lg border z-50 ${
                editorialShell
                  ? ""
                  : isLight
                    ? "bg-white border-gray-200"
                    : "bg-gray-800 border-gray-700"
              } py-2 transform`}>
                <div className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    <div className={`pp-shell-avatar-ring h-8 w-8 rounded-full overflow-hidden border ${
                      editorialShell ? "" : isLight ? "border-gray-200" : "border-gray-700"
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
                      <div className={`text-xs font-semibold ${editorialShell ? "text-[#d6c5a2]" : "text-green-500"}`}>
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
                  editorialShell ? "text-[#f3ede3]" : isLight ? "text-gray-700" : "text-gray-300"
                }`}>
                  <button
                    className={`pp-shell-menu-item w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left ${
                      editorialShell ? "" : isLight ? "hover:bg-gray-100" : "hover:bg-gray-700"
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
                    className={`pp-shell-menu-item w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left ${
                      editorialShell ? "" : isLight ? "hover:bg-gray-100" : "hover:bg-gray-700"
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
                    className={`pp-shell-menu-item w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left ${
                      editorialShell ? "" : isLight ? "hover:bg-gray-100" : "hover:bg-gray-700"
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
                    className={`pp-shell-menu-item w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left ${
                      editorialShell ? "" : isLight ? "hover:bg-gray-100" : "hover:bg-gray-700"
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
            className={`pp-shell-mobile-toggle md:hidden h-10 w-10 flex items-center justify-center rounded-lg ${
              editorialShell ? "text-[#f3ede3]" : "hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <div className={`pp-mobile-menu pp-shell-mobile-menu md:hidden border-t ${
            editorialShell
              ? ""
              : isLight ? "border-gray-200 bg-gray-50" : "border-gray-800 bg-gray-900"
          }`}>
            <div className="px-4 py-4 space-y-4">
              {user && (
                <div className={`pp-shell-mobile-user flex items-center gap-3 rounded-lg border px-3 py-2 ${
                  editorialShell
                    ? ""
                    : isLight ? "border-gray-200 bg-white" : "border-gray-700 bg-gray-800"
                }`}>
                  <div className={`pp-shell-avatar-ring h-10 w-10 rounded-lg overflow-hidden border ${
                    editorialShell ? "" : isLight ? "border-gray-200" : "border-gray-700"
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
                    className={`pp-shell-mobile-link flex items-center gap-2 rounded-lg border px-3 py-3 transition-colors ${
                      editorialShell
                        ? ""
                        : isLight
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

        <main className={`pp-shell-main w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 ${
          editorialShell
            ? "pp-shell-main--editorial"
            : "max-w-6xl xl:max-w-7xl 2xl:max-w-[1500px]"
        }`}>
          {children}
        </main>
      </div>
      </>
      )}

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
