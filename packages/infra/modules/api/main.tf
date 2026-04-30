# Lambda ビルドは terraform apply 前に実行すること:
#   cd packages/infra/lambda && pnpm install && pnpm build

data "archive_file" "cleanup" {
  type        = "zip"
  source_file = "${path.module}/../../lambda/dist/cleanup/index.js"
  output_path = "${path.module}/../../lambda/dist/cleanup.zip"
}

data "archive_file" "castles" {
  type        = "zip"
  source_file = "${path.module}/../../lambda/dist/castles/index.js"
  output_path = "${path.module}/../../lambda/dist/castles.zip"
}

data "archive_file" "photos" {
  type        = "zip"
  source_file = "${path.module}/../../lambda/dist/photos/index.js"
  output_path = "${path.module}/../../lambda/dist/photos.zip"
}

# ─────────────────────────────────────────────────────────
# IAM: Lambda 実行ロール
# ─────────────────────────────────────────────────────────

resource "aws_iam_role" "castles" {
  name = "my-castle-album-castles-handler"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "castles_basic" {
  role       = aws_iam_role.castles.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "castles_dynamodb" {
  name = "dynamodb"
  role = aws_iam_role.castles.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
      ]
      Resource = [
        var.table_arn,
        "${var.table_arn}/index/*",
      ]
    }]
  })
}

resource "aws_iam_role" "photos" {
  name = "my-castle-album-photos-handler"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "photos_basic" {
  role       = aws_iam_role.photos.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "photos_dynamodb_s3" {
  name = "dynamodb-s3"
  role = aws_iam_role.photos.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
        ]
        Resource = [
          var.table_arn,
          "${var.table_arn}/index/*",
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:DeleteObject",
        ]
        Resource = "${var.photos_bucket_arn}/photos/*"
      },
    ]
  })
}

# ─────────────────────────────────────────────────────────
# CloudWatch Log Groups（30日保持）
# ─────────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "castles" {
  name              = "/aws/lambda/my-castle-album-castles-handler"
  retention_in_days = 30
  # TODO(Phase 10): Cognito 認証導入後は JWT がログに混入するため KMS 暗号化を検討
}

resource "aws_cloudwatch_log_group" "photos" {
  name              = "/aws/lambda/my-castle-album-photos-handler"
  retention_in_days = 30
}

# ─────────────────────────────────────────────────────────
# Lambda 関数
# ─────────────────────────────────────────────────────────

resource "aws_lambda_function" "castles" {
  function_name    = "my-castle-album-castles-handler"
  role             = aws_iam_role.castles.arn
  handler          = "index.handler"
  runtime          = "nodejs22.x"
  architectures    = ["arm64"]
  memory_size      = 128
  timeout          = 10
  filename         = data.archive_file.castles.output_path
  source_code_hash = data.archive_file.castles.output_base64sha256

  environment {
    variables = {
      TABLE_NAME = var.table_name
    }
  }

  depends_on = [aws_cloudwatch_log_group.castles]

  tags = {
    Project = "my-castle-album"
  }
}

resource "aws_lambda_function" "photos" {
  function_name    = "my-castle-album-photos-handler"
  role             = aws_iam_role.photos.arn
  handler          = "index.handler"
  runtime          = "nodejs22.x"
  architectures    = ["arm64"]
  memory_size      = 128
  timeout          = 10
  filename         = data.archive_file.photos.output_path
  source_code_hash = data.archive_file.photos.output_base64sha256

  environment {
    variables = {
      TABLE_NAME         = var.table_name
      PHOTOS_BUCKET_NAME = var.photos_bucket_name
      CLOUDFRONT_DOMAIN  = var.cloudfront_domain
    }
  }

  depends_on = [aws_cloudwatch_log_group.photos]

  tags = {
    Project = "my-castle-album"
  }
}

# ─────────────────────────────────────────────────────────
# API Gateway HTTP API
# ─────────────────────────────────────────────────────────

resource "aws_apigatewayv2_api" "main" {
  name          = "my-castle-album-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = [var.frontend_origin]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
    max_age       = 3600
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_apigatewayv2_integration" "castles" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.castles.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "photos" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.photos.invoke_arn
  payload_format_version = "2.0"
}

# GET 系（認証不要・公開ギャラリー）
resource "aws_apigatewayv2_route" "get_castles" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /castles"
  target    = "integrations/${aws_apigatewayv2_integration.castles.id}"
}

resource "aws_apigatewayv2_route" "get_castle" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /castles/{castleId}"
  target    = "integrations/${aws_apigatewayv2_integration.castles.id}"
}

# 書き込み系ルート
# 現状 authorization_type = "NONE"（API Gateway レベルの認証なし）だが、
# Lambda 側の requireAuth() が JWT Authorizer なし = authorizer undefined の場合に
# token_use チェックが false となり 401 を返すため、実際の書き込みは不可能。
# Phase 10 で JWT Authorizer を追加して API Gateway レベルの defense-in-depth を実装する。
resource "aws_apigatewayv2_route" "post_castle" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /castles"
  target    = "integrations/${aws_apigatewayv2_integration.castles.id}"
}

resource "aws_apigatewayv2_route" "put_castle" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "PUT /castles/{castleId}"
  target    = "integrations/${aws_apigatewayv2_integration.castles.id}"
}

resource "aws_apigatewayv2_route" "delete_castle" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "DELETE /castles/{castleId}"
  target    = "integrations/${aws_apigatewayv2_integration.castles.id}"
}

resource "aws_apigatewayv2_route" "post_photo" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /castles/{castleId}/photos"
  target    = "integrations/${aws_apigatewayv2_integration.photos.id}"
}

resource "aws_apigatewayv2_route" "delete_photo" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "DELETE /castles/{castleId}/photos/{photoId}"
  target    = "integrations/${aws_apigatewayv2_integration.photos.id}"
}

# API Gateway から Lambda を呼び出す権限
resource "aws_lambda_permission" "castles" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.castles.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "photos" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.photos.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# ─────────────────────────────────────────────────────────
# 孤立 PHOTO クリーンアップ Lambda + EventBridge Scheduler
# ─────────────────────────────────────────────────────────

resource "aws_iam_role" "cleanup" {
  name = "my-castle-album-cleanup-handler"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "cleanup_basic" {
  role       = aws_iam_role.cleanup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "cleanup_permissions" {
  name = "dynamodb-s3"
  role = aws_iam_role.cleanup.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:Scan",
          "dynamodb:BatchWriteItem",
        ]
        Resource = var.table_arn
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = var.photos_bucket_arn
        Condition = {
          StringLike = { "s3:prefix" = ["photos/*"] }
        }
      },
      {
        Effect   = "Allow"
        Action   = ["s3:DeleteObject"]
        Resource = "${var.photos_bucket_arn}/photos/*"
      },
    ]
  })
}

resource "aws_cloudwatch_log_group" "cleanup" {
  name              = "/aws/lambda/my-castle-album-cleanup-handler"
  retention_in_days = 30
}

resource "aws_lambda_function" "cleanup" {
  function_name    = "my-castle-album-cleanup-handler"
  role             = aws_iam_role.cleanup.arn
  handler          = "index.handler"
  runtime          = "nodejs22.x"
  architectures    = ["arm64"]
  memory_size      = 128
  timeout          = 300
  filename         = data.archive_file.cleanup.output_path
  source_code_hash = data.archive_file.cleanup.output_base64sha256

  environment {
    variables = {
      TABLE_NAME         = var.table_name
      PHOTOS_BUCKET_NAME = var.photos_bucket_name
    }
  }

  depends_on = [aws_cloudwatch_log_group.cleanup]

  tags = {
    Project = "my-castle-album"
  }
}

resource "aws_iam_role" "scheduler" {
  name = "my-castle-album-cleanup-scheduler"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "scheduler.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "scheduler_invoke" {
  name = "invoke-cleanup"
  role = aws_iam_role.scheduler.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "lambda:InvokeFunction"
      Resource = aws_lambda_function.cleanup.arn
    }]
  })
}

# 毎週日曜 2:00 JST（= 土曜 17:00 UTC）に実行
resource "aws_scheduler_schedule" "cleanup" {
  name       = "my-castle-album-photo-cleanup"
  group_name = "default"

  flexible_time_window {
    mode                      = "FLEXIBLE"
    maximum_window_in_minutes = 60
  }

  schedule_expression          = "cron(0 17 ? * SAT *)"
  schedule_expression_timezone = "UTC"

  target {
    arn      = aws_lambda_function.cleanup.arn
    role_arn = aws_iam_role.scheduler.arn
  }
}
