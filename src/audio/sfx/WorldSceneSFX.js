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
     * Set volume for all SFX
     */
    setVolume(volume) {
        this.volume = volume;
        if (this.mapOpen) this.mapOpen.volume.value = volume;
        if (this.menuOpen) this.menuOpen.volume.value = volume;
        if (this.vehicleBoard) this.vehicleBoard.volume.value = volume;
        if (this.footstep) this.footstep.volume.value = volume - 5;
        if (this.interaction) this.interaction.volume.value = volume;
    }
    
    /**
     * Dispose of all synths
     */
    dispose() {
        if (this.mapOpen) this.mapOpen.dispose();
        if (this.menuOpen) this.menuOpen.dispose();
        if (this.vehicleBoard) this.vehicleBoard.dispose();
        if (this.footstep) this.footstep.dispose();
        if (this.interaction) this.interaction.dispose();
        
        this.mapOpen = null;
        this.menuOpen = null;
        this.vehicleBoard = null;
        this.footstep = null;
        this.interaction = null;
        this.initialized = false;
        
        console.log('[WorldSceneSFX] Disposed');
    }
}

