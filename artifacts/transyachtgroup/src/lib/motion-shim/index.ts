import type { motion as MotionNS, AnimatePresence as AnimatePresenceType, MotionConfig as MotionConfigType } from "framer-motion";

interface MotionExports {
  motion: unknown;
  AnimatePresence: unknown;
  MotionConfig: unknown;
}

declare global {
  interface Window {
    __MOTION__?: MotionExports;
  }
}

const m = (typeof window !== "undefined" && window.__MOTION__) as MotionExports;

if (!m) {
  throw new Error(
    "motion-shim: window.__MOTION__ not initialized — main.tsx must load mobile/desktop module before App",
  );
}

export const motion = m.motion as typeof MotionNS;
export const AnimatePresence = m.AnimatePresence as typeof AnimatePresenceType;
export const MotionConfig = m.MotionConfig as typeof MotionConfigType;
