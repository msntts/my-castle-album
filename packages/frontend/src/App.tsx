import { useEffect, useMemo, useState } from 'react';
import type { Castle } from './domain/castle/Castle';
import type { CastleRepository } from './domain/castle/CastleRepository';
import type { ImageStorage } from './domain/photo/ImageStorage';
import { AwsCastleRepository } from './infrastructure/aws/AwsCastleRepository';
import { AwsImageStorage } from './infrastructure/aws/AwsImageStorage';
import { LocalStorageCastleRepository } from './infrastructure/localStorage/LocalStorageCastleRepository';
import { LocalStorageImageStorage } from './infrastructure/localStorage/LocalStorageImageStorage';
import { seedIfEmpty } from './infrastructure/localStorage/seedData';
import { AddCastleForm } from './presentation/components/AddCastleForm';
import { CastleDetail } from './presentation/components/CastleDetail';
import { CastleMap } from './presentation/components/CastleMap';
import { CastlePin } from './presentation/components/CastlePin';
import { LoginModal } from './presentation/components/LoginModal';
import { useAuth } from './presentation/hooks/useAuth';

const USE_AWS = import.meta.env.VITE_USE_AWS === 'true';

function App() {
  const { isAuthenticated, error: authError, login, completeMfa, logout, getAccessToken } = useAuth();
  const [castles, setCastles] = useState<Castle[]>([]);
  const [selectedCastle, setSelectedCastle] = useState<Castle | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const repository: CastleRepository = useMemo(
    () => USE_AWS ? new AwsCastleRepository(getAccessToken) : new LocalStorageCastleRepository(),
    [getAccessToken],
  );

  const imageStorage: ImageStorage = useMemo(() => {
    if (!selectedCastle || !USE_AWS) return new LocalStorageImageStorage();
    return new AwsImageStorage(selectedCastle.castleId, getAccessToken);
  }, [selectedCastle, getAccessToken]);

  useEffect(() => {
    const load = async () => {
      if (!USE_AWS) await seedIfEmpty();
      const all = await repository.findAll();
      setCastles(all);
    };
    load();
  }, [repository]);

  // AWS モードでログイン成功後に管理モードへ移行
  async function handleLogin(email: string, password: string) {
    const result = await login(email, password);
    if (!result.mfaRequired) {
      setShowLogin(false);
      setIsAdminMode(true);
    }
    return result;
  }

  async function handleMfa(code: string) {
    await completeMfa(code);
    setShowLogin(false);
    setIsAdminMode(true);
  }

  function handleAdminToggle() {
    if (isAdminMode) {
      if (USE_AWS) logout();
      setIsAdminMode(false);
    } else {
      if (USE_AWS && !isAuthenticated) {
        setShowLogin(true);
      } else {
        setIsAdminMode(true);
      }
    }
  }

  function handleSelectCastle(castle: Castle) {
    setSelectedCastle(castle);
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <CastleMap>
        {castles.map((castle) => (
          <CastlePin
            key={castle.castleId}
            castle={castle}
            onClick={handleSelectCastle}
          />
        ))}
      </CastleMap>

      <button
        onClick={handleAdminToggle}
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
        {isAdminMode ? (USE_AWS ? 'ログアウト' : '管理モード中') : '管理モードへ'}
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
          imageStorage={imageStorage}
          castleRepository={USE_AWS ? undefined : repository}
        />
      )}

      {showLogin && (
        <LoginModal
          onLogin={handleLogin}
          onMfa={handleMfa}
          error={authError}
        />
      )}
    </div>
  );
}

export default App;
