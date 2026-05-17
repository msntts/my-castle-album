param([string]$AlertEmail = "your@email.com")

Remove-Item Env:\AWS_ACCESS_KEY_ID -ErrorAction SilentlyContinue
Remove-Item Env:\AWS_SECRET_ACCESS_KEY -ErrorAction SilentlyContinue
Remove-Item Env:\AWS_SESSION_TOKEN -ErrorAction SilentlyContinue
$ssoProfile = "msntts-sso-admin"
$accountId  = aws configure get sso_account_id --profile $ssoProfile
$roleName   = aws configure get sso_role_name  --profile $ssoProfile
$ssoRegion  = aws configure get sso_region     --profile $ssoProfile
$token      = (Get-Content "$env:USERPROFILE\.aws\sso\cache\*.json" | ConvertFrom-Json |
               Where-Object { $_.startUrl -like "*identitycenter*" }).accessToken
$roleCreds  = aws sso get-role-credentials --account-id $accountId --role-name $roleName --access-token $token --region $ssoRegion | ConvertFrom-Json
$env:AWS_ACCESS_KEY_ID     = $roleCreds.roleCredentials.accessKeyId
$env:AWS_SECRET_ACCESS_KEY = $roleCreds.roleCredentials.secretAccessKey
$env:AWS_SESSION_TOKEN     = $roleCreds.roleCredentials.sessionToken

gh secret set AWS_TERRAFORM_ROLE_ARN      --body $(terraform output -raw github_terraform_role_arn)
gh secret set AWS_DEPLOY_ROLE_ARN         --body $(terraform output -raw github_deploy_role_arn)
gh secret set TF_VAR_ALERT_EMAIL          --body $AlertEmail
gh secret set VITE_API_BASE_URL           --body $(terraform output -raw api_endpoint)
gh secret set VITE_CLOUDFRONT_DOMAIN      --body $(terraform output -raw cloudfront_domain)
gh secret set VITE_COGNITO_USER_POOL_ID   --body $(terraform output -raw cognito_user_pool_id)
gh secret set VITE_COGNITO_CLIENT_ID      --body $(terraform output -raw cognito_user_pool_client_id)
gh secret set SPA_BUCKET_NAME             --body $(terraform output -raw spa_bucket_name)
gh secret set CLOUDFRONT_DISTRIBUTION_ID  --body $(terraform output -raw cloudfront_distribution_id)
