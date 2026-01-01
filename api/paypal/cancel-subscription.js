export const config = {
  api: {
    bodyParser: true,
  },
};

import admin from "firebase-admin";

const PAYPAL_ENV = (process.env.PAYPAL_ENV || "sandbox").toLowerCase() === "live" ? "live" : "sandbox";
const PAYPAL_BASE = PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

function getAdmin() {
  if (admin.apps.length) return admin.app();
  const svc = process.env.FIREBASE_SERVICE_ACCOUNT;
  const dbUrl = process.env.FIREBASE_DATABASE_URL;
  if (!svc || !dbUrl) {
    throw new Error("Firebase admin env vars missing");
  }
  const creds = JSON.parse(svc);
  return admin.initializeApp({
    credential: admin.credential.cert(creds),
    databaseURL: dbUrl,
  });
}

async function getPaypalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing PayPal credentials");
  }
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const resp = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await resp.json();
  if (!resp.ok || !data.access_token) {
    throw new Error(data.error_description || "Failed to obtain PayPal token");
  }
  return data.access_token;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: "Missing auth token" });
    }
    const app = getAdmin();
    const decoded = await app.auth().verifyIdToken(token);
    const uid = decoded.uid;
    const db = app.database();
    const userSnap = await db.ref(`users/${uid}`).get();
    const user = userSnap.val();
    const subscriptionId = user?.paypalSubscriptionId;
    if (!subscriptionId) {
      return res.status(400).json({ error: "No subscription to cancel" });
    }

    const accessToken = await getPaypalAccessToken();
    const resp = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason: "User requested cancellation" }),
    });
    if (!resp.ok) {
      const msg = await resp.text();
      throw new Error(msg || "PayPal cancellation failed");
    }

    const now = Date.now();
    const updates = {
      [`users/${uid}/subscriptionStatus`]: "cancelled",
      [`users/${uid}/premiumAccess`]: false,
      [`users/${uid}/subscriptionUpdatedAt`]: now,
      [`users/${uid}/groupLocked`]: !!user?.groupId,
    };
    const groupId = user?.groupId;
    if (groupId) {
      updates[`groups/${groupId}/locked`] = true;
      const membersSnap = await db.ref(`groups/${groupId}/members`).get();
      const members = membersSnap.val() || {};
      Object.keys(members).forEach((memberId) => {
        updates[`users/${memberId}/groupLocked`] = true;
      });
    }
    await db.ref().update(updates);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[cancel-subscription]", err);
    return res.status(500).json({ error: "Failed to cancel subscription" });
  }
}
