# Audio System Architecture

This directory contains all Tone.js audio code organized in a modular structure.

## Directory Structure

```
src/audio/
├── songs/              # Tone.js song compositions (background music)
│   └── StartMenuSong.js
└── sfx/               # Sound effect definitions (future)
    └── (TBD)
```

## Songs (`songs/`)

Each song is a self-contained ES6 class that:
- Creates its own instruments and effects
- Manages its own playback state
- Can be started, stopped, and disposed independently
- Exports a clean API for the SoundManager

### Creating a New Song

1. Create a new file in `src/audio/songs/`:
   ```javascript
   // src/audio/songs/BattleSong.js
   import * as Tone from 'tone';
   
   export class BattleSong {
       constructor() {
           this.isPlaying = false;
           this.bpm = 120;
           // ... instrument definitions
       }
       
       setupInstruments() {
           // Create synths, effects, etc.
       }
       
       async play() {
           // Arrange and start playback
       }
       
       stop() {
           // Stop and clean up
       }
       
       dispose() {
           // Full cleanup
       }
   }
   ```

2. Import it in `SoundManager.js`:
   ```javascript
   import { BattleSong } from '../audio/songs/BattleSong.js';
   ```

3. Use it in SoundManager:
   ```javascript
   playBattleSong() {
       if (!this.battleSong) {
           this.battleSong = new BattleSong();
       }
       this.battleSong.play();
   }
   ```

## Sound Effects (`sfx/`)

**Status**: Not yet implemented

**Future Plan**: 
- Create a modular system for sound effects similar to songs
- Each SFX category in its own file (combat, UI, ambient, etc.)
- Or keep SFX in SoundManager if they're simple enough

## Why This Structure?

✅ **Modular**: Each song is independent and reusable  
✅ **Organized**: Easy to find and edit specific compositions  
✅ **Clean**: SoundManager becomes a simple orchestrator  
✅ **Scalable**: Adding new songs/music doesn't bloat SoundManager  
✅ **Testable**: Each song can be tested independently  
✅ **Version Control**: Clear diffs when editing specific songs  

## Notes

- All Tone.js code lives in `src/` (not `public/`) because it's JavaScript source code
- `public/assets/audio/` is reserved for static audio files (MP3, WAV, etc.)
- SoundManager (`src/managers/SoundManager.js`) imports and manages all audio
- Each song class handles its own Tone.Transport timing and cleanup

