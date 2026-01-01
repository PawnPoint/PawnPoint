import { attachPaypalSubscription, cancelPaypalSubscriptionLocally, updateSubscriptionStatusFromWebhook } from "./mockApi";

let mocksInstalled = false;

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

    return originalFetch(input as any, init as any);
  };
}
