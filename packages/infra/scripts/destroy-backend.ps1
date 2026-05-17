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

$bucket    = "my-castle-album-tfstate"
$lockTable = "my-castle-album-tfstate-lock"
$region    = "ap-northeast-1"

$deletePayload = aws s3api list-object-versions --bucket $bucket --query '{Objects: (Versions[].{Key:Key,VersionId:VersionId} + DeleteMarkers[].{Key:Key,VersionId:VersionId})[]}' --output json
aws s3api delete-objects --bucket $bucket --delete $deletePayload
aws s3api delete-bucket --bucket $bucket --region $region
aws dynamodb delete-table --table-name $lockTable --region $region
