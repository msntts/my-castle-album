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
