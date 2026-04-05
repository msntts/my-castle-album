import type { CastleId } from '../castle/Castle';

export type PhotoId = string;

export interface Photo {
  photoId: PhotoId;
  castleId: CastleId;
  dataUrl: string;
  capturedAt?: Date;
  caption?: string;
}

export function createPhoto(params: {
  photoId: PhotoId;
  castleId: CastleId;
  dataUrl: string;
  capturedAt?: Date;
  caption?: string;
}): Photo {
  if (!params.dataUrl.startsWith('data:image/')) {
    throw new Error('dataUrl は画像データURLである必要があります');
  }
  return { ...params };
}
