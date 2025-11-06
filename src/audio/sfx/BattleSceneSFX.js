import * as Tone from 'tone';

/**
 * BATTLE SCENE SFX - Sound effects for combat
 * 
 * Handles:
 * - Attack sounds
 * - Hit/impact sounds
 * - Dash/movement
 * - Level up
 * - Victory/defeat
 * - Projectile sounds
 */
export class BattleSceneSFX {
    constructor() {
        this.initialized = false;
        this.volume = -8; // dB (slightly louder for combat)
        
        // Synths
        this.attack = null;
        this.hit = null;
        this.dash = null;
        this.levelUp = null;
        this.victory = null;
        this.defeat = null;
        this.projectile = null;
        this.block = null;
        this.critical = null;
        this.apCharge = null;
        
        // AP charge sound state
        this.isChargingAP = false;
        
        console.log('[BattleSceneSFX] Created (not initialized)');
    }
    
    /**
     * Initialize all sound effects (lazy loading - only create when needed)
     */
    async init() {
        if (this.initialized) {
            console.log('[BattleSceneSFX] Already initialized');
            return;
        }
        
        console.log('[BattleSceneSFX] Setting up sound effects (lazy loading)...');
        
        // Create shared master volume for all SFX (performance optimization)
        this.masterVolume = new Tone.Volume(this.volume).toDestination();
        
        // Don't create synths upfront - create them lazily when needed
        this.initialized = true;
        console.log('[BattleSceneSFX] ✅ Sound effects ready (lazy loading enabled)');
    }
    
    /**
     * Lazy initialization helpers - creates synths only when needed
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
    
    _getOrCreateMembraneSynth(name, config) {
        if (!this[name]) {
            this[name] = new Tone.MembraneSynth(config).connect(this.masterVolume);
            this[name].volume.value = 0; // Use master volume instead
        }
        return this[name];
    }
    
    /**
     * Play attack sound
     */
    playAttack() {
        if (!this.initialized) return;
        const synth = this._getOrCreateMembraneSynth('attack', {
            pitchDecay: 0.05,
            octaves: 4,
            oscillator: { type: 'sine' },
            envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
        });
        synth.triggerAttackRelease('C2', '8n');
    }
    
    /**
     * Play hit sound
     */
    playHit() {
        if (!this.initialized) return;
        const synth = this._getOrCreateNoiseSynth('hit', {
            noise: { type: 'white' },
            envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
        });
        synth.triggerAttackRelease('8n');
    }
    
    /**
     * Play dash sound (optimized - no Transport)
     */
    playDash() {
        if (!this.initialized) return;
        const synth = this._getOrCreateSynth('dash', {
            oscillator: { type: 'sine' }, // Changed from square for performance
            envelope: { attack: 0.001, decay: 0.1, sustain: 0.2, release: 0.1 }
        });
        // Use setTimeout instead of Tone.Transport
        synth.triggerAttackRelease('C4', '16n');
        setTimeout(() => synth.triggerAttackRelease('C3', '16n'), 62); // ~16n at 120 BPM
    }
    
    /**
     * Play level up sound (optimized - simpler synth, no Transport)
     */
    playLevelUp() {
        if (!this.initialized) return;
        // Use simple Synth instead of PolySynth for better performance
        const synth = this._getOrCreateSynth('levelUp', {
            oscillator: { type: 'sine' }, // Changed from triangle for performance
            envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.5 }
        });
        // Use setTimeout instead of Tone.Transport
        synth.triggerAttackRelease('C4', '4n');
        setTimeout(() => synth.triggerAttackRelease('E4', '4n'), 500);
        setTimeout(() => synth.triggerAttackRelease('G4', '4n'), 1000);
        setTimeout(() => synth.triggerAttackRelease('C5', '4n'), 1500);
        setTimeout(() => synth.triggerAttackRelease('E5', '4n'), 2000);
        setTimeout(() => synth.triggerAttackRelease('G5', '4n'), 2500);
    }
    
    /**
     * Play victory sound (optimized - simpler synth)
     */
    playVictory() {
        if (!this.initialized) return;
        // Use simple Synth instead of PolySynth for better performance
        const synth = this._getOrCreateSynth('victory', {
            oscillator: { type: 'sine' },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.8 }
        });
        // Play chord notes sequentially instead of simultaneously
        synth.triggerAttackRelease('C4', '2n');
        setTimeout(() => synth.triggerAttackRelease('E4', '2n'), 500);
        setTimeout(() => synth.triggerAttackRelease('G4', '2n'), 1000);
        setTimeout(() => synth.triggerAttackRelease('C5', '2n'), 1500);
    }
    
    /**
     * Play defeat sound (optimized - no Transport)
     */
    playDefeat() {
        if (!this.initialized) return;
        const synth = this._getOrCreateSynth('defeat', {
            oscillator: { type: 'sine' }, // Changed from sawtooth for performance
            envelope: { attack: 0.01, decay: 1.0, sustain: 0, release: 0.5 }
        });
        // Use setTimeout instead of Tone.Transport
        synth.triggerAttackRelease('C4', '1n');
        setTimeout(() => synth.triggerAttackRelease('C3', '1n'), 1000);
    }
    
    /**
     * Play projectile sound
     */
    playProjectile() {
        if (!this.initialized) return;
        const synth = this._getOrCreateSynth('projectile', {
            oscillator: { type: 'sine' },
            envelope: { attack: 0.001, decay: 0.05, sustain: 0.1, release: 0.2 }
        });
        synth.triggerAttackRelease('C5', '16n');
    }
    
    /**
     * Play block sound (optimized - simpler synth)
     */
    playBlock() {
        if (!this.initialized) return;
        // Use simple Synth instead of MetalSynth for better performance
        const synth = this._getOrCreateSynth('block', {
            oscillator: { type: 'sine' },
            envelope: { attack: 0.001, decay: 0.1, sustain: 0.1, release: 0.2 }
        });
        synth.triggerAttackRelease('C3', '8n');
    }
    
    /**
     * Play critical hit sound
     */
    playCritical() {
        if (!this.initialized) return;
        const synth = this._getOrCreateMembraneSynth('critical', {
            pitchDecay: 0.1,
            octaves: 6,
            oscillator: { type: 'sine' },
            envelope: { attack: 0.001, decay: 0.3, sustain: 0.01, release: 0.8 }
        });
        synth.volume.value = 2; // Louder for emphasis
        synth.triggerAttackRelease('C2', '4n');
    }
    
    /**
     * Start AP charge sound (continuous while charging AP)
     */
    startAPCharge() {
        if (!this.initialized || this.isChargingAP) return;
        this.isChargingAP = true;
        const synth = this._getOrCreateSynth('apCharge', {
            oscillator: { type: 'sine' }, // Changed from triangle for performance
            envelope: { attack: 0.1, decay: 0.1, sustain: 1, release: 0.2 }
        });
        synth.volume.value = -3; // Quieter for continuous sound
        // Start at low frequency (E3)
        synth.triggerAttack('E3');
        // Gradually increase frequency as AP charges (E3 to E5)
        const startFreq = Tone.Frequency('E3').toFrequency();
        const endFreq = Tone.Frequency('E5').toFrequency();
        synth.frequency.rampTo(endFreq, 2.5); // Ramp over 2.5 seconds (time to max AP)
    }
    
    /**
     * Stop AP charge sound (when charging stops)
     */
    stopAPCharge() {
        if (!this.isChargingAP) return;
        this.isChargingAP = false;
        if (this.apCharge) {
            // Quick release
            this.apCharge.triggerRelease();
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
        this.stopAPCharge();
        
        // Dispose all created synths (lazy loaded)
        const synthNames = ['attack', 'hit', 'dash', 'levelUp', 'victory', 'defeat', 
                           'projectile', 'block', 'critical', 'apCharge'];
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
        console.log('[BattleSceneSFX] Disposed');
    }
}

