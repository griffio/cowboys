// Audio Manager for Cowboys Game

// Sound URLs from free sound libraries
const AUDIO_SOURCES = {
    // Laser/gun sound for shooting
    shot: 'sounds/shot.ogg',
    
    // Ricochet sound for bullet bouncing off cactus
    ricochet: 'sounds/ricochet.ogg',
    
    // Hit sound for when a player is hit
    hit: 'sounds/splat.ogg',
    
    // Power-up collection sound
    powerup: 'sounds/pop.ogg'
};

// Audio Manager class to handle sound effects
class AudioManager {
    constructor() {
        this.sounds = {};
        this.muted = false;
        
        // Pre-load all sounds
        this.loadSounds();
    }
    
    // Load all sound effects
    loadSounds() {
        for (const [name, url] of Object.entries(AUDIO_SOURCES)) {
            this.sounds[name] = new Audio(url);
            this.sounds[name].preload = 'auto';
            
            // Add error handling
            this.sounds[name].addEventListener('error', (e) => {
                console.warn(`Error loading sound ${name}: ${e}`);
            });
        }
    }
    
    // Play a sound effect
    play(soundName) {
        if (this.muted || !this.sounds[soundName]) return;
        
        try {
            // Reset the audio to the beginning if it's already playing
            const sound = this.sounds[soundName];
            sound.currentTime = 0;
            sound.play().catch(error => {
                console.warn(`Error playing sound ${soundName}: ${error}`);
            });
        } catch (error) {
            console.warn(`Error playing sound ${soundName}: ${error}`);
        }
    }
    
    // Mute/unmute all sounds
    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }
    
    // Set mute state
    setMute(muted) {
        this.muted = muted;
    }
}

// Create a global audio manager instance
const audioManager = new AudioManager();