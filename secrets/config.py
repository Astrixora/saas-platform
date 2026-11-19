"""
Application Configuration
WARNING: This file contains sensitive credentials for production services.
Do NOT commit this file to version control.
"""

import os

# =============================================================================
# AWS Configuration
# =============================================================================
AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"
AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
AWS_DEFAULT_REGION = "us-east-1"
S3_BUCKET_NAME = "prod-application-assets"

# =============================================================================
# Stripe Payment Gateway
# =============================================================================
STRIPE_SECRET_KEY = "sk_test_mock_stripe_secret_key_tigergate_benchmark_001"
STRIPE_PUBLISHABLE_KEY = "pk_live_51HG4k2Ld9fGz3xN7vRtQwYpAbCdEfGhIjKlMnOpQrStUvWxYz"
STRIPE_WEBHOOK_SECRET = "whsec_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"

# =============================================================================
# Database Configuration
# =============================================================================
DATABASE_URL = "postgresql://admin:SuperSecretP@ssw0rd!2024@prod-db.internal.example.com:5432/app_production"
DATABASE_REPLICA_URL = "postgresql://readonly:R3adOnlyP@ss!@replica-db.internal.example.com:5432/app_production"

# Connection pool settings
DB_POOL_SIZE = 20
DB_MAX_OVERFLOW = 10
DB_POOL_TIMEOUT = 30

# =============================================================================
# SMTP / Email Configuration
# =============================================================================
SMTP_HOST = "smtp.sendgrid.net"
SMTP_PORT = 587
SMTP_USERNAME = "apikey"
SMTP_PASSWORD = "SG.xYzAbCdEfGhIjKlMnOpQrS.1234567890abcdefghijklmnopqrstuvwxyzABCD"
SMTP_USE_TLS = True
EMAIL_FROM = "noreply@example.com"

# =============================================================================
# API Base URLs
# =============================================================================
API_BASE_URL = "https://api.example.com/v2"
INTERNAL_SERVICE_URL = "http://internal-gateway.example.com:8080"
CDN_BASE_URL = "https://cdn.example.com/assets"
WEBHOOK_CALLBACK_URL = "https://app.example.com/webhooks/incoming"

# =============================================================================
# Application Settings
# =============================================================================
DEBUG = False
SECRET_KEY = "django-insecure-f8k3$m!xed-s3cret-key-th@t-should-be-env-var"
ALLOWED_HOSTS = ["app.example.com", "api.example.com"]
