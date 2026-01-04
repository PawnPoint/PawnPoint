const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const TWITCH_API = "https://api.twitch.tv/helix";

const WATCHLIST = [
  "gmhikaru",
  "gothamchess",
  "botezlive",
  "chess",
  "chess24",
  "imrosen",
  "penguingm1",
  "annacramling",
  "chessdojo",
  "thebelenkaya",
  "wittyalien",
  "akanemsko",
];

let cachedToken = null;
let cachedTokenExp = 0;

async function getAppToken() {
  const now = Date.now();
  if (cachedToken && now < cachedTokenExp - 60_000) return cachedToken;

  const params = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID || "",
    client_secret: process.env.TWITCH_CLIENT_SECRET || "",
    grant_type: "client_credentials",
  });

  const res = await fetch(`${TWITCH_TOKEN_URL}?${params.toString()}`, { method: "POST" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token error: ${res.status} ${text}`);
  }
  const data = await res.json();
  cachedToken = data.access_token;
  cachedTokenExp = now + (data.expires_in || 0) * 1000;
  return cachedToken;
}

async function helix(path, token) {
  const res = await fetch(`${TWITCH_API}${path}`, {
    headers: {
      "Client-ID": process.env.TWITCH_CLIENT_ID || "",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Helix error: ${res.status} ${text}`);
  }
  return res.json();
}

export default async function handler(req, res) {
  try {
    const token = await getAppToken();
    const query = WATCHLIST.map((u) => `user_login=${encodeURIComponent(u)}`).join("&");
    const streams = await helix(`/streams?${query}`, token);
    const liveEntries = (streams?.data || []).map((s) => ({
      user_login: s.user_login,
      user_name: s.user_name,
      title: s.title,
      viewer_count: s.viewer_count,
      game_name: s.game_name,
      thumbnail_url: s.thumbnail_url,
    }));

    if (!liveEntries.length) {
      return res.status(200).json({ live: false, selected: null, liveList: [] });
    }

    liveEntries.sort((a, b) => (b.viewer_count || 0) - (a.viewer_count || 0));
    const selected = liveEntries[0];

    return res.status(200).json({
      live: true,
      selected,
      liveList: liveEntries,
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Twitch fetch failed" });
  }
}
