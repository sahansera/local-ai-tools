import { setTimeout as delay } from "node:timers/promises";

interface FetchOptions {
  fetcher?: typeof fetch;
  timeoutMs?: number;
  attempts?: number;
  backoffMs?: number;
  sleep?: (ms: number) => Promise<unknown>;
}

// Bound the entire request, including body consumption, not just response headers.
export async function fetchJson(
  url: string | URL,
  init: RequestInit = {},
  {
    fetcher = fetch,
    timeoutMs = 15_000,
    attempts = 3,
    backoffMs = 500,
    sleep = delay,
  }: FetchOptions = {},
): Promise<unknown> {
  if (
    !Number.isInteger(attempts) ||
    attempts < 1 ||
    attempts > 5 ||
    timeoutMs <= 0
  ) {
    throw new Error("Invalid request bounds");
  }
  for (let attempt = 0; attempt < attempts; attempt++) {
    let retryable = true;
    let retryAfter = 0;
    try {
      const response = await fetcher(url, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) {
        retryable = response.status === 429 || response.status >= 500;
        const value = response.headers.get("retry-after");
        if (value) {
          const seconds = Number(value);
          retryAfter = Number.isFinite(seconds)
            ? seconds * 1000
            : Date.parse(value) - Date.now();
        }
        await response.body?.cancel();
        throw new Error(
          `Registry request failed (${response.status}) for ${url}`,
        );
      }
      // Invalid JSON is a data failure, not a reason to hammer the upstream.
      retryable = false;
      return await response.json();
    } catch (error) {
      // A timed-out body is transient too.
      const timedOut =
        error instanceof Error && /TimeoutError|AbortError/.test(error.name);
      if ((!retryable && !timedOut) || attempt === attempts - 1) throw error;
      await sleep(
        Math.min(10_000, Math.max(0, retryAfter || backoffMs * 2 ** attempt)),
      );
    }
  }
  throw new Error("Request attempts exhausted");
}
