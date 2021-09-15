angular.module('app.services', [])

//Initialising the maps
.service('initMap', [
        function () {
        var initMap = this

        //default map options for the initial map
        var mapOptions = {
            center: {
                lat: 54.5,
                lng: -4
            },
            zoom: 5,
            minZoom: 5
        }

        //custom controls by Google Maps: https://goo.gl/sl88KX
        function CenterControl(controlDiv, map) {
            // Set CSS for the control border.
            var controlUI = document.createElement('div');
            controlUI.style.backgroundColor = '#fff';
            controlUI.style.border = '2px solid #fff';
            controlUI.style.borderRadius = '3px';
            controlUI.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
            controlUI.style.cursor = 'pointer';
            controlUI.style.marginBottom = '22px';
            controlUI.style.textAlign = 'center';
            controlUI.title = 'Click to recenter the map';
            controlDiv.appendChild(controlUI);

            // Set CSS for the control interior
            var controlText = document.createElement('div');
            controlText.style.color = 'rgb(25,25,25)';
            controlText.style.fontSize = '16px';
            controlText.style.lineHeight = '38px';
            controlText.style.paddingLeft = '5px';
            controlText.style.paddingRight = '5px';
            controlText.innerHTML = 'Center Map';
            controlUI.appendChild(controlText);

            // Setup the click event listeners
            controlUI.addEventListener('click', function () {
                map.setCenter(initMap.initCenter)
            });
        }

        //renders the map in the specified tab and div element
        initMap.initIn = function (tabIndex, element) {
            if (typeof (initMap.maps) == "undefined") {
                initMap.maps = []
            }
            if (typeof (initMap.resizedMaps) == "undefined") {
                initMap.resizedMaps = []
            }
            if (typeof (initMap.markers) == "undefined") {
                initMap.markers = []
            }
            initMap.maps[tabIndex] = new google.maps.Map(element, mapOptions);
            initMap.markers[tabIndex] = new google.maps.Marker({
                title: "Your initial location",
                icon: "img/blue-dot.png"
            })
            var centerControlDiv = document.createElement('div');
            var centerControl = new CenterControl(centerControlDiv, initMap.maps[tabIndex]);

            centerControlDiv.index = 1;
            initMap.maps[tabIndex].controls[google.maps.ControlPosition.TOP_RIGHT].push(centerControlDiv);
        }
    }])

//Geolocation requests
.service('geoServ', ['$rootScope', '$ionicPopup', '$q', 'initMap', 'timestamp',
        function ($rootScope, $ionicPopup, $q, initMap, timestamp) {
        var geoServ = this

        //options and error callback for geolocation requests
        var geoError = function (error) {
            switch (error.code) {
                case error.PERMISSION_DENIED:

                    $ionicPopup.alert({
                        title: "Geolocation error",
                        template: "User denied the request for Geolocation."
                    });
                    break;
                case error.POSITION_UNAVAILABLE:
                    $ionicPopup.alert({
                        title: "Geolocation error",
                        template: "Location information is unavailable."
                    });
                    break;
                case error.UNKNOWN_ERROR:
                    $ionicPopup.alert({
                        title: "Geolocation error",
                        template: "An unknown error occurred."
                    });
                    break;
            }
        }
        var geoOptions = {
            enableHighAccuracy: true,
            maximumAge: 3000,
            timeout: 27000
        }

        //initial location
        geoServ.currentLocation = function (tabIndex) {
            var deferred = $q.defer();
            geoServ.currentLocation.loading = true
            var map = initMap.maps[tabIndex]
            var marker = initMap.markers[tabIndex]
                //getCurrentPosition success callback
            var geoSetSuccess = function (position) {
                    geoServ.initCoords = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    }
                    marker.setPosition(geoServ.initCoords)

                    initMap.initCenter = geoServ.initCoords
                    geoServ.currentLocation.loading = false
                    if (!geoServ.initCenter) {
                        geoServ.initMapSettings()
                    }
                    deferred.resolve(geoServ.initCoords)
                }
                //initial map settings
            geoServ.initMapSettings = function () {
                    map.setCenter(geoServ.initCoords)
                    map.setZoom(13);
                    marker.setMap(map);
                    geoServ.initCenter = true
                }
                //reuse initial location or set it if undefined
            if (!(geoServ.initCoords)) {
                if (navigator.geolocation) {
                    navigator.geolocation.watchPosition(geoSetSuccess, geoError, geoOptions)
                } else {
                    $ionicPopup.alert({
                        title: "Geolocation",
                        template: "Your device does not support geolocation"
                    });
                }
            } else {
                geoServ.initMapSettings()
            }
            return deferred.promise
        }

        //watch location
        geoServ.trackLocation = function (tabIndex) {
            console.log("Tracking is on")
            var map = initMap.maps[tabIndex]

            function geoWatchSuccess(position) {
                console.log(position.timestamp)
                if (!geoServ.liveMarker) {
                    geoServ.liveMarker = new google.maps.Marker({
                        icon: "img/pinpoint.gif",
                        optimized: false,
                        map: map
                    })
                } else {
                    geoServ.liveMarker.setMap(map)
                }
                geoServ.liveMarker.setPosition({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                })
                var traceMark = {
                    coords: {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    },
                    timestamp: position.timestamp,
                    heading: position.coords.heading,
                    speed: position.coords.speed
                }

                var marker = new google.maps.Marker({
                    icon: "img/red-dot.png",
                    position: traceMark.coords,
                })
                var infowindow = new google.maps.InfoWindow();
                var content = timestamp.msec(traceMark.timestamp)

                google.maps.event.addListener(marker, 'click', (function (marker, content, infowindow) {
                    return function () {
                        infowindow.setContent(content);
                        infowindow.open(map, marker);
                    };
                })(marker, content, infowindow));
                traceMark.marker = marker
                traceMark.infowindow = infowindow
                $rootScope.$broadcast('traceMark:updated', traceMark)
            }
            //this is where another live GPS source can be plugged in instead of local position watcher
            this.watchID = navigator.geolocation.watchPosition(geoWatchSuccess, geoError, geoOptions)
        }
    }])

//Transport API queries
.service('queryApi', ['$q', '$http', '$ionicPopup', 'infoWindow',
        function ($q, $http, $ionicPopup, infoWindow) {
        var queryApi = this
        var app_id = "928e6aca"
        var app_key = "aa747294d32b6f68b6a827ed7f79242f"

        //API query for nearest bus stops
        queryApi.nearStops = function (coords, count, map) {
            var deferred = $q.defer();
            var baseUrl = "https://transportapi.com/v3/uk/bus/stops/near.json?"
            var url = baseUrl +
                "app_id=" + app_id +
                "&app_key=" + app_key +
                "&lat=" + coords.lat +
                "&lon=" + coords.lng +
                "&page=1" +
                "&rpp=" + count + "&callback=JSON_CALLBACK"
            if (typeof (queryApi.nearStops.stopsList) != "undefined") {
                var list = queryApi.nearStops.stopsList
                for (i = 0; i < list.length; i++) {
                    list[i].marker.setMap(null)
                }
            }
            $http.jsonp(url)
                .success(function (data) {
                    console.log(url)
                    for (var i = 0; i < data.stops.length; i++) {
                        var busStop = data.stops[i]
                        busStop.marker = new google.maps.Marker({
                            position: new google.maps.LatLng(busStop.latitude, busStop.longitude),
                            map: map
                        })
                        var content = busStop.indicator + " " + busStop.name

                        busStop.infowindow = new google.maps.InfoWindow({
                            content: content
                        })
                        var marker = busStop.marker
                        var infowindow = busStop.infowindow
                        google.maps.event.addListener(marker, 'click', (function (marker, content, infowindow) {
                            return function () {
                                infowindow.open(map, marker);
                            };
                        })(marker, content, infowindow));
                    }
                    queryApi.nearStops.stopsList = data.stops
                    deferred.resolve(queryApi.nearStops.stopsList) //deferred promise value
                })
            return deferred.promise
        }

        //API query for particular bus stops's list of servicing buses
        queryApi.findBuses = function (busStop, map) {
            var deferred = $q.defer();

            if (typeof (busStop.busesList) == "undefined") {

                var confirmPopup = $ionicPopup.confirm({
                    title: "Use NextBuses live data",
                    template: "Do you want to use live departures data from NextBuses for this query?<br>(limited and slower queries with no information about the set route)",
                    cancelText: "No",
                    okText: "Yes"
                });
                confirmPopup.then(function (res) {
                    if (res) {
                        var useAPI = "yes"
                        var requestFor = "/live.json?"
                    } else {
                        var useAPI = "no"
                        var requestFor = "/timetable.json?" //the timetable request provides inbound/outbound information
                    }
                    var baseUrl = "https://transportapi.com/v3/uk/bus/stop/"
                    var url = baseUrl +
                        busStop.atcocode +
                        requestFor +
                        "app_id=" + app_id +
                        "&app_key=" + app_key +
                        "&nextbus=" + useAPI + "&callback=JSON_CALLBACK"
                    console.log(url)

                    var busesList = []
                    $http.jsonp(url)
                        .success(function (data) {
                            Object.keys(data.departures).forEach(function (key, index) {
                                var bus = data.departures[key][0]
                                busesList.push(bus)
                            })
                            busesListReady(busesList)
                        })
                        .error(function () {
                            busesListReady(busesList)
                        })

                    function busesListReady(list) {
                        infoWindow.showFor(map, busStop, true)
                        queryApi.findBuses.busesList = busesList
                        deferred.resolve(queryApi.findBuses.busesList) //deferred promise value
                    }
                })
            }
            return deferred.promise
        }
    }])

//Geocoder for finding addresses
.service('geoCoder', ['$q', '$http', 'searchMode',
    function ($q, $http, searchMode) {
        var geoCoder = this
        geoCoder.query = function (searchInput) {
            var deferred = $q.defer()
            if (typeof (searchMode.address) != "undefined" &&
                //          bug with a missing method "includes"
                //(searchMode.lastAddressSearch.includes(searchInput) || 
                //searchMode.lastFormattedAddress.includes(searchInput))) {

                (searchMode.lastAddressSearch.indexOf(searchInput) >= 0 ||
                    searchMode.lastFormattedAddress.indexOf(searchInput) >= 0)) {

                deferred.resolve(false)
            } else {
                geoCoder.sameAddress = false
                var url = "https://maps.googleapis.com/maps/api/geocode/json?address=" + searchInput + "&key=AIzaSyDCufJBM-6w0uYLjXtSHQW7BawJEsB4i8o&callback=JSON_CALLBACK"
                console.log(url)
                $http.get(url)
                    .success(function (data) {
                        console.log(data)
                        if (data.status == "ZERO_RESULTS") {
                            $ionicPopup.alert({
                                title: "No results!",
                                template: "The specified address/postcode was not found.<br>Try again or change the search method!"
                            });
                        } else {
                            deferred.resolve(data.results)
                        }
                    })
            }
            return deferred.promise
        }
    }])

//Sets the search mode
.service('searchMode', ['$ionicScrollDelegate', '$location', 'geoServ',
        function ($ionicScrollDelegate, $location, geoServ) {
        var searchMode = this
        searchMode.onchange = function (mode, inputElement, map) {
            searchMode.searchCoords = {}
            inputElement.value = null
            google.maps.event.clearListeners(map, 'click')
            if (searchMode.tapMarker) {
                searchMode.tapMarker.setMap(null)
            }

            if (mode == "mapTap") {
                $location.hash(map.getDiv().id)
                $ionicScrollDelegate.anchorScroll(true)
                google.maps.event.addListener(map, 'click', function (e) {
                    var tapCoords = {
                        lat: e.latLng.lat(),
                        lng: e.latLng.lng()
                    }
                    if (typeof (searchMode.tapMarker) == "undefined") {
                        searchMode.tapMarker = new google.maps.Marker({
                            position: tapCoords,
                            map: map,
                            icon: "img/blue-dot.png"
                        });
                    }
                    inputElement.value = tapCoords.lat + ", " + tapCoords.lng
                    searchMode.tapMarker.setPosition(tapCoords)
                    searchMode.tapMarker.setMap(map)
                })
            } else if (mode == "nearby") {
                if (geoServ.initCoords) {
                    inputElement.value = geoServ.initCoords.lat + ", " + geoServ.initCoords.lng
                }
            } else if (mode == "address") {
                if (typeof (searchMode.address) != "undefined") {
                    if (!inputElement.value) {
                        inputElement.value = searchMode.address.formatted_address
                    }
                }
            }
        }
    }])

//Bug fix for broken maps after window resizing
.service('mapResize', ['initMap', '$window',
        function (initMap, $window) {
        var mapResize = this
        angular.element($window).bind('resize', function () {
            mapResize.windowResized = true
            console.log("window resized")
            for (i = 0; i < initMap.maps.length; i++) {
                initMap.resizedMaps[i] = false
            }
        })
        mapResize.thisMap = function (tabIndex) {
            if (mapResize.windowResized == true) {
                if (initMap.resizedMaps[tabIndex] == false) {
                    google.maps.event.trigger(initMap.maps[tabIndex], 'resize')
                    initMap.resizedMaps[tabIndex] = true
                    console.log("map resized")
                }
            }
        }
    }])

//infowidows show/hide for found bus stops
.service('infoWindow', [
        function () {
        this.showFor = function (map, busStop, status) {
            if (status) {
                busStop.infowindow.open(map, busStop.marker)
            } else {
                busStop.infowindow.close()
            }
        }
    }])

//converting timestamps to readable date/time format
.service('timestamp', [
        function () {
        this.msec = function (ms) {
            if (isNaN(ms)) {
                ms = Date.now()
            }
            var dateString = new Date(ms).toLocaleString()
            var b = dateString.split(" ")
            for (i = 0; i < b.length; i++) {
                if (isNaN(b[i][0])) {
                    b.splice(i, 1)
                }
            }
            return (b.toString()).replace(/,/g, " ")
        }
    }])

//alert for no available info
.service('noInfo', ['$ionicPopup',
        function ($ionicPopup) {
        this.noBusesAlert = function () {
            $ionicPopup.alert({
                title: "No Information",
                template: "The reasons for missing information might be:<br>" +
                    "&nbsp;&nbsp;1. No services today<br>" +
                    "&nbsp;&nbsp;2. No services at this time<br>" +
                    "&nbsp;&nbsp;3. This bus is labelled as 'deleted' in NaPTAN's database<br>" +
                    "&nbsp;&nbsp;4. Connection fail"
            });
        }
    }])
