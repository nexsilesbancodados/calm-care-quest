import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "auto";

interface ThemeContextType {
  theme: Theme;
  resolved: "light" | "dark";
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "auto", resolved: "light", toggleTheme: () => {}, setTheme: () => {},
});

function resolveAuto(): "light" | "dark" {
  const h = new Date().getHours();
  // 19h–7h → dark (plantão noturno)
  return h >= 19 || h < 7 ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem("psifarma-theme") as Theme | null;
    return stored ?? "auto";
  });
  const [resolved, setResolved] = useState<"light" | "dark">(
    theme === "auto" ? resolveAuto() : theme,
  );

  useEffect(() => {
    const tick = () => {
      const r = theme === "auto" ? resolveAuto() : theme;
      setResolved(r);
      document.documentElement.classList.toggle("dark", r === "dark");
    };
    tick();
    localStorage.setItem("psifarma-theme", theme);
    if (theme !== "auto") return;
    const id = setInterval(tick, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggleTheme = useCallback(
    () => setThemeState((t) => (t === "dark" ? "light" : "dark")),
    [],
  );

  return (
    <ThemeContext.Provider value={{ theme, resolved, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
