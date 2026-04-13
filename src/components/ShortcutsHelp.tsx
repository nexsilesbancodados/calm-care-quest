import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SHORTCUT_HELP } from "@/lib/hooks/useKeyboardShortcuts";

export function ShortcutsHelp({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Atalhos de teclado</DialogTitle>
        </DialogHeader>
        <ul className="space-y-1.5">
          {SHORTCUT_HELP.map((s) => (
            <li
              key={s.keys}
              className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
            >
              <span className="text-muted-foreground">{s.desc}</span>
              <kbd className="rounded border bg-muted px-2 py-0.5 font-mono text-xs">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
