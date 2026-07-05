import { describe, it, expect } from "vitest";
import { calculateStandings } from "../calculateStandings";
import { drivers, races, teams } from "../../data";
import type { Driver } from "../../types/driver";
import type { Race } from "../../types/race";
import type { Team } from "../../types/team";

describe("calculateStandings (real 2026 data)", () => {
  const { drivers: driverStandings, teams: teamStandings } = calculateStandings(
    races,
    drivers,
    teams,
  );

  it("returns a standing for every driver (20)", () => {
    expect(driverStandings).toHaveLength(20);
  });

  it("returns a standing for every team (10)", () => {
    expect(teamStandings).toHaveLength(10);
  });

  it("assigns sequential driver positions starting at 1", () => {
    driverStandings.forEach((standing, index) => {
      expect(standing.position).toBe(index + 1);
    });
  });

  it("puts Verstappen first after the 4 completed races with 90 points and 3 wins", () => {
    expect(driverStandings[0].driverId).toBe("verstappen");
    expect(driverStandings[0].points).toBe(90);
    expect(driverStandings[0].wins).toBe(3);
  });

  it("gives Norris 76 points and 1 win", () => {
    const norris = driverStandings.find((s) => s.driverId === "norris");
    expect(norris?.points).toBe(76);
    expect(norris?.wins).toBe(1);
  });

  it("gives Russell a consistent 10 points per race (40 total)", () => {
    const russell = driverStandings.find((s) => s.driverId === "russell");
    expect(russell?.points).toBe(40);
  });

  it("awards 0 points to drivers who only finished outside the top 10", () => {
    const doohan = driverStandings.find((s) => s.driverId === "doohan");
    const bortoleto = driverStandings.find((s) => s.driverId === "bortoleto");
    expect(doohan?.points).toBe(0);
    expect(bortoleto?.points).toBe(0);
  });

  it("orders drivers by total points descending", () => {
    const points = driverStandings.map((s) => s.points);
    expect(points).toEqual([...points].sort((a, b) => b - a));
  });

  it("sums constructor points from both drivers (McLaren = 133, P1)", () => {
    const mclaren = teamStandings.find((t) => t.teamId === "mclaren");
    expect(mclaren?.points).toBe(133);
    expect(teamStandings[0].teamId).toBe("mclaren");
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
    {
      id: "r1",
      round: 1,
      name: "R1",
      circuit: "C1",
      date: "2026-01-01",
      status: "completed",
      result: ["a", "c", "b", "d", "e", "f", "g", "h", "i", "j", "k"],
    },
    {
      id: "r2",
      round: 2,
      name: "R2",
      circuit: "C2",
      date: "2026-01-08",
      status: "completed",
      result: ["a", "c", "d", "e", "b", "f", "g", "h", "i", "j", "k"],
    },
    {
      id: "r3",
      round: 3,
      name: "R3",
      circuit: "C3",
      date: "2026-01-15",
      status: "completed",
      result: ["b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "a"],
    },
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
      {
        id: "classification",
        round: 1,
        name: "Classification",
        circuit: "Test",
        date: "2026-01-01",
        status: "completed",
        result: driverIds,
      },
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
      {
        id: "r1",
        round: 1,
        name: "R1",
        circuit: "Test",
        date: "2026-01-01",
        status: "completed",
        result: ["a1", "b1", "f1", "f2", "f3", "f4", "f5", "b2", "f6", "f7", "a2", "f8"],
      },
      {
        id: "r2",
        round: 2,
        name: "R2",
        circuit: "Test",
        date: "2026-01-08",
        status: "completed",
        result: ["f1", "f2", "f3", "f4", "f5", "f6", "f7", "b1", "f8", "a1", "b2", "a2"],
      },
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
