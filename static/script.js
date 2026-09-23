// ==============================
// CREATE THE MAP
// ==============================

var map = L.map('map').setView([36.8065, 10.1815], 7);


// ==============================
// OPENSTREETMAP
// ==============================

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);


// ==============================
// MARKERS
// ==============================

var reportMarkers = [];


// ==============================
// CREATE VOTER ID
// ==============================

function getVoterId() {

    var voterId = localStorage.getItem("voter_id");

    if (!voterId) {

        voterId = crypto.randomUUID();

        localStorage.setItem("voter_id", voterId);
    }

    return voterId;
}

var voterId = getVoterId();


// ==============================
// LOAD REPORTS WHEN PAGE OPENS
// ==============================

loadReports();


// ==============================
// CLICK ON MAP
// ==============================

map.on('click', function(event) {

    // Hide header
    var header = document.getElementById("header");

    header.classList.add("hidden");


    // Make map fullscreen
    var mapElement = document.getElementById("map");

    mapElement.classList.add("fullscreen");


    // Update Leaflet map size
    setTimeout(function() {

        map.invalidateSize();

    }, 400);


    // Get clicked coordinates
    var latitude = event.latlng.lat;
    var longitude = event.latlng.lng;


    // Create report popup
    var reportForm = `
        <div style="text-align: center;">

            <b>🚨 Report this location</b>

            <br><br>

            <button
                onclick="createReport(${latitude}, ${longitude})"
            >
                Create Report
            </button>

        </div>
    `;


    // Open popup
    L.popup()
        .setLatLng(event.latlng)
        .setContent(reportForm)
        .openOn(map);

});


// ==============================
// CREATE REPORT
// ==============================

function createReport(latitude, longitude) {

    fetch('/reports', {

        method: 'POST',

        headers: {
            'Content-Type': 'application/json'
        },

        body: JSON.stringify({

            latitude: latitude,
            longitude: longitude

        })

    })

    .then(response => {

        if (!response.ok) {

            throw new Error(
                "Server error: " + response.status
            );

        }

        return response.json();

    })

    .then(data => {

        // Close the "Create Report" popup
        map.closePopup();


        // Load the reports again
        loadReports();


        // Wait for the new marker to be created
        setTimeout(function() {

            // Find the marker we just created
            var newMarker = reportMarkers.find(function(marker) {

                var position = marker.getLatLng();

                return (
                    Math.abs(position.lat - latitude) < 0.000001 &&
                    Math.abs(position.lng - longitude) < 0.000001
                );

            });


            // Automatically open the voting popup
            if (newMarker) {

                newMarker.openPopup();

            }

        }, 300);

    })

    .catch(error => {

        console.error(
            "Create report error:",
            error
        );

        alert(
            "Could not create the report."
        );

    });

}


// ==============================
// LOAD REPORTS
// ==============================

function loadReports() {

    // Remove old markers
    reportMarkers.forEach(function(marker) {

        map.removeLayer(marker);

    });

    reportMarkers = [];


    // Get reports from server
    fetch('/reports')

        .then(response => {

            if (!response.ok) {

                throw new Error(
                    "Server error: " + response.status
                );

            }

            return response.json();

        })

        .then(reports => {

            reports.forEach(function(report) {

                showReport(report);

            });

        })

        .catch(error => {

            console.error(
                "Could not load reports:",
                error
            );

        });

}


// ==============================
// CREATE COLORED MARKER
// ==============================

function createMarkerIcon(color) {

    return L.divIcon({

        className: "",

        html: `
            <div style="
                background-color: ${color};
                width: 25px;
                height: 25px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 0 5px rgba(0,0,0,0.5);
            "></div>
        `,

        iconSize: [31, 31],

        iconAnchor: [15, 15]

    });

}


// ==============================
// SHOW REPORT
// ==============================

function showReport(report) {

    var flooded = Number(report.flooded_votes) || 0;

    var safe = Number(report.safe_votes) || 0;

    var total = flooded + safe;

    var status;


    // ==============================
    // DETERMINE STATUS
    // ==============================

    if (total < 3) {

        status = "❓ Not enough votes yet";

    }

    else if (flooded > safe) {

        status = "⚠️ Community reports FLOODED";

    }

    else if (safe > flooded) {

        status = "🟢 Community reports SAFE";

    }

    else {

        status = "⚖️ Votes are equal";

    }


    // ==============================
    // CHOOSE MARKER COLOR
    // ==============================

    var markerColor = "gray";

    if (total >= 3) {

        if (flooded > safe) {

            markerColor = "red";

        }

        else if (safe > flooded) {

            markerColor = "green";

        }

    }


    // ==============================
    // CREATE POPUP
    // ==============================

    var popup = `
        <div style="text-align: center; min-width: 200px;">

            <b>${status}</b>

            <br><br>

            🔴 Flooded: ${flooded}

            <br>

            🟢 Safe: ${safe}

            <br>

            👥 Total votes: ${total}

            <hr>

            <b>What do you see here?</b>

            <br><br>

            <button
                onclick="vote(${report.id}, 'flooded')"
                style="
                    background-color: red;
                    color: white;
                    width: 100%;
                    padding: 12px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                "
            >
                🔴 I see flooding
            </button>

            <br><br>

            <button
                onclick="vote(${report.id}, 'safe')"
                style="
                    background-color: green;
                    color: white;
                    width: 100%;
                    padding: 12px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                "
            >
                🟢 I see it is safe
            </button>

        </div>
    `;


    // ==============================
    // CREATE MARKER
    // ==============================

    var marker = L.marker(

        [
            report.latitude,
            report.longitude
        ],

        {
            icon: createMarkerIcon(markerColor)
        }

    ).addTo(map);


    // ==============================
    // CONNECT POPUP TO MARKER
    // ==============================

    marker.bindPopup(popup);


    // ==============================
    // SAVE MARKER
    // ==============================

    reportMarkers.push(marker);

}


// ==============================
// VOTE
// ==============================

function vote(reportId, voteType) {

    fetch(`/reports/${reportId}/vote`, {

        method: 'POST',

        headers: {
            'Content-Type': 'application/json'
        },

        body: JSON.stringify({

            voter_id: voterId,

            vote: voteType

        })

    })

    .then(response => {

        if (!response.ok) {

            throw new Error(
                "Server error: " + response.status
            );

        }

        return response.json();

    })

    .then(data => {

        // Show server message
        alert(data.message);


        // Reload reports
        // This updates the marker color
        // and vote counts

        loadReports();

    })

    .catch(error => {

        console.error(
            "Voting error:",
            error
        );

        alert(
            "Could not submit your vote."
        );

    });

}
