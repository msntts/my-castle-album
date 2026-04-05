import { useEffect, useState } from 'react';
import type { Photo } from '../../domain/photo/Photo';
import { LocalStorageImageStorage } from '../../infrastructure/localStorage/LocalStorageImageStorage';

const imageStorage = new LocalStorageImageStorage();

interface PhotoGalleryProps {
  photos: Photo[];
}

export function PhotoGallery({ photos }: PhotoGalleryProps) {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (photos.length === 0) return;
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

  if (photos.length === 0) {
    return <p style={{ margin: 0, color: '#999', fontSize: '0.85em' }}>写真はまだありません</p>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
      {photos.map((photo) => (
        <div key={photo.photoId}>
          {urls[photo.photoId] ? (
            <img
              src={urls[photo.photoId]}
              alt={photo.caption ?? ''}
              style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '4px' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                aspectRatio: '1',
                background: '#eee',
                borderRadius: '4px',
              }}
            />
          )}
          {photo.caption && (
            <p style={{ margin: '4px 0 0', fontSize: '0.75em', color: '#666' }}>{photo.caption}</p>
          )}
        </div>
      ))}
    </div>
  );
}
