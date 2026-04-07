import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";
import Landing from "./pages/Landing";
import AuthPage from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import Leaderboard from "./pages/Leaderboard";
import Practice from "./pages/Practice";
import NotFound from "./pages/NotFound";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import LessonPlayer from "./pages/LessonPlayer";
import Settings from "./pages/Settings";
import AdventCalendar from "./pages/AdventCalendar";
import Profile from "./pages/Profile";
import Ranks from "./pages/Ranks";
import Analysis from "./pages/Analysis";
import Puzzles from "./pages/Puzzles";
import Checkout from "./pages/Checkout";
import Pricing from "./pages/Pricing";
import SquareBase from "./pages/SquareBase";
import TermsOfUse from "./pages/TermsOfUse";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CookiePolicy from "./pages/CookiePolicy";
import ZacOnly from "./pages/ZacOnly";

const SOUTH_KNIGHTS_GROUP_ID = "south-knight";
const SOUTH_KNIGHTS_GROUP_CODE = "0055";
const ZAC_ONLY_UID = "FeXOccEwugQBmJtcFgydgAnrlUA3";

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const shouldRedirect = !loading && !user;

  useEffect(() => {
    if (shouldRedirect) {
      navigate("/login");
    }
  }, [shouldRedirect, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white/70">
        Loading...
      </div>
    );
  }

  if (shouldRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white/70">
        Redirecting to login...
      </div>
    );
  }

  return children;
}

function ProtectedStandings({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const shouldLoginRedirect = !loading && !user;
  const canViewStandings =
    !!user &&
    (user.groupId === SOUTH_KNIGHTS_GROUP_ID || user.groupCode?.includes(SOUTH_KNIGHTS_GROUP_CODE));
  const shouldDashboardRedirect = !loading && !!user && !canViewStandings;

  useEffect(() => {
    if (shouldLoginRedirect) {
      navigate("/login");
      return;
    }
    if (shouldDashboardRedirect) {
      navigate("/dashboard");
    }
  }, [shouldLoginRedirect, shouldDashboardRedirect, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white/70">
        Loading...
      </div>
    );
  }

  if (shouldLoginRedirect || shouldDashboardRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white/70">
        Redirecting...
      </div>
    );
  }

  return children;
}

function ProtectedZacOnly({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const shouldLoginRedirect = !loading && !user;
  const shouldHomeRedirect = !loading && !!user && user.id !== ZAC_ONLY_UID;

  useEffect(() => {
    if (shouldLoginRedirect) {
      navigate("/login");
      return;
    }
    if (shouldHomeRedirect) {
      navigate("/");
    }
  }, [navigate, shouldHomeRedirect, shouldLoginRedirect]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white/70">
        Loading...
      </div>
    );
  }

  if (shouldLoginRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white/70">
        Redirecting to login...
      </div>
    );
  }

  if (shouldHomeRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white/70">
        Redirecting...
      </div>
    );
  }

  return children;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={() => <AuthPage mode="login" />} />
      <Route path="/signup" component={() => <AuthPage mode="signup" />} />
      <Route path="/dashboard">
        {() => (
          <Protected>
            <Dashboard />
          </Protected>
        )}
      </Route>
      <Route path="/courses">
        {() => (
          <Protected>
            <Courses />
          </Protected>
        )}
      </Route>
      <Route path="/courses/:id">
        {(params) => (
          <Protected>
            <CourseDetail id={params.id} />
          </Protected>
        )}
      </Route>
      <Route path="/lesson">
        {() => (
          <Protected>
            <LessonPlayer />
          </Protected>
        )}
      </Route>
      <Route path="/lesson/:id">
        {(params) => (
          <Protected>
            <LessonPlayer id={params.id} />
          </Protected>
        )}
      </Route>
      <Route path="/leaderboard">
        {() => (
          <ProtectedStandings>
            <Leaderboard />
          </ProtectedStandings>
        )}
      </Route>
      <Route path="/advent">
        {() => (
          <Protected>
            <AdventCalendar />
          </Protected>
        )}
      </Route>
      <Route path="/practice" component={Practice} />
      <Route path="/puzzles">
        {() => (
          <Protected>
            <Puzzles />
          </Protected>
        )}
      </Route>
      <Route path="/analysis">
        {() => (
          <Protected>
            <Analysis />
          </Protected>
        )}
      </Route>
      <Route path="/ranks">
        {() => (
          <Protected>
            <Ranks />
          </Protected>
        )}
      </Route>
      <Route path="/squarebase">
        {() => (
          <Protected>
            <SquareBase />
          </Protected>
        )}
      </Route>
      <Route path="/profile">
        {() => (
          <Protected>
            <Profile />
          </Protected>
        )}
      </Route>
      <Route path="/settings">
        {() => (
          <Protected>
            <Settings />
          </Protected>
        )}
      </Route>
      <Route path="/zac-only">
        {() => (
          <ProtectedZacOnly>
            <ZacOnly />
          </ProtectedZacOnly>
        )}
      </Route>
      <Route path="/checkout" component={Checkout} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/terms-of-use" component={TermsOfUse} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/cookie-policy" component={CookiePolicy} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
      <Analytics />
    </AuthProvider>
  );
}
