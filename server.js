var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http, {
    pingTimeout: 500,
    pingInterval: 500
});

app.get('/', function(req, res) {
    res.sendfile('index.html');
});

app.get('/app.js', function(req, res) {
    res.sendfile('app.js');
});

app.get('/app.css', function(req, res) {
    res.sendfile('app.css');
});

http.listen(3000, function() {
    console.log('listening on *:3000');
});

var questions = [{
    content: 'What is the capital of France?',
    points: 10,
    correctAnswer: 2,
    answers: [
        'London',
        'Earth',
        'Paris',
        'Spain'
    ]
}, {
    content: 'What is the capital of Russia?',
    points: 20,
    correctAnswer: 1,
    answers: [
        'Saint Petersburg',
        'Moscow',
        'Kiev',
        'Germany'
    ]
}, {
    content: 'What is <code>2 * 2 * 2 * 2</code>?',
    points: 20,
    correctAnswer: 2,
    answers: [
        '<code>8</code>',
        '<code>12</code>',
        '<code>16</code>',
        '<code>32</code>'
    ]
}, {
    content: 'Guybrush Threepwood is a character from which adventure video game series?',
    points: 50,
    correctAnswer: 0,
    answers: [
        'Monkey Island',
        'Sam &amp; Max',
        'Grim Fandango',
        'Maniac Mansion'
    ]
}];

var leaderUuid;

var state = {
    participants: [],
    questionCount: questions.length,
    questionIndex: null,
    answerRevealed: false,
    question: null
};

var broadcastState = function() {
    io.emit('state changed', state);
};

io.on('connection', function(socket) {
    var participant;
    console.log('new connection');
    socket.on('bootstrap', function(uuid) {
        var matchingParticipants = state.participants.filter(function(participant) {
            return (participant.uuid === uuid);
        });
        if (matchingParticipants.length === 1) {
            participant = matchingParticipants[0];
            console.log('"' + participant.name  + '" (' + participant.uuid + ') rejoined');
            participant.connected = true;
        }
        broadcastState();
    });
    socket.on('join', function(user) {
        console.log('"' + user.name  + '" (' + user.uuid + ') joined');
        if (!leaderUuid) {
            leaderUuid = user.uuid;
        }
        participant = {
            uuid: user.uuid,
            isLeader: user.uuid === leaderUuid,
            name: user.name,
            score: 0,
            connected: true,
            selectedAnswer: null
        };
        state.participants.push(participant);
        broadcastState();
    });
    socket.on('next question', function() {
        state.answerRevealed = false;
        state.participants.forEach(function(participant) {
            participant.selectedAnswer = null;
        });
        if (state.questionIndex === null) {
            state.questionIndex = 0;
        } else {
            state.questionIndex++;
        }
        state.question = questions[state.questionIndex];
        broadcastState();
    });
    socket.on('answer', function(answerIndex) {
        participant.selectedAnswer = answerIndex;
        broadcastState();
    });
    socket.on('update scores', function() {
        state.participants.forEach(function(participant) {
            if (participant.selectedAnswer === state.question.correctAnswer) {
                participant.score += state.question.points;
            }
        });
        state.answerRevealed = true;
        broadcastState();
    });
    socket.on('disconnect', function() {
        if (participant) {
            console.log('"' + participant.name + '" (' + participant.uuid + ') disconnected');
            participant.connected = false;
            broadcastState();
        }
    });
});