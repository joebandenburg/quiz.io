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

    app.controller('QuizController', function(socket) {
        var self = this;

        self.name = '';
        self.joining = false;
        self.joined = false;

        socket.on('joined', function() {
            self.joining = false;
            self.joined = true;
        });

        self.join = function() {
            self.joining = true;
            localStorage.setItem('name', self.name);
            socket.emit('join', self.name);
        };

        if (localStorage.getItem('name')) {
            self.name = localStorage.getItem('name');
            self.join();
        }
    });
})();