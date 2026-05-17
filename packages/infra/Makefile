SHELL := bash
.ONESHELL:
.SHELLFLAGS := -euo pipefail -c

ALERT_EMAIL ?= your@email.com
BUCKET      := my-castle-album-tfstate
LOCK_TABLE  := my-castle-album-tfstate-lock
REGION      := ap-northeast-1

.PHONY: init-backend lambda-build tf-init tf-plan tf-apply tf-import-cicd set-secrets create-admin deploy-frontend destroy destroy-backend delete-secrets

init-backend:
	aws s3api create-bucket --bucket $(BUCKET) --region $(REGION) --create-bucket-configuration LocationConstraint=$(REGION)
	aws s3api put-bucket-versioning --bucket $(BUCKET) --versioning-configuration Status=Enabled
	aws s3api put-public-access-block --bucket $(BUCKET) --public-access-block-configuration 'BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true'
	aws s3api put-bucket-encryption --bucket $(BUCKET) --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
	aws dynamodb create-table --table-name $(LOCK_TABLE) --attribute-definitions AttributeName=LockID,AttributeType=S --key-schema AttributeName=LockID,KeyType=HASH --billing-mode PAY_PER_REQUEST --region $(REGION)

lambda-build:
	cd lambda && pnpm install --frozen-lockfile && pnpm build

tf-init:
	terraform init

tf-plan:
	domain=$$(terraform output -raw cloudfront_domain 2>/dev/null || echo placeholder.example.com)
	terraform plan -input=false -out=tfplan -var="alert_email=$(ALERT_EMAIL)" -var="frontend_origin=https://$$domain"

tf-apply:
	terraform apply -input=false tfplan

tf-import-cicd:
	account_id=$$(aws sts get-caller-identity --query Account --output text)
	oidc_arn="arn:aws:iam::$$account_id:oidc-provider/token.actions.githubusercontent.com"
	import_vars="-var=alert_email=$(ALERT_EMAIL) -var=frontend_origin=https://placeholder.example.com"
	if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$$oidc_arn" >/dev/null 2>&1; then
		terraform import $$import_vars module.cicd.aws_iam_openid_connect_provider.github "$$oidc_arn" || true
	fi
	if aws iam get-role --role-name github-actions-terraform >/dev/null 2>&1; then
		terraform import $$import_vars module.cicd.aws_iam_role.github_terraform github-actions-terraform || true
		terraform import $$import_vars module.cicd.aws_iam_role_policy.github_terraform "github-actions-terraform:terraform-managed-services" || true
	fi
	if aws iam get-role --role-name github-actions-deploy >/dev/null 2>&1; then
		terraform import $$import_vars module.cicd.aws_iam_role.github_deploy github-actions-deploy || true
		terraform import $$import_vars module.cicd.aws_iam_role_policy.github_deploy "github-actions-deploy:spa-deploy" || true
	fi

set-secrets:
	gh secret set AWS_TERRAFORM_ROLE_ARN      --body "$$(terraform output -raw github_terraform_role_arn)"
	gh secret set AWS_DEPLOY_ROLE_ARN         --body "$$(terraform output -raw github_deploy_role_arn)"
	gh secret set TF_VAR_ALERT_EMAIL          --body "$(ALERT_EMAIL)"
	gh secret set VITE_API_BASE_URL           --body "$$(terraform output -raw api_endpoint)"
	gh secret set VITE_CLOUDFRONT_DOMAIN      --body "$$(terraform output -raw cloudfront_domain)"
	gh secret set VITE_COGNITO_USER_POOL_ID   --body "$$(terraform output -raw cognito_user_pool_id)"
	gh secret set VITE_COGNITO_CLIENT_ID      --body "$$(terraform output -raw cognito_user_pool_client_id)"
	gh secret set SPA_BUCKET_NAME             --body "$$(terraform output -raw spa_bucket_name)"
	gh secret set CLOUDFRONT_DISTRIBUTION_ID  --body "$$(terraform output -raw cloudfront_distribution_id)"

create-admin:
	@[ -n "$(USERNAME)" ]  || { echo "Usage: make create-admin USERNAME=your@email.com PASSWORD=xxx"; exit 1; }
	@[ -n "$(PASSWORD)" ]  || { echo "PASSWORD is required"; exit 1; }
	pool_id=$$(terraform output -raw cognito_user_pool_id)
	aws cognito-idp admin-create-user --user-pool-id "$$pool_id" --username "$(USERNAME)" --temporary-password "$(PASSWORD)" --message-action SUPPRESS
	aws cognito-idp admin-set-user-password --user-pool-id "$$pool_id" --username "$(USERNAME)" --password "$(PASSWORD)" --permanent

deploy-frontend:
	bucket=$$(terraform output -raw spa_bucket_name)
	dist_id=$$(terraform output -raw cloudfront_distribution_id)
	cd ../frontend && pnpm build
	aws s3 sync dist "s3://$$bucket" --delete
	aws cloudfront create-invalidation --distribution-id "$$dist_id" --paths '/*'

destroy:
	aws s3 rm "s3://$$(terraform output -raw photos_bucket_name)" --recursive
	aws s3 rm "s3://$$(terraform output -raw spa_bucket_name)" --recursive
	terraform state rm module.auth.aws_cognito_user_pool.main
	terraform state rm module.auth.aws_cognito_user_pool_client.spa
	terraform destroy -input=false -var="alert_email=$(ALERT_EMAIL)" -var="frontend_origin=https://placeholder.example.com"
	pool_id=$$(aws cognito-idp list-user-pools --max-results 10 --query "UserPools[?Name=='MyCastleAlbumAdmins'].Id | [0]" --output text)
	aws cognito-idp delete-user-pool --user-pool-id "$$pool_id"

destroy-backend:
	delete_payload=$$(aws s3api list-object-versions --bucket $(BUCKET) --query '{Objects: (Versions[].{Key:Key,VersionId:VersionId} + DeleteMarkers[].{Key:Key,VersionId:VersionId})[]}' --output json)
	aws s3api delete-objects --bucket $(BUCKET) --delete "$$delete_payload"
	aws s3api delete-bucket --bucket $(BUCKET) --region $(REGION)
	aws dynamodb delete-table --table-name $(LOCK_TABLE) --region $(REGION)

delete-secrets:
	for secret in AWS_TERRAFORM_ROLE_ARN AWS_DEPLOY_ROLE_ARN TF_VAR_ALERT_EMAIL VITE_API_BASE_URL VITE_CLOUDFRONT_DOMAIN VITE_COGNITO_USER_POOL_ID VITE_COGNITO_CLIENT_ID SPA_BUCKET_NAME CLOUDFRONT_DISTRIBUTION_ID; do
		gh secret delete $$secret
	done
