output "cloudfront_domain" {
  description = "CloudFront ドメイン名（フロントエンド環境変数 VITE_CLOUDFRONT_DOMAIN に使用）"
  value       = module.storage.cloudfront_domain
}

output "cloudfront_distribution_id" {
  description = "CloudFront ディストリビューション ID（CD ワークフローの invalidation に使用）"
  value       = module.storage.cloudfront_distribution_id
}

output "cloudfront_distribution_arn" {
  description = "CloudFront ディストリビューション ARN（CI/CD ロールポリシーに使用）"
  value       = module.storage.cloudfront_distribution_arn
}

output "spa_bucket_name" {
  description = "SPA S3 バケット名（CD ワークフローの s3 sync に使用）"
  value       = module.storage.spa_bucket_name
}

output "spa_bucket_arn" {
  description = "SPA S3 バケット ARN（CI/CD ロールポリシーに使用）"
  value       = module.storage.spa_bucket_arn
}

output "photos_bucket_name" {
  value = module.storage.photos_bucket_name
}

output "photos_bucket_arn" {
  description = "写真 S3 バケット ARN（CI/CD ロールポリシーに使用）"
  value       = module.storage.photos_bucket_arn
}

output "api_endpoint" {
  description = "API Gateway エンドポイント URL（フロントエンド環境変数 VITE_API_BASE_URL に使用）"
  value       = module.api.api_endpoint
}
