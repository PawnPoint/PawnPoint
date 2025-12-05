import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Mail, Lock, Chrome } from "lucide-react";
import { Button } from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import loginBg from "../assets/Login screen.png";

type Mode = "login" | "signup";

export default function AuthPage({ mode }: { mode: Mode }) {
  const { user, login, loginWithGoogle } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const isLogin = mode === "login";

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const handleSubmit = async () => {
    if (!email || (!isLogin && !name) || !password) {
      return;
    }
    try {
      await login(email, password, name || email.split("@")[0], isLogin ? "login" : "signup");
      navigate("/dashboard");
    } catch (err: unknown) {
      console.error("Auth error", err);
    }
  };

  const handleGoogle = async () => {
    try {
      await loginWithGoogle();
      navigate("/dashboard");
    } catch (err: unknown) {
      console.error("Google auth error", err);
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
            Train, track XP, and climb the club leaderboard.
          </p>
        </div>

        <div className="space-y-3">
          <Button variant="outline" className="w-full justify-center" onClick={handleGoogle}>
            <Chrome className="h-4 w-4 mr-2" />
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 text-xs text-white/60">
            <span className="h-px flex-1 bg-white/10" />
            or
            <span className="h-px flex-1 bg-white/10" />
          </div>

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

          <Button className="w-full justify-center" onClick={handleSubmit}>
            {isLogin ? "Log In" : "Create Account"}
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
