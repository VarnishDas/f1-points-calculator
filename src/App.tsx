import {
  selectDriverStandings,
  selectTeamStandings,
  useCalculatorStore,
} from "./store/useCalculatorStore";
import StandingsTable from "./components/StandingsTable";
import TeamStandingsTable from "./components/TeamStandingsTable";

function App() {
  const drivers = useCalculatorStore((s) => s.drivers);
  const teams = useCalculatorStore((s) => s.teams);
  const driverStandings = useCalculatorStore(selectDriverStandings);
  const teamStandings = useCalculatorStore(selectTeamStandings);

  return (
    <main className="min-h-screen px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
            F1 2026 Championship Standings
          </h1>
          <p className="mt-3 text-neutral-400 max-w-xl mx-auto">
            Live championship standings based on completed races. Drag-and-drop
            race predictions coming soon.
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
      </div>
    </main>
  );
}

export default App;
