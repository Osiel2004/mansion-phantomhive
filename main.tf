terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Configuración de la región de AWS
provider "aws" {
  region = "us-east-1" 
}

# 1. DynamoDB: Tabla para el Catálogo de productos
resource "aws_dynamodb_table" "catalogo_productos" {
  name           = "Phantomhive_Catalogo"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }
}

# 2. DynamoDB: Tabla para el Registro de pedidos
resource "aws_dynamodb_table" "registro_pedidos" {
  name           = "Phantomhive_Pedidos"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "pedido_id"

  attribute {
    name = "pedido_id" 
    type = "S"
  }
}

# 3. Cognito: User Pool para autenticación de usuarios (Versión 2 - Corregida)
resource "aws_cognito_user_pool" "pool_usuarios" {
  name = "phantomhive_users_v2" # Cambiamos el nombre para forzar una creación limpia

  # Forzamos que el login y el registro sean con correo electrónico
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"] 

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_uppercase = true
    require_symbols   = false
  }

  # Le decimos a AWS exactamente cómo debe ser el correo que enviará
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Código de acceso - Mansión Phantomhive"
    email_message        = "Tu código de verificación para entrar a la mansión es {####}."
  }
}

# 4. Amplify: Conexión con GitHub para el CI/CD
variable "github_token" {
  description = "Token de acceso personal de GitHub"
  type        = string
  sensitive   = true
}

resource "aws_amplify_app" "web_app" {
  name       = "mansion-phantomhive"
  repository = "https://github.com/Osiel2004/mansion-phantomhive"
  access_token = var.github_token

  # Instrucciones de compilación para que AWS entienda que es un proyecto de Vite
  build_spec = <<-EOT
    version: 1
    frontend:
      phases:
        preBuild:
          commands:
            - npm install
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: dist
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
  EOT
}

# Despliegue automático de la rama main
resource "aws_amplify_branch" "main_branch" {
  app_id      = aws_amplify_app.web_app.id
  branch_name = "main"
  enable_auto_build = true
}

# Salida: Terraform nos mostrará la URL pública al terminar
output "amplify_app_url" {
  value = aws_amplify_app.web_app.default_domain
}

# Cliente de la aplicación para que React se conecte
resource "aws_cognito_user_pool_client" "app_client" {
  name         = "phantomhive_react_client"
  user_pool_id = aws_cognito_user_pool.pool_usuarios.id
  generate_secret = false # Debe ser false para aplicaciones web React
}

# Salidas para obtener los IDs necesarios
output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.pool_usuarios.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.app_client.id
}