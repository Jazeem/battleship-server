var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var players = [];
var ships = [];

app.get('/', function(req, res){
	res.send('<h1>Hello world</h1>');
});

io.on('connection', function(socket){
	console.log('a user connected');
	
	socket.on('disconnect', function(){
		console.log('user disconnected');
	});
	
	if(players.length < 2){
		players.push(socket.id);
		if(players.length == 2)
			io.sockets.emit('gamestarted', 'new');
	}
	else
		socket.emit('gameover', 'roomfull');

	socket.on('shiparranged', function(data){
		console.log(data);
		playerShip = [];
		playerShip.push()
	});
});

http.listen(3000, function(){
	console.log('listening on *:3000');
});