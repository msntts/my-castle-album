import 'leaflet/dist/leaflet.css';
import type { LatLngBoundsExpression } from 'leaflet';
import { MapContainer, TileLayer } from 'react-leaflet';

// 日本の中心付近（長野県あたり）を初期表示
const JAPAN_CENTER: [number, number] = [36.5, 137.5];
const JAPAN_ZOOM = 5;

// 日本の境界（沖縄〜北海道）
const JAPAN_BOUNDS: LatLngBoundsExpression = [
  [24.0, 122.9],
  [45.5, 145.8],
];

interface CastleMapProps {
  children?: React.ReactNode;
}

export function CastleMap({ children }: CastleMapProps) {
  return (
    <MapContainer
      center={JAPAN_CENTER}
      zoom={JAPAN_ZOOM}
      minZoom={5}
      maxBounds={JAPAN_BOUNDS}
      maxBoundsViscosity={1.0}
      style={{ width: '100%', height: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {children}
    </MapContainer>
  );
}
