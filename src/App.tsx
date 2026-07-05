import { useMemo } from "react";

import { useCalculatorStore } from "./store/useCalculatorStore";
import { calculateProjectedStandings } from "./engine/calculateProjectedStandings";
import { calculateWdcStatus } from "./engine/calculateWdcStatus";
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
  const wdcStatusByDriverId = useMemo(
    () => calculateWdcStatus(races, drivers, teams),
    [races, drivers, teams],
  );
  const driverStandings = projected.drivers;
  const teamStandings = projected.teams;

  return (
    <main className="flex min-h-screen flex-col overflow-y-auto bg-neutral-950 text-neutral-100 lg:h-screen lg:min-h-0 lg:overflow-hidden">
      <AppHeader onReset={resetPredictions} />
      <DashboardLayout
        standings={
          <StandingsPanel
            driverStandings={driverStandings}
            teamStandings={teamStandings}
            drivers={drivers}
            teams={teams}
            wdcStatusByDriverId={wdcStatusByDriverId}
          />
        }
        workspace={
          <PredictionWorkspace
            races={races}
            drivers={drivers}
            teams={teams}
            onClear={resetPredictions}
          />
        }
      />
    </main>
  );
}

export default App;
