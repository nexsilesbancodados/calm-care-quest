import { useCallback, useEffect, useState } from "react";

/**
 * useState que persiste em localStorage por chave estável.
 * Ideal para filtros, preferências de densidade, aba ativa etc.
 */
export function usePersistedState<T>(
  key: string,
  initial: T,
): [T, (v: T | ((prev: T) => T)) => void, () => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage cheio/bloqueado — não quebra o app
    }
  }, [key, value]);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // noop
    }
    setValue(initial);
  }, [key, initial]);

  return [value, setValue, reset];
}
