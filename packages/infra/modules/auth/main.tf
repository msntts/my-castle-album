resource "aws_cognito_user_pool" "main" {
  name                = "MyCastleAlbumAdmins"
  username_attributes = ["email"]

  admin_create_user_config {
    allow_admin_create_user_only = true
  }

  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = true
  }

  # ⚠️ MFA 設定手順（順序を守ること）:
  #   1. この値 "OPTIONAL" のまま terraform apply（初回デプロイ）
  #   2. aws cognito-idp admin-create-user で管理者アカウント作成
  #   3. 管理者がサインインして TOTP アプリ（Google Authenticator 等）で MFA 登録完了
  #   4. この値を "ON" に変更して terraform apply（MFA 必須化）
  # 手順③④を逆にすると管理者がサインインできなくなる。
  # ロールバック: AWS Console で User Pool MFA を Optional に一時変更 → TOTP 設定後に再 apply
  mfa_configuration = "OPTIONAL"

  software_token_mfa_configuration {
    enabled = true
  }

  tags = {
    Project = "my-castle-album"
  }

  lifecycle {
    prevent_destroy = true
  }
}

# 管理ツール（setup-mfa 等）専用クライアント。ADMIN_USER_PASSWORD_AUTH を SPA クライアントから分離する。
resource "aws_cognito_user_pool_client" "admin_tools" {
  name         = "admin-tools"
  user_pool_id = aws_cognito_user_pool.main.id

  explicit_auth_flows = [
    "ALLOW_ADMIN_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  generate_secret               = false
  prevent_user_existence_errors = "ENABLED"

  access_token_validity  = 60
  refresh_token_validity = 1
  id_token_validity      = 60

  token_validity_units {
    access_token  = "minutes"
    refresh_token = "days"
    id_token      = "minutes"
  }
}

resource "aws_cognito_user_pool_client" "spa" {
  name         = "frontend-spa"
  user_pool_id = aws_cognito_user_pool.main.id

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  generate_secret                = false
  prevent_user_existence_errors  = "ENABLED"

  access_token_validity  = 60
  refresh_token_validity = 30
  id_token_validity      = 60

  token_validity_units {
    access_token  = "minutes"
    refresh_token = "days"
    id_token      = "minutes"
  }
}
