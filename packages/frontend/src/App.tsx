import { useEffect, useState } from 'react';
import type { Castle } from './domain/castle/Castle';
import { LocalStorageCastleRepository } from './infrastructure/localStorage/LocalStorageCastleRepository';
import { seedIfEmpty } from './infrastructure/localStorage/seedData';
import { CastleDetail } from './presentation/components/CastleDetail';
import { CastleMap } from './presentation/components/CastleMap';
import { CastlePin } from './presentation/components/CastlePin';

const repository = new LocalStorageCastleRepository();

function App() {
  const [castles, setCastles] = useState<Castle[]>([]);
  const [selectedCastle, setSelectedCastle] = useState<Castle | null>(null);

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

      {selectedCastle && (
        <CastleDetail
          castle={selectedCastle}
          onClose={() => setSelectedCastle(null)}
        />
      )}
    </div>
  );
}

export default App;
