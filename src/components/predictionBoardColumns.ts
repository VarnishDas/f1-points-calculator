import type { PredictionSessionType, Race } from "../types/race";
import { isPredictionSessionEditable } from "../utils/predictionSession";

export type BoardColumn = {
  id: string;
  race: Race;
  session: PredictionSessionType;
  isEditable: boolean;
};

export function buildBoardColumns(races: readonly Race[]): BoardColumn[] {
  const columns = [...races]
    .sort((a, b) => a.round - b.round)
    .flatMap((race): BoardColumn[] => {
      const grandPrix = createBoardColumn(race, "grandPrix");
      if (!race.hasSprint && !race.sprintResult?.length) return [grandPrix];
      return [createBoardColumn(race, "sprint"), grandPrix];
    });

  return columns;
}

export function getInitialBoardColumnId(
  columns: readonly BoardColumn[],
): string | undefined {
  return findLatestCompletedColumn(columns)?.id ?? columns[0]?.id;
}

function findLatestCompletedColumn(
  columns: readonly BoardColumn[],
): BoardColumn | undefined {
  let latest: BoardColumn | undefined;

  for (const column of columns) {
    if (!isBoardColumnCompleted(column)) continue;
    if (
      !latest ||
      column.race.round > latest.race.round ||
      (column.race.round === latest.race.round &&
        column.session === "grandPrix")
    ) {
      latest = column;
    }
  }

  return latest;
}

function isBoardColumnCompleted(column: BoardColumn): boolean {
  return column.session === "grandPrix"
    ? column.race.status === "completed"
    : !!column.race.sprintResult?.length;
}

function createBoardColumn(
  race: Race,
  session: PredictionSessionType,
): BoardColumn {
  return {
    id: `${race.id}:${session === "grandPrix" ? "gp" : "sprint"}`,
    race,
    session,
    isEditable: isPredictionSessionEditable(race, session),
  };
}
