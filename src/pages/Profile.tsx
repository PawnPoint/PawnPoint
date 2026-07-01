import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import {
  deleteGroup,
  getGroupProfileSettings,
  updateExternalRatings,
  updateGroupProfileSettings,
  updateProfileAvatar,
  updateTaglineSettings,
  type ExternalRatings,
  type GroupProfileSettings,
} from "../lib/mockApi";
import { fetchExternalRatingProfile, validateChessProfileUsername, type ChessRatingPlatform } from "../lib/chessRatings";
import {
  PROFILE_AVATAR_OPTIONS,
  type ProfileAvatarPresetId,
  presetAvatarValue,
} from "../lib/profileAvatars";
import { optimizeProfileAvatarFile } from "../lib/profileAvatarUpload";
import defaultAvatar from "../assets/Easter Default.png";
import fideLogo from "../assets/chess/fide_transparent_512.png";
import lichessLogo from "../assets/chess/lichess-transparent.png";
import chessComLogo from "../assets/chess/chess-pawn-favicon-512.png";
import {
  AlertCircle,
  BarChart3,
  Calendar,
  Clock3,
  Copy,
  Flame,
  Globe2,
  Mail,
  Pencil,
  Settings,
  Star,
  Target,
  Trash2,
  Trophy,
  Upload,
  User,
  X,
} from "lucide-react";

const pageBackground = {
  backgroundImage: `
    radial-gradient(1200px 600px at 50% -10%, rgba(255, 255, 255, 0.03), transparent 60%),
    linear-gradient(180deg, #0b1220 0%, #0d1628 25%, #0b1220 45%, #0a0f1c 60%, #070a12 75%, #000000 92%)
  `,
  minHeight: "100vh",
  color: "#ffffff",
} as const;

type RatingHistoryPoint = { date: string; rating: number };

function buildRatingChart(points: RatingHistoryPoint[]) {
  if (!points.length) return { line: "", end: null as { x: number; y: number } | null, min: null, max: null };
  const ratings = points.map((point) => point.rating);
  const min = Math.min(...ratings);
  const max = Math.max(...ratings);
  const span = Math.max(1, max - min);
  const coords = points.map((point, index) => {
    const x = points.length === 1 ? 100 : (index / (points.length - 1)) * 100;
    const y = 84 - ((point.rating - min) / span) * 68;
    return { x, y };
  });
  return {
    line: coords.map((point) => `${point.x},${point.y}`).join(" "),
    end: coords[coords.length - 1] || null,
    min,
    max,
  };
}

export default function Profile() {
  const { user, setUser } = useAuth();
  const [, navigate] = useLocation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || defaultAvatar);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [fideDraft, setFideDraft] = useState(user?.externalRatings?.fide?.rating?.toString() || "");
  const [chessComDraft, setChessComDraft] = useState(user?.externalRatings?.chesscom?.username || "");
  const [lichessDraft, setLichessDraft] = useState(user?.externalRatings?.lichess?.username || "");
  const [ratingBusy, setRatingBusy] = useState<"fide" | ChessRatingPlatform | null>(null);
  const [ratingStatus, setRatingStatus] = useState("");
  const [ratingError, setRatingError] = useState("");
  const [selectedRatingPlatform, setSelectedRatingPlatform] = useState<ChessRatingPlatform>("chesscom");

  const unlockedTaglines = user?.unlockedTaglines || [];
  const [taglineEnabled, setTaglineEnabled] = useState(user?.taglinesEnabled ?? true);
  const [selectedTagline, setSelectedTagline] = useState(user?.selectedTagline || "");
  const [teamSettings, setTeamSettings] = useState<GroupProfileSettings | null>(null);
  const [teamName, setTeamName] = useState(user?.groupName || "");
  const [teamUrl, setTeamUrl] = useState("");
  const [teamAvatarUrl, setTeamAvatarUrl] = useState("");
  const [teamStatus, setTeamStatus] = useState("");
  const [teamError, setTeamError] = useState("");
  const [teamBusy, setTeamBusy] = useState<"name" | "url" | "avatar" | "delete" | null>(null);
  const inGroup = user?.accountType === "group" && !!user?.groupId;
  const isGroupAdmin = inGroup && user?.groupRole === "admin";

  const handleTaglineToggle = async (next: boolean) => {
    setTaglineEnabled(next);
    if (user) {
      const updated = { ...user, taglinesEnabled: next };
      setUser(updated);
      localStorage.setItem("pawnpoint_user", JSON.stringify(updated));
      await updateTaglineSettings(user.id, { enabled: next });
    }
  };

  const handleTaglineSelect = async (tag: string) => {
    setSelectedTagline(tag);
    if (user) {
      const updated = { ...user, selectedTagline: tag };
      setUser(updated);
      localStorage.setItem("pawnpoint_user", JSON.stringify(updated));
      await updateTaglineSettings(user.id, { selected: tag });
    }
  };

  const saveExternalRatings = async (nextRatings: ExternalRatings, successMessage: string) => {
    if (!user) return;
    const updated = await updateExternalRatings(user.id, nextRatings);
    if (updated) {
      setUser(updated);
      setRatingStatus(successMessage);
      setRatingError("");
    }
  };

  const handleSaveFideRating = async () => {
    if (!user || ratingBusy) return;
    const parsed = Number(fideDraft);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setRatingError("Enter a valid FIDE rating.");
      return;
    }
    setRatingBusy("fide");
    try {
      await saveExternalRatings(
        {
          ...(user.externalRatings || {}),
          fide: { rating: Math.round(parsed), manuallyEditedAt: Date.now() },
        },
        "FIDE rating saved.",
      );
    } finally {
      setRatingBusy(null);
    }
  };

  const handleSyncExternalRating = async (platform: ChessRatingPlatform) => {
    if (!user || ratingBusy) return;
    const username = platform === "chesscom" ? chessComDraft : lichessDraft;
    const validationError = validateChessProfileUsername(username);
    if (validationError) {
      setRatingError(validationError);
      return;
    }
    setRatingBusy(platform);
    setRatingError("");
    setRatingStatus("");
    try {
      const profile = await fetchExternalRatingProfile(platform, username);
      await saveExternalRatings(
        { ...(user.externalRatings || {}), [platform]: profile },
        `${platform === "chesscom" ? "Chess.com" : "Lichess"} ratings synced.`,
      );
      setSelectedRatingPlatform(platform);
    } catch (err) {
      setRatingError(err instanceof Error ? err.message : "Could not sync ratings.");
    } finally {
      setRatingBusy(null);
    }
  };

  const handleUnlinkExternalRating = async (platform: ChessRatingPlatform) => {
    if (!user || ratingBusy) return;
    setRatingBusy(platform);
    try {
      const nextRatings = { ...(user.externalRatings || {}), [platform]: null };
      await saveExternalRatings(
        nextRatings,
        `${platform === "chesscom" ? "Chess.com" : "Lichess"} profile unlinked.`,
      );
      if (platform === "chesscom") setChessComDraft("");
      else setLichessDraft("");
    } finally {
      setRatingBusy(null);
    }
  };

  // XP distribution removed per request

  const avatars = PROFILE_AVATAR_OPTIONS;

  const handleAvatarSelect = async (avatarId: ProfileAvatarPresetId) => {
    if (!user || avatarBusy) return;
    setAvatarBusy(true);
    setAvatarError("");
    try {
      const updated = await updateProfileAvatar(user.id, presetAvatarValue(avatarId));
      if (updated) {
        setUser(updated);
        setAvatarUrl(updated.avatarUrl || defaultAvatar);
      }
      setPickerOpen(false);
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user || avatarBusy) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError("Please choose an image file.");
      return;
    }
    setAvatarBusy(true);
    setAvatarError("");
    try {
      const optimizedAvatar = await optimizeProfileAvatarFile(file);
      const updated = await updateProfileAvatar(user.id, optimizedAvatar);
      if (updated) {
        setUser(updated);
        setAvatarUrl(updated.avatarUrl || defaultAvatar);
      }
      setPickerOpen(false);
    } catch (err) {
      console.warn("Failed to upload avatar", err);
      setAvatarError(
        err instanceof Error ? err.message : "Could not process this image. Try another file.",
      );
    } finally {
      setAvatarBusy(false);
    }
  };

  useEffect(() => {
    setAvatarUrl(user?.avatarUrl || defaultAvatar);
    setTaglineEnabled(user?.taglinesEnabled ?? true);
    setSelectedTagline(user?.selectedTagline || "");
    setFideDraft(user?.externalRatings?.fide?.rating?.toString() || "");
    setChessComDraft(user?.externalRatings?.chesscom?.username || "");
    setLichessDraft(user?.externalRatings?.lichess?.username || "");
  }, [
    user?.avatarUrl,
    user?.taglinesEnabled,
    user?.selectedTagline,
    user?.externalRatings?.fide?.rating,
    user?.externalRatings?.chesscom?.username,
    user?.externalRatings?.lichess?.username,
  ]);

  useEffect(() => {
    if (!selectedTagline && unlockedTaglines.length) {
      const first = unlockedTaglines[0];
      setSelectedTagline(first);
    }
  }, [unlockedTaglines, selectedTagline]);

  useEffect(() => {
    if (!isGroupAdmin) {
      setTeamSettings(null);
      return;
    }
    let cancelled = false;
    getGroupProfileSettings(user)
      .then((settings) => {
        if (cancelled) return;
        setTeamSettings(settings);
        setTeamName(settings?.name || user.groupName || "");
        setTeamUrl(settings?.teamUrl || "");
        setTeamAvatarUrl(settings?.avatarUrl || "");
      })
      .catch((err) => {
        if (!cancelled) setTeamError(err?.message || "Could not load team settings.");
      });
    return () => {
      cancelled = true;
    };
  }, [isGroupAdmin, user]);

  const saveTeamPatch = async (
    busy: "name" | "url" | "avatar",
    patch: { name?: string; teamUrl?: string; avatarUrl?: string },
  ) => {
    setTeamBusy(busy);
    setTeamError("");
    setTeamStatus("");
    try {
      const updated = await updateGroupProfileSettings(user, patch);
      if (updated) {
        setTeamSettings(updated);
        setTeamName(updated.name);
        setTeamUrl(updated.teamUrl || "");
        setTeamAvatarUrl(updated.avatarUrl || "");
        if (patch.name && user) setUser({ ...user, groupName: updated.name });
      }
      setTeamStatus("Team settings saved.");
    } catch (err: any) {
      setTeamError(err?.message || "Could not save team settings.");
    } finally {
      setTeamBusy(null);
    }
  };

  const handleTeamAvatarUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setTeamError("Please choose an image file.");
      return;
    }
    setTeamBusy("avatar");
    setTeamError("");
    setTeamStatus("");
    try {
      const optimizedAvatar = await optimizeProfileAvatarFile(file);
      await saveTeamPatch("avatar", { avatarUrl: optimizedAvatar });
    } catch (err: any) {
      setTeamError(err?.message || "Could not process this image.");
      setTeamBusy(null);
    }
  };

  const handleCopyTeamId = async () => {
    const value = teamSettings?.code || user.groupCode || "";
    if (!value) return;
    await navigator.clipboard?.writeText(value).catch(() => undefined);
    setTeamStatus("Team ID copied.");
  };

  const handleDeleteTeam = async () => {
    if (!window.confirm("Delete this team and remove its shared content?")) return;
    setTeamBusy("delete");
    setTeamError("");
    setTeamStatus("");
    try {
      const updated = await deleteGroup(user);
      if (updated) setUser(updated);
      setTeamSettings(null);
      setTeamStatus("Team deleted.");
    } catch (err: any) {
      setTeamError(err?.message || "Could not delete this team.");
    } finally {
      setTeamBusy(null);
    }
  };

  if (!user) return null;

  const isPro = user.premiumAccess === true || user.subscriptionStatus === "active";
  const planRole = isPro ? "Pro" : "Unpaid";
  const displayName = user.chessUsername || user.displayName || user.email.split("@")[0];
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "your start date";
  const totalXp = Math.max(0, user.totalXp || 0);
  const level = Math.max(1, user.level || 1);
  const currentStreak = Math.max(0, user.streak || 0);
  const globalRank = Math.max(1, 52 - level);
  const externalRatings = user.externalRatings || {};
  const fideRating = externalRatings.fide?.rating ?? null;
  const chessComRating = externalRatings.chesscom?.rapid ?? externalRatings.chesscom?.blitz ?? externalRatings.chesscom?.bullet ?? null;
  const lichessRating = externalRatings.lichess?.rapid ?? externalRatings.lichess?.blitz ?? externalRatings.lichess?.bullet ?? null;
  const selectedRatingRecord = externalRatings[selectedRatingPlatform];
  const selectedRapidHistory = selectedRatingRecord?.rapidHistory || [];
  const selectedPlatformLabel = selectedRatingPlatform === "chesscom" ? "Chess.com" : "Lichess";
  const ratingChart = buildRatingChart(selectedRapidHistory);
  const ratings = [
    {
      label: "FIDE",
      value: fideRating,
      logo: fideLogo,
      detail: "Manual rating",
      linked: fideRating !== null,
    },
    {
      label: "Chess.com Rapid",
      value: chessComRating,
      logo: chessComLogo,
      detail: externalRatings.chesscom?.username ? `@${externalRatings.chesscom.username}` : "Connect Chess.com",
      linked: !!externalRatings.chesscom?.username,
      platform: "chesscom" as const,
    },
    {
      label: "Lichess Rapid",
      value: lichessRating,
      logo: lichessLogo,
      detail: externalRatings.lichess?.username ? `@${externalRatings.lichess.username}` : "Connect Lichess",
      linked: !!externalRatings.lichess?.username,
      platform: "lichess" as const,
    },
  ];
  const accountRows = [
    { label: "Username", value: displayName, icon: User },
    { label: "Email", value: user.email, icon: Mail },
    { label: "Team", value: user.groupName || "Personal Workspace", icon: Trophy },
    { label: "Joined", value: memberSince, icon: Calendar },
    { label: "Role", value: planRole, icon: User },
  ];
  const weeklyTraining = [
    { label: "Puzzles solved", value: user.dailyPuzzleCount || 0, delta: "12% vs last week", icon: Target },
    { label: "Games analysed", value: Math.max(0, Math.round((user.dailyXp || 0) / 25)), delta: "9% vs last week", icon: BarChart3 },
    { label: "Hours trained", value: Math.max(0.4, Math.round((totalXp / 420) * 10) / 10), delta: "15% vs last week", icon: Clock3 },
  ];
  return (
    <AppShell backgroundStyle={pageBackground}>
      <div className="flex flex-col gap-6">
        <section className="overflow-hidden rounded-lg border border-white/10 bg-[#070707] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-white/16 bg-black shadow-[0_0_32px_rgba(137,170,255,0.32)] sm:h-28 sm:w-28">
                <img
                  src={avatarUrl || defaultAvatar}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                  loading="eager"
                  onError={(event) => {
                    event.currentTarget.src = defaultAvatar;
                  }}
                />
                <button
                  onClick={() => setPickerOpen(true)}
                  className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border border-black/20 bg-white text-black shadow-lg transition hover:bg-white/90"
                  aria-label="Change profile picture"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
              <div className="min-w-0 text-white">
                <h1 className="truncate text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{displayName}</h1>
                <p className="mt-1 truncate text-sm text-white/65">{user.email}</p>
                <p className="mt-2 text-sm text-white/55">Member since {memberSince}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/78">
                    {user.groupName || "Personal Workspace"}
                  </span>
                  {taglineEnabled && selectedTagline && (
                    <span className="max-w-xs truncate rounded-full border border-white/10 bg-black px-3 py-1 text-xs text-white/55">
                      {selectedTagline}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/12 bg-black px-4 text-sm font-semibold text-white transition hover:border-white/28"
              >
                <Pencil className="h-4 w-4" />
                Edit Profile
              </button>
              <button
                type="button"
                onClick={() => navigate("/settings")}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/12 bg-black px-4 text-sm font-semibold text-white transition hover:border-white/28"
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Level", value: `Lv. ${level}`, icon: BarChart3 },
            { label: "Total XP", value: `${totalXp.toLocaleString()} XP`, icon: Star },
            { label: "Current Streak", value: `${currentStreak} days`, icon: Flame },
            { label: "Global Rank", value: `#${globalRank}`, icon: Globe2 },
          ].map(({ label, value, icon: Icon }) => (
            <article key={label} className="rounded-lg border border-white/10 bg-[#070707] p-5">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/72">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/42">{label}</div>
                  <div className="mt-1 text-2xl font-semibold tracking-tight text-white">{value}</div>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-3 xl:grid-cols-[1.1fr_1fr]">
          <article className="rounded-lg border border-white/10 bg-[#070707] p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight text-white">Ratings Overview</h2>
              <div className="flex items-center gap-2">
                {(["chesscom", "lichess"] as ChessRatingPlatform[]).map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => setSelectedRatingPlatform(platform)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                      selectedRatingPlatform === platform
                        ? "border-white bg-white text-black"
                        : "border-white/10 bg-black text-white/62 hover:text-white"
                    }`}
                  >
                    {platform === "chesscom" ? "Chess.com" : "Lichess"}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative h-32 overflow-hidden rounded-lg bg-black/20">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                {[20, 40, 60, 80].map((line) => (
                  <line key={line} x1="0" x2="100" y1={line} y2={line} stroke="rgba(255,255,255,.09)" strokeDasharray="2 3" />
                ))}
                {ratingChart.line && (
                  <polyline points={ratingChart.line} fill="none" stroke="rgba(255,255,255,.88)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
                )}
                {ratingChart.end && <circle cx={ratingChart.end.x} cy={ratingChart.end.y} r="1.8" fill="white" />}
              </svg>
              <div className="pointer-events-none absolute inset-x-3 top-3 flex items-center justify-between text-[11px] text-white/40">
                <span>{selectedPlatformLabel} rapid</span>
                <span>6 months</span>
              </div>
              {!ratingChart.line && (
                <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-white/45">
                  Sync a {selectedPlatformLabel} profile to show rapid rating history.
                </div>
              )}
              {ratingChart.min !== null && ratingChart.max !== null && (
                <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between text-[11px] text-white/38">
                  <span>{ratingChart.min}</span>
                  <span>{ratingChart.max}</span>
                </div>
              )}
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {ratings.map(({ label, value, logo, detail, linked, platform }) => (
                <div
                  key={label}
                  role={platform ? "button" : undefined}
                  tabIndex={platform ? 0 : undefined}
                  onClick={() => platform && setSelectedRatingPlatform(platform)}
                  onKeyDown={(event) => {
                    if (platform && (event.key === "Enter" || event.key === " ")) {
                      event.preventDefault();
                      setSelectedRatingPlatform(platform);
                    }
                  }}
                  className={`rounded-lg border p-3 transition ${
                    platform && selectedRatingPlatform === platform
                      ? "border-white/35 bg-white/[0.06]"
                      : "border-white/10 bg-white/[0.03]"
                  } ${platform ? "cursor-pointer hover:border-white/24" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <img src={logo} alt="" className="h-10 w-10 shrink-0 object-contain" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase tracking-[0.16em] text-white/42">{label}</div>
                      <div className="text-xl font-semibold text-white">{value ?? "Not set"}</div>
                      <div className="truncate text-[11px] text-white/45">{detail}</div>
                    </div>
                    {linked && label === "Chess.com Rapid" && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleUnlinkExternalRating("chesscom");
                        }}
                        disabled={ratingBusy === "chesscom"}
                        className="text-[11px] font-semibold text-white/42 transition hover:text-white disabled:opacity-40"
                      >
                        Unlink
                      </button>
                    )}
                    {linked && label === "Lichess Rapid" && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleUnlinkExternalRating("lichess");
                        }}
                        disabled={ratingBusy === "lichess"}
                        className="text-[11px] font-semibold text-white/42 transition hover:text-white disabled:opacity-40"
                      >
                        Unlink
                      </button>
                    )}
                  </div>
                  {label === "FIDE" && (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="number"
                        min={0}
                        value={fideDraft}
                        onChange={(event) => setFideDraft(event.target.value)}
                        placeholder="FIDE rating"
                        className="min-w-0 flex-1 rounded-md border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/35"
                      />
                      <button
                        type="button"
                        onClick={handleSaveFideRating}
                        disabled={ratingBusy === "fide"}
                        className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
                      >
                        {ratingBusy === "fide" ? "Saving" : "Save"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/42">Chess.com username</span>
                <div className="flex gap-2">
                  <input
                    value={chessComDraft}
                    onChange={(event) => setChessComDraft(event.target.value)}
                    placeholder="e.g. Hikaru"
                    className="min-w-0 flex-1 rounded-md border border-white/10 bg-black px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/35"
                  />
                  <button
                    type="button"
                    onClick={() => handleSyncExternalRating("chesscom")}
                    disabled={ratingBusy === "chesscom"}
                    className="rounded-md bg-white px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
                  >
                    {ratingBusy === "chesscom" ? "Syncing" : "Sync"}
                  </button>
                </div>
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/42">Lichess username</span>
                <div className="flex gap-2">
                  <input
                    value={lichessDraft}
                    onChange={(event) => setLichessDraft(event.target.value)}
                    placeholder="e.g. DrNykterstein"
                    className="min-w-0 flex-1 rounded-md border border-white/10 bg-black px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/35"
                  />
                  <button
                    type="button"
                    onClick={() => handleSyncExternalRating("lichess")}
                    disabled={ratingBusy === "lichess"}
                    className="rounded-md bg-white px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
                  >
                    {ratingBusy === "lichess" ? "Syncing" : "Sync"}
                  </button>
                </div>
              </label>
            </div>
            {(ratingError || ratingStatus) && (
              <div
                className={`mt-3 flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                  ratingError
                    ? "border-rose-400/30 bg-rose-500/10 text-rose-100"
                    : "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                }`}
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{ratingError || ratingStatus}</span>
              </div>
            )}
          </article>

          <div className="grid gap-3">
            <article className="rounded-lg border border-white/10 bg-[#070707] p-5">
              <h2 className="mb-4 text-lg font-semibold tracking-tight text-white">Account Overview</h2>
              <div className="divide-y divide-white/10">
                {accountRows.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="grid grid-cols-[22px_1fr_minmax(0,1.25fr)] items-center gap-3 py-2.5 text-sm">
                    <Icon className="h-4 w-4 text-white/46" />
                    <span className="text-white/55">{label}</span>
                    <span className="truncate text-right text-white/78">{value}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-lg border border-white/10 bg-[#070707] p-5">
              <h2 className="text-lg font-semibold tracking-tight text-white">
                Training Activity <span className="font-normal text-white/45">(This Week)</span>
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {weeklyTraining.map(({ label, value, delta, icon: Icon }) => (
                  <div key={label} className="border-white/10 sm:border-r sm:last:border-r-0">
                    <Icon className="mb-3 h-8 w-8 text-white/65" />
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/42">{label}</div>
                    <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
                    <div className="mt-1 text-xs text-emerald-300/75">▲ {delta}</div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        {isGroupAdmin && (
          <div className="space-y-7">
            {(teamError || teamStatus) && (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  teamError
                    ? "border-rose-400/30 bg-rose-500/10 text-rose-100"
                    : "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                }`}
              >
                {teamError || teamStatus}
              </div>
            )}

            <section className="overflow-hidden rounded-lg border border-white/15 bg-black text-white">
              <div className="space-y-4 p-6">
                <h2 className="text-xl font-semibold">Team Name</h2>
                <p className="max-w-3xl text-sm font-medium text-white">
                  This is your team's visible name within Pawn Point. For example, the name of your club or department.
                </p>
                <input
                  value={teamName}
                  maxLength={32}
                  onChange={(event) => setTeamName(event.target.value)}
                  className="w-full max-w-sm rounded-md border border-white/15 bg-black px-3 py-3 text-sm font-semibold text-white outline-none focus:border-white/60"
                />
              </div>
              <div className="flex items-center justify-between border-t border-white/15 px-6 py-3">
                <p className="text-sm text-white/70">Please use 32 characters at maximum.</p>
                <Button
                  onClick={() => saveTeamPatch("name", { name: teamName })}
                  disabled={teamBusy === "name"}
                >
                  {teamBusy === "name" ? "Saving..." : "Save"}
                </Button>
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-white/15 bg-black text-white">
              <div className="space-y-4 p-6">
                <h2 className="text-xl font-semibold">Team URL</h2>
                <p className="max-w-4xl text-sm font-medium text-white">
                  This is your team's URL namespace on Pawn Point. Within it, your team can find its shared training space.
                </p>
                <div className="flex w-full max-w-sm overflow-hidden rounded-md border border-white/15 bg-black text-sm">
                  <span className="border-r border-white/15 px-3 py-3 text-white/60">pawnpoint.com/</span>
                  <input
                    value={teamUrl}
                    maxLength={48}
                    onChange={(event) => setTeamUrl(event.target.value.toLowerCase())}
                    className="min-w-0 flex-1 bg-black px-3 py-3 font-semibold text-white outline-none"
                    placeholder={(teamSettings?.code || user.groupCode || "").replace("#", "").toLowerCase()}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-white/15 px-6 py-3">
                <p className="text-sm text-white/70">Please use 48 characters at maximum.</p>
                <Button
                  onClick={() => saveTeamPatch("url", { teamUrl })}
                  disabled={teamBusy === "url"}
                >
                  {teamBusy === "url" ? "Saving..." : "Save"}
                </Button>
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-white/15 bg-black text-white">
              <div className="flex items-center justify-between gap-6 p-6">
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Team Avatar</h2>
                  <p className="max-w-3xl text-sm font-medium text-white">
                    This is your team's avatar.
                    <br />
                    Click on the avatar to upload a custom one from your files.
                  </p>
                </div>
                <label className="group relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-full border border-white/15 bg-emerald-400/15">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleTeamAvatarUpload(file);
                      event.currentTarget.value = "";
                    }}
                  />
                  {teamAvatarUrl ? (
                    <img src={teamAvatarUrl} alt="Team avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle,#10d99a_1px,transparent_1px)] [background-size:6px_6px] text-emerald-200">
                      <Upload className="h-5 w-5 opacity-80" />
                    </span>
                  )}
                  <span className="absolute inset-0 hidden items-center justify-center bg-black/50 text-xs group-hover:flex">
                    Upload
                  </span>
                </label>
              </div>
              <div className="border-t border-white/15 px-6 py-4">
                <p className="text-sm text-white/70">An avatar is optional but strongly recommended.</p>
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-white/15 bg-black text-white">
              <div className="space-y-4 p-6">
                <h2 className="text-xl font-semibold">Team ID</h2>
                <p className="text-sm font-medium text-white">This is your team's ID within Pawn Point.</p>
                <button
                  type="button"
                  onClick={handleCopyTeamId}
                  className="flex w-full max-w-sm items-center justify-between rounded-md border border-white/15 bg-black px-3 py-3 text-left text-sm text-white"
                >
                  <span>
                    <span className="mr-3 text-white/70">team</span>
                    <strong>{teamSettings?.code || user.groupCode || "No code yet"}</strong>
                  </span>
                  <Copy className="h-4 w-4 text-white/70" />
                </button>
              </div>
              <div className="border-t border-white/15 px-6 py-4">
                <p className="text-sm text-white/70">Used when inviting players into your Pawn Point club.</p>
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-white/15 bg-black text-white">
              <div className="space-y-4 p-6">
                <h2 className="text-xl font-semibold text-white/70">Delete Team</h2>
                <p className="max-w-4xl text-sm leading-6 text-white/65">
                  Permanently remove your team and all of its shared content from Pawn Point. This action is not reversible.
                </p>
                <div className="flex items-center gap-3 rounded-md bg-white/10 px-4 py-3 text-sm text-white/70">
                  <AlertCircle className="h-4 w-4" />
                  Continue with caution. Team deletion affects every member.
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-white/15 px-6 py-4">
                <p className="text-sm text-white/70">To delete your account, visit Settings.</p>
                <Button
                  variant="outline"
                  onClick={handleDeleteTeam}
                  disabled={teamBusy === "delete"}
                  className="border-rose-400/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {teamBusy === "delete" ? "Deleting..." : "Delete Team"}
                </Button>
              </div>
            </section>
          </div>
        )}

        {pickerOpen && (
          <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/70 px-4 py-6 sm:items-center">
            <div className="pp-modal max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-5 text-white shadow-2xl sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xl font-semibold">Change Profile Picture</div>
                  <div className="text-sm text-white/70">Select the picture you want to use for your profile</div>
                </div>
                <button
                  className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition"
                  onClick={() => setPickerOpen(false)}
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 justify-items-center gap-4 sm:grid-cols-4">
                {avatars.map((avatar) => {
                  const active = avatarUrl === avatar.url;
                  return (
                    <button
                      key={avatar.id}
                      onClick={() => void handleAvatarSelect(avatar.id)}
                      disabled={avatarBusy}
                      className={`relative rounded-full p-1 border aspect-square ${
                        active ? "border-emerald-400 ring-2 ring-emerald-400/60" : "border-transparent"
                      } hover:border-white/30 transition disabled:cursor-not-allowed disabled:opacity-70`}
                      style={{ width: "100%", maxWidth: "5.75rem" }}
                    >
                      <img
                        src={avatar.url}
                        alt={avatar.label}
                        className="h-full w-full rounded-full object-cover"
                        loading="lazy"
                      />
                      {active && (
                        <div className="absolute inset-0 rounded-full border-2 border-emerald-300 pointer-events-none" />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:border-white/20 sm:w-auto">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleAvatarUpload(file);
                      e.currentTarget.value = "";
                    }}
                  />
                  {avatarBusy ? "Processing image..." : "Upload custom photo"}
                </label>
                {avatarError ? <div className="text-sm text-rose-300">{avatarError}</div> : null}
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={() => setPickerOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
