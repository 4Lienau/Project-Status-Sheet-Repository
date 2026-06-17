import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AuthProvider } from "@/lib/hooks/AuthContext";

const basename = import.meta.env.BASE_URL;

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
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);