from flask import Flask, render_template, request, jsonify
import os
import psycopg2
from psycopg2.extras import RealDictCursor

app = Flask(__name__)


def get_db():

    database_url = os.environ.get("DATABASE_URL")

    if not database_url:
        raise Exception("DATABASE_URL is not set")

    return psycopg2.connect(
        database_url,
        cursor_factory=RealDictCursor
    )


def init_db():

    connection = get_db()
    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id SERIAL PRIMARY KEY,
            latitude DOUBLE PRECISION NOT NULL,
            longitude DOUBLE PRECISION NOT NULL
        )
    """)

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


@app.route("/")
def home():

    return render_template("index.html")


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

        GROUP BY reports.id
    """)

    reports = cursor.fetchall()

    cursor.close()
    connection.close()

    return jsonify(reports)


@app.route("/reports", methods=["POST"])
def create_report():

    data = request.json

    latitude = data["latitude"]
    longitude = data["longitude"]

    connection = get_db()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO reports (latitude, longitude)
        VALUES (%s, %s)
        RETURNING id
    """, (latitude, longitude))

    report_id = cursor.fetchone()["id"]

    connection.commit()

    cursor.close()
    connection.close()

    return jsonify({
        "id": report_id
    })


@app.route("/reports/<int:report_id>/vote", methods=["POST"])
def vote(report_id):

    data = request.json

    voter_id = data["voter_id"]
    new_vote = data["vote"]

    connection = get_db()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT id
        FROM votes
        WHERE report_id = %s
        AND voter_id = %s
    """, (report_id, voter_id))

    existing_vote = cursor.fetchone()

    if existing_vote:

        cursor.execute("""
            UPDATE votes
            SET vote = %s
            WHERE id = %s
        """, (new_vote, existing_vote["id"]))

        message = "Your vote has been changed!"

    else:

        cursor.execute("""
            INSERT INTO votes (
                report_id,
                voter_id,
                vote
            )
            VALUES (%s, %s, %s)
        """, (report_id, voter_id, new_vote))

        message = "Your vote has been recorded!"

    connection.commit()

    cursor.close()
    connection.close()

    return jsonify({
        "message": message
    })


# Create database tables when DATABASE_URL exists
if os.environ.get("DATABASE_URL"):
    init_db()


if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )
