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
