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
// LOAD REPORTS
// ==============================

loadReports();


// ==============================
// WHEN USER CLICKS THE MAP
// ==============================

map.on('click', function(event) {

    // Hide header
    var header = document.getElementById("header");

    header.classList.add("hidden");


    // Make map full screen
    var mapElement = document.getElementById("map");

    mapElement.classList.add("fullscreen");


    // Tell Leaflet the map size changed
    setTimeout(function() {
        map.invalidateSize();
    }, 400);


    // Get coordinates
    var latitude = event.latlng.lat;
    var longitude = event.latlng.lng;


    // Report popup
    var reportForm = `
        <div>

            <b>🚨 Report this location</b>

            <br><br>

            <button onclick="createReport(${latitude}, ${longitude})">
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
            throw new Error("Server error: " + response.status);
        }

        return response.json();

    })

    .then(data => {

        alert("Report created!");

        map.closePopup();

        loadReports();

    })

    .catch(error => {

        console.error("Create report error:", error);

        alert("Could not create the report.");

    });

}


// ==============================
// LOAD REPORTS
// ==============================

function loadReports() {

    reportMarkers.forEach(function(marker) {

        map.removeLayer(marker);

    });

    reportMarkers = [];


    fetch('/reports')

        .then(response => response.json())

        .then(reports => {

            reports.forEach(function(report) {

                showReport(report);

            });

        })

        .catch(error => {

            console.error("Could not load reports:", error);

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

    var flooded = report.flooded_votes || 0;

    var safe = report.safe_votes || 0;

    var total = flooded + safe;

    var status;


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


    var popup = `
        <div>

            <b>${status}</b>

            <br><br>

            🔴 Flooded: ${flooded}

            <br>

            🟢 Safe: ${safe}

            <br>

            👥 Total votes: ${total}

            <br><br>

            <button onclick="vote(${report.id}, 'flooded')">
                🔴 I see flooding
            </button>

            <br><br>

            <button onclick="vote(${report.id}, 'safe')">
                🟢 I see it is safe
            </button>

        </div>
    `;


    var marker = L.marker([
        report.latitude,
        report.longitude
    ]).addTo(map);


    marker.bindPopup(popup);

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

    .then(response => response.json())

    .then(data => {

        alert(data.message);

        loadReports();

    })

    .catch(error => {

        console.error("Voting error:", error);

        alert("Could not submit your vote.");

    });

}
