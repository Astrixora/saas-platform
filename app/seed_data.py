"""
TigerGate B2B SaaS Platform — Seed Data
Populates the database with realistic sample data for demo / testing.
VULNERABILITY: Uses MD5 for password hashing (CWE-328) — intentional.
"""

import hashlib
import random
import sqlite3
from datetime import datetime, timedelta

from config import DB_PATH

# ── Palette ──────────────────────────────────────────────────────────────────
AVATAR_COLORS = [
    "#6366F1", "#8B5CF6", "#EC4899", "#F43F5E",
    "#F59E0B", "#10B981", "#3B82F6", "#14B8A6",
]

# ── Users ────────────────────────────────────────────────────────────────────
USERS = [
    # (username, email, password, full_name, role, department)
    ("admin",       "admin@tigergate.io",           "admin123",         "Sarah Chen",           "admin",    "Engineering"),
    ("jthompson",   "james.thompson@tigergate.io",  "Welcome1!",        "James Thompson",       "admin",    "Engineering"),
    ("mwilliams",   "maria.williams@tigergate.io",  "Maria2024!",       "Maria Williams",       "manager",  "Sales"),
    ("rjohnson",    "robert.johnson@tigergate.io",  "SecurePass1",      "Robert Johnson",       "manager",  "Finance"),
    ("egarcia",     "elena.garcia@tigergate.io",    "Elena#2024",       "Elena Garcia",         "manager",  "Marketing"),
    ("dkim",        "david.kim@tigergate.io",       "DavidK!m99",       "David Kim",            "analyst",  "Engineering"),
    ("apatil",      "ananya.patil@tigergate.io",    "Ananya@123",       "Ananya Patil",         "analyst",  "Security"),
    ("lwang",       "li.wang@tigergate.io",         "LiWang#88",        "Li Wang",              "analyst",  "Product"),
    ("okoye",       "omar.koye@tigergate.io",       "OmarK2024",        "Omar Koye",            "analyst",  "Finance"),
    ("slee",        "sophie.lee@tigergate.io",       "Sophie!Lee",       "Sophie Lee",           "analyst",  "Marketing"),
    ("bmartin",     "ben.martin@tigergate.io",      "BenM@rtin1",       "Ben Martin",           "viewer",   "Operations"),
    ("cjones",      "carla.jones@tigergate.io",     "Carla2024",        "Carla Jones",          "viewer",   "Sales"),
    ("nsingh",      "naveen.singh@tigergate.io",    "Naveen!23",        "Naveen Singh",         "viewer",   "HR"),
    ("tallen",      "tara.allen@tigergate.io",      "TaraAll3n",        "Tara Allen",           "viewer",   "Engineering"),
    ("mzhang",      "michael.zhang@tigergate.io",   "MZhang#99",        "Michael Zhang",        "viewer",   "Product"),
    ("jpatel",      "jessica.patel@tigergate.io",   "JessP@tel",        "Jessica Patel",        "manager",  "Operations"),
    ("rwilson",     "rachel.wilson@tigergate.io",   "Rachel!W1",        "Rachel Wilson",        "analyst",  "Sales"),
    ("arobinson",   "alex.robinson@tigergate.io",   "AlexR0b!n",        "Alex Robinson",        "viewer",   "Security"),
    ("kbrown",      "kevin.brown@tigergate.io",     "KevinBr0wn",       "Kevin Brown",          "analyst",  "HR"),
    ("lnguyen",     "linh.nguyen@tigergate.io",     "LinhN2024",        "Linh Nguyen",          "viewer",   "Finance"),
    ("fmorales",    "felix.morales@tigergate.io",   "F3lixM!",          "Felix Morales",        "manager",  "Engineering"),
    ("hturner",     "hannah.turner@tigergate.io",   "Hannah#T1",        "Hannah Turner",        "viewer",   "Marketing"),
]

# ── Transaction categories & descriptions ────────────────────────────────────
CATEGORIES = [
    "Subscription",
    "Enterprise License",
    "Professional Services",
    "Training",
    "Support Contract",
    "API Usage",
    "Custom Integration",
]

DESCRIPTIONS = {
    "Subscription":          ["Monthly Pro Plan", "Annual Team Plan", "Starter Monthly", "Business Quarterly"],
    "Enterprise License":    ["Enterprise Site License", "Enterprise Unlimited", "Multi-year Enterprise Deal"],
    "Professional Services": ["Security Audit Engagement", "Migration Assistance", "Architecture Review"],
    "Training":              ["On-site Workshop", "Virtual Training — 5 seats", "Certification Program"],
    "Support Contract":      ["Premium 24/7 Support", "Standard Business Hours", "Dedicated TAM"],
    "API Usage":             ["Overage — October", "Overage — November", "Burst Tier Upgrade"],
    "Custom Integration":    ["Salesforce Connector", "Jira Integration Build", "SSO Custom Module"],
}


def _md5(password: str) -> str:
    """VULNERABILITY: Weak hashing with MD5 (CWE-328) — intentional."""
    return hashlib.md5(password.encode()).hexdigest()


def seed():
    """Populate the database with demo data. Idempotent — skips if users exist."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Skip if already seeded
    cur.execute("SELECT COUNT(*) FROM users")
    if cur.fetchone()[0] > 0:
        conn.close()
        print("[SEED] Database already seeded — skipping.")
        return

    now = datetime.utcnow()

    # ── Insert users ─────────────────────────────────────────────────────────
    for idx, (username, email, password, full_name, role, dept) in enumerate(USERS):
        color = AVATAR_COLORS[idx % len(AVATAR_COLORS)]
        created = now - timedelta(days=random.randint(30, 365))
        last_login = now - timedelta(days=random.randint(0, 60), hours=random.randint(0, 23))
        cur.execute(
            """INSERT INTO users
               (username, email, password_hash, full_name, role, department, status, avatar_color, created_at, last_login)
               VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)""",
            (username, email, _md5(password), full_name, role, dept, color,
             created.isoformat(), last_login.isoformat()),
        )

    user_count = len(USERS)
    print(f"[SEED] Inserted {user_count} users.")

    # ── Insert transactions ──────────────────────────────────────────────────
    statuses = ["completed"] * 15 + ["pending"] * 3 + ["refunded"] * 2  # weighted
    tx_count = 0
    for _ in range(120):
        user_id = random.randint(1, user_count)
        cat = random.choice(CATEGORIES)
        desc = random.choice(DESCRIPTIONS[cat])
        amount = round(random.uniform(50, 50000), 2)
        status = random.choice(statuses)
        created = now - timedelta(days=random.randint(0, 90), hours=random.randint(0, 23))
        cur.execute(
            """INSERT INTO transactions (user_id, amount, description, category, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (user_id, amount, desc, cat, status, created.isoformat()),
        )
        tx_count += 1

    print(f"[SEED] Inserted {tx_count} transactions.")

    # ── Insert activity log ──────────────────────────────────────────────────
    activities = [
        (1, "login",            "session",   "Admin login from 10.0.1.5",             "10.0.1.5"),
        (2, "login",            "session",   "Login from office VPN",                 "10.0.2.12"),
        (1, "generate_report",  "reports",   "Generated Q3 Revenue Report",           "10.0.1.5"),
        (3, "update_settings",  "settings",  "Changed session timeout to 480 min",    "10.0.3.8"),
        (5, "upload_file",      "files",     "Uploaded marketing_deck_q4.pdf",        "10.0.5.22"),
        (1, "create_user",      "users",     "Created user kbrown",                   "10.0.1.5"),
        (4, "login",            "session",   "Login from mobile device",              "192.168.1.44"),
        (6, "generate_report",  "reports",   "Generated Department Spend Analysis",   "10.0.6.3"),
        (2, "update_user",      "users",     "Updated role for arobinson to viewer",  "10.0.2.12"),
        (1, "login",            "session",   "Admin login from home office",          "73.162.44.19"),
    ]
    for uid, action, target, details, ip in activities:
        created = now - timedelta(hours=random.randint(1, 72))
        cur.execute(
            """INSERT INTO activity_log (user_id, action, target, details, ip_address, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (uid, action, target, details, ip, created.isoformat()),
        )
    print("[SEED] Inserted 10 activity-log entries.")

    # ── Insert default settings ──────────────────────────────────────────────
    defaults = [
        ("maintenance_mode",    "false"),
        ("max_upload_size",     "52428800"),
        ("default_role",        "viewer"),
        ("session_timeout",     "480"),
        ("enable_notifications", "true"),
    ]
    for key, value in defaults:
        cur.execute(
            "INSERT INTO settings (key, value, updated_by, updated_at) VALUES (?, ?, 1, ?)",
            (key, value, now.isoformat()),
        )
    print("[SEED] Inserted 5 default settings.")

    conn.commit()
    conn.close()
    print("[SEED] Seeding complete.")
