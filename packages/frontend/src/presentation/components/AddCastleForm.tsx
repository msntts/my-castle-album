import { useState } from 'react';
import type { Castle } from '../../domain/castle/Castle';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface AddCastleFormProps {
  onAdd: (castle: Omit<Castle, 'photos'>) => Promise<void>;
}

export function AddCastleForm({ onAdd }: AddCastleFormProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        countrycodes: 'jp',
        limit: '5',
      });
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { 'Accept-Language': 'ja' },
      });
      const data: NominatimResult[] = await res.json();
      if (data.length === 0) setError('見つかりませんでした');
      setResults(data);
    } catch {
      setError('検索に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function select(result: NominatimResult) {
    const castle: Omit<Castle, 'photos'> = {
      castleId: `castle-${result.place_id}`,
      name: query.trim(),
      location: {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
      },
    };
    await onAdd(castle);
    setQuery('');
    setResults([]);
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        background: 'white',
        padding: '12px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        width: '320px',
      }}
    >
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="城名を入力（例: 姫路城）"
          style={{ flex: 1, padding: '6px 8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button
          onClick={search}
          disabled={loading}
          style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', background: '#2c3e50', color: 'white', cursor: 'pointer' }}
        >
          {loading ? '…' : '検索'}
        </button>
      </div>

      {error && <p style={{ margin: '8px 0 0', color: '#c0392b', fontSize: '0.85em' }}>{error}</p>}

      {results.length > 0 && (
        <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none' }}>
          {results.map((r) => (
            <li key={r.place_id}>
              <button
                onClick={() => select(r)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '6px 8px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontSize: '0.85em',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0f0')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                {r.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
