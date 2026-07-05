import type { Race } from "../types/race";

/**
 * Hash key used to carry the encoded scenario in `window.location.hash`.
 * Kept short to minimize URL length. The decoder only parses this key and
 * safely ignores any other hash format.
 */
export const SCENARIO_HASH_KEY = "s";

/**
 * Versioned scenario payload. Bumping `v` lets future URL formats be
 * migrated safely while older links can still be rejected predictably.
 */
export const SCENARIO_VERSION = 2;

/**
 * A single predicted finishing placement for one race.
 * `p` is the 1-indexed finishing position (1..RACE_CLASSIFICATION_SIZE).
 * `d` is the driver id placed at that position.
 */
export interface ScenarioPredictionEntry {
  p: number;
  d: string;
}

/**
 * Predictions grouped by race id. Only upcoming races with at least one
 * placed driver are included. Empty cells are represented by the absence of
 * an entry for that position, so non-sequential placements (e.g. a driver in
 * P5 while P1-P4 are empty) round-trip correctly.
 */
export type ScenarioPredictions = Record<string, ScenarioPredictionEntry[]>;

/**
 * Predictions grouped by session. `predictions` holds Grand Prix predictions
 * and `sprintPredictions` holds Sprint predictions. Both use the same sparse
 * entry format.
 */
export interface ScenarioPredictionsBySession {
  predictions: ScenarioPredictions;
  sprintPredictions: ScenarioPredictions;
}

export interface EncodedScenarioV2 extends ScenarioPredictionsBySession {
  v: typeof SCENARIO_VERSION;
}

/**
 * Build the minimal versioned scenario object for the given races.
 *
 * Only upcoming races with a non-null prediction contribute. Completed races
 * are never encoded (their results are static app data). Empty cells in a
 * prediction (sparse array holes) are skipped, but the remaining entries
 * keep their explicit position so gaps are preserved on decode.
 *
 * The output is deterministic: the same prediction state always produces the
 * same object (races iterated in array order, positions in ascending order).
 */
export function encodeScenario(races: readonly Race[]): EncodedScenarioV2 {
  const predictions: ScenarioPredictions = {};
  const sprintPredictions: ScenarioPredictions = {};

  for (const race of races) {
    if (race.status !== "upcoming") continue;

    if (race.prediction) {
      const entries = encodePredictionEntries(race.prediction);
      if (entries.length > 0) predictions[race.id] = entries;
    }

    if (race.hasSprint && race.sprintPrediction) {
      const entries = encodePredictionEntries(race.sprintPrediction);
      if (entries.length > 0) sprintPredictions[race.id] = entries;
    }
  }

  return { v: SCENARIO_VERSION, predictions, sprintPredictions };
}

function encodePredictionEntries(prediction: readonly string[]): ScenarioPredictionEntry[] {
  const entries: ScenarioPredictionEntry[] = [];
  for (let index = 0; index < prediction.length; index++) {
    const driverId = prediction[index];
    if (!driverId) continue;
    entries.push({ p: index + 1, d: driverId });
  }
  return entries;
}

/**
 * Encode a string to URL-safe Base64 (RFC 4648 §5, padding stripped).
 * Uses TextEncoder so arbitrary UTF-8 content is handled safely.
 */
export function encodeBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Decode a URL-safe Base64 string back to a UTF-8 string.
 * Throws on malformed input; callers must handle the error.
 */
export function decodeBase64Url(input: string): string {
  const padLength = input.length % 4 === 0 ? 0 : 4 - (input.length % 4);
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padLength);
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Serialize the scenario to the hash fragment value (without the leading `#`).
 * Returns an empty string when there are no predictions so callers can clear
 * the hash entirely.
 */
export function encodeScenarioHashValue(races: readonly Race[]): string {
  const scenario = encodeScenario(races);
  const hasPredictions =
    Object.keys(scenario.predictions).length > 0 ||
    Object.keys(scenario.sprintPredictions).length > 0;
  if (!hasPredictions) return "";
  const json = JSON.stringify(scenario);
  return `${SCENARIO_HASH_KEY}=${encodeBase64Url(json)}`;
}

/**
 * Serialize the scenario to a full hash fragment suitable for
 * `window.location.hash` (including the leading `#`), or an empty string when
 * there is nothing to encode.
 */
export function encodeScenarioHash(races: readonly Race[]): string {
  const value = encodeScenarioHashValue(races);
  return value ? `#${value}` : "";
}
