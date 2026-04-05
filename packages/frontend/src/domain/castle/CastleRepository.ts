import type { Castle, CastleId } from './Castle';

export interface CastleRepository {
  findAll(): Promise<Castle[]>;
  findById(castleId: CastleId): Promise<Castle | undefined>;
  save(castle: Castle): Promise<void>;
  delete(castleId: CastleId): Promise<void>;
}
