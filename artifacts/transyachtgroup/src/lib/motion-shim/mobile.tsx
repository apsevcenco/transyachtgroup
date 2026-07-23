import { forwardRef, type ReactNode } from "react";

const MOTION_PROPS = new Set([
  "initial",
  "animate",
  "exit",
  "transition",
  "variants",
  "whileInView",
  "whileHover",
  "whileTap",
  "whileFocus",
  "whileDrag",
  "viewport",
  "layout",
  "layoutId",
  "layoutDependency",
  "drag",
  "dragConstraints",
  "dragElastic",
  "dragMomentum",
  "dragSnapToOrigin",
  "onAnimationStart",
  "onAnimationComplete",
  "onUpdate",
  "onHoverStart",
  "onHoverEnd",
  "onTap",
  "onTapStart",
  "onTapCancel",
  "onDragStart",
  "onDragEnd",
  "onDrag",
  "onViewportEnter",
  "onViewportLeave",
  "custom",
  "transformTemplate",
  "inherit",
]);

function stripMotionProps(props: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const k in props) {
    if (!MOTION_PROPS.has(k)) out[k] = props[k];
  }
  return out;
}

const cache = new Map<string, ReturnType<typeof forwardRef>>();

function makeTag(tag: string) {
  const cached = cache.get(tag);
  if (cached) return cached;
  const Comp = forwardRef<HTMLElement, Record<string, unknown>>((props, ref) => {
    const Tag = tag as unknown as React.ElementType;
    return <Tag ref={ref} {...stripMotionProps(props)} />;
  });
  (Comp as { displayName?: string }).displayName = `m.${tag}`;
  cache.set(tag, Comp);
  return Comp;
}

export const motion = new Proxy({} as Record<string, unknown>, {
  get: (_target, prop) => {
    if (typeof prop !== "string") return undefined;
    return makeTag(prop);
  },
});

export const AnimatePresence = ({ children }: { children?: ReactNode }) => <>{children}</>;
export const MotionConfig = ({ children }: { children?: ReactNode }) => <>{children}</>;
