import type { Driver } from "../types/driver";
import type { Race } from "../types/race";
import { RACE_CLASSIFICATION_SIZE } from "../constants/race";

import {
  SCENARIO_HASH_KEY,
  SCENARIO_VERSION,
  decodeBase64Url,
  type EncodedScenarioV1,
  type ScenarioPredictionEntry,
  type ScenarioPredictions,
} from "./encodeScenario";

/**
 * Context required to validate a decoded scenario against the current app
 * data. The decoder ignores race ids, driver ids, and completed races that
 * are not represented here so stale or tampered URLs never corrupt the store.
 */
export interface DecodeContext {
  races: readonly Race[];
  drivers: readonly Driver[];
}

/**
 * A successfully decoded, fully validated scenario that is safe to apply to
 * the store. `predictions` only references upcoming races and driver ids that
 * exist in the supplied {@link DecodeContext}.
 */
export type DecodedScenario = EncodedScenarioV1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isEntry(value: unknown): value is ScenarioPredictionEntry {
  if (!isRecord(value)) return false;
  const position = value.p;
  const driverId = value.d;
  return (
    typeof position === "number" &&
    Number.isInteger(position) &&
    typeof driverId === "string" &&
    driverId.length > 0
  );
}

/**
 * Validate the parsed JSON structure and filter it against the current app
 * data. Returns `null` for any unsupported version, malformed shape, or when
 * nothing usable remains after filtering. Never throws.
 */
function validateScenario(data: unknown, context: DecodeContext): DecodedScenario | null {
  if (!isRecord(data)) return null;
  if (data.v !== SCENARIO_VERSION) return null;

  const rawPredictions = data.predictions;
  if (!isRecord(rawPredictions)) return null;

  const upcomingRaceIds = new Set(
    context.races.filter((race) => race.status === "upcoming").map((race) => race.id),
  );
  const driverIds = new Set(context.drivers.map((driver) => driver.id));

  const predictions: ScenarioPredictions = {};

  for (const [raceId, rawEntries] of Object.entries(rawPredictions)) {
    if (!upcomingRaceIds.has(raceId)) continue;
    if (!Array.isArray(rawEntries)) continue;

    const seenDrivers = new Set<string>();
    const entries: ScenarioPredictionEntry[] = [];

    for (const raw of rawEntries) {
      if (!isEntry(raw)) continue;
      if (raw.p < 1 || raw.p > RACE_CLASSIFICATION_SIZE) continue;
      if (!driverIds.has(raw.d)) continue;
      if (seenDrivers.has(raw.d)) continue;

      seenDrivers.add(raw.d);
      entries.push({ p: raw.p, d: raw.d });
    }

    if (entries.length > 0) {
      predictions[raceId] = entries;
    }
  }

  if (Object.keys(predictions).length === 0) return null;

  return { v: SCENARIO_VERSION, predictions };
}

/**
 * Decode a scenario from a URL-safe Base64 string. Returns `null` when the
 * input is malformed, uses an unsupported version, or resolves to no usable
 * predictions after validation. Never throws.
 */
export function decodeScenarioFromString(
  encoded: string,
  context: DecodeContext,
): DecodedScenario | null {
  if (!encoded) return null;

  let json: string;
  try {
    json = decodeBase64Url(encoded);
  } catch {
    return null;
  }

  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }

  return validateScenario(data, context);
}

/**
 * Parse a hash fragment (e.g. `window.location.hash`, with or without the
 * leading `#`) and decode the scenario it carries. Only the
 * {@link SCENARIO_HASH_KEY} key is honoured; any other hash format is ignored
 * and returns `null`.
 */
export function decodeScenarioFromHash(
  hash: string,
  context: DecodeContext,
): DecodedScenario | null {
  if (!hash) return null;

  const stripped = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!stripped) return null;

  const params = new URLSearchParams(stripped);
  const encoded = params.get(SCENARIO_HASH_KEY);
  if (!encoded) return null;

  return decodeScenarioFromString(encoded, context);
}
