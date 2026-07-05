import { useMemo } from "react";

import { useCalculatorStore } from "./store/useCalculatorStore";
import { calculateProjectedStandings } from "./engine/calculateProjectedStandings";
import AppHeader from "./components/AppHeader";
import DashboardLayout from "./components/DashboardLayout";
import PredictionWorkspace from "./components/PredictionWorkspace";
import StandingsPanel from "./components/StandingsPanel";

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
  const teamStandings = projected.teams;
  const driverOrder = useMemo(
    () => projected.drivers.map((standing) => standing.driverId),
    [projected],
  );

  return (
    <main className="flex h-screen min-h-0 flex-col overflow-hidden bg-neutral-950 text-neutral-100">
      <AppHeader onReset={resetPredictions} />
      <DashboardLayout
        standings={
          <StandingsPanel
            driverStandings={driverStandings}
            teamStandings={teamStandings}
            drivers={drivers}
            teams={teams}
          />
        }
        workspace={
          <PredictionWorkspace
            races={races}
            drivers={drivers}
            teams={teams}
            driverOrder={driverOrder}
            onClear={resetPredictions}
          />
        }
      />
    </main>
  );
}

export default App;
