import { auth } from "./firebase";

export type CancelPaypalResult = {
  status: number;
  respUrl: string;
  vercelId: string | null;
  text: string;
  ok: boolean;
  url: string;
};

export async function cancelPaypalSubscription(): Promise<CancelPaypalResult> {
  if (typeof window === "undefined") {
    throw new Error("Window is not available.");
  }
  const url = `${window.location.origin}/api/paypal/cancel-subscription`;
  const token = await auth.currentUser?.getIdToken(true);
  if (!token) {
    throw new Error("Not signed in; no token available.");
  }
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: "{}",
  });
  const text = await resp.text();
  return {
    status: resp.status,
    respUrl: resp.url,
    vercelId: resp.headers.get("x-vercel-id"),
    text: text.slice(0, 300),
    ok: resp.ok,
    url,
  };
}
