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

aws s3 rm "s3://$(terraform output -raw photos_bucket_name)" --recursive
aws s3 rm "s3://$(terraform output -raw spa_bucket_name)" --recursive

terraform state rm module.auth.aws_cognito_user_pool.main
terraform state rm module.auth.aws_cognito_user_pool_client.spa
terraform destroy -input=false -var="alert_email=$AlertEmail" -var="frontend_origin=https://placeholder.example.com"

$poolId = aws cognito-idp list-user-pools --max-results 10 --query "UserPools[?Name=='MyCastleAlbumAdmins'].Id | [0]" --output text
aws cognito-idp delete-user-pool --user-pool-id $poolId
