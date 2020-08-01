var socket = io();
var id;

/** 
 * Global variables for the game itself
 */
var gameWidth = 1280;
var gameWidthC = gameWidth / 2;
var gameHeight = 800;
var gameHeightC = gameHeight/ 2;

var buttonWidth = 193;
var buttonHeight = 71;

var cardHeight = 180;
var cardWidth = cardHeight * .7;

var chipHeight = 100;
var chipWidth = chipHeight;

const usernameWidth = buttonWidth * 2;

/** 
 * Begin total game bounds
 */
var titleBlockX = 0;
var titleBlockY = 0;
var titleBlockWidth = gameWidth;
var titleBlockHeight = 80;

var turnTextBlockY = titleBlockY + titleBlockHeight;
var turnTextBlockX = 0;
var turnTextBlockWidth = gameWidth;
var turnTextBlockHeight = 30;

/**
 * Opponent Block
 */ 
var opponentBlockY = turnTextBlockY + turnTextBlockHeight;
var opponentBlockX = 0;
var opponentBlockWidth = gameWidth;
var opponentBlockHeight = 225;

var opponentSingleWidth;
var opponentIDHeight = 20;

var flippedCardXOffset = 10;
var flippedCardY = opponentBlockY + opponentIDHeight + 10;

var shownCardXOffset = 20;
var shownCardY = flippedCardY + shownCardXOffset;

/** 
 * Spacing for the current card elements in question
 */ 
var currentCardBlockY = opponentBlockY + opponentBlockHeight;
var currentCardBlockX = 0;
var currentCardBlockWidth = gameWidth;
var currentCardBlockHeight = 225;

var currentCardXC = currentCardBlockX + (currentCardBlockWidth / 2);
var currentCardYC = currentCardBlockY + (currentCardBlockHeight / 2);

var currentCardTextY = currentCardBlockY;
var currentCardTextX = 0;
var currentCardTextWidth = gameWidth - (currentCardXC + cardWidth/2);
var currentCardTextHeight = currentCardBlockHeight;

var currentChipTextY = currentCardBlockY;
var currentChipTextX = currentCardXC + cardWidth/2;
var currentChipTextWidth = 250;
var currentChipTextHeight = currentCardBlockHeight;

var currentChipXC = currentCardXC + chipWidth/2 + cardWidth/2 + currentChipTextWidth;
var currentChipYC = currentCardYC;

/** 
 * Spacing for our hand
 */ 
var ourHandBlockY = currentCardBlockY + currentCardBlockHeight;
var ourHandBlockX = 0;
var ourHandBlockWidth = gameWidth;
var ourHandBlockHeight = gameHeight - ourHandBlockY;
var ourHandBlockYC = ourHandBlockY + ourHandBlockHeight/2;

var yourChipTextWidth = 200;
var yourChipTextHeight = 50;
var yourChipTextX = gameWidth - yourChipTextWidth;
var yourChipTextY = ourHandBlockYC - (chipHeight + yourChipTextHeight)/2;

var yourChipXC = gameWidth - (yourChipTextWidth/2);
var yourChipYC = yourChipTextY + yourChipTextHeight + chipHeight/2;


// While in the waiting screen
var playersInGame = [];
var gameIDText;
var playerIDText;
var gameID;

function updatePlayerText() {
	var text = 'Players In Lobby:';
	for (var i = 0; i < playersInGame.length; i++) {
		text = text + '\n' + playersInGame[i].toString();
	}
	playerIDText.text = text;
	return;
}

function addPlayer(username) {
	playersInGame.push(username);
	updatePlayerText();
}

function removePlayer(playerID) {	
	var index = playersInGame.indexOf(playerID);
	if (index > -1) {
		playersInGame.splice(index, 1);
	} else {
		// console.log('WTF');
	}
	updatePlayerText();
}

// While the game is being played
var myCards = [];
var currentTurnText;
var players = [];
var currentCard;
var currentBid;
var playerBid;

/**
 * Items to destroy from the screen
 */
var toDestroy = [];

/**
 * Wipe the screen
 */
function wipeScreen() {
	for (var i = 0; i < toDestroy.length; i++) {
		toDestroy[i].destroy();
	}
	toDestroy = [];
	return;
}

/**
 * Create the game
 */ 
var game = new Phaser.Game(
	gameWidth, 
	gameHeight, 
	Phaser.AUTO, 
	'', 
	{ 
		preload: preload, 
		create: create, 
		update: update 
	}
);

function preload() {
	game.plugins.add(PhaserInput.Plugin);
	// Load images
	game.load.spritesheet('leave_game_button', '/public/leave_game_button_sprite_sheet.png', buttonWidth, buttonHeight);
	game.load.spritesheet('take_card_button', '/public/take_card_button_sprite_sheet.png', buttonWidth, buttonHeight);
	game.load.spritesheet('pass_card_button', '/public/pass_card_button_sprite_sheet.png', buttonWidth, buttonHeight);
	game.load.spritesheet('new_room_button', '/public/new_room_button_sprite_sheet.png', buttonWidth, buttonHeight);
	game.load.spritesheet('join_room_button', '/public/join_room_button_sprite_sheet.png', buttonWidth, buttonHeight);
	game.load.spritesheet('start_game_button', '/public/start_game_button_sprite_sheet.png', buttonWidth, buttonHeight);
	game.load.image('cardback', '/public/card_back.png');
	game.load.image('chip', '/public/chip_blue_top.png')
    // Scale the game to window size
    game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    game.scale.pageAlignHorizontally = true;
    game.scale.pageAlignVertically = true;
}

function create() {
	/** 
	 * Create the title of the game
	 */
	var style = { font: "50px Arial", fill: "#ffffff", boundsAlignH: "center", boundsAlignV: "middle" };
    var titleText = game.add.text(0, 0, "No Thanks! The Card Game", style);
	titleText.setTextBounds(titleBlockX, titleBlockY, titleBlockWidth, titleBlockHeight);
		
	/**
	 * Go to the Join Screen
	 */
	var _ = joinGameScreen();
}

/**
 * Draws Game Screens
 */
function joinGameScreen() {
	wipeScreen();
	
	const centerLoginLocation = game.world.centerX / 1.5;
	const centerButtonLocation = game.world.centerX / 1.2;
	const usernameField = game.add.inputField(centerLoginLocation, 100, {
		font: '40px Arial',
		fill: '#212121',
		fontWeight: 'bold',
		width: usernameWidth,
		padding: 8,
		borderWidth: 1,
		borderColor: '#000',
		borderRadius: 6,
		placeHolder: 'Username' });

	const onCreate = () => socket.emit('create', { gameID : gameIDField.value, username: usernameField.value});
	const onJoin = () => socket.emit('join', { gameID : gameIDField.value, username: usernameField.value});

	const createButton = game.add.button(centerButtonLocation, 200, 'new_room_button', onCreate, this, 2, 1, 0);
	const joinButton = game.add.button(centerButtonLocation, 300, 'join_room_button', onJoin, this, 2, 1, 0);
	const gameIDField = game.add.inputField(centerButtonLocation + buttonWidth, 300, {
		font: '40px Arial',
		fill: '#212121',
		fontWeight: 'bold',
		width: buttonWidth,
		padding: 8,
		borderWidth: 1,
		borderColor: '#000',
		borderRadius: 6,
		placeHolder: 'GameID',
	});
	
	toDestroy.push(usernameField);
	toDestroy.push(createButton);
	toDestroy.push(gameIDField);
	toDestroy.push(joinButton);
}

function startGameScreen() {
	wipeScreen();

	const startButton = game.add.button(game.world.centerX - buttonWidth, 300, 'start_game_button', () => socket.emit('start'), this, 2, 1, 0);
    const leaveButton = game.add.button(game.world.centerX, 300, 'leave_game_button', () => socket.emit('leave'), this, 2, 1, 0);
	
	const gameTextstyle = { font: "20px Arial", fill: "#ffffff", boundsAlignH: "right", boundsAlignV: "middle" };
    const gameIDText = game.add.text(0, 0, "GameID: " + gameID.toString(), gameTextstyle);
	gameIDText.setTextBounds(titleBlockX, titleBlockY, titleBlockWidth, titleBlockHeight);

	const playerIDstyle = { font: "20px Arial", fill: "#ffffff", boundsAlignH: "left", boundsAlignV: "middle" };
	playerIDText = game.add.text(0, 0, '', playerIDstyle);
	playerIDText.setTextBounds(titleBlockX, 120, titleBlockWidth, titleBlockHeight);
	
	toDestroy.push(startButton);
	toDestroy.push(leaveButton);
	toDestroy.push(gameIDText);
	toDestroy.push(playerIDText);
}



/**
 * Draws the card centered at the x, y coordinates
 */ 
function drawCard(x, y, num) {	
	var graphics = game.add.graphics();
	graphics.lineStyle(1, 0x000000, 1);
	graphics.beginFill(0xFFFFFF, 1);
    var cardBackground = graphics.drawRect(x - (cardWidth/2), y - (cardHeight/2), cardWidth, cardHeight);
	graphics.endFill();
    
	var style = { font: "50px Arial", fill: "#000000", boundsAlignH: "center", boundsAlignV: "middle" };
    var centerText = game.add.text(0, 0, num.toString(), style);
	centerText.setTextBounds(x - (cardWidth/2), y - (cardHeight/2), cardWidth, cardHeight);
	
	var style = { font: "24px Arial", fill: "#000000", boundsAlignH: "left", boundsAlignV: "top" };
    var topText = game.add.text(0, 0, num.toString(), style);
	topText.setTextBounds(x - (cardWidth/2) + 2, y - (cardHeight/2), cardWidth, cardHeight);

	var style = { font: "24px Arial", fill: "#000000", boundsAlignH: "right", boundsAlignV: "bottom" };
    var bottomText = game.add.text(0, 0, num.toString(), style);
	bottomText.setTextBounds(x - (cardWidth/2), y - (cardHeight/2), cardWidth, cardHeight);
	
	var card = game.add.group();
	card.add(cardBackground);
	card.add(centerText);
	card.add(topText);
	card.add(bottomText);
	
	toDestroy.push(card);
	return card;
}

function drawChip(x, y, num) {
	var chipImage = game.add.sprite(x - (chipWidth/2), y - (chipHeight/2), 'chip');
	chipImage.width = chipWidth;
	chipImage.height = chipHeight;
	
	var style = { font: "50px Arial", fill: "#ffffff", boundsAlignH: "center", boundsAlignV: "middle" };
    var chipText = game.add.text(0, 0, num.toString(), style);
	chipText.setTextBounds(x - (chipWidth/2), y - (chipHeight/2), chipWidth, chipHeight);

	var chip = game.add.group();
	chip.add(chipImage);
	chip.add(chipText);
	chip.updateAmount = function(newValue) {
		chipText.text = newValue.toString();
		return;
	};

	toDestroy.push(chip);
	return chip;
}

function update() {
	
}

/** 
 * Occurs on server triggers
 */
var players = {}
function onStart(playerOrder) {
	numplayers = playerOrder.length();
	// Draw the appropriate names above the spot as well as their chips
	playerBoxWidth = gameWidth / (numplayers-1);
}

/**
 * These are the messages that we send to the server
 */

function onPass() {
	socket.emit('pass');
}

function onTake() {
	socket.emit('take');
}

/**
 *
 */		
var displayText; // For notifications
var displayTextTimer;
function timerCallback() {
	displayText.destroy(); 
	displayText = null;
}

function display(string) {
	if (displayText) {
		displayText.text = displayText.text + '\n' + string;
		_ = clearTimeout(displayTextTimer);
		displayTextTimer = setTimeout(timerCallback, 2000);
		game.world.bringToTop(displayText);
	} else {
		var style = { font: "32px Arial", fill: "#b20000", backgroundColor: "#f86969" , boundsAlignH: "center", boundsAlignV: "middle" };    	
		displayText = game.add.text(0, 0, string, style);
		displayText.setTextBounds(0, 0, game.width, game.height);
		displayTextTimer = setTimeout(timerCallback, 2000);
		game.world.bringToTop(displayText);
	}
	// $('#messages').append($('<li>').text(string));
	return;
}

 
$('#chat').submit(function(){
    socket.emit('chat message', $('#m').val());
    $('#m').val('');
    return false;
});

socket.on('newplayer', msg => addPlayer(msg.username));
socket.on('problem', msg => display('Error: ' + msg.message));
socket.on('created', msg => { id = msg.username; });
socket.on('turn', msg => displayTurn(msg.playerID, msg.card));
socket.on('taken', msg => taken(msg.playerID, msg.card, msg.bid));
socket.on('passed', msg => passed(msg.playerID));
socket.on('ended', msg => ended(msg));
socket.on('chat message', msg => display(msg));

socket.on('joined', msg => {
	gameID = msg.gameID;
	id = msg.username;
	startGameScreen();
	for (var i = 0; i < msg.playerIDs.length; i++) {
		addPlayer(msg.playerIDs[i]);
	}
});

socket.on('playerleft', msg => {
	display(msg.playerID + ' has left the game room');
	removePlayer(msg.playerID);
});

socket.on('exited', msg => {
	playersInGame = [];
	joinGameScreen();
});

socket.on('started', msg => {
	/**
	 * Game screen should display everyone's money, ids, card count, card back
	 */
	// Organize the player order correctly
	var player_index = msg.playerOrder.indexOf(id);
	var before = msg.playerOrder.slice(0, player_index);
	var after = msg.playerOrder.slice(player_index);
	var order = after.concat(before);
	playersInGame = order;
	
	gameStruct = {
		playerStruct : {},
		playerHand : [],
		playerMoney : 8,
		centerMoney : 0,
	};
	
	gameScreen();
});

var gameStruct = {
	playerStruct : {},
	playerHand : [],
	playerMoney : 8,
	centerMoney : 0,
};

function drawOpponents() {
	var opponents = [];
	for (var i = 0; i < playersInGame.length; i++) {
		if (playersInGame[i] !== id) {
			opponents.push(playersInGame[i]);
		}
	}
	
	if (opponents.length < 2) {
		var opponentSingleWidth = 350;
	} else {
		var opponentSingleWidth = gameWidth / opponents.length;
	}
	
	for (var i = 0; i < opponents.length; i++) {
		var playerID = opponents[i];
		// Player ID Texts
		var style = { font: "20px Arial", fill: "#ffffff", boundsAlignH: "center", boundsAlignV: "middle" };
		gameStruct.playerStruct[playerID].text = game.add.text(0, 0, playerID, style);
		gameStruct.playerStruct[playerID].text.setTextBounds(opponentSingleWidth * i, opponentBlockY, 350, opponentIDHeight);
		
		gameStruct.playerStruct[playerID].cardback = game.add.sprite(flippedCardXOffset + opponentSingleWidth * i, flippedCardY, 'cardback');
		gameStruct.playerStruct[playerID].cardback.width = cardWidth;
		gameStruct.playerStruct[playerID].cardback.height = cardHeight;
		gameStruct.playerStruct[playerID].flippedCard = (function() {
			var thisID = playerID
			var XX = flippedCardXOffset + shownCardXOffset + cardWidth/2 + opponentSingleWidth * i;
			return function(card) {
				if (gameStruct.playerStruct[thisID].flippedC) {
					gameStruct.playerStruct[thisID].flippedC.destroy();
				}
				this.flippedC = drawCard(XX, shownCardY + cardHeight/2, card);
				return;
			}
		})();
		
		gameStruct.playerStruct[playerID].chips = drawChip(flippedCardXOffset + shownCardXOffset + cardWidth + 10 + chipWidth/2 + opponentSingleWidth * i, shownCardY + cardHeight/2 + 30, 8)
		
		var style = { font: "20px Arial", fill: "#ffffff", boundsAlignH: "center", boundsAlignV: "middle" };
		gameStruct.playerStruct[playerID].cardText = game.add.text(0, 0, "0 cards in hand", style);
		gameStruct.playerStruct[playerID].cardText.setTextBounds(opponentSingleWidth * i + flippedCardXOffset + cardWidth, flippedCardY, 200, 50);	
	}
}

// TODO
function gameScreen() {
	var _ = wipeScreen();
	/** 
	 * Set up the structure for the game
	 */
	for (var i = 0; i < playersInGame.length; i++) {
		gameStruct.playerStruct[playersInGame[i]] = {
			handSize : 0,
			lastCard : null,
			money : 8,
		};
	}
	/**
	 * Draw the center portion
	 */
	gameStruct.centerChip = drawChip(currentChipXC, currentChipYC, 0);
	var style = { font: "32px Arial", fill: "#ffffff", boundsAlignH: "right", boundsAlignV: "middle" };
    gameStruct.centerChipText = game.add.text(0, 0, "Current Pot:", style);
	gameStruct.centerChipText.setTextBounds(currentChipTextX, currentChipTextY, currentChipTextWidth, currentChipTextHeight);

    gameStruct.centerCardText = game.add.text(0, 0, "Current Card:", style);
	gameStruct.centerCardText.setTextBounds(currentCardTextX, currentCardTextY, currentCardTextWidth, currentCardTextHeight);
	
	var style = { font: "30px Arial", fill: "#ffffff", boundsAlignH: "center", boundsAlignV: "middle" };
    gameStruct.playerChipText = game.add.text(0, 0, "Your Chips:", style);
	gameStruct.playerChipText.setTextBounds(yourChipTextX, yourChipTextY, yourChipTextWidth, yourChipTextHeight);	
	
	gameStruct.playerChip = drawChip(yourChipXC, yourChipYC, 8);

	drawOpponents();
	
	return;
}

function displayTurn(playerID, currentCard) {
	
	if (!gameStruct.turnText) {
		var style = { font: "30px Arial", fill: "#ffffff", boundsAlignH: "center", boundsAlignV: "middle" };
		gameStruct.turnText = game.add.text(0, 0, '', style);
		gameStruct.turnText.setTextBounds(turnTextBlockX, turnTextBlockY, turnTextBlockWidth, turnTextBlockHeight);	
	} 
	
	if (playerID == id) {
		gameStruct.turnText.text = "It is your turn now!";
		// Display buttons		
		gameStruct.takeButton = game.add.button(100, currentCardYC - buttonHeight, 'take_card_button', onTake, this, 2, 1, 0);
		gameStruct.passButton = game.add.button(100, currentCardYC , 'pass_card_button', onPass, this, 2, 1, 0);
	} else {
		gameStruct.turnText.text = "It is " + playerID.toString() + "'s turn";
		// Destroy buttons
		if (gameStruct.takeButton) {
			gameStruct.takeButton.destroy();
		}
		if (gameStruct.passButton) {
			gameStruct.passButton.destroy();
		}
	}
		
	gameStruct.currentCard = drawCard(currentCardXC, currentCardYC, currentCard);
	return;
}

function displayHand() {
	gameStruct.playerHand.sort(function(a, b){return parseInt(a)-parseInt(b)});
	/**
	 * Player's hand
	 */
	for (var i = 0; i < gameStruct.playerHand.length; i++) {
		var card = drawCard(30 * i + cardWidth/2 + 50, ourHandBlockYC, gameStruct.playerHand[i]);
	}

}

function taken(playerID, cardTaken, bidTaken) {
	if (playerID == id) {
		// Add the card to our hand
		gameStruct.playerHand.push(cardTaken);
		displayHand();
		gameStruct.playerMoney += bidTaken;
		gameStruct.playerChip.updateAmount(gameStruct.playerMoney);
	} else {
		gameStruct.playerStruct[playerID].flippedCard(cardTaken);
		gameStruct.playerStruct[playerID].handSize += 1;
		gameStruct.playerStruct[playerID].cardText.text = gameStruct.playerStruct[playerID].handSize + " cards in hand";
		gameStruct.playerStruct[playerID].money += bidTaken;
		gameStruct.playerStruct[playerID].chips.updateAmount(gameStruct.playerStruct[playerID].money);
	}
	gameStruct.centerMoney = 0;
	gameStruct.centerChip.updateAmount(0);
	gameStruct.currentCard.destroy();
}

function passed(playerID) {
	if (playerID == id) {
		gameStruct.playerMoney -= 1;
		gameStruct.playerChip.updateAmount(gameStruct.playerMoney);
	} else {
		gameStruct.playerStruct[playerID].money -= 1;
		gameStruct.playerStruct[playerID].chips.updateAmount(gameStruct.playerStruct[playerID].money);
	}
	gameStruct.centerMoney += 1;
	gameStruct.centerChip.updateAmount(gameStruct.centerMoney);
}


function ended(msg) {
	// WIPE EVERYTHING
	if (gameStruct.takeButton) {
		gameStruct.takeButton.destroy();
	}
	if (gameStruct.passButton) {
		gameStruct.passButton.destroy();
	}
	if (gameStruct.turnText) {
		gameStruct.turnText.destroy();
	}
	if (gameStruct.centerChip) {
		gameStruct.centerChip.destroy();
	}
	if (gameStruct.currentCard) {
		gameStruct.currentCard.destroy();
	}
	if (gameStruct.centerCardText) {
		gameStruct.centerCardText.destroy();
	}
	if (gameStruct.centerChipText) {
		gameStruct.centerChipText.destroy();
	}
	if (gameStruct.playerChipText){
		gameStruct.playerChipText.destroy();
	}
	
	for (var i = 0; i < playersInGame.length; i++) {
		var playerID = playersInGame[i];
		if (playerID != id) {
			if (gameStruct.playerStruct[playerID].text) {
				gameStruct.playerStruct[playerID].text.destroy();
			}
			if (gameStruct.playerStruct[playerID].cardback) {
				gameStruct.playerStruct[playerID].cardback.destroy();
			}
			if (gameStruct.playerStruct[playerID].flippedC) {
				gameStruct.playerStruct[playerID].flippedC.destroy();
			}
			if (gameStruct.playerStruct[playerID].chips) {
				gameStruct.playerStruct[playerID].chips.destroy();
			}
			if (gameStruct.playerStruct[playerID].cardText) {
				gameStruct.playerStruct[playerID].cardText.destroy();
			}
		}
	}
	
	// Redraw the start
	_ = startGameScreen();
	_ = updatePlayerText();
	// Display scores
	var text = "Game ended! \n Lower Score is Better:";
	for (var i = 0; i < msg.results.length; i++) {
		if (msg.results[i].playerID == id) {
			text = text + "\n" + "You" + " Scored " + msg.results[i].score.toString();
		} else {
			text = text + "\n" + msg.results[i].playerID + " Scored " + msg.results[i].score.toString();
		}
	}
	var style = { font: "32px Arial", fill: "#ffffff", boundsAlignH: "center", boundsAlignV: "middle" };
    var scoreText = game.add.text(0, 0, text, style);
	scoreText.setTextBounds(titleBlockX, 300, titleBlockWidth, 300);
	toDestroy.push(scoreText);
	return;
}
