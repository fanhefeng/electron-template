import React from "react";
import ReactDOM from "react-dom/client";
import "../app.css";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { AboutApp } from "./AboutApp";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AboutApp />
    </ErrorBoundary>
  </React.StrictMode>
);
