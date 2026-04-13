import { toast } from "sonner";

export interface UndoableActionOptions {
  /** Tempo (ms) antes do commit efetivo. Default 5000. */
  delayMs?: number;
  /** Mensagem mostrada no toast. */
  message: string;
  /** Label do botão de undo. Default "Desfazer". */
  undoLabel?: string;
  /** Função que realiza o commit (insert/update). */
  commit: () => Promise<void> | void;
  /** Callback chamado quando usuário cancela antes do commit. */
  onUndo?: () => void;
}

/**
 * Exibe um toast com botão "Desfazer" — só executa `commit()` se o usuário
 * não clicar em desfazer dentro de `delayMs`. Útil para dispensação e writes
 * sensíveis que raramente são revertidos mas às vezes são feitos por erro.
 */
export function toastWithUndo(opts: UndoableActionOptions): void {
  const delay = opts.delayMs ?? 5000;
  let cancelled = false;

  const timer = setTimeout(async () => {
    if (cancelled) return;
    try {
      await opts.commit();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao concluir ação");
    }
  }, delay);

  toast(opts.message, {
    duration: delay,
    action: {
      label: opts.undoLabel ?? "Desfazer",
      onClick: () => {
        cancelled = true;
        clearTimeout(timer);
        opts.onUndo?.();
        toast.info("Ação desfeita");
      },
    },
  });
}
