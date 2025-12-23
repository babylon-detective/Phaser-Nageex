import Phaser from "phaser";
import { gameStateManager } from "../managers/GameStateManager.js";
import { dialogueManager } from "../managers/DialogueManager.js";
import { skillsManager } from "../managers/SkillsManager.js";
import { soundManager } from "../managers/SoundManager.js";
import { mobileManager } from "../managers/MobileManager.js";
import MobileControls from "../managers/MobileControls.js";

export default class BattleMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BattleMenuScene' });
        this.selectedIconIndex = 0;
        this.icons = [];
        this.timerInterval = null;
        
        // Gamepad support
        this.gamepad = null;
        this.gamepadButtonStates = {};
        this.lastStickLeft = false;
        this.lastStickRight = false;
        this.lastStickUp = false;
        this.lastStickDown = false;
    }

    init(data) {
        console.log('[BattleMenuScene] Initializing with data:', data);
        this.enemies = data?.enemies || [];
        this.partyMembers = data?.partyMembers || [];
        this.battleScene = this.scene.get('BattleScene');
        
        console.log('[BattleMenuScene] Party members:', this.partyMembers);
    }

    create() {
        console.log('[BattleMenuScene] Creating battle menu scene');

        // Note: Game timer continues running in BattleMenuScene
        // Only BattleScene is paused (combat action)
        
        // Create dark overlay
        this.createOverlay();

        // Create DOM UI
        this.createMenuUI();

        // Set up keyboard controls
        this.wasdKeys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });
        
        // Add U key for confirmation (changed from ])
        this.actionKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.U);
        
        // Add / and ESC key handlers to close menu
        const slashKey = this.input.keyboard.addKey(191); // Forward slash keyCode
        slashKey.on('down', () => {
            console.log('[BattleMenuScene] Closing menu with /');
            this.closeMenu();
        });
        
        const escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        escKey.on('down', () => {
            console.log('[BattleMenuScene] Closing menu with ESC');
            this.closeMenu();
        });

        // Start timer update interval
        this.startTimerUpdate();
    }
    
    update() {
        // Update gamepad
        this.updateGamepad();
        
        // Handle icon navigation with WASD or left stick (left/right only)
        const navLeft = Phaser.Input.Keyboard.JustDown(this.wasdKeys.left) || 
                        Phaser.Input.Keyboard.JustDown(this.wasdKeys.up) ||
                        this.isGamepadStickLeft() || this.isGamepadStickUp();
        const navRight = Phaser.Input.Keyboard.JustDown(this.wasdKeys.right) || 
                         Phaser.Input.Keyboard.JustDown(this.wasdKeys.down) ||
                         this.isGamepadStickRight() || this.isGamepadStickDown();
        
        if (navLeft) {
            this.selectedIconIndex = (this.selectedIconIndex - 1 + this.icons.length) % this.icons.length;
            this.updateIconSelection();
            soundManager.playMenuSelect(); // Sound effect
        }
        
        if (navRight) {
            this.selectedIconIndex = (this.selectedIconIndex + 1) % this.icons.length;
            this.updateIconSelection();
            soundManager.playMenuSelect(); // Sound effect
        }
        
        // Handle icon activation with U key or A button
        if (Phaser.Input.Keyboard.JustDown(this.actionKey) || this.isGamepadButtonJustPressed(0)) {
            soundManager.playMenuConfirm(); // Sound effect
            this.activateCurrentIcon();
        }
    }

    createOverlay() {
        // Create semi-transparent dark overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.7);
        overlay.fillRect(0, 0, this.scale.width, this.scale.height);
    }

    createMenuUI() {
        // Create main container
        this.menuContainer = document.createElement('div');
        this.menuContainer.id = 'battle-menu-container';
        this.menuContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 9000;
            pointer-events: none;
            font-family: Arial, sans-serif;
        `;
        document.body.appendChild(this.menuContainer);

        // Timer display (top-right corner)
        this.timerDisplay = document.createElement('div');
        this.timerDisplay.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            padding: 15px 20px;
            border: 2px solid #FFD700;
            border-radius: 10px;
            color: #FFD700;
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            pointer-events: auto;
        `;
        this.timerDisplay.innerHTML = `
            <div style="font-size: 14px; margin-bottom: 5px; color: #AAA;">Game Time</div>
            <div id="battle-menu-timer">00:00:00</div>
        `;
        this.menuContainer.appendChild(this.timerDisplay);

        // Icon container (left side)
        this.iconContainer = document.createElement('div');
        this.iconContainer.style.cssText = `
            position: absolute;
            left: 30px;
            top: 50%;
            transform: translateY(-50%);
            display: flex;
            flex-direction: column;
            gap: 20px;
            pointer-events: auto;
        `;
        this.menuContainer.appendChild(this.iconContainer);

        // Define icons
        this.icons = [
            { id: 'talk', label: '💬', name: 'Talk', description: 'Negotiate with enemies' },
            { id: 'items', label: '🎒', name: 'Items', description: 'Use items' },
            { id: 'skills', label: '⚡', name: 'Skills', description: 'View and manage combat skills' }
        ];

        // Create icon elements
        this.icons.forEach((icon, index) => {
            const iconElement = document.createElement('div');
            iconElement.id = `battle-icon-${icon.id}`;
            iconElement.style.cssText = `
                width: 80px;
                height: 80px;
                background: rgba(0, 0, 0, 0.9);
                border: 3px solid ${index === 0 ? '#FFD700' : '#666'};
                border-radius: 10px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: ${index === 0 ? '0 0 20px rgba(255, 215, 0, 0.5)' : 'none'};
            `;
            
            iconElement.innerHTML = `
                <div style="font-size: 36px; margin-bottom: 5px;">${icon.label}</div>
                <div style="font-size: 10px; color: #AAA;">${icon.name}</div>
            `;
            
            iconElement.addEventListener('click', () => {
                this.selectedIconIndex = index;
                this.updateIconSelection();
                this.activateCurrentIcon();
            });
            
            this.iconContainer.appendChild(iconElement);
        });

        // Description panel (bottom-left)
        this.descriptionPanel = document.createElement('div');
        this.descriptionPanel.style.cssText = `
            position: absolute;
            left: 30px;
            bottom: 30px;
            background: rgba(0, 0, 0, 0.9);
            padding: 15px 20px;
            border: 2px solid #FFD700;
            border-radius: 10px;
            color: #FFF;
            max-width: 300px;
            pointer-events: auto;
        `;
        this.descriptionPanel.innerHTML = `
            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px; color: #FFD700;">
                ${this.icons[0].name}
            </div>
            <div style="font-size: 12px; color: #AAA;">
                ${this.icons[0].description}
            </div>
            <div style="font-size: 11px; color: #666; margin-top: 10px;">
                WASD - Navigate | U - Select | / or ESC - Close
            </div>
        `;
        this.menuContainer.appendChild(this.descriptionPanel);

        // Party display panel (right side)
        this.createPartyPanel();
    }

    createPartyPanel() {
        // Get player stats from GameStateManager
        const playerStats = gameStateManager.getPlayerStats();
        
        const partyPanel = document.createElement('div');
        partyPanel.style.cssText = `
            position: absolute;
            right: 30px;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(0, 0, 0, 0.9);
            padding: 20px;
            border: 3px solid #FFD700;
            border-radius: 15px;
            color: #FFF;
            min-width: 280px;
            pointer-events: auto;
        `;

        let partyHTML = `
            <div style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #FFD700; text-align: center;">
                ⚔️ PARTY
            </div>
        `;

        // Display Player (always first)
        const playerHPPercent = (playerStats.health / playerStats.maxHealth) * 100;
        let playerHPColor = '#00ff00';
        if (playerHPPercent < 25) playerHPColor = '#ff0000';
        else if (playerHPPercent < 50) playerHPColor = '#ffff00';

        partyHTML += `
            <div style="margin-bottom: 15px; padding: 12px; background: rgba(255, 0, 0, 0.1); border: 2px solid #ff0000; border-radius: 10px;">
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <div style="width: 10px; height: 10px; background: #ff0000; border-radius: 2px; margin-right: 8px;"></div>
                    <div style="flex: 1;">
                        <div style="font-size: 16px; font-weight: bold; color: #FFD700;">PLAYER</div>
                        <div style="font-size: 12px; color: #AAA;">Level ${playerStats.level}</div>
                    </div>
                </div>
                <div style="margin-bottom: 5px; display: flex; justify-content: space-between; font-size: 12px;">
                    <span style="color: #AAA;">HP</span>
                    <span style="color: ${playerHPColor};">${playerStats.health}/${playerStats.maxHealth}</span>
                </div>
                <div style="background: #333; height: 8px; border-radius: 4px; overflow: hidden;">
                    <div style="background: linear-gradient(90deg, ${playerHPColor}, ${playerHPColor}AA); height: 100%; width: ${playerHPPercent}%;"></div>
                </div>
            </div>
        `;

        // Display Party Members
        if (this.partyMembers && this.partyMembers.length > 0) {
            this.partyMembers.forEach((member, index) => {
                const hpPercent = (member.currentHP / member.maxHP) * 100;
                let hpColor = '#00ff00';
                if (hpPercent < 25) hpColor = '#ff0000';
                else if (hpPercent < 50) hpColor = '#ffff00';

                const colorHex = '#' + member.indicatorColor.toString(16).padStart(6, '0');

                partyHTML += `
                    <div style="margin-bottom: 15px; padding: 12px; background: rgba(${parseInt(colorHex.substr(1,2), 16)}, ${parseInt(colorHex.substr(3,2), 16)}, ${parseInt(colorHex.substr(5,2), 16)}, 0.1); border: 2px solid ${colorHex}; border-radius: 10px;">
                        <div style="display: flex; align-items: center; margin-bottom: 8px;">
                            <div style="width: 10px; height: 10px; background: ${colorHex}; border-radius: 2px; margin-right: 8px;"></div>
                            <div style="flex: 1;">
                                <div style="font-size: 16px; font-weight: bold; color: ${colorHex};">${member.name.toUpperCase()}</div>
                                <div style="font-size: 12px; color: #AAA;">Level ${member.level}</div>
                            </div>
                        </div>
                        <div style="margin-bottom: 5px; display: flex; justify-content: space-between; font-size: 12px;">
                            <span style="color: #AAA;">HP</span>
                            <span style="color: ${hpColor};">${member.currentHP}/${member.maxHP}</span>
                        </div>
                        <div style="background: #333; height: 8px; border-radius: 4px; overflow: hidden;">
                            <div style="background: linear-gradient(90deg, ${hpColor}, ${hpColor}AA); height: 100%; width: ${hpPercent}%;"></div>
                        </div>
                    </div>
                `;
            });
        }

        // Show party size
        const totalPartySize = 1 + (this.partyMembers ? this.partyMembers.length : 0);
        partyHTML += `
            <div style="text-align: center; padding-top: 10px; border-top: 1px solid #333; margin-top: 10px;">
                <div style="font-size: 12px; color: #888;">Party Size</div>
                <div style="font-size: 16px; color: #FFD700; font-weight: bold;">${totalPartySize} / 4</div>
            </div>
        `;

        partyPanel.innerHTML = partyHTML;
        this.menuContainer.appendChild(partyPanel);
    }

    updateIconSelection() {
        const currentIcon = this.icons[this.selectedIconIndex];
        
        // Update icon borders and shadows
        this.icons.forEach((icon, index) => {
            const iconElement = document.getElementById(`battle-icon-${icon.id}`);
            if (iconElement) {
                const isSelected = index === this.selectedIconIndex;
                iconElement.style.borderColor = isSelected ? '#FFD700' : '#666';
                iconElement.style.boxShadow = isSelected ? '0 0 20px rgba(255, 215, 0, 0.5)' : 'none';
                iconElement.style.transform = isSelected ? 'scale(1.1)' : 'scale(1)';
            }
        });
        
        // Update description
        this.descriptionPanel.innerHTML = `
            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px; color: #FFD700;">
                ${currentIcon.name}
            </div>
            <div style="font-size: 12px; color: #AAA;">
                ${currentIcon.description}
            </div>
            <div style="font-size: 11px; color: #666; margin-top: 10px;">
                WASD - Navigate | U - Select | / or ESC - Close
            </div>
        `;
    }

    activateCurrentIcon() {
        const currentIcon = this.icons[this.selectedIconIndex];
        console.log('[BattleMenuScene] Activating icon:', currentIcon.id);
        
        switch (currentIcon.id) {
            case 'talk':
                this.openTalkDialog();
                break;
            case 'items':
                this.showItemsNotImplemented();
                break;
            case 'skills':
                this.showSkillsContent();
                break;
        }
    }

    openTalkDialog() {
        console.log('[BattleMenuScene] Opening talk dialog');
        
        // Close this menu
        this.closeMenu();
        
        // Start enemy selection mode in BattleScene
        this.startEnemySelectionMode();
    }
    
    startEnemySelectionMode() {
        console.log('[BattleMenuScene] Starting enemy selection mode');
        
        // Launch enemy selection in BattleScene with highlighting
        this.battleScene.startEnemySelection();
        
        // Stop this scene
        this.scene.stop();
    }

    showEnemySelection() {
        // Create enemy selection overlay
        const selectionOverlay = document.createElement('div');
        selectionOverlay.id = 'enemy-selection-overlay';
        selectionOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.95);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-family: Arial, sans-serif;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            max-width: 600px;
            padding: 30px;
            background: rgba(20, 20, 40, 0.95);
            border: 3px solid #FFD700;
            border-radius: 15px;
        `;
        
        const title = document.createElement('div');
        title.style.cssText = `
            font-size: 28px;
            color: #FFD700;
            text-align: center;
            margin-bottom: 20px;
            font-weight: bold;
        `;
        title.textContent = 'Select Enemy to Talk To';
        content.appendChild(title);
        
        // Enemy list
        const enemyList = document.createElement('div');
        enemyList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 15px;
            margin-bottom: 20px;
        `;
        
        this.enemies.forEach((enemy, index) => {
            const enemyButton = document.createElement('button');
            enemyButton.style.cssText = `
                padding: 15px 20px;
                background: rgba(255, 215, 0, 0.1);
                border: 2px solid #FFD700;
                border-radius: 10px;
                color: #FFF;
                cursor: pointer;
                text-align: left;
                transition: all 0.3s ease;
            `;
            
            enemyButton.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-size: 18px; font-weight: bold; color: #FFD700;">${enemy.type}</div>
                        <div style="font-size: 14px; color: #AAA;">Level ${enemy.level} | HP: ${enemy.health}/${enemy.maxHealth}</div>
                    </div>
                    <div style="font-size: 32px;">💬</div>
                </div>
            `;
            
            enemyButton.addEventListener('mouseenter', () => {
                enemyButton.style.background = '#FFD700';
                enemyButton.style.color = '#000';
            });
            enemyButton.addEventListener('mouseleave', () => {
                enemyButton.style.background = 'rgba(255, 215, 0, 0.1)';
                enemyButton.style.color = '#FFF';
            });
            
            enemyButton.addEventListener('click', () => {
                selectionOverlay.remove();
                this.startDialogue(enemy);
            });
            
            enemyList.appendChild(enemyButton);
        });
        
        content.appendChild(enemyList);
        
        // Cancel button
        const cancelButton = document.createElement('button');
        cancelButton.style.cssText = `
            padding: 12px 24px;
            background: #444;
            border: 2px solid #888;
            border-radius: 8px;
            color: #FFF;
            cursor: pointer;
            width: 100%;
            font-size: 16px;
        `;
        cancelButton.textContent = 'Cancel';
        cancelButton.addEventListener('click', () => {
            selectionOverlay.remove();
            // Reopen battle menu
            this.scene.restart();
        });
        content.appendChild(cancelButton);
        
        selectionOverlay.appendChild(content);
        document.body.appendChild(selectionOverlay);
    }

    startDialogue(enemy) {
        console.log('[BattleMenuScene] Starting dialogue with:', enemy);
        
        // Get full NPC data from BattleScene
        const npcData = {
            id: enemy.id,
            type: enemy.type,
            level: enemy.level,
            health: enemy.health,
            maxHealth: enemy.maxHealth
        };
        
        // Show dialogue options (reuse from BattleScene)
        const dialogueData = dialogueManager.getDialogueOptions(npcData);
        
        this.showDialogueOptions(npcData, dialogueData);
    }

    showDialogueOptions(npcData, dialogueData) {
        // This reuses the dialogue UI from BattleScene but triggered from menu
        // Import the dialogue methods from BattleScene or create them here
        
        // For now, show a simple implementation
        const dialogueOverlay = document.createElement('div');
        dialogueOverlay.id = 'battle-dialogue-from-menu';
        dialogueOverlay.style.cssText = `
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
        `;
        
        dialogueOverlay.innerHTML = `
            <div style="max-width: 600px; padding: 30px; background: rgba(0, 0, 0, 0.7); border: 3px solid #FFD700; border-radius: 15px; text-align: center;">
                <div style="font-size: 28px; color: #FFD700; margin-bottom: 15px;">
                    ${npcData.type} (Level ${npcData.level})
                </div>
                <div style="font-size: 18px; color: #FFF; font-style: italic; margin-bottom: 20px;">
                    "${dialogueData.greeting}"
                </div>
                <div style="font-size: 16px; color: #AAA;">
                    Full dialogue system integration coming next...
                </div>
                <button onclick="document.getElementById('battle-dialogue-from-menu').remove()" style="margin-top: 20px; padding: 12px 24px; background: #FFD700; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold;">
                    Close
                </button>
            </div>
        `;
        
        document.body.appendChild(dialogueOverlay);
    }

    showItemsNotImplemented() {
        alert('Items menu coming soon!');
    }

    showSkillsContent() {
        console.log('[BattleMenuScene] Showing skills content');
        
        // Don't close the menu yet - we need its scene to be active for input
        // this.closeMenu();
        
        // Create skills overlay (similar to dialogue but for skills)
        const skillsOverlay = document.createElement('div');
        skillsOverlay.id = 'battle-skills-overlay';
        skillsOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.95);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
            pointer-events: auto;
        `;
        
        const unlockedSkills = skillsManager.getUnlockedSkills();
        const equippedSkills = skillsManager.getEquippedSkills();
        const energy = skillsManager.getEnergy();
        
        let skillsHTML = `
            <div style="max-width: 600px; padding: 30px; background: linear-gradient(135deg, #1a1a2e, #16213e); border: 3px solid #FFD700; border-radius: 15px; color: white; font-family: Arial, sans-serif; max-height: 80vh; overflow-y: auto;">
                <h2 style="color: #FFD700; margin: 0 0 20px 0; text-align: center;">⚡ COMBAT SKILLS</h2>
                
                <div style="margin-bottom: 20px; padding: 15px; background: rgba(255, 215, 0, 0.1); border: 2px solid #FFD700; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="color: #AAA; font-size: 14px;">Energy</span>
                        <span style="color: #FFD700; font-weight: bold;">${energy.current} / ${energy.max}</span>
                    </div>
                    <div style="background: #333; height: 10px; border-radius: 5px; overflow: hidden;">
                        <div style="background: linear-gradient(90deg, #FFD700, #FFA502); height: 100%; width: ${energy.percent * 100}%;"></div>
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <h3 style="color: #4A90E2; margin: 0 0 10px 0;">Equipped Skills (${equippedSkills.length}/${skillsManager.playerSkills.maxEquipped})</h3>
        `;
        
        if (equippedSkills.length === 0) {
            skillsHTML += `<p style="text-align: center; color: #666; font-style: italic;">No skills equipped</p>`;
        } else {
            equippedSkills.forEach(skill => {
                const isOnCooldown = skillsManager.isOnCooldown(skill.id);
                const canUse = skillsManager.canUseSkill(skill.id);
                const cooldownProgress = skillsManager.getCooldownProgress(skill.id);
                
                skillsHTML += `
                    <div style="margin-bottom: 10px; padding: 12px; background: ${canUse ? 'rgba(74, 144, 226, 0.2)' : 'rgba(128, 128, 128, 0.1)'}; border: 2px solid ${canUse ? '#4A90E2' : '#666'}; border-radius: 8px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <div>
                                <span style="font-size: 24px; margin-right: 8px;">${skill.icon}</span>
                                <span style="color: ${canUse ? '#FFF' : '#888'}; font-weight: bold;">${skill.name}</span>
                            </div>
                            <div style="font-size: 12px; color: ${isOnCooldown ? '#FF4757' : '#00FF00'};">
                                ${isOnCooldown ? `CD: ${(skillsManager.getCooldownRemaining(skill.id) / 1000).toFixed(1)}s` : 'READY'}
                            </div>
                        </div>
                        <div style="font-size: 12px; color: #AAA; margin-bottom: 5px;">${skill.description}</div>
                        <div style="display: flex; justify-content: space-between; font-size: 12px;">
                            <span style="color: #FFA502;">⚔️ ${skill.damage || 0} DMG</span>
                            <span style="color: #FFD700;">⚡ ${skill.cost} Energy</span>
                        </div>
                        ${isOnCooldown ? `
                            <div style="background: #333; height: 4px; border-radius: 2px; overflow: hidden; margin-top: 5px;">
                                <div style="background: #4A90E2; height: 100%; width: ${cooldownProgress * 100}%;"></div>
                            </div>
                        ` : ''}
                    </div>
                `;
            });
        }
        
        skillsHTML += `
                </div>
                
                <div style="text-align: center; padding: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 8px; margin-top: 20px;">
                    <p style="color: #AAA; font-size: 14px; margin: 0 0 10px 0;">Open the <span style="color: #FFD700;">Menu (/)</span> to manage all skills</p>
                    <p style="color: #FFD700; font-size: 14px; margin: 0 0 10px 0; font-weight: bold;">Press ESC or / to close</p>
                    <button id="close-skills-btn" style="background: #4A90E2; border: none; padding: 10px 30px; border-radius: 8px; color: white; font-size: 16px; font-weight: bold; cursor: pointer;">Close</button>
                </div>
            </div>
        `;
        
        skillsOverlay.innerHTML = skillsHTML;
        document.body.appendChild(skillsOverlay);
        
        // Set flag that skills overlay is open
        this.skillsOverlayOpen = true;
        
        // Create close function
        const closeSkillsOverlay = () => {
            console.log('[BattleMenuScene] Closing skills overlay');
            skillsOverlay.remove();
            this.skillsOverlayOpen = false;
            // Remove the DOM listener
            document.removeEventListener('keydown', keydownHandler);
            // Close this menu scene
            this.closeMenu();
        };
        
        // Add DOM-level keyboard listener (works even when Phaser input is paused)
        const keydownHandler = (event) => {
            console.log('[BattleMenuScene] Skills overlay key pressed:', event.key);
            if (event.key === 'Escape' || event.key === '/') {
                event.preventDefault();
                closeSkillsOverlay();
            }
        };
        document.addEventListener('keydown', keydownHandler);
        
        // Add close button listener
        const closeBtn = document.getElementById('close-skills-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeSkillsOverlay);
        }
    }

    startTimerUpdate() {
        const updateTimer = () => {
            const formattedTime = gameStateManager.getFormattedPlayTime();
            const timerElement = document.getElementById('battle-menu-timer');
            if (timerElement) {
                timerElement.textContent = formattedTime;
            }
        };
        
        updateTimer();
        this.timerInterval = setInterval(updateTimer, 100);
    }

    closeMenu() {
        console.log('[BattleMenuScene] Closing battle menu');
        
        // Stop timer update
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Remove DOM elements
        if (this.menuContainer) {
            this.menuContainer.remove();
            this.menuContainer = null;
        }
        
        // Resume battle scene
        this.scene.resume('BattleScene');
        
        // Stop this scene
        this.scene.stop();
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
    
    isGamepadStickLeft() {
        if (!this.gamepad || !this.gamepad.axes) return false;
        const axisX = this.gamepad.axes[0] || 0;
        const isLeft = axisX < -0.5;
        const justPressed = isLeft && !this.lastStickLeft;
        this.lastStickLeft = isLeft;
        return justPressed;
    }
    
    isGamepadStickRight() {
        if (!this.gamepad || !this.gamepad.axes) return false;
        const axisX = this.gamepad.axes[0] || 0;
        const isRight = axisX > 0.5;
        const justPressed = isRight && !this.lastStickRight;
        this.lastStickRight = isRight;
        return justPressed;
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
        console.log('[BattleMenuScene] Shutting down');
        
        // Clean up timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Clean up DOM
        if (this.menuContainer) {
            this.menuContainer.remove();
            this.menuContainer = null;
        }
        
        // Clean up keyboard listeners
        if (this.input && this.input.keyboard) {
            this.input.keyboard.removeAllKeys(true);
            this.input.keyboard.removeAllListeners();
        }
    }
}

