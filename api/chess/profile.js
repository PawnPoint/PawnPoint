const PROFILE_TTL_MS = 10 * 60 * 1000;
const GAMES_TTL_MS = 2 * 60 * 1000;
const MAX_GAMES = 500;
const WINDOW_DAYS = 90;
const WINDOW_MS = WINDOW_DAYS * 24 * 60 * 60 * 1000;
const USERNAME_RE = /^[A-Za-z0-9_-]{2,30}$/;

const profileCache = new Map();
const gamesCache = new Map();
const rateLimits = new Map();

const now = () => Date.now();

const getCache = (cache, key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};

const setCache = (cache, key, value, ttlMs) => {
  cache.set(key, { value, expiresAt: now() + ttlMs });
};

const checkRateLimit = (key, limit, windowMs) => {
  const entry = rateLimits.get(key);
  const ts = now();
  if (!entry || entry.resetAt <= ts) {
    rateLimits.set(key, { count: 1, resetAt: ts + windowMs });
    return null;
  }
  if (entry.count >= limit) {
    return Math.max(1, Math.ceil((entry.resetAt - ts) / 1000));
  }
  entry.count += 1;
  return null;
};

const normalizeCountry = (country) => {
  if (!country) return null;
  if (country.includes("/")) {
    const parts = country.split("/");
    return parts[parts.length - 1] || null;
  }
  return country;
};

const toIso = (valueMs) => {
  if (!valueMs) return null;
  const date = new Date(valueMs);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const safeNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : null);

const summarizeGames = (games) => {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  games.forEach((game) => {
    if (game.result === "win") wins += 1;
    else if (game.result === "loss") losses += 1;
    else if (game.result === "draw") draws += 1;
  });
  const total = wins + losses + draws;
  return { games: total, wins, losses, draws };
};

const parseChessComTimeClass = (game) => {
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

const parseChessComResult = (playerResult, opponentResult) => {
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
  if (drawSet.has(playerResult) || drawSet.has(opponentResult)) return "draw";
  return "loss";
};

const parseLichessColor = (username, players) => {
  const target = username.toLowerCase();
  const whiteUser = players?.white?.user;
  const blackUser = players?.black?.user;
  const whiteId = String(whiteUser?.id || whiteUser?.name || "").toLowerCase();
  const blackId = String(blackUser?.id || blackUser?.name || "").toLowerCase();
  if (whiteId && whiteId === target) return "white";
  if (blackId && blackId === target) return "black";
  return null;
};

const parseLichessResult = (winner, color) => {
  if (!winner) return "draw";
  if (!color) return "unknown";
  return winner === color ? "win" : "loss";
};

const extractOpeningName = (pgn) => {
  if (!pgn || typeof pgn !== "string") return null;
  const opening = pgn.match(/\[\s*Opening\s+"([^"]+)"\s*\]/);
  const variation = pgn.match(/\[\s*Variation\s+"([^"]+)"\s*\]/);
  if (opening && variation && variation[1] && !opening[1].includes(variation[1])) {
    return `${opening[1]} - ${variation[1]}`;
  }
  return opening ? opening[1] : null;
};

const extractOpeningFromEcoUrl = (url) => {
  if (!url || typeof url !== "string") return null;
  const parts = url.split("/");
  const slug = parts[parts.length - 1];
  if (!slug) return null;
  const cleaned = slug.replace(/^[A-E][0-9]{2}-/i, "").replace(/-/g, " ").trim();
  return cleaned || null;
};

const resolveOpeningName = (game) => {
  if (game?.opening && typeof game.opening === "string") return game.opening;
  const fromPgn = extractOpeningName(game?.pgn);
  if (fromPgn) return fromPgn;
  const fromEcoUrl = extractOpeningFromEcoUrl(game?.eco || game?.eco_url);
  return fromEcoUrl || null;
};

const computeOpenings = (games) => {
  const buckets = { white: new Map(), black: new Map() };
  const totals = { white: 0, black: 0 };

  games.forEach((game) => {
    const opening = resolveOpeningName(game);
    if (!opening || !game.color || !buckets[game.color]) return;
    totals[game.color] += 1;
    const existing = buckets[game.color].get(opening) || { name: opening, count: 0, wins: 0, games: 0 };
    existing.count += 1;
    existing.games += 1;
    if (game.result === "win") existing.wins += 1;
    buckets[game.color].set(opening, existing);
  });

  const toList = (color) => {
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

  return {
    white: toList("white"),
    black: toList("black"),
  };
};

async function fetchJson(url, errorLabel) {
  const resp = await fetch(url, { headers: { Accept: "application/json" } });
  if (resp.status === 404) {
    throw new Error(`${errorLabel} not found.`);
  }
  if (!resp.ok) {
    throw new Error(`Failed to fetch ${errorLabel}.`);
  }
  return resp.json();
}

async function fetchLichessProfile(username) {
  return fetchJson(`https://lichess.org/api/user/${encodeURIComponent(username)}`, "Lichess user");
}

async function fetchLichessGames(username) {
  const since = Date.now() - WINDOW_MS;
  const url = `https://lichess.org/api/games/user/${encodeURIComponent(
    username,
  )}?max=${MAX_GAMES}&since=${since}&pgnInJson=true&opening=true`;
  const resp = await fetch(url, { headers: { Accept: "application/x-ndjson" } });
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

async function fetchChessComProfile(username) {
  return fetchJson(`https://api.chess.com/pub/player/${encodeURIComponent(username)}`, "Chess.com user");
}

async function fetchChessComStats(username) {
  return fetchJson(`https://api.chess.com/pub/player/${encodeURIComponent(username)}/stats`, "Chess.com stats");
}

async function fetchChessComGames(username) {
  const archives = await fetchJson(
    `https://api.chess.com/pub/player/${encodeURIComponent(username)}/games/archives`,
    "Chess.com archives",
  );
  const archiveList = Array.isArray(archives?.archives) ? archives.archives : [];
  if (archiveList.length === 0) return [];
  const cutoffSec = Math.floor((Date.now() - WINDOW_MS) / 1000);
  const collected = [];
  for (let idx = archiveList.length - 1; idx >= 0 && collected.length < MAX_GAMES; idx -= 1) {
    const archive = await fetchJson(archiveList[idx], "Chess.com games");
    const games = Array.isArray(archive?.games) ? archive.games : [];
    if (!games.length) continue;
    let maxEnd = 0;
    for (let g = games.length - 1; g >= 0 && collected.length < MAX_GAMES; g -= 1) {
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
  return collected.slice(0, MAX_GAMES);
}

function normalizeLichess(username, profile, games) {
  const perfs = profile?.perfs || {};
  const normalizedGames = (games || []).map((game) => {
    const color = parseLichessColor(username, game?.players);
    const opponentColor = color === "white" ? "black" : "white";
    const opponentUser = game?.players?.[opponentColor]?.user || {};
    const normalized = {
      id: String(game?.id || ""),
      playedAt: toIso(game?.createdAt || game?.lastMoveAt),
      timeControl: game?.speed || null,
      color,
      result: parseLichessResult(game?.winner, color),
      opponent: {
        username: opponentUser?.name || opponentUser?.id || null,
        rating: safeNumber(game?.players?.[opponentColor]?.rating),
      },
      pgn: game?.pgn || null,
      opening: game?.opening?.name || null,
    };
    return { ...normalized, opening: resolveOpeningName(normalized) };
  });
  return {
    platform: "lichess",
    username: String(profile?.id || username).toLowerCase(),
    displayName: profile?.username || username,
    avatarUrl: null,
    country: profile?.profile?.country || null,
    title: profile?.title || null,
    lastOnline: toIso(profile?.seenAt),
    ratings: {
      bullet: safeNumber(perfs?.bullet?.rating),
      blitz: safeNumber(perfs?.blitz?.rating),
      rapid: safeNumber(perfs?.rapid?.rating),
      classical: safeNumber(perfs?.classical?.rating),
    },
    stats: summarizeGames(normalizedGames),
    openings: computeOpenings(normalizedGames),
    recentGames: normalizedGames,
  };
}

function normalizeChessCom(username, profile, stats, games) {
  const normalizedGames = (games || []).map((game) => {
    const whiteUser = String(game?.white?.username || "").toLowerCase();
    const blackUser = String(game?.black?.username || "").toLowerCase();
    const target = username.toLowerCase();
    const color = whiteUser === target ? "white" : blackUser === target ? "black" : null;
    const opponent = color === "white" ? game?.black : game?.white;
    const player = color === "white" ? game?.white : game?.black;
    const normalized = {
      id: String(game?.uuid || game?.url || ""),
      playedAt: toIso((game?.end_time || 0) * 1000),
      timeControl: parseChessComTimeClass(game),
      color,
      result: parseChessComResult(player?.result, opponent?.result),
      opponent: {
        username: opponent?.username || null,
        rating: safeNumber(opponent?.rating),
      },
      pgn: game?.pgn || null,
      opening: null,
      eco: game?.eco || game?.eco_url || null,
    };
    return { ...normalized, opening: resolveOpeningName(normalized) };
  });
  return {
    platform: "chesscom",
    username: profile?.username ? String(profile.username).toLowerCase() : username.toLowerCase(),
    displayName: profile?.username || username,
    avatarUrl: profile?.avatar || null,
    country: normalizeCountry(profile?.country),
    title: profile?.title || null,
    lastOnline: toIso((profile?.last_online || 0) * 1000),
    ratings: {
      bullet: safeNumber(stats?.chess_bullet?.last?.rating),
      blitz: safeNumber(stats?.chess_blitz?.last?.rating),
      rapid: safeNumber(stats?.chess_rapid?.last?.rating),
      classical: safeNumber(stats?.chess_daily?.last?.rating),
    },
    stats: summarizeGames(normalizedGames),
    openings: computeOpenings(normalizedGames),
    recentGames: normalizedGames,
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const platform = String(req.query?.platform || "").toLowerCase().trim();
  const username = String(req.query?.username || "").trim();
  if (platform !== "lichess" && platform !== "chesscom") {
    return res.status(400).json({ error: "Invalid platform." });
  }
  if (!username || !USERNAME_RE.test(username)) {
    return res.status(400).json({ error: "Invalid username format." });
  }

  const ip =
    (req.headers["x-forwarded-for"] || "")
      .toString()
      .split(",")[0]
      .trim() || req.socket?.remoteAddress || "unknown";
  const ipLimit = checkRateLimit(`ip:${ip}`, 30, 60 * 1000);
  if (ipLimit) {
    res.setHeader("Retry-After", String(ipLimit));
    return res.status(429).json({ error: "Too many requests. Try again soon." });
  }
  const nameLimit = checkRateLimit(`user:${platform}:${username.toLowerCase()}`, 10, 60 * 1000);
  if (nameLimit) {
    res.setHeader("Retry-After", String(nameLimit));
    return res.status(429).json({ error: "Rate limit hit for this user. Try again soon." });
  }

  const key = `${platform}:${username.toLowerCase()}`;
  const cachedProfile = getCache(profileCache, key);
  const cachedGames = getCache(gamesCache, key);
  if (cachedProfile && cachedGames) {
    const payload = platform === "lichess"
      ? normalizeLichess(username, cachedProfile, cachedGames)
      : normalizeChessCom(username, cachedProfile.profile, cachedProfile.stats, cachedGames);
    return res.status(200).json(payload);
  }

  try {
    if (platform === "lichess") {
      const profile = cachedProfile || (await fetchLichessProfile(username));
      const games = cachedGames || (await fetchLichessGames(username));
      if (!cachedProfile) setCache(profileCache, key, profile, PROFILE_TTL_MS);
      if (!cachedGames) setCache(gamesCache, key, games, GAMES_TTL_MS);
      return res.status(200).json(normalizeLichess(username, profile, games));
    }

    const profile = cachedProfile?.profile || (await fetchChessComProfile(username));
    const stats = cachedProfile?.stats || (await fetchChessComStats(username));
    const games = cachedGames || (await fetchChessComGames(username));
    if (!cachedProfile) setCache(profileCache, key, { profile, stats }, PROFILE_TTL_MS);
    if (!cachedGames) setCache(gamesCache, key, games, GAMES_TTL_MS);
    return res.status(200).json(normalizeChessCom(username, profile, stats, games));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch profile.";
    console.error("[chess-profile]", err);
    return res.status(500).json({ error: message });
  }
}
