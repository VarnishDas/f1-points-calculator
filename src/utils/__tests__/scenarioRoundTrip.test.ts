import { describe, expect, it } from "vitest";

import type { Driver } from "../../types/driver";
import type { Race } from "../../types/race";
import {
  SCENARIO_HASH_KEY,
  encodeBase64Url,
  encodeScenario,
  encodeScenarioHash,
} from "../encodeScenario";
import {
  decodeScenarioFromHash,
  decodeScenarioFromString,
  type DecodeContext,
} from "../decodeScenario";

const DRIVERS: Driver[] = Array.from({ length: 22 }, (_, index) => {
  const id = `driver-${String(index + 1).padStart(2, "0")}`;
  return {
    id,
    number: index + 1,
    code: id.slice(-3).toUpperCase(),
    firstName: id,
    lastName: id,
    teamId: index % 2 === 0 ? "team-a" : "team-b",
    country: "X",
  };
});
const DRIVER_IDS = DRIVERS.map((driver) => driver.id);

/**
 * Deterministic PRNG (mulberry32) so generated scenarios are varied but the
 * test suite never flakes.
 */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffledDriverIds(rand: () => number): string[] {
  const ids = [...DRIVER_IDS];
  for (let index = ids.length - 1; index > 0; index--) {
    const swapWith = Math.floor(rand() * (index + 1));
    [ids[index], ids[swapWith]] = [ids[swapWith], ids[index]];
  }
  return ids;
}

function generatePrediction(rand: () => number, forceNonEmpty: boolean): string[] | null {
  if (!forceNonEmpty && rand() < 0.3) return null;

  const ids = shuffledDriverIds(rand);
  const prediction: string[] = [];
  let cursor = 0;
  for (let position = 0; position < DRIVER_IDS.length; position++) {
    if (rand() < 0.55) {
      prediction[position] = ids[cursor++];
    }
  }

  if (prediction.length > 0) return prediction;
  return forceNonEmpty ? [ids[0]] : null;
}

/**
 * Build a mixed calendar. The first race is always upcoming with a forced
 * prediction so every generated scenario carries at least one encodable
 * entry; all other attributes are randomized by the seeded PRNG.
 */
function generateRaces(seed: number): Race[] {
  const rand = mulberry32(seed);
  const raceCount = 2 + (seed % 5);
  const races: Race[] = [];

  for (let index = 0; index < raceCount; index++) {
    const id = `race-${index + 1}`;
    const base = {
      id,
      round: index + 1,
      name: id,
      circuit: "Circuit",
      date: "2026-01-01",
    };

    if (index > 0 && rand() < 0.35) {
      const hasSprint = rand() < 0.4;
      races.push({
        ...base,
        status: "completed",
        hasSprint,
        grandPrixResult: [{ position: 1, driverId: "driver-01", teamId: "team-a" }],
        sprintResult: hasSprint
          ? [{ position: 1, driverId: "driver-02", teamId: "team-b", points: 8 }]
          : null,
        prediction: null,
        sprintPrediction: null,
      });
      continue;
    }

    const forcePrediction = index === 0;
    const hasSprint = rand() < 0.4;
    races.push({
      ...base,
      status: "upcoming",
      hasSprint,
      grandPrixResult: null,
      sprintResult: null,
      prediction: generatePrediction(rand, forcePrediction),
      sprintPrediction: hasSprint ? generatePrediction(rand, false) : null,
    });
  }

  return races;
}

function contextFor(races: Race[]): DecodeContext {
  return { races, drivers: DRIVERS };
}

describe("scenario encode/decode round trips", () => {
  const seeds = Array.from({ length: 20 }, (_, index) => index + 1);

  it.each(seeds)("round-trips generated scenario seed %i", (seed) => {
    const races = generateRaces(seed);
    const context = contextFor(races);
    const scenario = encodeScenario(races);

    const decoded = decodeScenarioFromString(
      encodeBase64Url(JSON.stringify(scenario)),
      context,
    );
    expect(decoded).toEqual(scenario);

    const decodedFromHash = decodeScenarioFromHash(encodeScenarioHash(races), context);
    expect(decodedFromHash).toEqual(scenario);
  });

  it("round-trips a complete Grand Prix grid", () => {
    const races: Race[] = [
      {
        id: "race-1",
        round: 1,
        name: "race-1",
        circuit: "Circuit",
        date: "2026-01-01",
        status: "upcoming",
        grandPrixResult: null,
        sprintResult: null,
        prediction: [...DRIVER_IDS],
        sprintPrediction: null,
      },
    ];
    const scenario = encodeScenario(races);

    const decoded = decodeScenarioFromString(
      encodeBase64Url(JSON.stringify(scenario)),
      contextFor(races),
    );

    expect(decoded).toEqual(scenario);
    expect(decoded?.predictions["race-1"]).toHaveLength(DRIVER_IDS.length);
  });

  it("round-trips a complete sprint grid alongside a partial Grand Prix grid", () => {
    const races: Race[] = [
      {
        id: "race-1",
        round: 1,
        name: "race-1",
        circuit: "Circuit",
        date: "2026-01-01",
        status: "upcoming",
        hasSprint: true,
        grandPrixResult: null,
        sprintResult: null,
        prediction: DRIVER_IDS.slice(0, 10),
        sprintPrediction: DRIVER_IDS.slice(0, 8),
      },
    ];
    const scenario = encodeScenario(races);

    const decoded = decodeScenarioFromHash(encodeScenarioHash(races), contextFor(races));

    expect(decoded).toEqual(scenario);
    expect(decoded?.sprintPredictions["race-1"]).toHaveLength(8);
  });

  it("round-trips sparse predictions with gaps in both sessions", () => {
    const prediction: string[] = [];
    prediction[0] = "driver-03";
    prediction[21] = "driver-07";
    const sprintPrediction: string[] = [];
    sprintPrediction[4] = "driver-11";
    const races: Race[] = [
      {
        id: "race-1",
        round: 1,
        name: "race-1",
        circuit: "Circuit",
        date: "2026-01-01",
        status: "upcoming",
        hasSprint: true,
        grandPrixResult: null,
        sprintResult: null,
        prediction,
        sprintPrediction,
      },
    ];
    const scenario = encodeScenario(races);

    const decoded = decodeScenarioFromHash(encodeScenarioHash(races), contextFor(races));

    expect(decoded).toEqual(scenario);
    expect(decoded?.predictions["race-1"]).toEqual([
      { p: 1, d: "driver-03" },
      { p: 22, d: "driver-07" },
    ]);
    expect(decoded?.sprintPredictions["race-1"]).toEqual([{ p: 5, d: "driver-11" }]);
  });

  it("encodes an empty scenario as an empty hash that decodes to null", () => {
    const races: Race[] = [
      {
        id: "race-1",
        round: 1,
        name: "race-1",
        circuit: "Circuit",
        date: "2026-01-01",
        status: "upcoming",
        grandPrixResult: null,
        sprintResult: null,
        prediction: null,
        sprintPrediction: null,
      },
    ];

    const hash = encodeScenarioHash(races);

    expect(hash).toBe("");
    expect(decodeScenarioFromHash(hash, contextFor(races))).toBeNull();
  });

  it("drops predictions that fall outside the decodable classification range", () => {
    const prediction: string[] = [];
    prediction[24] = "driver-01";
    const races: Race[] = [
      {
        id: "race-1",
        round: 1,
        name: "race-1",
        circuit: "Circuit",
        date: "2026-01-01",
        status: "upcoming",
        grandPrixResult: null,
        sprintResult: null,
        prediction,
        sprintPrediction: null,
      },
    ];

    const decoded = decodeScenarioFromString(
      encodeBase64Url(JSON.stringify(encodeScenario(races))),
      contextFor(races),
    );

    expect(decoded).toBeNull();
  });
});

describe("scenario decode tamper handling", () => {
  const contextRaces: Race[] = [
    {
      id: "race-1",
      round: 1,
      name: "race-1",
      circuit: "Circuit",
      date: "2026-01-01",
      status: "upcoming",
      grandPrixResult: null,
      sprintResult: null,
      prediction: null,
      sprintPrediction: null,
    },
  ];
  const context = contextFor(contextRaces);
  const validPayload = encodeBase64Url(
    JSON.stringify({
      v: 2,
      predictions: { "race-1": [{ p: 1, d: "driver-01" }] },
      sprintPredictions: {},
    }),
  );

  it("returns null for a truncated payload", () => {
    const truncated = validPayload.slice(0, Math.floor(validPayload.length / 2));

    expect(decodeScenarioFromString(truncated, context)).toBeNull();
  });

  it.each(["null", "42", "\"text\"", "[]", "true"])(
    "returns null for non-object JSON payload %s",
    (json) => {
      expect(decodeScenarioFromString(encodeBase64Url(json), context)).toBeNull();
    },
  );

  it("returns null when every race entry is not an array", () => {
    const payload = encodeBase64Url(
      JSON.stringify({
        v: 2,
        predictions: { "race-1": { p: 1, d: "driver-01" } },
        sprintPredictions: {},
      }),
    );

    expect(decodeScenarioFromString(payload, context)).toBeNull();
  });

  it("strips unknown fields from decoded entries", () => {
    const payload = encodeBase64Url(
      JSON.stringify({
        v: 2,
        predictions: {
          "race-1": [{ p: 1, d: "driver-01", note: "tampered", extra: [1, 2] }],
        },
        sprintPredictions: {},
      }),
    );

    const decoded = decodeScenarioFromString(payload, context);

    expect(decoded?.predictions["race-1"]).toEqual([{ p: 1, d: "driver-01" }]);
  });

  it("drops entries with empty or non-string driver ids", () => {
    const payload = encodeBase64Url(
      JSON.stringify({
        v: 2,
        predictions: {
          "race-1": [
            { p: 1, d: "" },
            { p: 2, d: 7 },
            { p: 3, d: "driver-02" },
          ],
        },
        sprintPredictions: {},
      }),
    );

    const decoded = decodeScenarioFromString(payload, context);

    expect(decoded?.predictions["race-1"]).toEqual([{ p: 3, d: "driver-02" }]);
  });

  it("drops entries with non-numeric positions", () => {
    const payload = encodeBase64Url(
      JSON.stringify({
        v: 2,
        predictions: {
          "race-1": [
            { p: "1", d: "driver-01" },
            { p: null, d: "driver-02" },
            { p: 2, d: "driver-03" },
          ],
        },
        sprintPredictions: {},
      }),
    );

    const decoded = decodeScenarioFromString(payload, context);

    expect(decoded?.predictions["race-1"]).toEqual([{ p: 2, d: "driver-03" }]);
  });

  it("decodes the scenario key when other hash params are present", () => {
    const hash = `#other=1&${SCENARIO_HASH_KEY}=${validPayload}&x=2`;

    const decoded = decodeScenarioFromHash(hash, context);

    expect(decoded?.predictions["race-1"]).toEqual([{ p: 1, d: "driver-01" }]);
  });

  it("returns null for an empty scenario key value", () => {
    expect(decodeScenarioFromHash(`#${SCENARIO_HASH_KEY}=`, context)).toBeNull();
  });

  it("uses the first scenario value when the key is duplicated", () => {
    const otherPayload = encodeBase64Url(
      JSON.stringify({
        v: 2,
        predictions: { "race-1": [{ p: 2, d: "driver-02" }] },
        sprintPredictions: {},
      }),
    );
    const hash = `#${SCENARIO_HASH_KEY}=${validPayload}&${SCENARIO_HASH_KEY}=${otherPayload}`;

    const decoded = decodeScenarioFromHash(hash, context);

    expect(decoded?.predictions["race-1"]).toEqual([{ p: 1, d: "driver-01" }]);
  });
});
