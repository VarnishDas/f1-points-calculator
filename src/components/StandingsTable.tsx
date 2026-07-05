import type { Driver } from "../types/driver";
import type { Team } from "../types/team";
import type { DriverStanding } from "../types/standings";

type StandingsTableProps = {
  standings: DriverStanding[];
  drivers: Driver[];
  teams: Team[];
};

export default function StandingsTable({
  standings,
  drivers,
  teams,
}: StandingsTableProps) {
  const driverById = new Map(drivers.map((d) => [d.id, d]));
  const teamById = new Map(teams.map((t) => [t.id, t]));

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900/40">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-800 text-left text-neutral-400">
            <th className="py-2 px-3 w-12 text-right font-medium">Pos</th>
            <th className="py-2 px-3 font-medium">Driver</th>
            <th className="py-2 px-3 hidden sm:table-cell font-medium">Code</th>
            <th className="py-2 px-3 hidden md:table-cell font-medium">Team</th>
            <th className="py-2 px-3 text-right font-medium">Points</th>
            <th className="py-2 px-3 text-right font-medium">Wins</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row, index) => {
            const driver = driverById.get(row.driverId);
            const team = driver ? teamById.get(driver.teamId) : undefined;
            const zebra = index % 2 === 1 ? "bg-neutral-900/50" : "";

            return (
              <tr
                key={row.driverId}
                className={`border-b border-neutral-800/60 last:border-b-0 ${zebra}`}
              >
                <td className="py-2 px-3 text-right tabular-nums text-neutral-300">
                  {row.position}
                </td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    {team && (
                      <span
                        aria-hidden="true"
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: team.color }}
                      />
                    )}
                    <span className="text-white">
                      {driver
                        ? `${driver.firstName} ${driver.lastName}`
                        : row.driverId}
                    </span>
                  </div>
                </td>
                <td className="py-2 px-3 hidden sm:table-cell text-neutral-400 tabular-nums">
                  {driver?.code ?? "—"}
                </td>
                <td className="py-2 px-3 hidden md:table-cell text-neutral-400">
                  {team?.name ?? "—"}
                </td>
                <td className="py-2 px-3 text-right tabular-nums font-semibold text-white">
                  {row.points}
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-neutral-300">
                  {row.wins}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
