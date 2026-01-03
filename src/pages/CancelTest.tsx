import { useState } from "react";
import { Button } from "../components/ui/Button";
import { auth } from "../lib/firebase";

export default function CancelTest() {
  const [status, setStatus] = useState<string>("Idle");
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    setLoading(true);
    setStatus("Requesting cancel...");
    try {
      const token = await auth.currentUser?.getIdToken(true);
      if (!token) {
        throw new Error("Not signed in; no token available.");
      }
      const resp = await fetch("/api/paypal/cancel-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: "{}",
      });
      const data = await resp.json().catch(() => ({}));
      setStatus(`Response ${resp.status}: ${JSON.stringify(data)}`);
    } catch (err: any) {
      setStatus(`Error: ${err?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-4">
      <div className="max-w-lg w-full space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Cancel Test</h1>
        <p className="text-white/70 text-sm">
          This page calls the server cancel endpoint directly for testing. No local profile updates are performed.
        </p>
        <Button onClick={handleCancel} disabled={loading} className="w-full">
          {loading ? "Sending..." : "Cancel subscription (server)"}
        </Button>
        <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-left text-xs break-words">
          {status}
        </div>
      </div>
    </div>
  );
}
