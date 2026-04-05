import type { Castle } from '../../domain/castle/Castle';
import { PhotoGallery } from './PhotoGallery';

interface CastleDetailProps {
  castle: Castle;
  isAdminMode: boolean;
  onClose: () => void;
  onCastleUpdated: (castle: Castle) => void;
}

export function CastleDetail({ castle, isAdminMode, onClose, onCastleUpdated }: CastleDetailProps) {
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
        onPhotosChanged={(photos) => onCastleUpdated({ ...castle, photos })}
      />
    </div>
  );
}
