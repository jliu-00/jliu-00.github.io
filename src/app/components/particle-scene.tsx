import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { ParticleImage } from "./particle-image";
import { MotionValue } from "motion/react";

interface ParticleSceneProps {
  deviceType: "mobile" | "tablet" | "desktop";
  scrollYProgress: MotionValue<number>;
  handleParticleSettled: () => void;
  baseContainerRef: React.RefObject<HTMLDivElement | null>;
  overlayContainerRef: React.RefObject<HTMLDivElement | null>;
  heroImg: string;
  isCanvasVisible: boolean;
}

export const ParticleScene = ({ deviceType, scrollYProgress, handleParticleSettled, baseContainerRef, overlayContainerRef, heroImg, isCanvasVisible }: ParticleSceneProps) => {
  return (
    <Canvas frameloop={isCanvasVisible ? "always" : "demand"} style={{ pointerEvents: 'none' }} dpr={deviceType === 'desktop' ? [1, 1.5] : 1} camera={{ position: [0, 0, 35], fov: 50 }} gl={{ powerPreference: "high-performance", antialias: false }}>
      <Suspense fallback={null}>
        <ParticleImage
          src={heroImg}
          width={4.2}
          height={5.6}
          containerRef={baseContainerRef}
          enableHover={false}
          density={deviceType === 'mobile' ? 50 : 100}
          onSettled={handleParticleSettled}
          scrollYProgress={scrollYProgress}
          pushVector={[1.5, -2.0]}
        />
        <ParticleImage
          src="/bridge.webp"
          width={5.6}
          height={4.2}
          containerRef={overlayContainerRef}
          enableHover={false}
          density={deviceType === 'mobile' ? 67 : 130}
          onSettled={handleParticleSettled}
          scrollYProgress={scrollYProgress}
        />
      </Suspense>
    </Canvas>
  );
};
