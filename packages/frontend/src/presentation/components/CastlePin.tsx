import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useEffect, useState } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import type { Castle } from '../../domain/castle/Castle';
import type { ImageStorage } from '../../domain/photo/ImageStorage';
import { CastlePinHoverCard } from './CastlePinHoverCard';

// Vite でビルドすると Leaflet の内部パス解決が壊れるため、_getIconUrl を削除してから上書き
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface CastlePinProps {
  castle: Castle;
  onClick?: (castle: Castle) => void;
  imageStorage: ImageStorage;
  draggable?: boolean;
  onPositionChange?: (lat: number, lng: number) => void;
}

export function CastlePin({ castle, onClick, imageStorage, draggable, onPositionChange }: CastlePinProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    const promise = castle.thumbnailPhotoId
      ? imageStorage.getUrl(castle.thumbnailPhotoId)
      : Promise.resolve(undefined);
    promise.then((url) => {
      if (!cancelled) setThumbnailUrl(url ?? undefined);
    });
    return () => { cancelled = true; };
  }, [castle.thumbnailPhotoId, imageStorage]);

  const position: [number, number] = [
    castle.location.latitude,
    castle.location.longitude,
  ];

  return (
    <Marker
      position={position}
      draggable={draggable}
      eventHandlers={{
        click: () => onClick?.(castle),
        dragend: (e) => {
          const { lat, lng } = (e.target as L.Marker).getLatLng();
          onPositionChange?.(lat, lng);
        },
      }}
    >
      <Tooltip>
        <CastlePinHoverCard name={castle.name} thumbnailUrl={thumbnailUrl} />
      </Tooltip>
    </Marker>
  );
}
