import { describe, expect, it } from "vitest";

import type { Race } from "../../types/race";
import { getInitialMobileRaceId } from "../mobilePredictionBoardState";

function makeRace(round: number, status: Race["status"]): Race {
  return {
    id: `race-${round}`,
    round,
    name: `Race ${round}`,
    circuit: "Circuit",
    date: "2026-01-01",
    status,
    grandPrixResult: null,
    sprintResult: null,
    prediction: null,
    sprintPrediction: null,
  };
}

describe("getInitialMobileRaceId", () => {
  it("opens the first upcoming race", () => {
    const races = [
      makeRace(1, "completed"),
      makeRace(2, "upcoming"),
      makeRace(3, "upcoming"),
    ];

    expect(getInitialMobileRaceId(races)).toBe("race-2");
  });

  it("falls back to the final race after the season is complete", () => {
    const races = [makeRace(1, "completed"), makeRace(2, "completed")];

    expect(getInitialMobileRaceId(races)).toBe("race-2");
  });

  it("handles an empty calendar", () => {
    expect(getInitialMobileRaceId([])).toBeUndefined();
  });
});
