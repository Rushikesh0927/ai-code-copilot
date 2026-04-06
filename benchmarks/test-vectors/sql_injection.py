# TEST VECTOR: SQL Injection Vulnerabilities
# Ground Truth: 3 CRITICAL bugs, 1 HIGH bug, 1 MEDIUM bug

import sqlite3
from flask import Flask, request, jsonify

app = Flask(__name__)
db = sqlite3.connect('users.db')

# BUG-1: SQL Injection via string formatting (CRITICAL)
@app.route('/user')
def get_user():
    username = request.args.get('username')
    cursor = db.execute("SELECT * FROM users WHERE username = '" + username + "'")
    return jsonify(cursor.fetchall())

# BUG-2: SQL Injection via f-string (CRITICAL) 
@app.route('/search')
def search():
    query = request.args.get('q')
    cursor = db.execute(f"SELECT * FROM products WHERE name LIKE '%{query}%'")
    return jsonify(cursor.fetchall())

# BUG-3: Hardcoded credentials (HIGH)
DATABASE_PASSWORD = "admin123"
API_SECRET_KEY = "sk-live-abc123xyz789"

# BUG-4: Missing input validation (MEDIUM)
@app.route('/transfer', methods=['POST'])
def transfer():
    amount = request.json.get('amount')
    # No validation: amount could be negative, zero, or non-numeric
    db.execute(f"UPDATE accounts SET balance = balance - {amount} WHERE id = 1")
    db.execute(f"UPDATE accounts SET balance = balance + {amount} WHERE id = 2")
    db.commit()
    return jsonify({"status": "done"})

# BUG-5: Debug mode in production (CRITICAL)
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
