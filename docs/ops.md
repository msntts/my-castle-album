# My Castle Album — 運用手順書

## 前提条件

| ツール | バージョン | インストール確認 |
|---|---|---|
| AWS CLI v2 | 最新 | `aws --version` |
| Terraform | ~> 1.9 | `terraform --version` |
| pnpm | 10 | `pnpm --version` |
| GitHub CLI | 最新 | `gh --version` |
| Node.js | 22 | `node --version` |

### AWS 認証

IAM Identity Center（SSO）で認証する。Terraform 実行前に毎回ログインする。

```powershell
aws sso login --profile msntts-sso-admin
```

PS1 スクリプトは内部で `aws sso get-role-credentials` を呼び出して認証情報を環境変数に展開するため、ログイン後は追加操作不要。

### コマンドの実行場所

すべてのコマンドは `packages/infra/` ディレクトリで実行する。

---

## コマンドリファレンス

| 操作 | Makefile (Git Bash) | PowerShell |
|---|---|---|
| S3/DynamoDB 初期化 | `make init-backend` | `.\scripts\init-backend.ps1` |
| Lambda ビルド | `make lambda-build` | `cd lambda; pnpm install --frozen-lockfile; pnpm build` |
| terraform init | `make tf-init` | `terraform init` |
| terraform plan | `make tf-plan` | `.\scripts\tf-plan.ps1` |
| terraform apply | `make tf-apply` | `terraform apply -input=false tfplan` |
| GitHub OIDC ロール import | `make tf-import-cicd` | `.\scripts\import-cicd.ps1` |
| GitHub Secrets 設定 | `make set-secrets` | `.\scripts\set-secrets.ps1` |
| 管理者ユーザー作成 | `make create-admin USERNAME=x PASSWORD=y` | `.\scripts\create-admin.ps1 -Username x -Password y` |
| MFA TOTP 登録 | `make setup-mfa USERNAME=x` | `.\scripts\setup-mfa.ps1 -Username x` |
| フロントエンド手動デプロイ | `make deploy-frontend` | `.\scripts\deploy-frontend.ps1` |
| 全リソース廃棄 | `make destroy` | `.\scripts\destroy.ps1` |
| State バックエンド削除 | `make destroy-backend` | `.\scripts\destroy-backend.ps1` |
| GitHub Secrets 削除 | `make delete-secrets` | `.\scripts\delete-secrets.ps1` |

---

## 初回構築手順

### Step 1: Terraform State バックエンド作成

S3 バックエンドを使う Terraform 自体は Terraform で管理できないため、ここだけ手動で作成する。

```
make init-backend  /  .\scripts\init-backend.ps1
```

### Step 2: Lambda ビルド

```
make lambda-build
```

### Step 3: Terraform 初回 apply（1回目）

`frontend_origin` はこの時点では CloudFront ドメインが未確定のため、スクリプトが自動でプレースホルダーを使用する。

```
make tf-init
```

GitHub OIDC プロバイダーまたは IAM ロール (`github-actions-terraform` / `github-actions-deploy`) がアカウントに既存の場合は、plan 前に import して State に取り込む:

```
make tf-import-cicd  /  .\scripts\import-cicd.ps1
```

```
make tf-plan
make tf-apply
```

### Step 4: CloudFront ドメインを取得して再 apply

```
terraform output cloudfront_domain
make tf-plan
make tf-apply
```

### Step 5: 管理者ユーザー作成（Cognito）

`PASSWORD` は 16 文字以上・大文字小文字・数字・記号を混在させること。

```
make create-admin USERNAME=your@email.com PASSWORD=xxxxxx
```

内部で `admin-create-user` → `admin-set-user-password --permanent` の順に実行される。
フロントエンドが Cognito の `NEW_PASSWORD_REQUIRED` チャレンジに未対応のため、恒久パスワードへの昇格が必須。

### Step 6: GitHub Secrets 設定

```
make set-secrets  /  .\scripts\set-secrets.ps1
```

`TF_VAR_ALERT_EMAIL` は `Makefile` の `ALERT_EMAIL` 変数または `set-secrets.ps1` の `-AlertEmail` 引数で指定する。

### Step 7: 初回デプロイ

```
git push -u origin main
gh run list --limit 5
gh run watch
```

### Step 8: 管理者としてサインインする

デプロイ完了後、CloudFront URL をブラウザで開く。

```
terraform output cloudfront_domain
```

1. 画面左上の **「管理モードへ」** ボタンをクリック
2. Step 5 で指定したメールアドレスとパスワードでサインイン

> **注意**: MFA 必須化が完了するまでパスワードのみでサインイン可能な状態になる。この期間中はサイトを外部公開しないこと。
>
> MFA 設定手順（アプリに TOTP 登録 UI がないため AWS CLI で実施する）:
>
> **手順 1: TOTP デバイスを登録する**
>
> ```
> make setup-mfa USERNAME=<メールアドレス>
> ```
> PowerShell: `.\scripts\setup-mfa.ps1 -Username <メールアドレス>`
>
> パスワードは実行時に対話入力を求められる（シェル履歴に残さないため）。
>
> 実行すると SecretCode が表示されるので、Google Authenticator の「セットアップキーを入力」で登録する。
> 表示された 6 桁コードをプロンプトに入力すると登録が確定する。
>
> **手順 2: `packages/infra/modules/auth/main.tf` の `mfa_configuration = "OPTIONAL"` を `"ON"` に変更**
>
> **手順 3: `make tf-plan && make tf-apply` を再実行 → MFA 必須化**

---

## 通常の運用

### コードを変更してデプロイ

```
git add .
git commit -m "変更内容"
git push
```

GitHub Actions が自動で以下を実行:
- `packages/frontend/**` 変更 → CI → CD Frontend（S3 sync + CloudFront invalidation）
- `packages/infra/**` 変更 → CI → CD Infra（terraform plan + apply）

### Terraform を手動で apply する（緊急時）

```
make tf-plan && make tf-apply
```

### フロントエンドを手動でデプロイする（緊急時）

```
make deploy-frontend  /  .\scripts\deploy-frontend.ps1
```

---

## 廃棄手順

> 完全削除。元に戻せない操作を含む。CloudFront の無効化には 15〜30 分かかる場合がある。

### Step 1-2: リソース削除

Cognito User Pool には `prevent_destroy = true` が設定されているため、スクリプトが State から除外してから destroy する。

```
make destroy  /  .\scripts\destroy.ps1
```

### Step 3: Terraform State バックエンドを削除

```
make destroy-backend  /  .\scripts\destroy-backend.ps1
```

### Step 4: GitHub Secrets 削除

```
make delete-secrets  /  .\scripts\delete-secrets.ps1
```
