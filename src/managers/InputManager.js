import Phaser from "phaser";

/**
 * InputManager - Centralized input handling for the game
 * Manages all keyboard and input controls across different scenes
 * Supports keyboard and gamepad (Xbox, PlayStation, generic controllers)
 * 
 * Usage:
 *   const inputManager = new InputManager(scene);
 *   inputManager.init('world'); // Initialize for world context
 *   
 *   // In scene update loop:
 *   const movement = inputManager.getMovementInput(); // Works with keyboard OR gamepad
 *   if (inputManager.isKeyDown('shift')) { // Works with keyboard OR gamepad
 *       // Handle action
 *   }
 *   
 *   // IMPORTANT: At END of update loop, call:
 *   inputManager.updateGamepadStates(); // Required for gamepad "justDown" detection
 * 
 * Gamepad Mappings:
 *   - Left Stick: WASD movement (universal for motion and menu navigation)
 *   - A Button: U key (face button)
 *   - B Button: I key (face button)
 *   - X Button: O key (face button)
 *   - Y Button: P key (face button)
 *   - L1 (LB): Shift (Dash)
 *   - Start Button: Enter/Return
 *   - Select Button: "/" (menu)
 */
export default class InputManager {
    constructor(scene) {
        this.scene = scene;
        this.keys = {};
        this.listeners = [];
        this.gamepad = null;
        this.gamepadConnected = false;
        this.gamepadMap = this.createGamepadMap();
        this.gamepadDeadzone = 0.15; // Deadzone for analog sticks
        this.gamepadButtonStates = {}; // Track button states for justDown detection
        
        // Store gamepad plugin event listeners for cleanup
        this.gamepadConnectedListener = null;
        this.gamepadDisconnectedListener = null;
        this.browserConnectedListener = null;
        this.browserDisconnectedListener = null;
        
        // Initialize gamepad if available
        this.initGamepad();
    }

    /**
     * Create gamepad button mapping for Xbox and PlayStation controllers
     * @returns {Object} Gamepad button mapping
     */
    createGamepadMap() {
        return {
            // Xbox Controller (Standard Gamepad API)
            // PlayStation controller uses same indices but different naming
            // Face Buttons
            A: 0,           // Bottom face button (Xbox A, PlayStation X)
            B: 1,           // Right face button (Xbox B, PlayStation Circle)
            X: 2,           // Left face button (Xbox X, PlayStation Square)
            Y: 3,           // Top face button (Xbox Y, PlayStation Triangle)
            
            // Shoulder Buttons
            LB: 4,          // Left bumper (Xbox LB, PlayStation L1)
            RB: 5,          // Right bumper (Xbox RB, PlayStation R1)
            LT: 6,          // Left trigger (Xbox LT, PlayStation L2) - Note: some use axis
            RT: 7,          // Right trigger (Xbox RT, PlayStation R2) - Note: some use axis
            
            // Menu/System Buttons
            SELECT: 8,      // Select/Back (Xbox Back, PlayStation Share)
            START: 9,       // Start/Menu (Xbox Start, PlayStation Options)
            
            // Analog Stick Buttons
            LS: 10,         // Left stick press
            RS: 11,         // Right stick press
            
            // D-Pad (Some gamepads use buttons, others use axes)
            DPAD_UP: 12,
            DPAD_DOWN: 13,
            DPAD_LEFT: 14,
            DPAD_RIGHT: 15,
            
            // Analog Stick Axes
            LEFT_STICK_X: 0,
            LEFT_STICK_Y: 1,
            RIGHT_STICK_X: 2,
            RIGHT_STICK_Y: 3
        };
    }

    /**
     * Initialize gamepad support
     */
    initGamepad() {
        if (!this.scene || !this.scene.input) {
            console.warn('[InputManager] Scene input not available');
            return;
        }

        // Check browser gamepad API support
        if (!navigator.getGamepads) {
            console.warn('[InputManager] Browser does not support Gamepad API');
            return;
        }
        
        // Force gamepad initialization by requesting gamepad access
        // Browsers require user interaction first, but we can poll immediately
        try {
            const gamepads = navigator.getGamepads();
            if (gamepads && gamepads.length > 0) {
                for (let i = 0; i < gamepads.length; i++) {
                    const pad = gamepads[i];
                    if (pad && pad.connected) {
                        console.log('[InputManager] Found gamepad at init:', pad.id);
                    }
                }
            }
        } catch (e) {
            console.warn('[InputManager] Error accessing gamepads:', e);
        }

        // Check if Phaser gamepad plugin is available (may be disabled)
        if (!this.scene.input.gamepad) {
            console.warn('[InputManager] Phaser gamepad plugin not available - using native Gamepad API only');
            // Continue with browser API fallback
        } else {
            // Enable gamepad plugin if not already enabled
            if (!this.scene.input.gamepad.enabled) {
                this.scene.input.gamepad.enabled = true;
            }

            // Listen for gamepad connections
            this.gamepadConnectedListener = (pad) => {
                console.log('[InputManager] Gamepad connected via Phaser:', pad.id);
                this.gamepad = pad;
                this.gamepadConnected = true;
                this.debugGamepad();
            };
            this.scene.input.gamepad.on('connected', this.gamepadConnectedListener);

            // Listen for gamepad disconnections
            this.gamepadDisconnectedListener = (pad) => {
                console.log('[InputManager] Gamepad disconnected:', pad.id);
                if (this.gamepad === pad) {
                    this.gamepad = null;
                    this.gamepadConnected = false;
                }
            };
            this.scene.input.gamepad.on('disconnected', this.gamepadDisconnectedListener);
        }

        // Also listen to browser gamepad events as fallback
        this.browserConnectedListener = (e) => {
            console.log('[InputManager] Browser gamepad connected:', e.gamepad.id);
            this.pollGamepad(); // Start polling
        };
        window.addEventListener('gamepadconnected', this.browserConnectedListener);

        this.browserDisconnectedListener = (e) => {
            console.log('[InputManager] Browser gamepad disconnected:', e.gamepad.id);
            this.gamepad = null;
            this.gamepadConnected = false;
        };
        window.addEventListener('gamepaddisconnected', this.browserDisconnectedListener);

        // Check if gamepad is already connected (Phaser way, if plugin is enabled)
        if (this.scene.input.gamepad) {
            const phaserGamepads = this.scene.input.gamepad.gamepads;
            if (phaserGamepads && phaserGamepads.length > 0) {
                this.gamepad = phaserGamepads[0];
                this.gamepadConnected = true;
                console.log('[InputManager] Using already connected Phaser gamepad:', this.gamepad.id);
                this.debugGamepad();
            } else {
                // Try browser API directly
                this.pollGamepad();
            }
        } else {
            // Try browser API directly
            this.pollGamepad();
        }

        // Start polling for gamepad (required for browser API)
        this.startGamepadPolling();
        
        // Also poll immediately (helps catch already-connected gamepads)
        this.pollGamepad();
        
        // Poll again after a short delay (user might have just connected)
        setTimeout(() => {
            this.pollGamepad();
            if (this.gamepad) {
                console.log('[InputManager] Gamepad detected after delay:', this.gamepad.id);
            }
        }, 500);

        console.log('[InputManager] Gamepad support initialized');
    }

    /**
     * Poll browser gamepad API directly (fallback if Phaser doesn't detect it)
     */
    pollGamepad() {
        try {
            const gamepads = navigator.getGamepads();
            if (gamepads && gamepads.length > 0) {
                for (let i = 0; i < gamepads.length; i++) {
                    const pad = gamepads[i];
                    if (pad && pad.connected) {
                        // Try to get Phaser gamepad first
                        if (this.scene && this.scene.input && this.scene.input.gamepad && this.scene.input.gamepad.gamepads) {
                            const phaserPad = this.scene.input.gamepad.gamepads[i];
                            if (phaserPad) {
                                if (!this.gamepad || this.gamepad !== phaserPad) {
                                    this.gamepad = phaserPad;
                                    this.gamepadConnected = true;
                                    console.log('[InputManager] Found Phaser gamepad:', pad.id);
                                    this.debugGamepad();
                                }
                                break;
                            }
                        }
                        
                        // Fallback: store browser pad for direct access
                        // Browser pads need different property access
                        if (!this.gamepad || this.gamepad.id !== pad.id) {
                            console.log('[InputManager] Using browser gamepad API directly:', pad.id);
                            this.gamepad = pad;
                            this.gamepadConnected = true;
                            this.debugGamepad();
                        }
                        break;
                    }
                }
            } else if (this.gamepad) {
                // No gamepads found but we had one - check if still connected
                if (this.scene && this.scene.input && this.scene.input.gamepad) {
                    const phaserPads = this.scene.input.gamepad.gamepads;
                    if (!phaserPads || phaserPads.length === 0) {
                        this.gamepad = null;
                        this.gamepadConnected = false;
                    }
                }
            }
        } catch (e) {
            console.warn('[InputManager] Error polling gamepad:', e);
        }
    }

    /**
     * Start polling for gamepad (browsers require active polling)
     */
    startGamepadPolling() {
        // Poll every 100ms for gamepad updates
        if (!this.pollInterval) {
            this.pollInterval = setInterval(() => {
                this.pollGamepad();
            }, 100); // Poll every 100ms
        }
    }

    /**
     * Stop polling for gamepad
     */
    stopGamepadPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    /**
     * Debug gamepad state
     */
    debugGamepad() {
        if (!this.gamepad) return;
        
        const debugInfo = {
            id: this.gamepad.id,
            connected: this.gamepadConnected,
            buttons: this.gamepad.buttons ? this.gamepad.buttons.length : 0,
            axes: this.gamepad.axes ? this.gamepad.axes.length : 0,
            hasGetButton: typeof this.gamepad.getButton === 'function'
        };
        
        console.log('[InputManager] Gamepad Debug:', debugInfo);
        
        // Log button states if available
        if (this.gamepad.buttons && this.gamepad.buttons.length > 0) {
            const pressedButtons = [];
            for (let i = 0; i < Math.min(this.gamepad.buttons.length, 10); i++) {
                const btn = this.gamepad.buttons[i];
                if (btn && (btn.pressed || btn.value > 0.5)) {
                    pressedButtons.push(`Button ${i}`);
                }
            }
            if (pressedButtons.length > 0) {
                console.log('[InputManager] Pressed buttons:', pressedButtons);
            }
        }
        
        // Log stick states
        if (this.gamepad.axes && this.gamepad.axes.length >= 2) {
            const leftX = this.gamepad.axes[0] || 0;
            const leftY = this.gamepad.axes[1] || 0;
            if (Math.abs(leftX) > 0.1 || Math.abs(leftY) > 0.1) {
                console.log('[InputManager] Left stick:', { x: leftX.toFixed(2), y: leftY.toFixed(2) });
            }
        }
    }

    /**
     * Test gamepad connection and log diagnostic info
     * Call this from browser console: window.inputManager?.testGamepad()
     */
    testGamepad() {
        console.log('=== Gamepad Diagnostic Test ===');
        console.log('Browser Gamepad API support:', !!navigator.getGamepads);
        console.log('Scene input available:', !!(this.scene && this.scene.input));
        console.log('Phaser gamepad plugin:', !!(this.scene?.input?.gamepad));
        
        if (navigator.getGamepads) {
            const gamepads = navigator.getGamepads();
            console.log('Browser detected gamepads:', gamepads ? gamepads.length : 0);
            for (let i = 0; i < (gamepads?.length || 0); i++) {
                const pad = gamepads[i];
                if (pad) {
                    console.log(`Gamepad ${i}:`, {
                        id: pad.id,
                        connected: pad.connected,
                        buttons: pad.buttons?.length || 0,
                        axes: pad.axes?.length || 0
                    });
                }
            }
        }
        
        console.log('InputManager gamepad state:', {
            gamepad: this.gamepad ? this.gamepad.id : 'null',
            gamepadConnected: this.gamepadConnected
        });
        
        if (this.scene?.input?.gamepad) {
            const phaserPads = this.scene.input.gamepad.gamepads;
            console.log('Phaser detected gamepads:', phaserPads?.length || 0);
        }
        
        // Force poll
        this.pollGamepad();
        console.log('After polling:', {
            gamepad: this.gamepad ? this.gamepad.id : 'null',
            gamepadConnected: this.gamepadConnected
        });
        
        console.log('=== End Diagnostic ===');
    }

    /**
     * Get gamepad stick input with deadzone
     * @param {number} axisX - X axis value (-1 to 1)
     * @param {number} axisY - Y axis value (-1 to 1)
     * @returns {{x: number, y: number}} Normalized stick input
     */
    getGamepadStickInput(axisX, axisY) {
        let x = axisX || 0;
        let y = axisY || 0;

        // Apply deadzone
        const magnitude = Math.sqrt(x * x + y * y);
        if (magnitude < this.gamepadDeadzone) {
            return { x: 0, y: 0 };
        }

        // Normalize if magnitude > 1 (rare but possible)
        if (magnitude > 1) {
            x /= magnitude;
            y /= magnitude;
        }

        return { x, y };
    }

    /**
     * Check if gamepad button is pressed
     * @param {string} buttonName - Name of the button (e.g., 'A', 'B', 'X', 'Y')
     * @returns {boolean}
     */
    isGamepadButtonDown(buttonName) {
        if (!this.gamepad) {
            // Try to get gamepad from scene
            this.pollGamepad();
        }
        
        if (!this.gamepad) {
            return false;
        }

        const buttonIndex = this.gamepadMap[buttonName];
        if (buttonIndex === undefined || buttonIndex >= 16) {
            return false; // Invalid button index or axis
        }

        try {
            const button = this.gamepad.getButton(buttonIndex);
            return button && (button.isPressed || button.value > 0.5);
        } catch (e) {
            // Fallback to browser API
            if (this.gamepad.buttons && this.gamepad.buttons[buttonIndex]) {
                const btn = this.gamepad.buttons[buttonIndex];
                return btn.pressed || btn.value > 0.5;
            }
            return false;
        }
    }

    /**
     * Check if gamepad button was just pressed
     * @param {string} buttonName - Name of the button
     * @returns {boolean}
     */
    isGamepadButtonJustDown(buttonName) {
        if (!this.gamepad) {
            // Try to get gamepad from scene
            this.pollGamepad();
        }
        
        if (!this.gamepad) {
            return false;
        }

        const buttonIndex = this.gamepadMap[buttonName];
        if (buttonIndex === undefined || buttonIndex >= 16) {
            return false;
        }

        let isPressed = false;
        try {
            const button = this.gamepad.getButton(buttonIndex);
            isPressed = button && (button.isPressed || button.value > 0.5);
        } catch (e) {
            // Fallback to browser API
            if (this.gamepad.buttons && this.gamepad.buttons[buttonIndex]) {
                const btn = this.gamepad.buttons[buttonIndex];
                isPressed = btn.pressed || btn.value > 0.5;
            }
        }

        // Get previous state (from last frame)
        const wasPressed = this.gamepadButtonStates[buttonName] || false;
        
        // Return true if button just became pressed (wasn't pressed last frame, is pressed now)
        return isPressed && !wasPressed;
    }

    /**
     * Update gamepad button states (call this at END of scene update loop)
     * This tracks button state for "justDown" detection in next frame
     */
    updateGamepadStates() {
        if (!this.gamepadConnected || !this.gamepad) {
            return;
        }

        // Update all button states (for use in next frame)
        Object.keys(this.gamepadMap).forEach(buttonName => {
            const buttonIndex = this.gamepadMap[buttonName];
            if (buttonIndex !== undefined && buttonIndex < 16) { // Only buttons, not axes
                const button = this.gamepad.getButton(buttonIndex);
                if (button) {
                    this.gamepadButtonStates[buttonName] = button.isPressed;
                }
            }
        });
    }

    /**
     * Initialize input keys for a specific context (world, battle, map, etc.)
     * @param {string} context - The context for inputs ('world', 'battle', 'map')
     */
    init(context = 'world') {
        console.log(`[InputManager] Initializing inputs for context: ${context}`);
        
        // Clear any existing keys and listeners
        this.cleanup();
        
        // Reinitialize gamepad if needed
        this.initGamepad();
        
        // Set up keys based on context
        switch (context) {
            case 'world':
                this.initWorldControls();
                break;
            case 'battle':
                this.initBattleControls();
                break;
            case 'map':
                this.initMapControls();
                break;
            default:
                console.warn(`[InputManager] Unknown context: ${context}`);
        }
    }

    /**
     * Initialize world scene controls
     */
    initWorldControls() {
        // WASD movement keys
        this.keys.wasd = this.scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });

        // Sprint/Run key (Shift -> L1 on controller)
        this.keys.shift = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        this.keys.dash = this.keys.shift; // Alias
        
        // Enter/Return key (-> Start button on controller)
        this.keys.enter = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.keys.return = this.keys.enter; // Alias
        
        // "/" key for menu (-> Select button on controller)
        this.keys.slash = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FORWARD_SLASH);

        // Map toggle key
        this.keys.map = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);

        console.log('[InputManager] World controls initialized');
    }

    /**
     * Initialize battle scene controls
     */
    initBattleControls() {
        // WASD movement keys
        this.keys.wasd = this.scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });

        // Face buttons (U/I/O/P -> A/B/X/Y on controller)
        this.keys.u = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.U);
        this.keys.i = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
        this.keys.o = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.O);
        this.keys.p = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
        
        // Dash key (Shift -> L1 on controller)
        this.keys.dash = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        this.keys.shift = this.keys.dash; // Alias
        
        // Enter/Return key (-> Start button on controller)
        this.keys.enter = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.keys.return = this.keys.enter; // Alias
        
        // "/" key for menu (-> Select button on controller)
        this.keys.slash = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FORWARD_SLASH);
        
        // Escape key
        this.keys.escape = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        console.log('[InputManager] Battle controls initialized');
    }

    /**
     * Initialize map scene controls
     */
    initMapControls() {
        // Map close key
        this.keys.map = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
        this.keys.escape = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        console.log('[InputManager] Map controls initialized');
    }

    /**
     * Add a custom key binding
     * @param {string} name - Name for the key binding
     * @param {number} keyCode - Phaser keycode
     * @returns {Phaser.Input.Keyboard.Key} The created key
     */
    addKey(name, keyCode) {
        if (this.keys[name]) {
            console.warn(`[InputManager] Key "${name}" already exists, overwriting`);
        }
        
        this.keys[name] = this.scene.input.keyboard.addKey(keyCode);
        return this.keys[name];
    }

    /**
     * Add a key listener
     * @param {string} keyName - Name of the key to listen to
     * @param {string} event - Event type ('down', 'up', 'press')
     * @param {Function} callback - Callback function
     */
    on(keyName, event, callback) {
        if (!this.keys[keyName]) {
            console.warn(`[InputManager] Key "${keyName}" not found`);
            return;
        }

        this.keys[keyName].on(event, callback);
        this.listeners.push({ key: keyName, event, callback });
    }

    /**
     * Remove a key listener
     * @param {string} keyName - Name of the key
     * @param {string} event - Event type
     * @param {Function} callback - Callback function
     */
    off(keyName, event, callback) {
        if (!this.keys[keyName]) {
            return;
        }

        this.keys[keyName].off(event, callback);
        this.listeners = this.listeners.filter(
            l => !(l.key === keyName && l.event === event && l.callback === callback)
        );
    }

    /**
     * Get a key by name
     * @param {string} name - Name of the key
     * @returns {Phaser.Input.Keyboard.Key|Object}
     */
    getKey(name) {
        return this.keys[name];
    }

    /**
     * Check if a key is currently pressed (keyboard or gamepad equivalent)
     * @param {string} name - Name of the key
     * @returns {boolean}
     */
    isKeyDown(name) {
        // Check keyboard first
        const keyboardDown = this.keys[name] && this.keys[name].isDown;
        if (keyboardDown) return true;

        // Check gamepad equivalent
        return this.getGamepadEquivalent(name);
    }

    /**
     * Check if a key was just pressed (keyboard or gamepad equivalent)
     * @param {string} name - Name of the key
     * @returns {boolean}
     */
    isKeyJustDown(name) {
        // Check keyboard first
        const keyboardJustDown = this.keys[name] && Phaser.Input.Keyboard.JustDown(this.keys[name]);
        if (keyboardJustDown) return true;

        // Check gamepad equivalent (only on first frame)
        return this.getGamepadEquivalent(name, true);
    }

    /**
     * Get gamepad equivalent for a keyboard key
     * @param {string} keyName - Name of the keyboard key
     * @param {boolean} justDown - If true, check for just pressed
     * @returns {boolean}
     */
    getGamepadEquivalent(keyName, justDown = false) {
        if (!this.gamepadConnected || !this.gamepad) {
            return false;
        }

        const mapping = this.getKeyToGamepadMapping(keyName);
        if (!mapping) {
            return false;
        }

        // Handle stick input for movement keys
        if (mapping.type === 'stick') {
            const stickInput = this.getGamepadStickInput(
                this.gamepad.axes[mapping.axisX],
                this.gamepad.axes[mapping.axisY]
            );
            
            if (keyName === 'wasd') {
                // Return true if stick is moved in any direction
                return Math.abs(stickInput.x) > 0 || Math.abs(stickInput.y) > 0;
            }

            // Specific directional checks
            if (keyName.includes('left')) return stickInput.x < -0.3;
            if (keyName.includes('right')) return stickInput.x > 0.3;
            if (keyName.includes('up')) return stickInput.y < -0.3;
            if (keyName.includes('down')) return stickInput.y > 0.3;
        }

        // Handle button mapping
        if (mapping.type === 'button') {
            return justDown 
                ? this.isGamepadButtonJustDown(mapping.button)
                : this.isGamepadButtonDown(mapping.button);
        }

        return false;
    }

    /**
     * Get mapping from keyboard key to gamepad button/stick
     * @param {string} keyName - Name of the keyboard key
     * @returns {Object|null} Mapping object or null
     */
    getKeyToGamepadMapping(keyName) {
        // Movement mappings (WASD -> Left Stick)
        if (keyName === 'wasd' || keyName.includes('wasd')) {
            return {
                type: 'stick',
                axisX: this.gamepadMap.LEFT_STICK_X,
                axisY: this.gamepadMap.LEFT_STICK_Y
            };
        }

        // Specific movement keys
        const movementMappings = {
            'left': { type: 'stick', axisX: this.gamepadMap.LEFT_STICK_X, axisY: null, direction: 'left' },
            'right': { type: 'stick', axisX: this.gamepadMap.LEFT_STICK_X, axisY: null, direction: 'right' },
            'up': { type: 'stick', axisX: null, axisY: this.gamepadMap.LEFT_STICK_Y, direction: 'up' },
            'down': { type: 'stick', axisX: null, axisY: this.gamepadMap.LEFT_STICK_Y, direction: 'down' }
        };

        if (movementMappings[keyName]) {
            return movementMappings[keyName];
        }

        // Button mappings
        const buttonMappings = {
            // Face buttons (U/I/O/P -> A/B/X/Y)
            'u': { type: 'button', button: 'A' },                  // U -> A button
            'i': { type: 'button', button: 'B' },                  // I -> B button
            'o': { type: 'button', button: 'X' },                  // O -> X button
            'p': { type: 'button', button: 'Y' },                  // P -> Y button
            
            // Dash (Shift -> L1/LB)
            'dash': { type: 'button', button: 'LB' },               // Shift -> L1 button
            'shift': { type: 'button', button: 'LB' },             // Shift -> L1 button
            
            // Enter/Return (-> Start button)
            'enter': { type: 'button', button: 'START' },           // Enter -> Start button
            'return': { type: 'button', button: 'START' },         // Return -> Start button
            'confirm': { type: 'button', button: 'START' },         // Confirm -> Start button
            
            // "/" key (-> Select button)
            'slash': { type: 'button', button: 'SELECT' },          // "/" -> Select button
            'menu': { type: 'button', button: 'SELECT' },           // Menu -> Select button
            
            // Escape/Cancel
            'escape': { type: 'button', button: 'B' },             // ESC -> B button (cancel)
            'cancel': { type: 'button', button: 'B' },             // Cancel -> B button
            
            // Legacy mappings (for backwards compatibility)
            'map': { type: 'button', button: 'START' },             // M -> Start button
            'back': { type: 'button', button: 'SELECT' }            // Back -> Select button
        };

        return buttonMappings[keyName] || null;
    }

    /**
     * Check if a key was just released
     * @param {string} name - Name of the key
     * @returns {boolean}
     */
    isKeyJustUp(name) {
        return this.keys[name] && Phaser.Input.Keyboard.JustUp(this.keys[name]);
    }

    /**
     * Get WASD movement input as a normalized vector (keyboard + gamepad)
     * @returns {{x: number, y: number}} Normalized direction vector
     */
    getMovementInput() {
        let dx = 0;
        let dy = 0;

        // Check keyboard input
        if (this.keys.wasd) {
            if (this.keys.wasd.left.isDown) dx = -1;
            if (this.keys.wasd.right.isDown) dx = 1;
            if (this.keys.wasd.up.isDown) dy = -1;
            if (this.keys.wasd.down.isDown) dy = 1;
        }

        // Check gamepad input (overrides keyboard if active)
        if (this.gamepad) {
            // Try to poll gamepad if not connected
            if (!this.gamepadConnected) {
                this.pollGamepad();
            }
            
            try {
                // Handle both Phaser gamepad (axes array) and browser API (axes array)
                let axisX = 0;
                let axisY = 0;
                
                if (this.gamepad.axes && this.gamepad.axes.length > 1) {
                    axisX = this.gamepad.axes[this.gamepadMap.LEFT_STICK_X] || 0;
                    axisY = this.gamepad.axes[this.gamepadMap.LEFT_STICK_Y] || 0;
                }
                
                const stickInput = this.getGamepadStickInput(axisX, axisY);

                // Use gamepad if stick is moved beyond deadzone
                if (Math.abs(stickInput.x) > 0 || Math.abs(stickInput.y) > 0) {
                    dx = stickInput.x;
                    dy = stickInput.y;
                }
            } catch (e) {
                console.warn('[InputManager] Error reading gamepad axes:', e);
            }
        }
        
        // Check mobile input (if mobile controls are available and no other input)
        if (window.mobileManager && window.mobileManager.isMobile && 
            this.scene.mobileControls && (dx === 0 && dy === 0)) {
            const mobileState = this.scene.mobileControls.getState();
            if (mobileState.dpad) {
                if (mobileState.dpad.left) dx = -1;
                if (mobileState.dpad.right) dx = 1;
                if (mobileState.dpad.up) dy = -1;
                if (mobileState.dpad.down) dy = 1;
            }
        }

        // Normalize diagonal movement for keyboard input
        if (dx !== 0 && dy !== 0 && (!this.gamepadConnected || Math.abs(this.gamepad?.axes[this.gamepadMap.LEFT_STICK_X] || 0) < this.gamepadDeadzone)) {
            const length = Math.sqrt(2);
            dx /= length;
            dy /= length;
        }

        return { x: dx, y: dy };
    }

    /**
     * Enable all input
     */
    enable() {
        if (this.scene.input) {
            this.scene.input.enabled = true;
            console.log('[InputManager] Input enabled');
        }
    }

    /**
     * Disable all input
     */
    disable() {
        if (this.scene.input) {
            this.scene.input.enabled = false;
            console.log('[InputManager] Input disabled');
        }
    }

    /**
     * Clean up all keys and listeners
     */
    cleanup() {
        console.log('[InputManager] Cleaning up inputs');
        
        // Remove all listeners
        this.listeners.forEach(({ key, event, callback }) => {
            if (this.keys[key]) {
                this.keys[key].off(event, callback);
            }
        });
        this.listeners = [];

        // Remove all keys
        Object.keys(this.keys).forEach(keyName => {
            if (this.keys[keyName] && this.keys[keyName].destroy) {
                this.keys[keyName].destroy();
            }
        });
        this.keys = {};

        // Reset gamepad button states
        this.gamepadButtonStates = {};

        // Stop polling
        this.stopGamepadPolling();

        // Remove Phaser gamepad plugin event listeners
        if (this.scene && this.scene.input && this.scene.input.gamepad) {
            try {
                if (this.gamepadConnectedListener) {
                    this.scene.input.gamepad.off('connected', this.gamepadConnectedListener);
                    this.gamepadConnectedListener = null;
                }
                if (this.gamepadDisconnectedListener) {
                    this.scene.input.gamepad.off('disconnected', this.gamepadDisconnectedListener);
                    this.gamepadDisconnectedListener = null;
                }
            } catch (e) {
                console.warn('[InputManager] Error removing gamepad plugin listeners:', e);
            }
        }

        // Remove browser event listeners
        if (this.browserConnectedListener) {
            window.removeEventListener('gamepadconnected', this.browserConnectedListener);
            this.browserConnectedListener = null;
        }
        if (this.browserDisconnectedListener) {
            window.removeEventListener('gamepaddisconnected', this.browserDisconnectedListener);
            this.browserDisconnectedListener = null;
        }

        // Clear gamepad reference
        this.gamepad = null;
        this.gamepadConnected = false;
    }

    /**
     * Destroy the input manager
     */
    destroy() {
        this.cleanup();
        this.scene = null;
    }
}

