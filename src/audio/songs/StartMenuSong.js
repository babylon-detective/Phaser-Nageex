import * as Tone from 'tone';

/**
 * START MENU SONG - E minor Ambient Composition
 * 
 * Based on audio analysis:
 * - BPM: 107.1
 * - Key: E minor (E, F#, G, A, B, C, D)
 * - Structure: Energetic intro → Sustained ambient section → Seamless loop
 * 
 * A modular Tone.js composition for the start menu screen.
 * Features fast arpeggios, punchy chords, deep bass, and atmospheric pads.
 */
export class StartMenuSong {
    constructor() {
        this.isPlaying = false;
        this.bpm = 107.1;
        this.key = 'E minor';
        
        // Instruments (initialized lazily)
        this.introSynth = null;
        this.padSynth = null;
        this.bass = null;
        this.subBass = null;
        this.arpSynth = null;
        
        // Effects
        this.reverb = null;
        this.delay = null;
        this.filter = null;
        this.volume = null;
        
        // Song parts (Tone.js patterns/sequences)
        this.parts = [];
        
        console.log('[StartMenuSong] Created (not initialized)');
    }
    
    /**
     * Initialize all instruments and effects
     */
    setupInstruments() {
        if (this.introSynth) {
            console.log('[StartMenuSong] Already initialized');
            return;
        }
        
        console.log('[StartMenuSong] Setting up instruments...');
        
        // Intro synth (energetic sawtooth)
        this.introSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sawtooth' },
            envelope: {
                attack: 0.005,
                decay: 0.1,
                sustain: 0.3,
                release: 0.4
            }
        });
        
        // Ambient pads (sustained sine waves)
        this.padSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sine' },
            envelope: {
                attack: 2,      // Slow attack for ambient feel
                decay: 1,
                sustain: 0.8,
                release: 4      // Long release
            }
        });
        
        // Bass (square wave with filter)
        this.bass = new Tone.MonoSynth({
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
        
        // Sub-bass (deep sine for rumble)
        this.subBass = new Tone.MonoSynth({
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
        
        // Arpeggiator (triangle wave)
        this.arpSynth = new Tone.Synth({
            oscillator: { type: 'triangle' },
            envelope: {
                attack: 0.001,
                decay: 0.2,
                sustain: 0,
                release: 0.2
            }
        });
        
        // Effects chain
        this.reverb = new Tone.Reverb({
            decay: 4,
            wet: 0.4
        }).toDestination();
        
        this.delay = new Tone.FeedbackDelay({
            delayTime: '8n',
            feedback: 0.3,
            wet: 0.2
        }).connect(this.reverb);
        
        this.filter = new Tone.Filter({
            frequency: 2000,
            type: 'lowpass',
            rolloff: -24
        }).connect(this.delay);
        
        this.volume = new Tone.Volume(-12).connect(this.filter); // Quieter for menu
        
        // Connect instruments to effects
        this.introSynth.connect(this.volume);
        this.padSynth.connect(this.reverb);  // Pads direct to reverb for more space
        this.bass.connect(this.volume);
        this.subBass.connect(this.volume);
        this.arpSynth.connect(this.delay);
        
        // Generate reverb impulse
        this.reverb.generate();
        
        console.log('[StartMenuSong] ✅ Instruments ready');
    }
    
    /**
     * Get E minor chord progressions and notes
     */
    getEMinorChords() {
        return {
            Em: ['E3', 'G3', 'B3'],
            Am: ['A3', 'C4', 'E4'],
            Bm: ['B3', 'D4', 'F#4'],
            C: ['C3', 'E3', 'G3'],
            D: ['D3', 'F#3', 'A3'],
            G: ['G3', 'B3', 'D4']
        };
    }
    
    /**
     * Play the song (loops continuously)
     */
    async play() {
        if (this.isPlaying) {
            console.log('[StartMenuSong] Already playing');
            return;
        }
        
        // Initialize instruments if not already done
        if (!this.introSynth) {
            this.setupInstruments();
        }
        
        console.log('[StartMenuSong] Starting playback...');
        
        // Set BPM
        Tone.Transport.bpm.value = this.bpm;
        
        const chords = this.getEMinorChords();
        
        // ===== SECTION 1: ENERGETIC INTRO (0-16 measures) =====
        
        // Fast arpeggio pattern
        const introArp = new Tone.Pattern((time, note) => {
            this.arpSynth.triggerAttackRelease(note, '32n', time);
        }, ['E4', 'G4', 'B4', 'E5', 'D5', 'B4', 'G4', 'E4'], 'up');
        introArp.interval = '16n';
        introArp.start(0).stop('16m');
        this.parts.push(introArp);
        
        // Intro chords (punchy)
        const introChords = new Tone.Part((time, chord) => {
            this.introSynth.triggerAttackRelease(chord.notes, chord.duration, time);
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
        this.parts.push(introChords);
        
        // Bass pattern
        const introBass = new Tone.Pattern((time, note) => {
            this.bass.triggerAttackRelease(note, '4n', time);
        }, ['E2', 'E2', 'C2', 'G2', 'D2', 'E2', 'A2', 'B2'], 'up');
        introBass.interval = '2n';
        introBass.start(0);
        this.parts.push(introBass);
        
        // Sub-bass (deep rumble on downbeats)
        const subBassPattern = new Tone.Sequence((time, note) => {
            this.subBass.triggerAttackRelease(note, '1n', time);
        }, ['E1', 'C1', 'G1', 'D1', 'E1', 'A1', 'B1', 'E1'], '2m');
        subBassPattern.start(0);
        this.parts.push(subBassPattern);
        
        // ===== SECTION 2: AMBIENT PADS (16m+, loops) =====
        
        // Long sustained pad chords
        const padChords = new Tone.Part((time, chord) => {
            this.padSynth.triggerAttackRelease(chord.notes, chord.duration, time);
        }, [
            { time: '16:0:0', notes: ['E3', 'G3', 'B3', 'E4'], duration: '4m' },
            { time: '20:0:0', notes: ['C3', 'E3', 'G3', 'C4'], duration: '4m' },
            { time: '24:0:0', notes: ['A2', 'C3', 'E3', 'A3'], duration: '4m' },
            { time: '28:0:0', notes: ['B2', 'D3', 'F#3', 'B3'], duration: '4m' }
        ]);
        padChords.loop = true;
        padChords.loopEnd = '32m';
        padChords.start(0);
        this.parts.push(padChords);
        
        // Sparse ambient melody
        const ambientMelody = new Tone.Part((time, note) => {
            this.arpSynth.triggerAttackRelease(note.pitch, note.duration, time, note.velocity);
        }, [
            { time: '20:0:0', pitch: 'E5', duration: '1m', velocity: 0.3 },
            { time: '24:0:0', pitch: 'D5', duration: '2m', velocity: 0.3 },
            { time: '28:0:0', pitch: 'B4', duration: '2m', velocity: 0.25 }
        ]);
        ambientMelody.loop = true;
        ambientMelody.loopEnd = '32m';
        ambientMelody.start(0);
        this.parts.push(ambientMelody);
        
        // Start Tone.js transport
        Tone.Transport.start();
        this.isPlaying = true;
        
        console.log('[StartMenuSong] ▶️ Playing (E minor, 107 BPM, looping)');
    }
    
    /**
     * Stop the song
     */
    stop() {
        if (!this.isPlaying) {
            return;
        }
        
        console.log('[StartMenuSong] Stopping...');
        
        // Stop and dispose all parts
        this.parts.forEach(part => {
            if (part.state === 'started') {
                part.stop();
            }
            part.dispose();
        });
        this.parts = [];
        
        // Stop transport
        Tone.Transport.stop();
        Tone.Transport.cancel();
        
        this.isPlaying = false;
        
        console.log('[StartMenuSong] ⏹️ Stopped');
    }
    
    /**
     * Clean up all resources
     */
    dispose() {
        console.log('[StartMenuSong] Disposing resources...');
        
        this.stop();
        
        // Dispose instruments
        if (this.introSynth) this.introSynth.dispose();
        if (this.padSynth) this.padSynth.dispose();
        if (this.bass) this.bass.dispose();
        if (this.subBass) this.subBass.dispose();
        if (this.arpSynth) this.arpSynth.dispose();
        
        // Dispose effects
        if (this.reverb) this.reverb.dispose();
        if (this.delay) this.delay.dispose();
        if (this.filter) this.filter.dispose();
        if (this.volume) this.volume.dispose();
        
        // Clear references
        this.introSynth = null;
        this.padSynth = null;
        this.bass = null;
        this.subBass = null;
        this.arpSynth = null;
        this.reverb = null;
        this.delay = null;
        this.filter = null;
        this.volume = null;
        
        console.log('[StartMenuSong] ✅ Disposed');
    }
}

