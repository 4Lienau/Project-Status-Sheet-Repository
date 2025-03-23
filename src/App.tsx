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
import routes from "tempo-routes";
import { useAuth } from "./lib/hooks/useAuth";

// Protected route component that redirects to login if not authenticated
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);

  // Set a flag when initial check is complete
  useEffect(() => {
    if (!loading) {
      setInitialCheckComplete(true);
    }
  }, [loading]);

  // Show loading state while checking authentication
  if (loading || !initialCheckComplete) {
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
  if (!user) {
    console.log("ProtectedRoute: No authenticated user, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  console.log(
    "ProtectedRoute: User authenticated, rendering protected content",
  );
  // Render children if authenticated
  return children;
};

function App() {
  const location = useLocation();

  return (
    <Suspense fallback={<p>Loading...</p>}>
      <>
        {import.meta.env.VITE_TEMPO === "true" && useRoutes(routes)}
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Protected routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/status-sheet/:id"
            element={
              <ProtectedRoute>
                <StatusSheetView />
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

          {import.meta.env.VITE_TEMPO === "true" && (
            <Route path="/tempobook/*" />
          )}
        </Routes>
      </>
    </Suspense>
  );
}

export default App;
