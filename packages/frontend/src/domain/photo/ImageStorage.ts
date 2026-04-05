import type { PhotoId } from '../ids';

export interface ImageStorage {
  save(photoId: PhotoId, file: File): Promise<void>;
  getUrl(photoId: PhotoId): Promise<string | undefined>;
  delete(photoId: PhotoId): Promise<void>;
}
