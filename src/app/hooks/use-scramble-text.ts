import { useState, useEffect } from 'react';

const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+{}|:<>?~';

export function useScrambleText(
  finalText: string,
  durationMs: number = 1000,
  delayMs: number = 0
) {
  const [displayText, setDisplayText] = useState(() => {
    let initialText = '';
    for (let i = 0; i < finalText.length; i++) {
      if (finalText[i] === ' ') initialText += ' ';
      else initialText += CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
    }
    console.log("INITIAL TEXT FOR", finalText, ":", initialText);
    return initialText;
  });
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;
    let timeoutId: NodeJS.Timeout;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      
      const elapsed = timestamp - startTime;
      if (elapsed < delayMs) {
        // Just keep the initial scrambled text
        animationFrame = requestAnimationFrame(animate);
        return;
      }
      
      const progress = Math.min((elapsed - delayMs) / durationMs, 1);
      
      let newText = '';
      for (let i = 0; i < finalText.length; i++) {
        if (finalText[i] === ' ') {
          newText += ' ';
          continue;
        }
        
        // As progress increases, lock in the correct characters from left to right
        if (progress > i / finalText.length) {
          newText += finalText[i];
        } else {
          // Otherwise, show a random character
          newText += CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
        }
      }
      
      setDisplayText(newText);
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setIsDone(true);
      }
    };

    // Delay the start of the requestAnimationFrame
    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
      clearTimeout(timeoutId);
    };
  }, [finalText, durationMs, delayMs]);

  return { displayText, isDone };
}
