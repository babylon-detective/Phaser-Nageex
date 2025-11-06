import * as Tone from 'tone';

/**
 * WORLD SCENE SONG - Based on Waveform Analysis
 * 
 * Waveform Analysis:
 * - Primary Pulse: Regular, strong vertical spikes (kick drum) - consistent tempo
 * - Sub-Rhythms: Rich texture of smaller fluctuations (snare, hi-hats, bass, melody)
 * - Grouping: Alternating 5/4 and 3/4 time signatures
 * - Mood: Classical, approachable, engaging, relaxed, sad but danceable
 * 
 * Specifications:
 * - BPM: 79.7
 * - Key: C minor (C, D, Eb, F, G, Ab, Bb)
 * - Structure: Continuous loop with clear rhythmic backbone
 */
export class WorldSceneSong {
    constructor() {
        this.isPlaying = false;
        this.bpm = 79.7;
        this.key = 'C minor';
        
        // Instruments
        this.kickDrum = null;
        this.snare = null;
        this.hiHat = null;
        this.bass = null;
        this.subBass = null;
        this.padSynth = null;
        this.melodySynth = null;
        
        // Effects
        this.reverb = null;
        this.delay = null;
        this.filter = null;
        this.compressor = null;
        this.volume = null;
        
        // Song parts (Tone.js patterns/sequences)
        this.parts = [];
        
        console.log('[WorldSceneSong] Created (not initialized)');
    }
    
    /**
     * Initialize all instruments and effects
     */
    async init() {
        if (this.kickDrum) {
            console.log('[WorldSceneSong] Already initialized');
            return;
        }
        
        console.log('[WorldSceneSong] Setting up instruments...');
        
        // Effects chain
        this.reverb = new Tone.Reverb({
            decay: 5,
            wet: 0.4
        }).toDestination();
        
        this.delay = new Tone.FeedbackDelay({
            delayTime: '8n',
            feedback: 0.3,
            wet: 0.2
        }).connect(this.reverb);
        
        this.filter = new Tone.Filter({
            frequency: 3500,
            type: 'lowpass',
            rolloff: -12
        }).connect(this.delay);
        
        this.compressor = new Tone.Compressor({
            threshold: -18,
            ratio: 3,
            attack: 0.003,
            release: 0.1
        }).connect(this.filter);
        
        this.volume = new Tone.Volume(-10).connect(this.compressor);
        
        // Primary Pulse - Kick Drum (strong, regular vertical spikes)
        this.kickDrum = new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 10,
            oscillator: { type: 'sine' },
            envelope: {
                attack: 0.001,
                decay: 0.4,
                sustain: 0.01,
                release: 1.2
            }
        }).connect(this.volume);
        
        // Sub-Rhythms - Snare (texture between pulses)
        this.snare = new Tone.NoiseSynth({
            noise: { type: 'white' },
            envelope: {
                attack: 0.001,
                decay: 0.2,
                sustain: 0,
                release: 0.1
            },
            filter: {
                type: 'highpass',
                frequency: 1500
            }
        }).connect(this.volume);
        
        // Sub-Rhythms - Hi-Hat (rich texture)
        this.hiHat = new Tone.NoiseSynth({
            noise: { type: 'pink' },
            envelope: {
                attack: 0.001,
                decay: 0.08,
                sustain: 0,
                release: 0.03
            },
            filter: {
                type: 'highpass',
                frequency: 7000
            }
        }).connect(this.volume);
        
        // Bass (smooth overall shape with percussive transients)
        this.bass = new Tone.MonoSynth({
            oscillator: { type: 'square' },
            envelope: {
                attack: 0.01,
                decay: 0.3,
                sustain: 0.5,
                release: 0.4
            },
            filterEnvelope: {
                attack: 0.01,
                decay: 0.2,
                sustain: 0.6,
                baseFrequency: 150,
                octaves: 2
            }
        }).connect(this.volume);
        
        // Sub-Bass (deep foundation)
        this.subBass = new Tone.MonoSynth({
            oscillator: { type: 'sine' },
            envelope: {
                attack: 0.01,
                decay: 0.4,
                sustain: 0.7,
                release: 0.8
            },
            filter: {
                type: 'lowpass',
                frequency: 100,
                rolloff: -24
            }
        }).connect(this.volume);
        
        // Pads (smooth, sustained - sad but danceable)
        this.padSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sine' },
            envelope: {
                attack: 2.5,
                decay: 2,
                sustain: 0.8,
                release: 4
            }
        }).connect(this.reverb);
        
        // Melody (engaging, approachable)
        this.melodySynth = new Tone.Synth({
            oscillator: { type: 'triangle' },
            envelope: {
                attack: 0.4,
                decay: 0.3,
                sustain: 0.5,
                release: 1.8
            }
        }).connect(this.delay);
        
        // Generate reverb impulse
        await this.reverb.generate();
        
        console.log('[WorldSceneSong] ✅ Instruments ready');
    }
    
    /**
     * Get C minor chord progressions
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
     * Based on waveform: Primary pulse + rich sub-rhythms + alternating 5/4-3/4 pattern
     */
    async play() {
        if (this.isPlaying) {
            console.log('[WorldSceneSong] Already playing');
            return;
        }
        
        // Initialize instruments if not already done
        await this.init();
        
        console.log('[WorldSceneSong] Starting playback...');
        
        // Set BPM
        Tone.Transport.bpm.value = this.bpm;
        
        const chords = this.getCMinorChords();
        const scale = this.getCMinorScale();
        
        // ===== PRIMARY PULSE - KICK DRUM (Regular, Strong Vertical Spikes) =====
        
        // Kick pattern - Strong, regular pulses marking the beat
        // Pattern: 5/4, 3/4, 5/4, 3/4... (based on waveform grouping)
        const kickPattern = new Tone.Part((time, note) => {
            if (note) {
                this.kickDrum.triggerAttackRelease('C1', '4n', time, note.velocity || 0.9);
            }
        }, [
            // Measure 1: 5 beats (5/4 time) - 1, 2, 3, 4, 5
            { time: '0:0:0', velocity: 1.0 },   // Beat 1 - STRONG (primary pulse)
            { time: '0:1:0', velocity: 0.8 },   // Beat 2
            { time: '0:2:0', velocity: 0.9 },   // Beat 3
            { time: '0:3:0', velocity: 0.7 },   // Beat 4
            { time: '0:4:0', velocity: 0.8 },   // Beat 5
            
            // Measure 2: 3 beats (3/4 time) - 1, 2, 3
            { time: '1:0:0', velocity: 1.0 },   // Beat 1 - STRONG (primary pulse)
            { time: '1:1:0', velocity: 0.8 },   // Beat 2
            { time: '1:2:0', velocity: 0.9 },   // Beat 3
            
            // Measure 3: 5 beats (5/4 time) - 1, 2, 3, 4, 5
            { time: '2:0:0', velocity: 1.0 },   // Beat 1 - STRONG (primary pulse)
            { time: '2:1:0', velocity: 0.8 },   // Beat 2
            { time: '2:2:0', velocity: 0.9 },   // Beat 3
            { time: '2:3:0', velocity: 0.7 },   // Beat 4
            { time: '2:4:0', velocity: 0.8 },   // Beat 5
            
            // Measure 4: 3 beats (3/4 time) - 1, 2, 3
            { time: '3:0:0', velocity: 1.0 },   // Beat 1 - STRONG (primary pulse)
            { time: '3:1:0', velocity: 0.8 },   // Beat 2
            { time: '3:2:0', velocity: 0.9 }    // Beat 3
        ]);
        kickPattern.loop = true;
        kickPattern.loopEnd = '4m'; // 4 measures (5+3+5+3 = 16 beats)
        kickPattern.start(0);
        this.parts.push(kickPattern);
        
        // ===== SUB-RHYTHMS - SNARE (Texture Between Pulses) =====
        
        // Snare pattern - Classical backbeat with variation
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
        
        // ===== SUB-RHYTHMS - HI-HAT (Rich Texture) =====
        
        // Hi-hat pattern - Continuous texture (dense, varied fluctuations)
        const hiHatPattern = new Tone.Part((time, note) => {
            if (note) {
                this.hiHat.triggerAttackRelease('8n', time, note.velocity || 0.3);
            }
        }, [
            // Measure 1: 5 beats - Rich texture
            { time: '0:0:0', velocity: 0.4 },   // Beat 1
            { time: '0:0:2', velocity: 0.3 },   // 1-and
            { time: '0:1:0', velocity: 0.5 },   // Beat 2 - accent
            { time: '0:1:2', velocity: 0.3 },   // 2-and
            { time: '0:2:0', velocity: 0.4 },   // Beat 3
            { time: '0:2:2', velocity: 0.3 },   // 3-and
            { time: '0:3:0', velocity: 0.4 },   // Beat 4
            { time: '0:3:2', velocity: 0.3 },   // 4-and
            { time: '0:4:0', velocity: 0.4 },   // Beat 5
            { time: '0:4:2', velocity: 0.3 },   // 5-and
            
            // Measure 2: 3 beats - Sparse texture
            { time: '1:0:0', velocity: 0.4 },   // Beat 1
            { time: '1:0:2', velocity: 0.3 },   // 1-and
            { time: '1:1:0', velocity: 0.5 },   // Beat 2 - accent
            { time: '1:1:2', velocity: 0.3 },   // 2-and
            { time: '1:2:0', velocity: 0.4 },   // Beat 3
            { time: '1:2:2', velocity: 0.3 },   // 3-and
            
            // Measure 3: 5 beats - Rich texture
            { time: '2:0:0', velocity: 0.4 },   // Beat 1
            { time: '2:0:2', velocity: 0.3 },   // 1-and
            { time: '2:1:0', velocity: 0.5 },   // Beat 2 - accent
            { time: '2:1:2', velocity: 0.3 },   // 2-and
            { time: '2:2:0', velocity: 0.4 },   // Beat 3
            { time: '2:2:2', velocity: 0.3 },   // 3-and
            { time: '2:3:0', velocity: 0.4 },   // Beat 4
            { time: '2:3:2', velocity: 0.3 },   // 4-and
            { time: '2:4:0', velocity: 0.4 },   // Beat 5
            { time: '2:4:2', velocity: 0.3 },   // 5-and
            
            // Measure 4: 3 beats - Sparse texture
            { time: '3:0:0', velocity: 0.4 },   // Beat 1
            { time: '3:0:2', velocity: 0.3 },   // 1-and
            { time: '3:1:0', velocity: 0.5 },   // Beat 2 - accent
            { time: '3:1:2', velocity: 0.3 },   // 2-and
            { time: '3:2:0', velocity: 0.4 },   // Beat 3
            { time: '3:2:2', velocity: 0.3 }    // 3-and
        ]);
        hiHatPattern.loop = true;
        hiHatPattern.loopEnd = '4m';
        hiHatPattern.start(0);
        this.parts.push(hiHatPattern);
        
        // ===== SUB-BASS (Deep Foundation) =====
        
        // Sub-bass pattern - Syncs with primary pulse
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
        
        // ===== BASS LINE (Smooth with Percussive Transients) =====
        
        // Bass line - Follows pulse with engaging rhythm
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
        bassLine.loopEnd = '4m';
        bassLine.start(0);
        this.parts.push(bassLine);
        
        // ===== PADS (Smooth, Sustained - Sad but Danceable) =====
        
        // Pad chords - Long sustained, smooth overall shape
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
        
        // ===== MELODY (Engaging, Approachable) =====
        
        // Melody - Engaging, approachable, relaxed
        const melody = new Tone.Part((time, note) => {
            this.melodySynth.triggerAttackRelease(note.pitch, note.duration, time, note.velocity);
        }, [
            // Measure 1: 5 beats
            { time: '0:2:0', pitch: 'Eb4', duration: '8n', velocity: 0.4 },
            { time: '0:3:0', pitch: 'G4', duration: '4n', velocity: 0.5 },
            { time: '0:4:2', pitch: 'F4', duration: '8n', velocity: 0.4 },
            
            // Measure 2: 3 beats
            { time: '1:1:2', pitch: 'Ab4', duration: '8n', velocity: 0.5 },
            { time: '1:2:0', pitch: 'C5', duration: '4n', velocity: 0.5 },
            
            // Measure 3: 5 beats
            { time: '2:0:2', pitch: 'Bb4', duration: '8n', velocity: 0.4 },
            { time: '2:2:0', pitch: 'G4', duration: '4n', velocity: 0.5 },
            { time: '2:3:2', pitch: 'F4', duration: '8n', velocity: 0.4 },
            
            // Measure 4: 3 beats
            { time: '3:1:0', pitch: 'Eb4', duration: '4n', velocity: 0.5 },
            { time: '3:2:2', pitch: 'C4', duration: '8n', velocity: 0.4 }
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
        if (this.kickDrum) this.kickDrum.dispose();
        if (this.snare) this.snare.dispose();
        if (this.hiHat) this.hiHat.dispose();
        if (this.bass) this.bass.dispose();
        if (this.subBass) this.subBass.dispose();
        if (this.padSynth) this.padSynth.dispose();
        if (this.melodySynth) this.melodySynth.dispose();
        
        // Dispose effects
        if (this.reverb) this.reverb.dispose();
        if (this.delay) this.delay.dispose();
        if (this.filter) this.filter.dispose();
        if (this.compressor) this.compressor.dispose();
        if (this.volume) this.volume.dispose();
        
        // Reset references
        this.kickDrum = null;
        this.snare = null;
        this.hiHat = null;
        this.bass = null;
        this.subBass = null;
        this.padSynth = null;
        this.melodySynth = null;
        this.reverb = null;
        this.delay = null;
        this.filter = null;
        this.compressor = null;
        this.volume = null;
        
        console.log('[WorldSceneSong] Disposed');
    }
}
