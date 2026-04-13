// Inicialização de Sentry com sanitização de PII antes do envio.
import * as Sentry from "@sentry/react";
import { sanitizeForLog } from "@/lib/security/pii";

let enabled = false;

export function initObservability(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  try {
    Sentry.init({
      dsn,
      environment: import.meta.env.VITE_APP_ENV ?? "production",
      tracesSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      replaysSessionSampleRate: 0,
      beforeSend(event) {
        return sanitizeForLog(event) as typeof event;
      },
      beforeBreadcrumb(crumb) {
        if (crumb.data) crumb.data = sanitizeForLog(crumb.data);
        return crumb;
      },
    });
    enabled = true;
  } catch {
    // nunca deixa observabilidade derrubar o app
  }
}

export function reportError(err: unknown, context?: Record<string, unknown>): void {
  if (enabled) {
    Sentry.captureException(err, { extra: sanitizeForLog(context ?? {}) });
  } else if (import.meta.env.DEV) {
    console.error("[reportError]", err, context);
  }
}

export function identifyUser(userId: string | null): void {
  if (!enabled) return;
  Sentry.setUser(userId ? { id: userId } : null);
}
