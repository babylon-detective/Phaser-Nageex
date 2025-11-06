import * as Tone from 'tone';

/**
 * SHOOTER SCENE SFX - Sound effects for rail shooter minigame
 * 
 * Handles:
 * - Scene entry/exit
 * - Pause/unpause
 * - Victory/completion
 * - Shooting sounds (for future use)
 * - Hit sounds (for future use)
 */
export class ShooterSceneSFX {
    constructor() {
        this.initialized = false;
        this.volume = -10; // dB
        
        // Synths
        this.sceneEnter = null;
        this.sceneExit = null;
        this.pause = null;
        this.unpause = null;
        this.victory = null;
        this.shoot = null;
        this.hit = null;
        this.miss = null;
        
        console.log('[ShooterSceneSFX] Created (not initialized)');
    }
    
    /**
     * Initialize all sound effects
     */
    async init() {
        if (this.initialized) {
            console.log('[ShooterSceneSFX] Already initialized');
            return;
        }
        
        console.log('[ShooterSceneSFX] Setting up sound effects...');
        
        // Scene enter sound (energetic tone)
        this.sceneEnter = new Tone.Synth({
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.3 }
        }).toDestination();
        this.sceneEnter.volume.value = this.volume;
        
        // Scene exit sound (descending tone)
        this.sceneExit = new Tone.Synth({
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.2 }
        }).toDestination();
        this.sceneExit.volume.value = this.volume;
        
        // Pause sound (quick click)
        this.pause = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
        }).toDestination();
        this.pause.volume.value = this.volume;
        
        // Unpause sound (quick click)
        this.unpause = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
        }).toDestination();
        this.unpause.volume.value = this.volume;
        
        // Victory sound (triumphant chord)
        this.victory = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sine' },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.8 }
        }).toDestination();
        this.victory.volume.value = this.volume;
        
        // Shoot sound (quick zap - for future use)
        this.shoot = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.001, decay: 0.05, sustain: 0.1, release: 0.1 }
        }).toDestination();
        this.shoot.volume.value = this.volume;
        
        // Hit sound (impact - for future use)
        this.hit = new Tone.NoiseSynth({
            noise: { type: 'white' },
            envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
        }).toDestination();
        this.hit.volume.value = this.volume;
        
        // Miss sound (whoosh - for future use)
        this.miss = new Tone.Synth({
            oscillator: { type: 'square' },
            envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 }
        }).toDestination();
        this.miss.volume.value = this.volume - 5; // Quieter
        
        this.initialized = true;
        console.log('[ShooterSceneSFX] ✅ Sound effects ready');
    }
    
    /**
     * Play scene enter sound
     */
    playSceneEnter() {
        if (!this.initialized) return;
        // Ascending tone
        this.sceneEnter.triggerAttackRelease('C4', '8n');
        Tone.Transport.scheduleOnce(() => {
            this.sceneEnter.triggerAttackRelease('E4', '8n');
        }, '+8n');
    }
    
    /**
     * Play scene exit sound
     */
    playSceneExit() {
        if (!this.initialized) return;
        // Descending tone
        this.sceneExit.triggerAttackRelease('E4', '8n');
        Tone.Transport.scheduleOnce(() => {
            this.sceneExit.triggerAttackRelease('C4', '8n');
        }, '+8n');
    }
    
    /**
     * Play pause sound
     */
    playPause() {
        if (!this.initialized) return;
        this.pause.triggerAttackRelease('C4', '16n');
    }
    
    /**
     * Play unpause sound
     */
    playUnpause() {
        if (!this.initialized) return;
        this.unpause.triggerAttackRelease('E4', '16n');
    }
    
    /**
     * Play victory sound
     */
    playVictory() {
        if (!this.initialized) return;
        // Triumphant major chord
        this.victory.triggerAttackRelease(['C4', 'E4', 'G4', 'C5'], '2n');
    }
    
    /**
     * Play shoot sound (for future use)
     */
    playShoot() {
        if (!this.initialized) return;
        this.shoot.triggerAttackRelease('C5', '16n');
    }
    
    /**
     * Play hit sound (for future use)
     */
    playHit() {
        if (!this.initialized) return;
        this.hit.triggerAttackRelease('16n');
    }
    
    /**
     * Play miss sound (for future use)
     */
    playMiss() {
        if (!this.initialized) return;
        this.miss.triggerAttackRelease('C3', '8n');
    }
    
    /**
     * Set volume for all SFX
     */
    setVolume(volume) {
        this.volume = volume;
        if (this.sceneEnter) this.sceneEnter.volume.value = volume;
        if (this.sceneExit) this.sceneExit.volume.value = volume;
        if (this.pause) this.pause.volume.value = volume;
        if (this.unpause) this.unpause.volume.value = volume;
        if (this.victory) this.victory.volume.value = volume;
        if (this.shoot) this.shoot.volume.value = volume;
        if (this.hit) this.hit.volume.value = volume;
        if (this.miss) this.miss.volume.value = volume - 5;
    }
    
    /**
     * Dispose of all synths
     */
    dispose() {
        if (this.sceneEnter) this.sceneEnter.dispose();
        if (this.sceneExit) this.sceneExit.dispose();
        if (this.pause) this.pause.dispose();
        if (this.unpause) this.unpause.dispose();
        if (this.victory) this.victory.dispose();
        if (this.shoot) this.shoot.dispose();
        if (this.hit) this.hit.dispose();
        if (this.miss) this.miss.dispose();
        
        this.sceneEnter = null;
        this.sceneExit = null;
        this.pause = null;
        this.unpause = null;
        this.victory = null;
        this.shoot = null;
        this.hit = null;
        this.miss = null;
        this.initialized = false;
        
        console.log('[ShooterSceneSFX] Disposed');
    }
}

