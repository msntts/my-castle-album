# My Castle Album - Implementation Plan

## プロジェクト概要
訪れた日本のお城を地図上のピンで管理し、写真を閲覧・アップロードできるアルバムサイト。

## 環境
- macOS + Windows（クロスプラットフォーム対応）
- モノレポ（pnpm workspaces）
  - `packages/frontend` — React + TypeScript（Vite）
  - `packages/shared` — 型定義・ユビキタス言語（将来的に backend と共有）
- Leaflet.js + OpenStreetMap（地図・ピン表示、APIキー不要）
- Nominatim（OSMジオコーディング、城名検索）
- localStorage（初回ストレージ、後にAWS S3/DynamoDBへ差し替え）
- CSS Modules or Tailwind CSS

## 操作仕様
- **閲覧モード（パブリック）**
  - 日本地図上に訪問済み城がピンで表示される
  - ピンをクリックすると城の名前・写真ギャラリーが開く
- **管理モード（アドミン）**
  - Nominatim（OSM）でお城を名前検索してピンを追加できる
  - 城ごとに写真をアップロードできる（Base64でlocalStorageに保存）
  - 管理/閲覧モードの切り替えボタン

## 受け入れ条件
- 日本地図が表示され、登録したお城のピンが表示される
- ピンをクリックすると写真ギャラリーが表示される
- 管理モードでお城を追加・写真をアップロードできる
- ページリロード後もデータが保持される（localStorage）

## 完了条件
- TypeScript の型エラーがないこと（`tsc --noEmit`）
- 不要ファイル・生成物がバージョン管理から外れていること（.gitignore）

---

## 🔥 Hotfix（最優先）

<!-- 動作確認中の不具合・緊急対応はここに積む -->

---




## Phase 6: 管理機能 [REVIEW]

- [x] 6-1. 管理/閲覧モード切り替え
- [x] 6-2. Nominatim でお城を名前検索して追加する機能
- [x] 6-3. 写真アップロード機能（Base64 → localStorage）

---

## メモ・決定事項
- 初回はフロントエンドのみ。AWSバックエンドは後フェーズ
- Repository パターンで localStorage ↔ AWS の差し替えを吸収する
- 戦略的DDD：ユビキタス言語を先に定義し、コードの命名に一貫して使う
- 認証は初回スコープ外（管理モードはURLアクセスのみで保護なし）
- 画像データはドメインに持たせない。`ImageStorage` インターフェースで隔離（localStorage実装ではBase64、将来S3 URLを返す）
- `Photo` ドメインは画像メタデータのみ（photoId, castleId, caption）。日付系は不要と判断
- `Castle` ドメインも visitedAt 不要。castleId, name, location のみ
- モノレポ：pnpm workspaces を採用。将来 `packages/backend`（AWS Lambda等）を追加しやすい構成
- クロスプラットフォーム：`.gitattributes` で LF 統一、npm scripts は `cross-env` 使用、パス区切り文字は `/` に統一
- 地図：Google Maps を使わず Leaflet.js + OpenStreetMap を採用（APIキー・クレカ登録不要）。城検索は Nominatim（無料）

## 完了済みフェーズ
- Phase 1: プロジェクト基盤 `8057337..3ad56e1`
- Phase 2: ドメインモデル `41158dc..207a691`
- Phase 2b: ドメインモデル再設計 `c83e835..5dd34d6`
- Phase 3: インフラ層（LocalStorage） `a01871c..e37be15`
- Phase 4: 地図・ピン表示 `c71d76c..8dbdbbb`
- Phase 5: 写真ギャラリー `e01f071..e01f071`
