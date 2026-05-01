# My Castle Album — 運用手順書

## 前提条件

| ツール | バージョン | インストール確認 |
|---|---|---|
| AWS CLI v2 | 最新 | `aws --version` |
| Terraform | ~> 1.9 | `terraform --version` |
| pnpm | 10 | `pnpm --version` |
| GitHub CLI | 最新 | `gh --version` |
| Node.js | 22 | `node --version` |

AWS 認証情報を事前に設定する:

```bash
aws configure
# AWS Access Key ID: <管理者 IAM ユーザーのキー>
# AWS Secret Access Key: <シークレット>
# Default region name: ap-northeast-1
# Default output format: json
```

---

## 初回構築手順

### Step 1: Terraform State バックエンド作成

> S3 バックエンドを使う Terraform 自体は terraform で管理できないため、ここだけ手動で作成する。

```bash
# S3 バケット作成
aws s3api create-bucket \
  --bucket my-castle-album-tfstate \
  --region ap-northeast-1 \
  --create-bucket-configuration LocationConstraint=ap-northeast-1

# バージョニング有効化（誤操作からの復元用）
aws s3api put-bucket-versioning \
  --bucket my-castle-album-tfstate \
  --versioning-configuration Status=Enabled

# パブリックアクセスをすべてブロック
aws s3api put-public-access-block \
  --bucket my-castle-album-tfstate \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# サーバーサイド暗号化（State ファイルには IAM ARN 等の機密情報が含まれるため必須）
aws s3api put-bucket-encryption \
  --bucket my-castle-album-tfstate \
  --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# DynamoDB ロックテーブル作成（同時実行防止）
aws dynamodb create-table \
  --table-name my-castle-album-tfstate-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-northeast-1
```

### Step 2: Lambda ビルド

```bash
cd packages/infra/lambda
pnpm install --frozen-lockfile
pnpm build
cd ../../..
```

### Step 3: Terraform 初回 apply（1回目）

`frontend_origin`（CORS 設定に使用）はこの時点では CloudFront ドメインが未確定のため、一時的にプレースホルダーを使用する。

```bash
cd packages/infra
terraform init

terraform plan -input=false -out=tfplan \
  -var="alert_email=your@email.com" \
  -var="frontend_origin=https://placeholder.example.com"

terraform apply -input=false tfplan
```

### Step 4: CloudFront ドメインを取得して再 apply

```bash
# CloudFront ドメイン（例: d1xxxxxxxx.cloudfront.net）を確認
terraform output cloudfront_domain

# frontend_origin を正しい値で再 apply
terraform plan -input=false -out=tfplan \
  -var="alert_email=your@email.com" \
  -var="frontend_origin=https://$(terraform output -raw cloudfront_domain)"

terraform apply -input=false tfplan
```

### Step 5: 管理者ユーザー作成（Cognito）

```bash
POOL_ID=$(terraform output -raw cognito_user_pool_id)

# 管理者アカウント作成（初回サインイン時にパスワード変更が必要）
aws cognito-idp admin-create-user \
  --user-pool-id "$POOL_ID" \
  --username your@email.com \
  --temporary-password '<TEMP_PASSWORD>' \  # 16文字以上・大小英数記号混在で設定すること
  --message-action SUPPRESS
```

> **注意**: MFA 必須化（手順4）が完了するまでの間、パスワードのみで管理者サインインが可能な状態になる。この期間中はサイトを外部公開しないこと。
>
> MFA 設定手順（auth モジュールのコメント参照）:
> 1. 上記で作成した状態のまま（MFA=OPTIONAL）でサインイン
> 2. Google Authenticator 等で TOTP を登録
> 3. `packages/infra/modules/auth/main.tf` の `mfa_configuration = "OPTIONAL"` を `"ON"` に変更
> 4. `terraform apply` を再実行 → MFA 必須化

### Step 6: GitHub Secrets 設定

```bash
# packages/infra ディレクトリで実行

gh secret set AWS_TERRAFORM_ROLE_ARN \
  --body "$(terraform output -raw github_terraform_role_arn)"

gh secret set AWS_DEPLOY_ROLE_ARN \
  --body "$(terraform output -raw github_deploy_role_arn)"

gh secret set TF_VAR_ALERT_EMAIL \
  --body "your@email.com"

gh secret set VITE_API_BASE_URL \
  --body "$(terraform output -raw api_endpoint)"

gh secret set VITE_CLOUDFRONT_DOMAIN \
  --body "$(terraform output -raw cloudfront_domain)"

gh secret set VITE_COGNITO_USER_POOL_ID \
  --body "$(terraform output -raw cognito_user_pool_id)"

gh secret set VITE_COGNITO_CLIENT_ID \
  --body "$(terraform output -raw cognito_user_pool_client_id)"

gh secret set SPA_BUCKET_NAME \
  --body "$(terraform output -raw spa_bucket_name)"

gh secret set CLOUDFRONT_DISTRIBUTION_ID \
  --body "$(terraform output -raw cloudfront_distribution_id)"
```

### Step 7: 初回デプロイ

GitHub にコードを push すると CD ワークフローが自動実行される。

```bash
git push -u origin main
```

GitHub Actions の実行状況を確認:

```bash
gh run list --limit 5
gh run watch   # 最新のワークフローをリアルタイム監視
```

---

## 通常の運用

### コードを変更してデプロイ

```bash
# コードを編集後
git add .
git commit -m "変更内容"
git push

# GitHub Actions が自動で以下を実行:
# - packages/frontend/** 変更 → CI → CD Frontend（S3 sync + CloudFront invalidation）
# - packages/infra/**   変更 → CI → CD Infra（terraform plan + apply）
```

### Terraform を手動で apply する（緊急時）

```bash
cd packages/infra
terraform plan -input=false -out=tfplan \
  -var="alert_email=your@email.com" \
  -var="frontend_origin=https://$(terraform output -raw cloudfront_domain)"
terraform apply -input=false tfplan
```

### フロントエンドを手動でデプロイする（緊急時）

```bash
cd packages/frontend
pnpm build
aws s3 sync dist s3://$(cd ../infra && terraform output -raw spa_bucket_name) --delete
aws cloudfront create-invalidation \
  --distribution-id $(cd ../infra && terraform output -raw cloudfront_distribution_id) \
  --paths "/*"
```

---

## 廃棄手順

> 完全削除。元に戻せない操作を含む。

### Step 1: S3 バケットを空にする

`terraform destroy` は空でないバケットを削除できないため、先に中身を消す。

```bash
cd packages/infra

aws s3 rm s3://$(terraform output -raw photos_bucket_name) --recursive
aws s3 rm s3://$(terraform output -raw spa_bucket_name)    --recursive
```

### Step 2: terraform destroy

Cognito User Pool には `prevent_destroy = true` が設定されているため、手動削除してから destroy すると Terraform State と実リソースが乖離してエラーになる。`terraform state rm` で State から除外してから destroy する。

```bash
cd packages/infra

# Cognito リソースを State から除外（実リソースは後で手動削除）
terraform state rm module.auth.aws_cognito_user_pool.main
terraform state rm module.auth.aws_cognito_user_pool_client.spa

# terraform destroy 実行
terraform destroy -input=false \
  -var="alert_email=your@email.com" \
  -var="frontend_origin=https://placeholder.example.com"

# Cognito User Pool を手動削除（State から除外済みなので個別削除）
POOL_ID=$(aws cognito-idp list-user-pools --max-results 10 \
  --query "UserPools[?Name=='MyCastleAlbumAdmins'].Id | [0]" --output text)
aws cognito-idp delete-user-pool --user-pool-id "$POOL_ID"
```

> CloudFront の無効化には 15〜30 分かかる場合がある。

### Step 3: Terraform State バックエンドを削除

```bash
# State バケット内を全削除
# バージョン管理が有効なため Versions と DeleteMarkers の両方を削除する必要がある
aws s3api delete-objects \
  --bucket my-castle-album-tfstate \
  --delete "$(aws s3api list-object-versions \
    --bucket my-castle-album-tfstate \
    --query '{Objects: (Versions[].{Key:Key,VersionId:VersionId} + DeleteMarkers[].{Key:Key,VersionId:VersionId})[]}' \
    --output json)"

# バケット削除
aws s3api delete-bucket \
  --bucket my-castle-album-tfstate \
  --region ap-northeast-1

# DynamoDB テーブル削除
aws dynamodb delete-table \
  --table-name my-castle-album-tfstate-lock \
  --region ap-northeast-1
```

### Step 4: GitHub Secrets 削除

```bash
for secret in \
  AWS_TERRAFORM_ROLE_ARN \
  AWS_DEPLOY_ROLE_ARN \
  TF_VAR_ALERT_EMAIL \
  VITE_API_BASE_URL \
  VITE_CLOUDFRONT_DOMAIN \
  VITE_COGNITO_USER_POOL_ID \
  VITE_COGNITO_CLIENT_ID \
  SPA_BUCKET_NAME \
  CLOUDFRONT_DISTRIBUTION_ID; do
  gh secret delete "$secret"
done
```
