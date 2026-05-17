param(
    [Parameter(Mandatory)][string]$Username
)

$PasswordSecure = Read-Host "Password" -AsSecureString
$Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($PasswordSecure)
)

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

$clientId = terraform output -raw cognito_admin_tools_client_id
$poolId   = terraform output -raw cognito_user_pool_id

# Step 1: パスワード認証してアクセストークンを取得
Write-Host "認証中..."
$authResult = aws cognito-idp admin-initiate-auth `
    --user-pool-id $poolId `
    --client-id $clientId `
    --auth-flow ADMIN_USER_PASSWORD_AUTH `
    --auth-parameters "USERNAME=$Username,PASSWORD=$Password" | ConvertFrom-Json
$accessToken = $authResult.AuthenticationResult.AccessToken
if (-not $accessToken) {
    Write-Error "認証失敗。Username / Password を確認してください。"
    exit 1
}

# Step 2: TOTP シークレットキーを取得
Write-Host "TOTP シークレットキーを取得中..."
$assocResult = aws cognito-idp associate-software-token --access-token $accessToken | ConvertFrom-Json
$secretCode = $assocResult.SecretCode
Write-Host ""
Write-Host "====================================================="
Write-Host "SecretCode: $secretCode"
Write-Host "====================================================="
Write-Host ""
Write-Host "Google Authenticator を開き、「セットアップキーを入力」で"
Write-Host "上記の SecretCode を手動入力してください。"
Write-Host ""

# Step 3: ユーザーが登録後に表示される 6 桁コードを入力
$totpCode = Read-Host "登録後に表示される 6 桁コードを入力してください"

# Step 4: コードで検証（登録確定）
Write-Host "検証中..."
$verifyResult = aws cognito-idp verify-software-token `
    --access-token $accessToken `
    --user-code $totpCode | ConvertFrom-Json
if ($verifyResult.Status -ne "SUCCESS") {
    Write-Error "検証失敗: $($verifyResult.Status)"
    exit 1
}

Write-Host ""
Write-Host "TOTP 登録完了。"
Write-Host "次に packages/infra/modules/auth/main.tf の mfa_configuration を ON に変更し、"
Write-Host "make tf-plan && make tf-apply を実行してください。"
