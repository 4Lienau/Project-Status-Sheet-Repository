/**
 * File: App.tsx
 * Purpose: Main application component that handles routing and authentication
 * Description: This is the root component of the application that sets up all routes and
 * implements route protection based on authentication status. It includes routes for login,
 * authentication callback, and various protected routes like home, project dashboard, profile,
 * and admin pages.
 *
 * Imports from:
 * - React core libraries
 * - react-router-dom for routing
 * - Various page components
 * - tempo-routes for Tempo platform integration
 * - useAuth custom hook for authentication
 *
 * Called by: src/main.tsx
 */

import { Suspense, useState, useEffect } from "react";
import {
  useRoutes,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import Home from "./components/home";
import StatusSheetView from "./pages/StatusSheetView";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import AuthCallback from "./pages/AuthCallback";
import LoginPage from "./pages/LoginPage";
import ProjectDashboard from "./pages/ProjectDashboard";
import ProjectKPIsPage from "./pages/ProjectKPIsPage";
import ProjectsRoadmap from "./pages/ProjectsRoadmap";
import ProjectTimeline from "./pages/ProjectTimeline";
import routes from "tempo-routes";
import { useAuth } from "./lib/hooks/useAuth";
import { useSessionTracking } from "./lib/hooks/useSessionTracking";

// Helper function to check authentication status
const checkAuthStatus = (user, loading, initialCheckComplete) => {
  // Still loading authentication state
  if (loading || !initialCheckComplete) {
    return "loading";
  }

  // Not authenticated
  if (!user) {
    return "unauthenticated";
  }

  // Authenticated
  return "authenticated";
};

// Component to handle session tracking
const SessionTracker = () => {
  const location = useLocation();
  const { trackPageView, trackFeatureUse } = useSessionTracking();

  // Track page views
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname, trackPageView]);

  // Track feature usage based on route
  useEffect(() => {
    const routeFeatures = {
      "/admin": "admin_dashboard",
      "/project": "project_management",
      "/profile": "profile_management",
      "/kpis": "kpi_dashboard",
      "/roadmap": "projects_roadmap",
    };

    const feature = Object.keys(routeFeatures).find((route) =>
      location.pathname.startsWith(route),
    );

    if (feature) {
      trackFeatureUse(routeFeatures[feature], { route: location.pathname });
    }
  }, [location.pathname, trackFeatureUse]);

  return null;
};

// Protected route component that redirects to login if not authenticated
const ProtectedRoute = ({ children, ...props }) => {
  const { user, loading } = useAuth();
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);
  const location = useLocation();

  // Set a flag when initial check is complete
  useEffect(() => {
    if (!loading) {
      setInitialCheckComplete(true);
    }
  }, [loading, location.pathname]);

  const authStatus = checkAuthStatus(user, loading, initialCheckComplete);

  // Only filter out specific problematic props
  const { key, testID, tempoelementid, ...safeProps } = props;

  // Show loading state while checking authentication
  if (authStatus === "loading") {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        {...safeProps}
      >
        <div className="text-center">
          <h2 className="text-lg font-semibold">Loading...</h2>
          <p className="text-muted-foreground">
            Please wait while we verify your authentication.
          </p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (authStatus === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  // Render children if authenticated
  return <>{children}</>;
};

function App() {
  const location = useLocation();

  // Define main application routes that should never be handled by Tempo
  const isMainAppRoute =
    location.pathname === "/" ||
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/login") ||
    location.pathname.startsWith("/auth") ||
    location.pathname.startsWith("/status-sheet") ||
    location.pathname.startsWith("/project") ||
    location.pathname.startsWith("/profile") ||
    location.pathname.startsWith("/kpis") ||
    location.pathname.startsWith("/roadmap");

  // Only handle Tempo routes if we're NOT on a main application route
  if (import.meta.env.VITE_TEMPO === "true" && !isMainAppRoute) {
    const tempoRoutes = useRoutes(routes);
    if (tempoRoutes) {
      return <Suspense fallback={<p>Loading...</p>}>{tempoRoutes}</Suspense>;
    }
  }

  return (
    <Suspense fallback={<p>Loading...</p>}>
      <SessionTracker />
      <Routes>
        {/* Admin route - HIGHEST PRIORITY */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />

        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Tempo route for development */}
        {import.meta.env.VITE_TEMPO === "true" && <Route path="/tempobook/*" />}
        <Route
          path="/status-sheet/:id"
          element={
            <ProtectedRoute>
              <StatusSheetView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project/new"
          element={
            <ProtectedRoute>
              <Home mode="form" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project/:id"
          element={
            <ProtectedRoute>
              <ProjectDashboard initialEditMode={true} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project/:id/view"
          element={
            <ProtectedRoute>
              <ProjectDashboard initialEditMode={false} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project/:id/timeline"
          element={
            <ProtectedRoute>
              <ProjectTimeline />
            </ProtectedRoute>
          }
        />
        <Route
          path="/overview"
          element={
            <ProtectedRoute>
              <Home mode="overview" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/kpis"
          element={
            <ProtectedRoute>
              <ProjectKPIsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/roadmap"
          element={
            <ProtectedRoute>
              <ProjectsRoadmap />
            </ProtectedRoute>
          }
        />

        {/* Catch-all route - must be last */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}

export default App;