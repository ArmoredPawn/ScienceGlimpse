/// <reference types="vite/client" />

// Loaded by the gtag.js snippet in index.html, so it exists at runtime but
// has no type of its own. Optional because the snippet may be blocked.
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export {};
