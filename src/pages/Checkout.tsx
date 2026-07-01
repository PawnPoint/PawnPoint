import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../components/ui/Button";
import loginBg from "../assets/Login screen.png";
import pawnPointIcon from "../assets/App tab icon.png";
import { useLocation } from "wouter";
import { ArrowLeft, Check, RotateCcw, ShieldCheck, Sparkles, Trophy, Users, Zap } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { auth } from "../lib/firebase";
import { loadPaypalSdk } from "../lib/paypal";
import { canAccessBlackBook, canAccessTrainingPage } from "../lib/access";
import { checkoutReturnPath } from "../lib/checkoutRedirect";

export default function Checkout() {
  const [location, navigate] = useLocation();
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
      "BlackBook Training Library",
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

  const returnTo = useMemo(() => checkoutReturnPath(location.split("?")[1] || ""), [location]);
  const backTarget = useMemo(() => {
    if (returnTo.startsWith("/blackbook") && !canAccessBlackBook(user)) return "/dashboard";
    if (returnTo.startsWith("/training") && !canAccessTrainingPage(user)) return "/dashboard";
    return returnTo || "/dashboard";
  }, [returnTo, user]);

  const handlePageBack = useCallback(() => {
    navigate(backTarget);
  }, [backTarget, navigate]);

  const freeFeatures = [
    "Core dashboard and progress tracking",
    "Limited course access",
    "Daily puzzle training",
  ];

  const proFeatures = [
    "Everything in Free Plan",
    "Full course library access",
    "Unlimited BlackBook study space",
    "Global ranks and standings",
    "Private club and team workspaces",
    "AI assisted analysis tools",
    "Premium puzzle and training flows",
    "Custom profile rewards",
    "Priority product updates",
    "Standard security features",
  ];

  if (!showSummary) {
    return (
      <main className="min-h-screen bg-black px-6 py-16 text-white md:py-24">
        <button
          type="button"
          aria-label="Go back"
          onClick={handlePageBack}
          className="fixed left-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/14 bg-black text-white transition hover:border-white/35 md:left-6 md:top-6"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <section className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-[clamp(2.5rem,6vw,4.6rem)] font-semibold tracking-[-0.035em]">
              Pricing that Scales with You
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/82">
              Pawn Point gives players and clubs a focused training system for courses, progress, BlackBook study, and purposeful improvement.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-[980px] gap-0 md:mt-24 md:grid-cols-5">
            <article className="flex flex-col justify-between rounded-xl border border-white/14 bg-black p-8 md:col-span-2 md:my-2 md:rounded-r-none md:border-r-0 lg:p-10">
              <div>
                <h2 className="text-base font-semibold">Free</h2>
                <div className="my-4 text-3xl font-semibold tracking-tight">$0 / mo</div>
                <p className="text-sm text-white/58">Per player</p>

                <button
                  type="button"
                  onClick={() => navigate(user ? "/dashboard" : "/login")}
                  className="mt-6 h-11 w-full rounded-lg border border-white/18 text-sm font-semibold text-white transition hover:border-white/35 hover:bg-white/5"
                >
                  Get Started
                </button>

                <div className="my-6 border-t border-dashed border-white/18" />
                <ul className="space-y-4 text-sm">
                  {freeFeatures.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <Check className="h-3.5 w-3.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>

            <article className="rounded-xl border border-white/18 bg-[#262626] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:col-span-3 lg:p-10">
              <div className="grid gap-8 sm:grid-cols-[0.8fr_1fr]">
                <div>
                  <h2 className="text-base font-semibold">Pro</h2>
                  <div className="my-4 text-3xl font-semibold tracking-tight">$25 / mo</div>
                  <p className="text-sm text-white/58">Per player</p>

                  <button
                    type="button"
                    onClick={handlePrimaryAction}
                    disabled={loading}
                    className="mt-7 h-12 w-full rounded-lg bg-white text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Get Started
                  </button>

                  {!loading && !canCheckout && (
                    <p className="mt-4 text-sm leading-6 text-white/55">
                      Sign in inside the app to continue with checkout.
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold">Everything in free plus :</h3>
                  <ul className="mt-6 space-y-4 text-sm">
                    {proFeatures.map((feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        <Check className="h-3.5 w-3.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          </div>
        </section>
      </main>
    );
  }

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
                <img src={pawnPointIcon} alt="Pawn Point logo" className="mr-3 h-14 w-14 object-contain md:h-16 md:w-16" />
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
              <div className="flex flex-wrap items-start justify-center gap-5 text-center md:gap-8">
                {promisePoints.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex w-[120px] flex-col items-center gap-2">
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
                <img src={pawnPointIcon} alt="Pawn Point logo" className="h-12 w-12 object-contain md:h-14 md:w-14" />
                <span className="text-2xl font-semibold tracking-tight text-white">Pawn Point</span>
              </div>
              <p className="text-sm text-blue-200/70">Complete your subscription to unlock Pro access.</p>
            </div>

            <div className="rounded-[28px] border border-white/12 bg-transparent p-6 shadow-2xl backdrop-blur-xl">
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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
