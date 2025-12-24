# Virtual Joystick Integration Guide

## Installation

The virtual joystick library is already installed:
```bash
npm install phaser-virtual-joystick
```

## Quick Start

### 1. Import the VirtualJoystickControls

```javascript
import VirtualJoystickControls from '../managers/VirtualJoystickControls.js';
```

### 2. Create controls in your scene

```javascript
export default class YourScene extends Phaser.Scene {
    constructor() {
        super({ key: 'YourScene' });
        this.virtualControls = null;
    }
    
    create() {
        // Create virtual joystick controls (only on mobile)
        if (mobileManager.isMobile) {
            this.virtualControls = new VirtualJoystickControls(this);
            this.virtualControls.show();
        }
    }
}
```

### 3. Read joystick input in update()

```javascript
update(time, delta) {
    if (this.virtualControls) {
        // Get joystick state (x and y are -1 to 1)
        const joystick = this.virtualControls.getJoystickState();
        
        // Move player based on joystick input
        if (joystick.isPressed) {
            const speed = 200;
            this.player.setVelocity(
                joystick.x * speed,
                joystick.y * speed
            );
        } else {
            this.player.setVelocity(0, 0);
        }
        
        // Check button states
        if (this.virtualControls.getButtonState('attack')) {
            this.attack();
        }
        
        if (this.virtualControls.getButtonState('jump')) {
            this.jump();
        }
    }
}
```

## Alternative: Event-Based Approach

You can also listen to button events instead of polling:

```javascript
create() {
    this.virtualControls = new VirtualJoystickControls(this);
    
    // Listen to button events
    this.events.on('mobilebutton', (data) => {
        if (data.action === 'attack' && data.pressed) {
            this.attack();
        }
        if (data.action === 'jump' && data.pressed) {
            this.jump();
        }
    });
}
```

## Fullscreen on Mobile

The mobile manager now automatically enters fullscreen mode when the device rotates to landscape orientation. This keeps the game in fullscreen even after rotation.

## Features

### Virtual Joystick
- ✅ **Analog Movement** - Smooth variable speed based on distance from center
- ✅ **Dynamic Repositioning** - Joystick appears where you touch
- ✅ **Left-side Only** - Active area limited to left half of screen
- ✅ **Normalized Input** - Both axes return values from -1 to 1
- ✅ **Visual Feedback** - Blue themed joystick with smooth animations

### Action Buttons (Right Side)
- **A Button** (Red) - Attack/Confirm
- **B Button** (Green) - Jump/Cancel
- **X Button** (Blue) - Dash/Special
- **Y Button** (Yellow) - Menu/Extra

## Customization

You can customize the joystick styling in `VirtualJoystickControls.js`:

```javascript
this.joystick = new VirtualJoystick({
    scene: this.scene,
    deadZone: {
        radius: 20,
        fillColor: 0x4A90E2,  // Change color
        alpha: 0.6            // Change transparency
    },
    stick: {
        radius: 40,
        fillColor: 0x4A90E2,
        alpha: 0.8
    }
});
```

## Migration from Old MobileControls

### Old Way (D-pad)
```javascript
if (this.mobileControls.dpadState.right) {
    this.player.x += 5;
}
```

### New Way (Analog Joystick)
```javascript
const joystick = this.virtualControls.getJoystickState();
this.player.setVelocity(joystick.x * 200, joystick.y * 200);
```

## Example: Integrating into WorldScene

```javascript
// In WorldScene.js

import VirtualJoystickControls from '../managers/VirtualJoystickControls.js';

create() {
    // ... existing create code ...
    
    // Replace old MobileControls with VirtualJoystickControls
    if (mobileManager.isMobile) {
        this.virtualControls = new VirtualJoystickControls(this);
        this.virtualControls.show();
    }
}

update(time, delta) {
    // ... existing update code ...
    
    // Handle mobile input
    if (this.virtualControls) {
        const joystick = this.virtualControls.getJoystickState();
        const speed = 160;
        
        let velocityX = 0;
        let velocityY = 0;
        
        if (joystick.isPressed) {
            velocityX = joystick.x * speed;
            velocityY = joystick.y * speed;
        }
        
        // Apply to current leader
        const leader = this.partyManager.getLeader();
        if (leader && leader.sprite) {
            leader.sprite.setVelocity(velocityX, velocityY);
        }
    }
}
```

## Cleanup

Don't forget to destroy the controls when the scene shuts down:

```javascript
shutdown() {
    if (this.virtualControls) {
        this.virtualControls.destroy();
    }
}
```

## Credits

Virtual joystick powered by [phaser-virtual-joystick](https://www.npmjs.com/package/phaser-virtual-joystick) by Renato Cassino.

Read more: [Medium Article](https://medium.com/@renatocassino/i-built-the-best-virtual-joystick-for-phaserjs-then-went-to-bed-ab4ac09d1265)
