variable "region" {
  type    = string
  default = "ap-northeast-1"
}

variable "frontend_origin" {
  type        = string
  description = "本番フロントエンドのオリジン（例: https://example.com）"
  validation {
    condition     = can(regex("^https://", var.frontend_origin))
    error_message = "frontend_origin は https:// で始まる必要があります。"
  }
}

variable "alert_email" {
  type        = string
  description = "CloudWatch Alarm の通知先メールアドレス"
}
