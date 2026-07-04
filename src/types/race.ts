export type RaceStatus = "completed" | "upcoming";

export interface Race {
  id: string;
  round: number;
  name: string;
  circuit: string;
  date: string;
  status: RaceStatus;
  /**
   * Ordered array of driver IDs by finishing position (1st to last).
   * For completed races this is the actual result.
   * For upcoming races this is the user's prediction (null until set).
   */
  result: string[] | null;
}
