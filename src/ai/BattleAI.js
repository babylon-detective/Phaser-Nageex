/**
 * Battle AI Module
 * Handles ALL NPC combat behaviors in BattleScene
 * 
 * This module is fully integrated into BattleScene.js and handles:
 * - NPC movement and positioning
 * - Attack decisions (melee vs ranged)
 * - AI state management (idle, combat, defensive)
 * - Target selection (player or party members)
 * - Attack execution (melee and ranged)
 * 
 * FUNDAMENTAL AI PRINCIPLE: When player acts (consumes AP) or charges AP, NPCs freely act
 * Guards with strong melee attacks keep walking TOWARD player when provoked and player charges AP.
 */

import { npcAI } from './NpcAI.js';
import { gameStateManager } from '../managers/GameStateManager.js';
import { soundManager } from '../managers/SoundManager.js';

export class BattleAI {
    constructor(scene) {
        this.scene = scene;
        this.enemyStates = new Map(); // Store AI state for each enemy
        
        // NPC movement properties (from scene)
        this.npcMovementSpeed = 150; // Base NPC movement speed
        this.npcAttackRange = 180; // Range at which NPCs can melee attack
        this.npcAttackCooldown = 1500; // ms between NPC attacks
        
        // Attack properties (from scene)
        this.attackDuration = 50;
        this.attackOffset = 150;
        this.attackWidth = 200;
        this.attackHeight = 40;
    }

    /**
     * Initialize AI for an enemy in battle
     */
    initEnemy(enemy, profile) {
        const difficulty = npcAI.getDifficulty();
        
        // Determine initial AI state based on NPC type
        let initialAIState = 'idle';
        if (profile.combatStyle === 'cautious' || profile.combatStyle === 'defensive') {
            initialAIState = 'defensive';
        }
        
        const aiState = {
            profile: profile,
            combatStyle: profile.combatStyle,
            aiState: initialAIState, // 'idle', 'combat', 'defensive'
            lastActionTime: 0,
            nextActionDelay: difficulty.reactionTime,
            currentTactic: 'approach',
            preferredDistance: profile.preferredRange === 'close' ? 150 : 300,
            attackCooldown: 0,
            dodgeCooldown: 0,
            movementPattern: null,
            aggressiveness: profile.attackFrequency * difficulty.aggressiveness,
            accuracy: difficulty.accuracy,
            panicThreshold: 0.3, // HP percentage to trigger panic
            isPanicking: false,
            hasBeenAttacked: false,
            currentTarget: null,
            direction: 1,
            isMoving: false,
            changeTimer: 0,
            changeInterval: Math.random() * 2000 + 1000,
            lastAttackTime: 0,
            consecutiveMeleeAttacks: 0
        };

        this.enemyStates.set(enemy, aiState);
        console.log(`[BattleAI] Initialized AI for ${enemy.enemyData.type}:`, {
            combatStyle: aiState.combatStyle,
            aiState: aiState.aiState,
            aggressiveness: aiState.aggressiveness
        });
    }

    /**
     * Update all enemies AI
     * FUNDAMENTAL AI PRINCIPLE: When player acts (consumes AP) or charges AP, NPCs freely act
     */
    update(enemies, player, delta, isPlayerChargingAP = false, isPlayerActing = false) {
        if (!player || !this.scene) return;
        
        // Don't move NPCs during dialogue, enemy selection, or victory
        if (this.scene.isDialogueActive || this.scene.isEnemySelectionMode || 
            !this.scene.isPlayerTurn || this.scene.isVictorySequence) {
            enemies.forEach(enemy => {
                if (enemy && enemy.body) {
                    enemy.body.setVelocityX(0);
                }
            });
            return;
        }

        // FUNDAMENTAL: NPCs should act when player acts OR charges AP
        const shouldNPCsAct = isPlayerActing || isPlayerChargingAP;
        
        if (!shouldNPCsAct) {
            // FREEZE all NPCs when player is not acting or charging AP
            enemies.forEach(enemy => {
                if (enemy && enemy.body) {
                    enemy.body.setVelocityX(0);
                }
            });
            return;
        }

        enemies.forEach(enemy => {
            const aiState = this.enemyStates.get(enemy);
            if (!aiState || !enemy || !enemy.active || !enemy.body || enemy.enemyData.health <= 0) {
                return;
            }

            // Find closest party member (player or party character) to target
            const { target: closestTarget, distance: distanceToTarget } = this.findClosestPartyMember(enemy, player);
            
            if (!closestTarget) {
                // No valid targets - stop moving
                enemy.body.setVelocityX(0);
                aiState.isMoving = false;
                return;
            }
            
            // Store current target for attack logic
            aiState.currentTarget = closestTarget;
            const distanceToPlayer = distanceToTarget;
            
            // Determine AI state based on HP and combat status
            const hpPercent = enemy.enemyData.health / enemy.enemyData.maxHealth;
            
            // Update AI state based on HP and combat status
            if (hpPercent <= 0.5 && aiState.aiState !== 'defensive') {
                aiState.aiState = 'defensive';
                console.log(`[BattleAI] ${enemy.enemyData.type} entering DEFENSIVE mode (HP: ${Math.floor(hpPercent * 100)}%)`);
            } else if (aiState.hasBeenAttacked && aiState.aiState === 'idle') {
                aiState.aiState = 'combat';
                console.log(`[BattleAI] ${enemy.enemyData.type} entering COMBAT mode!`);
                if (enemy.enemyData.type === 'GUARD') {
                    console.log(`[BattleAI] GUARD provoked - will keep walking TOWARD player when player charges AP`);
                }
            }
            
            // Update cooldowns
            aiState.attackCooldown = Math.max(0, aiState.attackCooldown - delta);
            aiState.dodgeCooldown = Math.max(0, aiState.dodgeCooldown - delta);

            // Check health for panic mode
            if (hpPercent < aiState.panicThreshold && !aiState.isPanicking) {
                aiState.isPanicking = true;
                console.log(`[BattleAI] ${enemy.enemyData.type} is panicking!`);
            }

            // Handle different AI states
            switch (aiState.aiState) {
                case 'idle':
                    this.updateNPCIdleState(enemy, aiState, delta, distanceToPlayer, isPlayerChargingAP);
                    break;
                    
                case 'combat':
                    this.updateNPCCombatState(enemy, aiState, delta, distanceToPlayer, isPlayerChargingAP);
                    break;
                    
                case 'defensive':
                    this.updateNPCDefensiveState(enemy, aiState, delta, distanceToPlayer, isPlayerChargingAP);
                    break;
            }
            
            // Keep NPCs within bounds
            const minX = 50;
            const maxX = this.scene.cameras.main.width - 50;
            
            if (enemy.x <= minX || enemy.x >= maxX) {
                enemy.body.setVelocityX(0);
            }
        });
    }

    /**
     * Find closest party member (player or party character) to target
     */
    findClosestPartyMember(npc, player) {
        // Create array of all targetable party members (player + active party characters)
        const allTargets = [player];
        
        if (this.scene.partyCharacters && this.scene.partyCharacters.length > 0) {
            this.scene.partyCharacters.forEach(character => {
                if (character && character.active && !character.memberData?.isDowned) {
                    allTargets.push(character);
                }
            });
        }
        
        // Find closest target
        let closestTarget = null;
        let closestDistance = Infinity;
        
        allTargets.forEach(target => {
            if (!target || !target.active) return;
            
            // Skip downed player
            if (target === player && this.scene.isPlayerDowned) return;
            
            const distance = Phaser.Math.Distance.Between(
                npc.x,
                npc.y,
                target.x,
                target.y
            );
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestTarget = target;
            }
        });
        
        return { target: closestTarget, distance: closestDistance };
    }

    /**
     * Check if NPC can perform ranged attacks
     */
    canNPCDoRangedAttack(npc, isPlayerCharging = false) {
        const npcType = npc.enemyData.type;
        // MERCHANT can do ranged, GUARD can do both
        // VILLAGER can do ranged attacks when player charges AP (throwing rocks/stones)
        if (npcType === 'MERCHANT' || npcType === 'GUARD') {
            return true;
        }
        // Villagers can throw ranged attacks when player charges AP
        if (npcType === 'VILLAGER' && isPlayerCharging) {
            return true;
        }
        return false;
    }
    
    /**
     * Get ideal attack range for NPC based on their attack type
     */
    getNPCAttackRange(npc, isPlayerCharging = false) {
        if (this.canNPCDoRangedAttack(npc, isPlayerCharging)) {
            // Ranged NPCs prefer 200-300px distance
            return 250;
        } else {
            // Melee-only NPCs need to be within melee range
            return this.npcAttackRange; // 180px
        }
    }

    /**
     * Update NPC idle state
     */
    updateNPCIdleState(npc, aiState, delta, distanceToPlayer, isPlayerCharging) {
        // Idle state: walk forward toward closest target slowly (modified by aggressiveness)
        aiState.changeTimer += delta;
        
        const target = aiState.currentTarget || this.scene.player;
        const canRanged = this.canNPCDoRangedAttack(npc, isPlayerCharging);
        const idealRange = this.getNPCAttackRange(npc, isPlayerCharging);
        const meleeRange = this.npcAttackRange; // 180px
        
        // Determine direction to target
        const directionToPlayer = target.x > npc.x ? 1 : -1;
        aiState.direction = directionToPlayer;
        
        // If player is charging AP, move faster and attack if in range
        if (isPlayerCharging) {
            if (canRanged) {
                // Ranged NPC (or villager when player charges): maintain ideal distance, attack from range
                // GUARDS: Keep moving TOWARD player when provoked and player charges AP
                if (npc.enemyData.type === 'GUARD') {
                    // Guards with strong melee attacks keep walking TOWARD player when provoked
                    // Prioritize closing distance for melee attacks when player is vulnerable
                    if (distanceToPlayer > meleeRange) {
                        // Not in melee range - keep walking TOWARD player (faster when player charges)
                        const chargingMultiplier = 1.3; // Move faster when player charges
                        const velocity = (this.npcMovementSpeed * aiState.aggressiveness * chargingMultiplier) * directionToPlayer;
                        npc.body.setVelocityX(velocity);
                        aiState.isMoving = true;
                        
                        // Can still use ranged attack while moving if in range
                        if (distanceToPlayer <= idealRange + 50 && distanceToPlayer >= idealRange - 50) {
                            const currentTime = this.scene.time.now;
                            if (currentTime - aiState.lastAttackTime >= this.npcAttackCooldown) {
                                aiState.lastAttackTime = currentTime;
                                this.performNPCRangedAttack(npc, aiState);
                            }
                        }
                    } else {
                        // In melee range - can melee attack while still moving slightly
                        // Keep slight forward movement to maintain pressure
                        const velocity = (this.npcMovementSpeed * aiState.aggressiveness * 0.5) * directionToPlayer;
                        npc.body.setVelocityX(velocity);
                        aiState.isMoving = true;
                        
                        // Melee attack when in range
                        const currentTime = this.scene.time.now;
                        if (currentTime - aiState.lastAttackTime >= this.npcAttackCooldown) {
                            aiState.lastAttackTime = currentTime;
                            this.performNPCMeleeAttack(npc, aiState);
                        }
                    }
                } else if (distanceToPlayer > idealRange + 50) {
                    // Too far - move closer to ideal range
                    const velocity = (this.npcMovementSpeed * aiState.aggressiveness) * directionToPlayer;
                    npc.body.setVelocityX(velocity);
                    aiState.isMoving = true;
                } else if (distanceToPlayer < idealRange - 50) {
                    // Too close - back away to ideal range
                    const velocity = (this.npcMovementSpeed * aiState.aggressiveness * 0.8) * -directionToPlayer;
                    npc.body.setVelocityX(velocity);
                    aiState.isMoving = true;
                } else {
                    // In ideal range - stop and use ranged attack (for non-guards)
                    npc.body.setVelocityX(0);
                    aiState.isMoving = false;
                    
                    const currentTime = this.scene.time.now;
                    if (currentTime - aiState.lastAttackTime >= this.npcAttackCooldown) {
                        aiState.lastAttackTime = currentTime;
                        // Use ranged attack when in ideal range
                        this.performNPCRangedAttack(npc, aiState);
                    }
                }
            } else {
                // Melee-only NPC (when not charging): prioritize getting close before attacking
                if (distanceToPlayer <= meleeRange) {
                    // In melee range - stop and attack
                    npc.body.setVelocityX(0);
                    aiState.isMoving = false;
                    
                    const currentTime = this.scene.time.now;
                    if (currentTime - aiState.lastAttackTime >= this.npcAttackCooldown) {
                        aiState.lastAttackTime = currentTime;
                        this.performNPCMeleeAttack(npc, aiState);
                    }
                } else {
                    // Out of range - prioritize movement toward target
                    const velocity = (this.npcMovementSpeed * aiState.aggressiveness) * directionToPlayer;
                    npc.body.setVelocityX(velocity);
                    aiState.isMoving = true;
                }
            }
        } else {
            // Normal slow patrol (speed modified by aggressiveness)
            // Melee-only NPCs should still prioritize getting close
            if (!canRanged && distanceToPlayer > meleeRange) {
                // Melee-only: move toward target
                const velocity = (this.npcMovementSpeed * 0.7 * aiState.aggressiveness) * directionToPlayer;
                npc.body.setVelocityX(velocity);
                aiState.isMoving = true;
            } else {
                // Ranged or already in range: slow patrol
                const velocity = (this.npcMovementSpeed * 0.7 * aiState.aggressiveness) * directionToPlayer;
                npc.body.setVelocityX(velocity);
                aiState.isMoving = true;
            }
        }
    }
    
    /**
     * Update NPC combat state
     */
    updateNPCCombatState(npc, aiState, delta, distanceToPlayer, isPlayerCharging) {
        // Combat state: actively pursue and attack closest target
        const target = aiState.currentTarget || this.scene.player;
        const directionToPlayer = target.x > npc.x ? 1 : -1;
        const canRanged = this.canNPCDoRangedAttack(npc, isPlayerCharging);
        const idealRange = this.getNPCAttackRange(npc, isPlayerCharging);
        const meleeRange = this.npcAttackRange; // 180px
        
        aiState.direction = directionToPlayer;
        
        // Track consecutive melee attacks for villagers (to distance after few attacks)
        if (!aiState.consecutiveMeleeAttacks) {
            aiState.consecutiveMeleeAttacks = 0;
        }
        
        if (canRanged) {
            // Ranged NPC (or villager when player charges): maintain ideal distance before attacking
            // GUARDS: Keep moving TOWARD player when provoked and player charges AP (strong melee preference)
            if (isPlayerCharging && npc.enemyData.type === 'GUARD') {
                // Guards with strong melee attacks keep walking TOWARD player when provoked
                // Prioritize closing distance for melee attacks when player is vulnerable
                if (distanceToPlayer > meleeRange) {
                    // Not in melee range - keep walking TOWARD player (faster when player charges)
                    const chargingMultiplier = 1.3; // Move faster when player charges
                    const velocity = (this.npcMovementSpeed * aiState.aggressiveness * chargingMultiplier) * directionToPlayer;
                    npc.body.setVelocityX(velocity);
                    aiState.isMoving = true;
                    
                    // Can still use ranged attack while moving if in range
                    if (distanceToPlayer <= idealRange + 50 && distanceToPlayer >= idealRange - 50) {
                        const currentTime = this.scene.time.now;
                        if (currentTime - aiState.lastAttackTime >= this.npcAttackCooldown) {
                            aiState.lastAttackTime = currentTime;
                            this.performNPCRangedAttack(npc, aiState);
                            aiState.consecutiveMeleeAttacks = 0;
                        }
                    }
                } else {
                    // In melee range - can melee attack while still moving slightly
                    // Keep slight forward movement to maintain pressure
                    const velocity = (this.npcMovementSpeed * aiState.aggressiveness * 0.5) * directionToPlayer;
                    npc.body.setVelocityX(velocity);
                    aiState.isMoving = true;
                    
                    // Melee attack when in range
                    const currentTime = this.scene.time.now;
                    if (currentTime - aiState.lastAttackTime >= this.npcAttackCooldown) {
                        aiState.lastAttackTime = currentTime;
                        this.performNPCMeleeAttack(npc, aiState);
                    }
                }
            } else if (distanceToPlayer > idealRange + 30) {
                // Too far - move closer to ideal range (ALWAYS keep moving when player charges)
                const chargingMultiplier = isPlayerCharging ? 1.2 : 1.0;
                const velocity = (this.npcMovementSpeed * aiState.aggressiveness * chargingMultiplier) * directionToPlayer;
                npc.body.setVelocityX(velocity);
                aiState.isMoving = true;
            } else if (distanceToPlayer < idealRange - 30) {
                // Too close - back away to ideal range
                const velocity = (this.npcMovementSpeed * aiState.aggressiveness * 0.9) * -directionToPlayer;
                npc.body.setVelocityX(velocity);
                aiState.isMoving = true;
            } else {
                // In ideal range - stop and use ranged attack (only if player not charging, or not a guard)
                if (!isPlayerCharging || npc.enemyData.type !== 'GUARD') {
                    npc.body.setVelocityX(0);
                    aiState.isMoving = false;
                    
                    const currentTime = this.scene.time.now;
                    if (currentTime - aiState.lastAttackTime >= this.npcAttackCooldown) {
                        aiState.lastAttackTime = currentTime;
                        // Use ranged attack when in ideal range
                        this.performNPCRangedAttack(npc, aiState);
                        // Reset consecutive melee attacks when using ranged
                        aiState.consecutiveMeleeAttacks = 0;
                    }
                } else {
                    // Keep moving even in ideal range if guard and player charging
                    const time = Date.now();
                    const sideDirection = Math.sin(time / 500) > 0 ? 1 : -1;
                    const velocity = (this.npcMovementSpeed * aiState.aggressiveness * 0.8) * sideDirection;
                    npc.body.setVelocityX(velocity);
                    aiState.isMoving = true;
                }
            }
        } else {
            // Melee-only NPC: prioritize getting close before attacking
            // But if close enough, can melee attack
            if (distanceToPlayer <= meleeRange) {
                // In melee range - check if should melee or back away
                const consecutiveMeleeLimit = 3; // After 3 melee attacks, try to distance
                
                if (aiState.consecutiveMeleeAttacks < consecutiveMeleeLimit) {
                    // Stop and melee attack
                    npc.body.setVelocityX(0);
                    aiState.isMoving = false;
                    
                    const currentTime = this.scene.time.now;
                    if (currentTime - aiState.lastAttackTime >= this.npcAttackCooldown) {
                        aiState.lastAttackTime = currentTime;
                        this.performNPCMeleeAttack(npc, aiState);
                        aiState.consecutiveMeleeAttacks++;
                    }
                } else {
                    // After few melee attacks, back away
                    const velocity = (this.npcMovementSpeed * aiState.aggressiveness * 0.8) * -directionToPlayer;
                    npc.body.setVelocityX(velocity);
                    aiState.isMoving = true;
                    // Reset counter after backing away
                    if (distanceToPlayer > meleeRange * 1.5) {
                        aiState.consecutiveMeleeAttacks = 0;
                    }
                }
            } else {
                // Out of range - prioritize movement toward target (ALWAYS keep moving when player charges)
                const chargingMultiplier = isPlayerCharging ? 1.2 : 1.0;
                const velocity = (this.npcMovementSpeed * aiState.aggressiveness * chargingMultiplier) * directionToPlayer;
                npc.body.setVelocityX(velocity);
                aiState.isMoving = true;
                // Reset consecutive melee attacks when moving
                aiState.consecutiveMeleeAttacks = 0;
            }
        }
    }
    
    /**
     * Update NPC defensive state
     */
    updateNPCDefensiveState(npc, aiState, delta, distanceToPlayer, isPlayerCharging) {
        // Defensive state: maintain position with slight mobility
        aiState.changeTimer += delta;
        
        const target = aiState.currentTarget || this.scene.player;
        const canRanged = this.canNPCDoRangedAttack(npc, isPlayerCharging);
        const idealRange = this.getNPCAttackRange(npc, isPlayerCharging);
        const meleeRange = this.npcAttackRange; // 180px
        const directionToPlayer = target.x > npc.x ? 1 : -1;
        
        if (canRanged) {
            // Ranged NPC: maintain safe distance (further than ideal)
            const safeDistance = idealRange + 50; // 300px for ranged NPCs
            
            // GUARDS: Keep moving TOWARD player when provoked and player charges AP
            if (isPlayerCharging && npc.enemyData.type === 'GUARD') {
                // Guards with strong melee attacks keep walking TOWARD player when provoked
                // Even in defensive state, guards should close distance when player is vulnerable
                if (distanceToPlayer > meleeRange) {
                    // Not in melee range - keep walking TOWARD player (faster when player charges)
                    const chargingMultiplier = 1.2; // Move faster when player charges
                    const velocity = (this.npcMovementSpeed * aiState.aggressiveness * chargingMultiplier) * directionToPlayer;
                    npc.body.setVelocityX(velocity);
                    aiState.isMoving = true;
                    
                    // Can still use ranged attack while moving if in range
                    if (distanceToPlayer <= safeDistance + 30 && distanceToPlayer >= safeDistance - 30) {
                        const currentTime = this.scene.time.now;
                        if (currentTime - aiState.lastAttackTime >= this.npcAttackCooldown) {
                            aiState.lastAttackTime = currentTime;
                            this.performNPCRangedAttack(npc, aiState);
                        }
                    }
                } else {
                    // In melee range - can melee attack while still moving slightly
                    const velocity = (this.npcMovementSpeed * aiState.aggressiveness * 0.5) * directionToPlayer;
                    npc.body.setVelocityX(velocity);
                    aiState.isMoving = true;
                    
                    // Melee attack when in range
                    const currentTime = this.scene.time.now;
                    if (currentTime - aiState.lastAttackTime >= this.npcAttackCooldown) {
                        aiState.lastAttackTime = currentTime;
                        this.performNPCMeleeAttack(npc, aiState);
                    }
                }
            } else if (distanceToPlayer < safeDistance - 30) {
                // Too close - back away (ALWAYS keep moving when player charges)
                const velocity = (this.npcMovementSpeed * aiState.aggressiveness * 0.8) * -directionToPlayer;
                npc.body.setVelocityX(velocity);
                aiState.isMoving = true;
            } else if (distanceToPlayer > safeDistance + 30) {
                // Too far - slow approach (ALWAYS keep moving when player charges)
                const chargingMultiplier = isPlayerCharging ? 0.8 : 0.3;
                const velocity = (this.npcMovementSpeed * aiState.aggressiveness * chargingMultiplier) * directionToPlayer;
                npc.body.setVelocityX(velocity);
                aiState.isMoving = true;
            } else {
                // In safe range - stop and use ranged attack from distance (only if not guard or player not charging)
                if (!isPlayerCharging || npc.enemyData.type !== 'GUARD') {
                    npc.body.setVelocityX(0);
                    aiState.isMoving = false;
                    
                    const currentTime = this.scene.time.now;
                    if (currentTime - aiState.lastAttackTime >= this.npcAttackCooldown) {
                        aiState.lastAttackTime = currentTime;
                        this.performNPCRangedAttack(npc, aiState);
                    }
                } else {
                    // Keep moving even in safe range if guard and player charging
                    const time = Date.now();
                    const sideDirection = Math.sin(time / 500) > 0 ? 1 : -1;
                    const velocity = (this.npcMovementSpeed * aiState.aggressiveness * 0.8) * sideDirection;
                    npc.body.setVelocityX(velocity);
                    aiState.isMoving = true;
                }
            }
        } else {
            // Melee-only NPC: defensive but still need to get close to attack
            if (distanceToPlayer <= meleeRange) {
                // In melee range - stop and attack
                npc.body.setVelocityX(0);
                aiState.isMoving = false;
                
                const currentTime = this.scene.time.now;
                if (currentTime - aiState.lastAttackTime >= this.npcAttackCooldown) {
                    aiState.lastAttackTime = currentTime;
                    this.performNPCMeleeAttack(npc, aiState);
                }
            } else if (distanceToPlayer < meleeRange * 1.5) {
                // Close but not in range - slow approach (faster if player charging)
                const chargingMultiplier = isPlayerCharging ? 0.8 : 0.4;
                const velocity = (this.npcMovementSpeed * aiState.aggressiveness * chargingMultiplier) * directionToPlayer;
                npc.body.setVelocityX(velocity);
                aiState.isMoving = true;
            } else {
                // Too far - slight back and forth movement (but still move toward target occasionally)
                if (aiState.changeTimer >= aiState.changeInterval) {
                    aiState.changeTimer = 0;
                    aiState.changeInterval = Math.random() * 1500 + 1000;
                    // 70% chance to move toward target, 30% chance to move away
                    aiState.direction = Math.random() < 0.7 ? directionToPlayer : -directionToPlayer;
                }
                
                const velocity = (this.npcMovementSpeed * 0.3 * aiState.aggressiveness) * aiState.direction;
                npc.body.setVelocityX(velocity);
                aiState.isMoving = true;
            }
        }
    }
    
    /**
     * Perform NPC melee attack
     */
    performNPCMeleeAttack(npc, aiState) {
        console.log(`[BattleAI] ${npc.enemyData.type} performing melee attack!`);
        
        // Calculate damage and knockback based on NPC's strength and type
        const baseDamage = 15;
        const npcStrength = npc.enemyData.level || 1;
        const damage = baseDamage + (npcStrength * 2);
        const knockbackForce = 200 + (npcStrength * 30); // Base knockback + strength modifier
        
        // Get the NPC's current target
        const target = aiState?.currentTarget || this.scene.player;
        
        // Determine attack direction based on target
        const isNPCRightOfTarget = npc.x > target.x;
        const attackOffset = isNPCRightOfTarget ? -this.attackOffset : this.attackOffset;
        const directionToTarget = isNPCRightOfTarget ? -1 : 1;
        
        // Create attack hitbox
        const attackX = npc.x + attackOffset;
        const attackY = npc.y;
        
        const npcAttack = this.scene.add.rectangle(
            attackX,
            attackY,
            this.attackWidth,
            this.attackHeight,
            0xff0000 // Red attack
        );
        
        this.scene.physics.add.existing(npcAttack);
        npcAttack.body.setAllowGravity(false);
        
        // Create array of all targetable characters
        const allTargets = [this.scene.player];
        if (this.scene.partyCharacters && this.scene.partyCharacters.length > 0) {
            this.scene.partyCharacters.forEach(character => {
                if (character && character.active && !character.memberData?.isDowned) {
                    allTargets.push(character);
                }
            });
        }
        
        // Check for collision with ANY party member
        allTargets.forEach(targetChar => {
            if (!targetChar || !targetChar.active) return;
            
            this.scene.physics.add.overlap(npcAttack, targetChar, () => {
                const isPlayer = targetChar === this.scene.player;
                const characterName = isPlayer ? 'Player' : (targetChar.memberData?.name || 'Character');
                
                console.log(`[BattleAI] ${npc.enemyData.type} hit ${characterName} for ${damage} damage!`);
                
                // Apply HP damage to the target
                if (isPlayer) {
                    // Play damage sound
                    if (this.scene.battleSceneSFX) {
                        this.scene.battleSceneSFX.playHit();
                    } else {
                        soundManager.playHit(); // Fallback
                    }
                    
                    // Damage player
                    this.scene.currentHP = Math.max(0, this.scene.currentHP - damage);
                    console.log(`[BattleAI] Player HP: ${this.scene.currentHP}/${this.scene.maxHP}`);
                    
                    // Save health to gameStateManager immediately
                    gameStateManager.updatePlayerHealth(this.scene.currentHP);
                } else {
                    // Play damage sound for party member
                    if (this.scene.battleSceneSFX) {
                        this.scene.battleSceneSFX.playHit();
                    } else {
                        soundManager.playHit(); // Fallback
                    }
                    
                    // Damage party member
                    if (targetChar.memberData) {
                        targetChar.memberData.currentHP = Math.max(0, targetChar.memberData.currentHP - damage);
                        console.log(`[BattleAI] ${characterName} HP: ${targetChar.memberData.currentHP}/${targetChar.memberData.maxHP}`);
                    }
                }
                
                // Update HUD to reflect HP change
                if (this.scene.hudManager) {
                    this.scene.hudManager.updateBattlePartyStats();
                }
                
                // Apply knockback to target
                const knockbackX = directionToTarget * knockbackForce;
                const knockbackY = -80; // Upward knockback
                
                if (targetChar.body) {
                    targetChar.body.setVelocity(knockbackX, knockbackY);
                    
                    // Reset target velocity after knockback duration
                    this.scene.time.delayedCall(200, () => {
                        if (targetChar && targetChar.body) {
                            targetChar.body.setVelocityX(0);
                        }
                    });
                }
                
                // Show damage text on target
                const damageText = this.scene.add.text(targetChar.x, targetChar.y - 50, `-${damage} HP`, {
                    fontSize: '28px',
                    fontFamily: 'Arial',
                    color: '#ff0000',
                    stroke: '#000000',
                    strokeThickness: 4,
                    fontStyle: 'bold'
                }).setOrigin(0.5);
                
                this.scene.tweens.add({
                    targets: damageText,
                    y: targetChar.y - 100,
                    alpha: 0,
                    duration: 800,
                    ease: 'Power2',
                    onComplete: () => {
                        damageText.destroy();
                    }
                });
                
                // Visual feedback on target (flash red with alpha)
                this.scene.tweens.add({
                    targets: targetChar,
                    alpha: 0.3,
                    fillColor: 0xff0000,
                    duration: 100,
                    yoyo: true,
                    repeat: 2,
                    onComplete: () => {
                        targetChar.setAlpha(1);
                    }
                });
                
                // Check if target is defeated
                if (isPlayer && this.scene.currentHP <= 0) {
                    console.log('[BattleAI] Player defeated!');
                    this.scene.handleCharacterDowned(this.scene.player, true);
                } else if (!isPlayer && targetChar.memberData && targetChar.memberData.currentHP <= 0) {
                    console.log(`[BattleAI] ${characterName} defeated!`);
                    this.scene.handleCharacterDowned(targetChar, false);
                }
                
                npcAttack.destroy();
            });
        });
        
        // Remove attack after duration
        this.scene.time.delayedCall(this.attackDuration, () => {
            if (npcAttack && npcAttack.active) {
                npcAttack.destroy();
            }
        });
    }
    
    /**
     * Perform NPC ranged attack
     */
    performNPCRangedAttack(npc, aiState) {
        console.log(`[BattleAI] ${npc.enemyData.type} performing ranged attack!`);
        
        // Calculate damage based on NPC's strength and type
        const baseDamage = 12; // Slightly less than melee
        const npcStrength = npc.enemyData.level || 1;
        const damage = baseDamage + (npcStrength * 1.5);
        
        // Get the NPC's current target
        const target = aiState?.currentTarget || this.scene.player;
        
        // Create projectile (rock/stone for villagers, projectile for guards/merchants)
        const projectile = this.scene.add.rectangle(
            npc.x,
            npc.y,
            20,
            20,
            npc.enemyData.type === 'VILLAGER' ? 0x8B4513 : 0xff0000 // Brown for villagers, red for others
        );
        
        this.scene.physics.add.existing(projectile);
        projectile.body.setAllowGravity(false);
        
        // Calculate direction to target
        const angle = Phaser.Math.Angle.Between(
            npc.x, npc.y,
            target.x, target.y
        );
        
        // Move projectile toward target
        const projectileSpeed = 500;
        projectile.body.setVelocity(
            Math.cos(angle) * projectileSpeed,
            Math.sin(angle) * projectileSpeed
        );
        
        // Create array of all targetable characters
        const allTargets = [this.scene.player];
        if (this.scene.partyCharacters && this.scene.partyCharacters.length > 0) {
            this.scene.partyCharacters.forEach(character => {
                if (character && character.active && !character.memberData?.isDowned) {
                    allTargets.push(character);
                }
            });
        }
        
        // Check for collision with ANY party member
        allTargets.forEach(targetChar => {
            if (!targetChar || !targetChar.active) return;
            
            this.scene.physics.add.overlap(projectile, targetChar, () => {
                const isPlayer = targetChar === this.scene.player;
                const characterName = isPlayer ? 'Player' : (targetChar.memberData?.name || 'Character');
                
                console.log(`[BattleAI] ${npc.enemyData.type} ranged attack hit ${characterName} for ${damage} damage!`);
                
                // Apply HP damage to the target
                if (isPlayer) {
                    // Play damage sound
                    if (this.scene.battleSceneSFX) {
                        this.scene.battleSceneSFX.playHit();
                    } else {
                        soundManager.playHit(); // Fallback
                    }
                    
                    // Damage player
                    this.scene.currentHP = Math.max(0, this.scene.currentHP - damage);
                    console.log(`[BattleAI] Player HP: ${this.scene.currentHP}/${this.scene.maxHP}`);
                    
                    // Save health to gameStateManager immediately
                    gameStateManager.updatePlayerHealth(this.scene.currentHP);
                } else {
                    // Play damage sound for party member
                    if (this.scene.battleSceneSFX) {
                        this.scene.battleSceneSFX.playHit();
                    } else {
                        soundManager.playHit(); // Fallback
                    }
                    
                    // Damage party member
                    if (targetChar.memberData) {
                        targetChar.memberData.currentHP = Math.max(0, targetChar.memberData.currentHP - damage);
                        console.log(`[BattleAI] ${characterName} HP: ${targetChar.memberData.currentHP}/${targetChar.memberData.maxHP}`);
                    }
                }
                
                // Update HUD to reflect HP change
                if (this.scene.hudManager) {
                    this.scene.hudManager.updateBattlePartyStats();
                }
                
                // Show damage text on target
                const damageText = this.scene.add.text(targetChar.x, targetChar.y - 50, `-${damage} HP`, {
                    fontSize: '28px',
                    fontFamily: 'Arial',
                    color: '#ff0000',
                    stroke: '#000000',
                    strokeThickness: 4,
                    fontStyle: 'bold'
                }).setOrigin(0.5);
                
                this.scene.tweens.add({
                    targets: damageText,
                    y: targetChar.y - 100,
                    alpha: 0,
                    duration: 800,
                    ease: 'Power2',
                    onComplete: () => {
                        damageText.destroy();
                    }
                });
                
                // Visual feedback on target (flash red with alpha)
                this.scene.tweens.add({
                    targets: targetChar,
                    alpha: 0.3,
                    fillColor: 0xff0000,
                    duration: 100,
                    yoyo: true,
                    repeat: 2,
                    onComplete: () => {
                        targetChar.setAlpha(1);
                    }
                });
                
                // Check if target is defeated
                if (isPlayer && this.scene.currentHP <= 0) {
                    console.log('[BattleAI] Player defeated!');
                    this.scene.handleCharacterDowned(this.scene.player, true);
                } else if (!isPlayer && targetChar.memberData && targetChar.memberData.currentHP <= 0) {
                    console.log(`[BattleAI] ${characterName} defeated!`);
                    this.scene.handleCharacterDowned(targetChar, false);
                }
                
                // Destroy projectile
                projectile.destroy();
            });
        });
        
        // Remove projectile after duration (2 seconds)
        this.scene.time.delayedCall(2000, () => {
            if (projectile && projectile.active) {
                projectile.destroy();
            }
        });
    }

    /**
     * Mark enemy as attacked (triggers combat mode)
     */
    markEnemyAttacked(enemy) {
        const aiState = this.enemyStates.get(enemy);
        if (aiState && !aiState.hasBeenAttacked) {
            aiState.hasBeenAttacked = true;
            if (aiState.aiState === 'idle') {
                aiState.aiState = 'combat';
                console.log(`[BattleAI] ${enemy.enemyData.type} has been attacked - entering combat mode!`);
            }
        }
    }

    /**
     * Enemy takes damage - react
     */
    onDamageTaken(enemy, damage) {
        const aiState = this.enemyStates.get(enemy);
        if (!aiState) return;

        console.log(`[BattleAI] ${enemy.enemyData.type} took ${damage} damage`);

        // Increase aggressiveness temporarily
        aiState.aggressiveness = Math.min(1, aiState.aggressiveness + 0.1);

        // Check if should panic
        const healthPercent = enemy.enemyData.health / enemy.enemyData.maxHealth;
        if (healthPercent < aiState.panicThreshold) {
            aiState.isPanicking = true;
        }
    }

    /**
     * Get enemy AI state (for debugging)
     */
    getState(enemy) {
        return this.enemyStates.get(enemy);
    }

    /**
     * Clean up AI for removed enemy
     */
    removeEnemy(enemy) {
        this.enemyStates.delete(enemy);
    }

    /**
     * Clean up all AI
     */
    cleanup() {
        this.enemyStates.clear();
    }
}
