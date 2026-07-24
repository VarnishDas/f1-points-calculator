/**
 * Minimal dependency-free JSON fetching with retry, exponential backoff, and a
 * per-request timeout. `fetchImpl` and `sleep` are injectable for testing.
 */

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export type FetchJsonOptions = {
  fetchImpl?: FetchLike;
  sleep?: (ms: number) => Promise<void>;
  maxAttempts?: number;
  baseDelayMs?: number;
  backoffFactor?: number;
  timeoutMs?: number;
};

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 500;
const DEFAULT_BACKOFF_FACTOR = 2;
const DEFAULT_TIMEOUT_MS = 15_000;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function retryAfterMs(response: Response): number | undefined {
  const header = response.headers.get("retry-after");
  if (header === null) return undefined;
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export async function fetchJson(url: string, options: FetchJsonOptions = {}): Promise<unknown> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleepImpl = options.sleep ?? sleep;
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const backoffFactor = options.backoffFactor ?? DEFAULT_BACKOFF_FACTOR;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const backoffMs = (attempt: number) => baseDelayMs * backoffFactor ** (attempt - 1);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let response: Response;
    try {
      response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
    } catch (error) {
      if (attempt < maxAttempts) {
        await sleepImpl(backoffMs(attempt));
        continue;
      }
      throw new Error(
        `Fetch failed after ${maxAttempts} attempts: ${url} (${errorMessage(error)})`,
        { cause: error },
      );
    }

    if (response.ok) {
      return (await response.json()) as unknown;
    }

    if (attempt < maxAttempts && isRetryableStatus(response.status)) {
      await sleepImpl(retryAfterMs(response) ?? backoffMs(attempt));
      continue;
    }

    throw new Error(`Fetch failed ${response.status} ${response.statusText}: ${url}`);
  }

  throw new Error(`Fetch failed after ${maxAttempts} attempts: ${url}`);
}
