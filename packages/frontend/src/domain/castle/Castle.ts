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
  location: Location;
  photos: Photo[];
  thumbnailPhotoId?: string;
}
