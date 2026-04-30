terraform {
  required_version = "~> 1.9"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
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

module "api" {
  source             = "./modules/api"
  table_name         = module.storage.table_name
  table_arn          = module.storage.table_arn
  photos_bucket_name = module.storage.photos_bucket_name
  photos_bucket_arn  = module.storage.photos_bucket_arn
  frontend_origin    = var.frontend_origin
  cloudfront_domain  = module.storage.cloudfront_domain
}
