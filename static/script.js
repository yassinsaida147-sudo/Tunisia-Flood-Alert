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
// USER LOCATION
// ==============================

var userLocationMarker = null;

if (navigator.geolocation) {

    navigator.geolocation.getCurrentPosition(

        function(position) {

            var latitude = position.coords.latitude;
            var longitude = position.coords.longitude;

            map.setView(
                [latitude, longitude],
                15
            );

            userLocationMarker = L.marker([
                latitude,
                longitude
            ])
            .addTo(map)
            .bindPopup("📍 You are here")
            .openPopup();

        },

        function(error) {

            console.log(
                "Could not get your location:",
                error.message
            );

        }

    );

}


// ==============================
// REPORT MARKERS
// ==============================

var reportMarkers = [];


// ==============================
// ROUTE VARIABLES
// ==============================

var routeLayer = null;

var destinationMarker = null;


// ==============================
// CREATE VOTER ID
// ==============================

function getVoterId() {

    var voterId =
        localStorage.getItem("voter_id");


    if (!voterId) {

        voterId =
            crypto.randomUUID();

        localStorage.setItem(
            "voter_id",
            voterId
        );

    }


    return voterId;

}


var voterId = getVoterId();


// ==============================
// LOAD REPORTS
// ==============================

loadReports();


// ==============================
// CLICK ON MAP
// ==============================

map.on('click', function(event) {

    // Hide header

    var header =
        document.getElementById("header");

    if (header) {

        header.classList.add("hidden");

    }


    // Make map fullscreen

    var mapElement =
        document.getElementById("map");

    if (mapElement) {

        mapElement.classList.add("fullscreen");

    }


    // Update Leaflet

    setTimeout(function() {

        map.invalidateSize();

    }, 400);


    // Coordinates

    var latitude =
        event.latlng.lat;

    var longitude =
        event.latlng.lng;


    // Create report popup

    var reportForm = `

        <div style="text-align: center;">

            <b>🚨 Report this location</b>

            <br><br>

            <button
                onclick="
                    createReport(
                        ${latitude},
                        ${longitude}
                    )
                "
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

            'Content-Type':
                'application/json'

        },

        body: JSON.stringify({

            latitude: latitude,

            longitude: longitude

        })

    })

    .then(function(response) {

        if (!response.ok) {

            throw new Error(
                "Server error: " +
                response.status
            );

        }

        return response.json();

    })

    .then(function(data) {

        // Close create popup

        map.closePopup();


        // Reload reports

        loadReports();


        // Wait for marker to appear

        setTimeout(function() {

            var newMarker =
                reportMarkers.find(
                    function(marker) {

                        var position =
                            marker.getLatLng();


                        return (

                            Math.abs(
                                position.lat -
                                latitude
                            ) < 0.000001

                            &&

                            Math.abs(
                                position.lng -
                                longitude
                            ) < 0.000001

                        );

                    }
                );


            // Open voting popup automatically

            if (newMarker) {

                newMarker.openPopup();

            }

        }, 300);

    })

    .catch(function(error) {

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

    // Remove old report markers

    reportMarkers.forEach(
        function(marker) {

            map.removeLayer(marker);

        }
    );


    reportMarkers = [];


    // Get reports

    fetch('/reports')

        .then(function(response) {

            if (!response.ok) {

                throw new Error(
                    "Server error: " +
                    response.status
                );

            }

            return response.json();

        })

        .then(function(reports) {

            reports.forEach(
                function(report) {

                    showReport(report);

                }
            );

        })

        .catch(function(error) {

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

                box-shadow:
                    0 0 5px rgba(0,0,0,0.5);

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

    var flooded =
        Number(report.flooded_votes) || 0;


    var safe =
        Number(report.safe_votes) || 0;


    var total =
        flooded + safe;


    var status;


    // ==============================
    // DETERMINE STATUS
    // ==============================

    if (total === 0) {

        status =
            "❓ No votes yet";

    }

    else if (flooded > safe) {

        status =
            "⚠️ Community reports FLOODED";

    }

    else if (safe > flooded) {

        status =
            "🟢 Community reports SAFE";

    }

    else {

        status =
            "⚖️ Votes are equal";

    }


    // ==============================
    // MARKER COLOR
    // ==============================

    var markerColor = "gray";


    if (flooded > safe) {

        markerColor = "red";

    }

    else if (safe > flooded) {

        markerColor = "green";

    }


    // ==============================
    // POPUP
    // ==============================

    var popup = `

        <div style="
            text-align: center;
            min-width: 200px;
        ">

            <b>${status}</b>

            <br><br>

            🔴 Flooded:
            ${flooded}

            <br>

            🟢 Safe:
            ${safe}

            <br>

            👥 Total votes:
            ${total}

            <hr>

            <b>
                What do you see here?
            </b>

            <br><br>

            <button

                onclick="
                    vote(
                        ${report.id},
                        'flooded'
                    )
                "

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

                onclick="
                    vote(
                        ${report.id},
                        'safe'
                    )
                "

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

            icon:
                createMarkerIcon(markerColor)

        }

    ).addTo(map);


    // ==============================
    // POPUP
    // ==============================

    marker.bindPopup(popup);


    // Save marker

    reportMarkers.push(marker);

}


// ==============================
// VOTE
// ==============================

function vote(reportId, voteType) {

    fetch(
        `/reports/${reportId}/vote`,
        {

            method: 'POST',

            headers: {

                'Content-Type':
                    'application/json'

            },

            body: JSON.stringify({

                voter_id: voterId,

                vote: voteType

            })

        }

    )

    .then(function(response) {

        if (!response.ok) {

            throw new Error(
                "Server error: " +
                response.status
            );

        }

        return response.json();

    })

    .then(function(data) {

        alert(data.message);

        loadReports();

    })

    .catch(function(error) {

        console.error(
            "Voting error:",
            error
        );

        alert(
            "Could not submit your vote."
        );

    });

}


// ======================================================
// ROUTING
// ======================================================


// ==============================
// FIND ROUTE
// ==============================

function findRoute() {

    var destination =
        document
            .getElementById("destination")
            .value
            .trim();


    if (!destination) {

        alert(
            "Please enter a destination."
        );

        return;

    }


    // Check user location

    if (!userLocationMarker) {

        alert(
            "Your location is not available. " +
            "Please allow location access."
        );

        return;

    }


    // User location

    var userPosition =
        userLocationMarker.getLatLng();


    var startLat =
        userPosition.lat;

    var startLng =
        userPosition.lng;


    // ==============================
    // FIND DESTINATION
    // ==============================

    fetch(

        "https://nominatim.openstreetmap.org/search?" +

        "format=json" +

        "&q=" +
        encodeURIComponent(destination) +

        "&limit=1"

    )

    .then(function(response) {

        return response.json();

    })

    .then(function(results) {

        if (results.length === 0) {

            alert(
                "Destination not found."
            );

            return;

        }


        var destinationLat =
            Number(results[0].lat);


        var destinationLng =
            Number(results[0].lon);


        calculateRoute(

            startLat,
            startLng,

            destinationLat,
            destinationLng

        );

    })

    .catch(function(error) {

        console.error(
            "Geocoding error:",
            error
        );

        alert(
            "Could not find the destination."
        );

    });

}


// ==============================
// CHECK FLOODS ON ROUTE
// ==============================

function checkFloodsOnRoute(route) {

    var routeCoordinates =
        route.geometry.coordinates;


    // Check every report marker

    for (
        var i = 0;
        i < reportMarkers.length;
        i++
    ) {

        var marker =
            reportMarkers[i];


        var markerElement =
            marker.getElement();


        if (!markerElement) {

            continue;

        }


        var markerDiv =
            markerElement.querySelector("div");


        if (!markerDiv) {

            continue;

        }


        var color =
            markerDiv.style.backgroundColor;


        // Only red markers

        if (

            color !== "red"

            &&

            color !== "rgb(255, 0, 0)"

        ) {

            continue;

        }


        var floodLocation =
            marker.getLatLng();


        // Check route points

        for (
            var j = 0;
            j < routeCoordinates.length;
            j++
        ) {

            var routePoint =
                routeCoordinates[j];


            var routeLng =
                routePoint[0];


            var routeLat =
                routePoint[1];


            var distance =
                map.distance(

                    [
                        routeLat,
                        routeLng
                    ],

                    [
                        floodLocation.lat,
                        floodLocation.lng
                    ]

                );


            // 500 meter warning zone

            if (distance <= 500) {

                return true;

            }

        }

    }


    return false;

}


// ==============================
// CALCULATE ROUTE
// ==============================

function calculateRoute(

    startLat,
    startLng,

    destinationLat,
    destinationLng

) {


    var url =

        "https://router.project-osrm.org/route/v1/driving/" +

        startLng + "," + startLat +

        ";" +

        destinationLng + "," + destinationLat +

        "?overview=full" +

        "&geometries=geojson" +

        "&alternatives=true";


    fetch(url)

        .then(function(response) {

            return response.json();

        })

        .then(function(data) {

            if (

                data.code !== "Ok"

                ||

                !data.routes

                ||

                data.routes.length === 0

            ) {

                alert(
                    "Could not find a driving route."
                );

                return;

            }


            // ==============================
            // FIND ROUTE WITHOUT FLOOD
            // ==============================

            var selectedRoute = null;

            var floodedRoute = null;


            for (
                var i = 0;
                i < data.routes.length;
                i++
            ) {

                var route =
                    data.routes[i];


                var hasFlood =
                    checkFloodsOnRoute(route);


                if (!hasFlood) {

                    selectedRoute =
                        route;

                    break;

                }


                if (!floodedRoute) {

                    floodedRoute =
                        route;

                }

            }


            // ==============================
            // NO SAFE ALTERNATIVE
            // ==============================

            if (!selectedRoute) {

                selectedRoute =
                    floodedRoute;


                alert(

                    "⚠️ Warning!\n\n" +

                    "All available routes " +

                    "pass near a " +

                    "community-reported " +

                    "flooded area."

                );

            }


            // ==============================
            // REMOVE OLD ROUTE
            // ==============================

            if (routeLayer) {

                map.removeLayer(
                    routeLayer
                );

            }


            // ==============================
            // REMOVE OLD DESTINATION
            // ==============================

            if (destinationMarker) {

                map.removeLayer(
                    destinationMarker
                );

            }


            // ==============================
            // CHECK IF ROUTE CHANGED
            // ==============================

            var originalRoute =
                data.routes[0];


            var routeChanged =
                selectedRoute !== originalRoute;


            if (routeChanged) {

                alert(

                    "⚠️ Flooded area detected!\n\n" +

                    "🔄 An alternative route " +

                    "was selected to avoid it."

                );

            }

            else {

                if (
                    checkFloodsOnRoute(
                        selectedRoute
                    )
                ) {

                    alert(

                        "⚠️ A flooded area was " +

                        "detected near the " +

                        "available route."

                    );

                }

                else {

                    alert(

                        "✅ Route selected.\n\n" +

                        "No community-reported " +

                        "flooded areas were detected."

                    );

                }

            }


            // ==============================
            // DRAW ROUTE
            // ==============================

            routeLayer = L.geoJSON(

                selectedRoute.geometry,

                {

                    style: {

                        color: "blue",

                        weight: 6,

                        opacity: 0.8

                    }

                }

            ).addTo(map);


            // ==============================
            // DESTINATION MARKER
            // ==============================

            destinationMarker =

                L.marker([

                    destinationLat,

                    destinationLng

                ])

                .addTo(map)

                .bindPopup(
                    "🏁 Destination"
                );


            // ==============================
            // FIT MAP TO ROUTE
            // ==============================

            map.fitBounds(

                routeLayer.getBounds(),

                {

                    padding: [30, 30]

                }

            );


            // ==============================
            // ROUTE INFORMATION
            // ==============================

            var distanceKm =
                selectedRoute.distance / 1000;


            var durationMinutes =
                selectedRoute.duration / 60;


            console.log(
                "Selected route:",
                selectedRoute
            );


            console.log(
                "Distance:",
                distanceKm,
                "km"
            );


            console.log(
                "Duration:",
                durationMinutes,
                "minutes"
            );

        })

        .catch(function(error) {

            console.error(
                "Routing error:",
                error
            );

            alert(
                "Could not calculate the route."
            );

        });

}
