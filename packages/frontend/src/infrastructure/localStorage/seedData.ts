import type { Castle } from '../../domain/castle/Castle';
import { LocalStorageCastleRepository } from './LocalStorageCastleRepository';

const SEED_CASTLES: Castle[] = [
  {
    castleId: 'castle-osaka',
    name: '大阪城',
    location: { latitude: 34.6873, longitude: 135.5262 },
    photos: [],
  },
];

export async function seedIfEmpty(): Promise<void> {
  const repository = new LocalStorageCastleRepository();
  const existing = await repository.findAll();
  if (existing.length > 0) return;
  for (const castle of SEED_CASTLES) {
    await repository.save(castle);
  }
}
