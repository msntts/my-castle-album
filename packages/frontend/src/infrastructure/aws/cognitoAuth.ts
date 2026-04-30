import { CognitoUserPool } from 'amazon-cognito-identity-js';

// モジュールスコープでシングルトン化し、複数インスタンスの生成を防ぐ
export const userPool = new CognitoUserPool({
  UserPoolId: (import.meta.env.VITE_COGNITO_USER_POOL_ID as string | undefined) ?? '',
  ClientId: (import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined) ?? '',
  Storage: window.sessionStorage,
});
