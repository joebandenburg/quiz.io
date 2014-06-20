var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res) {
    res.sendfile('index.html');
});

app.get('/app.js', function(req, res) {
    res.sendfile('app.js');
});

app.get('/app.css', function(req, res) {
    res.sendfile('app.css');
});

var participants = [];

var broadcastParticipants = function() {
    io.emit('participants changed', participants);
}

io.on('connection', function(socket) {
    console.log('a user connected');
    socket.on('join', function(name) {
        console.log('"' + name  + '" joined');
        participants.push({
            name: name,
            score: 0
        });
        broadcastParticipants();
        socket.emit('joined');
    });
});

http.listen(3000, function() {
    console.log('listening on *:3000');
});