import { describe, it, expect } from "vitest";
import { calculateStandings } from "../calculateStandings";
import { drivers, races, teams } from "../../data";
import type { Driver } from "../../types/driver";
import type { EventResultEntry } from "../../types/race";
import type { Race } from "../../types/race";
import type { Team } from "../../types/team";

function gpResult(
  driverIds: string[],
  teamByDriver: Record<string, string> = {},
  fallbackTeamId = "t",
): EventResultEntry[] {
  return driverIds.map((driverId, index) => ({
    position: index + 1,
    driverId,
    teamId: teamByDriver[driverId] ?? fallbackTeamId,
  }));
}

function makeRace(partial: Omit<Race, "grandPrixResult" | "sprintResult" | "prediction" | "sprintPrediction"> & {
  result: string[];
  teamByDriver?: Record<string, string>;
  fallbackTeamId?: string;
}): Race {
  const { result, teamByDriver, fallbackTeamId, ...race } = partial;
  return {
    ...race,
    grandPrixResult: gpResult(result, teamByDriver, fallbackTeamId),
    sprintResult: null,
    prediction: null,
    sprintPrediction: null,
  };
}

describe("calculateStandings (real 2026 data)", () => {
  const { drivers: driverStandings, teams: teamStandings } = calculateStandings(
    races,
    drivers,
    teams,
  );

  it("returns a standing for every generated driver", () => {
    expect(driverStandings).toHaveLength(drivers.length);
  });

  it("returns a standing for every generated team", () => {
    expect(teamStandings).toHaveLength(teams.length);
  });

  it("assigns sequential driver positions starting at 1", () => {
    driverStandings.forEach((standing, index) => {
      expect(standing.position).toBe(index + 1);
    });
  });

  it("records wins from official Grand Prix classifications only", () => {
    const generatedWins = new Map<string, number>();
    for (const race of races) {
      const winner = race.grandPrixResult?.find((entry) => entry.position === 1);
      if (!winner) continue;
      generatedWins.set(winner.driverId, (generatedWins.get(winner.driverId) ?? 0) + 1);
    }

    for (const standing of driverStandings) {
      expect(standing.wins).toBe(generatedWins.get(standing.driverId) ?? 0);
    }
  });

  it("orders drivers by total points descending", () => {
    const points = driverStandings.map((s) => s.points);
    expect(points).toEqual([...points].sort((a, b) => b - a));
  });

  it("keeps all generated standing point totals non-negative", () => {
    for (const standing of [...driverStandings, ...teamStandings]) {
      expect(standing.points).toBeGreaterThanOrEqual(0);
    }
  });

  it("orders teams by total points descending", () => {
    const points = teamStandings.map((t) => t.points);
    expect(points).toEqual([...points].sort((a, b) => b - a));
  });
});

describe("calculateStandings (tie-breaking via countback)", () => {
  // Synthetic field where `a` and `b` finish level on points (50 each)
  // but `a` has more wins, so `a` must rank above `b`.
  //   a: race1 1st (25), race2 1st (25), race3 11th (0)  -> 50, wins = 2
  //   b: race1 3rd  (15), race2 5th  (10), race3 1st (25) -> 50, wins = 1
  const fillerIds = ["c", "d", "e", "f", "g", "h", "i", "j", "k"];
  const allDriverIds = ["a", "b", ...fillerIds];

  const synthDrivers: Driver[] = allDriverIds.map((id, index) => ({
    id,
    number: index + 1,
    code: id.toUpperCase(),
    firstName: id,
    lastName: id,
    teamId: "t",
    country: "X",
  }));

  const synthTeams: Team[] = [
    { id: "t", name: "T", fullName: "T", color: "#000000" },
  ];

  const synthRaces: Race[] = [
    makeRace({
      id: "r1",
      round: 1,
      name: "R1",
      circuit: "C1",
      date: "2026-01-01",
      status: "completed",
      result: ["a", "c", "b", "d", "e", "f", "g", "h", "i", "j", "k"],
    }),
    makeRace({
      id: "r2",
      round: 2,
      name: "R2",
      circuit: "C2",
      date: "2026-01-08",
      status: "completed",
      result: ["a", "c", "d", "e", "b", "f", "g", "h", "i", "j", "k"],
    }),
    makeRace({
      id: "r3",
      round: 3,
      name: "R3",
      circuit: "C3",
      date: "2026-01-15",
      status: "completed",
      result: ["b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "a"],
    }),
  ];

  const { drivers: standings } = calculateStandings(synthRaces, synthDrivers, synthTeams);

  it("leaves a and b level on 50 points", () => {
    const a = standings.find((s) => s.driverId === "a");
    const b = standings.find((s) => s.driverId === "b");
    expect(a?.points).toBe(50);
    expect(b?.points).toBe(50);
  });

  it("records 2 wins for a and 1 win for b", () => {
    const a = standings.find((s) => s.driverId === "a");
    const b = standings.find((s) => s.driverId === "b");
    expect(a?.wins).toBe(2);
    expect(b?.wins).toBe(1);
  });

  it("ranks the driver with more wins higher when points are equal", () => {
    const aPos = standings.find((s) => s.driverId === "a")!.position;
    const bPos = standings.find((s) => s.driverId === "b")!.position;
    expect(aPos).toBeLessThan(bPos);
  });
});

describe("calculateStandings (classification countback details)", () => {
  it("does not use Sprint finishing positions for championship countback", () => {
    const testDrivers: Driver[] = ["b", "a", "c"].map((id, index) => ({
      id,
      number: index + 1,
      code: id.toUpperCase(),
      firstName: id,
      lastName: id,
      teamId: "team",
      country: "X",
    }));
    const testTeams: Team[] = [
      { id: "team", name: "Team", fullName: "Team", color: "#000000" },
    ];
    const testRaces: Race[] = [
      {
        ...makeRace({
          id: "r1",
          round: 1,
          name: "R1",
          circuit: "Test",
          date: "2026-01-01",
          status: "completed",
          result: ["a", "b", "c"],
          fallbackTeamId: "team",
        }),
        hasSprint: true,
        sprintResult: gpResult(["a", "b", "c"], {}, "team").map(
          (entry) => ({ ...entry, points: entry.position === 1 ? 8 : entry.position === 2 ? 7 : 6 }),
        ),
      },
      {
        ...makeRace({
          id: "r2",
          round: 2,
          name: "R2",
          circuit: "Test",
          date: "2026-01-08",
          status: "completed",
          result: ["b", "a", "c"],
          fallbackTeamId: "team",
        }),
        hasSprint: true,
        sprintResult: [
          { position: 1, driverId: "c", teamId: "team", points: 8 },
          { position: 8, driverId: "b", teamId: "team", points: 1 },
          { position: 9, driverId: "a", teamId: "team", points: 0 },
        ],
      },
    ];

    const standings = calculateStandings(testRaces, testDrivers, testTeams).drivers;

    expect(standings.find((entry) => entry.driverId === "a")?.points).toBe(51);
    expect(standings.find((entry) => entry.driverId === "b")?.points).toBe(51);
    expect(standings.find((entry) => entry.driverId === "b")!.position).toBeLessThan(
      standings.find((entry) => entry.driverId === "a")!.position,
    );
    expect(standings.find((entry) => entry.driverId === "a")?.wins).toBe(1);
  });

  it("uses P11 and lower for countback without awarding points", () => {
    const driverIds = [
      "p1",
      "p2",
      "p3",
      "p4",
      "p5",
      "p6",
      "p7",
      "p8",
      "p9",
      "p10",
      "a",
      "b",
    ];
    const testDrivers: Driver[] = driverIds.map((id, index) => ({
      id,
      number: index + 1,
      code: id.toUpperCase(),
      firstName: id,
      lastName: id,
      teamId: "team",
      country: "X",
    }));
    const testTeams: Team[] = [
      { id: "team", name: "Team", fullName: "Team", color: "#000000" },
    ];
    const testRaces: Race[] = [
      makeRace({
        id: "classification",
        round: 1,
        name: "Classification",
        circuit: "Test",
        date: "2026-01-01",
        status: "completed",
        result: driverIds,
        fallbackTeamId: "team",
      }),
    ];

    const { drivers: standings } = calculateStandings(
      testRaces,
      testDrivers,
      testTeams,
    );
    const a = standings.find((standing) => standing.driverId === "a");
    const b = standings.find((standing) => standing.driverId === "b");

    expect(a?.points).toBe(0);
    expect(b?.points).toBe(0);
    expect(a!.position).toBeLessThan(b!.position);
  });

  it("applies race countback to constructor standings", () => {
    const testTeams: Team[] = [
      { id: "team-a", name: "Team A", fullName: "Team A", color: "#000000" },
      { id: "team-b", name: "Team B", fullName: "Team B", color: "#111111" },
      { id: "fillers", name: "Fillers", fullName: "Fillers", color: "#222222" },
    ];
    const testDrivers: Driver[] = [
      { id: "a1", teamId: "team-a" },
      { id: "a2", teamId: "team-a" },
      { id: "b1", teamId: "team-b" },
      { id: "b2", teamId: "team-b" },
      ...["f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8"].map((id) => ({
        id,
        teamId: "fillers",
      })),
    ].map((driver, index) => ({
      number: index + 1,
      code: driver.id.toUpperCase(),
      firstName: driver.id,
      lastName: driver.id,
      country: "X",
      ...driver,
    }));
    const testRaces: Race[] = [
      makeRace({
        id: "r1",
        round: 1,
        name: "R1",
        circuit: "Test",
        date: "2026-01-01",
        status: "completed",
        result: ["a1", "b1", "f1", "f2", "f3", "f4", "f5", "b2", "f6", "f7", "a2", "f8"],
        teamByDriver: Object.fromEntries(testDrivers.map((driver) => [driver.id, driver.teamId])),
      }),
      makeRace({
        id: "r2",
        round: 2,
        name: "R2",
        circuit: "Test",
        date: "2026-01-08",
        status: "completed",
        result: ["f1", "f2", "f3", "f4", "f5", "f6", "f7", "b1", "f8", "a1", "b2", "a2"],
        teamByDriver: Object.fromEntries(testDrivers.map((driver) => [driver.id, driver.teamId])),
      }),
    ];

    const { teams: standings } = calculateStandings(
      testRaces,
      testDrivers,
      testTeams,
    );
    const teamA = standings.find((standing) => standing.teamId === "team-a");
    const teamB = standings.find((standing) => standing.teamId === "team-b");

    expect(teamA?.points).toBe(26);
    expect(teamB?.points).toBe(26);
    expect(teamA!.position).toBeLessThan(teamB!.position);
  });
});

describe("calculateStandings (event-specific official results)", () => {
  const testTeams: Team[] = [
    { id: "team-a", name: "Team A", fullName: "Team A", color: "#111111" },
    { id: "team-b", name: "Team B", fullName: "Team B", color: "#222222" },
  ];

  it("scores official constructor points from event teamId instead of driver.teamId", () => {
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
    const testRaces: Race[] = [
      {
        id: "r1",
        round: 1,
        name: "R1",
        circuit: "Test",
        date: "2026-01-01",
        status: "completed",
        grandPrixResult: [{ position: 1, driverId: "reserve", teamId: "team-b" }],
        sprintResult: null,
        prediction: null,
        sprintPrediction: null,
      },
    ];

    const standings = calculateStandings(testRaces, testDrivers, testTeams);

    expect(standings.drivers.find((entry) => entry.driverId === "reserve")?.points).toBe(25);
    expect(standings.teams.find((entry) => entry.teamId === "team-b")?.points).toBe(25);
    expect(standings.teams.find((entry) => entry.teamId === "team-a")?.points).toBe(0);
  });

  it("allows the same driver to score for different official teams across events", () => {
    const testDrivers: Driver[] = [
      {
        id: "switcher",
        number: 99,
        code: "SWI",
        firstName: "Team",
        lastName: "Switcher",
        teamId: "team-a",
        country: "X",
      },
    ];
    const testRaces: Race[] = [
      {
        id: "r1",
        round: 1,
        name: "R1",
        circuit: "Test",
        date: "2026-01-01",
        status: "completed",
        grandPrixResult: [{ position: 1, driverId: "switcher", teamId: "team-a" }],
        sprintResult: null,
        prediction: null,
        sprintPrediction: null,
      },
      {
        id: "r2",
        round: 2,
        name: "R2",
        circuit: "Test",
        date: "2026-01-08",
        status: "completed",
        grandPrixResult: [{ position: 1, driverId: "switcher", teamId: "team-b" }],
        sprintResult: null,
        prediction: null,
        sprintPrediction: null,
      },
    ];

    const standings = calculateStandings(testRaces, testDrivers, testTeams);

    expect(standings.drivers[0].points).toBe(50);
    expect(standings.teams.find((entry) => entry.teamId === "team-a")?.points).toBe(25);
    expect(standings.teams.find((entry) => entry.teamId === "team-b")?.points).toBe(25);
  });

  it("adds official sprint points and gives sprint P9 zero", () => {
    const testDrivers: Driver[] = ["gp", "sprint", "p9"].map((id, index) => ({
      id,
      number: index + 1,
      code: id.toUpperCase(),
      firstName: id,
      lastName: id,
      teamId: "team-a",
      country: "X",
    }));
    const testRaces: Race[] = [
      {
        id: "r1",
        round: 1,
        name: "R1",
        circuit: "Test",
        date: "2026-01-01",
        status: "completed",
        hasSprint: true,
        grandPrixResult: [{ position: 1, driverId: "gp", teamId: "team-a" }],
        sprintResult: [
          { position: 1, driverId: "sprint", teamId: "team-a" },
          { position: 9, driverId: "p9", teamId: "team-a" },
        ],
        prediction: null,
        sprintPrediction: null,
      },
    ];

    const standings = calculateStandings(testRaces, testDrivers, testTeams);

    expect(standings.drivers.find((entry) => entry.driverId === "gp")?.points).toBe(25);
    expect(standings.drivers.find((entry) => entry.driverId === "sprint")?.points).toBe(8);
    expect(standings.drivers.find((entry) => entry.driverId === "p9")?.points).toBe(0);
    expect(standings.teams.find((entry) => entry.teamId === "team-a")?.points).toBe(33);
  });
});
