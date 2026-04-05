import type { Castle, CastleId } from '../../domain/castle/Castle';
import type { CastleRepository } from '../../domain/castle/CastleRepository';

const STORAGE_KEY = 'castles';

function loadAll(): Castle[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Castle[];
  } catch {
    return [];
  }
}

function saveAll(castles: Castle[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(castles));
}

export class LocalStorageCastleRepository implements CastleRepository {
  async findAll(): Promise<Castle[]> {
    return loadAll();
  }

  async findById(castleId: CastleId): Promise<Castle | undefined> {
    return loadAll().find((c) => c.castleId === castleId);
  }

  async save(castle: Castle): Promise<void> {
    const castles = loadAll();
    const index = castles.findIndex((c) => c.castleId === castle.castleId);
    if (index === -1) {
      castles.push(castle);
    } else {
      castles[index] = castle;
    }
    saveAll(castles);
  }

  async delete(castleId: CastleId): Promise<void> {
    saveAll(loadAll().filter((c) => c.castleId !== castleId));
  }
}
