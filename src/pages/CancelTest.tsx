import { useState } from "react";
import { Button } from "../components/ui/Button";
import { cancelPaypalSubscription } from "../lib/cancelPaypalSubscription";

export default function CancelTest() {
  const [loading, setLoading] = useState(false);
  const [debug, setDebug] = useState<any>(null);

  const handleCancel = async () => {
    setLoading(true);
    setDebug({ step: "starting" });
    try {
      const result = await cancelPaypalSubscription();
      setDebug({ step: "done", ...result });
    } catch (err: any) {
      setDebug({ step: "error", message: err?.message || "Unknown error" });
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
        <div style={{ padding: 12, background: "#111", color: "#0f0", fontSize: 14 }}>
          <div>
            <b>window.location.origin:</b> {typeof window !== "undefined" ? window.location.origin : "N/A"}
          </div>
          <div>
            <b>Cancel URL:</b>{" "}
            {typeof window !== "undefined" ? `${window.location.origin}/api/paypal/cancel-subscription` : "N/A"}
          </div>
        </div>
        <Button onClick={handleCancel} disabled={loading} className="w-full">
          {loading ? "Sending..." : "Cancel subscription (server)"}
        </Button>
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {JSON.stringify(debug, null, 2)}
        </pre>
      </div>
    </div>
  );
}
