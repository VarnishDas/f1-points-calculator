import { describe, expect, it } from "vitest";

import { fetchJson, type FetchLike } from "./http.js";
import {
  driversFileSchema,
  formatZodIssues,
  jolpicaResponseSchema,
  metadataFileSchema,
  racesFileSchema,
  teamsFileSchema,
} from "./schemas.js";
import {
  getCalendarChanges,
  hasDataChanges,
  normalizeSourceId,
  parseJolpicaResponse,
  transformSourceData,
  validateDataFiles,
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
    expect(generated.races[0]?.grandPrixResult).toEqual([
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
    expect(generated.races[0]?.sprintResult).toEqual([
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
      code: "Driver",
      teamId: "newcomer",
    });
    expect(generated.drivers.map((driver) => driver.id)).not.toContain("fp-only-driver");
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

    expect(generated.drivers.find((driver) => driver.id === "reserve-driver")?.code)
      .toBe("Driver");
    expect(generated.drivers.find((driver) => driver.id === "verstappen")?.code)
      .toBe("VER");
  });

  it("does not admit practice-only drivers from the season driver endpoint", () => {
    const generated = transformSourceData(
      source,
      existing,
      2026,
      "2026-07-05T00:00:00.000Z",
    );

    expect(generated.drivers.map((driver) => driver.id)).not.toContain("fp-only-driver");
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
    expect(generated.races[0]?.grandPrixResult?.[0]?.teamId).toBe("old-team");
    expect(generated.races[1]?.grandPrixResult?.[0]?.teamId).toBe("new-team");
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

    expect(generated.races[0]?.id).toBe("australian-2026");
    expect(generated.races[0]?.name).toBe("Australian Grand Prix");
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

    expect(generated.races[0]?.grandPrixResult).toEqual([
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

    expect(generated.races[0]?.sprintResult).toEqual(previousSprint);
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

describe("hasDataChanges", () => {
  it("ignores metadata-only changes", () => {
    const generated = transformSourceData(
      source,
      existing,
      2026,
      "2026-07-05T00:00:00.000Z",
    );
    const matchingExisting: ExistingData = {
      drivers: generated.drivers,
      teams: generated.teams,
      races: generated.races,
    };

    expect(hasDataChanges(matchingExisting, {
      ...generated,
      metadata: {
        ...generated.metadata,
        generatedAt: "2026-07-06T00:00:00.000Z",
      },
    })).toBe(false);
  });

  it("detects driver, team, and race changes", () => {
    const generated = transformSourceData(
      source,
      existing,
      2026,
      "2026-07-05T00:00:00.000Z",
    );
    const matchingExisting: ExistingData = {
      drivers: generated.drivers,
      teams: generated.teams,
      races: generated.races,
    };

    expect(hasDataChanges(matchingExisting, {
      ...generated,
      drivers: generated.drivers.map((driver, index) =>
        index === 0 ? { ...driver, number: 99 } : driver,
      ),
    })).toBe(true);
    expect(hasDataChanges(matchingExisting, {
      ...generated,
      teams: generated.teams.map((team, index) =>
        index === 0 ? { ...team, name: "Updated team" } : team,
      ),
    })).toBe(true);
    expect(hasDataChanges(matchingExisting, {
      ...generated,
      races: generated.races.map((race, index) =>
        index === 0 ? { ...race, date: "2026-03-09" } : race,
      ),
    })).toBe(true);
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

const validApiPayload = {
  MRData: {
    xmlns: "http://ergast.com/mrd/1.5",
    limit: "100",
    offset: "0",
    total: "2",
    RaceTable: {
      season: "2026",
      Races: [
        {
          ...source.calendar[0],
          url: "https://en.wikipedia.org/wiki/2026_Bahrain_Grand_Prix",
          Circuit: {
            ...source.calendar[0].Circuit,
            Location: {
              lat: "26.0325",
              long: "50.5106",
              locality: "Sakhir",
              country: "Bahrain",
            },
          },
          Results: [
            {
              number: "1",
              position: "1",
              positionText: "1",
              points: "25",
              status: "Finished",
              Driver: {
                ...source.drivers[0],
                url: "https://example.com/driver",
                dateOfBirth: "1997-09-30",
              },
              Constructor: { ...source.constructors[0], nationality: "Austrian" },
              Time: { millis: "5555555", time: "1:32:36.275" },
              FastestLap: { rank: "1", lap: "42" },
            },
          ],
        },
      ],
    },
    DriverTable: { Drivers: source.drivers },
    ConstructorTable: { Constructors: source.constructors },
    StandingsTable: {
      StandingsLists: [
        { season: "2026", round: "1", DriverStandings: source.driverStandings },
      ],
    },
  },
};

describe("jolpicaResponseSchema", () => {
  it("accepts a realistic API payload and strips undeclared keys", () => {
    const parsed = jolpicaResponseSchema.safeParse(validApiPayload);

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const mrData = parsed.data.MRData;
    expect(mrData).toBeDefined();
    expect("xmlns" in (mrData ?? {})).toBe(false);
    const race = mrData?.RaceTable?.Races[0];
    expect(race?.raceName).toBe("Bahrain Grand Prix");
    expect(race?.Sprint).toEqual({});
    expect("url" in (race ?? {})).toBe(false);
    expect("Location" in (race?.Circuit ?? {})).toBe(false);
    const result = race?.Results?.[0];
    expect(result?.Driver.driverId).toBe("max_verstappen");
    expect("FastestLap" in (result ?? {})).toBe(false);
    expect(mrData?.StandingsTable?.StandingsLists[0].DriverStandings).toHaveLength(1);
  });

  it("rejects payloads with wrongly typed or missing fields", () => {
    const badRound = structuredClone(validApiPayload);
    Object.assign(badRound.MRData.RaceTable.Races[0], { round: 1 });
    expect(jolpicaResponseSchema.safeParse(badRound).success).toBe(false);

    const noDriver = structuredClone(validApiPayload);
    delete (noDriver.MRData.RaceTable.Races[0].Results as Array<Record<string, unknown>>)[0]
      .Driver;
    expect(jolpicaResponseSchema.safeParse(noDriver).success).toBe(false);

    const noCircuit = structuredClone(validApiPayload);
    delete (noCircuit.MRData.RaceTable.Races[0] as { Circuit?: unknown }).Circuit;
    expect(jolpicaResponseSchema.safeParse(noCircuit).success).toBe(false);

    const emptyDriverId = structuredClone(validApiPayload);
    emptyDriverId.MRData.DriverTable.Drivers[0].driverId = "";
    expect(jolpicaResponseSchema.safeParse(emptyDriverId).success).toBe(false);
  });
});

describe("parseJolpicaResponse", () => {
  it("returns validated data for a valid payload", () => {
    const parsed = parseJolpicaResponse(validApiPayload, "https://example.com/f1/2026.json");
    expect(parsed.MRData?.RaceTable?.Races).toHaveLength(1);
  });

  it("throws a human-readable error summarizing zod issues", () => {
    const badRound = structuredClone(validApiPayload);
    Object.assign(badRound.MRData.RaceTable.Races[0], { round: 1 });

    let message = "";
    try {
      parseJolpicaResponse(badRound, "https://example.com/f1/2026.json");
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain("Invalid Jolpica API response from https://example.com/f1/2026.json");
    expect(message).toContain("MRData.RaceTable.Races.0.round");
  });
});

describe("output file schemas", () => {
  const validDriver = {
    id: "verstappen",
    sourceId: "max_verstappen",
    number: 1,
    code: "VER",
    firstName: "Max",
    lastName: "Verstappen",
    teamId: "red-bull",
    country: "Dutch",
  };
  const validTeam = {
    id: "red-bull",
    sourceId: "red_bull",
    name: "Red Bull Racing",
    fullName: "Oracle Red Bull Racing",
    color: "#3671C6",
  };
  const validRace = {
    id: "bahrain-2026",
    round: 1,
    name: "Bahrain Grand Prix",
    circuit: "Bahrain International Circuit",
    date: "2026-03-08",
    status: "completed",
    hasSprint: true,
    grandPrixResult: [
      { position: 1, driverId: "verstappen", teamId: "red-bull", status: "Finished", points: 25 },
    ],
    sprintResult: null,
    prediction: null,
    sprintPrediction: null,
  };
  const validMetadata = {
    season: 2026,
    source: "https://api.jolpi.ca/ergast/f1",
    generatedAt: "2026-07-05T00:00:00.000Z",
    warnings: [],
  };

  it("accepts valid output files", () => {
    expect(driversFileSchema.safeParse([validDriver]).success).toBe(true);
    expect(teamsFileSchema.safeParse([validTeam]).success).toBe(true);
    expect(racesFileSchema.safeParse([validRace]).success).toBe(true);
    expect(metadataFileSchema.safeParse(validMetadata).success).toBe(true);
  });

  it("rejects invalid drivers", () => {
    expect(driversFileSchema.safeParse([{ ...validDriver, number: "1" }]).success).toBe(false);
    expect(driversFileSchema.safeParse([{ ...validDriver, code: "" }]).success).toBe(false);
    expect(driversFileSchema.safeParse([{ ...validDriver, teamId: undefined }]).success).toBe(false);
  });

  it("rejects invalid teams", () => {
    expect(teamsFileSchema.safeParse([{ ...validTeam, color: 12 }]).success).toBe(false);
    expect(teamsFileSchema.safeParse([{ ...validTeam, fullName: undefined }]).success).toBe(false);
  });

  it("rejects invalid races", () => {
    expect(racesFileSchema.safeParse([{ ...validRace, status: "live" }]).success).toBe(false);
    expect(racesFileSchema.safeParse([{ ...validRace, round: 0 }]).success).toBe(false);
    expect(racesFileSchema.safeParse([{ ...validRace, prediction: ["verstappen"] }]).success)
      .toBe(false);
    expect(
      racesFileSchema.safeParse([
        {
          ...validRace,
          grandPrixResult: [{ position: 1.5, driverId: "verstappen", teamId: "red-bull" }],
        },
      ]).success,
    ).toBe(false);
  });

  it("rejects invalid metadata", () => {
    expect(metadataFileSchema.safeParse({ ...validMetadata, warnings: undefined }).success)
      .toBe(false);
    expect(metadataFileSchema.safeParse({ ...validMetadata, season: "2026" }).success)
      .toBe(false);
  });
});

describe("formatZodIssues", () => {
  it("renders one indented line per issue with a dotted path", () => {
    const parsed = racesFileSchema.safeParse([{ round: 0 }]);
    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    const lines = formatZodIssues(parsed.error).split("\n");
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((line) => line.startsWith("  - "))).toBe(true);
    expect(lines.some((line) => line.includes("0.round"))).toBe(true);
  });
});

describe("fetchJson", () => {
  const url = "https://example.com/data.json";
  const okResponse = (data: unknown) =>
    new Response(JSON.stringify(data), { status: 200 });

  function recorder() {
    const calls: string[] = [];
    const delays: number[] = [];
    const sleep = async (ms: number) => {
      delays.push(ms);
    };
    return { calls, delays, sleep };
  }

  it("returns parsed JSON on first success and passes an abort signal", async () => {
    const { calls, delays, sleep } = recorder();
    let seenSignal: AbortSignal | undefined;
    const fetchImpl: FetchLike = async (requestedUrl, init) => {
      calls.push(requestedUrl);
      seenSignal = init?.signal ?? undefined;
      return okResponse({ ok: true });
    };

    await expect(fetchJson(url, { fetchImpl, sleep })).resolves.toEqual({ ok: true });
    expect(calls).toEqual([url]);
    expect(delays).toEqual([]);
    expect(seenSignal).toBeInstanceOf(AbortSignal);
    expect(seenSignal?.aborted).toBe(false);
  });

  it("retries retryable statuses with exponential backoff", async () => {
    const { calls, delays, sleep } = recorder();
    const fetchImpl: FetchLike = async (requestedUrl) => {
      calls.push(requestedUrl);
      return calls.length < 3
        ? new Response("server error", { status: 500 })
        : okResponse({ retried: true });
    };

    await expect(fetchJson(url, { fetchImpl, sleep })).resolves.toEqual({ retried: true });
    expect(calls).toHaveLength(3);
    expect(delays).toEqual([500, 1000]);
  });

  it("honors the retry-after header on 429 responses", async () => {
    const { calls, delays, sleep } = recorder();
    const fetchImpl: FetchLike = async (requestedUrl) => {
      calls.push(requestedUrl);
      return calls.length === 1
        ? new Response("rate limited", { status: 429, headers: { "retry-after": "2" } })
        : okResponse({ ok: true });
    };

    await expect(fetchJson(url, { fetchImpl, sleep })).resolves.toEqual({ ok: true });
    expect(delays).toEqual([2000]);
  });

  it("uses custom backoff settings when provided", async () => {
    const { calls, delays, sleep } = recorder();
    const fetchImpl: FetchLike = async (requestedUrl) => {
      calls.push(requestedUrl);
      return calls.length < 3
        ? new Response("bad gateway", { status: 502 })
        : okResponse({ ok: true });
    };

    await expect(
      fetchJson(url, { fetchImpl, sleep, baseDelayMs: 100, backoffFactor: 3 }),
    ).resolves.toEqual({ ok: true });
    expect(delays).toEqual([100, 300]);
  });

  it("does not retry non-retryable statuses", async () => {
    const { calls, delays, sleep } = recorder();
    const fetchImpl: FetchLike = async (requestedUrl) => {
      calls.push(requestedUrl);
      return new Response("not found", { status: 404, statusText: "Not Found" });
    };

    await expect(fetchJson(url, { fetchImpl, sleep })).rejects.toThrow(/404 Not Found/);
    expect(calls).toHaveLength(1);
    expect(delays).toEqual([]);
  });

  it("retries network errors and gives up after maxAttempts", async () => {
    const { calls, delays, sleep } = recorder();
    const fetchImpl: FetchLike = async (requestedUrl) => {
      calls.push(requestedUrl);
      throw new TypeError("socket hang up");
    };

    await expect(fetchJson(url, { fetchImpl, sleep })).rejects.toThrow(
      /Fetch failed after 3 attempts.*socket hang up/,
    );
    expect(calls).toHaveLength(3);
    expect(delays).toEqual([500, 1000]);
  });

  it("aborts requests that exceed the timeout", async () => {
    const hangingFetch: FetchLike = (_requestedUrl, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation timed out.", "TimeoutError"));
        });
      });

    await expect(
      fetchJson(url, { fetchImpl: hangingFetch, sleep: async () => {}, timeoutMs: 10, maxAttempts: 1 }),
    ).rejects.toThrow(/Fetch failed after 1 attempts/);
  });
});

describe("validateDataFiles", () => {
  it("passes the committed src/data files without network access", async () => {
    await expect(validateDataFiles()).resolves.toBe(0);
  });
});
