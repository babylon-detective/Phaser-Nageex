import Phaser from "phaser";

import StartScene from "./scenes/StartScene";
import WorldScene from "./scenes/WorldScene";
import BattleScene from "./scenes/BattleScene";
import BattleMenuScene from "./scenes/BattleMenuScene";
import ShooterScene from "./scenes/ShooterScene";
import MapScene from "./scenes/MapScene";
import MenuScene from "./scenes/MenuScene";

import PlayerManager from "./managers/PlayerManager";
import NpcManager from "./managers/NpcManager";
import { mobileManager } from "./managers/MobileManager";

// Prevent zooming
document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && (e.key === '+' || e.key === '-' || e.key === '=')) {
        e.preventDefault();
    }
});

// Prevent pinch zoom on mobile
document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
});

// Global gamepad detection - browsers require user interaction first
let gamepadInitialized = false;
let globalGamepad = null;

function initializeGamepad() {
    if (gamepadInitialized) return;
    gamepadInitialized = true;
    
    console.log('[Game] Initializing gamepad support...');
    
    if (!navigator.getGamepads) {
        console.warn('[Game] Browser does not support Gamepad API');
        return;
    }
    
    // Check for already connected gamepads
    // IMPORTANT: Must always re-poll to get fresh button states
    function checkGamepads() {
        try {
            const gamepads = navigator.getGamepads();
            if (gamepads && gamepads.length > 0) {
                for (let i = 0; i < gamepads.length; i++) {
                    const pad = gamepads[i];
                    if (pad && pad.connected) {
                        // Always update the reference (browsers require fresh poll)
                        const wasNull = !globalGamepad;
                        globalGamepad = pad;
                        
                        if (wasNull) {
                            console.log('[Game] ✅ Gamepad detected:', pad.id);
                            console.log('[Game] Buttons:', pad.buttons.length, 'Axes:', pad.axes.length);
                            window.dispatchEvent(new CustomEvent('gamepadready', { detail: pad }));
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('[Game] Error checking gamepads:', e);
        }
    }
    
    // Check immediately
    checkGamepads();
    
    // Poll periodically
    setInterval(checkGamepads, 200);
    
    // Listen for gamepad connections
    window.addEventListener('gamepadconnected', (e) => {
        console.log('[Game] ✅ Gamepad connected:', e.gamepad.id);
        console.log('[Game] Buttons:', e.gamepad.buttons.length, 'Axes:', e.gamepad.axes.length);
        globalGamepad = e.gamepad;
        window.dispatchEvent(new CustomEvent('gamepadready', { detail: e.gamepad }));
    });
    
    window.addEventListener('gamepaddisconnected', (e) => {
        console.log('[Game] ❌ Gamepad disconnected:', e.gamepad.id);
        if (globalGamepad && globalGamepad.id === e.gamepad.id) {
            globalGamepad = null;
        }
    });
    
    // Make gamepad accessible globally
    // This MUST poll every time it's called to get fresh button states
    window.getGlobalGamepad = () => {
        // Always poll for fresh data (required by browser API)
        try {
            const gamepads = navigator.getGamepads();
            if (gamepads && gamepads.length > 0) {
                for (let i = 0; i < gamepads.length; i++) {
                    const pad = gamepads[i];
                    if (pad && pad.connected) {
                        return pad; // Return fresh pad with current button states
                    }
                }
            }
        } catch (e) {
            // Fallback to stored reference
        }
        return globalGamepad;
    };
}

// Initialize gamepad on first user interaction (required by browsers)
document.addEventListener('click', initializeGamepad, { once: true });
document.addEventListener('keydown', initializeGamepad, { once: true });
document.addEventListener('touchstart', initializeGamepad, { once: true });

// Also try to initialize immediately (might work if gamepad was connected before page load)
setTimeout(initializeGamepad, 1000);

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    input: {
        gamepad: false // Disable Phaser's gamepad plugin - using native Gamepad API instead
    },
    scene: [StartScene, WorldScene, BattleScene, BattleMenuScene, ShooterScene, MapScene, MenuScene]
};

const game = new Phaser.Game(config);

// Initialize mobile manager with game reference
mobileManager.setGame(game);

// Make mobile manager globally accessible
window.mobileManager = mobileManager;

window.addEventListener('resize', resizeGame);

function resizeGame() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    game.scale.resize(width, height);

    // Update the sky image dimensions
    if (game.scene.scenes.length > 0) {
        const scene = game.scene.scenes[0];
        if (scene.sky) {
            const aspectRatio = scene.sky.width / scene.sky.height;
            if (width / height > aspectRatio) {
                scene.sky.displayWidth = width;
                scene.sky.displayHeight = width / aspectRatio;
            } else {
                scene.sky.displayHeight = height;
                scene.sky.displayWidth = height * aspectRatio;
            }
            scene.sky.x = width / 2;
            scene.sky.y = height / 2;
        }
    }
}
