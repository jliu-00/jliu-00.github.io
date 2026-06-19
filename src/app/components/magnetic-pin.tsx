import { useRef, useState, useEffect, type ReactNode } from "react";
import { motion, useMotionValue, useTransform, useMotionTemplate } from "motion/react";

interface MagneticPinProps {
  href: string;
  label: string;
  icon: ReactNode;
  /** rotation in degrees for a scattered, hung-from-a-thread feel */
  tilt?: number;
  className?: string;
}

/**
 * A tiny micro-retro physical "dial" that magnetically pulls toward the cursor
 * when hovered. Matte metal finish with an inset bezel ring — no glossy spheres.
 */
export function MagneticPin({ href, label, icon, tilt = 0, className = "" }: MagneticPinProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [active, setActive] = useState(false);

  const shadowDX = useMotionValue(0);
  const shadowDY = useMotionValue(6); // Default static shadow Y
  const shadowBlur = useMotionValue(14); // Default static blur

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      // Calculate true center of the element on screen
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Vector from mouse (light source) to element
      const dx = centerX - e.clientX;
      const dy = centerY - e.clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // The shadow falls opposite to the light source.
      // If distance is large, shadow is longer and blurrier.
      const maxLightDist = 800; 
      const factor = Math.min(dist / maxLightDist, 1);
      
      // Ease out the factor so it's not strictly linear
      const easedFactor = 1 - Math.pow(1 - factor, 2);
      
      shadowDX.set((dx / (dist || 1)) * easedFactor * 30);
      shadowDY.set((dy / (dist || 1)) * easedFactor * 30);
      shadowBlur.set(10 + easedFactor * 25);
    };
    
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  const dynamicBoxShadow = useMotionTemplate`inset 0 1px 1px rgba(255,255,255,0.7), inset 0 -2px 4px rgba(0,0,0,0.28), ${shadowDX}px ${shadowDY}px ${shadowBlur}px rgba(0,0,0,0.35)`;

  // The anchor point must remain visually fixed. 
  // Since the whole component moves by (x, y), the anchor's local coordinates must offset it.
  // The button is 58x58, center x is 29. The anchor was originally at y=-28.
  const anchorX = useTransform(x, (v) => 29 - v);
  const anchorY = useTransform(y, (v) => -28 - v);

  const isTouchDevice = typeof window !== 'undefined' && window.matchMedia("(pointer: coarse)").matches;

  return (
    <motion.a
      ref={ref}
      href={href}
      target="_blank"
      rel="noreferrer"
      data-cursor={label}
      aria-label={label}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      drag={!isTouchDevice}
      dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
      dragElastic={0.6}
      dragTransition={{ bounceStiffness: 400, bounceDamping: 10 }}
      style={{ x, y }}
      className={`group relative inline-flex h-[58px] w-[58px] items-center justify-center rounded-full ${className}`}
    >
      {/* Elastic string / hook line */}
      <svg className="absolute inset-0 z-0 pointer-events-none overflow-visible">
        <motion.line
          x1={anchorX}
          y1={anchorY}
          x2={29}
          y2={15}
          stroke="currentColor"
          strokeWidth="1"
          className="text-foreground/25"
        />
        <motion.circle
          cx={anchorX}
          cy={anchorY}
          r={2.5}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="text-foreground/40"
        />
      </svg>

      {/* the matte metal dial */}
      <motion.span
        animate={{ scale: active ? 1.12 : 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
        className="relative z-10 flex h-full w-full items-center justify-center rounded-full"
        style={{
          rotate: tilt,
          background: "radial-gradient(120% 120% at 32% 28%, #ECE5DC 0%, #CFC6BA 45%, #A89E90 100%)",
          boxShadow: dynamicBoxShadow,
        }}
      >
        {/* knurled bezel ring */}
        <span
          className="absolute inset-[3px] rounded-full"
          style={{
            background:
              "repeating-conic-gradient(from 0deg, rgba(45,41,38,0.16) 0deg 4deg, transparent 4deg 8deg)",
            WebkitMaskImage:
              "radial-gradient(transparent 64%, #000 65%, #000 78%, transparent 79%)",
            maskImage:
              "radial-gradient(transparent 64%, #000 65%, #000 78%, transparent 79%)",
          }}
        />
        <span className="relative z-10 text-[#2D2926] transition-transform duration-300 group-hover:scale-110">
          {icon}
        </span>
      </motion.span>
    </motion.a>
  );
}
