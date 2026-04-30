import type { CastleId } from '../../domain/castle/Castle';
import type { PhotoId } from '../../domain/ids';
import type { ImageStorage } from '../../domain/photo/ImageStorage';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
const CLOUDFRONT = (import.meta.env.VITE_CLOUDFRONT_DOMAIN as string | undefined) ?? '';

export class AwsImageStorage implements ImageStorage {
  // photoId → imageUrl: 同一セッション内にアップロードした写真のURLキャッシュ
  private readonly uploadCache = new Map<PhotoId, string>();

  constructor(
    private readonly castleId: CastleId,
    private readonly getAccessToken: () => string | null,
  ) {}

  async save(_photoId: PhotoId, file: File): Promise<void> {
    const token = this.getAccessToken();
    if (!token) throw new Error('認証が必要です');

    const res = await fetch(`${API_BASE}/castles/${this.castleId}/photos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ contentType: file.type }),
    });
    if (!res.ok) throw new Error(`POST /photos failed: ${res.status}`);

    const { presignedUrl, imageUrl } = (await res.json()) as {
      presignedUrl: string;
      imageUrl: string;
    };

    const uploadRes = await fetch(presignedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!uploadRes.ok) throw new Error(`S3 upload failed: ${uploadRes.status}`);

    // 11-4 で PhotoGallery がリファクタされるまでの暫定キャッシュ
    this.uploadCache.set(_photoId, imageUrl);
  }

  async getUrl(photoId: PhotoId): Promise<string | undefined> {
    const cached = this.uploadCache.get(photoId);
    if (cached) return cached;
    // サーバーから取得した photoId はそのまま CloudFront URL に変換できる
    return `${CLOUDFRONT}/photos/${this.castleId}/${photoId}`;
  }

  async delete(photoId: PhotoId): Promise<void> {
    const token = this.getAccessToken();
    if (!token) throw new Error('認証が必要です');

    const res = await fetch(
      `${API_BASE}/castles/${this.castleId}/photos/${photoId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!res.ok && res.status !== 404)
      throw new Error(`DELETE /photos/${photoId} failed: ${res.status}`);
    this.uploadCache.delete(photoId);
  }
}
