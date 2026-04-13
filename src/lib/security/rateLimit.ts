// Rate limit client-side (defesa em profundidade — o servidor é a fonte da verdade).
// Útil para conter loops acidentais de chamadas e reduzir custo de Supabase.

type Bucket = { tokens: number; lastRefill: number };
const buckets = new Map<string, Bucket>();

export function consumeToken(key: string, maxPerMinute = 60): boolean {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: maxPerMinute, lastRefill: now };
  const elapsed = (now - b.lastRefill) / 60_000;
  const refilled = Math.min(maxPerMinute, b.tokens + elapsed * maxPerMinute);
  if (refilled < 1) {
    buckets.set(key, { tokens: refilled, lastRefill: now });
    return false;
  }
  buckets.set(key, { tokens: refilled - 1, lastRefill: now });
  return true;
}

export function resetRateLimit(key?: string): void {
  if (key) buckets.delete(key);
  else buckets.clear();
}
