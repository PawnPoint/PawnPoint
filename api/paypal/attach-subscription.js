export const config = {
  api: {
    bodyParser: true,
  },
};

import admin from "firebase-admin";

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
    const { subscriptionId } = req.body || {};
    if (!subscriptionId || typeof subscriptionId !== "string") {
      return res.status(400).json({ error: "Missing subscriptionId" });
    }
    const db = app.database();
    const userSnap = await db.ref(`users/${uid}`).get();
    const user = userSnap.val() || {};
    const now = Date.now();
    const nextProfile = {
      ...user,
      paypalSubscriptionId: subscriptionId,
      premiumAccess: true,
      subscriptionStatus: "active",
      subscriptionUpdatedAt: now,
      groupLocked: false,
    };
    const updates = {
      [`users/${uid}/paypalSubscriptionId`]: nextProfile.paypalSubscriptionId,
      [`users/${uid}/premiumAccess`]: nextProfile.premiumAccess,
      [`users/${uid}/subscriptionStatus`]: nextProfile.subscriptionStatus,
      [`users/${uid}/subscriptionUpdatedAt`]: nextProfile.subscriptionUpdatedAt,
      [`users/${uid}/groupLocked`]: nextProfile.groupLocked,
    };
    const groupId = user.groupId;
    if (groupId) {
      updates[`groups/${groupId}/locked`] = false;
      const membersSnap = await db.ref(`groups/${groupId}/members`).get();
      const members = membersSnap.val() || {};
      Object.keys(members).forEach((memberId) => {
        updates[`users/${memberId}/groupLocked`] = false;
      });
    }
    await db.ref().update(updates);
    return res.status(200).json({ success: true, profile: { ...nextProfile, id: uid } });
  } catch (err) {
    console.error("[attach-subscription]", err);
    return res.status(500).json({ error: "Failed to attach subscription" });
  }
}
