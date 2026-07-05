import type { Driver } from "../types/driver";
import type { Race } from "../types/race";
import type { Team } from "../types/team";
import { RACE_CLASSIFICATION_SIZE } from "../constants/race";
import { sortRacesByRound } from "./raceUtils";
import PredictionCell from "./PredictionCell";

const RACE_LABELS: Record<string, string> = {
  "bahrain-2026": "BHR",
  "saudi-arabia-2026": "SAU",
  "australia-2026": "AUS",
  "japan-2026": "JPN",
  "china-2026": "CHN",
  "miami-2026": "MIA",
  "emilia-romagna-2026": "EMI",
  "monaco-2026": "MON",
  "canada-2026": "CAN",
  "spain-2026": "ESP",
  "austria-2026": "AUT",
  "great-britain-2026": "GBR",
};

type PredictionBoardProps = {
  races: Race[];
  drivers: Driver[];
  teams: Team[];
  onClear: () => void;
  onAutoFill: () => void;
};

export default function PredictionBoard({
  races,
  drivers,
  teams,
  onClear,
  onAutoFill,
}: PredictionBoardProps) {
  const sortedRaces = sortRacesByRound(races);
  const driverById = new Map(drivers.map((driver) => [driver.id, driver]));
  const teamById = new Map(teams.map((team) => [team.id, team]));

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
            gridTemplateColumns: `2rem repeat(${sortedRaces.length}, 4rem)`,
          }}
        >
          <div className="sticky left-0 z-20 rounded border border-white/[0.06] bg-neutral-950" />
          {sortedRaces.map((race) => {
            const predicted = race.status === "upcoming" && !!race.result?.length;
            return (
              <div
                key={race.id}
                className={
                  predicted
                    ? "rounded border border-red-500/50 bg-red-500/10 px-1 py-1.5 text-center"
                    : race.status === "completed"
                      ? "rounded border border-emerald-500/30 bg-emerald-500/10 px-1 py-1.5 text-center"
                      : "rounded border border-white/10 bg-white/[0.025] px-1 py-1.5 text-center"
                }
                title={race.name}
              >
                <div className="text-xs font-black text-neutral-100">
                  R{race.round}
                </div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                  {RACE_LABELS[race.id] ?? race.name.slice(0, 3)}
                </div>
                <span
                  className={
                    predicted
                      ? "mx-auto mt-1 block h-1.5 w-1.5 rounded-full bg-red-500"
                      : race.status === "completed"
                        ? "mx-auto mt-1 block h-1.5 w-1.5 rounded-full bg-emerald-500"
                        : "mx-auto mt-1 block h-1.5 w-1.5 rounded-full bg-neutral-600"
                  }
                />
              </div>
            );
          })}

          {Array.from({ length: RACE_CLASSIFICATION_SIZE }, (_, positionIndex) => (
            <BoardRow
              key={positionIndex}
              positionIndex={positionIndex}
              races={sortedRaces}
              driverById={driverById}
              teamById={teamById}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-neutral-500">
          Empty upcoming cells are ignored until a driver is assigned.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClear}
            className="h-9 rounded-md border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-neutral-300 transition hover:border-white/20 hover:bg-white/[0.07]"
          >
            Clear Board
          </button>
          <button
            type="button"
            onClick={onAutoFill}
            className="h-9 rounded-md border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-neutral-300 transition hover:border-white/20 hover:bg-white/[0.07]"
          >
            Auto Fill
          </button>
        </div>
      </div>
    </section>
  );
}

type BoardRowProps = {
  positionIndex: number;
  races: Race[];
  driverById: Map<string, Driver>;
  teamById: Map<string, Team>;
};

function BoardRow({ positionIndex, races, driverById, teamById }: BoardRowProps) {
  return (
    <>
      <div className="sticky left-0 z-10 grid h-8 place-items-center rounded border border-white/[0.06] bg-neutral-950 text-xs tabular-nums text-neutral-300">
        {positionIndex + 1}
      </div>
      {races.map((race) => {
        const driverId = race.result?.[positionIndex];
        const driver = driverId ? driverById.get(driverId) : undefined;
        const team = driver ? teamById.get(driver.teamId) : undefined;

        return (
          <PredictionCell
            key={`${race.id}-${positionIndex}`}
            raceId={race.id}
            positionIndex={positionIndex}
            driver={driver}
            team={team}
            editable={race.status === "upcoming"}
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
