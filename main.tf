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
  name            = "phantomhive_react_client"
  user_pool_id    = aws_cognito_user_pool.pool_usuarios.id
  generate_secret = false 
  
  # ¡ESTA ES LA CLAVE! Le damos permiso al cliente de procesar contraseñas
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH"
  ]
}

# Salidas para obtener los IDs necesarios
output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.pool_usuarios.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.app_client.id
}

# ==========================================
# NUEVOS RECURSOS: BACKEND (LAMBDA + API GATEWAY)
# ==========================================

# 1. Comprimir el código de Node.js en un .zip automáticamente
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/backend"
  output_path = "${path.module}/backend.zip"
}

# 2. Rol de IAM: Le da a la Lambda una "identidad" en AWS
resource "aws_iam_role" "lambda_role" {
  name = "phantomhive_lambda_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

# 3. Políticas: Permiso para tocar nuestra tabla DynamoDB y escribir logs
resource "aws_iam_policy" "lambda_dynamodb_policy" {
  name        = "phantomhive_lambda_dynamodb_policy"
  description = "Permisos para que Lambda acceda a DynamoDB"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:Scan",
          "dynamodb:GetItem"
        ]
        Resource = aws_dynamodb_table.catalogo_productos.arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# Unimos la política al rol
resource "aws_iam_role_policy_attachment" "lambda_policy_attach" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_dynamodb_policy.arn
}

# 4. La Función Lambda
resource "aws_lambda_function" "catalogo_api" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "phantomhive_catalogo_api"
  role             = aws_iam_role.lambda_role.arn
  handler          = "index.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime          = "nodejs18.x" # Entorno de Node.js
}

# 5. API Gateway: La URL pública que conectará React con Lambda
resource "aws_apigatewayv2_api" "http_api" {
  name          = "phantomhive-api"
  protocol_type = "HTTP"
  
  # Configuración CORS indispensable para que React pueda leer la API
  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["content-type"]
  }
}

resource "aws_apigatewayv2_stage" "api_stage" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id           = aws_apigatewayv2_api.http_api.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.catalogo_api.invoke_arn
  integration_method = "POST"
}

# Rutas de nuestra API (/productos)
resource "aws_apigatewayv2_route" "get_productos" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "GET /productos"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_route" "post_productos" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "POST /productos"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

# 6. Permiso de seguridad para que API Gateway pueda "despertar" a la Lambda
resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.catalogo_api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}

# 7. Salida: Terraform nos dará la URL mágica
output "api_url" {
  value = aws_apigatewayv2_stage.api_stage.invoke_url
}