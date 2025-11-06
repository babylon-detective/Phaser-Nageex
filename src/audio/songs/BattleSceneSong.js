import * as Tone from 'tone';

/**
 * BATTLE SCENE SONG - Intense Combat Music
 * 
 * Specifications:
 * - BPM: 120 (fast-paced for combat)
 * - Key: D minor (D, E, F, G, A, Bb, C)
 * - Mood: Intense, energetic, driving, combat-ready
 * - Structure: Continuous loop with strong rhythmic backbone
 * 
 * A modular Tone.js composition for battle scenes.
 * Features punchy drums, driving bass, aggressive synths, and rhythmic intensity.
 */
export class BattleSceneSong {
    constructor() {
        this.isPlaying = false;
        this.bpm = 120;
        this.key = 'D minor';
        
        // Instruments
        this.kickDrum = null;
        this.snare = null;
        this.hiHat = null;
        this.bass = null;
        this.subBass = null;
        this.leadSynth = null;
        this.padSynth = null;
        
        // Effects
        this.reverb = null;
        this.delay = null;
        this.filter = null;
        this.compressor = null;
        this.volume = null;
        
        // Song parts (Tone.js patterns/sequences)
        this.parts = [];
        
        // Victory and recruitment tunes
        this.victoryTune = null;
        this.recruitmentTune = null;
        
        console.log('[BattleSceneSong] Created (not initialized)');
    }
    
    /**
     * Initialize all instruments and effects
     */
    async init() {
        if (this.kickDrum) {
            console.log('[BattleSceneSong] Already initialized');
            return;
        }
        
        console.log('[BattleSceneSong] Setting up instruments...');
        
        // Effects chain
        this.reverb = new Tone.Reverb({
            decay: 3,
            wet: 0.2
        }).toDestination();
        
        this.delay = new Tone.FeedbackDelay({
            delayTime: '8n',
            feedback: 0.2,
            wet: 0.15
        }).connect(this.reverb);
        
        this.filter = new Tone.Filter({
            frequency: 5000,
            type: 'lowpass',
            rolloff: -12
        }).connect(this.delay);
        
        this.compressor = new Tone.Compressor({
            threshold: -16,
            ratio: 4,
            attack: 0.003,
            release: 0.1
        }).connect(this.filter);
        
        this.volume = new Tone.Volume(-8).connect(this.compressor);
        
        // Kick drum (punchy and tight)
        this.kickDrum = new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 10,
            oscillator: { type: 'sine' },
            envelope: {
                attack: 0.001,
                decay: 0.2,
                sustain: 0.01,
                release: 0.5
            }
        }).connect(this.volume);
        
        // Snare (sharp and punchy)
        this.snare = new Tone.NoiseSynth({
            noise: { type: 'white' },
            envelope: {
                attack: 0.001,
                decay: 0.1,
                sustain: 0,
                release: 0.1
            },
            filter: {
                type: 'highpass',
                frequency: 1000
            }
        }).connect(this.volume);
        
        // Hi-hat (crisp and fast)
        this.hiHat = new Tone.NoiseSynth({
            noise: { type: 'pink' },
            envelope: {
                attack: 0.001,
                decay: 0.03,
                sustain: 0,
                release: 0.02
            },
            filter: {
                type: 'highpass',
                frequency: 10000
            }
        }).connect(this.volume);
        
        // Bass (driving and punchy)
        this.bass = new Tone.MonoSynth({
            oscillator: { type: 'square' },
            envelope: {
                attack: 0.01,
                decay: 0.2,
                sustain: 0.3,
                release: 0.2
            },
            filterEnvelope: {
                attack: 0.01,
                decay: 0.2,
                sustain: 0.5,
                baseFrequency: 200,
                octaves: 3
            }
        }).connect(this.volume);
        
        // Sub-bass (deep foundation)
        this.subBass = new Tone.MonoSynth({
            oscillator: { type: 'sine' },
            envelope: {
                attack: 0.01,
                decay: 0.3,
                sustain: 0.5,
                release: 0.4
            },
            filter: {
                type: 'lowpass',
                frequency: 100,
                rolloff: -24
            }
        }).connect(this.volume);
        
        // Lead synth (aggressive and cutting)
        this.leadSynth = new Tone.Synth({
            oscillator: { type: 'sawtooth' },
            envelope: {
                attack: 0.01,
                decay: 0.2,
                sustain: 0.4,
                release: 0.3
            }
        }).connect(this.delay);
        
        // Pad synth (atmospheric texture)
        this.padSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sine' },
            envelope: {
                attack: 0.5,
                decay: 0.3,
                sustain: 0.6,
                release: 1.0
            }
        }).connect(this.reverb);
        
        // Generate reverb impulse
        await this.reverb.generate();
        
        console.log('[BattleSceneSong] ✅ Instruments ready');
    }
    
    /**
     * Get D minor chord progressions and notes
     */
    getDMinorChords() {
        return {
            Dm: ['D3', 'F3', 'A3'],
            Gm: ['G3', 'Bb3', 'D4'],
            Am: ['A3', 'C4', 'E4'],
            Bb: ['Bb3', 'D4', 'F4'],
            C: ['C4', 'E4', 'G4'],
            F: ['F3', 'A3', 'C4']
        };
    }
    
    /**
     * Get D minor scale notes
     */
    getDMinorScale() {
        return {
            scale: ['D3', 'E3', 'F3', 'G3', 'A3', 'Bb3', 'C4', 'D4'],
            bass: ['D2', 'E2', 'F2', 'G2', 'A2', 'Bb2', 'C3', 'D3']
        };
    }
    
    /**
     * Play the battle song (loops continuously)
     */
    async play() {
        if (this.isPlaying) {
            console.log('[BattleSceneSong] Already playing');
            return;
        }
        
        // Initialize instruments if not already done
        await this.init();
        
        console.log('[BattleSceneSong] Starting playback...');
        
        // Set BPM
        Tone.Transport.bpm.value = this.bpm;
        
        const chords = this.getDMinorChords();
        const scale = this.getDMinorScale();
        
        // ===== INTENSE BATTLE BEAT =====
        
        // Kick drum pattern (strong 4/4 beat)
        const kickPattern = new Tone.Part((time, note) => {
            if (note) {
                this.kickDrum.triggerAttackRelease('C1', '8n', time, note.velocity || 0.9);
            }
        }, [
            { time: '0:0:0', velocity: 1.0 },   // Beat 1 - strong
            { time: '0:1:2', velocity: 0.7 },   // Beat 2.5
            { time: '0:2:0', velocity: 0.8 },   // Beat 3
            { time: '0:3:2', velocity: 0.7 },   // Beat 4.5
            { time: '1:0:0', velocity: 1.0 },   // Beat 1
            { time: '1:1:2', velocity: 0.7 },   // Beat 2.5
            { time: '1:2:0', velocity: 0.8 },   // Beat 3
            { time: '1:3:2', velocity: 0.7 }    // Beat 4.5
        ]);
        kickPattern.loop = true;
        kickPattern.loopEnd = '2m';
        kickPattern.start(0);
        this.parts.push(kickPattern);
        
        // Snare pattern (backbeat on 2 and 4)
        const snarePattern = new Tone.Part((time, note) => {
            if (note) {
                this.snare.triggerAttackRelease('8n', time, note.velocity || 0.7);
            }
        }, [
            { time: '0:1:0', velocity: 0.8 },   // Beat 2
            { time: '0:3:0', velocity: 0.8 },   // Beat 4
            { time: '1:1:0', velocity: 0.8 },   // Beat 2
            { time: '1:3:0', velocity: 0.8 }    // Beat 4
        ]);
        snarePattern.loop = true;
        snarePattern.loopEnd = '2m';
        snarePattern.start(0);
        this.parts.push(snarePattern);
        
        // Hi-hat pattern (fast 16th notes with accents)
        const hiHatPattern = new Tone.Part((time, note) => {
            if (note) {
                this.hiHat.triggerAttackRelease('16n', time, note.velocity || 0.3);
            }
        }, [
            { time: '0:0:0', velocity: 0.5 },   // Beat 1
            { time: '0:0:2', velocity: 0.3 },
            { time: '0:1:0', velocity: 0.4 },
            { time: '0:1:2', velocity: 0.3 },
            { time: '0:2:0', velocity: 0.5 },
            { time: '0:2:2', velocity: 0.3 },
            { time: '0:3:0', velocity: 0.4 },
            { time: '0:3:2', velocity: 0.3 },
            { time: '1:0:0', velocity: 0.5 },
            { time: '1:0:2', velocity: 0.3 },
            { time: '1:1:0', velocity: 0.4 },
            { time: '1:1:2', velocity: 0.3 },
            { time: '1:2:0', velocity: 0.5 },
            { time: '1:2:2', velocity: 0.3 },
            { time: '1:3:0', velocity: 0.4 },
            { time: '1:3:2', velocity: 0.3 }
        ]);
        hiHatPattern.loop = true;
        hiHatPattern.loopEnd = '2m';
        hiHatPattern.start(0);
        this.parts.push(hiHatPattern);
        
        // Sub-bass pattern (deep foundation)
        const subBassPattern = new Tone.Part((time, note) => {
            if (note) {
                this.subBass.triggerAttackRelease(note.pitch, '4n', time);
            }
        }, [
            { time: '0:0:0', pitch: 'D1' },
            { time: '0:2:0', pitch: 'D1' },
            { time: '1:0:0', pitch: 'G1' },
            { time: '1:2:0', pitch: 'G1' }
        ]);
        subBassPattern.loop = true;
        subBassPattern.loopEnd = '2m';
        subBassPattern.start(0);
        this.parts.push(subBassPattern);
        
        // Bass line (driving rhythm)
        const bassLine = new Tone.Part((time, note) => {
            this.bass.triggerAttackRelease(note.pitch, note.duration, time, note.velocity || 0.8);
        }, [
            { time: '0:0:0', pitch: 'D2', duration: '8n', velocity: 0.9 },
            { time: '0:0:2', pitch: 'D2', duration: '8n', velocity: 0.7 },
            { time: '0:1:0', pitch: 'F2', duration: '8n', velocity: 0.8 },
            { time: '0:2:0', pitch: 'A2', duration: '4n', velocity: 0.9 },
            { time: '0:3:0', pitch: 'G2', duration: '8n', velocity: 0.8 },
            { time: '0:3:2', pitch: 'F2', duration: '8n', velocity: 0.7 },
            { time: '1:0:0', pitch: 'G2', duration: '8n', velocity: 0.9 },
            { time: '1:0:2', pitch: 'G2', duration: '8n', velocity: 0.7 },
            { time: '1:1:0', pitch: 'Bb2', duration: '8n', velocity: 0.8 },
            { time: '1:2:0', pitch: 'D3', duration: '4n', velocity: 0.9 },
            { time: '1:3:0', pitch: 'C3', duration: '8n', velocity: 0.8 },
            { time: '1:3:2', pitch: 'Bb2', duration: '8n', velocity: 0.7 }
        ]);
        bassLine.loop = true;
        bassLine.loopEnd = '2m';
        bassLine.start(0);
        this.parts.push(bassLine);
        
        // Lead synth melody (aggressive and rhythmic)
        const leadMelody = new Tone.Part((time, note) => {
            this.leadSynth.triggerAttackRelease(note.pitch, note.duration, time, note.velocity);
        }, [
            { time: '0:0:0', pitch: 'D4', duration: '8n', velocity: 0.6 },
            { time: '0:0:2', pitch: 'F4', duration: '8n', velocity: 0.5 },
            { time: '0:1:0', pitch: 'A4', duration: '4n', velocity: 0.7 },
            { time: '0:2:0', pitch: 'G4', duration: '8n', velocity: 0.6 },
            { time: '0:2:2', pitch: 'F4', duration: '8n', velocity: 0.5 },
            { time: '0:3:0', pitch: 'D4', duration: '4n', velocity: 0.6 },
            { time: '1:0:0', pitch: 'G4', duration: '8n', velocity: 0.6 },
            { time: '1:0:2', pitch: 'Bb4', duration: '8n', velocity: 0.5 },
            { time: '1:1:0', pitch: 'D5', duration: '4n', velocity: 0.7 },
            { time: '1:2:0', pitch: 'C5', duration: '8n', velocity: 0.6 },
            { time: '1:2:2', pitch: 'Bb4', duration: '8n', velocity: 0.5 },
            { time: '1:3:0', pitch: 'G4', duration: '4n', velocity: 0.6 }
        ]);
        leadMelody.loop = true;
        leadMelody.loopEnd = '2m';
        leadMelody.start(0);
        this.parts.push(leadMelody);
        
        // Pad chords (atmospheric texture)
        const padChords = new Tone.Part((time, chord) => {
            this.padSynth.triggerAttackRelease(chord.notes, chord.duration, time);
        }, [
            { time: '0:0:0', notes: ['D3', 'F3', 'A3'], duration: '2m' },
            { time: '2:0:0', notes: ['G3', 'Bb3', 'D4'], duration: '2m' }
        ]);
        padChords.loop = true;
        padChords.loopEnd = '4m';
        padChords.start(0);
        this.parts.push(padChords);
        
        // Start transport
        Tone.Transport.start();
        this.isPlaying = true;
        
        console.log(`[BattleSceneSong] ▶️ Playing (${this.key}, ${this.bpm} BPM, intense battle loop)`);
    }
    
    /**
     * Play victory tune (short, triumphant)
     */
    async playVictoryTune() {
        if (!this.initialized) {
            await this.init();
        }
        
        console.log('[BattleSceneSong] Playing victory tune...');
        
        // Stop battle loop
        if (this.isPlaying) {
            this.stop();
        }
        
        // Create victory tune (triumphant ascending chord progression)
        const victorySynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sine' },
            envelope: {
                attack: 0.01,
                decay: 0.3,
                sustain: 0.5,
                release: 0.8
            }
        }).toDestination();
        victorySynth.volume.value = -5;
        
        // Triumphant ascending progression
        victorySynth.triggerAttackRelease(['D4', 'F4', 'A4'], '4n');
        setTimeout(() => {
            victorySynth.triggerAttackRelease(['G4', 'Bb4', 'D5'], '4n');
        }, 500);
        setTimeout(() => {
            victorySynth.triggerAttackRelease(['A4', 'C5', 'E5'], '4n');
        }, 1000);
        setTimeout(() => {
            victorySynth.triggerAttackRelease(['D5', 'F5', 'A5'], '2n');
        }, 1500);
        
        // Store reference for cleanup
        this.victoryTune = victorySynth;
        
        // Clean up after tune finishes
        setTimeout(() => {
            if (this.victoryTune) {
                this.victoryTune.dispose();
                this.victoryTune = null;
            }
        }, 3000);
    }
    
    /**
     * Play recruitment tune (distinct, welcoming)
     */
    async playRecruitmentTune() {
        if (!this.initialized) {
            await this.init();
        }
        
        console.log('[BattleSceneSong] Playing recruitment tune...');
        
        // Stop battle loop temporarily (will resume after tune)
        const wasPlaying = this.isPlaying;
        if (wasPlaying) {
            this.stop();
        }
        
        // Create recruitment tune (welcoming, ascending melody)
        const recruitmentSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'triangle' },
            envelope: {
                attack: 0.1,
                decay: 0.2,
                sustain: 0.4,
                release: 0.6
            }
        }).toDestination();
        recruitmentSynth.volume.value = -5;
        
        // Welcoming ascending melody
        recruitmentSynth.triggerAttackRelease(['C4', 'E4', 'G4'], '4n');
        setTimeout(() => {
            recruitmentSynth.triggerAttackRelease(['D4', 'F4', 'A4'], '4n');
        }, 500);
        setTimeout(() => {
            recruitmentSynth.triggerAttackRelease(['E4', 'G4', 'B4'], '4n');
        }, 1000);
        setTimeout(() => {
            recruitmentSynth.triggerAttackRelease(['G4', 'B4', 'D5'], '2n');
        }, 1500);
        setTimeout(() => {
            recruitmentSynth.triggerAttackRelease(['C5', 'E5', 'G5'], '2n');
        }, 2500);
        
        // Store reference for cleanup
        this.recruitmentTune = recruitmentSynth;
        
        // Clean up after tune finishes and resume battle music if it was playing
        setTimeout(() => {
            if (this.recruitmentTune) {
                this.recruitmentTune.dispose();
                this.recruitmentTune = null;
            }
            // Resume battle music if it was playing before
            if (wasPlaying && !this.isPlaying) {
                this.play();
            }
        }, 4000);
    }
    
    /**
     * Stop the battle song
     */
    stop() {
        if (!this.isPlaying) {
            return;
        }
        
        console.log('[BattleSceneSong] Stopping...');
        
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
        console.log('[BattleSceneSong] ⏹️ Stopped');
    }
    
    /**
     * Dispose of all instruments and effects
     */
    dispose() {
        this.stop();
        
        // Dispose victory and recruitment tunes
        if (this.victoryTune) {
            this.victoryTune.dispose();
            this.victoryTune = null;
        }
        if (this.recruitmentTune) {
            this.recruitmentTune.dispose();
            this.recruitmentTune = null;
        }
        
        // Dispose instruments
        if (this.kickDrum) this.kickDrum.dispose();
        if (this.snare) this.snare.dispose();
        if (this.hiHat) this.hiHat.dispose();
        if (this.bass) this.bass.dispose();
        if (this.subBass) this.subBass.dispose();
        if (this.leadSynth) this.leadSynth.dispose();
        if (this.padSynth) this.padSynth.dispose();
        
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
        this.leadSynth = null;
        this.padSynth = null;
        this.reverb = null;
        this.delay = null;
        this.filter = null;
        this.compressor = null;
        this.volume = null;
        
        console.log('[BattleSceneSong] Disposed');
    }
    
    /**
     * Check if initialized
     */
    get initialized() {
        return this.kickDrum !== null;
    }
}

