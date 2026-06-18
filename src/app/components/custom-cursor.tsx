import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

/**
 * Sleek circular cursor that rides above everything with mix-blend-difference,
 * so it inverts whatever it overlaps. Grows and shows a label when hovering
 * elements tagged with [data-cursor].
 */
export function CustomCursor() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 500, damping: 40, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 500, damping: 40, mass: 0.4 });

  const [hovering, setHovering] = useState(false);
  const [label, setLabel] = useState("");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    setEnabled(true);

    const move = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const el = (e.target as HTMLElement)?.closest("[data-cursor]") as HTMLElement | null;
      if (el) {
        setHovering(true);
        setLabel(el.dataset.cursor || "");
      } else {
        setHovering(false);
        setLabel("");
      }
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [x, y]);

  if (!enabled) return null;

  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-[100] flex items-center justify-center rounded-full"
      style={{
        x: sx,
        y: sy,
        translateX: "-50%",
        translateY: "-50%",
        mixBlendMode: "difference",
        backgroundColor: "#ffffff",
      }}
      animate={{
        width: hovering ? 88 : 18,
        height: hovering ? 88 : 18,
      }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
    >
      {label && (
        <span className="font-mono uppercase tracking-[0.18em] text-black" style={{ fontSize: 10 }}>
          {label}
        </span>
      )}
    </motion.div>
  );
}
