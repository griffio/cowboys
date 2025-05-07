// Game constants and variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const GAME_WIDTH = canvas.width;
const GAME_HEIGHT = canvas.height;

// Game state
let gameRunning = false;
let gameOver = false;
let winner = null;
let lastPowerUpSpawn = 0;

// Player constants
const PLAYER_SIZE = 30;
const PLAYER_SPEED = 5;
const MAX_HEALTH = 3;

// Bullet constants
const BULLET_SIZE = 5;
const BULLET_SPEED = 10;
const BULLET_COOLDOWN = 500; // ms

// Cactus constants
const CACTUS_COUNT = 10;
const CACTUS_MIN_SIZE = 30;
const CACTUS_MAX_SIZE = 60;

// Power-up constants
const POWERUP_SIZE = 20;
const POWERUP_SPAWN_INTERVAL = 10000; // ms
const POWERUP_DURATION = 10000; // ms
const POWERUP_TYPES = ['speed', 'spread', 'incinerator'];

// Game objects
let player1;
let player2;
let bullets = [];
let cacti = [];
let powerUps = [];
let particles = [];

// Classes
class Player {
    constructor(x, y, color, controls) {
        this.x = x;
        this.y = y;
        this.size = PLAYER_SIZE;
        this.color = color;
        this.health = MAX_HEALTH;
        this.controls = controls;
        this.moveUp = false;
        this.moveDown = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.lastShot = 0;

        // Power-up properties
        this.speedBoost = false;
        this.speedBoostEnd = 0;
        this.spreadShot = false;
        this.spreadShotEnd = 0;
        this.incineratorShot = false;
    }

    update() {
        // Check if power-ups have expired
        const now = Date.now();
        if (this.speedBoost && now > this.speedBoostEnd) {
            this.speedBoost = false;
        }
        if (this.spreadShot && now > this.spreadShotEnd) {
            this.spreadShot = false;
        }

        // Calculate current speed based on power-ups
        const currentSpeed = this.speedBoost ? PLAYER_SPEED * 2 : PLAYER_SPEED;

        // Movement
        if (this.moveUp && this.y - this.size / 2 > 0) {
            this.y -= currentSpeed;
        }
        if (this.moveDown && this.y + this.size / 2 < GAME_HEIGHT) {
            this.y += currentSpeed;
        }
        if (this.moveLeft && this.x - this.size / 2 > 0) {
            this.x -= currentSpeed;
        }
        if (this.moveRight && this.x + this.size / 2 < GAME_WIDTH) {
            this.x += currentSpeed;
        }
    }

    draw() {
        // Draw player
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw a small indicator for the direction the player is facing
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 6, 0, Math.PI * 2);
        ctx.fill();

        // Draw power-up indicators
        if (this.speedBoost) {
            ctx.strokeStyle = '#ffeb3b'; // Yellow
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size / 2 + 5, 0, Math.PI * 2);
            ctx.stroke();
        }

        if (this.spreadShot) {
            ctx.strokeStyle = '#f44336'; // Red
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size / 2 + 8, 0, Math.PI * 2);
            ctx.stroke();
        }

        if (this.incineratorShot) {
            ctx.strokeStyle = '#ff9800'; // Orange
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size / 2 + 11, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    shoot(direction) {
        const now = Date.now();
        if (now - this.lastShot > BULLET_COOLDOWN) {
            this.lastShot = now;

            // Play shot sound
            if (typeof audioManager !== 'undefined') {
                audioManager.play('shot');
            }

            let dx = 0;
            if (direction === 'left') dx = -1;
            if (direction === 'right') dx = 1;

            if (this.spreadShot) {
                // Create 3 bullets in a spread pattern
                bullets.push(new Bullet(
                    this.x + (dx * this.size / 2),
                    this.y,
                    dx,
                    0,
                    this.color
                ));

                bullets.push(new Bullet(
                    this.x + (dx * this.size / 2),
                    this.y,
                    dx,
                    0.2, // Slight upward angle
                    this.color
                ));

                bullets.push(new Bullet(
                    this.x + (dx * this.size / 2),
                    this.y,
                    dx,
                    -0.2, // Slight downward angle
                    this.color
                ));
            } else if (this.incineratorShot) {
                // Create an incinerator bullet
                bullets.push(new Bullet(
                    this.x + (dx * this.size / 2),
                    this.y,
                    dx,
                    0,
                    this.color,
                    true // isIncinerator
                ));

                // Reset the incinerator power-up (single use)
                this.incineratorShot = false;
            } else {
                // Create a regular bullet
                bullets.push(new Bullet(
                    this.x + (dx * this.size / 2),
                    this.y,
                    dx,
                    0,
                    this.color
                ));
            }
        }
    }

    takeDamage() {
        this.health--;
        updateHealthDisplay();

        // Play hit sound
        if (typeof audioManager !== 'undefined') {
            audioManager.play('hit');
        }

        if (this.health <= 0) {
            gameOver = true;
            winner = this === player1 ? player2 : player1;
            document.getElementById('restartButton').style.display = 'inline-block';
        }
    }
}

class Bullet {
    constructor(x, y, dx, dy, color, isIncinerator = false) {
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.size = isIncinerator ? BULLET_SIZE * 1.5 : BULLET_SIZE;
        this.color = color;
        this.speed = BULLET_SPEED;
        this.active = true;
        this.isIncinerator = isIncinerator;
    }

    update() {
        this.x += this.dx * this.speed;
        this.y += this.dy * this.speed;

        // Check if bullet is out of bounds
        if (this.x < 0 || this.x > GAME_WIDTH || this.y < 0 || this.y > GAME_HEIGHT) {
            this.active = false;
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Add fire effect for incinerator bullets
        if (this.isIncinerator) {
            ctx.fillStyle = '#ff9800'; // Orange
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 0.7, 0, Math.PI * 2);
            ctx.fill();

            // Add particle trail
            for (let i = 0; i < 2; i++) {
                particles.push(new Particle(
                    this.x, 
                    this.y, 
                    '#ff9800', 
                    {
                        x: (Math.random() - 0.5) * 2,
                        y: (Math.random() - 0.5) * 2
                    }
                ));
            }
        }
    }

    ricochet(normal) {
        // Incinerator bullets don't ricochet
        if (this.isIncinerator) {
            return false;
        }

        // Play ricochet sound
        if (typeof audioManager !== 'undefined') {
            audioManager.play('ricochet');
        }

        // Reflect the bullet direction based on the normal vector of the collision
        const dot = this.dx * normal.x + this.dy * normal.y;
        this.dx = this.dx - 2 * dot * normal.x;
        this.dy = this.dy - 2 * dot * normal.y;
        return true;
    }
}

class Cactus {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.color = '#2e7d32'; // Dark green
    }

    draw() {
        ctx.fillStyle = this.color;
        // Draw main body
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw spikes
        ctx.strokeStyle = '#a5d6a7'; // Light green
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const spikeLength = this.size / 3;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(
                this.x + Math.cos(angle) * (this.size / 2 + spikeLength),
                this.y + Math.sin(angle) * (this.size / 2 + spikeLength)
            );
            ctx.stroke();
        }
    }

    checkCollision(bullet) {
        const dx = bullet.x - this.x;
        const dy = bullet.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.size / 2 + bullet.size) {
            // Calculate normal vector for ricochet
            const normal = {
                x: dx / distance,
                y: dy / distance
            };
            return normal;
        }
        return null;
    }
}

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.size = POWERUP_SIZE;
        this.type = type;
        this.active = true;

        // Set color based on type
        switch(this.type) {
            case 'speed':
                this.color = '#ffeb3b'; // Yellow
                break;
            case 'spread':
                this.color = '#f44336'; // Red
                break;
            case 'incinerator':
                this.color = '#ff9800'; // Orange
                break;
            default:
                this.color = '#9c27b0'; // Purple
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw icon based on type
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let icon = '';
        switch(this.type) {
            case 'speed':
                icon = '⚡'; // Lightning bolt
                break;
            case 'spread':
                icon = '⎈'; // Spread
                break;
            case 'incinerator':
                icon = '🔥'; // Fire
                break;
        }

        ctx.fillText(icon, this.x, this.y);
    }

    checkCollision(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance < this.size / 2 + player.size / 2;
    }

    applyEffect(player) {
        // Play power-up collection sound
        if (typeof audioManager !== 'undefined') {
            audioManager.play('powerup');
        }

        switch(this.type) {
            case 'speed':
                player.speedBoost = true;
                player.speedBoostEnd = Date.now() + POWERUP_DURATION;
                break;
            case 'spread':
                player.spreadShot = true;
                player.spreadShotEnd = Date.now() + POWERUP_DURATION;
                break;
            case 'incinerator':
                player.incineratorShot = true;
                // Incinerator is a single-use power-up
                break;
        }
    }
}

class Particle {
    constructor(x, y, color, velocity) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 5 + 2;
        this.color = color;
        this.velocity = velocity;
        this.alpha = 1;
        this.decay = Math.random() * 0.02 + 0.02; // How fast the particle fades
    }

    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.alpha -= this.decay;
        this.size -= this.decay;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Initialize game
function initGame() {
    // Create players
    player1 = new Player(GAME_WIDTH * 0.25, GAME_HEIGHT / 2, '#2196f3', {
        up: 'w',
        down: 's',
        left: 'a',
        right: 'd',
        shoot: 'c'
    });

    player2 = new Player(GAME_WIDTH * 0.75, GAME_HEIGHT / 2, '#f44336', {
        up: 'i',
        down: 'k',
        left: 'j',
        right: 'l',
        shoot: 'n'
    });

    // Create cacti
    cacti = [];
    for (let i = 0; i < CACTUS_COUNT; i++) {
        let validPosition = false;
        let x, y, size;

        // Keep trying until we find a valid position
        while (!validPosition) {
            size = Math.random() * (CACTUS_MAX_SIZE - CACTUS_MIN_SIZE) + CACTUS_MIN_SIZE;
            x = Math.random() * (GAME_WIDTH - size) + size / 2;
            y = Math.random() * (GAME_HEIGHT - size) + size / 2;

            // Check distance from players
            const dist1 = Math.sqrt(Math.pow(x - player1.x, 2) + Math.pow(y - player1.y, 2));
            const dist2 = Math.sqrt(Math.pow(x - player2.x, 2) + Math.pow(y - player2.y, 2));

            if (dist1 > PLAYER_SIZE * 3 && dist2 > PLAYER_SIZE * 3) {
                validPosition = true;

                // Check distance from other cacti
                for (const cactus of cacti) {
                    const dist = Math.sqrt(Math.pow(x - cactus.x, 2) + Math.pow(y - cactus.y, 2));
                    if (dist < size + cactus.size) {
                        validPosition = false;
                        break;
                    }
                }
            }
        }

        cacti.push(new Cactus(x, y, size));
    }

    // Reset game state
    bullets = [];
    powerUps = [];
    particles = [];
    gameRunning = true;
    gameOver = false;
    winner = null;
    lastPowerUpSpawn = Date.now();

    // Reset health display
    player1.health = MAX_HEALTH;
    player2.health = MAX_HEALTH;
    updateHealthDisplay();
}

// Create a power-up at a random position
function spawnPowerUp() {
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    let validPosition = false;
    let x, y;

    // Keep trying until we find a valid position
    while (!validPosition) {
        x = Math.random() * (GAME_WIDTH - POWERUP_SIZE) + POWERUP_SIZE / 2;
        y = Math.random() * (GAME_HEIGHT - POWERUP_SIZE) + POWERUP_SIZE / 2;

        validPosition = true;

        // Check distance from cacti
        for (const cactus of cacti) {
            const dist = Math.sqrt(Math.pow(x - cactus.x, 2) + Math.pow(y - cactus.y, 2));
            if (dist < POWERUP_SIZE + cactus.size) {
                validPosition = false;
                break;
            }
        }
    }

    powerUps.push(new PowerUp(x, y, type));
}

// Create cactus incineration effect
function createCactusIncinerationEffect(cactus) {
    const particleCount = 50;
    const cactusColor = cactus.color;

    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;

        particles.push(new Particle(
            cactus.x,
            cactus.y,
            cactusColor,
            {
                x: Math.cos(angle) * speed,
                y: Math.sin(angle) * speed
            }
        ));
    }
}

// Update health display
function updateHealthDisplay() {
    const player1Health = document.getElementById('player1-health');
    const player2Health = document.getElementById('player2-health');

    if (player1 && player2) {
        player1Health.style.width = (player1.health / MAX_HEALTH * 100) + '%';
        player2Health.style.width = (player2.health / MAX_HEALTH * 100) + '%';
    }
}

// Game loop
function gameLoop() {
    // Clear canvas
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    if (gameRunning && !gameOver && player1 && player2) {
        // Update players
        player1.update();
        player2.update();

        // Update bullets
        bullets = bullets.filter(bullet => bullet.active);
        bullets.forEach(bullet => bullet.update());

        // Update particles
        particles = particles.filter(particle => particle.alpha > 0);
        particles.forEach(particle => particle.update());

        // Spawn power-ups
        const now = Date.now();
        if (now - lastPowerUpSpawn > POWERUP_SPAWN_INTERVAL) {
            spawnPowerUp();
            lastPowerUpSpawn = now;
        }

        // Check for power-up collisions with players
        powerUps = powerUps.filter(powerUp => {
            if (powerUp.active) {
                // Check collision with player 1
                if (powerUp.checkCollision(player1)) {
                    powerUp.applyEffect(player1);
                    return false;
                }

                // Check collision with player 2
                if (powerUp.checkCollision(player2)) {
                    powerUp.applyEffect(player2);
                    return false;
                }

                return true;
            }
            return false;
        });

        // Check for bullet collisions with players
        bullets.forEach(bullet => {
            // Check collision with player 1
            const dx1 = bullet.x - player1.x;
            const dy1 = bullet.y - player1.y;
            const distance1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);

            if (distance1 < player1.size / 2 + bullet.size && bullet.color !== player1.color) {
                bullet.active = false;
                player1.takeDamage();
            }

            // Check collision with player 2
            const dx2 = bullet.x - player2.x;
            const dy2 = bullet.y - player2.y;
            const distance2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

            if (distance2 < player2.size / 2 + bullet.size && bullet.color !== player2.color) {
                bullet.active = false;
                player2.takeDamage();
            }

            // Check collision with cacti
            for (let i = cacti.length - 1; i >= 0; i--) {
                const cactus = cacti[i];
                const normal = cactus.checkCollision(bullet);
                if (normal) {
                    // If it's an incinerator bullet, destroy the cactus
                    if (bullet.isIncinerator) {
                        createCactusIncinerationEffect(cactus);
                        cacti.splice(i, 1);
                        bullet.active = false;
                    } else {
                        // Regular bullet ricochets
                        bullet.ricochet(normal);
                    }
                }
            }
        });
    }

    // Draw game objects
    cacti.forEach(cactus => cactus.draw());
    powerUps.forEach(powerUp => powerUp.draw());
    particles.forEach(particle => particle.draw());
    bullets.forEach(bullet => bullet.draw());
    if (player1) player1.draw();
    if (player2) player2.draw();

    // Draw game over message
    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        ctx.fillStyle = 'white';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50);

        ctx.font = '36px Arial';
        if (player1 && player2) {
            ctx.fillText(
                winner === player1 ? 'Player 1 Wins!' : 'Player 2 Wins!',
                GAME_WIDTH / 2,
                GAME_HEIGHT / 2 + 20
            );
        }
    }

    requestAnimationFrame(gameLoop);
}

// Input handling
const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;

    if (player1 && player2) {
        // Player 1 controls
        player1.moveUp = keys[player1.controls.up];
        player1.moveDown = keys[player1.controls.down];
        player1.moveLeft = keys[player1.controls.left];
        player1.moveRight = keys[player1.controls.right];

        // Player 2 controls
        player2.moveUp = keys[player2.controls.up];
        player2.moveDown = keys[player2.controls.down];
        player2.moveLeft = keys[player2.controls.left];
        player2.moveRight = keys[player2.controls.right];

        // Shooting controls
        if (gameRunning && !gameOver) {
            if (keys[player1.controls.shoot]) {
                // Player 1 always shoots right
                player1.shoot('right');
            }

            if (keys[player2.controls.shoot]) {
                // Player 2 always shoots left
                player2.shoot('left');
            }
        }
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;

    if (player1 && player2) {
        // Player 1 controls
        player1.moveUp = keys[player1.controls.up];
        player1.moveDown = keys[player1.controls.down];
        player1.moveLeft = keys[player1.controls.left];
        player1.moveRight = keys[player1.controls.right];

        // Player 2 controls
        player2.moveUp = keys[player2.controls.up];
        player2.moveDown = keys[player2.controls.down];
        player2.moveLeft = keys[player2.controls.left];
        player2.moveRight = keys[player2.controls.right];
    }
});

// Button event listeners
document.getElementById('startButton').addEventListener('click', () => {
    initGame();
    document.getElementById('startButton').style.display = 'none';
    document.getElementById('restartButton').style.display = 'none';
});

document.getElementById('restartButton').addEventListener('click', () => {
    initGame();
    document.getElementById('restartButton').style.display = 'none';
});

// Mute button event listener
document.getElementById('muteButton').addEventListener('click', () => {
    if (typeof audioManager !== 'undefined') {
        const isMuted = audioManager.toggleMute();
        document.getElementById('muteButton').textContent = isMuted ? '🔇' : '🔊';
    }
});

// Initialize the game when the page loads
window.addEventListener('load', () => {
    // Draw initial canvas
    ctx.fillStyle = '#a1887f';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.fillStyle = 'white';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Press Start to Play', GAME_WIDTH / 2, GAME_HEIGHT / 2);

    // Start game loop
    gameLoop();
});
