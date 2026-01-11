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
    if (url.startsWith("/api/ping")) {
      console.log("[PING]", url);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url === "/api/blackbook/opx") {
      const resolvedEnv =
        (import.meta as any).env?.VITE_APP_ENV ||
        (import.meta as any).env?.MODE ||
        "sandbox";
      const appEnv = String(resolvedEnv).toLowerCase();
      if (appEnv === "live" || appEnv === "production") {
        return originalFetch(input as any, init as any);
      }
      try {
        const resp = await originalFetch(input as any, init as any);
        const contentType = resp.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          return resp;
        }
      } catch {
        // Fall back to mock when the API route is unavailable.
      }
      if (init?.method && init.method.toUpperCase() !== "POST") {
        return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
          status: 405,
          headers: { "Content-Type": "application/json" },
        });
      }
      const payload = (await parseJsonBody()) as { chesscom?: string; lichess?: string };
      const chesscom = typeof payload?.chesscom === "string" ? payload.chesscom.trim() : "";
      const lichess = typeof payload?.lichess === "string" ? payload.lichess.trim() : "";
      const usernameRe = /^[A-Za-z0-9_-]{2,30}$/;
      if (!chesscom && !lichess) {
        return new Response(JSON.stringify({ error: "Provide at least one username." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (chesscom && lichess) {
        return new Response(JSON.stringify({ error: "Provide only one username." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      if ((chesscom && !usernameRe.test(chesscom)) || (lichess && !usernameRe.test(lichess))) {
        return new Response(JSON.stringify({ error: "Invalid username format." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      const targetLabel = chesscom || lichess || "unknown";
      return new Response(
        JSON.stringify({
          targetLabel,
          gamesAnalyzed: 286,
          timeWindowLabel: "Last 3 months",
          attributes: { attack: 77, defense: 71, time: 71, mental: 67 },
          ratings: { bullet: 1299, blitz: 1344, rapid: 1868 },
          openings: {
            white: [
              { name: "London System", freq: 18, winRate: 54 },
              { name: "Italian Game", freq: 12, winRate: 51 },
            ],
            black: [
              { name: "Sicilian Defense", freq: 22, winRate: 49 },
              { name: "French Defense", freq: 15, winRate: 52 },
            ],
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    if (url.startsWith("/api/chess/profile")) {
      const resolvedEnv =
        (import.meta as any).env?.VITE_APP_ENV ||
        (import.meta as any).env?.MODE ||
        "sandbox";
      const appEnv = String(resolvedEnv).toLowerCase();
      if (appEnv === "live" || appEnv === "production") {
        return originalFetch(input as any, init as any);
      }
      try {
        const resp = await originalFetch(input as any, init as any);
        const contentType = resp.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          return resp;
        }
      } catch {
        // Fall back to mock when the API route is unavailable.
      }
      if (init?.method && init.method.toUpperCase() !== "GET") {
        return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
          status: 405,
          headers: { "Content-Type": "application/json" },
        });
      }
      const parsed = new URL(url, window.location.origin);
      const platform = (parsed.searchParams.get("platform") || "").toLowerCase();
      const username = (parsed.searchParams.get("username") || "").trim();
      const usernameRe = /^[A-Za-z0-9_-]{2,30}$/;
      if (platform !== "lichess" && platform !== "chesscom") {
        return new Response(JSON.stringify({ error: "Invalid platform." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (!username || !usernameRe.test(username)) {
        return new Response(JSON.stringify({ error: "Invalid username format." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({
          platform,
          username: username.toLowerCase(),
          displayName: username,
          avatarUrl: null,
          country: "ZA",
          title: null,
          lastOnline: new Date().toISOString(),
          ratings: {
            bullet: 1820,
            blitz: 1765,
            rapid: 1712,
            classical: 1600,
          },
          stats: {
            games: 1234,
            wins: 600,
            losses: 500,
            draws: 134,
          },
          openings: {
            white: [
              { name: "London System", freq: 22, winRate: 56 },
              { name: "Italian Game", freq: 14, winRate: 52 },
            ],
            black: [
              { name: "Sicilian Defense", freq: 18, winRate: 49 },
              { name: "French Defense", freq: 12, winRate: 51 },
            ],
          },
          recentGames: [],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
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
