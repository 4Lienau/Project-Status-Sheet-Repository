import { Suspense } from "react";
import { useRoutes, Routes, Route } from "react-router-dom";
import Home from "./components/home";
import StatusSheetView from "./pages/StatusSheetView";
import ProfilePage from "./pages/ProfilePage";
import AuthCallback from "./pages/AuthCallback";
import LoginPage from "./pages/LoginPage";
import routes from "tempo-routes";

function App() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          Loading...
        </div>
      }
    >
      <>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/status-sheet/:id" element={<StatusSheetView />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="*" element={<Home />} />
        </Routes>
        {import.meta.env.VITE_TEMPO === "true" && useRoutes(routes)}
      </>
    </Suspense>
  );
}

export default App;
