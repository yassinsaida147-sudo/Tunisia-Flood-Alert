from flask import Flask, render_template, request, jsonify
import os
import psycopg2
from psycopg2.extras import RealDictCursor

app = Flask(__name__)


# ==============================
# DATABASE CONNECTION
# ==============================

def get_db():

    database_url = os.environ.get("DATABASE_URL")

    if not database_url:
        raise Exception("DATABASE_URL is not set")

    return psycopg2.connect(
        database_url,
        cursor_factory=RealDictCursor
    )


# ==============================
# INITIALIZE DATABASE
# ==============================

def init_db():

    connection = get_db()
    cursor = connection.cursor()

    # Reports table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id SERIAL PRIMARY KEY,
            latitude DOUBLE PRECISION NOT NULL,
            longitude DOUBLE PRECISION NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Add created_at if the table already existed
    cursor.execute("""
        ALTER TABLE reports
        ADD COLUMN IF NOT EXISTS created_at
        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    """)

    # Votes table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS votes (
            id SERIAL PRIMARY KEY,
            report_id INTEGER NOT NULL,
            voter_id TEXT NOT NULL,
            vote TEXT NOT NULL,
            UNIQUE(report_id, voter_id)
        )
    """)

    # Delete votes belonging to reports older than 24 hours
    cursor.execute("""
        DELETE FROM votes
        WHERE report_id IN (
            SELECT id
            FROM reports
            WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '24 hours'
        )
    """)

    # Delete reports older than 24 hours
    cursor.execute("""
        DELETE FROM reports
        WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '24 hours'
    """)

    connection.commit()

    cursor.close()
    connection.close()


# ==============================
# YOUR ROUTES
# ==============================

@app.route("/")
def home():
    return render_template("index.html")


@app.route("/reports")
def get_reports():
    # your existing code
    pass


@app.route("/reports", methods=["POST"])
def create_report():
    # your existing code
    pass


@app.route("/reports/<int:report_id>/vote", methods=["POST"])
def vote(report_id):
    # your existing code
    pass


# ==============================
# RUN DATABASE INITIALIZATION
# ==============================

if os.environ.get("DATABASE_URL"):
    init_db()


# ==============================
# START FLASK
# ==============================

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )
