import type { PhotoId } from '../ids';

export interface ImageStorage {
  save(file: File): Promise<PhotoId>;
  getUrl(photoId: PhotoId): Promise<string | undefined>;
  delete(photoId: PhotoId): Promise<void>;
}
