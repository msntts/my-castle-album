output "terraform_role_arn" { value = aws_iam_role.github_terraform.arn }
output "deploy_role_arn"    { value = aws_iam_role.github_deploy.arn }
