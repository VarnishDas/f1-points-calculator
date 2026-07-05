import type { Race } from "../types/race";
import type { Driver } from "../types/driver";
import type { Team } from "../types/team";
import { calculateRacePoints } from "../engine/calculateRacePoints";

type RaceCardProps = {
  race: Race;
  drivers: Driver[];
  teams: Team[];
};

export default function RaceCard({ race, drivers, teams }: RaceCardProps) {
  const driverById = new Map(drivers.map((d) => [d.id, d]));
  const teamById = new Map(teams.map((t) => [t.id, t]));

  const result = race.status === "completed" ? race.result : null;
  const isCompleted = result !== null;
  const pointsByDriver = calculateRacePoints(result);

  return (
    <article
      className={
        isCompleted
          ? "flex flex-col rounded-xl border border-neutral-800 bg-neutral-900/40"
          : "flex flex-col rounded-xl border border-neutral-800/70 bg-neutral-900/20"
      }
    >
      <header className="flex items-start justify-between gap-3 border-b border-neutral-800 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium tabular-nums text-neutral-500">
              R{race.round}
            </span>
            <h3 className="truncate text-sm font-semibold text-white">
              {race.name}
            </h3>
          </div>
          <p className="mt-0.5 truncate text-xs text-neutral-400">
            {race.circuit} · {race.date}
          </p>
        </div>
        {isCompleted ? (
          <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
            Completed
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
            Upcoming
          </span>
        )}
      </header>

      {result ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <tbody>
              {result.map((driverId, index) => {
                const position = index + 1;
                const driver = driverById.get(driverId);
                const team = driver ? teamById.get(driver.teamId) : undefined;
                const pts = pointsByDriver[driverId] ?? 0;

                return (
                  <tr
                    key={driverId}
                    className="border-b border-neutral-800/40 last:border-b-0"
                  >
                    <td className="w-10 py-1.5 pl-4 pr-2 text-right tabular-nums text-neutral-400">
                      {position}
                    </td>
                    <td className="py-1.5 pr-2">
                      <div className="flex items-center gap-2">
                        {team && (
                          <span
                            aria-hidden="true"
                            className="inline-block h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: team.color }}
                          />
                        )}
                        <span className="truncate text-white">
                          {driver
                            ? `${driver.firstName} ${driver.lastName}`
                            : driverId}
                        </span>
                      </div>
                    </td>
                    <td className="hidden py-1.5 pr-2 text-neutral-500 tabular-nums sm:table-cell">
                      {driver?.code ?? "—"}
                    </td>
                    <td className="w-12 py-1.5 pl-2 pr-4 text-right tabular-nums text-neutral-300">
                      {pts > 0 ? pts : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 px-4 py-8 text-center">
          <p className="text-sm font-medium text-neutral-300">Prediction pending</p>
          <p className="text-xs text-neutral-500">
            Drag-and-drop predictions coming soon.
          </p>
        </div>
      )}
    </article>
  );
}
