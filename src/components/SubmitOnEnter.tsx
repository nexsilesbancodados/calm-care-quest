import { useEffect, type ReactNode, useRef } from "react";

/**
 * Wrapper que dispara submit no form mais próximo ao pressionar ⌘/Ctrl + Enter
 * em qualquer textarea/input dentro. Não interfere em Enter comum (textarea).
 */
export function SubmitOnEnter({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        const form = (e.target as HTMLElement)?.closest("form");
        if (form) {
          e.preventDefault();
          // Prefere clicar em botão de submit (dispara onClick, não só submit do form)
          const btn = form.querySelector<HTMLButtonElement>(
            'button[type="submit"], button:not([type])',
          );
          if (btn && !btn.disabled) btn.click();
          else form.requestSubmit();
        }
      }
    };

    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, []);

  return <div ref={ref}>{children}</div>;
}
