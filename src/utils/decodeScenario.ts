import type { Driver } from "../types/driver";
import type { Race } from "../types/race";
import { getClassificationSize } from "./classification";

import {
  SCENARIO_HASH_KEY,
  SCENARIO_VERSION,
  decodeBase64Url,
  type EncodedScenarioV2,
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
export type DecodedScenario = EncodedScenarioV2;

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

interface ValidationContext {
  upcomingRaceIds: Set<string>;
  sprintRaceIds: Set<string>;
  driverIds: Set<string>;
  classificationSize: number;
}

function buildValidationContext(context: DecodeContext): ValidationContext {
  return {
    upcomingRaceIds: new Set(
      context.races.filter((race) => race.status === "upcoming").map((race) => race.id),
    ),
    sprintRaceIds: new Set(
      context.races.filter((race) => race.hasSprint).map((race) => race.id),
    ),
    driverIds: new Set(context.drivers.map((driver) => driver.id)),
    classificationSize: getClassificationSize(context.races),
  };
}

function validateSessionPredictions(
  raw: unknown,
  validation: ValidationContext,
  allowSprint: boolean,
): ScenarioPredictions | null {
  if (!isRecord(raw)) return null;

  const predictions: ScenarioPredictions = {};

  for (const [raceId, rawEntries] of Object.entries(raw)) {
    if (!validation.upcomingRaceIds.has(raceId)) continue;
    if (allowSprint && !validation.sprintRaceIds.has(raceId)) continue;
    if (!Array.isArray(rawEntries)) continue;

    const seenDrivers = new Set<string>();
    const entries: ScenarioPredictionEntry[] = [];

    for (const rawEntry of rawEntries) {
      if (!isEntry(rawEntry)) continue;
      if (rawEntry.p < 1 || rawEntry.p > validation.classificationSize) continue;
      if (!validation.driverIds.has(rawEntry.d)) continue;
      if (seenDrivers.has(rawEntry.d)) continue;

      seenDrivers.add(rawEntry.d);
      entries.push({ p: rawEntry.p, d: rawEntry.d });
    }

    if (entries.length > 0) {
      predictions[raceId] = entries;
    }
  }

  return predictions;
}

/**
 * Validate the parsed JSON structure and filter it against the current app
 * data. Returns `null` for any unsupported version, malformed shape, or when
 * nothing usable remains after filtering. Never throws.
 *
 * Version 1 payloads (GP-only) are normalized to the v2 shape so downstream
 * consumers can always work with a single interface.
 */
function validateScenario(data: unknown, context: DecodeContext): DecodedScenario | null {
  if (!isRecord(data)) return null;
  const version = data.v;
  if (version !== 1 && version !== SCENARIO_VERSION) return null;

  const validation = buildValidationContext(context);

  let predictions: ScenarioPredictions = {};
  let sprintPredictions: ScenarioPredictions = {};

  if (version === 1) {
    const normalized = validateSessionPredictions(data.predictions, validation, false);
    if (normalized) predictions = normalized;
  } else {
    const gp = validateSessionPredictions(data.predictions, validation, false);
    if (gp) predictions = gp;

    const sprint = validateSessionPredictions(data.sprintPredictions, validation, true);
    if (sprint) sprintPredictions = sprint;
  }

  if (
    Object.keys(predictions).length === 0 &&
    Object.keys(sprintPredictions).length === 0
  ) {
    return null;
  }

  return { v: SCENARIO_VERSION, predictions, sprintPredictions };
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
