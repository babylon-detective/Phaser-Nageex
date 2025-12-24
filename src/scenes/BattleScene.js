import Phaser from "phaser";
import HUDManager from "../ui/HUDManager";
import DialogueCard from "../ui/DialogueCard.js";
import { gameStateManager } from "../managers/GameStateManager.js";
import { statsManager } from "../managers/StatsManager.js";
import { dialogueManager } from "../managers/DialogueManager.js";
import { dialogueDatabase } from "../data/DialogueDatabase.js";
import { moneyManager } from "../managers/MoneyManager.js";
import { itemsManager } from "../managers/ItemsManager.js";
import { soundManager } from "../managers/SoundManager.js";
import { BattleSceneSFX } from "../audio/sfx/BattleSceneSFX.js";
import { BattleSceneSong } from "../audio/songs/BattleSceneSong.js";
import { BattleAI } from "../ai/BattleAI.js";
import { npcAI } from "../ai/NpcAI.js";
import { mobileManager } from "../managers/MobileManager.js";
import MobileControls from "../managers/MobileControls.js";

export default class BattleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BattleScene' });
        this.player = null;
        this.enemies = []; // Array to store multiple enemies
        this.ground = null;
        this.escapeKey = null;
        this.isReturning = false;
        
        // ===== NEW TARGET-FOCUSED BATTLE SYSTEM =====
        
        // Target Selection System
        this.isTargetSelectionMode = true; // Battle starts in selection mode
        this.selectedTargetIndex = 0; // Currently highlighted enemy index
        this.targetArrow = null; // Visual arrow pointing at selected enemy
        this.isInTargetMode = false; // True when locked onto an enemy for combat
        this.currentTarget = null; // Currently targeted enemy
        
        // Juggle Combat System
        this.juggleAPCost = 2; // AP cost per juggle attack
        this.juggleComboCount = 0; // Current juggle combo count
        this.lastJuggleTime = 0; // Last juggle attack timestamp
        this.juggleCooldown = 150; // ms between juggle attacks
        this.canJuggle = true; // Can perform juggle attack
        
        // Action Point System (repurposed for juggle attacks)
        this.maxAP = 20;
        this.currentAP = 20;
        this.apGauge = null;
        this.apGaugeBackground = null;
        this.apGaugeText = null;
        this.isChargingAP = false;
        this.chargeAPRate = 8; // AP per second while charging
        this.chargeAPKey = null;
        
        // Character System (for display only during selection)
        this.partyMembers = []; // Array of all party members (data)
        this.partyCharacters = []; // Array of party character game objects
        
        // Defeat System
        this.isPlayerDowned = false;
        this.playerDownedText = null;
        
        // Sound effects
        this.battleSceneSFX = null;
        
        // Background music
        this.battleSceneSong = null;
        this.soundInitialized = false;
        
        // Player Health System
        this.maxHP = 100;
        this.currentHP = 100;
        
        // Display elements
        this.enemyHealthTexts = [];
        this.enemyLevelTexts = [];
        this.textDisplays = [];
        this.victoryText = null;
        this.isVictorySequence = false;
        this.defeatedEnemyIds = [];
        this.totalXpEarned = 0;
        this.defeatedEnemiesData = [];
        
        // Dialogue system properties
        this.dialogueCard = null;
        this.dialogueChoice = null;
        this.isDialogueActive = false;
        this.dialogueInputCooldown = 0; // Cooldown timer to prevent input bleed-through after dialogue
        
        // Visual ground
        this.checkerboardGround = null;
        
        // Mobile support
        this.mobileControls = null;
        
        // Gamepad support
        this.gamepad = null;
        this.gamepadButtonStates = {};
        
        // Escape system (hold ESC for 3 seconds to flee)
        this.isHoldingEscape = false;
        this.escapeHoldStartTime = 0;
        this.escapeHoldDuration = 3000; // 3 seconds to escape
        this.escapeProgressBar = null;
        this.escapeProgressBarBackground = null;
    }

    init(data) {
        console.log('[BattleScene] ========== INIT ==========');
        console.log('[BattleScene] Raw data received:', data);
        console.log('[BattleScene] data.partyMembers:', data?.partyMembers);
        console.log('[BattleScene] Is array?:', Array.isArray(data?.partyMembers));
        console.log('[BattleScene] Length:', data?.partyMembers?.length);
        
        // Validate required data
        if (!data || !data.playerData || !data.npcDataArray) {
            console.error('[BattleScene] ❌ Missing required data:', data);
            return;
        }

        // NEW SYSTEM: partyMembers contains ALL characters in leadership order
        // Index 0 = current leader (controls in WorldScene)
        // Index 1+ = followers
        const allPartyMembers = data.partyMembers || [];
        
        if (allPartyMembers.length > 0) {
            // Leader becomes the "player" in battle
            this.playerData = allPartyMembers[0];
            // Followers become party members
            this.partyMembersData = allPartyMembers.slice(1);
            
            console.log('[BattleScene] 👑 Leader (player in battle):', this.playerData.name);
            console.log('[BattleScene] 👥 Followers (party):', this.partyMembersData.map(m => m.name).join(', '));
        } else {
            // Fallback to old system if no party data
        this.playerData = data.playerData;
            this.partyMembersData = [];
            console.warn('[BattleScene] No party data - using legacy playerData');
        }
        
        this.npcDataArray = data.npcDataArray;
        
        console.log('[BattleScene] ==========================================');
        console.log('[BattleScene] this.partyMembersData set to:', this.partyMembersData);
        console.log('[BattleScene] Type:', typeof this.partyMembersData);
        console.log('[BattleScene] Is Array:', Array.isArray(this.partyMembersData));
        console.log('[BattleScene] Length:', this.partyMembersData.length);
        
        if (this.partyMembersData.length > 0) {
            console.log('[BattleScene] ✅ Party members data present!');
            this.partyMembersData.forEach((member, i) => {
                console.log(`[BattleScene]   ${i + 1}. ${member.name} - Color: 0x${member.color?.toString(16)}`);
            });
        } else {
            console.log('[BattleScene] ⚠️ NO PARTY MEMBERS DATA!');
        }
        console.log('[BattleScene] ==========================================');
        
        // Ensure npcDataArray is an array
        if (!Array.isArray(this.npcDataArray)) {
            console.error('[BattleScene] npcDataArray is not an array:', this.npcDataArray);
            this.npcDataArray = [this.npcDataArray];
        }

        // Store the world position the player came from (passed from WorldScene)
        this.worldPosition = data.worldPosition || { x: 400, y: 300 }; // Fallback to default if not provided
        
        console.log('[BattleScene] World position to return to:', this.worldPosition);
        console.log('[BattleScene] Init complete. Party members to create:', this.partyMembersData.length);
    }

    preload() {
        // Load battle-specific assets if needed
    }

    create() {
        console.log('[BattleScene] Creating scene');
        
        // CRITICAL: Stop StartMenuSong if still playing (defensive check)
        soundManager.stopStartMenuSong();
        console.log('[BattleScene] Stopped StartMenuSong (if playing)');
        
        // CRITICAL: Stop WorldSceneSong if still playing (defensive check)
        const worldScene = this.scene.get('WorldScene');
        if (worldScene && worldScene.worldSceneSong && worldScene.worldSceneSong.isPlaying) {
            worldScene.worldSceneSong.stop();
            console.log('[BattleScene] Stopped WorldSceneSong (if playing)');
        }
        
        // Validate data before proceeding
        if (!this.playerData || !this.npcDataArray || this.npcDataArray.length === 0) {
            console.error('[BattleScene] Missing required data for scene creation');
            return;
        }

        // Create black screen for fade in
        const blackScreen = this.add.graphics();
        blackScreen.fillStyle(0x000000, 1);
        blackScreen.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

        // Fade in animation
        this.tweens.add({
            targets: blackScreen,
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: async () => {
                blackScreen.destroy();
                
                // Initialize sound effects
                await this.initializeSFX();
                
                // Initialize and start battle music
                await this.initializeMusic();
                
                // Start battle immediately (no dialogue at start)
                this.setupBattle();
            }
        });
    }
    
    /**
     * Initialize battle scene sound effects
     */
    async initializeSFX() {
        try {
            // Initialize sound system first
            await soundManager.init();
            
            // Create and initialize battle scene SFX
            this.battleSceneSFX = new BattleSceneSFX();
            await this.battleSceneSFX.init();
            
            console.log('[BattleScene] ✅ SFX initialized');
        } catch (error) {
            console.error('[BattleScene] Failed to initialize SFX:', error);
        }
    }
    
    /**
     * Initialize and play battle scene music
     */
    async initializeMusic() {
        if (this.soundInitialized) return;
        
        try {
            // Initialize sound system first
            await soundManager.init();
            
            // Create and play battle scene song
            this.battleSceneSong = new BattleSceneSong();
            await this.battleSceneSong.play();
            
            this.soundInitialized = true;
            console.log('[BattleScene] ✅ Music started');
        } catch (error) {
            console.log('[BattleScene] ⏸️ Waiting for user interaction to start music');
        }
    }

    setupBattle() {
        // Clean up any existing input listeners first
        this.cleanupInput();
        
        // Initialize/reset all state variables to ensure clean battle start
        this.isReturning = false;
        this.isDashing = false;
        this.canDash = true;
        this.isVictorySequence = false;
        this.isBattleActive = true;
        this.defeatedEnemyIds = []; // Reset defeated enemy tracking
        this.totalXpEarned = 0; // Reset XP tracking
        this.defeatedEnemiesData = []; // Reset defeated enemies data
        
        // Reset combo system
        this.comboCount = 0;
        this.lastComboTime = 0;
        this.canCombo = true;

        // Set up background color to ensure WorldScene is hidden
        this.cameras.main.setBackgroundColor('#000000');
        
        // Set up world bounds and gravity
        this.physics.world.setBounds(0, 0, this.cameras.main.width, this.cameras.main.height);
        this.physics.world.gravity.y = 600;

        // Create Mac System 7 style checkerboard ground
        const groundY = this.cameras.main.height * 0.8;
        this.createCheckerboardGround(groundY);
        
        // Create invisible collision ground at the same level
        this.ground = this.add.rectangle(
            this.cameras.main.width / 2,
            groundY,
            this.cameras.main.width,
            10,
            0x00ff00,
            0 // Invisible
        );
        this.physics.add.existing(this.ground, true);

        // Create player (current leader from WorldScene)
        const playerX = this.cameras.main.width * 0.3;
        const playerColor = this.playerData.color || 0x808080;
        const playerIndicatorColor = this.playerData.indicatorColor || 0xff0000;
        
        this.player = this.add.rectangle(
            playerX,
            groundY - 150,
            96,
            192,
            playerColor
        );
        this.physics.add.existing(this.player);
        this.player.body.setBounce(0.2);
        this.player.body.setCollideWorldBounds(true);
        this.player.body.setSize(96, 192);

        // Add collision between player and ground
        this.physics.add.collider(this.player, this.ground);
        
        // Add direction indicator for player
        this.playerIndicator = this.add.rectangle(
            playerX,
            groundY - 150 - 40,
            10,
            10,
            playerIndicatorColor
        );
        this.playerIndicator.setDepth(1000);
        
        console.log(`[BattleScene] ✅ Created leader as player: ${this.playerData.name} (Color: 0x${playerColor.toString(16)})`);

        
        // Create party member characters
        this.createPartyCharacters(groundY);

        // Initialize input keys
        this.initializeInput();
        
        // Initialize Battle AI Module
        this.battleAI = new BattleAI(this);
        console.log('[BattleScene] BattleAI initialized');

        // Create enemies using npcDataArray
        const totalEnemies = this.npcDataArray.length;
        const spacing = 100; // Space between enemies
        let startX = this.cameras.main.width * 0.7; // Start position for first enemy

        console.log('[BattleScene] Creating enemies:', {
            totalEnemies,
            spacing,
            startX,
            npcDataArray: this.npcDataArray
        });

        // Create enemies array if it doesn't exist
        this.enemies = [];

        this.npcDataArray.forEach((npcData, index) => {
            const enemyColor = npcData.color;
            // Position enemies based on their trigger radius
            const triggerRadius = npcData.triggerRadius || 100; // Default to 100 if not specified
            const enemyX = startX + (index * spacing) + triggerRadius; // Add trigger radius to initial position

            console.log(`[BattleScene] Creating enemy ${index + 1}:`, {
                type: npcData.type,
                triggerRadius,
                position: enemyX
            });

            // Create enemy rectangle
            const enemy = this.add.rectangle(
                enemyX,
                groundY - 150,
                96,
                192,
                enemyColor
            );

            // Add physics to enemy
            this.physics.add.existing(enemy);
            enemy.body.setBounce(0.2);
            enemy.body.setCollideWorldBounds(true);
            enemy.body.setSize(96, 192);

            // Store enemy data
            enemy.enemyData = {
                ...npcData,
                health: npcData.health || 100,
                maxHealth: npcData.health || 100
            };

            // Add collision between enemy and ground
            this.physics.add.collider(enemy, this.ground);

            // Add to enemies array
            this.enemies.push(enemy);
            
            // Initialize enemy with BattleAI using profile from NpcAI
            const profile = npcAI.getAIProfile(npcData.type);
            console.log(`[BattleScene] Initializing AI for ${npcData.type}:`, {
                profile,
                attackFrequency: profile.attackFrequency,
                combatStyle: profile.combatStyle
            });
            this.battleAI.initEnemy(enemy, profile);
            
            // Legacy: Keep npcMovementData for backward compatibility (will be removed)
            console.log(`[BattleScene] Created enemy ${index + 1}: ${npcData.name || npcData.type}`);

            // NPC stats are now only shown in DOM (HUD), not in Phaser layer
        });

        // No collisions needed in target-focused system - combat is abstract

        // Create charge bar (initially hidden)
        this.createChargeBar();
        
        // Create AP gauge
        this.createAPGauge();
        
        // Initialize party system
        this.initializeParty();
        
        // Reset AP to full at start of battle
        this.resetAP();
        
        // Initialize HP from gameStateManager (preserve health between battles)
        const playerStats = gameStateManager.getPlayerStats();
        this.currentHP = playerStats.health;
        this.maxHP = playerStats.maxHealth;
        console.log(`[BattleScene] Initialized player health: ${this.currentHP}/${this.maxHP}`);

        // Set up camera
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, this.cameras.main.width, this.cameras.main.height);

        // Create HUD using DOM-based UI
        console.log('[BattleScene] Creating HUD Manager...');
        this.hudManager = new HUDManager(this);
        this.hudManager.create();
        
        console.log('[BattleScene] HUD created, now updating player stats...');
        console.log('[BattleScene] Party characters at HUD creation:', this.partyCharacters.length);
        
        // Initialize HUD with player data from GameStateManager
        this.hudManager.updatePlayerStats();
        
        // Initialize enemy list in HUD
        this.updateEnemyHUD();
        
        // Hide HUD by default (toggle with H key)
        this.hudManager.hide();
        
        console.log('[BattleScene] HUD initialization complete (hidden by default)');
        
        // Initialize mobile controls
        if (mobileManager.isMobile) {
            this.mobileControls = new MobileControls(this);
            this.mobileControls.show(); // Show controls in BattleScene
            this.setupMobileListeners();
            console.log('[BattleScene] Mobile controls initialized');
        }
        
        // Initialize dialogue card system
        this.dialogueCard = new DialogueCard(this);
        
        // Create target highlights for enemy selection
        this.createTargetHighlights();
        
        // Start in target selection mode
        this.isTargetSelectionMode = true;
        this.selectedTargetIndex = 0;
        console.log('[BattleScene] Battle initialized in TARGET SELECTION MODE - use A/D to move arrow, U to confirm selection');

        // Set up scene event listeners for HUD management
        this.events.on('shutdown', () => {
            console.log('[BattleScene] Scene shutting down, destroying HUD');
            if (this.hudManager) {
                this.hudManager.destroy();
                this.hudManager = null;
            }
        });
    }
    
    createTargetHighlights() {
        console.log('[BattleScene] Creating target selection arrow');
        
        // Clear existing arrow if it exists
        if (this.targetArrow) {
            this.targetArrow.destroy();
        }
        
        // Create a downward-pointing arrow using a triangle
        this.targetArrow = this.add.triangle(
            0, 0,
            0, 0,     // top point
            -20, -40, // bottom left
            20, -40,  // bottom right
            0xFFD700  // gold color
        );
        this.targetArrow.setStrokeStyle(3, 0xFFAA00);
        this.targetArrow.setDepth(1000);
        
        // Position arrow above first enemy
        if (this.enemies.length > 0) {
            this.updateTargetHighlight();
        }
        
        console.log('[BattleScene] Created target selection arrow');
    }
    
    /**
     * Update target highlight to show currently selected enemy
     */
    updateTargetHighlight() {
        if (!this.targetArrow || !this.enemies[this.selectedTargetIndex]) return;
        
        const enemy = this.enemies[this.selectedTargetIndex];
        
        // Position arrow above enemy's head
        this.targetArrow.setPosition(enemy.x, enemy.y - enemy.height / 2 - 50);
        this.targetArrow.setVisible(true);
        
        // Add a pulsing animation for visibility
        this.tweens.killTweensOf(this.targetArrow);
        this.tweens.add({
            targets: this.targetArrow,
            y: enemy.y - enemy.height / 2 - 60,
            duration: 500,
            ease: 'Sine.InOut',
            yoyo: true,
            repeat: -1
        });
        
        console.log(`[BattleScene] Arrow moved to enemy ${this.selectedTargetIndex}: ${enemy.enemyData.name || enemy.enemyData.type}`);
    }
    
    /**
     * Navigate target selection left
     */
    selectPreviousTarget() {
        if (this.enemies.length === 0) return;
        
        this.selectedTargetIndex = (this.selectedTargetIndex - 1 + this.enemies.length) % this.enemies.length;
        this.updateTargetHighlight();
        
        // Play sound (if available)
        if (this.battleSceneSFX && typeof this.battleSceneSFX.playMenuNavigate === 'function') {
            this.battleSceneSFX.playMenuNavigate();
        }
    }
    
    /**
     * Navigate target selection right
     */
    selectNextTarget() {
        if (this.enemies.length === 0) return;
        
        this.selectedTargetIndex = (this.selectedTargetIndex + 1) % this.enemies.length;
        this.updateTargetHighlight();
        
        // Play sound (if available)
        if (this.battleSceneSFX && typeof this.battleSceneSFX.playMenuNavigate === 'function') {
            this.battleSceneSFX.playMenuNavigate();
        }
    }
    
    /**
     * Confirm target selection and enter target mode
     */
    confirmTargetSelection() {
        if (this.enemies.length === 0 || !this.enemies[this.selectedTargetIndex]) {
            console.warn('[BattleScene] No valid target to confirm');
            return;
        }
        
        console.log('[BattleScene] ===== ENTERING TARGET MODE =====');
        
        this.currentTarget = this.enemies[this.selectedTargetIndex];
        this.isTargetSelectionMode = false;
        this.isInTargetMode = true;
        this.juggleComboCount = 0;
        
        // Play confirmation sound (if available)
        if (this.battleSceneSFX && typeof this.battleSceneSFX.playMenuSelect === 'function') {
            this.battleSceneSFX.playMenuSelect();
        }
        
        // Hide arrow during target mode
        if (this.targetArrow) {
            this.targetArrow.setVisible(false);
            this.tweens.killTweensOf(this.targetArrow);
        }
        
        // Position player and target closer together for combat
        this.enterTargetModePositioning();
    }
    
    /**
     * Position player and target enemy for juggle combat
     * Hide other characters
     */
    enterTargetModePositioning() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        const groundY = this.cameras.main.height * 0.8;
        
        // Move player to left side of screen
        this.tweens.add({
            targets: this.player,
            x: centerX - 200,
            y: groundY - 150,
            duration: 500,
            ease: 'Power2.Out'
        });
        
        // Move player indicator with player
        this.tweens.add({
            targets: this.playerIndicator,
            x: centerX - 200,
            y: groundY - 150 - 40,
            duration: 500,
            ease: 'Power2.Out'
        });
        
        // Move target to right side of screen
        this.tweens.add({
            targets: this.currentTarget,
            x: centerX + 200,
            y: groundY - 150,
            duration: 500,
            ease: 'Power2.Out',
            onComplete: () => {
                console.log('[BattleScene] Target mode positioning complete - ready for juggle combat!');
                // Don't show overlay UI - keep it clean
            }
        });
        
        // Hide other enemies
        this.enemies.forEach((enemy, index) => {
            if (index !== this.selectedTargetIndex) {
                this.tweens.add({
                    targets: enemy,
                    alpha: 0.2,
                    duration: 300
                });
            }
        });
        
        // Hide party characters
        this.partyCharacters.forEach(character => {
            this.tweens.add({
                targets: character.sprite,
                alpha: 0.2,
                duration: 300
            });
            if (character.indicator) {
                this.tweens.add({
                    targets: character.indicator,
                    alpha: 0.2,
                    duration: 300
                });
            }
        });
    }
    
    /**
     * Show target mode UI instructions
     */
    showTargetModeInstructions() {
        const overlay = document.createElement('div');
        overlay.id = 'target-mode-ui';
        overlay.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            border: 3px solid #00D9FF;
            border-radius: 10px;
            padding: 20px 40px;
            color: white;
            font-family: Arial, sans-serif;
            font-size: 18px;
            text-align: center;
            z-index: 10000;
            pointer-events: none;
            box-shadow: 0 0 30px rgba(0, 217, 255, 0.5);
        `;
        
        const targetName = this.currentTarget.enemyData.name || this.currentTarget.enemyData.type;
        
        overlay.innerHTML = `
            <div style="margin-bottom: 15px; color: #00D9FF; font-weight: bold; font-size: 24px;">
                ⚔️ TARGET MODE
            </div>
            <div style="margin-bottom: 15px; font-size: 20px;">
                Fighting: <span style="color: #FFD700;">${targetName}</span>
            </div>
            <div style="margin-bottom: 10px; color: #4A90E2;">
                AP: ${this.currentAP}/${this.maxAP} | Combo: ${this.juggleComboCount}
            </div>
            <div style="font-size: 16px; color: #00FF88; font-weight: bold; margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(0, 217, 255, 0.3);">
                U/A - Juggle Attack (${this.juggleAPCost} AP) | =/Right Stick - Charge AP | ESC/B - Exit Combat
            </div>
        `;
        
        document.body.appendChild(overlay);
    }
    
    /**
     * Update target mode UI
     */
    updateTargetModeUI() {
        const overlay = document.getElementById('target-mode-ui');
        if (!overlay || !this.currentTarget) return;
        
        const targetName = this.currentTarget.enemyData.name || this.currentTarget.enemyData.type;
        const targetHealth = this.currentTarget.enemyData.health;
        const targetMaxHealth = this.currentTarget.enemyData.maxHealth;
        
        overlay.innerHTML = `
            <div style="margin-bottom: 15px; color: #00D9FF; font-weight: bold; font-size: 24px;">
                ⚔️ TARGET MODE
            </div>
            <div style="margin-bottom: 15px; font-size: 20px;">
                Fighting: <span style="color: #FFD700;">${targetName}</span>
            </div>
            <div style="margin-bottom: 10px; color: #4A90E2;">
                Target HP: ${targetHealth}/${targetMaxHealth}
            </div>
            <div style="margin-bottom: 10px; color: #00FF88;">
                AP: ${this.currentAP}/${this.maxAP} | Combo: ${this.juggleComboCount}
            </div>
            <div style="font-size: 16px; color: #00FF88; font-weight: bold; margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(0, 217, 255, 0.3);">
                U - Juggle Attack (${this.juggleAPCost} AP) | = - Charge AP | ESC - Exit Combat
            </div>
        `;
    }
    
    /**
     * Perform juggle attack
     */
    performJuggleAttack() {
        // Check if can perform attack
        if (!this.canJuggle || this.currentAP < this.juggleAPCost) {
            console.warn('[BattleScene] Cannot juggle: not enough AP or on cooldown');
            this.showNoAPMessage();
            return;
        }
        
        if (!this.currentTarget || !this.currentTarget.active) {
            console.warn('[BattleScene] No valid target for juggle attack');
            return;
        }
        
        // Consume AP
        this.consumeAP(this.juggleAPCost);
        
        // Increment combo
        this.juggleComboCount++;
        this.lastJuggleTime = this.time.now;
        this.canJuggle = false;
        
        // Calculate damage (increases with combo)
        const baseDamage = 10;
        const comboDamage = baseDamage + (this.juggleComboCount * 2);
        
        console.log(`[BattleScene] Juggle attack ${this.juggleComboCount}! Damage: ${comboDamage}`);
        
        // Play attack animation (player lunges at target)
        this.tweens.add({
            targets: this.player,
            x: this.currentTarget.x - 80,
            duration: 100,
            ease: 'Power2.Out',
            yoyo: true,
            onComplete: () => {
                this.canJuggle = true;
            }
        });
        
        // Target hit animation
        this.tweens.add({
            targets: this.currentTarget,
            y: this.currentTarget.y - 30,
            duration: 150,
            ease: 'Power2.Out',
            yoyo: true
        });
        
        // Flash target
        this.tweens.add({
            targets: this.currentTarget,
            alpha: 0.3,
            duration: 50,
            yoyo: true,
            repeat: 2
        });
        
        // Apply damage
        this.applyDamageToEnemy(this.currentTarget, comboDamage);
        
        // Check if target still exists (may have been defeated)
        if (!this.currentTarget || !this.currentTarget.active) {
            console.log('[BattleScene] Target defeated during attack - skipping combo text');
            return;
        }
        
        // Show combo text
        this.showJuggleComboText(this.juggleComboCount, comboDamage);
        
        // Update UI
        this.updateTargetModeUI();
        
        // Play attack sound (if available)
        if (this.battleSceneSFX && typeof this.battleSceneSFX.playAttack === 'function') {
            this.battleSceneSFX.playAttack();
        }
    }
    
    /**
     * Show juggle combo text feedback
     */
    showJuggleComboText(comboCount, damage) {
        const comboText = this.add.text(
            this.currentTarget.x,
            this.currentTarget.y - 120,
            `${comboCount}x COMBO!`,
            {
                fontSize: `${24 + comboCount * 4}px`,
                fontFamily: 'Arial Black, Arial',
                fontStyle: 'bold',
                color: '#FFD700',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5);
        
        const damageText = this.add.text(
            this.currentTarget.x + 60,
            this.currentTarget.y - 100,
            `-${damage}`,
            {
                fontSize: '32px',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                color: '#FF4444',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0.5);
        
        this.textDisplays.push(comboText, damageText);
        
        // Animate combo text
        this.tweens.add({
            targets: comboText,
            y: comboText.y - 50,
            alpha: 0,
            scale: 1.5,
            duration: 800,
            ease: 'Power2.Out',
            onComplete: () => {
                comboText.destroy();
            }
        });
        
        // Animate damage text
        this.tweens.add({
            targets: damageText,
            y: damageText.y - 40,
            alpha: 0,
            duration: 600,
            ease: 'Power2.Out',
            onComplete: () => {
                damageText.destroy();
            }
        });
    }
    
    /**
     * Exit target mode and return to selection mode
     */
    exitTargetMode() {
        console.log('[BattleScene] Exiting target mode');
        
        this.isInTargetMode = false;
        this.isTargetSelectionMode = true;
        this.currentTarget = null;
        this.juggleComboCount = 0;
        
        // Remove target mode UI
        const overlay = document.getElementById('target-mode-ui');
        if (overlay) {
            overlay.remove();
        }
        
        // Reset enemy positions and visibility
        this.resetBattlePositions();
    }
    
    /**
     * Reset all character positions back to original battle formation
     */
    resetBattlePositions() {
        const playerX = this.cameras.main.width * 0.3;
        const groundY = this.cameras.main.height * 0.8;
        
        // Move player back to original position (3x faster)
        this.tweens.add({
            targets: this.player,
            x: playerX,
            y: groundY - 150,
            alpha: 1,
            duration: 167,
            ease: 'Power2.Out'
        });
        
        // Move player indicator
        this.tweens.add({
            targets: this.playerIndicator,
            x: playerX,
            y: groundY - 150 - 40,
            alpha: 1,
            duration: 167,
            ease: 'Power2.Out'
        });
        
        // Reset enemies to original positions
        const totalEnemies = this.enemies.length;
        const spacing = 100;
        let startX = this.cameras.main.width * 0.7;
        
        this.enemies.forEach((enemy, index) => {
            const enemyX = startX + (index * spacing);
            
            this.tweens.add({
                targets: enemy,
                x: enemyX,
                y: groundY - 150,
                alpha: 1,
                duration: 167,
                ease: 'Power2.Out'
            });
        });
        
        // Show party characters
        this.partyCharacters.forEach(character => {
            this.tweens.add({
                targets: character.sprite,
                alpha: 1,
                duration: 167
            });
            if (character.indicator) {
                this.tweens.add({
                    targets: character.indicator,
                    alpha: 1,
                    duration: 167
                });
            }
        });
        
        // Re-enable target selection arrow (match faster animation speed)
        this.time.delayedCall(167, () => {
            if (this.targetArrow) {
                this.targetArrow.setVisible(true);
            }
            this.updateTargetHighlight();
            console.log('[BattleScene] Battle positions reset (3x faster)');
        });
    }
    
    /**
     * Start dialogue/talk mode (separate from combat)
     */
    startTargetDialogueSelection() {
        if (this.isInTargetMode) {
            console.log('[BattleScene] Cannot open dialogue while in target mode');
            return;
        }
        
        console.log('[BattleScene] Starting dialogue target selection');
        this.startEnemySelection();
    }
    
    createPartyCharacters(groundY) {
        console.log('[BattleScene] ========== CREATING PARTY CHARACTERS ==========');
        console.log('[BattleScene] Party members data:', this.partyMembersData);
        
        if (!this.partyMembersData || this.partyMembersData.length === 0) {
            console.log('[BattleScene] No party members to create');
            return;
        }
        
        console.log(`[BattleScene] Creating ${this.partyMembersData.length} party characters...`);
        
        const playerX = this.cameras.main.width * 0.3;
        const spacing = 80; // Space between characters
        
        this.partyMembersData.forEach((memberData, index) => {
            // Position party members to the left of player
            const characterX = playerX - (spacing * (index + 1));
            const characterY = groundY - 150;
            
            // Create character game object (gray rectangle like player)
            const character = this.add.rectangle(
                characterX,
                characterY,
                96,
                192,
                memberData.color
            );
            
            this.physics.add.existing(character);
            character.body.setBounce(0.2);
            character.body.setCollideWorldBounds(true);
            character.body.setSize(96, 192);
            
            // Add collision with ground
            this.physics.add.collider(character, this.ground);
            
            // Create direction indicator with member's unique color
            const indicator = this.add.rectangle(
                characterX,
                characterY - 40,
                10,
                10,
                memberData.indicatorColor
            );
            indicator.setDepth(1000);
            
            // Store character data
            character.memberData = {
                ...memberData,
                indicator: indicator,
                abilities: memberData.abilities || [],
                currentHP: memberData.stats.health, // Current HP (can be damaged from previous battles)
                maxHP: memberData.stats.maxHealth || memberData.stats.health // Maximum HP
            };
            
            this.partyCharacters.push(character);
            
            console.log(`[BattleScene] ✅ Created party character: ${memberData.name} at (${characterX}, ${characterY})`);
            console.log(`[BattleScene]    - Color: 0x${memberData.color.toString(16)}, Indicator: 0x${memberData.indicatorColor.toString(16)}`);
            console.log(`[BattleScene]    - Stats: HP=${memberData.stats.health}, Atk=${memberData.stats.attack}, Lvl=${memberData.stats.level}`);
        });
        
        console.log(`[BattleScene] ========================================`);
        console.log(`[BattleScene] ✅ Total party size: ${this.partyCharacters.length + 1} (Player + ${this.partyCharacters.length} members)`);
        console.log(`[BattleScene] Party characters array:`, this.partyCharacters);
        console.log(`[BattleScene] ========================================`);
    }
    
    createCheckerboardGround(groundY) {
        console.log('[BattleScene] Creating Mac System 7 style checkerboard ground with perspective');
        
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Create graphics object for the checkerboard
        const checkerboard = this.add.graphics();
        checkerboard.setDepth(-10); // Behind everything
        
        // Mac System 7 style colors (light and dark gray)
        const lightGray = 0xCCCCCC;
        const darkGray = 0x888888;
        const horizonColor = 0x999999;
        
        // Define perspective parameters
        const horizonY = groundY - 150; // Horizon line above the ground
        const vanishingPointX = width / 2; // Center vanishing point
        const vanishingPointY = horizonY; // Vanishing point at horizon
        
        const rows = 30; // More rows for smoother perspective
        
        // Draw each row from horizon (far) to bottom (near)
        for (let row = 0; row < rows; row++) {
            // Calculate normalized depth (0 = horizon/far, 1 = near/bottom)
            const normalizedDepth = row / (rows - 1);
            
            // Use exponential curve for dramatic perspective
            const depthCurve = Math.pow(normalizedDepth, 1.8);
            
            // Calculate Y positions
            const currentY = vanishingPointY + (height - vanishingPointY) * depthCurve;
            const nextDepth = Math.min(1, (row + 1) / (rows - 1));
            const nextDepthCurve = Math.pow(nextDepth, 1.8);
            const nextY = vanishingPointY + (height - vanishingPointY) * nextDepthCurve;
            
            // Calculate row width based on perspective
            // Far rows (horizon) are narrow, near rows (bottom) span MORE than full width
            const minWidthRatio = 0.15; // Horizon is 15% of screen width
            const maxWidthRatio = 2.5; // Bottom extends well beyond screen edges
            const widthRatio = minWidthRatio + (maxWidthRatio - minWidthRatio) * normalizedDepth;
            
            const currentRowWidth = width * widthRatio;
            const nextWidthRatio = minWidthRatio + (maxWidthRatio - minWidthRatio) * nextDepth;
            const nextRowWidth = width * nextWidthRatio;
            
            // Center the rows
            const currentRowLeft = vanishingPointX - currentRowWidth / 2;
            const nextRowLeft = vanishingPointX - nextRowWidth / 2;
            
            // Tile size increases dramatically towards the front
            // Smaller tiles at horizon, much larger at bottom
            const baseTileSize = 40; // Base tile size at horizon
            const frontTileSize = 180; // Much larger tiles at front
            const tileSize = baseTileSize + (frontTileSize - baseTileSize) * normalizedDepth;
            
            // Calculate how many tiles fit in this row
            const tilesInRow = Math.ceil(currentRowWidth / tileSize);
            const nextTilesInRow = Math.ceil(nextRowWidth / tileSize);
            
            const tileWidth = currentRowWidth / tilesInRow;
            const nextTileWidth = nextRowWidth / nextTilesInRow;
            
            // Draw tiles with extra coverage on sides
            const startCol = -2; // Start 2 tiles before visible area
            const endCol = tilesInRow + 2; // End 2 tiles after visible area
            
            for (let col = startCol; col < endCol; col++) {
                // Classic checkerboard pattern
                const isLight = (row + col) % 2 === 0;
                const color = isLight ? lightGray : darkGray;
                
                // Calculate tile corner positions with perspective
                const topLeft = currentRowLeft + col * tileWidth;
                const topRight = topLeft + tileWidth;
                const bottomLeft = nextRowLeft + col * nextTileWidth;
                const bottomRight = bottomLeft + nextTileWidth;
                
                // Draw trapezoid tile with perspective
                checkerboard.fillStyle(color, 1);
                checkerboard.beginPath();
                checkerboard.moveTo(topLeft, currentY);
                checkerboard.lineTo(topRight, currentY);
                checkerboard.lineTo(bottomRight, nextY);
                checkerboard.lineTo(bottomLeft, nextY);
                checkerboard.closePath();
                checkerboard.fillPath();
                
                // Add outline for Mac System 7 look (thinner at distance)
                const lineThickness = Math.max(0.3, normalizedDepth * 2.5);
                const lineAlpha = 0.15 + normalizedDepth * 0.25;
                checkerboard.lineStyle(lineThickness, 0x000000, lineAlpha);
                checkerboard.strokePath();
            }
        }
        
        // Draw horizon line (classic Mac System 7 style)
        checkerboard.lineStyle(3, horizonColor, 1);
        checkerboard.beginPath();
        checkerboard.moveTo(0, horizonY);
        checkerboard.lineTo(width, horizonY);
        checkerboard.strokePath();
        
        // Add subtle gradient fade to horizon (atmospheric depth)
        const gradientSteps = 10;
        for (let i = 0; i < gradientSteps; i++) {
            const alpha = (gradientSteps - i) / gradientSteps * 0.12;
            const offsetY = i * 2.5;
            checkerboard.lineStyle(1.5, 0x000000, alpha);
            checkerboard.beginPath();
            checkerboard.moveTo(0, horizonY - offsetY);
            checkerboard.lineTo(width, horizonY - offsetY);
            checkerboard.strokePath();
        }
        
        // Store reference for cleanup
        this.checkerboardGround = checkerboard;
        
        console.log('[BattleScene] Perspective checkerboard ground created with vanishing point at', vanishingPointX, vanishingPointY);
    }

    initializeInput() {
        console.log('[BattleScene] Initializing input controls for target-focused combat');
        
        // Clear any existing input listeners
        this.cleanupInput();

        // Initialize keyboard controls
        this.escapeKey = this.input.keyboard.addKey('ESC');
        
        // Target selection controls (A/D for left/right)
        this.leftKey = this.input.keyboard.addKey('A');
        this.rightKey = this.input.keyboard.addKey('D');
        
        // Attack/Confirm key (U for juggle attacks and confirm)
        this.attackKey = this.input.keyboard.addKey('U');
        
        // Character rotation keys (Q/E)
        this.qKey = this.input.keyboard.addKey('Q');
        this.eKey = this.input.keyboard.addKey('E');
        
        // AP charging control
        this.chargeAPKey = this.input.keyboard.addKey('EQUALS');
        this.chargeAPKeyAlt = this.input.keyboard.addKey(187); // = key code
        
        // Battle menu control (/ key for Talk, Items, Skills -> Select button on gamepad)
        // Note: Using FORWARD_SLASH (191) for better compatibility
        this.battleMenuKey = this.input.keyboard.addKey(191); // Forward slash key code
        this.battleMenuKeyAlt = this.input.keyboard.addKey('M'); // Alternative: M for Menu
        
        // Initialize gamepad reference
        this.gamepad = null;
        this.gamepadButtonStates = {};
        
        // Pause state
        this.isPaused = false;

        // Add Enter key for pausing
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        // Note: We check for Enter in update() loop instead of event listener
        // to avoid issues with pause state

        // Add H key for toggling HUD visibility
        this.hudToggleKey = this.input.keyboard.addKey('H');
        this.hudToggleKey.on('down', () => {
            this.toggleHUD();
        });

        // Enable input
        this.input.keyboard.enabled = true;
        this.input.mouse.enabled = true;
        
        console.log('[BattleScene] Input initialized: A/D for target selection, U for attack/confirm, ESC to exit');
    }

    cleanupInput() {
        console.log('[BattleScene] Cleaning up input controls');

        // Remove all keys
        if (this.escapeKey) {
            this.escapeKey.destroy();
            this.escapeKey = null;
        }
        if (this.leftKey) {
            this.leftKey.destroy();
            this.leftKey = null;
        }
        if (this.rightKey) {
            this.rightKey.destroy();
            this.rightKey = null;
        }
        if (this.attackKey) {
            this.attackKey.destroy();
            this.attackKey = null;
        }
        if (this.qKey) {
            this.qKey.destroy();
            this.qKey = null;
        }
        if (this.eKey) {
            this.eKey.destroy();
            this.eKey = null;
        }
        if (this.chargeAPKey) {
            this.chargeAPKey.destroy();
            this.chargeAPKey = null;
        }
        if (this.chargeAPKeyAlt) {
            this.chargeAPKeyAlt.destroy();
            this.chargeAPKeyAlt = null;
        }
        if (this.hudToggleKey) {
            this.hudToggleKey.destroy();
            this.hudToggleKey = null;
        }
        if (this.enterKey) {
            this.enterKey.destroy();
            this.enterKey = null;
        }
        if (this.battleMenuKey) {
            this.battleMenuKey.destroy();
            this.battleMenuKey = null;
        }
        if (this.battleMenuKeyAlt) {
            this.battleMenuKeyAlt.destroy();
            this.battleMenuKeyAlt = null;
        }

        // Remove all keyboard listeners
        this.input.keyboard.removeAllKeys(true);
        this.input.keyboard.removeAllListeners();
    }

    openBattleMenu() {
        console.log('[BattleScene] Opening Battle Menu');
        
        // Pause battle scene
        this.scene.pause();
        
        // Prepare party data for menu
        const partyData = this.partyCharacters.map(character => ({
            id: character.memberData.id,
            name: character.memberData.name,
            level: character.memberData.stats.level,
            currentHP: character.memberData.currentHP,
            maxHP: character.memberData.maxHP,
            indicatorColor: character.memberData.indicatorColor
        }));
        
        console.log('[BattleScene] Opening menu with party:', partyData);
        
        // Launch BattleMenuScene with enemy data and party data
        this.scene.launch('BattleMenuScene', {
            enemies: this.enemies.map(enemy => ({
                id: enemy.enemyData.id,
                type: enemy.enemyData.type,
                level: enemy.enemyData.level,
                health: enemy.enemyData.health,
                maxHealth: enemy.enemyData.maxHealth
            })),
            partyMembers: partyData
        });
    }

    startEnemySelection() {
        console.log('[BattleScene] Starting enemy selection mode');
        
        // Initialize enemy selection state FIRST
        this.isEnemySelectionMode = true;
        this.selectedEnemyIndex = 0;
        this.enemyHighlights = [];
        
        // IMPORTANT: Prime gamepad button states with current button state
        // This prevents buttons that are currently held down from being detected as "just pressed"
        this.updateGamepad();
        if (this.gamepad && this.gamepad.buttons) {
            this.gamepadButtonStates = {};
            // Set all currently pressed buttons to true so they won't trigger "just pressed"
            for (let i = 0; i < this.gamepad.buttons.length; i++) {
                const button = this.gamepad.buttons[i];
                const isPressed = button && (button.pressed || button.value > 0.5);
                this.gamepadButtonStates[`button_${i}`] = isPressed;
            }
            console.log('[BattleScene] Primed gamepad button states to prevent held button carryover:', this.gamepadButtonStates);
        } else {
            this.gamepadButtonStates = {};
        }
        this.lastStickLeftState = false;
        this.lastStickRightState = false;
        
        // Create highlights for all enemies
        this.enemies.forEach((enemy, index) => {
            const highlight = this.add.graphics();
            highlight.lineStyle(4, 0xffff00, 1);
            highlight.strokeCircle(0, 0, enemy.width * 0.6);
            highlight.setDepth(1000);
            highlight.setVisible(false);
            this.enemyHighlights.push(highlight);
        });
        
        // Set up input for enemy selection BEFORE resuming
        this.setupEnemySelectionInput();
        
        // Resume the scene so update() can run (for enemy selection input)
        // But battle logic is blocked by isEnemySelectionMode check
        console.log('[BattleScene] Resuming scene for enemy selection');
        if (this.scene.isPaused()) {
            this.scene.resume();
        }
        
        // Ensure input is enabled
        this.input.enabled = true;
        this.input.keyboard.enabled = true;
        console.log('[BattleScene] Input enabled:', this.input.enabled, 'Keyboard enabled:', this.input.keyboard.enabled);
        
        // Highlight the first enemy
        this.updateEnemyHighlight();
        
        // Create DOM overlay for instructions
        this.createEnemySelectionUI();
        
        console.log('[BattleScene] Enemy selection mode ready');
    }
    
    updateEnemyHighlight() {
        // Hide all highlights
        this.enemyHighlights.forEach(h => h.setVisible(false));
        
        // Show highlight for selected enemy
        if (this.enemies[this.selectedEnemyIndex]) {
            const enemy = this.enemies[this.selectedEnemyIndex];
            const highlight = this.enemyHighlights[this.selectedEnemyIndex];
            
            // Position highlight on enemy
            highlight.setPosition(enemy.x, enemy.y);
            highlight.setVisible(true);
            
            // Add pulsing animation
            this.tweens.add({
                targets: highlight,
                scaleX: 1.2,
                scaleY: 1.2,
                alpha: 0.7,
                duration: 500,
                yoyo: true,
                repeat: -1
            });
            
            console.log(`[BattleScene] Highlighting enemy ${this.selectedEnemyIndex}:`, enemy.enemyData.type);
        }
    }
    
    createEnemySelectionUI() {
        const overlay = document.createElement('div');
        overlay.id = 'enemy-selection-ui';
        overlay.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            border: 3px solid gold;
            border-radius: 10px;
            padding: 20px 40px;
            color: white;
            font-family: Arial, sans-serif;
            font-size: 18px;
            text-align: center;
            z-index: 10000;
            pointer-events: none;
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
        `;
        
        const selectedEnemy = this.enemies[this.selectedEnemyIndex];
        const isRecruitable = selectedEnemy.enemyData.isRecruitableCharacter || false;
        
        // Different styling for recruitable NPCs
        const titleColor = isRecruitable ? '#00ff88' : 'gold';
        const titleIcon = isRecruitable ? '✨' : '💬';
        const titleText = isRecruitable ? 'RECRUITABLE CHARACTER' : 'SELECT ENEMY TO TALK TO';
        
        overlay.innerHTML = `
            <div style="margin-bottom: 15px; color: ${titleColor}; font-weight: bold; font-size: 24px;">
                ${titleIcon} ${titleText}
            </div>
            <div style="margin-bottom: 15px; font-size: 20px;">
                <span style="color: #FFD700;">▶</span> ${selectedEnemy.enemyData.name || selectedEnemy.enemyData.type} <span style="color: #FFD700;">◀</span>
            </div>
            <div style="margin-bottom: 10px; color: #4A90E2;">
                Level ${selectedEnemy.enemyData.level} | HP: ${selectedEnemy.enemyData.health}/${selectedEnemy.enemyData.maxHealth}
            </div>
            ${isRecruitable ? `
                <div style="margin-top: 10px; padding: 10px; background: rgba(0, 255, 136, 0.2); border-radius: 8px; border: 1px solid #00ff88;">
                    <div style="font-size: 14px; color: #00ff88; font-style: italic;">
                        This character can join your party!
                    </div>
                </div>
            ` : ''}
            <div style="font-size: 16px; color: #FFD700; font-weight: bold; margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255, 215, 0, 0.3);">
                A/D or D-pad - Switch Enemy | U/A - Confirm | ESC/B - Cancel
            </div>
        `;
        
        document.body.appendChild(overlay);
    }
    
    updateEnemySelectionUI() {
        const overlay = document.getElementById('enemy-selection-ui');
        if (overlay && this.enemies[this.selectedEnemyIndex]) {
            const selectedEnemy = this.enemies[this.selectedEnemyIndex];
            const isRecruitable = selectedEnemy.enemyData.isRecruitableCharacter || false;
            
            // Different styling for recruitable NPCs
            const titleColor = isRecruitable ? '#00ff88' : 'gold';
            const titleIcon = isRecruitable ? '✨' : '💬';
            const titleText = isRecruitable ? 'RECRUITABLE CHARACTER' : 'SELECT ENEMY TO TALK TO';
            
            overlay.innerHTML = `
                <div style="margin-bottom: 15px; color: ${titleColor}; font-weight: bold; font-size: 24px;">
                    ${titleIcon} ${titleText}
                </div>
                <div style="margin-bottom: 15px; font-size: 20px;">
                    <span style="color: #FFD700;">▶</span> ${selectedEnemy.enemyData.name || selectedEnemy.enemyData.type} <span style="color: #FFD700;">◀</span>
                </div>
                <div style="margin-bottom: 10px; color: #4A90E2;">
                    Level ${selectedEnemy.enemyData.level} | HP: ${selectedEnemy.enemyData.health}/${selectedEnemy.enemyData.maxHealth}
                </div>
                ${isRecruitable ? `
                    <div style="margin-top: 10px; padding: 10px; background: rgba(0, 255, 136, 0.2); border-radius: 8px; border: 1px solid #00ff88;">
                        <div style="font-size: 14px; color: #00ff88; font-style: italic;">
                            This character can join your party!
                        </div>
                    </div>
                ` : ''}
                <div style="font-size: 16px; color: #FFD700; font-weight: bold; margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255, 215, 0, 0.3);">
                    A/D or Left Stick - Switch Enemy | U/A - Confirm | ESC/B - Cancel
                </div>
            `;
        }
    }
    
    setupEnemySelectionInput() {
        console.log('[BattleScene] Setting up enemy selection input');
        
        // Create key objects for navigation
        this.enemySelectionKeys = {
            a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            confirm: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.U), // U key (changed from ])
            cancel: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
        };
        
        // Also add DOM-level listener for ESC (works even when Phaser input issues occur)
        this.enemySelectionEscapeListener = (event) => {
            if (this.isEnemySelectionMode && event.key === 'Escape') {
                console.log('[BattleScene] ESC pressed via DOM listener - cancelling enemy selection');
                event.preventDefault();
                this.cancelEnemySelection();
            }
        };
        document.addEventListener('keydown', this.enemySelectionEscapeListener);
        
        console.log('[BattleScene] Enemy selection keys created:', this.enemySelectionKeys);
    }
    
    updateEnemySelection() {
        if (!this.isEnemySelectionMode) {
            console.log('[BattleScene] updateEnemySelection called but mode is not active');
            return;
        }
        
        if (!this.enemySelectionKeys) {
            console.log('[BattleScene] updateEnemySelection: no keys defined!');
            return;
        }
        
        const keys = this.enemySelectionKeys;
        
        // Check for gamepad stick navigation
        const gamepadStickLeft = this.isGamepadStickLeft();
        const gamepadStickRight = this.isGamepadStickRight();
        
        // Track stick state to detect "just pressed" (avoid continuous triggering)
        if (!this.lastStickLeftState) this.lastStickLeftState = false;
        if (!this.lastStickRightState) this.lastStickRightState = false;
        
        const stickLeftJustPressed = gamepadStickLeft && !this.lastStickLeftState;
        const stickRightJustPressed = gamepadStickRight && !this.lastStickRightState;
        
        this.lastStickLeftState = gamepadStickLeft;
        this.lastStickRightState = gamepadStickRight;
        
        // Navigate left (A key or D-pad/left stick)
        if (Phaser.Input.Keyboard.JustDown(keys.a) || stickLeftJustPressed) {
            console.log('[BattleScene] A key/D-pad left pressed - navigating left');
            this.selectedEnemyIndex--;
            if (this.selectedEnemyIndex < 0) {
                this.selectedEnemyIndex = this.enemies.length - 1;
            }
            this.updateEnemyHighlight();
            this.updateEnemySelectionUI();
        }
        
        // Navigate right (D key or D-pad/right stick)
        if (Phaser.Input.Keyboard.JustDown(keys.d) || stickRightJustPressed) {
            console.log('[BattleScene] D key/D-pad right pressed - navigating right');
            this.selectedEnemyIndex++;
            if (this.selectedEnemyIndex >= this.enemies.length) {
                this.selectedEnemyIndex = 0;
            }
            this.updateEnemyHighlight();
            this.updateEnemySelectionUI();
        }
        
        // Confirm selection (U key or A button)
        if (Phaser.Input.Keyboard.JustDown(keys.confirm) || this.isGamepadButtonJustPressed(0)) {
            console.log('[BattleScene] U/A button pressed - confirming selection');
            this.confirmEnemySelection();
        }
        
        // Cancel (ESC key or B button)
        if (Phaser.Input.Keyboard.JustDown(keys.cancel) || this.isGamepadButtonJustPressed(1)) {
            console.log('[BattleScene] ESC/B button pressed - cancelling selection');
            this.cancelEnemySelection();
        }
    }
    
    confirmEnemySelection() {
        console.log('[BattleScene] Enemy selection confirmed:', this.selectedEnemyIndex);
        
        const selectedEnemy = this.enemies[this.selectedEnemyIndex];
        
        // Clean up enemy selection mode
        this.cleanupEnemySelection();
        
        // Start dialogue with selected enemy
        this.startDialogueWithEnemy(selectedEnemy);
    }
    
    cancelEnemySelection() {
        console.log('[BattleScene] Enemy selection cancelled');
        
        // Clean up enemy selection mode
        this.cleanupEnemySelection();
        
        // Resume battle normally
        if (this.scene.isPaused()) {
            this.scene.resume();
        }
    }
    
    cleanupEnemySelection() {
        console.log('[BattleScene] Cleaning up enemy selection');
        
        // Remove highlights
        if (this.enemyHighlights) {
            this.enemyHighlights.forEach(h => {
                this.tweens.killTweensOf(h);
                h.destroy();
            });
            this.enemyHighlights = [];
        }
        
        // Remove UI overlay
        const overlay = document.getElementById('enemy-selection-ui');
        if (overlay) {
            overlay.remove();
        }
        
        // Remove DOM-level escape listener
        if (this.enemySelectionEscapeListener) {
            document.removeEventListener('keydown', this.enemySelectionEscapeListener);
            this.enemySelectionEscapeListener = null;
        }
        
        // Clean up input keys
        if (this.enemySelectionKeys) {
            Object.values(this.enemySelectionKeys).forEach(key => {
                if (key) key.destroy();
            });
            this.enemySelectionKeys = null;
        }
        
        // Reset state
        this.isEnemySelectionMode = false;
        this.selectedEnemyIndex = 0;
        this.lastStickLeftState = false;
        this.lastStickRightState = false;
        
        console.log('[BattleScene] Enemy selection cleanup complete');
    }
    
    startDialogueWithEnemy(enemy) {
        console.log('[BattleScene] Starting dialogue with enemy:', enemy.enemyData);
        
        // Don't pause the scene - just set dialogue active flag
        // The scene will handle input differently when dialogue is active
        
        // Launch dialogue manager with enemy data - include ALL relevant data
        const npcData = {
            id: enemy.enemyData.id,
            type: enemy.enemyData.type,
            name: enemy.enemyData.name || enemy.enemyData.type,
            level: enemy.enemyData.level,
            health: enemy.enemyData.health,
            maxHealth: enemy.enemyData.maxHealth,
            // IMPORTANT: Pass through recruitable flag and related data
            isRecruitableCharacter: enemy.enemyData.isRecruitableCharacter || false,
            indicatorColor: enemy.enemyData.indicatorColor,
            abilities: enemy.enemyData.abilities,
            stats: enemy.enemyData.stats,
            dialogue: enemy.enemyData.dialogue
        };
        
        console.log('[BattleScene] NPC data for dialogue (recruitability check):', {
            id: npcData.id,
            type: npcData.type,
            isRecruitableCharacter: npcData.isRecruitableCharacter
        });
        
        // Create dialogue overlay (using existing dialogue system)
        this.showDialogueForEnemy(npcData);
    }
    
    showDialogueForEnemy(npcData) {
        console.log('[BattleScene] Starting dialogue with:', npcData);
        console.log('[BattleScene] NPC Data Details:', {
            id: npcData.id,
            type: npcData.type,
            name: npcData.name,
            isRecruitableCharacter: npcData.isRecruitableCharacter,
            dialogue: npcData.dialogue,
            hasDialogue: !!npcData.dialogue
        });
        
        // Store dialogue state
        this.dialogueNpcData = npcData;
        this.isDialogueActive = true;
        
        // Check if this is a recruitable NPC
        const isRecruitableNPC = npcData.isRecruitableCharacter || false;
        
        console.log('[BattleScene] Is recruitable?', isRecruitableNPC);
        
        // Get dialogue from database OR use recruitable dialogue
        let dialogueData;
        if (isRecruitableNPC) {
            // Ensure name is defined
            const characterName = npcData.name || npcData.type || 'Adventurer';
            const characterType = npcData.type || 'WARRIOR';
            
            console.log('[BattleScene] Building recruitment dialogue for:', characterName, 'Type:', characterType);
            
            // Use custom recruitment dialogue based on character type
            const recruitmentDialogues = {
                'WARRIOR': {
                    greeting: `Greetings, traveler. I am ${characterName}, a warrior seeking worthy allies.`,
                    offer: `I've been wandering these lands alone for too long. If you seek a strong sword arm for your party, I would be honored to join your cause. Together, we could face any challenge that comes our way.`
                },
                'MAGE': {
                    greeting: `Ah, hello there. I am ${characterName}, a mage versed in the arcane arts.`,
                    offer: `I sense great potential in you. My magical knowledge could prove invaluable on your journey. Would you allow me to accompany you? With my spells and your leadership, we could achieve great things.`
                },
                'RANGER': {
                    greeting: `Well met. The name's ${characterName}, ranger and scout.`,
                    offer: `I've been tracking threats in this region, but I work better with a team. Your party looks capable. If you'll have me, I can provide reconnaissance and ranged support. What do you say?`
                }
            };
            
            const dialogue = recruitmentDialogues[characterType] || {
                greeting: `Hello, I'm ${characterName}.`,
                offer: `I'm a wandering adventurer looking for a party to join. Would you like me to accompany you on your journey?`
            };
            
            console.log('[BattleScene] Generated dialogue:', dialogue);
            
            // DialogueCard expects 'paragraphs' as array of strings
            dialogueData = {
                paragraphs: [
                    dialogue.greeting,
                    dialogue.offer
                ],
                hasChoices: true,
                choices: [
                    {
                        id: 'recruit',
                        text: `✓ Accept ${characterName}`,
                        description: `${characterName} joins your party`,
                        available: true
                    },
                    {
                        id: 'fight',
                        text: '⚔ Test Their Skills',
                        description: 'Engage in friendly combat',
                        available: true
                    },
                    {
                        id: 'flee',
                        text: '✗ Decline',
                        description: 'Politely decline and leave',
                        available: true
                    }
                ]
            };
        } else {
            // Regular NPC dialogue
            dialogueData = dialogueDatabase.getDialogue(npcData.type, 'initial');
        }
        
        console.log('[BattleScene] Final dialogue data:', {
            paragraphs: dialogueData.paragraphs,
            paragraphCount: dialogueData.paragraphs?.length,
            hasChoices: dialogueData.hasChoices,
            choices: dialogueData.choices,
            choiceCount: dialogueData.choices?.length
        });
        
        // Get player data for portrait switching
        const playerData = {
            id: 'player',
            type: 'Player',
            level: this.playerData?.level || 1,
            health: this.playerData?.health || 100,
            maxHealth: this.playerData?.maxHealth || 100
        };
        
        // Always show multi-paragraph dialogue (NPCs always start with text)
        this.dialogueCard.showMultiParagraphDialogue(
            npcData,
            dialogueData,
            (choice) => this.handleDialogueChoice(choice?.id, choice, npcData),
            playerData,
            () => this.handleDialogueClose()
        );
    }
    
    handleDialogueClose() {
        console.log('[BattleScene] Dialogue closed, resetting state');
        
        // Reset dialogue state
        this.isDialogueActive = false;
        this.dialogueNpcData = null;
        
        // Ensure scene is not paused and input is working
        if (this.scene.isPaused()) {
            this.scene.resume();
        }
        
        console.log('[BattleScene] Dialogue state reset, scene active:', !this.scene.isPaused());
    }
    
    closeDialogue() {
        console.log('[BattleScene] Closing dialogue (cancelled)');
        
        // Hide dialogue card
        if (this.dialogueCard) {
            this.dialogueCard.hide();
        }
        
        // Reset dialogue state
        this.isDialogueActive = false;
        this.dialogueNpcData = null;
        
        // Set input cooldown to prevent key bleed-through
        this.dialogueInputCooldown = 300; // 300ms cooldown
        console.log('[BattleScene] Set dialogue input cooldown: 300ms');
        
        console.log('[BattleScene] Dialogue closed, battle resumed');
    }
    
    handleMultiParagraphComplete(npcData, dialogueData) {
        console.log('[BattleScene] Multi-paragraph dialogue completed');
        
        // Reset dialogue state
        this.isDialogueActive = false;
        this.dialogueNpcData = null;
        
        // Set input cooldown to prevent key bleed-through
        this.dialogueInputCooldown = 300; // 300ms cooldown
        console.log('[BattleScene] Set dialogue input cooldown: 300ms');
        
        console.log('[BattleScene] Dialogue completed, battle resumed');
    }
    
    handleDialogueChoice(choiceId, optionData, npcData) {
        console.log('[BattleScene] Dialogue choice received:', choiceId, optionData);
        console.log('[BattleScene] Resetting dialogue state - isDialogueActive was:', this.isDialogueActive);
        
        // Reset dialogue state
        this.isDialogueActive = false;
        this.dialogueNpcData = null;
        
        // Set input cooldown to prevent key bleed-through
        this.dialogueInputCooldown = 300; // 300ms cooldown
        console.log('[BattleScene] Set dialogue input cooldown after choice: 300ms');
        
        console.log('[BattleScene] Dialogue state reset - isDialogueActive now:', this.isDialogueActive);
        
        // Handle the choice
        switch (choiceId) {
            case 'recruit':
                this.handleRecruitment(npcData);
                break;
                
            case 'fight':
                // Continue battle normally
                console.log('[BattleScene] Player chose to fight');
                break;
                
            case 'negotiate_money':
                this.handleMoneyNegotiation(optionData.cost, npcData);
                break;
                
            case 'negotiate_item':
                this.showItemSelectionDialog(optionData.availableItems, optionData.requiredValue, npcData);
                break;
                
            case 'flee':
                this.handleFleeAttempt(npcData);
                break;
        }
    }
    
    handleRecruitment(npcData) {
        console.log('[BattleScene] Handling recruitment for:', npcData.id);
        
        // Get WorldScene's party manager
        const worldScene = this.scene.get('WorldScene');
        if (!worldScene || !worldScene.partyManager) {
            console.error('[BattleScene] Cannot access PartyManager');
            this.showRecruitmentMessage('Error: Cannot recruit at this time', '#ff0000');
            return;
        }
        
        // Attempt recruitment
        const result = worldScene.partyManager.recruitFromBattle(npcData.id);
        
        if (result.success) {
            console.log('[BattleScene] Recruitment successful!');
            
            // IMMEDIATELY remove the recruited NPC from the battle
            const recruitedEnemy = this.enemies.find(e => e.enemyData.id === npcData.id);
            if (recruitedEnemy) {
                console.log('[BattleScene] Removing recruited NPC from battle:', npcData.id);
                
                // Remove range indicator (if it exists)
                const enemyIndex = this.enemies.indexOf(recruitedEnemy);
                if (enemyIndex !== -1 && this.rangeIndicators && this.rangeIndicators[enemyIndex]) {
                    this.rangeIndicators[enemyIndex].destroy();
                    this.rangeIndicators.splice(enemyIndex, 1);
                }
                
                // Remove from BattleAI
                if (this.battleAI) {
                    this.battleAI.removeEnemy(recruitedEnemy);
                }
                
                // Fade out animation
                this.tweens.add({
                    targets: recruitedEnemy,
                    alpha: 0,
                    scale: 0.5,
                    duration: 500,
                    ease: 'Power2.In',
                    onComplete: () => {
                        recruitedEnemy.destroy();
                    }
                });
                
                // Remove from enemies array
                this.enemies = this.enemies.filter(e => e !== recruitedEnemy);
                console.log('[BattleScene] Remaining enemies:', this.enemies.length);
                
                // Check if all enemies are gone - if so, proceed to victory immediately
                if (this.enemies.length === 0) {
                    console.log('[BattleScene] All enemies defeated/recruited - skipping to recruitment victory');
                    this.time.delayedCall(500, () => {
                        this.showRecruitmentVictorySequence(npcData);
                    });
                    return; // Exit early to prevent further processing
                }
            }
            
            // Show special recruitment victory sequence (not regular victory)
            this.time.delayedCall(500, () => {
                this.showRecruitmentVictorySequence(npcData);
            });
        } else {
            console.log('[BattleScene] Recruitment failed:', result.message);
            
            // Show error message
            this.showRecruitmentMessage(result.message, '#ff0000');
        }
    }
    
    showRecruitmentMessage(message, color) {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        
        const messageText = this.add.text(
            centerX,
            centerY - 100,
            message,
            {
                fontSize: '32px',
                fontFamily: 'Arial',
                color: color,
                stroke: '#000000',
                strokeThickness: 4,
                fontStyle: 'bold'
            }
        ).setOrigin(0.5);
        messageText.setDepth(2000);
        
        this.tweens.add({
            targets: messageText,
            alpha: 0,
            y: centerY - 150,
            duration: 2000,
            ease: 'Power2.Out',
            onComplete: () => {
                messageText.destroy();
            }
        });
    }
    
    showRecruitmentVictorySequence(npcData) {
        console.log('[BattleScene] Starting recruitment victory sequence for:', npcData.name);
        
        // Stop battle music and play recruitment tune
        if (this.battleSceneSong && this.battleSceneSong.isPlaying) {
            this.battleSceneSong.playRecruitmentTune();
        }
        
        // Disable input during victory sequence
        this.input.enabled = false;
        this.isVictorySequence = true;
        
        // Center camera on screen center
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        
        // Create dramatic glowing light blue "JOINED PARTY!" text
        const victoryText = this.add.text(
            centerX,
            centerY - 50,
            'JOINED PARTY!',
            {
                fontSize: '96px',
                fontFamily: 'Arial Black, Arial',
                fontStyle: 'bold',
                color: '#00D9FF', // Light blue color
                stroke: '#0066CC', // Darker blue stroke
                strokeThickness: 8,
                shadow: {
                    offsetX: 0,
                    offsetY: 0,
                    color: '#00D9FF',
                    blur: 20,
                    fill: true
                }
            }
        ).setOrigin(0.5).setAlpha(0).setScale(0.5);
        this.textDisplays.push(victoryText);
        
        // Create character name text (instead of XP)
        const characterName = npcData.name || npcData.type;
        const nameText = this.add.text(
            centerX,
            centerY + 50,
            `${characterName} joined your party!`,
            {
                fontSize: '36px',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                color: '#00FF88', // Light green color
                stroke: '#00AA55',
                strokeThickness: 4
            }
        ).setOrigin(0.5).setAlpha(0);
        this.textDisplays.push(nameText);
        
        // Dramatic entrance animation with glowing effect
        this.tweens.add({
            targets: victoryText,
            scale: 1.2,
            alpha: 1,
            duration: 800,
            ease: 'Elastic.Out',
            yoyo: false
        });
        
        // Pulsing glow effect
        this.tweens.add({
            targets: victoryText,
            scaleX: 1.25,
            scaleY: 1.25,
            duration: 1000,
            ease: 'Sine.InOut',
            yoyo: true,
            repeat: 1
        });
        
        // Fade in character name
        this.tweens.add({
            targets: nameText,
            alpha: 1,
            duration: 500,
            delay: 800
        });
        
        // Fade out and exit animation
        this.time.delayedCall(3000, () => {
            this.tweens.add({
                targets: [victoryText, nameText],
                y: '-=50',
                alpha: 0,
                scale: 0.8,
                duration: 1000,
                ease: 'Power2.In',
                onComplete: () => {
                    victoryText.destroy();
                    nameText.destroy();
                    
                    // Create black rectangle for fade out
                    const fadeRect = this.add.rectangle(
                        0, 0,
                        this.cameras.main.width,
                        this.cameras.main.height,
                        0x000000
                    ).setOrigin(0).setDepth(1000);
                    
                    // Fade to black
                    this.tweens.add({
                        targets: fadeRect,
                        alpha: 1,
                        duration: 1000,
                        onComplete: () => {
                            this.handleRecruitmentVictory(npcData);
                        }
                    });
                }
            });
        });
    }
    
    handleRecruitmentVictory(npcData) {
        console.log('[BattleScene] Ending battle after recruitment');
        
        // Stop battle music before transition (recruitment tune already played)
        if (this.battleSceneSong && this.battleSceneSong.isPlaying) {
            this.battleSceneSong.stop();
            console.log('[BattleScene] BattleSceneSong stopped (recruitment transition)');
        }
        
        // Get updated HP states for all party members
        const hpStates = this.getUpdatedPartyHPStates();
        
        // Save player health before leaving battle
        gameStateManager.updatePlayerHealth(this.currentHP);
        console.log(`[BattleScene] Saved player health on recruitment: ${this.currentHP}/${this.maxHP}`);
        
        // Mark as recruited (won't trigger battles anymore)
        const transitionData = {
            battleVictory: true,
            returnPosition: this.worldPosition,
            defeatedNpcIds: [], // Don't mark as defeated, just recruited
            recruitedNpcId: npcData.id,
            transitionType: 'recruitment',
            partyHPStates: hpStates
        };
        
        console.log('[BattleScene] Recruitment transition data:', transitionData);
        
        // Clean up and return to WorldScene
        this.cleanup();
        this.scene.resume('WorldScene', transitionData);
        this.scene.stop();
    }
    
    handleMoneyNegotiation(cost, npcData) {
        const result = dialogueManager.negotiateWithMoney(npcData, cost);
        console.log('[BattleScene] Money negotiation result:', result);
        
        this.showNegotiationResult(result, npcData);
    }
    
    showItemSelectionDialog(availableItems, requiredValue, npcData) {
        // Create item selection dialog
        const itemDialog = document.createElement('div');
        itemDialog.id = 'item-selection-dialog';
        itemDialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10001;
        `;
        
        const dialogBox = document.createElement('div');
        dialogBox.style.cssText = `
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            border: 3px solid gold;
            border-radius: 15px;
            padding: 30px;
            max-width: 500px;
            color: white;
            font-family: Arial, sans-serif;
        `;
        
        dialogBox.innerHTML = `
            <h3 style="color: gold; margin: 0 0 20px 0;">Select Item to Gift</h3>
            <p style="margin-bottom: 20px; font-size: 14px;">
                Required value: ${requiredValue} gold
            </p>
            <div id="item-list"></div>
        `;
        
        const itemList = document.createElement('div');
        itemList.id = 'item-list';
        itemList.style.cssText = 'display: flex; flex-direction: column; gap: 10px;';
        
        availableItems.forEach(item => {
            const itemButton = document.createElement('button');
            itemButton.style.cssText = `
                background: linear-gradient(135deg, #2c3e50, #34495e);
                border: 2px solid #3498db;
                border-radius: 8px;
                padding: 10px;
                color: white;
                cursor: pointer;
                text-align: left;
                transition: all 0.3s;
            `;
            
            itemButton.innerHTML = `
                <div style="font-weight: bold;">${item.name}</div>
                <div style="font-size: 14px; color: #f39c12;">Value: ${item.value} gold</div>
            `;
            
            itemButton.addEventListener('mouseenter', () => {
                itemButton.style.border = '2px solid gold';
            });
            itemButton.addEventListener('mouseleave', () => {
                itemButton.style.border = '2px solid #3498db';
            });
            itemButton.addEventListener('click', () => {
                this.handleItemNegotiation(item.id, npcData);
            });
            
            itemList.appendChild(itemButton);
        });
        
        // Add cancel button
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.cssText = `
            background: #e74c3c;
            border: none;
            border-radius: 8px;
            padding: 10px;
            color: white;
            cursor: pointer;
            margin-top: 20px;
            width: 100%;
        `;
        cancelButton.addEventListener('click', () => {
            itemDialog.remove();
            this.scene.resume();
        });
        
        dialogBox.querySelector('#item-list').replaceWith(itemList);
        dialogBox.appendChild(cancelButton);
        itemDialog.appendChild(dialogBox);
        document.body.appendChild(itemDialog);
    }
    
    handleItemNegotiation(itemId, npcData) {
        const result = dialogueManager.negotiateWithItem(npcData, itemId);
        console.log('[BattleScene] Item negotiation result:', result);
        
        // Remove item dialog
        const itemDialog = document.getElementById('item-selection-dialog');
        if (itemDialog) {
            itemDialog.remove();
        }
        
        this.showNegotiationResult(result, npcData);
    }
    
    handleFleeAttempt(npcData) {
        const result = dialogueManager.attemptFlee(npcData);
        console.log('[BattleScene] Flee attempt result:', result);
        
        this.showFleeResult(result, () => {
            if (result.success) {
                this.returnToWorld();
            } else {
                this.scene.resume();
            }
        });
    }
    
    showNegotiationResult(result, npcData) {
        const resultOverlay = document.createElement('div');
        resultOverlay.id = 'negotiation-result';
        resultOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10002;
        `;
        
        const resultBox = document.createElement('div');
        resultBox.style.cssText = `
            background: linear-gradient(135deg, ${result.success ? '#27ae60' : '#c0392b'}, #2c3e50);
            border: 3px solid ${result.success ? '#2ecc71' : '#e74c3c'};
            border-radius: 15px;
            padding: 30px;
            max-width: 400px;
            color: white;
            font-family: Arial, sans-serif;
            text-align: center;
        `;
        
        resultBox.innerHTML = `
            <h2 style="color: white; margin: 0 0 20px 0;">
                ${result.success ? '✓ Success!' : '✗ Failed'}
            </h2>
            <p style="margin-bottom: 20px; font-size: 16px;">
                ${result.message}
            </p>
            ${result.xpGained ? `<p style="color: cyan; font-size: 14px;">+${result.xpGained} XP</p>` : ''}
            <button id="result-continue" style="
                background: white;
                color: #2c3e50;
                border: none;
                border-radius: 8px;
                padding: 10px 30px;
                font-size: 16px;
                cursor: pointer;
                margin-top: 20px;
            ">Continue</button>
        `;
        
        resultOverlay.appendChild(resultBox);
        document.body.appendChild(resultOverlay);
        
        document.getElementById('result-continue').addEventListener('click', () => {
            resultOverlay.remove();
            
            if (result.success) {
                // Mark enemy as defeated through negotiation
                this.handleNegotiationVictory(npcData);
            } else {
                // Resume battle
                this.scene.resume();
            }
        });
    }
    
    showFleeResult(result, onComplete) {
        const resultOverlay = document.createElement('div');
        resultOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10002;
        `;
        
        const resultBox = document.createElement('div');
        resultBox.style.cssText = `
            background: linear-gradient(135deg, ${result.success ? '#f39c12' : '#c0392b'}, #2c3e50);
            border: 3px solid ${result.success ? '#f1c40f' : '#e74c3c'};
            border-radius: 15px;
            padding: 30px;
            max-width: 400px;
            color: white;
            font-family: Arial, sans-serif;
            text-align: center;
        `;
        
        resultBox.innerHTML = `
            <h2 style="color: white; margin: 0 0 20px 0;">
                ${result.success ? '✓ Escaped!' : '✗ Failed to Escape'}
            </h2>
            <p style="margin-bottom: 20px; font-size: 16px;">
                ${result.message}
            </p>
            <button id="flee-continue" style="
                background: white;
                color: #2c3e50;
                border: none;
                border-radius: 8px;
                padding: 10px 30px;
                font-size: 16px;
                cursor: pointer;
            ">Continue</button>
        `;
        
        resultOverlay.appendChild(resultBox);
        document.body.appendChild(resultOverlay);
        
        document.getElementById('flee-continue').addEventListener('click', () => {
            resultOverlay.remove();
            if (onComplete) onComplete();
        });
    }
    
    handleNegotiationVictory(npcData) {
        console.log('[BattleScene] Negotiation victory with:', npcData.id);
        
        // Find the enemy in the enemies array and mark as defeated
        const enemyIndex = this.enemies.findIndex(e => e.enemyData.id === npcData.id);
        if (enemyIndex !== -1) {
            const enemy = this.enemies[enemyIndex];
            
            // Track as defeated
            if (!this.defeatedEnemyIds.includes(npcData.id)) {
                this.defeatedEnemyIds.push(npcData.id);
                this.defeatedEnemiesData.push({
                    level: npcData.level,
                    type: npcData.type
                });
            }
            
            // Remove enemy from scene
            enemy.destroy();
            this.enemies.splice(enemyIndex, 1);
            
            console.log('[BattleScene] Enemy removed, remaining:', this.enemies.length);
        }
        
        // Check if all enemies defeated
        if (this.enemies.length === 0) {
            this.showVictorySequence();
        } else {
            this.scene.resume();
        }
    }

    returnToWorld() {
        if (this.isReturning) return;
        this.isReturning = true;

        console.log('[BattleScene] Returning to world');
        
        // Stop battle music when escaping
        if (this.battleSceneSong && this.battleSceneSong.isPlaying) {
            this.battleSceneSong.stop();
            console.log('[BattleScene] BattleSceneSong stopped (escaping)');
        }
        
        // Get updated HP states for all party members
        const hpStates = this.getUpdatedPartyHPStates();
        
        // Save player health before leaving battle
        gameStateManager.updatePlayerHealth(this.currentHP);
        console.log(`[BattleScene] Saved player health on escape: ${this.currentHP}/${this.maxHP}`);
        
        // Collect current NPC health data before cleanup
        const updatedNpcHealth = this.enemies.map(enemy => ({
            id: enemy.enemyData.id,
            health: enemy.enemyData.health,
            maxHealth: enemy.enemyData.maxHealth
        }));
        
        console.log('[BattleScene] NPC health on escape:', updatedNpcHealth);
        console.log('[BattleScene] Party HP states on escape:', hpStates);
        
        // Clean up all game objects and physics
        this.cleanup();

        // Create black screen for fade out
        const blackScreen = this.add.graphics();
        blackScreen.fillStyle(0x000000, 0);
        blackScreen.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

        // Fade out animation
        this.tweens.add({
            targets: blackScreen,
            alpha: 1,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                // Resume WorldScene with transition state AND updated NPC health AND party HP states
                this.scene.resume('WorldScene', { 
                    battleVictory: false,
                    returnPosition: this.worldPosition,
                    transitionType: 'escape',
                    updatedNpcHealth: updatedNpcHealth,
                    partyHPStates: hpStates
                });
                this.scene.stop();
            }
        });
    }

    update() {
        const delta = this.game.loop.delta;
        
        // Update gamepad reference
        this.updateGamepad();
        
        // Check for pause with Enter key or Start button (button 9)
        if ((this.enterKey && Phaser.Input.Keyboard.JustDown(this.enterKey)) || this.isGamepadButtonJustPressed(9)) {
            this.toggleGamePause();
            return;
        }
        
        // If paused, don't process any other input
        if (this.isPaused) {
            return;
        }
        
        // Handle dialogue navigation first (if dialogue is active)
        if (this.isDialogueActive) {
            // Dialogue is handled by DialogueCard with U for confirm and ESC for back/cancel
            // No fighting occurs during dialogue - all battle logic is blocked
            return; // Don't process battle logic during dialogue
        }
        
        // Update dialogue input cooldown
        if (this.dialogueInputCooldown > 0) {
            this.dialogueInputCooldown -= delta;
            if (this.dialogueInputCooldown <= 0) {
                this.dialogueInputCooldown = 0;
                console.log('[BattleScene] Dialogue input cooldown expired - inputs ready');
            }
            return; // Block input during cooldown period
        }
        
        // Handle enemy selection mode (separate from normal battle update)
        if (this.isEnemySelectionMode) {
            // Debug: Log once per second instead of every frame
            if (!this.lastEnemySelectionLog || Date.now() - this.lastEnemySelectionLog > 1000) {
                console.log('[BattleScene] update() - in enemy selection mode');
                this.lastEnemySelectionLog = Date.now();
            }
            this.updateEnemySelection();
            return; // Don't process battle logic during enemy selection
        }
        
        if (!this.player || this.enemies.length === 0) return;

        // Update AP system
        this.updateAP(delta);

        // ESC key - multi-function: deselect target (quick tap) or hold to flee (3 seconds)
        if (this.escapeKey) {
            const isEscPressed = this.escapeKey.isDown || this.isGamepadButtonPressed(6);
            
            if (isEscPressed && !this.isHoldingEscape) {
                // ESC just pressed - start hold timer for escape
                this.isHoldingEscape = true;
                this.escapeHoldStartTime = this.time.now;
                this.escapeProgressBarBackground.setVisible(true);
                this.escapeProgressBar.setVisible(true);
                console.log('[BattleScene] ESC hold started - hold for 3 seconds to flee (NPCs can attack while escaping!)');
            } else if (!isEscPressed && this.isHoldingEscape) {
                // ESC released before 3 seconds
                const holdTime = this.time.now - this.escapeHoldStartTime;
                this.isHoldingEscape = false;
                this.escapeProgressBarBackground.setVisible(false);
                this.escapeProgressBar.setVisible(false);
                this.escapeProgressBar.width = 0;
                
                // If released quickly (< 300ms) and in target mode, exit target mode
                if (holdTime < 300 && this.isInTargetMode) {
                    console.log('[BattleScene] ESC quick-tapped - deselecting target');
                    this.exitTargetMode();
                } else {
                    console.log('[BattleScene] ESC released - escape cancelled');
                }
            } else if (isEscPressed && this.isHoldingEscape) {
                // ESC still held - update progress
                const holdTime = this.time.now - this.escapeHoldStartTime;
                const progress = Math.min(holdTime / this.escapeHoldDuration, 1);
                this.escapeProgressBar.width = (300 - 4) * progress; // Max width minus padding
                
                if (holdTime >= this.escapeHoldDuration) {
                    // Held for 3 seconds - flee battle!
                    console.log('[BattleScene] ESC held for 3 seconds - fleeing battle!');
                    this.isHoldingEscape = false;
                    this.escapeProgressBarBackground.setVisible(false);
                    this.escapeProgressBar.setVisible(false);
                    this.returnToWorld();
                    return;
                }
            }
        }

        // Dialogue mode handled by / key in initializeInput

        // Handle AP charging (keyboard = or gamepad Right Stick click - button 11)
        const isRightStickPressed = this.gamepad && this.gamepad.buttons && this.gamepad.buttons[11] && this.gamepad.buttons[11].pressed;
        const isChargingKeyPressed = (this.chargeAPKey && this.chargeAPKey.isDown) || 
                                   (this.chargeAPKeyAlt && this.chargeAPKeyAlt.isDown) ||
                                   isRightStickPressed;
        
        if (isChargingKeyPressed) {
            if (!this.isChargingAP) {
                console.log('[BattleScene] =/Right Stick held - starting AP charge');
                this.isChargingAP = true;
                this.showChargingFeedback();
                // Play AP charge sound
                if (this.battleSceneSFX) {
                    this.battleSceneSFX.startAPCharge();
                }
            }
        } else {
            if (this.isChargingAP) {
                console.log('[BattleScene] =/Right Stick released - stopping AP charge');
                this.isChargingAP = false;
                // Stop AP charge sound
                if (this.battleSceneSFX) {
                    this.battleSceneSFX.stopAPCharge();
                }
            }
        }
        
        // / or M key or Select button - open battle menu (Talk, Items, Skills)
        const isSlashPressed = (this.battleMenuKey && Phaser.Input.Keyboard.JustDown(this.battleMenuKey));
        const isMPressed = (this.battleMenuKeyAlt && Phaser.Input.Keyboard.JustDown(this.battleMenuKeyAlt));
        const isSelectButtonPressed = this.isGamepadButtonJustPressed(8);
        
        if (isSlashPressed || isMPressed || isSelectButtonPressed) {
            console.log('[BattleScene] Battle menu key pressed (/ or M or Select) - opening battle menu');
            this.openBattleMenu();
            return;
        }
        
        // ===== TARGET SELECTION MODE =====
        // Use A/D to move the arrow between enemies, U to confirm
        if (this.isTargetSelectionMode) {
            // A key or D-pad Left - select previous target
            if (Phaser.Input.Keyboard.JustDown(this.leftKey) || this.isGamepadStickLeftJustPressed()) {
                this.selectPreviousTarget();
            }
            
            // D key or D-pad Right - select next target
            if (Phaser.Input.Keyboard.JustDown(this.rightKey) || this.isGamepadStickRightJustPressed()) {
                this.selectNextTarget();
            }
            
            // U key or A button - CONFIRM target selection (enter target mode)
            // IMPORTANT: Only allow if no dialogue cooldown active
            if ((Phaser.Input.Keyboard.JustDown(this.attackKey) || this.isGamepadButtonJustPressed(0)) && this.dialogueInputCooldown <= 0) {
                this.confirmTargetSelection();
            }
        }
        
        // ===== TARGET MODE (JUGGLE COMBAT) =====
        if (this.isInTargetMode) {
            // U key or A button - perform juggle attack
            // IMPORTANT: Only allow if no dialogue cooldown active
            if ((Phaser.Input.Keyboard.JustDown(this.attackKey) || this.isGamepadButtonJustPressed(0)) && this.dialogueInputCooldown <= 0) {
                this.performJuggleAttack();
            }
            
            // Q/E keys or D-pad Left/Right - rotate character (if AP available and party members exist)
            if (this.partyCharacters && this.partyCharacters.length > 0) {
                const rotateAPCost = 1; // Cost 1 AP to rotate character
                
                if (Phaser.Input.Keyboard.JustDown(this.qKey) || this.isGamepadButtonJustPressed(14)) {
                    if (this.currentAP >= rotateAPCost) {
                        this.consumeAP(rotateAPCost);
                        this.rotateCharacter('left');
                        console.log('[BattleScene] Q/D-pad Left pressed - rotated to previous character');
                    } else {
                        this.showNoAPMessage();
                    }
                }
                
                if (Phaser.Input.Keyboard.JustDown(this.eKey) || this.isGamepadButtonJustPressed(15)) {
                    if (this.currentAP >= rotateAPCost) {
                        this.consumeAP(rotateAPCost);
                        this.rotateCharacter('right');
                        console.log('[BattleScene] E/D-pad Right pressed - rotated to next character');
                    } else {
                        this.showNoAPMessage();
                    }
                }
            }
            
            // Update target mode UI
            this.updateTargetModeUI();
        }

        // Update NPC AI - NPCs ONLY act when player is charging AP OR charging escape
        // This creates a risk/reward system: charging AP or escaping allows NPCs to attack
        const isPlayerVulnerable = this.isChargingAP || this.isHoldingEscape;
        
        // Debug log vulnerability state changes
        if (isPlayerVulnerable && !this._wasVulnerable) {
            console.log('[BattleScene] 🔴 Player is now VULNERABLE! NPCs can attack!', {
                chargingAP: this.isChargingAP,
                holdingEscape: this.isHoldingEscape
            });
            this._wasVulnerable = true;
        } else if (!isPlayerVulnerable && this._wasVulnerable) {
            console.log('[BattleScene] 🟢 Player is now SAFE! NPCs are frozen.');
            this._wasVulnerable = false;
        }
        
        if (this.battleAI && this.enemies.length > 0) {
            this.battleAI.update(this.enemies, this.player, delta, isPlayerVulnerable);
        }
        
        // Update enemy displays
        this.updateEnemyDisplays();
        
        // Update party character indicators to follow their characters
        this.updatePartyIndicators();
    }
    
    updatePartyIndicators() {
        // Update player indicator (leader)
        if (this.player && this.player.active && this.playerIndicator) {
            this.playerIndicator.setPosition(
                this.player.x,
                this.player.y - 40
            );
        }
        
        // Update party character indicators
        if (!this.partyCharacters || this.partyCharacters.length === 0) return;
        
        this.partyCharacters.forEach(character => {
            if (character && character.active && character.memberData && character.memberData.indicator) {
                // Position indicator above the character
                character.memberData.indicator.setPosition(
                    character.x,
                    character.y - 40
                );
            }
        });
    }
    
    // NOTE: All AI functions have been moved to BattleAI.js
    // The following functions are now handled by BattleAI module:
    // - findClosestPartyMember
    // - updateNPCMovement (replaced by BattleAI.update())
    // - canNPCDoRangedAttack
    // - getNPCAttackRange
    // - updateNPCIdleState
    // - updateNPCCombatState
    // - updateNPCDefensiveState
    // - performNPCMeleeAttack
    // - performNPCRangedAttack
    
    // NOTE: All AI functions have been moved to BattleAI.js
    // The following legacy functions are kept for reference but are no longer used:
    // - updateNPCMovement (replaced by BattleAI.update())
    // - canNPCDoRangedAttack (now in BattleAI.js)
    // - getNPCAttackRange (now in BattleAI.js)
    // - updateNPCIdleState (now in BattleAI.js)
    // - updateNPCCombatState (now in BattleAI.js)
    // - updateNPCDefensiveState (now in BattleAI.js)
    // - performNPCMeleeAttack (now in BattleAI.js)
    // - performNPCRangedAttack (now in BattleAI.js)
    
    // All NPC AI is now handled by BattleAI.update() in the update() loop
    
    handleCharacterDowned(character, isPlayer = false) {
        const characterName = isPlayer ? 'Player' : (character.memberData?.name || 'Character');
        console.log(`[BattleScene] ${characterName} has been downed!`);
        
        // Mark as downed
        if (isPlayer) {
            this.isPlayerDowned = true;
        } else if (character.memberData) {
            character.memberData.isDowned = true;
        }
        
        // Visual feedback: 50% opacity and immobile
        character.setAlpha(0.5);
        
        // Stop movement
        if (character.body) {
            character.body.setVelocity(0, 0);
            character.body.setImmovable(true);
        }
        
        // Display "DOWNED" text above character
        const downedText = this.add.text(
            character.x,
            character.y - 60,
            'DOWNED',
            {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: '#ff4444',
                stroke: '#000000',
                strokeThickness: 3,
                fontStyle: 'bold'
            }
        ).setOrigin(0.5).setAlpha(0);
        
        this.tweens.add({
            targets: downedText,
            alpha: 1,
            y: character.y - 70,
            duration: 500,
            ease: 'Power2'
        });
        
        // Store text reference for cleanup
        if (isPlayer) {
            this.playerDownedText = downedText;
        } else if (character.memberData) {
            character.memberData.downedText = downedText;
        }
        
        // Check if entire party is defeated
        this.checkPartyDefeat();
    }
    
    checkPartyDefeat() {
        console.log('[BattleScene] Checking party defeat status...');
        
        // Count alive party members (including player)
        let aliveCount = this.isPlayerDowned ? 0 : 1;
        
        if (this.partyCharacters && this.partyCharacters.length > 0) {
            this.partyCharacters.forEach(character => {
                if (character.active && character.memberData && !character.memberData.isDowned) {
                    aliveCount++;
                }
            });
        }
        
        console.log(`[BattleScene] Alive party members: ${aliveCount}`);
        
        if (aliveCount === 0) {
            // All party members defeated - trigger game over
            this.handlePartyDefeat();
        } else {
            console.log(`[BattleScene] Battle continues with ${aliveCount} alive member(s)`);
        }
    }
    
    handlePartyDefeat() {
        console.log('[BattleScene] ========== PARTY DEFEATED ==========');
        console.log('[BattleScene] All party members have been downed!');
        
        // Stop all actions
        this.isPlayerTurn = false;
        
        // Stop all NPC movement
        if (this.npcMovementData) {
            this.npcMovementData.forEach((movementData, npc) => {
                if (npc && npc.active && npc.body) {
                    npc.body.setVelocityX(0);
                    movementData.isMoving = false;
                }
            });
        }
        
        // Display defeat message
        const defeatText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY - 100,
            'PARTY DEFEATED',
            {
                fontSize: '64px',
                fontFamily: 'Arial',
                color: '#ff0000',
                stroke: '#000000',
                strokeThickness: 8,
                fontStyle: 'bold'
            }
        ).setOrigin(0.5).setAlpha(0);
        
        defeatText.setDepth(10000);
        
        this.tweens.add({
            targets: defeatText,
            alpha: 1,
            duration: 500,
            ease: 'Power2'
        });
        
        // Display sub-message
        const subText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            'Returning to Start...',
            {
                fontSize: '24px',
                fontFamily: 'Arial',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5).setAlpha(0);
        
        subText.setDepth(10000);
        
        this.tweens.add({
            targets: subText,
            alpha: 1,
            duration: 500,
            delay: 500,
            ease: 'Power2'
        });
        
        // Return to StartScene after delay (game over)
        this.time.delayedCall(3000, () => {
            console.log('[BattleScene] Game Over - Returning to StartScene');
            this.cleanup();
            
            // Stop WorldScene (it was paused, not stopped)
            this.scene.stop('WorldScene');
            
            // Start fresh StartScene
            this.scene.start('StartScene');
        });
    }
    
    handlePlayerDefeat() {
        // Legacy method - redirect to new system
        console.log('[BattleScene] Player defeated - using new party defeat system');
        this.handleCharacterDowned(this.player, true);
    }
    
    updateRangeIndicators() {
        if (!this.player || !this.enemies || this.rangeIndicators.length === 0) return;
        
        // Update each indicator
        this.enemies.forEach((enemy, index) => {
            if (!enemy || !enemy.active) return;
            
            const indicator = this.rangeIndicators[index];
            if (!indicator) return;
            
            // Position indicator at enemy location
            indicator.setPosition(enemy.x, enemy.y);
            
            // Calculate distance to player
            const distance = Phaser.Math.Distance.Between(
                this.player.x,
                this.player.y,
                enemy.x,
                enemy.y
            );
            
            // Show/fade indicator based on distance
            // Attack is possible when yellow circle appears (distance <= maxMeleeDistance)
            if (distance <= this.rangeIndicatorRadius) {
                // Optimal range - show bright pulsing green (inside the circle)
                const pulseAlpha = 0.5 + Math.sin(this.time.now / 150) * 0.3;
                const pulseWidth = 5 + Math.sin(this.time.now / 150) * 1.5;
                indicator.setStrokeStyle(pulseWidth, 0x00ff00, pulseAlpha);
            } else if (distance <= this.maxMeleeDistance) {
                // Attack range active - show pulsing yellow/gold (extended range)
                const pulseAlpha = 0.35 + Math.sin(this.time.now / 200) * 0.2;
                const pulseWidth = 4 + Math.sin(this.time.now / 200) * 1;
                indicator.setStrokeStyle(pulseWidth, 0xffff00, pulseAlpha);
            } else if (distance <= this.maxMeleeDistance * 1.2) {
                // Getting close - faint orange warning
                indicator.setStrokeStyle(2, 0xffaa00, 0.2);
            } else {
                // Too far - hide completely
                indicator.setStrokeStyle(0, 0x00ff00, 0);
            }
        });
    }
    
    handleFaceButtonInput() {
        // Handle U key or A button (Player melee combo attack)
        if (Phaser.Input.Keyboard.JustDown(this.faceButtons.u) || this.isGamepadButtonJustPressed(0)) {
            console.log('[BattleScene] U pressed - Player melee combo attack');
            this.performMeleeComboAttack();
        }
        
        // Handle I key or B button (Party Member 1 ability - if exists)
        if (Phaser.Input.Keyboard.JustDown(this.faceButtons.i) || this.isGamepadButtonJustPressed(1)) {
            if (this.partyCharacters[0]) {
                console.log('[BattleScene] I pressed - Party Member 1 ability');
                this.executePartyMemberAbility(0);
            } else {
                console.log('[BattleScene] I pressed - No party member in slot 1');
            }
        }
        
        // Handle O key or X button (Party Member 2 ability - if exists)
        if (Phaser.Input.Keyboard.JustDown(this.faceButtons.o) || this.isGamepadButtonJustPressed(2)) {
            if (this.partyCharacters[1]) {
                console.log('[BattleScene] O pressed - Party Member 2 ability');
                this.executePartyMemberAbility(1);
            } else {
                console.log('[BattleScene] O pressed - No party member in slot 2');
            }
        }
        
        // Handle P key or Y button (Party Member 3 ability - if exists)
        if (Phaser.Input.Keyboard.JustDown(this.faceButtons.p) || this.isGamepadButtonJustPressed(3)) {
            if (this.partyCharacters[2]) {
                console.log('[BattleScene] P pressed - Party Member 3 ability');
                this.executePartyMemberAbility(2);
            } else {
                console.log('[BattleScene] P pressed - No party member in slot 3');
            }
        }
    }
    
    /**
     * Update gamepad reference from global
     */
    updateGamepad() {
        if (window.getGlobalGamepad) {
            const pad = window.getGlobalGamepad();
            if (pad && pad.connected) {
                this.gamepad = pad;
                
                // Debug: Log gamepad state periodically (every 2 seconds)
                if (!this.lastGamepadDebug || Date.now() - this.lastGamepadDebug > 2000) {
                    // Check for any pressed buttons
                    const pressedButtons = [];
                    for (let i = 0; i < Math.min(pad.buttons.length, 17); i++) {
                        if (pad.buttons[i].pressed || pad.buttons[i].value > 0.5) {
                            pressedButtons.push(i);
                        }
                    }
                    
                    // Check stick movement
                    const leftX = (pad.axes[0] || 0).toFixed(2);
                    const leftY = (pad.axes[1] || 0).toFixed(2);
                    const stickMoved = Math.abs(pad.axes[0]) > 0.1 || Math.abs(pad.axes[1]) > 0.1;
                    
                    if (pressedButtons.length > 0 || stickMoved) {
                        console.log('[BattleScene] Gamepad active:', {
                            buttons: pressedButtons,
                            leftStick: { x: leftX, y: leftY }
                        });
                    }
                    
                    this.lastGamepadDebug = Date.now();
                }
            } else if (this.gamepad && !this.gamepad.connected) {
                this.gamepad = null;
            }
        } else {
            // Fallback: try to get gamepad directly from browser API
            try {
                const gamepads = navigator.getGamepads();
                if (gamepads && gamepads.length > 0) {
                    for (let i = 0; i < gamepads.length; i++) {
                        const pad = gamepads[i];
                        if (pad && pad.connected) {
                            this.gamepad = pad;
                            if (!this.gamepadFallbackLogged) {
                                console.log('[BattleScene] Using fallback gamepad access:', pad.id);
                                this.gamepadFallbackLogged = true;
                            }
                            break;
                        }
                    }
                }
            } catch (e) {
                // Ignore
            }
        }
    }
    
    /**
     * Check if gamepad button is currently pressed
     */
    isGamepadButtonPressed(buttonIndex) {
        if (!this.gamepad || !this.gamepad.buttons) return false;
        const button = this.gamepad.buttons[buttonIndex];
        return button && (button.pressed || button.value > 0.5);
    }
    
    /**
     * Check if gamepad button was just pressed (first frame)
     */
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
        
        const justPressed = isPressed && !wasPressed;
        if (justPressed) {
            console.log('[BattleScene] Gamepad button just pressed:', buttonIndex);
        }
        
        return justPressed;
    }
    
    /**
     * Check if left stick is moved left
     */
    isGamepadStickLeft() {
        if (!this.gamepad || !this.gamepad.axes) return false;
        const axisX = this.gamepad.axes[0] || 0;
        const isLeft = axisX < -0.3;
        
        // Debug once
        if (isLeft && !this.stickLeftLogged) {
            console.log('[BattleScene] Left stick moved left:', axisX.toFixed(2));
            this.stickLeftLogged = true;
            setTimeout(() => { this.stickLeftLogged = false; }, 1000);
        }
        
        return isLeft;
    }
    
    /**
     * Check if left stick is moved right
     */
    isGamepadStickRight() {
        if (!this.gamepad || !this.gamepad.axes) return false;
        const axisX = this.gamepad.axes[0] || 0;
        return axisX > 0.3;
    }
    
    /**
     * Check if left stick is moved up
     */
    isGamepadStickUp() {
        if (!this.gamepad || !this.gamepad.axes) return false;
        const axisY = this.gamepad.axes[1] || 0;
        return axisY < -0.3;
    }
    
    /**
     * Check if left stick is moved down
     */
    isGamepadStickDown() {
        if (!this.gamepad || !this.gamepad.axes) return false;
        const axisY = this.gamepad.axes[1] || 0;
        return axisY > 0.3;
    }
    
    /**
     * Check if left stick was just pressed left (for target selection)
     */
    isGamepadStickLeftJustPressed() {
        if (!this.gamepad || !this.gamepad.axes) return false;
        const axisX = this.gamepad.axes[0] || 0;
        const isLeft = axisX < -0.3;
        const wasLeft = this.lastStickLeftState || false;
        
        this.lastStickLeftState = isLeft;
        return isLeft && !wasLeft;
    }
    
    /**
     * Check if left stick was just pressed right (for target selection)
     */
    isGamepadStickRightJustPressed() {
        if (!this.gamepad || !this.gamepad.axes) return false;
        const axisX = this.gamepad.axes[0] || 0;
        const isRight = axisX > 0.3;
        const wasRight = this.lastStickRightState || false;
        
        this.lastStickRightState = isRight;
        return isRight && !wasRight;
    }
    
    showNoAPFeedback() {
        // Show feedback when trying to use abilities without AP
        if (this.currentAP <= 0) {
            console.log('[BattleScene] No AP available for action');
            this.showNoAPMessage();
        }
    }
    
    showNoAPMessage() {
        // Create temporary text showing no AP
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        
        const noAPText = this.add.text(
            centerX,
            centerY - 100,
            'NO AP!',
            {
                fontSize: '32px',
                fontFamily: 'Arial',
                color: '#FF4444',
                stroke: '#000000',
                strokeThickness: 3
            }
        );
        noAPText.setOrigin(0.5);
        noAPText.setDepth(1000);
        
        // Animate in and out
        this.tweens.add({
            targets: noAPText,
            alpha: 0,
            y: centerY - 150,
            duration: 1000,
            ease: 'Power2.Out',
            onComplete: () => {
                noAPText.destroy();
            }
        });
    }
    
    showChargingFeedback() {
        // Create temporary text showing charging
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        
        const chargingText = this.add.text(
            centerX,
            centerY - 100,
            'CHARGING AP...',
            {
                fontSize: '24px',
                fontFamily: 'Arial',
                color: '#00FF00',
                stroke: '#000000',
                strokeThickness: 3
            }
        );
        chargingText.setOrigin(0.5);
        chargingText.setDepth(1000);
        
        // Animate in and out
        this.tweens.add({
            targets: chargingText,
            alpha: 0,
            y: centerY - 150,
            duration: 2000,
            ease: 'Power2.Out',
            onComplete: () => {
                chargingText.destroy();
            }
        });
    }
    
    performMeleeComboAttack() {
        // Check if can perform combo attack
        if (!this.canCombo) {
            console.log('[BattleScene] Combo on cooldown');
            return;
        }
        
        // Check if enough AP for attack
        if (this.currentAP < this.meleeAPCost) {
            console.log('[BattleScene] Not enough AP for melee attack');
            this.showNoAPMessage();
            return;
        }
        
        // Find closest enemy
        const closestEnemy = this.findClosestEnemy();
        if (!closestEnemy) {
            console.log('[BattleScene] No enemies to attack');
            return;
        }
        
        // Check distance to closest enemy
        const distance = Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            closestEnemy.x,
            closestEnemy.y
        );
        
        if (distance > this.maxMeleeDistance) {
            const rangeDeficit = Math.floor(distance - this.maxMeleeDistance);
            console.log(`[BattleScene] Enemy too far for melee attack (distance: ${Math.floor(distance)}, max: ${this.maxMeleeDistance}, need ${rangeDeficit} closer)`);
            this.showOutOfRangeMessage();
            return;
        }
        
        // Log attack range status
        if (distance <= this.rangeIndicatorRadius) {
            console.log(`[BattleScene] ⚔️ OPTIMAL RANGE (Green)! Distance: ${Math.floor(distance)}/${this.rangeIndicatorRadius}`);
        } else if (distance <= this.maxMeleeDistance) {
            console.log(`[BattleScene] ⚔️ EXTENDED RANGE (Yellow)! Distance: ${Math.floor(distance)}/${this.maxMeleeDistance}`);
        }
        
        // Check if within combo window
        const currentTime = this.time.now;
        const timeSinceLastHit = currentTime - this.lastComboTime;
        
        if (timeSinceLastHit > this.comboWindow) {
            // Reset combo count if outside window
            this.comboCount = 0;
        }
        
        // Increment combo counter
        this.comboCount++;
        this.lastComboTime = currentTime;
        
        console.log(`[BattleScene] Combo Hit ${this.comboCount}! Distance: ${Math.floor(distance)}, AP cost: ${this.meleeAPCost}`);
        
        // Consume AP for attack
        this.consumeAP(this.meleeAPCost);
        
        // Perform the attack with combo multiplier
        this.executeMeleeCombo(closestEnemy, this.comboCount);
        
        // Set cooldown before next attack
        this.canCombo = false;
        this.time.delayedCall(this.comboCooldown, () => {
            this.canCombo = true;
        });
    }
    
    executeMeleeCombo(enemy, comboHit) {
        // Calculate damage with combo multiplier (each hit in combo does slightly more)
        const baseDamage = 15;
        const comboMultiplier = 1 + (comboHit - 1) * 0.1; // +10% per combo hit
        const damage = Math.floor(baseDamage * comboMultiplier);
        
        console.log(`[BattleScene] Executing combo hit ${comboHit} for ${damage} damage (${comboMultiplier.toFixed(1)}x)`);
        
        // Play attack sound
        if (this.battleSceneSFX) {
            this.battleSceneSFX.playAttack();
        } else {
            soundManager.playAttack(); // Fallback
        }
        
        // Determine attack direction
        const isPlayerRightOfEnemy = this.player.x > enemy.x;
        const attackOffset = isPlayerRightOfEnemy ? -this.attackOffset : this.attackOffset;
        
        // Create attack hitbox with combo visual
        const attackX = this.player.x + attackOffset;
        const attackY = this.player.y;
        
        // Different colors for different combo levels
        const comboColors = [0xFFFFFF, 0xFFFF00, 0xFF9900, 0xFF0000, 0xFF00FF];
        const attackColor = comboColors[Math.min(comboHit - 1, comboColors.length - 1)];
        
        const attackSprite = this.add.rectangle(
            attackX,
            attackY,
            this.attackWidth * (1 + comboHit * 0.1), // Slightly larger with each combo
            this.attackHeight,
            attackColor
        );
        
        this.physics.add.existing(attackSprite);
        attackSprite.body.setAllowGravity(false);
        
        // Apply knockback
        const knockbackForce = 300 + (comboHit * 50); // More knockback with combo
        const knockbackX = isPlayerRightOfEnemy ? -knockbackForce : knockbackForce;
        
        enemy.body.setVelocityX(knockbackX);
        if (enemy.body.touching.down) {
            enemy.body.setVelocityY(-150 - (comboHit * 20));
        }
        
        // Apply damage
        enemy.enemyData.health = Math.max(0, enemy.enemyData.health - damage);
        
        // Alert BattleAI that enemy has been attacked (triggers combat mode)
        if (this.battleAI) {
            this.battleAI.markEnemyAttacked(enemy);
        }
        
        // Legacy: Also update npcMovementData for backward compatibility
        if (this.npcMovementData.has(enemy)) {
            const npcData = this.npcMovementData.get(enemy);
            if (!npcData.hasBeenAttacked) {
                npcData.hasBeenAttacked = true;
                console.log(`[NPC AI] ${enemy.enemyData.type} has been attacked by player - entering combat mode!`);
            }
        }
        
        // Visual feedback with combo-specific color
        const originalColor = enemy.enemyData.color;
        enemy.setFillStyle(attackColor);
        this.time.delayedCall(100, () => {
            if (enemy && enemy.active) {
                enemy.setFillStyle(originalColor);
            }
        });
        
        // Show combo counter text
        this.showComboText(comboHit, damage);
        
        // Check for defeat
        if (enemy.enemyData.health <= 0) {
            console.log(`[BattleScene] Enemy defeated with ${comboHit}-hit combo!`);
            this.handleEnemyDefeat(enemy);
        }
        
        // Remove attack sprite
        this.time.delayedCall(this.attackDuration, () => {
            if (attackSprite && attackSprite.active) {
                attackSprite.destroy();
            }
        });
    }
    
    showComboText(comboHit, damage) {
        const centerX = this.player.x;
        const centerY = this.player.y - 100;
        
        let comboText = '';
        let textColor = '#FFFFFF';
        
        if (comboHit === 1) {
            comboText = `HIT! ${damage}`;
            textColor = '#FFFFFF';
        } else if (comboHit === 2) {
            comboText = `${comboHit} COMBO! ${damage}`;
            textColor = '#FFFF00';
        } else if (comboHit === 3) {
            comboText = `${comboHit} COMBO!! ${damage}`;
            textColor = '#FF9900';
        } else if (comboHit >= 4) {
            comboText = `${comboHit} COMBO!!! ${damage}`;
            textColor = '#FF00FF';
        }
        
        const comboDisplay = this.add.text(
            centerX,
            centerY,
            comboText,
            {
                fontSize: `${24 + (comboHit * 4)}px`,
                fontFamily: 'Arial',
                fontStyle: 'bold',
                color: textColor,
                stroke: '#000000',
                strokeThickness: 3
            }
        );
        comboDisplay.setOrigin(0.5);
        comboDisplay.setDepth(1000);
        
        // Animate
        this.tweens.add({
            targets: comboDisplay,
            y: centerY - 50,
            alpha: 0,
            scale: 1.5,
            duration: 600,
            ease: 'Power2.Out',
            onComplete: () => {
                comboDisplay.destroy();
            }
        });
    }
    
    showOutOfRangeMessage() {
        const centerX = this.player.x;
        const centerY = this.player.y - 80;
        
        const rangeText = this.add.text(
            centerX,
            centerY,
            'OUT OF RANGE!',
            {
                fontSize: '24px',
                fontFamily: 'Arial',
                color: '#FF4444',
                stroke: '#000000',
                strokeThickness: 3
            }
        );
        rangeText.setOrigin(0.5);
        rangeText.setDepth(1000);
        
        this.tweens.add({
            targets: rangeText,
            alpha: 0,
            y: centerY - 40,
            duration: 800,
            ease: 'Power2.Out',
            onComplete: () => {
                rangeText.destroy();
            }
        });
    }
    
    executePartyMemberAbility(memberIndex) {
        const character = this.partyCharacters[memberIndex];
        if (!character || !character.active) {
            console.log(`[BattleScene] Party member ${memberIndex} not available`);
            return;
        }
        
        const memberData = character.memberData;
        const abilityAPCost = 5; // AP cost for party member abilities
        
        // Check if enough AP
        if (this.currentAP < abilityAPCost) {
            console.log(`[BattleScene] Not enough AP for ${memberData.name}'s ability`);
            this.showNoAPMessage();
            return;
        }
        
        // Find closest enemy
        const closestEnemy = this.findClosestEnemy();
        if (!closestEnemy) {
            console.log('[BattleScene] No enemies to target');
            return;
        }
        
        // Consume AP
        this.consumeAP(abilityAPCost);
        
        console.log(`[BattleScene] ${memberData.name} using ability!`);
        
        // Perform ability based on character
        const damage = memberData.stats.attack || 15;
        
        // Create projectile from party member to enemy
        const projectile = this.add.rectangle(
            character.x,
            character.y,
            20,
            20,
            memberData.indicatorColor
        );
        
        this.physics.add.existing(projectile);
        projectile.body.setAllowGravity(false);
        
        // Calculate direction to enemy
        const angle = Phaser.Math.Angle.Between(
            character.x, character.y,
            closestEnemy.x, closestEnemy.y
        );
        
        // Move projectile toward enemy
        const projectileSpeed = 500;
        projectile.body.setVelocity(
            Math.cos(angle) * projectileSpeed,
            Math.sin(angle) * projectileSpeed
        );
        
        // Add collision with enemies
        const overlapCollider = this.physics.add.overlap(projectile, closestEnemy, () => {
            console.log(`[BattleScene] ${memberData.name}'s attack hit!`);
            
            // Apply damage
            this.applyDamageToEnemy(closestEnemy, damage);
            
            // Show damage text
            const damageText = this.add.text(
                closestEnemy.x,
                closestEnemy.y - 60,
                `-${damage}`,
                {
                    fontSize: '24px',
                    fontFamily: 'Arial',
                    color: '#' + memberData.indicatorColor.toString(16).padStart(6, '0'),
                    stroke: '#000000',
                    strokeThickness: 3,
                    fontStyle: 'bold'
                }
            ).setOrigin(0.5);
            
            this.tweens.add({
                targets: damageText,
                y: closestEnemy.y - 100,
                alpha: 0,
                duration: 800,
                ease: 'Power2',
                onComplete: () => {
                    damageText.destroy();
                }
            });
            
            // Destroy projectile
            projectile.destroy();
            overlapCollider.destroy();
        });
        
        // Remove projectile after 2 seconds if it doesn't hit
        this.time.delayedCall(2000, () => {
            if (projectile && projectile.active) {
                projectile.destroy();
                if (overlapCollider) overlapCollider.destroy();
            }
        });
        
        // Show ability name
        const abilityText = this.add.text(
            character.x,
            character.y - 80,
            memberData.name,
            {
                fontSize: '18px',
                fontFamily: 'Arial',
                color: '#' + memberData.indicatorColor.toString(16).padStart(6, '0'),
                stroke: '#000000',
                strokeThickness: 2,
                fontStyle: 'bold'
            }
        ).setOrigin(0.5);
        
        this.tweens.add({
            targets: abilityText,
            alpha: 0,
            y: character.y - 120,
            duration: 1000,
            ease: 'Power2.Out',
            onComplete: () => {
                abilityText.destroy();
            }
        });
    }
    
    executeCharacterAbility(characterIndex, abilityType) {
        // Check if character exists
        if (characterIndex >= this.partyMembers.length) {
            console.log(`[BattleScene] Character ${characterIndex} not available`);
            return;
        }
        
        const character = this.partyMembers[characterIndex];
        const ability = this.characterAbilities[abilityType];
        
        if (!ability) {
            console.log(`[BattleScene] Ability ${abilityType} not found`);
            return;
        }
        
        // Check if enough AP
        if (!this.consumeAP(ability.apCost)) {
            console.log(`[BattleScene] Not enough AP for ${abilityType}`);
            this.showNoAPMessage();
            return;
        }
        
        console.log(`[BattleScene] Executing ${abilityType} with ${character.name}`);
        
        // Execute the ability
        this.performCharacterAbility(character, abilityType, ability);
        
        // Trigger enemy turn after player action
        this.triggerEnemyTurn();
    }
    
    performCharacterAbility(character, abilityType, ability) {
        // Find closest enemy for targeting
        const closestEnemy = this.findClosestEnemy();
        if (!closestEnemy) {
            console.log('[BattleScene] No enemies to target');
            return;
        }
        
        // Create attack based on ability type
        switch (abilityType) {
            case 'basicAttack':
                this.performBasicAttack(character, closestEnemy, ability);
                break;
            case 'specialAttack':
                this.performSpecialAttack(character, closestEnemy, ability);
                break;
            case 'spell':
                this.performSpell(character, closestEnemy, ability);
                break;
            case 'item':
                this.performItemUse(character, ability);
                break;
        }
    }
    
    performBasicAttack(character, target, ability) {
        console.log(`[BattleScene] ${character.name} performs basic attack on ${target.enemyData.type}`);
        
        // Create attack hitbox
        const attackX = this.player.x;
        const attackY = this.player.y;
        
        const attackSprite = this.add.rectangle(
            attackX,
            attackY,
            this.attackWidth,
            this.attackHeight,
            0xFFFFFF
        );
        
        this.physics.add.existing(attackSprite);
        attackSprite.body.setAllowGravity(false);
        
        // Apply damage to target
        this.applyDamageToEnemy(target, ability.damage);
        
        // Remove attack after duration
        this.time.delayedCall(this.attackDuration, () => {
            attackSprite.destroy();
        });
    }
    
    performSpecialAttack(character, target, ability) {
        console.log(`[BattleScene] ${character.name} performs special attack on ${target.enemyData.type}`);
        
        // Create projectile
        const projectile = this.add.rectangle(
            this.player.x,
            this.player.y,
            this.projectileSize,
            this.projectileSize,
            0xff0000
        );
        
        this.physics.add.existing(projectile);
        projectile.body.setAllowGravity(false);
        
        // Move projectile toward target
        const direction = target.x > this.player.x ? 1 : -1;
        projectile.body.setVelocityX(this.projectileSpeed * direction);
        
        // Apply damage on hit
        this.physics.add.overlap(projectile, target, () => {
            this.applyDamageToEnemy(target, ability.damage);
            projectile.destroy();
        });
        
        // Remove projectile after duration
        this.time.delayedCall(this.secondaryAttackDuration, () => {
            if (projectile && projectile.active) {
                projectile.destroy();
            }
        });
    }
    
    performSpell(character, target, ability) {
        console.log(`[BattleScene] ${character.name} casts spell on ${target.enemyData.type}`);
        
        // Create magical projectile
        const spell = this.add.rectangle(
            this.player.x,
            this.player.y,
            this.projectileSize * 1.5,
            this.projectileSize * 1.5,
            0x00ff00
        );
        
        this.physics.add.existing(spell);
        spell.body.setAllowGravity(false);
        
        // Move spell toward target
        const direction = target.x > this.player.x ? 1 : -1;
        spell.body.setVelocityX(this.projectileSpeed * direction);
        
        // Apply damage on hit
        this.physics.add.overlap(spell, target, () => {
            this.applyDamageToEnemy(target, ability.damage);
            spell.destroy();
        });
        
        // Remove spell after duration
        this.time.delayedCall(this.secondaryAttackDuration, () => {
            if (spell && spell.active) {
                spell.destroy();
            }
        });
    }
    
    performItemUse(character, ability) {
        console.log(`[BattleScene] ${character.name} uses item`);
        // Item usage logic would go here
        // No automatic AP gain from item usage
    }
    
    applyDamageToEnemy(enemy, damage) {
        console.log(`[BattleScene] Applying ${damage} damage to ${enemy.enemyData.type}`);
        
        // Play hit sound
        if (this.battleSceneSFX) {
            this.battleSceneSFX.playHit();
        } else {
            soundManager.playHit(); // Fallback
        }
        
        enemy.enemyData.health = Math.max(0, enemy.enemyData.health - damage);
        
        // Alert BattleAI that enemy has been attacked (triggers combat mode)
        if (this.battleAI) {
            this.battleAI.markEnemyAttacked(enemy);
        }
        
        // Visual feedback
        const originalColor = enemy.enemyData.color;
        enemy.setFillStyle(0xffff00);
        this.time.delayedCall(100, () => {
            enemy.setFillStyle(originalColor);
        });
        
        // Check for defeat
        if (enemy.enemyData.health <= 0) {
            console.log(`[BattleScene] ${enemy.enemyData.type} defeated`);
            this.handleEnemyDefeat(enemy);
        }
        
        // No automatic AP gain from hitting enemies
    }
    
    triggerEnemyTurn() {
        // Prevent triggering enemy turn if already in enemy phase or if no enemies
        if (this.turnPhase === 'enemy' || this.enemies.length === 0) {
            return;
        }
        
        console.log('[BattleScene] Triggering enemy turn');
        this.isPlayerTurn = false;
        this.turnPhase = 'enemy';
        
        // Clear any existing enemy action queue and timeout
        this.enemyActionQueue = [];
        if (this.enemyTurnTimeout) {
            this.time.removeEvent(this.enemyTurnTimeout);
            this.enemyTurnTimeout = null;
        }
        
        // Queue enemy actions
        this.enemies.forEach(enemy => {
            if (enemy && enemy.active && enemy.enemyData.health > 0) {
                this.enemyActionQueue.push({
                    enemy: enemy,
                    action: this.getEnemyAction(enemy),
                    delay: Math.random() * 500 + 500 // 500-1000ms delay
                });
            }
        });
        
        // Set a timeout to force return to player turn (safety mechanism)
        this.enemyTurnTimeout = this.time.delayedCall(5000, () => {
            console.log('[BattleScene] Enemy turn timeout - forcing return to player turn');
            this.isPlayerTurn = true;
            this.turnPhase = 'action';
            this.enemyActionQueue = [];
        });
        
        // Execute enemy actions
        this.executeEnemyActions();
    }
    
    getEnemyAction(enemy) {
        const npcType = enemy.enemyData.type;
        
        switch (npcType) {
            case 'GUARD':
                return Math.random() > 0.5 ? 'melee' : 'projectile';
            case 'MERCHANT':
                return 'projectile'; // Merchants only use projectiles
            case 'VILLAGER':
                return 'melee'; // Villagers only use melee
            default:
                return 'melee';
        }
    }
    
    executeEnemyActions() {
        if (this.enemyActionQueue.length === 0) {
            // All enemy actions complete, return to player turn
            this.isPlayerTurn = true;
            this.turnPhase = 'action';
            
            // Clear the timeout since we completed normally
            if (this.enemyTurnTimeout) {
                this.time.removeEvent(this.enemyTurnTimeout);
                this.enemyTurnTimeout = null;
            }
            
            console.log('[BattleScene] Enemy turn complete, returning to player turn');
            return;
        }
        
        const action = this.enemyActionQueue.shift();
        
        // Add safety check to prevent infinite loops
        if (!action || !action.enemy || !action.enemy.active) {
            console.log('[BattleScene] Invalid enemy action, skipping');
            this.executeEnemyActions(); // Continue with next action
            return;
        }
        
        this.time.delayedCall(action.delay, () => {
            // Double-check enemy is still valid before performing action
            if (action.enemy && action.enemy.active && action.enemy.enemyData.health > 0) {
                this.performEnemyAction(action.enemy, action.action);
            }
            this.executeEnemyActions(); // Continue with next action
        });
    }
    
    performEnemyAction(enemy, actionType) {
        console.log(`[BattleScene] ${enemy.enemyData.type} performs ${actionType} action`);
        
        const damage = this.getEnemyDamage(enemy.enemyData.type, actionType);
        
        if (actionType === 'melee') {
            this.performEnemyMeleeAttack(enemy, damage);
        } else if (actionType === 'projectile') {
            this.performEnemyProjectileAttack(enemy, damage);
        }
    }
    
    getEnemyDamage(npcType, actionType) {
        const baseDamage = {
            'GUARD': 25,
            'MERCHANT': 15,
            'VILLAGER': 10
        };
        
        return baseDamage[npcType] || 10;
    }
    
    performEnemyMeleeAttack(enemy, damage) {
        console.log(`[BattleScene] ${enemy.enemyData.type} performs melee attack for ${damage} damage`);
        
        // Create enemy attack hitbox
        const attackX = enemy.x;
        const attackY = enemy.y;
        
        const enemyAttack = this.add.rectangle(
            attackX,
            attackY,
            this.attackWidth,
            this.attackHeight,
            0xff0000
        );
        
        this.physics.add.existing(enemyAttack);
        enemyAttack.body.setAllowGravity(false);
        
        // Check for collision with player
        this.physics.add.overlap(enemyAttack, this.player, () => {
            this.applyDamageToPlayer(damage);
            enemyAttack.destroy();
        });
        
        // Remove attack after duration
        this.time.delayedCall(this.attackDuration, () => {
            enemyAttack.destroy();
        });
    }
    
    performEnemyProjectileAttack(enemy, damage) {
        console.log(`[BattleScene] ${enemy.enemyData.type} performs projectile attack for ${damage} damage`);
        
        // Create enemy projectile
        const projectile = this.add.rectangle(
            enemy.x,
            enemy.y,
            this.projectileSize,
            this.projectileSize,
            0xff0000
        );
        
        this.physics.add.existing(projectile);
        projectile.body.setAllowGravity(false);
        
        // Move projectile toward player
        const direction = this.player.x > enemy.x ? 1 : -1;
        projectile.body.setVelocityX(this.projectileSpeed * direction);
        
        // Apply damage on hit
        this.physics.add.overlap(projectile, this.player, () => {
            this.applyDamageToPlayer(damage);
            projectile.destroy();
        });
        
        // Remove projectile after duration
        this.time.delayedCall(this.secondaryAttackDuration, () => {
            if (projectile && projectile.active) {
                projectile.destroy();
            }
        });
    }
    
    applyDamageToPlayer(damage) {
        console.log(`[BattleScene] Player takes ${damage} damage`);
        
        // Apply damage to player (this would integrate with player health system)
        // Gain AP from taking damage (5 AP per damage point)
        this.gainAP(5, 'damage');
        
        // Visual feedback
        this.player.setAlpha(0.5);
        this.time.delayedCall(200, () => {
            this.player.setAlpha(1);
        });
    }

    dash() {
        this.isDashing = true;
        this.isDashingAP = true; // Start consuming AP for dash
        this.canDash = false;
        
        // Play dash sound
        if (this.battleSceneSFX) {
            this.battleSceneSFX.playDash();
        } else {
            soundManager.playDash(); // Fallback
        }
        
        // Find closest enemy to determine default dash direction
        const closestEnemy = this.findClosestEnemy();
        let defaultDirection = 1; // Default to right if no enemies
        
        if (closestEnemy) {
            // Dash toward closest enemy by default
            defaultDirection = this.player.x < closestEnemy.x ? 1 : -1;
        }
        
        // Check gamepad left stick input
        let gamepadDirection = null;
        if (this.gamepad && this.gamepad.axes) {
            const axisX = this.gamepad.axes[0] || 0;
            const deadzone = 0.3;
            if (axisX < -deadzone) {
                gamepadDirection = -1; // Left
            } else if (axisX > deadzone) {
                gamepadDirection = 1; // Right
            }
        }
        
        // Allow player to override direction with left/right keys or gamepad stick
        const dashDirection = this.wasdKeys.left.isDown ? -1 : 
                            this.wasdKeys.right.isDown ? 1 : 
                            gamepadDirection !== null ? gamepadDirection :
                            defaultDirection;
        
        // Apply dash velocity based on mode
        if (this.groupMovementMode) {
            // GROUP MODE: All characters dash together
            console.log('[Dash] Group dash - all characters dashing together');
        this.player.body.setVelocityX(this.dashSpeed * dashDirection);
        this.player.setAlpha(0.7);
            
            // Dash all party characters
            this.partyCharacters.forEach(char => {
                if (char.body) {
                    char.body.setVelocityX(this.dashSpeed * dashDirection);
                    char.setAlpha(0.7);
                }
            });
        } else {
            // SINGLE CHARACTER MODE: Only active character dashes
            console.log('[Dash] Single character dash - only active character dashing');
            
            if (this.activeCharacter && this.activeCharacter.body) {
                this.activeCharacter.body.setVelocityX(this.dashSpeed * dashDirection);
                this.activeCharacter.setAlpha(0.7);
            }
        }
        
        console.log('[Dash] Executing dash:', {
            mode: this.groupMovementMode ? 'GROUP' : 'SINGLE',
            direction: dashDirection > 0 ? 'right' : 'left',
            towardEnemy: closestEnemy ? closestEnemy.enemyData.type : 'none',
            speed: this.dashSpeed,
            duration: this.dashDuration,
            apCostPerSecond: this.dashAPCost,
            currentAP: Math.floor(this.currentAP)
        });

        // Reset dash after duration
        this.time.delayedCall(this.dashDuration, () => {
            this.isDashing = false;
            this.isDashingAP = false; // Stop consuming AP for dash
            
            if (this.groupMovementMode) {
                // Reset all characters in group mode
            this.player.setAlpha(1);
            this.player.body.setVelocityX(0);
                
                this.partyCharacters.forEach(char => {
                    if (char.body) {
                        char.setAlpha(1);
                        char.body.setVelocityX(0);
                    }
                });
            } else {
                // Reset only active character in single mode
                if (this.activeCharacter && this.activeCharacter.body) {
                    this.activeCharacter.setAlpha(1);
                    this.activeCharacter.body.setVelocityX(0);
                }
            }
            
            console.log('[Dash] Dash completed, AP remaining:', Math.floor(this.currentAP));
        });

        // Reset dash cooldown
        this.time.delayedCall(this.dashCooldown, () => {
            this.canDash = true;
            console.log('[Dash] Dash cooldown reset');
        });
    }

    attack() {
        if (this.isAttacking) {
            console.log('[Attack] Attack already in progress, ignoring');
            return;
        }
        
        console.log('[Attack] Starting new attack');
        this.isAttacking = true;

        // Find closest enemy
        const closestEnemy = this.findClosestEnemy();
        if (!closestEnemy) return;

        // Determine attack direction based on player position relative to enemy
        const isPlayerRightOfEnemy = this.player.x > closestEnemy.x;
        const attackOffset = isPlayerRightOfEnemy ? -this.attackOffset : this.attackOffset;
        
        // Create attack hitbox
        const attackX = this.player.x + attackOffset;
        const attackY = this.player.y;
        
        console.log('[Attack] Creating attack hitbox at:', { 
            x: attackX, 
            y: attackY,
            direction: isPlayerRightOfEnemy ? 'left' : 'right',
            playerX: this.player.x,
            enemyX: closestEnemy.x
        });
        
        this.attackSprite = this.add.rectangle(
            attackX,
            attackY,
            this.attackWidth,
            this.attackHeight,
            0xFFFFFF
        );

        // Add physics to attack
        this.physics.add.existing(this.attackSprite);
        this.attackSprite.body.setAllowGravity(false);
        this.attackSprite.body.setBounce(0.1);
        this.attackSprite.body.setCollideWorldBounds(true);
        console.log('[Attack] Attack hitbox physics initialized');

        // Add collision with all enemies
        this.enemies.forEach(enemy => {
            this.physics.add.overlap(this.attackSprite, enemy, () => {
                console.log('[Attack] Hit detected on enemy!');
                
                // Apply knockback to enemy
                const knockbackForce = 300;
                const knockbackX = isPlayerRightOfEnemy ? -knockbackForce : knockbackForce;
                
                // Apply horizontal knockback
                enemy.body.setVelocityX(knockbackX);
                
                // Apply upward knockback if enemy is on ground
                if (enemy.body.touching.down) {
                    enemy.body.setVelocityY(-200);
                }
                
                // Visual feedback - flash yellow briefly
                const originalColor = enemy.enemyData.color;
                enemy.setFillStyle(0xffff00);
                this.time.delayedCall(100, () => {
                    enemy.setFillStyle(originalColor);
                });
                
                console.log('[Attack] Applied knockback to enemy:', {
                    force: knockbackForce,
                    direction: isPlayerRightOfEnemy ? 'left' : 'right'
                });

                // Update enemy health
                const damage = 20;
                enemy.enemyData.health = Math.max(0, enemy.enemyData.health - damage);
                
                // Check for defeat with logging
                if (enemy.enemyData.health <= 0) {
                    console.log('[Attack] Enemy defeated:', enemy.enemyData.id);
                    this.handleEnemyDefeat(enemy);
                }
            });
        });

        // Remove attack after duration
        this.time.delayedCall(this.attackDuration, () => {
            console.log('[Attack] Attack duration expired, cleaning up');
            if (this.attackSprite) {
                this.attackSprite.destroy();
                this.attackSprite = null;
                console.log('[Attack] Attack hitbox destroyed');
            }
            this.isAttacking = false;
            console.log('[Attack] Attack state reset');
        });
    }

    findClosestEnemy() {
        let closestEnemy = null;
        let closestDistance = Infinity;

        this.enemies.forEach(enemy => {
            const distance = Phaser.Math.Distance.Between(
                this.player.x,
                this.player.y,
                enemy.x,
                enemy.y
            );
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestEnemy = enemy;
            }
        });

        return closestEnemy;
    }

    secondaryAttack() {
        if (!this.canShootProjectile) {
            console.log('[Secondary Attack] On cooldown, waiting...');
            return;
        }

        if (this.projectileCount >= this.maxProjectiles) {
            console.log('[Secondary Attack] Max projectiles reached, starting reset cooldown');
            this.canShootProjectile = false;
            this.time.delayedCall(this.projectileResetCooldown, () => {
                this.projectileCount = 0;
                this.canShootProjectile = true;
                console.log('[Secondary Attack] Projectile count reset, ready to shoot again');
            });
            return;
        }
        
        console.log('[Secondary Attack] Starting new projectile attack');
        this.isSecondaryAttacking = true;
        this.projectileCount++;

        // Find closest enemy
        const closestEnemy = this.findClosestEnemy();
        if (!closestEnemy) return;

        // Determine attack direction based on player position relative to enemy
        const isPlayerRightOfEnemy = this.player.x > closestEnemy.x;
        const projectileOffset = isPlayerRightOfEnemy ? -this.attackOffset : this.attackOffset;
        
        // Create projectile
        const projectileX = this.player.x + projectileOffset;
        const projectileY = this.player.y;
        
        console.log('[Secondary Attack] Creating projectile at:', { 
            x: projectileX, 
            y: projectileY,
            direction: isPlayerRightOfEnemy ? 'left' : 'right',
            playerX: this.player.x,
            enemyX: closestEnemy.x,
            projectileCount: this.projectileCount
        });
        
        const projectile = this.add.rectangle(
            projectileX,
            projectileY,
            this.projectileSize,
            this.projectileSize,
            0xff0000
        );

        // Add physics to projectile
        this.physics.add.existing(projectile);
        projectile.body.setAllowGravity(false);
        projectile.body.setBounce(0.1);
        projectile.body.setCollideWorldBounds(true);
        console.log('[Secondary Attack] Projectile physics initialized');

        // Set projectile velocity
        const direction = isPlayerRightOfEnemy ? -1 : 1;
        projectile.body.setVelocityX(this.projectileSpeed * direction);

        // Add to projectiles array
        this.projectiles.push(projectile);

        // Add collision with all enemies
        this.enemies.forEach(enemy => {
            this.physics.add.overlap(projectile, enemy, () => {
                console.log('[Secondary Attack] Hit detected on enemy!');
                
                // Apply knockback to enemy
                const knockbackForce = 200;
                const knockbackX = isPlayerRightOfEnemy ? -knockbackForce : knockbackForce;
                
                // Apply horizontal knockback
                enemy.body.setVelocityX(knockbackX);
                
                // Apply upward knockback if enemy is on ground
                if (enemy.body.touching.down) {
                    enemy.body.setVelocityY(-150);
                }
                
                // Visual feedback - flash yellow briefly
                const originalColor = enemy.enemyData.color;
                enemy.setFillStyle(0xffff00);
                this.time.delayedCall(100, () => {
                    enemy.setFillStyle(originalColor);
                });
                
                // Remove projectile from array and destroy it
                const index = this.projectiles.indexOf(projectile);
                if (index > -1) {
                    this.projectiles.splice(index, 1);
                }
                projectile.destroy();

                // Update enemy health
                const damage = 20;
                enemy.enemyData.health = Math.max(0, enemy.enemyData.health - damage);
                
                // Check for defeat with logging
                if (enemy.enemyData.health <= 0) {
                    console.log('[Secondary Attack] Enemy defeated:', enemy.enemyData.id);
                    this.handleEnemyDefeat(enemy);
                }
            });
        });

        // Remove projectile after duration
        this.time.delayedCall(this.secondaryAttackDuration, () => {
            console.log('[Secondary Attack] Projectile duration expired, cleaning up');
            if (projectile && projectile.active) {
                // Remove projectile from array
                const index = this.projectiles.indexOf(projectile);
                if (index > -1) {
                    this.projectiles.splice(index, 1);
                }
                projectile.destroy();
                console.log('[Secondary Attack] Projectile destroyed');
            }
        });

        // Start cooldown for next shot
        this.canShootProjectile = false;
        this.time.delayedCall(this.projectileCooldown, () => {
            this.canShootProjectile = true;
            console.log('[Secondary Attack] Ready for next shot');
        });
    }

    startCharging() {
        if (this.isCharging) return;
        
        this.isCharging = true;
        this.chargeTime = 0;
        console.log('[Secondary Attack] Started charging');
    }

    updateChargeBar() {
        this.chargeTime = Math.min(this.chargeTime + 16, this.maxChargeTime); // 16ms per frame
        const chargePercent = this.chargeTime / this.maxChargeTime;
        
        // Position bars 5 pixels below the player
        const barX = this.player.x;
        const barY = this.player.y + (this.player.height / 2) + 25;
        
        // Show and position background bar
        this.chargeBarBackground.setPosition(barX, barY);
        this.chargeBarBackground.setVisible(true);
        
        // Update charge bar width and position
        this.chargeBar.width = this.chargeBarWidth * chargePercent;
        this.chargeBar.setPosition(barX - this.chargeBarWidth / 2, barY);
        this.chargeBar.setVisible(true);
        
        // Update charge bar color based on charge level
        if (chargePercent < 0.5) {
            this.chargeBar.setFillStyle(0x00ff00); // Green
        } else if (chargePercent < 0.8) {
            this.chargeBar.setFillStyle(0xffff00); // Yellow
        } else {
            this.chargeBar.setFillStyle(0xff0000); // Red
        }
    }

    releaseCharge() {
        if (!this.isCharging) return;
        
        const chargePercent = this.chargeTime / this.maxChargeTime;
        console.log('[Secondary Attack] Released charge:', chargePercent);
        
        if (chargePercent >= 0.8) { // Only shoot if charged at least 80%
            this.shootChargedProjectile();
        }
        
        this.isCharging = false;
        this.chargeTime = 0;
        this.chargeBar.width = 0;
        
        // Hide the charge bars
        this.chargeBarBackground.setVisible(false);
        this.chargeBar.setVisible(false);
    }

    shootChargedProjectile() {
        // Find closest enemy
        const closestEnemy = this.findClosestEnemy();
        if (!closestEnemy) return;

        // Determine attack direction based on player position relative to enemy
        const isPlayerRightOfEnemy = this.player.x > closestEnemy.x;
        const projectileOffset = isPlayerRightOfEnemy ? -this.attackOffset : this.attackOffset;
        
        // Create charged projectile
        const projectileX = this.player.x + projectileOffset;
        const projectileY = this.player.y;
        
        console.log('[Secondary Attack] Creating charged projectile at:', { 
            x: projectileX, 
            y: projectileY,
            direction: isPlayerRightOfEnemy ? 'left' : 'right'
        });
        
        const projectile = this.add.rectangle(
            projectileX,
            projectileY,
            this.chargedProjectileSize,
            this.chargedProjectileSize,
            0xff00ff // Purple color for charged projectile
        );

        // Add physics to projectile
        this.physics.add.existing(projectile);
        projectile.body.setAllowGravity(false);
        projectile.body.setBounce(0.1);
        projectile.body.setCollideWorldBounds(true);

        // Set projectile velocity
        const direction = isPlayerRightOfEnemy ? -1 : 1;
        projectile.body.setVelocityX(this.chargedProjectileSpeed * direction);

        // Add to projectiles array
        this.projectiles.push(projectile);

        // Add collision with all enemies
        this.enemies.forEach(enemy => {
            this.physics.add.overlap(projectile, enemy, () => {
                console.log('[Secondary Attack] Charged hit detected on enemy!');
                
                // Apply stronger knockback to enemy
                const knockbackForce = 400;
                const knockbackX = isPlayerRightOfEnemy ? -knockbackForce : knockbackForce;
                
                // Apply horizontal knockback
                enemy.body.setVelocityX(knockbackX);
                
                // Apply upward knockback if enemy is on ground
                if (enemy.body.touching.down) {
                    enemy.body.setVelocityY(-250);
                }
                
                // Visual feedback - flash purple briefly
                const originalColor = enemy.enemyData.color;
                enemy.setFillStyle(0xff00ff);
                this.time.delayedCall(100, () => {
                    enemy.setFillStyle(originalColor);
                });
                
                // Remove projectile from array and destroy it
                const index = this.projectiles.indexOf(projectile);
                if (index > -1) {
                    this.projectiles.splice(index, 1);
                }
                projectile.destroy();

                // Update enemy health
                const damage = 20;
                enemy.enemyData.health = Math.max(0, enemy.enemyData.health - damage);
                
                // Check for defeat with logging
                if (enemy.enemyData.health <= 0) {
                    console.log('[Secondary Attack] Enemy defeated:', enemy.enemyData.id);
                    this.handleEnemyDefeat(enemy);
                }
            });
        });

        // Remove projectile after duration
        this.time.delayedCall(this.secondaryAttackDuration, () => {
            if (projectile && projectile.active) {
                const index = this.projectiles.indexOf(projectile);
                if (index > -1) {
                    this.projectiles.splice(index, 1);
                }
                projectile.destroy();
            }
        });

        // Start cooldown
        this.canShootProjectile = false;
        this.time.delayedCall(this.projectileCooldown, () => {
            this.canShootProjectile = true;
        });
    }

    createChargeBar() {
        // Create charge bar background (positioned relative to player)
        const barWidth = 100;
        const barHeight = 10;
        
        this.chargeBarWidth = barWidth;
        this.chargeBarHeight = barHeight;
        
        this.chargeBarBackground = this.add.rectangle(
            0,
            0,
            barWidth,
            barHeight,
            0x333333
        );
        this.chargeBarBackground.setVisible(false);
        
        this.chargeBar = this.add.rectangle(
            0,
            0,
            0,
            barHeight,
            0x00ff00
        );
        this.chargeBar.setOrigin(0, 0.5);
        this.chargeBar.setVisible(false);
    }
    
    createAPGauge() {
        console.log('[BattleScene] Creating AP gauge');
        
        const viewportWidth = this.cameras.main.width;
        const viewportHeight = this.cameras.main.height;
        
        // AP gauge background (full width at bottom)
        this.apGaugeBackground = this.add.rectangle(
            viewportWidth / 2,
            viewportHeight - 20,
            viewportWidth - 40,
            20,
            0x333333
        );
        this.apGaugeBackground.setDepth(1000);
        
        // AP gauge fill
        this.apGauge = this.add.rectangle(
            20,
            viewportHeight - 20,
            (viewportWidth - 40) * (this.currentAP / this.maxAP),
            20,
            0x00ff00
        );
        this.apGauge.setOrigin(0, 0.5);
        this.apGauge.setDepth(1001);
        
        // AP text
        this.apGaugeText = this.add.text(
            20,
            viewportHeight - 20,
            'AP',
            {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 2
            }
        );
        this.apGaugeText.setOrigin(0, 0.5);
        this.apGaugeText.setDepth(1002);
        
        // AP value text
        this.apValueText = this.add.text(
            viewportWidth - 20,
            viewportHeight - 20,
            `${this.currentAP}/${this.maxAP}`,
            {
                fontSize: '14px',
                fontFamily: 'Arial',
                color: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 2
            }
        );
        this.apValueText.setOrigin(1, 0.5);
        this.apValueText.setDepth(1002);
        
        console.log('[BattleScene] AP gauge created');
        
        // Create escape progress bar (above AP gauge, initially hidden)
        this.createEscapeProgressBar();
    }
    
    createEscapeProgressBar() {
        console.log('[BattleScene] Creating escape progress bar');
        
        const barWidth = 300;
        const barHeight = 20;
        const barX = 20;
        const barY = this.cameras.main.height - 120; // 8px above AP bar (which is at -112)
        
        // Background
        this.escapeProgressBarBackground = this.add.rectangle(
            barX,
            barY,
            barWidth,
            barHeight,
            0x000000,
            0.8
        );
        this.escapeProgressBarBackground.setOrigin(0, 0.5);
        this.escapeProgressBarBackground.setStrokeStyle(2, 0xFF4444);
        this.escapeProgressBarBackground.setDepth(1001);
        this.escapeProgressBarBackground.setVisible(false);
        
        // Progress fill (starts at 0 width)
        this.escapeProgressBar = this.add.rectangle(
            barX,
            barY,
            0, // Start at 0 width
            barHeight - 4,
            0xFF4444,
            1
        );
        this.escapeProgressBar.setOrigin(0, 0.5);
        this.escapeProgressBar.setDepth(1002);
        this.escapeProgressBar.setVisible(false);
        
        console.log('[BattleScene] Escape progress bar created');
    }
    
    initializeParty() {
        console.log('[BattleScene] Initializing party system');
        
        // For now, create a single party member (the player)
        // Later this will be expanded when more characters join
        this.partyMembers = [
            {
                id: 'player',
                name: 'Player',
                type: 'Player',
                level: this.playerData?.level || 1,
                health: this.playerData?.health || 100,
                maxHealth: this.playerData?.maxHealth || 100,
                abilities: ['basicAttack', 'specialAttack'],
                apCosts: {
                    basicAttack: 15,
                    specialAttack: 30
                }
            }
        ];
        
        this.activeCharacterIndex = 0;
        this.activeCharacter = this.partyMembers[0];
        
        console.log('[BattleScene] Party initialized:', this.partyMembers);
    }
    
    /**
     * Activate group movement mode (key 0)
     * All characters move together
     */
    activateGroupMovement() {
        this.groupMovementMode = true;
        this.activeCharacterIndex = -1; // -1 indicates group mode
        
        console.log('[BattleScene] 🟢 GROUP MOVEMENT ACTIVATED - All characters move together');
        this.showControlModeMessage('GROUP MOVEMENT', 'All characters move together', '#00ff00');
    }
    
    /**
     * Switch to controlling a specific character (keys 1-4)
     * @param {number} characterIndex - 0 for player, 1-3 for party members
     */
    switchToCharacter(characterIndex) {
        if (this.characterSwitchCooldown > 0) return;
        
        this.groupMovementMode = false;
        this.activeCharacterIndex = characterIndex;
        this.characterSwitchCooldown = this.characterSwitchDelay;
        
        const characterName = characterIndex === 0 ? 'PLAYER' : 
            (this.partyCharacters[characterIndex - 1]?.memberData.name || `MEMBER ${characterIndex}`);
        
        console.log(`[BattleScene] 🎯 INDIVIDUAL CONTROL - ${characterName}`);
        this.showControlModeMessage(`CONTROLLING: ${characterName}`, 'WASD to move this character', '#FFD700');
    }
    
    /**
     * Get the currently active character's game object
     * @returns {Phaser.GameObjects.Rectangle} The active character or player
     */
    getActiveCharacterObject() {
        if (this.activeCharacterIndex === 0) {
            return this.player;
        } else if (this.activeCharacterIndex > 0 && this.activeCharacterIndex <= this.partyCharacters.length) {
            return this.partyCharacters[this.activeCharacterIndex - 1];
        }
        return this.player; // Default to player
    }
    
    /**
     * Show control mode change message
     */
    showControlModeMessage(title, description, color) {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        
        const modeText = this.add.text(
            centerX,
            centerY - 150,
            `${title}\n${description}`,
            {
                fontSize: '24px',
                fontFamily: 'Arial',
                color: color,
                stroke: '#000000',
                strokeThickness: 4,
                fontStyle: 'bold',
                align: 'center'
            }
        );
        modeText.setOrigin(0.5);
        modeText.setDepth(2000);
        
        // Animate
        this.tweens.add({
            targets: modeText,
            alpha: 0,
            y: centerY - 200,
            duration: 1500,
            ease: 'Power2.Out',
            onComplete: () => {
                modeText.destroy();
            }
        });
    }
    
    /**
     * Rotate through characters (Q/E keys or D-pad Left/Right)
     * @param {string} direction - 'left' or 'right'
     */
    rotateCharacter(direction) {
        if (this.characterSwitchCooldown > 0) return;
        
        // Exit group movement mode
        this.groupMovementMode = false;
        
        const totalCharacters = 1 + this.partyCharacters.length; // Player + party members
        const oldIndex = this.activeCharacterIndex;
        
        if (direction === 'left') {
            // Cycle to previous character
            this.activeCharacterIndex = (this.activeCharacterIndex - 1 + totalCharacters) % totalCharacters;
        } else {
            // Cycle to next character
            this.activeCharacterIndex = (this.activeCharacterIndex + 1) % totalCharacters;
        }
        
        if (oldIndex !== this.activeCharacterIndex) {
            // Set active character: 0 = player, 1+ = party members
            if (this.activeCharacterIndex === 0) {
                this.activeCharacter = this.player;
            } else {
                this.activeCharacter = this.partyCharacters[this.activeCharacterIndex - 1];
            }
            
            this.characterSwitchCooldown = this.characterSwitchDelay;
            
            const characterName = this.activeCharacterIndex === 0 ? 'Player' : 
                                 this.partyMembersData[this.activeCharacterIndex - 1]?.name || 'Unknown';
            console.log(`[BattleScene] Switched to character ${this.activeCharacterIndex}: ${characterName}`);
            
            // If in target mode, perform visual swap
            if (this.isInTargetMode) {
                this.swapCharacterVisualsInTargetMode(oldIndex, this.activeCharacterIndex);
            }
            
            // Visual feedback for character switch
            this.showCharacterSwitchFeedback(characterName);
        }
    }
    
    /**
     * Swap character visuals in target mode (swap colors/appearance)
     */
    swapCharacterVisualsInTargetMode(oldIndex, newIndex) {
        console.log(`[BattleScene] Swapping visuals from index ${oldIndex} to ${newIndex} in target mode`);
        
        // Get character data for new active character
        let newCharacterData, newColor, newIndicatorColor;
        
        if (newIndex === 0) {
            // Switching to player (leader)
            newCharacterData = this.playerData;
            newColor = this.playerData.color || 0x808080;
            newIndicatorColor = this.playerData.indicatorColor || 0xff0000;
        } else {
            // Switching to a party member
            newCharacterData = this.partyMembersData[newIndex - 1];
            newColor = newCharacterData.color || 0x808080;
            newIndicatorColor = newCharacterData.indicatorColor || 0xff0000;
        }
        
        // Update player sprite to show new active character
        this.player.setFillStyle(newColor);
        this.playerIndicator.setFillStyle(newIndicatorColor);
        
        // Flash effect to show swap
        this.tweens.add({
            targets: this.player,
            alpha: 0.3,
            duration: 100,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
                this.player.setAlpha(1);
            }
        });
        
        console.log(`[BattleScene] Visual swap complete - now displaying ${newCharacterData.name} (color: 0x${newColor.toString(16)})`);
    }
    
    showCharacterSwitchFeedback(characterName) {
        // Create temporary text showing active character
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        
        const switchText = this.add.text(
            centerX,
            centerY - 100,
            `Active: ${characterName}`,
            {
                fontSize: '24px',
                fontFamily: 'Arial',
                color: '#FFD700',
                stroke: '#000000',
                strokeThickness: 3
            }
        );
        switchText.setOrigin(0.5);
        switchText.setDepth(1000);
        
        // Animate in and out
        this.tweens.add({
            targets: switchText,
            alpha: 0,
            y: centerY - 150,
            duration: 1000,
            ease: 'Power2.Out',
            onComplete: () => {
                switchText.destroy();
            }
        });
    }
    
    updateAP(delta) {
        // Update cooldowns
        this.characterSwitchCooldown = Math.max(0, this.characterSwitchCooldown - delta);
        
        // AP consumption for movement
        if (this.isMoving && this.currentAP > 0) {
            this.currentAP = Math.max(0, this.currentAP - (this.movementAPCost * delta / 1000));
        }
        
        // AP consumption for dashing (double the cost of movement)
        if (this.isDashingAP && this.currentAP > 0) {
            this.currentAP = Math.max(0, this.currentAP - (this.dashAPCost * delta / 1000));
        }
        
        // AP regeneration only while charging
        if (this.isChargingAP && this.currentAP < this.maxAP) {
            const apGain = this.chargeAPRate * delta / 1000;
            this.currentAP = Math.min(this.maxAP, this.currentAP + apGain);
            
            // Stop AP charge sound when AP reaches max
            if (this.currentAP >= this.maxAP && this.battleSceneSFX) {
                this.battleSceneSFX.stopAPCharge();
            }
            
            // Only log occasionally to reduce spam
            if (Math.random() < 0.1) { // Log 10% of the time
                console.log(`[BattleScene] Charging AP: ${Math.floor(this.currentAP)}/${this.maxAP} (gained ${apGain.toFixed(2)})`);
            }
        }
        
        // Allow NPCs to act while player is charging (but not continuously)
        if (this.isChargingAP && this.enemies.length > 0 && this.turnPhase === 'action') {
            // Only trigger enemy turn once when charging starts
            if (!this.enemyTurnTriggeredWhileCharging) {
                this.enemyTurnTriggeredWhileCharging = true;
                this.triggerEnemyTurn();
            }
        } else if (!this.isChargingAP) {
            // Reset the flag when not charging
            this.enemyTurnTriggeredWhileCharging = false;
        }
        
        // Update AP gauge visual
        this.updateAPGauge();
    }
    
    updateAPGauge() {
        if (!this.apGauge || !this.apGaugeBackground) return;
        
        const viewportWidth = this.cameras.main.width;
        const viewportHeight = this.cameras.main.height;
        const gaugeWidth = viewportWidth - 40;
        const currentWidth = gaugeWidth * (this.currentAP / this.maxAP);
        
        // Update gauge width
        this.apGauge.width = currentWidth;
        
        // Update position to stay at left edge
        this.apGauge.x = 20;
        this.apGauge.y = viewportHeight - 20;
        
        // Update AP value text
        if (this.apValueText) {
            this.apValueText.setText(`${Math.floor(this.currentAP)}/${this.maxAP}`);
        }
        
        // Change color based on AP level
        if (this.currentAP < 20) {
            this.apGauge.setFillStyle(0xff0000); // Red when low
        } else if (this.currentAP < 50) {
            this.apGauge.setFillStyle(0xffff00); // Yellow when medium
        } else {
            this.apGauge.setFillStyle(0x00ff00); // Green when high
        }
    }
    
    consumeAP(amount) {
        if (this.currentAP >= amount) {
            this.currentAP = Math.max(0, this.currentAP - amount);
            console.log(`[BattleScene] Consumed ${amount} AP, remaining: ${this.currentAP}`);
            return true;
        } else {
            console.log(`[BattleScene] Not enough AP! Need ${amount}, have ${this.currentAP}`);
            return false;
        }
    }
    
    gainAP(amount, source = 'unknown') {
        this.currentAP = Math.min(this.maxAP, this.currentAP + amount);
        console.log(`[BattleScene] Gained ${amount} AP from ${source}, total: ${this.currentAP}`);
    }
    
    resetAP() {
        this.currentAP = this.maxAP;
        console.log(`[BattleScene] AP reset to full: ${this.currentAP}/${this.maxAP}`);
        this.updateAPGauge();
    }

    updateEnemyDisplays() {
        // Now handled by HUD system
        this.updateEnemyHUD();
    }

    /**
     * Update enemy HUD display with current enemy data
     */
    updateEnemyHUD() {
        if (!this.hudManager || !this.enemies) return;
        
        // Map enemy data for HUD display
        const enemyData = this.enemies
            .filter(enemy => enemy && enemy.active && enemy.enemyData)
            .map(enemy => ({
                type: enemy.enemyData.type || 'Enemy',
                health: enemy.enemyData.health,
                maxHealth: enemy.enemyData.maxHealth,
                level: enemy.enemyData.level || 1
            }));
        
        this.hudManager.updateEnemyList(enemyData);
    }

    getUpdatedPartyHPStates() {
        console.log('[BattleScene] Getting updated party HP states...');
        
        const hpStates = {
            playerHP: this.currentHP,
            playerMaxHP: this.maxHP,
            playerDowned: this.isPlayerDowned,
            partyMembers: []
        };
        
        // Collect HP data for each party member
        if (this.partyCharacters && this.partyCharacters.length > 0) {
            this.partyCharacters.forEach((character, index) => {
                if (character.active && character.memberData) {
                    hpStates.partyMembers.push({
                        id: character.memberData.id,
                        name: character.memberData.name,
                        currentHP: character.memberData.currentHP || character.memberData.maxHP,
                        maxHP: character.memberData.maxHP,
                        isDowned: character.memberData.isDowned || false
                    });
                    console.log(`[BattleScene]   ${character.memberData.name}: ${hpStates.partyMembers[index].currentHP}/${hpStates.partyMembers[index].maxHP} (Downed: ${hpStates.partyMembers[index].isDowned})`);
                }
            });
        }
        
        console.log(`[BattleScene] Player HP: ${hpStates.playerHP}/${hpStates.playerMaxHP} (Downed: ${hpStates.playerDowned})`);
        
        return hpStates;
    }

    cleanup() {
        console.log('[BattleScene] Cleaning up scene');
        
        // Destroy HUD
        if (this.hudManager) {
            this.hudManager.destroy();
            this.hudManager = null;
        }
        
        // Destroy dialogue card
        if (this.dialogueCard) {
            this.dialogueCard.destroy();
            this.dialogueCard = null;
        }
        
        // Destroy all enemies (no text displays to clean up - using DOM only)
        this.enemies.forEach(enemy => {
            if (enemy && enemy.destroy) enemy.destroy();
        });
        this.enemies = [];
        
        // Destroy party characters
        this.partyCharacters.forEach(character => {
            if (character && character.active) {
                if (character.memberData && character.memberData.indicator) {
                    character.memberData.indicator.destroy();
                }
                character.destroy();
            }
        });
        this.partyCharacters = [];
        
        // Destroy all text displays (victory text only now)
        if (this.textDisplays && Array.isArray(this.textDisplays)) {
            this.textDisplays.forEach(display => {
                if (display && display.destroy) display.destroy();
            });
        }
        this.textDisplays = [];
        
        // Reset state variables
        this.isBattleActive = false;
        this.currentTurn = 'player';
        this.selectedEnemy = null;
        this.selectedAbility = null;
        
        // Reset input and action states
        this.isReturning = false;
        this.isDashing = false;
        this.canDash = true;
        this.isVictorySequence = false;
        this.defeatedEnemyIds = [];
        
        // Reset combo system
        this.comboCount = 0;
        this.lastComboTime = 0;
        this.canCombo = true;
        
        // Hide AP gauge
        if (this.apGaugeBackground) this.apGaugeBackground.setVisible(false);
        if (this.apGauge) this.apGauge.setVisible(false);
        if (this.apGaugeText) this.apGaugeText.setVisible(false);
        if (this.apValueText) this.apValueText.setVisible(false);
        
        // Clean up escape progress bar
        if (this.escapeProgressBar) {
            this.escapeProgressBar.destroy();
            this.escapeProgressBar = null;
        }
        if (this.escapeProgressBarBackground) {
            this.escapeProgressBarBackground.destroy();
            this.escapeProgressBarBackground = null;
        }
        
        // Clean up range indicators
        if (this.rangeIndicators && Array.isArray(this.rangeIndicators)) {
            this.rangeIndicators.forEach(indicator => {
                if (indicator && indicator.destroy) indicator.destroy();
            });
        }
        this.rangeIndicators = [];
        
        // Clean up BattleAI
        if (this.battleAI) {
            this.battleAI.cleanup();
            this.battleAI = null;
        }
        
        // Legacy: Clean up NPC movement data
        if (this.npcMovementData) {
            this.npcMovementData.clear();
        }
        
        // Clean up checkerboard ground
        if (this.checkerboardGround) {
            this.checkerboardGround.destroy();
            this.checkerboardGround = null;
        }
        
        // Clear all tweens and timers
        this.tweens.killAll();
        
        // Clear all delayed calls/timers
        if (this.time && this.time.removeAllEvents) {
            this.time.removeAllEvents();
        }
        
        // Clear enemy turn timeout
        if (this.enemyTurnTimeout) {
            this.time.removeEvent(this.enemyTurnTimeout);
            this.enemyTurnTimeout = null;
        }
        
        console.log('[BattleScene] Cleanup complete');
    }

    toggleGamePause() {
        // Check actual scene pause state
        const isCurrentlyPaused = this.scene.isPaused();
        
        if (!isCurrentlyPaused) {
            console.log('[BattleScene] ⏸️ GAME PAUSED (Enter/Start)');
            
            // Stop background music when pausing
            if (this.battleSceneSong && this.battleSceneSong.isPlaying) {
                this.battleSceneSong.stop();
                console.log('[BattleScene] Music stopped (scene paused)');
            }
            
            // Pause the game timer
            gameStateManager.pauseTimer();
            
            // Set local pause flag
            this.isPaused = true;
            
            // Create pause overlay
            this.createPauseOverlay();
            
            // Pause the scene (must be last so overlay shows)
            this.scene.pause();
        } else {
            console.log('[BattleScene] ▶️ GAME RESUMED (Enter/Start)');
            
            // Resume the scene first
            this.scene.resume();
            
            // Clear local pause flag
            this.isPaused = false;
            
            // Resume the game timer
            gameStateManager.resumeTimer();
            
            // Remove pause overlay
            this.removePauseOverlay();
            
            // Resume background music when resuming
            if (this.battleSceneSong && !this.battleSceneSong.isPlaying) {
                this.battleSceneSong.play();
                console.log('[BattleScene] Music resumed (scene resumed)');
            } else if (!this.battleSceneSong && this.soundInitialized) {
                // Recreate song if it was disposed
                this.battleSceneSong = new BattleSceneSong();
                this.battleSceneSong.play();
                console.log('[BattleScene] Music recreated and started (scene resumed)');
            }
        }
    }
    
    toggleHUD() {
        if (!this.hudManager) {
            console.error('[BattleScene] HUD Manager not initialized');
            return;
        }
        
        // Check if methods exist (handle caching issues)
        if (typeof this.hudManager.isVisible !== 'function') {
            console.error('[BattleScene] HUD Manager methods not available. Please hard refresh (Ctrl+Shift+R or Cmd+Shift+R)');
            console.error('[BattleScene] hudManager object:', this.hudManager);
            return;
        }
        
        if (this.hudManager.isVisible()) {
            console.log('[BattleScene] Hiding battle controls panel (H)');
            this.hudManager.hide();
        } else {
            console.log('[BattleScene] Showing battle controls panel (H)');
            this.hudManager.show();
        }
    }
    
    createPauseOverlay() {
        // Create pause overlay in DOM
        this.pauseOverlay = document.createElement('div');
        this.pauseOverlay.id = 'battle-pause-overlay';
        this.pauseOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.85);
            z-index: 9999;
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: Arial, sans-serif;
        `;
        
        this.pauseOverlay.innerHTML = `
            <div style="text-align: center; color: white;">
                <div style="font-size: 72px; font-weight: bold; margin-bottom: 30px; color: #FFD700;">
                    ⏸ PAUSED
                </div>
                <div style="font-size: 18px; color: #AAA; margin-bottom: 10px;">
                    Battle and game time paused
                </div>
                <div style="font-size: 18px; color: #AAA;">
                    Press <span style="color: #FFD700; font-weight: bold;">ENTER</span> or <span style="color: #FFD700; font-weight: bold;">START</span> to resume
                </div>
            </div>
        `;
        
        document.body.appendChild(this.pauseOverlay);
        
        // Add DOM keyboard listener for unpause (works even when Phaser scene is paused)
        this.pauseKeyListener = (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.toggleGamePause();
            }
        };
        document.addEventListener('keydown', this.pauseKeyListener);
        
        // Poll gamepad for Start button while paused
        this.pauseGamepadInterval = setInterval(() => {
            const pad = window.getGlobalGamepad?.();
            if (pad && pad.buttons && pad.buttons[9] && pad.buttons[9].pressed) {
                // Check if this is a new press (not held from before pause)
                if (!this.startButtonWasPressed) {
                    this.startButtonWasPressed = true;
                    this.toggleGamePause();
                }
            } else {
                this.startButtonWasPressed = false;
            }
        }, 50); // Poll every 50ms
    }
    
    removePauseOverlay() {
        if (this.pauseOverlay) {
            this.pauseOverlay.remove();
            this.pauseOverlay = null;
        }
        
        if (this.pauseKeyListener) {
            document.removeEventListener('keydown', this.pauseKeyListener);
            this.pauseKeyListener = null;
        }
        
        if (this.pauseGamepadInterval) {
            clearInterval(this.pauseGamepadInterval);
            this.pauseGamepadInterval = null;
        }
    }

    shutdown() {
        console.log('[BattleScene] Running shutdown');
        this.cleanupInput();
        this.cleanup();
        
        // Remove pause overlay if exists
        this.removePauseOverlay();
        
        // Clean up sound effects
        if (this.battleSceneSFX) {
            this.battleSceneSFX.dispose();
            this.battleSceneSFX = null;
            console.log('[BattleScene] SFX disposed (scene shutdown)');
        }
        
        // Clean up background music
        if (this.battleSceneSong) {
            this.battleSceneSong.dispose();
            this.battleSceneSong = null;
            console.log('[BattleScene] Music disposed (scene shutdown)');
        }
        
        // Disable input
        this.input.keyboard.enabled = false;
        this.input.mouse.enabled = false;
        
        // Call parent shutdown
        super.shutdown();
    }

    /**
     * ====================================================================
     * DIALOGUE SYSTEM METHODS
     * ====================================================================
     */

    showDialogueOptions() {
        console.log('[BattleScene] Showing dialogue options');
        this.isDialogueActive = true;
        
        // Get dialogue data for the first NPC (leader of the group)
        const leadNpc = this.npcDataArray[0];
        const dialogueData = dialogueManager.getDialogueOptions(leadNpc);
        
        console.log('[BattleScene] Dialogue data:', dialogueData);
        
        // Create DOM overlay for dialogue
        this.dialogueOverlay = document.createElement('div');
        this.dialogueOverlay.id = 'battle-dialogue-overlay';
        this.dialogueOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: linear-gradient(135deg, rgba(20, 20, 40, 0.95), rgba(40, 20, 60, 0.95));
            z-index: 10000;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-family: Arial, sans-serif;
            animation: fadeIn 0.5s ease-in;
        `;
        
        // Create dialogue content
        const content = document.createElement('div');
        content.style.cssText = `
            max-width: 600px;
            padding: 30px;
            background: rgba(0, 0, 0, 0.7);
            border: 3px solid #FFD700;
            border-radius: 15px;
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
        `;
        
        // NPC greeting
        const greeting = document.createElement('div');
        greeting.style.cssText = `
            font-size: 24px;
            color: #FFF;
            margin-bottom: 20px;
            text-align: center;
            font-weight: bold;
        `;
        greeting.innerHTML = `
            <div style="font-size: 32px; color: #FFD700; margin-bottom: 10px;">
                ${leadNpc.type}
            </div>
            <div style="font-size: 18px; font-style: italic; color: #AAA;">
                "${dialogueData.greeting}"
            </div>
        `;
        content.appendChild(greeting);
        
        // Money display
        const moneyDisplay = document.createElement('div');
        moneyDisplay.style.cssText = `
            font-size: 18px;
            color: #FFD700;
            text-align: center;
            margin: 15px 0;
            padding: 10px;
            background: rgba(255, 215, 0, 0.1);
            border-radius: 5px;
        `;
        moneyDisplay.textContent = `💰 Your Gold: ${moneyManager.getMoney()}`;
        content.appendChild(moneyDisplay);
        
        // Options container
        const optionsContainer = document.createElement('div');
        optionsContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 20px;
        `;
        
        // Create buttons for each option
        dialogueData.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.style.cssText = `
                padding: 15px 20px;
                font-size: 18px;
                font-weight: bold;
                color: ${this.getOptionColor(option.id)};
                background: rgba(0, 0, 0, 0.8);
                border: 2px solid ${this.getOptionColor(option.id)};
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
                text-align: left;
            `;
            
            // Check if option is disabled
            const isDisabled = (option.id === 'negotiate_money' && !option.canAfford) ||
                             (option.id === 'negotiate_item' && option.availableItems.length === 0);
            
            if (isDisabled) {
                button.style.opacity = '0.5';
                button.style.cursor = 'not-allowed';
                button.disabled = true;
            }
            
            let buttonText = `${option.text}`;
            if (option.description) {
                buttonText += `<br><span style="font-size: 14px; font-style: italic;">${option.description}</span>`;
            }
            
            if (option.id === 'negotiate_money' && !option.canAfford) {
                buttonText += `<br><span style="font-size: 14px; color: #FF4444;">Insufficient funds!</span>`;
            }
            
            if (option.id === 'negotiate_item' && option.availableItems.length === 0) {
                buttonText += `<br><span style="font-size: 14px; color: #FF4444;">No suitable items!</span>`;
            }
            
            button.innerHTML = buttonText;
            
            // Hover effects
            if (!isDisabled) {
                button.addEventListener('mouseenter', () => {
                    button.style.background = this.getOptionColor(option.id);
                    button.style.color = '#000';
                    button.style.transform = 'scale(1.05)';
                });
                button.addEventListener('mouseleave', () => {
                    button.style.background = 'rgba(0, 0, 0, 0.8)';
                    button.style.color = this.getOptionColor(option.id);
                    button.style.transform = 'scale(1)';
                });
                
                button.addEventListener('click', () => {
                    this.handleDialogueChoice(option.id, option);
                });
            }
            
            optionsContainer.appendChild(button);
        });
        
        content.appendChild(optionsContainer);
        this.dialogueOverlay.appendChild(content);
        document.body.appendChild(this.dialogueOverlay);
    }
    
    getOptionColor(optionId) {
        const colors = {
            'fight': '#FF4444',
            'negotiate_money': '#FFD700',
            'negotiate_item': '#00D9FF',
            'flee': '#888888'
        };
        return colors[optionId] || '#FFFFFF';
    }
    
    // REMOVED: Duplicate handleDialogueChoice method (old system)
    // The correct handleDialogueChoice is at line ~1190 and handles recruitment
    
    showItemSelectionDialog(availableItems, requiredValue) {
        console.log('[BattleScene] Showing item selection dialog');
        
        // Create item selection overlay
        const itemOverlay = document.createElement('div');
        itemOverlay.id = 'item-selection-overlay';
        itemOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.9);
            z-index: 10001;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-family: Arial, sans-serif;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            max-width: 500px;
            padding: 20px;
            background: rgba(20, 20, 40, 0.95);
            border: 2px solid #00D9FF;
            border-radius: 10px;
        `;
        
        const title = document.createElement('div');
        title.style.cssText = `
            font-size: 24px;
            color: #00D9FF;
            text-align: center;
            margin-bottom: 15px;
            font-weight: bold;
        `;
        title.textContent = `Select Item to Gift (Min Value: ${requiredValue})`;
        content.appendChild(title);
        
        // Item list
        const itemList = document.createElement('div');
        itemList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-height: 400px;
            overflow-y: auto;
        `;
        
        availableItems.forEach(item => {
            const itemButton = document.createElement('button');
            itemButton.style.cssText = `
                padding: 12px;
                background: rgba(0, 217, 255, 0.1);
                border: 1px solid #00D9FF;
                border-radius: 5px;
                color: #FFF;
                cursor: pointer;
                text-align: left;
                transition: all 0.3s ease;
            `;
            
            itemButton.innerHTML = `
                <div style="font-weight: bold;">${item.name} (Value: ${item.value})</div>
                <div style="font-size: 14px; color: #AAA;">Quantity: ${item.quantity}</div>
            `;
            
            itemButton.addEventListener('mouseenter', () => {
                itemButton.style.background = '#00D9FF';
                itemButton.style.color = '#000';
            });
            itemButton.addEventListener('mouseleave', () => {
                itemButton.style.background = 'rgba(0, 217, 255, 0.1)';
                itemButton.style.color = '#FFF';
            });
            
            itemButton.addEventListener('click', () => {
                itemOverlay.remove();
                this.handleItemNegotiation(item.id);
            });
            
            itemList.appendChild(itemButton);
        });
        
        content.appendChild(itemList);
        
        // Cancel button
        const cancelButton = document.createElement('button');
        cancelButton.style.cssText = `
            margin-top: 15px;
            padding: 10px;
            background: #444;
            border: 1px solid #888;
            border-radius: 5px;
            color: #FFF;
            cursor: pointer;
            width: 100%;
        `;
        cancelButton.textContent = 'Cancel (Fight Instead)';
        cancelButton.addEventListener('click', () => {
            itemOverlay.remove();
            this.setupBattle();
        });
        content.appendChild(cancelButton);
        
        itemOverlay.appendChild(content);
        document.body.appendChild(itemOverlay);
    }
    
    handleItemNegotiation(itemId) {
        const leadNpc = this.npcDataArray[0];
        const result = dialogueManager.negotiateWithItem(leadNpc, itemId);
        
        console.log('[BattleScene] Item negotiation result:', result);
        
        this.showNegotiationResult(result);
    }
    
    // REMOVED: Duplicate handleFleeAttempt method (old system)
    // The correct handleFleeAttempt is at line ~1569 and takes npcData parameter
    
    // REMOVED: Duplicate showNegotiationResult method (old system)
    // The correct showNegotiationResult is at line ~1582 and takes (result, npcData) parameters
    
    showFleeResult(result, onComplete = null) {
        const resultOverlay = document.createElement('div');
        resultOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.95);
            z-index: 10002;
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: Arial, sans-serif;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            max-width: 400px;
            padding: 30px;
            background: ${result.success ? 'rgba(0, 217, 255, 0.1)' : 'rgba(255, 68, 68, 0.1)'};
            border: 3px solid ${result.success ? '#00D9FF' : '#FF4444'};
            border-radius: 15px;
            text-align: center;
        `;
        
        const message = document.createElement('div');
        message.style.cssText = `
            font-size: 24px;
            color: ${result.success ? '#00D9FF' : '#FF4444'};
            font-weight: bold;
        `;
        message.textContent = result.message;
        content.appendChild(message);
        
        resultOverlay.appendChild(content);
        document.body.appendChild(resultOverlay);
        
        setTimeout(() => {
            resultOverlay.remove();
            if (result.success) {
                this.returnToWorld();
            } else if (onComplete) {
                onComplete();
            }
        }, 2000);
    }
    
    // REMOVED: Duplicate handleNegotiationVictory method (old system)
    // The correct handleNegotiationVictory is at line ~1700 and takes npcData parameter

    animateXpCounter(xpText, totalXp) {
        console.log(`[BattleScene] Animating XP counter from 0 to ${totalXp}`);
        
        let currentXp = 0;
        const incrementSpeed = Math.max(1, Math.floor(totalXp / 60)); // Complete in ~1 second at 60fps
        
        // Create a timer to count up the XP
        const xpTimer = this.time.addEvent({
            delay: 16, // ~60fps
            repeat: Math.ceil(totalXp / incrementSpeed),
            callback: () => {
                currentXp = Math.min(currentXp + incrementSpeed, totalXp);
                xpText.setText(`EXP: ${currentXp}`);
                
                // When finished, apply XP to player
                if (currentXp >= totalXp) {
                    console.log(`[BattleScene] XP animation complete, applying ${totalXp} XP to player`);
                    
                    // Apply XP to player and check for level up
                    const result = statsManager.addPlayerExperience(totalXp);
                    
                    if (result.leveledUp) {
                        console.log(`[BattleScene] 🎉 PLAYER LEVELED UP to ${result.newLevel}!`);
                        console.log(`[BattleScene] Stats gained:`, result.statsGained);
                        
                        // Show level up notification
                        this.showLevelUpNotification(result.newLevel, result.statsGained);
                    }
                }
            }
        });
    }

    showLevelUpNotification(newLevel, statsGained) {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        
        // Play level up sound
        if (this.battleSceneSFX) {
            this.battleSceneSFX.playLevelUp();
        } else {
            soundManager.playLevelUp(); // Fallback
        }
        
        // Create level up text
        const levelUpText = this.add.text(
            centerX,
            centerY + 120,
            `LEVEL UP!\nLevel ${newLevel}`,
            {
                fontSize: '40px',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                color: '#FFD700',
                stroke: '#FF6B00',
                strokeThickness: 4,
                align: 'center'
            }
        ).setOrigin(0.5).setAlpha(0);
        this.textDisplays.push(levelUpText);
        
        // Dramatic appearance
        this.tweens.add({
            targets: levelUpText,
            alpha: 1,
            scale: 1.3,
            duration: 500,
            ease: 'Back.Out'
        });
        
        // Pulse effect
        this.tweens.add({
            targets: levelUpText,
            scaleX: 1.4,
            scaleY: 1.4,
            duration: 800,
            ease: 'Sine.InOut',
            yoyo: true,
            repeat: -1
        });
        
        console.log('[BattleScene] Level up notification displayed');
    }

    handleEnemyDefeat(enemy) {
        console.log('[BattleScene] Handling enemy defeat:', enemy.enemyData.id);
        
        // Check if this is the currently targeted enemy
        if (this.isInTargetMode && this.currentTarget === enemy) {
            console.log('[BattleScene] Targeted enemy defeated - exiting target mode');
            // Exit target mode before removing enemy
            this.isInTargetMode = false;
            this.currentTarget = null;
            this.juggleComboCount = 0;
            
            // Remove target mode UI
            const overlay = document.getElementById('target-mode-ui');
            if (overlay) {
                overlay.remove();
            }
        }
        
        // IMPORTANT: Store the defeated enemy ID AND data BEFORE removing the enemy
        if (enemy.enemyData && enemy.enemyData.id) {
            this.defeatedEnemyIds.push(enemy.enemyData.id);
            
            // Store enemy data for XP calculation
            this.defeatedEnemiesData.push({
                id: enemy.enemyData.id,
                type: enemy.enemyData.type,
                level: enemy.enemyData.level
            });
            
            console.log('[BattleScene] Stored defeated enemy ID:', enemy.enemyData.id);
            console.log('[BattleScene] Total defeated in this battle:', this.defeatedEnemyIds);
        }
        
        // Clean up BattleAI data
        if (this.battleAI) {
            this.battleAI.removeEnemy(enemy);
            console.log('[BattleScene] Removed BattleAI data for defeated enemy');
        }
        
        // Remove enemy (no Phaser text displays to clean up - using DOM only)
        enemy.destroy();
        this.enemies = this.enemies.filter(e => e !== enemy);

        // Log remaining enemies
        console.log('[BattleScene] Remaining enemies:', this.enemies.length);

        // Check if all enemies are defeated
        if (this.enemies.length === 0) {
            console.log('[BattleScene] All enemies defeated, triggering victory sequence');
            this.showVictorySequence();
        } else if (this.enemies.length > 0) {
            // If enemies remain and we were in target mode, return to selection mode
            if (!this.isInTargetMode && !this.isTargetSelectionMode) {
                console.log('[BattleScene] Returning to target selection mode');
                this.isTargetSelectionMode = true;
                this.selectedTargetIndex = 0;
                this.resetBattlePositions();
            }
        }
    }

    showVictorySequence() {
        console.log('[BattleScene] Starting victory sequence');
        
        // Stop battle music and play victory tune
        if (this.battleSceneSong && this.battleSceneSong.isPlaying) {
            this.battleSceneSong.playVictoryTune();
        }
        
        // Play victory sound
        if (this.battleSceneSFX) {
            this.battleSceneSFX.playVictory();
        } else {
            soundManager.playVictory(); // Fallback
        }
        
        // Disable input during victory sequence
        this.input.enabled = false;
        
        // Use the defeatedEnemyIds that were collected during battle
        // (this.enemies array is empty by the time we get here)
        console.log('[BattleScene] Defeated NPC IDs:', this.defeatedEnemyIds);
        
        // Calculate total XP from defeated enemies
        const playerLevel = gameStateManager.playerStats.level;
        this.totalXpEarned = 0;
        
        this.defeatedEnemiesData.forEach(enemy => {
            const xp = statsManager.calculateBattleXp(enemy.level, playerLevel, enemy.type);
            this.totalXpEarned += xp;
            console.log(`[BattleScene] XP from ${enemy.type} (Lvl ${enemy.level}): ${xp}`);
        });
        
        console.log(`[BattleScene] Total XP earned: ${this.totalXpEarned}`);
        
        // Center camera on screen center
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        
        // Create dramatic glowing gold victory text
        const victoryText = this.add.text(
            centerX,
            centerY - 50,
            'VICTORY!',
            {
                fontSize: '96px',
                fontFamily: 'Arial Black, Arial',
                fontStyle: 'bold',
                color: '#FFD700', // Gold color
                stroke: '#B8860B', // Dark goldenrod stroke
                strokeThickness: 8,
                shadow: {
                    offsetX: 0,
                    offsetY: 0,
                    color: '#FFD700',
                    blur: 20,
                    fill: true
                }
            }
        ).setOrigin(0.5).setAlpha(0).setScale(0.5);
        this.textDisplays.push(victoryText);
        
        // Create XP counter text
        const xpText = this.add.text(
            centerX,
            centerY + 50,
            `EXP: 0`,
            {
                fontSize: '48px',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                color: '#00D9FF', // Cyan color
                stroke: '#0066CC',
                strokeThickness: 4
            }
        ).setOrigin(0.5).setAlpha(0);
        this.textDisplays.push(xpText);
        
        // Dramatic entrance animation with glowing effect
        this.tweens.add({
            targets: victoryText,
            scale: 1.2,
            alpha: 1,
            duration: 800,
            ease: 'Elastic.Out',
            yoyo: false
        });
        
        // Pulsing glow effect
        this.tweens.add({
            targets: victoryText,
            scaleX: 1.25,
            scaleY: 1.25,
            duration: 1000,
            ease: 'Sine.InOut',
            yoyo: true,
            repeat: 1
        });
        
        // Fade in XP text
        this.tweens.add({
            targets: xpText,
            alpha: 1,
            duration: 500,
            delay: 800,
            onComplete: () => {
                // Start XP countdown animation
                this.animateXpCounter(xpText, this.totalXpEarned);
            }
        });
        
        // Fade out and exit animation
        this.time.delayedCall(3500, () => {
            this.tweens.add({
                targets: victoryText,
                y: victoryText.y - 50,
                alpha: 0,
                scale: 0.8,
                duration: 1000,
                ease: 'Power2.In',
                onComplete: () => {
                    victoryText.destroy();
                    
                    // Create black rectangle for fade out
                    const fadeRect = this.add.rectangle(
                        0, 0,
                        this.cameras.main.width,
                        this.cameras.main.height,
                        0x000000
                    ).setOrigin(0).setDepth(1000);
                    
                    // Fade to black
                    this.tweens.add({
                        targets: fadeRect,
                        alpha: 1,
                        duration: 1000,
                        onComplete: () => {
                            // Stop battle music before transition (victory tune already played)
                            if (this.battleSceneSong && this.battleSceneSong.isPlaying) {
                                this.battleSceneSong.stop();
                                console.log('[BattleScene] BattleSceneSong stopped (victory transition)');
                            }
                            
                            // Get updated HP states for all party members
                            const hpStates = this.getUpdatedPartyHPStates();
                            
                            // Prepare transition data
                            const transitionData = {
                                battleVictory: true,
                                returnPosition: this.worldPosition,
                                defeatedNpcIds: this.defeatedEnemyIds,
                                transitionType: 'victory',
                                partyHPStates: hpStates
                            };
                            
                            console.log('[BattleScene] ========== VICTORY TRANSITION ==========');
                            console.log('[BattleScene] Defeated enemy IDs collected:', this.defeatedEnemyIds);
                            console.log('[BattleScene] Transition data:', JSON.stringify(transitionData, null, 2));
                            
                            // Save player health before leaving battle
                            gameStateManager.updatePlayerHealth(this.currentHP);
                            console.log(`[BattleScene] Saved player health on victory: ${this.currentHP}/${this.maxHP}`);
                            
                            // Clean up the scene
                            this.cleanup();
                            
                            // Resume WorldScene first (which was paused), THEN stop this scene
                            this.scene.resume('WorldScene', transitionData);
                            this.scene.stop();
                        }
                    });
                }
            });
        });
    }
    
    /**
     * Setup mobile event listeners
     */
    setupMobileListeners() {
        // Listen for mobile button presses in battle
        window.addEventListener('mobilebutton', (e) => {
            const { button, pressed } = e.detail;
            
            if (!pressed) return; // Only handle button press
            
            switch (button) {
                case 'a': // A button - Basic attack / confirm
                    if (this.isPlayerTurn && !this.isDialogueActive) {
                        // Trigger melee attack for active character
                        this.handleMeleeAttack();
                    }
                    break;
                    
                case 'b': // B button - Switch character
                    if (!this.isDialogueActive) {
                        this.switchToNextCharacter();
                    }
                    break;
                    
                case 'x': // X button - Charge AP
                    // Handled via shift system
                    break;
                    
                case 'y': // Y button - Special ability / menu
                    if (this.isPlayerTurn && !this.isDialogueActive) {
                        // Could trigger special ability
                    }
                    break;
            }
        });
    }
}
