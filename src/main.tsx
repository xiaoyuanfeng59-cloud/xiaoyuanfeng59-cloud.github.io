import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import { registerServiceWorker } from "./services/notifications";
import { applyThemeForCurrentUrl } from "./lib/theme";

registerServiceWorker().catch(() => {
  // The app still works fully as a local-first recorder without service worker support.
});

applyThemeForCurrentUrl();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
