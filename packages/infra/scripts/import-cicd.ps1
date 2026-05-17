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
$oidcArn    = "arn:aws:iam::${accountId}:oidc-provider/token.actions.githubusercontent.com"
$importVars = @("-var=alert_email=your@email.com", "-var=frontend_origin=https://placeholder.example.com")

aws iam get-open-id-connect-provider --open-id-connect-provider-arn $oidcArn 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    terraform import @importVars module.cicd.aws_iam_openid_connect_provider.github $oidcArn
}

aws iam get-role --role-name github-actions-terraform 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    terraform import @importVars module.cicd.aws_iam_role.github_terraform github-actions-terraform
    terraform import @importVars module.cicd.aws_iam_role_policy.github_terraform "github-actions-terraform:terraform-managed-services"
}

aws iam get-role --role-name github-actions-deploy 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    terraform import @importVars module.cicd.aws_iam_role.github_deploy github-actions-deploy
    terraform import @importVars module.cicd.aws_iam_role_policy.github_deploy "github-actions-deploy:spa-deploy"
}
