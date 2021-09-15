angular.module('app.controllers', [])

.controller('trackingCtrl', [
    //'$ionicSideMenuDelegate',
    '$scope',
    '$state',
    '$window',
    '$ionicScrollDelegate',
    '$ionicTabsDelegate',
    '$location',
    '$ionicPopup',
    '$q',
    '$http',
    'initMap',
    'geoServ',
    'mapResize',
    'queryApi',
    'infoWindow',
    'searchMode',
    'geoCoder',
    'noInfo',
    'timestamp', //declaration of dependencies list
    function (
        //$ionicSideMenuDelegate,
        $scope,
        $state,
        $window,
        $ionicScrollDelegate,
        $ionicTabsDelegate,
        $location,
        $ionicPopup,
        $q,
        $http,
        initMap,
        geoServ,
        mapResize,
        queryApi,
        infoWindow,
        searchMode,
        geoCoder,
        noInfo,
        timestamp //list of dependencies
) {
        var trackCtrl = this
        var thisTab = $ionicTabsDelegate.selectedIndex()
        var thisDomElement = document.getElementById("map")
        initMap.initIn(thisTab, thisDomElement)
        geoServ.currentLocation(thisTab)
            .then(function (initCoords) {
                $scope.initCoords = initCoords
                $scope.searchCoords = $scope.initCoords
                document.getElementById("trackingSearch").value = initCoords.lat + ", " + initCoords.lng
            })

        //default variables declaration
        var map = initMap.maps[thisTab]
        $scope.searchInput = $scope.searchMode = {}
        $scope.stopsRange = document.getElementById("stops-range").value
        $scope.searchMode.mode = "nearby"
        $scope.showStopsList = true

        //controller's operations for user interactions
        $scope.rangeChange = function (value) {
            $scope.stopsRange = value
        }
        $scope.searchModeChange = function (mode) {
            searchMode.onchange(mode, document.getElementById("trackingSearch"), map)
        }
        $scope.selectSuggestion = function (address) {
            searchMode.address = address
            searchMode.lastAddressSearch = $scope.searchInput.value
            $scope.searchInput.value = address.formatted_address
            searchMode.lastFormattedAddress = address.formatted_address
            $scope.searchCoords = address.geometry.location
            $scope.showSuggestions = false
            $scope.nearStops()
        }
        $scope.toggleStreamLocation = function () {
            if (this.streamLocation) {
                $scope.busForTracking = {}
                $scope.busForTracking.line = prompt("Which bus are you on?")
                $scope.busForTracking.trace = []
                if ($scope.busForTracking.line) {
                    var a = $scope.busForTracking.line.replace(/[^0-9]/g, "")
                    if (a.length) {
                        geoServ.trackLocation(thisTab)
                    } else {
                        $ionicPopup.alert({
                            title: "Wrong input",
                            template: "No numbers found in your input!"
                        });
                        this.streamLocation = false
                    }
                } else {
                    $ionicPopup.alert({
                        title: "Empty input",
                        template: "Please use numbers and optional letters!"
                    });
                    this.streamLocation = false
                }
            } else {
                navigator.geolocation.clearWatch(geoServ.watchID)
                if (geoServ.liveMarker) {
                    var marker = geoServ.liveMarker
                    var currentCoords = {
                        lat: marker.getPosition().lat(),
                        lng: marker.getPosition().lng()
                    }
                    for (i = 0; i < initMap.markers.length; i++) {
                        marker.setMap(null)
                    }
                }
            }
        }
        $scope.isBusesListShown = function (list) {
            if ($scope.shownBusesList) {
                return $scope.shownBusesList === list;
            } else {
                return false
            }
        }
        $scope.noInfoAlert = function () {
            noInfo.noBusesAlert()
        }
        var accordionInfoWindows = function (busStop) {
            if ($scope.isBusesListShown(busStop.busesList)) {
                $scope.shownBusesList = null;
                infoWindow.showFor(map, busStop, false)
            } else {
                $scope.shownBusesList = busStop.busesList
                infoWindow.showFor(map, busStop, true)
                for (var i = 0; i < $scope.busStopsList.length; i++) {
                    if (busStop.atcocode != $scope.busStopsList[i].atcocode) {
                        infoWindow.showFor(map, $scope.busStopsList[i], false)
                    }
                }
            }
        }
        var assignActiveTrace = function (busesList) {
            if ($scope.busForTracking) {
                var traceLineNumber = $scope.busForTracking.line.toLowerCase()
                for (i = 0; i < busesList.length; i++) {
                    var busLineNumber = busesList[i].line.toLowerCase()
                    if (traceLineNumber == busLineNumber) {
                        busesList[i].trace = true
                    } else {
                        busesList[i].trace = false
                    }
                }
            }
        }

        //requests to APIs
        $scope.geoCoder = function () {
            var searchInput = document.getElementById("trackingSearch").value
            geoCoder.query(searchInput)
                .then(function (suggestions) {
                    if (suggestions) {
                        $scope.suggestions = suggestions
                        $scope.showSuggestions = true
                        $state.go($state.current, {}, {
                            reload: true
                        });
                    } else {
                        $scope.selectSuggestion(searchMode.address)
                    }
                })
        }
        $scope.nearStops = function () {
            if ($scope.searchMode.mode != "address") {
                var latLng = document.getElementById("trackingSearch").value.split(",")
                $scope.searchCoords = {
                    lat: Number(latLng[0]),
                    lng: Number(latLng[1])
                }
            }
            var range = $scope.stopsRange
            queryApi.nearStops($scope.searchCoords, range, map)
                .then(function (busStopsList) {
                    $scope.busStopsList = busStopsList
                    map.setZoom(15)
                    map.setCenter($scope.searchCoords)
                    $location.hash("tracker-list")
                    $ionicScrollDelegate.anchorScroll(true)
                })
        }
        $scope.findBuses = function (busStop, map) {
            queryApi.findBuses(busStop, map)
                .then(function (busesList) {
                    assignActiveTrace(busesList)
                    busStop.busesList = busesList
                    $scope.shownBusesList = busesList
                    $state.go($state.current, {}, {
                        reload: true
                    });
                })
            infoWindow.showFor(map, busStop, true)
            accordionInfoWindows(busStop)
        }
        $scope.busRoute = function (bus, busStop) {

            $location.hash(map.getDiv().id)
            $ionicScrollDelegate.anchorScroll(true)

            if ($scope.wholeRoute) {
                $scope.wholeRoute.setMap(null)
            }

            var operator = bus.operator
            var line = bus.line
            var app_id = "928e6aca"
            var app_key = "aa747294d32b6f68b6a827ed7f79242f"
            var url = "https://transportapi.com/v3/uk/bus/route/" + operator + "/" + line + "/" + "/timetable.json?" + "app_id=" + app_id + "&app_key=" + app_key + "&callback=JSON_CALLBACK"

            console.log(url)

            $http.jsonp(url)
                .success(function (data) {
                    var stopsCoords = []
                    for (i = 0; i < data.stops.length; i++) {
                        stopsCoords.push({
                            lat: data.stops[i].latitude,
                            lng: data.stops[i].longitude
                        })
                    }
                    $scope.wholeRoute = new google.maps.Polyline({
                        path: stopsCoords,
                        geodesic: false,
                        strokeColor: "#0000ff",
                        strokeOpacity: 0.7,
                        strokeWeight: 4,
                        map: map
                    })
                })
                .error(function () {
                    $ionicPopup.alert({
                        title: "Error Drawing Whole Route!",
                        template: "Error retrieving the route for bus " + line + "<br>" +
                            "The resons could be:<br>" +
                            "&nbsp;&nbsp;1. Missing information for the time of request<br>" +
                            "&nbsp;&nbsp;2. You have chosen a request through NextBuses API"
                    });
                })
            if ($scope.busForTracking) {

                var trace = $scope.busForTracking.trace
                for (i = 0; i < trace.length; i++) {
                    trace[i].marker.setMap(null)
                }
                var traceLineNumber = $scope.busForTracking.line.toLowerCase()
                var busLineNumber = bus.line.toLowerCase()
                if (traceLineNumber == busLineNumber) {
                    $ionicPopup.alert({
                        title: "Live GPS Trace",
                        template: "There is available live GPS trace for line " + $scope.busForTracking.line
                    });
                    for (i = 0; i < trace.length; i++) {
                        trace[i].marker.setMap(map)
                    }
                    $scope.$on('traceMark:updated', function (event, data) {
                        data.marker.setMap(map)
                    })
                } else {
                    $scope.$on('traceMark:updated', function (event, data) {
                        data.marker.setMap(null)
                    })
                }
            }
        }

        //watchers
        $scope.$on('$ionicView.afterEnter', function () {
            mapResize.thisMap(thisTab) //bug fix for broken maps on resize
            if (geoServ.initCoords && $scope.searchMode.mode == "nearby") {
                document.getElementById("trackingSearch").value = geoServ.initCoords.lat + ", " + geoServ.initCoords.lng
            }
        });
        $scope.$watch('searchInput.value', function (newVal, oldVal) {
            if ($scope.searchMode.mode == "address" &&
                oldVal &&
                //!(oldVal.includes(newVal))) { - missing "includes" method for strings in Cordova 
                (oldVal.indexOf(newVal) >= 0)) {
                $scope.showSuggestions = false
                $scope.suggestions = []
            }
        })
        $scope.$on('traceMark:updated', function (event, data) {
            $scope.busForTracking.trace.push(data)
        })
}])



.controller('journeyPlannerCtrl', [
    '$scope',
    '$ionicTabsDelegate',
    '$window',
    'initMap',
    'geoServ',
    'mapResize', //declaration of dependencies list
    function (
        $scope,
        $ionicTabsDelegate,
        $window,
        initMap,
        geoServ,
        mapResize //list of dependencies
) {

        journeyCtrl = this
        var thisTab = $ionicTabsDelegate.selectedIndex()
        var thisDomElement = document.getElementById("map2")
        initMap.initIn(thisTab, thisDomElement)
        geoServ.currentLocation(thisTab)
        var map = initMap.maps[thisTab]
        $scope.$on('$ionicView.afterEnter', function () {
            mapResize.thisMap(thisTab)
            alert("This feature is under development. Click OK to go back to the Tracking tab")
            $ionicTabsDelegate.select(0);
        });
    }])
