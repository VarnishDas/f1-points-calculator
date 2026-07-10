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
      sprintPrediction: r.sprintPrediction ? [...r.sprintPrediction] : null,
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
        sprintPrediction: null,
      },
    ];

    const standings = calculateProjectedStandings(testRaces, testDrivers, testTeams);

    expect(standings.teams.find((entry) => entry.teamId === "team-a")?.points).toBe(25);
    expect(standings.teams.find((entry) => entry.teamId === "team-b")?.points).toBe(0);
  });

  describe("sprint predictions", () => {
    const testDrivers: Driver[] = [
      { id: "a", number: 1, code: "A", firstName: "A", lastName: "A", teamId: "team-a", country: "X" },
      { id: "b", number: 2, code: "B", firstName: "B", lastName: "B", teamId: "team-a", country: "X" },
      { id: "c", number: 3, code: "C", firstName: "C", lastName: "C", teamId: "team-b", country: "X" },
      { id: "d", number: 4, code: "D", firstName: "D", lastName: "D", teamId: "team-b", country: "X" },
      { id: "e", number: 5, code: "E", firstName: "E", lastName: "E", teamId: "team-c", country: "X" },
      { id: "f", number: 6, code: "F", firstName: "F", lastName: "F", teamId: "team-c", country: "X" },
      { id: "g", number: 7, code: "G", firstName: "G", lastName: "G", teamId: "team-d", country: "X" },
      { id: "h", number: 8, code: "H", firstName: "H", lastName: "H", teamId: "team-d", country: "X" },
      { id: "i", number: 9, code: "I", firstName: "I", lastName: "I", teamId: "team-e", country: "X" },
    ];
    const testTeams: Team[] = [
      { id: "team-a", name: "A", fullName: "A", color: "#111" },
      { id: "team-b", name: "B", fullName: "B", color: "#222" },
      { id: "team-c", name: "C", fullName: "C", color: "#333" },
      { id: "team-d", name: "D", fullName: "D", color: "#444" },
      { id: "team-e", name: "E", fullName: "E", color: "#555" },
    ];

    it("uses sprint points for sprint predictions", () => {
      const testRaces: Race[] = [
        {
          id: "sprint-race",
          round: 1,
          name: "Sprint Race",
          circuit: "Test",
          date: "2026-01-01",
          status: "upcoming",
          hasSprint: true,
          grandPrixResult: null,
          sprintResult: null,
          prediction: null,
          sprintPrediction: ["a", "b", "c", "d", "e", "f", "g", "h", "i"],
        },
      ];

      const standings = calculateProjectedStandings(testRaces, testDrivers, testTeams);

      expect(standings.drivers.find((entry) => entry.driverId === "a")?.points).toBe(8);
      expect(standings.drivers.find((entry) => entry.driverId === "h")?.points).toBe(1);
      expect(standings.drivers.find((entry) => entry.driverId === "i")?.points).toBe(0);
    });

    it("awards sprint prediction constructor points using current driver teamId", () => {
      const testRaces: Race[] = [
        {
          id: "sprint-race",
          round: 1,
          name: "Sprint Race",
          circuit: "Test",
          date: "2026-01-01",
          status: "upcoming",
          hasSprint: true,
          grandPrixResult: null,
          sprintResult: null,
          prediction: null,
          sprintPrediction: ["a", "b"],
        },
      ];

      const standings = calculateProjectedStandings(testRaces, testDrivers, testTeams);

      expect(standings.drivers.find((entry) => entry.driverId === "a")?.points).toBe(8);
      expect(standings.drivers.find((entry) => entry.driverId === "b")?.points).toBe(7);
      expect(standings.teams.find((entry) => entry.teamId === "team-a")?.points).toBe(15);
    });

    it("keeps GP and sprint predictions independent", () => {
      const testRaces: Race[] = [
        {
          id: "sprint-race",
          round: 1,
          name: "Sprint Race",
          circuit: "Test",
          date: "2026-01-01",
          status: "upcoming",
          hasSprint: true,
          grandPrixResult: null,
          sprintResult: null,
          prediction: ["c"],
          sprintPrediction: ["a"],
        },
      ];

      const standings = calculateProjectedStandings(testRaces, testDrivers, testTeams);

      expect(standings.drivers.find((entry) => entry.driverId === "a")?.points).toBe(8);
      expect(standings.drivers.find((entry) => entry.driverId === "c")?.points).toBe(25);
    });

    it("does not add a stale Sprint prediction after the official Sprint result exists", () => {
      const testRaces: Race[] = [
        {
          id: "sprint-race",
          round: 1,
          name: "Sprint Race",
          circuit: "Test",
          date: "2026-01-01",
          status: "upcoming",
          hasSprint: true,
          grandPrixResult: null,
          sprintResult: [
            { position: 1, driverId: "a", teamId: "team-a", points: 8 },
          ],
          prediction: null,
          sprintPrediction: ["a"],
        },
      ];

      const standings = calculateProjectedStandings(
        testRaces,
        testDrivers,
        testTeams,
      );

      expect(standings.drivers.find((entry) => entry.driverId === "a")?.points).toBe(8);
    });

    it("ignores sprint predictions for non-sprint weekends", () => {
      const testRaces: Race[] = [
        {
          id: "gp-only-race",
          round: 1,
          name: "GP Only Race",
          circuit: "Test",
          date: "2026-01-01",
          status: "upcoming",
          hasSprint: false,
          grandPrixResult: null,
          sprintResult: null,
          prediction: null,
          sprintPrediction: ["a", "b"],
        },
      ];

      const standings = calculateProjectedStandings(testRaces, testDrivers, testTeams);

      expect(standings.drivers.every((entry) => entry.points === 0)).toBe(true);
    });

    it("does not mutate input races", () => {
      const testRaces: Race[] = [
        {
          id: "sprint-race",
          round: 1,
          name: "Sprint Race",
          circuit: "Test",
          date: "2026-01-01",
          status: "upcoming",
          hasSprint: true,
          grandPrixResult: null,
          sprintResult: null,
          prediction: null,
          sprintPrediction: ["a"],
        },
      ];
      const snapshot = JSON.stringify(testRaces);

      calculateProjectedStandings(testRaces, testDrivers, testTeams);

      expect(JSON.stringify(testRaces)).toBe(snapshot);
    });
  });
});
