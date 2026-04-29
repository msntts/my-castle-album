export interface Castle {
  castleId: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface Photo {
  photoId: string;
  castleId: string;
  caption?: string;
}
