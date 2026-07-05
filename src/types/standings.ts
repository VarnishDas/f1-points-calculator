export type WdcStatus = "champion" | "inContention" | "outOfContention";

export interface DriverStanding {
  driverId: string;
  position: number;
  points: number;
  wins: number;
}

export interface TeamStanding {
  teamId: string;
  position: number;
  points: number;
}
