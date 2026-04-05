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
  onPhotosChanged: (photos: Photo[]) => void;
}

export function PhotoGallery({ photos, castleId, isAdminMode, onPhotosChanged }: PhotoGalleryProps) {
  const [urls, setUrls] = useState<Record<string, string>>({});
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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const photoId = `photo-${Date.now()}`;
    const newPhoto: Photo = { photoId, castleId };
    await imageStorage.save(photoId, file);
    const updatedPhotos = [...photos, newPhoto];
    const castle = await castleRepository.findById(castleId);
    if (castle) {
      await castleRepository.save({ ...castle, photos: updatedPhotos });
    }
    onPhotosChanged(updatedPhotos);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div>
      {photos.length === 0 && !isAdminMode && (
        <p style={{ margin: 0, color: '#999', fontSize: '0.85em' }}>写真はまだありません</p>
      )}

      {photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: isAdminMode ? '12px' : 0 }}>
          {photos.map((photo) => (
            <div key={photo.photoId}>
              {urls[photo.photoId] ? (
                <img
                  src={urls[photo.photoId]}
                  alt={photo.caption ?? ''}
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '4px' }}
                />
              ) : (
                <div style={{ width: '100%', aspectRatio: '1', background: '#eee', borderRadius: '4px' }} />
              )}
              {photo.caption && (
                <p style={{ margin: '4px 0 0', fontSize: '0.75em', color: '#666' }}>{photo.caption}</p>
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
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%',
              padding: '8px',
              border: '2px dashed #ccc',
              borderRadius: '6px',
              background: 'none',
              cursor: 'pointer',
              color: '#666',
              fontSize: '0.9em',
            }}
          >
            + 写真を追加
          </button>
        </>
      )}
    </div>
  );
}
