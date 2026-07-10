import { describe, it, expect } from "vitest";

import type { Driver } from "../../types/driver";
import type { Race } from "../../types/race";
import {
  SCENARIO_HASH_KEY,
  encodeBase64Url,
  encodeScenario,
} from "../encodeScenario";
import {
  decodeScenarioFromHash,
  decodeScenarioFromString,
  type DecodeContext,
} from "../decodeScenario";

const DRIVERS: Driver[] = [
  { id: "norris", number: 4, code: "NOR", firstName: "Lando", lastName: "Norris", teamId: "mclaren", country: "GBR" },
  { id: "piastri", number: 81, code: "PIA", firstName: "Oscar", lastName: "Piastri", teamId: "mclaren", country: "AUS" },
  { id: "verstappen", number: 1, code: "VER", firstName: "Max", lastName: "Verstappen", teamId: "red-bull", country: "NED" },
  { id: "leclerc", number: 16, code: "LEC", firstName: "Charles", lastName: "Leclerc", teamId: "ferrari", country: "MON" },
];

function makeRace(partial: Partial<Race> & Pick<Race, "id" | "status">): Race {
  return {
    round: 1,
    name: partial.id,
    circuit: "Circuit",
    date: "2026-01-01",
    grandPrixResult: null,
    sprintResult: null,
    prediction: null,
    sprintPrediction: null,
    ...partial,
  };
}

function contextFor(races: Race[]): DecodeContext {
  return { races, drivers: DRIVERS };
}

const UPCOMING_RACES: Race[] = [
  makeRace({ id: "china-2026", status: "upcoming", prediction: null }),
  makeRace({ id: "miami-2026", status: "upcoming", prediction: null }),
];

const COMPLETED_RACE: Race = makeRace({
  id: "bahrain-2026",
  status: "completed",
  grandPrixResult: [
    { position: 1, driverId: "verstappen", teamId: "red-bull" },
    { position: 2, driverId: "norris", teamId: "mclaren" },
  ],
});

function encodePayload(data: unknown): string {
  return encodeBase64Url(JSON.stringify(data));
}

describe("decodeScenario round trip", () => {
  it("round-trips a single race prediction", () => {
    const race = makeRace({ id: "china-2026", status: "upcoming", prediction: ["norris", "piastri", "verstappen"] });
    const scenario = encodeScenario([race]);
    const encoded = encodePayload(scenario);

    const decoded = decodeScenarioFromString(encoded, contextFor([makeRace({ id: "china-2026", status: "upcoming", prediction: null })]));

    expect(decoded).toEqual(scenario);
  });

  it("round-trips multiple race predictions", () => {
    const races: Race[] = [
      makeRace({ id: "china-2026", status: "upcoming", prediction: ["norris", "piastri"] }),
      makeRace({ id: "miami-2026", status: "upcoming", prediction: ["verstappen", "leclerc"] }),
    ];
    const scenario = encodeScenario(races);
    const encoded = encodePayload(scenario);

    const decoded = decodeScenarioFromString(encoded, contextFor(UPCOMING_RACES));

    expect(decoded).toEqual(scenario);
  });

  it("preserves exact positions including empty gaps", () => {
    const sparse: string[] = [];
    sparse[4] = "norris";
    const race = makeRace({ id: "china-2026", status: "upcoming", prediction: sparse });
    const scenario = encodeScenario([race]);
    const encoded = encodePayload(scenario);

    const decoded = decodeScenarioFromString(encoded, contextFor([makeRace({ id: "china-2026", status: "upcoming", prediction: null })]));

    expect(decoded?.predictions["china-2026"]).toEqual([{ p: 5, d: "norris" }]);
  });

  it("preserves the minimum supported classified finishing position (P22)", () => {
    const sparse: string[] = [];
    sparse[21] = "norris";
    const race = makeRace({ id: "china-2026", status: "upcoming", prediction: sparse });
    const encoded = encodePayload(encodeScenario([race]));

    const decoded = decodeScenarioFromString(encoded, contextFor([makeRace({ id: "china-2026", status: "upcoming", prediction: null })]));

    expect(decoded?.predictions["china-2026"]).toEqual([{ p: 22, d: "norris" }]);
  });
});

describe("decodeScenario safety", () => {
  it("returns null for a malformed base64 hash", () => {
    expect(decodeScenarioFromString("not!!valid!!base64", contextFor(UPCOMING_RACES))).toBeNull();
  });

  it("returns null for valid base64 that is not JSON", () => {
    expect(decodeScenarioFromString(encodeBase64Url("{not json"), contextFor(UPCOMING_RACES))).toBeNull();
  });

  it("returns null for an unsupported payload version", () => {
    const payload = { v: 99, predictions: {} };
    expect(decodeScenarioFromString(encodePayload(payload), contextFor(UPCOMING_RACES))).toBeNull();
  });

  it("returns null when the predictions field is missing or not an object", () => {
    expect(decodeScenarioFromString(encodePayload({ v: 1 }), contextFor(UPCOMING_RACES))).toBeNull();
    expect(
      decodeScenarioFromString(encodePayload({ v: 1, predictions: "nope" }), contextFor(UPCOMING_RACES)),
    ).toBeNull();
  });

  it("returns null for an empty scenario (no usable predictions)", () => {
    expect(decodeScenarioFromString(encodePayload({ v: 1, predictions: {} }), contextFor(UPCOMING_RACES))).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(decodeScenarioFromString("", contextFor(UPCOMING_RACES))).toBeNull();
  });
});

describe("decodeScenario data filtering", () => {
  it("ignores unknown race ids", () => {
    const payload = {
      v: 1,
      predictions: {
        "does-not-exist": [{ p: 1, d: "norris" }],
        "china-2026": [{ p: 1, d: "piastri" }],
      },
    };

    const decoded = decodeScenarioFromString(encodePayload(payload), contextFor(UPCOMING_RACES));

    expect(decoded?.predictions).toEqual({ "china-2026": [{ p: 1, d: "piastri" }] });
  });

  it("ignores completed races", () => {
    const payload = {
      v: 1,
      predictions: {
        "bahrain-2026": [{ p: 1, d: "norris" }],
        "china-2026": [{ p: 1, d: "piastri" }],
      },
    };

    const decoded = decodeScenarioFromString(encodePayload(payload), contextFor([COMPLETED_RACE, ...UPCOMING_RACES]));

    expect(decoded?.predictions).not.toHaveProperty("bahrain-2026");
    expect(decoded?.predictions).toHaveProperty("china-2026");
  });

  it("ignores unknown driver ids", () => {
    const payload = {
      v: 1,
      predictions: {
        "china-2026": [
          { p: 1, d: "ghost-driver" },
          { p: 2, d: "norris" },
        ],
      },
    };

    const decoded = decodeScenarioFromString(encodePayload(payload), contextFor(UPCOMING_RACES));

    expect(decoded?.predictions["china-2026"]).toEqual([{ p: 2, d: "norris" }]);
  });

  it("ignores invalid positions outside the classification range", () => {
    const payload = {
      v: 1,
      predictions: {
        "china-2026": [
          { p: 0, d: "norris" },
          { p: 23, d: "piastri" },
          { p: 3, d: "verstappen" },
        ],
      },
    };

    const decoded = decodeScenarioFromString(encodePayload(payload), contextFor(UPCOMING_RACES));

    expect(decoded?.predictions["china-2026"]).toEqual([{ p: 3, d: "verstappen" }]);
  });

  it("ignores entries with non-integer positions", () => {
    const payload = {
      v: 1,
      predictions: {
        "china-2026": [
          { p: 1.5, d: "norris" },
          { p: 2, d: "piastri" },
        ],
      },
    };

    const decoded = decodeScenarioFromString(encodePayload(payload), contextFor(UPCOMING_RACES));

    expect(decoded?.predictions["china-2026"]).toEqual([{ p: 2, d: "piastri" }]);
  });

  it("avoids duplicate drivers within the same race, keeping the first valid entry", () => {
    const payload = {
      v: 1,
      predictions: {
        "china-2026": [
          { p: 1, d: "norris" },
          { p: 2, d: "norris" },
          { p: 3, d: "piastri" },
        ],
      },
    };

    const decoded = decodeScenarioFromString(encodePayload(payload), contextFor(UPCOMING_RACES));

    expect(decoded?.predictions["china-2026"]).toEqual([
      { p: 1, d: "norris" },
      { p: 3, d: "piastri" },
    ]);
  });

  it("avoids duplicate positions within the same race, keeping the first valid entry", () => {
    const payload = {
      v: 1,
      predictions: {
        "china-2026": [
          { p: 1, d: "norris" },
          { p: 1, d: "piastri" },
          { p: 2, d: "verstappen" },
        ],
      },
    };

    const decoded = decodeScenarioFromString(
      encodePayload(payload),
      contextFor(UPCOMING_RACES),
    );

    expect(decoded?.predictions["china-2026"]).toEqual([
      { p: 1, d: "norris" },
      { p: 2, d: "verstappen" },
    ]);
  });

  it("filters otherwise-known drivers that are not prediction eligible", () => {
    const payload = {
      v: 1,
      predictions: {
        "china-2026": [
          { p: 1, d: "leclerc" },
          { p: 2, d: "norris" },
        ],
      },
    };

    const decoded = decodeScenarioFromString(encodePayload(payload), {
      ...contextFor(UPCOMING_RACES),
      predictionDriverIds: ["norris"],
    });

    expect(decoded?.predictions["china-2026"]).toEqual([
      { p: 2, d: "norris" },
    ]);
  });

  it("drops a race entirely when none of its entries are valid", () => {
    const payload = {
      v: 1,
      predictions: {
        "china-2026": [{ p: 99, d: "ghost" }],
        "miami-2026": [{ p: 1, d: "norris" }],
      },
    };

    const decoded = decodeScenarioFromString(encodePayload(payload), contextFor(UPCOMING_RACES));

    expect(decoded?.predictions).toEqual({ "miami-2026": [{ p: 1, d: "norris" }] });
  });
});

describe("decodeScenario sprint weekend handling", () => {
  it("round-trips a GP prediction for an upcoming sprint weekend", () => {
    const upcomingSprint = makeRace({
      id: "dutch-2026",
      status: "upcoming",
      hasSprint: true,
      prediction: ["norris", "piastri", "verstappen"],
    });
    const scenario = encodeScenario([upcomingSprint]);
    const encoded = encodePayload(scenario);

    const decoded = decodeScenarioFromString(
      encoded,
      contextFor([makeRace({ id: "dutch-2026", status: "upcoming", hasSprint: true, prediction: null })]),
    );

    expect(decoded).toEqual(scenario);
  });

  it("round-trips GP and sprint predictions for an upcoming sprint weekend", () => {
    const upcomingSprint = makeRace({
      id: "dutch-2026",
      status: "upcoming",
      hasSprint: true,
      prediction: ["norris"],
      sprintPrediction: ["piastri"],
    });
    const scenario = encodeScenario([upcomingSprint]);
    const encoded = encodePayload(scenario);

    const decoded = decodeScenarioFromString(
      encoded,
      contextFor([makeRace({ id: "dutch-2026", status: "upcoming", hasSprint: true, prediction: null, sprintPrediction: null })]),
    );

    expect(decoded).toEqual(scenario);
  });

  it("ignores completed sprint races even when the payload references them", () => {
    const payload = {
      v: 2,
      predictions: {
        "chinese-2026": [{ p: 1, d: "norris" }],
        "dutch-2026": [{ p: 1, d: "piastri" }],
      },
      sprintPredictions: {
        "chinese-2026": [{ p: 1, d: "verstappen" }],
        "dutch-2026": [{ p: 1, d: "norris" }],
      },
    };

    const completedSprint = makeRace({
      id: "chinese-2026",
      status: "completed",
      hasSprint: true,
      grandPrixResult: [{ position: 1, driverId: "verstappen", teamId: "red-bull" }],
      sprintResult: [{ position: 1, driverId: "russell", teamId: "mercedes", points: 8 }],
    });
    const upcomingSprint = makeRace({
      id: "dutch-2026",
      status: "upcoming",
      hasSprint: true,
      prediction: null,
      sprintPrediction: null,
    });

    const decoded = decodeScenarioFromString(encodePayload(payload), contextFor([completedSprint, upcomingSprint]));

    expect(decoded?.predictions).toEqual({ "dutch-2026": [{ p: 1, d: "piastri" }] });
    expect(decoded?.sprintPredictions).toEqual({ "dutch-2026": [{ p: 1, d: "norris" }] });
  });

  it("ignores sprint predictions for non-sprint weekends", () => {
    const payload = {
      v: 2,
      predictions: {
        "miami-2026": [{ p: 1, d: "piastri" }],
      },
      sprintPredictions: {
        "miami-2026": [{ p: 1, d: "norris" }],
      },
    };

    const upcomingNonSprint = makeRace({ id: "miami-2026", status: "upcoming", hasSprint: false });

    const decoded = decodeScenarioFromString(encodePayload(payload), contextFor([upcomingNonSprint]));

    expect(decoded?.predictions).toEqual({ "miami-2026": [{ p: 1, d: "piastri" }] });
    expect(decoded?.sprintPredictions).toEqual({});
  });

  it("decodes v1 GP-only URLs and normalizes them to v2", () => {
    const payload = {
      v: 1,
      predictions: {
        "china-2026": [{ p: 1, d: "norris" }],
      },
    };

    const upcoming = makeRace({ id: "china-2026", status: "upcoming" });

    const decoded = decodeScenarioFromString(encodePayload(payload), contextFor([upcoming]));

    expect(decoded?.v).toBe(2);
    expect(decoded?.predictions).toEqual({ "china-2026": [{ p: 1, d: "norris" }] });
    expect(decoded?.sprintPredictions).toEqual({});
  });
});

describe("decodeScenarioFromHash", () => {
  it("decodes a hash fragment carrying the scenario key", () => {
    const race = makeRace({ id: "china-2026", status: "upcoming", prediction: ["norris"] });
    const hash = `#${SCENARIO_HASH_KEY}=${encodePayload(encodeScenario([race]))}`;

    const decoded = decodeScenarioFromHash(hash, contextFor(UPCOMING_RACES));

    expect(decoded?.predictions).toEqual({ "china-2026": [{ p: 1, d: "norris" }] });
  });

  it("handles a hash fragment without a leading #", () => {
    const race = makeRace({ id: "china-2026", status: "upcoming", prediction: ["norris"] });
    const hash = `${SCENARIO_HASH_KEY}=${encodePayload(encodeScenario([race]))}`;

    const decoded = decodeScenarioFromHash(hash, contextFor(UPCOMING_RACES));

    expect(decoded?.predictions).toEqual({ "china-2026": [{ p: 1, d: "norris" }] });
  });

  it("returns null for an unknown hash key", () => {
    const hash = "#other=value";
    expect(decodeScenarioFromHash(hash, contextFor(UPCOMING_RACES))).toBeNull();
  });

  it("returns null for an empty hash", () => {
    expect(decodeScenarioFromHash("", contextFor(UPCOMING_RACES))).toBeNull();
    expect(decodeScenarioFromHash("#", contextFor(UPCOMING_RACES))).toBeNull();
  });
});
