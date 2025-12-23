import Phaser from "phaser";
import { mobileManager } from "../managers/MobileManager.js";
import MobileControls from "../managers/MobileControls.js";

export default class MapScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MapScene' });
        this.player = null;
        this.npcs = [];
        this.isTransitioning = false;
        this.transitionTimer = null;
        this.playerBlinkTween = null;
        
        // Gamepad support
        this.gamepad = null;
        this.gamepadButtonStates = {};
        
        // Simple color palette for different tile types
        this.tilePalette = {
            'TX Sea': 0x0066cc,        // Blue
            'TX Tileset Grass': 0x33cc33,  // Green
            'TX Tileset Stone Ground': 0x999999, // Gray
            'TX Tileset Wall': 0x663300,   // Brown
            'TX Props': 0xffff00,      // Yellow
        };
    }

    init(data) {
        console.log('[MapScene] Initializing with data:', data);
        this.returnPosition = data?.returnPosition || null;
        this.npcState = data?.npcState || null;
        this.isTransitioning = data?.isTransitioning || false;
        this.transitionType = data?.transitionType || null;
        this.playerPosition = data.playerPosition;
        this.worldScene = this.scene.get('WorldScene');
        
        // Get world bounds from WorldScene
        this.worldBounds = this.worldScene.physics.world.bounds;
    }

    create() {
        console.log('[MapScene] Creating scene');
        
        // 1. First, let's verify we can access the tilemap
        const tilemap = this.worldScene.map;
        if (!tilemap) {
            console.error('[MapScene] No tilemap found!');
            return;
        }

        // 2. Log tilemap information
        console.log('[MapScene] Tilemap info:', {
            width: tilemap.width,
            height: tilemap.height,
            layers: tilemap.layers.map(l => l.name)
        });

        // Set camera to view entire scene (no culling)
        this.cameras.main.setScroll(0, 0);
        this.cameras.main.setZoom(1);
        this.cameras.main.setBounds(0, 0, this.cameras.main.width, this.cameras.main.height);

        // Add basic UI elements
        this.add.text(10, 10, 'Map Scene (Press M to close)', {
            fontSize: '16px',
            color: '#ffffff'
        }).setScrollFactor(0); // Keep UI fixed

        // Draw the entire minimap
        this.drawMinimap(tilemap);

        // Add M key handler
        this.input.keyboard.on('keydown-M', () => {
            console.log('[MapScene] Closing map');
            this.scene.resume('WorldScene');
            this.scene.stop();
        });

        // If we're transitioning, start the transition sequence
        if (this.isTransitioning) {
            this.startTransitionSequence();
        }
    }

    drawMainMap(tilemap) {
        // Main map settings
        const tileSize = 4;
        const mapWidth = tilemap.width * tileSize;
        const mapHeight = tilemap.height * tileSize;
        const centerX = this.cameras.main.centerX - (mapWidth / 2);
        const centerY = this.cameras.main.centerY - (mapHeight / 2);

        const mapGraphics = this.add.graphics();
        
        // Draw border
        mapGraphics.lineStyle(2, 0xffffff);
        mapGraphics.strokeRect(centerX - 2, centerY - 2, mapWidth + 4, mapHeight + 4);

        // Draw layers
        tilemap.layers.forEach(layer => {
            for (let y = 0; y < tilemap.height; y++) {
                for (let x = 0; x < tilemap.width; x++) {
                    const tile = layer.data[y][x];
                    if (tile && tile.index !== -1) {
                        const color = this.tilePalette[tile.tileset.name] || 0xcccccc;
                        mapGraphics.fillStyle(color, 1);
                        mapGraphics.fillRect(
                            centerX + (x * tileSize),
                            centerY + (y * tileSize),
                            tileSize,
                            tileSize
                        );
                    }
                }
            }
        });

        // Draw player on main map
        if (this.playerPosition) {
            const playerX = centerX + (this.playerPosition.x / tilemap.tileWidth) * tileSize;
            const playerY = centerY + (this.playerPosition.y / tilemap.tileHeight) * tileSize;
            mapGraphics.lineStyle(2, 0x000000);
            mapGraphics.fillStyle(0xffffff);
            mapGraphics.fillCircle(playerX, playerY, 3);
            mapGraphics.strokeCircle(playerX, playerY, 3);
        }
    }

    drawMinimap(tilemap) {
        // Calculate viewport dimensions
        const viewportWidth = this.cameras.main.width;
        const viewportHeight = this.cameras.main.height;
        
        // Define padding around the map (reduced for more space)
        const padding = 40;
        const availableWidth = viewportWidth - (padding * 2);
        const availableHeight = viewportHeight - (padding * 2);
        
        // Use world bounds for map dimensions
        const worldWidth = this.worldBounds.width;
        const worldHeight = this.worldBounds.height;
        const worldX = this.worldBounds.x;
        const worldY = this.worldBounds.y;
        
        // Calculate scale to fit ENTIRE world bounds in viewport
        const scaleX = availableWidth / worldWidth;
        const scaleY = availableHeight / worldHeight;
        const scale = Math.min(scaleX, scaleY);
        
        // Calculate actual minimap dimensions based on world bounds
        const minimapWidth = worldWidth * scale;
        const minimapHeight = worldHeight * scale;
        
        // Center the map in the viewport
        const minimapX = (viewportWidth - minimapWidth) / 2;
        const minimapY = (viewportHeight - minimapHeight) / 2;
        
        // Calculate how to position tilemap within the world bounds
        const tileSize = scale * tilemap.tileWidth;
        const tilemapOffsetX = -worldX * scale;
        const tilemapOffsetY = -worldY * scale;
        
        // Debug logging
        console.log('[MapScene] ========== MINIMAP DEBUG ==========');
        console.log('[MapScene] Viewport:', viewportWidth, 'x', viewportHeight);
        console.log('[MapScene] World Bounds:', worldWidth, 'x', worldHeight, 'at (', worldX, ',', worldY, ')');
        console.log('[MapScene] Tilemap:', tilemap.width, 'x', tilemap.height, 'tiles');
        console.log('[MapScene] Total layers:', tilemap.layers.length);
        console.log('[MapScene] Layer names:', tilemap.layers.map(l => l.name));
        console.log('[MapScene] Scale:', scale);
        console.log('[MapScene] Minimap dimensions:', minimapWidth, 'x', minimapHeight);
        console.log('[MapScene] Minimap position: (', minimapX, ',', minimapY, ')');
        console.log('[MapScene] =====================================');

        const minimapGraphics = this.add.graphics();
        minimapGraphics.setScrollFactor(0); // Keep graphics fixed to camera
        
        // Draw world bounds background with larger border and glow effect
        minimapGraphics.lineStyle(4, 0xffffff, 0.5); // Outer glow
        minimapGraphics.strokeRect(minimapX - 4, minimapY - 4, minimapWidth + 8, minimapHeight + 8);
        minimapGraphics.lineStyle(2, 0xffffff); // Inner border
        minimapGraphics.strokeRect(minimapX - 2, minimapY - 2, minimapWidth + 4, minimapHeight + 4);
        
        // Fill world bounds area with dark background
        minimapGraphics.fillStyle(0x000000, 0.9);
        minimapGraphics.fillRect(minimapX, minimapY, minimapWidth, minimapHeight);
        
        // Draw tilemap bounds indicator (lighter background to show actual game area)
        const tilemapWidth = tilemap.width * tilemap.tileWidth * scale;
        const tilemapHeight = tilemap.height * tilemap.tileHeight * scale;
        minimapGraphics.fillStyle(0x1a1a1a, 0.7);
        minimapGraphics.fillRect(
            minimapX + tilemapOffsetX,
            minimapY + tilemapOffsetY,
            tilemapWidth,
            tilemapHeight
        );
        
        // Draw tilemap border
        minimapGraphics.lineStyle(1, 0x00ff00, 0.5); // Green border for tilemap area
        minimapGraphics.strokeRect(
            minimapX + tilemapOffsetX,
            minimapY + tilemapOffsetY,
            tilemapWidth,
            tilemapHeight
        );

        // Draw minimap layers with enhanced visibility
        // Tiles are positioned within world bounds coordinate system
        let tilesDrawn = 0;
        const tilesetCounts = {}; // Track tiles per tileset for debugging
        
        console.log('[MapScene] ========== DRAWING LAYERS ==========');
        
        tilemap.layers.forEach((layer, index) => {
            let layerTileCount = 0;
            console.log('[MapScene] Processing layer:', layer.name, '(index:', index, ')');
            
            // Different alpha for different layer types
            let alpha = 1.0;
            if (layer.name === 'Sea' || layer.name === 'Ground') {
                alpha = 1.0; // Full opacity for base terrain
            } else if (layer.name === 'Walls') {
                alpha = 0.7; // Semi-transparent walls
            } else {
                alpha = 0.5; // More transparent for props/plants
            }
            
            for (let y = 0; y < tilemap.height; y++) {
                for (let x = 0; x < tilemap.width; x++) {
                    const tile = layer.data[y][x];
                    if (tile && tile.index !== -1) {
                        // Get tileset name
                        const tilesetName = tile.tileset ? tile.tileset.name : 'unknown';
                        tilesetCounts[tilesetName] = (tilesetCounts[tilesetName] || 0) + 1;
                        
                        // Match color by tileset name (using includes for partial matching)
                        let color = 0x808080; // Default gray
                        
                        // Base terrain colors (most important)
                        if (tilesetName.includes('Sea')) {
                            color = 0x1E90FF; // Dodger blue for water (brighter blue)
                        } else if (tilesetName.includes('Grass')) {
                            color = 0x32CD32; // Lime green for grass (bright green for land)
                        } 
                        // Ground/Stone colors
                        else if (tilesetName.includes('Stone')) {
                            color = 0xA0A0A0; // Light gray for stone
                        } else if (tilesetName.includes('Ground')) {
                            color = 0xD2B48C; // Tan for ground
                        } 
                        // Structure colors
                        else if (tilesetName.includes('Wall')) {
                            color = 0x696969; // Dim gray for walls
                        } else if (tilesetName.includes('Struct')) {
                            color = 0x8B4513; // Saddle brown for structures
                        } 
                        // Decoration colors
                        else if (tilesetName.includes('Props')) {
                            color = 0xDEB887; // Burlywood for props
                        } else if (tilesetName.includes('Plant')) {
                            color = 0x228B22; // Forest green for plants
                        }
                        
                        minimapGraphics.fillStyle(color, alpha);
                        
                        // Position tiles correctly within world bounds
                        const tileWorldX = x * tilemap.tileWidth;
                        const tileWorldY = y * tilemap.tileHeight;
                        const tileMapX = minimapX + tilemapOffsetX + (tileWorldX * scale);
                        const tileMapY = minimapY + tilemapOffsetY + (tileWorldY * scale);
                        
                        minimapGraphics.fillRect(
                            tileMapX,
                            tileMapY,
                            Math.max(1, tileSize),
                            Math.max(1, tileSize)
                        );
                        tilesDrawn++;
                        layerTileCount++;
                    }
                }
            }
            console.log('[MapScene]   Layer', layer.name, 'drew', layerTileCount, 'tiles');
        });
        
        console.log('[MapScene] ========== LAYER SUMMARY ==========');
        console.log('[MapScene] Total tiles drawn:', tilesDrawn);
        console.log('[MapScene] Tiles by tileset:', tilesetCounts);
        console.log('[MapScene] ========================================');

        // Draw grid for better visibility (only if tiles are large enough)
        if (tileSize >= 4) {
            minimapGraphics.lineStyle(1, 0xffffff, 0.1);
            for (let x = 0; x <= tilemap.width; x++) {
                const gridX = minimapX + tilemapOffsetX + (x * tilemap.tileWidth * scale);
                minimapGraphics.beginPath();
                minimapGraphics.moveTo(gridX, minimapY + tilemapOffsetY);
                minimapGraphics.lineTo(gridX, minimapY + tilemapOffsetY + (tilemap.height * tilemap.tileHeight * scale));
                minimapGraphics.strokePath();
            }
            for (let y = 0; y <= tilemap.height; y++) {
                const gridY = minimapY + tilemapOffsetY + (y * tilemap.tileHeight * scale);
                minimapGraphics.beginPath();
                minimapGraphics.moveTo(minimapX + tilemapOffsetX, gridY);
                minimapGraphics.lineTo(minimapX + tilemapOffsetX + (tilemap.width * tilemap.tileWidth * scale), gridY);
                minimapGraphics.strokePath();
            }
        }

        // Draw player on minimap with enhanced visibility
        if (this.playerPosition) {
            // Convert player world position to map position
            const playerMapX = minimapX + tilemapOffsetX + (this.playerPosition.x * scale);
            const playerMapY = minimapY + tilemapOffsetY + (this.playerPosition.y * scale);
            
            // Scale glow effects based on scale
            const glowSize1 = Math.max(4, scale * 40);
            const glowSize2 = Math.max(3, scale * 30);
            const markerSize = Math.max(2, scale * 20);
            
            // Add player glow effect
            minimapGraphics.lineStyle(Math.max(1, scale * 5), 0xffffff, 0.3);
            minimapGraphics.strokeCircle(playerMapX, playerMapY, glowSize1);
            minimapGraphics.lineStyle(Math.max(1, scale * 3), 0xffffff, 0.5);
            minimapGraphics.strokeCircle(playerMapX, playerMapY, glowSize2);
            
            // Draw player marker
            minimapGraphics.lineStyle(1, 0x000000);
            minimapGraphics.fillStyle(0xffffff);
            minimapGraphics.fillCircle(playerMapX, playerMapY, markerSize);
            minimapGraphics.strokeCircle(playerMapX, playerMapY, markerSize);
        }

        // Add enhanced minimap label - centered above the map
        const label = this.add.text(minimapX + (minimapWidth / 2), minimapY - 30, 'WORLD MAP', {
            fontSize: '20px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        });
        label.setOrigin(0.5, 0); // Center the text above the map
        label.setScrollFactor(0); // Keep label fixed
    }

    startTransitionSequence() {
        console.log('[MapScene] Starting transition sequence');
        this.isTransitioning = true;

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
            onComplete: () => {
                blackScreen.destroy();
                // Start blinking effect after fade in
                this.startBlinkingEffect();
            }
        });
    }

    startBlinkingEffect() {
        if (!this.player) {
            console.error('[MapScene] No player found for blinking effect');
            this.isTransitioning = false;
            return;
        }

        // Create blinking effect
        this.playerBlinkTween = this.tweens.add({
            targets: this.player,
            alpha: 0.5,
            duration: 200,
            yoyo: true,
            repeat: 5,
            onComplete: () => {
                this.player.setAlpha(1);
                this.isTransitioning = false;
                this.playerBlinkTween = null;
            }
        });

        // Set transition timer
        this.transitionTimer = this.time.delayedCall(3000, () => {
            console.log('[MapScene] Transition period ended');
            this.isTransitioning = false;
            if (this.playerBlinkTween) {
                this.playerBlinkTween.stop();
                this.player.setAlpha(1);
                this.playerBlinkTween = null;
            }
        });
    }

    checkNpcInteraction() {
        // Don't check for interactions during transition
        if (this.isTransitioning) {
            console.log('[MapScene] Skipping NPC interaction check during transition');
            return;
        }

        if (!this.player || !this.npcs) return;

        this.npcs.forEach(npc => {
            if (!npc || !npc.active) return;

            // Calculate distance between player and NPC
            const distance = Phaser.Math.Distance.Between(
                this.player.x,
                this.player.y,
                npc.x,
                npc.y
            );

            // Check if player is within trigger radius
            if (distance <= npc.triggerRadius) {
                console.log('[MapScene] Player entered NPC trigger zone:', {
                    npcId: npc.id,
                    distance: distance,
                    triggerRadius: npc.triggerRadius
                });

                // Immediately start battle with this NPC
                this.startBattle(npc);
                return; // Exit the loop after finding first NPC in range
            }
        });
    }

    startBattle(npc) {
        console.log('[MapScene] Starting battle with NPC:', npc.id);
        
        // Store current NPC state
        const npcState = this.npcs.map(n => ({
            id: n.id,
            x: n.x,
            y: n.y,
            type: n.type
        }));

        // Create black mask for transition
        const mask = this.add.graphics();
        mask.fillStyle(0x000000, 1);
        mask.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

        // Get player position in screen coordinates
        const playerScreenPos = this.cameras.main.getWorldPoint(this.player.x, this.player.y);

        // Animate mask scaling down to player position
        this.tweens.add({
            targets: mask,
            scaleX: 0.1,
            scaleY: 0.1,
            x: playerScreenPos.x,
            y: playerScreenPos.y,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                // Pause this scene
                this.scene.pause();
                
                // Launch battle scene
                this.scene.launch('BattleScene', {
                    playerData: {
                        x: this.player.x,
                        y: this.player.y,
                        health: 100
                    },
                    npcDataArray: [npc],
                    npcState: npcState,
                    transitionFrom: 'MapScene'
                });
            }
        });
    }

    returnToWorld() {
        console.log('[MapScene] Returning to world');
        
        // Store current NPC state
        const npcState = this.npcs.map(npc => ({
            id: npc.id,
            x: npc.x,
            y: npc.y,
            type: npc.type
        }));

        // Stop this scene
        this.scene.stop();
        
        // Resume WorldScene with NPC state
        this.scene.resume('WorldScene', {
            npcState: npcState,
            returnPosition: this.player ? { x: this.player.x, y: this.player.y } : null
        });
    }

    shutdown() {
        console.log('[MapScene] Running shutdown');
        
        // Clean up tweens and timers
        if (this.playerBlinkTween) {
            this.playerBlinkTween.stop();
            this.playerBlinkTween = null;
        }
        if (this.transitionTimer) {
            this.transitionTimer.destroy();
            this.transitionTimer = null;
        }

        // Remove all event listeners
        this.input.keyboard.removeAllKeys(true);
        this.input.keyboard.removeAllListeners();
        
        super.shutdown();
    }

    handleDefeatedNpcs(defeatedNpcIds) {
        console.log('[MapScene] Handling defeated NPCs:', defeatedNpcIds);
        
        defeatedNpcIds.forEach(npcId => {
            const npc = this.npcs.find(n => n.id === npcId);
            if (npc) {
                console.log(`[MapScene] Starting blink effect for NPC: ${npcId}`);
                
                // Create blink effect
                this.tweens.add({
                    targets: npc,
                    alpha: 0,
                    duration: 200,
                    yoyo: true,
                    repeat: 3,
                    onComplete: () => {
                        console.log(`[MapScene] Removing defeated NPC: ${npcId}`);
                        npc.destroy();
                        this.npcs = this.npcs.filter(n => n.id !== npcId);
                    }
                });
            }
        });
    }

    resume(sys, data) {
        console.log('[MapScene] Resuming with data:', data);
        
        // Re-enable input system
        this.input.keyboard.enabled = true;
        this.input.mouse.enabled = true;
        
        if (data?.isTransitioning) {
            console.log('[MapScene] Starting transition sequence');
            this.startTransitionSequence();
        }

        if (data?.returnPosition && this.player) {
            console.log('[MapScene] Setting player position to return position:', data.returnPosition);
            this.player.setPosition(data.returnPosition.x, data.returnPosition.y);
            this.cameras.main.centerOn(data.returnPosition.x, data.returnPosition.y);
        }

        // If we have battle victory data, process it
        if (data?.battleVictory && data?.defeatedNpcIds) {
            console.log('[MapScene] Processing battle victory, removing defeated NPCs:', data.defeatedNpcIds);
            this.handleDefeatedNpcs(data.defeatedNpcIds);
        }

        // Reset transition state after a short delay
        this.time.delayedCall(1000, () => {
            this.isTransitioning = false;
            console.log('[MapScene] Transition complete, scene is now active');
        });
    }

    update() {
        // Don't update during transition
        if (this.isTransitioning) return;
        
        // Update gamepad
        this.updateGamepad();
        
        // Check for R2 button to close map
        if (this.isGamepadButtonJustPressed(7)) {
            console.log('[MapScene] R2 button pressed, closing map');
            this.scene.resume('WorldScene');
            this.scene.stop();
            return;
        }
    }
    
    // Gamepad helper methods
    updateGamepad() {
        if (typeof window !== 'undefined' && window.getGlobalGamepad) {
            this.gamepad = window.getGlobalGamepad();
        }
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
}