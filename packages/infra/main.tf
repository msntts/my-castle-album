terraform {
  required_version = "~> 1.9"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # S3 バックエンド（Phase 12-2 で有効化）
  # 事前準備:
  #   aws s3api create-bucket --bucket my-castle-album-tfstate \
  #     --region ap-northeast-1 \
  #     --create-bucket-configuration LocationConstraint=ap-northeast-1
  #   aws s3api put-bucket-versioning --bucket my-castle-album-tfstate \
  #     --versioning-configuration Status=Enabled
  #   aws s3api put-public-access-block --bucket my-castle-album-tfstate \
  #     --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
  #   aws dynamodb create-table --table-name my-castle-album-tfstate-lock \
  #     --attribute-definitions AttributeName=LockID,AttributeType=S \
  #     --key-schema AttributeName=LockID,KeyType=HASH \
  #     --billing-mode PAY_PER_REQUEST --region ap-northeast-1
  # 移行: terraform init -migrate-state
  backend "s3" {
    bucket         = "my-castle-album-tfstate"
    key            = "infra/terraform.tfstate"
    region         = "ap-northeast-1"
    dynamodb_table = "my-castle-album-tfstate-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.region
}

data "aws_caller_identity" "current" {}

module "storage" {
  source          = "./modules/storage"
  region          = var.region
  frontend_origin = var.frontend_origin
  account_id      = data.aws_caller_identity.current.account_id
}

module "auth" {
  source = "./modules/auth"
  region = var.region
}

module "cicd" {
  source                      = "./modules/cicd"
  spa_bucket_arn              = module.storage.spa_bucket_arn
  cloudfront_distribution_arn = module.storage.cloudfront_distribution_arn
  account_id                  = data.aws_caller_identity.current.account_id
  region                      = var.region
}

module "api" {
  source             = "./modules/api"
  table_name         = module.storage.table_name
  table_arn          = module.storage.table_arn
  photos_bucket_name = module.storage.photos_bucket_name
  photos_bucket_arn  = module.storage.photos_bucket_arn
  frontend_origin    = var.frontend_origin
  cloudfront_domain  = module.storage.cloudfront_domain
  alert_email        = var.alert_email
  cognito_issuer_url = module.auth.issuer_url
  cognito_audience   = module.auth.audience
}
