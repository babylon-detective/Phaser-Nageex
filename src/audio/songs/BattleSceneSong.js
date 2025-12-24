import * as Tone from 'tone';

/**
 * BATTLE SCENE SONG - Context-Aware Combat Music
 * 
 * Two distinct battle themes:
 * 1. MYSTERY MODE - Suspenseful, mysterious encounter music for neutral NPCs
 *    - BPM: 100 (moderate, tense)
 *    - Key: A minor (mysterious, suspenseful)
 *    - Mood: Tense, uncertain, cautious
 * 
 * 2. FIGHT MODE - Intense action combat music when damage is dealt
 *    - BPM: 140 (fast, energetic)
 *    - Key: D minor (aggressive, driving)
 *    - Mood: Intense, energetic, aggressive
 * 
 * Plus victory and recruitment celebration tunes.
 */
export class BattleSceneSong {
    constructor() {
        this.isPlaying = false;
        this.currentMode = null; // 'mystery' or 'fight'
        this.bpm = 100;
        this.key = 'A minor';
        
        // Instruments (shared between modes)
        this.kickDrum = null;
        this.snare = null;
        this.hiHat = null;
        this.bass = null;
        this.leadSynth = null;
        this.padSynth = null;
        this.mysteryBell = null; // For mystery mode
        this.fightSynth = null;  // For fight mode
        
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
        
        // Bass (lighter, less vibratory)
        this.bass = new Tone.MonoSynth({
            oscillator: { type: 'triangle' },
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
                baseFrequency: 300,
                octaves: 2
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
        
        // Mystery bell (for mystery mode)
        this.mysteryBell = new Tone.Synth({
            oscillator: { type: 'triangle' },
            envelope: {
                attack: 0.01,
                decay: 0.5,
                sustain: 0.2,
                release: 0.8
            }
        }).connect(this.reverb);
        
        // Fight synth (aggressive for fight mode)
        this.fightSynth = new Tone.Synth({
            oscillator: { type: 'sawtooth' },
            envelope: {
                attack: 0.01,
                decay: 0.2,
                sustain: 0.4,
                release: 0.3
            }
        }).connect(this.delay);
        
        // Lead synth (versatile)
        this.leadSynth = new Tone.Synth({
            oscillator: { type: 'triangle' },
            envelope: {
                attack: 0.02,
                decay: 0.3,
                sustain: 0.4,
                release: 0.4
            }
        }).connect(this.delay);
        
        // Pad synth (atmospheric, less deep)
        this.padSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sine' },
            envelope: {
                attack: 0.8,
                decay: 0.4,
                sustain: 0.5,
                release: 1.2
            }
        }).connect(this.reverb);
        
        console.log('[BattleSceneSong] Instruments initialized');
    }
    
    /**
     * Play MYSTERY mode - suspenseful encounter music
     */
    async playMystery() {
        if (this.isPlaying && this.currentMode === 'mystery') {
            console.log('[BattleSceneSong] Mystery mode already playing');
            return;
        }
        
        // Stop if playing different mode
        if (this.isPlaying) {
            this.stop();
        }
        
        // Initialize instruments if not already done
        await this.init();
        
        console.log('[BattleSceneSong] Starting MYSTERY mode...');
        
        this.currentMode = 'mystery';
        this.bpm = 100;
        Tone.Transport.bpm.value = this.bpm;
        
        // Set BPM
        Tone.Transport.bpm.value = this.bpm;
        this.currentMode = 'mystery';
        this.bpm = 100;
        Tone.Transport.bpm.value = this.bpm;
        
        // A minor chords for mystery
        const mysteryChords = {
            Am: ['A3', 'C4', 'E4'],
            Dm: ['D3', 'F3', 'A3'],
            Em: ['E3', 'G3', 'B3'],
            F: ['F3', 'A3', 'C4']
        };
        
        // Sparse, tense hi-hat
        const mysteryHiHat = new Tone.Part((time, note) => {
            if (note) {
                this.hiHat.triggerAttackRelease('16n', time, 0.2);
            }
        }, [
            { time: '0:0:0' },
            { time: '0:2:0' },
            { time: '1:0:0' },
            { time: '1:2:0' }
        ]);
        mysteryHiHat.loop = true;
        mysteryHiHat.loopEnd = '2m';
        mysteryHiHat.start(0);
        this.parts.push(mysteryHiHat);
        
        // Soft kick (heartbeat-like)
        const mysteryKick = new Tone.Part((time) => {
            this.kickDrum.triggerAttackRelease('C1', '8n', time, 0.4);
        }, [
            { time: '0:0:0' },
            { time: '0:3:0' },
            { time: '1:1:0' }
        ]);
        mysteryKick.loop = true;
        mysteryKick.loopEnd = '2m';
        mysteryKick.start(0);
        this.parts.push(mysteryKick);
        
        // Mysterious bell melody
        const bellMelody = new Tone.Part((time, note) => {
            this.mysteryBell.triggerAttackRelease(note.pitch, note.duration, time, 0.5);
        }, [
            { time: '0:0:0', pitch: 'E5', duration: '4n' },
            { time: '0:2:0', pitch: 'D5', duration: '4n' },
            { time: '1:0:0', pitch: 'C5', duration: '4n' },
            { time: '1:2:0', pitch: 'A4', duration: '2n' }
        ]);
        bellMelody.loop = true;
        bellMelody.loopEnd = '2m';
        bellMelody.start(0);
        this.parts.push(bellMelody);
        
        // Suspenseful bass line
        const mysteryBass = new Tone.Part((time, note) => {
            this.bass.triggerAttackRelease(note.pitch, '4n', time, 0.6);
        }, [
            { time: '0:0:0', pitch: 'A2' },
            { time: '0:3:0', pitch: 'G2' },
            { time: '1:1:0', pitch: 'F2' },
            { time: '1:3:0', pitch: 'E2' }
        ]);
        mysteryBass.loop = true;
        mysteryBass.loopEnd = '2m';
        mysteryBass.start(0);
        this.parts.push(mysteryBass);
        
        // Atmospheric pads
        const mysteryPads = new Tone.Part((time, chord) => {
            this.padSynth.triggerAttackRelease(chord.notes, '2m', time);
        }, [
            { time: '0:0:0', notes: mysteryChords.Am },
            { time: '2:0:0', notes: mysteryChords.Dm }
        ]);
        mysteryPads.loop = true;
        mysteryPads.loopEnd = '4m';
        mysteryPads.start(0);
        this.parts.push(mysteryPads);
        
        Tone.Transport.start();
        this.isPlaying = true;
        console.log('[BattleSceneSong] ▶️ MYSTERY mode playing (A minor, 100 BPM, suspenseful)');
    }
    
    /**
     * Play FIGHT mode - intense action combat music
     */
    async playFight() {
        if (this.isPlaying && this.currentMode === 'fight') {
            console.log('[BattleSceneSong] Fight mode already playing');
            return;
        }
        
        // Stop if playing different mode
        if (this.isPlaying) {
            this.stop();
        }
        
        // Initialize instruments if not already done
        await this.init();
        
        console.log('[BattleSceneSong] Starting FIGHT mode...');
        
        this.currentMode = 'fight';
        this.bpm = 140;
        Tone.Transport.bpm.value = this.bpm;
        this.currentMode = 'fight';
        this.bpm = 140;
        Tone.Transport.bpm.value = this.bpm;
        
        // D minor chords for fight
        const fightChords = {
            Dm: ['D4', 'F4', 'A4'],
            Gm: ['G3', 'Bb3', 'D4'],
            A: ['A3', 'C#4', 'E4'],
            Bb: ['Bb3', 'D4', 'F4']
        };
        
        // Fast energetic kick pattern
        const fightKick = new Tone.Part((time, note) => {
            if (note) {
                this.kickDrum.triggerAttackRelease('C1', '16n', time, note.velocity);
            }
        }, [
            { time: '0:0:0', velocity: 1.0 },
            { time: '0:0:3', velocity: 0.7 },
            { time: '0:1:2', velocity: 0.8 },
            { time: '0:2:0', velocity: 0.9 },
            { time: '0:2:3', velocity: 0.6 },
            { time: '0:3:2', velocity: 0.8 }
        ]);
        fightKick.loop = true;
        fightKick.loopEnd = '1m';
        fightKick.start(0);
        this.parts.push(fightKick);
        
        // Punchy snare
        const fightSnare = new Tone.Part((time) => {
            this.snare.triggerAttackRelease('16n', time, 0.8);
        }, [
            { time: '0:1:0' },
            { time: '0:3:0' }
        ]);
        fightSnare.loop = true;
        fightSnare.loopEnd = '1m';
        fightSnare.start(0);
        this.parts.push(fightSnare);
        
        // Fast hi-hat
        const fightHiHat = new Tone.Part((time, note) => {
            this.hiHat.triggerAttackRelease('32n', time, note.velocity);
        }, [
            { time: '0:0:0', velocity: 0.5 },
            { time: '0:0:2', velocity: 0.3 },
            { time: '0:1:0', velocity: 0.5 },
            { time: '0:1:2', velocity: 0.3 },
            { time: '0:2:0', velocity: 0.5 },
            { time: '0:2:2', velocity: 0.3 },
            { time: '0:3:0', velocity: 0.5 },
            { time: '0:3:2', velocity: 0.3 }
        ]);
        fightHiHat.loop = true;
        fightHiHat.loopEnd = '1m';
        fightHiHat.start(0);
        this.parts.push(fightHiHat);
        
        // Aggressive, jumpy bass line
        const fightBass = new Tone.Part((time, note) => {
            this.bass.triggerAttackRelease(note.pitch, '16n', time, 0.9);
        }, [
            { time: '0:0:0', pitch: 'D3' },
            { time: '0:0:2', pitch: 'D3' },
            { time: '0:1:0', pitch: 'F3' },
            { time: '0:1:3', pitch: 'D3' },
            { time: '0:2:0', pitch: 'A3' },
            { time: '0:2:2', pitch: 'G3' },
            { time: '0:3:0', pitch: 'F3' },
            { time: '0:3:2', pitch: 'E3' }
        ]);
        fightBass.loop = true;
        fightBass.loopEnd = '1m';
        fightBass.start(0);
        this.parts.push(fightBass);
        
        // Energetic aggressive melody
        const fightMelody = new Tone.Part((time, note) => {
            this.fightSynth.triggerAttackRelease(note.pitch, '16n', time, 0.7);
        }, [
            { time: '0:0:0', pitch: 'D5' },
            { time: '0:0:3', pitch: 'F5' },
            { time: '0:1:2', pitch: 'A5' },
            { time: '0:2:0', pitch: 'G5' },
            { time: '0:2:2', pitch: 'F5' },
            { time: '0:3:0', pitch: 'D5' },
            { time: '0:3:3', pitch: 'A4' }
        ]);
        fightMelody.loop = true;
        fightMelody.loopEnd = '1m';
        fightMelody.start(0);
        this.parts.push(fightMelody);
        
        // Driving chord stabs
        const fightChordStabs = new Tone.Part((time, chord) => {
            this.padSynth.triggerAttackRelease(chord.notes, '8n', time);
        }, [
            { time: '0:0:0', notes: fightChords.Dm },
            { time: '0:2:0', notes: fightChords.Gm },
            { time: '1:0:0', notes: fightChords.A },
            { time: '1:2:0', notes: fightChords.Bb }
        ]);
        fightChordStabs.loop = true;
        fightChordStabs.loopEnd = '2m';
        fightChordStabs.start(0);
        this.parts.push(fightChordStabs);
        
        Tone.Transport.start();
        this.isPlaying = true;
        console.log('[BattleSceneSong] ▶️ FIGHT mode playing (D minor, 140 BPM, intense action!)');
    }
    
    /**
     * Legacy play method - defaults to mystery mode
     */
    async play() {
        return this.playMystery();
    }
    
    /**
     * Play victory tune - congratulatory and triumphant
     */
    async playVictoryTune() {
        if (!this.initialized) {
            await this.init();
        }
        
        console.log('[BattleSceneSong] Playing VICTORY tune...');
        
        // Stop battle loop
        if (this.isPlaying) {
            this.stop();
        }
        
        // Create bright congratulatory synth
        const victorySynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'triangle' },
            envelope: {
                attack: 0.01,
                decay: 0.3,
                sustain: 0.4,
                release: 0.8
            }
        }).toDestination();
        victorySynth.volume.value = -8;
        
        // Victory fanfare - triumphant ascending progression
        const schedule = [
            { time: 0, notes: ['D4', 'F4', 'A4'], duration: '4n' },
            { time: 300, notes: ['E4', 'G4', 'B4'], duration: '4n' },
            { time: 600, notes: ['F4', 'A4', 'C5'], duration: '4n' },
            { time: 900, notes: ['G4', 'B4', 'D5'], duration: '4n' },
            { time: 1200, notes: ['A4', 'C5', 'E5'], duration: '2n' },
            { time: 1800, notes: ['D5', 'F5', 'A5'], duration: '1n' }
        ];
        
        schedule.forEach(({ time, notes, duration }) => {
            setTimeout(() => {
                victorySynth.triggerAttackRelease(notes, duration);
            }, time);
        });
        
        // Store reference for cleanup
        this.victoryTune = victorySynth;
        
        // Clean up after tune finishes
        setTimeout(() => {
            if (this.victoryTune) {
                this.victoryTune.dispose();
                this.victoryTune = null;
            }
        }, 3500);
    }
    
    /**
     * Play recruitment tune - friendly and welcoming
     */
    async playRecruitmentTune() {
        if (!this.initialized) {
            await this.init();
        }
        
        console.log('[BattleSceneSong] Playing RECRUITMENT tune...');
        
        // Stop battle loop
        if (this.isPlaying) {
            this.stop();
        }
        
        // Create warm friendly synth
        const recruitmentSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sine' },
            envelope: {
                attack: 0.15,
                decay: 0.3,
                sustain: 0.5,
                release: 0.9
            }
        }).toDestination();
        recruitmentSynth.volume.value = -8;
        
        // Friendly welcoming melody - warm and inviting
        const schedule = [
            { time: 0, notes: ['G4', 'B4', 'D5'], duration: '4n' },
            { time: 400, notes: ['A4', 'C5', 'E5'], duration: '4n' },
            { time: 800, notes: ['B4', 'D5', 'F#5'], duration: '4n' },
            { time: 1200, notes: ['C5', 'E5', 'G5'], duration: '2n' },
            { time: 1800, notes: ['D5', 'F#5', 'A5'], duration: '4n' },
            { time: 2200, notes: ['E5', 'G5', 'B5'], duration: '4n' },
            { time: 2600, notes: ['G5', 'B5', 'D6'], duration: '1n' }
        ];
        
        schedule.forEach(({ time, notes, duration }) => {
            setTimeout(() => {
                recruitmentSynth.triggerAttackRelease(notes, duration);
            }, time);
        });
        
        // Store reference for cleanup
        this.recruitmentTune = recruitmentSynth;
        
        // Clean up after tune finishes
        setTimeout(() => {
            if (this.recruitmentTune) {
                this.recruitmentTune.dispose();
                this.recruitmentTune = null;
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
        
        console.log(`[BattleSceneSong] Stopping ${this.currentMode} mode...`);
        
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
        this.currentMode = null;
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
        if (this.leadSynth) this.leadSynth.dispose();
        if (this.padSynth) this.padSynth.dispose();
        if (this.mysteryBell) this.mysteryBell.dispose();
        if (this.fightSynth) this.fightSynth.dispose();
        
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
        this.leadSynth = null;
        this.padSynth = null;
        this.mysteryBell = null;
        this.fightSynth = null;
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

