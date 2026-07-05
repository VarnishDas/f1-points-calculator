import { describe, expect, it } from "vitest";

import {
  normalizeDriverId,
  normalizeTeamId,
  transformSourceData,
  validateGeneratedData,
  type ExistingData,
  type GeneratedData,
  type SourceData,
} from "./update-data.js";

const existing: ExistingData = {
  drivers: [
    {
      id: "unraced-existing",
      sourceId: "unraced_existing",
      number: 98,
      code: "UNR",
      firstName: "Unraced",
      lastName: "Existing",
      teamId: "red-bull",
      country: "X",
    },
    {
      id: "verstappen",
      sourceId: "max_verstappen",
      number: 1,
      code: "VER",
      firstName: "Max",
      lastName: "Verstappen",
      teamId: "red-bull",
      country: "NED",
    },
  ],
  teams: [
    {
      id: "red-bull",
      sourceId: "red_bull",
      name: "Red Bull Racing",
      fullName: "Oracle Red Bull Racing",
      color: "#3671C6",
    },
    {
      id: "racing-bulls",
      sourceId: "rb",
      name: "Racing Bulls",
      fullName: "Visa Cash App Racing Bulls",
      color: "#6692FF",
    },
    {
      id: "audi",
      sourceId: "sauber",
      name: "Audi",
      fullName: "Audi F1 Team",
      color: "#BB0A1E",
    },
  ],
  races: [],
};

const source: SourceData = {
  calendar: [
    {
      season: "2026",
      round: "1",
      raceName: "Bahrain Grand Prix",
      date: "2026-03-08",
      Circuit: { circuitName: "Bahrain International Circuit" },
      Sprint: {},
    },
    {
      season: "2026",
      round: "2",
      raceName: "Saudi Arabian Grand Prix",
      date: "2026-03-15",
      Circuit: { circuitName: "Jeddah Corniche Circuit" },
    },
  ],
  grandPrixResults: [
    {
      season: "2026",
      round: "1",
      raceName: "Bahrain Grand Prix",
      date: "2026-03-08",
      Circuit: { circuitName: "Bahrain International Circuit" },
      Results: [
        {
          position: "1",
          positionOrder: "1",
          points: "25",
          status: "Finished",
          Driver: {
            driverId: "max_verstappen",
            permanentNumber: "1",
            code: "VER",
            givenName: "Max",
            familyName: "Verstappen",
            nationality: "Dutch",
          },
          Constructor: { constructorId: "red_bull", name: "Red Bull" },
        },
        {
          position: "2",
          positionOrder: "2",
          points: "18",
          status: "Finished",
          Driver: {
            driverId: "reserve_driver",
            code: "RES",
            givenName: "Reserve",
            familyName: "Driver",
            nationality: "British",
          },
          Constructor: { constructorId: "sauber", name: "Kick Sauber" },
        },
      ],
    },
  ],
  sprintResults: [
    {
      season: "2026",
      round: "1",
      raceName: "Bahrain Grand Prix",
      date: "2026-03-08",
      Circuit: { circuitName: "Bahrain International Circuit" },
      SprintResults: [
        {
          position: "1",
          positionOrder: "1",
          points: "8",
          status: "Finished",
          Driver: {
            driverId: "reserve_driver",
            code: "RES",
            givenName: "Reserve",
            familyName: "Driver",
            nationality: "British",
          },
          Constructor: { constructorId: "rb", name: "RB" },
        },
      ],
    },
  ],
  drivers: [
    {
      driverId: "max_verstappen",
      permanentNumber: "1",
      code: "VER",
      givenName: "Max",
      familyName: "Verstappen",
      nationality: "Dutch",
    },
    {
      driverId: "fp_only_driver",
      permanentNumber: "97",
      code: "FP",
      givenName: "Practice",
      familyName: "Only",
      nationality: "Nowhere",
    },
  ],
  constructors: [
    { constructorId: "red_bull", name: "Red Bull" },
    { constructorId: "rb", name: "RB" },
    { constructorId: "sauber", name: "Kick Sauber" },
  ],
};

describe("update-data aliases", () => {
  it("normalizes known driver and constructor aliases", () => {
    expect(normalizeDriverId("max_verstappen")).toBe("verstappen");
    expect(normalizeTeamId("red_bull")).toBe("red-bull");
    expect(normalizeTeamId("rb")).toBe("racing-bulls");
    expect(normalizeTeamId("sauber")).toBe("audi");
  });
});

describe("transformSourceData", () => {
  it("transforms calendar, GP results, sprint results, aliases, and overrides", () => {
    const generated = transformSourceData(source, existing, 2026, "2026-07-05T00:00:00.000Z");

    expect(generated.races).toHaveLength(2);
    expect(generated.races[0]).toMatchObject({
      id: "bahrain-2026",
      round: 1,
      status: "completed",
      hasSprint: true,
      prediction: null,
      sprintPrediction: null,
    });
    expect(generated.races[0].grandPrixResult).toEqual([
      {
        position: 1,
        driverId: "verstappen",
        teamId: "red-bull",
        status: "Finished",
        points: 25,
      },
      {
        position: 2,
        driverId: "reserve-driver",
        teamId: "audi",
        status: "Finished",
        points: 18,
      },
    ]);
    expect(generated.races[0].sprintResult).toEqual([
      {
        position: 1,
        driverId: "reserve-driver",
        teamId: "racing-bulls",
        status: "Finished",
        points: 8,
      },
    ]);
    expect(generated.races[1]).toMatchObject({
      round: 2,
      status: "upcoming",
      grandPrixResult: null,
      prediction: null,
      sprintPrediction: null,
    });
    expect(generated.drivers.find((driver) => driver.id === "reserve-driver")).toMatchObject({
      number: null,
      teamId: "racing-bulls",
    });
    expect(generated.drivers.map((driver) => driver.id)).not.toContain("fp-only-driver");
    expect(generated.drivers.map((driver) => driver.id)).not.toContain("unraced-existing");
    expect(generated.teams.find((team) => team.id === "red-bull")?.color).toBe("#3671C6");
    expect(generated.teams.find((team) => team.id === "audi")?.name).toBe("Audi");
  });

  it("derives race ids from API race names instead of preserving old round ids", () => {
    const generated = transformSourceData(
      {
        ...source,
        calendar: [
          {
            season: "2026",
            round: "1",
            raceName: "Australian Grand Prix",
            date: "2026-03-08",
            Circuit: { circuitName: "Albert Park Circuit" },
          },
        ],
        grandPrixResults: [],
        sprintResults: [],
      },
      {
        ...existing,
        races: [
          {
            id: "bahrain-2026",
            round: 1,
            name: "Bahrain Grand Prix",
            circuit: "Bahrain International Circuit",
            date: "2026-03-08",
            status: "upcoming",
            grandPrixResult: null,
            sprintResult: null,
            prediction: null,
            sprintPrediction: null,
          },
        ],
      },
      2026,
      "2026-07-05T00:00:00.000Z",
    );

    expect(generated.races[0].id).toBe("australian-2026");
    expect(generated.races[0].name).toBe("Australian Grand Prix");
  });

  it("preserves previous completed GP results when the source omits them", () => {
    const generated = transformSourceData(
      { ...source, grandPrixResults: [] },
      {
        ...existing,
        races: [
          {
            id: "bahrain-2026",
            round: 1,
            name: "Bahrain Grand Prix",
            circuit: "Bahrain International Circuit",
            date: "2026-03-08",
            status: "completed",
            grandPrixResult: [{ position: 1, driverId: "verstappen", teamId: "red-bull" }],
            sprintResult: null,
            prediction: null,
            sprintPrediction: null,
          },
        ],
      },
      2026,
      "2026-07-05T00:00:00.000Z",
    );

    expect(generated.races[0].grandPrixResult).toEqual([
      { position: 1, driverId: "verstappen", teamId: "red-bull" },
    ]);
    expect(generated.metadata.warnings[0]).toContain("Preserved previous round 1");
  });
});

describe("validateGeneratedData", () => {
  it("rejects duplicate official GP positions", () => {
    const generated = transformSourceData(source, existing, 2026, "2026-07-05T00:00:00.000Z");
    const invalid: GeneratedData = {
      ...generated,
      races: generated.races.map((race) =>
        race.round === 1
          ? {
              ...race,
              grandPrixResult: race.grandPrixResult?.map((entry) =>
                entry.position === 2 ? { ...entry, position: 1 } : entry,
              ) ?? null,
            }
          : race,
      ),
    };

    expect(() => validateGeneratedData(invalid)).toThrow(/Duplicate .* position/);
  });
});
