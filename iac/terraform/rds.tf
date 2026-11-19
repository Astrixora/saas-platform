# ============================================================================
# TigerGate Platform — RDS Database Configuration
# Purpose: PostgreSQL database for the application backend
# ============================================================================

# ---------------------------------------------------------------------------
# Variables
# ---------------------------------------------------------------------------

variable "db_username" {
  description = "Master username for the RDS instance"
  type        = string
  default     = "tigergate_admin"
}

variable "db_password" {
  description = "Master password for the RDS instance"
  type        = string
  default     = "Pr0duction_Passw0rd!"
  sensitive   = true
}

# ---------------------------------------------------------------------------
# DB Subnet Group
# ---------------------------------------------------------------------------

resource "aws_db_subnet_group" "main" {
  name = "${var.project_name}-db-subnet-group"

  subnet_ids = [
    aws_default_subnet.default_az1.id,
    aws_default_subnet.default_az2.id,
  ]

  tags = {
    Name        = "${var.project_name}-db-subnet-group"
    Environment = var.environment
  }
}

# ---------------------------------------------------------------------------
# RDS PostgreSQL Instance
# ---------------------------------------------------------------------------

resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-postgres-primary"

  # Engine configuration
  engine                = "postgres"
  engine_version        = "15.4"
  instance_class        = "db.r6g.xlarge"
  allocated_storage     = 100
  max_allocated_storage = 500

  # Credentials
  username = var.db_username
  password = var.db_password

  # Networking
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.database.id]

  # VULNERABILITY [Critical]: Database is publicly accessible from the
  # internet. Combined with a permissive security group, anyone can attempt
  # connections to the database endpoint.
  publicly_accessible = true

  # VULNERABILITY [Low]: Using the default PostgreSQL port (5432).
  # Automated scanners target well-known ports; non-standard ports add a
  # minor layer of obscurity.
  port = 5432

  # Storage
  storage_type = "gp3"

  # VULNERABILITY [High]: Encryption at rest is disabled. Data stored on
  # disk, snapshots, and read replicas are not encrypted, violating
  # compliance requirements (PCI-DSS, HIPAA).
  storage_encrypted = false

  # Backup & Recovery
  # VULNERABILITY [Medium]: Backup retention set to 0 disables automated
  # backups entirely. No point-in-time recovery is possible.
  backup_retention_period = 0
  backup_window           = "03:00-04:00"

  # Maintenance
  maintenance_window         = "Sun:04:00-Sun:05:00"
  auto_minor_version_upgrade = true

  # VULNERABILITY [Medium]: Deletion protection is disabled. The database
  # can be destroyed by an accidental `terraform destroy` or API call.
  deletion_protection = false

  # VULNERABILITY [Low]: Multi-AZ is not enabled. A single AZ failure will
  # cause downtime with no automatic failover.
  multi_az = false

  # Performance monitoring
  performance_insights_enabled = true

  # Parameters
  parameter_group_name = aws_db_parameter_group.main.name

  # Final snapshot
  skip_final_snapshot       = true
  final_snapshot_identifier = "${var.project_name}-final-snapshot"

  tags = {
    Name        = "${var.project_name}-postgres-primary"
    Environment = var.environment
    DataClass   = "restricted"
    Backup      = "critical"
  }
}

# ---------------------------------------------------------------------------
# DB Parameter Group
# ---------------------------------------------------------------------------

resource "aws_db_parameter_group" "main" {
  name   = "${var.project_name}-postgres15-params"
  family = "postgres15"

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_statement"
    value = "all"
  }

  tags = {
    Name        = "${var.project_name}-postgres15-params"
    Environment = var.environment
  }
}

# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------

output "rds_endpoint" {
  description = "Endpoint of the primary RDS instance"
  value       = aws_db_instance.main.endpoint
}

output "rds_port" {
  description = "Port the RDS instance listens on"
  value       = aws_db_instance.main.port
}
