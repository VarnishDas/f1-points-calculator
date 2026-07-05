import { describe, it, expect } from "vitest";

import { calculateProjectedStandings } from "../calculateProjectedStandings";
import { calculateStandings } from "../calculateStandings";
import { drivers, races, teams } from "../../data";
import type { Race } from "../../types/race";

describe("calculateProjectedStandings", () => {
  it("matches completed-only standings when no predictions exist", () => {
    const noPredictions: Race[] = races.map((r) =>
      r.status === "upcoming" ? { ...r, result: null } : r,
    );

    const projected = calculateProjectedStandings(noPredictions, drivers, teams);
    const official = calculateStandings(noPredictions, drivers, teams);

    expect(projected.drivers).toEqual(official.drivers);
    expect(projected.teams).toEqual(official.teams);
  });

  it("ignores upcoming races with no prediction (null result)", () => {
    const projected = calculateProjectedStandings(races, drivers, teams);
    const official = calculateStandings(races, drivers, teams);

    // Static data has no predictions, so projected == official.
    expect(projected.drivers).toEqual(official.drivers);
  });

  it("includes a predicted upcoming race in projected standings", () => {
    const upcoming = races.find((r) => r.status === "upcoming");
    if (!upcoming) throw new Error("expected at least one upcoming race");

    const predicted: Race[] = races.map((r) =>
      r.id === upcoming.id
        ? { ...r, result: ["norris", "piastri", "verstappen"] }
        : r,
    );

    const official = calculateStandings(predicted, drivers, teams);
    const projected = calculateProjectedStandings(predicted, drivers, teams);

    // Official completed-only standings must NOT include the prediction...
    const officialNorris = official.drivers.find((d) => d.driverId === "norris");
    const projectedNorris = projected.drivers.find((d) => d.driverId === "norris");
    expect(projectedNorris!.points).toBe((officialNorris!.points as number) + 25);

    // ...while projected standings must award 25 for the predicted P1.
    expect(projectedNorris!.points).toBeGreaterThan(officialNorris!.points);
  });

  it("does not mutate the input races array or race results", () => {
    const snapshot: Race[] = races.map((r) => ({ ...r, result: r.result ? [...r.result] : null }));

    calculateProjectedStandings(races, drivers, teams);

    expect(races.map((r) => r.result)).toEqual(snapshot.map((r) => r.result));
  });

  it("returns a standing for every driver and team", () => {
    const projected = calculateProjectedStandings(races, drivers, teams);
    expect(projected.drivers).toHaveLength(20);
    expect(projected.teams).toHaveLength(10);
  });
});
