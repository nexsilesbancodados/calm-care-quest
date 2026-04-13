import { useEffect, useRef, useState } from "react";

/**
 * Detecta inatividade do usuário e dispara callback quando o timer expira.
 * Reinicia em mousemove, keydown, touchstart, click e scroll.
 * Default 5 minutos — adequado a estação clínica em ambiente compartilhado.
 */
export function useIdleLock(
  onIdle: () => void,
  timeoutMs = 5 * 60 * 1000,
): { isLocked: boolean; reset: () => void } {
  const [isLocked, setIsLocked] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsLocked(true);
        onIdle();
      }, timeoutMs);
    };

    const events: Array<keyof WindowEventMap> = [
      "mousemove", "keydown", "touchstart", "click", "scroll",
    ];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onIdle, timeoutMs]);

  return {
    isLocked,
    reset: () => {
      setIsLocked(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    },
  };
}
