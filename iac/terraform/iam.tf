# ============================================================================
# TigerGate Platform — IAM Roles, Policies, and Users
# Purpose: Identity and access management for platform services
# ============================================================================

# ---------------------------------------------------------------------------
# Admin Role with Wildcard Policy
# ---------------------------------------------------------------------------

# VULNERABILITY [High]: Overly permissive assume-role trust policy allows
# any AWS account to assume this role without external ID or conditions.
resource "aws_iam_role" "platform_admin" {
  name = "${var.project_name}-platform-admin"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { AWS = "*" }
        Action    = "sts:AssumeRole"
      },
    ]
  })

  tags = {
    Name        = "${var.project_name}-platform-admin"
    Environment = var.environment
    Purpose     = "administrative-access"
  }
}

# VULNERABILITY [Critical]: Wildcard *:* admin policy grants unrestricted
# access to every AWS service and action. Violates principle of least
# privilege and creates a full account compromise risk.
resource "aws_iam_role_policy" "platform_admin_policy" {
  name = "${var.project_name}-admin-full-access"
  role = aws_iam_role.platform_admin.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "FullAdministratorAccess"
        Effect   = "Allow"
        Action   = "*"
        Resource = "*"
      },
    ]
  })
}

# ---------------------------------------------------------------------------
# Application Service Role (properly scoped — for contrast)
# ---------------------------------------------------------------------------

resource "aws_iam_role" "app_service" {
  name = "${var.project_name}-app-service"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Service = "ec2.amazonaws.com" }
        Action    = "sts:AssumeRole"
      },
    ]
  })

  tags = {
    Name        = "${var.project_name}-app-service"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "app_service_s3" {
  role       = aws_iam_role.app_service.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}

# ---------------------------------------------------------------------------
# CI/CD Pipeline User with Inline Policy
# ---------------------------------------------------------------------------

# VULNERABILITY [Medium]: IAM user with inline policy instead of managed
# policy attached via group. Inline policies cannot be audited centrally
# and make permission management error-prone at scale.
resource "aws_iam_user" "cicd_deployer" {
  name = "${var.project_name}-cicd-deployer"
  path = "/system/"

  tags = {
    Name        = "${var.project_name}-cicd-deployer"
    Environment = var.environment
    Purpose     = "ci-cd-pipeline"
  }
}

resource "aws_iam_user_policy" "cicd_deployer_inline" {
  name = "${var.project_name}-cicd-deploy-permissions"
  user = aws_iam_user.cicd_deployer.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowECRAccess"
        Effect = "Allow"
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
        ]
        Resource = "*"
      },
      {
        Sid    = "AllowECSDeployment"
        Effect = "Allow"
        Action = [
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:DescribeTaskDefinition",
          "ecs:RegisterTaskDefinition",
        ]
        Resource = "*"
      },
    ]
  })
}

resource "aws_iam_access_key" "cicd_deployer_key" {
  user = aws_iam_user.cicd_deployer.name
}

# ---------------------------------------------------------------------------
# Console Users Group — No MFA Enforcement
# ---------------------------------------------------------------------------

# VULNERABILITY [High]: No MFA requirement for console access. Users can
# log into the AWS Console with password-only authentication, increasing
# the risk of credential compromise attacks.
resource "aws_iam_group" "developers" {
  name = "${var.project_name}-developers"
  path = "/teams/"
}

resource "aws_iam_group_policy" "developers_console_access" {
  name  = "${var.project_name}-developers-console"
  group = aws_iam_group.developers.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowConsoleAccess"
        Effect = "Allow"
        Action = [
          "ec2:Describe*",
          "s3:List*",
          "s3:Get*",
          "cloudwatch:Get*",
          "cloudwatch:List*",
          "logs:Get*",
          "logs:Describe*",
        ]
        Resource = "*"
      },
      # NOTE: No condition block requiring MFA
      # (aws:MultiFactorAuthPresent) is present.
    ]
  })
}

resource "aws_iam_account_password_policy" "strict" {
  minimum_password_length        = 8
  require_lowercase_characters   = true
  require_uppercase_characters   = true
  require_numbers                = true
  require_symbols                = false
  allow_users_to_change_password = true
  max_password_age               = 90
  password_reuse_prevention      = 3
}

# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------

output "platform_admin_role_arn" {
  description = "ARN of the platform admin IAM role"
  value       = aws_iam_role.platform_admin.arn
}

output "cicd_deployer_access_key" {
  description = "Access key ID for CI/CD deployer (rotate regularly)"
  value       = aws_iam_access_key.cicd_deployer_key.id
  sensitive   = true
}
