import type { Castle, CastleId } from '../../domain/castle/Castle';
import type { CastleRepository } from '../../domain/castle/CastleRepository';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

interface CastleApiItem {
  castleId: string;
  name: string;
  latitude: number;
  longitude: number;
  photos?: Array<{ photoId: string; castleId: string; caption?: string }>;
}

export class AwsCastleRepository implements CastleRepository {
  private readonly getAccessToken: () => string | null;
  constructor(getAccessToken: () => string | null) {
    this.getAccessToken = getAccessToken;
  }

  async findAll(): Promise<Castle[]> {
    const res = await fetch(`${API_BASE}/castles`);
    if (!res.ok) throw new Error(`GET /castles failed: ${res.status}`);
    const items: CastleApiItem[] = await res.json();
    return items.map((item) => ({
      castleId: item.castleId,
      name: item.name,
      location: { latitude: item.latitude, longitude: item.longitude },
      photos: [],
    }));
  }

  async findById(castleId: CastleId): Promise<Castle | undefined> {
    const res = await fetch(`${API_BASE}/castles/${castleId}`);
    if (res.status === 404) return undefined;
    if (!res.ok) throw new Error(`GET /castles/${castleId} failed: ${res.status}`);
    const item: CastleApiItem = await res.json();
    return {
      castleId: item.castleId,
      name: item.name,
      location: { latitude: item.latitude, longitude: item.longitude },
      photos: (item.photos ?? []).map((p) => ({
        photoId: p.photoId,
        castleId: p.castleId,
        caption: p.caption,
      })),
    };
  }

  async save(castle: Castle): Promise<void> {
    const token = this.getAccessToken();
    const res = await fetch(`${API_BASE}/castles/${castle.castleId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        name: castle.name,
        latitude: castle.location.latitude,
        longitude: castle.location.longitude,
      }),
    });
    if (!res.ok) throw new Error(`PUT /castles/${castle.castleId} failed: ${res.status}`);
  }

  async delete(castleId: CastleId): Promise<void> {
    const token = this.getAccessToken();
    const res = await fetch(`${API_BASE}/castles/${castleId}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok && res.status !== 404) throw new Error(`DELETE /castles/${castleId} failed: ${res.status}`);
  }
}
