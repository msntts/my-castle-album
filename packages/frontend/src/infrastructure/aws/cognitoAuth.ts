import { CognitoUserPool } from 'amazon-cognito-identity-js';

let _userPool: CognitoUserPool | null = null;

export function getUserPool(): CognitoUserPool {
  if (!_userPool) {
    _userPool = new CognitoUserPool({
      UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID as string,
      ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID as string,
      Storage: window.sessionStorage,
    });
  }
  return _userPool;
}
