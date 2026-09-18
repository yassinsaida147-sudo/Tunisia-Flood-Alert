from flask import Flask, render_template, request, jsonify
import sqlite3

app = Flask(__name__)


def get_db():
    connection = sqlite3.connect("flood_alert.db")
    connection.row_factory = sqlite3.Row
    return connection


def init_db():

    connection = get_db()

    connection.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL
        )
    """)

    connection.execute("""
        CREATE TABLE IF NOT EXISTS votes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id INTEGER NOT NULL,
            voter_id TEXT NOT NULL,
            vote TEXT NOT NULL,
            UNIQUE(report_id, voter_id)
        )
    """)

    connection.commit()
    connection.close()


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/reports")
def get_reports():

    connection = get_db()

    reports = connection.execute("""
        SELECT
            reports.id,
            reports.latitude,
            reports.longitude,

            SUM(CASE WHEN votes.vote = 'flooded'
                THEN 1 ELSE 0 END) AS flooded_votes,

            SUM(CASE WHEN votes.vote = 'safe'
                THEN 1 ELSE 0 END) AS safe_votes

        FROM reports

        LEFT JOIN votes
        ON reports.id = votes.report_id

        GROUP BY reports.id
    """).fetchall()

    connection.close()

    return jsonify([dict(report) for report in reports])


@app.route("/reports", methods=["POST"])
def create_report():

    data = request.json

    latitude = data["latitude"]
    longitude = data["longitude"]

    connection = get_db()

    cursor = connection.execute("""
        INSERT INTO reports (latitude, longitude)
        VALUES (?, ?)
    """, (latitude, longitude))

    report_id = cursor.lastrowid

    connection.commit()
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

    existing_vote = connection.execute("""
        SELECT id
        FROM votes
        WHERE report_id = ? AND voter_id = ?
    """, (report_id, voter_id)).fetchone()


    if existing_vote:

        connection.execute("""
            UPDATE votes
            SET vote = ?
            WHERE id = ?
        """, (new_vote, existing_vote["id"]))

        message = "Your vote has been changed!"

    else:

        connection.execute("""
            INSERT INTO votes (report_id, voter_id, vote)
            VALUES (?, ?, ?)
        """, (report_id, voter_id, new_vote))

        message = "Your vote has been recorded!"


    connection.commit()
    connection.close()

    return jsonify({
        "message": message
    })


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)