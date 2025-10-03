import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const basename = import.meta.env.BASE_URL;

// Initialize Tempo Devtools
if (import.meta.env.VITE_TEMPO === "true") {
  const initTempo = async () => {
    const { TempoDevtools } = await import("tempo-devtools");
    // /* TempoDevtools.init() [deprecated] */ is deprecated - no longer needed
    // The devtools attach automatically when VITE_TEMPO is true.
  };
  initTempo();
}

// Render the app
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter
      basename={basename}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ThemeProvider defaultTheme="system" storageKey="ui-theme">
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);