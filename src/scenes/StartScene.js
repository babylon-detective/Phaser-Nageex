import Phaser from "phaser";
import SaveState from "../SaveState";
import { gameStateManager } from "../managers/GameStateManager.js";
import { soundManager } from "../managers/SoundManager.js";

export default class StartScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StartScene' });
        this.selectedIndex = 0;
        this.menuItems = [];
        
        // Gamepad support
        this.gamepad = null;
        this.gamepadButtonStates = {};
        this.lastStickUp = false;
        this.lastStickDown = false;
        
        // Sound initialization flag
        this.soundInitialized = false;
    }

    preload() {
        this.load.image('sky', 'https://labs.phaser.io/assets/skies/space3.png');
    }

    create() {
        this.sky = this.add.image(0, 0, 'sky').setOrigin(0.5, 0.5);

        // Initialize text objects before calling resizeGame
        this.titleText = this.add.text(this.scale.width / 2, this.scale.height / 4, 'NAGEEX', { fontSize: '262px', fill: '#fff' }).setOrigin(0.5, 0.5);
        
        // Check if save exists
        const hasSave = localStorage.getItem('gameState') !== null;
        console.log('[StartScene] Save exists:', hasSave);
        
        // Create menu items with bullet points
        const menuY = this.scale.height / 2;
        this.menuItems = [
            this.add.text(this.scale.width / 2, menuY, '• Start', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5, 0.5),
            this.add.text(this.scale.width / 2, menuY + 50, '• Continue', { 
                fontSize: '24px', 
                fill: hasSave ? '#fff' : '#666'  // Gray out if no save
            }).setOrigin(0.5, 0.5)
        ];
        
        // Store whether continue is enabled
        this.continueEnabled = hasSave;

        // Set up keyboard controls
        this.wasdKeys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            enter: Phaser.Input.Keyboard.KeyCodes.ENTER
        });

        // Set up click handlers
        this.menuItems[0].setInteractive().on('pointerdown', () => this.selectMenuItem(0));
        if (hasSave) {
            this.menuItems[1].setInteractive().on('pointerdown', () => this.selectMenuItem(1));
        }

        // Highlight initial selection
        this.updateSelection();

        // Call resizeGame after initializing text objects
        this.resizeGame();

        window.addEventListener('resize', this.resizeGame.bind(this));
        
        // Try to initialize sound immediately (will work if user already interacted with page)
        this.tryInitializeSound();
    }
    
    async tryInitializeSound() {
        if (this.soundInitialized) return;
        
        try {
            await soundManager.init();
            this.soundInitialized = true;
            
            // Start the ambient E minor song
            await soundManager.playStartMenuSong();
            console.log('[StartScene] ✅ Music started immediately');
        } catch (error) {
            // Failed due to autoplay policy - will retry on user interaction
            console.log('[StartScene] ⏸️ Waiting for user interaction to start music');
        }
    }

    async update() {
        // Initialize sound on first user interaction (if not already initialized)
        if (!this.soundInitialized) {
            // Check for ANY user interaction (keyboard, mouse movement, click, gamepad)
            const hasInteracted = this.input.activePointer.isDown || 
                                 this.input.activePointer.justMoved ||
                                 Object.values(this.wasdKeys).some(key => key.isDown) ||
                                 (this.gamepad && this.gamepad.buttons && 
                                  this.gamepad.buttons.some(btn => btn && btn.pressed));
            
            if (hasInteracted) {
                await this.tryInitializeSound();
            }
        }
        
        // Update gamepad
        this.updateGamepad();
        
        // Handle menu navigation with keyboard or left stick
        const navUp = Phaser.Input.Keyboard.JustDown(this.wasdKeys.up) || this.isGamepadStickUp();
        const navDown = Phaser.Input.Keyboard.JustDown(this.wasdKeys.down) || this.isGamepadStickDown();
        
        if (navUp) {
            this.selectedIndex = (this.selectedIndex - 1 + this.menuItems.length) % this.menuItems.length;
            this.updateSelection();
            soundManager.playMenuSelect(); // Sound effect
        }
        
        if (navDown) {
            this.selectedIndex = (this.selectedIndex + 1) % this.menuItems.length;
            this.updateSelection();
            soundManager.playMenuSelect(); // Sound effect
        }

        // Handle selection with Enter key or Start button (button 9)
        if (Phaser.Input.Keyboard.JustDown(this.wasdKeys.enter) || this.isGamepadButtonJustPressed(9)) {
            this.selectMenuItem(this.selectedIndex);
        }
    }

    updateSelection() {
        // Update all menu items
        this.menuItems.forEach((item, index) => {
            const text = item.text;
            const isDisabled = index === 1 && !this.continueEnabled;
            
            if (index === this.selectedIndex) {
                item.setStyle({ fill: isDisabled ? '#666' : '#ffff00' }); // Highlight selected item (or gray if disabled)
                item.setText('> ' + text.substring(2)); // Replace bullet with arrow
            } else {
                item.setStyle({ fill: isDisabled ? '#666' : '#fff' });
                item.setText('• ' + text.substring(2)); // Restore bullet
            }
        });
    }

    selectMenuItem(index) {
        if (index === 0) {
            // Start new game
            soundManager.playMenuConfirm(); // Sound effect
            soundManager.stopStartMenuSong(); // Stop the menu song
            SaveState.clear(); // Clear any existing save state
            gameStateManager.resetGame(); // Reset game state
            gameStateManager.startTimer(); // Start gameplay timer
            console.log('[StartScene] Starting new game, timer initialized');
            this.scene.start('WorldScene');
        } else if (index === 1 && this.continueEnabled) {
            // Continue game
            soundManager.playMenuConfirm(); // Sound effect
            soundManager.stopStartMenuSong(); // Stop the menu song
            console.log('[StartScene] ========== CONTINUE GAME ==========');
            
            // Check localStorage first
            const savedData = localStorage.getItem('gameState');
            console.log('[StartScene] LocalStorage data exists:', !!savedData);
            if (savedData) {
                console.log('[StartScene] Raw localStorage data:', savedData);
                try {
                    const parsed = JSON.parse(savedData);
                    console.log('[StartScene] Parsed save data:', parsed);
                } catch (e) {
                    console.error('[StartScene] Failed to parse save data:', e);
                }
            }
            
            const loadResult = gameStateManager.loadGame(); // Load saved game state
            console.log('[StartScene] Load result:', loadResult);
            
            if (loadResult.success) {
                gameStateManager.startTimer(); // Resume timer
                console.log('[StartScene] ✅ Continuing game, timer resumed');
                console.log('[StartScene] Loaded player position:', loadResult.playerPosition);
                console.log('[StartScene] Defeated NPCs:', loadResult.defeatedNpcIds);
                
                // Start WorldScene with loaded data
                this.scene.start('WorldScene', {
                    loadedGame: true,
                    playerPosition: loadResult.playerPosition,
                    defeatedNpcIds: loadResult.defeatedNpcIds
                });
            } else {
                // No save found, start new game
                console.warn('[StartScene] ⚠️ No save found, starting new game');
                gameStateManager.resetGame();
                gameStateManager.startTimer();
                this.scene.start('WorldScene');
            }
            console.log('[StartScene] =====================================');
        } else if (index === 1 && !this.continueEnabled) {
            // Continue is disabled - no save found
            console.log('[StartScene] ⚠️ Continue is disabled - no save file found');
        }
    }

    resizeGame() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.scale.resize(width, height);

        const aspectRatio = this.sky.width / this.sky.height;
        if (width / height > aspectRatio) {
            this.sky.displayWidth = width;
            this.sky.displayHeight = width / aspectRatio;
        } else {
            this.sky.displayHeight = height;
            this.sky.displayWidth = height * aspectRatio;
        }
        this.sky.x = width / 2;
        this.sky.y = height / 2;

        // Center the text elements
        this.titleText.setPosition(width / 2, height / 4);
        this.menuItems[0].setPosition(width / 2, height / 2);
        this.menuItems[1].setPosition(width / 2, height / 2 + 50);
    }

    startBattle(npcData) {
        this.scene.start('BattleScene', {
            playerData: this.playerManager.getPlayerData(),
            npcData: npcData // Pass the npcData including triggerRadius
        });
    }
    
    /**
     * Gamepad helper methods
     */
    updateGamepad() {
        if (window.getGlobalGamepad) {
            const pad = window.getGlobalGamepad();
            if (pad && pad.connected) {
                this.gamepad = pad;
            } else if (this.gamepad && !this.gamepad.connected) {
                this.gamepad = null;
            }
        } else {
            try {
                const gamepads = navigator.getGamepads();
                if (gamepads && gamepads.length > 0) {
                    for (let i = 0; i < gamepads.length; i++) {
                        const pad = gamepads[i];
                        if (pad && pad.connected) {
                            this.gamepad = pad;
                            break;
                        }
                    }
                }
            } catch (e) {
                // Ignore
            }
        }
    }
    
    isGamepadButtonJustPressed(buttonIndex) {
        if (!this.gamepad || !this.gamepad.buttons) return false;
        
        // Ensure gamepadButtonStates is initialized
        if (!this.gamepadButtonStates) {
            this.gamepadButtonStates = {};
        }
        
        const button = this.gamepad.buttons[buttonIndex];
        const isPressed = button && (button.pressed || button.value > 0.5);
        const key = `button_${buttonIndex}`;
        const wasPressed = this.gamepadButtonStates[key] || false;
        this.gamepadButtonStates[key] = isPressed;
        return isPressed && !wasPressed;
    }
    
    isGamepadStickUp() {
        if (!this.gamepad || !this.gamepad.axes) return false;
        const axisY = this.gamepad.axes[1] || 0;
        const isUp = axisY < -0.5;
        const justPressed = isUp && !this.lastStickUp;
        this.lastStickUp = isUp;
        return justPressed;
    }
    
    isGamepadStickDown() {
        if (!this.gamepad || !this.gamepad.axes) return false;
        const axisY = this.gamepad.axes[1] || 0;
        const isDown = axisY > 0.5;
        const justPressed = isDown && !this.lastStickDown;
        this.lastStickDown = isDown;
        return justPressed;
    }
    
    shutdown() {
        console.log('[StartScene] Shutting down - stopping menu song');
        // Stop the menu song when scene ends
        soundManager.stopStartMenuSong();
        
        // Remove resize listener
        window.removeEventListener('resize', this.resizeGame.bind(this));
    }
}