import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/AppShell";
import adventImage from "../assets/Advent Calendar.png";
import { Lock, Unlock, Pencil, CheckCircle2, Video, Image as ImageIcon, Tag, Crown } from "lucide-react";
import loginBg from "../assets/Login screen.png";
import christmasPawn from "../assets/Christmas Pawn.png";
import giftImg from "../assets/Gift.png";
import grinchPfp from "../assets/Grinch pfp.png";
import mistletoePfp from "../assets/Mistletoe pfp.png";
import rookPfp from "../assets/Rook pfp.png";
import santaPfp from "../assets/Santa pfp.png";
import snowmanPfp from "../assets/Snowman pfp.png";
import treePfp from "../assets/Tree pfp.png";
import { useAuth } from "../hooks/useAuth";
import { claimXpForPawns, unlockGift } from "../lib/mockApi";
import { Button } from "../components/ui/Button";
import { db } from "../lib/firebase";
import { get, ref, set } from "firebase/database";

type GiftConfig =
  | { type: "pfp"; value: string }
  | { type: "tagline"; value: string }
  | { type: "piece"; value: string }
  | { type: "video"; value: string }
  | { type: "pawns"; value: number };

const profilePicChoices = [
  { label: "Gift Box", value: giftImg },
  { label: "Christmas Pawn", value: christmasPawn },
  { label: "Advent Banner", value: adventImage },
  { label: "Grinch", value: grinchPfp },
  { label: "Mistletoe", value: mistletoePfp },
  { label: "Rook", value: rookPfp },
  { label: "Santa", value: santaPfp },
  { label: "Snowman", value: snowmanPfp },
  { label: "Tree", value: treePfp },
];

const pieceChoices = [
  "Emerald King",
  "Sapphire Queen",
  "Ruby Rook",
  "Amber Bishop",
  "Onyx Knight",
  "Ivory Pawn",
];

export default function AdventCalendar() {
  const { user, setUser } = useAuth();
  const [countdown, setCountdown] = useState(getChristmasCountdown());
  const unlockedCount = useMemo(
    () => getAdventUnlockedCount(countdown),
    [countdown.calendarDay, countdown.calendarMonth],
  );
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [showCashIn, setShowCashIn] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [giftConfigs, setGiftConfigs] = useState<Record<number, GiftConfig>>({});
  const [draftGift, setDraftGift] = useState<GiftConfig>({ type: "pfp", value: profilePicChoices[0].value });
  const [giftModal, setGiftModal] = useState<{ day: number; gift: GiftConfig } | null>(null);
  const [unlockedVideos, setUnlockedVideos] = useState<Record<number, string>>(() => {
    try {
      const raw = localStorage.getItem("advent_unlocked_videos");
      return raw ? (JSON.parse(raw) as Record<number, string>) : {};
    } catch {
      return {};
    }
  });
  const [claimedDays, setClaimedDays] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem("advent_claimed_days");
      if (!raw) return new Set();
      return new Set<number>(JSON.parse(raw));
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    const id = setInterval(() => setCountdown(getChristmasCountdown()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const loadGifts = async () => {
      try {
        const snap = await get(ref(db, "adventGifts"));
        if (snap.exists()) {
          setGiftConfigs(snap.val() as Record<number, GiftConfig>);
        }
      } catch (err) {
        console.warn("Failed to load advent gifts", err);
      }
    };
    loadGifts();
  }, []);

  const totalXp = user?.totalXp ?? 0;
  const pawnCount = user?.pawns ?? 0;
  const claimablePawns = Math.floor(totalXp / 25);
  const isAdmin = !!user?.isAdmin;
  const getVideoSrc = (day: number, gift?: GiftConfig | null) =>
    gift?.type === "video" ? unlockedVideos[day] || gift.value : "";
  const openVideo = (url?: string) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const markClaimed = (day: number) => {
    setClaimedDays((prev) => {
      if (prev.has(day)) return prev;
      const next = new Set(prev);
      next.add(day);
      localStorage.setItem("advent_claimed_days", JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const handleGiftClaim = async (day: number, gift: GiftConfig) => {
    if (!user) return;
    let modalGift: GiftConfig = gift;
    try {
      const updated = await unlockGift(user.id, gift);
      if (updated) setUser(updated);
      if (gift.type === "video" && gift.value) {
        setUnlockedVideos((prev) => {
          const next = { ...prev, [day]: gift.value };
          localStorage.setItem("advent_unlocked_videos", JSON.stringify(next));
          return next;
        });
      }
      modalGift = gift.type === "video" ? { ...gift, value: getVideoSrc(day, gift) } : gift;
    } catch (err) {
      console.warn("Failed to unlock gift", err);
    } finally {
      markClaimed(day);
      setGiftModal({ day, gift: modalGift });
    }
  };

  const purchaseReward = async (day: number, cost: number, gift?: GiftConfig) => {
    if (!user) return;
    const effectiveGift = gift || giftConfigs[day] || { type: "pawns", value: cost };
    if (claimedDays.has(day)) {
      setFlipped((prev) => ({ ...prev, [day]: true }));
      setGiftModal({
        day,
        gift: effectiveGift.type === "video" ? { ...effectiveGift, value: getVideoSrc(day, effectiveGift) } : effectiveGift,
      });
      return;
    }
    if ((user.pawns || 0) < cost) {
      alert("Not enough pawns to unlock this reward.");
      return;
    }
    const newPawns = (user.pawns || 0) - cost;
    const updatedUser = { ...user, pawns: newPawns };
    setUser(updatedUser);
    localStorage.setItem("pawnpoint_user", JSON.stringify(updatedUser));
    try {
      await set(ref(db, `users/${user.id}`), updatedUser);
    } catch (err) {
      console.warn("Failed to update pawns after purchase", err);
    }
    setFlipped((prev) => ({ ...prev, [day]: true }));
    await handleGiftClaim(day, effectiveGift);
  };

  return (
    <AppShell>
      <div className="relative w-full min-h-screen overflow-hidden">
        <div
          className="fixed inset-0 -z-10"
          style={{
            backgroundImage: `url(${loginBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
        <div className="relative flex flex-col items-center gap-6 px-4 pb-12 pt-12">
          <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-2 text-white shadow-lg">
            <img src={christmasPawn} alt="Pawn counter" className="h-6 w-6 object-contain" />
            <div className="text-sm font-semibold">{pawnCount} Pawns</div>
          </div>
          <div className="w-full max-w-5xl flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 text-center sm:text-left">
              <img src={christmasPawn} alt="Christmas Pawn" className="h-16 w-16 object-contain mx-auto sm:mx-0" />
              <div className="text-white space-y-1">
                <div className="text-lg font-semibold">Welcome to the Pawn Point Advent Calendar!</div>
                <div className="text-sm text-white/80 leading-relaxed">
                  Every day leading up to Christmas, you can open a new tile and unlock a special holiday-themed cosmetic,
                  surprise reward, or limited-edition item. Check back daily to discover what the South Knight has prepared
                  for you—your festive journey begins now!
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-5xl rounded-3xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden relative mx-auto">
            <img src={adventImage} alt="Advent Calendar" className="w-full h-full object-contain" />
            <div className="absolute inset-3 sm:inset-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 grid-rows-4 gap-2 sm:gap-1.5 p-1 pointer-events-none">
              {Array.from({ length: 24 }).map((_, idx) => {
                const day = idx + 1;
                const unlocked = day <= unlockedCount;
                const isFlipped = flipped[day] || claimedDays.has(day);
                const pawnReward = day * 10;
                const assignedGift = giftConfigs[day];
                return (
                  <div
                    key={idx}
                    className={`reward-card relative rounded-lg bg-black/45 backdrop-blur-sm border border-white/10 flex flex-col items-center justify-center gap-2 text-white font-semibold text-sm pointer-events-auto transition-transform duration-500 ${
                      isFlipped ? "rotate-y-180" : ""
                    }`}
                    style={{ transformStyle: "preserve-3d" }}
                    onClick={() => {
                      if (isFlipped) return;
                      if (unlocked || isAdmin) {
                        setFlipped((prev) => ({ ...prev, [day]: true }));
                        if (assignedGift) {
                          handleGiftClaim(day, assignedGift);
                        }
                      }
                    }}
                  >
                    {isAdmin && (
                      <button
                        className="absolute right-1.5 top-1.5 h-7 w-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingDay(day);
                          setDraftGift(giftConfigs[day] || { type: "pfp", value: profilePicChoices[0].value });
                        }}
                        aria-label="Edit gift"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    {!isFlipped ? (
                      <div className="flex flex-col items-center gap-2 py-3 px-2">
                        <div className="flex items-center gap-2">
                          {unlocked ? (
                            <Unlock className="h-4 w-4 text-emerald-300" />
                          ) : (
                            <Lock className="h-4 w-4 text-white/80" />
                          )}
                          <span>{day}</span>
                        </div>
                        {(unlocked || isAdmin) && (
                          <button
                            type="button"
                            className="text-xs px-2 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-semibold relative z-10"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!unlocked && !isAdmin) return;
                              await purchaseReward(day, pawnReward, assignedGift);
                            }}
                          >
                            Redeem
                          </button>
                        )}
                        {assignedGift && isAdmin && (
                          <div className="text-[10px] text-white/70 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-300" />
                            <span>{renderGiftLabel(assignedGift)}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        className="flex flex-col items-center justify-center gap-3 w-full h-full bg-gradient-to-br from-[#3b0b47] via-[#4c0c58] to-[#2b0a38] rounded-lg relative p-2 text-center"
                        style={{ transform: "rotateY(180deg)" }}
                      >
                        <button
                          className="absolute right-2 top-2 text-white/80 hover:text-white text-sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setFlipped((prev) => ({ ...prev, [day]: false }));
                          }}
                          aria-label="Close reward"
                        >
                          ×
                        </button>
                        <img
                          src={giftImg}
                          alt="Gift"
                          className="h-20 w-20 md:h-24 md:w-24 object-contain drop-shadow-[0_12px_24px_rgba(255,180,80,0.75)] animate-bounce"
                        />
                        <div className="space-y-1 text-xs text-white/80">
                          <div className="font-semibold text-sm text-white">Reward</div>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-4 py-1.5 text-xs font-semibold text-[#2b0b38] shadow-md hover:shadow-lg"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!unlocked && !isAdmin) return;
                              await purchaseReward(day, pawnReward, assignedGift);
                            }}
                          >
                            {`${pawnReward} Pawns`}
                          </button>
                          {assignedGift && (
                            <div className="text-[11px] text-white/80">
                              Unlocked: {renderGiftLabel(assignedGift)}
                            </div>
                          )}
                          {assignedGift?.type === "video" && getVideoSrc(day, assignedGift) && (
                            <Button
                              size="sm"
                              className="mt-1 bg-emerald-500 text-slate-900 hover:bg-emerald-400"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openVideo(getVideoSrc(day, assignedGift));
                              }}
                            >
                              Watch Video
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            className="mt-2 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            onClick={() => setShowCashIn(true)}
          >
            Cash in XP
          </button>
        </div>

        {showCashIn && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4">
            <div className="pp-modal w-full max-w-md rounded-2xl bg-slate-900 text-white border border-white/10 shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">Cash in XP</div>
                  <div className="text-sm text-white/70">Convert your XP into Pawns (25 XP = 1 Pawn)</div>
                </div>
                <button
                  className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                  onClick={() => setShowCashIn(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                  <div className="text-sm text-white/70">Your XP</div>
                  <div className="text-lg font-semibold text-white">{totalXp} XP</div>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <img src={christmasPawn} alt="Pawn" className="h-6 w-6 object-contain" />
                    <span>Pawns you can claim</span>
                  </div>
                  <div className="text-lg font-semibold text-white">{claimablePawns}</div>
                </div>
              </div>
              <div className="text-xs text-white/60">
                Pawns are calculated from your current XP. Check back after earning more XP to claim additional Pawns.
              </div>
              <div className="flex justify-between items-center gap-3">
                <button
                  className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!user || claimablePawns <= 0}
                  onClick={async () => {
                    if (!user || claimablePawns <= 0) return;
                    const result = await claimXpForPawns(user.id);
                    if (result) {
                      setUser((prev) =>
                        prev
                          ? {
                              ...prev,
                              pawns: (prev.pawns || 0) + result.pawnsAdded,
                              totalXp: result.remainingXp,
                              level: Math.floor(result.remainingXp / 100) + 1,
                            }
                          : prev,
                      );
                    }
                  }}
                >
                  Claim Now!
                </button>
                <button
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400"
                  onClick={() => setShowCashIn(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {editingDay !== null && isAdmin && (
          <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/60 px-4 py-10 overflow-y-auto">
            <div className="pp-modal w-full max-w-2xl rounded-2xl bg-slate-900 text-white border border-white/10 shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">Edit Gift for Day {editingDay}</div>
                  <div className="text-sm text-white/70">Choose what users receive when they open this tile.</div>
                </div>
                <button
                  className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                  onClick={() => setEditingDay(null)}
                  aria-label="Close gift editor"
                >
                  Ç-
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gift-type"
                    checked={draftGift.type === "pfp"}
                    onChange={() => setDraftGift({ type: "pfp", value: profilePicChoices[0].value })}
                    className="accent-emerald-400"
                  />
                  <ImageIcon className="h-4 w-4 text-emerald-300" />
                  <span>Profile Picture</span>
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gift-type"
                    checked={draftGift.type === "tagline"}
                    onChange={() => setDraftGift({ type: "tagline", value: "" })}
                    className="accent-emerald-400"
                  />
                  <Tag className="h-4 w-4 text-emerald-300" />
                  <span>Special Tagline</span>
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gift-type"
                    checked={draftGift.type === "piece"}
                    onChange={() => setDraftGift({ type: "piece", value: pieceChoices[0] })}
                    className="accent-emerald-400"
                  />
                  <Crown className="h-4 w-4 text-emerald-300" />
                  <span>Chess Piece Cosmetic</span>
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gift-type"
                    checked={draftGift.type === "video"}
                    onChange={() => setDraftGift({ type: "video", value: "" })}
                    className="accent-emerald-400"
                  />
                  <Video className="h-4 w-4 text-emerald-300" />
                  <span>Video</span>
                </label>
              </div>

              {draftGift.type === "pfp" && (
                <div className="space-y-2">
                  <div className="text-sm text-white/70">Select profile picture</div>
                  <div className="grid grid-cols-3 gap-3">
                    {profilePicChoices.map((pic) => (
                      <button
                        key={pic.value}
                        className={`relative rounded-xl border px-2 py-2 bg-white/5 hover:bg-white/10 ${
                          draftGift.value === pic.value ? "border-emerald-400 ring-2 ring-emerald-300/60" : "border-white/10"
                        }`}
                        onClick={() => setDraftGift({ type: "pfp", value: pic.value })}
                      >
                        <img src={pic.value} alt={pic.label} className="h-16 w-full object-cover rounded-lg" />
                        <div className="mt-1 text-xs text-white/80 text-center">{pic.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {draftGift.type === "tagline" && (
                <div className="space-y-2">
                  <div className="text-sm text-white/70">Custom tagline</div>
                  <input
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder='e.g. "The Calculator"'
                    value={draftGift.value}
                    onChange={(e) => setDraftGift({ type: "tagline", value: e.target.value })}
                  />
                </div>
              )}

              {draftGift.type === "piece" && (
                <div className="space-y-2">
                  <div className="text-sm text-white/70">Select chess piece cosmetic</div>
                  <div className="grid grid-cols-2 gap-2">
                    {pieceChoices.map((piece) => (
                      <button
                        key={piece}
                        className={`rounded-xl border px-3 py-2 text-left text-sm ${
                          draftGift.value === piece ? "border-emerald-400 bg-emerald-400/10" : "border-white/10 bg-white/5"
                        }`}
                        onClick={() => setDraftGift({ type: "piece", value: piece })}
                      >
                        {piece}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {draftGift.type === "video" && (
                <div className="space-y-2">
                  <div className="text-sm text-white/70">Video URL (MP4 or stream link)</div>
                  <input
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="https://..."
                    value={draftGift.value}
                    onChange={(e) => setDraftGift({ type: "video", value: e.target.value })}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setEditingDay(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (editingDay === null) return;
                    setGiftConfigs((prev) => ({ ...prev, [editingDay]: draftGift }));
                    (async () => {
                      try {
                        await set(ref(db, `adventGifts/${editingDay}`), draftGift);
                      } catch (err) {
                        console.warn("Failed to persist gift config", err);
                      } finally {
                        setEditingDay(null);
                      }
                    })();
                  }}
                >
                  Save Gift
                </Button>
              </div>
            </div>
          </div>
        )}

        {giftModal && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
            <div className="pp-modal w-full max-w-lg rounded-2xl bg-slate-900 text-white border border-white/10 shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">You unlocked Day {giftModal.day}</div>
                  <div className="text-sm text-white/70">Enjoy your new reward!</div>
                </div>
                <button
                  className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                  onClick={() => setGiftModal(null)}
                  aria-label="Close"
                >
                  Ç-
                </button>
              </div>

              {giftModal.gift.type === "pfp" && (
                <div className="space-y-3 text-sm">
                  <div className="text-white/80">Profile Picture unlocked.</div>
                  <img
                    src={giftModal.gift.value}
                    alt="Unlocked avatar"
                    className="h-32 w-32 rounded-full object-cover border border-white/10 shadow-lg mx-auto"
                  />
                  <div className="text-white/70 text-sm text-center">Equip it from My Profile.</div>
                </div>
              )}

              {giftModal.gift.type === "tagline" && (
                <div className="space-y-3 text-sm">
                  <div className="text-white/80">New tagline unlocked:</div>
                  <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-center text-emerald-200 font-semibold">
                    {giftModal.gift.value || "New Tagline"}
                  </div>
                  <div className="text-white/70 text-sm text-center">Manage taglines in My Profile.</div>
                </div>
              )}

              {giftModal.gift.type === "video" && (
                <div className="space-y-3 text-sm">
                  <div className="text-white/80">Video unlocked:</div>
                  {giftModal.gift.value ? (
                    <Button
                      className="bg-emerald-500 text-slate-900 hover:bg-emerald-400"
                      onClick={() => openVideo(giftModal.gift.value)}
                    >
                      Watch Video
                    </Button>
                  ) : (
                    <div className="text-white/60">No video URL provided.</div>
                  )}
                  <div className="text-white/70 text-sm text-center">You can rewatch from this tile anytime.</div>
                </div>
              )}

              {giftModal.gift.type === "piece" && (
                <div className="space-y-3 text-sm">
                  <div className="text-white/80">Chess set unlocked:</div>
                  <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-center text-emerald-200 font-semibold">
                    {giftModal.gift.value || "New Chess Set"}
                  </div>
                  <div className="text-white/70 text-sm text-center">Available in Board Customisation.</div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => setGiftModal(null)}>Close</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function getChristmasCountdown() {
  const now = new Date();
  const nowParts = getSastDateTimeParts(now);
  const nowSastMs = Date.UTC(
    nowParts.year,
    nowParts.month - 1,
    nowParts.day,
    nowParts.hour,
    nowParts.minute,
    nowParts.second,
  );
  const christmasSastMs = Date.UTC(nowParts.year, 11, 25, 0, 0, 0);
  const diff = christmasSastMs - nowSastMs;
  const totalSeconds = Math.max(0, Math.floor(diff / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return {
    days,
    hours,
    minutes,
    seconds,
    calendarDay: nowParts.day,
    calendarMonth: nowParts.month,
  };
}

function getSastDateTimeParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = part.value;
  }
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function getAdventUnlockedCount(countdown: ReturnType<typeof getChristmasCountdown>) {
  if (countdown.calendarMonth < 12) return 0;
  if (countdown.calendarMonth > 12) return 24;
  return Math.min(24, Math.max(0, countdown.calendarDay));
}

function FlipCountdown({ days }: { days: number }) {
  const padded = String(Math.max(0, days)).padStart(2, "0");
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        {padded.split("").map((digit, idx) => (
          <div
            key={`${digit}-${idx}`}
            className="relative h-20 w-14 rounded-md bg-[#1c1c1c] text-white text-4xl font-extrabold flex items-center justify-center shadow-[0_10px_25px_rgba(0,0,0,0.45)] border border-[#2a2a2a]"
          >
            <span>{digit}</span>
            <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
          </div>
        ))}
      </div>
      <div className="text-lg font-bold text-white">DAYS LEFT</div>
    </div>
  );
}

function renderGiftLabel(gift: GiftConfig) {
  switch (gift.type) {
    case "pfp":
      return "Profile Picture";
    case "tagline":
      return gift.value ? `Tagline: ${gift.value}` : "Tagline";
    case "piece":
      return gift.value || "Chess Piece";
    case "video":
      return "Video Reward";
    case "pawns":
      return `${gift.value} Pawns`;
    default:
      return "Reward";
  }
}
