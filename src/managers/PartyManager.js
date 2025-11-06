import { partyLeadershipManager } from './PartyLeadershipManager.js';

export default class PartyManager {
    constructor(scene) {
        this.scene = scene;
        this.partyMembers = []; // Array of recruited party members
        this.maxPartySize = 4; // Player + 3 recruitable characters
        this.followDistance = 50; // Distance between following characters
        this.recruitableNPCs = new Map(); // Map of recruitable NPCs
        this.leaderIndex = 0; // 0 = player, 1+ = party member (DEPRECATED - use PartyLeadershipManager)
        this.originalPlayer = null; // Store reference to original player sprite
    }

    init() {
        console.log('[PartyManager] Initializing party system');
        
        // Create recruitable NPCs in the world
        this.createRecruitableNPCs();
    }

    createRecruitableNPCs() {
        console.log('[PartyManager] Creating recruitable NPCs');

        // Define recruitable character data
        const recruitables = [
            {
                id: 'warrior',
                name: 'Warrior',
                color: 0x808080, // Gray body like player
                indicatorColor: 0x0000ff, // Blue indicator
                x: 500,
                y: 400,
                abilities: ['powerStrike', 'defend'],
                stats: {
                    health: 120,
                    maxHealth: 120, // Maximum HP
                    attack: 15,
                    defense: 10,
                    level: 1
                },
                dialogue: {
                    initial: "Greetings traveler! I'm a warrior seeking adventure. Will you let me join your party?",
                    accept: "Excellent! I'll fight by your side!",
                    reject: "Very well, perhaps another time."
                }
            },
            {
                id: 'mage',
                name: 'Mage',
                color: 0x808080,
                indicatorColor: 0xffff00, // Yellow indicator
                x: 700,
                y: 500,
                abilities: ['fireball', 'heal'],
                stats: {
                    health: 80,
                    maxHealth: 80, // Maximum HP
                    attack: 20,
                    defense: 5,
                    level: 1
                },
                dialogue: {
                    initial: "I sense great potential in you. May I join your journey?",
                    accept: "Together, our magic will be unstoppable!",
                    reject: "I understand. Safe travels."
                }
            },
            {
                id: 'ranger',
                name: 'Ranger',
                color: 0x808080,
                indicatorColor: 0x00ff00, // Green indicator
                x: 400,
                y: 600,
                abilities: ['quickShot', 'dodge'],
                stats: {
                    health: 100,
                    maxHealth: 100, // Maximum HP
                    attack: 12,
                    defense: 8,
                    level: 1
                },
                dialogue: {
                    initial: "You look like you could use a skilled ranger. Want some company?",
                    accept: "Great! My bow is at your service!",
                    reject: "No problem, good luck out there."
                }
            }
        ];

        // Create each recruitable NPC
        recruitables.forEach(data => {
            this.createRecruitableNPC(data);
        });
    }

    createRecruitableNPC(data) {
        // Create NPC body (gray rectangle like player)
        const npc = this.scene.add.rectangle(data.x, data.y, 32, 64, data.color);
        this.scene.physics.add.existing(npc);
        npc.body.setCollideWorldBounds(true);
        npc.body.setImmovable(true);

        // Create direction indicator with unique color
        const indicator = this.scene.add.rectangle(
            data.x,
            data.y - 40,
            10,
            10,
            data.indicatorColor
        );
        indicator.setDepth(1000);

        // Create battle trigger zone (like regular NPCs) - circular with stroke
        const triggerRadius = 80;
        const triggerZone = this.scene.add.circle(data.x, data.y, triggerRadius);
        triggerZone.setStrokeStyle(2, data.indicatorColor, 0.5); // Visible circle
        this.scene.physics.add.existing(triggerZone);
        triggerZone.body.setAllowGravity(false);
        triggerZone.body.setImmovable(true);
        triggerZone.body.setCircle(triggerRadius);

        // Store NPC data in standard format for NPC manager compatibility
        npc.npcData = {
            id: data.id,
            type: data.name.toUpperCase(),
            name: data.name,
            health: data.stats.health,
            maxHealth: data.stats.health,
            level: data.stats.level,
            color: data.color,
            indicatorColor: data.indicatorColor,
            abilities: data.abilities,
            stats: data.stats,
            dialogue: data.dialogue,
            isRecruitableCharacter: true,
            isRecruited: false,
            triggerRadius: triggerRadius
        };

        npc.triggerZone = triggerZone;

        // Store in our map
        const npcData = {
            gameObject: npc,
            indicator: indicator,
            triggerZone: triggerZone,
            id: data.id,
            name: data.name,
            indicatorColor: data.indicatorColor,
            abilities: data.abilities,
            stats: data.stats,
            dialogue: data.dialogue,
            isRecruited: false,
            isRecruitableCharacter: true
        };

        this.recruitableNPCs.set(data.id, npcData);

        console.log(`[PartyManager] Created recruitable NPC: ${data.name} at (${data.x}, ${data.y})`);
    }

    // Called from BattleScene when player chooses to recruit
    recruitFromBattle(npcId) {
        console.log('[PartyManager] ========== RECRUIT FROM BATTLE ==========');
        console.log('[PartyManager] Attempting to recruit NPC ID:', npcId);
        console.log('[PartyManager] Current party members count:', this.partyMembers.length);
        
        const npcData = this.recruitableNPCs.get(npcId);
        if (!npcData) {
            console.error(`[PartyManager] ❌ Cannot find recruitable NPC: ${npcId}`);
            return { success: false, message: 'Character not found' };
        }

        console.log('[PartyManager] Found NPC data:', npcData.name);
        
        if (npcData.isRecruited) {
            console.log('[PartyManager] ⚠️ NPC already recruited');
            return { success: false, message: `${npcData.name} is already in your party!` };
        }

        // Check if party is full
        if (this.partyMembers.length >= this.maxPartySize - 1) {
            console.log('[PartyManager] ⚠️ Party is full');
            return { success: false, message: 'Your party is full!' };
        }

        // Mark as recruited
        npcData.isRecruited = true;
        npcData.gameObject.npcData.isRecruited = true;

        // Add to party members
        this.partyMembers.push(npcData);
        console.log('[PartyManager] ✅ Added to party members array');
        console.log('[PartyManager] New party members count:', this.partyMembers.length);

        // Completely disable and hide the trigger zone (no more battles)
        if (npcData.triggerZone) {
            npcData.triggerZone.setVisible(false);
            npcData.triggerZone.setActive(false);
            if (npcData.triggerZone.body) {
                npcData.triggerZone.body.enable = false;
                this.scene.physics.world.disable(npcData.triggerZone);
            }
            // Remove the stroke to make it completely invisible
            npcData.triggerZone.setStrokeStyle(0, 0x000000, 0);
        }

        // Position the character near the player for smooth follow start
        const player = this.scene.playerManager.player;
        if (player) {
            const followIndex = this.partyMembers.length;
            npcData.gameObject.setPosition(
                player.x - (followIndex * this.followDistance),
                player.y
            );
        }

        // Make sure they're visible and active
        npcData.gameObject.setVisible(true);
        npcData.gameObject.setActive(true);
        npcData.indicator.setVisible(true);
        npcData.indicator.setActive(true);

        console.log(`[PartyManager] Successfully recruited ${npcData.name}! Party size: ${this.partyMembers.length + 1}/4`);

        // Save to game state
        this.savePartyToGameState();

        return {
            success: true,
            message: `${npcData.name} joined your party!`,
            memberData: {
                id: npcData.id,
                name: npcData.name,
                indicatorColor: npcData.indicatorColor,
                abilities: npcData.abilities,
                stats: { ...npcData.stats },
                color: npcData.gameObject.fillColor
            }
        };
    }
    
    savePartyToGameState() {
        // Save party data to gameStateManager for persistence
        const partyData = this.partyMembers.map(member => ({
            id: member.id,
            name: member.name,
            indicatorColor: member.indicatorColor,
            abilities: member.abilities,
            stats: { ...member.stats }
        }));
        
        // This will be used when saving/loading the game
        console.log('[PartyManager] Saved party to state:', partyData);
    }

    // Get recruitable NPC by ID (for battle scene)
    getRecruitableNPC(npcId) {
        return this.recruitableNPCs.get(npcId);
    }

    // Check if NPC is recruitable
    isRecruitableNPC(npcId) {
        return this.recruitableNPCs.has(npcId);
    }

    getColorHex(color) {
        return '#' + color.toString(16).padStart(6, '0');
    }
    
    // Get all recruitable NPCs (for NPC manager integration)
    getRecruitableNPCObjects() {
        const npcs = [];
        this.recruitableNPCs.forEach((npcData) => {
            if (!npcData.isRecruited) {
                npcs.push(npcData.gameObject);
            }
        });
        return npcs;
    }

    update() {
        // ===================================================================
        // LEGACY FOLLOWING SYSTEM DISABLED
        // PartyFollowingManager now handles ALL movement and following
        // This method only ensures visibility of recruited NPCs
        // ===================================================================
        
        if (this.partyMembers.length === 0) return;

        // Only manage visibility - DO NOT MOVE ANY SPRITES
        this.partyMembers.forEach((member) => {
            if (!member.gameObject || !member.gameObject.active) return;

            // Ensure recruited members are visible
            if (!member.gameObject.visible) {
                member.gameObject.setVisible(true);
                member.indicator.setVisible(true);
                console.log(`[PartyManager] Made ${member.name} visible`);
            }
        });
        
        // Note: All movement is handled by PartyFollowingManager in WorldScene.update()
    }

    getPartyForBattle() {
        console.log('[PartyManager] ========== GET PARTY FOR BATTLE ==========');
        console.log('[PartyManager] Party members array:', this.partyMembers);
        console.log('[PartyManager] Party members count:', this.partyMembers.length);
        
        // Return array of party members for battle scene
        const battleData = this.partyMembers.map((member, index) => {
            console.log(`[PartyManager] Processing member ${index + 1}:`, member.name);
            console.log(`[PartyManager]   - ID: ${member.id}`);
            console.log(`[PartyManager]   - GameObject exists: ${!!member.gameObject}`);
            console.log(`[PartyManager]   - GameObject fillColor: 0x${member.gameObject?.fillColor?.toString(16)}`);
            console.log(`[PartyManager]   - Indicator color: 0x${member.indicatorColor?.toString(16)}`);
            console.log(`[PartyManager]   - Stats:`, member.stats);
            
            return {
                id: member.id,
                name: member.name,
                color: member.gameObject.fillColor,
                indicatorColor: member.indicatorColor,
                abilities: member.abilities,
                stats: { ...member.stats }
            };
        });
        
        console.log('[PartyManager] Battle data prepared:', battleData);
        console.log('[PartyManager] =============================================');
        
        return battleData;
    }
    
    /**
     * Handle recruitment success after returning from BattleScene
     * This method is called by WorldScene to update the world state
     * after a successful recruitment
     */
    handleRecruitmentSuccess(recruitedNpcId) {
        console.log(`[PartyManager] Handling recruitment success in WorldScene for: ${recruitedNpcId}`);
        
        const npcData = this.recruitableNPCs.get(recruitedNpcId);
        if (!npcData) {
            console.error(`[PartyManager] Cannot find recruited NPC: ${recruitedNpcId}`);
            return;
        }
        
        // IMPORTANT: Keep the NPC's game object and indicator VISIBLE
        // They need to be visible to follow the player!
        if (npcData.gameObject) {
            npcData.gameObject.setVisible(true);
            npcData.gameObject.setActive(true);
            
            // Position near player to start following
            const player = this.scene.playerManager?.player;
            if (player) {
                const followIndex = this.partyMembers.length;
                npcData.gameObject.setPosition(
                    player.x - (followIndex * this.followDistance),
                    player.y
                );
            }
        }
        
        if (npcData.indicator) {
            npcData.indicator.setVisible(true);
            npcData.indicator.setActive(true);
            
            // Position indicator above the character
            if (npcData.gameObject) {
                npcData.indicator.setPosition(
                    npcData.gameObject.x,
                    npcData.gameObject.y - 40
                );
            }
        }
        
        // Disable the trigger zone (no more battles with this NPC)
        if (npcData.triggerZone) {
            npcData.triggerZone.setVisible(false);
            npcData.triggerZone.setActive(false);
            npcData.triggerZone.setStrokeStyle(0, 0x000000, 0);
            if (npcData.triggerZone.body) {
                npcData.triggerZone.body.enable = false;
                this.scene.physics.world.disable(npcData.triggerZone);
            }
        }
        
        console.log(`[PartyManager] ${npcData.name} is now visible and following player in WorldScene`);
    }

    /**
     * Rotate the leader (Q/E keys or D-pad in WorldScene)
     * @param {string} direction - 'left' or 'right'
     */
    rotateLeader(direction) {
        // DEPRECATED: This method is no longer used
        // Use PartyLeadershipManager.rotateLeft() or rotateRight() instead
        console.warn('[PartyManager] rotateLeader() is DEPRECATED - use PartyLeadershipManager instead');
    }
    
    /**
     * DEPRECATED: Rearrange the party formation based on the current leader
     */
    rearrangePartyFormation() {
        // DEPRECATED: This method is no longer used
        // PartyFollowingManager handles all formation logic now
        console.warn('[PartyManager] rearrangePartyFormation() is DEPRECATED - use PartyFollowingManager instead');
        return;
        
        // OLD CODE BELOW (kept for reference but never executes)
        /*
        // Get the current controllable sprite (always the one PlayerManager controls)
        const currentControllableSprite = this.scene.playerManager?.player;
        if (!currentControllableSprite) return;
        
        // Use original player reference for positioning in the array
        const player = this.originalPlayer || currentControllableSprite;
        
        // The front position is ALWAYS where the currently controllable sprite is
        // This is the sprite that PlayerManager is currently controlling
        const frontPos = { x: currentControllableSprite.x, y: currentControllableSprite.y };
        
        console.log(`[PartyManager] Front position (controllable sprite): (${frontPos.x}, ${frontPos.y})`);
        
        // Create an array of all characters with their data
        const allCharacters = [
            {
                index: 0,
                sprite: player,
                indicator: this.scene.playerManager?.directionIndicator,
                name: 'Player',
                color: 0x808080,
                indicatorColor: 0xff0000
            },
            ...this.partyMembers.map((member, i) => ({
                index: i + 1,
                sprite: member.gameObject,
                indicator: member.indicator,
                name: member.name,
                color: member.gameObject?.fillColor || 0x808080,
                indicatorColor: member.indicatorColor
            }))
        ];
        
        // Rearrange: move the leader to front, others shift back
        const leader = allCharacters[this.leaderIndex];
        const others = allCharacters.filter((_, i) => i !== this.leaderIndex);
        const newFormation = [leader, ...others];
        
        // Position everyone in the new formation
        newFormation.forEach((character, formationIndex) => {
            if (!character.sprite) return;
            
            if (formationIndex === 0) {
                // Leader goes to the front position (where controllable sprite currently is)
                character.sprite.setPosition(frontPos.x, frontPos.y);
            } else {
                // Others follow behind
                const followX = frontPos.x - (formationIndex * this.followDistance);
                character.sprite.setPosition(followX, frontPos.y);
            }
            
            // Update indicator position
            if (character.indicator) {
                character.indicator.setPosition(
                    character.sprite.x,
                    character.sprite.y - 40
                );
            }
            
            console.log(`[PartyManager] Positioned ${character.name} at (${character.sprite.x}, ${character.sprite.y})`);
        });
        
        const leaderName = this.leaderIndex === 0 ? 'Player' : this.partyMembers[this.leaderIndex - 1].name;
        console.log(`[PartyManager] Formation rearranged with ${leaderName} in front`);
        */
    }
    
    /**
     * DEPRECATED: Update visual indicators and camera for the current leader
     */
    updateLeaderVisuals() {
        // DEPRECATED: This method is no longer used
        // WorldScene.switchControlToLeader() handles all visual updates now
        console.warn('[PartyManager] updateLeaderVisuals() is DEPRECATED - use WorldScene.switchControlToLeader() instead');
        return;
        
        // OLD CODE BELOW (kept for reference but never executes)
        /*
        console.log('[PartyManager] ====== UPDATE LEADER VISUALS ======');
        console.log(`[PartyManager] Leader index: ${this.leaderIndex}`);
        
        // First, stop all sprites and reset their velocities to prevent carryover
        if (this.originalPlayer && this.originalPlayer.body) {
            this.originalPlayer.body.setVelocity(0, 0);
            console.log(`[PartyManager] Reset original player velocity at (${this.originalPlayer.x}, ${this.originalPlayer.y})`);
        }
        this.partyMembers.forEach((member, i) => {
            if (member.gameObject && member.gameObject.body) {
                member.gameObject.body.setVelocity(0, 0);
                console.log(`[PartyManager] Reset ${member.name} velocity at (${member.gameObject.x}, ${member.gameObject.y})`);
            }
        });
        
        // The sprite in the front position (after rearrangement) should always be
        // the one that the camera follows and PlayerManager controls
        if (this.leaderIndex === 0) {
            // Player is leader - restore original player control and camera
            if (this.originalPlayer) {
                console.log('[PartyManager] Switching back to original player');
                if (this.scene.playerManager) {
                    // Update PlayerManager's player reference FIRST
                    this.scene.playerManager.player = this.originalPlayer;
                    console.log(`[PartyManager] PlayerManager.player = originalPlayer at (${this.originalPlayer.x}, ${this.originalPlayer.y})`);
                    
                    // Reset any movement state and update controls reference
                    if (this.scene.playerManager.controls && this.scene.playerManager.controls.isRunning !== undefined) {
                        // This is WorldControls
                        this.scene.playerManager.controls.isRunning = false;
                        this.scene.playerManager.controls.isCharging = false;
                        // CRITICAL: Update the controls player reference to the original player
                        this.scene.playerManager.controls.player = this.originalPlayer;
                        console.log('[PartyManager] ✅ WorldControls.player = originalPlayer');
                    }
                }
                this.scene.cameras.main.startFollow(this.originalPlayer, true, 0.1, 0.1);
                console.log('[PartyManager] ✅ Camera following original player');
            }
        } else {
            // Party member is leader - they are now at front, camera follows them
            const leaderMember = this.partyMembers[this.leaderIndex - 1];
            if (leaderMember && leaderMember.gameObject) {
                console.log(`[PartyManager] Switching to party member: ${leaderMember.name}`);
                
                // Reset velocity on the new leader sprite
                if (leaderMember.gameObject.body) {
                    leaderMember.gameObject.body.setVelocity(0, 0);
                }
                
                this.scene.cameras.main.startFollow(leaderMember.gameObject, true, 0.1, 0.1);
                console.log(`[PartyManager] ✅ Camera following ${leaderMember.name} at (${leaderMember.gameObject.x}, ${leaderMember.gameObject.y})`);
                
                // IMPORTANT: Update PlayerManager to control the leader sprite instead of player
                if (this.scene.playerManager) {
                    // Update PlayerManager's player reference FIRST
                    this.scene.playerManager.player = leaderMember.gameObject;
                    console.log(`[PartyManager] PlayerManager.player = ${leaderMember.name} at (${leaderMember.gameObject.x}, ${leaderMember.gameObject.y})`);
                    
                    // Reset any movement state and update controls reference
                    if (this.scene.playerManager.controls && this.scene.playerManager.controls.isRunning !== undefined) {
                        // This is WorldControls
                        this.scene.playerManager.controls.isRunning = false;
                        this.scene.playerManager.controls.isCharging = false;
                        // CRITICAL: Update the controls player reference to the new leader
                        this.scene.playerManager.controls.player = leaderMember.gameObject;
                        console.log(`[PartyManager] ✅ WorldControls.player = ${leaderMember.name}`);
                    } else {
                        console.warn('[PartyManager] ⚠️ Could not update controls reference!');
                    }
                } else {
                    console.warn('[PartyManager] ⚠️ PlayerManager not found!');
                }
            }
        }
        console.log('[PartyManager] =====================================');
        */
    }

    cleanup() {
        console.log('[PartyManager] Cleaning up');
        
        // Remove recruitment overlay if it exists
        const overlay = document.getElementById('recruitment-overlay');
        if (overlay) {
            overlay.remove();
        }

        // Clean up recruitable NPCs
        this.recruitableNPCs.forEach(npcData => {
            if (npcData.gameObject) npcData.gameObject.destroy();
            if (npcData.indicator) npcData.indicator.destroy();
            if (npcData.triggerZone) npcData.triggerZone.destroy();
        });

        this.recruitableNPCs.clear();
        this.partyMembers = [];
    }
}

