import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Atalhos globais inspirados em GitHub/Linear: prefixo "g" + destino, "/" pra busca, "?" pra ajuda.
// Ignora quando foco está em input/textarea/contenteditable.
export function useKeyboardShortcuts(onOpenSearch?: () => void, onShowHelp?: () => void): void {
  const navigate = useNavigate();

  useEffect(() => {
    let prefixGPressed = false;
    let prefixTimer: ReturnType<typeof setTimeout> | null = null;

    const resetPrefix = () => {
      prefixGPressed = false;
      if (prefixTimer) clearTimeout(prefixTimer);
      prefixTimer = null;
    };

    const isEditable = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName.toLowerCase();
      return (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        el.isContentEditable ||
        el.getAttribute("role") === "combobox"
      );
    };

    const handler = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "k" || e.key === "K") {
          e.preventDefault();
          onOpenSearch?.();
        }
        return;
      }

      // Alt + N → nova prescrição
      if (e.altKey && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        navigate("/prescricoes?new=1");
        return;
      }

      // "/" → abre busca global
      if (e.key === "/") {
        e.preventDefault();
        onOpenSearch?.();
        return;
      }

      // "?" → ajuda
      if (e.key === "?") {
        e.preventDefault();
        onShowHelp?.();
        return;
      }

      // Prefixo "g"
      if (e.key === "g" || e.key === "G") {
        prefixGPressed = true;
        if (prefixTimer) clearTimeout(prefixTimer);
        prefixTimer = setTimeout(resetPrefix, 1200);
        return;
      }

      if (prefixGPressed) {
        const key = e.key.toLowerCase();
        const routes: Record<string, string> = {
          d: "/dispensacao",
          p: "/pacientes",
          m: "/medicamentos",
          r: "/prescricoes",
          e: "/estoque",
          a: "/alertas",
          h: "/",
          l: "/relatorios",
          s: "/seguranca",
          c: "/cssrs",
          b: "/bmpo",
        };
        if (routes[key]) {
          e.preventDefault();
          navigate(routes[key]);
        }
        resetPrefix();
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (prefixTimer) clearTimeout(prefixTimer);
    };
  }, [navigate, onOpenSearch, onShowHelp]);
}

export const SHORTCUT_HELP: Array<{ keys: string; desc: string }> = [
  { keys: "G D", desc: "Ir para Dispensação" },
  { keys: "G P", desc: "Ir para Pacientes" },
  { keys: "G M", desc: "Ir para Medicamentos" },
  { keys: "G R", desc: "Ir para Prescrições" },
  { keys: "G E", desc: "Ir para Estoque" },
  { keys: "G A", desc: "Ir para Alertas" },
  { keys: "G C", desc: "Ir para C-SSRS" },
  { keys: "G B", desc: "Ir para BMPO" },
  { keys: "G L", desc: "Ir para Relatórios" },
  { keys: "G H", desc: "Ir para Dashboard (Home)" },
  { keys: "Alt+N", desc: "Nova prescrição" },
  { keys: "/", desc: "Busca global" },
  { keys: "⌘/Ctrl + K", desc: "Busca global" },
  { keys: "?", desc: "Mostrar esta ajuda" },
];
