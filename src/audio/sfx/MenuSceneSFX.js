import * as Tone from 'tone';

/**
 * MENU SCENE SFX - Sound effects for menu navigation
 * 
 * Handles:
 * - Menu select (navigating options)
 * - Menu confirm (selecting option)
 * - Menu cancel (closing menu)
 * - Tab switching
 * - Save game sound
 */
export class MenuSceneSFX {
    constructor() {
        this.initialized = false;
        this.volume = -10; // dB
        
        // Synths
        this.menuSelect = null;
        this.menuConfirm = null;
        this.menuCancel = null;
        this.tabSwitch = null;
        this.saveGame = null;
        
        console.log('[MenuSceneSFX] Created (not initialized)');
    }
    
    /**
     * Initialize all sound effects
     */
    async init() {
        if (this.initialized) {
            console.log('[MenuSceneSFX] Already initialized');
            return;
        }
        
        console.log('[MenuSceneSFX] Setting up sound effects...');
        
        // Menu select sound (soft beep)
        this.menuSelect = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
        }).toDestination();
        this.menuSelect.volume.value = this.volume;
        
        // Menu confirm sound (pleasant chime)
        this.menuConfirm = new Tone.Synth({
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 }
        }).toDestination();
        this.menuConfirm.volume.value = this.volume;
        
        // Menu cancel sound (dismissive tone)
        this.menuCancel = new Tone.Synth({
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 }
        }).toDestination();
        this.menuCancel.volume.value = this.volume;
        
        // Tab switch sound (quick click)
        this.tabSwitch = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
        }).toDestination();
        this.tabSwitch.volume.value = this.volume - 3; // Quieter
        
        // Save game sound (successful chime)
        this.saveGame = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sine' },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.4 }
        }).toDestination();
        this.saveGame.volume.value = this.volume;
        
        this.initialized = true;
        console.log('[MenuSceneSFX] ✅ Sound effects ready');
    }
    
    /**
     * Play menu select sound
     */
    playMenuSelect() {
        if (!this.initialized) return;
        this.menuSelect.triggerAttackRelease('C5', '16n');
    }
    
    /**
     * Play menu confirm sound
     */
    playMenuConfirm() {
        if (!this.initialized) return;
        this.menuConfirm.triggerAttackRelease('E4', '16n');
    }
    
    /**
     * Play menu cancel sound
     */
    playMenuCancel() {
        if (!this.initialized) return;
        this.menuCancel.triggerAttackRelease('C3', '16n');
    }
    
    /**
     * Play tab switch sound
     */
    playTabSwitch() {
        if (!this.initialized) return;
        this.tabSwitch.triggerAttackRelease('G4', '32n');
    }
    
    /**
     * Play save game sound
     */
    playSaveGame() {
        if (!this.initialized) return;
        // Pleasant success chord
        this.saveGame.triggerAttackRelease(['C4', 'E4', 'G4'], '8n');
    }
    
    /**
     * Set volume for all SFX
     */
    setVolume(volume) {
        this.volume = volume;
        if (this.menuSelect) this.menuSelect.volume.value = volume;
        if (this.menuConfirm) this.menuConfirm.volume.value = volume;
        if (this.menuCancel) this.menuCancel.volume.value = volume;
        if (this.tabSwitch) this.tabSwitch.volume.value = volume - 3;
        if (this.saveGame) this.saveGame.volume.value = volume;
    }
    
    /**
     * Dispose of all synths
     */
    dispose() {
        if (this.menuSelect) this.menuSelect.dispose();
        if (this.menuConfirm) this.menuConfirm.dispose();
        if (this.menuCancel) this.menuCancel.dispose();
        if (this.tabSwitch) this.tabSwitch.dispose();
        if (this.saveGame) this.saveGame.dispose();
        
        this.menuSelect = null;
        this.menuConfirm = null;
        this.menuCancel = null;
        this.tabSwitch = null;
        this.saveGame = null;
        this.initialized = false;
        
        console.log('[MenuSceneSFX] Disposed');
    }
}

