import { describe, expect, it } from "vitest";

import {
  MAX_CLASSIFICATION_POSITIONS,
  MIN_CLASSIFICATION_POSITIONS,
} from "../../config/season";
import { RACE_CLASSIFICATION_SIZE } from "../../constants/race";
import { races as seasonRaces } from "../../data";
import type { Race } from "../../types/race";
import { getClassificationSize } from "../classification";

function makeRace(overrides: Partial<Race> = {}): Race {
  return {
    id: "test-2026",
    round: 1,
    name: "Test Grand Prix",
    circuit: "Test Circuit",
    date: "2026-01-01",
    status: "upcoming",
    grandPrixResult: null,
    sprintResult: null,
    prediction: null,
    sprintPrediction: null,
    ...overrides,
  };
}

describe("getClassificationSize", () => {
  it("returns the configured minimum for an empty calendar", () => {
    expect(getClassificationSize([])).toBe(MIN_CLASSIFICATION_POSITIONS);
  });

  it("returns the configured minimum when no race has any result", () => {
    const races = [makeRace(), makeRace({ id: "other-2026", round: 2 })];

    expect(getClassificationSize(races)).toBe(MIN_CLASSIFICATION_POSITIONS);
  });

  it("returns the configured minimum when results classify fewer drivers", () => {
    const races = [
      makeRace({
        status: "completed",
        grandPrixResult: [
          { position: 1, driverId: "a", teamId: "team" },
          { position: 2, driverId: "b", teamId: "team" },
          { position: 3, driverId: "c", teamId: "team" },
        ],
      }),
    ];

    expect(getClassificationSize(races)).toBe(MIN_CLASSIFICATION_POSITIONS);
  });

  it("ignores empty result arrays", () => {
    const races = [
      makeRace({ status: "completed", grandPrixResult: [], sprintResult: [] }),
    ];

    expect(getClassificationSize(races)).toBe(MIN_CLASSIFICATION_POSITIONS);
  });

  it("considers sprint results when sizing the classification", () => {
    const races = [
      makeRace({
        status: "completed",
        hasSprint: true,
        sprintResult: [
          { position: 1, driverId: "a", teamId: "team" },
          { position: 30, driverId: "b", teamId: "team" },
        ],
      }),
    ];

    expect(getClassificationSize(races)).toBe(MAX_CLASSIFICATION_POSITIONS);
  });

  it("clamps oversized Grand Prix classifications to the configured maximum", () => {
    const races = [
      makeRace({
        status: "completed",
        grandPrixResult: [
          { position: 1, driverId: "a", teamId: "team" },
          { position: 30, driverId: "b", teamId: "team" },
        ],
      }),
    ];

    expect(getClassificationSize(races)).toBe(MAX_CLASSIFICATION_POSITIONS);
  });

  it("uses the largest classified position across races and sessions", () => {
    const races = [
      makeRace({
        id: "small-2026",
        status: "completed",
        grandPrixResult: [{ position: 5, driverId: "a", teamId: "team" }],
      }),
      makeRace({
        id: "large-2026",
        round: 2,
        status: "completed",
        grandPrixResult: [{ position: 25, driverId: "a", teamId: "team" }],
      }),
    ];

    expect(getClassificationSize(races)).toBe(MAX_CLASSIFICATION_POSITIONS);
  });

  it("handles sparse official classifications with gaps between positions", () => {
    const races = [
      makeRace({
        status: "completed",
        grandPrixResult: [
          { position: 3, driverId: "a", teamId: "team" },
          { position: 24, driverId: "b", teamId: "team" },
        ],
      }),
    ];

    expect(getClassificationSize(races)).toBe(MAX_CLASSIFICATION_POSITIONS);
  });

  it("ignores predictions and only sizes from official results", () => {
    const prediction: string[] = [];
    prediction[21] = "a";
    const races = [makeRace({ prediction })];

    expect(getClassificationSize(races)).toBe(MIN_CLASSIFICATION_POSITIONS);
  });

  it("matches the classification size of the real season data", () => {
    expect(getClassificationSize(seasonRaces)).toBe(RACE_CLASSIFICATION_SIZE);
  });
});
