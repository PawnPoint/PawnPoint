import { get, push, ref, remove, set } from "firebase/database";
import { db } from "./firebase";

export const FEEDBACK_INBOX_PATH = "feedbackInbox";
export const FEEDBACK_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const FEEDBACK_MOODS = new Set(["Angry", "Dislike", "Meh", "Happy", "Excited"]);

export type FeedbackInboxMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  mood: string;
  message: string;
  source: "feedback-popup";
  createdAt: number;
};

type RawFeedbackInboxMessage = Partial<Omit<FeedbackInboxMessage, "id">> | null;

function normalizeTimestamp(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

export function feedbackCutoff(now = Date.now()) {
  return now - FEEDBACK_RETENTION_MS;
}

export function normalizeFeedbackInboxMessage(
  id: string,
  raw: RawFeedbackInboxMessage,
  now = Date.now(),
): FeedbackInboxMessage | null {
  const senderId = typeof raw?.senderId === "string" ? raw.senderId.trim() : "";
  const senderName = typeof raw?.senderName === "string" ? raw.senderName.trim() : "";
  const senderEmail = typeof raw?.senderEmail === "string" ? raw.senderEmail.trim() : "";
  const mood = typeof raw?.mood === "string" && FEEDBACK_MOODS.has(raw.mood) ? raw.mood : "Meh";
  const message = typeof raw?.message === "string" ? raw.message.trim() : "";
  const source = raw?.source === "feedback-popup" ? "feedback-popup" : null;
  const createdAt = normalizeTimestamp(raw?.createdAt);

  if (!senderId || !senderName || !message || !source || !createdAt) return null;
  if (createdAt < feedbackCutoff(now) || createdAt > now + 600_000) return null;

  return {
    id,
    senderId,
    senderName,
    senderEmail,
    mood,
    message,
    source,
    createdAt,
  };
}

export async function submitFeedbackInboxMessage(input: {
  senderId: string;
  senderName?: string | null;
  senderEmail?: string | null;
  mood?: string | null;
  message: string;
}) {
  const senderId = input.senderId.trim();
  const message = input.message.trim().slice(0, 500);
  const mood = typeof input.mood === "string" && FEEDBACK_MOODS.has(input.mood) ? input.mood : "Meh";
  const senderName =
    input.senderName?.trim() || input.senderEmail?.split("@")[0]?.trim() || "Pawn Point User";
  const senderEmail = input.senderEmail?.trim() || "";

  if (!senderId || !message) {
    throw new Error("Feedback is missing a sender or message.");
  }

  const createdAt = Date.now();
  const node = push(ref(db, FEEDBACK_INBOX_PATH));
  await set(node, {
    senderId,
    senderName: senderName.slice(0, 80),
    senderEmail: senderEmail.slice(0, 254),
    mood,
    message,
    source: "feedback-popup",
    createdAt,
  } satisfies Omit<FeedbackInboxMessage, "id">);

  return node.key;
}

export async function pruneOldFeedbackInboxMessages(now = Date.now()) {
  const snapshot = await get(ref(db, FEEDBACK_INBOX_PATH));
  if (!snapshot.exists()) return 0;

  const cutoff = feedbackCutoff(now);
  const records = (snapshot.val() as Record<string, RawFeedbackInboxMessage>) || {};
  const staleIds = Object.entries(records)
    .filter(([, raw]) => {
      const createdAt = normalizeTimestamp(raw?.createdAt);
      return !createdAt || createdAt < cutoff;
    })
    .map(([id]) => id);

  await Promise.all(staleIds.map((id) => remove(ref(db, `${FEEDBACK_INBOX_PATH}/${id}`))));
  return staleIds.length;
}
