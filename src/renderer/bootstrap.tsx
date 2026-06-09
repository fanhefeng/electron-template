import React from "react";
import ReactDOM from "react-dom/client";
import "./app.css";
import { ErrorBoundary } from "./components/ErrorBoundary";

/**
 * Single mount path shared by all renderer entry points (main/settings/about).
 * Each window's `main.tsx` is now one line — `bootstrapApp(App)` — so the
 * StrictMode + ErrorBoundary + global CSS wiring can never drift between
 * windows or be forgotten when a new window is added.
 */
export const bootstrapApp = (AppComponent: React.ComponentType): void => {
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <AppComponent />
      </ErrorBoundary>
    </React.StrictMode>
  );
};
