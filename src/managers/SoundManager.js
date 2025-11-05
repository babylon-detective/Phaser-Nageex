import * as Tone from 'tone';

/**
 * SoundManager - Centralized sound system using Tone.js
 * Handles sound effects and background music
 */
class SoundManager {
    constructor() {
        this.initialized = false;
        this.sfxVolume = -10; // dB
        this.musicVolume = -15; // dB
        this.masterVolume = 0; // dB
        
        // Sound effects
        this.synths = {};
        this.players = {};
        
        // Music
        this.currentMusic = null;
        this.musicPlayer = null;
        
        // Mute states
        this.sfxMuted = false;
        this.musicMuted = false;
        
        console.log('[SoundManager] Created (not initialized - waiting for user interaction)');
    }
    
    /**
     * Initialize Tone.js (must be called after user interaction)
     */
    async init() {
        if (this.initialized) {
            console.log('[SoundManager] Already initialized');
            return;
        }
        
        try {
            await Tone.start();
            console.log('[SoundManager] Tone.js initialized');
            
            // Set up master volume control
            Tone.getDestination().volume.value = this.masterVolume;
            
            // Create sound effect synthesizers
            this.setupSoundEffects();
            
            this.initialized = true;
            console.log('[SoundManager] ✅ Sound system ready');
        } catch (error) {
            console.error('[SoundManager] Failed to initialize:', error);
        }
    }
    
    /**
     * Set up synthesizers for sound effects
     */
    setupSoundEffects() {
        console.log('[SoundManager] Setting up sound effects...');
        
        // UI Sounds
        this.synths.menuSelect = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
        }).toDestination();
        
        this.synths.menuConfirm = new Tone.Synth({
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 }
        }).toDestination();
        
        this.synths.menuCancel = new Tone.Synth({
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 }
        }).toDestination();
        
        // Combat Sounds
        this.synths.attack = new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 4,
            oscillator: { type: 'sine' },
            envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
        }).toDestination();
        
        this.synths.hit = new Tone.NoiseSynth({
            noise: { type: 'white' },
            envelope: { attack: 0.001, decay: 0.1, sustain: 0 }
        }).toDestination();
        
        this.synths.dash = new Tone.Synth({
            oscillator: { type: 'square' },
            envelope: { attack: 0.001, decay: 0.1, sustain: 0.2, release: 0.1 }
        }).toDestination();
        
        this.synths.projectile = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.001, decay: 0.05, sustain: 0.1, release: 0.2 }
        }).toDestination();
        
        // System Sounds
        this.synths.levelUp = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.5 }
        }).toDestination();
        
        this.synths.victory = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sine' },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.8 }
        }).toDestination();
        
        this.synths.defeat = new Tone.Synth({
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.01, decay: 1.0, sustain: 0, release: 0.5 }
        }).toDestination();
        
        // Movement Sounds
        this.synths.step = new Tone.NoiseSynth({
            noise: { type: 'brown' },
            envelope: { attack: 0.001, decay: 0.05, sustain: 0 }
        }).toDestination();
        
        // Set volumes for all synths
        Object.values(this.synths).forEach(synth => {
            synth.volume.value = this.sfxVolume;
        });
        
        console.log('[SoundManager] ✅ Sound effects ready');
    }
    
    /**
     * Play sound effect
     */
    playSFX(name, note = 'C4', duration = '8n') {
        if (!this.initialized || this.sfxMuted) return;
        
        const synth = this.synths[name];
        if (!synth) {
            console.warn(`[SoundManager] SFX not found: ${name}`);
            return;
        }
        
        try {
            if (synth instanceof Tone.NoiseSynth) {
                synth.triggerAttackRelease(duration);
            } else if (synth instanceof Tone.PolySynth) {
                synth.triggerAttackRelease(note, duration);
            } else {
                synth.triggerAttackRelease(note, duration);
            }
        } catch (error) {
            console.error(`[SoundManager] Error playing SFX ${name}:`, error);
        }
    }
    
    // ===== Specific Sound Effects =====
    
    // UI Sounds
    playMenuSelect() {
        this.playSFX('menuSelect', 'C5', '32n');
    }
    
    playMenuConfirm() {
        this.playSFX('menuConfirm', 'E5', '16n');
    }
    
    playMenuCancel() {
        this.playSFX('menuCancel', 'G4', '16n');
    }
    
    // Combat Sounds
    playAttack() {
        this.playSFX('attack', 'C2', '8n');
    }
    
    playHit() {
        this.playSFX('hit', null, '32n');
    }
    
    playDash() {
        this.playSFX('dash', 'E4', '16n');
    }
    
    playProjectile() {
        this.playSFX('projectile', 'G5', '32n');
    }
    
    // System Sounds
    playLevelUp() {
        // Play ascending arpeggio
        const notes = ['C4', 'E4', 'G4', 'C5'];
        notes.forEach((note, i) => {
            setTimeout(() => {
                this.playSFX('levelUp', note, '8n');
            }, i * 100);
        });
    }
    
    playVictory() {
        // Play victory fanfare
        const melody = ['C4', 'E4', 'G4', 'C5', 'G4', 'C5'];
        melody.forEach((note, i) => {
            setTimeout(() => {
                this.playSFX('victory', note, '8n');
            }, i * 150);
        });
    }
    
    playDefeat() {
        // Play descending tone
        this.playSFX('defeat', 'E3', '2n');
    }
    
    playStep() {
        this.playSFX('step', null, '64n');
    }
    
    // ===== Music System =====
    
    /**
     * Load and play background music
     * @param {string} url - URL to audio file
     * @param {boolean} loop - Whether to loop the music
     */
    async playMusic(url, loop = true) {
        if (!this.initialized) {
            console.warn('[SoundManager] Not initialized, cannot play music');
            return;
        }
        
        try {
            // Stop current music if playing
            this.stopMusic();
            
            // Create new player
            this.musicPlayer = new Tone.Player({
                url: url,
                loop: loop,
                volume: this.musicVolume
            }).toDestination();
            
            await Tone.loaded();
            
            if (!this.musicMuted) {
                this.musicPlayer.start();
            }
            
            this.currentMusic = url;
            console.log(`[SoundManager] Playing music: ${url}`);
        } catch (error) {
            console.error('[SoundManager] Error loading music:', error);
        }
    }
    
    /**
     * Stop current background music
     */
    stopMusic() {
        if (this.musicPlayer) {
            this.musicPlayer.stop();
            this.musicPlayer.dispose();
            this.musicPlayer = null;
            this.currentMusic = null;
            console.log('[SoundManager] Music stopped');
        }
    }
    
    /**
     * Pause background music
     */
    pauseMusic() {
        if (this.musicPlayer && this.musicPlayer.state === 'started') {
            this.musicPlayer.stop();
            console.log('[SoundManager] Music paused');
        }
    }
    
    /**
     * Resume background music
     */
    resumeMusic() {
        if (this.musicPlayer && !this.musicMuted) {
            this.musicPlayer.start();
            console.log('[SoundManager] Music resumed');
        }
    }
    
    // ===== Volume Controls =====
    
    setMasterVolume(value) {
        this.masterVolume = value;
        if (this.initialized) {
            Tone.getDestination().volume.value = value;
        }
    }
    
    setSFXVolume(value) {
        this.sfxVolume = value;
        Object.values(this.synths).forEach(synth => {
            synth.volume.value = value;
        });
    }
    
    setMusicVolume(value) {
        this.musicVolume = value;
        if (this.musicPlayer) {
            this.musicPlayer.volume.value = value;
        }
    }
    
    // ===== Mute Controls =====
    
    toggleSFXMute() {
        this.sfxMuted = !this.sfxMuted;
        console.log(`[SoundManager] SFX ${this.sfxMuted ? 'muted' : 'unmuted'}`);
    }
    
    toggleMusicMute() {
        this.musicMuted = !this.musicMuted;
        if (this.musicMuted) {
            this.pauseMusic();
        } else {
            this.resumeMusic();
        }
        console.log(`[SoundManager] Music ${this.musicMuted ? 'muted' : 'unmuted'}`);
    }
    
    // ===== Cleanup =====
    
    dispose() {
        console.log('[SoundManager] Disposing sound system...');
        
        // Dispose all synths
        Object.values(this.synths).forEach(synth => {
            synth.dispose();
        });
        
        // Stop and dispose music
        this.stopMusic();
        
        // Dispose all players
        Object.values(this.players).forEach(player => {
            player.dispose();
        });
        
        this.initialized = false;
        console.log('[SoundManager] Sound system disposed');
    }
}

// Create singleton instance
export const soundManager = new SoundManager();
export default soundManager;

