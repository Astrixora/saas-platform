# ============================================================================
# TigerGate Platform — Main Infrastructure Configuration
# Environment: Production
# Region: us-east-1
# Last updated: 2024-09-15
# ============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.20"
    }
  }

  # VULNERABILITY [Medium]: Backend state stored in S3 without encryption.
  # Terraform state may contain sensitive values (passwords, keys) in plaintext.
  backend "s3" {
    bucket  = "tigergate-terraform-state"
    key     = "prod/infrastructure/terraform.tfstate"
    region  = "us-east-1"
    encrypt = false
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = "production"
      Project     = "tigergate-platform"
      ManagedBy   = "terraform"
      Team        = "platform-engineering"
    }
  }
}

# ---------------------------------------------------------------------------
# Variables
# ---------------------------------------------------------------------------

variable "aws_region" {
  description = "Primary AWS region for infrastructure deployment"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment identifier"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "tigergate"
}

# ---------------------------------------------------------------------------
# Data Sources
# ---------------------------------------------------------------------------

data "aws_caller_identity" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
}

# ---------------------------------------------------------------------------
# Networking — VPC and Subnets
# ---------------------------------------------------------------------------

# VULNERABILITY [Low]: Using the default VPC instead of a custom VPC.
# Default VPCs have overly permissive default security groups and NACLs,
# and lack the network segmentation required for production workloads.
resource "aws_default_vpc" "default" {
  tags = {
    Name = "${var.project_name}-default-vpc"
  }
}

resource "aws_default_subnet" "default_az1" {
  availability_zone = data.aws_availability_zones.available.names[0]

  tags = {
    Name = "${var.project_name}-default-subnet-az1"
  }
}

resource "aws_default_subnet" "default_az2" {
  availability_zone = data.aws_availability_zones.available.names[1]

  tags = {
    Name = "${var.project_name}-default-subnet-az2"
  }
}

# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------

output "account_id" {
  description = "AWS Account ID"
  value       = data.aws_caller_identity.current.account_id
}

output "vpc_id" {
  description = "ID of the default VPC"
  value       = aws_default_vpc.default.id
}

output "subnet_ids" {
  description = "IDs of the default subnets"
  value = [
    aws_default_subnet.default_az1.id,
    aws_default_subnet.default_az2.id,
  ]
}
