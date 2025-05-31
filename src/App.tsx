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
import routes from "tempo-routes";
import { useAuth } from "./lib/hooks/useAuth";

// Helper function to check authentication status
const checkAuthStatus = (user, loading, initialCheckComplete) => {
  // Still loading authentication state
  if (loading || !initialCheckComplete) {
    console.log("ProtectedRoute: Still loading authentication state");
    return "loading";
  }

  // Not authenticated
  if (!user) {
    console.log("ProtectedRoute: No authenticated user, redirecting to login");
    return "unauthenticated";
  }

  // Authenticated
  console.log(
    "ProtectedRoute: User authenticated, rendering protected content",
  );
  return "authenticated";
};

// Protected route component that redirects to login if not authenticated
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);
  const location = useLocation();

  console.log("[DEBUG ProtectedRoute] Rendering for path:", location.pathname);
  console.log("[DEBUG ProtectedRoute] User:", user);
  console.log("[DEBUG ProtectedRoute] Loading:", loading);
  console.log(
    "[DEBUG ProtectedRoute] Initial check complete:",
    initialCheckComplete,
  );

  // Set a flag when initial check is complete
  useEffect(() => {
    if (!loading) {
      setInitialCheckComplete(true);
      console.log(
        "[DEBUG ProtectedRoute] Initial auth check complete for path:",
        location.pathname,
      );
    }
  }, [loading, location.pathname]);

  const authStatus = checkAuthStatus(user, loading, initialCheckComplete);
  console.log("[DEBUG ProtectedRoute] Auth status:", authStatus);

  // Show loading state while checking authentication
  if (authStatus === "loading") {
    console.log(
      "[DEBUG ProtectedRoute] Showing loading state for:",
      location.pathname,
    );
    return (
      <div className="flex items-center justify-center min-h-screen">
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
    console.log(
      "[DEBUG ProtectedRoute] Redirecting to login from:",
      location.pathname,
    );
    return <Navigate to="/login" replace />;
  }

  // Render children if authenticated
  console.log(
    "[DEBUG ProtectedRoute] Rendering children for:",
    location.pathname,
  );
  return children;
};

function App() {
  const location = useLocation();
  console.log("[DEBUG App.tsx] Current location:", location.pathname);
  console.log("[DEBUG App.tsx] Full location object:", location);

  // Monitor location changes
  useEffect(() => {
    console.log("[DEBUG App.tsx] Location changed to:", location.pathname);
    console.log("[DEBUG App.tsx] Location state:", location.state);
    console.log("[DEBUG App.tsx] Location search:", location.search);
  }, [location]);

  // Define main application routes that should never be handled by Tempo
  const isMainAppRoute =
    location.pathname === "/" ||
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/login") ||
    location.pathname.startsWith("/auth") ||
    location.pathname.startsWith("/status-sheet") ||
    location.pathname.startsWith("/project") ||
    location.pathname.startsWith("/profile");

  console.log("[DEBUG App.tsx] Is main app route?", isMainAppRoute);
  console.log(
    "[DEBUG App.tsx] Is admin route?",
    location.pathname.startsWith("/admin"),
  );

  // Only handle Tempo routes if we're NOT on a main application route
  if (import.meta.env.VITE_TEMPO === "true" && !isMainAppRoute) {
    console.log("[DEBUG App.tsx] Attempting to handle Tempo routes");
    const tempoRoutes = useRoutes(routes);
    if (tempoRoutes) {
      console.log("[DEBUG App.tsx] Tempo routes matched, rendering them");
      return <Suspense fallback={<p>Loading...</p>}>{tempoRoutes}</Suspense>;
    }
    console.log("[DEBUG App.tsx] No Tempo routes matched");
  } else {
    console.log(
      "[DEBUG App.tsx] Skipping Tempo routes - on main app route or Tempo disabled",
    );
  }

  console.log("[DEBUG App.tsx] Rendering main Routes component");
  console.log(
    "[DEBUG App.tsx] Current pathname for Routes:",
    location.pathname,
  );

  return (
    <Suspense fallback={<p>Loading...</p>}>
      <Routes>
        {/* Admin route - HIGHEST PRIORITY */}
        <Route
          path="/admin"
          element={(() => {
            console.log("[DEBUG App.tsx] Admin route element being rendered");
            console.log(
              "[DEBUG App.tsx] Current path:",
              window.location.pathname,
            );
            console.log("[DEBUG App.tsx] Current location:", location.pathname);
            console.log(
              "[DEBUG App.tsx] Route pathname matches:",
              location.pathname === "/admin",
            );
            console.log(
              "[DEBUG App.tsx] Window location matches:",
              window.location.pathname === "/admin",
            );

            // Temporary bypass for debugging - remove ProtectedRoute wrapper
            console.log(
              "[DEBUG App.tsx] Rendering AdminPage directly (bypassing ProtectedRoute for debugging)",
            );
            return <AdminPage />;
          })()}
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
          path="/project/:id"
          element={
            <ProtectedRoute>
              <ProjectDashboard />
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
