import { useMemo } from "react";

import { useCalculatorStore } from "./store/useCalculatorStore";
import { calculateStandings } from "./engine/calculateStandings";
import { calculateTeamStandings } from "./engine/calculateTeamStandings";
import StandingsTable from "./components/StandingsTable";
import TeamStandingsTable from "./components/TeamStandingsTable";
import RaceList from "./components/RaceList";

function App() {
  const races = useCalculatorStore((s) => s.races);
  const drivers = useCalculatorStore((s) => s.drivers);
  const teams = useCalculatorStore((s) => s.teams);

  const driverStandings = useMemo(
    () => calculateStandings(races, drivers, teams).drivers,
    [races, drivers, teams],
  );
  const teamStandings = useMemo(
    () => calculateTeamStandings(driverStandings, drivers, teams),
    [driverStandings, drivers, teams],
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
          <h2 className="mb-3 text-lg font-medium text-white">
            Race Results & Predictions
          </h2>
          <RaceList races={races} drivers={drivers} teams={teams} />
        </section>
      </div>
    </main>
  );
}

export default App;
