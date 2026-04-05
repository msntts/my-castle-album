export type CastleId = string;

export interface Location {
  latitude: number;
  longitude: number;
}

export interface Castle {
  castleId: CastleId;
  name: string;
  location: Location;
  visitedAt: Date;
  placeId?: string;
}

export function createCastle(params: {
  castleId: CastleId;
  name: string;
  location: Location;
  visitedAt: Date;
  placeId?: string;
}): Castle {
  if (!params.name.trim()) {
    throw new Error('城名は必須です');
  }
  if (
    params.location.latitude < -90 ||
    params.location.latitude > 90 ||
    params.location.longitude < -180 ||
    params.location.longitude > 180
  ) {
    throw new Error('無効な座標です');
  }
  return { ...params };
}
