output "api_endpoint" {
  value = aws_apigatewayv2_api.main.api_endpoint
}

output "api_id" {
  value = aws_apigatewayv2_api.main.id
}

output "castles_integration_id" {
  description = "Phase 10 で JWT Authorizer を書き込み系ルートに追加する際に使用"
  value       = aws_apigatewayv2_integration.castles.id
}

output "photos_integration_id" {
  value = aws_apigatewayv2_integration.photos.id
}
