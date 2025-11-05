# Sound System Documentation

## Overview
The game uses Tone.js for sound generation and playback. All sound effects are synthesized in real-time, and the system supports background music via audio files.

## Architecture

### SoundManager (`src/managers/SoundManager.js`)
Central sound management singleton that handles:
- Sound effect synthesis
- Background music playback
- Volume controls
- Mute states

## Sound Effects

### UI Sounds
- **Menu Select** - High-pitched beep when navigating menus
- **Menu Confirm** - Rising tone when confirming selection
- **Menu Cancel** - Descending tone when canceling

### Combat Sounds
- **Attack** - Low membrane synth for melee attacks
- **Hit** - White noise burst when damage is dealt
- **Dash** - Square wave pulse for dash movement
- **Projectile** - High-pitched sine wave for projectile attacks

### System Sounds
- **Level Up** - Ascending arpeggio (C-E-G-C)
- **Victory** - Victory fanfare melody
- **Defeat** - Descending tone for game over
- **Step** - Brown noise tap for footsteps

## Usage

### Initialization
The sound system must be initialized after user interaction (browser requirement):

```javascript
import { soundManager } from '../managers/SoundManager.js';

// In scene update or after user clicks:
await soundManager.init();
```

### Playing Sound Effects
```javascript
// Simple method calls
soundManager.playAttack();
soundManager.playHit();
soundManager.playMenuSelect();
soundManager.playLevelUp();
soundManager.playVictory();

// Generic method with custom parameters
soundManager.playSFX('attack', 'C2', '8n');
```

### Background Music
```javascript
// Play looping music
await soundManager.playMusic('/assets/audio/battle-theme.mp3', true);

// Stop music
soundManager.stopMusic();

// Pause/Resume
soundManager.pauseMusic();
soundManager.resumeMusic();
```

### Volume Controls
```javascript
// Set master volume (-100 to 0 dB)
soundManager.setMasterVolume(-10);

// Set SFX volume
soundManager.setSFXVolume(-5);

// Set music volume
soundManager.setMusicVolume(-15);

// Toggle mute
soundManager.toggleSFXMute();
soundManager.toggleMusicMute();
```

## Current Integrations

### StartScene
- Menu navigation sounds
- Confirm/Cancel sounds
- Auto-initialization on first user input

### BattleScene
- Attack sounds on melee hits
- Hit sounds when damage is applied
- Dash sound on dash activation
- Level up sound on level up notification
- Victory sound on battle win

### BattleMenuScene
- Menu navigation sounds (left/right)
- Confirm sound on icon activation

## Adding New Sound Effects

### 1. Create Synthesizer
Edit `SoundManager.setupSoundEffects()`:

```javascript
this.synths.newSound = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
}).toDestination();
```

### 2. Add Convenience Method
```javascript
playNewSound() {
    this.playSFX('newSound', 'C4', '8n');
}
```

### 3. Use in Game
```javascript
import { soundManager } from '../managers/SoundManager.js';

// Somewhere in your scene
soundManager.playNewSound();
```

## Tone.js Notes

### Note Durations
- `'64n'` - Very short (64th note)
- `'32n'` - Short (32nd note)
- `'16n'` - Quick (16th note)
- `'8n'` - Standard (8th note)
- `'4n'` - Long (quarter note)
- `'2n'` - Very long (half note)

### Note Names
Standard music notation: `'C4'`, `'E5'`, `'G#3'`, etc.
- Number indicates octave (middle C = C4)
- Higher numbers = higher pitch

### Oscillator Types
- `'sine'` - Pure tone, smooth
- `'square'` - Harsh, retro game sound
- `'triangle'` - Softer than square
- `'sawtooth'` - Bright, buzzy

## Future Additions
- [ ] Background music tracks for different scenes
- [ ] Ambient sounds (wind, water, etc.)
- [ ] More varied combat sounds
- [ ] Spatial audio (3D positioning)
- [ ] Dynamic music system (battle intensity)
- [ ] Sound effect pooling for performance
- [ ] Audio sprite support
- [ ] Custom reverb/effects chains

## Dependencies
- `tone`: ^15.x.x - Web Audio framework for synthesis and playback

## Browser Compatibility
Requires Web Audio API support (all modern browsers). Sound initialization requires user interaction (click, keypress, etc.) due to browser autoplay policies.

## Performance Notes
- All sound effects are real-time synthesis (very lightweight)
- No audio file loading required for SFX
- Music uses standard audio loading/playback
- Minimal CPU usage (<1% for typical gameplay)

## Debugging
```javascript
// Check if initialized
console.log(soundManager.initialized); // true/false

// Check current state
console.log(soundManager.sfxMuted);
console.log(soundManager.musicMuted);
console.log(soundManager.currentMusic);
```

