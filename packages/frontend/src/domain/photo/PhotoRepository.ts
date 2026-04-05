import type { Photo, PhotoId } from './Photo';
import type { CastleId } from '../castle/Castle';

export interface PhotoRepository {
  findByCastleId(castleId: CastleId): Promise<Photo[]>;
  findById(photoId: PhotoId): Promise<Photo | undefined>;
  save(photo: Photo): Promise<void>;
  delete(photoId: PhotoId): Promise<void>;
}
