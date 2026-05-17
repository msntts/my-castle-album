import { useState } from 'react';

interface Props {
  onLogin: (email: string, password: string) => Promise<{ mfaRequired: boolean }>;
  onMfa: (code: string) => Promise<void>;
  error: string | null;
  onClose?: () => void;
}

export function LoginModal({ onLogin, onMfa, error, onClose }: Props) {
  const [step, setStep] = useState<'credentials' | 'mfa'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await onLogin(email, password);
      if (result.mfaRequired) {
        setStep('mfa');
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMfaSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onMfa(totpCode);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>管理者ログイン</h2>
          {onClose && (
            <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1rem', color: '#666', padding: '0 4px' }}>
              ✕
            </button>
          )}
        </div>

        {step === 'credentials' ? (
          <form onSubmit={handleCredentialsSubmit}>
            <div style={fieldStyle}>
              <label>メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                style={inputStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label>パスワード</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={inputStyle}
              />
            </div>
            {error && <p style={errorStyle}>{error}</p>}
            <button type="submit" disabled={isLoading} style={buttonStyle}>
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleMfaSubmit}>
            <p style={{ margin: '0 0 12px', fontSize: '14px', color: '#555' }}>
              認証アプリの 6 桁のコードを入力してください。
            </p>
            <div style={fieldStyle}>
              <label>確認コード</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                required
                autoComplete="one-time-code"
                style={inputStyle}
              />
            </div>
            {error && <p style={errorStyle}>{error}</p>}
            <button type="submit" disabled={isLoading} style={buttonStyle}>
              {isLoading ? '確認中...' : '確認'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
};

const modalStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '8px',
  padding: '28px 32px',
  width: '320px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
};

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  marginBottom: '16px',
  fontSize: '14px',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  fontSize: '14px',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  background: '#2c3e50',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  fontSize: '14px',
  cursor: 'pointer',
  fontWeight: 'bold',
};

const errorStyle: React.CSSProperties = {
  color: '#c0392b',
  fontSize: '13px',
  margin: '0 0 12px',
};
