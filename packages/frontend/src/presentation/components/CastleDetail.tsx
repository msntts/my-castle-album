import type { Castle } from '../../domain/castle/Castle';
import type { CastleRepository } from '../../domain/castle/CastleRepository';
import type { ImageStorage } from '../../domain/photo/ImageStorage';
import { PhotoGallery } from './PhotoGallery';

interface CastleDetailProps {
  castle: Castle;
  isAdminMode: boolean;
  onClose: () => void;
  onCastleUpdated: (castle: Castle) => void;
  onDelete?: () => void;
  imageStorage: ImageStorage;
  castleRepository?: CastleRepository;
}

export function CastleDetail({
  castle,
  isAdminMode,
  onClose,
  onCastleUpdated,
  onDelete,
  imageStorage,
  castleRepository,
}: CastleDetailProps) {
  function handleDelete() {
    if (window.confirm(`「${castle.name}」を削除しますか？`)) {
      onDelete?.();
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1000,
        background: 'white',
        padding: '16px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        minWidth: '260px',
        maxWidth: '320px',
      }}
    >
      <button
        onClick={onClose}
        style={{ float: 'right', cursor: 'pointer', border: 'none', background: 'none', fontSize: '1rem' }}
      >
        ✕
      </button>
      <h2 style={{ margin: '0 0 12px' }}>{castle.name}</h2>
      <PhotoGallery
        photos={castle.photos}
        castleId={castle.castleId}
        isAdminMode={isAdminMode}
        thumbnailPhotoId={castle.thumbnailPhotoId}
        onPhotosChanged={(photos) => onCastleUpdated({ ...castle, photos })}
        onThumbnailChanged={(thumbnailPhotoId) => onCastleUpdated({ ...castle, thumbnailPhotoId })}
        imageStorage={imageStorage}
        castleRepository={castleRepository}
      />
      {isAdminMode && (
        <button
          onClick={handleDelete}
          style={{
            marginTop: '12px',
            width: '100%',
            padding: '6px',
            border: '1px solid #c0392b',
            borderRadius: '4px',
            background: 'none',
            color: '#c0392b',
            cursor: 'pointer',
            fontSize: '0.85em',
          }}
        >
          このピンを削除
        </button>
      )}
    </div>
  );
}
