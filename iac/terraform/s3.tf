# ============================================================================
# TigerGate Platform — S3 Bucket Configuration
# Purpose: Object storage for application assets and user uploads
# ============================================================================

# ---------------------------------------------------------------------------
# Primary Application Data Bucket
# ---------------------------------------------------------------------------

# VULNERABILITY [Critical]: Public ACL allows anyone on the internet to
# list and read objects in this bucket.
resource "aws_s3_bucket" "app_data" {
  bucket = "${var.project_name}-app-data-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "${var.project_name}-app-data"
    Environment = var.environment
    DataClass   = "confidential"
  }
}

resource "aws_s3_bucket_acl" "app_data_acl" {
  bucket = aws_s3_bucket.app_data.id
  acl    = "public-read"
}

# VULNERABILITY [High]: No server-side encryption configured.
# Data at rest is stored in plaintext, violating compliance requirements
# (PCI-DSS, HIPAA, SOC 2).

# VULNERABILITY [Medium]: Versioning is not enabled.
# Accidental deletions or overwrites cannot be recovered.

# VULNERABILITY [Low]: Access logging is not configured.
# No audit trail for bucket access patterns.

# ---------------------------------------------------------------------------
# Static Assets Bucket (CDN Origin)
# ---------------------------------------------------------------------------

resource "aws_s3_bucket" "static_assets" {
  bucket = "${var.project_name}-static-assets-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "${var.project_name}-static-assets"
    Environment = var.environment
    Purpose     = "cdn-origin"
  }
}

resource "aws_s3_bucket_website_configuration" "static_assets_website" {
  bucket = aws_s3_bucket.static_assets.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "error.html"
  }
}

# ---------------------------------------------------------------------------
# Bucket Policy — Application Data
# ---------------------------------------------------------------------------

# VULNERABILITY [Critical]: Overly permissive bucket policy grants all S3
# actions (s3:*) to any principal (*). Any AWS account or unauthenticated
# user can read, write, and delete objects.
resource "aws_s3_bucket_policy" "app_data_policy" {
  bucket = aws_s3_bucket.app_data.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowPublicAccess"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.app_data.arn,
          "${aws_s3_bucket.app_data.arn}/*",
        ]
      },
    ]
  })
}

# ---------------------------------------------------------------------------
# Bucket for Terraform State Artifacts
# ---------------------------------------------------------------------------

resource "aws_s3_bucket" "terraform_artifacts" {
  bucket = "${var.project_name}-tf-artifacts-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "${var.project_name}-tf-artifacts"
    Environment = var.environment
    Purpose     = "ci-cd-artifacts"
  }
}

resource "aws_s3_bucket_versioning" "terraform_artifacts_versioning" {
  bucket = aws_s3_bucket.terraform_artifacts.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_artifacts_sse" {
  bucket = aws_s3_bucket.terraform_artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------

output "app_data_bucket_arn" {
  description = "ARN of the application data S3 bucket"
  value       = aws_s3_bucket.app_data.arn
}

output "static_assets_bucket_endpoint" {
  description = "Website endpoint for the static assets bucket"
  value       = aws_s3_bucket_website_configuration.static_assets_website.website_endpoint
}
