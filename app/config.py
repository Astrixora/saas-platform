"""
TigerGate B2B SaaS Platform — Configuration
VULNERABILITY: Hardcoded credentials (CWE-798) — intentional for scanner testing
"""

import os

# --- Database ---
DB_PATH = "tigergate.db"

# VULNERABILITY: Hardcoded production database credentials (CWE-798)
DB_HOST = "prod-db.internal.tigergate.io"
DB_PORT = 5432
DB_USER = "tigergate_admin"
DB_PASSWORD = "T!g3rGat3_Pr0d#2024"
DB_NAME = "tigergate_prod"

# --- Application ---
SECRET_KEY = "tigergate-jwt-secret-2024-prod-key"  # VULNERABILITY: Hardcoded JWT secret (CWE-798)
JWT_EXPIRY_HOURS = 8

# --- File Uploads ---
UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = None  # VULNERABILITY: No file-type restriction (CWE-434)
MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50 MB

# --- API Keys (hardcoded — intentional vuln) ---
STRIPE_SECRET_KEY = "sk_test_TigerGate4a1b2c3d4e5f6g7h8i9j0"
SENDGRID_API_KEY = "SG.test_TigerGate_aBcDeFgHiJkLmNoPqRsTuVwXyZ"
AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7TIGERGT"
AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYTIGERGATE"

# --- Server ---
DEBUG = True  # VULNERABILITY: Debug mode enabled in production (CWE-489)
HOST = "0.0.0.0"
PORT = 5000

# --- Logging ---
LOG_LEVEL = "DEBUG"
LOG_FILE = "tigergate.log"

# --- Session ---
SESSION_TIMEOUT_MINUTES = 480

# --- Misc ---
ADMIN_EMAIL = "admin@tigergate.io"
SUPPORT_EMAIL = "support@tigergate.io"
