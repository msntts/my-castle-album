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
        attribution='<a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>'
        url="https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png"
      />
      {children}
    </MapContainer>
  );
}
