import { useRef, useState, useEffect, type ReactNode } from "react";
import { motion, useMotionValue, useTransform, useMotionTemplate, useSpring } from "motion/react";
import { useDeviceOrientation } from "../hooks/use-device-orientation";

interface MagneticPinProps {
  href: string;
  label: string;
  icon: ReactNode;
  /** rotation in degrees for a scattered, hung-from-a-thread feel */
  tilt?: number;
  className?: string;
  x?: string | number;
  y?: string | number;
}

/**
 * A tiny micro-retro physical "dial" that magnetically pulls toward the cursor
 * when hovered. Matte metal finish with an inset bezel ring — no glossy spheres.
 */
export function MagneticPin({ href, label, icon, tilt = 0, className = "", x: initialX, y: initialY }: MagneticPinProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Gyro offset coordinates
  const { orientation } = useDeviceOrientation();
  const gyroX = useSpring(0, { stiffness: 100, damping: 30 });
  const gyroY = useSpring(0, { stiffness: 100, damping: 30 });
  
  useEffect(() => {
    const normalizedGamma = Math.max(-45, Math.min(45, orientation.gamma || 0));
    const normalizedBeta = Math.max(-45, Math.min(45, orientation.beta || 0));
    gyroX.set((normalizedGamma / 45) * 15);
    gyroY.set((normalizedBeta / 45) * 15);
  }, [orientation.gamma, orientation.beta, gyroX, gyroY]);

  const [active, setActive] = useState(false);

  const shadowDX = useMotionValue(0);
  const shadowDY = useMotionValue(6); // Default static shadow Y
  const shadowBlur = useMotionValue(14); // Default static blur

  useEffect(() => {
    if (!ref.current) return;
    
    let centerXPage = 0;
    let centerYPage = 0;
    
    const updateRect = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        centerXPage = rect.left + window.scrollX + rect.width / 2;
        centerYPage = rect.top + window.scrollY + rect.height / 2;
      }
    };
    
    updateRect();
    window.addEventListener("resize", updateRect, { passive: true });
    
    // We only update rect when images load or font loads to be safe
    document.fonts.ready.then(updateRect);

    const handleMove = (e: MouseEvent | TouchEvent) => {
      let pageX, pageY;
      if ('touches' in e) {
        if (e.touches.length > 0) {
          pageX = e.touches[0].pageX;
          pageY = e.touches[0].pageY;
        } else {
          return;
        }
      } else {
        pageX = (e as MouseEvent).pageX;
        pageY = (e as MouseEvent).pageY;
      }

      const dx = centerXPage - pageX;
      const dy = centerYPage - pageY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      const maxLightDist = 800; 
      const factor = Math.min(dist / maxLightDist, 1);
      const easedFactor = 1 - Math.pow(1 - factor, 2);
      
      shadowDX.set((dx / (dist || 1)) * easedFactor * 30);
      shadowDY.set((dy / (dist || 1)) * easedFactor * 30);
      shadowBlur.set(10 + easedFactor * 25);
    };
    
    window.addEventListener("mousemove", handleMove, { passive: true });
    window.addEventListener("touchmove", handleMove, { passive: true });
    window.addEventListener("touchstart", handleMove, { passive: true });
    
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchstart", handleMove);
      window.removeEventListener("resize", updateRect);
    };
  }, []);

  const dynamicBoxShadow = useMotionTemplate`inset 0 1px 1px rgba(255,255,255,0.7), inset 0 -2px 4px rgba(0,0,0,0.28), ${shadowDX}px ${shadowDY}px ${shadowBlur}px rgba(0,0,0,0.35)`;

  // Combine drag x/y with gyro offset for rendering
  const renderX = useTransform([x, gyroX], ([bx, gx]) => (bx as number) + (gx as number));
  const renderY = useTransform([y, gyroY], ([by, gy]) => (by as number) + (gy as number));

  const anchorX = useTransform(renderX, (v) => 29 - v);
  const anchorY = useTransform(renderY, (v) => -28 - v);

  const isTouchDevice = typeof window !== 'undefined' && window.matchMedia("(pointer: coarse)").matches;

  return (
    <div className="absolute" style={{ left: initialX, top: initialY, pointerEvents: "auto" }}>
      <motion.a
        ref={ref}
        href={href}
        target="_blank"
        rel="noreferrer"
        data-cursor={label}
        aria-label={label}
        onMouseEnter={() => setActive(true)}
        onMouseLeave={() => setActive(false)}
        drag
        draggable={false}
        dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
        dragElastic={0.6}
        dragTransition={{ bounceStiffness: 400, bounceDamping: 10 }}
        style={{ 
          x, 
          y, 
          WebkitTouchCallout: "none", 
          WebkitUserSelect: "none", 
          userSelect: "none",
          touchAction: "none"
        }} // Used for drag physics only
        className={`group relative inline-flex h-[58px] w-[58px] items-center justify-center rounded-full ${className}`}
      >
        <motion.div style={{ x: gyroX, y: gyroY }} className="absolute inset-0 pointer-events-none">
          {/* Elastic string / hook line */}
          <svg className="absolute inset-0 z-0 overflow-visible">
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
        </motion.div>

        {/* the matte metal dial */}
        <motion.span
          animate={{ scale: active ? 1.12 : 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
          className="relative z-10 flex h-full w-full items-center justify-center rounded-full"
          style={{
            x: gyroX,
            y: gyroY,
            rotate: tilt,
            background: "radial-gradient(120% 120% at 32% 28%, var(--pin-grad-1) 0%, var(--pin-grad-2) 45%, var(--pin-grad-3) 100%)",
            boxShadow: dynamicBoxShadow,
          }}
        >
          {/* knurled bezel ring */}
          <span
            className="absolute inset-[3px] rounded-full"
            style={{
              background:
                "repeating-conic-gradient(from 0deg, var(--pin-bezel) 0deg 4deg, transparent 4deg 8deg)",
              WebkitMaskImage:
                "radial-gradient(transparent 64%, #000 65%, #000 78%, transparent 79%)",
              maskImage:
                "radial-gradient(transparent 64%, #000 65%, #000 78%, transparent 79%)",
            }}
          />
          <span className="relative z-10 text-foreground transition-transform duration-300 group-hover:scale-110">
            {icon}
          </span>
        </motion.span>
      </motion.a>
    </div>
  );
}
