import { describe, expect, it } from "vitest";

import { resolveChampionshipOrder } from "../resolveTies";

type TestEntry = {
  id: string;
  points: number;
  positionCounts: number[];
  fallbackOrder?: number;
};

function orderedIds(entries: TestEntry[]): string[] {
  return resolveChampionshipOrder(entries).map((entry) => entry.id);
}

describe("resolveChampionshipOrder", () => {
  it("ranks higher points above lower points", () => {
    expect(
      orderedIds([
        { id: "a", points: 9, positionCounts: [] },
        { id: "b", points: 10, positionCounts: [] },
      ]),
    ).toEqual(["b", "a"]);
  });

  it("uses wins as the first equal-points countback", () => {
    expect(
      orderedIds([
        { id: "a", points: 50, positionCounts: [1] },
        { id: "b", points: 50, positionCounts: [2] },
      ]),
    ).toEqual(["b", "a"]);
  });

  it("uses second places when points and wins are equal", () => {
    expect(
      orderedIds([
        { id: "a", points: 50, positionCounts: [1, 2] },
        { id: "b", points: 50, positionCounts: [1, 3] },
      ]),
    ).toEqual(["b", "a"]);
  });

  it("uses third places when points, wins, and second places are equal", () => {
    expect(
      orderedIds([
        { id: "a", points: 50, positionCounts: [1, 2, 1] },
        { id: "b", points: 50, positionCounts: [1, 2, 2] },
      ]),
    ).toEqual(["b", "a"]);
  });

  it("continues countback beyond podium positions", () => {
    expect(
      orderedIds([
        { id: "a", points: 0, positionCounts: [0, 0, 0, 0, 1] },
        { id: "b", points: 0, positionCounts: [0, 0, 0, 0, 2] },
      ]),
    ).toEqual(["b", "a"]);
  });

  it("uses deterministic fallback order only after race countback is identical", () => {
    expect(
      orderedIds([
        { id: "a", points: 10, positionCounts: [0, 1], fallbackOrder: 2 },
        { id: "b", points: 10, positionCounts: [0, 1], fallbackOrder: 1 },
      ]),
    ).toEqual(["b", "a"]);
  });
});
