import { attachPaypalSubscription, cancelPaypalSubscriptionLocally, updateSubscriptionStatusFromWebhook } from "./mockApi";

let mocksInstalled = false;
const PROFILE_WINDOW_MS = 183 * 24 * 60 * 60 * 1000;
const PROFILE_MAX_GAMES = 500;

const mockNormalizeCountry = (country: string | null | undefined) => {
  if (!country) return null;
  if (country.includes("/")) {
    const parts = country.split("/");
    return parts[parts.length - 1] || null;
  }
  return country;
};

const mockToIso = (valueMs: number | null | undefined) => {
  if (!valueMs) return null;
  const date = new Date(valueMs);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const mockSafeNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const mockParseChessComTimeClass = (game: any) => {
  if (game?.time_class) return game.time_class;
  const raw = game?.time_control;
  if (!raw) return null;
  const base = Number(String(raw).split("+")[0]);
  if (!Number.isFinite(base)) return null;
  if (base <= 120) return "bullet";
  if (base <= 600) return "blitz";
  if (base <= 1800) return "rapid";
  return "classical";
};

const mockParseChessComResult = (playerResult: string | undefined, opponentResult: string | undefined) => {
  const drawSet = new Set([
    "agreed",
    "stalemate",
    "repetition",
    "insufficient",
    "50move",
    "timevsinsufficient",
    "draw",
  ]);
  if (playerResult === "win") return "win";
  if (opponentResult === "win") return "loss";
  if (drawSet.has(playerResult || "") || drawSet.has(opponentResult || "")) return "draw";
  return "loss";
};

const mockParseLichessColor = (username: string, players: any) => {
  const target = username.toLowerCase();
  const whiteUser = players?.white?.user;
  const blackUser = players?.black?.user;
  const whiteId = String(whiteUser?.id || whiteUser?.name || "").toLowerCase();
  const blackId = String(blackUser?.id || blackUser?.name || "").toLowerCase();
  if (whiteId && whiteId === target) return "white";
  if (blackId && blackId === target) return "black";
  return null;
};

const mockParseLichessResult = (winner: string | undefined, color: string | null) => {
  if (!winner) return "draw";
  if (!color) return "unknown";
  return winner === color ? "win" : "loss";
};

const mockExtractOpeningName = (pgn: string | null | undefined) => {
  if (!pgn || typeof pgn !== "string") return null;
  const opening = pgn.match(/\[\s*Opening\s+"([^"]+)"\s*\]/);
  const variation = pgn.match(/\[\s*Variation\s+"([^"]+)"\s*\]/);
  if (opening && variation && variation[1] && !opening[1].includes(variation[1])) {
    return `${opening[1]} - ${variation[1]}`;
  }
  return opening ? opening[1] : null;
};

const mockExtractOpeningFromEcoUrl = (url: string | null | undefined) => {
  if (!url || typeof url !== "string") return null;
  const parts = url.split("/");
  const slug = parts[parts.length - 1];
  if (!slug) return null;
  const cleaned = slug.replace(/^[A-E][0-9]{2}-/i, "").replace(/-/g, " ").trim();
  return cleaned || null;
};

const mockResolveOpeningName = (game: any) => {
  if (game?.opening && typeof game.opening === "string") return game.opening;
  const fromPgn = mockExtractOpeningName(game?.pgn);
  if (fromPgn) return fromPgn;
  return mockExtractOpeningFromEcoUrl(game?.eco || game?.eco_url);
};

const mockSummarizeGames = (games: any[]) => {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  games.forEach((game) => {
    if (game.result === "win") wins += 1;
    else if (game.result === "loss") losses += 1;
    else if (game.result === "draw") draws += 1;
  });
  return { games: wins + losses + draws, wins, losses, draws };
};

const mockBuildRapidHistory = (games: any[], currentRapid: unknown) => {
  const cutoff = Date.now() - PROFILE_WINDOW_MS;
  const buckets = new Map<string, { date: string; rating: number; ts: number }>();
  games.forEach((game) => {
    const rating = mockSafeNumber(game?.playerRating);
    if (game?.timeControl !== "rapid" || !game?.playedAt || !Number.isFinite(Number(rating))) return;
    const ts = Date.parse(game.playedAt);
    if (!Number.isFinite(ts) || ts < cutoff) return;
    const date = new Date(ts);
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const existing = buckets.get(key);
    if (!existing || ts >= existing.ts) {
      buckets.set(key, {
        date: date.toISOString().slice(0, 10),
        rating: Math.round(Number(rating)),
        ts,
      });
    }
  });

  const current = mockSafeNumber(currentRapid);
  if (Number.isFinite(Number(current))) {
    const today = new Date();
    const key = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        date: today.toISOString().slice(0, 10),
        rating: Math.round(Number(current)),
        ts: today.getTime(),
      });
    }
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.ts - b.ts)
    .slice(-6)
    .map(({ date, rating }) => ({ date, rating }));
};

const mockComputeOpenings = (games: any[]) => {
  const buckets = { white: new Map<string, { name: string; count: number; wins: number; games: number }>(), black: new Map<string, { name: string; count: number; wins: number; games: number }>() };
  const totals = { white: 0, black: 0 };

  games.forEach((game) => {
    const opening = mockResolveOpeningName(game);
    if (!opening || !game.color || !(game.color in buckets)) return;
    const color = game.color as "white" | "black";
    totals[color] += 1;
    const existing = buckets[color].get(opening) || { name: opening, count: 0, wins: 0, games: 0 };
    existing.count += 1;
    existing.games += 1;
    if (game.result === "win") existing.wins += 1;
    buckets[color].set(opening, existing);
  });

  const toList = (color: "white" | "black") => {
    const total = totals[color] || 0;
    return Array.from(buckets[color].values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((entry) => ({
        name: entry.name,
        freq: total ? Math.round((entry.count / total) * 100) : 0,
        winRate: entry.games ? Math.round((entry.wins / entry.games) * 100) : 0,
      }));
  };

  return { white: toList("white"), black: toList("black") };
};

async function mockFetchJson(fetcher: typeof fetch, url: string, errorLabel: string, accept = "application/json") {
  const resp = await fetcher(url, { headers: { Accept: accept } });
  if (resp.status === 404) {
    throw new Error(`${errorLabel} not found.`);
  }
  if (!resp.ok) {
    throw new Error(`Failed to fetch ${errorLabel}.`);
  }
  return resp.json();
}

async function mockFetchLichessProfile(fetcher: typeof fetch, username: string) {
  return mockFetchJson(fetcher, `https://lichess.org/api/user/${encodeURIComponent(username)}`, "Lichess user");
}

async function mockFetchLichessGames(fetcher: typeof fetch, username: string) {
  const since = Date.now() - PROFILE_WINDOW_MS;
  const url = `https://lichess.org/api/games/user/${encodeURIComponent(
    username,
  )}?max=${PROFILE_MAX_GAMES}&since=${since}&pgnInJson=true&opening=true`;
  const resp = await fetcher(url, { headers: { Accept: "application/x-ndjson" } });
  if (!resp.ok) {
    throw new Error("Failed to fetch Lichess games.");
  }
  const text = await resp.text();
  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

async function mockFetchChessComProfile(fetcher: typeof fetch, username: string) {
  return mockFetchJson(fetcher, `https://api.chess.com/pub/player/${encodeURIComponent(username)}`, "Chess.com user");
}

async function mockFetchChessComStats(fetcher: typeof fetch, username: string) {
  return mockFetchJson(fetcher, `https://api.chess.com/pub/player/${encodeURIComponent(username)}/stats`, "Chess.com stats");
}

async function mockFetchChessComGames(fetcher: typeof fetch, username: string) {
  const archives = await mockFetchJson(
    fetcher,
    `https://api.chess.com/pub/player/${encodeURIComponent(username)}/games/archives`,
    "Chess.com archives",
  );
  const archiveList = Array.isArray((archives as any)?.archives) ? (archives as any).archives : [];
  if (archiveList.length === 0) return [];
  const cutoffSec = Math.floor((Date.now() - PROFILE_WINDOW_MS) / 1000);
  const collected: any[] = [];
  for (let idx = archiveList.length - 1; idx >= 0 && collected.length < PROFILE_MAX_GAMES; idx -= 1) {
    const archive = await mockFetchJson(fetcher, archiveList[idx], "Chess.com games");
    const games = Array.isArray((archive as any)?.games) ? (archive as any).games : [];
    if (!games.length) continue;
    let maxEnd = 0;
    for (let g = games.length - 1; g >= 0 && collected.length < PROFILE_MAX_GAMES; g -= 1) {
      const game = games[g];
      const endTime = Number(game?.end_time || 0);
      if (endTime > maxEnd) maxEnd = endTime;
      if (endTime >= cutoffSec) {
        collected.push(game);
      }
    }
    if (maxEnd && maxEnd < cutoffSec) {
      break;
    }
  }
  return collected.slice(0, PROFILE_MAX_GAMES);
}

function mockNormalizeLichess(username: string, profile: any, games: any[]) {
  const perfs = profile?.perfs || {};
  const normalizedGames = (games || []).map((game) => {
    const color = mockParseLichessColor(username, game?.players);
    const opponentColor = color === "white" ? "black" : "white";
    const opponentUser = game?.players?.[opponentColor]?.user || {};
    const normalized = {
      id: String(game?.id || ""),
      playedAt: mockToIso(game?.createdAt || game?.lastMoveAt),
      timeControl: game?.speed || null,
      color,
      result: mockParseLichessResult(game?.winner, color),
      opponent: {
        username: opponentUser?.name || opponentUser?.id || null,
        rating: mockSafeNumber(game?.players?.[opponentColor]?.rating),
      },
      playerRating: mockSafeNumber(game?.players?.[color || "white"]?.rating),
      pgn: game?.pgn || null,
      opening: game?.opening?.name || null,
    };
    return { ...normalized, opening: mockResolveOpeningName(normalized) };
  });

  const ratings = {
    bullet: mockSafeNumber(perfs?.bullet?.rating),
    blitz: mockSafeNumber(perfs?.blitz?.rating),
    rapid: mockSafeNumber(perfs?.rapid?.rating),
    classical: mockSafeNumber(perfs?.classical?.rating),
  };

  return {
    platform: "lichess",
    username: String(profile?.id || username).toLowerCase(),
    displayName: profile?.username || username,
    avatarUrl: null,
    country: profile?.profile?.country || null,
    title: profile?.title || null,
    lastOnline: mockToIso(profile?.seenAt),
    ratings,
    ratingHistory: {
      rapid: mockBuildRapidHistory(normalizedGames, ratings.rapid),
    },
    stats: mockSummarizeGames(normalizedGames),
    openings: mockComputeOpenings(normalizedGames),
    recentGames: normalizedGames,
  };
}

function mockNormalizeChessCom(username: string, profile: any, stats: any, games: any[]) {
  const normalizedGames = (games || []).map((game) => {
    const whiteUser = String(game?.white?.username || "").toLowerCase();
    const blackUser = String(game?.black?.username || "").toLowerCase();
    const target = username.toLowerCase();
    const color = whiteUser === target ? "white" : blackUser === target ? "black" : null;
    const opponent = color === "white" ? game?.black : game?.white;
    const player = color === "white" ? game?.white : game?.black;
    const normalized = {
      id: String(game?.uuid || game?.url || ""),
      playedAt: mockToIso((game?.end_time || 0) * 1000),
      timeControl: mockParseChessComTimeClass(game),
      color,
      result: mockParseChessComResult(player?.result, opponent?.result),
      opponent: {
        username: opponent?.username || null,
        rating: mockSafeNumber(opponent?.rating),
      },
      playerRating: mockSafeNumber(player?.rating),
      pgn: game?.pgn || null,
      opening: null,
      eco: game?.eco || game?.eco_url || null,
    };
    return { ...normalized, opening: mockResolveOpeningName(normalized) };
  });

  const ratings = {
    bullet: mockSafeNumber(stats?.chess_bullet?.last?.rating),
    blitz: mockSafeNumber(stats?.chess_blitz?.last?.rating),
    rapid: mockSafeNumber(stats?.chess_rapid?.last?.rating),
    classical: mockSafeNumber(stats?.chess_daily?.last?.rating),
  };

  return {
    platform: "chesscom",
    username: profile?.username ? String(profile.username).toLowerCase() : username.toLowerCase(),
    displayName: profile?.username || username,
    avatarUrl: profile?.avatar || null,
    country: mockNormalizeCountry(profile?.country),
    title: profile?.title || null,
    lastOnline: mockToIso((profile?.last_online || 0) * 1000),
    ratings,
    ratingHistory: {
      rapid: mockBuildRapidHistory(normalizedGames, ratings.rapid),
    },
    stats: mockSummarizeGames(normalizedGames),
    openings: mockComputeOpenings(normalizedGames),
    recentGames: normalizedGames,
  };
}

async function fetchLiveChessProfile(fetcher: typeof fetch, platform: "chesscom" | "lichess", username: string) {
  if (platform === "lichess") {
    const profile = await mockFetchLichessProfile(fetcher, username);
    const games = await mockFetchLichessGames(fetcher, username);
    return mockNormalizeLichess(username, profile, games);
  }

  const profile = await mockFetchChessComProfile(fetcher, username);
  const stats = await mockFetchChessComStats(fetcher, username);
  const games = await mockFetchChessComGames(fetcher, username);
  return mockNormalizeChessCom(username, profile, stats, games);
}

async function fetchLiveOpxReport(fetcher: typeof fetch, chesscom: string, lichess: string) {
  const platform = chesscom ? "chesscom" : "lichess";
  const username = chesscom || lichess;
  const profile = await fetchLiveChessProfile(fetcher, platform, username);
  return {
    targetLabel: profile.displayName || profile.username || username,
    gamesAnalyzed: profile.stats?.games ?? 0,
    timeWindowLabel: "Last 90 days",
    attributes: { attack: 0, defense: 0, time: 0, mental: 0 },
    ratings: {
      bullet: profile.ratings?.bullet ?? null,
      blitz: profile.ratings?.blitz ?? null,
      rapid: profile.ratings?.rapid ?? null,
    },
    openings: profile.openings || { white: [], black: [] },
  };
}

export function installApiMocks() {
  if (typeof window === "undefined") return;
  if (mocksInstalled) return;
  mocksInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" || input instanceof URL ? input.toString() : input.url;
    // Helper to parse body safely once per request.
    const parseJsonBody = async () => {
      try {
        const raw =
          typeof init?.body === "string"
            ? init.body
            : init?.body
              ? await new Response(init.body).text()
              : "";
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    };
    if (url.startsWith("/api/ping")) {
      console.log("[PING]", url);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url === "/api/blackbook/opx") {
      const resolvedEnv =
        (import.meta as any).env?.VITE_APP_ENV ||
        (import.meta as any).env?.MODE ||
        "sandbox";
      const appEnv = String(resolvedEnv).toLowerCase();
      if (appEnv === "live" || appEnv === "production") {
        return originalFetch(input as any, init as any);
      }
      try {
        const resp = await originalFetch(input as any, init as any);
        const contentType = resp.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          return resp;
        }
      } catch {
        // Fall back to mock when the API route is unavailable.
      }
      if (init?.method && init.method.toUpperCase() !== "POST") {
        return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
          status: 405,
          headers: { "Content-Type": "application/json" },
        });
      }
      const payload = (await parseJsonBody()) as { chesscom?: string; lichess?: string };
      const chesscom = typeof payload?.chesscom === "string" ? payload.chesscom.trim() : "";
      const lichess = typeof payload?.lichess === "string" ? payload.lichess.trim() : "";
      const usernameRe = /^[A-Za-z0-9_-]{2,30}$/;
      if (!chesscom && !lichess) {
        return new Response(JSON.stringify({ error: "Provide at least one username." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (chesscom && lichess) {
        return new Response(JSON.stringify({ error: "Provide only one username." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      if ((chesscom && !usernameRe.test(chesscom)) || (lichess && !usernameRe.test(lichess))) {
        return new Response(JSON.stringify({ error: "Invalid username format." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      try {
        const report = await fetchLiveOpxReport(originalFetch, chesscom, lichess);
        return new Response(JSON.stringify(report), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err?.message || "Failed to fetch live OPX data." }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
    if (url.startsWith("/api/chess/profile")) {
      const resolvedEnv =
        (import.meta as any).env?.VITE_APP_ENV ||
        (import.meta as any).env?.MODE ||
        "sandbox";
      const appEnv = String(resolvedEnv).toLowerCase();
      if (appEnv === "live" || appEnv === "production") {
        return originalFetch(input as any, init as any);
      }
      try {
        const resp = await originalFetch(input as any, init as any);
        const contentType = resp.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          return resp;
        }
      } catch {
        // Fall back to mock when the API route is unavailable.
      }
      if (init?.method && init.method.toUpperCase() !== "GET") {
        return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
          status: 405,
          headers: { "Content-Type": "application/json" },
        });
      }
      const parsed = new URL(url, window.location.origin);
      const platform = (parsed.searchParams.get("platform") || "").toLowerCase();
      const username = (parsed.searchParams.get("username") || "").trim();
      const usernameRe = /^[A-Za-z0-9_-]{2,30}$/;
      if (platform !== "lichess" && platform !== "chesscom") {
        return new Response(JSON.stringify({ error: "Invalid platform." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (!username || !usernameRe.test(username)) {
        return new Response(JSON.stringify({ error: "Invalid username format." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      try {
        const profile = await fetchLiveChessProfile(originalFetch, platform as "chesscom" | "lichess", username);
        return new Response(JSON.stringify(profile), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err?.message || "Failed to fetch live profile data." }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
    if (url === "/api/paypal/attach-subscription") {
      if (init?.method && init.method.toUpperCase() !== "POST") {
        return new Response(JSON.stringify({ success: false, message: "Method Not Allowed" }), {
          status: 405,
          headers: { "Content-Type": "application/json" },
        });
      }
      try {
        const rawBody =
          typeof init?.body === "string"
            ? init.body
            : init?.body
              ? await new Response(init.body).text()
              : "";
        const parsed = rawBody ? (JSON.parse(rawBody) as { subscriptionId?: string }) : {};
        if (!parsed.subscriptionId) {
          throw new Error("Missing subscriptionId");
        }
        const result = await attachPaypalSubscription(parsed.subscriptionId);
        return new Response(JSON.stringify({ success: result.success, profile: result.profile }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ success: false, message: err?.message || "Failed to attach subscription" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
    if (url === "/api/paypal/cancel-subscription") {
      if (init?.method && init.method.toUpperCase() !== "POST") {
        return new Response(JSON.stringify({ success: false, message: "Method Not Allowed" }), {
          status: 405,
          headers: { "Content-Type": "application/json" },
        });
      }
      try {
        // This mock does not call PayPal; it just updates local user state.
        const result = await cancelPaypalSubscriptionLocally();
        if (!result.success) {
          throw new Error("No active subscription to cancel.");
        }
        return new Response(JSON.stringify({ success: true, profile: result.profile }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ success: false, message: err?.message || "Failed to cancel subscription" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
    if (url === "/api/paypal/webhook") {
      if (init?.method && init.method.toUpperCase() !== "POST") {
        return new Response(JSON.stringify({ success: false, message: "Method Not Allowed" }), {
          status: 405,
          headers: { "Content-Type": "application/json" },
        });
      }
      const payload = (await parseJsonBody()) as {
        event_type?: string;
        resource?: { id?: string };
      };
      const eventType = payload?.event_type;
      const subscriptionId = payload?.resource?.id;
      console.info("[PayPal Webhook]", eventType, subscriptionId);

      if (!eventType || !subscriptionId) {
        return new Response(JSON.stringify({ success: false, message: "Invalid webhook payload" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // NOTE: This mock does not perform real signature verification. In production,
      // verify the PayPal signature using your server-side secrets before processing.

      let nextStatus: "active" | "cancelled" | "suspended" | "expired" | "unknown" = "unknown";
      if (eventType === "BILLING.SUBSCRIPTION.CANCELLED") nextStatus = "cancelled";
      else if (eventType === "BILLING.SUBSCRIPTION.SUSPENDED") nextStatus = "suspended";
      else if (eventType === "BILLING.SUBSCRIPTION.EXPIRED") nextStatus = "expired";
      else if (eventType === "BILLING.SUBSCRIPTION.ACTIVATED") nextStatus = "active";

      if (nextStatus === "unknown") {
        return new Response(JSON.stringify({ success: true, message: "Event ignored" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      await updateSubscriptionStatusFromWebhook(subscriptionId, nextStatus);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.startsWith("/api/twitch/chess-tv")) {
      return new Response(
        JSON.stringify({
          live: false,
          selected: null,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    if (url === "/api/mailchimp/subscribe") {
      const resolvedEnv =
        (import.meta as any).env?.VITE_APP_ENV ||
        (import.meta as any).env?.MODE ||
        "sandbox";
      const appEnv = String(resolvedEnv).toLowerCase();
      if (appEnv === "live" || appEnv === "production") {
        return originalFetch(input as any, init as any);
      }
      if (init?.method && init.method.toUpperCase() !== "POST") {
        return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
          status: 405,
          headers: { "Content-Type": "application/json" },
        });
      }
      const payload = (await parseJsonBody()) as { email?: string };
      const email = typeof payload?.email === "string" ? payload.email.trim() : "";
      if (!email) {
        return new Response(JSON.stringify({ error: "A valid email is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, mocked: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return originalFetch(input as any, init as any);
  };
}
