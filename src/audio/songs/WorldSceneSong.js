import * as Tone from 'tone';

/**
 * WORLD SCENE SONG - C minor Deep Ambient Composition
 * 
 * Based on audio analysis:
 * - BPM: 79.7
 * - Key: C minor (C, D, Eb, F, G, Ab, Bb)
 * - Mood: Deep, sad, relaxing
 * - Structure: Continuous ambient loop with deep bass pulse
 * 
 * A modular Tone.js composition for the overworld exploration.
 * Features deep bass with regular kick, ambient pads, and evolving texture.
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
        this.melodySynth = null;
        
        // Effects
        this.reverb = null;
        this.delay = null;
        this.filter = null;
        this.volume = null;
        
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
                attack: 3,      // Very slow attack for ambient feel
                decay: 2,
                sustain: 0.9,
                release: 5      // Long release
            }
        });
        
        // Bass (square wave with filter for warmth)
        this.bass = new Tone.MonoSynth({
            oscillator: { type: 'square' },
            envelope: {
                attack: 0.01,
                decay: 0.4,
                sustain: 0.5,
                release: 0.6
            },
            filterEnvelope: {
                attack: 0.01,
                decay: 0.3,
                sustain: 0.6,
                baseFrequency: 150,
                octaves: 2
            }
        });
        
        // Sub-bass (deep sine for rumble - those downward spikes)
        this.subBass = new Tone.MonoSynth({
            oscillator: { type: 'sine' },
            envelope: {
                attack: 0.02,
                decay: 0.5,
                sustain: 0.8,
                release: 1.5
            },
            filter: {
                type: 'lowpass',
                frequency: 80,
                rolloff: -24
            }
        });
        
        // Kick drum (low frequency sine pulse)
        this.kickDrum = new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 10,
            oscillator: { type: 'sine' },
            envelope: {
                attack: 0.001,
                decay: 0.4,
                sustain: 0.01,
                release: 1.4
            }
        });
        
        // Melody synth (subtle triangle wave)
        this.melodySynth = new Tone.Synth({
            oscillator: { type: 'triangle' },
            envelope: {
                attack: 0.5,
                decay: 0.3,
                sustain: 0.4,
                release: 2
            }
        });
        
        // Effects chain
        this.reverb = new Tone.Reverb({
            decay: 6,      // Longer reverb for more space
            wet: 0.5       // More reverb for ambient feel
        }).toDestination();
        
        this.delay = new Tone.FeedbackDelay({
            delayTime: '4n',
            feedback: 0.4,
            wet: 0.3
        }).connect(this.reverb);
        
        this.filter = new Tone.Filter({
            frequency: 3000,
            type: 'lowpass',
            rolloff: -12
        }).connect(this.delay);
        
        this.volume = new Tone.Volume(-10).connect(this.filter); // Background level
        
        // Connect instruments to effects
        this.padSynth.connect(this.reverb);  // Pads direct to reverb
        this.bass.connect(this.volume);
        this.subBass.connect(this.volume);
        this.kickDrum.connect(this.volume);
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
        
        // ===== DEEP BASS WITH REGULAR KICK (those downward spikes) =====
        
        // Kick drum pattern - regular pulse (every 2 beats)
        const kickPattern = new Tone.Sequence((time) => {
            this.kickDrum.triggerAttackRelease('C1', '8n', time);
        }, [1, 0, 1, 0], '2n'); // Kick on beats 1 and 3
        kickPattern.start(0);
        this.parts.push(kickPattern);
        
        // Sub-bass pattern - deep rumble (syncs with kick)
        const subBassPattern = new Tone.Sequence((time, note) => {
            if (note) {
                this.subBass.triggerAttackRelease(note, '4n', time);
            }
        }, ['C1', null, 'C1', null, 'Eb1', null, 'C1', null], '2n');
        subBassPattern.start(0);
        this.parts.push(subBassPattern);
        
        // Bass line - slow, deep progression
        const bassLine = new Tone.Part((time, note) => {
            this.bass.triggerAttackRelease(note.pitch, note.duration, time);
        }, [
            { time: '0:0:0', pitch: 'C2', duration: '2m' },
            { time: '2:0:0', pitch: 'Eb2', duration: '2m' },
            { time: '4:0:0', pitch: 'F2', duration: '2m' },
            { time: '6:0:0', pitch: 'G2', duration: '2m' },
            { time: '8:0:0', pitch: 'Ab2', duration: '2m' },
            { time: '10:0:0', pitch: 'Bb2', duration: '2m' },
            { time: '12:0:0', pitch: 'C2', duration: '2m' },
            { time: '14:0:0', pitch: 'G2', duration: '2m' }
        ]);
        bassLine.loop = true;
        bassLine.loopEnd = '16m';
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
        
        // ===== SUBTLE MELODY - SPARSE AND MELANCHOLIC =====
        
        // Sparse melody (evolving density)
        const melody = new Tone.Part((time, note) => {
            this.melodySynth.triggerAttackRelease(note.pitch, note.duration, time, note.velocity);
        }, [
            { time: '2:0:0', pitch: 'Eb4', duration: '1m', velocity: 0.3 },
            { time: '4:0:0', pitch: 'G4', duration: '2m', velocity: 0.3 },
            { time: '7:0:0', pitch: 'F4', duration: '1m', velocity: 0.25 },
            { time: '9:0:0', pitch: 'Ab4', duration: '2m', velocity: 0.3 },
            { time: '12:0:0', pitch: 'C5', duration: '1m', velocity: 0.3 },
            { time: '14:0:0', pitch: 'Bb4', duration: '2m', velocity: 0.25 }
        ]);
        melody.loop = true;
        melody.loopEnd = '16m';
        melody.start(0);
        this.parts.push(melody);
        
        // Start transport
        Tone.Transport.start();
        this.isPlaying = true;
        
        console.log(`[WorldSceneSong] ▶️ Playing (${this.key}, ${this.bpm} BPM, looping)`);
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
        if (this.melodySynth) this.melodySynth.dispose();
        
        // Dispose effects
        if (this.reverb) this.reverb.dispose();
        if (this.delay) this.delay.dispose();
        if (this.filter) this.filter.dispose();
        if (this.volume) this.volume.dispose();
        
        // Reset references
        this.padSynth = null;
        this.bass = null;
        this.subBass = null;
        this.kickDrum = null;
        this.melodySynth = null;
        this.reverb = null;
        this.delay = null;
        this.filter = null;
        this.volume = null;
        
        console.log('[WorldSceneSong] Disposed');
    }
}

