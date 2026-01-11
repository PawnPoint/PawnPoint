import express from "express";
import chessProfileHandler from "../api/chess/profile.js";

const app = express();
const PORT = process.env.PORT || 8787;

app.get("/api/chess/profile", (req, res) => chessProfileHandler(req, res));

app.get("/api/ping", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
