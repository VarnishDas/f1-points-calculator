import { z } from "zod";

/**
 * Zod schemas for the Jolpica-F1 (Ergast-compatible) API payloads consumed by
 * the update script, and for the generated src/data/*.json output files.
 *
 * API schemas intentionally declare only the fields the pipeline reads; zod
 * strips undeclared keys, so extra API fields are ignored.
 */

export const sourceConstructorSchema = z.object({
  constructorId: z.string().min(1),
  name: z.string().min(1),
  nationality: z.string().optional(),
});

export const sourceDriverSchema = z.object({
  driverId: z.string().min(1),
  permanentNumber: z.string().optional(),
  code: z.string().optional(),
  givenName: z.string(),
  familyName: z.string(),
  nationality: z.string().optional(),
});

export const sourceResultSchema = z.object({
  position: z.string().optional(),
  positionOrder: z.string().optional(),
  points: z.string().optional(),
  status: z.string().optional(),
  Driver: sourceDriverSchema,
  Constructor: sourceConstructorSchema,
});

export const sourceRaceSchema = z.object({
  season: z.string(),
  round: z.string(),
  raceName: z.string().min(1),
  date: z.string().min(1),
  Circuit: z.object({
    circuitName: z.string().min(1),
  }),
  Sprint: z.unknown().optional(),
  Results: z.array(sourceResultSchema).optional(),
  SprintResults: z.array(sourceResultSchema).optional(),
});

export const sourceDriverStandingSchema = z.object({
  Driver: sourceDriverSchema,
  Constructors: z.array(sourceConstructorSchema),
});

export const jolpicaResponseSchema = z.object({
  MRData: z
    .object({
      RaceTable: z
        .object({
          Races: z.array(sourceRaceSchema),
        })
        .optional(),
      DriverTable: z
        .object({
          Drivers: z.array(sourceDriverSchema),
        })
        .optional(),
      ConstructorTable: z
        .object({
          Constructors: z.array(sourceConstructorSchema),
        })
        .optional(),
      StandingsTable: z
        .object({
          StandingsLists: z.array(
            z.object({
              DriverStandings: z.array(sourceDriverStandingSchema).optional(),
            }),
          ),
        })
        .optional(),
    })
    .optional(),
});

export type SourceConstructor = z.infer<typeof sourceConstructorSchema>;
export type SourceDriver = z.infer<typeof sourceDriverSchema>;
export type SourceResult = z.infer<typeof sourceResultSchema>;
export type SourceRace = z.infer<typeof sourceRaceSchema>;
export type SourceDriverStanding = z.infer<typeof sourceDriverStandingSchema>;
export type JolpicaResponse = z.infer<typeof jolpicaResponseSchema>;

export const eventResultEntrySchema = z.object({
  position: z.number().int().positive(),
  driverId: z.string().min(1),
  teamId: z.string().min(1),
  status: z.string().optional(),
  points: z.number().optional(),
});

export const driverSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().optional(),
  number: z.number().int().nullable(),
  code: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  teamId: z.string().min(1),
  country: z.string().min(1),
});

export const teamSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().optional(),
  name: z.string().min(1),
  fullName: z.string().min(1),
  color: z.string().min(1),
});

export const raceSchema = z.object({
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

export const metadataSchema = z.object({
  season: z.number().int(),
  source: z.string().min(1),
  generatedAt: z.string().min(1),
  warnings: z.array(z.string()),
});

export const driversFileSchema = z.array(driverSchema);
export const teamsFileSchema = z.array(teamSchema);
export const racesFileSchema = z.array(raceSchema);
export const metadataFileSchema = metadataSchema;

/**
 * Renders zod issues as indented human-readable lines, e.g.
 * "  - MRData.RaceTable.Races.0.round: expected string, received number".
 */
export function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.map(String).join(".") : "(root)";
      return `  - ${path}: ${issue.message}`;
    })
    .join("\n");
}
