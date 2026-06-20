import { useScrambleText } from '../hooks/use-scramble-text';

interface ScrambledTextProps {
  text: string;
  durationMs?: number;
  delayMs?: number;
  className?: string;
}

export function ScrambledText({ text, durationMs = 1200, delayMs = 0, className = "" }: ScrambledTextProps) {
  const { displayText, isDone } = useScrambleText(text, durationMs, delayMs);
  console.log("ScrambledText render", text, displayText);

  return (
    <span className={`grid ${className}`}>
      <span 
        className={`col-start-1 row-start-1 font-mono transition-all duration-500 ease-out ${isDone ? 'opacity-0 blur-sm scale-105' : 'opacity-100 blur-0 scale-100'}`}
      >
        {displayText}
      </span>
      <span 
        className={`col-start-1 row-start-1 font-serif transition-all duration-500 ease-out ${isDone ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-md scale-95'}`}
      >
        {text}
      </span>
    </span>
  );
}
