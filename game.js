/**
 * This is the client's game implementation
 * game.js
 */

/**
 * io is the global io structure
 *     io.games is an associative array indexed by gameID
 *     Each entry is an associative array {
 *         gameID : string
 *         playerIDs : string array
 *         inProgress : bool
 *         finished : bool
 *         game = {
 *             playerOrder : string array
 *             currentDeck : int array
 *             cardsThrownOut : int array
 *             currentCard : int
 *             currentBid : int
 *             currentTurn : int
 *             foreach player in playerIDs = {
 *                 hand : int array
 *                 coins : int
 *             }
 *         }
 *     }
 */

/**
 * Players may:
 *     Connect : 'connect'
 *     Create a room : 'create'
 *     Join a room : 'join', msg.gameID
 *     Start a game : 'start'
 *         Pass : 'pass'
 *         Pick up a card : 'take'
 *     End a game : 'end'
 *     Leave a room : 'leave'
 */

exports.initGame = function(io, gameSocket) {
    // Client error problem reporting
    // Reports an error back to the client
    // The client has sent back an invalid option
    function problem(errorMessage) {
        gameSocket.emit('problem', {message : errorMessage});
    }

	gameSocket.on('create', msg => {
		let gameID = ((Math.random() * 1000) | 0).toString();
		
		if (gameSocket.gameID) { problem(`Already in game, gameID: ${gameSocket.gameID}`); }
		while (io.games[gameID]) { gameID = ((Math.random() * 1000) | 0).toString(); }

		io.games[gameID] = {
			gameID : gameID,
			playerIDs : [msg.username],
			inProgress : false,
			finished : false,
		};

		gameSocket.gameID = gameID;
		gameSocket.emit('created', { gameID : gameID, username : msg.username });

		gameSocket.join(gameID);
		gameSocket.emit('joined', { gameID : gameID, playerIDs : io.games[gameID].playerIDs });
	});
	
    gameSocket.on('join', msg => {	
		if ((!msg) || (!msg.gameID)) {
			problem('No gameID specified');
			return;
		}
		
		gameID = msg.gameID;
		if (!io.games[gameID]) {
			problem(gameID + ' does not match a gameID in session. Create a new game to start a new one'); 
			return;
		}
		if (gameSocket.gameID) {
			problem('Already in game, gameID: ' + gameSocket.gameID);
			return;
		}
		if (io.games[gameID].inProgress) {
			problem('Game has already started');
			return;
		}
		if (io.games[gameID].playerIDs.length >= 6) {
			problem('Game is already filled to max (6)');
			return;
		}
		if (io.games[gameID].playerIDs[msg.username]) {
			problem('Username is already taken');
			return;
		}

		gameSocket.gameID = gameID;
		io.games[gameID].playerIDs.push(msg.username);
		io.sockets.in(gameID).emit('newplayer', {username : msg.username});

		gameSocket.join(gameID);
		gameSocket.emit('joined', {
			gameID : gameID,
			username: msg.username,
			playerIDs : io.games[gameID].playerIDs})
	});

    // startGame is called when the user tries starting the game they are in
	function startGame(msg) {
		// Figure out which game room the socket is currently in
		gameID = gameSocket.gameID;
		// Throw error if
			// User is not in a game
			// The game has already been started
		if (!gameID) {
			problem('Not currently in a game. Create a new game to play');
			return;
		}
		if (!io.games[gameID]) {
			// Server side error!
			problem('Server is exploding');
			// console.log('Horrible Error, gameId not found in games list');
			return;
		}
		if (io.games[gameID].inProgress) {
			problem('Game has already started');
			return;
		}
		
		// Set the struct to start
		io.games[gameID].finished = false;
		io.games[gameID].inProgress = true;

		// Then set up that game struct
			// Shuffle the deck
			// Remove some cards (5)
			// Choose an order for players
		fullDeck = shuffleFullDeck();
		removedCards = fullDeck.splice(0,4);
		playerOrder = shuffle(io.games[gameID].playerIDs);
		game = {
			playerOrder : playerOrder,
			currentDeck : fullDeck,
			cardsThrownOut : removedCards,
			currentCard : fullDeck.pop(),
			currentBid : 0,
			currentTurn : 0,
		};
		// Add each player to the game
		for (var i = 0; i < game.playerOrder.length; i++) {
			game[game.playerOrder[i]] = {
				hand : [],
				coins : 8
			};
		}
		io.games[gameID].game = game;
		
		// Then let everyone in the room know that the game has started.
		io.sockets.in(gameID).emit('started', {
			playerOrder : game.playerOrder
		});
		// Let everyone know whose turn it is 
		io.sockets.in(gameID).emit('turn', {
			username : game.playerOrder[(game.currentTurn % game.playerOrder.length)],
			card : game.currentCard,
			bid : game.currentBid
		});
	}
    gameSocket.on('start', startGame);

	function takeCard(msg) {
		gameID = gameSocket.gameID;

		if (!gameID) {
			problem('Not in a game. Create a new game to start playing.');
			return;
		}
		if (!io.games[gameID]) {
			problem('Server error in takeCard')
			return;
		}
		if (!io.games[gameID].inProgress) {
			problem('Start the game in order to play');
			return;
		}
		if (io.games[gameID].finished) {
			problem('The Game is Finished');
			return;
		}

		game = io.games[gameID].game;
		if (!(msg.username == game.playerOrder[game.currentTurn % (game.playerOrder.length)])) {
			problem('Not your turn');
			return;
		}

		game[msg.username].hand.push(game.currentCard);
		game[msg.username].coins += game.currentBid;
		// Alert everyone
		io.sockets.in(gameID).emit('taken', {
			username : msg.username,
			card : game.currentCard,
			bid : game.currentBid
		});
		game.currentBid = 0;
		// Increment the turn once
		game.currentTurn += 1;
		if (game.currentDeck.length > 0) {
			game.currentCard = game.currentDeck.pop();
			// Let everyone know whose turn it is 
			io.sockets.in(gameID).emit('turn', {
				username : game.playerOrder[(game.currentTurn % game.playerOrder.length)],
				card : game.currentCard,
				bid : game.currentBid
			});
		} else {
			io.games[gameID].finished = true;
			io.games[gameID].inProgress = false;
			results = [];
			for (var i = 0; i < game.playerOrder.length; i++) {
				results[i] = {
					username : game.playerOrder[i], 
					hand : game[game.playerOrder[i]].hand, 
					score : scoreHand(game[game.playerOrder[i]].hand, game[game.playerOrder[i]].coins)
				};
			}
			
			io.sockets.in(gameID).emit('ended', {
				results : results
			});
		}
	}
    gameSocket.on('take', takeCard);

    // When the user passes a card
	function passCard(msg) {
		gameID = gameSocket.gameID;
		// Throw an error if
			// The user is not in a game
			// The game has not started
			// It is not the user's turn
			// The user does not have enough money to bid
			// The game is finished
		if (!gameID) {
			problem('Not in a game. Create a new game to start playing.');
			return;
		}
		if (!io.games[gameID]) {
			// console.log('Game not found, abort abort');
			return;
		}
		if (!io.games[gameID].inProgress) {
			problem('Start the game in order to play');
			return;
		}
		game = io.games[gameID].game;
		if (!(msg.username == game.playerOrder[game.currentTurn % (game.playerOrder.length)])) {
			problem('Not your turn');
			return;
		}
		if (game[msg.username].coins == 0) {
			problem('Not enough money to pass. You must take the card.');
			return;
		}
		if (io.games[gameID].finished) {
			problem('The Game is Finished');
			return;
		}

		// Otherwise
			// Take one money from the user and add it to the current bid
		game[msg.username].coins -= 1;
		game.currentBid += 1;
		game.currentTurn += 1;
		// Let everyone know that they've passed
		io.sockets.in(gameID).emit('passed', {
			username : msg.username,
			card : game.currentCard,
			bid : game.currentBid
		});
		io.sockets.in(gameID).emit('turn', {
			username : game.playerOrder[(game.currentTurn % game.playerOrder.length)],
			card : game.currentCard,
			bid : game.currentBid
		});
	}
    gameSocket.on('pass', passCard);
	
	function endGame(msg) {
		// Throw an error if
			// The user is not in a game
			// The game has not started
		gameID = gameSocket.gameID;
		if (!gameID) {
			problem('Not in a game so cannot end game');
			return;
		}
		if (!io.games[gameID]) {
			// console.log('Game not found, abort abort');
			return;
		}
		if (!io.games[gameID].inProgress) {
			problem('Game has not yet started. Cannot end game');
			return;
		}
		// End the game and 
		io.games[gameID].inProgress = false;
		// Let everyone know
		results = [];
		for (var i = 0; i < game.playerOrder.length; i++) {
			results[i] = {
				username : game.playerOrder[i], 
				hand : game[game.playerOrder[i]].hand, 
				score : scoreHand(game[game.playerOrder[i]].hand, game[game.playerOrder[i]].coins)
			};
		}
		// console.log(results);
		io.sockets.in(gameID).emit('ended', {
			results : results
		});
	}
    gameSocket.on('end', endGame);

    gameSocket.on('leave', msg => {
		gameID = gameSocket.gameID;
		if (!gameID) {
			problem('No game to leave');
			return;
		}
		if (!io.games[gameID]) { return; }
		if (io.games[gameID].inProgress) {
			problem('Cannot leave in the middle of a game');
			return;
		}
		// Remove the user from the player list
		index = io.games[gameID].playerIDs.indexOf(msg.username);
		io.games[gameID].playerIDs.splice(index, 1);
		// Leave the SocketIO room
		gameSocket.leave(gameID);
		// Remove flag on the user socket
		delete gameSocket.gameID;
		// Alert everyone in the game
		io.sockets.in(gameID).emit('playerleft', {username : msg.username});

		if (io.games[gameID].playerIDs.length == 0) {
			delete io.games[gameID];
		}
		// Let the client know
		gameSocket.emit('exited');
	});

	function disconnect() {
		gameID = gameSocket.gameID;
		if (!gameID) {
			// If the user is not in a game, we don't have to do anything
			return;
		}
		if (!io.games[gameID]) {
			// That's buggy but not game breaking. 
			// We have a gameID but its not recorded
			// console.log('Game not found, abort abort');
			return;
		}
		if (io.games[gameID].finished) {
			// Figure out what we want to do after a games done.
			gameSocket.emit('leave');
			// Test to see what the other players in game do after game ends 
			// and a player leaves
			return;
		}
		if (io.games[gameID].inProgress) {
			// Default to ending the game and displaying scores
			_ = endGame();
			gameSocket.emit('leave');
			return;
		}
	}
    gameSocket.on('disconnect', disconnect);
}

/**
 * Shuffle taken from StackOverflow
 * http://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
 */ 
function shuffle(array) {   
    var currentIndex = array.length, temporaryValue, randomIndex;    
    
    // While there remain elements to shuffle...   
    while (0 !== currentIndex) {      
			// Pick a remaining element...     
		randomIndex = Math.floor(Math.random() * currentIndex);     
		currentIndex -= 1;      
		// And swap it with the current element.     
		temporaryValue = array[currentIndex];     
		array[currentIndex] = array[randomIndex];     
		array[randomIndex] = temporaryValue;   
    }
    return array; 
}

function shuffleFullDeck() {
    // Create our deck
    start = 3;
    end = 35;
    deck = []
    for (var i = start; i <= end; i++) {
		deck.push(i);
    }
    return shuffle(deck);
}

function scoreHand(hand, moneys) {
	hand.sort((a,b) => parseInt(a) - parseInt(b));

	score = hand[0];
	for (var i = 1; i < hand.length; i++) {
		if (hand[i-1] != (hand[i] - 1)) {
			score += hand[i];
		}
	}

	return !hand || hand.length === 0
		? moneys
		: score - moneys;
}