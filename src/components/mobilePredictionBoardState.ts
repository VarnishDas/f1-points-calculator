import type { Race } from "../types/race";

export function getInitialMobileRaceId(
  races: readonly Race[],
): string | undefined {
  return races.find((race) => race.status === "upcoming")?.id ?? races.at(-1)?.id;
}
