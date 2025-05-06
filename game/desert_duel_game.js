// Game canvas and context
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
// Desert Duel Game - Gameplay Enhancements
// Power-ups and Special Items Implementation

// Bullets
const bullets = [];
const BULLET_SPEED = 800;
const BULLET_RADIUS = 5;
const BULLET_COOLDOWN = 500; // ms between shots
const MAX_BOUNCES = 3;

// Power-up constants
const POWERUP_SIZE = 20;
const POWERUP_SPAWN_INTERVAL = 8000; // 8 seconds between spawns
const POWERUP_DURATION = 10000; // 10 seconds of effect
const POWERUP_MAX_ON_MAP = 3; // Maximum number of power-ups on the map at once
const POWERUP_DESPAWN_TIME = 20000; // Power-ups disappear after 20 seconds
// Add these constants at the top with other constants
const PLAYER_SPEED = 150; // Base player speed
const DEFAULT_COOLDOWN = BULLET_COOLDOWN; // Default shooting cooldown
// Define power-up types with their properties
const POWERUP_TYPES = [
    {
        id: 'quickdraw',
        name: 'Quick Draw',
        color: '#ff9900',
        description: 'Faster shooting!',
        effect: 'Reduces shooting cooldown by 50%',
        icon: '⚡'
    },
    {
        id: 'bulletproof',
        name: 'Bulletproof Vest',
        color: '#aaaaaa',
        description: 'Bulletproof!',
        effect: 'Provides immunity for 2 hits',
        icon: '🛡️'
    },
    {
        id: 'speedboots',
        name: 'Speed Boots',
        color: '#33ff33',
        description: 'Speed boost!',
        effect: 'Increases movement speed by 50%',
        icon: '👢'
    },
    {
        id: 'scatter',
        name: 'Scatter Shot',
        color: '#ff00ff',
        description: 'Scatter shot!',
        effect: 'Next shot fires 3 bullets in a spread',
        icon: '💥'
    },
    {
        id: 'ricochet',
        name: 'Ricocheting Bullet',
        color: '#00ccff',
        description: 'Ricocheting bullets!',
        effect: 'Bullets bounce more times',
        icon: '↩️'
    },
    {
        id: 'incendiary',
        name: 'Incendiary Bullet',
        color: '#ff4500',
        description: 'Incendiary bullets!',
        effect: 'Bullets can set cacti on fire',
        icon: '🔥'
    }
];

// Sounds for power-ups
const powerupSound = new Audio('pop.ogg');
const ricochetSound = new Audio('ricochet.ogg');
const hitSound = new Audio('splat.ogg');
const shootSound = new Audio('gunshot.ogg');
const fireSound = new Audio('gunshot.ogg'); // Reusing gunshot for fire effect (can be replaced with a fire sound)

// Power-up array to track active power-ups on the map
let powerups = [];
let lastPowerupSpawn = 0;

// Initialize power-ups for players
function initPowerups(players) {
    players.forEach(player => {
        player.powerups = {}; // Object to store active power-ups
        player.shields = 0;   // Bulletproof vest shield count
        player.nextShotType = null; // For special bullet types
    });
}

// Spawn a new power-up at a random position
function spawnPowerup(timestamp, cacti, players) {
    // Check if we should spawn a new power-up
    if (timestamp - lastPowerupSpawn < POWERUP_SPAWN_INTERVAL) {
        return;
    }
    
    // Don't spawn if we already have the maximum number of power-ups
    if (powerups.length >= POWERUP_MAX_ON_MAP) {
        return;
    }
    
    // Update last spawn time
    lastPowerupSpawn = timestamp;
    
    // Select a random power-up type
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    
    // Find a valid position (not inside cacti or too close to players)
    let validPosition = false;
    let x, y, attempts = 0;
    
    while (!validPosition && attempts < 50) {
        attempts++;
        x = POWERUP_SIZE + Math.random() * (canvas.width - POWERUP_SIZE * 2);
        y = POWERUP_SIZE + Math.random() * (canvas.height - POWERUP_SIZE * 2);
        
        // Check distance from cacti
        let tooCloseToObstacle = false;
        for (const cactus of cacti) {
            const dist = Math.sqrt((x - cactus.x) ** 2 + (y - cactus.y) ** 2);
            if (dist < POWERUP_SIZE + cactus.radius + 5) {
                tooCloseToObstacle = true;
                break;
            }
        }
        
        // Check distance from players
        if (!tooCloseToObstacle) {
            let tooCloseToPlayer = false;
            for (const player of players) {
                const dist = Math.sqrt((x - player.x) ** 2 + (y - player.y) ** 2);
                if (dist < POWERUP_SIZE + player.radius + 30) {
                    tooCloseToPlayer = true;
                    break;
                }
            }
            
            validPosition = !tooCloseToPlayer;
        }
    }
    
    // Only add if we found a valid position
    if (validPosition) {
        powerups.push({
            x: x,
            y: y,
            radius: POWERUP_SIZE,
            type: type,
            createdAt: timestamp
        });
    }
}

// Draw all power-ups on the canvas
function drawPowerups() {
    for (const powerup of powerups) {
        // Draw the base circle
        ctx.beginPath();
        ctx.arc(powerup.x, powerup.y, powerup.radius, 0, Math.PI * 2);
        ctx.fillStyle = powerup.type.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw icon or text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(powerup.type.icon, powerup.x, powerup.y);
        
        // Add pulsing effect
        const pulseSize = powerup.radius * (1 + 0.1 * Math.sin(Date.now() / 200));
        ctx.beginPath();
        ctx.arc(powerup.x, powerup.y, pulseSize, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

// Update power-ups (check collisions, expire old ones)
function updatePowerups(timestamp, players) {
    // Check for power-up collection by players
    for (let i = powerups.length - 1; i >= 0; i--) {
        const powerup = powerups[i];
        
        // Check for expiration
        if (timestamp - powerup.createdAt > POWERUP_DESPAWN_TIME) {
            powerups.splice(i, 1);
            continue;
        }
        
        // Check collision with players
        for (const player of players) {
            const dx = player.x - powerup.x;
            const dy = player.y - powerup.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < player.radius + powerup.radius) {
                // Collect the power-up
                applyPowerup(player, powerup.type, timestamp);
                
                // Show notification
                showPowerupNotification(powerup.type.description);
                
                // Play sound effect
                powerupSound.currentTime = 0;
                playSound(powerupSound);
                
                // Remove the power-up
                powerups.splice(i, 1);
                break;
            }
        }
    }
    
    // Update power-up timers and check for expired effects
    players.forEach(player => {
        Object.keys(player.powerups).forEach(powerupId => {
            const powerup = player.powerups[powerupId];
            
            // Remove expired power-ups
            if (timestamp >= powerup.expireTime) {
                // Handle power-up expiration effects
                switch (powerupId) {
                    case 'speedboots':
                        player.defaultSpeed = PLAYER_SPEED;
                        break;
                    case 'quickdraw':
                        player.shootCooldown = DEFAULT_COOLDOWN;
                        break;
                    // Other power-ups don't need reset logic as they're handled during use
                }
                
                // Remove the power-up
                delete player.powerups[powerupId];
            }
        });
    });
}

// Apply a power-up effect to a player
function applyPowerup(player, powerupType, timestamp) {
    const expireTime = timestamp + POWERUP_DURATION;
    
    switch (powerupType.id) {
        case 'quickdraw':
            // Reduce shooting cooldown
            player.shootCooldown = DEFAULT_COOLDOWN * 0.5;
            player.powerups.quickdraw = {
                expireTime: expireTime
            };
            break;
            
        case 'bulletproof':
            // Add shields (absorbs 2 hits)
            player.shields = 2;
            player.powerups.bulletproof = {
                expireTime: expireTime
            };
            break;
            
        case 'speedboots':
            // Increase movement speed
            player.defaultSpeed = PLAYER_SPEED * 1.5;
            player.powerups.speedboots = {
                expireTime: expireTime
            };
            break;
            
        case 'scatter':
            // Next shot will be a scatter shot
            player.nextShotType = 'scatter';
            player.powerups.scatter = {
                expireTime: expireTime
            };
            break;
            
        case 'ricochet':
            // Next bullets will ricochet more
            player.nextShotType = 'ricochet';
            player.powerups.ricochet = {
                expireTime: expireTime
            };
            break;
            
        case 'incendiary':
            // Next bullets will be incendiary
            player.nextShotType = 'incendiary';
            player.powerups.incendiary = {
                expireTime: expireTime
            };
            break;
    }
}

// Show power-up notification
function showPowerupNotification(message) {
    const notification = document.querySelector('.power-up-notification');
    if (notification) {
        notification.textContent = message;
        notification.style.opacity = 1;
        
        // Hide after 2 seconds
        setTimeout(() => {
            notification.style.opacity = 0;
        }, 2000);
    }
}

// Update UI indicators for power-ups
function updatePowerupIndicators() {
    // Get containers for player power-up indicators
    const p1Container = document.getElementById('p1PowerUps');
    const p2Container = document.getElementById('p2PowerUps');
    
    if (!p1Container || !p2Container) return;
    
    // Clear existing indicators
    p1Container.innerHTML = '';
    p2Container.innerHTML = '';
    
    // Add power-up indicators for player 1
    for (const [id, powerup] of Object.entries(players[0].powerups)) {
        const timeLeft = Math.ceil((powerup.expireTime - Date.now()) / 1000);
        if (timeLeft <= 0) continue;
        
        const type = POWERUP_TYPES.find(t => t.id === id);
        if (!type) continue;
        
        const powerupDiv = document.createElement('div');
        powerupDiv.className = 'powerup';
        
        const iconSpan = document.createElement('span');
        iconSpan.className = `powerup-icon ${id}`;
        iconSpan.innerHTML = type.icon;
        
        const timerSpan = document.createElement('span');
        timerSpan.className = 'powerup-timer';
        timerSpan.textContent = `${timeLeft}s`;
        
        powerupDiv.appendChild(iconSpan);
        powerupDiv.appendChild(timerSpan);
        p1Container.appendChild(powerupDiv);
    }
    
    // Add power-up indicators for player 2
    for (const [id, powerup] of Object.entries(players[1].powerups)) {
        const timeLeft = Math.ceil((powerup.expireTime - Date.now()) / 1000);
        if (timeLeft <= 0) continue;
        
        const type = POWERUP_TYPES.find(t => t.id === id);
        if (!type) continue;
        
        const powerupDiv = document.createElement('div');
        powerupDiv.className = 'powerup';
        
        const iconSpan = document.createElement('span');
        iconSpan.className = `powerup-icon ${id}`;
        iconSpan.innerHTML = type.icon;
        
        const timerSpan = document.createElement('span');
        timerSpan.className = 'powerup-timer';
        timerSpan.textContent = `${timeLeft}s`;
        
        powerupDiv.appendChild(iconSpan);
        powerupDiv.appendChild(timerSpan);
        p2Container.appendChild(powerupDiv);
    }
}

// Create a bullet with special properties based on player's active power-ups
function createPowerupBullet(player, angle, bullets) {
    const bullet = {
        x: player.x,
        y: player.y,
        speedX: Math.cos(angle) * BULLET_SPEED,
        speedY: Math.sin(angle) * BULLET_SPEED,
        radius: BULLET_RADIUS,
        color: player.color,
        playerId: player.id,
        bounces: 0,
        maxBounces: MAX_BOUNCES,
        isIncendiary: false
    };
    
    // Apply special bullet properties based on player's next shot type
    if (player.nextShotType === 'scatter') {
        // Create a scatter shot (3 bullets in a spread)
        for (let i = -1; i <= 1; i++) {
            const spreadAngle = angle + (i * Math.PI / 12); // 15 degree spread
            const scatterBullet = {
                ...bullet,
                speedX: Math.cos(spreadAngle) * BULLET_SPEED,
                speedY: Math.sin(spreadAngle) * BULLET_SPEED
            };
            bullets.push(scatterBullet);
        }
        
        // Consume the power-up for the specific shot
        player.nextShotType = null;
        
        return true; // Already added bullets
    } 
    else if (player.nextShotType === 'ricochet') {
        // Ricocheting bullet (more bounces)
        bullet.maxBounces = MAX_BOUNCES + 3;
        bullet.color = POWERUP_TYPES.find(t => t.id === 'ricochet').color;
        
        // Don't consume the power-up until it expires
        bullets.push(bullet);
        return true;
    }
    else if (player.nextShotType === 'incendiary') {
        // Incendiary bullet (sets cacti on fire)
        bullet.isIncendiary = true;
        bullet.color = POWERUP_TYPES.find(t => t.id === 'incendiary').color;
        
        // Don't consume the power-up until it expires
        bullets.push(bullet);
        return true;
    }
    
    // Regular bullet
    bullets.push(bullet);
    return false;
}

// Create fire effect when an incendiary bullet hits a cactus
function createFireEffect(x, y, radius) {
    // Create fire particles
    const particleCount = 20 + Math.floor(radius);

    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 100;
        const size = 2 + Math.random() * 4;
        const lifetime = 500 + Math.random() * 1000; // 0.5 to 1.5 seconds

        const particle = {
            x: x,
            y: y,
            speedX: Math.cos(angle) * speed,
            speedY: Math.sin(angle) * speed,
            size: size,
            color: `hsl(${20 + Math.random() * 20}, 100%, ${50 + Math.random() * 30}%)`, // Orange-red fire colors
            createdAt: Date.now(),
            lifetime: lifetime
        };

        // Add to particles array
        fireParticles.push(particle);
    }
}

// Add this to the top of the file with other game elements
const fireParticles = [];

// Add this to the gameLoop function to update and draw fire particles
function updateFireParticles(deltaTime) {
    for (let i = fireParticles.length - 1; i >= 0; i--) {
        const particle = fireParticles[i];

        // Update position
        particle.x += particle.speedX * deltaTime;
        particle.y += particle.speedY * deltaTime;

        // Shrink particle over time
        const age = Date.now() - particle.createdAt;
        const lifePercent = age / particle.lifetime;

        // Remove if expired
        if (lifePercent >= 1) {
            fireParticles.splice(i, 1);
            continue;
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * (1 - lifePercent), 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = 1 - lifePercent;
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}


// Process bullet hit on cactus with special effects for incendiary bullets
function processBulletCactusCollision(bullet, cacti, i, bullets) {
    // Find the cactus that was hit
    for (let j = cacti.length - 1; j >= 0; j--) {
        const cactus = cacti[j];
        const dx = bullet.x - cactus.x;
        const dy = bullet.y - cactus.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < bullet.radius + cactus.radius) {
            // For incendiary bullets, set cactus on fire and remove it
            if (bullet.isIncendiary) {
                // Create fire effect on the cactus
                createFireEffect(cactus.x, cactus.y, cactus.radius);

                // Play fire sound
                fireSound.currentTime = 0;
                playSound(fireSound);
                
                // Remove the cactus
                cacti.splice(j, 1);
                
                // Remove the bullet
                bullets.splice(i, 1);
                return true;
            }
            
            // Regular bullet bounce logic
            if (bullet.bounces < bullet.maxBounces) {
                // Calculate reflection vector
                const nx = dx / distance;
                const ny = dy / distance;
                
                // Dot product of velocity and normal
                const dot = bullet.speedX * nx + bullet.speedY * ny;
                
                // Calculate reflection
                bullet.speedX = bullet.speedX - 2 * dot * nx;
                bullet.speedY = bullet.speedY - 2 * dot * ny;
                
                // Play ricochet sound
                ricochetSound.currentTime = 0;
                playSound(ricochetSound);
                
                // Increment bounce counter
                bullet.bounces++;
                
                // Move bullet slightly to avoid getting stuck
                bullet.x += bullet.speedX * 0.2;
                bullet.y += bullet.speedY * 0.2;
                
                return true;
            } else {
                // Max bounces reached, remove bullet
                bullets.splice(i, 1);
                return true;
            }
        }
    }
    
    return false;
}

// Export all power-up related functions for use in the main game file
window.GamePowerups = {
    initPowerups,
    spawnPowerup,
    drawPowerups,
    updatePowerups,
    createPowerupBullet,
    processBulletCactusCollision,
    updatePowerupIndicators,
    showPowerupNotification,
    POWERUP_TYPES
};
// Game elements
const players = [
    {
        x: 100,
        y: 300,
        radius: 15,
        color: '#ff6666', // Red player
        hatColor: '#990000',
        health: 3,
        keys: {up: 'w', down: 's', left: 'a', right: 'd', shoot: 'c'},
        direction: 1,  // Facing right
        lastShot: 0,
        healthElements: document.querySelectorAll('#player1-health .health-point')
    },
    {
        x: 700,
        y: 300,
        radius: 15,
        color: '#6666ff', // Blue player
        hatColor: '#000099',
        health: 3,
        keys: {up: 'i', down: 'k', left: 'j', right: 'l', shoot: 'n'},
        direction: -1, // Facing left
        lastShot: 0,
        healthElements: document.querySelectorAll('#player2-health .health-point')
    }
];

// Obstacles (cacti)
const cacti = [];
const NUM_CACTI = 10;
const CACTUS_MIN_RADIUS = 20;
const CACTUS_MAX_RADIUS = 40;

const x = Math.random() * canvas.width;
const y = Math.random() * canvas.height;

// Game state
let gameOver = false;
const keysPressed = {};
let lastFrameTime = 0;

// Sound effects
const sounds = {
    gunshot: new Audio('shot.ogg'),
    ricochet: new Audio('ricochet.ogg'),
    hit: new Audio('splat.ogg')
};

// Initialize the game
function init() {
    // Create cacti at random positions
    cacti.length = 0;

    while (cacti.length < NUM_CACTI) {
        const radius = CACTUS_MIN_RADIUS + Math.random() * (CACTUS_MAX_RADIUS - CACTUS_MIN_RADIUS);
        const x = radius + Math.random() * (canvas.width - 2 * radius);
        const y = radius + Math.random() * (canvas.height - 2 * radius);

        // Check for overlap with existing cacti and players
        let overlap = false;
        for (const cactus of cacti) {
            const dx = x - cactus.x;
            const dy = y - cactus.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < radius + cactus.radius + 10) {
                overlap = true;
                break;
            }
        }

        // Check overlap with players
        for (const player of players) {
            const dx = x - player.x;
            const dy = y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < radius + player.radius + 50) {
                overlap = true;
                break;
            }
        }

        if (!overlap) {
            cacti.push({
                x,
                y,
                radius
            });
        }
    }

    // Reset players
    players[0].x = 100;
    players[0].y = 300;
    players[0].health = 3;

    players[1].x = 700;
    players[1].y = 300;
    players[1].health = 3;

    // Initialize power-ups for players
    GamePowerups.initPowerups(players);

    // Clear power-ups array
    powerups = [];

    // Update health display
    updateHealthDisplay();

    // Clear bullets
    bullets.length = 0;

    // Reset game state
    gameOver = false;

    // Hide game over screen
    document.getElementById('game-over').style.display = 'none';

    // Start game loop
    requestAnimationFrame(gameLoop);
}

// Game loop
function gameLoop(timestamp) {
    // Calculate delta time
    if (!lastFrameTime) lastFrameTime = timestamp;
    const deltaTime = (timestamp - lastFrameTime) / 1000; // convert to seconds
    lastFrameTime = timestamp;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawDesertBackground();

    // Spawn and update power-ups
    GamePowerups.spawnPowerup(timestamp, cacti, players);
    GamePowerups.updatePowerups(timestamp, players);

    // Update and draw game elements
    updatePlayers(deltaTime);
    updateBullets(deltaTime);

    // Draw cacti
    for (const cactus of cacti) {
        drawCactus(cactus);
    }

    // Draw power-ups
    GamePowerups.drawPowerups();

    // Draw players
    for (const player of players) {
        drawPlayer(player);
    }

    // Draw bullets
    for (const bullet of bullets) {
        drawBullet(bullet);
    }

    // Update power-up UI indicators
    GamePowerups.updatePowerupIndicators();

    updateFireParticles(deltaTime);

    // Continue the game loop if not game over
    if (!gameOver) {
        requestAnimationFrame(gameLoop);
    }
}

function drawDesertBackground() {
    // Base desert color
    ctx.fillStyle = '#d2b48c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw pixel-like dithering pattern for sand texture
    ctx.fillStyle = '#c2a47c';
    for (let x = 0; x < canvas.width; x += 4) {
        for (let y = 0; y < canvas.height; y += 4) {
            if ((x + y) % 8 === 0) {
                ctx.fillRect(x, y, 2, 2);
            }
        }
    }

    // Add some darker spots
    ctx.fillStyle = '#a28a6c';
    for (let i = 0; i < 200; i++) {

        const size = 1 + Math.random() * 3;
        ctx.fillRect(x, y, size, size);
    }
}

function updatePlayers(deltaTime) {
    for (const player of players) {
        // Use player.defaultSpeed if it exists, otherwise use the constant speed
        const speed = player.defaultSpeed || 150; // pixels per second
        const movement = speed * deltaTime;

        // Movement
        if (keysPressed[player.keys.up] && player.y - player.radius > 0) {
            player.y -= movement;
        }
        if (keysPressed[player.keys.down] && player.y + player.radius < canvas.height) {
            player.y += movement;
        }
        if (keysPressed[player.keys.left] && player.x - player.radius > 0) {
            player.x -= movement;
            player.direction = -1;
        }
        if (keysPressed[player.keys.right] && player.x + player.radius < canvas.width) {
            player.x += movement;
            player.direction = 1;
        }

        // Check collision with cacti
        for (const cactus of cacti) {
            const dx = player.x - cactus.x;
            const dy = player.y - cactus.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = player.radius + cactus.radius;

            if (distance < minDistance) {
                // Move player outside the cactus
                const angle = Math.atan2(dy, dx);
                player.x = cactus.x + Math.cos(angle) * minDistance;
                player.y = cactus.y + Math.sin(angle) * minDistance;
            }
        }

        // Shooting
        const now = Date.now();
        if (keysPressed[player.keys.shoot] && now - player.lastShot > (player.shootCooldown || BULLET_COOLDOWN)) {
            player.lastShot = now;

            // Create a new bullet
            const angle = player.direction > 0 ? 0 : Math.PI;
            GamePowerups.createPowerupBullet(player, angle, bullets);

            // Play gunshot sound
            playSound(sounds.gunshot);
        }
    }
}

function updateBullets(deltaTime) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];

        // Move bullet
        bullet.x += bullet.speedX * deltaTime;
        bullet.y += bullet.speedY * deltaTime;

        // Check if bullet is out of bounds
        if (bullet.x < -bullet.radius ||
            bullet.x > canvas.width + bullet.radius ||
            bullet.y < -bullet.radius ||
            bullet.y > canvas.height + bullet.radius) {
            bullets.splice(i, 1);
            continue;
        }

        // Use power-up collision detection for cacti
        if (GamePowerups.processBulletCactusCollision(bullet, cacti, i, bullets)) {
            continue;
        }

        // Check collision with players
        for (const player of players) {
            // Skip if bullet belongs to this player
            if (bullet.playerId === player.id) continue;

            const dx = bullet.x - player.x;
            const dy = bullet.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < bullet.radius + player.radius) {
                // Check if player has shields from bulletproof vest
                if (player.shields > 0) {
                    player.shields--;
                    GamePowerups.showPowerupNotification("Shield absorbed hit!");
                } else {
                    // Player hit
                    player.health--;
                    updateHealthDisplay();

                    // Play hit sound
                    playSound(sounds.hit);

                    // Check for game over
                    if (player.health <= 0) {
                        endGame(player);
                    }
                }

                // Remove bullet
                bullets.splice(i, 1);
                break;
            }
        }
    }
}

function drawPlayer(player) {
    // Body
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cowboy hat (draw above head with proper direction)
    drawCowboyHat(player);

    // Eyes
    const eyeX = player.x + player.direction * player.radius * 0.4;
    const eyeY = player.y - player.radius * 0.2;
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, player.radius * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eyeX + player.direction * player.radius * 0.1, eyeY, player.radius * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();
}

function drawCowboyHat(player) {
    ctx.fillStyle = player.hatColor;

    // Hat brim
    ctx.beginPath();
    if (player.direction > 0) {
        ctx.ellipse(
            player.x,
            player.y - player.radius * 0.9,
            player.radius * 1.5,
            player.radius * 0.4,
            0,
            0,
            Math.PI * 2
        );
    } else {
        ctx.ellipse(
            player.x,
            player.y - player.radius * 0.9,
            player.radius * 1.5,
            player.radius * 0.4,
            0,
            0,
            Math.PI * 2
        );
    }
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Hat top
    ctx.beginPath();
    ctx.ellipse(
        player.x,
        player.y - player.radius * 1.3,
        player.radius * 0.8,
        player.radius * 0.5,
        0,
        0,
        Math.PI * 2
    );
    ctx.fill();
    ctx.stroke();

    // Hat band
    ctx.beginPath();
    ctx.ellipse(
        player.x,
        player.y - player.radius * 1.1,
        player.radius * 0.81,
        player.radius * 0.51,
        0,
        0,
        Math.PI * 2
    );
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawCactus(cactus) {
    // Draw basic cactus shape (circle with spikes)
    ctx.beginPath();
    ctx.arc(cactus.x, cactus.y, cactus.radius * 0.9, 0, Math.PI * 2);

    // Gradient for a more HD-2D look
    const gradient = ctx.createRadialGradient(
        cactus.x - cactus.radius * 0.3,
        cactus.y - cactus.radius * 0.3,
        0,
        cactus.x,
        cactus.y,
        cactus.radius
    );
    gradient.addColorStop(0, '#5a9e5a');
    gradient.addColorStop(1, '#3a7a3a');

    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#295429';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw spikes
    const spikes = 16;
    const spikeLength = cactus.radius * 0.2;

    for (let i = 0; i < spikes; i++) {
        const angle = (i / spikes) * Math.PI * 2;
        const innerX = cactus.x + Math.cos(angle) * cactus.radius * 0.9;
        const innerY = cactus.y + Math.sin(angle) * cactus.radius * 0.9;
        const outerX = cactus.x + Math.cos(angle) * (cactus.radius + spikeLength);
        const outerY = cactus.y + Math.sin(angle) * (cactus.radius + spikeLength);

        ctx.beginPath();
        ctx.moveTo(innerX, innerY);
        ctx.lineTo(outerX, outerY);
        ctx.strokeStyle = '#a0a0a0';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    // Add dithering effect for a pixel-art look
    ctx.fillStyle = '#ffffff40';
    for (let i = 0; i < cactus.radius * 2; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * cactus.radius * 0.8;
        const x = cactus.x + Math.cos(angle) * distance;
        const y = cactus.y + Math.sin(angle) * distance;

        if (Math.random() > 0.8) {
            ctx.fillRect(x, y, 1, 1);
        }
    }
}

function drawBullet(bullet) {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fillStyle = bullet.color;
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Add a small trail
    ctx.beginPath();
    ctx.moveTo(bullet.x, bullet.y);
    ctx.lineTo(bullet.x - bullet.speedX / 20, bullet.y - bullet.speedY / 20);
    ctx.strokeStyle = '#ffffff80';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function updateHealthDisplay() {
    for (let i = 0; i < players.length; i++) {
        const player = players[i];
        for (let j = 0; j < player.healthElements.length; j++) {
            if (j < player.health) {
                player.healthElements[j].style.backgroundColor = '#22cc22';
            } else {
                player.healthElements[j].style.backgroundColor = '#555555';
            }
        }
    }
}

function endGame(losingPlayer) {
    gameOver = true;
    const winner = losingPlayer === players[0] ? 'Player 2 (Blue)' : 'Player 1 (Red)';
    document.getElementById('winner-text').textContent = `${winner} Wins!`;
    document.getElementById('game-over').style.display = 'block';
}

function playSound(sound) {
    // Clone the sound for overlapping play
    const soundClone = sound.cloneNode();
    soundClone.volume = 0.4;
    soundClone.play().catch(e => console.log("Audio play failed:", e));
}

// Event listeners
document.addEventListener('keydown', (e) => {
    keysPressed[e.key.toLowerCase()] = true;

    // Prevent scrolling with these keys
    if (['w', 'a', 's', 'd', 'i', 'j', 'k', 'l', 'c', 'n'].includes(e.key.toLowerCase())) {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    keysPressed[e.key.toLowerCase()] = false;
});

document.getElementById('restart-button').addEventListener('click', init);

// Initialize the game
init();
