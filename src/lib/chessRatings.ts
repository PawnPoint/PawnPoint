import type { ExternalRatingRecord } from "./mockApi";

export type ChessRatingPlatform = "chesscom" | "lichess";

type ChessProfileRatingsPayload = {
  platform?: ChessRatingPlatform;
  username?: string;
  displayName?: string;
  ratings?: {
    bullet?: number | null;
    blitz?: number | null;
    rapid?: number | null;
    classical?: number | null;
  };
  ratingHistory?: {
    rapid?: { date?: string; rating?: number | null }[];
  };
  error?: string;
};

const USERNAME_RE = /^[A-Za-z0-9_-]{2,30}$/;

const safeRating = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
};

const normalizeRapidHistory = (value: unknown) => {
  if (!Array.isArray(value)) return undefined;
  const history = value
    .map((point) => {
      const date = typeof point?.date === "string" ? point.date.slice(0, 10) : "";
      const rating = safeRating(point?.rating);
      if (!date || rating === null) return null;
      return { date, rating };
    })
    .filter((point): point is { date: string; rating: number } => !!point)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-6);
  return history.length ? history : undefined;
};

export function validateChessProfileUsername(username: string) {
  const trimmed = username.trim();
  if (!trimmed) return "Enter a username.";
  if (!USERNAME_RE.test(trimmed)) return "Use 2-30 characters: letters, numbers, - or _.";
  return "";
}

export async function fetchExternalRatingProfile(
  platform: ChessRatingPlatform,
  username: string,
): Promise<ExternalRatingRecord> {
  const validationError = validateChessProfileUsername(username);
  if (validationError) throw new Error(validationError);

  const resp = await fetch(
    `/api/chess/profile?platform=${encodeURIComponent(platform)}&username=${encodeURIComponent(username.trim())}`,
  );
  const payload = (await resp.json().catch(() => null)) as ChessProfileRatingsPayload | null;
  if (!resp.ok) {
    throw new Error(payload?.error || "Could not fetch this profile.");
  }
  if (!payload) {
    throw new Error("Profile API unavailable.");
  }

  const resolvedUsername = (payload.username || username).trim();
  return {
    username: resolvedUsername,
    displayName: (payload.displayName || resolvedUsername).trim(),
    bullet: safeRating(payload.ratings?.bullet),
    blitz: safeRating(payload.ratings?.blitz),
    rapid: safeRating(payload.ratings?.rapid),
    classical: safeRating(payload.ratings?.classical),
    rapidHistory: normalizeRapidHistory(payload.ratingHistory?.rapid),
    syncedAt: Date.now(),
  };
}
