import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Guard: only register SW outside iframe/preview
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((regs) =>
    regs.forEach((r) => r.unregister())
  );
} else {
  registerSW({ immediate: true });
}

createRoot(document.getElementById("root")!).render(<App />);

// Remove splash screen after React mounts
const splash = document.getElementById("splash");
if (splash) {
  splash.style.transition = "opacity 0.3s ease";
  splash.style.opacity = "0";
  setTimeout(() => splash.remove(), 300);
}
