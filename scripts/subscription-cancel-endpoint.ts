// Example Express endpoint for cancelling a PayPal subscription.
// This is a template and is not wired into the frontend build; deploy in your server environment.
import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.post("/api/subscription/cancel", async (req, res) => {
  const user = req.user as { id: string; paypalSubscriptionId?: string | null } | undefined; // populated by your auth middleware
  if (!user?.id) return res.status(401).json({ ok: false, error: "Unauthorized" });
  const subId = user.paypalSubscriptionId;
  if (!subId) return res.status(400).json({ ok: false, error: "No PayPal subscription on file" });

  try {
    const paypalAuth = await getPayPalToken(); // implement OAuth client credentials
    const cancelResp = await fetch(`https://api-m.paypal.com/v1/billing/subscriptions/${subId}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paypalAuth.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason: "User requested cancellation" }),
    });

    if (!cancelResp.ok) {
      const text = await cancelResp.text();
      return res.status(502).json({ ok: false, error: "PayPal error", detail: text });
    }

    await saveSubscriptionStatus(user.id, {
      subscriptionStatus: "CANCELLED",
      subscriptionActive: false,
      nextBillingDate: null,
    }); // implement persistence

    return res.json({ ok: true, newStatus: "CANCELLED", effectiveCancellation: "end_of_period" });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message || "Cancellation failed" });
  }
});

export default router;

// Implement these helpers in your server:
async function getPayPalToken(): Promise<{ access_token: string }> {
  throw new Error("implement PayPal client credentials flow");
}

async function saveSubscriptionStatus(
  userId: string,
  payload: { subscriptionStatus: string; subscriptionActive: boolean; nextBillingDate: number | null },
) {
  // persist to your database
}
