import { useState, useCallback, useRef, useEffect } from 'react';
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';
import { userPool } from '../../infrastructure/aws/cognitoAuth';

interface AuthState {
  isAuthenticated: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ isAuthenticated: false, error: null });

  // accessToken はメモリ内に保持（XSS でのトークン窃取リスクを最小化）
  const accessTokenRef = useRef<string | null>(null);
  const pendingUserRef = useRef<CognitoUser | null>(null);

  // セッション復元（getSession は非同期のため useEffect で処理）
  useEffect(() => {
    const user = userPool.getCurrentUser();
    if (!user) return;
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (!err && session?.isValid()) {
        accessTokenRef.current = session.getAccessToken().getJwtToken();
        setState({ isAuthenticated: true, error: null });
      }
    });
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<{ mfaRequired: boolean }> => {
      setState({ isAuthenticated: false, error: null });

      return new Promise((resolve, reject) => {
        const cognitoUser = new CognitoUser({
          Username: email,
          Pool: userPool,
          Storage: window.sessionStorage,
        });

        const authDetails = new AuthenticationDetails({
          Username: email,
          Password: password,
        });

        cognitoUser.authenticateUser(authDetails, {
          onSuccess(session) {
            accessTokenRef.current = session.getAccessToken().getJwtToken();
            setState({ isAuthenticated: true, error: null });
            resolve({ mfaRequired: false });
          },
          onFailure(err: Error) {
            const message = friendlyError(err.message);
            setState({ isAuthenticated: false, error: message });
            reject(new Error(message));
          },
          totpRequired() {
            pendingUserRef.current = cognitoUser;
            resolve({ mfaRequired: true });
          },
        });
      });
    },
    []
  );

  const completeMfa = useCallback(async (code: string): Promise<void> => {
    if (!/^\d{6}$/.test(code)) {
      const message = '確認コードは 6 桁の数字で入力してください。';
      setState((prev) => ({ ...prev, error: message }));
      throw new Error(message);
    }

    const cognitoUser = pendingUserRef.current;
    if (!cognitoUser) throw new Error('MFA セッションがありません');

    return new Promise((resolve, reject) => {
      cognitoUser.sendMFACode(
        code,
        {
          onSuccess(session) {
            accessTokenRef.current = session.getAccessToken().getJwtToken();
            pendingUserRef.current = null;
            setState({ isAuthenticated: true, error: null });
            resolve();
          },
          onFailure(err: Error) {
            const message = friendlyError(err.message);
            setState((prev) => ({ ...prev, error: message }));
            reject(new Error(message));
          },
        },
        'SOFTWARE_TOKEN_MFA'
      );
    });
  }, []);

  const logout = useCallback(() => {
    const user = userPool.getCurrentUser();
    if (user) {
      // globalSignOut でサーバー側のトークンも失効させる
      user.globalSignOut({
        onSuccess() {},
        onFailure() {
          // グローバルサインアウト失敗時もローカルは消去
          user.signOut();
        },
      });
    }
    accessTokenRef.current = null;
    pendingUserRef.current = null;
    setState({ isAuthenticated: false, error: null });
  }, []);

  const getAccessToken = useCallback((): string | null => {
    return accessTokenRef.current;
  }, []);

  return {
    isAuthenticated: state.isAuthenticated,
    error: state.error,
    login,
    completeMfa,
    logout,
    getAccessToken,
  };
}

function friendlyError(message: string): string {
  if (message.includes('Incorrect username or password')) {
    return 'メールアドレスまたはパスワードが正しくありません。';
  }
  if (message.includes('Invalid code') || message.includes('Code mismatch')) {
    return '確認コードが正しくありません。';
  }
  // 生の AWS エラーメッセージを UI に露出させない
  return '認証に失敗しました。しばらく後で再試行してください。';
}
