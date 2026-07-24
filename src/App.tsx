import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { useCalculatorStore } from "./store/useCalculatorStore";
import { calculateProjectedStandings } from "./engine/calculateProjectedStandings";
import { calculateWdcStatus } from "./engine/calculateWdcStatus";
import { useShareableUrl } from "./hooks/useShareableUrl";
import AppHeader from "./components/AppHeader";
import DashboardLayout from "./components/DashboardLayout";
import Footer from "./components/Footer";
import PredictionWorkspace from "./components/PredictionWorkspace";
import StandingsPanel from "./components/StandingsPanel";

function App() {
  useShareableUrl();

  const { races, drivers, teams, activeDriverIds, resetPredictions } =
    useCalculatorStore(
      useShallow((s) => ({
        races: s.races,
        drivers: s.drivers,
        teams: s.teams,
        activeDriverIds: s.activeDriverIds,
        resetPredictions: s.resetPredictions,
      })),
    );

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

  const leader = driverStandings[0];
  const leaderDriver = leader
    ? drivers.find((driver) => driver.id === leader.driverId)
    : undefined;
  const leaderTeam = leaderDriver
    ? teams.find((team) => team.id === leaderDriver.teamId)
    : undefined;

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto text-neutral-100 lg:h-dvh lg:min-h-0 lg:overflow-hidden">
      <span className="sr-only" role="status" aria-live="polite">
        {leaderDriver && leader
          ? `Projected championship leader: ${leaderDriver.firstName} ${leaderDriver.lastName}, ${leader.points} points.`
          : ""}
      </span>
      <AppHeader
        onReset={resetPredictions}
        leaderName={
          leaderDriver
            ? `${leaderDriver.firstName.charAt(0)}. ${leaderDriver.lastName}`
            : undefined
        }
        leaderPoints={leader?.points}
        leaderTeamColor={leaderTeam?.color}
      />
      <DashboardLayout
        leaderLabel={
          leaderDriver && leader
            ? `P1 ${leaderDriver.lastName} · ${leader.points} pts`
            : undefined
        }
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
            activeDriverIds={activeDriverIds}
          />
        }
      />
      <Footer />
    </main>
  );
}

export default App;
