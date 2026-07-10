export interface Driver {
  id: string;
  sourceId?: string;
  number: number | null;
  code: string;
  firstName: string;
  lastName: string;
  teamId: string;
  country: string;
}
