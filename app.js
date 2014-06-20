(function() {
    var app = angular.module('quiz.io', []);

    app.factory('socket', function ($rootScope) {
        var socket = io.connect();
        return {
            on: function (eventName, callback) {
                socket.on(eventName, function () {
                    var args = arguments;
                    $rootScope.$apply(function () {
                        callback.apply(socket, args);
                    });
                });
            },
            emit: function (eventName, data, callback) {
                socket.emit(eventName, data, function () {
                    var args = arguments;
                    $rootScope.$apply(function () {
                        if (callback) {
                            callback.apply(socket, args);
                        }
                    });
                })
            }
        };
    });

    app.controller('QuizController', function($scope, socket) {
        var self = this;
        self.joined = false;

        self.join = function() {
            socket.emit('join', self.name);
        };

        socket.on('joined', function() {
            self.joined = true;
        });
    });
})();