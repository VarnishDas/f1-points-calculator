import type { PredictionSessionType, Race } from "../types/race";

export function getInitialMobileRaceId(
  races: readonly Race[],
): string | undefined {
  return races.find((race) => race.status === "upcoming")?.id ?? races.at(-1)?.id;
}

export function getDefaultMobileSession(
  race: Race,
): PredictionSessionType {
  if (race.sprintResult?.length) return "grandPrix";

  return race.hasSprint ||
    race.sprintPrediction?.length
    ? "sprint"
    : "grandPrix";
}

export function hasMobileSprintSession(race: Race): boolean {
  return !!(
    race.hasSprint ||
    race.sprintResult?.length ||
    race.sprintPrediction?.length
  );
}
