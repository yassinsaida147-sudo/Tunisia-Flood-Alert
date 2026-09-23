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

    # Add created_at to an existing reports table
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

    connection.commit()

    cursor.close()
    connection.close()


# ==============================
# HOME PAGE
# ==============================

@app.route("/")
def home():

    return render_template("index.html")


# ==============================
# GET ALL REPORTS
# ==============================

@app.route("/reports")
def get_reports():

    connection = get_db()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            reports.id,
            reports.latitude,
            reports.longitude,

            SUM(
                CASE
                    WHEN votes.vote = 'flooded'
                    THEN 1
                    ELSE 0
                END
            ) AS flooded_votes,

            SUM(
                CASE
                    WHEN votes.vote = 'safe'
                    THEN 1
                    ELSE 0
                END
            ) AS safe_votes

        FROM reports

        LEFT JOIN votes
        ON reports.id = votes.report_id

        GROUP BY
            reports.id,
            reports.latitude,
            reports.longitude

        ORDER BY reports.created_at DESC
    """)

    reports = cursor.fetchall()

    cursor.close()
    connection.close()

    return jsonify(reports)


# ==============================
# CREATE REPORT
# ==============================

@app.route("/reports", methods=["POST"])
def create_report():

    data = request.json

    latitude = data["latitude"]
    longitude = data["longitude"]

    connection = get_db()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO reports (
            latitude,
            longitude,
            created_at
        )

        VALUES (
            %s,
            %s,
            CURRENT_TIMESTAMP
        )

        RETURNING id
    """, (latitude, longitude))

    report_id = cursor.fetchone()["id"]

    connection.commit()

    cursor.close()
    connection.close()

    return jsonify({
        "id": report_id
    })


# ==============================
# VOTE / CHANGE VOTE
# ==============================

@app.route("/reports/<int:report_id>/vote", methods=["POST"])
def vote(report_id):

    data = request.json

    voter_id = data["voter_id"]
    new_vote = data["vote"]

    # Only allow these two vote types
    if new_vote not in ["flooded", "safe"]:

        return jsonify({
            "message": "Invalid vote."
        }), 400

    connection = get_db()
    cursor = connection.cursor()

    # Check if this browser/device already voted
    cursor.execute("""
        SELECT id

        FROM votes

        WHERE report_id = %s
        AND voter_id = %s
    """, (report_id, voter_id))

    existing_vote = cursor.fetchone()


    # Change existing vote
    if existing_vote:

        cursor.execute("""
            UPDATE votes

            SET vote = %s

            WHERE id = %s
        """, (
            new_vote,
            existing_vote["id"]
        ))

        message = "Your vote has been changed!"


    # Create new vote
    else:

        cursor.execute("""
            INSERT INTO votes (
                report_id,
                voter_id,
                vote
            )

            VALUES (
                %s,
                %s,
                %s
            )
        """, (
            report_id,
            voter_id,
            new_vote
        ))

        message = "Your vote has been recorded!"


    connection.commit()

    cursor.close()
    connection.close()

    return jsonify({
        "message": message
    })


# ==============================
# INITIALIZE DATABASE
# ==============================

if os.environ.get("DATABASE_URL"):

    init_db()


# ==============================
# START SERVER
# ==============================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )
