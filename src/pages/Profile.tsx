import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import { updateProfileAvatar, updateTaglineSettings } from "../lib/mockApi";
import {
  PROFILE_AVATAR_OPTIONS,
  type ProfileAvatarPresetId,
  presetAvatarValue,
} from "../lib/profileAvatars";
import { optimizeProfileAvatarFile } from "../lib/profileAvatarUpload";
import defaultAvatar from "../assets/Easter Default.png";
import { Pencil, X } from "lucide-react";

const pageBackground = {
  backgroundImage: `
    radial-gradient(1200px 600px at 50% -10%, rgba(255, 255, 255, 0.03), transparent 60%),
    linear-gradient(180deg, #0b1220 0%, #0d1628 25%, #0b1220 45%, #0a0f1c 60%, #070a12 75%, #000000 92%)
  `,
  minHeight: "100vh",
  color: "#ffffff",
} as const;

export default function Profile() {
  const { user, setUser } = useAuth();
  const [, navigate] = useLocation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || defaultAvatar);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  const unlockedTaglines = user?.unlockedTaglines || [];
  const [taglineEnabled, setTaglineEnabled] = useState(user?.taglinesEnabled ?? true);
  const [selectedTagline, setSelectedTagline] = useState(user?.selectedTagline || "");
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
  }, [user?.avatarUrl, user?.taglinesEnabled, user?.selectedTagline]);

  useEffect(() => {
    if (!selectedTagline && unlockedTaglines.length) {
      const first = unlockedTaglines[0];
      setSelectedTagline(first);
    }
  }, [unlockedTaglines, selectedTagline]);

  if (!user) return null;

  return (
    <AppShell backgroundStyle={pageBackground}>
      <div className="flex flex-col gap-6">
        <div
          className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl"
          style={{
            background: "linear-gradient(135deg, #1b1713 0%, #15120f 58%, #100d0a 100%)",
          }}
        >
          <div className="relative z-10 flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="relative h-24 w-24 rounded-full overflow-hidden border-4 border-white/40 shadow-lg">
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
                  className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#f2ebe0] text-[#17130f] shadow-lg transition hover:bg-[#e8dfd2]"
                  aria-label="Change profile picture"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-1 text-white">
                <div className="text-2xl font-bold">{user.chessUsername || user.displayName}</div>
                {taglineEnabled && selectedTagline && (
                  <div className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs text-white/70 sm:max-w-xs">
                    {selectedTagline}
                  </div>
                )}
                <div className="text-sm text-white/80">{user.email}</div>
                <div className="text-sm text-white/70">
                  Member since{" "}
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "your start date"}
                </div>
                {inGroup && (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-white/80">
                    <span className="rounded-full border border-[rgba(214,197,162,0.14)] bg-[#201a15] px-2 py-1">
                      {user.groupName || "Group member"}
                    </span>
                    {isGroupAdmin && user.groupCode && (
                      <span className="rounded-full border border-[rgba(214,197,162,0.22)] bg-[rgba(214,197,162,0.12)] px-2 py-1 text-[#d6c5a2]">
                        Group Code: {user.groupCode}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start lg:justify-end">
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate("/settings")}>
                Settings
              </Button>
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate("/dashboard")}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>

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
