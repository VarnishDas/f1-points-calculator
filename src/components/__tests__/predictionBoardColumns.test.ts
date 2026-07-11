import { describe, expect, it } from "vitest";

import type { Race } from "../../types/race";
import {
  buildBoardColumns,
  getInitialBoardColumnId,
} from "../predictionBoardColumns";

function makeRace(round: number, overrides: Partial<Race> = {}): Race {
  return {
    id: `race-${round}`,
    round,
    name: `Race ${round}`,
    circuit: "Circuit",
    date: "2026-01-01",
    status: "upcoming",
    grandPrixResult: null,
    sprintResult: null,
    prediction: null,
    sprintPrediction: null,
    ...overrides,
  };
}

describe("buildBoardColumns", () => {
  it("sorts races without mutating the input", () => {
    const races = [makeRace(3), makeRace(1), makeRace(2)];

    const columns = buildBoardColumns(races);

    expect(columns.map((column) => column.race.round)).toEqual([1, 2, 3]);
    expect(races.map((race) => race.round)).toEqual([3, 1, 2]);
  });

  it("keeps completed sessions available before upcoming sessions", () => {
    const columns = buildBoardColumns([
      makeRace(1, { status: "completed" }),
      makeRace(2, {
        status: "completed",
        hasSprint: true,
        sprintResult: [{ position: 1, driverId: "a", teamId: "team" }],
      }),
      makeRace(3),
    ]);

    expect(columns.map((column) => column.id)).toEqual([
      "race-1:gp",
      "race-2:sprint",
      "race-2:gp",
      "race-3:gp",
    ]);
  });

  it("keeps a completed Sprint when its Grand Prix is still upcoming", () => {
    const columns = buildBoardColumns([
      makeRace(1, { status: "completed" }),
      makeRace(2, {
        hasSprint: true,
        sprintResult: [{ position: 1, driverId: "a", teamId: "team" }],
      }),
    ]);

    expect(columns.map((column) => column.id)).toEqual([
      "race-1:gp",
      "race-2:sprint",
      "race-2:gp",
    ]);
  });
});

describe("getInitialBoardColumnId", () => {
  it("starts at the most recently completed Grand Prix", () => {
    const columns = buildBoardColumns([
      makeRace(1, {
        status: "completed",
        grandPrixResult: [{ position: 1, driverId: "a", teamId: "team" }],
      }),
      makeRace(2, { hasSprint: true }),
      makeRace(3),
    ]);

    expect(getInitialBoardColumnId(columns)).toBe("race-1:gp");
  });

  it("starts at a completed Sprint when its Grand Prix is still upcoming", () => {
    const columns = buildBoardColumns([
      makeRace(1, { status: "completed" }),
      makeRace(2, {
        hasSprint: true,
        sprintResult: [{ position: 1, driverId: "a", teamId: "team" }],
      }),
    ]);

    expect(getInitialBoardColumnId(columns)).toBe("race-2:sprint");
  });

  it("prefers the Grand Prix when both sessions in the round are complete", () => {
    const columns = buildBoardColumns([
      makeRace(1, { status: "completed" }),
      makeRace(2, {
        status: "completed",
        hasSprint: true,
        sprintResult: [{ position: 1, driverId: "a", teamId: "team" }],
      }),
      makeRace(3),
    ]);

    expect(getInitialBoardColumnId(columns)).toBe("race-2:gp");
  });

  it("falls back to the first race before the season starts", () => {
    const columns = buildBoardColumns([makeRace(1), makeRace(2)]);

    expect(getInitialBoardColumnId(columns)).toBe("race-1:gp");
  });
});
