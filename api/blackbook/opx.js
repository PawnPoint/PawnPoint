export const config = {
  api: {
    bodyParser: true,
  },
};

const USERNAME_RE = /^[A-Za-z0-9_-]{2,30}$/;

const isValidHandle = (value) => (value ? USERNAME_RE.test(value) : false);

const buildBaseReport = ({ targetLabel, gamesAnalyzed, timeWindowLabel, ratings }) => ({
  targetLabel,
  gamesAnalyzed,
  timeWindowLabel,
  attributes: {
    attack: 0,
    defense: 0,
    time: 0,
    mental: 0,
  },
  ratings,
  openings: {
    white: [],
    black: [],
  },
});

const sumRecord = (record) => {
  if (!record) return 0;
  const win = Number(record.win || 0);
  const loss = Number(record.loss || 0);
  const draw = Number(record.draw || 0);
  return win + loss + draw;
};

const fetchChessComStats = async (username) => {
  const resp = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}/stats`);
  if (resp.status === 404) {
    throw new Error("Chess.com user not found.");
  }
  if (!resp.ok) {
    throw new Error("Failed to fetch Chess.com stats.");
  }
  const data = await resp.json();
  const bullet = data?.chess_bullet?.last?.rating ?? null;
  const blitz = data?.chess_blitz?.last?.rating ?? null;
  const rapid = data?.chess_rapid?.last?.rating ?? null;
  const gamesAnalyzed =
    sumRecord(data?.chess_bullet?.record) + sumRecord(data?.chess_blitz?.record) + sumRecord(data?.chess_rapid?.record);
  return {
    targetLabel: username,
    gamesAnalyzed,
    timeWindowLabel: "All time",
    ratings: { bullet, blitz, rapid },
  };
};

const fetchLichessStats = async (username) => {
  const resp = await fetch(`https://lichess.org/api/user/${encodeURIComponent(username)}`, {
    headers: { Accept: "application/json" },
  });
  if (resp.status === 404) {
    throw new Error("Lichess user not found.");
  }
  if (!resp.ok) {
    throw new Error("Failed to fetch Lichess profile.");
  }
  const data = await resp.json();
  const perfs = data?.perfs || {};
  const bullet = perfs?.bullet?.rating ?? null;
  const blitz = perfs?.blitz?.rating ?? null;
  const rapid = perfs?.rapid?.rating ?? null;
  const gamesAnalyzed =
    Number(perfs?.bullet?.games || 0) + Number(perfs?.blitz?.games || 0) + Number(perfs?.rapid?.games || 0);
  return {
    targetLabel: data?.username || username,
    gamesAnalyzed,
    timeWindowLabel: "All time",
    ratings: { bullet, blitz, rapid },
  };
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const chesscom = typeof req.body?.chesscom === "string" ? req.body.chesscom.trim() : "";
  const lichess = typeof req.body?.lichess === "string" ? req.body.lichess.trim() : "";

  if (!chesscom && !lichess) {
    return res.status(400).json({ error: "Provide at least one username." });
  }
  if (chesscom && lichess) {
    return res.status(400).json({ error: "Provide only one username." });
  }

  if ((chesscom && !isValidHandle(chesscom)) || (lichess && !isValidHandle(lichess))) {
    return res.status(400).json({ error: "Invalid username format." });
  }

  try {
    const payload = chesscom ? await fetchChessComStats(chesscom) : await fetchLichessStats(lichess);
    const report = buildBaseReport(payload);
    return res.status(200).json(report);
  } catch (err) {
    console.error("[blackbook-opx]", err);
    const message = err instanceof Error ? err.message : "Failed to run OPX scan.";
    return res.status(500).json({ error: message });
  }
}
