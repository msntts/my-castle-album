# Step 8-1: packages/infra パッケージ作成（Terraform ルート構成）

## 前提条件
- `packages/infra/terraform.tfvars.example` が既に存在する
- `.gitignore` に Terraform 除外設定済み

## 制約（触らないもの）
- `packages/frontend/` 以下は一切変更しない
- `packages/infra/terraform.tfvars.example` は上書きしない（既存内容を保持）
- `packages/shared/` は変更しない

## 作成するファイル一覧

```
packages/infra/
  package.json           ← pnpm workspace に認識させるための最小構成
  main.tf                ← provider + backend（ローカル state）
  variables.tf           ← 変数定義
  outputs.tf             ← 空ファイル（後のモジュール追加で埋める）
  modules/
    storage/
      main.tf            ← 空ファイル（8-2 以降で追記）
      variables.tf       ← 空ファイル
      outputs.tf         ← 空ファイル
    api/
      main.tf            ← 空ファイル（Phase 9 で追記）
      variables.tf       ← 空ファイル
      outputs.tf         ← 空ファイル
    auth/
      main.tf            ← 空ファイル（Phase 10 で追記）
      variables.tf       ← 空ファイル
      outputs.tf         ← 空ファイル
    cicd/
      main.tf            ← 空ファイル（Phase 12 で追記）
      variables.tf       ← 空ファイル
      outputs.tf         ← 空ファイル
  lambda/
    castles/
      .gitkeep
    photos/
      .gitkeep
```

## 手順

### 1. `packages/infra/package.json` を作成

```json
{
  "name": "@my-castle-album/infra",
  "version": "0.0.0",
  "private": true
}
```

### 2. `packages/infra/main.tf` を作成

docs/aws-architecture.md の Phase 8-1 の内容を使用。
backend は Phase 12 まではローカル state（backend ブロックなし）。

```hcl
terraform {
  required_version = "~> 1.9"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

data "aws_caller_identity" "current" {}

module "storage" {
  source          = "./modules/storage"
  region          = var.region
  frontend_origin = var.frontend_origin
  account_id      = data.aws_caller_identity.current.account_id
}
```

### 3. `packages/infra/variables.tf` を作成

```hcl
variable "region" {
  type    = string
  default = "ap-northeast-1"
}

variable "frontend_origin" {
  type        = string
  description = "本番フロントエンドのオリジン（例: https://example.com）"
}
```

### 4. `packages/infra/outputs.tf` を作成（空）

```hcl
# Phase 8-4 以降にモジュール出力をここで公開する
```

### 5. 各モジュールディレクトリのファイルを作成

`modules/storage/main.tf`・`variables.tf`・`outputs.tf`（空プレースホルダー）
`modules/api/`・`modules/auth/`・`modules/cicd/` も同様。

`modules/storage/variables.tf` は後のステップで必要な変数を事前定義：
```hcl
variable "region"          { type = string }
variable "frontend_origin" { type = string }
variable "account_id"      { type = string }
```

### 6. `lambda/castles/.gitkeep` と `lambda/photos/.gitkeep` を作成

## 完了確認

- `packages/infra/main.tf` が存在すること
- `packages/infra/modules/storage/main.tf` が存在すること（空で可）
- Terraform が使える環境なら `cd packages/infra && terraform init` が通ること
  （インストールされていない場合はファイル作成のみで完了とする）
