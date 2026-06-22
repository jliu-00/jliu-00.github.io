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
        // 核心改动：用老式放映机的光学滤镜替代 SVG 噪点
        // blur + 高对比度 + 泛黄(sepia) 会产生一种“胶片烧录”或“老镜头失焦”的质感
        filter: "blur(16px) sepia(100%) contrast(300%) saturate(200%) brightness(70%)"
      }}
      animate={{ 
        opacity: 1, 
        y: 0,
        scale: 1,
        letterSpacing: "inherit",
        filter: "blur(0px) sepia(0%) contrast(100%) saturate(100%) brightness(100%)"
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
