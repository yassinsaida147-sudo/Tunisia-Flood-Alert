// Create the map
var map = L.map('map').setView([36.8065, 10.1815], 7);


// Add OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);


// This will keep track of our markers
var reportMarkers = [];


// Create an ID for this browser/device
function getVoterId() {

    var voterId = localStorage.getItem("voter_id");

    if (!voterId) {
        voterId = crypto.randomUUID();
        localStorage.setItem("voter_id", voterId);
    }

    return voterId;
}


var voterId = getVoterId();


// Load reports when the website opens
loadReports();


// When the user clicks the map
map.on('click', function(event) {

    var latitude = event.latlng.lat;
    var longitude = event.latlng.lng;

    var reportForm = `
        <div>

            <b>🚨 Report this location</b>

            <br><br>

            <button onclick="createReport(${latitude}, ${longitude})">
                Create Report
            </button>

        </div>
    `;

    L.popup()
        .setLatLng(event.latlng)
        .setContent(reportForm)
        .openOn(map);
});


// Create a report
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
    .then(response => response.json())

    .then(data => {

        alert("Report created!");

        map.closePopup();

        loadReports();

    });
}


// Load reports from Flask
function loadReports() {

    // Remove old markers
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

        });
}


// Display a report
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


// Vote or change vote
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




        
var header = document.getElementById("header");

map.on('click', function(event) {

    var header = document.getElementById("header");

    header.classList.add("hidden");
    map.classList.add("fullscreen");

    var latitude = event.latlng.lat;
    var longitude = event.latlng.lng;

    // your popup code continues here...
});



var header = document.getElementById("header");

map.on('click', function(event) {

    var header = document.getElementById("header");

    header.classList.add("hidden");
    map.classList.add("fullscreen");

    var latitude = event.latlng.lat;
    var longitude = event.latlng.lng;

    // your popup code continues here...
});
