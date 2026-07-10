import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { z } from "zod";

import { APP_SEASON, DATA_SOURCE_BASE_URL } from "../src/config/season.js";
import type { ActiveDriver, Driver } from "../src/types/driver.js";
import type { EventResultEntry, Race } from "../src/types/race.js";
import type { Team } from "../src/types/team.js";

type SourceConstructor = {
  constructorId: string;
  name: string;
  nationality?: string;
};

type SourceDriver = {
  driverId: string;
  permanentNumber?: string;
  code?: string;
  givenName: string;
  familyName: string;
  nationality?: string;
};

type SourceResult = {
  position?: string;
  positionOrder?: string;
  points?: string;
  status?: string;
  Driver: SourceDriver;
  Constructor: SourceConstructor;
};

type SourceRace = {
  season: string;
  round: string;
  raceName: string;
  date: string;
  Circuit: {
    circuitName: string;
  };
  Sprint?: unknown;
  Results?: SourceResult[];
  SprintResults?: SourceResult[];
};

type JolpicaResponse = {
  MRData?: {
    RaceTable?: {
      Races?: SourceRace[];
    };
    DriverTable?: {
      Drivers?: SourceDriver[];
    };
    ConstructorTable?: {
      Constructors?: SourceConstructor[];
    };
  };
};

export type UpdateMetadata = {
  season: number;
  source: string;
  generatedAt: string;
  warnings: string[];
};

export type GeneratedData = {
  drivers: Driver[];
  teams: Team[];
  races: Race[];
  metadata: UpdateMetadata;
};

export type ExistingData = {
  activeDrivers: ActiveDriver[];
  drivers: Driver[];
  teams: Team[];
  races: Race[];
};

export type SourceData = {
  calendar: SourceRace[];
  grandPrixResults: SourceRace[];
  sprintResults: SourceRace[];
  drivers: SourceDriver[];
  constructors: SourceConstructor[];
};

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT_DIR, "src", "data");

const TEAM_ID_ALIASES: Record<string, string> = {
  red_bull: "red-bull",
  rb: "racing-bulls",
  racing_bulls: "racing-bulls",
  sauber: "audi",
  kick_sauber: "audi",
};

const DEFAULT_TEAM_COLOR = "#737373";

const eventResultEntrySchema = z.object({
  position: z.number().int().positive(),
  driverId: z.string().min(1),
  teamId: z.string().min(1),
  status: z.string().optional(),
  points: z.number().optional(),
});

const driverSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().optional(),
  number: z.number().int().nullable(),
  code: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  teamId: z.string().min(1),
  country: z.string().min(1),
});

const activeDriverSchema = z.object({
  sourceId: z.string().min(1),
  teamId: z.string().min(1),
});

const teamSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().optional(),
  name: z.string().min(1),
  fullName: z.string().min(1),
  color: z.string().min(1),
});

const raceSchema = z.object({
  id: z.string().min(1),
  round: z.number().int().positive(),
  name: z.string().min(1),
  circuit: z.string().min(1),
  date: z.string().min(1),
  status: z.union([z.literal("completed"), z.literal("upcoming")]),
  hasSprint: z.boolean().optional(),
  grandPrixResult: z.array(eventResultEntrySchema).nullable(),
  sprintResult: z.array(eventResultEntrySchema).nullable().optional(),
  prediction: z.null(),
  sprintPrediction: z.null(),
});

export function normalizeSourceId(id: string): string {
  return id
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeTeamId(sourceId: string): string {
  return TEAM_ID_ALIASES[sourceId] ?? normalizeSourceId(sourceId);
}

function parseNumber(value: string | undefined): number | undefined {
  if (value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function countryCode(nationality: string | undefined): string {
  return nationality?.trim() || "Unknown";
}

function raceIdFromName(name: string, season: number): string {
  return `${normalizeSourceId(name.replace(/\bGrand Prix\b/i, "").trim())}-${season}`;
}

type DriverIdResolver = (sourceId: string) => string;

function createDriverIdResolver(existingDrivers: readonly Driver[]): DriverIdResolver {
  const existingIdBySourceId = new Map(
    existingDrivers.flatMap((driver) =>
      driver.sourceId ? [[driver.sourceId, driver.id] as const] : [],
    ),
  );
  return (sourceId) => existingIdBySourceId.get(sourceId) ?? normalizeSourceId(sourceId);
}

function sourceResultToEntry(
  result: SourceResult,
  resolveDriverId: DriverIdResolver,
): EventResultEntry {
  const position = parseNumber(result.positionOrder) ?? parseNumber(result.position) ?? 0;
  const points = parseNumber(result.points);
  return {
    position,
    driverId: resolveDriverId(result.Driver.driverId),
    teamId: normalizeTeamId(result.Constructor.constructorId),
    status: result.status,
    ...(points === undefined ? {} : { points }),
  };
}

function resultMapByRound(
  races: readonly SourceRace[],
  field: "Results" | "SprintResults",
  resolveDriverId: DriverIdResolver,
) {
  const map = new Map<number, EventResultEntry[]>();
  for (const race of races) {
    const round = Number(race.round);
    const rawResults = race[field];
    if (!Number.isInteger(round) || !rawResults?.length) continue;
    map.set(
      round,
      rawResults
        .map((result) => sourceResultToEntry(result, resolveDriverId))
        .sort((a, b) => a.position - b.position),
    );
  }
  return map;
}

function collectDriversFromResults(races: readonly SourceRace[]): SourceDriver[] {
  const byId = new Map<string, SourceDriver>();
  for (const race of races) {
    for (const result of [...(race.Results ?? []), ...(race.SprintResults ?? [])]) {
      byId.set(result.Driver.driverId, result.Driver);
    }
  }
  return [...byId.values()];
}

function collectDriverIdsFromRaces(races: readonly Race[]): Set<string> {
  const ids = new Set<string>();
  for (const race of races) {
    for (const entry of [...(race.grandPrixResult ?? []), ...(race.sprintResult ?? [])]) {
      ids.add(entry.driverId);
    }
  }
  return ids;
}

function collectConstructorsFromResults(races: readonly SourceRace[]): SourceConstructor[] {
  const byId = new Map<string, SourceConstructor>();
  for (const race of races) {
    for (const result of [...(race.Results ?? []), ...(race.SprintResults ?? [])]) {
      byId.set(result.Constructor.constructorId, result.Constructor);
    }
  }
  return [...byId.values()];
}

function latestTeamByDriver(
  source: SourceData,
  resolveDriverId: DriverIdResolver,
): Map<string, string> {
  const teamByDriver = new Map<string, string>();
  const races = [...source.grandPrixResults, ...source.sprintResults].sort(
    (a, b) => Number(a.round) - Number(b.round),
  );
  for (const race of races) {
    for (const result of [...(race.Results ?? []), ...(race.SprintResults ?? [])]) {
      teamByDriver.set(
        resolveDriverId(result.Driver.driverId),
        normalizeTeamId(result.Constructor.constructorId),
      );
    }
  }
  return teamByDriver;
}

function buildTeams(source: SourceData, existing: ExistingData): Team[] {
  const existingById = new Map(existing.teams.map((team) => [team.id, team]));
  const constructors = [...source.constructors, ...collectConstructorsFromResults(source.grandPrixResults), ...collectConstructorsFromResults(source.sprintResults)];
  const byId = new Map<string, Team>();

  for (const constructor of constructors) {
    const id = normalizeTeamId(constructor.constructorId);
    const previous = existingById.get(id);
    byId.set(id, {
      id,
      sourceId: constructor.constructorId,
      name: previous?.name ?? constructor.name,
      fullName: previous?.fullName ?? constructor.name,
      color: previous?.color ?? DEFAULT_TEAM_COLOR,
    });
  }

  for (const team of existing.teams) {
    if (!byId.has(team.id)) byId.set(team.id, team);
  }

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function buildDrivers(
  source: SourceData,
  existing: ExistingData,
  racedDriverIds: ReadonlySet<string>,
  resolveDriverId: DriverIdResolver,
): Driver[] {
  const existingById = new Map(existing.drivers.map((driver) => [driver.id, driver]));
  const activeBySourceId = new Map(
    existing.activeDrivers.map((driver) => [driver.sourceId, driver]),
  );
  const teamByDriver = latestTeamByDriver(source, resolveDriverId);
  const sourceDriverById = new Map<string, SourceDriver>();
  for (const sourceDriver of [
    ...source.drivers,
    ...collectDriversFromResults(source.grandPrixResults),
    ...collectDriversFromResults(source.sprintResults),
  ]) {
    sourceDriverById.set(resolveDriverId(sourceDriver.driverId), sourceDriver);
  }

  const requiredDriverIds = new Set(racedDriverIds);
  for (const activeDriver of existing.activeDrivers) {
    requiredDriverIds.add(resolveDriverId(activeDriver.sourceId));
  }

  const byId = new Map<string, Driver>();

  for (const id of requiredDriverIds) {
    const previous = existingById.get(id);
    const sourceDriver = sourceDriverById.get(id);
    if (!sourceDriver && !previous) {
      throw new Error(`Missing driver details for ${id}`);
    }

    const sourceId = sourceDriver?.driverId ?? previous?.sourceId ?? id;
    const activeDriver = activeBySourceId.get(sourceId);
    const firstName = sourceDriver?.givenName ?? previous?.firstName ?? id;
    const lastName = sourceDriver?.familyName ?? previous?.lastName ?? id;
    const reliableCode = sourceDriver?.code?.trim();
    const code = reliableCode && /^[A-Za-z]{3}$/.test(reliableCode)
      ? reliableCode.toUpperCase()
      : lastName;
    const sourceCountry = countryCode(sourceDriver?.nationality);

    byId.set(id, {
      id,
      sourceId,
      number:
        parseNumber(sourceDriver?.permanentNumber) ?? previous?.number ?? null,
      code,
      firstName,
      lastName,
      teamId:
        activeDriver?.teamId ??
        teamByDriver.get(id) ??
        previous?.teamId ??
        "unknown",
      country: sourceCountry === "Unknown"
        ? previous?.country ?? "Unknown"
        : sourceCountry,
    });
  }

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function buildRaces(
  source: SourceData,
  existing: ExistingData,
  season: number,
  warnings: string[],
  resolveDriverId: DriverIdResolver,
): Race[] {
  const previousById = new Map(existing.races.map((race) => [race.id, race]));
  const previousByRound = new Map(
    existing.races.map((race) => [race.round, race]),
  );
  const gpByRound = resultMapByRound(
    source.grandPrixResults,
    "Results",
    resolveDriverId,
  );
  const sprintByRound = resultMapByRound(
    source.sprintResults,
    "SprintResults",
    resolveDriverId,
  );

  return source.calendar
    .map((sourceRace) => {
      const round = Number(sourceRace.round);
      const id = raceIdFromName(sourceRace.raceName, season);
      const previous = previousById.get(id) ?? previousByRound.get(round);
      let grandPrixResult = gpByRound.get(round) ?? null;
      let sprintResult = sprintByRound.get(round) ?? null;

      if (!grandPrixResult && previous?.status === "completed" && previous.grandPrixResult) {
        warnings.push(
          `Preserved previous round ${round} GP result because the source omitted it.`,
        );
        grandPrixResult = previous.grandPrixResult;
      }
      if (!sprintResult && previous?.sprintResult?.length) {
        warnings.push(
          `Preserved previous round ${round} Sprint result because the source omitted it.`,
        );
        sprintResult = previous.sprintResult;
      }

      return {
        id,
        round,
        name: sourceRace.raceName,
        circuit: sourceRace.Circuit.circuitName,
        date: sourceRace.date,
        status: grandPrixResult ? "completed" : "upcoming",
        hasSprint: Boolean(sourceRace.Sprint) || Boolean(sprintResult?.length),
        grandPrixResult,
        sprintResult,
        prediction: null,
        sprintPrediction: null,
      } satisfies Race;
    })
    .sort((a, b) => a.round - b.round);
}

export function transformSourceData(
  source: SourceData,
  existing: ExistingData,
  season = APP_SEASON,
  generatedAt = new Date().toISOString(),
): GeneratedData {
  if (source.calendar.length === 0) {
    throw new Error("Calendar check returned no races; generated data was not changed.");
  }

  const warnings: string[] = [];
  const resolveDriverId = createDriverIdResolver(existing.drivers);
  const teams = buildTeams(source, existing);
  validateActiveDrivers(existing.activeDrivers, teams, source, existing.drivers);
  const races = buildRaces(
    source,
    existing,
    season,
    warnings,
    resolveDriverId,
  );
  const drivers = buildDrivers(
    source,
    existing,
    collectDriverIdsFromRaces(races),
    resolveDriverId,
  );

  const generated = {
    drivers,
    teams,
    races,
    metadata: {
      season,
      source: DATA_SOURCE_BASE_URL,
      generatedAt,
      warnings,
    },
  };

  validateGeneratedData(generated);
  return generated;
}

function assertUnique(values: readonly string[] | readonly number[], label: string): void {
  const seen = new Set<string | number>();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`Duplicate ${label}: ${value}`);
    seen.add(value);
  }
}

export function validateActiveDrivers(
  activeDrivers: readonly ActiveDriver[],
  teams: readonly Team[],
  source: SourceData,
  existingDrivers: readonly Driver[],
): void {
  z.array(activeDriverSchema).parse(activeDrivers);
  assertUnique(activeDrivers.map((driver) => driver.sourceId), "active driver source id");

  const teamIds = new Set(teams.map((team) => team.id));
  const knownSourceIds = new Set([
    ...source.drivers.map((driver) => driver.driverId),
    ...collectDriversFromResults(source.grandPrixResults).map(
      (driver) => driver.driverId,
    ),
    ...collectDriversFromResults(source.sprintResults).map(
      (driver) => driver.driverId,
    ),
    ...existingDrivers.flatMap((driver) =>
      driver.sourceId ? [driver.sourceId] : [],
    ),
  ]);

  for (const activeDriver of activeDrivers) {
    if (!teamIds.has(activeDriver.teamId)) {
      throw new Error(
        `Active driver ${activeDriver.sourceId} references unknown team ${activeDriver.teamId}`,
      );
    }
    if (!knownSourceIds.has(activeDriver.sourceId)) {
      throw new Error(`Active driver source id is unknown: ${activeDriver.sourceId}`);
    }
  }
}

export function getCalendarChanges(
  previousRaces: readonly Race[],
  nextRaces: readonly Race[],
): string[] {
  const previousByRound = new Map(
    previousRaces.map((race) => [race.round, race]),
  );
  const nextByRound = new Map(nextRaces.map((race) => [race.round, race]));
  const changes: string[] = [];

  for (const race of nextRaces) {
    const previous = previousByRound.get(race.round);
    if (!previous) {
      changes.push(`Added round ${race.round}: ${race.name}`);
      continue;
    }

    const changedFields = (["name", "date", "circuit", "hasSprint"] as const)
      .filter((field) => previous[field] !== race[field]);
    if (changedFields.length) {
      changes.push(`Updated round ${race.round}: ${changedFields.join(", ")}`);
    }
  }

  for (const race of previousRaces) {
    if (!nextByRound.has(race.round)) {
      changes.push(`Removed round ${race.round}: ${race.name}`);
    }
  }

  return changes;
}

function validateResult(
  result: readonly EventResultEntry[] | null | undefined,
  raceId: string,
  session: string,
  driverIds: ReadonlySet<string>,
  teamIds: ReadonlySet<string>,
): void {
  if (!result) return;
  z.array(eventResultEntrySchema).parse(result);
  assertUnique(result.map((entry) => entry.driverId), `${raceId} ${session} driver`);
  assertUnique(result.map((entry) => entry.position), `${raceId} ${session} position`);

  for (const entry of result) {
    if (!driverIds.has(entry.driverId)) {
      throw new Error(`${raceId} ${session} references unknown driver ${entry.driverId}`);
    }
    if (!teamIds.has(entry.teamId)) {
      throw new Error(`${raceId} ${session} references unknown team ${entry.teamId}`);
    }
  }
}

export function validateGeneratedData(data: GeneratedData): void {
  z.array(driverSchema).parse(data.drivers);
  z.array(teamSchema).parse(data.teams);
  z.array(raceSchema).parse(data.races);

  assertUnique(data.drivers.map((driver) => driver.id), "driver id");
  assertUnique(data.teams.map((team) => team.id), "team id");
  assertUnique(data.races.map((race) => race.id), "race id");
  assertUnique(data.races.map((race) => race.round), "race round");

  const driverIds = new Set(data.drivers.map((driver) => driver.id));
  const teamIds = new Set(data.teams.map((team) => team.id));

  for (const race of data.races) {
    if (race.prediction !== null) {
      throw new Error(`${race.id} generated data must have prediction: null`);
    }
    if (race.sprintPrediction !== null) {
      throw new Error(`${race.id} generated data must have sprintPrediction: null`);
    }
    if (race.status === "completed" && !race.grandPrixResult?.length) {
      throw new Error(`${race.id} is completed but has no official GP result`);
    }
    if (race.status === "upcoming" && race.grandPrixResult?.length) {
      throw new Error(`${race.id} is upcoming but has an official GP result`);
    }
    validateResult(race.grandPrixResult, race.id, "GP", driverIds, teamIds);
    validateResult(race.sprintResult, race.id, "sprint", driverIds, teamIds);
  }
}

async function fetchJson(url: string): Promise<JolpicaResponse> {
  const maxAttempts = 6;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(url);
    if (response.ok) {
      return (await response.json()) as JolpicaResponse;
    }

    if (
      attempt < maxAttempts &&
      (response.status === 429 || response.status >= 500)
    ) {
      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfter = retryAfterHeader === null ? NaN : Number(retryAfterHeader);
      const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : attempt * 2500;
      await sleep(delayMs);
      continue;
    }

    throw new Error(`Fetch failed ${response.status} ${response.statusText}: ${url}`);
  }

  throw new Error(`Fetch failed after retries: ${url}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function racesFromResponse(response: JolpicaResponse): SourceRace[] {
  return response.MRData?.RaceTable?.Races ?? [];
}

async function fetchSourceData(season: number): Promise<SourceData> {
  const [calendar, drivers, constructors] = await Promise.all([
    fetchJson(`${DATA_SOURCE_BASE_URL}/${season}.json?limit=100`),
    fetchJson(`${DATA_SOURCE_BASE_URL}/${season}/drivers.json?limit=1000`),
    fetchJson(`${DATA_SOURCE_BASE_URL}/${season}/constructors.json?limit=1000`),
  ]);
  const calendarRaces = racesFromResponse(calendar);

  const grandPrixResults: JolpicaResponse[] = [];
  const sprintResults: JolpicaResponse[] = [];
  for (const race of calendarRaces) {
    grandPrixResults.push(
      await fetchJson(`${DATA_SOURCE_BASE_URL}/${season}/${race.round}/results.json`),
    );
    await sleep(100);
    if (race.Sprint) {
      sprintResults.push(
        await fetchJson(`${DATA_SOURCE_BASE_URL}/${season}/${race.round}/sprint.json`),
      );
      await sleep(250);
    }
  }

  return {
    calendar: calendarRaces,
    grandPrixResults: grandPrixResults.flatMap(racesFromResponse),
    sprintResults: sprintResults.flatMap(racesFromResponse),
    drivers: drivers.MRData?.DriverTable?.Drivers ?? [],
    constructors: constructors.MRData?.ConstructorTable?.Constructors ?? [],
  };
}

async function readJsonFile<T>(fileName: string): Promise<T> {
  return JSON.parse(await readFile(path.join(DATA_DIR, fileName), "utf8")) as T;
}

async function readExistingData(): Promise<ExistingData> {
  return {
    activeDrivers: await readJsonFile<ActiveDriver[]>("active-drivers.json"),
    drivers: await readJsonFile<Driver[]>("drivers.json"),
    teams: await readJsonFile<Team[]>("teams.json"),
    races: await readJsonFile<Race[]>("races.json"),
  };
}

async function writeJsonFile(fileName: string, value: unknown): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(path.join(DATA_DIR, fileName), `${JSON.stringify(value, null, 2)}\n`);
}

async function writeGeneratedData(data: GeneratedData): Promise<void> {
  await writeJsonFile("drivers.json", data.drivers);
  await writeJsonFile("teams.json", data.teams);
  await writeJsonFile("races.json", data.races);
  await writeJsonFile("metadata.json", data.metadata);
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const existing = await readExistingData();
  const source = await fetchSourceData(APP_SEASON);
  const generated = transformSourceData(source, existing, APP_SEASON);
  const calendarChanges = getCalendarChanges(existing.races, generated.races);

  console.log(
    calendarChanges.length
      ? `Calendar check found ${calendarChanges.length} change(s): ${calendarChanges.join("; ")}`
      : "Calendar check found no changes.",
  );

  if (dryRun) {
    console.log(
      `Dry run OK: ${generated.drivers.length} drivers, ${generated.teams.length} teams, ${generated.races.length} races.`,
    );
    for (const warning of generated.metadata.warnings) console.warn(warning);
    return;
  }

  await writeGeneratedData(generated);
  console.log(
    `Updated data for ${APP_SEASON}: ${generated.drivers.length} drivers, ${generated.teams.length} teams, ${generated.races.length} races.`,
  );
  for (const warning of generated.metadata.warnings) console.warn(warning);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
