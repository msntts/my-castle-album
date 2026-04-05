import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer } from 'react-leaflet';

// 日本の中心付近（長野県あたり）を初期表示
const JAPAN_CENTER: [number, number] = [36.5, 137.5];
const JAPAN_ZOOM = 5;

interface CastleMapProps {
  children?: React.ReactNode;
}

export function CastleMap({ children }: CastleMapProps) {
  return (
    <MapContainer
      center={JAPAN_CENTER}
      zoom={JAPAN_ZOOM}
      style={{ width: '100%', height: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      {children}
    </MapContainer>
  );
}
