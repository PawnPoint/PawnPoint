// Vercel /serverless handler for PayPal webhooks with signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

import admin from "firebase-admin";

const PAYPAL_ENV = (process.env.PAYPAL_ENV || "sandbox").toLowerCase() === "live" ? "live" : "sandbox";
const PAYPAL_BASE = PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

const hasAllPaypalEnv = () =>
  !!process.env.PAYPAL_CLIENT_ID &&
  !!process.env.PAYPAL_CLIENT_SECRET &&
  !!process.env.PAYPAL_WEBHOOK_ID &&
  !!process.env.PAYPAL_ENV;

let adminApp;
function getAdminApp() {
  if (adminApp) return adminApp;
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  const databaseURL = process.env.FIREBASE_DATABASE_URL;
  if (!serviceAccountRaw || !databaseURL) {
    console.warn("[PayPal Webhook] Firebase admin not configured; skipping DB updates.");
    return null;
  }
  try {
    const credentials = JSON.parse(serviceAccountRaw);
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(credentials),
      databaseURL,
    });
    return adminApp;
  } catch (err) {
    console.error("[PayPal Webhook] Failed to init firebase-admin", err);
    return null;
  }
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

async function getAccessToken() {
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
    throw new Error(data.error_description || "Failed to obtain PayPal access token");
  }
  return data.access_token;
}

async function verifyWebhookSignature(event, headers) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) throw new Error("Missing PAYPAL_WEBHOOK_ID");
  const requiredHeaders = [
    "paypal-transmission-id",
    "paypal-transmission-time",
    "paypal-cert-url",
    "paypal-auth-algo",
    "paypal-transmission-sig",
  ];
  const missing = requiredHeaders.filter((h) => !headers[h]);
  if (missing.length) {
    throw new Error(`Missing PayPal headers: ${missing.join(", ")}`);
  }
  const token = await getAccessToken();
  const payload = {
    auth_algo: headers["paypal-auth-algo"],
    cert_url: headers["paypal-cert-url"],
    transmission_id: headers["paypal-transmission-id"],
    transmission_sig: headers["paypal-transmission-sig"],
    transmission_time: headers["paypal-transmission-time"],
    webhook_id: webhookId,
    webhook_event: event,
  };
  const resp = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await resp.json();
  const status = (data?.verification_status || "UNKNOWN").toUpperCase();
  return { status, response: data };
}

async function updateUserBySubscription(subscriptionId, status, updatedAt) {
  const app = getAdminApp();
  if (!app) return null;
  const db = admin.database(app);
  const snapshot = await db
    .ref("users")
    .orderByChild("paypalSubscriptionId")
    .equalTo(subscriptionId)
    .limitToFirst(1)
    .get();
  if (!snapshot.exists()) {
    console.warn("[PayPal Webhook] No user found for subscription", subscriptionId);
    return null;
  }
  const val = snapshot.val() || {};
  const userId = Object.keys(val)[0];
  const premiumAccess = status === "active";
  const user = val[userId] || {};
  const updates = {
    [`users/${userId}/subscriptionStatus`]: status,
    [`users/${userId}/premiumAccess`]: premiumAccess,
    [`users/${userId}/subscriptionUpdatedAt`]: updatedAt,
    [`users/${userId}/groupLocked`]: !premiumAccess && !!user.groupId,
  };
  const groupId = user.groupId;
  if (groupId) {
    updates[`groups/${groupId}/locked`] = !premiumAccess;
    const membersSnap = await db.ref(`groups/${groupId}/members`).get();
    const members = membersSnap.val() || {};
    Object.keys(members).forEach((memberId) => {
      updates[`users/${memberId}/groupLocked`] = !premiumAccess;
    });
  }
  await db.ref().update(updates);
  return userId;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  let verified = false;
  try {
    console.log("[ENV CHECK]", {
      clientId: !!process.env.PAYPAL_CLIENT_ID,
      secret: !!process.env.PAYPAL_CLIENT_SECRET,
      webhookId: !!process.env.PAYPAL_WEBHOOK_ID,
      env: process.env.PAYPAL_ENV,
    });
    if (!hasAllPaypalEnv()) {
      throw new Error("PayPal env vars missing");
    }
    console.info("[PayPal Webhook] env:", PAYPAL_ENV);

    const rawBody = await readRawBody(req);
    let event = {};
    try {
      event = JSON.parse(rawBody.toString("utf8") || "{}");
    } catch (err) {
      console.error("[PayPal Webhook] Invalid JSON body", err);
    }

    const eventType = event?.event_type;
    const subscriptionId = event?.resource?.id;
    const eventId = event?.id;

    const headers = Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k.toLowerCase(), v]));
    const verification = await verifyWebhookSignature(event, headers);
    verified = verification.status === "SUCCESS";
    console.log("[PayPal Webhook] verify", {
      eventId,
      eventType,
      subscriptionId,
      status: verification.status,
    });
    if (!verified) {
      return res.status(400).json({ error: "Invalid webhook signature" });
    }

    const now = Date.now();
    let nextStatus;
    if (eventType === "BILLING.SUBSCRIPTION.CANCELLED") nextStatus = "cancelled";
    else if (eventType === "BILLING.SUBSCRIPTION.SUSPENDED") nextStatus = "suspended";
    else if (eventType === "BILLING.SUBSCRIPTION.EXPIRED") nextStatus = "expired";
    else if (eventType === "BILLING.SUBSCRIPTION.ACTIVATED") nextStatus = "active";

    if (!subscriptionId) {
      console.warn("[PayPal Webhook] Missing subscription id in event", { eventId, eventType });
    } else if (!nextStatus) {
      console.info("[PayPal Webhook] Event ignored", { eventId, eventType, subscriptionId });
    } else {
      try {
        await updateUserBySubscription(subscriptionId, nextStatus, now);
      } catch (err) {
        console.error("[PayPal Webhook] Failed to update user", err);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[PayPal Webhook] Handler error", err);
    if (!res.headersSent) {
      if (verified) {
        return res.status(200).json({ ok: true });
      }
      return res.status(400).json({ error: "Webhook verification failed" });
    }
  }
}
