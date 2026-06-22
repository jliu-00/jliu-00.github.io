import { motion } from "motion/react";

interface BlurRevealTextProps {
  text: string;
  durationMs?: number;
  delayMs?: number;
  className?: string;
}

export function BlurRevealText({ text, durationMs = 3000, delayMs = 0, className = "" }: BlurRevealTextProps) {
  return (
    <motion.span
      className={className}
      initial={{ 
        opacity: 0, 
        y: 15,
        scale: 0.98,
        letterSpacing: "0.05em",
        filter: "blur(12px)",
        // 核心改动：由于纯黑/纯白文字对 sepia 等滤镜不敏感，
        // 这里改用“色差（Chromatic Aberration）”来模拟老旧镜头或老旧放映机的失焦感。
        // 红蓝边缘分离，在失焦时产生极强的复古光学感。
        textShadow: "15px 5px 20px rgba(255, 0, 0, 0.6), -15px -5px 20px rgba(0, 255, 255, 0.6)"
      }}
      animate={{ 
        opacity: 1, 
        y: 0,
        scale: 1,
        letterSpacing: "inherit",
        filter: "blur(0px)",
        // 对焦完成后，红蓝色散完美收拢，变成清晰的文字
        textShadow: "0px 0px 0px rgba(255, 0, 0, 0), 0px 0px 0px rgba(0, 255, 255, 0)"
      }}
      transition={{
        duration: durationMs / 1000,
        delay: delayMs / 1000,
        ease: [0.16, 1, 0.3, 1], // easeOutExpo
      }}
      style={{ display: "block", willChange: "transform, opacity, filter" }}
    >
      {text}
    </motion.span>
  );
}
