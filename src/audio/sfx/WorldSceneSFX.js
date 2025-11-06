import * as Tone from 'tone';

/**
 * WORLD SCENE SFX - Sound effects for overworld exploration
 * 
 * Handles:
 * - Map opening
 * - Menu opening
 * - Vehicle boarding
 * - Footsteps (optional)
 * - Interaction sounds
 */
export class WorldSceneSFX {
    constructor() {
        this.initialized = false;
        this.volume = -10; // dB
        
        // Synths
        this.mapOpen = null;
        this.menuOpen = null;
        this.vehicleBoard = null;
        this.footstep = null;
        this.interaction = null;
        this.encounter = null;
        this.walking = null;
        this.sprintCharge = null;
        
        // Walking sound state
        this.walkingInterval = null;
        this.isWalking = false;
        
        // Sprint charge sound state
        this.sprintChargeOscillator = null;
        this.isCharging = false;
        
        console.log('[WorldSceneSFX] Created (not initialized)');
    }
    
    /**
     * Initialize all sound effects (lazy loading - only create when needed)
     */
    async init() {
        if (this.initialized) {
            console.log('[WorldSceneSFX] Already initialized');
            return;
        }
        
        console.log('[WorldSceneSFX] Setting up sound effects (lazy loading)...');
        
        // Create shared master volume for all SFX (performance optimization)
        this.masterVolume = new Tone.Volume(this.volume).toDestination();
        
        // Don't create synths upfront - create them lazily when needed
        this.initialized = true;
        console.log('[WorldSceneSFX] ✅ Sound effects ready (lazy loading enabled)');
    }
    
    /**
     * Lazy initialization helper - creates synth only when needed
     */
    _getOrCreateSynth(name, config) {
        if (!this[name]) {
            this[name] = new Tone.Synth(config).connect(this.masterVolume);
            this[name].volume.value = 0; // Use master volume instead
        }
        return this[name];
    }
    
    _getOrCreateNoiseSynth(name, config) {
        if (!this[name]) {
            this[name] = new Tone.NoiseSynth(config).connect(this.masterVolume);
            this[name].volume.value = 0; // Use master volume instead
        }
        return this[name];
    }
    
    /**
     * Play map open sound
     */
    playMapOpen() {
        if (!this.initialized) return;
        const synth = this._getOrCreateSynth('mapOpen', {
            oscillator: { type: 'sine' },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.5 }
        });
        synth.triggerAttackRelease('C5', '8n');
    }
    
    /**
     * Play menu open sound
     */
    playMenuOpen() {
        if (!this.initialized) return;
        const synth = this._getOrCreateSynth('menuOpen', {
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 }
        });
        synth.triggerAttackRelease('E4', '16n');
    }
    
    /**
     * Play vehicle boarding sound (optimized - no Transport)
     */
    playVehicleBoard() {
        if (!this.initialized) return;
        const synth = this._getOrCreateSynth('vehicleBoard', {
            oscillator: { type: 'sine' }, // Changed from sawtooth for performance
            envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.4 }
        });
        // Use setTimeout instead of Tone.Transport for better performance
        synth.triggerAttackRelease('C4', '8n');
        setTimeout(() => synth.triggerAttackRelease('E4', '8n'), 125); // ~8n at 120 BPM
        setTimeout(() => synth.triggerAttackRelease('G4', '8n'), 250);
    }
    
    /**
     * Play footstep sound
     */
    playFootstep() {
        if (!this.initialized) return;
        const synth = this._getOrCreateNoiseSynth('footstep', {
            noise: { type: 'brown' },
            envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
        });
        synth.volume.value = -5; // Quieter
        synth.triggerAttackRelease('8n');
    }
    
    /**
     * Play interaction sound
     */
    playInteraction() {
        if (!this.initialized) return;
        const synth = this._getOrCreateSynth('interaction', {
            oscillator: { type: 'sine' },
            envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
        });
        synth.triggerAttackRelease('G4', '16n');
    }
    
    /**
     * Play NPC encounter sound (optimized - no Transport, simpler synth)
     */
    playEncounter() {
        if (!this.initialized) return;
        // Use simple Synth instead of PolySynth for better performance
        const synth = this._getOrCreateSynth('encounter', {
            oscillator: { type: 'sine' }, // Changed from sawtooth for performance
            envelope: { attack: 0.1, decay: 0.3, sustain: 0.4, release: 1.5 }
        });
        // Use setTimeout instead of Tone.Transport
        synth.triggerAttackRelease('C3', '8n');
        setTimeout(() => synth.triggerAttackRelease('Eb3', '8n'), 125);
        setTimeout(() => synth.triggerAttackRelease('G3', '8n'), 250);
        setTimeout(() => synth.triggerAttackRelease('C4', '8n'), 375);
        setTimeout(() => synth.triggerAttackRelease('Eb4', '8n'), 500);
        setTimeout(() => synth.triggerAttackRelease('G4', '8n'), 625);
        setTimeout(() => synth.triggerAttackRelease('C5', '4n'), 750);
    }
    
    /**
     * Start walking sound (continuous - optimized with longer interval)
     */
    startWalking() {
        if (!this.initialized || this.isWalking) return;
        this.isWalking = true;
        const synth = this._getOrCreateNoiseSynth('walking', {
            noise: { type: 'brown' },
            envelope: { attack: 0.01, decay: 0.05, sustain: 0.3, release: 0.1 }
        });
        synth.volume.value = -8; // Quieter for continuous sound
        // Reduced frequency for better performance (every 0.4s instead of 0.3s)
        this.walkingInterval = setInterval(() => {
            if (this.isWalking && synth) {
                synth.triggerAttackRelease('16n');
            }
        }, 400);
    }
    
    /**
     * Stop walking sound
     */
    stopWalking() {
        if (!this.isWalking) return;
        this.isWalking = false;
        if (this.walkingInterval) {
            clearInterval(this.walkingInterval);
            this.walkingInterval = null;
        }
    }
    
    /**
     * Start sprint charge sound (continuous while holding Shift)
     */
    startSprintCharge() {
        if (!this.initialized || this.isCharging) return;
        this.isCharging = true;
        const synth = this._getOrCreateSynth('sprintCharge', {
            oscillator: { type: 'sine' },
            envelope: { attack: 0.1, decay: 0.1, sustain: 1, release: 0.2 }
        });
        synth.volume.value = -5;
        // Start at low frequency (C3 = ~130.81 Hz)
        synth.triggerAttack('C3');
        // Gradually increase frequency as charge builds (C3 to C5 = ~523.25 Hz)
        const startFreq = Tone.Frequency('C3').toFrequency();
        const endFreq = Tone.Frequency('C5').toFrequency();
        synth.frequency.rampTo(endFreq, 1); // Ramp over 1 second
    }
    
    /**
     * Stop sprint charge sound (when Shift is released)
     */
    stopSprintCharge() {
        if (!this.isCharging) return;
        this.isCharging = false;
        if (this.sprintCharge) {
            // Quick release
            this.sprintCharge.triggerRelease();
        }
    }
    
    /**
     * Set volume for all SFX (optimized - uses master volume)
     */
    setVolume(volume) {
        this.volume = volume;
        if (this.masterVolume) {
            this.masterVolume.volume.value = volume;
        }
    }
    
    /**
     * Dispose of all synths
     */
    dispose() {
        // Stop continuous sounds
        this.stopWalking();
        this.stopSprintCharge();
        
        // Dispose all created synths (lazy loaded)
        const synthNames = ['mapOpen', 'menuOpen', 'vehicleBoard', 'footstep', 
                           'interaction', 'encounter', 'walking', 'sprintCharge'];
        synthNames.forEach(name => {
            if (this[name]) {
                this[name].dispose();
                this[name] = null;
            }
        });
        
        // Dispose master volume
        if (this.masterVolume) {
            this.masterVolume.dispose();
            this.masterVolume = null;
        }
        
        this.initialized = false;
        console.log('[WorldSceneSFX] Disposed');
    }
}

