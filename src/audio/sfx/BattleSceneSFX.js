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
     * Initialize all sound effects
     */
    async init() {
        if (this.initialized) {
            console.log('[BattleSceneSFX] Already initialized');
            return;
        }
        
        console.log('[BattleSceneSFX] Setting up sound effects...');
        
        // Attack sound (punchy membrane synth)
        this.attack = new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 4,
            oscillator: { type: 'sine' },
            envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
        }).toDestination();
        this.attack.volume.value = this.volume;
        
        // Hit sound (noise impact)
        this.hit = new Tone.NoiseSynth({
            noise: { type: 'white' },
            envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
        }).toDestination();
        this.hit.volume.value = this.volume;
        
        // Dash sound (whoosh)
        this.dash = new Tone.Synth({
            oscillator: { type: 'square' },
            envelope: { attack: 0.001, decay: 0.1, sustain: 0.2, release: 0.1 }
        }).toDestination();
        this.dash.volume.value = this.volume;
        
        // Level up sound (ascending chord)
        this.levelUp = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.5 }
        }).toDestination();
        this.levelUp.volume.value = this.volume;
        
        // Victory sound (triumphant chord)
        this.victory = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sine' },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.8 }
        }).toDestination();
        this.victory.volume.value = this.volume;
        
        // Defeat sound (descending tone)
        this.defeat = new Tone.Synth({
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.01, decay: 1.0, sustain: 0, release: 0.5 }
        }).toDestination();
        this.defeat.volume.value = this.volume;
        
        // Projectile sound (quick zap)
        this.projectile = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.001, decay: 0.05, sustain: 0.1, release: 0.2 }
        }).toDestination();
        this.projectile.volume.value = this.volume;
        
        // Block sound (metallic clang)
        this.block = new Tone.MetalSynth({
            frequency: 200,
            envelope: { attack: 0.001, decay: 0.1, sustain: 0.1, release: 0.2 },
            harmonicity: 5.1,
            modulationIndex: 32,
            resonance: 4000,
            octaves: 1.5
        }).toDestination();
        this.block.volume.value = this.volume;
        
        // Critical hit sound (sharp impact)
        this.critical = new Tone.MembraneSynth({
            pitchDecay: 0.1,
            octaves: 6,
            oscillator: { type: 'sine' },
            envelope: { attack: 0.001, decay: 0.3, sustain: 0.01, release: 0.8 }
        }).toDestination();
        this.critical.volume.value = this.volume + 2; // Louder for emphasis
        
        // AP charge sound (continuous while charging AP)
        this.apCharge = new Tone.Synth({
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.1, decay: 0.1, sustain: 1, release: 0.2 }
        }).toDestination();
        this.apCharge.volume.value = this.volume - 3; // Quieter for continuous sound
        
        this.initialized = true;
        console.log('[BattleSceneSFX] ✅ Sound effects ready');
    }
    
    /**
     * Play attack sound
     */
    playAttack() {
        if (!this.initialized) return;
        this.attack.triggerAttackRelease('C2', '8n');
    }
    
    /**
     * Play hit sound
     */
    playHit() {
        if (!this.initialized) return;
        this.hit.triggerAttackRelease('8n');
    }
    
    /**
     * Play dash sound
     */
    playDash() {
        if (!this.initialized) return;
        // Quick whoosh
        this.dash.triggerAttackRelease('C4', '16n');
        Tone.Transport.scheduleOnce(() => {
            this.dash.triggerAttackRelease('C3', '16n');
        }, '+16n');
    }
    
    /**
     * Play level up sound
     */
    playLevelUp() {
        if (!this.initialized) return;
        // Ascending chord
        this.levelUp.triggerAttackRelease(['C4', 'E4', 'G4'], '4n');
        Tone.Transport.scheduleOnce(() => {
            this.levelUp.triggerAttackRelease(['C5', 'E5', 'G5'], '4n');
        }, '+4n');
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
     * Play defeat sound
     */
    playDefeat() {
        if (!this.initialized) return;
        // Descending tone
        this.defeat.triggerAttackRelease('C4', '1n');
        Tone.Transport.scheduleOnce(() => {
            this.defeat.triggerAttackRelease('C3', '1n');
        }, '+1n');
    }
    
    /**
     * Play projectile sound
     */
    playProjectile() {
        if (!this.initialized) return;
        this.projectile.triggerAttackRelease('C5', '16n');
    }
    
    /**
     * Play block sound
     */
    playBlock() {
        if (!this.initialized) return;
        this.block.triggerAttackRelease('C3', '8n');
    }
    
    /**
     * Play critical hit sound
     */
    playCritical() {
        if (!this.initialized) return;
        this.critical.triggerAttackRelease('C2', '4n');
    }
    
    /**
     * Start AP charge sound (continuous while charging AP)
     */
    startAPCharge() {
        if (!this.initialized || this.isChargingAP) return;
        this.isChargingAP = true;
        // Start continuous synth that increases in pitch as AP charges
        if (this.apCharge) {
            // Start at low frequency (E3)
            this.apCharge.triggerAttack('E3');
            // Gradually increase frequency as AP charges (E3 to E5)
            const startFreq = Tone.Frequency('E3').toFrequency();
            const endFreq = Tone.Frequency('E5').toFrequency();
            this.apCharge.frequency.rampTo(endFreq, 2.5); // Ramp over 2.5 seconds (time to max AP)
        }
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
     * Set volume for all SFX
     */
    setVolume(volume) {
        this.volume = volume;
        if (this.attack) this.attack.volume.value = volume;
        if (this.hit) this.hit.volume.value = volume;
        if (this.dash) this.dash.volume.value = volume;
        if (this.levelUp) this.levelUp.volume.value = volume;
        if (this.victory) this.victory.volume.value = volume;
        if (this.defeat) this.defeat.volume.value = volume;
        if (this.projectile) this.projectile.volume.value = volume;
        if (this.block) this.block.volume.value = volume;
        if (this.critical) this.critical.volume.value = volume + 2;
        if (this.apCharge) this.apCharge.volume.value = volume - 3;
    }
    
    /**
     * Dispose of all synths
     */
    dispose() {
        // Stop continuous sounds
        this.stopAPCharge();
        
        if (this.attack) this.attack.dispose();
        if (this.hit) this.hit.dispose();
        if (this.dash) this.dash.dispose();
        if (this.levelUp) this.levelUp.dispose();
        if (this.victory) this.victory.dispose();
        if (this.defeat) this.defeat.dispose();
        if (this.projectile) this.projectile.dispose();
        if (this.block) this.block.dispose();
        if (this.critical) this.critical.dispose();
        if (this.apCharge) this.apCharge.dispose();
        
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
        this.initialized = false;
        
        console.log('[BattleSceneSFX] Disposed');
    }
}

