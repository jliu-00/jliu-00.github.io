import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Github, Linkedin, Instagram, Moon, Sun, ArrowDown } from "lucide-react";
import { CustomCursor } from "./components/custom-cursor";
import { MagneticPin } from "./components/magnetic-pin";
import { XiaohongshuIcon } from "./components/icons";
import { TintWordCTA } from "./components/tintword-cta";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";

const HERO_IMG = "/IG.jpg";

export default function App() {
  const [dark, setDark] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Global Spotlight Tracker
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    };
    
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const { scrollYProgress } = useScroll();
  // parallax depths for the floating layers
  const baseImgY = useTransform(scrollYProgress, [0, 1], [0, -180]);
  const overlayImgY = useTransform(scrollYProgress, [0, 1], [0, -380]);
  const titleY = useTransform(scrollYProgress, [0, 1], [0, 180]);
  const accentY = useTransform(scrollYProgress, [0, 0.6], [0, -160]);

  return (
    <div
      ref={ref}
      className="relative min-h-screen w-full overflow-x-hidden bg-background text-foreground"
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
          onClick={() => setDark((d) => !d)}
          aria-label="Toggle theme"
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-foreground/25 transition-colors hover:bg-foreground hover:text-background"
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

        {/* Editorial Overlapping Collage */}
        <div className="absolute right-[0%] top-[10%] z-0 w-[90vw] h-[60vh] md:right-[5%] md:top-[12%] md:w-[55vw] max-w-[640px] md:h-[80vh] pointer-events-none">
          
          {/* Base Layer: Portrait Photo (Profie.jpg) */}
          <motion.div
            style={{ y: baseImgY, zIndex: 1 }}
            whileHover={{ scale: 1.03, rotate: 3 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="absolute right-[5%] top-0 w-[65%] md:right-0 md:w-[50%] pointer-events-auto cursor-pointer origin-bottom-right"
          >
            <div className="group relative aspect-[3/4] overflow-hidden rounded-[2rem] bg-muted shadow-2xl shadow-black/10 transition-shadow duration-500 hover:shadow-[0_30px_60px_rgba(0,0,0,0.2)]">
              <ImageWithFallback
                src="/Profie.jpg"
                alt="Skyward Bound"
                className="h-full w-full object-cover grayscale-[0.15] contrast-[1.05] transition-transform duration-700 group-hover:scale-110"
              />
              {/* Dark mode intelligent dimmer */}
              <div className="pointer-events-none absolute inset-0 z-10 bg-black/0 transition-colors duration-700 dark:bg-black/30 dark:group-hover:bg-black/0" />
            </div>
          </motion.div>

          {/* Overlay Layer: Landscape Photo (IG.jpg) */}
          <motion.div
            style={{ y: overlayImgY, zIndex: 2 }}
            whileHover={{ scale: 1.03, rotate: -2, zIndex: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="absolute bottom-[5%] left-[5%] w-[85%] md:bottom-[15%] md:left-[-30%] md:w-[85%] pointer-events-auto cursor-pointer origin-bottom-left"
          >
            <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl border-[6px] border-background bg-muted shadow-[0_20px_40px_rgba(0,0,0,0.2)] transition-shadow duration-500 hover:shadow-[0_30px_60px_rgba(0,0,0,0.3)]">
              <ImageWithFallback
                src="/IG.jpg"
                alt="Editorial Portrait"
                className="h-full w-full object-cover grayscale-[0.05] contrast-[1.1] transition-transform duration-700 group-hover:scale-110"
              />
              {/* Dark mode intelligent dimmer */}
              <div className="pointer-events-none absolute inset-0 z-10 bg-black/0 transition-colors duration-700 dark:bg-black/30 dark:group-hover:bg-black/0" />
            </div>
          </motion.div>

        </div>

        {/* Kinetic Orbital Toy (Self-floating, interactive geometry) */}
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
          className="absolute left-[8%] top-[10%] md:left-[12%] md:top-[15%] z-50"
        >
          <motion.div
            drag
            dragConstraints={ref}
            dragElastic={0.2}
            dragTransition={{ bounceStiffness: 400, bounceDamping: 30, power: 0.2 }}
            whileHover={{ scale: 1.3 }}
            whileDrag={{ scale: 0.9, cursor: "grabbing" }}
            className="flex h-24 w-24 cursor-grab items-center justify-center md:h-32 md:w-32"
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
            <span className="block">Jiahong</span>
            <span className="block italic md:ml-[14%]">Liu</span>
          </h1>
        </motion.div>

        {/* scattered social pins (not boxed) */}
        <div className="absolute left-[5%] top-[68%] z-30 md:left-[8%] md:top-[58%]">
          <MagneticPin href="https://github.com/jliu-00" label="GitHub" icon={<Github size={18} />} tilt={-8} />
        </div>
        <div className="absolute left-[20%] top-[82%] z-30 md:left-[24%] md:top-[74%]">
          <MagneticPin href="https://www.linkedin.com/in/jiahong-liu-27a456174/" label="LinkedIn" icon={<Linkedin size={18} />} tilt={6} />
        </div>
        <div className="absolute right-[25%] top-[78%] z-30 md:right-[18%] md:top-[64%]">
          <MagneticPin href="https://www.instagram.com/j.liu429/" label="Instagram" icon={<Instagram size={18} />} tilt={-5} />
        </div>
        <div className="absolute right-[5%] top-[86%] z-30 md:right-[5%] md:top-[80%]">
          <MagneticPin href="https://xhslink.com/m/HRcSCfqVjo" label="小红书" icon={<XiaohongshuIcon size={18} />} tilt={10} />
        </div>

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

      {/* ================= TINTWORD CTA ================= */}
      <TintWordCTA />

      {/* ================= FOOTER ================= */}
      <footer className="mx-auto w-full max-w-[1400px] px-6 pb-16 pt-[10vh] md:px-16">
        <div className="flex flex-col gap-8 border-t border-border pt-8 md:flex-row md:items-end md:justify-between">
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            data-cursor="Connect"
            className="font-serif tracking-[-0.02em] transition-colors hover:text-accent"
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
