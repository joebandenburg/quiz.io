var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http, {
    pingTimeout: 1000,
    pingInterval: 1000
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
}, {
    content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse vitae egestas eros, at porttitor dolor. Sed eleifend vel arcu at egestas. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi aliquam aliquam imperdiet. Aliquam posuere, felis eu sagittis pharetra, mi tortor feugiat lectus, non luctus purus lorem a felis. Ut sed nisl a orci adipiscing dignissim. Integer ac orci egestas mi tempor mattis. Nam posuere et ante in tempus. Ut ac lorem fringilla, pharetra orci eget, imperdiet mi. Sed fringilla tellus eget aliquet luctus.',
    points: 0,
    correctAnswer: 0,
    answers: [
        'Pellentesque sollicitudin, leo ut porta pellentesque, erat urna ullamcorper magna, eu aliquam felis est ac massa. Donec egestas varius velit eu iaculis. In ut nulla eleifend ipsum varius posuere at eget enim. Cras ornare odio eget mi hendrerit interdum. In condimentum, arcu nec faucibus condimentum, neque turpis commodo magna, quis commodo ante ipsum vel arcu. Pellentesque accumsan et sapien vel tempor. Integer vitae molestie leo. Suspendisse eget purus vehicula, vehicula dui at, aliquam risus. Morbi pretium leo volutpat mi scelerisque consequat. Nullam et lectus neque.',
        'Quisque id lectus eu purus ultricies porttitor at at nisi. Quisque semper leo ut turpis laoreet porttitor. Fusce ac eleifend nibh. Nam convallis convallis blandit. Nam id nisi eu nibh condimentum volutpat. Donec nec nibh vitae erat fringilla vulputate et at nibh. Sed consequat lacus vel ligula scelerisque, at consequat lorem aliquet. Morbi varius sollicitudin quam, et pulvinar purus interdum quis. Integer facilisis ultricies quam, eget rutrum lacus malesuada id.',
        'Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Donec in lacus eu tellus commodo lacinia et id risus. Proin ornare orci at diam porttitor, ac venenatis ipsum pellentesque. Praesent scelerisque quis lectus et blandit. Ut vitae mattis neque, at varius tellus. Vivamus sit amet augue sit amet purus sollicitudin volutpat in id lorem. Duis feugiat turpis sit amet sapien euismod, quis euismod orci malesuada. Duis nec lectus nec mi tincidunt rhoncus. Suspendisse viverra vitae erat id sollicitudin.',
        'Fusce ultrices in risus ac elementum. Etiam tincidunt scelerisque augue ac faucibus. Integer vel vulputate nunc. In hac habitasse platea dictumst. Nulla facilisi. Proin congue quam quis elit pulvinar pellentesque. Suspendisse quis tellus ut neque commodo pellentesque. Fusce ullamcorper in elit vitae mollis. Nunc euismod diam tortor, sit amet condimentum quam vulputate vel. Nullam ac ipsum orci.'
    ]
}];

var leaderUuid;

var state = {
    participants: [],
    questionCount: questions.length,
    questionIndex: null,
    answerRevealed: false,
    showResults: false,
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
    socket.on('show results', function() {
        state.questionIndex++;
        state.question = null;
        state.showResults = true;
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