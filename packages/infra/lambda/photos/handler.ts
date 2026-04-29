import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { internalError, notFound, unauthorized } from "../shared/response";

interface JwtClaims {
  token_use?: string;
}
interface AuthorizerContext {
  jwt?: { claims?: JwtClaims };
}

// API Gateway JWT Authorizer が Cognito JWKS で署名・iss・audience を自動検証する。
// ここでは token_use のみ追加チェックして idToken の誤送信を防ぐ（Phase 9-5 で完全実装）。
function requireAuth(event: APIGatewayProxyEventV2): boolean {
  const auth = (
    event.requestContext as unknown as { authorizer?: AuthorizerContext }
  ).authorizer;
  return auth?.jwt?.claims?.token_use === "access";
}

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    if (!requireAuth(event)) {
      return unauthorized();
    }

    // TODO(9-4): Photo Presigned URL フロー実装
    return notFound();
  } catch (err) {
    return internalError(err);
  }
};
