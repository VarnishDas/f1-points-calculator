import type { Driver } from "../types/driver";
import type { Race } from "../types/race";
import type { Team } from "../types/team";
import { getClassificationSize } from "../utils/classification";
import { sortRacesByRound } from "./raceUtils";
import PredictionCell from "./PredictionCell";

type PredictionBoardProps = {
  races: Race[];
  drivers: Driver[];
  teams: Team[];
};

type BoardColumn = {
  id: string;
  race: Race;
  session: "grandPrix" | "sprint";
};

export default function PredictionBoard({
  races,
  drivers,
  teams,
}: PredictionBoardProps) {
  const sortedRaces = sortRacesByRound(races);
  const columns = sortedRaces.flatMap((race): BoardColumn[] => {
    const raceColumn: BoardColumn = {
      id: `${race.id}:gp`,
      race,
      session: "grandPrix",
    };
    if (!race.hasSprint && !race.sprintResult?.length) return [raceColumn];
    return [
      raceColumn,
      {
        id: `${race.id}:sprint`,
        race,
        session: "sprint",
      },
    ];
  });
  const driverById = new Map(drivers.map((driver) => [driver.id, driver]));
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const classificationSize = getClassificationSize(races);

  return (
    <section className="flex min-w-0 flex-col rounded-md border border-white/10 bg-neutral-950/75 shadow-2xl shadow-black/25 lg:min-h-0 lg:flex-1">
      <div className="flex flex-col gap-2 border-b border-white/10 px-3 py-2.5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-neutral-100">
            Prediction Board
          </h2>
          <p className="text-xs text-neutral-500">
            Drag and drop drivers to build your season predictions
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
          <StatusLegend color="bg-emerald-500" label="Completed" />
          <StatusLegend color="bg-red-500" label="Predicted" />
          <StatusLegend color="bg-neutral-600" label="Upcoming" />
        </div>
      </div>

      <div className="custom-scrollbar overflow-x-auto p-2.5 lg:min-h-0 lg:flex-1 lg:overflow-auto">
        <div
          className="grid w-max gap-1"
          style={{
            gridTemplateColumns: `2rem repeat(${columns.length}, 5.5rem)`,
          }}
        >
          <div className="sticky left-0 z-20 rounded border border-white/[0.06] bg-neutral-950" />
          {columns.map(({ id, race, session }) => {
            const isSprint = session === "sprint";
            const prediction = isSprint ? race.sprintPrediction : race.prediction;
            const predicted = race.status === "upcoming" && !!prediction?.length;
            const completed = isSprint ? !!race.sprintResult?.length : race.status === "completed";
            return (
              <div
                key={id}
                className={
                  predicted
                    ? "rounded border border-red-500/50 bg-red-500/10 px-1 py-1.5 text-center"
                    : completed
                      ? "rounded border border-emerald-500/30 bg-emerald-500/10 px-1 py-1.5 text-center"
                      : "rounded border border-white/10 bg-white/[0.025] px-1 py-1.5 text-center"
                }
                title={isSprint ? `${race.name} Sprint` : race.name}
              >
                <div className="text-xs font-black text-neutral-100">
                  R{race.round}
                </div>
                <div className="mt-1 min-h-7 text-[10px] font-bold leading-tight text-neutral-400">
                  <span className="block truncate">{formatRaceLabel(race.name)}</span>
                  <span
                    className={`block uppercase tracking-wide ${isSprint ? "text-sky-300" : "text-neutral-600"}`}
                  >
                    {isSprint ? "Sprint" : "GP"}
                  </span>
                </div>
                <span
                  className={
                    predicted
                      ? "mx-auto mt-1 block h-1.5 w-1.5 rounded-full bg-red-500"
                      : completed
                        ? "mx-auto mt-1 block h-1.5 w-1.5 rounded-full bg-emerald-500"
                        : "mx-auto mt-1 block h-1.5 w-1.5 rounded-full bg-neutral-600"
                  }
                />
              </div>
            );
          })}

          {Array.from({ length: classificationSize }, (_, positionIndex) => (
            <BoardRow
              key={positionIndex}
              positionIndex={positionIndex}
              columns={columns}
              driverById={driverById}
              teamById={teamById}
            />
          ))}
        </div>
      </div>

    </section>
  );
}

type BoardRowProps = {
  positionIndex: number;
  columns: BoardColumn[];
  driverById: Map<string, Driver>;
  teamById: Map<string, Team>;
};

function BoardRow({ positionIndex, columns, driverById, teamById }: BoardRowProps) {
  return (
    <>
      <div className="sticky left-0 z-10 grid h-11 place-items-center rounded border border-white/[0.06] bg-neutral-950 text-xs tabular-nums text-neutral-300 lg:h-8">
        {positionIndex + 1}
      </div>
      {columns.map(({ id, race, session }) => {
        const isSprint = session === "sprint";
        const officialEntry =
          isSprint
            ? race.sprintResult?.find(
                (entry) => entry.position === positionIndex + 1,
              )
            : race.status === "completed"
              ? race.grandPrixResult?.find(
                (entry) => entry.position === positionIndex + 1,
              )
              : undefined;
        const prediction = isSprint ? race.sprintPrediction : race.prediction;
        const driverId = officialEntry?.driverId ?? prediction?.[positionIndex];
        const driver = driverId ? driverById.get(driverId) : undefined;
        const teamId = officialEntry?.teamId ?? driver?.teamId;
        const team = teamId ? teamById.get(teamId) : undefined;
        const isLocked =
          race.status === "completed" || (isSprint && !!race.sprintResult?.length);

        return (
          <PredictionCell
            key={`${id}-${positionIndex}`}
            raceId={race.id}
            session={session}
            positionIndex={positionIndex}
            driver={driver}
            team={team}
            editable={!isLocked}
          />
        );
      })}
    </>
  );
}

function StatusLegend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function formatRaceLabel(name: string): string {
  return name
    .replace(/\s+Grand Prix$/i, "")
    .replace(/^Great Britain$/i, "British")
    .replace(/^United States$/i, "US")
    .replace(/^Mexico City$/i, "Mexico")
    .replace(/^Saudi Arabian$/i, "Saudi")
    .replace(/^Emilia Romagna$/i, "Imola");
}
