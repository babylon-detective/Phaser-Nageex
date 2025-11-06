import Phaser from "phaser";

import SaveState from "../SaveState";
import PlayerManager from "../managers/PlayerManager";
import NpcManager from "../managers/NpcManager";
import PartyManager from "../managers/PartyManager"; // Legacy - for recruitable NPCs only
import PartyFollowingManager from "../managers/PartyFollowingManager";
import { partyLeadershipManager } from "../managers/PartyLeadershipManager";
import HUDManager from "../ui/HUDManager";
import MapScene from "./MapScene";
import { gameStateManager } from "../managers/GameStateManager.js";
import { soundManager } from "../managers/SoundManager.js";

export default class WorldScene extends Phaser.Scene {
    constructor() {
        super({ key: 'WorldScene' });
        
        // Gamepad support for pause
        this.gamepad = null;
        this.gamepadButtonStates = {};
        this.pauseInputEnabled = false; // Prevent pause immediately on scene start
        
        // Leader rotation cooldown
        this.leaderRotateCooldown = 0;
        this.leaderRotateDelay = 300; // 300ms between rotations
    }

    init(data) {
        console.log('[WorldScene] Initializing with data:', data);
        
        // Initialize or update defeated NPCs
        if (data && data.defeatedNpcIds) {
            this.defeatedNpcIds = [...new Set(data.defeatedNpcIds)];
            console.log('[WorldScene] Initialized with defeated NPCs:', this.defeatedNpcIds);
        } else {
            this.defeatedNpcIds = [];
        }
        
        // Store return position if provided
        this.returnPosition = data?.returnPosition || null;
        this.battleVictory = data?.battleVictory || false;
        this.transitionType = data?.transitionType || null;
        
        // Handle loaded game data
        this.loadedGame = data?.loadedGame || false;
        this.loadedPlayerPosition = data?.playerPosition || null;
        
        console.log('[WorldScene] Initial state:', {
            returnPosition: this.returnPosition,
            battleVictory: this.battleVictory,
            transitionType: this.transitionType,
            defeatedNpcIds: this.defeatedNpcIds,
            loadedGame: this.loadedGame,
            loadedPlayerPosition: this.loadedPlayerPosition
        });
    }

    preload() {
        console.log('Loading tilemap...');
        this.load.image('tilesGrass', '/assets/tilesets/TX Tileset Grass.png');
        this.load.image('tilesStoneGround', '/assets/tilesets/TX Tileset Stone Ground.png');
        this.load.image('tilesWall', '/assets/tilesets/TX Tileset Wall.png');
        this.load.image('tilesStruct', '/assets/tilesets/TX Struct.png');
        this.load.image('tilesProps', '/assets/tilesets/TX Props.png');
        this.load.image('tilesPlants', '/assets/tilesets/TX Plants.png');
        this.load.image('tilesSea', '/assets/tilesets/TX Sea.png');
        this.load.tilemapTiledJSON('map', '/assets/tilemaps/TownScene.tmj');
    }

    create() {
        console.log('🎮 WorldScene create - VERSION 2.0 WITH PARTY SYSTEM');
        console.log('WorldScene create');
        
        // Create the tilemap
        this.map = this.make.tilemap({ key: 'map' });

        // Load tilesets
        const tilesets = {
            sea: this.map.addTilesetImage('TX Sea', 'tilesSea'),
            grass: this.map.addTilesetImage('TX Tileset Grass', 'tilesGrass'),
            stoneGround: this.map.addTilesetImage('TX Tileset Stone Ground', 'tilesStoneGround'),
            wall: this.map.addTilesetImage('TX Tileset Wall', 'tilesWall'),
            struct: this.map.addTilesetImage('TX Struct', 'tilesStruct'),
            props: this.map.addTilesetImage('TX Props', 'tilesProps'),
            plants: this.map.addTilesetImage('TX Plants', 'tilesPlants')
        };

        // Create layers
        const layers = {
            sea: this.map.createLayer('Sea', [tilesets.sea]),
            ground: this.map.createLayer('Ground', Object.values(tilesets)),
            walls: this.map.createLayer('Walls', Object.values(tilesets)),
            plants: this.map.createLayer('Plants', Object.values(tilesets)),
            props: this.map.createLayer('Props', Object.values(tilesets))
        };

        // Calculate exact tilemap dimensions
        const mapWidth = this.map.width * this.map.tileWidth;
        const mapHeight = this.map.height * this.map.tileHeight;
        
        console.log('Exact map dimensions:', { width: mapWidth, height: mapHeight });

        // Make world bounds larger than the map
        const worldPadding = 2800;
        const worldWidth = mapWidth + (worldPadding * 2);
        const worldHeight = mapHeight + (worldPadding * 2);

        // Set the larger bounds
        this.physics.world.setBounds(
            -worldPadding,
            -worldPadding,
            worldWidth,
            worldHeight
        );

        // Set camera bounds to match
        this.cameras.main.setBounds(
            -worldPadding,
            -worldPadding,
            worldWidth,
            worldHeight
        );

        // Add this after setting the bounds
        console.log('World bounds:', {
            map: { width: mapWidth, height: mapHeight },
            world: {
                x: -worldPadding,
                y: -worldPadding,
                width: worldWidth,
                height: worldHeight
            }
        });

        // Create player manager
        this.playerManager = new PlayerManager(this);
        this.playerManager.create();
        
        // Store reference to party leadership manager for HUD access
        this.partyLeadershipManager = partyLeadershipManager;
        
        // Initialize party leadership with player as leader
        partyLeadershipManager.initializeParty(
            this.playerManager.player,
            this.playerManager.controls?.directionIndicator || null
        );
        
        // Create party following manager
        this.partyFollowingManager = new PartyFollowingManager(this);

        // Define NPC types
        this.npcTypes = {
            GUARD: {
                name: 'Guard',
                health: 100,
                level: 1,
                color: 0xff0000,
                size: { width: 32, height: 64 },
                behavior: 'patrol',
                patrolRadius: 100,
                triggerRadius: 80,
                spawnWeight: 2
            },
            MERCHANT: {
                name: 'Merchant',
                health: 80,
                level: 1,
                color: 0x00ff00,
                size: { width: 32, height: 64 },
                behavior: 'stationary',
                triggerRadius: 40,
                spawnWeight: 1
            },
            VILLAGER: {
                name: 'Villager',
                health: 60,
                level: 1,
                color: 0x0000ff,
                size: { width: 32, height: 64 },
                behavior: 'wander',
                wanderRadius: 50,
                triggerRadius: 40,
                spawnWeight: 3
            }
        };

        // Create NPC manager with proper configuration
        this.npcManager = new NpcManager(this);
        this.npcManager.init({
            npcTypes: this.npcTypes,
            spawnConfig: {
                totalNPCs: 5,
                minDistanceBetweenNPCs: 50,
                spawnAttempts: 50,
                spawnOnGroundOnly: true,
                spawnRadius: 100
            },
            defeatedNpcIds: this.defeatedNpcIds || []
        });
        this.npcManager.create();

        // Create party manager (must be after NPC manager)
        this.partyManager = new PartyManager(this);
        this.partyManager.init();
        
        // Add recruitable NPCs to NPC Manager for battle triggering
        const recruitableNPCs = this.partyManager.getRecruitableNPCObjects();
        recruitableNPCs.forEach(npc => {
            this.npcManager.npcs.push(npc);
        });
        console.log('[WorldScene] Added recruitable NPCs to NPC manager:', recruitableNPCs.length);
        
        // CRITICAL: Create sprites for already-recruited party members (from loaded save)
        this.createRecruitedMemberSprites();

        // Create HUD
        this.hudManager = new HUDManager(this);
        this.hudManager.create();
        
        // Initialize HUD with current game state from GameStateManager
        this.hudManager.updatePlayerStats();
        
        // Update NPC count based on current defeated NPCs
        const defeatedCount = this.defeatedNpcIds ? this.defeatedNpcIds.length : 0;
        const remainingCount = 15 - defeatedCount;
        console.log('[WorldScene] Updating HUD NPC count:', { 
            defeatedNpcIds: this.defeatedNpcIds,
            defeatedCount, 
            remainingCount 
        });
        this.hudManager.updateNPCCount(defeatedCount, remainingCount);

        // Set up camera to follow player AFTER player is created
        if (this.playerManager.player) {
            // Make sure camera is following the player
            this.cameras.main.startFollow(this.playerManager.player, true, 0.1, 0.1);
        }

        // Set up collisions
        layers.walls.setCollisionByProperty({ collision: true });
        this.physics.add.collider(this.playerManager.player, layers.walls);

        // Enable world bounds collision for player
        if (this.playerManager.player) {
            this.playerManager.player.body.setCollideWorldBounds(true);
            this.playerManager.player.body.onWorldBounds = true;
        }

        // Add world bounds collision listener
        this.physics.world.on('worldbounds', (body) => {
            if (body.gameObject === this.playerManager.player && 
                this.playerManager.controls &&
                this.playerManager.controls.isRunning) {
                console.log('World bounds collision detected');
                this.playerManager.controls.resetState();
            }
        });

        // Position player and camera
        if (this.loadedGame && this.loadedPlayerPosition && this.playerManager.player) {
            // Position player at loaded save point
            console.log('Setting player position from loaded game:', this.loadedPlayerPosition);
            this.playerManager.player.setPosition(this.loadedPlayerPosition.x, this.loadedPlayerPosition.y);
            this.cameras.main.centerOn(this.loadedPlayerPosition.x, this.loadedPlayerPosition.y);
        } else if (this.returnPosition && this.playerManager.player) {
            console.log('Setting player position to returnPosition:', this.returnPosition);
            this.playerManager.player.setPosition(this.returnPosition.x, this.returnPosition.y);
            this.cameras.main.centerOn(this.returnPosition.x, this.returnPosition.y);
        } else {
            console.log('Centering camera on map center');
            this.cameras.main.centerOn(mapWidth / 2, mapHeight / 2);
        }

        // Create charge gauge bar for Shift button
        this.createChargeGauge();

        // Create save point with glowing effect
        this.createSavePoint(300, 300); // Position at (300, 300) - adjust as needed
        this.isOnSavePoint = false;
        
        // Create flying vehicle (far right of map + 1500px) - only accessible with full party (4 members)
        this.createFlyingVehicle(mapWidth + 1300, mapHeight / 2);
        this.isNearVehicle = false;

        function adjustCameraForDevice() {
            const width = window.innerWidth;
            const height = window.innerHeight;

            if (width < 600) {
                // Mobile portrait
                this.cameras.main.setZoom(0.5);
            } else if (width < 900) {
                // Mobile landscape or small tablet
                this.cameras.main.setZoom(0.75);
            } else {
                // Tablet or desktop
                this.cameras.main.setZoom(1);
            }
        }

        window.addEventListener('resize', adjustCameraForDevice.bind(this));
        adjustCameraForDevice.call(this);
    
        // Set up M key to open the map
        this.input.keyboard.on('keydown-M', () => {
            console.log('[WorldScene] M key pressed, opening map');
            soundManager.playMenuConfirm(); // Sound effect
            this.scene.pause();
            this.scene.launch('MapScene', {
                playerPosition: this.playerManager.getPlayerPosition()
            });
        });

        // Set up / key to open the menu (using keyCode 191 directly)
        const slashKey = this.input.keyboard.addKey(191); // Forward slash keyCode
        slashKey.on('down', () => {
            console.log('[WorldScene] / key pressed, opening menu');
            console.log('[WorldScene] Player on save point:', this.isOnSavePoint);
            soundManager.playMenuConfirm(); // Sound effect
            this.scene.pause();
            this.scene.launch('MenuScene', {
                playerPosition: this.playerManager.getPlayerPosition(),
                isOnSavePoint: this.isOnSavePoint
            });
        });
        
        // DEBUG: F1 key to instantly access ShooterScene
        const f1Key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F1);
        f1Key.on('down', () => {
            console.log('[WorldScene] 🐛 DEBUG: F1 pressed - launching ShooterScene');
            soundManager.playMenuConfirm(); // Sound effect
            const currentLeader = partyLeadershipManager.getLeader();
            const returnPosition = currentLeader && currentLeader.sprite ? {
                x: currentLeader.sprite.x,
                y: currentLeader.sprite.y
            } : {
                x: this.playerManager.player.x,
                y: this.playerManager.player.y
            };
            
            this.scene.pause();
            this.scene.launch('ShooterScene', {
                returnPosition: returnPosition
            });
        });

        // Set up Return (Enter) key to FULLY pause the game
        this.isPaused = false;
        const returnKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        returnKey.on('down', () => {
            this.toggleGamePause();
        });
        
        // Enable pause input after a short delay to prevent accidental pause on scene start
        this.time.delayedCall(500, () => {
            this.pauseInputEnabled = true;
        });

        // Add click debugging
        this.input.on('pointerdown', (pointer) => {
            const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            console.log('Click position:', {
                screen: { x: pointer.x, y: pointer.y },
                world: { x: worldPoint.x, y: worldPoint.y },
                tile: {
                    x: this.map.worldToTileX(worldPoint.x),
                    y: this.map.worldToTileY(worldPoint.y)
                }
            });
        });

        // Set up scene event listeners
        this.events.on('pause', () => {
            console.log('[WorldScene] EVENT: Scene paused, hiding HUD');
            if (this.hudManager) {
                this.hudManager.setVisible(false);
            }
        });

        this.events.on('resume', (scene, data) => {
            console.log('[WorldScene] EVENT: Scene resumed event fired');
            console.log('[WorldScene] EVENT: Resume event data:', data);
            
            // Show HUD when resuming
            if (this.hudManager) {
                this.hudManager.setVisible(true);
            }
            
            // Process the data if available
            if (data) {
                console.log('[WorldScene] EVENT: Processing resume event data', data);
                this.handleResumeData(data);
            }
        });

        // Listen for menu closed event to update HUD immediately
        this.events.on('menu-closed', () => {
            console.log('[WorldScene] EVENT: Menu closed, updating HUD stats');
            if (this.hudManager) {
                this.hudManager.updatePlayerStats();
            }
        });

        console.log('[WorldScene] Scene event listeners registered');
    }
    
    /**
     * Handle data when scene resumes
     * This is called both from the resume() lifecycle method and the resume event
     */
    handleResumeData(data) {
        console.log('[WorldScene] handleResumeData called with:', data);
        
        if (!data) return;
        
        // Process recruitment
        if (data.transitionType === 'recruitment' && data.recruitedNpcId) {
            console.log('[WorldScene] Processing recruitment:', data.recruitedNpcId);
            
            // Get recruitable NPC data from PartyManager
            const npcData = this.partyManager?.getRecruitableNPC(data.recruitedNpcId);
            if (npcData) {
                // Add to party leadership system
                const added = partyLeadershipManager.addPartyMember(npcData);
                if (added) {
                    console.log('[WorldScene] ✅ Added to party leadership system');
                    
                    // Position new member near the player for smooth following start
                    // The following behavior will naturally position them correctly
                    const leader = partyLeadershipManager.getLeader();
                    if (leader && leader.sprite && npcData.gameObject) {
                        npcData.gameObject.setPosition(
                            leader.sprite.x - 60,
                            leader.sprite.y
                        );
                    }
                }
                
                // Handle in legacy PartyManager (for sprite management)
                if (this.partyManager) {
                    this.partyManager.handleRecruitmentSuccess(data.recruitedNpcId);
                    console.log('[WorldScene] Party manager updated for recruitment');
                }
            }
            
            // Remove recruited NPC from NPC manager's battle trigger list
            if (this.npcManager) {
                this.npcManager.npcs = this.npcManager.npcs.filter(npc => {
                    if (npc.npcData && npc.npcData.id === data.recruitedNpcId) {
                        console.log('[WorldScene] Removing recruited NPC from battle triggers:', npc.npcData.id);
                        return false;
                    }
                    return true;
                });
            }
            
            // Set player position and reposition entire party
            if (data.returnPosition && this.playerManager && this.playerManager.player) {
                console.log('[WorldScene] Restoring position after recruitment:', data.returnPosition);
                this.playerManager.player.setPosition(data.returnPosition.x, data.returnPosition.y);
                this.cameras.main.centerOn(data.returnPosition.x, data.returnPosition.y);
                
                // Reposition the entire party in formation around the restored position
                const party = partyLeadershipManager.getParty();
                if (party.length > 0) {
                    // Leader is at the restored position
                    if (party[0].sprite) {
                        party[0].sprite.setPosition(data.returnPosition.x, data.returnPosition.y);
                    }
                    // Arrange followers behind the leader
                    if (this.partyFollowingManager) {
                        this.partyFollowingManager.arrangeFormation(party);
                    }
                }
            }
            
            // Apply battle end cooldown
            if (this.npcManager) {
                this.npcManager.handleBattleEnd();
            }
            
            // Apply party HP states if provided
            if (data.partyHPStates) {
                this.applyPartyHPStates(data.partyHPStates);
            }
            
            // Update HUD to reflect any health changes from battle
            if (this.hudManager) {
                this.hudManager.updateWorldPartyStats();
            }
            
            return; // Early return for recruitment
        }
        
        // Process battle victory and defeated NPCs
        if (data.battleVictory && data.transitionType === 'victory') {
            console.log('[WorldScene] Processing battle victory in handleResumeData');
            
            // Set player position and reposition entire party
            if (data.returnPosition && this.playerManager && this.playerManager.player) {
                console.log('[WorldScene] Restoring position after victory:', data.returnPosition);
                this.playerManager.player.setPosition(data.returnPosition.x, data.returnPosition.y);
                this.cameras.main.centerOn(data.returnPosition.x, data.returnPosition.y);
                
                // Reposition the entire party in formation around the restored position
                const party = partyLeadershipManager.getParty();
                if (party.length > 0) {
                    // Leader is at the restored position
                    if (party[0].sprite) {
                        party[0].sprite.setPosition(data.returnPosition.x, data.returnPosition.y);
                    }
                    // Arrange followers behind the leader
                    if (this.partyFollowingManager) {
                        this.partyFollowingManager.arrangeFormation(party);
                    }
                }
            }
            
            // Update defeated NPCs
            if (this.npcManager && data.defeatedNpcIds && data.defeatedNpcIds.length > 0) {
                console.log('[WorldScene] Removing newly defeated NPCs:', data.defeatedNpcIds);
                this.npcManager.updateDefeatedNpcs(data.defeatedNpcIds);
                
                // Add to our cumulative defeated list
                this.defeatedNpcIds = [...new Set([...this.defeatedNpcIds, ...data.defeatedNpcIds])];
                console.log('[WorldScene] Total defeated NPCs:', this.defeatedNpcIds);
                console.log('[WorldScene] Updating HUD - Defeated:', this.defeatedNpcIds.length, 'Remaining:', 15 - this.defeatedNpcIds.length);
                
                // Update HUD immediately
                if (this.hudManager) {
                    this.hudManager.updateNPCCount(
                        this.defeatedNpcIds.length,
                        15 - this.defeatedNpcIds.length
                    );
                }
            }
            
            // Apply battle end cooldown
            if (this.npcManager) {
                this.npcManager.handleBattleEnd();
            }
            
            // Apply party HP states if provided
            if (data.partyHPStates) {
                this.applyPartyHPStates(data.partyHPStates);
            }
            
            // Update HUD to reflect any health changes from battle
            if (this.hudManager) {
                this.hudManager.updateWorldPartyStats();
            }
        } else if (data.transitionType === 'escape') {
            console.log('[WorldScene] Processing escape from battle');
            
            // Set player position and reposition entire party
            if (data.returnPosition && this.playerManager && this.playerManager.player) {
                console.log('[WorldScene] Restoring position after escape:', data.returnPosition);
                this.playerManager.player.setPosition(data.returnPosition.x, data.returnPosition.y);
                this.cameras.main.centerOn(data.returnPosition.x, data.returnPosition.y);
                
                // Reposition the entire party in formation around the restored position
                const party = partyLeadershipManager.getParty();
                if (party.length > 0) {
                    // Leader is at the restored position
                    if (party[0].sprite) {
                        party[0].sprite.setPosition(data.returnPosition.x, data.returnPosition.y);
                    }
                    // Arrange followers behind the leader
                    if (this.partyFollowingManager) {
                        this.partyFollowingManager.arrangeFormation(party);
                    }
                }
            }
            
            // Update NPC health with data from battle
            if (this.npcManager && data.updatedNpcHealth) {
                console.log('[WorldScene] Updating NPC health from battle:', data.updatedNpcHealth);
                this.npcManager.updateNpcHealth(data.updatedNpcHealth);
            }
            
            // Apply party HP states if provided
            if (data.partyHPStates) {
                this.applyPartyHPStates(data.partyHPStates);
            }
            
            // Update HUD to reflect any health changes from battle
            if (this.hudManager) {
                this.hudManager.updateWorldPartyStats();
            }
        }
    }
    
    applyPartyHPStates(hpStates) {
        console.log('[WorldScene] ========== APPLYING PARTY HP STATES ==========');
        console.log('[WorldScene] HP States received:', hpStates);
        
        // Apply player HP to GameStateManager
        if (hpStates.playerHP !== undefined) {
            gameStateManager.updatePlayerHealth(hpStates.playerHP);
            
            // ALSO update PartyLeadershipManager for player
            partyLeadershipManager.updateMemberStats('player', {
                health: hpStates.playerHP,
                maxHealth: hpStates.playerMaxHP
            });
            console.log(`[WorldScene] Updated player HP everywhere: ${hpStates.playerHP}/${hpStates.playerMaxHP}`);
        }
        
        // Apply party member HP states
        if (hpStates.partyMembers && hpStates.partyMembers.length > 0) {
            hpStates.partyMembers.forEach(memberHP => {
                console.log(`[WorldScene] Updating ${memberHP.name} HP: ${memberHP.currentHP}/${memberHP.maxHP} (Downed: ${memberHP.isDowned})`);
                
                // Update HP in PartyManager (for visual state in world)
                if (this.partyManager) {
                    const npcData = this.partyManager.getRecruitableNPC(memberHP.id);
                    if (npcData) {
                        npcData.stats.health = memberHP.currentHP;
                        npcData.isDowned = memberHP.isDowned;
                        
                        // Update visual state if downed
                        if (memberHP.isDowned && npcData.gameObject) {
                            npcData.gameObject.setAlpha(0.5);
                            console.log(`[WorldScene]   ${memberHP.name} is downed - reduced opacity`);
                        } else if (npcData.gameObject) {
                            npcData.gameObject.setAlpha(1.0);
                        }
                    }
                }
                
                // CRITICAL: Update PartyLeadershipManager (for MenuScene and other scenes)
                partyLeadershipManager.updateMemberStats(memberHP.id, {
                    health: memberHP.currentHP,
                    maxHealth: memberHP.maxHP
                });
                console.log(`[WorldScene]   ✅ Updated ${memberHP.name} in PartyLeadershipManager`);
            });
        }
        
        console.log('[WorldScene] =============================================');
    }

    createChargeGauge() {
        // Create charge gauge graphics
        this.chargeGaugeBackground = this.add.graphics();
        this.chargeGaugeFill = this.add.graphics();
        
        // Set depth to appear above player
        this.chargeGaugeBackground.setDepth(1000);
        this.chargeGaugeFill.setDepth(1001);
        
        // Gauge dimensions
        this.gaugeWidth = 60;
        this.gaugeHeight = 6;
        this.gaugeOffsetY = 48; // Distance below player
    }

    updateChargeGauge() {
        if (!this.playerManager || !this.playerManager.player || !this.playerManager.controls) return;
        
        const player = this.playerManager.player;
        const controls = this.playerManager.controls;
        const isCharging = controls.isCharging;
        
        // Position gauge below player
        const gaugeX = player.x - this.gaugeWidth / 2;
        const gaugeY = player.y + this.gaugeOffsetY;
        
        // Clear previous drawings
        this.chargeGaugeBackground.clear();
        this.chargeGaugeFill.clear();
        
        // Only show while Shift is being held (charging)
        if (isCharging) {
            // Calculate charge percentage
            const chargeTime = this.time.now - controls.chargeStartTime;
            const chargePercent = Math.min(chargeTime / controls.chargeRequired, 1);
            
            // Draw background (black with white border)
            this.chargeGaugeBackground.lineStyle(1, 0xffffff, 0.8);
            this.chargeGaugeBackground.fillStyle(0x000000, 0.6);
            this.chargeGaugeBackground.fillRect(gaugeX, gaugeY, this.gaugeWidth, this.gaugeHeight);
            this.chargeGaugeBackground.strokeRect(gaugeX, gaugeY, this.gaugeWidth, this.gaugeHeight);
            
            // Determine fill color based on charge level
            let fillColor;
            if (chargePercent >= 1) {
                fillColor = 0xffff00; // Yellow when fully charged
            } else {
                fillColor = 0xffffff; // White while charging
            }
            
            // Draw fill
            const fillWidth = this.gaugeWidth * chargePercent;
            this.chargeGaugeFill.fillStyle(fillColor, 0.9);
            this.chargeGaugeFill.fillRect(gaugeX, gaugeY, fillWidth, this.gaugeHeight);
        }
    }

    createSavePoint(x, y) {
        // Create elliptical glow effect for save point
        const ellipseWidth = 80;
        const ellipseHeight = 40;
        
        // Create graphics for the save point
        this.savePointGlow = this.add.graphics();
        this.savePointGlow.setDepth(0); // Below player
        
        // Store position
        this.savePointPosition = { x, y };
        
        // Draw base ellipse (lighter inner glow)
        this.savePointGlow.fillStyle(0x00ffff, 0.3);
        this.savePointGlow.fillEllipse(x, y, ellipseWidth, ellipseHeight);
        
        // Draw middle glow
        this.savePointGlow.fillStyle(0x00ffff, 0.2);
        this.savePointGlow.fillEllipse(x, y, ellipseWidth + 20, ellipseHeight + 10);
        
        // Draw outer glow
        this.savePointGlow.fillStyle(0x00ffff, 0.1);
        this.savePointGlow.fillEllipse(x, y, ellipseWidth + 40, ellipseHeight + 20);
        
        // Add pulsing animation
        this.tweens.add({
            targets: this.savePointGlow,
            alpha: 0.5,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
        
        // Create a physics zone for collision detection
        this.savePointZone = this.add.zone(x, y, ellipseWidth, ellipseHeight);
        this.physics.add.existing(this.savePointZone);
        this.savePointZone.body.setAllowGravity(false);
        this.savePointZone.body.moves = false;
        
        console.log('[WorldScene] Save point created at:', { x, y });
    }
    
    /**
     * Create sprites for already-recruited party members (from loaded save)
     * Called after PartyManager init to create visual representations
     */
    createRecruitedMemberSprites() {
        console.log('[WorldScene] ========== CREATING RECRUITED MEMBER SPRITES ==========');
        
        const party = partyLeadershipManager.getParty();
        const recruitedMembers = party.filter(m => m.type === 'npc');
        
        console.log('[WorldScene] Found', recruitedMembers.length, 'recruited members in party');
        
        recruitedMembers.forEach((member, index) => {
            console.log(`[WorldScene] Creating sprite for recruited member: ${member.name} (${member.id})`);
            
            // Get NPC data from PartyManager
            const npcData = this.partyManager.getRecruitableNPC(member.id);
            if (!npcData) {
                console.warn(`[WorldScene] No NPC data found for ${member.id}`);
                return;
            }
            
            // Position near player (will be arranged by following system)
            const playerPos = this.playerManager.player;
            const offsetX = -60 * (index + 1); // Stack to the left
            const x = playerPos.x + offsetX;
            const y = playerPos.y;
            
            // Create NPC body sprite
            const sprite = this.add.rectangle(x, y, 32, 64, member.color);
            this.physics.add.existing(sprite);
            sprite.body.setCollideWorldBounds(true);
            
            // Create direction indicator
            const indicator = this.add.circle(
                x,
                y - 40,
                10,
                member.indicatorColor
            );
            indicator.setDepth(1000);
            
            console.log(`[WorldScene]   ✅ Created sprite for ${member.name} at (${x}, ${y})`);
            
            // Update PartyManager with the sprite reference
            npcData.gameObject = sprite;
            npcData.indicator = indicator;
            npcData.recruited = true;
            
            // Apply saved HP state if damaged
            if (member.stats.health < member.stats.maxHealth) {
                console.log(`[WorldScene]   ⚠️ ${member.name} has reduced HP: ${member.stats.health}/${member.stats.maxHealth}`);
                npcData.stats.health = member.stats.health;
            }
            
            // Apply downed state if HP is 0
            if (member.stats.health <= 0) {
                console.log(`[WorldScene]   💀 ${member.name} is DOWNED`);
                npcData.isDowned = true;
                sprite.setAlpha(0.5);
            }
            
            // Update PartyLeadershipManager with sprite references
            partyLeadershipManager.updateSpriteReference(member.id, sprite, indicator);
            
            console.log(`[WorldScene]   ✅ Updated managers with sprite references`);
        });
        
        console.log('[WorldScene] =============================================');
    }
    
    createFlyingVehicle(x, y) {
        console.log('[WorldScene] Creating flying vehicle at:', { x, y });
        
        // Create vehicle (red rectangle with glow)
        this.vehicle = this.add.rectangle(x, y, 80, 120, 0xFF0000);
        this.vehicle.setDepth(10);
        
        // Create glowing aura around vehicle
        this.vehicleGlow = this.add.graphics();
        this.vehicleGlow.setDepth(9);
        
        // Store position for redrawing glow
        this.vehiclePosition = { x, y };
        
        // Draw initial glow
        this.updateVehicleGlow();
        
        // Add pulsing glow animation
        this.tweens.add({
            targets: this.vehicleGlow,
            alpha: 0.6,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
        
        // Add floating animation
        this.tweens.add({
            targets: this.vehicle,
            y: y - 15,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
        
        // Create trigger zone (larger than vehicle for easier access)
        this.vehicleTriggerZone = this.add.zone(x, y, 150, 180);
        this.physics.add.existing(this.vehicleTriggerZone);
        this.vehicleTriggerZone.body.setAllowGravity(false);
        this.vehicleTriggerZone.body.moves = false;
        
        // Create DOM prompt element (hidden by default)
        this.createVehiclePrompt();
        
        console.log('[WorldScene] Flying vehicle created at far right of map');
    }
    
    updateVehicleGlow() {
        if (!this.vehicleGlow || !this.vehiclePosition) return;
        
        const { x, y } = this.vehiclePosition;
        
        this.vehicleGlow.clear();
        
        // Inner glow (red)
        this.vehicleGlow.fillStyle(0xFF0000, 0.4);
        this.vehicleGlow.fillRect(x - 50, y - 70, 100, 140);
        
        // Middle glow
        this.vehicleGlow.fillStyle(0xFF4444, 0.3);
        this.vehicleGlow.fillRect(x - 65, y - 85, 130, 170);
        
        // Outer glow
        this.vehicleGlow.fillStyle(0xFF6666, 0.2);
        this.vehicleGlow.fillRect(x - 80, y - 100, 160, 200);
    }
    
    createVehiclePrompt() {
        this.vehiclePrompt = document.createElement('div');
        this.vehiclePrompt.id = 'vehicle-prompt';
        this.vehiclePrompt.style.cssText = `
            position: fixed;
            bottom: 150px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            border: 3px solid #FF0000;
            border-radius: 15px;
            padding: 20px 40px;
            color: white;
            font-family: Arial, sans-serif;
            font-size: 24px;
            text-align: center;
            z-index: 1000;
            display: none;
            box-shadow: 0 0 30px rgba(255, 0, 0, 0.6);
        `;
        document.body.appendChild(this.vehiclePrompt);
    }
    
    updateVehiclePrompt() {
        if (!this.vehiclePrompt) return;
        
        const partySize = partyLeadershipManager.getPartySize();
        
        if (this.isNearVehicle) {
            if (partySize >= 4) {
                // Full party - can enter
                this.vehiclePrompt.innerHTML = `
                    <div style="color: #00FF00; font-size: 28px; font-weight: bold; margin-bottom: 10px;">
                        🚀 FLYING VEHICLE
                    </div>
                    <div style="color: #FFD700; margin-bottom: 10px;">
                        Full party assembled!
                    </div>
                    <div style="color: white;">
                        Press <span style="color: #FFD700; font-weight: bold;">U</span> or <span style="color: #FFD700; font-weight: bold;">A Button</span> to board
                    </div>
                `;
                this.vehiclePrompt.style.display = 'block';
            } else {
                // Not enough party members
                this.vehiclePrompt.innerHTML = `
                    <div style="color: #FF4444; font-size: 24px; font-weight: bold; margin-bottom: 10px;">
                        🚀 FLYING VEHICLE
                    </div>
                    <div style="color: #FFD700; margin-bottom: 10px;">
                        Requires full party (4 members)
                    </div>
                    <div style="color: #FF8888; font-size: 18px;">
                        Current party: ${partySize}/4
                    </div>
                    <div style="color: #AAA; font-size: 16px; margin-top: 10px;">
                        Recruit more members to unlock
                    </div>
                `;
                this.vehiclePrompt.style.display = 'block';
            }
        } else {
            this.vehiclePrompt.style.display = 'none';
        }
    }

    update() {
        // Update gamepad
        this.updateGamepad();
        
        // Check for pause with Start button (button 9) - only if pause input is enabled
        if (this.pauseInputEnabled && this.isGamepadButtonJustPressed(9)) {
            this.toggleGamePause();
            return;
        }
        
        // Check for menu with Select button (button 8)
        if (this.isGamepadButtonJustPressed(8)) {
            console.log('[WorldScene] Select button pressed, opening menu');
            soundManager.playMenuConfirm(); // Sound effect
            this.scene.pause();
            this.scene.launch('MenuScene', {
                playerPosition: this.playerManager.getPlayerPosition(),
                isOnSavePoint: this.isOnSavePoint
            });
            return;
        }
        
        // Check for map with R2 button (button 7)
        if (this.isGamepadButtonJustPressed(7)) {
            console.log('[WorldScene] R2 button pressed, opening map');
            soundManager.playMenuConfirm(); // Sound effect
            this.scene.pause();
            this.scene.launch('MapScene', {
                playerPosition: this.playerManager.getPlayerPosition()
            });
            return;
        }
        
        // Update leader rotation cooldown
        if (this.leaderRotateCooldown > 0) {
            this.leaderRotateCooldown -= this.game.loop.delta;
        }
        
        // Check for leader rotation with Q/E keys or D-pad Left/Right
        if (partyLeadershipManager.getPartySize() >= 2 && this.leaderRotateCooldown <= 0) {
            const qKey = this.input.keyboard.addKey('Q');
            const eKey = this.input.keyboard.addKey('E');
            
            // Q key or D-pad Left (button 14) - Rotate left
            if (Phaser.Input.Keyboard.JustDown(qKey) || this.isGamepadButtonJustPressed(14)) {
                console.log('[WorldScene] Q/D-pad Left pressed - rotating leader left');
                // Store current leader position BEFORE rotation
                const currentLeader = partyLeadershipManager.getLeader();
                const oldLeaderPos = currentLeader && currentLeader.sprite ? 
                    { x: currentLeader.sprite.x, y: currentLeader.sprite.y } : null;
                
                const newLeader = partyLeadershipManager.rotateLeft();
                if (newLeader) {
                    this.switchControlToLeader(newLeader, oldLeaderPos);
                    this.leaderRotateCooldown = this.leaderRotateDelay;
                }
            }
            
            // E key or D-pad Right (button 15) - Rotate right
            if (Phaser.Input.Keyboard.JustDown(eKey) || this.isGamepadButtonJustPressed(15)) {
                console.log('[WorldScene] E/D-pad Right pressed - rotating leader right');
                // Store current leader position BEFORE rotation
                const currentLeader = partyLeadershipManager.getLeader();
                const oldLeaderPos = currentLeader && currentLeader.sprite ? 
                    { x: currentLeader.sprite.x, y: currentLeader.sprite.y } : null;
                
                const newLeader = partyLeadershipManager.rotateRight();
                if (newLeader) {
                    this.switchControlToLeader(newLeader, oldLeaderPos);
                    this.leaderRotateCooldown = this.leaderRotateDelay;
                }
            }
        }
        
        // Player update (controls whichever character is currently leader)
        this.playerManager?.update();

        // Party following update (everyone follows in formation)
        const party = partyLeadershipManager.getParty();
        this.partyFollowingManager?.update(party);

        // Legacy party manager update (for recruitable NPC behavior only)
        this.partyManager?.update();

        // NPC update
        this.npcManager?.update();

        // Check for NPC interactions
        if (this.playerManager && this.playerManager.player) {
            this.npcManager.checkInteraction(this.playerManager.player);
        }
        
        // Update charge gauge
        this.updateChargeGauge();
        
        // Check if player is on save point
        if (this.playerManager && this.playerManager.player && this.savePointZone) {
            const distance = Phaser.Math.Distance.Between(
                this.playerManager.player.x,
                this.playerManager.player.y,
                this.savePointPosition.x,
                this.savePointPosition.y
            );
            
            // Player is on save point if within 50 pixels
            this.isOnSavePoint = distance < 50;
        }
        
        // Check if player is near flying vehicle
        if (this.playerManager && this.playerManager.player && this.vehicleTriggerZone) {
            const distanceToVehicle = Phaser.Math.Distance.Between(
                this.playerManager.player.x,
                this.playerManager.player.y,
                this.vehiclePosition.x,
                this.vehiclePosition.y
            );
            
            // Player is near vehicle if within 100 pixels
            const wasNearVehicle = this.isNearVehicle;
            this.isNearVehicle = distanceToVehicle < 100;
            
            // Update prompt when proximity changes
            if (this.isNearVehicle !== wasNearVehicle) {
                this.updateVehiclePrompt();
            }
            
            // Check for U key or A button (button 0) to board vehicle (only if full party)
            if (this.isNearVehicle && partyLeadershipManager.getPartySize() >= 4) {
                const uKey = this.input.keyboard.addKey('U');
                if (Phaser.Input.Keyboard.JustDown(uKey) || this.isGamepadButtonJustPressed(0)) {
                    this.boardFlyingVehicle();
                }
            }
        } else if (this.isNearVehicle) {
            // Left the vehicle area
            this.isNearVehicle = false;
            this.updateVehiclePrompt();
        }
        
        // Update HUD stats periodically (every second)
        if (!this.lastStatsUpdate) {
            this.lastStatsUpdate = 0;
        }
        
        if (this.time.now - this.lastStatsUpdate >= 1000 && this.hudManager) {
            this.hudManager.updatePlayerStats();
            this.lastStatsUpdate = this.time.now;
        }
    }

    toggleGamePause() {
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            console.log('[WorldScene] ⏸️ GAME FULLY PAUSED (Return key)');
            
            // Pause the game timer
            gameStateManager.pauseTimer();
            
            // Pause the scene
            this.scene.pause();
            
            // Create pause overlay
            this.createPauseOverlay();
            
        } else {
            console.log('[WorldScene] ▶️ GAME RESUMED (Return key)');
            
            // Resume the game timer
            gameStateManager.resumeTimer();
            
            // Resume the scene
            this.scene.resume();
            
            // Remove pause overlay
            this.removePauseOverlay();
        }
    }
    
    createPauseOverlay() {
        // Create DOM pause overlay
        this.pauseOverlay = document.createElement('div');
        this.pauseOverlay.id = 'game-pause-overlay';
        this.pauseOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.8);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-family: Arial, sans-serif;
        `;
        
        this.pauseOverlay.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 72px; font-weight: bold; color: #FFD700; margin-bottom: 20px;">
                    ⏸️ PAUSED
                </div>
                <div style="font-size: 24px; color: #FFF; margin-bottom: 30px;">
                    Game time and all activity paused
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
                console.log('[WorldScene] Enter key detected on pause overlay');
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
        
        // Remove DOM keyboard listener
        if (this.pauseKeyListener) {
            document.removeEventListener('keydown', this.pauseKeyListener);
            this.pauseKeyListener = null;
        }
        
        if (this.pauseGamepadInterval) {
            clearInterval(this.pauseGamepadInterval);
            this.pauseGamepadInterval = null;
        }
    }
    
    // Gamepad helper methods
    updateGamepad() {
        if (typeof window !== 'undefined' && window.getGlobalGamepad) {
            this.gamepad = window.getGlobalGamepad();
        }
    }
    
    /**
     * Switch control from current leader to new leader
     * Updates PlayerManager and camera to follow the new leader
     */
    switchControlToLeader(newLeader, oldLeaderPosition = null) {
        console.log(`[WorldScene] ======== SWITCHING CONTROL TO ${newLeader.name} ========`);
        
        if (!newLeader.sprite) {
            console.warn('[WorldScene] New leader has no sprite!');
            return;
        }
        
        // Get the party after rotation
        const party = partyLeadershipManager.getParty();
        
        // Stop all character velocities to prevent carryover
        party.forEach(member => {
            if (member.sprite && member.sprite.body) {
                member.sprite.body.setVelocity(0, 0);
            }
        });
        
        // CRITICAL: Move the new leader to the old leader's position to prevent party shift
        if (oldLeaderPosition && newLeader.sprite) {
            const offsetX = oldLeaderPosition.x - newLeader.sprite.x;
            const offsetY = oldLeaderPosition.y - newLeader.sprite.y;
            
            // Move the entire party by this offset to maintain formation
            party.forEach(member => {
                if (member.sprite) {
                    member.sprite.x += offsetX;
                    member.sprite.y += offsetY;
                    if (member.sprite.body) {
                        member.sprite.body.reset(member.sprite.x, member.sprite.y);
                    }
                }
            });
            
            console.log(`[WorldScene] ✅ Adjusted party position to prevent shift (offset: ${offsetX.toFixed(1)}, ${offsetY.toFixed(1)})`);
        }
        
        // Update PlayerManager to control the new leader sprite
        if (this.playerManager) {
            this.playerManager.player = newLeader.sprite;
            
            // Update WorldControls reference to the new leader AND its indicator
            if (this.playerManager.controls) {
                this.playerManager.controls.player = newLeader.sprite;
                
                // CRITICAL: Transfer the direction indicator to the new leader
                // Don't hide the old indicator - let PartyFollowingManager manage it
                if (this.playerManager.controls.directionIndicator) {
                    // Keep old indicator visible if it's not the new leader's indicator
                    if (this.playerManager.controls.directionIndicator !== newLeader.indicator) {
                        this.playerManager.controls.directionIndicator.setVisible(true);
                    }
                }
                
                // Set the new leader's indicator as the active direction indicator
                this.playerManager.controls.directionIndicator = newLeader.indicator;
                
                // Update the indicator color to match the new leader
                if (newLeader.indicator) {
                    newLeader.indicator.setFillStyle(newLeader.indicatorColor);
                    newLeader.indicator.setVisible(true);
                }
                
                // Reset movement state
                this.playerManager.controls.isRunning = false;
                this.playerManager.controls.isCharging = false;
                console.log(`[WorldScene] ✅ Controls now operate ${newLeader.name}`);
                console.log(`[WorldScene] ✅ Direction indicator transferred to ${newLeader.name} (color: 0x${newLeader.indicatorColor.toString(16)})`);
            }
        }
        
        // Update camera to follow new leader
        this.cameras.main.startFollow(newLeader.sprite, true, 0.1, 0.1);
        console.log(`[WorldScene] ✅ Camera now follows ${newLeader.name}`);
        
        // DON'T call arrangeFormation here - it causes compounding position issues
        // The natural following behavior in update() will position followers correctly
        
        console.log('[WorldScene] =============================================');
    }

    isGamepadButtonJustPressed(buttonIndex) {
        if (!this.gamepad) return false;
        
        // Ensure gamepadButtonStates is initialized
        if (!this.gamepadButtonStates) {
            this.gamepadButtonStates = {};
        }
        
        const currentState = this.gamepad.buttons && this.gamepad.buttons[buttonIndex]?.pressed;
        const previousState = this.gamepadButtonStates[buttonIndex] || false;
        
        this.gamepadButtonStates[buttonIndex] = currentState;
        
        return currentState && !previousState;
    }

    wake(sys, data) {
        console.log('WorldScene wake with data:', data);
        if (data?.returnPosition && this.playerManager?.player) {
            this.playerManager.player.setPosition(data.returnPosition.x, data.returnPosition.y);
            this.cameras.main.centerOn(data.returnPosition.x, data.returnPosition.y);
        }
    }

    resume(sys, data) {
        console.log('[WorldScene] ========== RESUME LIFECYCLE METHOD CALLED ==========');
        console.log('[WorldScene] Resume parameters - sys:', sys);
        console.log('[WorldScene] Resume parameters - data:', JSON.stringify(data, null, 2));
        console.log('[WorldScene] Current defeated NPCs before update:', this.defeatedNpcIds);
        
        // Ensure scene is properly initialized
        if (!this.scene.isActive()) {
            console.log('[WorldScene] Scene not active, restarting...');
            this.scene.restart();
            return;
        }
        
        // Show WorldScene HUD (it was hidden when scene paused)
        if (this.hudManager) {
            this.hudManager.setVisible(true);
        }
        
        // Re-enable input
        this.input.enabled = true;
        
        // Process the data using the centralized handler
        if (data) {
            this.handleResumeData(data);
        }
        
        // Update HUD with current stats from GameStateManager (always update after resume)
        if (this.hudManager) {
            console.log('[WorldScene] Resume: Updating player stats from GameStateManager');
            const stats = gameStateManager.getPlayerStats();
            console.log('[WorldScene] Current stats:', { level: stats.level, xp: stats.experience, health: stats.health });
            this.hudManager.updatePlayerStats();
            // Force a fresh update after a short delay to ensure UI reflects changes
            this.time.delayedCall(100, () => {
                if (this.hudManager) {
                    this.hudManager.updatePlayerStats();
                }
            });
        }
        
        // Re-enable physics and collisions
        if (this.physics && this.playerManager && this.playerManager.player) {
            this.physics.world.resume();
            this.physics.world.enable(this.playerManager.player);
            this.cameras.main.startFollow(this.playerManager.player);
        }
    }

    startDefeatedNpcAnimation(defeatedNpcIds) {
        console.log('[WorldScene] Starting defeated NPC animation for:', defeatedNpcIds);
        
        defeatedNpcIds.forEach(npcId => {
            const npc = this.npcManager.npcs.find(n => n.npcData.id === npcId);
            if (npc) {
                // Store original alpha
                const originalAlpha = npc.alpha;
                
                // Create blinking animation
                this.tweens.add({
                    targets: npc,
                    alpha: 0,
                    duration: 200,
                    yoyo: true,
                    repeat: 2,
                    onComplete: () => {
                        // After blinking, remove the NPC
                        if (npc.triggerZone) {
                            npc.triggerZone.destroy();
                        }
                        npc.destroy();
                        
                        // Remove from npcs array
                        this.npcManager.npcs = this.npcManager.npcs.filter(n => n.npcData.id !== npcId);
                        
                        console.log(`[WorldScene] Removed defeated NPC: ${npcId}`);
                    }
                });
            }
        });
    }

    pause() {
        console.log('WorldScene paused');
        // Optional: Pause any ongoing animations or timers
    }

    sleep() {
        console.log('WorldScene sleep');
        // Optional: Clean up any resources that shouldn't persist while sleeping
    }

    shutdown() {
        console.log('WorldScene shutdown');
        // Clean up any resources that shouldn't persist after shutdown
        if (this.playerManager) {
            // Clean up player manager resources
            this.playerManager = null;
        }
        if (this.npcManager) {
            // Clean up NPC manager resources
            this.npcManager = null;
        }
        
        // Clean up charge gauge graphics
        if (this.chargeGaugeBackground) {
            this.chargeGaugeBackground.destroy();
            this.chargeGaugeBackground = null;
        }
        if (this.chargeGaugeFill) {
            this.chargeGaugeFill.destroy();
            this.chargeGaugeFill = null;
        }
        
        // Call parent shutdown
        super.shutdown();
    }

    boardFlyingVehicle() {
        console.log('[WorldScene] ========== BOARDING FLYING VEHICLE ==========');
        console.log('[WorldScene] Full party detected - entering rail shooter scene');
        
        // Play boarding sound
        soundManager.playMenuConfirm();
        
        // Store current position
        const currentLeader = partyLeadershipManager.getLeader();
        const returnPosition = currentLeader && currentLeader.sprite ? {
            x: currentLeader.sprite.x,
            y: currentLeader.sprite.y
        } : {
            x: this.playerManager.player.x,
            y: this.playerManager.player.y
        };
        
        console.log('[WorldScene] Storing position for return:', returnPosition);
        
        // Create boarding animation
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        
        const boardingText = this.add.text(
            centerX,
            centerY,
            'BOARDING VEHICLE...',
            {
                fontSize: '48px',
                fontFamily: 'Arial',
                color: '#FF0000',
                stroke: '#000000',
                strokeThickness: 6,
                fontWeight: 'bold'
            }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(10000);
        
        // Flash effect
        this.tweens.add({
            targets: boardingText,
            alpha: 0,
            duration: 200,
            yoyo: true,
            repeat: 2
        });
        
        // Transition to ShooterScene after delay
        this.time.delayedCall(1000, () => {
            boardingText.destroy();
            
            // Hide vehicle prompt
            if (this.vehiclePrompt) {
                this.vehiclePrompt.style.display = 'none';
            }
            
            // Pause WorldScene
            this.scene.pause();
            
            // Launch ShooterScene
            this.scene.launch('ShooterScene', {
                returnPosition: returnPosition
            });
            
            console.log('[WorldScene] Launched ShooterScene - rail shooter active!');
        });
    }
    
    startBattle(npcDataArray) {
        console.log('[WorldScene] ========== STARTING BATTLE ==========');
        console.log('[WorldScene] NPC data:', npcDataArray);
        
        if (!npcDataArray) {
            console.error('[WorldScene] No NPC data provided for battle');
            return;
        }

        const npcs = Array.isArray(npcDataArray) ? npcDataArray : [npcDataArray];
        const playerData = this.playerManager.getPlayerData();
        
        if (!playerData) {
            console.error('[WorldScene] No player data available');
            return;
        }

        // Store current NPC state
        const npcState = this.npcManager.getNpcData();
        
        // CRITICAL: Store the player's current position to return to after battle
        const currentLeader = partyLeadershipManager.getLeader();
        const playerPosition = currentLeader && currentLeader.sprite ? {
            x: currentLeader.sprite.x,
            y: currentLeader.sprite.y
        } : {
            x: this.playerManager.player.x,
            y: this.playerManager.player.y
        };
        
        console.log('[WorldScene] Storing player position for return:', playerPosition);
        
        // Pause this scene instead of stopping it
        this.scene.pause();
        
        // Get party members for battle in LEADERSHIP ORDER
        // Leader is at index 0, followers at 1, 2, 3
        const partyMembers = partyLeadershipManager.getPartyForBattle();
        
        console.log('[WorldScene] ========================================');
        console.log('[WorldScene] Party Leadership Manager - sending to battle');
        console.log('[WorldScene] Party size:', partyMembers.length);
        if (partyMembers.length > 0) {
            partyMembers.forEach((member, i) => {
                const role = i === 0 ? '👑 LEADER' : `   Follower ${i}`;
                console.log(`[WorldScene]   [${i}] ${role}: ${member.name} (Lvl ${member.stats?.level || 1})`);
            });
        } else {
            console.log('[WorldScene]   ⚠️ No party members');
        }
        console.log('[WorldScene] ========================================');
        
        // Start battle scene with NPC state, party data, and world position
        this.scene.launch('BattleScene', {
            playerData,
            npcDataArray: npcs,
            npcState: npcState,
            partyMembers: partyMembers,
            worldPosition: playerPosition // Pass the actual world position
        });
    }
}

