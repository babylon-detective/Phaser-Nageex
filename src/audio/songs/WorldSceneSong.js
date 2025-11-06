import * as Tone from 'tone';

/**
 * WORLD SCENE SONG - C minor Rhythmic Composition with Jumpy Beat
 * 
 * Based on audio analysis:
 * - BPM: 79.7
 * - Key: C minor (C, D, Eb, F, G, Ab, Bb)
 * - Mood: Deep, sad, relaxing with energetic rhythmic pulse
 * - Structure: Continuous loop with jumpy, syncopated beat
 * 
 * A modular Tone.js composition for the overworld exploration.
 * Features deep bass with jumpy kick pattern, rhythmic bass line, ambient pads, and evolving texture.
 */
export class WorldSceneSong {
    constructor() {
        this.isPlaying = false;
        this.bpm = 79.7;
        this.key = 'C minor';
        
        // Instruments (initialized lazily)
        this.padSynth = null;
        this.bass = null;
        this.subBass = null;
        this.kickDrum = null;
        this.snare = null;
        this.hiHat = null;
        this.melodySynth = null;
        
        // Effects
        this.reverb = null;
        this.delay = null;
        this.filter = null;
        this.volume = null;
        this.compressor = null;
        
        // Song parts (Tone.js patterns/sequences)
        this.parts = [];
        
        console.log('[WorldSceneSong] Created (not initialized)');
    }
    
    /**
     * Initialize all instruments and effects
     */
    setupInstruments() {
        if (this.padSynth) {
            console.log('[WorldSceneSong] Already initialized');
            return;
        }
        
        console.log('[WorldSceneSong] Setting up instruments...');
        
        // Ambient pads (sustained sine waves with slow attack)
        this.padSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sine' },
            envelope: {
                attack: 2,      // Slower attack for ambient feel
                decay: 1.5,
                sustain: 0.8,
                release: 4      // Long release
            }
        });
        
        // Bass (square wave with filter for warmth - more punchy)
        this.bass = new Tone.MonoSynth({
            oscillator: { type: 'square' },
            envelope: {
                attack: 0.005,  // Faster attack for punch
                decay: 0.2,
                sustain: 0.4,
                release: 0.3    // Shorter release for rhythm
            },
            filterEnvelope: {
                attack: 0.01,
                decay: 0.2,
                sustain: 0.5,
                baseFrequency: 150,
                octaves: 2
            }
        });
        
        // Sub-bass (deep sine for rumble)
        this.subBass = new Tone.MonoSynth({
            oscillator: { type: 'sine' },
            envelope: {
                attack: 0.01,
                decay: 0.3,
                sustain: 0.7,
                release: 0.8
            },
            filter: {
                type: 'lowpass',
                frequency: 80,
                rolloff: -24
            }
        });
        
        // Kick drum (punchy and tight)
        this.kickDrum = new Tone.MembraneSynth({
            pitchDecay: 0.08,   // More decay for punch
            octaves: 8,
            oscillator: { type: 'sine' },
            envelope: {
                attack: 0.001,
                decay: 0.3,     // Tighter decay
                sustain: 0.01,
                release: 0.8
            }
        });
        
        // Snare (for rhythmic accent)
        this.snare = new Tone.NoiseSynth({
            noise: { type: 'white' },
            envelope: {
                attack: 0.001,
                decay: 0.15,
                sustain: 0,
                release: 0.1
            },
            filter: {
                type: 'highpass',
                frequency: 2000
            }
        });
        
        // Hi-hat (for rhythmic texture)
        this.hiHat = new Tone.NoiseSynth({
            noise: { type: 'pink' },
            envelope: {
                attack: 0.001,
                decay: 0.05,
                sustain: 0,
                release: 0.02
            },
            filter: {
                type: 'highpass',
                frequency: 8000
            }
        });
        
        // Melody synth (subtle triangle wave)
        this.melodySynth = new Tone.Synth({
            oscillator: { type: 'triangle' },
            envelope: {
                attack: 0.3,
                decay: 0.2,
                sustain: 0.4,
                release: 1.5
            }
        });
        
        // Effects chain
        this.reverb = new Tone.Reverb({
            decay: 4,      // Moderate reverb
            wet: 0.3       // Less reverb for clarity
        }).toDestination();
        
        this.delay = new Tone.FeedbackDelay({
            delayTime: '8n',  // Shorter delay for rhythm
            feedback: 0.3,
            wet: 0.2
        }).connect(this.reverb);
        
        this.filter = new Tone.Filter({
            frequency: 4000,  // Higher cutoff for brightness
            type: 'lowpass',
            rolloff: -12
        }).connect(this.delay);
        
        // Compressor for punch
        this.compressor = new Tone.Compressor({
            threshold: -20,
            ratio: 4,
            attack: 0.003,
            release: 0.1
        }).connect(this.filter);
        
        this.volume = new Tone.Volume(-10).connect(this.compressor);
        
        // Connect instruments to effects
        this.padSynth.connect(this.reverb);  // Pads direct to reverb
        this.bass.connect(this.volume);
        this.subBass.connect(this.volume);
        this.kickDrum.connect(this.volume);
        this.snare.connect(this.volume);
        this.hiHat.connect(this.volume);
        this.melodySynth.connect(this.delay);
        
        // Generate reverb impulse
        this.reverb.generate();
        
        console.log('[WorldSceneSong] ✅ Instruments ready');
    }
    
    /**
     * Get C minor chord progressions and notes
     */
    getCMinorChords() {
        return {
            Cm: ['C3', 'Eb3', 'G3'],
            Fm: ['F3', 'Ab3', 'C4'],
            G: ['G3', 'B3', 'D4'],
            Ab: ['Ab3', 'C4', 'Eb4'],
            Bb: ['Bb3', 'D4', 'F4'],
            Eb: ['Eb3', 'G3', 'Bb3']
        };
    }
    
    /**
     * Get C minor scale notes
     */
    getCMinorScale() {
        return {
            scale: ['C3', 'D3', 'Eb3', 'F3', 'G3', 'Ab3', 'Bb3', 'C4'],
            bass: ['C2', 'D2', 'Eb2', 'F2', 'G2', 'Ab2', 'Bb2', 'C3']
        };
    }
    
    /**
     * Play the song (loops continuously)
     */
    async play() {
        if (this.isPlaying) {
            console.log('[WorldSceneSong] Already playing');
            return;
        }
        
        // Initialize instruments if not already done
        if (!this.padSynth) {
            this.setupInstruments();
        }
        
        console.log('[WorldSceneSong] Starting playback...');
        
        // Set BPM
        Tone.Transport.bpm.value = this.bpm;
        
        const chords = this.getCMinorChords();
        const scale = this.getCMinorScale();
        
        // ===== CLASSICAL BEAT PATTERN - 5/4, 3/4, 5/4, 3/4... =====
        
        // Kick drum pattern - Classical alternating pattern
        // Pattern: 1, 2, 3, 4, 5 ... 1, 2, 3 ... 1, 2, 3, 4, 5 ... etc
        const kickPattern = new Tone.Part((time, note) => {
            if (note) {
                this.kickDrum.triggerAttackRelease('C1', '4n', time, note.velocity || 0.8);
            }
        }, [
            // Measure 1: 5 beats (5/4 time)
            { time: '0:0:0', velocity: 1.0 },   // Beat 1 - strong
            { time: '0:1:0', velocity: 0.7 },   // Beat 2
            { time: '0:2:0', velocity: 0.8 },   // Beat 3
            { time: '0:3:0', velocity: 0.6 },   // Beat 4
            { time: '0:4:0', velocity: 0.7 },   // Beat 5
            
            // Measure 2: 3 beats (3/4 time)
            { time: '1:0:0', velocity: 1.0 },   // Beat 1 - strong
            { time: '1:1:0', velocity: 0.7 },   // Beat 2
            { time: '1:2:0', velocity: 0.8 },   // Beat 3
            
            // Measure 3: 5 beats (5/4 time)
            { time: '2:0:0', velocity: 1.0 },   // Beat 1 - strong
            { time: '2:1:0', velocity: 0.7 },   // Beat 2
            { time: '2:2:0', velocity: 0.8 },   // Beat 3
            { time: '2:3:0', velocity: 0.6 },   // Beat 4
            { time: '2:4:0', velocity: 0.7 },   // Beat 5
            
            // Measure 4: 3 beats (3/4 time)
            { time: '3:0:0', velocity: 1.0 },   // Beat 1 - strong
            { time: '3:1:0', velocity: 0.7 },   // Beat 2
            { time: '3:2:0', velocity: 0.8 }    // Beat 3
        ]);
        kickPattern.loop = true;
        kickPattern.loopEnd = '4m'; // 4 measures total (5+3+5+3 = 16 beats)
        kickPattern.start(0);
        this.parts.push(kickPattern);
        
        // Snare pattern - accents on beat 2 of each measure
        const snarePattern = new Tone.Part((time, note) => {
            if (note) {
                this.snare.triggerAttackRelease('4n', time, note.velocity || 0.6);
            }
        }, [
            // Measure 1: 5 beats
            { time: '0:1:0', velocity: 0.7 },   // Beat 2
            { time: '0:4:0', velocity: 0.5 },   // Beat 5 (light accent)
            
            // Measure 2: 3 beats
            { time: '1:1:0', velocity: 0.8 },   // Beat 2 - strong
            
            // Measure 3: 5 beats
            { time: '2:1:0', velocity: 0.7 },   // Beat 2
            { time: '2:4:0', velocity: 0.5 },   // Beat 5 (light accent)
            
            // Measure 4: 3 beats
            { time: '3:1:0', velocity: 0.8 }    // Beat 2 - strong
        ]);
        snarePattern.loop = true;
        snarePattern.loopEnd = '4m';
        snarePattern.start(0);
        this.parts.push(snarePattern);
        
        // Hi-hat pattern - steady quarter notes with accents on beat 1
        const hiHatPattern = new Tone.Part((time, note) => {
            if (note) {
                this.hiHat.triggerAttackRelease('8n', time, note.velocity || 0.3);
            }
        }, [
            // Measure 1: 5 beats
            { time: '0:0:0', velocity: 0.5 },   // Beat 1 - accent
            { time: '0:1:0', velocity: 0.3 },   // Beat 2
            { time: '0:2:0', velocity: 0.3 },   // Beat 3
            { time: '0:3:0', velocity: 0.3 },   // Beat 4
            { time: '0:4:0', velocity: 0.3 },   // Beat 5
            
            // Measure 2: 3 beats
            { time: '1:0:0', velocity: 0.5 },   // Beat 1 - accent
            { time: '1:1:0', velocity: 0.3 },   // Beat 2
            { time: '1:2:0', velocity: 0.3 },   // Beat 3
            
            // Measure 3: 5 beats
            { time: '2:0:0', velocity: 0.5 },   // Beat 1 - accent
            { time: '2:1:0', velocity: 0.3 },   // Beat 2
            { time: '2:2:0', velocity: 0.3 },   // Beat 3
            { time: '2:3:0', velocity: 0.3 },   // Beat 4
            { time: '2:4:0', velocity: 0.3 },   // Beat 5
            
            // Measure 4: 3 beats
            { time: '3:0:0', velocity: 0.5 },   // Beat 1 - accent
            { time: '3:1:0', velocity: 0.3 },   // Beat 2
            { time: '3:2:0', velocity: 0.3 }    // Beat 3
        ]);
        hiHatPattern.loop = true;
        hiHatPattern.loopEnd = '4m';
        hiHatPattern.start(0);
        this.parts.push(hiHatPattern);
        
        // Sub-bass pattern - follows classical pattern
        const subBassPattern = new Tone.Part((time, note) => {
            if (note) {
                this.subBass.triggerAttackRelease(note.pitch, '4n', time);
            }
        }, [
            // Measure 1: 5 beats
            { time: '0:0:0', pitch: 'C1' },
            { time: '0:2:0', pitch: 'C1' },
            { time: '0:4:0', pitch: 'Eb1' },
            
            // Measure 2: 3 beats
            { time: '1:0:0', pitch: 'C1' },
            { time: '1:2:0', pitch: 'G1' },
            
            // Measure 3: 5 beats
            { time: '2:0:0', pitch: 'C1' },
            { time: '2:2:0', pitch: 'C1' },
            { time: '2:4:0', pitch: 'Eb1' },
            
            // Measure 4: 3 beats
            { time: '3:0:0', pitch: 'C1' },
            { time: '3:2:0', pitch: 'G1' }
        ]);
        subBassPattern.loop = true;
        subBassPattern.loopEnd = '4m';
        subBassPattern.start(0);
        this.parts.push(subBassPattern);
        
        // ===== CLASSICAL BASS LINE - FOLLOWS 5/4, 3/4 PATTERN =====
        
        // Bass line - follows classical time signature pattern
        const bassLine = new Tone.Part((time, note) => {
            this.bass.triggerAttackRelease(note.pitch, note.duration, time, note.velocity || 0.7);
        }, [
            // Measure 1: 5 beats (5/4 time)
            { time: '0:0:0', pitch: 'C2', duration: '4n', velocity: 0.9 },
            { time: '0:1:0', pitch: 'C2', duration: '4n', velocity: 0.7 },
            { time: '0:2:0', pitch: 'Eb2', duration: '4n', velocity: 0.8 },
            { time: '0:3:0', pitch: 'C2', duration: '4n', velocity: 0.7 },
            { time: '0:4:0', pitch: 'G2', duration: '4n', velocity: 0.7 },
            
            // Measure 2: 3 beats (3/4 time)
            { time: '1:0:0', pitch: 'F2', duration: '4n', velocity: 0.9 },
            { time: '1:1:0', pitch: 'Ab2', duration: '4n', velocity: 0.8 },
            { time: '1:2:0', pitch: 'C2', duration: '4n', velocity: 0.7 },
            
            // Measure 3: 5 beats (5/4 time)
            { time: '2:0:0', pitch: 'G2', duration: '4n', velocity: 0.9 },
            { time: '2:1:0', pitch: 'G2', duration: '4n', velocity: 0.7 },
            { time: '2:2:0', pitch: 'Bb2', duration: '4n', velocity: 0.8 },
            { time: '2:3:0', pitch: 'G2', duration: '4n', velocity: 0.7 },
            { time: '2:4:0', pitch: 'D2', duration: '4n', velocity: 0.7 },
            
            // Measure 4: 3 beats (3/4 time)
            { time: '3:0:0', pitch: 'Ab2', duration: '4n', velocity: 0.9 },
            { time: '3:1:0', pitch: 'C3', duration: '4n', velocity: 0.8 },
            { time: '3:2:0', pitch: 'Eb2', duration: '4n', velocity: 0.7 }
        ]);
        bassLine.loop = true;
        bassLine.loopEnd = '4m'; // 4 measures (5+3+5+3 beats)
        bassLine.start(0);
        this.parts.push(bassLine);
        
        // ===== AMBIENT PADS - SAD, RELAXING CHORDS =====
        
        // Long sustained pad chords (evolving texture)
        const padChords = new Tone.Part((time, chord) => {
            this.padSynth.triggerAttackRelease(chord.notes, chord.duration, time);
        }, [
            { time: '0:0:0', notes: ['C3', 'Eb3', 'G3', 'C4'], duration: '4m' },
            { time: '4:0:0', notes: ['F3', 'Ab3', 'C4', 'F4'], duration: '4m' },
            { time: '8:0:0', notes: ['G3', 'Bb3', 'D4', 'G4'], duration: '4m' },
            { time: '12:0:0', notes: ['Ab3', 'C4', 'Eb4', 'Ab4'], duration: '4m' }
        ]);
        padChords.loop = true;
        padChords.loopEnd = '16m';
        padChords.start(0);
        this.parts.push(padChords);
        
        // ===== RHYTHMIC MELODY - MORE ACTIVE =====
        
        // More active melody with rhythmic placement
        const melody = new Tone.Part((time, note) => {
            this.melodySynth.triggerAttackRelease(note.pitch, note.duration, time, note.velocity);
        }, [
            { time: '0:2:0', pitch: 'Eb4', duration: '8n', velocity: 0.4 },
            { time: '0:3:0', pitch: 'G4', duration: '4n', velocity: 0.5 },
            { time: '1:1:2', pitch: 'F4', duration: '8n', velocity: 0.4 },
            { time: '1:2:2', pitch: 'Ab4', duration: '8n', velocity: 0.5 },
            { time: '2:0:2', pitch: 'C5', duration: '8n', velocity: 0.4 },
            { time: '2:2:0', pitch: 'Bb4', duration: '4n', velocity: 0.5 },
            { time: '3:1:0', pitch: 'G4', duration: '8n', velocity: 0.4 },
            { time: '3:3:2', pitch: 'Eb4', duration: '8n', velocity: 0.4 }
        ]);
        melody.loop = true;
        melody.loopEnd = '4m';
        melody.start(0);
        this.parts.push(melody);
        
        // Start transport
        Tone.Transport.start();
        this.isPlaying = true;
        
        console.log(`[WorldSceneSong] ▶️ Playing (${this.key}, ${this.bpm} BPM, classical 5/4-3/4 pattern, looping)`);
    }
    
    /**
     * Stop the song
     */
    stop() {
        if (!this.isPlaying) {
            return;
        }
        
        console.log('[WorldSceneSong] Stopping...');
        
        // Stop all parts
        this.parts.forEach(part => {
            part.stop();
            part.dispose();
        });
        this.parts = [];
        
        // Stop transport
        Tone.Transport.stop();
        Tone.Transport.cancel();
        
        this.isPlaying = false;
        console.log('[WorldSceneSong] ⏹️ Stopped');
    }
    
    /**
     * Dispose of all instruments and effects
     */
    dispose() {
        this.stop();
        
        // Dispose instruments
        if (this.padSynth) this.padSynth.dispose();
        if (this.bass) this.bass.dispose();
        if (this.subBass) this.subBass.dispose();
        if (this.kickDrum) this.kickDrum.dispose();
        if (this.snare) this.snare.dispose();
        if (this.hiHat) this.hiHat.dispose();
        if (this.melodySynth) this.melodySynth.dispose();
        
        // Dispose effects
        if (this.reverb) this.reverb.dispose();
        if (this.delay) this.delay.dispose();
        if (this.filter) this.filter.dispose();
        if (this.compressor) this.compressor.dispose();
        if (this.volume) this.volume.dispose();
        
        // Reset references
        this.padSynth = null;
        this.bass = null;
        this.subBass = null;
        this.kickDrum = null;
        this.snare = null;
        this.hiHat = null;
        this.melodySynth = null;
        this.reverb = null;
        this.delay = null;
        this.filter = null;
        this.compressor = null;
        this.volume = null;
        
        console.log('[WorldSceneSong] Disposed');
    }
}

