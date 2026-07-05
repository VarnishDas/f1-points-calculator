import type { PredictionSessionType, Race } from "../types/race";

export function isPredictionSessionEditable(
  race: Race,
  session: PredictionSessionType,
): boolean {
  if (race.status !== "upcoming") return false;
  if (session === "sprint" && !race.hasSprint) return false;
  if (session === "sprint" && race.sprintResult?.length) return false;
  return true;
}
