import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Castle } from './domain/castle/Castle';
import type { CastleRepository } from './domain/castle/CastleRepository';
import type { ImageStorage } from './domain/photo/ImageStorage';
import { AwsCastleRepository } from './infrastructure/aws/AwsCastleRepository';
import { AwsImageStorage } from './infrastructure/aws/AwsImageStorage';
import { LocalStorageCastleRepository } from './infrastructure/localStorage/LocalStorageCastleRepository';
import { LocalStorageImageStorage } from './infrastructure/localStorage/LocalStorageImageStorage';
import { seedIfEmpty } from './infrastructure/localStorage/seedData';
import { AddCastleForm } from './presentation/components/AddCastleForm';
import { AppLayout } from './presentation/components/AppLayout';
import { CastleDetail } from './presentation/components/CastleDetail';
import { CastleMap } from './presentation/components/CastleMap';
import { CastlePin } from './presentation/components/CastlePin';
import { LoginModal } from './presentation/components/LoginModal';
import { MascotCharacter } from './presentation/components/MascotCharacter';
import { useAuth } from './presentation/hooks/useAuth';

const USE_AWS = import.meta.env.VITE_USE_AWS === 'true';

function App() {
  const { isAuthenticated, error: authError, login, completeMfa, logout, getAccessToken } = useAuth();
  const [castles, setCastles] = useState<Castle[]>([]);
  const [selectedCastle, setSelectedCastle] = useState<Castle | null>(null);
  const [isLoadingCastle, setIsLoadingCastle] = useState(false);
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

  const localPinImageStorage: ImageStorage = useMemo(() => new LocalStorageImageStorage(), []);
  const awsPinStorageMap = useRef<Map<string, AwsImageStorage>>(new Map());
  const getPinImageStorage = useCallback((castleId: string): ImageStorage => {
    if (!USE_AWS) return localPinImageStorage;
    if (!awsPinStorageMap.current.has(castleId)) {
      awsPinStorageMap.current.set(castleId, new AwsImageStorage(castleId, getAccessToken));
    }
    return awsPinStorageMap.current.get(castleId)!;
  }, [getAccessToken, localPinImageStorage]);

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

  async function handleCastleSelect(castle: Castle) {
    if (!USE_AWS) {
      setSelectedCastle(castle);
      return;
    }
    setIsLoadingCastle(true);
    try {
      const detail = await repository.findById(castle.castleId);
      setSelectedCastle(detail ?? castle);
    } finally {
      setIsLoadingCastle(false);
    }
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

  return (
    <AppLayout
      mapContent={
        <CastleMap>
          {castles.map((castle) => (
            <CastlePin
              key={castle.castleId}
              castle={castle}
              onClick={handleCastleSelect}
              imageStorage={getPinImageStorage(castle.castleId)}
              draggable={isAdminMode}
              onPositionChange={async (lat, lng) => {
                const updated: Castle = {
                  ...castle,
                  location: { latitude: lat, longitude: lng },
                };
                await repository.save(updated);
                setCastles((prev) =>
                  prev.map((c) => (c.castleId === castle.castleId ? updated : c))
                );
                if (selectedCastle?.castleId === castle.castleId) {
                  setSelectedCastle(updated);
                }
              }}
            />
          ))}
        </CastleMap>
      }
      overlayContent={
        <>
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

          {isLoadingCastle && (
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
                minWidth: '260px',
              }}
            >
              読み込み中...
            </div>
          )}

          {selectedCastle && !isLoadingCastle && (
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
              onDelete={async () => {
                await repository.delete(selectedCastle.castleId);
                setCastles((prev) => prev.filter((c) => c.castleId !== selectedCastle.castleId));
                setSelectedCastle(null);
              }}
              imageStorage={imageStorage}
              castleRepository={repository}
            />
          )}

          {showLogin && (
            <LoginModal
              onLogin={handleLogin}
              onMfa={handleMfa}
              error={authError}
            />
          )}
        </>
      }
      mascot={<MascotCharacter />}
    />
  );
}

export default App;
