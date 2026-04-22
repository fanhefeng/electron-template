import React from "react";
import ReactDOM from "react-dom/client";
import "../app.css";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { SettingsApp } from "./SettingsApp";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <SettingsApp />
    </ErrorBoundary>
  </React.StrictMode>
);
