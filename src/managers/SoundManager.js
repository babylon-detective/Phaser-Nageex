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
        
        // Start menu song
        this.startMenuSong = null;
        this.songParts = [];
        
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
    
    // ===== Start Menu Song (E minor ambient composition) =====
    
    /**
     * Initialize instruments for the start menu song
     */
    setupStartMenuSong() {
        console.log('[SoundManager] Setting up start menu song (E minor, 107 BPM)');
        
        const bpm = 107.1;
        
        // Intro synth (energetic sawtooth)
        const introSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sawtooth' },
            envelope: {
                attack: 0.005,
                decay: 0.1,
                sustain: 0.3,
                release: 0.4
            }
        });
        
        // Ambient pads (sustained sine waves)
        const padSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sine' },
            envelope: {
                attack: 2,
                decay: 1,
                sustain: 0.8,
                release: 4
            }
        });
        
        // Bass
        const bass = new Tone.MonoSynth({
            oscillator: { type: 'square' },
            envelope: {
                attack: 0.01,
                decay: 0.3,
                sustain: 0.4,
                release: 0.8
            },
            filterEnvelope: {
                attack: 0.01,
                decay: 0.2,
                sustain: 0.5,
                baseFrequency: 200,
                octaves: 2.5
            }
        });
        
        // Sub-bass
        const subBass = new Tone.MonoSynth({
            oscillator: { type: 'sine' },
            envelope: {
                attack: 0.02,
                decay: 0.3,
                sustain: 0.7,
                release: 1.2
            },
            filter: {
                type: 'lowpass',
                frequency: 150,
                rolloff: -24
            }
        });
        
        // Arpeggiator
        const arpSynth = new Tone.Synth({
            oscillator: { type: 'triangle' },
            envelope: {
                attack: 0.001,
                decay: 0.2,
                sustain: 0,
                release: 0.2
            }
        });
        
        // Effects chain
        const reverb = new Tone.Reverb({
            decay: 4,
            wet: 0.4
        }).toDestination();
        
        const delay = new Tone.FeedbackDelay({
            delayTime: '8n',
            feedback: 0.3,
            wet: 0.2
        }).connect(reverb);
        
        const filter = new Tone.Filter({
            frequency: 2000,
            type: 'lowpass',
            rolloff: -24
        }).connect(delay);
        
        const volume = new Tone.Volume(-12).connect(filter); // Quieter for menu
        
        // Connect instruments
        introSynth.connect(volume);
        padSynth.connect(reverb);
        bass.connect(volume);
        subBass.connect(volume);
        arpSynth.connect(delay);
        
        // Store references
        this.startMenuSong = {
            bpm,
            introSynth,
            padSynth,
            bass,
            subBass,
            arpSynth,
            reverb,
            delay,
            filter,
            volume
        };
        
        console.log('[SoundManager] Start menu song instruments ready');
        
        // Generate reverb
        reverb.generate();
    }
    
    /**
     * Play the start menu song (loops continuously)
     */
    async playStartMenuSong() {
        if (!this.initialized) {
            console.warn('[SoundManager] Cannot play start menu song - not initialized');
            return;
        }
        
        if (!this.startMenuSong) {
            this.setupStartMenuSong();
        }
        
        if (this.songParts.length > 0) {
            console.log('[SoundManager] Start menu song already playing');
            return;
        }
        
        console.log('[SoundManager] Starting E minor ambient song (107 BPM)');
        
        Tone.Transport.bpm.value = this.startMenuSong.bpm;
        
        const { introSynth, padSynth, bass, subBass, arpSynth } = this.startMenuSong;
        
        // E minor scale
        const chords = {
            Em: ['E3', 'G3', 'B3'],
            Am: ['A3', 'C4', 'E4'],
            Bm: ['B3', 'D4', 'F#4'],
            C: ['C3', 'E3', 'G3'],
            D: ['D3', 'F#3', 'A3'],
            G: ['G3', 'B3', 'D4']
        };
        
        // INTRO ARPEGGIO (fast, energetic)
        const introArp = new Tone.Pattern((time, note) => {
            arpSynth.triggerAttackRelease(note, '32n', time);
        }, ['E4', 'G4', 'B4', 'E5', 'D5', 'B4', 'G4', 'E4'], 'up');
        introArp.interval = '16n';
        introArp.start(0).stop('16m');
        this.songParts.push(introArp);
        
        // INTRO CHORDS
        const introChords = new Tone.Part((time, chord) => {
            introSynth.triggerAttackRelease(chord.notes, chord.duration, time);
        }, [
            { time: '0:0:0', notes: chords.Em, duration: '2n' },
            { time: '2:0:0', notes: chords.C, duration: '2n' },
            { time: '4:0:0', notes: chords.G, duration: '2n' },
            { time: '6:0:0', notes: chords.D, duration: '2n' },
            { time: '8:0:0', notes: chords.Em, duration: '2n' },
            { time: '10:0:0', notes: chords.Am, duration: '2n' },
            { time: '12:0:0', notes: chords.Bm, duration: '2n' },
            { time: '14:0:0', notes: chords.Em, duration: '1n' }
        ]);
        introChords.loop = true;
        introChords.loopEnd = '16m';
        introChords.start(0);
        this.songParts.push(introChords);
        
        // BASS PATTERN
        const introBass = new Tone.Pattern((time, note) => {
            bass.triggerAttackRelease(note, '4n', time);
        }, ['E2', 'E2', 'C2', 'G2', 'D2', 'E2', 'A2', 'B2'], 'up');
        introBass.interval = '2n';
        introBass.start(0);
        this.songParts.push(introBass);
        
        // SUB-BASS (deep rumble)
        const subBassPattern = new Tone.Sequence((time, note) => {
            subBass.triggerAttackRelease(note, '1n', time);
        }, ['E1', 'C1', 'G1', 'D1', 'E1', 'A1', 'B1', 'E1'], '2m');
        subBassPattern.start(0);
        this.songParts.push(subBassPattern);
        
        // AMBIENT PAD CHORDS (long, sustained)
        const padChords = new Tone.Part((time, chord) => {
            padSynth.triggerAttackRelease(chord.notes, chord.duration, time);
        }, [
            { time: '16:0:0', notes: ['E3', 'G3', 'B3', 'E4'], duration: '4m' },
            { time: '20:0:0', notes: ['C3', 'E3', 'G3', 'C4'], duration: '4m' },
            { time: '24:0:0', notes: ['A2', 'C3', 'E3', 'A3'], duration: '4m' },
            { time: '28:0:0', notes: ['B2', 'D3', 'F#3', 'B3'], duration: '4m' }
        ]);
        padChords.loop = true;
        padChords.loopEnd = '32m';
        padChords.start(0);
        this.songParts.push(padChords);
        
        // AMBIENT MELODY (sparse, soft)
        const ambientMelody = new Tone.Part((time, note) => {
            arpSynth.triggerAttackRelease(note.pitch, note.duration, time, note.velocity);
        }, [
            { time: '20:0:0', pitch: 'E5', duration: '1m', velocity: 0.3 },
            { time: '24:0:0', pitch: 'D5', duration: '2m', velocity: 0.3 },
            { time: '28:0:0', pitch: 'B4', duration: '2m', velocity: 0.25 }
        ]);
        ambientMelody.loop = true;
        ambientMelody.loopEnd = '32m';
        ambientMelody.start(0);
        this.songParts.push(ambientMelody);
        
        // Start transport
        Tone.Transport.start();
        
        console.log('[SoundManager] Start menu song playing (looping)');
    }
    
    /**
     * Stop the start menu song
     */
    stopStartMenuSong() {
        if (this.songParts.length === 0) {
            return;
        }
        
        console.log('[SoundManager] Stopping start menu song');
        
        // Stop and dispose all parts
        this.songParts.forEach(part => {
            if (part.state === 'started') {
                part.stop();
            }
            part.dispose();
        });
        this.songParts = [];
        
        // Stop transport
        Tone.Transport.stop();
        Tone.Transport.cancel();
        
        console.log('[SoundManager] Start menu song stopped');
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

