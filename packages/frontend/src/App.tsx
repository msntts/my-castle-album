import { useEffect, useState } from 'react';
import type { Castle } from './domain/castle/Castle';
import { LocalStorageCastleRepository } from './infrastructure/localStorage/LocalStorageCastleRepository';
import { seedIfEmpty } from './infrastructure/localStorage/seedData';
import { AddCastleForm } from './presentation/components/AddCastleForm';
import { CastleDetail } from './presentation/components/CastleDetail';
import { CastleMap } from './presentation/components/CastleMap';
import { CastlePin } from './presentation/components/CastlePin';

const repository = new LocalStorageCastleRepository();

function App() {
  const [castles, setCastles] = useState<Castle[]>([]);
  const [selectedCastle, setSelectedCastle] = useState<Castle | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);

  useEffect(() => {
    seedIfEmpty().then(() => repository.findAll()).then(setCastles);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <CastleMap>
        {castles.map((castle) => (
          <CastlePin
            key={castle.castleId}
            castle={castle}
            onClick={setSelectedCastle}
          />
        ))}
      </CastleMap>

      {/* モード切り替えボタン */}
      <button
        onClick={() => setIsAdminMode((v) => !v)}
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 1000,
          padding: '8px 14px',
          borderRadius: '6px',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 'bold',
          background: isAdminMode ? '#c0392b' : '#2c3e50',
          color: 'white',
        }}
      >
        {isAdminMode ? '管理モード中' : '管理モードへ'}
      </button>

      {isAdminMode && (
        <AddCastleForm
          onAdd={async (castleWithoutPhotos) => {
            const castle: Castle = { ...castleWithoutPhotos, photos: [] };
            await repository.save(castle);
            setCastles((prev) => [...prev, castle]);
          }}
        />
      )}

      {selectedCastle && (
        <CastleDetail
          castle={selectedCastle}
          isAdminMode={isAdminMode}
          onClose={() => setSelectedCastle(null)}
          onCastleUpdated={(updated) => {
            setCastles((prev) =>
              prev.map((c) => (c.castleId === updated.castleId ? updated : c))
            );
            setSelectedCastle(updated);
          }}
        />
      )}
    </div>
  );
}

export default App;
