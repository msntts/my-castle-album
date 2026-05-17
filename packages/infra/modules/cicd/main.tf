resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
  # thumbprint は形式的な値（AWS は Amazon CA で実際に検証）
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd",
  ]
}

locals {
  oidc_arn        = aws_iam_openid_connect_provider.github.arn
  github_sub_main = "repo:msntts/my-castle-album:ref:refs/heads/main"
}

resource "aws_iam_role" "github_terraform" {
  name = "github-actions-terraform"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = local.oidc_arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          "token.actions.githubusercontent.com:sub" = local.github_sub_main
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "github_terraform" {
  name = "terraform-managed-services"
  role = aws_iam_role.github_terraform.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # DynamoDB: このプロジェクトのテーブルのみ
        Effect   = "Allow"
        Action   = ["dynamodb:*"]
        Resource = "arn:aws:dynamodb:${var.region}:${var.account_id}:table/MyCastleAlbum*"
      },
      {
        # S3: このプロジェクトのバケットのみ（バケット名プレフィックスで制限）
        Effect = "Allow"
        Action = ["s3:*"]
        Resource = [
          "arn:aws:s3:::my-castle-album-*",
          "arn:aws:s3:::my-castle-album-*/*",
        ]
      },
      {
        # Lambda: このプロジェクトの関数のみ
        Effect   = "Allow"
        Action   = ["lambda:*"]
        Resource = "arn:aws:lambda:${var.region}:${var.account_id}:function:my-castle-album-*"
      },
      {
        # CloudWatch Logs: このプロジェクトのロググループのみ（書き込み・削除）
        Effect   = "Allow"
        Action   = ["logs:*"]
        Resource = "arn:aws:logs:${var.region}:${var.account_id}:log-group:/aws/lambda/my-castle-album-*"
      },
      {
        # Terraform plan 時に logs:Describe*/List* がアカウントレベルで呼ばれるため別途許可
        Effect   = "Allow"
        Action   = ["logs:Describe*", "logs:List*"]
        Resource = "*"
      },
      {
        # CloudWatch Metric Alarms: このプロジェクトのアラームのみ
        Effect = "Allow"
        Action = ["cloudwatch:*"]
        Resource = "arn:aws:cloudwatch:${var.region}:${var.account_id}:alarm:my-castle-album-*"
      },
      {
        # SNS: このプロジェクトのトピックのみ
        Effect   = "Allow"
        Action   = ["sns:*"]
        Resource = "arn:aws:sns:${var.region}:${var.account_id}:my-castle-album-*"
      },
      {
        # API Gateway・Cognito・CloudFront・Scheduler・Events:
        # リソース ID が自動生成されるため ARN パターンでの制限が難しく * を使用
        # 保護は OIDC の main ブランチ条件と IAM ロールの分離で行う
        Effect = "Allow"
        Action = [
          "apigateway:*",
          "cognito-idp:*",
          "cloudfront:*",
          "scheduler:*",
          "events:*",
        ]
        Resource = "*"
      },
      {
        # IAM: Terraform が管理するアプリケーションロールのみ（my-castle-album-* 命名に限定）
        # github-actions-* ロールへの書き込みは禁止（自己昇格リスク回避）
        # CI/CD ロールの初回作成・ポリシー変更は手動 bootstrap で行う
        # TODO: PutRolePolicy による inline policy 書き込みには Resource 制限が効かない。
        # 本番環境化の際は iam:CreateRole に iam:PermissionsBoundary 条件を追加して
        # Permission Boundary 付与を強制すること（権限昇格チェーン防止）
        Effect = "Allow"
        Action = [
          "iam:CreateRole", "iam:DeleteRole", "iam:GetRole",
          "iam:TagRole", "iam:UntagRole", "iam:ListRoleTags",
          "iam:UpdateAssumeRolePolicy",
          "iam:PutRolePolicy", "iam:DeleteRolePolicy",
          "iam:GetRolePolicy", "iam:ListRolePolicies", "iam:ListAttachedRolePolicies",
        ]
        Resource = "arn:aws:iam::${var.account_id}:role/my-castle-album-*"
      },
      {
        # IAM 読み取り: github-actions-* ロール自身の状態を terraform plan で読むために必要
        # 書き込みは上のブロックで my-castle-album-* に限定しているため自己昇格リスクなし
        Effect = "Allow"
        Action = [
          "iam:GetRole",
          "iam:GetRolePolicy",
          "iam:ListRolePolicies",
          "iam:ListAttachedRolePolicies",
          "iam:ListRoleTags",
        ]
        Resource = "arn:aws:iam::${var.account_id}:role/github-actions-*"
      },
      {
        # AttachRolePolicy: AWSLambdaBasicExecutionRole のみ許可（権限昇格防止）
        Effect   = "Allow"
        Action   = ["iam:AttachRolePolicy", "iam:DetachRolePolicy"]
        Resource = "arn:aws:iam::${var.account_id}:role/my-castle-album-*"
        Condition = {
          ArnEquals = {
            "iam:PolicyARN" = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
          }
        }
      },
      {
        # PassRole: Lambda / Scheduler / EventBridge 向け実行ロールの付与のみ許可
        Effect   = "Allow"
        Action   = ["iam:PassRole"]
        Resource = "arn:aws:iam::${var.account_id}:role/my-castle-album-*"
        Condition = {
          StringEquals = {
            "iam:PassedToService" = [
              "lambda.amazonaws.com",
              "scheduler.amazonaws.com",
              "events.amazonaws.com",
            ]
          }
        }
      },
      {
        # IAM ポリシー操作
        Effect = "Allow"
        Action = [
          "iam:CreatePolicy", "iam:DeletePolicy",
          "iam:GetPolicy", "iam:GetPolicyVersion",
          "iam:CreatePolicyVersion", "iam:DeletePolicyVersion", "iam:ListPolicyVersions",
          "iam:ListEntitiesForPolicy",
        ]
        Resource = "arn:aws:iam::${var.account_id}:policy/my-castle-album-*"
      },
      {
        # OIDC Provider 操作: 当該プロバイダーに限定
        Effect = "Allow"
        Action = [
          "iam:CreateOpenIDConnectProvider", "iam:DeleteOpenIDConnectProvider",
          "iam:GetOpenIDConnectProvider", "iam:TagOpenIDConnectProvider",
          "iam:UntagOpenIDConnectProvider", "iam:UpdateOpenIDConnectProviderThumbprint",
          "iam:AddClientIDToOpenIDConnectProvider", "iam:RemoveClientIDFromOpenIDConnectProvider",
        ]
        Resource = "arn:aws:iam::${var.account_id}:oidc-provider/token.actions.githubusercontent.com"
      },
      {
        Effect   = "Allow"
        Action   = ["sts:GetCallerIdentity"]
        Resource = "*"
      },
    ]
  })
}

resource "aws_iam_role" "github_deploy" {
  name = "github-actions-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = local.oidc_arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          "token.actions.githubusercontent.com:sub" = local.github_sub_main
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "github_deploy" {
  name = "spa-deploy"
  role = aws_iam_role.github_deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = [
          var.spa_bucket_arn,
          "${var.spa_bucket_arn}/*",
        ]
      },
      {
        Effect   = "Allow"
        Action   = "cloudfront:CreateInvalidation"
        Resource = var.cloudfront_distribution_arn
      },
    ]
  })
}
