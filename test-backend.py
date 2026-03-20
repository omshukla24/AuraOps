"""
test-backend.py — Intentionally vulnerable backend for AuraOps demo.
This file contains common security vulnerabilities for the AuraOps Agent to detect and remediate.
"""

import sqlite3
import os
import subprocess
import hashlib


# ============================================================
# VULNERABILITY 1: SQL Injection
# ============================================================
def get_user(username):
    """Fetch a user from the database — VULNERABLE to SQL injection."""
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    query = "SELECT * FROM users WHERE username = '" + username + "'"
    cursor.execute(query)
    return cursor.fetchone()


def authenticate(username, password):
    """Authenticate a user — VULNERABLE to SQL injection."""
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
    cursor.execute(query)
    return cursor.fetchone() is not None


# ============================================================
# VULNERABILITY 2: Command Injection
# ============================================================
def ping_host(hostname):
    """Ping a host — VULNERABLE to OS command injection."""
    result = os.system("ping -c 4 " + hostname)
    return result


def get_file_contents(filename):
    """Read a file — VULNERABLE to command injection via subprocess."""
    output = subprocess.check_output("cat " + filename, shell=True)
    return output.decode()


# ============================================================
# VULNERABILITY 3: Weak Cryptography
# ============================================================
def hash_password(password):
    """Hash a password — VULNERABLE: uses MD5 with no salt."""
    return hashlib.md5(password.encode()).hexdigest()


# ============================================================
# VULNERABILITY 4: Hardcoded Secrets
# ============================================================
API_KEY = "sk-proj-abc123def456ghi789jkl012mno345pqr678"
DATABASE_URL = "postgresql://admin:SuperSecret123!@prod-db.example.com:5432/auraops"


# ============================================================
# VULNERABILITY 5: Path Traversal
# ============================================================
def read_user_file(user_input_path):
    """Read a user-specified file — VULNERABLE to path traversal."""
    with open("/var/data/" + user_input_path, "r") as f:
        return f.read()
