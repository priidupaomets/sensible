var	headingWatchID = null;
var accelerationWatchID = null;
var boardCanvas = null;
var canvasWidth = 400;
var canvasHeight = 400;
var map = null;
var sourceMarker = null;
var destinationMarker = null;
var sourceLatLng = null;
var directionDisplay = null;
var directionService = null;
var distanceService = null;

function ellipse(context, cx, cy, rx, ry){
	context.save(); // save state
	context.beginPath();

	context.translate(cx-rx, cy-ry);
	context.scale(rx, ry);
	context.arc(1, 1, 1, 0, 2 * Math.PI, false);

	context.restore(); // restore to original state
	context.stroke();
}

var app = {
	// Called when device is ready
    onDeviceReady: function() {
        console.log('Initializing');
        
		app.initialize();
    },

    initialize: function() {

		var motionBoard = $('#motionBoard');
		
		boardCanvas = document.createElement("canvas");
		boardCanvas.id = "board";
		boardCanvas.width = canvasWidth; //motionBoard.clientWidth;
		boardCanvas.height = canvasHeight; //motionBoard.clientHeight;		
		motionBoard.append(boardCanvas);
		
		this.startHeadingWatch();
		this.startAccelerationWatch();
		this.getLocation();
		
    },

	
	startHeadingWatch: function() {
        console.log('Start Heading Watch');
        
		// Update compass every 0.5 seconds
        var options = { frequency: 500 };

        try {
            headingWatchID = navigator.compass.watchHeading(this.onCompassSuccess, this.onCompassError, options);
		} catch (e) {
			console.log("Error Starting Watching heading: " + e);
            $('#compass-error').html("Error: " + e);
        }
	},
		
	onCompassSuccess: function(heading) {
		//console.log("Heading: " + heading.magneticHeading);
		var magneticHeading = heading.magneticHeading;
		
		var html = '<p><span class="caption-header">Suund:</span> ' + magneticHeading + '</p>';
		
		$('#compass-heading').html(html);
		
		var rotation = 360 - Math.round(magneticHeading);
        var rotateDeg = 'translateX(-100px) rotate(' + rotation + 'deg)';

		// TODO: fix - this code only works on webkit browsers, not wp7	  
		// $('#compass-rose');
		$('#compass-needle').css('-webkit-transform', rotateDeg);
			
	},
	
	onCompassError: function(compassError) {
		console.log("Compass error: " + compassError.code);
	},
	
	stopHeadingWatch: function() {
        console.log('Stop Heading Watch');
        
		if (headingWatchID) {
			navigator.compass.clearWatch(headingWatchID);
			headingWatchID = null;
		}
	},
	

    
    
	startAccelerationWatch: function() {
        console.log('Start Acceleration Watch');
        
		var options = { frequency: 100 };
		
        try {
            accelerationWatchID = navigator.accelerometer.watchAcceleration(this.onAccelerometerSuccess, this.onAccelerometerError, options);
		} catch (e) {
			console.log("Error Starting Watching heading: " + e);
            $('#accelerator-error').html("Error: " + e);
        }
	},
	
	onAccelerometerSuccess: function(acceleration) {
		//console.log("Acceleration: " + acceleration);
		
		var html = '<p><span class="caption-header">X kiirendus:</span> ' + acceleration.x + '<br>' + 
			'<span class="caption-header">Y kiirendus:</span> ' + acceleration.y + '<br>' + 
			'<span class="caption-header">Z kiirendus:</span> ' + acceleration.z + '<br>' + 
			//'<span class="caption-header">Ajatempel:</span> ' + acceleration.timestamp + 
			'</p>';
		
		$('#motion-info').html(html);
		
		if (boardCanvas) {
			var ctx = boardCanvas.getContext("2d");
			ctx.fillStyle = "#ff55ff";

			ctx.clearRect(0, 0, canvasWidth, canvasHeight); //boardCanvas.clientWidth, boardCanvas.clientHeight);

			ctx.strokeStyle="#0000FF";
			
			// Joonistame kesmise ringi, mis on alati keset ala
			ellipse(ctx, (canvasWidth / 2), (canvasHeight / 2), 25, 25);
			ctx.beginPath();
			ctx.moveTo((canvasWidth / 2),(canvasHeight / 2) - 15);
			ctx.lineTo((canvasWidth / 2),(canvasHeight / 2) + 15);
			ctx.moveTo((canvasWidth / 2) - 15,(canvasHeight / 2));
			ctx.lineTo((canvasWidth / 2) + 15,(canvasHeight / 2));
			ctx.stroke();
			
			// Normaliseerime tulemused, mis tüüpiliselt on -10..10 vahemikus, uude -(canvasWidth/2)..(canvasWidth/2)
			var xpos = (canvasWidth / 2) - (acceleration.x * ((canvasWidth / 2) / 10)); 
			var ypos = (canvasHeight / 2) + (acceleration.y * ((canvasHeight / 2) / 10)); 

			ctx.strokeStyle="#FF0000";
			ellipse(ctx, xpos, ypos, 10, 10);			
		}
	},
	
	onAccelerometerError: function(accelerometerError) {
		console.log("Accelerometer error: " + accelerometerError.code);		
	},
	
    stopAccelerationWatch: function() {
        console.log('Stop Acceleration Watch');

        if (accelerationWatchID) {
			navigator.accelerometer.clearWatch(accelerationWatchID);
			accelerationWatchID = null;
		}		
	},
	

    
    
    
	onMapReady: function() {
		try {
			// Do something
			console.log('OnMapReady');
						
			var mapDiv = document.getElementById('mapDiv');
			//console.log('mapDiv: ' + mapDiv);
			
			map = new google.maps.Map(mapDiv, {
			  center: {lat: -34.397, lng: 150.644},
			  zoom: 10
			});
			
			try {
				directionService = new google.maps.DirectionsService();
				directionDisplay = new google.maps.DirectionsRenderer();
				directionDisplay.setMap(map);	
				distanceService = new google.maps.DistanceMatrixService();
			}
			catch (e) {
				console.log("Error setting up direction services: " + e);
                $('#map-error').html("Error setting direction services: " + e);
			}
			
			var that = this;
			
			map.addListener('click', function(e) {
				that.placeMarkerAndPanTo(e.latLng, map);
			});
			
			map.addListener('tap', function(e) {
				that.placeMarkerAndPanTo(e.latLng, map);
			});
			
			// // Add click handler to the function
			// $('#btnCalcRoute').click(this.onBtnCalcRouteClick);
			
		} catch (e) {
			console.log("Error adding Map button click handler: " + e);
		}
	},
	
	getLocation: function() {
		console.log("Getting user's location");
		var that = this;
		
        try {
            navigator.geolocation.getCurrentPosition(function(position) {
                var lat = position.coords.latitude;
                var lon = position.coords.longitude;			

                console.log(position.coords);

                // Show Latitude and Longitude coordinates
                var html = '<p><span class="caption-header">Latitude:</span> ' + lat + 
                           ' <br><span class="caption-header">Longitude:</span> ' + lon + '</p>';

                $('#location').html(html);

                // Now let's use reverse geo-location to find out the actual address
                $.ajax({
                    url: 'https://maps.googleapis.com/maps/api/geocode/json?latlng=' + lat + ',' + lon,
                    datatype: 'jsonp',
                    success: function(response) {
                        //city = response.
                        //console.log(response);
                        var html = '<p><span class="caption-header">Aadress:</span> ' + response.results[0].formatted_address + '</p>';

                        $('#address').html(html);					
                    }
                });

                // Show our location on the map regardless of reverse geo-lookup result
                that.showPosition(position);

            });
        }
        catch (e) {
            console.log("Error getting current pos: " + e);
            $('#map-error').html("Error getting current pos: " + e);
        }
	},
	
	showPosition: function(position) {
		if (map) {
			try {
				console.log('Setting location on map');
				
				var ourPos = new google.maps.LatLng(position.coords.latitude, 
					position.coords.longitude);
				
				// Save our position as source location
				sourceLatLng = ourPos;
				
				var ourPosMarker = new google.maps.Marker({
					map: map, 
					position: ourPos,
					title: 'Olen siin',
					animation: google.maps.Animation.DROP
				});
				
				map.setCenter(ourPos);
			}
			catch (e) {
				console.log("Error setting our location: " + e);
			}
		} else {
			console.log('Unable to set location on map');
		}
		
	},
	
	onBtnCalcRouteClick: function() {
		//map.();
		console.log('Map button clicked');
	},
	
	calcAndShowRoute: function(source, destination) {
        console.log('Calculating Route');

		var request = {
			origin: source,
			destination: destination,
			provideRouteAlternatives: false,
			travelMode: google.maps.TravelMode.DRIVING,
			unitSystem: google.maps.UnitSystem.METRIC
		};
		
		directionService.route(request, function(result, status) {
			if (status == google.maps.DirectionsStatus.OK) {
				directionDisplay.setDirections(result);
				console.log('directions:')
				console.log(result);
			}
		});
		
		distanceService.getDistanceMatrix({
			origins: [source],
			destinations: [destination],
			travelMode: google.maps.TravelMode.DRIVING,
			unitSystem: google.maps.UnitSystem.METRIC
		}, function(response, status) {
			if (status == google.maps.DistanceMatrixStatus.OK) {
				response.originAddresses;
				response.destinationAddresses;
				console.log('distanceMatrix:')
				console.log(response);
				
				var elements = response.rows[0].elements[0];
				var duration = elements.duration.text;
				var distance = elements.distance.text;
				
				var html = '<p><span class="caption-header">From:</span> ' + response.originAddresses[0] + '<br>' +
				'<span class="caption-header">To:</span> ' + response.destinationAddresses[0] + '<br>' +
				'<span class="caption-header">Duration:</span> ' + duration + '<br>' + 
				'<span class="caption-header">Distance:</span> ' + distance + '</p>';
				
				$('#routeInfo').html(html);
							
			}
		});
		
	},
	
	placeMarkerAndPanTo: function(latLng, map) {
		
		try {
			var image = 'https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png';

			if (destinationMarker) {
				console.log('clearing existing marker');
				
				// Clear destination marker from the map
				destinationMarker.setMap(null);
				destinationMarker = null;
			}
			
			destinationMarker = new google.maps.Marker({
				position: latLng,
				map: map,
				title: 'Meie sihtpaik',
				animation: google.maps.Animation.DROP,
				draggable: true,
				icon: image
			});
			
			var infoWindowContent = '<h1>Meie sihtmärk</h1><p>Teekonna arvutamiseks kliki parema nupuga <b>markerile</b></p>';
			
			var infoWindow = new google.maps.InfoWindow({
				content: infoWindowContent
			});
			
			destinationMarker.addListener('click', function(e) {
				console.log('marker clicked');
				infoWindow.open(map, destinationMarker);
			});
			
			var that = this;
			
			destinationMarker.addListener('rightclick', function(e) {
				console.log('marker right-clicked - calc route');

				that.calcAndShowRoute(sourceLatLng, latLng);
			});
			
			destinationMarker.addListener('mouseover', function(e) {
				console.log('over the marker');
			});
			
			map.panTo(latLng);
		}
		catch (e) {
			console.log("Error placing marker: " + e);
		}
			
	}
};
 
$(document).ready(function() {
    document.addEventListener('deviceready', app.onDeviceReady, false);
});
