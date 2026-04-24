# My Castle Album — プロジェクト規約

## 技術スタック

- **モノレポ**: pnpm workspaces
  - `packages/frontend`: React + TypeScript (Vite)
  - `packages/shared`: 共有型定義
  - `packages/infra`: AWS CDK TypeScript（Phase 8以降）
- **地図**: Leaflet.js + OpenStreetMap（APIキー不要）
- **ストレージ**: localStorage → AWS（DynamoDB + S3）移行予定

## アーキテクチャ原則

- Repository パターンで localStorage ↔ AWS の差し替えを吸収する（`CastleRepository`・`ImageStorage` インターフェース）
- ドメインモデルは画像データを持たない。画像は `ImageStorage` インターフェースで隔離する
- ユビキタス言語を `docs/ubiquitous-language.md` で定義し、コード命名に一貫して使う
- 戦略的 DDD アプローチ（詳細: `docs/ubiquitous-language.md`）

## ドキュメント構造

- **`PLAN.md`**: フェーズ概要とタスク一覧のみ。詳細設計は書かない
- **`docs/`**: 詳細設計ドキュメント（テーブル設計・API仕様・フロー図・コスト見積もり等）
- `PLAN.md` から `docs/` へは `→ 詳細: docs/xxx.md` の形式でリンクする

計画・設計作業の前に必ず `docs/` を確認して既存構成を把握すること。
Plan エージェントなど外部エージェントへの指示にも「詳細は `docs/` に分離すること」を明示すること。
エージェントが返した結果をそのまま `PLAN.md` に貼らず、既存構成と照合してから書き込む。

## フォーマット・型チェック

Prettier は未導入。コミット前に以下を実行する：

```bash
pnpm -F frontend lint       # ESLint
pnpm -F frontend typecheck  # tsc --noEmit
```

エラーがあれば修正してから同じコミットに含める。

## スキルの使い分け

| 場面 | スキル |
|------|--------|
| 機能追加・バグ修正・リファクタリング | `/execute` |
| 新機能・インフラの設計判断が必要 | Plan エージェントを呼び出す |
| コミット前のコードレビュー | `/review`（グローバル CLAUDE.md により自動適用） |
| 原因不明の不具合調査 | `/investigate` |
