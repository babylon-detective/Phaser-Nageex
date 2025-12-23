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
     * NEW SYSTEM: NPCs use target mode with their own AP
     */
    initEnemy(enemy, profile) {
        const difficulty = npcAI.getDifficulty();
        
        const aiState = {
            profile: profile,
            combatStyle: profile.combatStyle,
            
            // Target mode properties
            isInTargetMode: false,
            currentTarget: null,
            targetModeAPCost: 2, // AP cost per attack (same as player)
            currentAP: 20, // Starting AP (invisible to player)
            maxAP: 20,
            lastAttackTime: 0,
            attackCooldown: 1500, // ms between attacks
            comboCount: 0, // Track combo like player
            
            // AP regeneration (NPCs gain AP over time)
            apRegenRate: 5, // AP per second
            lastAPRegenTime: 0,
            
            // Decision making
            aggressiveness: profile.attackFrequency * difficulty.aggressiveness,
            accuracy: difficulty.accuracy,
            nextActionTime: Date.now() + Math.random() * 2000 + 1000 // Random delay before first action
        };

        this.enemyStates.set(enemy, aiState);
        console.log(`[BattleAI] Initialized AI for ${enemy.enemyData.type} with target mode system:`, {
            combatStyle: aiState.combatStyle,
            startingAP: aiState.currentAP,
            attackCost: aiState.targetModeAPCost
        });
    }

    /**
     * Update all enemies AI
     * NEW SYSTEM: NPCs use target mode and attack with AP like the player
     * NO MOVEMENT - NPCs stay in place and enter target mode to attack
     * CRITICAL: NPCs attack MORE AGGRESSIVELY when player is charging AP
     */
    update(enemies, player, delta, isPlayerChargingAP = false) {
        if (!player || !this.scene) return;
        
        // Don't update NPCs during dialogue, enemy selection, or victory
        // BUT ALLOW ATTACKS DURING PLAYER TARGET MODE if player is charging
        if (this.scene.isDialogueActive || this.scene.isEnemySelectionMode || 
            this.scene.isVictorySequence) {
            // Freeze all NPCs
            enemies.forEach(enemy => {
                if (enemy && enemy.body) {
                    enemy.body.setVelocityX(0);
                }
            });
            return;
        }
        
        // Allow NPCs to continue their attacks even during player target mode (more dynamic combat)
        
        const currentTime = this.scene.time.now;
        
        // Update each NPC's AI
        enemies.forEach(enemy => {
            const aiState = this.enemyStates.get(enemy);
            if (!aiState || !enemy || !enemy.active || !enemy.body || enemy.enemyData.health <= 0) {
                return;
            }

            // NO MOVEMENT - NPCs stay in place
            enemy.body.setVelocityX(0);
            
            // Regenerate AP over time
            const timeSinceLastRegen = currentTime - (aiState.lastAPRegenTime || 0);
            if (timeSinceLastRegen >= 1000) { // Every second
                const apToRegen = Math.floor(timeSinceLastRegen / 1000) * aiState.apRegenRate;
                aiState.currentAP = Math.min(aiState.maxAP, aiState.currentAP + apToRegen);
                aiState.lastAPRegenTime = currentTime;
            }
            
            // Check if NPC should enter target mode and attack
            if (!aiState.isInTargetMode) {
                // Decision: Should NPC attack?
                // NPCs attack when:
                // 1. They have enough AP
                // 2. Enough time has passed since last action
                // 3. Random chance based on aggressiveness
                // 4. BONUS: Much more aggressive when player is charging AP
                
                const hasEnoughAP = aiState.currentAP >= aiState.targetModeAPCost;
                const cooldownFinished = currentTime >= aiState.nextActionTime;
                
                // NPCs are 3x more likely to attack when player is charging AP
                const baseAggressiveness = aiState.aggressiveness;
                const chargeBonus = isPlayerChargingAP ? 3.0 : 1.0;
                const finalAggressiveness = Math.min(0.95, baseAggressiveness * chargeBonus);
                
                const shouldAttack = Math.random() < finalAggressiveness;
                
                if (hasEnoughAP && cooldownFinished && shouldAttack) {
                    // Find closest party member to target
                    const { target: closestTarget, distance: distanceToTarget } = this.findClosestPartyMember(enemy, player);
                    
                    if (closestTarget) {
                        // Enter target mode
                        aiState.isInTargetMode = true;
                        aiState.currentTarget = closestTarget;
                        aiState.comboCount = 0;
                        
                        // NPCs can randomly switch targets mid-combo (10% chance per attack)
                        aiState.canSwapTarget = true;
                        
                        if (isPlayerChargingAP) {
                            console.log(`[BattleAI] ⚡ ${enemy.enemyData.type} PUNISHING PLAYER for charging AP - entering target mode!`);
                        } else {
                            console.log(`[BattleAI] ${enemy.enemyData.type} entering target mode - attacking ${closestTarget === player ? 'Player' : 'Party Member'}`);
                        }
                    }
                }
            } else {
                // NPC is in target mode - execute attack
                const canAttack = currentTime - aiState.lastAttackTime >= aiState.attackCooldown;
                const hasAP = aiState.currentAP >= aiState.targetModeAPCost;
                
                if (canAttack && hasAP) {
                    // 10% chance to swap targets mid-combo (like player's Q/E rotation)
                    if (aiState.canSwapTarget && aiState.comboCount > 0 && Math.random() < 0.1) {
                        const { target: newTarget } = this.findClosestPartyMember(enemy, player);
                        if (newTarget && newTarget !== aiState.currentTarget) {
                            const oldTargetName = aiState.currentTarget === player ? 'Player' : 'Party Member';
                            const newTargetName = newTarget === player ? 'Player' : (newTarget.memberData?.name || 'Party Member');
                            console.log(`[BattleAI] 🔄 ${enemy.enemyData.type} SWAPPING TARGET! ${oldTargetName} → ${newTargetName}`);
                            
                            // Show visual swap indicator
                            this.showTargetSwapIndicator(enemy, aiState.currentTarget, newTarget);
                            
                            aiState.currentTarget = newTarget;
                            // Keep combo going with new target!
                        }
                    }
                    
                    // Perform juggle-style attack
                    this.performNPCJuggleAttack(enemy, aiState);
                    
                    // Consume AP
                    aiState.currentAP -= aiState.targetModeAPCost;
                    aiState.lastAttackTime = currentTime;
                    aiState.comboCount++;
                    
                    // Show combo multiplier for longer chains
                    if (aiState.comboCount >= 3) {
                        console.log(`[BattleAI] 🔥 ${enemy.enemyData.type} COMBO x${aiState.comboCount}! AP: ${aiState.currentAP}/${aiState.maxAP}`);
                    } else {
                        console.log(`[BattleAI] ${enemy.enemyData.type} attacked! AP: ${aiState.currentAP}/${aiState.maxAP}, Combo: ${aiState.comboCount}`);
                    }
                } else if (!hasAP) {
                    // Exit target mode - out of AP
                    console.log(`[BattleAI] ${enemy.enemyData.type} exiting target mode - out of AP`);
                    aiState.isInTargetMode = false;
                    aiState.currentTarget = null;
                    aiState.comboCount = 0;
                    aiState.canSwapTarget = false;
                    aiState.nextActionTime = currentTime + Math.random() * 3000 + 2000; // Wait before next attack cycle
                } else if (aiState.comboCount >= 5 && Math.random() < 0.3) {
                    // 30% chance to exit after 5 attacks (longer combos now possible)
                    console.log(`[BattleAI] ${enemy.enemyData.type} exiting target mode - combo finished with ${aiState.comboCount} hits!`);
                    aiState.isInTargetMode = false;
                    aiState.currentTarget = null;
                    aiState.comboCount = 0;
                    aiState.canSwapTarget = false;
                    aiState.nextActionTime = currentTime + Math.random() * 3000 + 2000;
                }
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
     * Perform NPC juggle attack (similar to player's juggle attack)
     * NEW SYSTEM: NPCs attack using the same animation/function as player
     */
    performNPCJuggleAttack(npc, aiState) {
        const target = aiState.currentTarget;
        if (!target || !target.active) {
            console.log(`[BattleAI] ${npc.enemyData.type} target invalid, exiting target mode`);
            aiState.isInTargetMode = false;
            return;
        }
        
        const isPlayer = target === this.scene.player;
        const characterName = isPlayer ? 'Player' : (target.memberData?.name || 'Character');
        
        // Calculate damage (increases with combo like player)
        const baseDamage = 10;
        const comboDamage = baseDamage + (aiState.comboCount * 2);
        
        console.log(`[BattleAI] ${npc.enemyData.type} juggle attack ${aiState.comboCount + 1}! Target: ${characterName}, Damage: ${comboDamage}`);
        
        // NPC lunge animation (moves toward target)
        this.scene.tweens.add({
            targets: npc,
            x: target.x + (npc.x < target.x ? -80 : 80), // Move 80px toward target
            duration: 100,
            ease: 'Power2.Out',
            yoyo: true // Return to original position
        });
        
        // Target hit animation (like player's juggle)
        this.scene.tweens.add({
            targets: target,
            y: target.y - 30,
            duration: 150,
            ease: 'Power2.Out',
            yoyo: true
        });
        
        // Flash target
        this.scene.tweens.add({
            targets: target,
            alpha: 0.3,
            duration: 50,
            yoyo: true,
            repeat: 2
        });
        
        // Apply damage
        if (isPlayer) {
            // Play damage sound
            if (this.scene.battleSceneSFX) {
                this.scene.battleSceneSFX.playHit();
            } else {
                soundManager.playHit();
            }
            
            // Damage player
            this.scene.currentHP = Math.max(0, this.scene.currentHP - comboDamage);
            console.log(`[BattleAI] Player HP: ${this.scene.currentHP}/${this.scene.maxHP}`);
            
            // Save health to gameStateManager
            gameStateManager.updatePlayerHealth(this.scene.currentHP);
            
            // Check if player defeated
            if (this.scene.currentHP <= 0) {
                console.log('[BattleAI] Player defeated by NPC juggle attack!');
                this.scene.handleCharacterDowned(this.scene.player, true);
            }
        } else {
            // Play damage sound for party member
            if (this.scene.battleSceneSFX) {
                this.scene.battleSceneSFX.playHit();
            } else {
                soundManager.playHit();
            }
            
            // Damage party member
            if (target.memberData) {
                target.memberData.currentHP = Math.max(0, target.memberData.currentHP - comboDamage);
                console.log(`[BattleAI] ${characterName} HP: ${target.memberData.currentHP}/${target.memberData.maxHP}`);
                
                // Check if party member defeated
                if (target.memberData.currentHP <= 0) {
                    console.log(`[BattleAI] ${characterName} defeated by NPC juggle attack!`);
                    this.scene.handleCharacterDowned(target, false);
                }
            }
        }
        
        // Update HUD
        if (this.scene.hudManager) {
            this.scene.hudManager.updateBattlePartyStats();
        }
        
        // Show combo text (like player's juggle combo)
        this.showNPCComboText(npc, target, aiState.comboCount + 1, comboDamage);
        
        // Play attack sound
        if (this.scene.battleSceneSFX && typeof this.scene.battleSceneSFX.playAttack === 'function') {
            this.scene.battleSceneSFX.playAttack();
        }
    }
    
    /**
     * Show NPC combo text feedback (similar to player's combo text)
     * Enhanced for higher combos and target swaps
     */
    showNPCComboText(npc, target, comboCount, damage) {
        // Enhanced combo text for 3+ combo chains
        let comboMessage = `${comboCount}x HIT!`;
        let comboColor = '#FF6600'; // Orange for NPC attacks
        
        if (comboCount >= 5) {
            comboMessage = `${comboCount}x COMBO!!`;
            comboColor = '#FF0000'; // Red for 5+ combos
        } else if (comboCount >= 3) {
            comboMessage = `${comboCount}x COMBO!`;
            comboColor = '#FF4400'; // Dark orange for 3+ combos
        }
        
        const comboText = this.scene.add.text(
            target.x,
            target.y - 120,
            comboMessage,
            {
                fontSize: `${20 + comboCount * 4}px`, // Bigger font for longer combos
                fontFamily: 'Arial Black, Arial',
                fontStyle: 'bold',
                color: comboColor,
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5);
        
        const damageText = this.scene.add.text(
            target.x + 60,
            target.y - 100,
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
        
        // Animate combo text (more dramatic for higher combos)
        this.scene.tweens.add({
            targets: comboText,
            y: comboText.y - 50,
            alpha: 0,
            scale: comboCount >= 5 ? 2.0 : 1.5,
            duration: 800,
            ease: 'Power2.Out',
            onComplete: () => {
                comboText.destroy();
            }
        });
        
        // Animate damage text
        this.scene.tweens.add({
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
     * Show visual indicator when NPC swaps targets mid-combo
     */
    showTargetSwapIndicator(npc, oldTarget, newTarget) {
        // Create arrow from old target to new target
        const swapText = this.scene.add.text(
            npc.x,
            npc.y - 80,
            '🔄 SWAP!',
            {
                fontSize: '24px',
                fontFamily: 'Arial Black, Arial',
                fontStyle: 'bold',
                color: '#00D9FF',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5);
        
        // Flash animation
        this.scene.tweens.add({
            targets: swapText,
            alpha: 0,
            y: npc.y - 120,
            scale: 1.5,
            duration: 600,
            ease: 'Power2.Out',
            onComplete: () => {
                swapText.destroy();
            }
        });
        
        // Flash new target to show it's selected
        this.scene.tweens.add({
            targets: newTarget,
            alpha: 0.3,
            duration: 100,
            yoyo: true,
            repeat: 3
        });
    }

    // ================================================================
    // LEGACY METHODS - NO LONGER USED IN NEW TARGET MODE SYSTEM
    // Kept for reference only
    // ================================================================

    /**
     * LEGACY: Perform NPC melee attack (OLD SYSTEM - NOT USED)
     * Replaced by performNPCJuggleAttack()
     */
    /**
     * LEGACY: Perform NPC melee attack (OLD SYSTEM - NOT USED)
     * Replaced by performNPCJuggleAttack()
     */
    performNPCMeleeAttack(npc, aiState) {
        console.log(`[BattleAI] WARNING: Legacy melee attack called - should use performNPCJuggleAttack instead`);
    }
    
    /**
     * LEGACY: Perform NPC ranged attack (OLD SYSTEM - NOT USED)
     * Replaced by performNPCJuggleAttack()
     */
    performNPCRangedAttack(npc, aiState) {
        console.log(`[BattleAI] WARNING: Legacy ranged attack called - should use performNPCJuggleAttack instead`);
    }

    /**
     * Mark enemy as attacked (triggers combat mode) - LEGACY
     */
    markEnemyAttacked(enemy) {
        console.log(`[BattleAI] Legacy markEnemyAttacked called`);
    }

    /**
     * Enemy takes damage - react - LEGACY
     */
    onDamageTaken(enemy, damage) {
        console.log(`[BattleAI] Legacy onDamageTaken called`);
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
