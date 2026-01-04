import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../components/ui/Button";
import loginBg from "../assets/Login screen.png";
import pawnPointIcon from "../assets/App tab icon.png";
import { useLocation } from "wouter";
import { CheckCircle2, Key } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { auth } from "../lib/firebase";
import { loadPaypalSdk } from "../lib/paypal";

export default function Checkout() {
  const [, navigate] = useLocation();
  const { user, setUser } = useAuth();
  const [showSummary, setShowSummary] = useState(false);
  const [paypalError, setPaypalError] = useState<string | null>(null);
  const [paypalLoading, setPaypalLoading] = useState(false);
  const paypalButtonsRef = useRef<any>(null);
  const features = useMemo(
    () => [
      "Unlimited Courses",
      "Our AI bots",
      "XP Gains",
      "Leaderboards and Ranks",
      "SquareBase",
    ],
    [],
  );
  const gradientShiftKeyframes = `
    @keyframes checkoutGradientShift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
  `;
  const typewriterKeyframes = `
    @keyframes checkoutType {
      from { max-width: 0ch; }
      to { max-width: 32ch; }
    }
  `;
  const gradientTextStyle = {
    backgroundImage: "linear-gradient(90deg, #60a5fa, #8b5cf6, #60a5fa)",
    backgroundSize: "200% 200%",
    WebkitBackgroundClip: "text",
    color: "transparent",
    display: "inline-block",
    overflow: "hidden",
    whiteSpace: "nowrap",
    fontFamily: "cursive",
    maxWidth: "0ch",
    animation: "checkoutType 2.4s steps(32, end) forwards, checkoutGradientShift 6s linear infinite",
  } as const;

  const nextBilling = useMemo(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toLocaleDateString("en-US");
  }, []);

  const PAYPAL_PLAN_ID = "P-6WB96776R94410050NB7H7VA";
  const PAYPAL_BUTTON_CONTAINER_ID = "paypal-summary-buttons";
  const resolvedEnv = ((import.meta.env.VITE_APP_ENV as string | undefined) || "").trim().toLowerCase();
  const APP_ENV =
    resolvedEnv === "sandbox"
      ? "sandbox"
      : resolvedEnv === "live"
        ? "live"
        : import.meta.env.MODE === "production"
          ? "live"
          : "sandbox";
  const PAYPAL_CLIENT_ID = (import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined) || undefined;

  const handleSubscriptionSuccess = useCallback(
    async (subscriptionId: string) => {
      const firebaseUser = auth.currentUser;
      const idToken = firebaseUser ? await firebaseUser.getIdToken(true) : null;
      if (!idToken) throw new Error("You need to be signed in to subscribe.");
      const resp = await fetch("/api/paypal/attach-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ subscriptionId }),
      });
      const payload = (await resp.json().catch(() => ({}))) as { success?: boolean; profile?: any; message?: string };
      if (!resp.ok || !payload?.success) {
        throw new Error(payload?.message || "Could not attach subscription.");
      }
      if (payload.profile) setUser(payload.profile);
    },
    [setUser],
  );

  useEffect(() => {
    if (!showSummary) {
      if (paypalButtonsRef.current?.close) {
        try {
          paypalButtonsRef.current.close();
        } catch {
          // ignore
        }
      }
      paypalButtonsRef.current = null;
      setPaypalLoading(false);
      return;
    }
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_ID.trim()) {
      setPaypalError("PayPal client ID not configured.");
      return;
    }
    setPaypalError(null);
    setPaypalLoading(true);
    let cancelled = false;
    loadPaypalSdk(PAYPAL_CLIENT_ID, APP_ENV)
      .then((paypal) => {
        if (cancelled || !paypal) return;
        const container = document.getElementById(PAYPAL_BUTTON_CONTAINER_ID);
        if (!container) {
          throw new Error("PayPal container not found");
        }
        container.innerHTML = "";
        const buttons = paypal.Buttons({
          style: { shape: "pill", color: "gold", layout: "vertical", label: "subscribe", tagline: false },
          createSubscription: (_data: any, actions: any) =>
            actions.subscription.create({ plan_id: PAYPAL_PLAN_ID }),
          onApprove: (data: any) => {
            if (!data?.subscriptionID) {
              setPaypalError("Missing subscription ID from PayPal.");
              return;
            }
            handleSubscriptionSuccess(data.subscriptionID).catch((err) => setPaypalError(err?.message || "Attach failed"));
          },
          onError: (err: any) => setPaypalError(err?.message || "PayPal checkout failed."),
          onCancel: () => setPaypalError(null),
        });
        paypalButtonsRef.current = buttons;
        buttons
          .render(`#${PAYPAL_BUTTON_CONTAINER_ID}`)
          .catch((err: any) => setPaypalError(err?.message || "Could not render PayPal buttons."));
        setPaypalLoading(false);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setPaypalError(err?.message || "Failed to load PayPal.");
      })
      .finally(() => {
        if (!cancelled) setPaypalLoading(false);
      });
    return () => {
      cancelled = true;
      if (paypalButtonsRef.current?.close) {
        try {
          paypalButtonsRef.current.close();
        } catch {
          // ignore
        }
      }
      paypalButtonsRef.current = null;
    };
  }, [APP_ENV, PAYPAL_CLIENT_ID, PAYPAL_BUTTON_CONTAINER_ID, PAYPAL_PLAN_ID, handleSubscriptionSuccess, showSummary]);

  return (
    <>
      <style>{`${gradientShiftKeyframes}\n${typewriterKeyframes}`}</style>
      <div className="min-h-screen relative bg-slate-950 text-white flex flex-col items-center justify-center px-4 py-10">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: `url(${loginBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-slate-950/50 to-black/60" />
      <div className="relative z-10 w-full max-w-5xl space-y-8">
        <div
          className="flex items-center justify-center gap-3 absolute left-1/2 -translate-x-1/2 z-20"
          style={{ top: "-200px" }}
        >
          <img src={pawnPointIcon} alt="Pawn Point logo" className="h-16 w-16 object-contain" />
          <div className="text-3xl font-semibold">Pawn Point</div>
        </div>

        <div
          className="rounded-3xl border border-white/10 backdrop-blur-xl p-8 shadow-2xl space-y-6 max-w-4xl mx-auto"
          style={{ backgroundColor: "#2d3749" }}
        >
          <div className="flex items-center justify-center gap-2 text-brand.pink">
            <span className="h-1 w-12 rounded-full bg-brand.pink" />
            <span className="h-1 w-12 rounded-full bg-brand.pink" />
            <span className="h-1 w-12 rounded-full bg-brand.pink" />
            <span className="h-1 w-12 rounded-full bg-brand.pink" />
          </div>

          {!showSummary ? (
            <>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4 text-white">
                  <div className="flex items-center gap-3 text-2xl font-bold">
                    <Key className="h-7 w-7 text-amber-300" />
                    <span style={gradientTextStyle} className="bg-clip-text text-transparent">
                      Unlock your competitive edge
                    </span>
                  </div>
                  <ul className="space-y-3 text-xl text-white">
                    {[
                      "Elite Opening & Middlegame Library",
                      "Adaptive AI Sparring Partners",
                      "Progressive XP & Skill Tracking",
                      "Global Rankings & Standings",
                      "SquareBase™",
                      "Training Groups",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-brand.pink" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-slate-800/80 rounded-2xl border border-white/10 p-6 flex flex-col gap-6">
                  <div className="flex items-start justify-between w-full">
                    <div className="text-2xl font-bold">Monthly Plan</div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-brand.pink">$15.00</div>
                      <div className="text-sm text-white/70">/ Month</div>
                    </div>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <Button
                      className="px-8 bg-emerald-500 hover:bg-emerald-600 text-white shadow-none border-0"
                      onClick={() => setShowSummary(true)}
                    >
                      Select
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" className="px-6" onClick={() => navigate("/dashboard")}>
                  Back to App
                </Button>
              </div>
            </>
          ) : (
            <div className="p-0 space-y-4 max-w-md mx-auto">
              <div className="rounded-2xl bg-slate-900/80 border border-white/10 p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Selected plan:</span>
                  <span className="font-semibold text-emerald-300">Monthly Plan</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Price:</span>
                  <span className="font-semibold">USD 15.00</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Next billing date:</span>
                  <span className="font-semibold">{nextBilling}</span>
                </div>
              </div>
              <div className="text-center text-xl font-semibold">Total: USD 15.00</div>
              <div className="text-center text-sm text-white/70">Pay with:</div>
              <div className="space-y-3">
                <div className="w-full">
                  <div id={PAYPAL_BUTTON_CONTAINER_ID} className="min-h-[52px] flex items-center justify-center" />
                  {paypalLoading && <div className="text-xs text-white/70 text-center py-2">Loading PayPal...</div>}
                  {paypalError && <div className="text-xs text-rose-200 text-center py-2">{paypalError}</div>}
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" className="px-6" onClick={() => setShowSummary(false)}>
                  Back
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
