var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var players = [];
var ships = {};
var currentShots = {};
var shotResults = [];
var shotRemaining = {}

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

var reset = function(){
	ships = {};
	currentShots = {};
	shotResults = [];
	shotRemaining = {};
}

var playerJoin = function(socket){
	if(players.length < 2){
		players.push(socket.id);
		shotRemaining[socket.id] = 6;
		console.log(players);
		if(players.length == 2)
			io.sockets.emit('gamestarted', 'new');
		else
			socket.emit('gamestarted', 'waiting');
	}
	else
		socket.emit('gameover', 'roomfull');
}

io.on('connection', function(socket){
	console.log('a user connected');

	socket.on('disconnect', function(){
		console.log('user disconnected');
		var index = players.indexOf(socket.id);
		if(index != -1){
			players.splice(index, 1);
			reset();
			if(players.length == 1){
				shotRemaining[players[0]] = 6;
				socket.broadcast.emit('gamestarted', 'waiting');
			}
		}
	});
	
	playerJoin(socket);

	socket.on('shiparranged', function(data){
		console.log(data);
		playerShips = [];
		shipLengths = [5, 4, 3, 3, 2];
		var j = 0;
		shipLengthSum = 0;
		for(var i = 0; i < shipLengths.length; i++){
			playerShip = [];
			shipLengthSum += shipLengths[i] * 2;
			for(;j < shipLengthSum;j += 2)
				playerShip.push([parseInt(data.charAt(j)), parseInt(data.charAt(j + 1)), 0]);
			playerShips.push(playerShip);
		}
		// console.log(playerShips.length);
		// console.log(playerShips);
		ships[socket.id]=playerShips;
		console.log(ships[socket.id]);
		if(Object.keys(ships).length == 1){
			socket.emit('arrange', 'waiting');
			console.log('waiting');
		}else{
			io.sockets.emit('arrange', 'done');
			console.log('done');
		}
	});

	socket.on('shotsfired', function(data){
		console.log('shotsfired', 'called');
		shotResults = [];
		var player, enemy;
		if(socket.id == players[0]){
			player = 0;
			enemy = 1;
		}
		else{
			player = 1;
			enemy = 0;
		}
		for(var i = 0; i < data.length; i+=2){
			checkHit(players[enemy], parseInt(data.charAt(i)), parseInt(data.charAt(i + 1)));
		}
		if(Object.keys(currentShots).length == 2)
			currentShots = {};
		currentShots[socket.id]=shotResults;
		if(Object.keys(currentShots).length == 1){
			console.log('fire', 'waiting');
			socket.emit('fire', 'waiting');
		}
		else{
			console.log(serializeShots(currentShots[players[0]])+shotRemaining[players[0]]);
			console.log(serializeShots(currentShots[players[1]]));

			socket.broadcast.emit('playerresult', serializeShots(currentShots[players[enemy]])+shotRemaining[players[enemy]]);
			socket.broadcast.emit('enemyresult', serializeShots(currentShots[socket.id]));
			socket.emit('playerresult', serializeShots(currentShots[socket.id])+shotRemaining[socket.id]);
			socket.emit('enemyresult', serializeShots(currentShots[players[enemy]]));
			if(shotRemaining[socket.id] == 0 && shotRemaining[players[enemy]] == 0){
				socket.emit('gameresult', 'tie');
				socket.broadcast.emit('gameresult', 'tie');
			} else if(shotRemaining[socket.id] == 0){
				socket.emit('gameresult', 'lose');
				socket.broadcast.emit('gameresult', 'win');
			} else if(shotRemaining[players[enemy]] == 0){
				socket.emit('gameresult', 'win');
				socket.broadcast.emit('gameresult', 'lose');
			}
		}
	});

	socket.on('rematch', function(data){
		if(players.length == 2){
			players = [];
			reset();
		}
		playerJoin(socket);
	});
});

var serializeShots = function(shots){
	var retVal = '';
	shots.forEach(function(grid){
		retVal += grid[0];
		retVal += grid[1];
		retVal += grid[2];
	});
	return retVal;
}

var checkSunk = function(id, ship){
	var hits = 0;
	ship.forEach(function(grid){
		if(grid[2] == 1)
			hits++;
	});
	if(hits == ship.length){
		ship.forEach(function(grid){
			grid[2] = 2;
			shotResults.push([grid[0], grid[1], 2]);
		})
		shotRemaining[id]--;
		if(ship.length == 5)
			shotRemaining[id]--;
	}
}

var checkHit = function(id, x, y){
	var hit = false;
	ships[id].forEach(function(ship){
		ship.forEach(function(grid){
			if(grid[0] == x && grid[1] == y){
				grid[2] = 1;
				shotResults.push([x, y, 1]);
				hit = true;
				checkSunk(id, ship);
			}
		})
	})
	if(!hit)
		shotResults.push([x, y, 0]);
}

http.listen(process.env.PORT || 3000, function(){
	console.log('listening on *:3000');
});