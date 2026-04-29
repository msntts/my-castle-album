resource "aws_dynamodb_table" "main" {
  name         = "MyCastleAlbum"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  global_secondary_index {
    name            = "GSI1"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "INCLUDE"
    # Castle 一覧表示に必要な属性のみ射影（PHOTO行の属性複製を防ぐ）
    # 新属性を Castle METADATA に追加した場合はここへの追記が必要（destroy→recreate が必要）
    non_key_attributes = ["name", "latitude", "longitude"]
  }

  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = true
  }

  deletion_protection_enabled = true

  tags = {
    Project = "my-castle-album"
  }

  # ⚠️ GSI projection 変更時の注意: in-place 変更不可のため destroy→recreate が必要。
  # prevent_destroy と競合するため docs/aws-architecture.md の手順を参照すること。
  lifecycle {
    prevent_destroy = true
  }
}

# ─────────────────────────────────────────────────────────
# S3: 写真バケット
# ─────────────────────────────────────────────────────────

resource "aws_s3_bucket" "photos" {
  bucket = "my-castle-album-photos-${var.account_id}-${var.region}"

  tags = {
    Project = "my-castle-album"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_public_access_block" "photos" {
  bucket                  = aws_s3_bucket.photos.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "photos" {
  bucket = aws_s3_bucket.photos.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "photos" {
  bucket = aws_s3_bucket.photos.id
  cors_rule {
    allowed_methods = ["GET", "PUT"]
    allowed_origins = [var.frontend_origin]
    allowed_headers = ["Content-Type", "x-amz-*", "Authorization"]
    max_age_seconds = 3000
  }
}

# ─────────────────────────────────────────────────────────
# S3: SPA 静的ホスティングバケット
# ─────────────────────────────────────────────────────────

resource "aws_s3_bucket" "spa" {
  bucket = "my-castle-album-spa-${var.account_id}"

  tags = {
    Project = "my-castle-album"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_public_access_block" "spa" {
  bucket                  = aws_s3_bucket.spa.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "spa" {
  bucket = aws_s3_bucket.spa.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# バージョニング: デプロイ失敗時に旧バージョンへ即時ロールバックできる
resource "aws_s3_bucket_versioning" "spa" {
  bucket = aws_s3_bucket.spa.id
  versioning_configuration {
    status = "Enabled"
  }
}

# 旧バージョンを 30 日で自動削除してストレージ増加を防ぐ
resource "aws_s3_bucket_lifecycle_configuration" "spa" {
  bucket = aws_s3_bucket.spa.id
  rule {
    id     = "expire-old-versions"
    status = "Enabled"
    filter {}
    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

# ─────────────────────────────────────────────────────────
# CloudFront: SPA + 写真を 1 ディストリビューションで配信
# ─────────────────────────────────────────────────────────

resource "aws_cloudfront_origin_access_control" "spa" {
  name                              = "my-castle-album-spa-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_origin_access_control" "photos" {
  name                              = "my-castle-album-photos-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  default_root_object = "index.html"
  price_class         = "PriceClass_200"
  comment             = "my-castle-album"

  origin {
    domain_name              = aws_s3_bucket.spa.bucket_regional_domain_name
    origin_id                = "spa-s3"
    origin_access_control_id = aws_cloudfront_origin_access_control.spa.id
  }

  origin {
    domain_name              = aws_s3_bucket.photos.bucket_regional_domain_name
    origin_id                = "photos-s3"
    origin_access_control_id = aws_cloudfront_origin_access_control.photos.id
  }

  # デフォルト: SPA（S3 の Cache-Control ヘッダーを尊重）
  default_cache_behavior {
    target_origin_id       = "spa-s3"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 31536000
  }

  # /photos/* → 写真バケット
  ordered_cache_behavior {
    path_pattern           = "/photos/*"
    target_origin_id       = "photos-s3"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  # SPA ルーティング: 存在しないパスは index.html で処理
  # S3 は OAC 使用時に存在しないオブジェクトを 403 で返すことがあるため両方対応
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Project = "my-castle-album"
  }
}

# バケットポリシー: CloudFront OAC のみ GET 許可（SPA）
resource "aws_s3_bucket_policy" "spa" {
  bucket = aws_s3_bucket.spa.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.spa.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.main.arn
        }
      }
    }]
  })
}

# バケットポリシー: CloudFront OAC のみ GET 許可（写真）
resource "aws_s3_bucket_policy" "photos" {
  bucket = aws_s3_bucket.photos.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.photos.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.main.arn
        }
      }
    }]
  })
}
