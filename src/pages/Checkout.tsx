import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../components/ui/Button";
import loginBg from "../assets/Login screen.png";
import pawnPointIcon from "../assets/App tab icon.png";
import { useLocation } from "wouter";
import { ArrowLeft, Check, RotateCcw, ShieldCheck, Sparkles, Trophy, Users, Zap } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { auth } from "../lib/firebase";
import { loadPaypalSdk } from "../lib/paypal";

export default function Checkout() {
  const [, navigate] = useLocation();
  const { user, loading, setUser } = useAuth();
  const [showSummary, setShowSummary] = useState(false);
  const [paypalError, setPaypalError] = useState<string | null>(null);
  const [paypalLoading, setPaypalLoading] = useState(false);
  const paypalButtonsRef = useRef<any>(null);
  const canCheckout = !!user;

  const planFeatures = useMemo(
    () => [
      "Elite Opening & Middlegame Library",
      "Global Rankings & Standings",
      "SquareBase AI Training",
      "Private Training Groups",
      "Premium XP & Rewards System",
      "Future Features Included",
    ],
    [],
  );

  const promisePoints = useMemo(
    () => [
      { icon: RotateCcw, label: "Cancel anytime" },
      { icon: Zap, label: "Instant access" },
      { icon: Check, label: "No hidden fees" },
    ],
    [],
  );

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
    if (!loading && !user) {
      setShowSummary(false);
    }
  }, [loading, user]);

  useEffect(() => {
    if (!showSummary || !user) {
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
  }, [APP_ENV, PAYPAL_CLIENT_ID, PAYPAL_BUTTON_CONTAINER_ID, PAYPAL_PLAN_ID, handleSubscriptionSuccess, showSummary, user]);

  const handlePrimaryAction = () => {
    if (loading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    setShowSummary(true);
  };

  const handlePageBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }
    navigate("/");
  }, [navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030712] text-white">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: `url(${loginBg})` }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.22),transparent_30%),radial-gradient(circle_at_bottom,rgba(29,78,216,0.18),transparent_28%),linear-gradient(180deg,#050816_0%,#030712_100%)]" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-[8%] top-[14%] h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute right-[10%] top-[24%] h-72 w-72 rounded-full bg-blue-400/10 blur-3xl" />
        <div className="absolute bottom-[10%] left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-400/8 blur-3xl" />
      </div>

      <button
        type="button"
        aria-label="Go back"
        onClick={handlePageBack}
        className="absolute left-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-slate-950/60 text-white backdrop-blur transition hover:border-blue-300/40 hover:bg-slate-900/80 md:left-6 md:top-6"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-6 py-12 md:py-20">
        {!showSummary ? (
          <>
            <header className="mb-16 text-center md:mb-20">
              <div className="mb-3 inline-flex items-center justify-center">
                <img src={pawnPointIcon} alt="Pawn Point logo" className="mr-3 h-9 w-9 object-contain" />
                <h1 className="text-3xl font-semibold tracking-tight text-white">Pawn Point</h1>
              </div>
              <p className="text-sm text-blue-200/70">Used by competitive chess players</p>
            </header>

            <div className="mb-12 text-center md:mb-16">
              <h2 className="mx-auto mb-4 whitespace-nowrap text-[clamp(1.8rem,5vw,3rem)] font-semibold tracking-tight text-white">
                <span className="md:hidden">Train like a GM</span>
                <span className="hidden md:inline">Train Like a Competitive Player</span>
              </h2>
              <p className="mx-auto max-w-[500px] text-base text-blue-100/80 md:text-lg">
                Structured improvement. Private groups. Elite tools.
              </p>
            </div>

            <div className="mx-auto mb-16 max-w-[520px]">
              <div className="mb-6 flex justify-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-gradient-to-r from-blue-500/20 to-blue-600/20 px-4 py-2 backdrop-blur-sm">
                  <Sparkles className="h-4 w-4 text-blue-300" />
                  <span className="text-sm text-blue-100">Most Popular Choice</span>
                </div>
              </div>

              <div className="group relative">
                <div className="absolute inset-0 rounded-[28px] bg-gradient-to-r from-blue-500/30 to-blue-600/30 blur-xl opacity-70 transition-opacity duration-500 group-hover:opacity-90" />
                <div className="relative rounded-[28px] border border-white/[0.15] bg-white/[0.07] p-8 shadow-2xl backdrop-blur-xl md:p-10">
                  <div className="mb-8 text-center">
                    <h3 className="mb-3 text-2xl font-semibold text-white">Pawn Point Pro</h3>
                    <div className="flex items-end justify-center gap-2">
                      <span className="text-5xl tracking-tight text-white">$25</span>
                      <span className="mb-2 text-blue-200/70">/ month</span>
                    </div>
                    <p className="mt-2 text-xs text-blue-100/70 md:hidden">Less than $1 per day</p>
                  </div>

                  <div className="mb-8 space-y-4">
                    {planFeatures.map((item) => (
                      <div key={item} className="flex items-start gap-3">
                        <Check className="mt-0.5 h-6 w-6 flex-shrink-0 text-blue-400" strokeWidth={2.5} />
                        <span className="text-blue-50">{item}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 text-white shadow-lg shadow-blue-500/30 transition-all duration-300 hover:scale-[1.02] hover:from-blue-600 hover:to-blue-700 hover:shadow-blue-500/50 active:scale-[0.98]"
                    onClick={handlePrimaryAction}
                  >
                    Unlock My Competitive Edge
                  </button>
                </div>
              </div>
            </div>

            <div className="mx-auto mb-16 max-w-[520px]">
              <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
                {promisePoints.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-2">
                    <Icon className="h-6 w-6 text-blue-400" />
                    <p className="text-sm text-blue-100/70">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-8 text-center">
              <p className="text-sm text-blue-200/60">Early adopter price. May increase later.</p>
              {!loading && !canCheckout && (
                <p className="mt-3 text-sm text-amber-200/80">
                  Sign in inside the app to continue with checkout.
                </p>
              )}
            </div>

            <div className="text-center">
              <Button
                className="rounded-xl border-0 bg-gradient-to-r from-blue-500 to-blue-600 px-12 py-5 text-white shadow-xl shadow-blue-500/40 transition-all duration-300 hover:scale-[1.03] hover:from-blue-600 hover:to-blue-700 hover:shadow-blue-500/60 active:scale-[0.98]"
                onClick={handlePrimaryAction}
              >
                Start Improving Today
              </Button>
            </div>
          </>
        ) : (
          <div className="mx-auto max-w-md space-y-5">
            <div className="text-center">
              <div className="mb-3 inline-flex items-center gap-3">
                <img src={pawnPointIcon} alt="Pawn Point logo" className="h-9 w-9 object-contain" />
                <span className="text-2xl font-semibold tracking-tight text-white">Pawn Point</span>
              </div>
              <p className="text-sm text-blue-200/70">Complete your subscription to unlock Pro access.</p>
            </div>

            <div className="rounded-[28px] border border-white/12 bg-white/[0.07] p-6 shadow-2xl backdrop-blur-xl">
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">Selected plan:</span>
                    <span className="font-semibold text-emerald-300">Pawn Point Pro</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-white/70">Price:</span>
                    <span className="font-semibold">USD 25.00</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-white/70">Next billing date:</span>
                    <span className="font-semibold">{nextBilling}</span>
                  </div>
                </div>

                <div className="text-center text-xl font-semibold">Total: USD 25.00</div>
                <div className="text-center text-sm text-white/70">Pay with PayPal</div>

                <div className="w-full">
                  <div id={PAYPAL_BUTTON_CONTAINER_ID} className="flex min-h-[52px] items-center justify-center" />
                  {paypalLoading && <div className="py-2 text-center text-xs text-white/70">Loading PayPal...</div>}
                  {paypalError && <div className="py-2 text-center text-xs text-rose-200">{paypalError}</div>}
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" className="px-6" onClick={() => setShowSummary(false)}>
                    Back
                  </Button>
                  <Button variant="outline" className="px-6" onClick={() => navigate("/dashboard")}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
