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

    app.controller('QuizController', function(socket, $sce) {
        var self = this;

        self.name = '';
        self.joining = false;
        self.joined = false;
        self.participants = [];
        self.id = null;
        self.score = 0;

        self.question = {
            content: $sce.trustAsHtml('What is the value of <code>a</code> after executing <code>var a = 3;</code>?'),
            points: 50,
            answers: [{
                content: $sce.trustAsHtml('<code>null</code>')
            }, {
                content: $sce.trustAsHtml('<code>undefined</code>')
            }, {
                content: $sce.trustAsHtml('<code>3</code>')
            }, {
                content: $sce.trustAsHtml('<code>Infinity</code>')
            }]
        };

        socket.on('joined', function(id) {
            self.joining = false;
            self.joined = true;
            self.id = id;
        });

        socket.on('participants changed', function(participants) {
            self.participants = participants;
        });

        self.join = function() {
            self.joining = true;
            localStorage.setItem('name', self.name);
            socket.emit('join', self.name);
        };

        self.selectAnswer = function(answer) {
            self.selectedAnswer = answer;
        };

        self.isSelected = function(answer) {
            return self.selectedAnswer === answer;
        };

        if (localStorage.getItem('name')) {
            self.name = localStorage.getItem('name');
            self.join();
        }
    });
})();