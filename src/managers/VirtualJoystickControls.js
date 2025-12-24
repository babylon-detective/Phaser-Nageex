/**
 * VirtualJoystickControls - Modern virtual joystick using phaser-virtual-joystick
 * Provides smooth analog movement controls for mobile devices
 */

import { VirtualJoystick } from 'phaser-virtual-joystick';
import { mobileManager } from './MobileManager.js';

export default class VirtualJoystickControls {
    constructor(scene) {
        this.scene = scene;
        this.joystick = null;
        this.actionButtons = null;
        
        // Joystick input state (normalized -1 to 1)
        this.joystickState = {
            x: 0,
            y: 0,
            isPressed: false
        };
        
        // Action buttons state
        this.buttonState = {
            a: false,
            b: false,
            x: false,
            y: false,
            attack: false,
            jump: false,
            dash: false,
            menu: false
        };
        
        // Button touch tracking
        this.buttonTouches = new Map();
        
        if (mobileManager.isMobile) {
            this.create();
        }
    }
    
    create() {
        this.createVirtualJoystick();
        this.createActionButtons();
    }
    
    /**
     * Create virtual joystick using phaser-virtual-joystick
     */
    createVirtualJoystick() {
        // Create joystick with custom styling
        this.joystick = new VirtualJoystick({
            scene: this.scene,
            // Only active on left half of screen
            bounds: {
                topLeft: { x: 0, y: 0 },
                bottomRight: { 
                    x: this.scene.cameras.main.width / 2, 
                    y: this.scene.cameras.main.height 
                }
            },
            // Custom blue styling
            deadZone: {
                radius: 20,
                fillColor: 0x4A90E2,
                alpha: 0.6,
                strokeColor: 0x2E5C8A,
                strokeWidth: 2,
                strokeAlpha: 0.8
            },
            baseArea: {
                radius: 80,
                fillColor: 0x2E5C8A,
                alpha: 0.3,
                strokeColor: 0x4A90E2,
                strokeWidth: 3,
                strokeAlpha: 0.6
            },
            stick: {
                radius: 40,
                fillColor: 0x4A90E2,
                alpha: 0.8,
                strokeColor: 0xFFFFFF,
                strokeWidth: 3,
                strokeAlpha: 0.9
            }
        });
        
        // IMPORTANT: Add joystick to scene
        this.scene.add.existing(this.joystick);
        
        // Listen to joystick events
        this.joystick.on('press', () => {
            this.joystickState.isPressed = true;
            console.log('[VirtualJoystick] Pressed');
        });
        
        this.joystick.on('move', (data) => {
            // data.x and data.y are normalized between -1 and 1
            this.joystickState.x = data.x;
            this.joystickState.y = data.y;
        });
        
        this.joystick.on('release', () => {
            this.joystickState.isPressed = false;
            this.joystickState.x = 0;
            this.joystickState.y = 0;
            console.log('[VirtualJoystick] Released');
        });
        
        // Set depth to stay on top
        this.joystick.setDepth(10000);
        this.joystick.setScrollFactor(0);
        
        console.log('[VirtualJoystick] Created with analog controls');
    }
    
    /**
     * Create action buttons (right side of screen)
     */
    createActionButtons() {
        const buttonSize = 60;
        const margin = 30;
        const screenWidth = this.scene.cameras.main.width;
        const screenHeight = this.scene.cameras.main.height;
        
        this.actionButtons = [];
        
        // Attack button (A) - bottom right
        const attackBtn = this.createActionButton(
            screenWidth - margin - buttonSize,
            screenHeight - margin - buttonSize,
            'A',
            0xFF4444,
            'attack'
        );
        this.actionButtons.push(attackBtn);
        
        // Jump button (B) - upper right of A
        const jumpBtn = this.createActionButton(
            screenWidth - margin - buttonSize,
            screenHeight - margin - buttonSize * 2.5,
            'B',
            0x44FF44,
            'jump'
        );
        this.actionButtons.push(jumpBtn);
        
        // Dash button (X) - left of A
        const dashBtn = this.createActionButton(
            screenWidth - margin - buttonSize * 2.5,
            screenHeight - margin - buttonSize,
            'X',
            0x4444FF,
            'dash'
        );
        this.actionButtons.push(dashBtn);
        
        // Menu button (Y) - top left corner
        const menuBtn = this.createActionButton(
            screenWidth - margin - buttonSize * 2.5,
            screenHeight - margin - buttonSize * 2.5,
            'Y',
            0xFFFF44,
            'menu'
        );
        this.actionButtons.push(menuBtn);
    }
    
    /**
     * Create individual action button
     */
    createActionButton(x, y, label, color, action) {
        const container = this.scene.add.container(x, y);
        container.setDepth(10001);
        container.setScrollFactor(0);
        
        const circle = this.scene.add.circle(0, 0, 30, color, 0.7);
        const text = this.scene.add.text(0, 0, label, {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#FFFFFF',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        container.add([circle, text]);
        
        // Make interactive
        circle.setInteractive({ useHandCursor: true });
        
        // Touch handlers
        circle.on('pointerdown', (pointer) => {
            this.onButtonPress(action, circle, pointer);
        });
        
        circle.on('pointerup', (pointer) => {
            this.onButtonRelease(action, circle, pointer);
        });
        
        circle.on('pointerout', (pointer) => {
            // Only release if this specific pointer left
            if (this.buttonTouches.get(action) === pointer.id) {
                this.onButtonRelease(action, circle, pointer);
            }
        });
        
        return { container, circle, text, action };
    }
    
    /**
     * Handle button press
     */
    onButtonPress(action, circle, pointer) {
        this.buttonState[action] = true;
        this.buttonTouches.set(action, pointer.id);
        
        // Visual feedback
        circle.setAlpha(1.0);
        circle.setScale(0.9);
        
        console.log(`[VirtualJoystick] Button ${action} pressed`);
        
        // Dispatch custom event for scenes
        this.scene.events.emit('mobilebutton', { action, pressed: true });
    }
    
    /**
     * Handle button release
     */
    onButtonRelease(action, circle, pointer) {
        // Only release if this was the pointer that pressed it
        if (this.buttonTouches.get(action) === pointer.id) {
            this.buttonState[action] = false;
            this.buttonTouches.delete(action);
            
            // Visual feedback
            circle.setAlpha(0.7);
            circle.setScale(1.0);
            
            console.log(`[VirtualJoystick] Button ${action} released`);
            
            // Dispatch custom event for scenes
            this.scene.events.emit('mobilebutton', { action, pressed: false });
        }
    }
    
    /**
     * Get joystick input state (for scenes to poll)
     */
    getJoystickState() {
        return {
            x: this.joystickState.x,
            y: this.joystickState.y,
            isPressed: this.joystickState.isPressed
        };
    }
    
    /**
     * Get button state (for scenes to poll)
     */
    getButtonState(action) {
        return this.buttonState[action] || false;
    }
    
    /**
     * Get all button states
     */
    getAllButtonStates() {
        return { ...this.buttonState };
    }
    
    /**
     * Show controls
     */
    show() {
        if (this.joystick) {
            this.joystick.setVisible(true);
        }
        
        if (this.actionButtons) {
            this.actionButtons.forEach(btn => {
                btn.container.setVisible(true);
            });
        }
    }
    
    /**
     * Hide controls
     */
    hide() {
        if (this.joystick) {
            this.joystick.setVisible(false);
        }
        
        if (this.actionButtons) {
            this.actionButtons.forEach(btn => {
                btn.container.setVisible(false);
            });
        }
    }
    
    /**
     * Update controls (call in scene update loop)
     */
    update() {
        // Joystick handles its own updates
        // Button states are managed by touch events
    }
    
    /**
     * Cleanup
     */
    destroy() {
        if (this.joystick) {
            this.joystick.destroy();
        }
        
        if (this.actionButtons) {
            this.actionButtons.forEach(btn => {
                btn.container.destroy();
            });
        }
        
        this.buttonTouches.clear();
    }
}
