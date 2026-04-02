import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  browserPopupRedirectResolver,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import {
  ensureProfile,
  logout as mockLogout,
  syncStreakStatus,
  USER_UPDATED_EVENT,
  type UserProfile,
} from "../lib/mockApi";

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

async function subscribeNewUserToMailchimp(email: string, displayName?: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return;

  try {
    const response = await fetch("/api/mailchimp/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: normalizedEmail,
        displayName: displayName?.trim() || undefined,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error || "Mailchimp signup sync failed");
    }
  } catch (err) {
    console.warn("Failed to subscribe new user to Mailchimp", err);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const googleProvider = new GoogleAuthProvider();
  const todayKey = new Date().toDateString();

  // Ensure we stay in a popup-only flow (avoid redirect in WebViews) and persist session locally.
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn("Failed to set auth persistence", err);
    });
  }, []);

  const bumpStreak = (profile: UserProfile | null): UserProfile | null => profile;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser?.email) {
        const profile = await ensureProfile(
          fbUser.email,
          fbUser.displayName || fbUser.email.split("@")[0],
          fbUser.uid,
        );
        const syncedProfile = await syncStreakStatus(profile.id).catch(() => profile);
        const withStreak = bumpStreak(syncedProfile || profile);
        setUser(withStreak);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [todayKey]);

  useEffect(() => {
    if (!user?.id) return;

    const sync = async () => {
      try {
        const nextProfile = await syncStreakStatus(user.id);
        if (nextProfile) {
          setUser(nextProfile);
        }
      } catch (err) {
        console.warn("Failed to refresh streak status", err);
      }
    };

    void sync();
    const interval = window.setInterval(sync, 60_000);
    return () => window.clearInterval(interval);
  }, [user?.id]);

  useEffect(() => {
    const handleUserUpdated = (event: Event) => {
      const detail = (event as CustomEvent<UserProfile | null>).detail;
      if (!detail) return;
      setUser((current) => {
        if (!current) return detail;
        if (current.id !== detail.id) return current;
        return detail;
      });
    };

    window.addEventListener(USER_UPDATED_EVENT, handleUserUpdated as EventListener);
    return () => {
      window.removeEventListener(USER_UPDATED_EVENT, handleUserUpdated as EventListener);
    };
  }, []);

  const loginHandler = async (
    email: string,
    password: string,
    displayName?: string,
    mode: "login" | "signup" = "login",
  ) => {
    setLoading(true);
    try {
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
        void subscribeNewUserToMailchimp(
          cred.user.email || email,
          displayName || cred.user.displayName || email.split("@")[0],
        );
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
    } finally {
      setLoading(false);
    }
  };

  const googleLoginHandler = async () => {
    setLoading(true);
    try {
      // Force popup resolver to avoid redirect flows that fail in WebViews/partitioned storage.
      const cred = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
      const additionalInfo = getAdditionalUserInfo(cred);
      const email = cred.user.email || "";
      const profile = await ensureProfile(
        email,
        cred.user.displayName || email.split("@")[0],
        cred.user.uid,
      );
      const withStreak = bumpStreak(profile);
      setUser(withStreak);
      if (additionalInfo?.isNewUser && email) {
        void subscribeNewUserToMailchimp(email, cred.user.displayName || email.split("@")[0]);
      }
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
