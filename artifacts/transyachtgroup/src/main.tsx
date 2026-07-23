import { createRoot } from "react-dom/client";
import "./index.css";

const isMobile = window.matchMedia("(max-width: 767px)").matches;

const motionLoader = isMobile
  ? import("./lib/motion-shim/mobile")
  : import("./lib/motion-shim/desktop");

motionLoader
  .then((mod) => {
    window.__MOTION__ = {
      motion: mod.motion,
      AnimatePresence: mod.AnimatePresence,
      MotionConfig: mod.MotionConfig,
    };
    return import("./App");
  })
  .then(({ default: App }) => {
    const root = document.getElementById("root")!;
    const loader = document.getElementById("initial-loader");
    if (loader) loader.remove();
    createRoot(root).render(<App />);
  })
  .catch((err) => {
    console.error("Failed to bootstrap app:", err);
    const root = document.getElementById("root");
    if (root) {
      root.innerHTML =
        '<div style="color:#fff;font-family:sans-serif;padding:24px;text-align:center;">Не удалось загрузить сайт. Обновите страницу.</div>';
    }
  });
