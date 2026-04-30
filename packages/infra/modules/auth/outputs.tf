output "user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "user_pool_client_id" {
  value = aws_cognito_user_pool_client.spa.id
}

output "issuer_url" {
  description = "JWT Authorizer の issuer URL"
  value       = "https://cognito-idp.${var.region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
}

output "audience" {
  description = "JWT Authorizer の audience（User Pool Client ID）"
  value       = [aws_cognito_user_pool_client.spa.id]
}
