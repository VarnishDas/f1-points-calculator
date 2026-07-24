import type { Race } from "../types/race";
import { encodeScenario, encodeScenarioHash } from "./encodeScenario";

export type ShareStatus =
  | "idle"
  | "empty"
  | "copied"
  | "shared"
  | "cancelled"
  | "failed";

export type ShareResult = {
  status: Exclude<ShareStatus, "idle">;
  url?: string;
  predictionCount: number;
  raceCount: number;
};

export type ShareScenarioOptions = {
  /** Absolute origin, e.g. `https://example.com`. Defaults to `window.location.origin`. */
  origin?: string;
  pathname?: string;
  search?: string;
  /** Override for tests / non-browser environments. */
  clipboardWrite?: (text: string) => Promise<boolean>;
  /** Override for tests. When omitted, uses `navigator.share` when available. */
  nativeShare?: (data: ShareData) => Promise<void>;
  /** When true, skip native share and always copy. */
  preferClipboard?: boolean;
};

/**
 * Count how many discrete predicted placements (GP + Sprint) are in the
 * scenario. Used for empty-state checks and share messaging.
 */
export function countScenarioPredictions(races: readonly Race[]): {
  predictionCount: number;
  raceCount: number;
} {
  const scenario = encodeScenario(races);
  const raceIds = new Set([
    ...Object.keys(scenario.predictions),
    ...Object.keys(scenario.sprintPredictions),
  ]);
  let predictionCount = 0;
  for (const entries of Object.values(scenario.predictions)) {
    predictionCount += entries.length;
  }
  for (const entries of Object.values(scenario.sprintPredictions)) {
    predictionCount += entries.length;
  }
  return { predictionCount, raceCount: raceIds.size };
}

/**
 * Build an absolute share URL for the current scenario, or `null` when there
 * are no predictions to encode.
 */
export function buildShareUrl(
  races: readonly Race[],
  options: Pick<ShareScenarioOptions, "origin" | "pathname" | "search"> = {},
): string | null {
  const hash = encodeScenarioHash(races);
  if (!hash) return null;

  const origin =
    options.origin ??
    (typeof window !== "undefined" ? window.location.origin : "");
  const pathname =
    options.pathname ??
    (typeof window !== "undefined" ? window.location.pathname : "/");
  const search =
    options.search ??
    (typeof window !== "undefined" ? window.location.search : "");

  return `${origin}${pathname}${search}${hash}`;
}

function defaultClipboardWrite(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    return navigator.clipboard
      .writeText(text)
      .then(() => true)
      .catch(() => copyToClipboardFallback(text));
  }
  return Promise.resolve(copyToClipboardFallback(text));
}

export function copyToClipboardFallback(text: string): boolean {
  if (typeof document === "undefined") return false;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  let copied: boolean;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  document.body.removeChild(textarea);
  return copied;
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name: string }).name === "AbortError"
  );
}

/**
 * Share the current prediction scenario.
 *
 * - Empty scenarios return `{ status: "empty" }` without writing the clipboard.
 * - Prefers the Web Share API when available (mobile / supported browsers).
 * - Falls back to clipboard copy with a textarea fallback for older browsers.
 * - Syncs `window.location` hash to the shared scenario when in a browser.
 */
export async function shareScenario(
  races: readonly Race[],
  options: ShareScenarioOptions = {},
): Promise<ShareResult> {
  const counts = countScenarioPredictions(races);
  if (counts.predictionCount === 0) {
    return { status: "empty", predictionCount: 0, raceCount: 0 };
  }

  const url = buildShareUrl(races, options);
  if (!url) {
    return { status: "empty", predictionCount: 0, raceCount: 0 };
  }

  if (typeof window !== "undefined") {
    const hash = encodeScenarioHash(races);
    const next = window.location.pathname + window.location.search + hash;
    if (next !== window.location.pathname + window.location.search + window.location.hash) {
      window.history.replaceState(null, "", next);
    }
  }

  const title = "F1 Points Calculator scenario";
  const text =
    counts.raceCount === 1
      ? `My F1 prediction for ${counts.predictionCount} finishing position${counts.predictionCount === 1 ? "" : "s"}`
      : `My F1 predictions across ${counts.raceCount} races (${counts.predictionCount} placements)`;

  const canNativeShare =
    !options.preferClipboard &&
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function";

  if (canNativeShare || options.nativeShare) {
    const share = options.nativeShare ?? ((data: ShareData) => navigator.share(data));
    try {
      await share({ title, text, url });
      return { status: "shared", url, ...counts };
    } catch (error) {
      if (isAbortError(error)) {
        return { status: "cancelled", url, ...counts };
      }
      // Fall through to clipboard if native share fails for other reasons.
    }
  }

  const write = options.clipboardWrite ?? defaultClipboardWrite;
  const copied = await write(url);
  return {
    status: copied ? "copied" : "failed",
    url,
    ...counts,
  };
}

export function shareStatusMessage(result: ShareResult): string {
  switch (result.status) {
    case "empty":
      return "Add a prediction before sharing.";
    case "copied":
      return result.raceCount === 1
        ? "Prediction link copied."
        : `Link copied · ${result.raceCount} races.`;
    case "shared":
      return "Scenario shared.";
    case "cancelled":
      return "Share cancelled.";
    case "failed":
      return "Could not copy the scenario link.";
  }
}
