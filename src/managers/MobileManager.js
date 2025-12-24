/**
 * MobileManager - Handles mobile device detection, orientation management, and mobile-specific controls
 */
class MobileManager {
    constructor() {
        this.isMobile = false;
        this.isLandscape = false;
        this.isPortrait = false;
        this.rotationOverlay = null;
        this.isPaused = false;
        this.game = null;
        
        // Touch gesture tracking
        this.touchStartTime = 0;
        this.lastTapTime = 0;
        this.doubleTapDelay = 300; // ms
        this.touchStartPos = { x: 0, y: 0 };
        
        // Shift (double-tap hold) state
        this.isShiftActive = false;
        this.shiftTapCount = 0;
        this.shiftTimeout = null;
        
        // ESC corner double-tap
        this.escCornerSize = 100; // pixels
        this.escTapCount = 0;
        this.escTapTimeout = null;
        
        this.init();
    }
    
    init() {
        this.detectMobile();
        this.checkOrientation();
        this.createRotationOverlay();
        this.setupOrientationListener();
        
        console.log('[MobileManager] Initialized - isMobile:', this.isMobile, 'isLandscape:', this.isLandscape);
    }
    
    /**
     * Detect if device is mobile
     */
    detectMobile() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        
        // Check for mobile device
        this.isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
        
        // Also check for touch capability
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        // Consider it mobile if touch-enabled and screen is small
        if (hasTouch && (window.innerWidth < 1024 || window.innerHeight < 768)) {
            this.isMobile = true;
        }
        
        return this.isMobile;
    }
    
    /**
     * Check device orientation
     */
    checkOrientation() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.isLandscape = width > height;
        this.isPortrait = height > width;
        
        if (this.isMobile) {
            if (this.isPortrait) {
                this.showRotationWarning();
            } else {
                this.hideRotationWarning();
            }
        }
        
        return this.isLandscape;
    }
    
    /**
     * Create rotation warning overlay
     */
    createRotationOverlay() {
        // Create overlay element
        this.rotationOverlay = document.createElement('div');
        this.rotationOverlay.id = 'rotation-overlay';
        this.rotationOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            flex-direction: column;
        `;
        
        // Create icon container
        const iconContainer = document.createElement('div');
        iconContainer.style.cssText = `
            font-size: 80px;
            margin-bottom: 30px;
            animation: rotate-phone 2s infinite;
        `;
        iconContainer.innerHTML = '📱';
        
        // Create text
        const text = document.createElement('div');
        text.style.cssText = `
            color: white;
            font-size: 28px;
            font-family: Arial, sans-serif;
            text-align: center;
            font-weight: bold;
            padding: 0 20px;
        `;
        text.textContent = 'Please Rotate Your Device';
        
        const subtext = document.createElement('div');
        subtext.style.cssText = `
            color: #aaa;
            font-size: 18px;
            font-family: Arial, sans-serif;
            text-align: center;
            margin-top: 15px;
            padding: 0 20px;
        `;
        subtext.textContent = 'This game requires landscape orientation';
        
        // Add rotation animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes rotate-phone {
                0%, 100% { transform: rotate(0deg); }
                25% { transform: rotate(-90deg); }
                75% { transform: rotate(-90deg); }
            }
        `;
        document.head.appendChild(style);
        
        this.rotationOverlay.appendChild(iconContainer);
        this.rotationOverlay.appendChild(text);
        this.rotationOverlay.appendChild(subtext);
        document.body.appendChild(this.rotationOverlay);
    }
    
    /**
     * Show rotation warning and pause game
     */
    showRotationWarning() {
        if (this.rotationOverlay) {
            this.rotationOverlay.style.display = 'flex';
            this.pauseGame();
        }
    }
    
    /**
     * Hide rotation warning and resume game
     */
    hideRotationWarning() {
        if (this.rotationOverlay) {
            this.rotationOverlay.style.display = 'none';
            this.resumeGame();
            
            // Enter fullscreen when rotating to landscape
            this.enterFullscreen();
        }
    }
    
    /**
     * Enter fullscreen mode
     */
    enterFullscreen() {
        if (!this.isMobile) return;
        
        try {
            const element = document.documentElement;
            
            if (element.requestFullscreen) {
                element.requestFullscreen().catch(err => {
                    console.warn('[MobileManager] Fullscreen request failed:', err);
                });
            } else if (element.webkitRequestFullscreen) { // Safari
                element.webkitRequestFullscreen();
            } else if (element.mozRequestFullScreen) { // Firefox
                element.mozRequestFullScreen();
            } else if (element.msRequestFullscreen) { // IE/Edge
                element.msRequestFullscreen();
            }
            
            console.log('[MobileManager] Entered fullscreen mode');
        } catch (err) {
            console.warn('[MobileManager] Could not enter fullscreen:', err);
        }
    }
    
    /**
     * Setup orientation change listener
     */
    setupOrientationListener() {
        window.addEventListener('resize', () => {
            this.checkOrientation();
        });
        
        // Also listen to orientation change event
        window.addEventListener('orientationchange', () => {
            // Small delay to let the browser finish rotating
            setTimeout(() => {
                this.checkOrientation();
            }, 100);
        });
    }
    
    /**
     * Pause the game
     */
    pauseGame() {
        if (this.isPaused || !this.game) return;
        
        this.isPaused = true;
        
        // Pause all active scenes
        if (this.game.scene && this.game.scene.scenes) {
            this.game.scene.scenes.forEach(scene => {
                if (scene.scene.isActive()) {
                    scene.scene.pause();
                }
            });
        }
        
        console.log('[MobileManager] Game paused - wrong orientation');
    }
    
    /**
     * Resume the game
     */
    resumeGame() {
        if (!this.isPaused || !this.game) return;
        
        this.isPaused = false;
        
        // Resume all paused scenes
        if (this.game.scene && this.game.scene.scenes) {
            this.game.scene.scenes.forEach(scene => {
                if (scene.scene.isPaused()) {
                    scene.scene.resume();
                }
            });
        }
        
        console.log('[MobileManager] Game resumed - correct orientation');
    }
    
    /**
     * Set game reference
     */
    setGame(game) {
        this.game = game;
    }
    
    /**
     * Handle double-tap for shift function
     */
    handleDoubleTap(x, y) {
        const currentTime = Date.now();
        
        // Check if tap is in ESC corner (upper left)
        if (x < this.escCornerSize && y < this.escCornerSize) {
            this.handleEscCornerTap();
            return;
        }
        
        // Regular double-tap for shift
        if (currentTime - this.lastTapTime < this.doubleTapDelay) {
            // Double tap detected - activate shift hold
            this.activateShift();
        }
        
        this.lastTapTime = currentTime;
    }
    
    /**
     * Handle ESC corner double-tap
     */
    handleEscCornerTap() {
        this.escTapCount++;
        
        if (this.escTapTimeout) {
            clearTimeout(this.escTapTimeout);
        }
        
        if (this.escTapCount >= 2) {
            // Double tap in corner - trigger ESC
            console.log('[MobileManager] ESC corner double-tap detected');
            this.triggerEsc();
            this.escTapCount = 0;
        } else {
            this.escTapTimeout = setTimeout(() => {
                this.escTapCount = 0;
            }, this.doubleTapDelay);
        }
    }
    
    /**
     * Activate shift mode (double-tap and hold)
     */
    activateShift() {
        this.isShiftActive = true;
        console.log('[MobileManager] Shift activated');
        
        // Dispatch custom event for scenes to listen to
        window.dispatchEvent(new CustomEvent('mobileshift', { detail: { active: true } }));
    }
    
    /**
     * Deactivate shift mode
     */
    deactivateShift() {
        this.isShiftActive = false;
        console.log('[MobileManager] Shift deactivated');
        
        window.dispatchEvent(new CustomEvent('mobileshift', { detail: { active: false } }));
    }
    
    /**
     * Trigger ESC function
     */
    triggerEsc() {
        window.dispatchEvent(new CustomEvent('mobileesc'));
    }
    
    /**
     * Get input state for scenes
     */
    getInputState() {
        return {
            isMobile: this.isMobile,
            isShiftActive: this.isShiftActive,
            isPaused: this.isPaused,
            isLandscape: this.isLandscape
        };
    }
}

// Create singleton instance
export const mobileManager = new MobileManager();
export default MobileManager;
