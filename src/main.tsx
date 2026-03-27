import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Register PWA service worker
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(<App />);

// Remove splash screen after React mounts
const splash = document.getElementById("splash");
if (splash) {
  splash.style.transition = "opacity 0.3s ease";
  splash.style.opacity = "0";
  setTimeout(() => splash.remove(), 300);
}
