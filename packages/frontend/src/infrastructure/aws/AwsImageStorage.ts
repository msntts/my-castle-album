import type { CastleId } from '../../domain/castle/Castle';
import type { PhotoId } from '../../domain/ids';
import type { ImageStorage } from '../../domain/photo/ImageStorage';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
const CLOUDFRONT = (import.meta.env.VITE_CLOUDFRONT_DOMAIN as string | undefined) ?? '';

export class AwsImageStorage implements ImageStorage {
  // フロントエンド生成 photoId → { serverPhotoId, imageUrl }
  // 同一セッション内のアップロードを正しくデリートできるよう追跡する
  private readonly uploadCache = new Map<PhotoId, { serverPhotoId: PhotoId; imageUrl: string }>();
  private readonly castleId: CastleId;
  private readonly getAccessToken: () => string | null;
  constructor(castleId: CastleId, getAccessToken: () => string | null) {
    this.castleId = castleId;
    this.getAccessToken = getAccessToken;
  }

  async save(_photoId: PhotoId, file: File): Promise<void> {
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

    const { photoId: serverPhotoId, presignedUrl, imageUrl } = (await res.json()) as {
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

    this.uploadCache.set(_photoId, { serverPhotoId, imageUrl });
  }

  async getUrl(photoId: PhotoId): Promise<string | undefined> {
    const cached = this.uploadCache.get(photoId);
    if (cached) return cached.imageUrl;
    // サーバーから取得した photoId はそのまま CloudFront URL に変換できる
    return `${CLOUDFRONT}/photos/${encodeURIComponent(this.castleId)}/${encodeURIComponent(photoId)}`;
  }

  async delete(photoId: PhotoId): Promise<void> {
    const token = this.getAccessToken();
    if (!token) throw new Error('認証が必要です');

    // 同一セッション内のアップロードは server photoId で削除する
    const serverPhotoId = this.uploadCache.get(photoId)?.serverPhotoId ?? photoId;

    const res = await fetch(
      `${API_BASE}/castles/${encodeURIComponent(this.castleId)}/photos/${encodeURIComponent(serverPhotoId)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!res.ok && res.status !== 404)
      throw new Error(`DELETE /photos/${serverPhotoId} failed: ${res.status}`);
    this.uploadCache.delete(photoId);
  }
}
