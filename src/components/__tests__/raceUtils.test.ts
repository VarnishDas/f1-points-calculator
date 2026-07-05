import { describe, expect, it } from "vitest";

import { sortRacesByRound } from "../raceUtils";
import type { Race } from "../../types/race";

function makeRace(round: number, id?: string): Race {
  return {
    id: id ?? `race-${round}`,
    round,
    name: `Race ${round}`,
    circuit: "Circuit",
    date: "2026-01-01",
    status: "upcoming",
    grandPrixResult: null,
    sprintResult: null,
    prediction: null,
    sprintPrediction: null,
  };
}

describe("sortRacesByRound", () => {
  it("sorts races by round ascending", () => {
    const races = [makeRace(5), makeRace(1), makeRace(3), makeRace(2), makeRace(4)];

    const sorted = sortRacesByRound(races);

    expect(sorted.map((r) => r.round)).toEqual([1, 2, 3, 4, 5]);
  });

  it("does not mutate the input array", () => {
    const races = [makeRace(3), makeRace(1), makeRace(2)];

    sortRacesByRound(races);

    expect(races.map((r) => r.round)).toEqual([3, 1, 2]);
  });

  it("handles an empty list", () => {
    expect(sortRacesByRound([])).toEqual([]);
  });
});
