import { useEffect, useRef, useState, useCallback, Suspense, lazy } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { CustomCursor } from "./components/custom-cursor";
import { Github, Linkedin, Instagram, Moon, Sun, ArrowDown } from "lucide-react";
import { MagneticPin } from "./components/magnetic-pin";
import { BlurRevealText } from "./components/blur-reveal-text";
import { XiaohongshuIcon } from "./components/icons";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";

const CareerTimeline = lazy(() => import("./components/career-timeline").then(m => ({ default: m.CareerTimeline })));
const TintWordCTA = lazy(() => import("./components/tintword-cta").then(m => ({ default: m.TintWordCTA })));
const ParticleScene = lazy(() => import("./components/particle-scene").then(m => ({ default: m.ParticleScene })));

const DelayedMount = ({ children, delay }: { children: React.ReactNode, delay: number }) => {
  const [shouldMount, setShouldMount] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShouldMount(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  return shouldMount ? <>{children}</> : null;
};

const HERO_IMG = "/airplane.webp";
export default function App() {
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('theme');
      if (stored === 'dark') return true;
      if (stored === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!window.localStorage.getItem('theme')) {
        setDark(e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleDark = (e: React.MouseEvent) => {
    const isDark = !dark;
    window.localStorage.setItem("theme", isDark ? "dark" : "light");
    
    if (!document.startViewTransition) {
      setDark(isDark);
      return;
    }

    // Eclipse (to dark) starts at the icon. Sunrise (to light) starts at bottom center.
    const originX = isDark ? e.clientX : window.innerWidth / 2;
    const originY = isDark ? e.clientY : window.innerHeight;
    const endRadius = Math.hypot(
      Math.max(originX, innerWidth - originX),
      Math.max(originY, innerHeight - originY)
    );

    const transition = document.startViewTransition(() => {
      setDark(isDark);
      // documentElement class is updated in useEffect, but doing it here guarantees it is within the snapshot
      document.documentElement.classList.toggle("dark", isDark);
    });

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${originX}px ${originY}px)`,
        `circle(${endRadius}px at ${originX}px ${originY}px)`
      ];
      
      document.documentElement.animate(
        {
          clipPath: clipPath,
        },
        {
          duration: 1000,
          easing: isDark ? "ease-in" : "ease-out",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    });
  };

  // Global Spotlight Tracker
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      let clientX, clientY;
      if ('touches' in e) {
        if (e.touches.length > 0) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
        } else {
          return;
        }
      } else {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }
      document.documentElement.style.setProperty('--mouse-x', `${clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${clientY}px`);
    };
    
    window.addEventListener("mousemove", handleMove, { passive: true });
    window.addEventListener("touchmove", handleMove, { passive: true });
    window.addEventListener("touchstart", handleMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchstart", handleMove);
    };
  }, []);

  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>(
    typeof window !== 'undefined' 
      ? (window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop')
      : 'desktop'
  );
  useEffect(() => {
    const checkDevice = () => {
      if (window.innerWidth < 768) setDeviceType('mobile');
      else if (window.innerWidth < 1024) setDeviceType('tablet');
      else setDeviceType('desktop');
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  const baseContainerRef = useRef<HTMLDivElement>(null);
  const overlayContainerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll();

  const [isCanvasVisible, setIsCanvasVisible] = useState(true);
  const [isCanvasFrozen, setIsCanvasFrozen] = useState(false);
  const settledCount = useRef(0);
  const totalParticleImages = 2; // Portrait + Landscape
  
  const handleParticleSettled = useCallback(() => {
    settledCount.current += 1;
    if (settledCount.current >= totalParticleImages) {
      setIsCanvasVisible(false);
      setTimeout(() => setIsCanvasFrozen(true), 500);
      settledCount.current = 0;
    }
  }, []);
  
  useEffect(() => {
    const handleScroll = () => {
      setIsCanvasVisible(true);
      setIsCanvasFrozen(false);
      settledCount.current = 0;
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Use isCanvasVisible to control the crossfade between the solid <img> and the <Canvas>
  const isBaseShattering = isCanvasVisible;
  const isOverlayShattering = isCanvasVisible;
  
  // parallax depths for the floating layers
  // Images move downwards (positive Y) to counter scroll and stay on screen longer
  const baseImgY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const overlayImgY = useTransform(scrollYProgress, [0, 1], [0, 350]);
  const titleY = useTransform(scrollYProgress, [0, 1], [0, 240]);
  const accentY = useTransform(scrollYProgress, [0, 0.6], [0, -160]);
  const buttonsY = useTransform(scrollYProgress, [0, 1], [0, 300]);

  return (
    <div
      ref={ref}
      className="relative flex min-h-screen w-full flex-col overflow-hidden bg-background text-foreground transition-colors duration-1000 ease-in-out"
      style={{ cursor: "none" }}
    >
      <CustomCursor />

      {/* ---- fixed chrome ---- */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-6 md:px-12">
        <span className="pointer-events-auto font-mono uppercase tracking-[0.3em]" style={{ fontSize: 12 }}>
          J.Liu&nbsp;©&nbsp;’26
        </span>
        <button
          data-cursor={dark ? "Light" : "Dark"}
          onClick={toggleDark}
          aria-label="Toggle theme"
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-foreground/25 transition-colors hover:bg-foreground hover:text-background active:scale-90"
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </header>

      {/* ================= HERO ================= */}
      <section className="relative min-h-screen w-full">
        {/* faint connecting vector lines / motion paths */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          <motion.line
            x1="12%" y1="68%" x2="64%" y2="34%"
            stroke="currentColor" strokeWidth="1" strokeDasharray="2 6"
            className="text-foreground/25"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 1.6, delay: 0.6 }}
          />
          <motion.line
            x1="20%" y1="84%" x2="48%" y2="60%"
            stroke="currentColor" strokeWidth="1" strokeDasharray="2 6"
            className="text-foreground/20"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 1.6, delay: 0.9 }}
          />
        </svg>

        {/* Single hero-level canvas for all particle effects */}
        <div className={`fixed inset-0 z-[3] pointer-events-none transition-opacity duration-300 ease-in-out ${isCanvasVisible ? 'opacity-100' : 'opacity-0'}`}>
          <DelayedMount delay={100}>
            <Suspense fallback={null}>
              <ParticleScene
                deviceType={deviceType}
                scrollYProgress={scrollYProgress}
                handleParticleSettled={handleParticleSettled}
                baseContainerRef={baseContainerRef}
                overlayContainerRef={overlayContainerRef}
                heroImg={HERO_IMG}
                isCanvasVisible={isCanvasVisible}
                isCanvasFrozen={isCanvasFrozen}
              />
            </Suspense>
          </DelayedMount>
        </div>

        {/* Editorial Overlapping Collage */}
        <div className="absolute right-[0%] top-[10%] z-0 w-[90vw] h-[60vh] md:right-[5%] md:top-[12%] md:w-[55vw] max-w-[640px] md:h-[80vh] pointer-events-none">
          
          {/* Base Layer: Portrait Photo */}
          <motion.div
            style={{ y: baseImgY, zIndex: 1 }}
            whileHover={{ scale: 1.05, rotate: 2, zIndex: 20 }}
            whileTap={{ scale: 0.95, rotate: 0, zIndex: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="absolute right-[5%] top-0 w-[65%] md:right-0 md:w-[50%] pointer-events-auto cursor-pointer origin-bottom-right"
          >
            <div
              ref={baseContainerRef}
              className={`group relative aspect-[3/4] overflow-visible rounded-[2rem] transition-all duration-500 ${isBaseShattering ? 'bg-transparent shadow-none' : 'bg-muted shadow-2xl shadow-black/10 hover:shadow-[0_30px_60px_rgba(0,0,0,0.2)]'}`}
            >
              <ImageWithFallback
                src={HERO_IMG}
                alt="Jiahong Liu"
                className={`absolute inset-0 h-full w-full object-cover rounded-[2rem] transition-opacity duration-300 ease-in-out ${isBaseShattering ? 'opacity-0' : 'opacity-100'}`}
              />
              {/* Dark mode intelligent dimmer */}
              <div className={`pointer-events-none absolute inset-0 z-10 rounded-[2rem] bg-black/0 transition-all duration-300 dark:group-hover:bg-black/0 ${isBaseShattering ? 'opacity-0' : 'dark:bg-black/30 opacity-100'}`} />
            </div>
          </motion.div>

          {/* Overlay Layer: Landscape Photo */}
          <motion.div
            style={{ y: overlayImgY, zIndex: 2 }}
            whileHover={{ scale: 1.03, rotate: -2, zIndex: 20 }}
            whileTap={{ scale: 0.95, rotate: 0, zIndex: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="absolute bottom-[5%] left-[5%] w-[85%] md:bottom-[15%] md:left-[-30%] md:w-[85%] pointer-events-auto cursor-pointer origin-bottom-left"
          >
            <div
              ref={overlayContainerRef}
              className={`group relative aspect-[4/3] overflow-visible rounded-[2rem] transition-all duration-500 ${isOverlayShattering ? 'bg-transparent shadow-none' : 'bg-muted shadow-2xl shadow-black/10 hover:shadow-[0_30px_60px_rgba(0,0,0,0.2)]'}`}
            >
              <ImageWithFallback 
                src="/bridge.webp"
                alt="Static Port"
                className={`absolute inset-0 h-full w-full object-cover rounded-[2rem] transition-opacity duration-300 ease-in-out ${isOverlayShattering ? 'opacity-0' : 'opacity-100'}`}
              />
              {/* Dark mode intelligent dimmer */}
              <div className={`pointer-events-none absolute inset-0 z-10 rounded-[2rem] bg-black/0 transition-all duration-300 dark:group-hover:bg-black/0 ${isOverlayShattering ? 'opacity-0' : 'dark:bg-black/30 opacity-100'}`} />
            </div>
          </motion.div>

        </div>

        {/* Kinetic Orbital Toy (Self-floating, interactive geometry) */}
        <motion.div
          drag
          dragConstraints={ref}
          dragElastic={0.2}
          dragTransition={{ bounceStiffness: 400, bounceDamping: 30, power: 0.2 }}
          whileHover={{ scale: 1.3 }}
          whileDrag={{ scale: 0.9, cursor: "grabbing" }}
          className="absolute left-[8%] top-[10%] md:left-[12%] md:top-[15%] z-50 flex h-24 w-24 cursor-grab items-center justify-center md:h-32 md:w-32"
        >
          <motion.div
            animate={{
              y: [0, -30, 15, 0],
              x: [0, 20, -10, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="relative flex h-full w-full items-center justify-center"
          >
            {/* Solid Core */}
            <div className="h-3 w-3 rounded-full bg-foreground shadow-[0_0_15px_rgba(255,255,255,0.3)]" />

            {/* Fast Inner Orbit */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              className="absolute inset-4 rounded-full border border-foreground/30"
            >
              <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-accent shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
            </motion.div>

            {/* Slower Outer Orbit (Counter-clockwise) */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border border-foreground/20"
            >
              <div className="absolute top-1/2 -right-1 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-foreground shadow-[0_0_10px_rgba(255,255,255,0.3)]" />
            </motion.div>
            
            {/* Outermost Dashed Orbit */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-4 rounded-full border border-foreground/10 border-dashed"
            >
               <div className="absolute bottom-2 left-2 h-1.5 w-1.5 rounded-full bg-foreground/50 shadow-[0_0_5px_rgba(255,255,255,0.2)]" />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* massive editorial name — left-anchored, clear of the right-edge image */}
        <motion.div style={{ y: titleY }} className="pointer-events-none relative z-20 px-6 pt-[25vh] md:px-12 md:pt-[30vh]">
          <h1
            className="font-serif leading-[0.84] tracking-[-0.03em]"
            style={{ fontSize: "clamp(3.4rem, 13vw, 12rem)", fontWeight: 300 }}
          >
            <BlurRevealText text="Jiahong" className="block" delayMs={100} durationMs={3000} />
            <BlurRevealText text="Liu" className="block italic md:ml-[14%]" delayMs={400} durationMs={3000} />
          </h1>
        </motion.div>

        {/* scattered social pins (not boxed) - moving slower than background to stay on screen longer */}
        <motion.div style={{ y: buttonsY }} className="absolute left-[2%] top-[72%] z-30 md:left-[6%] md:top-[64%]">
          <MagneticPin href="https://github.com/jliu-00" label="GitHub" icon={<Github size={18} />} tilt={-8} />
        </motion.div>
        <motion.div style={{ y: buttonsY }} className="absolute left-[20%] top-[82%] z-30 md:left-[30%] md:top-[74%]">
          <MagneticPin href="https://www.linkedin.com/in/jiahong-liu-27a456174/" label="LinkedIn" icon={<Linkedin size={18} />} tilt={6} />
        </motion.div>
        <motion.div style={{ y: buttonsY }} className="absolute right-[33%] top-[74%] z-30 md:right-[28%] md:top-[78%]">
          <MagneticPin href="https://www.instagram.com/j.liu429/" label="Instagram" icon={<Instagram size={18} />} tilt={-5} />
        </motion.div>
        <motion.div style={{ y: buttonsY }} className="absolute right-[26%] top-[88%] z-30 md:right-[12%] md:top-[84%]">
          <MagneticPin href="https://xhslink.com/m/HRcSCfqVjo" label="RedNote" icon={<XiaohongshuIcon size={18} />} tilt={10} />
        </motion.div>

        {/* scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-2"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        >
          <span className="font-mono uppercase tracking-[0.25em] text-muted-foreground" style={{ fontSize: 10 }}>
            Scroll to explore
          </span>
          <ArrowDown size={16} className="text-muted-foreground" />
        </motion.div>
      </section>

      {/* ================= TIMELINE ================= */}
      <div className="pt-[15vh]">
        <Suspense fallback={<div className="w-full min-h-[100vh] md:min-h-[60vh]" />}>
          <CareerTimeline />
        </Suspense>
      </div>

      {/* ================= TINTWORD CTA ================= */}
      <Suspense fallback={<div className="w-full min-h-[50vh] md:min-h-[40vh]" />}>
        <TintWordCTA />
      </Suspense>

      {/* ================= FOOTER ================= */}
      <footer className="mx-auto w-full max-w-[1400px] px-6 pb-16 pt-[10vh] md:px-16">
        <div className="flex flex-col gap-8 border-t border-border pt-8 md:flex-row md:items-end md:justify-between">
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            data-cursor="Connect"
            onTouchStart={() => {}}
            className="font-serif tracking-[-0.02em] transition-all duration-300 hover:text-accent active:text-accent active:scale-95 origin-left inline-block"
            style={{ fontSize: "clamp(2rem, 6vw, 4.5rem)", fontWeight: 300 }}
          >
            Let's connect ↗
          </a>
          <p className="font-mono uppercase tracking-[0.2em] text-muted-foreground" style={{ fontSize: 11 }}>
            Jiahong&nbsp;Liu&nbsp;©&nbsp;2026
          </p>
        </div>
      </footer>
    </div>
  );
}
