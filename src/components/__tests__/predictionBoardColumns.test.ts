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

  it("returns no columns for an empty calendar", () => {
    expect(buildBoardColumns([])).toEqual([]);
  });

  it("includes a sprint column when an official sprint result exists without hasSprint", () => {
    const columns = buildBoardColumns([
      makeRace(1, {
        status: "completed",
        sprintResult: [{ position: 1, driverId: "a", teamId: "team" }],
      }),
    ]);

    expect(columns.map((column) => column.id)).toEqual(["race-1:sprint", "race-1:gp"]);
  });

  it("omits the sprint column for weekends with no sprint at all", () => {
    const columns = buildBoardColumns([makeRace(1, { hasSprint: false })]);

    expect(columns.map((column) => column.id)).toEqual(["race-1:gp"]);
  });

  it("marks sessions editable only when predictions are allowed", () => {
    const columns = buildBoardColumns([
      makeRace(1, { status: "completed" }),
      makeRace(2, {
        hasSprint: true,
        sprintResult: [{ position: 1, driverId: "a", teamId: "team" }],
      }),
      makeRace(3, { hasSprint: true }),
    ]);

    const editableById = Object.fromEntries(
      columns.map((column) => [column.id, column.isEditable]),
    );
    expect(editableById).toEqual({
      "race-1:gp": false,
      "race-2:sprint": false,
      "race-2:gp": true,
      "race-3:sprint": true,
      "race-3:gp": true,
    });
  });

  it("exposes the race reference and session type on each column", () => {
    const race = makeRace(1, { hasSprint: true });

    const columns = buildBoardColumns([race]);

    expect(columns).toHaveLength(2);
    expect(columns[0]).toMatchObject({ id: "race-1:sprint", session: "sprint" });
    expect(columns[0]?.race).toBe(race);
    expect(columns[1]).toMatchObject({ id: "race-1:gp", session: "grandPrix" });
    expect(columns[1]?.race).toBe(race);
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

  it("prefers a later completed Sprint over an earlier completed Grand Prix", () => {
    const columns = buildBoardColumns([
      makeRace(1, { status: "completed" }),
      makeRace(2, { status: "completed" }),
      makeRace(3, {
        hasSprint: true,
        sprintResult: [{ position: 1, driverId: "a", teamId: "team" }],
      }),
    ]);

    expect(getInitialBoardColumnId(columns)).toBe("race-3:sprint");
  });

  it("returns the only column for a single-race calendar", () => {
    const columns = buildBoardColumns([makeRace(1)]);

    expect(getInitialBoardColumnId(columns)).toBe("race-1:gp");
  });

  it("returns undefined for an empty calendar", () => {
    expect(getInitialBoardColumnId([])).toBeUndefined();
  });

  it("starts at the last completed Grand Prix once the season is over", () => {
    const columns = buildBoardColumns([
      makeRace(1, { status: "completed" }),
      makeRace(2, {
        status: "completed",
        hasSprint: true,
        sprintResult: [{ position: 1, driverId: "a", teamId: "team" }],
      }),
    ]);

    expect(getInitialBoardColumnId(columns)).toBe("race-2:gp");
  });
});
