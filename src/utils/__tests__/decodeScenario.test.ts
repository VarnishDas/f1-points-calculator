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
    result: null,
    ...partial,
  };
}

function contextFor(races: Race[]): DecodeContext {
  return { races, drivers: DRIVERS };
}

const UPCOMING_RACES: Race[] = [
  makeRace({ id: "china-2026", status: "upcoming", result: null }),
  makeRace({ id: "miami-2026", status: "upcoming", result: null }),
];

const COMPLETED_RACE: Race = makeRace({
  id: "bahrain-2026",
  status: "completed",
  result: ["verstappen", "norris"],
});

function encodePayload(data: unknown): string {
  return encodeBase64Url(JSON.stringify(data));
}

describe("decodeScenario round trip", () => {
  it("round-trips a single race prediction", () => {
    const race = makeRace({ id: "china-2026", status: "upcoming", result: ["norris", "piastri", "verstappen"] });
    const scenario = encodeScenario([race]);
    const encoded = encodePayload(scenario);

    const decoded = decodeScenarioFromString(encoded, contextFor([makeRace({ id: "china-2026", status: "upcoming", result: null })]));

    expect(decoded).toEqual(scenario);
  });

  it("round-trips multiple race predictions", () => {
    const races: Race[] = [
      makeRace({ id: "china-2026", status: "upcoming", result: ["norris", "piastri"] }),
      makeRace({ id: "miami-2026", status: "upcoming", result: ["verstappen", "leclerc"] }),
    ];
    const scenario = encodeScenario(races);
    const encoded = encodePayload(scenario);

    const decoded = decodeScenarioFromString(encoded, contextFor(UPCOMING_RACES));

    expect(decoded).toEqual(scenario);
  });

  it("preserves exact positions including empty gaps", () => {
    const sparse: string[] = [];
    sparse[4] = "norris";
    const race = makeRace({ id: "china-2026", status: "upcoming", result: sparse });
    const scenario = encodeScenario([race]);
    const encoded = encodePayload(scenario);

    const decoded = decodeScenarioFromString(encoded, contextFor([makeRace({ id: "china-2026", status: "upcoming", result: null })]));

    expect(decoded?.predictions["china-2026"]).toEqual([{ p: 5, d: "norris" }]);
  });

  it("preserves the maximum classified finishing position (P20)", () => {
    const sparse: string[] = [];
    sparse[19] = "norris";
    const race = makeRace({ id: "china-2026", status: "upcoming", result: sparse });
    const encoded = encodePayload(encodeScenario([race]));

    const decoded = decodeScenarioFromString(encoded, contextFor([makeRace({ id: "china-2026", status: "upcoming", result: null })]));

    expect(decoded?.predictions["china-2026"]).toEqual([{ p: 20, d: "norris" }]);
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
          { p: 21, d: "piastri" },
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

describe("decodeScenarioFromHash", () => {
  it("decodes a hash fragment carrying the scenario key", () => {
    const race = makeRace({ id: "china-2026", status: "upcoming", result: ["norris"] });
    const hash = `#${SCENARIO_HASH_KEY}=${encodePayload(encodeScenario([race]))}`;

    const decoded = decodeScenarioFromHash(hash, contextFor(UPCOMING_RACES));

    expect(decoded?.predictions).toEqual({ "china-2026": [{ p: 1, d: "norris" }] });
  });

  it("handles a hash fragment without a leading #", () => {
    const race = makeRace({ id: "china-2026", status: "upcoming", result: ["norris"] });
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
