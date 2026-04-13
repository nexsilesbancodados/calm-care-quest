import { useState } from "react";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import { ShortcutsHelp } from "@/components/ShortcutsHelp";

// Dispara um evento custom que CommandPalette escuta para abrir (já implementado lá).
function openCommandPalette() {
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
}

export function GlobalHotkeys() {
  const [helpOpen, setHelpOpen] = useState(false);
  useKeyboardShortcuts(openCommandPalette, () => setHelpOpen(true));
  return <ShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />;
}
