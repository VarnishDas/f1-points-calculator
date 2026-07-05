import type { Team } from "../types/team";
import type { TeamStanding } from "../types/standings";

type TeamStandingsTableProps = {
  standings: TeamStanding[];
  teams: Team[];
};

export default function TeamStandingsTable({
  standings,
  teams,
}: TeamStandingsTableProps) {
  const teamById = new Map(teams.map((t) => [t.id, t]));

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900/40">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-800 text-left text-neutral-400">
            <th className="py-2 px-3 w-12 text-right font-medium">Pos</th>
            <th className="py-2 px-3 font-medium">Constructor</th>
            <th className="py-2 px-3 text-right font-medium">Points</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row, index) => {
            const team = teamById.get(row.teamId);
            const zebra = index % 2 === 1 ? "bg-neutral-900/50" : "";

            return (
              <tr
                key={row.teamId}
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
                      {team?.name ?? row.teamId}
                    </span>
                  </div>
                </td>
                <td className="py-2 px-3 text-right tabular-nums font-semibold text-white">
                  {row.points}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
