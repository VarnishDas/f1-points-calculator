import { useMemo } from "react";

import { useCalculatorStore } from "./store/useCalculatorStore";
import { calculateProjectedStandings } from "./engine/calculateProjectedStandings";
import { calculateTeamStandings } from "./engine/calculateTeamStandings";
import StandingsTable from "./components/StandingsTable";
import TeamStandingsTable from "./components/TeamStandingsTable";
import RaceList from "./components/RaceList";

function App() {
  const races = useCalculatorStore((s) => s.races);
  const drivers = useCalculatorStore((s) => s.drivers);
  const teams = useCalculatorStore((s) => s.teams);
  const resetPredictions = useCalculatorStore((s) => s.resetPredictions);

  const projected = useMemo(
    () => calculateProjectedStandings(races, drivers, teams),
    [races, drivers, teams],
  );
  const driverStandings = projected.drivers;
  const teamStandings = useMemo(
    () => calculateTeamStandings(driverStandings, drivers, teams),
    [driverStandings, drivers, teams],
  );
  const driverOrder = useMemo(
    () => projected.drivers.map((standing) => standing.driverId),
    [projected],
  );

  const hasPredictions = races.some(
    (r) => r.status === "upcoming" && r.result !== null,
  );

  return (
    <main className="min-h-screen px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
            F1 2026 Championship Standings
          </h1>
          <p className="mt-3 text-neutral-400 max-w-xl mx-auto">
            Live championship standings based on completed races. Predict the
            rest of the season to see how the title fight could swing.
          </p>
        </header>

        <section className="mb-10" aria-label="Driver standings">
          <h2 className="mb-3 text-lg font-medium text-white">Drivers</h2>
          <StandingsTable
            standings={driverStandings}
            drivers={drivers}
            teams={teams}
          />
        </section>

        <section aria-label="Constructor standings">
          <h2 className="mb-3 text-lg font-medium text-white">Constructors</h2>
          <TeamStandingsTable standings={teamStandings} teams={teams} />
        </section>

        <section aria-label="Race results and predictions" className="mt-10">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium text-white">
              Race Results & Predictions
            </h2>
            {hasPredictions && (
              <button
                type="button"
                onClick={resetPredictions}
                className="rounded-md border border-neutral-700 px-3 py-1 text-xs font-medium text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
              >
                Reset predictions
              </button>
            )}
          </div>
          <RaceList
            races={races}
            drivers={drivers}
            teams={teams}
            driverOrder={driverOrder}
          />
        </section>
      </div>
    </main>
  );
}

export default App;
