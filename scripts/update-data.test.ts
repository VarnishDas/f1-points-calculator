import { describe, expect, it } from "vitest";

import {
  getCalendarChanges,
  normalizeSourceId,
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
      id: "legacy-team",
      sourceId: "legacy_team",
      name: "Legacy Team",
      fullName: "Legacy Team",
      color: "#111111",
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
          Constructor: { constructorId: "newcomer", name: "Newcomer Racing" },
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
    { constructorId: "newcomer", name: "Newcomer Racing" },
  ],
  driverStandings: [
    {
      Driver: {
        driverId: "max_verstappen",
        permanentNumber: "1",
        code: "VER",
        givenName: "Max",
        familyName: "Verstappen",
        nationality: "Dutch",
      },
      Constructors: [{ constructorId: "red_bull", name: "Red Bull" }],
    },
  ],
  driverConstructorHistory: [
    {
      driverId: "fp_only_driver",
      Constructors: [{ constructorId: "red_bull", name: "Red Bull" }],
    },
  ],
};

describe("update-data identifiers", () => {
  it("normalizes source ids without driver or team aliases", () => {
    expect(normalizeSourceId("new_reserve_driver")).toBe("new-reserve-driver");
    expect(normalizeSourceId("new_constructor")).toBe("new-constructor");
    expect(normalizeSourceId("sauber")).toBe("sauber");
  });
});

describe("transformSourceData", () => {
  it("derives new drivers and teams from standings and results", () => {
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
        teamId: "newcomer",
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
      code: "RES",
      teamId: "newcomer",
    });
    expect(generated.drivers.find((driver) => driver.id === "fp-only-driver")).toMatchObject({
      code: "Only",
      teamId: "red-bull",
    });
    expect(generated.drivers.map((driver) => driver.id)).not.toContain("unraced-existing");
    expect(generated.teams.find((team) => team.id === "red-bull")?.color).toBe("#3671C6");
    expect(generated.teams.find((team) => team.id === "newcomer")).toMatchObject({
      name: "Newcomer Racing",
      color: "#737373",
    });
    expect(generated.teams.map((team) => team.id)).not.toContain("legacy-team");
  });

  it("uses a driver's last name when Jolpica has no reliable code", () => {
    const generated = transformSourceData(
      source,
      existing,
      2026,
      "2026-07-05T00:00:00.000Z",
    );

    expect(generated.drivers.find((driver) => driver.id === "fp-only-driver")?.code)
      .toBe("Only");
  });

  it("tracks a mid-season replacement's latest team without changing old results", () => {
    const replacement = {
      driverId: "replacement_driver",
      code: "REP",
      givenName: "Replacement",
      familyName: "Driver",
      nationality: "British",
    };
    const generated = transformSourceData(
      {
        ...source,
        calendar: source.calendar.map((race) => ({ ...race, Sprint: undefined })),
        drivers: [replacement],
        constructors: [
          { constructorId: "old_team", name: "Old Team" },
          { constructorId: "new_team", name: "New Team" },
        ],
        driverStandings: [
          {
            Driver: replacement,
            Constructors: [
              { constructorId: "old_team", name: "Old Team" },
              { constructorId: "new_team", name: "New Team" },
            ],
          },
        ],
        driverConstructorHistory: [],
        grandPrixResults: source.calendar.map((race, index) => ({
          ...race,
          Results: [
            {
              position: "1",
              positionOrder: "1",
              Driver: replacement,
              Constructor: index === 0
                ? { constructorId: "old_team", name: "Old Team" }
                : { constructorId: "new_team", name: "New Team" },
            },
          ],
        })),
        sprintResults: [],
      },
      { drivers: [], teams: [], races: [] },
      2026,
      "2026-07-05T00:00:00.000Z",
    );

    expect(generated.drivers[0]).toMatchObject({
      id: "replacement-driver",
      teamId: "new-team",
    });
    expect(generated.races[0].grandPrixResult?.[0].teamId).toBe("old-team");
    expect(generated.races[1].grandPrixResult?.[0].teamId).toBe("new-team");
    expect(generated.teams.map((team) => team.id)).toEqual(["new-team", "old-team"]);
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

  it("preserves drivers and teams referenced only by a retained official result", () => {
    const historicalDriver = {
      id: "historical-driver",
      sourceId: "historical_driver",
      number: null,
      code: "Historical",
      firstName: "Historical",
      lastName: "Driver",
      teamId: "legacy-team",
      country: "Unknown",
    };
    const generated = transformSourceData(
      { ...source, grandPrixResults: [], sprintResults: [] },
      {
        ...existing,
        drivers: [...existing.drivers, historicalDriver],
        races: [
          {
            id: "bahrain-2026",
            round: 1,
            name: "Bahrain Grand Prix",
            circuit: "Bahrain International Circuit",
            date: "2026-03-08",
            status: "completed",
            grandPrixResult: [
              { position: 1, driverId: "historical-driver", teamId: "legacy-team" },
            ],
            sprintResult: null,
            prediction: null,
            sprintPrediction: null,
          },
        ],
      },
      2026,
      "2026-07-05T00:00:00.000Z",
    );

    expect(generated.drivers.find((driver) => driver.id === "historical-driver"))
      .toMatchObject({ ...historicalDriver, code: "Driver" });
    expect(generated.teams.find((team) => team.id === "legacy-team")?.name)
      .toBe("Legacy Team");
  });

  it("preserves previous Sprint results when the source omits them", () => {
    const previousSprint = [
      { position: 1, driverId: "verstappen", teamId: "red-bull", points: 8 },
    ];
    const generated = transformSourceData(
      { ...source, sprintResults: [] },
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
            hasSprint: true,
            grandPrixResult: [
              { position: 1, driverId: "verstappen", teamId: "red-bull" },
            ],
            sprintResult: previousSprint,
            prediction: null,
            sprintPrediction: null,
          },
        ],
      },
      2026,
      "2026-07-05T00:00:00.000Z",
    );

    expect(generated.races[0].sprintResult).toEqual(previousSprint);
    expect(generated.metadata.warnings).toContainEqual(
      expect.stringContaining("Preserved previous round 1 Sprint result"),
    );
  });

  it("rejects an empty calendar response instead of deleting the calendar", () => {
    expect(() =>
      transformSourceData(
        { ...source, calendar: [] },
        existing,
        2026,
        "2026-07-05T00:00:00.000Z",
      ),
    ).toThrow(/Calendar check returned no races/);
  });
});

describe("getCalendarChanges", () => {
  it("reports additions, removals, and schedule-field changes", () => {
    const previous = transformSourceData(
      source,
      existing,
      2026,
      "2026-07-05T00:00:00.000Z",
    ).races;
    const next = previous
      .filter((race) => race.round !== 2)
      .map((race) =>
        race.round === 1
          ? { ...race, date: "2026-03-09", hasSprint: false }
          : race,
      );
    next.push({
      id: "australian-2026",
      round: 3,
      name: "Australian Grand Prix",
      circuit: "Albert Park Circuit",
      date: "2026-03-22",
      status: "upcoming",
      grandPrixResult: null,
      sprintResult: null,
      prediction: null,
      sprintPrediction: null,
    });

    expect(getCalendarChanges(previous, next)).toEqual([
      "Updated round 1: date, hasSprint",
      "Added round 3: Australian Grand Prix",
      "Removed round 2: Saudi Arabian Grand Prix",
    ]);
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
