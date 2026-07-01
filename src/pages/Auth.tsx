import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const chessAuthAssets = import.meta.glob("../assets/chess/*.{png,jpg,jpeg,webp}", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;
const authVisual =
  chessAuthAssets["../assets/chess/loginsigninscreen.png"] ??
  chessAuthAssets["../assets/chess/Loginsignin screen.png"] ??
  "";

type Mode = "login" | "signup";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 18 18" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2045c0-.638-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.795 2.716v2.258h2.908c1.702-1.567 2.683-3.874 2.683-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.181l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.037-3.711H.957v2.332C2.438 15.983 5.481 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.963 10.71A5.41 5.41 0 0 1 3.681 9c0-.593.102-1.17.282-1.71V4.958H.957A8.995 8.995 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.006-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.579c1.321 0 2.507.454 3.44 1.345l2.581-2.581C13.463.891 11.426 0 9 0 5.481 0 2.438 2.017.957 4.958L3.963 7.29C4.672 5.163 6.656 3.579 9 3.579z"
      />
    </svg>
  );
}

export default function AuthPage({ mode }: { mode: Mode }) {
  const { user, login, loginWithGoogle, loading } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [lockoutUntil, setLockoutUntil] = useState<number>(0);
  const [showPassword, setShowPassword] = useState(false);
  const isLogin = mode === "login";
  const now = Date.now();
  const locked = lockoutUntil > now;
  const [lockSeconds, setLockSeconds] = useState(0);

  useEffect(() => {
    if (!locked) {
      setLockSeconds(0);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setLockSeconds(remaining);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [locked, lockoutUntil]);

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const handleSubmit = async () => {
    if (!email || (!isLogin && !name) || !password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (locked) {
      const seconds = Math.max(1, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setError(`Too many attempts. Please wait ${seconds}s before trying again.`);
      return;
    }
    try {
      setError("");
      const truncatedName = (name || email.split("@")[0]).slice(0, 9);
      await login(email, password, truncatedName, isLogin ? "login" : "signup");
      navigate("/dashboard");
    } catch (err: unknown) {
      console.error("Auth error", err);
      const code = (err as any)?.code || "";
      if (code === "auth/email-already-in-use") {
        setError("That email is already registered. Try logging in instead.");
      } else if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
        setError("Invalid email or password. Please try again.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a minute and try again.");
        setLockoutUntil(Date.now() + 60_000);
      } else {
        setError("Sign-in failed. Please check your details and try again.");
      }
    }
  };

  const handleGoogle = async () => {
    try {
      setError("");
      await loginWithGoogle();
      navigate("/dashboard");
    } catch (err: unknown) {
      console.error("Google auth error", err);
      const code = (err as any)?.code || "";
      if (code === "auth/popup-closed-by-user") {
        setError("Google popup was closed. Please try again.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a minute and try again.");
        setLockoutUntil(Date.now() + 60_000);
      } else {
        setError("Google sign-in failed. Please try again or use email/password.");
      }
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      {authVisual && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 md:hidden"
          style={{ backgroundImage: `url(${authVisual})` }}
        />
      )}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.06),transparent_32%),linear-gradient(180deg,rgba(0,0,0,0.72),#000)]" />
      <button
        type="button"
        onClick={() => navigate("/")}
        className="absolute left-5 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/35 text-white/80 backdrop-blur-md transition hover:bg-white/10 hover:text-white"
        aria-label="Back to landing page"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>

      <main className="relative z-10 grid min-h-screen md:grid-cols-[minmax(420px,49vw)_1fr]">
        <section className="flex min-h-screen items-center justify-center px-6 py-20 sm:px-8 lg:px-12">
          <div className="w-full max-w-[350px]">
            <div className="mb-8 text-center">
              <h1 className="text-[26px] font-bold leading-tight tracking-[-0.01em] text-white">
                {isLogin ? "Sign in to your account" : "Create your account"}
              </h1>
              <p className="mt-3 text-sm leading-6 text-white/68">
                {isLogin ? "Enter your email below to sign in" : "Enter your details below to sign up"}
              </p>
            </div>

            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSubmit();
              }}
            >
              {error && (
                <div className="rounded-xl border border-amber-400/35 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
                  {error} {locked && lockSeconds > 0 ? `(wait ${lockSeconds}s)` : ""}
                </div>
              )}

              {!isLogin && (
                <div>
                  <label htmlFor="auth-name" className="text-sm font-semibold text-white">
                    Display name
                  </label>
                  <input
                    id="auth-name"
                    className="mt-2 h-10 w-full rounded-2xl border border-white/10 bg-black/45 px-4 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition placeholder:text-white/35 focus:border-white/30 focus:bg-black/60"
                    placeholder="Chess Shark"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
              )}

              <div>
                <label htmlFor="auth-email" className="text-sm font-semibold text-white">
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  className="mt-2 h-10 w-full rounded-2xl border border-white/10 bg-black/45 px-4 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition placeholder:text-white/35 focus:border-white/30 focus:bg-black/60"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="auth-password" className="text-sm font-semibold text-white">
                  Password
                </label>
                <div className="relative mt-2">
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    className="h-10 w-full rounded-2xl border border-white/10 bg-black/45 px-4 pr-11 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition placeholder:text-white/35 focus:border-white/30 focus:bg-black/60"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-white/50 transition hover:text-white"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || locked}
                className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-bold text-white transition hover:border-white/25 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Please wait..." : locked ? `Please wait${lockSeconds ? ` (${lockSeconds}s)` : "..."}` : isLogin ? "Sign In" : "Sign Up"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm font-semibold text-white">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                className="text-white underline-offset-4 transition hover:underline"
                onClick={() => navigate(isLogin ? "/signup" : "/login")}
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </div>

            <div className="my-6 flex items-center gap-3 text-sm text-white/56">
              <span className="h-px flex-1 bg-white/10" />
              Or continue with
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading || locked}
              className="inline-flex h-10 w-full items-center justify-center gap-4 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-bold text-white transition hover:border-white/25 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </div>
        </section>

        <section className="relative hidden min-h-screen overflow-hidden md:block">
          {authVisual ? (
            <img
              src={authVisual}
              alt="Pawn Point chess pieces with lightning"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,rgba(255,255,255,0.08),transparent_34%),#000]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/0 to-black/10" />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black via-black/82 to-transparent" />
          <blockquote className="absolute inset-x-8 bottom-8 text-center text-white">
            <p className="text-lg font-bold">"Welcome Back! The journey continues."</p>
            <cite className="mt-3 block text-sm not-italic text-white/58">-- Pawn Point</cite>
          </blockquote>
        </section>
      </main>
    </div>
  );
}
