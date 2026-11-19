"""
TigerGate B2B SaaS Platform — Main Flask Application
=====================================================
This server intentionally contains SAST vulnerabilities for security-scanner
testing.  Do NOT fix them.
"""

import os
import sqlite3
import hashlib
import pickle
import json
import time
import subprocess
from datetime import datetime, timedelta
from functools import wraps

from flask import Flask, request, jsonify, send_from_directory, send_file, g
from flask_cors import CORS
import jwt

from config import *
from database import init_db, get_db
from seed_data import seed

# ═══════════════════════════════════════════════════════════════════════════════
# App Setup
# ═══════════════════════════════════════════════════════════════════════════════

TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "templates")
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")

app = Flask(__name__, static_folder=STATIC_DIR, template_folder=TEMPLATE_DIR)
app.config["SECRET_KEY"] = SECRET_KEY
CORS(app)

# First-run bootstrap
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
if not os.path.exists(DB_PATH):
    init_db()
    seed()

# ═══════════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════════

def _row_to_dict(row):
    """Convert a sqlite3.Row to a plain dict."""
    if row is None:
        return None
    return dict(row)


def _rows_to_list(rows):
    return [dict(r) for r in rows]


def _user_safe(user_dict):
    """Strip password_hash from a user dict before sending to client."""
    if user_dict and "password_hash" in user_dict:
        user_dict = dict(user_dict)
        del user_dict["password_hash"]
    return user_dict

# ═══════════════════════════════════════════════════════════════════════════════
# Auth Decorators
# ═══════════════════════════════════════════════════════════════════════════════

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401
        token = auth_header.split(" ", 1)[1]
        try:
            # VULNERABILITY: Accepts 'none' algorithm (CWE-327)
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256", "none"])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        g.current_user = payload
        return f(*args, **kwargs)
    return decorated


def require_role(*roles):
    def decorator(f):
        @wraps(f)
        @require_auth
        def decorated(*args, **kwargs):
            if g.current_user.get("role") not in roles:
                return jsonify({"error": "Insufficient permissions"}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator

# ═══════════════════════════════════════════════════════════════════════════════
# Static / Template Routes
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/")
def serve_login():
    return send_from_directory(TEMPLATE_DIR, "login.html")


@app.route("/app")
def serve_app():
    return send_from_directory(TEMPLATE_DIR, "app.html")


@app.route("/static/<path:path>")
def serve_static(path):
    return send_from_directory(STATIC_DIR, path)

# ═══════════════════════════════════════════════════════════════════════════════
# Auth Routes
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    db = get_db()
    user = db.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()

    # VULNERABILITY: User enumeration — different messages (CWE-204)
    if user is None:
        db.close()
        return jsonify({"error": "User not found"}), 401

    # VULNERABILITY: Weak MD5 hash (CWE-328)
    password_hash = hashlib.md5(password.encode()).hexdigest()

    # VULNERABILITY: Timing-attack vulnerable comparison (CWE-208)
    if password_hash == user["password_hash"]:
        # Update last_login
        now = datetime.utcnow().isoformat()
        db.execute("UPDATE users SET last_login = ? WHERE id = ?", (now, user["id"]))
        db.commit()

        token = jwt.encode(
            {
                "sub": user["id"],
                "username": user["username"],
                "role": user["role"],
                "email": user["email"],
                "full_name": user["full_name"],
                "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS),
            },
            SECRET_KEY,
            algorithm="HS256",
        )
        db.close()
        return jsonify({"token": token, "user": _user_safe(dict(user))}), 200

    db.close()
    return jsonify({"error": "Invalid password"}), 401


@app.route("/api/auth/register", methods=["POST"])
@require_role("admin")
def register():
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")
    full_name = data.get("full_name", "").strip()
    role = data.get("role", "viewer")
    department = data.get("department", "")
    avatar_color = data.get("avatar_color", "#6366F1")

    if not username or not email or not password or not full_name:
        return jsonify({"error": "username, email, password, and full_name are required"}), 400

    # VULNERABILITY: Weak password policy (CWE-521)
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    # VULNERABILITY: MD5 hashing (CWE-328)
    password_hash = hashlib.md5(password.encode()).hexdigest()

    db = get_db()
    try:
        db.execute(
            """INSERT INTO users (username, email, password_hash, full_name, role, department, avatar_color)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (username, email, password_hash, full_name, role, department, avatar_color),
        )
        db.commit()
        user = db.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        db.close()
        return jsonify({"user": _user_safe(dict(user))}), 201
    except sqlite3.IntegrityError as e:
        db.close()
        return jsonify({"error": f"User already exists: {e}"}), 409


@app.route("/api/auth/me", methods=["GET"])
@require_auth
def me():
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE id = ?", (g.current_user["sub"],)).fetchone()
    db.close()
    if user is None:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": _user_safe(dict(user))}), 200

# ═══════════════════════════════════════════════════════════════════════════════
# User Routes
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/users", methods=["GET"])
@require_auth
def list_users():
    db = get_db()
    rows = db.execute("SELECT * FROM users ORDER BY created_at DESC").fetchall()
    db.close()
    return jsonify({"users": [_user_safe(dict(r)) for r in rows]}), 200


@app.route("/api/users/search", methods=["GET"])
@require_auth
def search_users():
    q = request.args.get("q", "")
    if not q:
        return jsonify({"users": []}), 200

    db = get_db()
    # VULNERABILITY: SQL Injection via string formatting (CWE-89)
    sql = "SELECT * FROM users WHERE username LIKE '%%%s%%' OR email LIKE '%%%s%%' OR full_name LIKE '%%%s%%'" % (q, q, q)
    try:
        rows = db.execute(sql).fetchall()
    except Exception as e:
        db.close()
        return jsonify({"error": str(e)}), 500
    db.close()
    return jsonify({"users": [_user_safe(dict(r)) for r in rows]}), 200


@app.route("/api/users/<int:user_id>", methods=["GET"])
@require_auth
def get_user(user_id):
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    db.close()
    if user is None:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": _user_safe(dict(user))}), 200


@app.route("/api/users", methods=["POST"])
@require_role("admin", "manager")
def create_user():
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")
    full_name = data.get("full_name", "").strip()
    role = data.get("role", "viewer")
    department = data.get("department", "")
    avatar_color = data.get("avatar_color", "#6366F1")

    if not username or not email or not password or not full_name:
        return jsonify({"error": "username, email, password, and full_name are required"}), 400

    password_hash = hashlib.md5(password.encode()).hexdigest()

    db = get_db()
    try:
        db.execute(
            """INSERT INTO users (username, email, password_hash, full_name, role, department, avatar_color)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (username, email, password_hash, full_name, role, department, avatar_color),
        )
        db.commit()
        user = db.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        db.close()
        return jsonify({"user": _user_safe(dict(user))}), 201
    except sqlite3.IntegrityError as e:
        db.close()
        return jsonify({"error": f"User already exists: {e}"}), 409


@app.route("/api/users/<int:user_id>", methods=["PUT"])
@require_role("admin", "manager")
def update_user(user_id):
    data = request.get_json(silent=True) or {}
    db = get_db()

    user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if user is None:
        db.close()
        return jsonify({"error": "User not found"}), 404

    fields = []
    values = []
    for col in ("full_name", "email", "role", "department", "status", "avatar_color"):
        if col in data:
            fields.append(f"{col} = ?")
            values.append(data[col])

    if data.get("password"):
        fields.append("password_hash = ?")
        values.append(hashlib.md5(data["password"].encode()).hexdigest())

    if not fields:
        db.close()
        return jsonify({"error": "No fields to update"}), 400

    values.append(user_id)
    db.execute(f"UPDATE users SET {', '.join(fields)} WHERE id = ?", values)
    db.commit()

    updated = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    db.close()
    return jsonify({"user": _user_safe(dict(updated))}), 200


@app.route("/api/users/<int:user_id>", methods=["DELETE"])
@require_role("admin")
def delete_user(user_id):
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if user is None:
        db.close()
        return jsonify({"error": "User not found"}), 404
    # Soft delete
    db.execute("UPDATE users SET status = 'inactive' WHERE id = ?", (user_id,))
    db.commit()
    db.close()
    return jsonify({"message": "User deactivated"}), 200

# ═══════════════════════════════════════════════════════════════════════════════
# Dashboard Routes
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/dashboard/metrics", methods=["GET"])
@require_auth
def dashboard_metrics():
    db = get_db()
    now = datetime.utcnow()

    # Total revenue
    row = db.execute("SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE status = 'completed'").fetchone()
    total_revenue = row["total"]

    # Active users (last 30 days)
    cutoff_30 = (now - timedelta(days=30)).isoformat()
    active_users = db.execute("SELECT COUNT(*) AS cnt FROM users WHERE last_login >= ?", (cutoff_30,)).fetchone()["cnt"]

    # Total users
    total_users = db.execute("SELECT COUNT(*) AS cnt FROM users").fetchone()["cnt"]

    # Churn rate (not logged in 90 days)
    cutoff_90 = (now - timedelta(days=90)).isoformat()
    churned = db.execute(
        "SELECT COUNT(*) AS cnt FROM users WHERE last_login < ? OR last_login IS NULL", (cutoff_90,)
    ).fetchone()["cnt"]
    churn_rate = round((churned / total_users * 100) if total_users else 0, 1)

    # Pending reports
    pending_reports = db.execute("SELECT COUNT(*) AS cnt FROM reports WHERE status = 'generating'").fetchone()["cnt"]

    # Total files
    total_files = db.execute("SELECT COUNT(*) AS cnt FROM files").fetchone()["cnt"]

    # Monthly revenue (last 6 months)
    six_months_ago = (now - timedelta(days=180)).isoformat()
    monthly_rows = db.execute(
        """SELECT strftime('%%Y-%%m', created_at) AS month, SUM(amount) AS amount
           FROM transactions
           WHERE status = 'completed' AND created_at >= ?
           GROUP BY month ORDER BY month""",
        (six_months_ago,),
    ).fetchall()
    monthly_revenue = [{"month": r["month"], "amount": round(r["amount"], 2)} for r in monthly_rows]

    # Revenue by category
    cat_rows = db.execute(
        """SELECT category, SUM(amount) AS amount
           FROM transactions WHERE status = 'completed'
           GROUP BY category ORDER BY amount DESC"""
    ).fetchall()
    revenue_by_category = [{"category": r["category"], "amount": round(r["amount"], 2)} for r in cat_rows]

    # Recent activity
    activity_rows = db.execute(
        """SELECT a.*, u.full_name
           FROM activity_log a
           LEFT JOIN users u ON a.user_id = u.id
           ORDER BY a.created_at DESC LIMIT 10"""
    ).fetchall()
    recent_activity = _rows_to_list(activity_rows)

    db.close()

    return jsonify({
        "total_revenue": round(total_revenue, 2),
        "active_users": active_users,
        "total_users": total_users,
        "churn_rate": churn_rate,
        "pending_reports": pending_reports,
        "total_files": total_files,
        "monthly_revenue": monthly_revenue,
        "revenue_by_category": revenue_by_category,
        "recent_activity": recent_activity,
    }), 200


@app.route("/api/dashboard/calculate", methods=["POST"])
@require_auth
def dashboard_calculate():
    """Custom metric calculator.
    VULNERABILITY: eval() on user input (CWE-95) — intentional.
    """
    data = request.get_json(silent=True) or {}
    formula = data.get("formula", "")
    if not formula:
        return jsonify({"error": "formula is required"}), 400

    db = get_db()
    revenue = db.execute("SELECT COALESCE(SUM(amount), 0) AS t FROM transactions WHERE status = 'completed'").fetchone()["t"]
    total_users = db.execute("SELECT COUNT(*) AS cnt FROM users").fetchone()["cnt"]
    cutoff_30 = (datetime.utcnow() - timedelta(days=30)).isoformat()
    active_users = db.execute("SELECT COUNT(*) AS cnt FROM users WHERE last_login >= ?", (cutoff_30,)).fetchone()["cnt"]
    cutoff_90 = (datetime.utcnow() - timedelta(days=90)).isoformat()
    churned = db.execute("SELECT COUNT(*) AS cnt FROM users WHERE last_login < ? OR last_login IS NULL", (cutoff_90,)).fetchone()["cnt"]
    churn_rate = round((churned / total_users * 100) if total_users else 0, 1)
    db.close()

    context = {
        "revenue": revenue,
        "active_users": active_users,
        "churn_rate": churn_rate,
        "total_users": total_users,
    }

    try:
        # VULNERABILITY: eval injection (CWE-95)
        result = eval(formula, {"__builtins__": {}}, context)
    except Exception as e:
        return jsonify({"error": f"Calculation error: {e}"}), 400

    return jsonify({"result": result, "formula": formula, "context": context}), 200

# ═══════════════════════════════════════════════════════════════════════════════
# Report Routes
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/reports", methods=["GET"])
@require_auth
def list_reports():
    db = get_db()
    rows = db.execute(
        """SELECT r.*, u.full_name AS generated_by_name
           FROM reports r
           LEFT JOIN users u ON r.generated_by = u.id
           ORDER BY r.created_at DESC"""
    ).fetchall()
    db.close()
    return jsonify({"reports": _rows_to_list(rows)}), 200


@app.route("/api/reports/generate", methods=["POST"])
@require_auth
def generate_report():
    data = request.get_json(silent=True) or {}
    report_type = data.get("type", "general")
    report_name = data.get("name", f"{report_type} Report")
    report_format = data.get("format", "pdf")
    start_date = data.get("start_date", (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d"))
    end_date = data.get("end_date", datetime.utcnow().strftime("%Y-%m-%d"))

    filename = f"report_{report_type}_{int(time.time())}.{report_format}"
    file_path = os.path.join(UPLOAD_FOLDER, filename)

    # VULNERABILITY: Command injection via os.system() (CWE-78)
    cmd = f"echo 'Report: {report_type} from {start_date} to {end_date}' > {file_path}"
    os.system(cmd)

    db = get_db()
    db.execute(
        """INSERT INTO reports (name, type, format, generated_by, start_date, end_date, file_path, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'completed')""",
        (report_name, report_type, report_format, g.current_user["sub"], start_date, end_date, file_path),
    )
    db.commit()

    report = db.execute("SELECT * FROM reports ORDER BY id DESC LIMIT 1").fetchone()

    # Log activity
    db.execute(
        """INSERT INTO activity_log (user_id, action, target, details, ip_address)
           VALUES (?, 'generate_report', 'reports', ?, ?)""",
        (g.current_user["sub"], f"Generated {report_name}", request.remote_addr),
    )
    db.commit()
    db.close()

    return jsonify({"report": dict(report)}), 201


@app.route("/api/reports/<int:report_id>/download", methods=["GET"])
@require_auth
def download_report(report_id):
    db = get_db()
    report = db.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()
    db.close()
    if report is None:
        return jsonify({"error": "Report not found"}), 404
    if not report["file_path"] or not os.path.exists(report["file_path"]):
        return jsonify({"error": "Report file not available"}), 404
    return send_file(report["file_path"], as_attachment=True, download_name=f"{report['name']}.{report['format']}")

# ═══════════════════════════════════════════════════════════════════════════════
# File Routes
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/files", methods=["GET"])
@require_auth
def list_files():
    db = get_db()
    rows = db.execute(
        """SELECT f.*, u.full_name AS uploaded_by_name
           FROM files f
           LEFT JOIN users u ON f.uploaded_by = u.id
           ORDER BY f.created_at DESC"""
    ).fetchall()
    db.close()
    return jsonify({"files": _rows_to_list(rows)}), 200


@app.route("/api/files/upload", methods=["POST"])
@require_auth
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    f = request.files["file"]
    if f.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    # VULNERABILITY: No file type validation, no filename sanitization (CWE-434)
    filename = f.filename
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    f.save(filepath)

    file_size = os.path.getsize(filepath)
    mime_type = f.content_type or "application/octet-stream"

    db = get_db()
    db.execute(
        """INSERT INTO files (filename, original_name, file_size, mime_type, uploaded_by)
           VALUES (?, ?, ?, ?, ?)""",
        (filename, filename, file_size, mime_type, g.current_user["sub"]),
    )
    db.commit()

    file_record = db.execute("SELECT * FROM files ORDER BY id DESC LIMIT 1").fetchone()

    # Log activity
    db.execute(
        """INSERT INTO activity_log (user_id, action, target, details, ip_address)
           VALUES (?, 'upload_file', 'files', ?, ?)""",
        (g.current_user["sub"], f"Uploaded {filename}", request.remote_addr),
    )
    db.commit()
    db.close()

    return jsonify({"file": dict(file_record)}), 201


@app.route("/api/files/<int:file_id>/download", methods=["GET"])
@require_auth
def download_file(file_id):
    db = get_db()
    file_record = db.execute("SELECT * FROM files WHERE id = ?", (file_id,)).fetchone()
    db.close()
    if file_record is None:
        return jsonify({"error": "File not found"}), 404

    # VULNERABILITY: Path traversal — no sanitization of filename (CWE-22)
    filepath = os.path.join(UPLOAD_FOLDER, file_record["filename"])
    if not os.path.exists(filepath):
        return jsonify({"error": "File not found on disk"}), 404
    return send_file(filepath, as_attachment=True, download_name=file_record["original_name"])


@app.route("/api/files/<int:file_id>", methods=["DELETE"])
@require_role("admin", "manager")
def delete_file(file_id):
    db = get_db()
    file_record = db.execute("SELECT * FROM files WHERE id = ?", (file_id,)).fetchone()
    if file_record is None:
        db.close()
        return jsonify({"error": "File not found"}), 404

    filepath = os.path.join(UPLOAD_FOLDER, file_record["filename"])
    if os.path.exists(filepath):
        os.remove(filepath)

    db.execute("DELETE FROM files WHERE id = ?", (file_id,))
    db.commit()
    db.close()
    return jsonify({"message": "File deleted"}), 200

# ═══════════════════════════════════════════════════════════════════════════════
# Settings Routes
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/settings", methods=["GET"])
@require_auth
def get_settings():
    db = get_db()
    rows = db.execute("SELECT key, value FROM settings").fetchall()
    db.close()
    settings = {r["key"]: r["value"] for r in rows}
    return jsonify({"settings": settings}), 200


@app.route("/api/settings", methods=["PUT"])
@require_role("admin")
def update_settings():
    data = request.get_json(silent=True) or {}
    if not data:
        return jsonify({"error": "No settings provided"}), 400

    db = get_db()
    now = datetime.utcnow().isoformat()

    for key, value in data.items():
        db.execute(
            """INSERT INTO settings (key, value, updated_by, updated_at)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(key) DO UPDATE SET value = excluded.value,
               updated_by = excluded.updated_by, updated_at = excluded.updated_at""",
            (key, str(value), g.current_user["sub"], now),
        )

    # VULNERABILITY: Insecure deserialization — pickle (CWE-502)
    serialized = pickle.dumps(data)
    # Store serialized blob for "caching" (intentionally insecure pattern)
    db.execute(
        """INSERT INTO settings (key, value, updated_by, updated_at)
           VALUES ('_cache_blob', ?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value,
           updated_by = excluded.updated_by, updated_at = excluded.updated_at""",
        (serialized.hex(), g.current_user["sub"], now),
    )

    db.commit()

    # Log activity
    db.execute(
        """INSERT INTO activity_log (user_id, action, target, details, ip_address)
           VALUES (?, 'update_settings', 'settings', ?, ?)""",
        (g.current_user["sub"], f"Updated keys: {', '.join(data.keys())}", request.remote_addr),
    )
    db.commit()
    db.close()

    return jsonify({"message": "Settings updated", "updated": list(data.keys())}), 200

# ═══════════════════════════════════════════════════════════════════════════════
# Activity Log Route
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/activity", methods=["GET"])
@require_auth
def get_activity():
    db = get_db()
    rows = db.execute(
        """SELECT a.*, u.full_name
           FROM activity_log a
           LEFT JOIN users u ON a.user_id = u.id
           ORDER BY a.created_at DESC
           LIMIT 50"""
    ).fetchall()
    db.close()
    return jsonify({"activity": _rows_to_list(rows)}), 200

# ═══════════════════════════════════════════════════════════════════════════════
# Entry Point
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # VULNERABILITY: Debug mode enabled in production (CWE-489)
    app.run(host="0.0.0.0", port=5000, debug=True)
