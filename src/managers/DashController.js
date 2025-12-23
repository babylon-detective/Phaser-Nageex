/**
 * DashController - Unified dash and auto-run system
 * Works across WorldScene and BattleScene
 */
export default class DashController {
    constructor(scene, player, chargeBarManager) {
        this.scene = scene;
        this.player = player;
        this.chargeBarManager = chargeBarManager;
        
        // Dash properties
        this.isDashing = false;
        this.dashSpeed = 600;
        this.dashDuration = 200; // Quick dash duration
        
        // Auto-run properties
        this.isCharging = false;
        this.isAutoRunning = false;
        this.autoRunDirection = 0;
        this.autoRunSpeed = 400; // Faster for auto-run
        this.chargeTime = 0;
        this.maxChargeTime = 1000; // 1 second to fully charge
        this.minChargeForAutoRun = 0.3; // 30% minimum
        
        // Input tracking
        this.shiftPressed = false;
        this.shiftPressStartTime = 0;
        this.tapThreshold = 200; // ms - if released before this, it's a tap (dash)
        
        // Mobile shift tracking
        this.mobileShiftActive = false;
        
        // Setup mobile shift listener
        this.setupMobileListeners();
    }
    
    /**
     * Setup mobile event listeners
     */
    setupMobileListeners() {
        window.addEventListener('mobileshift', (e) => {
            if (e.detail.active && !this.mobileShiftActive) {
                this.mobileShiftActive = true;
                this.onShiftDown();
            } else if (!e.detail.active && this.mobileShiftActive) {
                this.mobileShiftActive = false;
                this.onShiftUp();
            }
        });
    }

    /**
     * Initialize the dash controller
     */
    init() {
        // Create yellow charge bar for auto-run
        this.chargeBarManager.createBar('dash', 0xffff00, 20); // Yellow color
        console.log('[DashController] Initialized');
    }

    /**
     * Handle SHIFT key press
     */
    onShiftDown() {
        if (this.isAutoRunning) return; // Don't start new charge during auto-run
        
        this.shiftPressed = true;
        this.shiftPressStartTime = this.scene.time.now;
        this.isCharging = true;
        this.chargeTime = 0;
        
        console.log('[DashController] SHIFT pressed, starting charge');
    }

    /**
     * Handle SHIFT key release
     */
    onShiftUp() {
        if (!this.shiftPressed) return;
        
        const pressDuration = this.scene.time.now - this.shiftPressStartTime;
        this.shiftPressed = false;
        this.isCharging = false;
        
        // Determine if it's a tap (dash) or hold (auto-run)
        if (pressDuration < this.tapThreshold) {
            this.executeDash();
        } else {
            this.executeAutoRun();
        }
        
        this.chargeBarManager.hideBar('dash');
    }

    /**
     * Update charge bar (call in scene update)
     */
    update() {
        // Update charge if charging
        if (this.isCharging && !this.isAutoRunning) {
            this.chargeTime = Math.min(this.chargeTime + this.scene.game.loop.delta, this.maxChargeTime);
            const chargePercent = this.chargeTime / this.maxChargeTime;
            this.chargeBarManager.updateBar('dash', chargePercent);
        }
        
        // Handle auto-run movement
        if (this.isAutoRunning && this.autoRunDirection !== 0) {
            this.player.body.setVelocityX(this.autoRunSpeed * this.autoRunDirection);
        }
    }

    /**
     * Execute quick dash
     */
    executeDash() {
        if (this.isDashing) return;
        
        console.log('[DashController] Executing quick dash');
        
        this.isDashing = true;
        
        // Determine dash direction based on player orientation
        const dashDirection = this.getPlayerDirection();
        
        // Apply dash velocity
        this.player.body.setVelocityX(this.dashSpeed * dashDirection);
        
        // Visual feedback
        this.player.setAlpha(0.7);
        
        // Reset after duration
        this.scene.time.delayedCall(this.dashDuration, () => {
            this.isDashing = false;
            this.player.setAlpha(1);
            console.log('[DashController] Dash completed');
        });
    }

    /**
     * Execute auto-run
     */
    executeAutoRun() {
        const chargePercent = this.chargeTime / this.maxChargeTime;
        
        if (chargePercent < this.minChargeForAutoRun) {
            console.log('[DashController] Not enough charge for auto-run');
            return;
        }
        
        console.log('[DashController] Executing auto-run:', chargePercent);
        
        this.isAutoRunning = true;
        this.autoRunDirection = this.getPlayerDirection();
        
        // Auto-run duration based on charge (2-5 seconds)
        const autoRunDuration = 2000 + (chargePercent * 3000);
        
        // Stop auto-run after duration
        this.scene.time.delayedCall(autoRunDuration, () => {
            this.stopAutoRun();
        });
    }

    /**
     * Stop auto-run
     */
    stopAutoRun() {
        this.isAutoRunning = false;
        this.autoRunDirection = 0;
        this.chargeTime = 0;
        console.log('[DashController] Auto-run stopped');
    }

    /**
     * Get player movement direction
     * @returns {number} -1 for left, 1 for right
     */
    getPlayerDirection() {
        // Check current velocity
        if (this.player.body.velocity.x < 0) return -1;
        if (this.player.body.velocity.x > 0) return 1;
        
        // Check if player sprite is flipped
        if (this.player.flipX) return -1;
        
        // Default to right
        return 1;
    }

    /**
     * Check if player can move normally (not during dash/auto-run)
     */
    canMove() {
        return !this.isDashing && !this.isAutoRunning;
    }

    /**
     * Check if auto-running
     */
    isRunning() {
        return this.isAutoRunning;
    }

    /**
     * Reset dash controller state
     */
    reset() {
        this.isDashing = false;
        this.isCharging = false;
        this.isAutoRunning = false;
        this.autoRunDirection = 0;
        this.chargeTime = 0;
        this.shiftPressed = false;
        this.chargeBarManager.hideBar('dash');
    }

    /**
     * Cleanup
     */
    destroy() {
        this.reset();
        console.log('[DashController] Destroyed');
    }
}

