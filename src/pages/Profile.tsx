import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AppShell } from "../components/AppShell";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import { getDashboard, updateTaglineSettings } from "../lib/mockApi";
import southKnight from "../assets/The South Knight.png";
import background from "../assets/Snowflake Background.png";
import { Pencil, X } from "lucide-react";
import { db } from "../lib/firebase";
import { ref, update } from "firebase/database";

export default function Profile() {
  const { user, setUser } = useAuth();
  const [, navigate] = useLocation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || southKnight);

  const { data } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: () => getDashboard(user!),
  });

  const totalXp = user?.totalXp || 0;
  const level = user?.level || 1;
  const streak = user?.streak || 0;
  const unlockedPfps = user?.unlockedPfps || [];
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

  const avatars = [{ id: "south", label: "South Knight", url: southKnight }];

  const handleAvatarSelect = (url: string) => {
    setAvatarUrl(url);
    if (user) {
      const updated = { ...user, avatarUrl: url };
      localStorage.setItem("pawnpoint_user", JSON.stringify(updated));
      setUser(updated);
      update(ref(db, `users/${user.id}`), { avatarUrl: url }).catch((err) =>
        console.warn("Failed to persist avatar to Firebase", err),
      );
    }
    setPickerOpen(false);
  };

  const handleAvatarUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") {
        handleAvatarSelect(result);
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (user?.avatarUrl) {
      setAvatarUrl(user.avatarUrl);
    }
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
    <AppShell>
      <div className="flex flex-col gap-6">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl">
          <img
            src={background}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-50 pointer-events-none"
          />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-6 p-6">
            <div className="flex items-center gap-4">
              <div className="relative h-24 w-24 rounded-full overflow-hidden border-4 border-white/40 shadow-lg">
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                <button
                  onClick={() => setPickerOpen(true)}
                  className="absolute bottom-1 right-1 h-8 w-8 rounded-full bg-white/80 text-slate-900 flex items-center justify-center shadow-lg hover:bg-white transition"
                  aria-label="Change profile picture"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-1 text-white">
                <div className="text-2xl font-bold">{user.chessUsername || user.displayName}</div>
                {taglineEnabled && selectedTagline && (
                  <div className="text-xs text-white/70 max-w-xs overflow-hidden text-ellipsis whitespace-nowrap">
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
                <div className="text-sm text-white/70">Chess.com: {user.chessUsername || "Not linked"}</div>
                {inGroup && (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-white/80">
                    <span className="rounded-full bg-white/10 px-2 py-1">{user.groupName || "Group member"}</span>
                    {isGroupAdmin && user.groupCode && (
                      <span className="rounded-full bg-emerald-500/20 border border-emerald-300/40 px-2 py-1 text-emerald-100">
                        Group Code: {user.groupCode}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 flex flex-wrap items-center gap-3 justify-start lg:justify-end">
              <div className="rounded-full bg-cyan-500/20 text-cyan-100 border border-cyan-400/40 px-3 py-1 text-sm">
                Current Streak: {streak} days
              </div>
              <Button variant="outline" onClick={() => navigate("/settings")}>
                Settings
              </Button>
              <Button variant="ghost" onClick={() => navigate("/dashboard")}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="h-11 w-11 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-200 font-semibold">
                XP
              </div>
              <div>
                <div className="text-xl font-bold text-white">{totalXp}</div>
                <div className="text-sm text-white/70">Total XP</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="h-11 w-11 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-200 font-semibold">
                Lv
              </div>
              <div>
                <div className="text-xl font-bold text-white">{level}</div>
                <div className="text-sm text-white/70">Level</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {pickerOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-3xl rounded-2xl bg-slate-900 text-white border border-white/10 shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {avatars.map((avatar) => {
                  const active = avatarUrl === avatar.url;
                  return (
                    <button
                      key={avatar.id}
                      onClick={() => handleAvatarSelect(avatar.url)}
                      className={`relative rounded-full p-1 border aspect-square ${
                        active ? "border-emerald-400 ring-2 ring-emerald-400/60" : "border-transparent"
                      } hover:border-white/30 transition`}
                      style={{ width: "6rem", height: "6rem" }}
                    >
                      <img
                        src={avatar.url}
                        alt={avatar.label}
                        className="h-full w-full rounded-full object-cover"
                      />
                      {active && (
                        <div className="absolute inset-0 rounded-full border-2 border-emerald-300 pointer-events-none" />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-sm cursor-pointer hover:border-white/20">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAvatarUpload(file);
                    }}
                  />
                  Upload custom photo
                </label>
              </div>
              <div className="flex justify-end">
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
