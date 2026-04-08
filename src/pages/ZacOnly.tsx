import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Check, ChevronDown, ChevronUp, Copy, Inbox, PencilLine, Plus, Trash2, X } from "lucide-react";
import { get, onValue, ref, remove, set, update } from "firebase/database";
import { useAuth } from "../hooks/useAuth";
import { auth, db } from "../lib/firebase";
import {
  normalizeFeedbackInboxMessage,
  pruneOldFeedbackInboxMessages,
  type FeedbackInboxMessage,
} from "../lib/feedbackInbox";
import { nanoid } from "../lib/nanoid";
import type { Group, GroupMember, UserProfile } from "../lib/mockApi";
import "./zac-only.css";

const PRICE_PER_SUBSCRIBER = 25;
const SOUTH_KNIGHTS_GROUP_ID = "south-knight";
const SOUTH_KNIGHTS_GROUP_CODE = "0055";
const ZAC_ONLY_UID = "FeXOccEwugQBmJtcFgydgAnrlUA3";

type ClubStatus = "active" | "free" | "locked";

type RawUserRecord = Partial<UserProfile> | null;
type RawGroupMember = Partial<GroupMember> | null;
type RawGroupRecord = (Partial<Group> & { members?: Record<string, RawGroupMember> | null }) | null;
type RawFeedbackInboxRecord = Partial<Omit<FeedbackInboxMessage, "id">> | null;

type LiveUser = {
  id: string;
  email: string;
  displayName: string;
  groupId: string | null;
  groupRole: "admin" | "member" | null;
  premiumAccess: boolean;
  subscriptionStatus?: string;
  createdAt: number | null;
  xpReachedAt: number | null;
  lastStreakAt: number | null;
  subscriptionUpdatedAt: number | null;
};

type LiveGroupMember = {
  id: string;
  displayName: string;
  email?: string;
  role: "admin" | "member";
  joinedAt: number | null;
};

type LiveGroup = {
  id: string;
  name: string;
  code: string;
  createdBy: string;
  createdAt: number | null;
  locked: boolean;
  members: Record<string, LiveGroupMember>;
};

type ClubMember = {
  id: string;
  name: string;
  role: "Admin" | "Member";
  joined: string;
  joinedAt: number | null;
};

type ClubRecord = {
  id: string;
  name: string;
  status: ClubStatus;
  members: number;
  payingMembers: number;
  revenue: number;
  lastActive: string;
  plan: string;
  codeDigits: string;
  roster: ClubMember[];
  createdAt: number;
};

function normalizeTimestamp(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function sanitizeDigits(input: string) {
  const digits = (input || "").replace(/[^0-9]/g, "");
  if (!digits) return "";
  return digits.slice(-4).padStart(4, "0");
}

function formatJoinCode(digits: string) {
  return digits ? `#${digits}` : "";
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function money(value: number) {
  return value > 0 ? `$${value}` : "-";
}

function avatarTone(index: number) {
  const tones = [
    { bg: "#1a1a3a", fg: "#7f77dd" },
    { bg: "#0f2a1a", fg: "#1d9e75" },
    { bg: "#2a1a0f", fg: "#d85a30" },
    { bg: "#2a0f1a", fg: "#d4537e" },
  ];
  return tones[index % tones.length];
}

function isPayingUser(user?: Pick<LiveUser, "premiumAccess" | "subscriptionStatus"> | null) {
  return !!user && (user.premiumAccess || user.subscriptionStatus === "active");
}

function maxTimestamp(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0);
  return valid.length ? Math.max(...valid) : null;
}

function formatRelativeTime(timestamp: number | null) {
  if (!timestamp) return "unknown";
  const msPerDay = 86_400_000;
  const elapsedDays = Math.max(0, Math.floor((Date.now() - timestamp) / msPerDay));
  if (elapsedDays === 0) return "today";
  if (elapsedDays === 1) return "1 day ago";
  if (elapsedDays < 7) return `${elapsedDays} days ago`;
  const weeks = Math.floor(elapsedDays / 7);
  if (weeks === 1) return "1 week ago";
  if (weeks < 5) return `${weeks} weeks ago`;
  const months = Math.floor(elapsedDays / 30);
  if (months <= 1) return "1 month ago";
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(elapsedDays / 365);
  return years <= 1 ? "1 year ago" : `${years} years ago`;
}

function formatJoinedDate(timestamp: number | null) {
  if (!timestamp) return "unknown";
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

function formatInboxTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function normalizeUserRecord(id: string, raw: RawUserRecord): LiveUser {
  const email = typeof raw?.email === "string" ? raw.email : "";
  const displayName =
    typeof raw?.displayName === "string" && raw.displayName.trim()
      ? raw.displayName.trim()
      : email.split("@")[0] || "Unknown User";
  const groupRole = raw?.groupRole === "admin" || raw?.groupRole === "member" ? raw.groupRole : null;
  return {
    id: typeof raw?.id === "string" && raw.id.trim() ? raw.id : id,
    email,
    displayName,
    groupId: typeof raw?.groupId === "string" && raw.groupId.trim() ? raw.groupId : null,
    groupRole,
    premiumAccess: raw?.premiumAccess === true,
    subscriptionStatus: typeof raw?.subscriptionStatus === "string" ? raw.subscriptionStatus : undefined,
    createdAt: normalizeTimestamp(raw?.createdAt),
    xpReachedAt: normalizeTimestamp(raw?.xpReachedAt),
    lastStreakAt: normalizeTimestamp(raw?.lastStreakAt),
    subscriptionUpdatedAt: normalizeTimestamp(raw?.subscriptionUpdatedAt),
  };
}

function normalizeGroupMember(id: string, raw: RawGroupMember, createdBy: string): LiveGroupMember {
  const fallbackRole = createdBy && createdBy === id ? "admin" : "member";
  return {
    id: typeof raw?.id === "string" && raw.id.trim() ? raw.id : id,
    displayName:
      typeof raw?.displayName === "string" && raw.displayName.trim() ? raw.displayName.trim() : "Unknown Member",
    email: typeof raw?.email === "string" ? raw.email : undefined,
    role: raw?.role === "admin" || raw?.role === "member" ? raw.role : fallbackRole,
    joinedAt: normalizeTimestamp(raw?.joinedAt),
  };
}

function normalizeGroupRecord(id: string, raw: RawGroupRecord): LiveGroup {
  const createdBy = typeof raw?.createdBy === "string" ? raw.createdBy : "";
  const members = Object.entries(raw?.members || {}).reduce<Record<string, LiveGroupMember>>((acc, [memberId, value]) => {
    acc[memberId] = normalizeGroupMember(memberId, value, createdBy);
    return acc;
  }, {});
  return {
    id: typeof raw?.id === "string" && raw.id.trim() ? raw.id : id,
    name: typeof raw?.name === "string" && raw.name.trim() ? raw.name.trim() : "Untitled Club",
    code: typeof raw?.code === "string" ? raw.code : "",
    createdBy,
    createdAt: normalizeTimestamp(raw?.createdAt),
    locked: raw?.locked === true,
    members,
  };
}

function statusRank(status: ClubStatus) {
  if (status === "active") return 0;
  if (status === "free") return 1;
  return 2;
}

async function generateUniqueJoinCode() {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const digits = Math.floor(Math.random() * 10_000)
      .toString()
      .padStart(4, "0");
    const existing = await get(ref(db, `groupCodes/${digits}`));
    if (!existing.exists()) {
      return digits;
    }
  }
  throw new Error("Could not generate a unique join code right now.");
}

export default function ZacOnly() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [rawUsers, setRawUsers] = useState<Record<string, RawUserRecord>>({});
  const [rawGroups, setRawGroups] = useState<Record<string, RawGroupRecord>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [openRoster, setOpenRoster] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [renameSavingId, setRenameSavingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ClubRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [rawInboxMessages, setRawInboxMessages] = useState<Record<string, RawFeedbackInboxRecord>>({});
  const [inboxOpen, setInboxOpen] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const firebaseUid = auth.currentUser?.uid || null;
  const isAuthorized = !!user && user.id === ZAC_ONLY_UID && firebaseUid === ZAC_ONLY_UID;

  useEffect(() => {
    if (authLoading) return;
    if (!user || !firebaseUid) {
      navigate("/login");
      return;
    }
    if (!isAuthorized) {
      navigate("/");
    }
  }, [authLoading, firebaseUid, isAuthorized, navigate, user]);

  useEffect(() => {
    if (!isAuthorized) {
      setRawUsers({});
      setRawGroups({});
      setRawInboxMessages({});
      setLoading(false);
      return;
    }

    setLoading(true);
    let usersReady = false;
    let groupsReady = false;

    const finishLoading = () => {
      if (usersReady && groupsReady) {
        setLoading(false);
      }
    };

    const handleSyncError = (err: Error) => {
      setLoadError(err.message || "Could not sync the command center.");
      setLoading(false);
    };

    const unsubscribeUsers = onValue(
      ref(db, "users"),
      (snapshot) => {
        setRawUsers((snapshot.val() as Record<string, RawUserRecord>) || {});
        usersReady = true;
        finishLoading();
      },
      handleSyncError,
    );

    const unsubscribeGroups = onValue(
      ref(db, "groups"),
      (snapshot) => {
        setRawGroups((snapshot.val() as Record<string, RawGroupRecord>) || {});
        groupsReady = true;
        finishLoading();
      },
      handleSyncError,
    );

    return () => {
      unsubscribeUsers();
      unsubscribeGroups();
    };
  }, [isAuthorized]);

  useEffect(() => {
    if (!isAuthorized) {
      setRawInboxMessages({});
      setInboxError(null);
      return;
    }

    setInboxError(null);
    void pruneOldFeedbackInboxMessages().catch((err: any) => {
      setInboxError(err?.message || "Could not prune old inbox messages.");
    });

    const unsubscribeInbox = onValue(
      ref(db, "feedbackInbox"),
      (snapshot) => {
        setRawInboxMessages((snapshot.val() as Record<string, RawFeedbackInboxRecord>) || {});
      },
      (err) => {
        setInboxError(err.message || "Could not sync the feedback inbox.");
      },
    );

    return () => {
      unsubscribeInbox();
    };
  }, [isAuthorized]);

  const users = useMemo(() => Object.entries(rawUsers).map(([id, raw]) => normalizeUserRecord(id, raw)), [rawUsers]);

  const usersById = useMemo(
    () =>
      users.reduce<Record<string, LiveUser>>((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {}),
    [users],
  );

  const groups = useMemo(() => Object.entries(rawGroups).map(([id, raw]) => normalizeGroupRecord(id, raw)), [rawGroups]);

  const inboxMessages = useMemo(
    () =>
      Object.entries(rawInboxMessages)
        .map(([id, raw]) => normalizeFeedbackInboxMessage(id, raw))
        .filter((message): message is FeedbackInboxMessage => !!message)
        .sort((left, right) => right.createdAt - left.createdAt),
    [rawInboxMessages],
  );

  const clubs = useMemo<ClubRecord[]>(() => {
    return groups
      .map((group) => {
        const memberships = new Map<string, { member?: LiveGroupMember; user?: LiveUser }>();

        Object.values(group.members).forEach((member) => {
          memberships.set(member.id, { member, user: usersById[member.id] });
        });

        users.forEach((user) => {
          if (user.groupId !== group.id) return;
          const existing = memberships.get(user.id);
          memberships.set(user.id, { member: existing?.member, user });
        });

        const roster = Array.from(memberships.values())
          .map<ClubMember>(({ member, user }) => {
            const role = member?.role ?? user?.groupRole ?? (user?.id === group.createdBy ? "admin" : "member");
            const joinedAt = member?.joinedAt ?? user?.createdAt ?? null;
            return {
              id: member?.id || user?.id || nanoid(),
              name: member?.displayName || user?.displayName || user?.email || "Unknown Member",
              role: role === "admin" ? "Admin" : "Member",
              joinedAt,
              joined: formatJoinedDate(joinedAt),
            };
          })
          .sort((left, right) => {
            if (left.role !== right.role) return left.role === "Admin" ? -1 : 1;
            const leftTime = left.joinedAt || 0;
            const rightTime = right.joinedAt || 0;
            if (leftTime !== rightTime) return rightTime - leftTime;
            return left.name.localeCompare(right.name);
          });

        const codeDigits = sanitizeDigits(group.code || "");
        const isSouthKnightsClub =
          group.id === SOUTH_KNIGHTS_GROUP_ID || codeDigits === SOUTH_KNIGHTS_GROUP_CODE;
        const basePayingMembers = Array.from(memberships.values()).reduce((sum, entry) => {
          return sum + (isPayingUser(entry.user) ? 1 : 0);
        }, 0);
        const payingMembers = isSouthKnightsClub ? Math.max(basePayingMembers, 1) : basePayingMembers;

        const lastActiveAt = maxTimestamp([
          group.createdAt,
          ...Array.from(memberships.values()).flatMap(({ member, user }) => [
            member?.joinedAt,
            user?.xpReachedAt,
            user?.lastStreakAt,
            user?.subscriptionUpdatedAt,
            user?.createdAt,
          ]),
        ]);

        const status: ClubStatus = group.locked ? "locked" : payingMembers > 0 ? "active" : "free";
        const plan = group.locked ? "Cancelled" : payingMembers > 0 ? "Pro" : "Free";

        return {
          id: group.id,
          name: group.name,
          status,
          members: roster.length,
          payingMembers,
          revenue: payingMembers * PRICE_PER_SUBSCRIBER,
          lastActive: formatRelativeTime(lastActiveAt),
          plan,
          codeDigits,
          roster,
          createdAt: group.createdAt || 0,
        };
      })
      .sort((left, right) => {
        const leftRank = statusRank(left.status);
        const rightRank = statusRank(right.status);
        if (leftRank !== rightRank) return leftRank - rightRank;
        if (left.revenue !== right.revenue) return right.revenue - left.revenue;
        if (left.members !== right.members) return right.members - left.members;
        return right.createdAt - left.createdAt;
      });
  }, [groups, users, usersById]);

  const metrics = useMemo(() => {
    const activeClubSubs = clubs.reduce((sum, club) => sum + club.payingMembers, 0);
    const activePersonalSubs = users.reduce((sum, user) => {
      if (user.groupId) return sum;
      return sum + (isPayingUser(user) ? 1 : 0);
    }, 0);
    const activeSubs = activeClubSubs + activePersonalSubs;
    return {
      totalClubs: groups.length,
      activeSubs,
      totalMembers: users.length,
      mrr: activeSubs * PRICE_PER_SUBSCRIBER,
    };
  }, [clubs, groups.length, users]);

  const filteredClubs = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return clubs;

    const digitNeedle = needle.replace(/[^0-9]/g, "");
    const scored = clubs
      .map((club) => {
        const name = club.name.toLowerCase();
        const id = club.id.toLowerCase();
        const code = club.codeDigits;
        let score = -1;

        if (name === needle || id === needle || (digitNeedle && code === digitNeedle)) {
          score = 4;
        } else if (name.startsWith(needle) || id.startsWith(needle) || (digitNeedle && code.startsWith(digitNeedle))) {
          score = 3;
        } else if (name.includes(needle) || id.includes(needle) || (digitNeedle && code.includes(digitNeedle))) {
          score = 2;
        } else {
          const compactName = name.replace(/\s+/g, "");
          if (compactName.includes(needle.replace(/\s+/g, ""))) {
            score = 1;
          }
        }

        return { club, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((left, right) => {
        if (left.score !== right.score) return right.score - left.score;
        if (left.club.revenue !== right.club.revenue) return right.club.revenue - left.club.revenue;
        if (left.club.members !== right.club.members) return right.club.members - left.club.members;
        return left.club.name.localeCompare(right.club.name);
      });

    return scored.length ? [scored[0].club] : [];
  }, [clubs, searchQuery]);

  const dismissRename = () => {
    setEditingId(null);
    setEditingName("");
  };

  const startRename = (club: ClubRecord) => {
    setActionError(null);
    setEditingId(club.id);
    setEditingName(club.name);
  };

  const saveRename = async (club: ClubRecord) => {
    const nextName = editingName.trim();
    if (!nextName) {
      dismissRename();
      return;
    }
    if (nextName === club.name) {
      dismissRename();
      return;
    }

    setRenameSavingId(club.id);
    setActionError(null);

    try {
      await update(ref(db, `groups/${club.id}`), { name: nextName });

      await Promise.all(
        users
          .filter((user) => user.groupId === club.id)
          .map((user) => update(ref(db, `users/${user.id}`), { groupName: nextName })),
      );
      dismissRename();
    } catch (err: any) {
      setActionError(err?.message || "Could not rename that club.");
    } finally {
      setRenameSavingId(null);
    }
  };

  const openCreateModal = () => {
    setCreateName("");
    setCreateError(null);
    setActionError(null);
    setCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    if (createLoading) return;
    setCreateModalOpen(false);
    setCreateName("");
    setCreateError(null);
  };

  const deployClub = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextName = createName.trim();
    if (!nextName) {
      setCreateError("Enter a club name first.");
      return;
    }

    setCreateLoading(true);
    setCreateError(null);
    setActionError(null);

    try {
      const digits = await generateUniqueJoinCode();
      const groupId = nanoid();
      const payload: LiveGroup & { members: Record<string, LiveGroupMember> } = {
        id: groupId,
        name: nextName,
        code: formatJoinCode(digits),
        createdBy: auth.currentUser?.uid || "system",
        createdAt: Date.now(),
        locked: false,
        members: {},
      };

      await set(ref(db, `groups/${groupId}`), payload);
      await set(ref(db, `groupCodes/${digits}`), groupId);

      setCreateModalOpen(false);
      setCreateName("");
      setCreateError(null);
    } catch (err: any) {
      const message = err?.message || "Could not deploy the new club.";
      setCreateError(message);
      setActionError(message);
    } finally {
      setCreateLoading(false);
    }
  };

  const destroyClub = async () => {
    if (!pendingDelete) return;

    setDeleteLoading(true);
    setActionError(null);

    try {
      if (pendingDelete.codeDigits) {
        await remove(ref(db, `groupCodes/${pendingDelete.codeDigits}`));
      }

      await remove(ref(db, `groups/${pendingDelete.id}`));

      await Promise.all(
        users
          .filter((user) => user.groupId === pendingDelete.id)
          .map((user) =>
            update(ref(db, `users/${user.id}`), {
              accountType: "personal",
              groupId: null,
              groupCode: null,
              groupName: null,
              groupRole: null,
              groupLocked: null,
            }),
          ),
      );
      setPendingDelete(null);
    } catch (err: any) {
      setActionError(err?.message || "Could not destroy that club.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const copyCode = async (clubId: string, codeDigits: string) => {
    if (!codeDigits) return;

    try {
      await navigator.clipboard.writeText(codeDigits);
      setCopiedId(clubId);
      window.setTimeout(() => {
        setCopiedId((current) => (current === clubId ? null : current));
      }, 1200);
    } catch {
      setCopiedId(null);
    }
  };

  const statusMessage = actionError || loadError || inboxError;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white/70">
        Loading...
      </div>
    );
  }

  if (!user || !firebaseUid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white/70">
        Redirecting to login...
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white/70">
        Redirecting...
      </div>
    );
  }

  return (
    <div className="zac-only-shell">
      <div className="zac-only-page">
        <div className="zac-command">
          <div className="zac-topbar">
            <div className="zac-brand">
              <button className="zac-back" onClick={() => navigate("/")}>
                <ArrowLeft size={15} />
              </button>
              <div className="zac-brand-icon">1</div>
              <div>
                <div className="zac-brand-name">Pawn Point</div>
                <div className="zac-brand-sub">Command Center</div>
              </div>
            </div>
            <div className="zac-topbar-right">
              <span className="zac-live">
                <span className="zac-pulse" />
                Live
              </span>
              <span className="zac-classified">Classified</span>
            </div>
          </div>

          <div className="zac-metrics">
            <div className="zac-metric-card">
              <div className="zac-metric-label">Total Clubs</div>
              <div className="zac-metric-value zac-accent">{metrics.totalClubs}</div>
              <div className="zac-metric-sub">all territories</div>
            </div>
            <div className="zac-metric-card">
              <div className="zac-metric-label">Active Subs</div>
              <div className="zac-metric-value">{metrics.activeSubs}</div>
              <div className="zac-metric-sub">paying users</div>
            </div>
            <div className="zac-metric-card">
              <div className="zac-metric-label">Total Members</div>
              <div className="zac-metric-value">{metrics.totalMembers}</div>
              <div className="zac-metric-sub">all app accounts</div>
            </div>
            <div className="zac-metric-card">
              <div className="zac-metric-label">MRR</div>
              <div className="zac-metric-value zac-accent">${metrics.mrr}</div>
              <div className="zac-metric-sub">all paying users</div>
            </div>
          </div>

          <div className="zac-divider" />

          <div className="zac-section-row">
            <div className="zac-section-left">
              <span className="zac-section-label">Territories</span>
              <input
                className="zac-search-input"
                placeholder="Search clubs"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <div className="zac-section-actions">
              <button className="zac-inbox-btn" onClick={() => setInboxOpen(true)}>
                <Inbox size={16} />
                Inbox
                <span className="zac-inbox-count">{inboxMessages.length}</span>
              </button>
              <button className="zac-deploy-btn" onClick={openCreateModal}>
                <Plus size={16} />
                Deploy New Club
              </button>
            </div>
          </div>

          {loading && <div className="zac-status-banner">Syncing live Firebase data...</div>}
          {statusMessage && !loading && <div className="zac-status-banner is-error">{statusMessage}</div>}

          <div className="zac-clubs">
            {!loading && !clubs.length && <div className="zac-empty-state">No clubs exist in Firebase yet.</div>}
            {!loading && !!clubs.length && !filteredClubs.length && (
              <div className="zac-empty-state">No clubs match that search.</div>
            )}

            {filteredClubs.map((club, index) => {
              const tone = avatarTone(index);
              const rosterOpen = !!openRoster[club.id];
              return (
                <div key={club.id} className={`zac-club-card zac-status-${club.status}`}>
                  <div className="zac-club-top">
                    <div className="zac-club-left">
                      <div className="zac-avatar" style={{ backgroundColor: tone.bg, color: tone.fg }}>
                        {initials(club.name)}
                      </div>
                      <div>
                        <div className="zac-club-name-row">
                          {editingId === club.id ? (
                            <input
                              autoFocus
                              className="zac-name-input"
                              disabled={renameSavingId === club.id}
                              value={editingName}
                              onChange={(event) => setEditingName(event.target.value)}
                              onBlur={() => {
                                void saveRename(club);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  void saveRename(club);
                                }
                                if (event.key === "Escape") {
                                  dismissRename();
                                }
                              }}
                            />
                          ) : (
                            <span className="zac-club-name">{club.name}</span>
                          )}
                          {editingId !== club.id && (
                            <button className="zac-inline-btn" onClick={() => startRename(club)}>
                              <PencilLine size={14} />
                              rename
                            </button>
                          )}
                        </div>
                        <div className="zac-club-meta">
                          {club.id} / {club.plan}
                        </div>
                      </div>
                    </div>
                    <div className="zac-club-right">
                      <span className={`zac-badge zac-badge-${club.status}`}>
                        {club.status === "locked" ? "locked" : club.status}
                      </span>
                      <button className="zac-destroy-btn" onClick={() => setPendingDelete(club)}>
                        <Trash2 size={14} />
                        destroy
                      </button>
                    </div>
                  </div>

                  <div className="zac-stats-grid">
                    <div className="zac-stat-box">
                      <div className="zac-stat-label">Members</div>
                      <div className="zac-stat-value">{club.members}</div>
                    </div>
                    <div className="zac-stat-box">
                      <div className="zac-stat-label">MRR</div>
                      <div className="zac-stat-value">{money(club.revenue)}</div>
                    </div>
                    <div className="zac-stat-box">
                      <div className="zac-stat-label">Last Active</div>
                      <div className="zac-stat-value zac-small">{club.lastActive}</div>
                    </div>
                    <div className="zac-stat-box">
                      <div className="zac-stat-label">Plan</div>
                      <div className="zac-stat-value zac-small">{club.plan}</div>
                    </div>
                    <div className="zac-code-box">
                      <div>
                        <div className="zac-stat-label">Join Code</div>
                        <div className="zac-join-code">{club.codeDigits || "----"}</div>
                      </div>
                      <button
                        className={`zac-copy-btn${copiedId === club.id ? " copied" : ""}`}
                        disabled={!club.codeDigits}
                        onClick={() => copyCode(club.id, club.codeDigits)}
                      >
                        {copiedId === club.id ? (
                          <>
                            <Check size={14} />
                            copied
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    className="zac-roster-toggle"
                    onClick={() => setOpenRoster((current) => ({ ...current, [club.id]: !current[club.id] }))}
                  >
                    {rosterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    roster ({club.roster.length})
                  </button>

                  {rosterOpen && (
                    <div className="zac-roster">
                      {club.roster.length ? (
                        club.roster.map((member) => (
                          <div key={`${club.id}-${member.id}`} className="zac-member-row">
                            <div className="zac-member-left">
                              <span className="zac-member-name">{member.name}</span>
                              <span className={`zac-role-badge ${member.role === "Admin" ? "is-admin" : "is-member"}`}>
                                {member.role}
                              </span>
                            </div>
                            <span className="zac-member-joined">{member.joined}</span>
                          </div>
                        ))
                      ) : (
                        <div className="zac-empty-roster">No members in this club yet.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {createModalOpen && (
          <div className="zac-modal-backdrop" onClick={closeCreateModal}>
            <div className="zac-modal" onClick={(event) => event.stopPropagation()}>
              <div className="zac-modal-title">Deploy New Club</div>
              <div className="zac-modal-body">Enter the club name and Pawn Point will provision a live join code in Firebase.</div>
              <form className="zac-modal-form" onSubmit={deployClub}>
                <input
                  autoFocus
                  className="zac-modal-input"
                  placeholder="Club name"
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                />
                <div className="zac-modal-note">First member to join an empty club will become its admin.</div>
                {createError && <div className="zac-modal-error">{createError}</div>}
                <div className="zac-modal-actions">
                  <button className="zac-modal-cancel" type="button" onClick={closeCreateModal}>
                    abort
                  </button>
                  <button className="zac-modal-confirm" disabled={createLoading} type="submit">
                    {createLoading ? "deploying..." : "deploy"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {inboxOpen && (
          <div className="zac-modal-backdrop" onClick={() => setInboxOpen(false)}>
            <div className="zac-modal zac-inbox-modal" onClick={(event) => event.stopPropagation()}>
              <div className="zac-modal-header">
                <div>
                  <div className="zac-modal-title">Feedback Inbox</div>
                  <div className="zac-modal-body">Showing feedback from the last 30 days only.</div>
                </div>
                <button className="zac-inbox-close" onClick={() => setInboxOpen(false)} type="button">
                  <X size={16} />
                </button>
              </div>

              {inboxError && <div className="zac-modal-error">{inboxError}</div>}

              <div className="zac-inbox-list">
                {!inboxMessages.length ? (
                  <div className="zac-empty-roster">No feedback messages from the last 30 days.</div>
                ) : (
                  inboxMessages.map((message) => (
                    <div key={message.id} className="zac-inbox-item">
                      <div className="zac-inbox-item-top">
                        <div>
                          <div className="zac-inbox-name">{message.senderName}</div>
                          <div className="zac-inbox-email">{message.senderEmail || message.senderId}</div>
                        </div>
                        <div className="zac-inbox-meta">
                          <span className="zac-role-badge is-admin">{message.mood}</span>
                          <span className="zac-member-joined">{formatInboxTimestamp(message.createdAt)}</span>
                        </div>
                      </div>
                      <div className="zac-inbox-message">{message.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {pendingDelete && (
          <div className="zac-modal-backdrop" onClick={() => (deleteLoading ? null : setPendingDelete(null))}>
            <div className="zac-modal" onClick={(event) => event.stopPropagation()}>
              <div className="zac-modal-title">Confirm deletion</div>
              <div className="zac-modal-body">
                Permanently destroy "{pendingDelete.name}" and clear all attached member group data. This cannot be undone.
              </div>
              <div className="zac-modal-actions">
                <button className="zac-modal-cancel" disabled={deleteLoading} onClick={() => setPendingDelete(null)}>
                  abort
                </button>
                <button className="zac-modal-confirm" disabled={deleteLoading} onClick={destroyClub}>
                  {deleteLoading ? "destroying..." : "destroy"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
