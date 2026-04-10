import { useEffect, useRef, useState } from 'react';
import type { CastleId } from '../../domain/castle/Castle';
import type { Photo } from '../../domain/photo/Photo';
import { LocalStorageCastleRepository } from '../../infrastructure/localStorage/LocalStorageCastleRepository';
import { LocalStorageImageStorage } from '../../infrastructure/localStorage/LocalStorageImageStorage';

const imageStorage = new LocalStorageImageStorage();
const castleRepository = new LocalStorageCastleRepository();

interface PhotoGalleryProps {
  photos: Photo[];
  castleId: CastleId;
  isAdminMode: boolean;
  thumbnailPhotoId?: string;
  onPhotosChanged: (photos: Photo[]) => void;
  onThumbnailChanged?: (photoId: string) => void;
}

export function PhotoGallery({ photos, castleId, isAdminMode, thumbnailPhotoId, onPhotosChanged, onThumbnailChanged }: PhotoGalleryProps) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (photos.length === 0) { setUrls({}); return; }
    Promise.all(
      photos.map(async (photo) => {
        const url = await imageStorage.getUrl(photo.photoId);
        return [photo.photoId, url] as const;
      })
    ).then((entries) => {
      const map: Record<string, string> = {};
      for (const [id, url] of entries) {
        if (url) map[id] = url;
      }
      setUrls(map);
    });
  }, [photos]);

  // 7-2: 複数ファイル同時アップロード
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const newPhotos: Photo[] = await Promise.all(
      files.map(async (file) => {
        const photoId = `photo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        await imageStorage.save(photoId, file);
        return { photoId, castleId } satisfies Photo;
      })
    );
    const updatedPhotos = [...photos, ...newPhotos];
    const castle = await castleRepository.findById(castleId);
    if (castle) await castleRepository.save({ ...castle, photos: updatedPhotos });
    onPhotosChanged(updatedPhotos);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // 9-5: サムネイル設定
  async function handleSetThumbnail(photoId: string) {
    const castle = await castleRepository.findById(castleId);
    if (castle) await castleRepository.save({ ...castle, thumbnailPhotoId: photoId });
    onThumbnailChanged?.(photoId);
  }

  // 7-3: 写真削除
  async function handleDelete(photoId: string) {
    await imageStorage.delete(photoId);
    const updatedPhotos = photos.filter((p) => p.photoId !== photoId);
    const castle = await castleRepository.findById(castleId);
    if (castle) await castleRepository.save({ ...castle, photos: updatedPhotos });
    onPhotosChanged(updatedPhotos);
  }

  // 7-4: ライトボックスナビゲーション
  function moveLightbox(delta: number) {
    setLightboxIndex((i) => i === null ? null : (i + delta + photos.length) % photos.length);
  }

  return (
    <div>
      {photos.length === 0 && !isAdminMode && (
        <p style={{ margin: 0, color: '#999', fontSize: '0.85em' }}>写真はまだありません</p>
      )}

      {/* 7-1: サムネイルグリッド */}
      {photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: isAdminMode ? '10px' : 0 }}>
          {photos.map((photo, index) => (
            <div key={photo.photoId} style={{ position: 'relative' }}>
              <div
                onClick={() => !isAdminMode && setLightboxIndex(index)}
                style={{ cursor: isAdminMode ? 'default' : 'pointer' }}
              >
                {urls[photo.photoId] ? (
                  <img
                    src={urls[photo.photoId]}
                    alt={photo.caption ?? ''}
                    style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '3px', display: 'block' }}
                  />
                ) : (
                  <div style={{ width: '100%', aspectRatio: '1', background: '#eee', borderRadius: '3px' }} />
                )}
              </div>
              {/* 7-3: 削除ボタン */}
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
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%', padding: '8px',
              border: '2px dashed #ccc', borderRadius: '6px',
              background: 'none', cursor: 'pointer', color: '#666', fontSize: '0.9em',
            }}
          >
            + 写真を追加（複数可）
          </button>
        </>
      )}

      {/* 7-4: ライトボックス */}
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
