import type { PhotoId } from '../../domain/ids';
import type { ImageStorage } from '../../domain/photo/ImageStorage';

const STORAGE_KEY_PREFIX = 'image:';

function storageKey(photoId: PhotoId): string {
  return `${STORAGE_KEY_PREFIX}${photoId}`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export class LocalStorageImageStorage implements ImageStorage {
  async save(photoId: PhotoId, file: File): Promise<void> {
    const dataUrl = await fileToBase64(file);
    localStorage.setItem(storageKey(photoId), dataUrl);
  }

  async getUrl(photoId: PhotoId): Promise<string | undefined> {
    return localStorage.getItem(storageKey(photoId)) ?? undefined;
  }

  async delete(photoId: PhotoId): Promise<void> {
    localStorage.removeItem(storageKey(photoId));
  }
}
