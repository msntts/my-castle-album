import type { CastleId, PhotoId } from '../ids';

export type { PhotoId };

export interface Photo {
  photoId: PhotoId;
  castleId: CastleId;
  caption?: string;
}
