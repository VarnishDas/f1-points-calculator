import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

import { z } from "zod";

import { APP_SEASON, DATA_SOURCE_BASE_URL } from "../src/config/season.js";
import type { Driver } from "../src/types/driver.js";
import type { EventResultEntry, Race } from "../src/types/race.js";
import type { Team } from "../src/types/team.js";
import { fetchJson, sleep, type FetchJsonOptions } from "./http.js";
import {
  driverSchema,
  driversFileSchema,
  eventResultEntrySchema,
  formatZodIssues,
  jolpicaResponseSchema,
  metadataFileSchema,
  raceSchema,
  racesFileSchema,
  teamSchema,
  teamsFileSchema,
  type JolpicaResponse,
  type SourceConstructor,
  type SourceDriver,
  type SourceDriverStanding,
  type SourceRace,
  type SourceResult,
} from "./schemas.js";

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
  driverStandings: SourceDriverStanding[];
};

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT_DIR, "src", "data");

const DEFAULT_TEAM_COLOR = "#737373";

export function normalizeSourceId(id: string): string {
  return id
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

type SourceIdResolver = (sourceId: string) => string;

function createDriverIdResolver(existingDrivers: readonly Driver[]): SourceIdResolver {
  const existingIdBySourceId = new Map(
    existingDrivers.flatMap((driver) =>
      driver.sourceId ? [[driver.sourceId, driver.id] as const] : [],
    ),
  );
  return (sourceId) => existingIdBySourceId.get(sourceId) ?? normalizeSourceId(sourceId);
}

function createTeamIdResolver(existingTeams: readonly Team[]): SourceIdResolver {
  const existingIdBySourceId = new Map(
    existingTeams.flatMap((team) =>
      team.sourceId ? [[team.sourceId, team.id] as const] : [],
    ),
  );
  return (sourceId) => existingIdBySourceId.get(sourceId) ?? normalizeSourceId(sourceId);
}

function sourceResultToEntry(
  result: SourceResult,
  resolveDriverId: SourceIdResolver,
  resolveTeamId: SourceIdResolver,
): EventResultEntry {
  const position = parseNumber(result.positionOrder) ?? parseNumber(result.position) ?? 0;
  const points = parseNumber(result.points);
  return {
    position,
    driverId: resolveDriverId(result.Driver.driverId),
    teamId: resolveTeamId(result.Constructor.constructorId),
    status: result.status,
    ...(points === undefined ? {} : { points }),
  };
}

function resultMapByRound(
  races: readonly SourceRace[],
  field: "Results" | "SprintResults",
  resolveDriverId: SourceIdResolver,
  resolveTeamId: SourceIdResolver,
) {
  const map = new Map<number, EventResultEntry[]>();
  for (const race of races) {
    const round = Number(race.round);
    const rawResults = race[field];
    if (!Number.isInteger(round) || !rawResults?.length) continue;
    map.set(
      round,
      rawResults
        .map((result) => sourceResultToEntry(result, resolveDriverId, resolveTeamId))
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

function collectTeamIdsFromRaces(races: readonly Race[]): Set<string> {
  const ids = new Set<string>();
  for (const race of races) {
    for (const entry of [...(race.grandPrixResult ?? []), ...(race.sprintResult ?? [])]) {
      ids.add(entry.teamId);
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
  resolveDriverId: SourceIdResolver,
  resolveTeamId: SourceIdResolver,
): Map<string, string> {
  const teamByDriver = new Map<string, string>();

  for (const standing of source.driverStandings) {
    const latestConstructor = standing.Constructors.at(-1);
    if (latestConstructor) {
      teamByDriver.set(
        resolveDriverId(standing.Driver.driverId),
        resolveTeamId(latestConstructor.constructorId),
      );
    }
  }

  const sessions = [
    ...source.sprintResults.map((race) => ({ race, sessionOrder: 0 })),
    ...source.grandPrixResults.map((race) => ({ race, sessionOrder: 1 })),
  ].sort(
    (a, b) =>
      Number(a.race.round) - Number(b.race.round) ||
      a.sessionOrder - b.sessionOrder,
  );
  for (const { race } of sessions) {
    for (const result of [...(race.Results ?? []), ...(race.SprintResults ?? [])]) {
      teamByDriver.set(
        resolveDriverId(result.Driver.driverId),
        resolveTeamId(result.Constructor.constructorId),
      );
    }
  }
  return teamByDriver;
}

function buildTeams(
  source: SourceData,
  existing: ExistingData,
  requiredTeamIds: ReadonlySet<string>,
  resolveTeamId: SourceIdResolver,
): Team[] {
  const existingById = new Map(existing.teams.map((team) => [team.id, team]));
  const constructors = [
    ...source.constructors,
    ...source.driverStandings.flatMap((standing) => standing.Constructors),
    ...collectConstructorsFromResults(source.grandPrixResults),
    ...collectConstructorsFromResults(source.sprintResults),
  ];
  const byId = new Map<string, Team>();

  for (const constructor of constructors) {
    const id = resolveTeamId(constructor.constructorId);
    const previous = existingById.get(id);
    byId.set(id, {
      id,
      sourceId: constructor.constructorId,
      name: previous?.name ?? constructor.name,
      fullName: previous?.fullName ?? constructor.name,
      color: previous?.color ?? DEFAULT_TEAM_COLOR,
    });
  }

  for (const id of requiredTeamIds) {
    if (byId.has(id)) continue;
    const previous = existingById.get(id);
    if (!previous) throw new Error(`Missing constructor details for ${id}`);
    byId.set(id, previous);
  }

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function buildDrivers(
  source: SourceData,
  existing: ExistingData,
  racedDriverIds: ReadonlySet<string>,
  resolveDriverId: SourceIdResolver,
  resolveTeamId: SourceIdResolver,
): Driver[] {
  const existingById = new Map(existing.drivers.map((driver) => [driver.id, driver]));
  const teamByDriver = latestTeamByDriver(source, resolveDriverId, resolveTeamId);
  const sourceDriverById = new Map<string, SourceDriver>();
  for (const sourceDriver of [
    ...source.drivers,
    ...source.driverStandings.map((standing) => standing.Driver),
    ...collectDriversFromResults(source.grandPrixResults),
    ...collectDriversFromResults(source.sprintResults),
  ]) {
    const id = resolveDriverId(sourceDriver.driverId);
    const previous = sourceDriverById.get(id);
    sourceDriverById.set(id, {
      ...previous,
      ...sourceDriver,
      permanentNumber:
        sourceDriver.permanentNumber ?? previous?.permanentNumber,
      code: sourceDriver.code?.trim() || previous?.code,
      nationality: sourceDriver.nationality ?? previous?.nationality,
    });
  }

  const requiredDriverIds = new Set([
    ...source.driverStandings.map((standing) =>
      resolveDriverId(standing.Driver.driverId),
    ),
    ...racedDriverIds,
  ]);

  const byId = new Map<string, Driver>();

  for (const id of requiredDriverIds) {
    const previous = existingById.get(id);
    const sourceDriver = sourceDriverById.get(id);
    if (!sourceDriver && !previous) {
      throw new Error(`Missing driver details for ${id}`);
    }

    const sourceId = sourceDriver?.driverId ?? previous?.sourceId ?? id;
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
      teamId: teamByDriver.get(id) ?? previous?.teamId ?? "unknown",
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
  resolveDriverId: SourceIdResolver,
  resolveTeamId: SourceIdResolver,
): Race[] {
  const previousById = new Map(existing.races.map((race) => [race.id, race]));
  const previousByRound = new Map(
    existing.races.map((race) => [race.round, race]),
  );
  const gpByRound = resultMapByRound(
    source.grandPrixResults,
    "Results",
    resolveDriverId,
    resolveTeamId,
  );
  const sprintByRound = resultMapByRound(
    source.sprintResults,
    "SprintResults",
    resolveDriverId,
    resolveTeamId,
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
  const resolveTeamId = createTeamIdResolver(existing.teams);
  const races = buildRaces(
    source,
    existing,
    season,
    warnings,
    resolveDriverId,
    resolveTeamId,
  );
  const teams = buildTeams(
    source,
    existing,
    collectTeamIdsFromRaces(races),
    resolveTeamId,
  );
  const drivers = buildDrivers(
    source,
    existing,
    collectDriverIdsFromRaces(races),
    resolveDriverId,
    resolveTeamId,
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

export function hasDataChanges(
  existing: ExistingData,
  generated: GeneratedData,
): boolean {
  return !isDeepStrictEqual(existing.drivers, generated.drivers) ||
    !isDeepStrictEqual(existing.teams, generated.teams) ||
    !isDeepStrictEqual(existing.races, generated.races);
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

  for (const driver of data.drivers) {
    if (!teamIds.has(driver.teamId)) {
      throw new Error(`${driver.id} references unknown team ${driver.teamId}`);
    }
  }

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

/**
 * Validates a raw API payload against the Jolpica response schema. Throws a
 * human-readable error listing every zod issue when validation fails.
 */
export function parseJolpicaResponse(data: unknown, url: string): JolpicaResponse {
  const parsed = jolpicaResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(
      `Invalid Jolpica API response from ${url}:\n${formatZodIssues(parsed.error)}`,
    );
  }
  return parsed.data;
}

async function fetchApiJson(url: string, options: FetchJsonOptions): Promise<JolpicaResponse> {
  return parseJolpicaResponse(await fetchJson(url, options), url);
}

function racesFromResponse(response: JolpicaResponse): SourceRace[] {
  return response.MRData?.RaceTable?.Races ?? [];
}

async function fetchSourceData(
  season: number,
  options: FetchJsonOptions = {},
): Promise<SourceData> {
  const [calendar, drivers, constructors, standings] = await Promise.all([
    fetchApiJson(`${DATA_SOURCE_BASE_URL}/${season}.json?limit=100`, options),
    fetchApiJson(`${DATA_SOURCE_BASE_URL}/${season}/drivers.json?limit=1000`, options),
    fetchApiJson(`${DATA_SOURCE_BASE_URL}/${season}/constructors.json?limit=1000`, options),
    fetchApiJson(`${DATA_SOURCE_BASE_URL}/${season}/driverstandings.json?limit=1000`, options),
  ]);
  const calendarRaces = racesFromResponse(calendar);
  const seasonDrivers = drivers.MRData?.DriverTable?.Drivers ?? [];
  const driverStandings =
    standings.MRData?.StandingsTable?.StandingsLists?.at(-1)?.DriverStandings ?? [];

  const grandPrixResults: JolpicaResponse[] = [];
  const sprintResults: JolpicaResponse[] = [];
  for (const race of calendarRaces) {
    grandPrixResults.push(
      await fetchApiJson(`${DATA_SOURCE_BASE_URL}/${season}/${race.round}/results.json`, options),
    );
    await sleep(100);
    if (race.Sprint) {
      sprintResults.push(
        await fetchApiJson(`${DATA_SOURCE_BASE_URL}/${season}/${race.round}/sprint.json`, options),
      );
      await sleep(250);
    }
  }

  return {
    calendar: calendarRaces,
    grandPrixResults: grandPrixResults.flatMap(racesFromResponse),
    sprintResults: sprintResults.flatMap(racesFromResponse),
    drivers: seasonDrivers,
    constructors: constructors.MRData?.ConstructorTable?.Constructors ?? [],
    driverStandings,
  };
}

async function readJsonFile<T>(fileName: string): Promise<T> {
  return JSON.parse(await readFile(path.join(DATA_DIR, fileName), "utf8")) as T;
}

async function readExistingData(): Promise<ExistingData> {
  return {
    drivers: await readJsonFile<Driver[]>("drivers.json"),
    teams: await readJsonFile<Team[]>("teams.json"),
    races: await readJsonFile<Race[]>("races.json"),
  };
}

type WriteStats = {
  bytes: number;
  durationMs: number;
};

/**
 * Writes JSON atomically: the payload goes to `<file>.tmp` first and is then
 * renamed over the target, so a crash never leaves a truncated file behind.
 */
async function writeJsonFile(fileName: string, value: unknown): Promise<WriteStats> {
  const startedAt = performance.now();
  const content = `${JSON.stringify(value, null, 2)}\n`;
  const filePath = path.join(DATA_DIR, fileName);
  const tmpPath = `${filePath}.tmp`;
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await writeFile(tmpPath, content, "utf8");
    await rename(tmpPath, filePath);
  } catch (error) {
    await rm(tmpPath, { force: true }).catch(() => {});
    throw error;
  }
  return {
    bytes: Buffer.byteLength(content, "utf8"),
    durationMs: performance.now() - startedAt,
  };
}

function describeValue(value: unknown): string {
  return Array.isArray(value) ? `${value.length} records` : "1 record";
}

async function writeGeneratedData(data: GeneratedData): Promise<void> {
  const startedAt = performance.now();
  const files: Array<[string, unknown]> = [
    ["drivers.json", data.drivers],
    ["teams.json", data.teams],
    ["races.json", data.races],
    ["metadata.json", data.metadata],
  ];
  for (const [fileName, value] of files) {
    const stats = await writeJsonFile(fileName, value);
    console.log(
      `Wrote ${fileName}: ${describeValue(value)}, ${stats.bytes} bytes, ${stats.durationMs.toFixed(0)} ms`,
    );
  }
  console.log(
    `Summary: updated ${files.length} files for ${data.metadata.season}: ` +
      `${data.drivers.length} drivers, ${data.teams.length} teams, ` +
      `${data.races.length} races in ${(performance.now() - startedAt).toFixed(0)} ms.`,
  );
}

async function writeMetadataOnly(metadata: UpdateMetadata): Promise<void> {
  const stats = await writeJsonFile("metadata.json", metadata);
  console.log(
    `Wrote metadata.json: 1 record, ${stats.bytes} bytes, ${stats.durationMs.toFixed(0)} ms`,
  );
}

const DATA_FILES: Array<{ fileName: string; schema: z.ZodType }> = [
  { fileName: "drivers.json", schema: driversFileSchema },
  { fileName: "teams.json", schema: teamsFileSchema },
  { fileName: "races.json", schema: racesFileSchema },
  { fileName: "metadata.json", schema: metadataFileSchema },
];

/**
 * Validates the existing src/data/*.json files against the output schemas.
 * Reports per-file pass/fail and returns the number of invalid files.
 * Performs no network access.
 */
export async function validateDataFiles(): Promise<number> {
  let failed = 0;
  for (const { fileName, schema } of DATA_FILES) {
    const startedAt = performance.now();
    try {
      const raw = await readFile(path.join(DATA_DIR, fileName), "utf8");
      const parsed = schema.safeParse(JSON.parse(raw));
      const durationMs = (performance.now() - startedAt).toFixed(0);
      if (parsed.success) {
        console.log(
          `${fileName}: PASS (${describeValue(parsed.data)}, ${Buffer.byteLength(raw, "utf8")} bytes, ${durationMs} ms)`,
        );
      } else {
        failed += 1;
        console.error(`${fileName}: FAIL`);
        console.error(formatZodIssues(parsed.error));
      }
    } catch (error) {
      failed += 1;
      console.error(
        `${fileName}: FAIL (${error instanceof Error ? error.message : String(error)})`,
      );
    }
  }
  console.log(
    failed === 0
      ? `Validation summary: ${DATA_FILES.length}/${DATA_FILES.length} files valid.`
      : `Validation summary: ${DATA_FILES.length - failed}/${DATA_FILES.length} files valid, ${failed} failed.`,
  );
  return failed;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--validate")) {
    const failed = await validateDataFiles();
    if (failed > 0) process.exitCode = 1;
    return;
  }

  const dryRun = args.includes("--dry-run");
  const existing = await readExistingData();
  const source = await fetchSourceData(APP_SEASON);
  const generated = transformSourceData(source, existing, APP_SEASON);
  const calendarChanges = getCalendarChanges(existing.races, generated.races);
  const dataChanged = hasDataChanges(existing, generated);

  console.log(
    calendarChanges.length
      ? `Calendar check found ${calendarChanges.length} change(s): ${calendarChanges.join("; ")}`
      : "Calendar check found no changes.",
  );

  if (dryRun) {
    console.log(
      `Dry run OK (${dataChanged ? "changes found" : "no changes"}): ${generated.drivers.length} drivers, ${generated.teams.length} teams, ${generated.races.length} races.`,
    );
    for (const warning of generated.metadata.warnings) console.warn(warning);
    return;
  }

  if (dataChanged) {
    await writeGeneratedData(generated);
    console.log(
      `Updated data files: ${generated.drivers.length} drivers, ${generated.teams.length} teams, ${generated.races.length} races.`,
    );
  } else {
    // Still stamp metadata so "data as of" reflects the last successful API sync.
    await writeMetadataOnly(generated.metadata);
    console.log(
      "No driver, team, or race changes found; refreshed metadata.generatedAt from live API.",
    );
  }
  for (const warning of generated.metadata.warnings) console.warn(warning);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
