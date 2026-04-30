import { ulid } from 'ulid';
import type { Castle } from '../../domain/castle/Castle';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
const CASTLES_KEY = 'castles';
const IMAGE_KEY_PREFIX = 'image:';

interface MigrationResult {
  castlesMigrated: number;
  photosMigrated: number;
  errors: string[];
}

function base64ToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const bytes = atob(data);
  const buf = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
  return new Blob([buf], { type: mime });
}

async function migratePhoto(
  castleId: string,
  oldPhotoId: string,
  token: string,
): Promise<boolean> {
  const dataUrl = localStorage.getItem(`${IMAGE_KEY_PREFIX}${oldPhotoId}`);
  if (!dataUrl) return false;

  const blob = base64ToBlob(dataUrl);
  const contentType = blob.type;

  const postRes = await fetch(
    `${API_BASE}/castles/${encodeURIComponent(castleId)}/photos`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ contentType }),
    },
  );
  if (!postRes.ok) throw new Error(`POST /photos failed: ${postRes.status}`);

  const { presignedUrl } = (await postRes.json()) as { presignedUrl: string };

  const uploadRes = await fetch(presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  });
  if (!uploadRes.ok) throw new Error(`S3 upload failed: ${uploadRes.status}`);

  return true;
}

export async function migrateToAws(
  getAccessToken: () => string | null,
  clearAfterMigration = false,
): Promise<MigrationResult> {
  const token = getAccessToken();
  if (!token) throw new Error('ログインしてから実行してください。');

  const raw = localStorage.getItem(CASTLES_KEY);
  if (!raw) return { castlesMigrated: 0, photosMigrated: 0, errors: [] };

  let castles: Castle[];
  try {
    castles = JSON.parse(raw) as Castle[];
  } catch {
    return { castlesMigrated: 0, photosMigrated: 0, errors: ['localStorage のパースに失敗しました。'] };
  }

  const result: MigrationResult = { castlesMigrated: 0, photosMigrated: 0, errors: [] };

  for (const castle of castles) {
    const newCastleId = ulid();
    try {
      const putRes = await fetch(
        `${API_BASE}/castles/${encodeURIComponent(newCastleId)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: castle.name,
            latitude: castle.location.latitude,
            longitude: castle.location.longitude,
          }),
        },
      );
      if (!putRes.ok) throw new Error(`PUT /castles failed: ${putRes.status}`);
      result.castlesMigrated++;

      for (const photo of castle.photos) {
        try {
          const migrated = await migratePhoto(newCastleId, photo.photoId, token);
          if (migrated) result.photosMigrated++;
        } catch (err) {
          result.errors.push(`写真 ${photo.photoId} (城: ${castle.name}): ${String(err)}`);
        }
      }
    } catch (err) {
      result.errors.push(`城 ${castle.name}: ${String(err)}`);
    }
  }

  if (clearAfterMigration && result.errors.length === 0) {
    localStorage.removeItem(CASTLES_KEY);
    for (const castle of castles) {
      for (const photo of castle.photos) {
        localStorage.removeItem(`${IMAGE_KEY_PREFIX}${photo.photoId}`);
      }
    }
  }

  return result;
}
