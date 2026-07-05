import { describe, it, expect } from "vitest";

import type { Race } from "../../types/race";
import {
  SCENARIO_HASH_KEY,
  SCENARIO_VERSION,
  encodeBase64Url,
  decodeBase64Url,
  encodeScenario,
  encodeScenarioHash,
  encodeScenarioHashValue,
} from "../encodeScenario";

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

describe("encodeScenario", () => {
  it("encodes a single upcoming race prediction with explicit positions", () => {
    const race = makeRace({
      id: "china-2026",
      status: "upcoming",
      prediction: ["norris", "piastri", "verstappen"],
    });

    const scenario = encodeScenario([race]);

    expect(scenario.v).toBe(SCENARIO_VERSION);
    expect(scenario.predictions).toEqual({
      "china-2026": [
        { p: 1, d: "norris" },
        { p: 2, d: "piastri" },
        { p: 3, d: "verstappen" },
      ],
    });
  });

  it("encodes multiple upcoming race predictions", () => {
    const races = [
      makeRace({ id: "china-2026", status: "upcoming", prediction: ["norris", "piastri"] }),
      makeRace({ id: "miami-2026", status: "upcoming", prediction: ["verstappen", "leclerc"] }),
    ];

    const scenario = encodeScenario(races);

    expect(Object.keys(scenario.predictions)).toEqual(["china-2026", "miami-2026"]);
    expect(scenario.predictions["china-2026"]).toEqual([
      { p: 1, d: "norris" },
      { p: 2, d: "piastri" },
    ]);
    expect(scenario.predictions["miami-2026"]).toEqual([
      { p: 1, d: "verstappen" },
      { p: 2, d: "leclerc" },
    ]);
  });

  it("preserves exact positions including empty gaps in sparse predictions", () => {
    const sparse: string[] = [];
    sparse[4] = "norris";
    const race = makeRace({ id: "china-2026", status: "upcoming", prediction: sparse });

    const scenario = encodeScenario([race]);

    expect(scenario.predictions["china-2026"]).toEqual([{ p: 5, d: "norris" }]);
  });

  it("does not encode completed races", () => {
    const completed = makeRace({
      id: "bahrain-2026",
      status: "completed",
      grandPrixResult: [
        { position: 1, driverId: "verstappen", teamId: "red-bull" },
        { position: 2, driverId: "norris", teamId: "mclaren" },
        { position: 3, driverId: "leclerc", teamId: "ferrari" },
      ],
    });
    const upcoming = makeRace({
      id: "china-2026",
      status: "upcoming",
      prediction: ["norris"],
    });

    const scenario = encodeScenario([completed, upcoming]);

    expect(scenario.predictions).toHaveProperty("china-2026");
    expect(scenario.predictions).not.toHaveProperty("bahrain-2026");
  });

  it("does not encode upcoming races with a null result", () => {
    const empty = makeRace({ id: "china-2026", status: "upcoming", prediction: null });

    const scenario = encodeScenario([empty]);

    expect(scenario.predictions).toEqual({});
  });

  it("is deterministic: identical inputs produce identical outputs", () => {
    const races = [
      makeRace({ id: "china-2026", status: "upcoming", prediction: ["norris", "piastri"] }),
      makeRace({ id: "miami-2026", status: "upcoming", prediction: ["verstappen"] }),
    ];

    const first = JSON.stringify(encodeScenario(races));
    const second = JSON.stringify(encodeScenario(races));

    expect(first).toBe(second);
  });

  it("encodes a GP prediction for an upcoming sprint weekend", () => {
    const upcomingSprint = makeRace({
      id: "dutch-2026",
      status: "upcoming",
      hasSprint: true,
      prediction: ["norris", "piastri", "verstappen"],
    });

    const scenario = encodeScenario([upcomingSprint]);

    expect(scenario.predictions).toEqual({
      "dutch-2026": [
        { p: 1, d: "norris" },
        { p: 2, d: "piastri" },
        { p: 3, d: "verstappen" },
      ],
    });
  });

  it("does not encode the official sprint result of a completed sprint race", () => {
    const completedSprint = makeRace({
      id: "chinese-2026",
      status: "completed",
      hasSprint: true,
      grandPrixResult: [
        { position: 1, driverId: "verstappen", teamId: "red-bull" },
      ],
      sprintResult: [
        { position: 1, driverId: "russell", teamId: "mercedes", points: 8 },
        { position: 2, driverId: "leclerc", teamId: "ferrari", points: 7 },
      ],
    });

    const scenario = encodeScenario([completedSprint]);

    expect(scenario.predictions).toEqual({});
    expect(scenario.sprintPredictions).toEqual({});
  });

  it("encodes sprint predictions for upcoming sprint weekends", () => {
    const upcomingSprint = makeRace({
      id: "dutch-2026",
      status: "upcoming",
      hasSprint: true,
      prediction: ["norris"],
      sprintPrediction: ["piastri", "verstappen"],
    });

    const scenario = encodeScenario([upcomingSprint]);

    expect(scenario.v).toBe(2);
    expect(scenario.predictions).toEqual({
      "dutch-2026": [{ p: 1, d: "norris" }],
    });
    expect(scenario.sprintPredictions).toEqual({
      "dutch-2026": [
        { p: 1, d: "piastri" },
        { p: 2, d: "verstappen" },
      ],
    });
  });

  it("does not encode sprint predictions for non-sprint weekends", () => {
    const upcomingNonSprint = makeRace({
      id: "miami-2026",
      status: "upcoming",
      hasSprint: false,
      prediction: null,
      sprintPrediction: ["norris"],
    });

    const scenario = encodeScenario([upcomingNonSprint]);

    expect(scenario.sprintPredictions).toEqual({});
  });

  it("produces a hash value when only sprint predictions exist", () => {
    const upcomingSprint = makeRace({
      id: "dutch-2026",
      status: "upcoming",
      hasSprint: true,
      sprintPrediction: ["norris"],
    });

    const hash = encodeScenarioHash([upcomingSprint]);

    expect(hash).not.toBe("");
    expect(hash.startsWith(`#${SCENARIO_HASH_KEY}=`)).toBe(true);
  });
});

describe("encodeScenarioHash", () => {
  it("produces a hash fragment starting with the scenario key when predictions exist", () => {
    const race = makeRace({ id: "china-2026", status: "upcoming", prediction: ["norris"] });
    const hash = encodeScenarioHash([race]);

    expect(hash.startsWith(`#${SCENARIO_HASH_KEY}=`)).toBe(true);
  });

  it("produces URL-safe base64 (no +, /, or padding) in the hash value", () => {
    const race = makeRace({ id: "china-2026", status: "upcoming", prediction: ["norris"] });
    const value = encodeScenarioHashValue([race]);
    const encoded = value.slice(`${SCENARIO_HASH_KEY}=`.length);

    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("returns an empty string when there are no predictions", () => {
    const empty = makeRace({ id: "china-2026", status: "upcoming", prediction: null });
    expect(encodeScenarioHash([empty])).toBe("");
    expect(encodeScenarioHashValue([empty])).toBe("");
  });
});

describe("base64 url helpers", () => {
  it("round-trips arbitrary JSON text", () => {
    const json = JSON.stringify({
      v: 1,
      predictions: { "china-2026": [{ p: 5, d: "norris" }] },
    });
    expect(decodeBase64Url(encodeBase64Url(json))).toBe(json);
  });

  it("round-trips unicode content", () => {
    const text = "Hülkenberg Æ Ø";
    expect(decodeBase64Url(encodeBase64Url(text))).toBe(text);
  });
});
