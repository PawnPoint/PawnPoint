import { useMemo, useState, useEffect, useRef, useCallback, type ElementType } from "react";
import {
  LogOut,
  UserRound,
  LayoutGrid,
  RotateCcw,
  Mail,
  ShieldOff,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ArrowLeftRight,
  Users,
  AlertTriangle,
  X,
  CreditCard,
  LifeBuoy,
} from "lucide-react";
import { updateEmail as updateAuthEmail } from "firebase/auth";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import {
  getCourses,
  getProgress,
  resetCourseProgress,
  setSuggestedCourses,
  setChessUsername,
  updateBoardTheme,
  choosePersonalAccount,
  createGroupForUser,
  joinGroupWithCode,
  leaveGroup,
  getGroupMembers,
  renameGroup,
  deleteGroup,
  removeGroupMember,
  updateUserEmail,
  type GroupMember,
  type Course,
  type UserProfile,
} from "../lib/mockApi";
import { BOARD_THEMES, resolveBoardTheme } from "../lib/boardThemes";
import { PIECE_THEMES, resolvePieceTheme, type PieceTheme } from "../lib/pieceThemes";
import { auth } from "../lib/firebase";
import { loadPaypalSdk } from "../lib/paypal";

type SettingAction =
  | { type: "button"; label: string; onClick: () => void; variant?: "primary" | "ghost" | "outline" }
  | { type: "toggle"; value: boolean; onToggle: (next: boolean) => void; disabled?: boolean }
  | { type: "disabled"; label: string };

type SettingItem = {
  key: string;
  title: string;
  description: string;
  accent: string;
  icon: ElementType;
  action: SettingAction;
  highlight?: string;
  danger?: boolean;
};

type ChessProfile = {
  username: string;
  name?: string;
  followers?: number;
  country?: string;
  lastOnline?: number;
  status?: string;
  title?: string;
  avatar?: string;
};

type Option = { label: string; value: string };

const PAYPAL_PLAN_ID = "P-6WB96776R94410050NB7H7VA";
const PAYPAL_BUTTON_CONTAINER_ID = "paypal-button-container";
const resolvedEnv = ((import.meta.env.VITE_APP_ENV as string | undefined) || "").trim().toLowerCase();
const APP_ENV =
  resolvedEnv === "sandbox"
    ? "sandbox"
    : resolvedEnv === "live"
      ? "live"
      : import.meta.env.MODE === "production"
        ? "live"
        : "sandbox";
const PAYPAL_CLIENT_ID =
  APP_ENV === "sandbox"
    ? ((import.meta.env.VITE_PAYPAL_SANDBOX_CLIENT_ID as string | undefined) || undefined)
    : ((import.meta.env.VITE_PAYPAL_LIVE_CLIENT_ID as string | undefined) || undefined);
console.info(`[PawnPoint] PayPal env: ${APP_ENV}, client: ${PAYPAL_CLIENT_ID ? "set" : "missing"}`);

export default function Settings() {
  const { user, logout, setUser } = useAuth();
  const [linkedUsername, setLinkedUsername] = useState<string>(() => {
    if (user?.chessUsername) return user.chessUsername;
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split("@")[0];
    return "YourUsername";
  });
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountInput, setAccountInput] = useState("");
  const [accountStatus, setAccountStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [accountError, setAccountError] = useState<string | null>(null);
  const [fetchedProfile, setFetchedProfile] = useState<ChessProfile | null>(null);
  const [boardModalOpen, setBoardModalOpen] = useState(false);
  const [boardTheme, setBoardTheme] = useState(() => resolveBoardTheme(user?.boardTheme).key);
  const [pieceTheme, setPieceTheme] = useState(() => resolvePieceTheme(user?.pieceTheme).key);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetCourses, setResetCourses] = useState<{ course: Course; percent: number }[]>([]);
  const [resetLoading, setResetLoading] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [switchModalOpen, setSwitchModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState(user?.email || "");
  const [emailStatus, setEmailStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [emailError, setEmailError] = useState("");
  const [manageGroupOpen, setManageGroupOpen] = useState(false);
  const [groupJoinCode, setGroupJoinCode] = useState("");
  const [groupNameInput, setGroupNameInput] = useState(user?.groupName || "");
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupActionError, setGroupActionError] = useState("");
  const [groupActionLoading, setGroupActionLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paypalError, setPaypalError] = useState<string | null>(null);
  const [paypalLoading, setPaypalLoading] = useState(false);
  const [paypalReady, setPaypalReady] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const pendingActionRef = useRef<"create-group" | null>(null);
  const paypalButtonsRef = useRef<any>(null);
  const sampleFen = "k5rr/5R2/8/2p1P1p1/1p2Q3/1P6/K2p4/3b4 w - - 0 1";
  const sampleSquares = useMemo(() => buildBoard(sampleFen), []);
  const activePieces = useMemo(() => resolvePieceTheme(pieceTheme).pieces, [pieceTheme]);

  useEffect(() => {
    if (user?.chessUsername) setLinkedUsername(user.chessUsername);
    else if (user?.displayName) setLinkedUsername(user.displayName);
    else if (user?.email) setLinkedUsername(user.email.split("@")[0]);
  }, [user]);

  useEffect(() => {
    setBoardTheme(resolveBoardTheme(user?.boardTheme).key);
  }, [user?.boardTheme]);

  useEffect(() => {
    setPieceTheme(resolvePieceTheme(user?.pieceTheme).key);
  }, [user?.pieceTheme]);

  const inGroup = !!user?.groupId && user?.accountType === "group";
  const isGroupAdmin = inGroup && user?.groupRole === "admin";
  const isPro = !!user?.premiumAccess;

  useEffect(() => {
    setGroupNameInput(user?.groupName || "");
  }, [user?.groupName]);

  useEffect(() => {
    setEmailInput(user?.email || "");
  }, [user?.email]);

  useEffect(() => {
    if (manageGroupOpen && inGroup) {
      getGroupMembers(user?.groupId)
        .then((members) => setGroupMembers(members))
        .catch(() => setGroupMembers([]));
    }
  }, [manageGroupOpen, inGroup, user?.groupId]);

  // Preload PayPal SDK so buttons render on first open.
  useEffect(() => {
    if (!PAYPAL_CLIENT_ID) return;
    loadPaypalSdk(PAYPAL_CLIENT_ID, APP_ENV).catch(() => undefined);
  }, []);

  const fetchTopOpenings = async (username: string): Promise<string[]> => {
    // chess.com archives list
    const archivesResp = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}/games/archives`);
    if (!archivesResp.ok) throw new Error("Could not read game archives for this user.");
    const archivesData = (await archivesResp.json()) as { archives?: string[] };
    const archives = archivesData.archives || [];
    const latest = archives[archives.length - 1];
    if (!latest) return [];
    const gamesResp = await fetch(latest);
    if (!gamesResp.ok) return [];
    const gamesData = (await gamesResp.json()) as { games?: any[] };
    const counts: Record<string, number> = {};
    (gamesData.games || []).slice(-50).forEach((g) => {
      const opening = g?.opening || g?.eco || g?.eco_url;
      if (!opening || typeof opening !== "string") return;
      const name = opening.toLowerCase();
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);
  };

  const mapOpeningsToCourses = (openings: string[], courses: Course[]): string[] => {
    const lowerCourses = courses.map((c) => ({ id: c.id, title: c.title.toLowerCase(), course: c }));
    const picks: string[] = [];
    openings.forEach((op) => {
      const tokens = op.toLowerCase().split(/[^a-z]+/).filter(Boolean);
      const primary = tokens[0] || op.toLowerCase();
      const match = lowerCourses.find(
        (c) =>
          c.title.includes(primary) ||
          tokens.some((t) => t.length > 3 && c.title.includes(t)) ||
          (primary.includes("sicilian") && c.title.includes("dragon")),
      );
      if (match && !picks.includes(match.id)) picks.push(match.id);
    });
    if (!picks.length && courses.length) {
      picks.push(courses[0].id);
    }
    return picks.slice(0, 3);
  };

  const chessUsername = useMemo(() => linkedUsername, [linkedUsername]);
  const handleResetCourse = async (courseId: string) => {
    if (!user) return;
    setResettingId(courseId);
    try {
      await resetCourseProgress(user.id, courseId);
      setResetCourses((prev) => prev.filter((item) => item.course.id !== courseId));
    } finally {
      setResettingId(null);
    }
  };

  const handleEmailUpdate = async () => {
    const next = emailInput.trim();
    if (!next) {
      setEmailError("Enter an email address.");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(next)) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setEmailStatus("loading");
    setEmailError("");
    try {
      const fbUser = auth.currentUser;
      if (!fbUser) throw new Error("Sign in again to change your email.");
      await updateAuthEmail(fbUser, next);
      const updated = await updateUserEmail(next);
      if (updated) setUser(updated);
      setEmailStatus("success");
      setEmailModalOpen(false);
    } catch (err: any) {
      const code = err?.code || "";
      const message =
        code === "auth/requires-recent-login"
          ? "Please sign out and sign back in, then try again to change your email."
          : err?.message || "Could not update email right now.";
      setEmailError(message);
      setEmailStatus("error");
    }
  };

  const openSwitchModal = () => {
    setSwitchModalOpen(true);
    setGroupActionError("");
    setGroupJoinCode("");
    setGroupNameInput(user?.groupName || "");
  };

  const handleLeaveGroup = async () => {
    setGroupActionLoading(true);
    setGroupActionError("");
    try {
      const updated = await leaveGroup();
      if (updated) setUser(updated);
      setSwitchModalOpen(false);
      setManageGroupOpen(false);
    } catch (err: any) {
      setGroupActionError(err?.message || "Could not leave the group.");
    } finally {
      setGroupActionLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!groupJoinCode.trim()) {
      setGroupActionError("Enter the #1234 code to join.");
      return;
    }
    setGroupActionLoading(true);
    setGroupActionError("");
    try {
      const result = await joinGroupWithCode(groupJoinCode.trim());
      if (result?.profile) {
        setUser(result.profile);
        setSwitchModalOpen(false);
      }
    } catch (err: any) {
      setGroupActionError(err?.message || "Could not join that group.");
    } finally {
      setGroupActionLoading(false);
    }
  };

  const executeCreateGroup = async () => {
    if (!groupNameInput.trim()) {
      setGroupActionError("Name your group first.");
      return;
    }
    setGroupActionLoading(true);
    setGroupActionError("");
    try {
      const result = await createGroupForUser(groupNameInput.trim());
      if (result?.profile) {
        setUser(result.profile);
        setSwitchModalOpen(false);
      }
    } catch (err: any) {
      setGroupActionError(err?.message || "Could not create the group.");
    } finally {
      setGroupActionLoading(false);
    }
  };

  const handleSubscriptionSuccess = useCallback(
    async (subscriptionId: string) => {
      try {
        const resp = await fetch("/api/paypal/attach-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscriptionId }),
        });
        const payload = (await resp.json().catch(() => ({}))) as { success?: boolean; profile?: UserProfile; message?: string };
        if (!resp.ok || !payload?.success) {
          throw new Error(payload?.message || "Could not attach subscription.");
        }
        const nextProfile = payload.profile || (user ? { ...user, premiumAccess: true, paypalSubscriptionId: subscriptionId } : null);
        if (nextProfile) setUser(nextProfile);
        setPaypalError(null);
        setPaywallOpen(false);
        const pendingAction = pendingActionRef.current;
        pendingActionRef.current = null;
        if (pendingAction === "create-group") {
          await executeCreateGroup();
        }
      } catch (err: any) {
        setPaypalError(err?.message || "Could not attach subscription.");
      }
    },
    [executeCreateGroup, setUser, user],
  );

  const handleCreateGroup = async () => {
    if (isPro) {
      await executeCreateGroup();
      return;
    }
    pendingActionRef.current = "create-group";
    setPaypalError(null);
    setPaywallOpen(true);
  };

  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    setCancelError(null);
    try {
      const resp = await fetch("/api/paypal/cancel-subscription", { method: "POST" });
      const payload = (await resp.json().catch(() => ({}))) as { success?: boolean; message?: string; profile?: UserProfile };
      if (!resp.ok || !payload?.success) {
        throw new Error(payload?.message || "Could not cancel subscription.");
      }
      if (payload.profile) setUser(payload.profile);
      setCancelModalOpen(false);
    } catch (err: any) {
      setCancelError(err?.message || "Could not cancel subscription.");
    } finally {
      setCancelLoading(false);
    }
  };

  useEffect(() => {
    if (!paywallOpen) {
      if (paypalButtonsRef.current?.close) {
        try {
          paypalButtonsRef.current.close();
        } catch (_) {
          // ignore close errors
        }
      }
      paypalButtonsRef.current = null;
      setPaypalLoading(false);
      const container = document.getElementById(PAYPAL_BUTTON_CONTAINER_ID);
      if (container) container.innerHTML = "";
      return;
    }
    if (!PAYPAL_CLIENT_ID) {
      setPaypalError(`PayPal client ID is not configured for ${APP_ENV} mode.`);
      return;
    }
    setPaypalError(null);
    setPaypalLoading(!paypalReady);
    let cancelled = false;
    loadPaypalSdk(PAYPAL_CLIENT_ID, APP_ENV)
      .then((paypal) => {
        if (cancelled) return;
        if (!paypal || !paypal.Buttons) {
          throw new Error("PayPal SDK unavailable.");
        }
        const container = document.getElementById(PAYPAL_BUTTON_CONTAINER_ID);
        if (!container) {
          throw new Error("PayPal button container not found.");
        }
        if (paypalButtonsRef.current?.close) {
          try {
            paypalButtonsRef.current.close();
          } catch (_) {
            // ignore close errors
          }
        }
        paypalButtonsRef.current = null;
        container.innerHTML = "";
        const buttons = paypal.Buttons({
          style: { shape: "pill", color: "gold", layout: "vertical", label: "subscribe" },
          createSubscription: (_data: any, actions: any) =>
            actions.subscription.create({ plan_id: PAYPAL_PLAN_ID }),
          onApprove: (data: any) => {
            if (cancelled) return;
            if (!data?.subscriptionID) {
              setPaypalError("Missing subscription ID from PayPal.");
              return;
            }
            void handleSubscriptionSuccess(data.subscriptionID);
          },
          onError: (err: any) => {
            if (cancelled) return;
            setPaypalError(err?.message || "PayPal checkout failed. Please try again.");
          },
          onCancel: () => {
            if (cancelled) return;
            setPaypalError("Checkout was canceled.");
          },
        });
        paypalButtonsRef.current = buttons;
        buttons.render(`#${PAYPAL_BUTTON_CONTAINER_ID}`).catch((err: any) => {
          setPaypalError(err?.message || "Could not render PayPal buttons.");
          setPaypalLoading(false);
        });
        setPaypalReady(true);
        setPaypalLoading(false);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setPaypalError(err?.message || "Could not load PayPal. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setPaypalLoading(false);
      });
    return () => {
      cancelled = true;
      if (paypalButtonsRef.current?.close) {
        try {
          paypalButtonsRef.current.close();
        } catch (_) {
          // ignore close errors
        }
      }
      paypalButtonsRef.current = null;
      setPaypalLoading(false);
    };
  }, [handleSubscriptionSuccess, paywallOpen, paypalReady]);

  const handleRenameGroup = async () => {
    if (!groupNameInput.trim()) {
      setGroupActionError("Enter a name for your group.");
      return;
    }
    setGroupActionLoading(true);
    setGroupActionError("");
    try {
      const renamed = await renameGroup(user || null, groupNameInput.trim());
      if (renamed && user) {
        setUser({ ...user, groupName: renamed.name });
      }
    } catch (err: any) {
      setGroupActionError(err?.message || "Could not rename the group.");
    } finally {
      setGroupActionLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (deleteConfirm !== "DELETE") {
      setGroupActionError('Type "DELETE" to confirm.');
      return;
    }
    setGroupActionLoading(true);
    setGroupActionError("");
    try {
      const updated = await deleteGroup(user || null);
      if (updated) setUser(updated);
      setManageGroupOpen(false);
    } catch (err: any) {
      setGroupActionError(err?.message || "Could not delete the group.");
    } finally {
      setGroupActionLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!user) return;
    setGroupActionLoading(true);
    setGroupActionError("");
    try {
      const members = await removeGroupMember(user, memberId);
      setGroupMembers(members);
    } catch (err: any) {
      setGroupActionError(err?.message || "Could not remove that member.");
    } finally {
      setGroupActionLoading(false);
    }
  };

  const filteredMembers = groupMembers.filter((member) => {
    const term = groupSearch.trim().toLowerCase();
    if (!term) return true;
    const name = (member.displayName || member.email || "").toLowerCase();
    return name.includes(term);
  });

  const items: SettingItem[] = [
    {
      key: "switch-account",
      title: "Switch Account",
      description: inGroup
        ? `Currently in ${user?.groupName || "a group"} (${user?.groupCode || "no code yet"})`
        : "Personal account active. Join or create a group to collaborate.",
      accent: "bg-emerald-700",
      icon: ArrowLeftRight,
      action: {
        type: "button",
        label: inGroup ? "Leave or change" : "Create or Join",
        variant: "outline",
        onClick: () => {
          setGroupActionError("");
          openSwitchModal();
        },
      },
    },
    ...(user?.premiumAccess && user?.paypalSubscriptionId
      ? [
          {
            key: "subscription",
            title: "Subscription",
            description: "Manage your Pawn Point Pro billing.",
            accent: "bg-emerald-700",
            icon: CreditCard,
            action: {
              type: "button",
              label: "Cancel Subscription",
              variant: "outline",
              onClick: () => {
                setCancelError(null);
                setCancelModalOpen(true);
              },
            },
          } as SettingItem,
        ]
      : []),
    ...(isGroupAdmin
      ? [
          {
            key: "manage-group",
            title: "Manage Group",
            description: "Invite or remove members, rename the group, or delete it entirely.",
            accent: "bg-emerald-700",
            icon: Users,
            action: {
              type: "button",
              label: "Manage Group",
              variant: "outline",
              onClick: () => {
                setGroupActionError("");
                setDeleteConfirm("");
                setManageGroupOpen(true);
                getGroupMembers(user?.groupId)
                  .then((members) => setGroupMembers(members))
                  .catch(() => setGroupMembers([]));
              },
            },
          } as SettingItem,
        ]
      : []),
    {
      key: "support",
      title: "Support",
      description: "Need help? Send a message to our support team.",
      accent: "bg-emerald-700",
      icon: LifeBuoy,
      action: {
        type: "button",
        label: "Email Support",
        variant: "outline",
        onClick: () => {
          setSupportMessage("");
          setSupportModalOpen(true);
        },
      },
    },
    {
      key: "logout",
      title: "Log Out",
      description: "Sign out from PawnPoint on this device.",
      accent: "bg-emerald-700",
      icon: LogOut,
      action: {
        type: "button",
        label: "Log Out",
        variant: "outline",
        onClick: () => logout(),
      },
    },
    {
      key: "chess",
      title: "Chess.com Account",
      description: "Your account is connected with the following chess.com username:",
      highlight: chessUsername,
      accent: "bg-emerald-700",
      icon: UserRound,
      action: {
        type: "button",
        label: "Change Account",
        variant: "outline",
        onClick: () => {
          setAccountInput(linkedUsername || "");
          setAccountError(null);
          setFetchedProfile(null);
          setAccountStatus("idle");
          setAccountModalOpen(true);
        },
      },
    },
    {
      key: "board",
      title: "Board and Theme Customization",
      description: "Customize your chessboard and chess pieces.",
      accent: "bg-emerald-700",
      icon: LayoutGrid,
      action: {
        type: "button",
        label: "Set up Preferences",
        variant: "outline",
        onClick: () => {
          setBoardModalOpen(true);
        },
      },
    },
    {
      key: "reset",
      title: "Reset Progress",
      description: "Choose which courses to reset",
      accent: "bg-emerald-700",
      icon: RotateCcw,
      action: {
        type: "button",
        label: "Reset Progress",
        variant: "outline",
        onClick: async () => {
          if (!user) return;
          setResetModalOpen(true);
          setResetLoading(true);
          try {
            const [courses, progress] = await Promise.all([getCourses(), getProgress(user.id)]);
            const list = Object.entries(progress || {})
              .map(([courseId, entry]) => {
                const course = courses.find((c) => c.id === courseId);
                if (!course) return null;
                const percent = entry.progressPercent ?? entry.percent ?? 0;
                if (percent <= 0) return null;
                return { course, percent };
              })
              .filter(Boolean) as { course: Course; percent: number }[];
            setResetCourses(list);
          } finally {
            setResetLoading(false);
          }
        },
      },
    },
    {
      key: "email",
      title: "Change Email",
      description: `Your account is registered with: ${user?.email || "unknown"}`,
      accent: "bg-emerald-700",
      icon: Mail,
      action: {
        type: "button",
        label: "Change Email",
        variant: "outline",
        onClick: () => {
          setEmailModalOpen(true);
          setEmailStatus("idle");
          setEmailError("");
          setEmailInput(user?.email || "");
        },
      },
    },
    {
      key: "delete",
      title: "Delete Account",
      description:
        "Important: Deleting your account will permanently remove all your progress and data.",
      accent: "bg-rose-700",
      icon: ShieldOff,
      danger: true,
      action: {
        type: "button",
        label: "Delete Account",
        variant: "outline",
        onClick: () => {},
      },
    },
  ];

  const handleLookupChessCom = async () => {
    const inputRaw = accountInput.trim();
    const username = inputRaw.toLowerCase();
    if (!username) {
      setAccountError("Enter a chess.com username.");
      return;
    }
    setAccountStatus("loading");
    setAccountError(null);
    setFetchedProfile(null);
    try {
      const resp = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}`);
      if (!resp.ok) {
        throw new Error("User not found on chess.com");
      }
      const data = (await resp.json()) as any;
      const profile: ChessProfile = {
        username: data.username,
        name: data.name,
        followers: data.followers,
        country: data.country,
        lastOnline: data.last_online,
        status: data.status,
        title: data.title,
        avatar: data.avatar,
      };
      setFetchedProfile(profile);
      setAccountStatus("success");
    } catch (err: any) {
      setAccountStatus("error");
      setAccountError(err?.message || "Could not find that user. Check the spelling and try again.");
    }
  };

  return (
    <AppShell>
      <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 pb-16">
        <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>
        <div className="rounded-3xl bg-slate-900/90 border border-white/10 shadow-2xl overflow-hidden">
          <div className="divide-y divide-white/5">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.key}
                  className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between hover:bg-white/5"
                >
                  <div className="flex items-start gap-4">
                    <div className={`h-12 w-12 shrink-0 rounded-full border border-white/10 flex items-center justify-center text-white ${item.accent}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-lg font-semibold text-white">{item.title}</div>
                      <div className="text-sm text-white/70 leading-snug">{item.description}</div>
                      {item.highlight && <div className="text-sm font-semibold text-emerald-300">{item.highlight}</div>}
                    </div>
                  </div>

                  <div className="w-full sm:w-[180px] flex justify-start sm:justify-end">
                    {(() => {
                      const action = item.action;
                      if (action.type === "button") {
                        return (
                          <Button
                            variant={action.variant ?? "outline"}
                            className={`w-full sm:w-[180px] min-w-[180px] h-11 justify-center whitespace-nowrap ${item.danger ? "border-rose-300 text-rose-100 hover:bg-rose-500/20" : ""}`}
                            onClick={action.onClick}
                          >
                            {action.label}
                          </Button>
                        );
                      }
                      if (action.type === "toggle") {
                        return (
                          <button
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                              action.value ? "bg-emerald-500" : "bg-white/20"
                            }`}
                            onClick={() => action.onToggle(!action.value)}
                            disabled={action.disabled}
                            aria-pressed={action.value}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                                action.value ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                        );
                      }
                      return (
                        <div className="rounded-full bg-slate-600 text-white/80 px-4 py-2 text-sm select-none">
                          {action.label}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {switchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-xl rounded-3xl bg-slate-900 text-white border border-white/10 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">Switch Account</div>
                <div className="text-sm text-white/70">
                  Personal accounts keep data to yourself. Groups share courses and leaderboards only with members.
                </div>
              </div>
              <button
                className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
                onClick={() => {
                  setSwitchModalOpen(false);
                  setGroupActionError("");
                }}
                aria-label="Close"
              >
                X
              </button>
            </div>

            {groupActionError && (
              <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 text-amber-100 px-3 py-2 text-sm">
                {groupActionError}
              </div>
            )}

            {inGroup ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
                  <div className="text-sm text-white/70">Current group</div>
                  <div className="text-lg font-semibold">{user?.groupName || "Unnamed group"}</div>
                  <div className="text-xs text-white/60">Code: {user?.groupCode || "N/A"}</div>
                </div>
                <Button
                  variant="outline"
                  className="w-full justify-center"
                  onClick={handleLeaveGroup}
                  disabled={groupActionLoading}
                >
                  {groupActionLoading ? "Leaving..." : "Leave group and use personal account"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm font-semibold">Personal account</div>
                  <div className="text-xs text-white/70">You are currently using a personal account.</div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-white/80">Join a group with code</label>
                  <input
                    value={groupJoinCode}
                    onChange={(e) => setGroupJoinCode(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="#1234"
                  />
                  <Button
                    variant="outline"
                    className="w-full justify-center bg-white/5 hover:bg-white/10 border-white/20"
                    onClick={handleJoinGroup}
                    disabled={groupActionLoading}
                  >
                    {groupActionLoading ? "Joining..." : "Join Group"}
                  </Button>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-white/80">Create a new group</label>
                  <input
                    value={groupNameInput}
                    onChange={(e) => setGroupNameInput(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="Team Knights"
                  />
                  <Button
                    variant="outline"
                    className="w-full justify-center bg-white/5 hover:bg-white/10 border-white/20"
                    onClick={handleCreateGroup}
                    disabled={groupActionLoading}
                  >
                    {groupActionLoading ? "Creating..." : "Create Group"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {manageGroupOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 py-10 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-3xl bg-slate-900 text-white border border-white/10 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-semibold">Manage Group</div>
                <div className="text-sm text-white/70">Only members in this group can see these courses and leaderboards.</div>
              </div>
              <button
                className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
                onClick={() => {
                  setManageGroupOpen(false);
                  setGroupActionError("");
                }}
                aria-label="Close"
              >
                X
              </button>
            </div>

            {groupActionError && (
              <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 text-amber-100 px-3 py-2 text-sm">
                {groupActionError}
              </div>
            )}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="text-sm text-white/70">Group name</div>
              <input
                value={groupNameInput}
                  onChange={(e) => setGroupNameInput(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="Team Knights"
                />
                <Button variant="outline" onClick={handleRenameGroup} disabled={groupActionLoading}>
                  {groupActionLoading ? "Saving..." : "Rename Group"}
                </Button>
                <div className="text-xs text-white/60">Code: {user?.groupCode || "No code yet"} (share this to invite)</div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Members</span>
                <span className="text-white/60 text-xs">{groupMembers.length} total</span>
              </div>
              <input
                value={groupSearch}
                onChange={(e) => setGroupSearch(e.target.value)}
                placeholder="Search members"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-400"
              />
              {filteredMembers.length === 0 ? (
                <div className="text-xs text-white/60">No members listed yet.</div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center uppercase">
                          {(member.displayName || member.email || "U").slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-semibold">{member.displayName || "Member"}</div>
                          <div className="text-xs text-white/60">{member.role === "admin" ? "Admin" : "Member"}</div>
                        </div>
                      </div>
                      {member.id !== user?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={groupActionLoading}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            </div>

            <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-rose-100">
                <AlertTriangle className="h-4 w-4" />
                <div className="font-semibold">Delete group</div>
              </div>
              <div className="text-xs text-white/70">
                Deleting will remove the group, its private courses, and leaderboard visibility for all members.
              </div>
              <input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder='Type "DELETE" to confirm'
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-400"
              />
              <Button variant="outline" onClick={handleDeleteGroup} disabled={groupActionLoading}>
                {groupActionLoading ? "Deleting..." : "Delete group"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {emailModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 text-white border border-white/10 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">Change email</div>
                <div className="text-xs text-white/60">Update the email for your account and notifications.</div>
              </div>
              <button
                className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
                onClick={() => setEmailModalOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.08em] text-white/50">New email</label>
              <input
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="you@example.com"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleEmailUpdate();
                  }
                }}
              />
              {emailError && <div className="text-xs text-rose-300">{emailError}</div>}
              {emailStatus === "success" && <div className="text-xs text-emerald-300">Email updated.</div>}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEmailModalOpen(false)} className="min-w-[100px]">
                Cancel
              </Button>
              <Button onClick={handleEmailUpdate} disabled={emailStatus === "loading"} className="min-w-[100px]">
                {emailStatus === "loading" ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {accountModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 text-white border border-white/10 shadow-2xl relative">
            <button
              className="absolute right-3 top-3 text-white/70 hover:text-white"
              onClick={() => setAccountModalOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="px-6 py-6 space-y-4">
              <div>
                <div className="text-xl font-bold">Change your Chess.com account</div>
                <div className="text-sm text-white/70 mt-1">We will use this information to:</div>
              </div>

              <div className="space-y-2 text-sm text-white/80">
                {[
                  "Recommend you the best courses to study",
                  "Analyze your games and tell you where you make mistakes",
                  "Break down your chess skills and what to improve",
                ].map((line, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5" />
                    <span>{line}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.08em] text-white/50">Chess.com username</label>
                <div className="flex items-center gap-2">
                  <input
                    value={accountInput}
                    onChange={(e) => setAccountInput(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="Chess.com username"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleLookupChessCom();
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    className="whitespace-nowrap"
                    onClick={handleLookupChessCom}
                    disabled={accountStatus === "loading"}
                  >
                    {accountStatus === "loading" ? "Searching..." : "Link"}
                  </Button>
                </div>
                {accountError && <div className="text-xs text-rose-300">{accountError}</div>}
                {accountStatus === "success" && fetchedProfile && (
                  <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-3 text-sm space-y-1">
                    <div className="font-semibold text-emerald-200 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      {fetchedProfile.username}
                    </div>
                    {fetchedProfile.title && <div className="text-white/80">Title: {fetchedProfile.title}</div>}
                    <div className="text-white/70">
                      {formatLastOnline(fetchedProfile.lastOnline) || "Activity data unavailable"}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Button
                  className="w-full justify-center"
                  onClick={async () => {
                    if (accountStatus !== "success" || !fetchedProfile) {
                      await handleLookupChessCom();
                      return;
                    }
                    try {
                      setAccountStatus("loading");
                      const inputRaw = accountInput.trim();
                      const lookupName = fetchedProfile.username.toLowerCase();
                      const openings = await fetchTopOpenings(lookupName);
                      const courses = await getCourses();
                      const courseIds = mapOpeningsToCourses(openings, courses);
                      setSuggestedCourses(courseIds, inputRaw || fetchedProfile.username);
                      setLinkedUsername(inputRaw || fetchedProfile.username);
                      const updated = await setChessUsername(inputRaw || fetchedProfile.username);
                      if (updated) setUser(updated);
                      setAccountStatus("success");
                      setAccountModalOpen(false);
                    } catch (err: any) {
                      setAccountStatus("error");
                      setAccountError(err?.message || "Could not fetch openings to build recommendations.");
                    }
                  }}
                >
                  {accountStatus === "success" ? "Save account" : accountStatus === "loading" ? "Working..." : "Continue"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {boardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-4xl rounded-3xl bg-slate-900 text-white border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="text-lg font-semibold">Board customization</div>
              <button className="text-white/70 hover:text-white" onClick={() => setBoardModalOpen(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-6">
              <div className="rounded-2xl bg-slate-800/70 border border-white/10 p-4">
                <div className="text-white mb-3 font-semibold">Active Piece: White Queen</div>
                <div className="flex flex-col gap-3 items-center">
                  <div className="relative inline-block">
                    <div className="grid grid-cols-8 grid-rows-8 w-full max-w-[320px] sm:max-w-[360px] mx-auto aspect-square overflow-hidden rounded-xl border border-white/10">
                      {sampleSquares.map((sq) => (
                        <div
                          key={sq.name}
                          className="relative flex items-center justify-center text-xs font-semibold"
                          style={{
                            background: sq.isLight ? boardColors[boardTheme]?.light || boardColors.brown.light : boardColors[boardTheme]?.dark || boardColors.brown.dark,
                            color: "#111",
                          }}
                        >
                          {sq.isHighlight && (
                            <div
                              className="absolute inset-0"
                              style={{ backgroundColor: highlightPreviewColor, opacity: 0.8 }}
                            />
                          )}
                      {sq.piece && (
                        <img
                          src={pieceSpriteFromFen(sq.piece, activePieces)}
                          alt=""
                          className={`relative z-10 h-[36px] w-[36px] object-contain ${
                            pieceTheme === "freestyle" ? "p-1" : ""
                          } ${pawnScaleForFen(pieceTheme, sq.piece)}`}
                          draggable={false}
                        />
                      )}
                        {sq.coord && (
                          <div className="absolute left-1 bottom-1 text-[10px] text-black/70">{sq.coord}</div>
                        )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 text-sm text-white">
                <Select label="Board" value={boardTheme} onChange={(v) => setBoardTheme(v)} options={boardOptions} />
                <Select label="Pieces" value={pieceTheme} onChange={(v) => setPieceTheme(v)} options={pieceOptions} />
              </div>

              <div className="flex justify-end">
                <Button
                  className="px-6"
                  onClick={async () => {
                    const resolved = resolveBoardTheme(boardTheme).key;
                    const resolvedPieces = resolvePieceTheme(pieceTheme).key;
                    const updated = await updateBoardTheme(resolved, resolvedPieces);
                    if (updated) setUser(updated);
                    setBoardModalOpen(false);
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {paywallOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4">
          <div className="relative z-[121] w-full max-w-md min-h-[360px] bg-black text-white border border-white/15 shadow-2xl p-8 space-y-4 rounded-3xl pointer-events-auto">
            <button
              className="absolute right-4 top-4 h-9 w-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
              onClick={() => {
                setPaywallOpen(false);
                pendingActionRef.current = null;
                setPaypalError(null);
              }}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">Pawn Point Pro</div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">$25 / month</div>
              </div>
            </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                <div className="text-sm text-white/70">
                  Checkout securely with PayPal Subscriptions. You can cancel anytime from your PayPal account.
                </div>
              <div id={PAYPAL_BUTTON_CONTAINER_ID} className="min-h-[52px] flex items-center justify-center" />
              {paypalLoading && !paypalReady && <div className="text-xs text-white/70">Loading PayPal...</div>}
              {paypalError && <div className="text-xs text-rose-200">{paypalError}</div>}
            </div>
          </div>
        </div>
      )}

      {cancelModalOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 px-4">
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900 text-white border border-white/15 shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">Cancel Subscription</div>
                <div className="text-sm text-white/70">Are you sure you want to cancel Pawn Point Pro?</div>
              </div>
              <button
                className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
                onClick={() => setCancelModalOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {cancelError && <div className="text-xs text-rose-200">{cancelError}</div>}
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setCancelModalOpen(false)} disabled={cancelLoading}>
                Keep Pro
              </Button>
              <Button
                variant="outline"
                className="border-rose-300 text-rose-100 hover:bg-rose-500/20"
                onClick={handleCancelSubscription}
                disabled={cancelLoading}
              >
                {cancelLoading ? "Cancelling..." : "Confirm Cancel"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {supportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 text-white border border-white/10 shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">Email support</div>
                <div className="text-xs text-white/60">We’ll send your message to officialpawnpoint@gmail.com</div>
              </div>
              <button
                className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
                onClick={() => setSupportModalOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.08em] text-white/50">Your message</label>
              <textarea
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                rows={4}
                placeholder="Describe the issue you're facing..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setSupportModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const subject = encodeURIComponent("Pawn Point Support Request");
                  const body = encodeURIComponent(supportMessage || "Hi team,");
                  window.location.href = `mailto:officialpawnpoint@gmail.com?subject=${subject}&body=${body}`;
                  setSupportModalOpen(false);
                }}
                disabled={!supportMessage.trim()}
              >
                Email Support
              </Button>
            </div>
          </div>
        </div>
      )}

      {resetModalOpen && (
        <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/60 px-4 py-10 overflow-y-auto">
          <div className="w-full max-w-5xl rounded-2xl bg-slate-900 text-white border border-white/10 shadow-2xl p-6 space-y-4">
            <button
              className="flex items-center gap-2 text-sm text-white/70"
              onClick={() => setResetModalOpen(false)}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <div className="text-2xl font-bold">Reset Progress</div>
            {resetLoading ? (
              <div className="text-white/70 text-sm">Loading your courses…</div>
            ) : resetCourses.length === 0 ? (
              <div className="text-white/70 text-sm">You have no courses with earned XP to reset.</div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {resetCourses.map(({ course, percent }) => (
                  <div
                    key={course.id}
                    className="rounded-xl border border-white/10 bg-slate-800/60 p-4 flex items-center gap-4"
                  >
                    <div className="h-14 w-14 rounded-xl overflow-hidden bg-white/5 flex items-center justify-center">
                      <img src={course.thumbnailUrl} alt={course.title} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="font-semibold text-white">{course.title}</div>
                      <div className="flex items-center gap-2 text-xs text-white/70">
                        <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-emerald-400"
                            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                          />
                        </div>
                        <span className="font-semibold text-white">{percent}%</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="min-w-[88px]"
                      disabled={resettingId === course.id}
                      onClick={() => handleResetCourse(course.id)}
                    >
                      {resettingId === course.id ? "Resetting..." : "Reset"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
function formatLastOnline(ts?: number) {
  if (!ts) return null;
  const diff = Date.now() / 1000 - ts;
  if (diff < 3600) return "Active recently";
  if (diff < 86400) return "Active today";
  const days = Math.floor(diff / 86400);
  return `Active ${days}d ago`;
}

const boardOptions: Option[] = Object.keys(BOARD_THEMES).map((key) => ({
  label: key.charAt(0).toUpperCase() + key.slice(1),
  value: key,
}));
const pieceOptions: Option[] = Object.keys(PIECE_THEMES).map((key) => ({
  label: key.charAt(0).toUpperCase() + key.slice(1),
  value: key,
}));

const boardColors = BOARD_THEMES;
const highlightPreviewColor = "#f3cd4b";

function buildBoard(fen: string) {
  const rows = fen.split(" ")[0].split("/");
  const squares: { name: string; piece: string | null; isLight: boolean; isHighlight?: boolean; coord?: string }[] = [];
  rows.forEach((row, rIdx) => {
    let file = 0;
    row.split("").forEach((ch) => {
      if (/[1-8]/.test(ch)) {
        const emptyCount = Number(ch);
        for (let i = 0; i < emptyCount; i++) {
          const name = `${"abcdefgh"[file]}${8 - rIdx}`;
          squares.push({ name, piece: null, isLight: (file + rIdx) % 2 === 0, coord: name });
          file++;
        }
      } else {
        const name = `${"abcdefgh"[file]}${8 - rIdx}`;
        squares.push({ name, piece: ch, isLight: (file + rIdx) % 2 === 0, coord: name });
        file++;
      }
    });
  });
  const highlights = ["d3", "e2", "e5", "f3"];
  return squares.map((sq) => ({ ...sq, isHighlight: highlights.includes(sq.name) }));
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: Option[];
}) {
  return (
    <div className="space-y-1">
      <div className="text-white/80 text-sm">{label}</div>
      <div className="relative">
        <button className="w-full flex items-center justify-between rounded-xl bg-slate-800 border border-white/10 px-3 py-3 text-white text-sm">
          <span>{options.find((o) => o.value === value)?.label || value}</span>
          <ChevronDown className="h-4 w-4 text-white/60" />
        </button>
        <select
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function pieceSpriteFromFen(symbol: string, pieces: PieceTheme) {
  if (!symbol || symbol.length === 0) return "";
  const isWhite = symbol === symbol.toUpperCase();
  const type = symbol.toLowerCase() as "p" | "n" | "b" | "r" | "q" | "k";
  return isWhite ? pieces.w[type] : pieces.b[type];
}

function pawnScaleForFen(pieceTheme: string, symbol: string) {
  if (!symbol) return "";
  const isWhite = symbol === symbol.toUpperCase();
  const lower = symbol.toLowerCase();
  if (pieceTheme === "chesscom") {
    if (lower === "p") return isWhite ? "scale-110" : "scale-90";
    if (!isWhite && lower === "k") return "scale-110 translate-y-[1px]";
  }
  if (pieceTheme === "freestyle" && lower === "p" && !isWhite) return "scale-110";
  return "";
}


