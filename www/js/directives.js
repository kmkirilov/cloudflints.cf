angular.module('app.directives', [])

// ArTiSTiX's workaround for side menu + range drag conflist
.directive('range', function rangeDirective() {
    return {
        restrict: 'C',
        link: function (scope, element, attr) {
            element.bind('touchstart mousedown', function (event) {
                event.stopPropagation();
                event.stopImmediatePropagation();
            });
        }
    };
});
