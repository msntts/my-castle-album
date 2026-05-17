import type { CastleId } from '../../domain/castle/Castle';
import type { PhotoId } from '../../domain/ids';
import type { ImageStorage } from '../../domain/photo/ImageStorage';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
const cfDomain = (import.meta.env.VITE_CLOUDFRONT_DOMAIN as string | undefined) ?? '';
const CLOUDFRONT = cfDomain && !cfDomain.startsWith('http') ? `https://${cfDomain}` : cfDomain;

export class AwsImageStorage implements ImageStorage {
  // photoId → imageUrl（同一セッション内のアップロードURLを高速返却するキャッシュ）
  private readonly uploadCache = new Map<PhotoId, string>();
  private readonly castleId: CastleId;
  private readonly getAccessToken: () => string | null;
  constructor(castleId: CastleId, getAccessToken: () => string | null) {
    this.castleId = castleId;
    this.getAccessToken = getAccessToken;
  }

  async save(file: File): Promise<PhotoId> {
    const token = this.getAccessToken();
    if (!token) throw new Error('認証が必要です');

    const res = await fetch(`${API_BASE}/castles/${encodeURIComponent(this.castleId)}/photos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ contentType: file.type }),
    });
    if (!res.ok) throw new Error(`POST /photos failed: ${res.status}`);

    const { photoId, presignedUrl, imageUrl } = (await res.json()) as {
      photoId: string;
      presignedUrl: string;
      imageUrl: string;
    };

    const uploadRes = await fetch(presignedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!uploadRes.ok) throw new Error(`S3 upload failed: ${uploadRes.status}`);

    this.uploadCache.set(photoId as PhotoId, imageUrl);
    return photoId as PhotoId;
  }

  async getUrl(photoId: PhotoId): Promise<string | undefined> {
    return (
      this.uploadCache.get(photoId) ??
      `${CLOUDFRONT}/photos/${encodeURIComponent(this.castleId)}/${encodeURIComponent(photoId)}`
    );
  }

  async delete(photoId: PhotoId): Promise<void> {
    const token = this.getAccessToken();
    if (!token) throw new Error('認証が必要です');

    const res = await fetch(
      `${API_BASE}/castles/${encodeURIComponent(this.castleId)}/photos/${encodeURIComponent(photoId)}`,
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
