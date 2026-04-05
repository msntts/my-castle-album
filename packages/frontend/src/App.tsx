import { useState } from 'react';
import type { Castle } from './domain/castle/Castle';
import { LocalStorageCastleRepository } from './infrastructure/localStorage/LocalStorageCastleRepository';
import { CastleMap } from './presentation/components/CastleMap';
import { CastlePin } from './presentation/components/CastlePin';
import { useEffect } from 'react';

const repository = new LocalStorageCastleRepository();

function App() {
  const [castles, setCastles] = useState<Castle[]>([]);
  const [selectedCastle, setSelectedCastle] = useState<Castle | null>(null);

  useEffect(() => {
    repository.findAll().then(setCastles);
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

      {selectedCastle && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 1000,
            background: 'white',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            minWidth: '200px',
          }}
        >
          <button
            onClick={() => setSelectedCastle(null)}
            style={{ float: 'right', cursor: 'pointer' }}
          >
            ✕
          </button>
          <h2 style={{ margin: '0 0 8px' }}>{selectedCastle.name}</h2>
          <p style={{ margin: 0, fontSize: '0.85em', color: '#666' }}>
            {selectedCastle.photos.length} 枚の写真
          </p>
        </div>
      )}
    </div>
  );
}

export default App;
