(function() {
    var app = angular.module('quiz.io', []);

    app.factory('socket', function ($rootScope) {
        var socket = io();
        return {
            socket: socket,
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

    app.filter('ordinal', function() {
        return function(input) {
            var s=["th","st","nd","rd"],
                v=input%100;
            return input+(s[(v-20)%10]||s[v]||s[0]);
        }
    });

    var createUUID = function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    };

    app.controller('QuizController', function(socket, $sce) {
        var self = this;

        self.name = '';
        self.loading = false;
        self.state = {
            participants: []
        };
        self.participant = null;
        self.selectedAnswer = null;

        var uuid;
        if (localStorage.getItem('uuid')) {
            uuid = localStorage.getItem('uuid');
        } else {
            uuid = createUUID();
            localStorage.setItem('uuid', uuid);
        }

        socket.on('state changed', function(state) {
            self.loading = false;
            var questionChanged = (self.state.questionIndex !== state.questionIndex);
            self.state = state;
            self.participant = state.participants.filter(function(participant) {
                return participant.uuid === uuid;
            })[0];
            if (self.participant) {
                if (questionChanged || self.participant.selectedAnswer !== null) {
                    self.selectedAnswer = self.participant.selectedAnswer;
                }
            }
            if (self.state.question) {
                self.state.question.content = $sce.trustAsHtml(self.state.question.content);
                self.state.question.answers = self.state.question.answers.map(function(answer) {
                    return $sce.trustAsHtml(answer);
                });
            }
        });

        socket.on('connect', function() {
            self.loading = true;
            socket.emit('bootstrap', uuid);
        });

        socket.on('reconnect', function() {
            self.loading = true;
            self.participant = null;
            socket.emit('bootstrap', uuid);
        });

        socket.on('disconnect', function() {
            self.loading = true;
        });

        self.join = function() {
            self.loading = true;
            localStorage.setItem('name', self.name);
            socket.emit('join', {
                name: self.name,
                uuid: uuid
            });
        };

        self.getNormalParticipants = function() {
            var normalParticipants = self.state.participants.filter(function(participant) {
                return !participant.isLeader;
            });
            normalParticipants.sort(function(a, b) {
                if (b.score !== a.score) {
                    return b.score - a.score;
                } else {
                    if (a.name > b.name) {
                        return 1;
                    }
                    if (a.name < b.name) {
                        return -1;
                    }
                    return 0;
                }
            });
            return normalParticipants;
        };

        self.isLeader = function() {
            if (self.participant) {
                return self.participant.isLeader;
            } else {
                return false;
            }
        };

        self.nextQuestion = function() {
            socket.emit('next question');
        };

        self.revealAnswers = function() {
            socket.emit('update scores');
        };

        self.showResults = function() {
            socket.emit('show results');
        };

        self.canSelectAnswer = function() {
            return !self.isLeader() && self.participant && self.participant.selectedAnswer === null;
        };

        self.selectAnswer = function(answer) {
            if (self.canSelectAnswer()) {
                self.selectedAnswer = answer;
            }
        };

        self.confirmAnswer = function() {
            socket.emit('answer', self.selectedAnswer);
        };

        self.wasCorrectAnswer = function() {
            return self.state.answerRevealed && self.selectedAnswer === self.state.question.correctAnswer;
        };

        self.wasWrongAnswer = function() {
            return self.state.answerRevealed && self.selectedAnswer !== self.state.question.correctAnswer;
        };

        self.isAnswerActive = function(answer) {
            return self.selectedAnswer === answer || (self.isLeader() && self.state.answerRevealed && answer === self.state.question.correctAnswer);
        };

        self.isAnswerCorrect = function(answer) {
            return self.isAnswerActive(answer) && self.wasCorrectAnswer();
        };

        self.isAnswerWrong = function(answer) {
            return self.isAnswerActive(answer) && self.wasWrongAnswer();
        };

        self.answeredParticipants = function() {
            return self.state.participants.filter(function(participant) {
                return participant.selectedAnswer !== null;
            }).length;
        };

        self.answeredParticipantsPercentage = function() {
            return (self.answeredParticipants() / (self.state.participants.length - 1) * 100) + '%';
        };

        self.hasAllParticipantsAnswered = function() {
            return self.answeredParticipants() === self.state.participants.length - 1;
        };

        self.questionsPercentage = function() {
            return ((self.state.questionIndex / self.state.questionCount) * 100) + '%';
        };

        if (localStorage.getItem('name')) {
            self.name = localStorage.getItem('name');
        }
    });
})();