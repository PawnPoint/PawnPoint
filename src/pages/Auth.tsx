import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Mail, Lock, Chrome } from "lucide-react";
import { Button } from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import loginBg from "../assets/Login screen.png";

type Mode = "login" | "signup";

export default function AuthPage({ mode }: { mode: Mode }) {
  const { user, login, loginWithGoogle, loading } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [lockoutUntil, setLockoutUntil] = useState<number>(0);
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
    <div className="min-h-screen relative bg-slate-950 text-white flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-40"
        style={{
          backgroundImage: `url(${loginBg})`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-slate-950/50 to-black/60" />
      <div className="relative z-10 w-full max-w-lg rounded-3xl p-8 shadow-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="text-center mb-6 space-y-2">
          <div className="pill glass inline-flex items-center gap-2 border-white/10">
            <div className="h-2 w-2 rounded-full bg-brand.pink" />
            <span>Pawn Point</span>
          </div>
          <h1 className="text-3xl font-semibold">{isLogin ? "Log In" : "Create Account"}</h1>
          <p className="text-white/70 text-sm">
            Train, track XP, and climb the group leaderboard.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-center"
            onClick={handleGoogle}
            disabled={loading || locked}
          >
            <Chrome className="h-4 w-4 mr-2" />
            {loading ? "Please wait..." : "Continue with Google"}
          </Button>

          <div className="flex items-center gap-3 text-xs text-white/60">
            <span className="h-px flex-1 bg-white/10" />
            or
            <span className="h-px flex-1 bg-white/10" />
          </div>

          {error && (
            <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 text-amber-100 px-3 py-2 text-sm">
              {error} {locked && lockSeconds > 0 ? `(wait ${lockSeconds}s)` : ""}
            </div>
          )}

          {!isLogin && (
            <div>
              <label className="text-sm text-white/80">Display name</label>
              <div className="mt-1 relative">
                <input
                  className="w-full rounded-xl bg-white/10 border border-white/10 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-brand.pink"
                  placeholder="Chess Shark"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-sm text-white/80">Email</label>
            <div className="mt-1 relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-white/50" />
              <input
                type="email"
                className="w-full rounded-xl bg-white/10 border border-white/10 px-10 py-3 focus:outline-none focus:ring-2 focus:ring-brand.pink"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-white/80">Password</label>
            <div className="mt-1 relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-white/50" />
              <input
                type="password"
                className="w-full rounded-xl bg-white/10 border border-white/10 px-10 py-3 focus:outline-none focus:ring-2 focus:ring-brand.pink"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <Button className="w-full justify-center" onClick={handleSubmit} disabled={loading || locked}>
            {loading ? "One moment..." : locked ? `Please wait${lockSeconds ? ` (${lockSeconds}s)` : "..."}` : isLogin ? "Log In" : "Create Account"}
          </Button>

          <div className="text-sm text-white/70 text-center">
            {isLogin ? "New to Pawn Point?" : "Already have an account?"}{" "}
            <button
              className="text-brand.pink underline"
              onClick={() => navigate(isLogin ? "/signup" : "/login")}
            >
              {isLogin ? "Create account" : "Log in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
