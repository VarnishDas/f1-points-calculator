import { describe, it, expect } from "vitest";
import {
  POINTS_TABLE,
  getPointsForPosition,
  calculateRacePoints,
} from "../calculateRacePoints";

describe("POINTS_TABLE", () => {
  it("has exactly 10 scoring positions", () => {
    expect(POINTS_TABLE).toHaveLength(10);
  });

  it("matches the F1 2026 Grand Prix points system", () => {
    expect(POINTS_TABLE).toEqual([25, 18, 15, 12, 10, 8, 6, 4, 2, 1]);
  });
});

describe("getPointsForPosition", () => {
  it.each([
    [1, 25],
    [2, 18],
    [3, 15],
    [4, 12],
    [5, 10],
    [6, 8],
    [7, 6],
    [8, 4],
    [9, 2],
    [10, 1],
  ])("awards %i points for position %i", (position, expected) => {
    expect(getPointsForPosition(position)).toBe(expected);
  });

  it("awards 0 for positions 11 through 20", () => {
    for (let position = 11; position <= 20; position++) {
      expect(getPointsForPosition(position)).toBe(0);
    }
  });

  it("awards 0 for invalid positions", () => {
    expect(getPointsForPosition(0)).toBe(0);
    expect(getPointsForPosition(-1)).toBe(0);
    expect(getPointsForPosition(21)).toBe(0);
    expect(getPointsForPosition(Number.NaN)).toBe(0);
  });
});

describe("calculateRacePoints", () => {
  const fullResult = [
    "verstappen", "norris", "leclerc", "piastri", "russell",
    "hamilton", "sainz", "alonso", "gasly", "albon",
    "tsunoda", "antonelli", "stroll", "ocon", "hadjar",
    "hulkenberg", "bearman", "lawson", "doohan", "bortoleto",
  ];

  it("maps the top 10 finishers to the correct points", () => {
    const points = calculateRacePoints(fullResult);
    expect(points["verstappen"]).toBe(25);
    expect(points["norris"]).toBe(18);
    expect(points["leclerc"]).toBe(15);
    expect(points["piastri"]).toBe(12);
    expect(points["russell"]).toBe(10);
    expect(points["hamilton"]).toBe(8);
    expect(points["sainz"]).toBe(6);
    expect(points["alonso"]).toBe(4);
    expect(points["gasly"]).toBe(2);
    expect(points["albon"]).toBe(1);
  });

  it("awards 0 to every finisher outside the top 10", () => {
    const points = calculateRacePoints(fullResult);
    for (let i = 10; i < fullResult.length; i++) {
      expect(points[fullResult[i]]).toBe(0);
    }
  });

  it("returns an entry for every driver in the result", () => {
    const points = calculateRacePoints(fullResult);
    expect(Object.keys(points)).toHaveLength(fullResult.length);
  });

  it("returns an empty record for a null result", () => {
    expect(calculateRacePoints(null)).toEqual({});
  });

  it("returns an empty record for an empty result", () => {
    expect(calculateRacePoints([])).toEqual({});
  });
});
