# ============================================================================
# TigerGate Platform — Security Group Definitions
# Purpose: Network-level access control for platform components
# ============================================================================

# ---------------------------------------------------------------------------
# Application Load Balancer Security Group
# ---------------------------------------------------------------------------

# VULNERABILITY [Critical]: Ingress rule allows traffic from 0.0.0.0/0
# (any IP) on ALL ports (0–65535). This effectively disables network-level
# access control and exposes every listening service to the internet.
resource "aws_security_group" "application" {
  name        = "${var.project_name}-app-sg"
  description = "Security group for application tier instances"
  vpc_id      = aws_default_vpc.default.id

  ingress {
    description = "Allow all inbound traffic"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # VULNERABILITY [Medium]: Egress rule allows all outbound traffic to any
  # destination. Compromised instances can exfiltrate data or establish
  # reverse shells without restriction.
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-app-sg"
    Environment = var.environment
    Tier        = "application"
  }
}

# ---------------------------------------------------------------------------
# Bastion / Jump Host Security Group
# ---------------------------------------------------------------------------

resource "aws_security_group" "bastion" {
  name        = "${var.project_name}-bastion-sg"
  description = "Security group for SSH bastion host"
  vpc_id      = aws_default_vpc.default.id

  # VULNERABILITY [High]: SSH (port 22) open to the entire internet.
  # Brute-force attacks, credential stuffing, and exploit attempts will
  # target this port continuously.
  ingress {
    description = "SSH access"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # VULNERABILITY [High]: RDP (port 3389) open to the entire internet.
  # Windows Remote Desktop exposed publicly enables brute-force and
  # pass-the-hash attacks against Windows jump hosts.
  ingress {
    description = "RDP access for Windows bastion"
    from_port   = 3389
    to_port     = 3389
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-bastion-sg"
    Environment = var.environment
    Tier        = "management"
  }
}

# ---------------------------------------------------------------------------
# Database Security Group
# ---------------------------------------------------------------------------

resource "aws_security_group" "database" {
  name        = "${var.project_name}-db-sg"
  description = "Security group for RDS database instances"
  vpc_id      = aws_default_vpc.default.id

  ingress {
    description     = "PostgreSQL from application tier"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.application.id]
  }

  # Allow database access from bastion for maintenance
  ingress {
    description     = "PostgreSQL from bastion"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion.id]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-db-sg"
    Environment = var.environment
    Tier        = "data"
  }
}

# ---------------------------------------------------------------------------
# Monitoring / Observability Security Group
# ---------------------------------------------------------------------------

resource "aws_security_group" "monitoring" {
  name        = "${var.project_name}-monitoring-sg"
  description = "Security group for monitoring and observability stack"
  vpc_id      = aws_default_vpc.default.id

  ingress {
    description     = "Grafana dashboard"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion.id]
  }

  ingress {
    description     = "Prometheus metrics"
    from_port       = 9090
    to_port         = 9090
    protocol        = "tcp"
    security_groups = [aws_security_group.application.id]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-monitoring-sg"
    Environment = var.environment
    Tier        = "observability"
  }
}
