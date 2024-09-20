// js/main.js

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 500 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let bozo;
let tokens;
let cursors;
let score = 0;
let totalTokens = 0;
const evolutionThreshold = 8; // Updated threshold to 800 tokens
let evolutionStage = 0;
let bozoTextures = [];
let tokenSpawner;
let logo;
let ground;
let timerText;
let startTime;
let gameEnded = false;
let shareButton;
let tokenSpeed = 150; // Initial token speed
let isPlaying = false; // Flag to indicate if the game is active

function preload () {
    // Load Bozo images for evolution stages
    this.load.image('bozo_0', 'assets/bozo_0.png'); // Initial Bozo
    this.load.image('bozo_1', 'assets/bozo_1.png'); // Evolved Bozo Stage 1
    this.load.image('bozo_2', 'assets/bozo_2.png'); // Evolved Bozo Stage 2
    this.load.image('bozo_3', 'assets/bozo_3.png'); // Final Bozo Stage
    
    // Load logo image
    this.load.image('logo', 'assets/logo.png'); // Replace with your logo file
}

function create () {
    // Set solid color background
    this.cameras.main.setBackgroundColor('#1E90FF'); // Dodger Blue
    
    // Define Bozo evolution stages with consistent scale
    bozoTextures = [
        { key: 'bozo_0', scale: 0.5 }, // Initial Bozo
        { key: 'bozo_1', scale: 0.5 }, // Evolved Bozo Stage 1
        { key: 'bozo_2', scale: 0.5 }, // Evolved Bozo Stage 2
        { key: 'bozo_3', scale: 0.5 }  // Final Bozo Stage
    ];
    
    // Create Bozo with the initial texture and scale
    bozo = this.physics.add.sprite(100, 450, bozoTextures[evolutionStage].key);
    bozo.setCollideWorldBounds(true);
    bozo.setScale(bozoTextures[evolutionStage].scale);
    bozo.setData('speed', 200); // Increased speed
    
    // Create ground using Phaser's physics system
    ground = this.physics.add.staticGroup();
    
    // Create a simple rectangle for the ground
    const groundGraphics = this.add.graphics();
    groundGraphics.fillStyle(0x654321, 1); // Brown color
    groundGraphics.fillRect(0, 550, 800, 50); // x, y, width, height
    groundGraphics.generateTexture('ground', 800, 50);
    groundGraphics.destroy();
    
    // Add the ground to the static group
    ground.create(400, 580, 'ground').setScale(1).refreshBody();
    
    // Create tokens group
    tokens = this.physics.add.group();
    
    // Create the token texture as a yellow circle
    const tokenSize = 30;
    const tokenGraphics = this.add.graphics();
    tokenGraphics.fillStyle(0xFFD700, 1); // Yellow color
    tokenGraphics.fillCircle(tokenSize / 2, tokenSize / 2, tokenSize / 2);
    tokenGraphics.generateTexture('token', tokenSize, tokenSize);
    tokenGraphics.destroy();
    
    // Add collisions between tokens and ground
    this.physics.add.collider(tokens, ground, (token, ground) => {
        // When a token hits the ground, destroy it
        token.destroy();
    });
    
    // Overlap between Bozo and tokens
    this.physics.add.overlap(bozo, tokens, collectToken, null, this);
    
    // Input events
    cursors = this.input.keyboard.createCursorKeys();
    
    // Score Text
    scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#ffffff' });
    
    // Timer Text
    timerText = this.add.text(16, 50, 'Time: 0s', { fontSize: '32px', fill: '#ffffff' });
    // Timer will start after countdown
    
    // Create Logo
    createLogo(this);
    
    // Create Countdown Elements
    createCountdown(this);
}

function update () {
    if (!isPlaying || gameEnded) return; // Only update if the game is active and not ended
    
    // Retrieve Bozo's current speed
    const speed = bozo.getData('speed') || 200; // Default speed is 200
    
    if (cursors.left.isDown) {
        bozo.setVelocityX(-speed);
        bozo.flipX = true;
    }
    else if (cursors.right.isDown) {
        bozo.setVelocityX(speed);
        bozo.flipX = false;
    }
    else {
        bozo.setVelocityX(0);
    }
    
    if (cursors.up.isDown && bozo.body.touching.down) {
        bozo.setVelocityY(-330);
    }
    
    // Update Timer
    const elapsedTime = Math.floor((this.time.now - startTime) / 1000);
    timerText.setText('Time: ' + elapsedTime + 's');
}

// Function to spawn a new token
function spawnToken() {
    const tokenX = Phaser.Math.Between(15, 785); // Center of token at x between 15 and 785
    const tokenY = -15; // Start slightly above the screen
    
    // Calculate random angle for token trajectory
    const angle = Phaser.Math.Between(-30, 30); // Degrees
    const radians = Phaser.Math.DegToRad(angle);
    
    // Calculate velocity based on angle and current token speed
    const velocityX = tokenSpeed * Math.sin(radians);
    const velocityY = tokenSpeed * Math.cos(radians);
    
    const token = this.physics.add.sprite(tokenX, tokenY, 'token');
    token.setBounce(0); // No bounce
    token.setCollideWorldBounds(false); // Tokens disappear when out of bounds
    token.setVelocityX(velocityX);
    token.setVelocityY(velocityY);
    
    tokens.add(token);
}

// Function to collect a token
function collectToken (player, token) {
    token.disableBody(true, true);
    
    score += 10;
    totalTokens += 1;
    scoreText.setText('Score: ' + score);
    
    // Check for evolution
    if (totalTokens % evolutionThreshold === 0 && evolutionStage < bozoTextures.length - 1) {
        evolveBozo(this);
    }
    
    // Check for game end
    if (totalTokens === evolutionThreshold * (bozoTextures.length - 1)) {
        endGame(this);
    }
}

// Function to evolve Bozo
function evolveBozo(scene) {
    evolutionStage += 1; // Move to the next evolution stage
    
    // Update Bozo's texture and maintain scale at 0.5
    bozo.setTexture(bozoTextures[evolutionStage].key);
    bozo.setScale(bozoTextures[evolutionStage].scale);
    
    // Increase Bozo's speed
    const speedIncrease = 50; // Increase speed by 50 pixels/sec each stage
    const currentSpeed = bozo.getData('speed');
    bozo.setData('speed', currentSpeed + speedIncrease);
    
    // Increase token speed after each stage
    tokenSpeed += 20; // Increase token speed by 20 pixels/sec each stage
    
    // Display Evolution Message
    const evolutionText = scene.add.text(scene.scale.width / 2, scene.scale.height / 2, 'Bozo Evolved!', { 
        fontSize: '48px', 
        fill: '#FFFF00', 
        fontFamily: 'Arial', 
        fontStyle: 'bold' 
    });
    evolutionText.setOrigin(0.5);
    scene.time.delayedCall(2000, () => {
        evolutionText.destroy();
    }, [], scene);
}

// Function to end the game
function endGame(scene) {
    gameEnded = true;
    
    // Stop token spawner
    tokenSpawner.remove(false);
    
    // Calculate elapsed time
    const elapsedTime = Math.floor((scene.time.now - startTime) / 1000);
    
    // Display Victory Message
    const victoryText = scene.add.text(scene.scale.width / 2, scene.scale.height / 2 - 50, 'Mission Accomplished!', { 
        fontSize: '48px', 
        fill: '#00FF00', 
        fontFamily: 'Arial', 
        fontStyle: 'bold' 
    });
    victoryText.setOrigin(0.5);
    
    const missionText = scene.add.text(scene.scale.width / 2, scene.scale.height / 2, `Bozo has bozified the world in ${elapsedTime} seconds!`, { 
        fontSize: '32px', 
        fill: '#ffffff', 
        fontFamily: 'Arial' 
    });
    missionText.setOrigin(0.5);
    
    // Create Share Button
    shareButton = scene.add.text(scene.scale.width / 2, scene.scale.height / 2 + 80, 'Share on Twitter', { 
        fontSize: '32px', 
        fill: '#1DA1F2', 
        fontFamily: 'Arial', 
        backgroundColor: '#ffffff', 
        padding: { x: 20, y: 10 }, 
        borderRadius: 5 
    });
    shareButton.setOrigin(0.5);
    shareButton.setInteractive({ useHandCursor: true });
    shareButton.on('pointerdown', () => {
        const tweetText = encodeURIComponent(`I helped Bozo bozify the world in ${elapsedTime} seconds in #BozoCryptoCaper! Join me!`);
        const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(window.location.href)}`;
        window.open(tweetUrl, '_blank');
    });
}

// Function to create Bozo Hybrid Logo
function createLogo(scene) {
    logo = scene.add.image(scene.scale.width - 60, 30, 'logo');
    logo.setScale(0.5); // Adjust scale as needed
    
    // Make the logo interactive (e.g., link to your Twitter)
    logo.setInteractive();
    logo.on('pointerdown', () => {
        window.open('https://x.com/bozoHYBRID?ref_src=twsrc%5Egoogle%7Ctwcamp%5Eserp%7Ctwgr%5Eauthor', '_blank');
    });
}

// Function to create Countdown
function createCountdown(scene) {
    // Message Text
    const messageText = scene.add.text(scene.scale.width / 2, scene.scale.height / 2 - 50, 'Are you ready to bozofy the world?', { 
        fontSize: '32px', 
        fill: '#ffffff', 
        fontFamily: 'Arial', 
        align: 'center' 
    });
    messageText.setOrigin(0.5);
    
    // Countdown Text
    const countdownText = scene.add.text(scene.scale.width / 2, scene.scale.height / 2 + 50, '3', { 
        fontSize: '64px', 
        fill: '#ffffff', 
        fontFamily: 'Arial', 
        fontStyle: 'bold' 
    });
    countdownText.setOrigin(0.5);
    
    // Sequence of countdown
    scene.time.delayedCall(1000, () => {
        countdownText.setText('2');
    }, [], scene);
    
    scene.time.delayedCall(2000, () => {
        countdownText.setText('1');
    }, [], scene);
    
    scene.time.delayedCall(3000, () => {
        countdownText.setText('Go!');
    }, [], scene);
    
    scene.time.delayedCall(4000, () => {
        // Remove countdown texts
        messageText.destroy();
        countdownText.destroy();
        
        // Start the game
        startGame(scene);
    }, [], scene);
}

// Function to start the game after countdown
function startGame(scene) {
    isPlaying = true; // Set the game as active
    startTime = scene.time.now; // Initialize start time
    
    // Start token spawning
    tokenSpawner = scene.time.addEvent({
        delay: 800, // Spawn a token every 800 milliseconds
        callback: spawnToken,
        callbackScope: scene,
        loop: true
    });
}

// Function to evolve Bozo
function evolveBozo(scene) {
    evolutionStage += 1; // Move to the next evolution stage
    
    // Update Bozo's texture and maintain scale at 0.5
    bozo.setTexture(bozoTextures[evolutionStage].key);
    bozo.setScale(bozoTextures[evolutionStage].scale);
    
    // Increase Bozo's speed
    const speedIncrease = 50; // Increase speed by 50 pixels/sec each stage
    const currentSpeed = bozo.getData('speed');
    bozo.setData('speed', currentSpeed + speedIncrease);
    
    // Increase token speed after each stage
    tokenSpeed += 20; // Increase token speed by 20 pixels/sec each stage
    
    // Display Evolution Message
    const evolutionText = scene.add.text(scene.scale.width / 2, scene.scale.height / 2, 'Bozo Evolved!', { 
        fontSize: '48px', 
        fill: '#FFFF00', 
        fontFamily: 'Arial', 
        fontStyle: 'bold' 
    });
    evolutionText.setOrigin(0.5);
    scene.time.delayedCall(2000, () => {
        evolutionText.destroy();
    }, [], scene);
}
