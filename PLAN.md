# My Castle Album - Implementation Plan

## プロジェクト概要
訪れた日本のお城を地図上のピンで管理し、写真を閲覧・アップロードできるアルバムサイト。

## 環境
- macOS + Windows（クロスプラットフォーム対応）
- モノレポ（pnpm workspaces）
  - `packages/frontend` — React + TypeScript（Vite）
  - `packages/shared` — 型定義・ユビキタス言語（将来的に backend と共有）
- Google Maps JavaScript API（地図・城検索）
- localStorage（初回ストレージ、後にAWS S3/DynamoDBへ差し替え）
- CSS Modules or Tailwind CSS

## 操作仕様
- **閲覧モード（パブリック）**
  - 日本地図上に訪問済み城がピンで表示される
  - ピンをクリックすると城の名前・写真ギャラリーが開く
- **管理モード（アドミン）**
  - Google Maps の検索機能でお城を探してピンを追加できる
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



## Phase 3: インフラ層（LocalStorage）

- [ ] 3-1. `LocalStorageCastleRepository` 実装
- [ ] 3-2. `LocalStoragePhotoRepository` 実装

## Phase 4: 地図・ピン表示 [REVIEW]

- [ ] 4-1. Google Maps API のセットアップ（環境変数・ローダー）
- [ ] 4-2. 日本地図表示コンポーネント（`CastleMap`）
- [ ] 4-3. 城ピンコンポーネント（`CastlePin`）
- [ ] 4-4. ピンクリックで城詳細パネルを開く

## Phase 5: 写真ギャラリー [REVIEW]

- [ ] 5-1. 城詳細モーダルコンポーネント（`CastleDetail`）
- [ ] 5-2. 写真ギャラリーコンポーネント（`PhotoGallery`）

## Phase 6: 管理機能 [REVIEW]

- [ ] 6-1. 管理/閲覧モード切り替え
- [ ] 6-2. Google Maps Places API でお城を検索して追加する機能
- [ ] 6-3. 写真アップロード機能（Base64 → localStorage）

---

## メモ・決定事項
- 初回はフロントエンドのみ。AWSバックエンドは後フェーズ
- Repository パターンで localStorage ↔ AWS の差し替えを吸収する
- 戦略的DDD：ユビキタス言語を先に定義し、コードの命名に一貫して使う
- 認証は初回スコープ外（管理モードはURLアクセスのみで保護なし）
- 写真は Base64 で localStorage に保存（容量に注意。後でS3に差し替え）
- モノレポ：pnpm workspaces を採用。将来 `packages/backend`（AWS Lambda等）を追加しやすい構成
- クロスプラットフォーム：`.gitattributes` で LF 統一、npm scripts は `cross-env` 使用、パス区切り文字は `/` に統一

## 完了済みフェーズ
- Phase 1: プロジェクト基盤 `8057337..3ad56e1`
- Phase 2: ドメインモデル `41158dc..207a691`
