import { describe, it, expect } from "vitest";

import { calculateProjectedStandings } from "../calculateProjectedStandings";
import { calculateStandings } from "../calculateStandings";
import { drivers, races, teams } from "../../data";
import type { Driver } from "../../types/driver";
import type { Race } from "../../types/race";
import type { Team } from "../../types/team";

describe("calculateProjectedStandings", () => {
  it("matches completed-only standings when no predictions exist", () => {
    const noPredictions: Race[] = races.map((r) =>
      r.status === "upcoming" ? { ...r, prediction: null } : r,
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
        ? { ...r, prediction: ["norris", "piastri", "verstappen"] }
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
    const snapshot: Race[] = races.map((r) => ({
      ...r,
      grandPrixResult: r.grandPrixResult ? r.grandPrixResult.map((entry) => ({ ...entry })) : null,
      sprintResult: r.sprintResult ? r.sprintResult.map((entry) => ({ ...entry })) : r.sprintResult,
      prediction: r.prediction ? [...r.prediction] : null,
    }));

    calculateProjectedStandings(races, drivers, teams);

    expect(races).toEqual(snapshot);
  });

  it("returns a standing for every driver and team", () => {
    const projected = calculateProjectedStandings(races, drivers, teams);
    expect(projected.drivers).toHaveLength(drivers.length);
    expect(projected.teams).toHaveLength(teams.length);
  });

  it("scores prediction constructor points from the current driver teamId", () => {
    const testDrivers: Driver[] = [
      {
        id: "reserve",
        number: null,
        code: "RES",
        firstName: "Reserve",
        lastName: "Driver",
        teamId: "team-a",
        country: "X",
      },
    ];
    const testTeams: Team[] = [
      { id: "team-a", name: "Team A", fullName: "Team A", color: "#111111" },
      { id: "team-b", name: "Team B", fullName: "Team B", color: "#222222" },
    ];
    const testRaces: Race[] = [
      {
        id: "future",
        round: 1,
        name: "Future",
        circuit: "Test",
        date: "2026-01-01",
        status: "upcoming",
        grandPrixResult: null,
        sprintResult: null,
        prediction: ["reserve"],
      },
    ];

    const standings = calculateProjectedStandings(testRaces, testDrivers, testTeams);

    expect(standings.teams.find((entry) => entry.teamId === "team-a")?.points).toBe(25);
    expect(standings.teams.find((entry) => entry.teamId === "team-b")?.points).toBe(0);
  });
});
