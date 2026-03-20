"""
demo_vulnerable_app.py — Intentionally Vulnerable Demo Application
===================================================================
This file contains REAL security vulnerabilities for AuraOps to detect,
auto-patch, and display on the dashboard. DO NOT use in production.

AuraOps will find and fix:
  1. SQL Injection (Critical)
  2. Hardcoded API Secret (Critical)
  3. Command Injection (Critical)
  4. Cross-Site Scripting / XSS (High)
  5. Path Traversal (High)
  6. Hardcoded Database Password (Critical)
  7. Insecure Deserialization (High)
"""

import os
import pickle
import sqlite3
import subprocess
from flask import Flask, request, render_template_string, send_file

app = Flask(__name__)

# ──────────────────────────────────────────────
# VULN 1: Hardcoded API Secret (Critical)
# ──────────────────────────────────────────────
STRIPE_API_KEY = "sk_live_4eC39HqLyjWDarjtT1zdp7dc"
AWS_SECRET_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
DATABASE_PASSWORD = "SuperSecret123!"

# ──────────────────────────────────────────────
# VULN 2: SQL Injection (Critical)
# ──────────────────────────────────────────────
@app.route("/users")
def get_user():
    user_id = request.args.get("id")
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    # VULNERABLE: Direct string interpolation in SQL
    query = f"SELECT * FROM users WHERE id = {user_id}"
    cursor.execute(query)
    results = cursor.fetchall()
    conn.close()
    return {"users": results}


@app.route("/search")
def search():
    term = request.args.get("q", "")
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    # VULNERABLE: f-string SQL query
    cursor.execute(f"SELECT * FROM products WHERE name LIKE '%{term}%'")
    results = cursor.fetchall()
    conn.close()
    return {"results": results}


# ──────────────────────────────────────────────
# VULN 3: Command Injection (Critical)
# ──────────────────────────────────────────────
@app.route("/ping")
def ping_host():
    host = request.args.get("host", "localhost")
    # VULNERABLE: User input passed directly to shell command
    result = subprocess.run(f"ping -c 4 {host}", shell=True, capture_output=True, text=True)
    return {"output": result.stdout}


@app.route("/deploy")
def deploy():
    branch = request.args.get("branch", "main")
    # VULNERABLE: Command injection via branch name
    output = os.popen(f"git checkout {branch} && ./deploy.sh").read()
    return {"deploy_output": output}


# ──────────────────────────────────────────────
# VULN 4: Cross-Site Scripting / XSS (High)
# ──────────────────────────────────────────────
@app.route("/profile")
def profile():
    username = request.args.get("name", "Guest")
    # VULNERABLE: Unescaped user input in HTML template
    html = f"<h1>Welcome, {username}!</h1><p>Your profile page</p>"
    return render_template_string(html)


@app.route("/error")
def error_page():
    msg = request.args.get("msg", "Unknown error")
    # VULNERABLE: Reflected XSS
    return f"<html><body><h2>Error: {msg}</h2></body></html>"


# ──────────────────────────────────────────────
# VULN 5: Path Traversal (High)
# ──────────────────────────────────────────────
@app.route("/download")
def download_file():
    filename = request.args.get("file")
    # VULNERABLE: No path sanitization — attacker can use ../../etc/passwd
    filepath = os.path.join("/app/uploads", filename)
    return send_file(filepath)


# ──────────────────────────────────────────────
# VULN 6: Insecure Deserialization (High)
# ──────────────────────────────────────────────
@app.route("/load-session", methods=["POST"])
def load_session():
    data = request.get_data()
    # VULNERABLE: Deserializing untrusted user data
    session = pickle.loads(data)
    return {"session": str(session)}


# ──────────────────────────────────────────────
# VULN 7: Exposed Debug / Admin Endpoint
# ──────────────────────────────────────────────
@app.route("/admin/debug")
def admin_debug():
    # VULNERABLE: Exposes environment variables including secrets
    return {
        "env": dict(os.environ),
        "db_password": DATABASE_PASSWORD,
        "stripe_key": STRIPE_API_KEY,
    }


if __name__ == "__main__":
    # VULNERABLE: Debug mode enabled in production
    app.run(host="0.0.0.0", port=8080, debug=True)
