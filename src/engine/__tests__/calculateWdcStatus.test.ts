import { describe, expect, it } from "vitest";

import { calculateWdcStatus } from "../calculateWdcStatus";
import type { Driver } from "../../types/driver";
import type { Race } from "../../types/race";
import type { Team } from "../../types/team";

const testTeams: Team[] = [
  { id: "team", name: "Team", fullName: "Team", color: "#000000" },
];

function makeDrivers(ids: string[]): Driver[] {
  return ids.map((id, index) => ({
    id,
    number: index + 1,
    code: id.slice(0, 3).toUpperCase(),
    firstName: id,
    lastName: id,
    teamId: "team",
    country: "X",
  }));
}

function race(id: string, result: string[] | null, status: Race["status"]): Race {
  return {
    id,
    round: Number(id.replace(/\D/g, "")) || 1,
    name: id,
    circuit: "Test",
    date: "2026-01-01",
    status,
    result,
  };
}

describe("calculateWdcStatus", () => {
  it("marks a driver out when their best remaining points cannot reach the leader", () => {
    const drivers = makeDrivers([
      "leader",
      "chaser",
      "f1",
      "f2",
      "f3",
      "f4",
      "f5",
      "f6",
      "f7",
      "f8",
      "f9",
    ]);
    const leaderWins = [
      "leader",
      "f1",
      "f2",
      "f3",
      "f4",
      "f5",
      "f6",
      "f7",
      "f8",
      "f9",
      "chaser",
    ];
    const races: Race[] = [
      race("r1", leaderWins, "completed"),
      race("r2", leaderWins, "completed"),
      race("r3", leaderWins, "completed"),
      race("r4", leaderWins, "completed"),
      race("r5", null, "upcoming"),
    ];

    const status = calculateWdcStatus(races, drivers, testTeams);

    expect(status.chaser).toBe("outOfContention");
    expect(status.leader).toBe("champion");
  });

  it("keeps a driver in contention when their best case can win on countback", () => {
    const ids = [
      "leader",
      "chaser",
      "f1",
      "f2",
      "f3",
      "f4",
      "f5",
      "f6",
      "f7",
      "f8",
      "f9",
    ];
    const drivers = makeDrivers(ids);
    const races: Race[] = [
      race("r1", ["leader", "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "chaser"], "completed"),
      race("r2", null, "upcoming"),
    ];

    const status = calculateWdcStatus(races, drivers, testTeams);

    expect(status.chaser).toBe("inContention");
    expect(status.leader).toBe("inContention");
  });

  it("marks the top driver as champion when all races are resolved", () => {
    const drivers = makeDrivers(["leader", "chaser"]);
    const races: Race[] = [race("r1", ["leader", "chaser"], "upcoming")];

    const status = calculateWdcStatus(races, drivers, testTeams);

    expect(status.leader).toBe("champion");
    expect(status.chaser).toBe("outOfContention");
  });

  it("does not mark a champion while another driver can still win", () => {
    const drivers = makeDrivers(["leader", "chaser"]);
    const races: Race[] = [
      race("r1", ["leader", "chaser"], "completed"),
      race("r2", null, "upcoming"),
    ];

    const status = calculateWdcStatus(races, drivers, testTeams);

    expect(status.leader).toBe("inContention");
    expect(status.chaser).toBe("inContention");
  });

  it("treats empty slots in partial predictions as unresolved best-case results", () => {
    const drivers = makeDrivers(["leader", "chaser", "f1"]);
    const partialPrediction: string[] = [];
    partialPrediction[1] = "f1";
    const races: Race[] = [
      race("r1", ["leader", "f1", "chaser"], "completed"),
      race("r2", partialPrediction, "upcoming"),
    ];

    const status = calculateWdcStatus(races, drivers, testTeams);

    expect(status.leader).toBe("inContention");
    expect(status.chaser).toBe("inContention");
  });

  it("does not give a driver a filled position in a partial prediction", () => {
    const drivers = makeDrivers(["leader", "chaser", "f1"]);
    const races: Race[] = [
      race("r1", ["leader", "f1", "chaser"], "completed"),
      race("r2", ["f1"], "upcoming"),
    ];

    const status = calculateWdcStatus(races, drivers, testTeams);

    expect(status.chaser).toBe("outOfContention");
  });

  it("keeps unresolved race-countback ties in contention instead of using fallback order", () => {
    const drivers = makeDrivers(["a", "b"]);
    const races: Race[] = [
      race("r1", ["a", "b"], "completed"),
      race("r2", ["b", "a"], "completed"),
    ];

    const status = calculateWdcStatus(races, drivers, testTeams);

    expect(status.a).toBe("inContention");
    expect(status.b).toBe("inContention");
  });
});
