import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { z } from "zod";

import { APP_SEASON, DATA_SOURCE_BASE_URL } from "../src/config/season";
import type { Driver } from "../src/types/driver";
import type { EventResultEntry, Race } from "../src/types/race";
import type { Team } from "../src/types/team";

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

const DRIVER_ID_ALIASES: Record<string, string> = {
  max_verstappen: "verstappen",
  oscar_piastri: "piastri",
  charles_leclerc: "leclerc",
  lewis_hamilton: "hamilton",
  george_russell: "russell",
  kimi_antonelli: "antonelli",
  andrea_kimi_antonelli: "antonelli",
  fernando_alonso: "alonso",
  lance_stroll: "stroll",
  pierre_gasly: "gasly",
  jack_doohan: "doohan",
  carlos_sainz: "sainz",
  alexander_albon: "albon",
  alex_albon: "albon",
  liam_lawson: "lawson",
  isack_hadjar: "hadjar",
  esteban_ocon: "ocon",
  oliver_bearman: "bearman",
  nico_hulkenberg: "hulkenberg",
  gabriel_bortoleto: "bortoleto",
  lando_norris: "norris",
  yuki_tsunoda: "tsunoda",
};

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
});

export function normalizeSourceId(id: string): string {
  return id
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeDriverId(sourceId: string): string {
  return DRIVER_ID_ALIASES[sourceId] ?? normalizeSourceId(sourceId);
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

function sourceResultToEntry(result: SourceResult): EventResultEntry {
  const position = parseNumber(result.positionOrder) ?? parseNumber(result.position) ?? 0;
  const points = parseNumber(result.points);
  return {
    position,
    driverId: normalizeDriverId(result.Driver.driverId),
    teamId: normalizeTeamId(result.Constructor.constructorId),
    status: result.status,
    ...(points === undefined ? {} : { points }),
  };
}

function resultMapByRound(races: readonly SourceRace[], field: "Results" | "SprintResults") {
  const map = new Map<number, EventResultEntry[]>();
  for (const race of races) {
    const round = Number(race.round);
    const rawResults = race[field];
    if (!Number.isInteger(round) || !rawResults?.length) continue;
    map.set(round, rawResults.map(sourceResultToEntry).sort((a, b) => a.position - b.position));
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

function latestTeamByDriver(source: SourceData): Map<string, string> {
  const teamByDriver = new Map<string, string>();
  const races = [...source.grandPrixResults, ...source.sprintResults].sort(
    (a, b) => Number(a.round) - Number(b.round),
  );
  for (const race of races) {
    for (const result of [...(race.Results ?? []), ...(race.SprintResults ?? [])]) {
      teamByDriver.set(
        normalizeDriverId(result.Driver.driverId),
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
): Driver[] {
  const existingById = new Map(existing.drivers.map((driver) => [driver.id, driver]));
  const teamByDriver = latestTeamByDriver(source);
  const sourceDrivers = [
    ...collectDriversFromResults(source.grandPrixResults),
    ...collectDriversFromResults(source.sprintResults),
  ];
  const byId = new Map<string, Driver>();

  for (const sourceDriver of sourceDrivers) {
    const id = normalizeDriverId(sourceDriver.driverId);
    if (!racedDriverIds.has(id)) continue;
    const previous = existingById.get(id);
    const number = parseNumber(sourceDriver.permanentNumber) ?? previous?.number ?? null;
    byId.set(id, {
      id,
      sourceId: sourceDriver.driverId,
      number,
      code: previous?.code ?? sourceDriver.code ?? id.slice(0, 3).toUpperCase(),
      firstName: previous?.firstName ?? sourceDriver.givenName,
      lastName: previous?.lastName ?? sourceDriver.familyName,
      teamId: teamByDriver.get(id) ?? previous?.teamId ?? "unknown",
      country: previous?.country ?? countryCode(sourceDriver.nationality),
    });
  }

  for (const driver of existing.drivers) {
    if (racedDriverIds.has(driver.id) && !byId.has(driver.id)) {
      byId.set(driver.id, driver);
    }
  }

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function buildRaces(
  source: SourceData,
  existing: ExistingData,
  season: number,
  warnings: string[],
): Race[] {
  const previousById = new Map(existing.races.map((race) => [race.id, race]));
  const gpByRound = resultMapByRound(source.grandPrixResults, "Results");
  const sprintByRound = resultMapByRound(source.sprintResults, "SprintResults");

  return source.calendar
    .map((sourceRace) => {
      const round = Number(sourceRace.round);
      const id = raceIdFromName(sourceRace.raceName, season);
      const previous = previousById.get(id);
      let grandPrixResult = gpByRound.get(round) ?? null;
      const sprintResult = sprintByRound.get(round) ?? null;

      if (!grandPrixResult && previous?.status === "completed" && previous.grandPrixResult) {
        warnings.push(
          `Preserved previous round ${round} GP result because the source omitted it.`,
        );
        grandPrixResult = previous.grandPrixResult;
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
  const warnings: string[] = [];
  const teams = buildTeams(source, existing);
  const races = buildRaces(source, existing, season, warnings);
  const drivers = buildDrivers(source, existing, collectDriverIdsFromRaces(races));

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
