import { describe, expect, it } from "vitest";

import type { Driver } from "../../types/driver";
import type { EventResultEntry, Race } from "../../types/race";
import type { Team } from "../../types/team";
import {
  aggregateChampionshipEntries,
  buildStandings,
  calculateStandingsForMode,
  type ChampionshipEntries,
} from "../standingsAggregation";

function makeDrivers(ids: string[], teamId = "team-a"): Driver[] {
  return ids.map((id, index) => ({
    id,
    number: index + 1,
    code: id.toUpperCase(),
    firstName: id,
    lastName: id,
    teamId,
    country: "X",
  }));
}

function makeTeams(ids: string[]): Team[] {
  return ids.map((id) => ({ id, name: id, fullName: id, color: "#000000" }));
}

function makeRace(partial: Partial<Race> & Pick<Race, "id" | "status">): Race {
  return {
    round: 1,
    name: partial.id,
    circuit: "Circuit",
    date: "2026-01-01",
    grandPrixResult: null,
    sprintResult: null,
    prediction: null,
    sprintPrediction: null,
    ...partial,
  };
}

function gpResult(driverIds: string[], teamId = "team-a"): EventResultEntry[] {
  return driverIds.map((driverId, index) => ({
    position: index + 1,
    driverId,
    teamId,
  }));
}

describe("aggregateChampionshipEntries", () => {
  it("keeps every driver and team in input order with a zero baseline", () => {
    const drivers = makeDrivers(["a", "b", "c"]);
    const teams = makeTeams(["team-a", "team-b"]);

    const entries = aggregateChampionshipEntries([], drivers, teams, "officialOnly");

    expect(entries.drivers).toEqual([
      { driverId: "a", points: 0, positionCounts: [], fallbackOrder: 0 },
      { driverId: "b", points: 0, positionCounts: [], fallbackOrder: 1 },
      { driverId: "c", points: 0, positionCounts: [], fallbackOrder: 2 },
    ]);
    expect(entries.teams).toEqual([
      { teamId: "team-a", points: 0, positionCounts: [], fallbackOrder: 0 },
      { teamId: "team-b", points: 0, positionCounts: [], fallbackOrder: 1 },
    ]);
  });

  it("ignores predictions in officialOnly mode", () => {
    const drivers = makeDrivers(["a"]);
    const teams = makeTeams(["team-a"]);
    const races = [
      makeRace({ id: "r1", status: "upcoming", prediction: ["a"] }),
    ];

    const entries = aggregateChampionshipEntries(races, drivers, teams, "officialOnly");

    expect(entries.drivers[0]).toMatchObject({ points: 0, positionCounts: [] });
    expect(entries.teams[0]).toMatchObject({ points: 0, positionCounts: [] });
  });

  it("counts Grand Prix predictions toward points and countback in officialAndPredicted mode", () => {
    const drivers = makeDrivers(["a", "b"]);
    const teams = makeTeams(["team-a"]);
    const races = [
      makeRace({ id: "r1", status: "upcoming", prediction: ["a", "b"] }),
    ];

    const entries = aggregateChampionshipEntries(
      races,
      drivers,
      teams,
      "officialAndPredicted",
    );

    expect(entries.drivers[0]).toMatchObject({ points: 25, positionCounts: [1] });
    // Position counts are sparse: holes mark positions the driver never took.
    expect(entries.drivers[1]).toMatchObject({
      points: 18,
      positionCounts: [undefined, 1],
    });
    expect(entries.teams[0]).toMatchObject({ points: 43, positionCounts: [1, 1] });
  });

  it("does not count official sprint results toward championship countback", () => {
    const drivers = makeDrivers(["a"]);
    const teams = makeTeams(["team-a"]);
    const races = [
      makeRace({
        id: "r1",
        status: "completed",
        hasSprint: true,
        sprintResult: [{ position: 1, driverId: "a", teamId: "team-a", points: 8 }],
      }),
    ];

    const entries = aggregateChampionshipEntries(races, drivers, teams, "officialOnly");

    expect(entries.drivers[0]).toMatchObject({ points: 8, positionCounts: [] });
    expect(entries.teams[0]).toMatchObject({ points: 8, positionCounts: [] });
  });

  it("does not count sprint predictions toward championship countback", () => {
    const drivers = makeDrivers(["a"]);
    const teams = makeTeams(["team-a"]);
    const races = [
      makeRace({
        id: "r1",
        status: "upcoming",
        hasSprint: true,
        sprintPrediction: ["a"],
      }),
    ];

    const entries = aggregateChampionshipEntries(
      races,
      drivers,
      teams,
      "officialAndPredicted",
    );

    expect(entries.drivers[0]).toMatchObject({ points: 8, positionCounts: [] });
    expect(entries.teams[0]).toMatchObject({ points: 8, positionCounts: [] });
  });

  it("ignores predictions for sessions that are not editable", () => {
    const drivers = makeDrivers(["a", "b"]);
    const teams = makeTeams(["team-a"]);
    const races = [
      makeRace({
        id: "completed-with-prediction",
        status: "completed",
        grandPrixResult: gpResult(["b"]),
        prediction: ["a"],
      }),
      makeRace({
        id: "non-sprint-weekend",
        status: "upcoming",
        hasSprint: false,
        sprintPrediction: ["a"],
      }),
      makeRace({
        id: "mid-weekend",
        status: "upcoming",
        hasSprint: true,
        sprintResult: [{ position: 1, driverId: "b", teamId: "team-a", points: 8 }],
        sprintPrediction: ["a"],
      }),
    ];

    const entries = aggregateChampionshipEntries(
      races,
      drivers,
      teams,
      "officialAndPredicted",
    );

    expect(entries.drivers.find((entry) => entry.driverId === "a")?.points).toBe(0);
    expect(entries.drivers.find((entry) => entry.driverId === "b")?.points).toBe(33);
  });

  it("honours explicit official points instead of the points table", () => {
    const drivers = makeDrivers(["a"]);
    const teams = makeTeams(["team-a"]);
    const races = [
      makeRace({
        id: "r1",
        status: "completed",
        grandPrixResult: [{ position: 1, driverId: "a", teamId: "team-a", points: 19 }],
      }),
    ];

    const entries = aggregateChampionshipEntries(races, drivers, teams, "officialOnly");

    expect(entries.drivers[0]?.points).toBe(19);
    expect(entries.teams[0]?.points).toBe(19);
    // Countback still records the finishing position even with overridden points.
    expect(entries.drivers[0]?.positionCounts).toEqual([1]);
  });

  it("honours explicit zero points on an official entry", () => {
    const drivers = makeDrivers(["a"]);
    const teams = makeTeams(["team-a"]);
    const races = [
      makeRace({
        id: "r1",
        status: "completed",
        grandPrixResult: [{ position: 1, driverId: "a", teamId: "team-a", points: 0 }],
      }),
    ];

    const entries = aggregateChampionshipEntries(races, drivers, teams, "officialOnly");

    expect(entries.drivers[0]).toMatchObject({ points: 0, positionCounts: [1] });
  });

  it("skips official entries with invalid driver ids or positions", () => {
    const drivers = makeDrivers(["a"]);
    const teams = makeTeams(["team-a"]);
    const races = [
      makeRace({
        id: "r1",
        status: "completed",
        grandPrixResult: [
          { position: 1, driverId: "", teamId: "team-a" },
          { position: 0, driverId: "a", teamId: "team-a" },
          { position: 1.5, driverId: "a", teamId: "team-a" },
          { position: -2, driverId: "a", teamId: "team-a" },
        ],
      }),
    ];

    const entries = aggregateChampionshipEntries(races, drivers, teams, "officialOnly");

    expect(entries.drivers[0]).toMatchObject({ points: 0, positionCounts: [] });
    expect(entries.teams[0]).toMatchObject({ points: 0, positionCounts: [] });
  });

  it("scores official team points from the event entry, not the driver roster", () => {
    const drivers = makeDrivers(["a"], "team-a");
    const teams = makeTeams(["team-a", "team-b"]);
    const races = [
      makeRace({
        id: "r1",
        status: "completed",
        grandPrixResult: [{ position: 1, driverId: "a", teamId: "" }],
      }),
    ];

    const entries = aggregateChampionshipEntries(races, drivers, teams, "officialOnly");

    expect(entries.drivers[0]?.points).toBe(25);
    expect(entries.teams.every((entry) => entry.points === 0)).toBe(true);
  });

  it("skips predicted drivers that are not in the driver roster", () => {
    const drivers = makeDrivers(["a"]);
    const teams = makeTeams(["team-a"]);
    const races = [
      makeRace({
        id: "r1",
        status: "upcoming",
        prediction: ["ghost", "a"],
      }),
    ];

    const entries = aggregateChampionshipEntries(
      races,
      drivers,
      teams,
      "officialAndPredicted",
    );

    // "ghost" occupies P1 but is discarded; "a" keeps its array-index position P2.
    expect(entries.drivers[0]).toMatchObject({ points: 18, positionCounts: [undefined, 1] });
  });

  it("skips empty slots in sparse predictions while keeping later positions", () => {
    const drivers = makeDrivers(["a"]);
    const teams = makeTeams(["team-a"]);
    const prediction: string[] = [];
    prediction[2] = "a";
    const races = [makeRace({ id: "r1", status: "upcoming", prediction })];

    const entries = aggregateChampionshipEntries(
      races,
      drivers,
      teams,
      "officialAndPredicted",
    );

    expect(entries.drivers[0]).toMatchObject({ points: 15, positionCounts: [undefined, undefined, 1] });
  });

  it("accumulates team points across drivers, races, and sessions", () => {
    const drivers = [
      ...makeDrivers(["a1", "a2"], "team-a"),
      ...makeDrivers(["b1"], "team-b"),
    ];
    const teams = makeTeams(["team-a", "team-b"]);
    const races = [
      makeRace({
        id: "r1",
        status: "completed",
        hasSprint: true,
        grandPrixResult: [
          { position: 1, driverId: "a1", teamId: "team-a" },
          { position: 2, driverId: "a2", teamId: "team-a" },
          { position: 3, driverId: "b1", teamId: "team-b" },
        ],
        sprintResult: [
          { position: 1, driverId: "a2", teamId: "team-a", points: 8 },
          { position: 2, driverId: "b1", teamId: "team-b", points: 7 },
        ],
      }),
    ];

    const entries = aggregateChampionshipEntries(races, drivers, teams, "officialOnly");

    expect(entries.teams.find((entry) => entry.teamId === "team-a")).toMatchObject({
      points: 51,
      positionCounts: [1, 1],
    });
    expect(entries.teams.find((entry) => entry.teamId === "team-b")).toMatchObject({
      points: 22,
      positionCounts: [undefined, undefined, 1],
    });
  });
});

describe("buildStandings", () => {
  it("assigns sequential positions after championship ordering", () => {
    const entries: ChampionshipEntries = {
      drivers: [
        { driverId: "a", points: 25, positionCounts: [1], fallbackOrder: 0 },
        { driverId: "b", points: 43, positionCounts: [1, 1], fallbackOrder: 1 },
        { driverId: "c", points: 0, positionCounts: [], fallbackOrder: 2 },
      ],
      teams: [
        { teamId: "team-a", points: 10, positionCounts: [], fallbackOrder: 0 },
        { teamId: "team-b", points: 30, positionCounts: [], fallbackOrder: 1 },
      ],
    };

    const standings = buildStandings(entries);

    expect(standings.drivers).toEqual([
      { driverId: "b", position: 1, points: 43, wins: 1 },
      { driverId: "a", position: 2, points: 25, wins: 1 },
      { driverId: "c", position: 3, points: 0, wins: 0 },
    ]);
    expect(standings.teams).toEqual([
      { teamId: "team-b", position: 1, points: 30 },
      { teamId: "team-a", position: 2, points: 10 },
    ]);
  });

  it("falls back to the original order when countback cannot separate entries", () => {
    const entries: ChampionshipEntries = {
      drivers: [
        { driverId: "x", points: 0, positionCounts: [], fallbackOrder: 0 },
        { driverId: "y", points: 0, positionCounts: [], fallbackOrder: 1 },
        { driverId: "z", points: 0, positionCounts: [], fallbackOrder: 2 },
      ],
      teams: [],
    };

    const standings = buildStandings(entries);

    expect(standings.drivers.map((standing) => standing.driverId)).toEqual([
      "x",
      "y",
      "z",
    ]);
  });

  it("handles empty entries", () => {
    expect(buildStandings({ drivers: [], teams: [] })).toEqual({
      drivers: [],
      teams: [],
    });
  });
});

describe("calculateStandingsForMode", () => {
  it("produces different standings per mode when predictions exist", () => {
    const drivers = makeDrivers(["a", "b"]);
    const teams = makeTeams(["team-a"]);
    const races = [
      makeRace({ id: "r1", status: "upcoming", prediction: ["a", "b"] }),
    ];

    const official = calculateStandingsForMode(races, drivers, teams, "officialOnly");
    const projected = calculateStandingsForMode(
      races,
      drivers,
      teams,
      "officialAndPredicted",
    );

    expect(official.drivers.find((standing) => standing.driverId === "a")?.points).toBe(0);
    expect(projected.drivers).toEqual([
      { driverId: "a", position: 1, points: 25, wins: 1 },
      { driverId: "b", position: 2, points: 18, wins: 0 },
    ]);
  });
});
