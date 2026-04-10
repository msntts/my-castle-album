import type { CastleId } from '../ids';
import type { Photo } from '../photo/Photo';

export type { CastleId };

export interface Location {
  latitude: number;
  longitude: number;
}

export interface Castle {
  castleId: CastleId;
  name: string;
  nameEn?: string;
  visitedAt?: string; // "YYYY-MM" format
  location: Location;
  photos: Photo[];
}
