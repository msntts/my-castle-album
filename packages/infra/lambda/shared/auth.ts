import type { APIGatewayProxyEventV2 } from "aws-lambda";

interface AuthorizerContext {
  jwt?: { claims?: { token_use?: string } };
}

// API Gateway JWT Authorizer が Cognito JWKS で署名・iss・audience を自動検証する。
// Lambda 側では token_use = "access" のみ確認し、idToken の誤送信を防ぐ。
export function requireAuth(event: APIGatewayProxyEventV2): boolean {
  const auth = (
    event.requestContext as unknown as { authorizer?: AuthorizerContext }
  ).authorizer;
  return auth?.jwt?.claims?.token_use === "access";
}
