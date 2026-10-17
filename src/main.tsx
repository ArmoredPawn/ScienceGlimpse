import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";

/*
 * Pages load as separate files whose names change with every deploy, so a
 * tab opened before one asks for files that are gone the next time it
 * changes page. Reloading fetches the new build. At most once a minute, so
 * a file that is genuinely broken can't trap the page in a reload loop.
 */
window.addEventListener("vite:preloadError", (event) => {
  try {
    const lastReload = Number(sessionStorage.getItem("chunkReloadAt"));

    if (Date.now() - lastReload < 60_000) {
      return;
    }

    sessionStorage.setItem("chunkReloadAt", String(Date.now()));
  } catch {
    // Without storage there's no loop guard, so don't risk the reload.
    return;
  }

  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>,
);