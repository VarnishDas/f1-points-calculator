export type RaceStatus = "completed" | "upcoming";

export type PredictionSessionType = "grandPrix" | "sprint";

export interface EventResultEntry {
  position: number;
  driverId: string;
  teamId: string;
  status?: string;
  points?: number;
}

export interface Race {
  id: string;
  round: number;
  name: string;
  circuit: string;
  date: string;
  status: RaceStatus;
  hasSprint?: boolean;
  /**
   * Official Grand Prix classification. This is generated data and should not
   * be mutated by user actions.
   */
  grandPrixResult: EventResultEntry[] | null;
  /**
   * Official sprint classification for sprint weekends. This is generated data
   * and should not be mutated by user actions.
   */
  sprintResult?: EventResultEntry[] | null;
  /**
   * Ordered sparse array of driver IDs by predicted Grand Prix finishing
   * position. User actions only mutate this field.
   */
  prediction: string[] | null;
  /**
   * Ordered sparse array of driver IDs by predicted Sprint finishing position.
   * User actions only mutate this field.
   */
  sprintPrediction: string[] | null;
}
