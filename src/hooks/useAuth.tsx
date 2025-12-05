import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { ensureProfile, logout as mockLogout, type UserProfile } from "../lib/mockApi";

type AuthContextValue = {
  user: UserProfile | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
    displayName?: string,
    mode?: "login" | "signup",
  ) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const fallbackAuthContext: AuthContextValue = {
  user: null,
  loading: false,
  login: async () => undefined,
  loginWithGoogle: async () => undefined,
  logout: async () => undefined,
  setUser: () => undefined,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const googleProvider = new GoogleAuthProvider();
  const todayKey = new Date().toDateString();

  const bumpStreak = (profile: UserProfile | null): UserProfile | null => {
    if (!profile) return profile;
    const lastLoginDay = localStorage.getItem("pawnpoint_last_login_day");
    if (lastLoginDay === todayKey) return profile;
    const next = { ...profile, streak: (profile.streak || 0) + 1 };
    localStorage.setItem("pawnpoint_last_login_day", todayKey);
    localStorage.setItem("pawnpoint_user", JSON.stringify(next));
    return next;
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser?.email) {
        const profile = await ensureProfile(
          fbUser.email,
          fbUser.displayName || fbUser.email.split("@")[0],
          fbUser.uid,
        );
        const withStreak = bumpStreak(profile);
        setUser(withStreak);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [todayKey]);

  const loginHandler = async (
    email: string,
    password: string,
    displayName?: string,
    mode: "login" | "signup" = "login",
  ) => {
    setLoading(true);
    if (mode === "signup") {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(cred.user, { displayName });
      }
      const profile = await ensureProfile(
        cred.user.email || email,
        displayName || cred.user.displayName || email.split("@")[0],
        cred.user.uid,
      );
      const withStreak = bumpStreak(profile);
      setUser(withStreak);
    } else {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const profile = await ensureProfile(
        cred.user.email || email,
        cred.user.displayName || displayName || email.split("@")[0],
        cred.user.uid,
      );
      const withStreak = bumpStreak(profile);
      setUser(withStreak);
    }
    setLoading(false);
  };

  const googleLoginHandler = async () => {
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const email = cred.user.email || "";
      const profile = await ensureProfile(
        email,
        cred.user.displayName || email.split("@")[0],
        cred.user.uid,
      );
      const withStreak = bumpStreak(profile);
      setUser(withStreak);
    } finally {
      setLoading(false);
    }
  };

  const logoutHandler = async () => {
    await signOut(auth);
    await mockLogout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login: loginHandler,
        loginWithGoogle: googleLoginHandler,
        logout: logoutHandler,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // Gracefully handle cases where a component renders outside the provider (e.g., during HMR or tests)
    console.error("useAuth must be used inside AuthProvider. Falling back to a safe default context.");
    return fallbackAuthContext;
  }
  return ctx;
}
