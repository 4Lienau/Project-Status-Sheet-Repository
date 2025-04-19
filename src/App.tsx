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

  // Set a flag when initial check is complete
  useEffect(() => {
    if (!loading) {
      setInitialCheckComplete(true);
      console.log(
        "ProtectedRoute: Initial auth check complete for path:",
        location.pathname,
      );
    }
  }, [loading, location.pathname]);

  const authStatus = checkAuthStatus(user, loading, initialCheckComplete);

  // Show loading state while checking authentication
  if (authStatus === "loading") {
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
    return <Navigate to="/login" replace />;
  }

  // Render children if authenticated
  return children;
};

function App() {
  const location = useLocation();
  console.log("Current location:", location.pathname);

  return (
    <Suspense fallback={<p>Loading...</p>}>
      {import.meta.env.VITE_TEMPO === "true" && useRoutes(routes)}
      <Routes>
        {/* Public routes - these should come BEFORE protected routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Tempo route for development */}
        {import.meta.env.VITE_TEMPO === "true" && <Route path="/tempobook/*" />}

        {/* Protected routes */}
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
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPage />
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
