import { useEffect } from "react";

/**
 * Aplica dark mode automaticamente entre eveningHour e morningHour (hora local).
 * Respeita override manual do usuário — se ele mudou o tema explicitamente, não interfere.
 * Default: 19h–7h (plantão noturno).
 */
export function useAutoDarkMode({
  eveningHour = 19,
  morningHour = 7,
  storageKey = "theme-manual-override",
}: { eveningHour?: number; morningHour?: number; storageKey?: string } = {}) {
  useEffect(() => {
    const manual = localStorage.getItem(storageKey);
    if (manual === "1") return; // usuário escolheu um tema explicitamente

    const apply = () => {
      const h = new Date().getHours();
      const isNight = h >= eveningHour || h < morningHour;
      document.documentElement.classList.toggle("dark", isNight);
    };

    apply();
    const id = setInterval(apply, 5 * 60 * 1000); // re-checa a cada 5 min
    return () => clearInterval(id);
  }, [eveningHour, morningHour, storageKey]);
}
