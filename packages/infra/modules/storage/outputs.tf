output "cloudfront_domain" {
  value = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.main.id
}

output "cloudfront_distribution_arn" {
  value = aws_cloudfront_distribution.main.arn
}

output "spa_bucket_name" {
  value = aws_s3_bucket.spa.id
}

output "spa_bucket_arn" {
  value = aws_s3_bucket.spa.arn
}

output "photos_bucket_name" {
  value = aws_s3_bucket.photos.id
}

output "photos_bucket_arn" {
  value = aws_s3_bucket.photos.arn
}
