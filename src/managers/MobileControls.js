/**
 * MobileControls - Virtual controls UI for mobile devices
 * Includes D-pad, action buttons, and gesture recognition
 */

import { mobileManager } from './MobileManager.js';

export default class MobileControls {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.dpad = null;
        this.actionButtons = null;
        
        // D-pad state
        this.dpadState = {
            up: false,
            down: false,
            left: false,
            right: false
        };
        
        // Action buttons state
        this.buttonState = {
            a: false,
            b: false,
            x: false,
            y: false
        };
        
        // Touch tracking
        this.activeTouches = new Map();
        this.dragThreshold = 10; // pixels
        this.isDragging = false;
        this.dragStartPos = { x: 0, y: 0 };
        this.currentDragPos = { x: 0, y: 0 };
        
        if (mobileManager.isMobile) {
            this.create();
        }
    }
    
    create() {
        this.createDPad();
        this.createActionButtons();
        this.setupTouchListeners();
        this.hide(); // Hidden by default, scenes can show when needed
    }
    
    /**
     * Create virtual D-pad
     */
    createDPad() {
        const dpadSize = 140;
        const buttonSize = 50;
        const margin = 30;
        const dpadX = margin + dpadSize / 2;
        const dpadY = this.scene.cameras.main.height - margin - dpadSize / 2;
        
        // Create D-pad container
        this.dpad = {
            base: null,
            up: null,
            down: null,
            left: null,
            right: null,
            buttons: []
        };
        
        // Base circle
        this.dpad.base = this.scene.add.circle(dpadX, dpadY, dpadSize / 2, 0x333333, 0.5);
        this.dpad.base.setDepth(1000);
        this.dpad.base.setScrollFactor(0);
        
        // Up button
        this.dpad.up = this.createDPadButton(dpadX, dpadY - buttonSize, '▲', 'up');
        
        // Down button
        this.dpad.down = this.createDPadButton(dpadX, dpadY + buttonSize, '▼', 'down');
        
        // Left button
        this.dpad.left = this.createDPadButton(dpadX - buttonSize, dpadY, '◄', 'left');
        
        // Right button
        this.dpad.right = this.createDPadButton(dpadX + buttonSize, dpadY, '►', 'right');
        
        this.dpad.buttons = [this.dpad.up, this.dpad.down, this.dpad.left, this.dpad.right];
    }
    
    /**
     * Create individual D-pad button
     */
    createDPadButton(x, y, symbol, direction) {
        const button = this.scene.add.container(x, y);
        button.setDepth(1001);
        button.setScrollFactor(0);
        
        const circle = this.scene.add.circle(0, 0, 25, 0x555555, 0.7);
        const text = this.scene.add.text(0, 0, symbol, {
            fontSize: '24px',
            fill: '#fff'
        }).setOrigin(0.5);
        
        button.add([circle, text]);
        button.setInteractive(new Phaser.Geom.Circle(0, 0, 25), Phaser.Geom.Circle.Contains);
        
        // Store references
        button.circle = circle;
        button.text = text;
        button.direction = direction;
        
        // Touch handlers
        button.on('pointerdown', () => {
            this.dpadState[direction] = true;
            circle.setFillStyle(0x888888, 0.9);
        });
        
        button.on('pointerup', () => {
            this.dpadState[direction] = false;
            circle.setFillStyle(0x555555, 0.7);
        });
        
        button.on('pointerout', () => {
            this.dpadState[direction] = false;
            circle.setFillStyle(0x555555, 0.7);
        });
        
        return button;
    }
    
    /**
     * Create action buttons
     */
    createActionButtons() {
        const buttonSize = 45;
        const spacing = 60;
        const margin = 30;
        const rightEdge = this.scene.cameras.main.width - margin;
        const bottomEdge = this.scene.cameras.main.height - margin;
        
        this.actionButtons = {
            a: null,
            b: null,
            x: null,
            y: null,
            buttons: []
        };
        
        // A button (bottom right)
        this.actionButtons.a = this.createActionButton(
            rightEdge - buttonSize,
            bottomEdge - buttonSize,
            'A',
            0x00ff00,
            'a'
        );
        
        // B button (right of A)
        this.actionButtons.b = this.createActionButton(
            rightEdge - buttonSize - spacing,
            bottomEdge - buttonSize - spacing * 0.5,
            'B',
            0xff0000,
            'b'
        );
        
        // X button (above A)
        this.actionButtons.x = this.createActionButton(
            rightEdge - buttonSize - spacing * 0.5,
            bottomEdge - buttonSize - spacing,
            'X',
            0x0088ff,
            'x'
        );
        
        // Y button (left of X)
        this.actionButtons.y = this.createActionButton(
            rightEdge - buttonSize - spacing * 1.5,
            bottomEdge - buttonSize - spacing * 1.5,
            'Y',
            0xffff00,
            'y'
        );
        
        this.actionButtons.buttons = [
            this.actionButtons.a,
            this.actionButtons.b,
            this.actionButtons.x,
            this.actionButtons.y
        ];
    }
    
    /**
     * Create individual action button
     */
    createActionButton(x, y, label, color, key) {
        const button = this.scene.add.container(x, y);
        button.setDepth(1001);
        button.setScrollFactor(0);
        
        const circle = this.scene.add.circle(0, 0, 35, color, 0.6);
        const text = this.scene.add.text(0, 0, label, {
            fontSize: '20px',
            fill: '#000',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        button.add([circle, text]);
        button.setInteractive(new Phaser.Geom.Circle(0, 0, 35), Phaser.Geom.Circle.Contains);
        
        button.circle = circle;
        button.text = text;
        button.key = key;
        
        // Touch handlers
        button.on('pointerdown', () => {
            this.buttonState[key] = true;
            circle.setAlpha(1.0);
            
            // Dispatch custom event
            window.dispatchEvent(new CustomEvent('mobilebutton', {
                detail: { button: key, pressed: true }
            }));
        });
        
        button.on('pointerup', () => {
            this.buttonState[key] = false;
            circle.setAlpha(0.6);
            
            window.dispatchEvent(new CustomEvent('mobilebutton', {
                detail: { button: key, pressed: false }
            }));
        });
        
        button.on('pointerout', () => {
            this.buttonState[key] = false;
            circle.setAlpha(0.6);
        });
        
        return button;
    }
    
    /**
     * Setup touch gesture listeners
     */
    setupTouchListeners() {
        // Listen to scene input for gestures
        this.scene.input.on('pointerdown', (pointer) => {
            this.handleTouchStart(pointer);
        });
        
        this.scene.input.on('pointermove', (pointer) => {
            this.handleTouchMove(pointer);
        });
        
        this.scene.input.on('pointerup', (pointer) => {
            this.handleTouchEnd(pointer);
        });
    }
    
    /**
     * Handle touch start
     */
    handleTouchStart(pointer) {
        this.activeTouches.set(pointer.id, {
            startX: pointer.x,
            startY: pointer.y,
            startTime: Date.now()
        });
        
        this.dragStartPos = { x: pointer.x, y: pointer.y };
        this.currentDragPos = { x: pointer.x, y: pointer.y };
        
        // Check for double-tap
        mobileManager.handleDoubleTap(pointer.x, pointer.y);
    }
    
    /**
     * Handle touch move (drag)
     */
    handleTouchMove(pointer) {
        if (!pointer.isDown) return;
        
        const touch = this.activeTouches.get(pointer.id);
        if (!touch) return;
        
        const deltaX = pointer.x - touch.startX;
        const deltaY = pointer.y - touch.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance > this.dragThreshold) {
            this.isDragging = true;
            this.currentDragPos = { x: pointer.x, y: pointer.y };
            
            // Calculate drag direction
            const angle = Math.atan2(deltaY, deltaX);
            this.updateDragDirection(angle, distance);
        }
    }
    
    /**
     * Handle touch end
     */
    handleTouchEnd(pointer) {
        const touch = this.activeTouches.get(pointer.id);
        
        if (touch && this.isDragging) {
            // Reset drag direction
            this.resetDragDirection();
        }
        
        this.isDragging = false;
        this.activeTouches.delete(pointer.id);
        
        // Deactivate shift if active
        if (mobileManager.isShiftActive) {
            mobileManager.deactivateShift();
        }
    }
    
    /**
     * Update drag direction state
     */
    updateDragDirection(angle, distance) {
        const degrees = angle * (180 / Math.PI);
        const strength = Math.min(distance / 100, 1); // Normalize to 0-1
        
        // Reset all directions
        this.dpadState.up = false;
        this.dpadState.down = false;
        this.dpadState.left = false;
        this.dpadState.right = false;
        
        // Set direction based on angle
        if (degrees > -45 && degrees <= 45) {
            this.dpadState.right = true;
        } else if (degrees > 45 && degrees <= 135) {
            this.dpadState.down = true;
        } else if (degrees > -135 && degrees <= -45) {
            this.dpadState.up = true;
        } else {
            this.dpadState.left = true;
        }
        
        // Dispatch drag event
        window.dispatchEvent(new CustomEvent('mobiledrag', {
            detail: {
                angle: degrees,
                strength: strength,
                direction: this.dpadState
            }
        }));
    }
    
    /**
     * Reset drag direction
     */
    resetDragDirection() {
        this.dpadState.up = false;
        this.dpadState.down = false;
        this.dpadState.left = false;
        this.dpadState.right = false;
    }
    
    /**
     * Show controls
     */
    show() {
        if (!mobileManager.isMobile) return;
        
        // Show D-pad
        if (this.dpad) {
            this.dpad.base.setVisible(true);
            this.dpad.buttons.forEach(btn => btn.setVisible(true));
        }
        
        // Show action buttons
        if (this.actionButtons) {
            this.actionButtons.buttons.forEach(btn => btn.setVisible(true));
        }
    }
    
    /**
     * Hide controls
     */
    hide() {
        // Hide D-pad
        if (this.dpad) {
            this.dpad.base.setVisible(false);
            this.dpad.buttons.forEach(btn => btn.setVisible(false));
        }
        
        // Hide action buttons
        if (this.actionButtons) {
            this.actionButtons.buttons.forEach(btn => btn.setVisible(false));
        }
    }
    
    /**
     * Update controls position on resize
     */
    resize(width, height) {
        if (!mobileManager.isMobile) return;
        
        // Recreate controls with new positions
        this.destroy();
        this.create();
    }
    
    /**
     * Get current input state
     */
    getState() {
        return {
            dpad: { ...this.dpadState },
            buttons: { ...this.buttonState },
            shift: mobileManager.isShiftActive,
            dragging: this.isDragging
        };
    }
    
    /**
     * Destroy controls
     */
    destroy() {
        // Destroy D-pad
        if (this.dpad) {
            this.dpad.base?.destroy();
            this.dpad.buttons.forEach(btn => btn.destroy());
        }
        
        // Destroy action buttons
        if (this.actionButtons) {
            this.actionButtons.buttons.forEach(btn => btn.destroy());
        }
        
        this.dpad = null;
        this.actionButtons = null;
    }
}
