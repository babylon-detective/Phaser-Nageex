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
     * Initialize all sound effects
     */
    async init() {
        if (this.initialized) {
            console.log('[WorldSceneSFX] Already initialized');
            return;
        }
        
        console.log('[WorldSceneSFX] Setting up sound effects...');
        
        // Map open sound (pleasant chime)
        this.mapOpen = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.5 }
        }).toDestination();
        this.mapOpen.volume.value = this.volume;
        
        // Menu open sound (confirm tone)
        this.menuOpen = new Tone.Synth({
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 }
        }).toDestination();
        this.menuOpen.volume.value = this.volume;
        
        // Vehicle boarding sound (ascending tone)
        this.vehicleBoard = new Tone.Synth({
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.4 }
        }).toDestination();
        this.vehicleBoard.volume.value = this.volume;
        
        // Footstep sound (subtle noise)
        this.footstep = new Tone.NoiseSynth({
            noise: { type: 'brown' },
            envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
        }).toDestination();
        this.footstep.volume.value = this.volume - 5; // Quieter
        
        // Interaction sound (gentle click)
        this.interaction = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
        }).toDestination();
        this.interaction.volume.value = this.volume;
        
        // NPC Encounter sound (couple of seconds - dramatic alert)
        this.encounter = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.1, decay: 0.3, sustain: 0.4, release: 1.5 }
        }).toDestination();
        this.encounter.volume.value = this.volume;
        
        // Walking sound (continuous while moving)
        this.walking = new Tone.NoiseSynth({
            noise: { type: 'brown' },
            envelope: { attack: 0.01, decay: 0.05, sustain: 0.3, release: 0.1 }
        }).toDestination();
        this.walking.volume.value = this.volume - 8; // Quieter for continuous sound
        
        // Sprint charge sound (continuous while holding Shift)
        this.sprintCharge = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.1, decay: 0.1, sustain: 1, release: 0.2 }
        }).toDestination();
        this.sprintCharge.volume.value = this.volume - 5;
        
        this.initialized = true;
        console.log('[WorldSceneSFX] ✅ Sound effects ready');
    }
    
    /**
     * Play map open sound
     */
    playMapOpen() {
        if (!this.initialized) return;
        this.mapOpen.triggerAttackRelease('C5', '8n');
    }
    
    /**
     * Play menu open sound
     */
    playMenuOpen() {
        if (!this.initialized) return;
        this.menuOpen.triggerAttackRelease('E4', '16n');
    }
    
    /**
     * Play vehicle boarding sound
     */
    playVehicleBoard() {
        if (!this.initialized) return;
        // Ascending tone
        this.vehicleBoard.triggerAttackRelease('C4', '8n');
        Tone.Transport.scheduleOnce(() => {
            this.vehicleBoard.triggerAttackRelease('E4', '8n');
        }, '+8n');
        Tone.Transport.scheduleOnce(() => {
            this.vehicleBoard.triggerAttackRelease('G4', '8n');
        }, '+4n');
    }
    
    /**
     * Play footstep sound
     */
    playFootstep() {
        if (!this.initialized) return;
        this.footstep.triggerAttackRelease('8n');
    }
    
    /**
     * Play interaction sound
     */
    playInteraction() {
        if (!this.initialized) return;
        this.interaction.triggerAttackRelease('G4', '16n');
    }
    
    /**
     * Play NPC encounter sound (couple of seconds)
     */
    playEncounter() {
        if (!this.initialized) return;
        // Dramatic ascending chord sequence
        this.encounter.triggerAttackRelease(['C3', 'Eb3', 'G3'], '8n');
        Tone.Transport.scheduleOnce(() => {
            this.encounter.triggerAttackRelease(['C4', 'Eb4', 'G4'], '8n');
        }, '+8n');
        Tone.Transport.scheduleOnce(() => {
            this.encounter.triggerAttackRelease(['C5', 'Eb5', 'G5'], '4n');
        }, '+4n');
    }
    
    /**
     * Start walking sound (continuous)
     */
    startWalking() {
        if (!this.initialized || this.isWalking) return;
        this.isWalking = true;
        // Play walking sound every 0.3 seconds while walking
        this.walkingInterval = setInterval(() => {
            if (this.isWalking && this.walking) {
                this.walking.triggerAttackRelease('16n');
            }
        }, 300);
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
        // Start continuous synth that increases in pitch as charge builds
        if (this.sprintCharge) {
            // Start at low frequency (C3 = ~130.81 Hz)
            this.sprintCharge.triggerAttack('C3');
            // Gradually increase frequency as charge builds (C3 to C5 = ~523.25 Hz)
            // Use frequency.rampTo for smooth pitch increase
            const startFreq = Tone.Frequency('C3').toFrequency();
            const endFreq = Tone.Frequency('C5').toFrequency();
            this.sprintCharge.frequency.rampTo(endFreq, 1); // Ramp over 1 second
        }
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
     * Set volume for all SFX
     */
    setVolume(volume) {
        this.volume = volume;
        if (this.mapOpen) this.mapOpen.volume.value = volume;
        if (this.menuOpen) this.menuOpen.volume.value = volume;
        if (this.vehicleBoard) this.vehicleBoard.volume.value = volume;
        if (this.footstep) this.footstep.volume.value = volume - 5;
        if (this.interaction) this.interaction.volume.value = volume;
        if (this.encounter) this.encounter.volume.value = volume;
        if (this.walking) this.walking.volume.value = volume - 8;
        if (this.sprintCharge) this.sprintCharge.volume.value = volume - 5;
    }
    
    /**
     * Dispose of all synths
     */
    dispose() {
        // Stop continuous sounds
        this.stopWalking();
        this.stopSprintCharge();
        
        if (this.mapOpen) this.mapOpen.dispose();
        if (this.menuOpen) this.menuOpen.dispose();
        if (this.vehicleBoard) this.vehicleBoard.dispose();
        if (this.footstep) this.footstep.dispose();
        if (this.interaction) this.interaction.dispose();
        if (this.encounter) this.encounter.dispose();
        if (this.walking) this.walking.dispose();
        if (this.sprintCharge) this.sprintCharge.dispose();
        
        this.mapOpen = null;
        this.menuOpen = null;
        this.vehicleBoard = null;
        this.footstep = null;
        this.interaction = null;
        this.encounter = null;
        this.walking = null;
        this.sprintCharge = null;
        this.initialized = false;
        
        console.log('[WorldSceneSFX] Disposed');
    }
}

