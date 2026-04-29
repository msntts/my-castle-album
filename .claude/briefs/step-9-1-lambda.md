# Step 9-1: Lambda TypeScript プロジェクト基盤

## 前提条件
- `packages/infra/lambda/castles/.gitkeep` と `lambda/photos/.gitkeep` が存在する
- Phase 8 の Terraform 構成が完了している

## 制約（触らないもの）
- `packages/frontend/` は変更しない
- `packages/infra/modules/` の .tf ファイルはこのタスクでは変更しない

## 作成するファイル

```
packages/infra/lambda/
  package.json          ← 依存関係 + build スクリプト
  tsconfig.json         ← TypeScript 設定（Node.js 22 target）
  shared/
    dynamodb.ts         ← DynamoDB DocumentClient シングルトン
    response.ts         ← API Gateway レスポンスヘルパー
    types.ts            ← Castle・Photo 型定義
  castles/
    handler.ts          ← castles-handler のルーティングスケルトン
  photos/
    handler.ts          ← photos-handler のルーティングスケルトン
```

## 手順

### 1. `packages/infra/lambda/package.json`

```json
{
  "name": "lambda",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build": "pnpm build:castles && pnpm build:photos",
    "build:castles": "esbuild castles/handler.ts --bundle --platform=node --target=node22 --outfile=dist/castles/index.js --external:@aws-sdk/*",
    "build:photos": "esbuild photos/handler.ts --bundle --platform=node --target=node22 --outfile=dist/photos/index.js --external:@aws-sdk/*"
  },
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.0.0",
    "@aws-sdk/lib-dynamodb": "^3.0.0",
    "@aws-sdk/client-s3": "^3.0.0",
    "@aws-sdk/s3-request-presigner": "^3.0.0",
    "ulid": "^2.3.0"
  },
  "devDependencies": {
    "@types/aws-lambda": "^8.10.0",
    "@types/node": "^22.0.0",
    "esbuild": "^0.25.0",
    "typescript": "~5.9.0"
  }
}
```

注: `--external:@aws-sdk/*` は Lambda ランタイムに同梱されているため bundle 不要。
ただし Node.js 22 ランタイムに含まれる SDK のバージョンが古い場合は外す。
→ 安全策として bundle に含める（`--external` を外す）ことも可。
  ここでは Lambda サイズを小さくするため external にする。

### 2. `packages/infra/lambda/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist"
  },
  "include": ["**/*.ts"],
  "exclude": ["dist", "node_modules"]
}
```

### 3. `packages/infra/lambda/shared/types.ts`

```typescript
export interface Castle {
  castleId: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface Photo {
  photoId: string;
  castleId: string;
  caption?: string;
}
```

### 4. `packages/infra/lambda/shared/dynamodb.ts`

```typescript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
export const ddb = DynamoDBDocumentClient.from(client);
export const TABLE_NAME = process.env.TABLE_NAME!;
```

### 5. `packages/infra/lambda/shared/response.ts`

```typescript
import type { APIGatewayProxyResultV2 } from "aws-lambda";

export function ok(body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function created(body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode: 201,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function noContent(): APIGatewayProxyResultV2 {
  return { statusCode: 204 };
}

export function badRequest(message: string): APIGatewayProxyResultV2 {
  return {
    statusCode: 400,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  };
}

export function notFound(): APIGatewayProxyResultV2 {
  return {
    statusCode: 404,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Not found" }),
  };
}

export function unauthorized(): APIGatewayProxyResultV2 {
  return {
    statusCode: 401,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Unauthorized" }),
  };
}

export function internalError(err: unknown): APIGatewayProxyResultV2 {
  console.error(err);
  return {
    statusCode: 500,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Internal server error" }),
  };
}
```

### 6. `packages/infra/lambda/castles/handler.ts` スケルトン

```typescript
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { badRequest, internalError, notFound, unauthorized } from "../shared/response";

function requireAuth(event: APIGatewayProxyEventV2): boolean {
  const claims = (event.requestContext as any).authorizer?.jwt?.claims;
  return claims?.token_use === "access";
}

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    const method = event.requestContext.http.method;
    const castleId = event.pathParameters?.castleId;

    // 書き込み系は JWT 検証（Phase 9-5）
    if (method !== "GET" && !requireAuth(event)) {
      return unauthorized();
    }

    // TODO(9-3): Castle CRUD 実装
    return notFound();
  } catch (err) {
    return internalError(err);
  }
};
```

### 7. `packages/infra/lambda/photos/handler.ts` スケルトン

```typescript
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { internalError, notFound, unauthorized } from "../shared/response";

function requireAuth(event: APIGatewayProxyEventV2): boolean {
  const claims = (event.requestContext as any).authorizer?.jwt?.claims;
  return claims?.token_use === "access";
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
```

## 完了確認

- `packages/infra/lambda/` 以下の全ファイルが作成されていること
- .gitkeep ファイルの削除（castles/ と photos/ のそれぞれ）
- TypeScript コンパイルエラーがないこと（`tsc --noEmit` 相当）
  → esbuild でビルドが通ることで確認してもよい
