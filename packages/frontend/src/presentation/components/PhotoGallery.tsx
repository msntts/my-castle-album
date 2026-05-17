import { useEffect, useRef, useState } from 'react';
import type { CastleId } from '../../domain/castle/Castle';
import type { CastleRepository } from '../../domain/castle/CastleRepository';
import type { ImageStorage } from '../../domain/photo/ImageStorage';
import type { Photo } from '../../domain/photo/Photo';

interface PhotoGalleryProps {
  photos: Photo[];
  castleId: CastleId;
  isAdminMode: boolean;
  thumbnailPhotoId?: string;
  onPhotosChanged: (photos: Photo[]) => void;
  onThumbnailChanged?: (photoId: string) => void;
  imageStorage: ImageStorage;
  castleRepository?: CastleRepository;
}

export function PhotoGallery({
  photos,
  castleId,
  isAdminMode,
  thumbnailPhotoId,
  onPhotosChanged,
  onThumbnailChanged,
  imageStorage,
  castleRepository,
}: PhotoGalleryProps) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loadedPhotoIds, setLoadedPhotoIds] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      photos.map(async (photo) => {
        const url = await imageStorage.getUrl(photo.photoId);
        return [photo.photoId, url] as const;
      })
    ).then((entries) => {
      if (cancelled) return;
      const map: Record<string, string> = {};
      for (const [id, url] of entries) {
        if (url) map[id] = url;
      }
      setUrls((prev) => ({ ...prev, ...map }));
    });
    return () => { cancelled = true; };
  }, [photos, imageStorage]);

  const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const invalid = files.find((f) => !ALLOWED_TYPES.has(f.type) || f.size > MAX_SIZE_BYTES);
    if (invalid) {
      alert('JPEG / PNG / WebP / GIF のみ、50MB 以下のファイルをアップロードしてください。');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const CONCURRENCY = 3;
      const settled: PromiseSettledResult<Photo>[] = [];
      for (let i = 0; i < files.length; i += CONCURRENCY) {
        const chunk = files.slice(i, i + CONCURRENCY);
        const chunkResults = await Promise.allSettled(
          chunk.map(async (file) => {
            const photoId = await imageStorage.save(file);
            return { photoId, castleId } satisfies Photo;
          }),
        );
        settled.push(...chunkResults);
      }

      const newPhotos = settled
        .filter((r): r is PromiseFulfilledResult<Photo> => r.status === 'fulfilled')
        .map((r) => r.value);
      const failCount = settled.filter((r) => r.status === 'rejected').length;
      if (failCount > 0) alert(`${failCount} 枚のアップロードに失敗しました。`);

      if (newPhotos.length > 0) {
        const merged = [...photos];
        for (const np of newPhotos) {
          const idx = merged.findIndex((p) => p.photoId === np.photoId);
          if (idx >= 0) merged[idx] = np;
          else merged.push(np);
        }
        const updatedPhotos = merged;
        if (castleRepository) {
          const castle = await castleRepository.findById(castleId);
          if (castle) await castleRepository.save({ ...castle, photos: updatedPhotos });
        }
        onPhotosChanged(updatedPhotos);
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSetThumbnail(photoId: string) {
    if (castleRepository) {
      const castle = await castleRepository.findById(castleId);
      if (castle) await castleRepository.save({ ...castle, thumbnailPhotoId: photoId });
    }
    onThumbnailChanged?.(photoId);
  }


  async function handleDelete(photoId: string) {
    await imageStorage.delete(photoId);
    const updatedPhotos = photos.filter((p) => p.photoId !== photoId);
    if (castleRepository) {
      const castle = await castleRepository.findById(castleId);
      if (castle) await castleRepository.save({ ...castle, photos: updatedPhotos });
    }
    onPhotosChanged(updatedPhotos);
  }

  function moveLightbox(delta: number) {
    setLightboxIndex((i) => i === null ? null : (i + delta + photos.length) % photos.length);
  }

  return (
    <div>
      {photos.length === 0 && !isAdminMode && (
        <p style={{ margin: 0, color: '#999', fontSize: '0.85em' }}>写真はまだありません</p>
      )}

      {photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: isAdminMode ? '10px' : 0 }}>
          {photos.map((photo, index) => (
            <div key={photo.photoId} style={{ position: 'relative' }}>
              <div
                onClick={() => !isAdminMode && loadedPhotoIds.has(photo.photoId) && setLightboxIndex(index)}
                style={{ cursor: isAdminMode || !loadedPhotoIds.has(photo.photoId) ? 'default' : 'pointer', position: 'relative', width: '100%', aspectRatio: '1' }}
              >
                {urls[photo.photoId] && (
                  <img
                    src={urls[photo.photoId]}
                    alt={photo.caption ?? ''}
                    onLoad={() => setLoadedPhotoIds((prev) => new Set([...prev, photo.photoId]))}
                    style={{
                      position: 'absolute', inset: 0,
                      width: '100%', height: '100%', objectFit: 'cover', borderRadius: '3px', display: 'block',
                      opacity: loadedPhotoIds.has(photo.photoId) ? 1 : 0,
                    }}
                  />
                )}
                {!loadedPhotoIds.has(photo.photoId) && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: '#f0f0f0', borderRadius: '3px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{
                      width: '20px', height: '20px',
                      border: '2px solid #ddd', borderTopColor: '#999',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                  </div>
                )}
              </div>
              {isAdminMode && (
                <button
                  onClick={() => handleDelete(photo.photoId)}
                  style={{
                    position: 'absolute', top: 2, right: 2,
                    width: '18px', height: '18px',
                    border: 'none', borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)', color: 'white',
                    fontSize: '10px', cursor: 'pointer', lineHeight: '18px', padding: 0,
                  }}
                >
                  ✕
                </button>
              )}
              {/* 9-5: サムネイル設定ボタン */}
              {isAdminMode && (
                <button
                  onClick={() => handleSetThumbnail(photo.photoId)}
                  title="サムネイルに設定"
                  style={{
                    position: 'absolute', bottom: 2, right: 2,
                    width: '18px', height: '18px',
                    border: 'none', borderRadius: '50%',
                    background: photo.photoId === thumbnailPhotoId
                      ? 'rgba(255,200,0,0.9)'
                      : 'rgba(0,0,0,0.4)',
                    color: 'white',
                    fontSize: '10px', cursor: 'pointer', lineHeight: '18px', padding: 0,
                  }}
                >
                  ★
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isAdminMode && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button
            onClick={() => !isUploading && fileInputRef.current?.click()}
            disabled={isUploading}
            style={{
              width: '100%', padding: '8px',
              border: '2px dashed #ccc', borderRadius: '6px',
              background: 'none', cursor: isUploading ? 'not-allowed' : 'pointer',
              color: isUploading ? '#aaa' : '#666', fontSize: '0.9em',
            }}
          >
            {isUploading ? 'アップロード中...' : '+ 写真を追加（複数可）'}
          </button>
        </>
      )}

      {lightboxIndex !== null && (
        <div
          onClick={() => setLightboxIndex(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); moveLightbox(-1); }}
            style={{ position: 'absolute', left: 16, background: 'none', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer' }}
          >
            ‹
          </button>
          <img
            src={urls[photos[lightboxIndex]?.photoId] ?? ''}
            alt=""
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '4px' }}
          />
          <button
            onClick={(e) => { e.stopPropagation(); moveLightbox(1); }}
            style={{ position: 'absolute', right: 16, background: 'none', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer' }}
          >
            ›
          </button>
          <button
            onClick={() => setLightboxIndex(null)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
