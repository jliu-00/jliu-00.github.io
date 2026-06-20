import { motion, AnimatePresence } from 'motion/react';
import { useDeviceOrientation } from '../hooks/use-device-orientation';

interface SplashScreenProps {
  onEnter: () => void;
}

export function SplashScreen({ onEnter }: SplashScreenProps) {
  const { requestPermission } = useDeviceOrientation();

  const handleEnter = async () => {
    // Request gyro permission on iOS 13+
    await requestPermission();
    // Then close splash
    onEnter();
  };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(10px)" }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background text-foreground"
    >
      <motion.button
        onClick={handleEnter}
        whileHover={{ scale: 1.05, letterSpacing: "0.2em" }}
        whileTap={{ scale: 0.95 }}
        className="group relative flex flex-col items-center text-center font-mono uppercase tracking-[0.1em] transition-all"
      >
        <span className="mb-4 text-xs text-foreground/50">SYSTEM INITIALIZATION</span>
        <span className="text-2xl font-light">TAP TO EXPLORE</span>
        <div className="absolute -bottom-4 h-[1px] w-0 bg-accent transition-all duration-500 group-hover:w-full" />
      </motion.button>
    </motion.div>
  );
}
