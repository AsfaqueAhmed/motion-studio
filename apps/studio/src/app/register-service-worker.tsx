"use client";

import { useEffect } from "react";

/** Registers the offline app-shell cache (`public/sw.js`) once the page has loaded. */
export function RegisterServiceWorker(): null {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.error("RegisterServiceWorker: registration failed", error);
    });
  }, []);

  return null;
}
