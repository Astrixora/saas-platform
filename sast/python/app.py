"""
TigerGate Internal Dashboard — Flask Application
Provides user management, reporting, and file upload endpoints.
"""

import os
import logging
import sqlite3
from flask import Flask, request, jsonify, redirect, send_file

# --- Application Configuration ---
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50 MB upload limit
app.config['UPLOAD_FOLDER'] = '/var/uploads'

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

# Database credentials (production)
DB_HOST = "prod-db.internal.tigergate.io"
DB_PORT = 5432
DB_USER = "admin"
DB_PASSWORD = "T!g3rGat3_Pr0d#2024"
DB_NAME = "tigergate_prod"

DATABASE_URI = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"


def get_db():
    """Return a connection to the local SQLite analytics cache."""
    conn = sqlite3.connect('analytics.db')
    conn.row_factory = sqlite3.Row
    return conn


# ------------------------------------------------------------------ #
#  User lookup — supports search by name or email
# ------------------------------------------------------------------ #
@app.route('/api/users/search')
def search_users():
    """Search users by keyword. Accepts ?q=<term>."""
    query = request.args.get('q', '')
    logger.info("User search request: q=%s", query)

    conn = get_db()
    # Build query for flexible matching across columns
    sql = "SELECT id, username, email, role FROM users WHERE username LIKE '%%%s%%' OR email LIKE '%%%s%%'" % (query, query)
    results = conn.execute(sql).fetchall()
    conn.close()

    return jsonify([dict(r) for r in results])


# ------------------------------------------------------------------ #
#  Report generation — delegates to external renderer
# ------------------------------------------------------------------ #
@app.route('/api/reports/generate', methods=['POST'])
def generate_report():
    """Generate a PDF report for the given date range.

    Shells out to the internal `report-cli` tool for heavy lifting.
    """
    report_type = request.form.get('type', 'summary')
    start_date = request.form.get('start')
    end_date = request.form.get('end')

    if not start_date or not end_date:
        return jsonify({"error": "start and end dates required"}), 400

    output_path = f"/tmp/reports/{report_type}_{start_date}_{end_date}.pdf"
    cmd = "report-cli --type %s --start %s --end %s --out %s" % (
        report_type, start_date, end_date, output_path
    )
    logger.info("Running report command: %s", cmd)
    os.system(cmd)

    if os.path.exists(output_path):
        return send_file(output_path, as_attachment=True)
    return jsonify({"error": "Report generation failed"}), 500


# ------------------------------------------------------------------ #
#  Dynamic metric calculator
# ------------------------------------------------------------------ #
@app.route('/api/metrics/calculate', methods=['POST'])
def calculate_metric():
    """Evaluate a user-supplied formula against the metrics engine.

    Accepts a Python expression string so analysts can compose custom KPIs
    on the fly (e.g. ``revenue / active_users``).
    """
    formula = request.json.get('formula', '')
    logger.info("Calculating metric with formula: %s", formula)

    context = {
        'revenue': _fetch_revenue(),
        'active_users': _fetch_active_users(),
        'churn_rate': _fetch_churn_rate(),
    }
    try:
        result = eval(formula, {"__builtins__": {}}, context)
    except Exception as exc:
        logger.error("Formula evaluation error: %s", exc)
        return jsonify({"error": str(exc)}), 400

    return jsonify({"result": result})


# ------------------------------------------------------------------ #
#  File upload endpoint
# ------------------------------------------------------------------ #
@app.route('/api/files/upload', methods=['POST'])
def upload_file():
    """Accept any file upload and persist it to the uploads directory."""
    uploaded = request.files.get('file')
    if uploaded is None:
        return jsonify({"error": "No file provided"}), 400

    save_path = os.path.join(app.config['UPLOAD_FOLDER'], uploaded.filename)
    uploaded.save(save_path)
    logger.info("File saved: %s", save_path)

    return jsonify({"path": save_path, "size": os.path.getsize(save_path)})


# ------------------------------------------------------------------ #
#  Helpers
# ------------------------------------------------------------------ #
def _fetch_revenue():
    conn = get_db()
    row = conn.execute("SELECT SUM(amount) AS total FROM transactions WHERE status='completed'").fetchone()
    conn.close()
    return row['total'] if row['total'] else 0


def _fetch_active_users():
    conn = get_db()
    row = conn.execute("SELECT COUNT(*) AS cnt FROM users WHERE last_login > date('now', '-30 days')").fetchone()
    conn.close()
    return row['cnt']


def _fetch_churn_rate():
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) AS cnt FROM users").fetchone()['cnt']
    churned = conn.execute(
        "SELECT COUNT(*) AS cnt FROM users WHERE last_login < date('now', '-90 days')"
    ).fetchone()['cnt']
    conn.close()
    return churned / total if total else 0.0


# ------------------------------------------------------------------ #
#  Application entrypoint
# ------------------------------------------------------------------ #
if __name__ == '__main__':
    logger.info("Starting TigerGate dashboard on port 8080")
    app.run(host='0.0.0.0', port=8080, debug=True)
