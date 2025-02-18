import { Suspense } from "react";
import { useRoutes, Routes, Route } from "react-router-dom";
import Home from "./components/home";
import StatusSheetView from "./pages/StatusSheetView";
import ProfilePage from "./pages/ProfilePage";
import AuthCallback from "./pages/AuthCallback";
import LoginPage from "./pages/LoginPage";
import routes from "tempo-routes";

function App() {
  // Handle Tempo routes
  const tempoRoutes =
    import.meta.env.VITE_TEMPO === "true" ? useRoutes(routes) : null;

  return (
    <Suspense fallback={<p>Loading...</p>}>
      {tempoRoutes}
      <Routes>
        {/* Auth routes first */}
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes */}
        <Route path="/status-sheet/:id" element={<StatusSheetView />} />
        <Route path="/profile" element={<ProfilePage />} />

        {/* Tempo route */}
        {import.meta.env.VITE_TEMPO === "true" && <Route path="/tempobook/*" />}

        {/* Main routes */}
        <Route path="/" element={<Home />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;
