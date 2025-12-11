import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";
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
          <Protected>
            <Leaderboard />
          </Protected>
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
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
