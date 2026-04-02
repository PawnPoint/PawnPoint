import express from "express";
import chessProfileHandler from "../api/chess/profile.js";
import blackbookOpxHandler from "../api/blackbook/opx.js";
import mailchimpSubscribeHandler from "../api/mailchimp/subscribe.js";

const app = express();
const PORT = process.env.PORT || 8787;

app.use(express.json());

app.get("/api/chess/profile", (req, res) => chessProfileHandler(req, res));
app.post("/api/blackbook/opx", (req, res) => blackbookOpxHandler(req, res));
app.post("/api/mailchimp/subscribe", (req, res) => mailchimpSubscribeHandler(req, res));

app.get("/api/ping", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
