import { Suspense } from "react";
import { useRoutes, Routes, Route } from "react-router-dom";
import Home from "./components/home";
import StatusSheetView from "./pages/StatusSheetView";
import ProfilePage from "./pages/ProfilePage";
import routes from "tempo-routes";

function App() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <>
        <Routes>
          <Route path="/*" element={<Home />} />
          <Route path="/status-sheet/:id" element={<StatusSheetView />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
        {import.meta.env.VITE_TEMPO === "true" && useRoutes(routes)}
      </>
    </Suspense>
  );
}

export default App;
