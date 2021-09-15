angular.module('app.routes', [])

.config(function ($stateProvider, $urlRouterProvider) {

    // Ionic uses AngularUI Router which uses the concept of states
    // Learn more here: https://github.com/angular-ui/ui-router
    // Set up the various states which the app can be in.
    // Each state's controller can be found in controllers.js
    $stateProvider

    //load the tabs wrapper
        .state('tabsController', {
        url: '/tabsNav',
        templateUrl: 'templates/tabsController.html',
        abstract: true
    })

    //load the tracking tab
    .state('tabsController.tracking', {
        url: '/trackerPage',
        views: {
            'tab3': {
                templateUrl: 'templates/tracking.html',
                controller: 'trackingCtrl'
            }
        }
    })

    //load the journey planner
    .state('tabsController.journeyPlanner', {
        url: '/journeyPage',
        views: {
            'tab1': {
                templateUrl: 'templates/journeyPlanner.html',
                controller: 'journeyPlannerCtrl'
            }
        }
    })

    $urlRouterProvider.otherwise('/tabsNav/trackerPage')

});
