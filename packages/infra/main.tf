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
