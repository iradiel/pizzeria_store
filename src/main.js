var delay = 100;

// ====== Create map objects ======

var geo;
var map;
var bounds;
var latlng;
var nextAddress = 0;
var addresses = [];
var filterAddresses = [];
var markers = [];
var directionsDisplay;
var infoWindow;
var storeIcon = 'https://chart.googleapis.com/chart?chst=d_map_pin_letter&chld=S|FF0000|000000';
var customerIcon = 'https://chart.googleapis.com/chart?chst=d_map_pin_letter&chld=U|FFFF00|000000';
var componentForm = {
	street_number : 'short_name',
	route : 'long_name',
	locality : 'long_name',
	administrative_area_level_1 : 'short_name',
	country : 'long_name',
	postal_code : 'short_name'
};

var autocomplete;

const mapStyle = [ {
	"featureType" : "administrative",
	"elementType" : "all",
	"stylers" : [ {
		"visibility" : "on"
	}, {
		"lightness" : 33
	} ]
}, {
	"featureType" : "landscape",
	"elementType" : "all",
	"stylers" : [ {
		"color" : "#f2e5d4"
	} ]
}, {
	"featureType" : "poi.park",
	"elementType" : "geometry",
	"stylers" : [ {
		"color" : "#c5dac6"
	} ]
}, {
	"featureType" : "poi.park",
	"elementType" : "labels",
	"stylers" : [ {
		"visibility" : "on"
	}, {
		"lightness" : 20
	} ]
}, {
	"featureType" : "road",
	"elementType" : "all",
	"stylers" : [ {
		"lightness" : 20
	} ]
}, {
	"featureType" : "road.highway",
	"elementType" : "geometry",
	"stylers" : [ {
		"color" : "#c5c6c6"
	} ]
}, {
	"featureType" : "road.arterial",
	"elementType" : "geometry",
	"stylers" : [ {
		"color" : "#e4d7c6"
	} ]
}, {
	"featureType" : "road.local",
	"elementType" : "geometry",
	"stylers" : [ {
		"color" : "#fbfaf7"
	} ]
}, {
	"featureType" : "water",
	"elementType" : "all",
	"stylers" : [ {
		"visibility" : "on"
	}, {
		"color" : "#acbcc9"
	} ]
} ];

function initMap() {
	var montevideo = {
		lat : -34.901112,
		lng : -56.164532
	};
	map = new google.maps.Map(document.getElementById('map'), {
		center : montevideo,
		zoom : 11,
		mapTypeId : 'roadmap',
		styles : mapStyle,
		mapTypeControlOptions : {
			style : google.maps.MapTypeControlStyle.DROPDOWN_MENU
		}
	});
	infoWindow = new google.maps.InfoWindow();
	geo = new google.maps.Geocoder();
	latlng = new google.maps.LatLng(-34.397, 150.644);
	searchButton = document.getElementById("searchButton").onclick = searchLocations;
	bounds = new google.maps.LatLngBounds();
	var locationSelect = document.getElementById("locationSelect");
	var customSearch = document.getElementById("customsearch");
	directionsDisplay = new google.maps.DirectionsRenderer();

	var defaultBounds = new google.maps.LatLngBounds(new google.maps.LatLng(
			-56.2308, -34.9345), new google.maps.LatLng(-56.1001, -34.8273));

	var input = document.getElementById('addressInput');
	var options = {
		bounds : defaultBounds,
		types : [ 'geocode' ]
	};

	autocomplete = new google.maps.places.Autocomplete(input, options);

	loadJSON(function(response) {

		addresses = JSON.parse(response);
		theNext();

	});
	locationSelect.onchange = function() {
		clearLocations();
		var selectOption = locationSelect.options[locationSelect.selectedIndex].value;
		if (selectOption == "custom") {

			customSearch.style.display = "block";
		} else {
			customSearch.style.display = "none";
			for (var i = 0; i < addresses.length; i++) {
				createMarker(addresses[i].name, addresses[i].lat,
						addresses[i].lng, true);

			}
		}

	};
}

function showOptions() {
	if (document.getElementById("distance").checked == true) {
		document.getElementById("distancediv").style.display = "block";
		document.getElementById("radiusdiv").style.display = "none";
		document.getElementById("directionsdiv").style.display = "none";
	} else if (document.getElementById("proximity").checked == true) {
		document.getElementById("distancediv").style.display = "none";
		document.getElementById("radiusdiv").style.display = "block";
		document.getElementById("directionsdiv").style.display = "none";
	} else {
		document.getElementById("distancediv").style.display = "none";
		document.getElementById("radiusdiv").style.display = "none";
		createOptionDirection();
		document.getElementById("directionsdiv").style.display = "block";
	}
}

function createOptionDirection() {
	var directionselect = document.getElementById("directionSelect")
	for (var i = 0; i < addresses.length; i++) {
		var option = document.createElement("option");
		option.value = addresses[i].address;
		option.innerHTML = addresses[i].name;
		directionselect.appendChild(option);
	}
}

// ====== Geocoding ======
function getAddress(address, name, pos, next, filter) {
	geo.geocode({
		address : address
	}, function(results, status) {
		// If that was successful
		if (status == google.maps.GeocoderStatus.OK) {
			// Lets assume that the first marker is the one we want
			var p = results[0].geometry.location;
			var lat = p.lat();
			var lng = p.lng();
			// Create a marker
			addresses[pos].lat = lat;
			addresses[pos].lng = lng;
			createMarker(name, lat, lng, true);
		}
		// ====== Decode the error status ======
		else {
			// === if we were sending the requests to fast, try this one again
			// and increase the delay
			if (status == google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
				nextAddress--;
				delay++;
			} else {
				alert('Geocode was not successful for the following reason: '
						+ status);

			}
		}
		next();
	});
}

function searchLocations() {
	var address = document.getElementById("addressInput").value;

	geo.geocode({
		address : address
	}, function(results, status) {
		if (status == google.maps.GeocoderStatus.OK) {
			clearLocations();
			if (document.getElementById("distance").checked) {
				searchLocationsDistance(results[0].geometry.location);
			} else if (document.getElementById("proximity").checked == true) {
				searchLocationsNear(address, results[0].geometry.location);
			} else {
				searchLocationDirection(results[0].geometry.location)
			}

		} else {
			alert(address + ' not found');
		}
	});

}

function searchLocationDirection(customerLocation) {

	var directionsService = new google.maps.DirectionsService();

	// setup directionsDisplay object here

	directionsDisplay.setMap(map);
	directionsDisplay.setPanel(document.getElementById('directions-panel'));
	var request = {
		origin : customerLocation,
		destination : document.getElementById('directionSelect').value,
		travelMode : google.maps.DirectionsTravelMode.DRIVING
	}
	directionsService.route(request, function(response, status) {
		if (status == google.maps.DirectionsStatus.OK) {
			directionsDisplay.setDirections(response);
		}
	});
}

function searchLocationsDistance(customerLocation) {

	var service = new google.maps.DistanceMatrixService();
	var unitSys = document.getElementById('units').value;
	var storesAddress = [];
	for (var i = 0; i < addresses.length; i++) {
		storesAddress[i] = addresses[i].address;
	}

	if (unitSys == "mi") {
		unitSys = google.maps.UnitSystem.IMPERIAL;
	} else if (unitSys == "km") {
		unitSys = google.maps.UnitSystem.METRIC;
	}

	service.getDistanceMatrix({
		origins : [ customerLocation ],
		destinations : storesAddress,
		travelMode : google.maps.TravelMode.DRIVING,
		unitSystem : unitSys,
		avoidHighways : false,
		avoidTolls : false,
		durationInTraffic : true
	}, callback);

}

function callback(response, status) {
	if (status != google.maps.DistanceMatrixStatus.OK) {
		console.log('DistanceMatrix Error: ', status);
	} else {
		// Get the arrays of origins and destinations
		var origins = response.originAddresses;
		var destinations = response.destinationAddresses;
		var storeResults = [];
		var topStores = document.getElementById('countSelect').value;
		geo.geocode({
			address : origins[0]
		}, function(results, status) {
			// If that was successful
			if (status == google.maps.GeocoderStatus.OK) {
				// Lets assume that the first marker is the one we want
				var p = results[0].geometry.location;
				var lat = p.lat();
				var lng = p.lng();
				// Create a marker
				createMarker("user position", lat, lng, false);
			}
			// ====== Decode the error status ======
			else {
				// === if we were sending the requests to fast, try this one
				// again and increase the delay
				alert('Geocode was not successful for the following reason: '
						+ status);

			}
		});
		for (var i = 0; i < origins.length; i++) {
			// For each of the origins, get the results of the
			// distance and duration of the destinations
			var results = response.rows[i].elements;
			for (var j = 0; j < results.length; j++) {
				// Store the results for later sorting
				storeResults.push([ j, destinations[j],
						results[j].duration_in_traffic.value,
						results[j].duration_in_traffic.text,
						results[j].distance.value, results[j].distance.text ]);

			}
		}
		// Sort the results by duration in traffic
		storeResults.sort(function(a, b) {
			return a[4] - b[4];
		});
		var outputDiv = document.getElementById('outputdistanceDiv');
		outputDiv.innerHTML = '';
		// deleteOverlays();
		topStores = (topStores == "All") || topStores > storeResults.length ? storeResults.length
				: topStores;
		for (var i = 0; i < topStores; i++) {

			createMarker(addresses[storeResults[i][0]].name,
					addresses[storeResults[i][0]].lat,
					addresses[storeResults[i][0]].lng, true);
			outputDiv.innerHTML += origins[0] + ' to ' + storeResults[i][1]
					+ ': ' + storeResults[i][5] + ' in ' + storeResults[i][3]
					+ '<br>';
			// }
		}
	}
}

function searchLocationsNear(address, center) {
	createMarker("user position", center.lat(), center.lng(), false);

	var radius = document.getElementById('radiusSelect').value;
	for (var i = 0; i < addresses.length; i++) {
		var distance = haversine_distance(center.lat(), center.lng(),
				addresses[i].lat, addresses[i].lng, 'K');
		console.log(distance);
		if (distance <= radius) {

			createMarker(addresses[i].name, addresses[i].lat, addresses[i].lng,
					true);
		}
	}

}

function haversine_distance(lat1, lon1, lat2, lon2, unit) {
	var radlat1 = Math.PI * lat1 / 180
	var radlat2 = Math.PI * lat2 / 180
	var radlon1 = Math.PI * lon1 / 180
	var radlon2 = Math.PI * lon2 / 180
	var theta = lon1 - lon2
	var radtheta = Math.PI * theta / 180
	var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1)
			* Math.cos(radlat2) * Math.cos(radtheta);
	dist = Math.acos(dist)
	dist = dist * 180 / Math.PI
	dist = dist * 60 * 1.1515
	if (unit == "K") {
		dist = dist * 1.609344
	}
	if (unit == "N") {
		dist = dist * 0.8684
	}
	return dist
}
// ======= Function to create a marker
function createMarker(add, lat, lng, isStore) {

	var icon;

	if (isStore) {

		icon = storeIcon;

	} else {

		icon = customerIcon;

	}
	var contentString = add;
	var marker = new google.maps.Marker({
		position : new google.maps.LatLng(lat, lng),
		map : map,
		icon : icon,
		zIndex : Math.round(latlng.lat() * -100000) << 5
	});

	markers.push(marker);

	google.maps.event.addListener(marker, 'click', function() {
		infoWindow.setContent(contentString);
		infoWindow.open(map, marker);
	});

	bounds.extend(marker.position);

}

function loadJSON(callback) {

	var xobj = new XMLHttpRequest();
	xobj.overrideMimeType("application/json");
	xobj.open('GET', 'store.json', true);
	xobj.onreadystatechange = function() {
		if (xobj.readyState == 4 && xobj.status == "200") {
			callback(xobj.responseText);

		}
	}
	xobj.send(null);

}

// ======= Global variable to remind us what to do next

// ======= Function to call the next Geocode operation when the reply comes back

function theNext() {

	if (nextAddress < addresses.length) {

		setTimeout('getAddress("' + addresses[nextAddress].address + '","'
				+ addresses[nextAddress].name + '","' + nextAddress
				+ '",theNext)', delay);
		nextAddress++;
	} else {
		// We're done. Show map bounds
		map.fitBounds(bounds);

	}
}

function clearLocations() {
	infoWindow.close();
	directionsDisplay.setMap(null);
	directionsDisplay.setPanel(null);
	for (var i = 0; i < markers.length; i++) {
		markers[i].setMap(null);
	}
	markers.length = 0;

}
