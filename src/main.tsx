import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./ErrorBoundary";
import { ThemeInit } from "./components/ThemeToggle";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error('Missing <div id="root"></div> in index.html');
}

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <div className="flex min-h-0 flex-1 flex-col">
        <ThemeInit />
        <App />
      </div>
    </ErrorBoundary>
  </StrictMode>,
);
