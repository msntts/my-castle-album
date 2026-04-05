import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Marker, Popup } from 'react-leaflet';
import type { Castle } from '../../domain/castle/Castle';

// Vite でビルドすると Leaflet のデフォルトアイコンパスが壊れるため上書き
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface CastlePinProps {
  castle: Castle;
  onClick?: (castle: Castle) => void;
}

export function CastlePin({ castle, onClick }: CastlePinProps) {
  const position: [number, number] = [
    castle.location.latitude,
    castle.location.longitude,
  ];

  return (
    <Marker
      position={position}
      eventHandlers={{
        click: () => onClick?.(castle),
      }}
    >
      <Popup>{castle.name}</Popup>
    </Marker>
  );
}
