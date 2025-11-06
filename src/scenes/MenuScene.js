import Phaser from "phaser";
import { gameStateManager } from "../managers/GameStateManager.js";
import { moneyManager } from "../managers/MoneyManager.js";
import { itemsManager } from "../managers/ItemsManager.js";
import { skillsManager } from "../managers/SkillsManager.js";
import { partyLeadershipManager } from "../managers/PartyLeadershipManager.js";

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.menuContainer = null;
        this.timerInterval = null;
        this.selectedTabIndex = 0;
        this.tabs = [];
        
        // Gamepad support
        this.gamepad = null;
        this.gamepadButtonStates = {};
        this.lastStickLeft = false;
        this.lastStickRight = false;
        this.lastStickUp = false;
        this.lastStickDown = false;
        
        // Pause state
        this.isPaused = false;
    }

    init(data) {
        console.log('[MenuScene] Initializing with data:', data);
        this.playerPosition = data?.playerPosition || null;
        this.isOnSavePoint = data?.isOnSavePoint || false;
        this.worldScene = this.scene.get('WorldScene');
        console.log('[MenuScene] Player on save point:', this.isOnSavePoint);
        
        // Get party members from PartyLeadershipManager (in leadership order)
        const party = partyLeadershipManager.getParty();
        console.log('[MenuScene] Party members:', party.map(p => p.name).join(', '));
        
        // Create tabs for each party member (leader first)
        this.partyMembers = party;
        this.selectedMemberIndex = 0; // Start with leader selected
    }

    create() {
        console.log('[MenuScene] Creating menu scene');

        // Note: Game timer continues running in MenuScene
        // Only WorldScene is paused (NPCs, player movement)
        
        // Create dark overlay
        this.createOverlay();

        // Create zoom effect on player
        this.createPlayerZoom();

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
        console.log('[MenuScene] Action key set up (U):', this.actionKey);
        
        // Add general keydown listener for debugging
        this.input.keyboard.on('keydown', (event) => {
            console.log('[MenuScene] Key pressed - code:', event.keyCode, 'key:', event.key);
        });
        
        // Add / and ESC key handlers to close menu
        const slashKey = this.input.keyboard.addKey(191); // Forward slash keyCode
        slashKey.on('down', () => {
            console.log('[MenuScene] Closing menu with /');
            this.closeMenu();
        });
        
        const escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        escKey.on('down', () => {
            console.log('[MenuScene] Closing menu with ESC');
            this.closeMenu();
        });
        
        // Add Enter key for pausing
        const enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        enterKey.on('down', () => {
            this.toggleGamePause();
        });

        // Start timer update interval
        this.startTimerUpdate();
    }
    
    update() {
        // Update gamepad
        this.updateGamepad();
        
        // Check for pause with Start button (button 9)
        if (this.isGamepadButtonJustPressed(9)) {
            this.toggleGamePause();
            return;
        }
        
        // If paused, don't process any other input
        if (this.isPaused) {
            return;
        }
        
        // Check for menu close with Select button (button 8) or B button (button 1)
        if (this.isGamepadButtonJustPressed(8) || this.isGamepadButtonJustPressed(1)) {
            console.log('[MenuScene] Select/B button pressed, closing menu');
            this.closeMenu();
            return;
        }
        
        // Handle character tab navigation with A/D (left/right) or left stick
        const navLeft = Phaser.Input.Keyboard.JustDown(this.wasdKeys.left) || 
                        this.isGamepadStickLeft();
        const navRight = Phaser.Input.Keyboard.JustDown(this.wasdKeys.right) || 
                         this.isGamepadStickRight();
        
        if (navLeft) {
            console.log('[MenuScene] Navigating to previous character');
            this.selectedMemberIndex = (this.selectedMemberIndex - 1 + this.partyMembers.length) % this.partyMembers.length;
            console.log('[MenuScene] Selected member index:', this.selectedMemberIndex, '-', this.partyMembers[this.selectedMemberIndex].name);
            this.updateCharacterSelection();
        }
        
        if (navRight) {
            console.log('[MenuScene] Navigating to next character');
            this.selectedMemberIndex = (this.selectedMemberIndex + 1) % this.partyMembers.length;
            console.log('[MenuScene] Selected member index:', this.selectedMemberIndex, '-', this.partyMembers[this.selectedMemberIndex].name);
            this.updateCharacterSelection();
        }
        
        // Handle save game with U key or A button (button 0) when on save point
        if (this.isOnSavePoint) {
            if (Phaser.Input.Keyboard.JustDown(this.actionKey) || this.isGamepadButtonJustPressed(0)) {
                console.log('[MenuScene] Save triggered (U key or A button)');
                this.handleSaveGame();
            }
        }
    }

    createOverlay() {
        // Create semi-transparent dark overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.7);
        overlay.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
        overlay.setScrollFactor(0);
        overlay.setDepth(1000);
    }

    createPlayerZoom() {
        if (!this.worldScene || !this.worldScene.playerManager || !this.worldScene.playerManager.player) {
            console.warn('[MenuScene] No player found for visual representation');
            return;
        }

        const worldPlayer = this.worldScene.playerManager.player;
        
        // Hide the actual player sprite in WorldScene
        worldPlayer.setVisible(false);
        
        // Create a visual representation of the player in MenuScene (center, 2x size)
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        
        // Create player sprite representation (same color/size as world player)
        this.playerSprite = this.add.rectangle(
            centerX,
            centerY,
            worldPlayer.width * 2,  // Double size
            worldPlayer.height * 2, // Double size
            0x808080 // Gray color (same as player)
        );
        this.playerSprite.setDepth(2000); // Above overlay
        this.playerSprite.setAlpha(1);
        
        // Add a glow effect
        const glow = this.add.circle(centerX, centerY, 80, 0xffffff, 0.2);
        glow.setDepth(1999); // Just below player sprite
        this.playerGlow = glow;
        
        // Add a subtle floating animation (for both sprite and glow)
        this.tweens.add({
            targets: [this.playerSprite, glow],
            y: centerY - 10,
            duration: 1500,
            ease: 'Sine.InOut',
            yoyo: true,
            repeat: -1
        });
        
        // Pulsing glow animation
        this.tweens.add({
            targets: glow,
            alpha: 0.4,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 1500,
            ease: 'Sine.InOut',
            yoyo: true,
            repeat: -1
        });

        console.log('[MenuScene] Player visual representation created');
    }

    createMenuUI() {
        // Create main menu container in DOM
        this.menuContainer = document.createElement('div');
        this.menuContainer.id = 'game-menu';
        this.menuContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 2000;
            font-family: Arial, sans-serif;
        `;
        document.body.appendChild(this.menuContainer);

        // Create timer display (upper right)
        this.timerElement = document.createElement('div');
        this.timerElement.id = 'game-timer';
        this.timerElement.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: #FFD700;
            padding: 15px 25px;
            border: 2px solid #FFD700;
            border-radius: 10px;
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
        `;
        this.timerElement.innerHTML = `
            <div style="font-size: 14px; color: #FFF; margin-bottom: 5px;">PLAY TIME</div>
            <div id="timer-value">00:00:00</div>
        `;
        this.menuContainer.appendChild(this.timerElement);

        // Create character tabs container (horizontal at top)
        this.tabContainer = document.createElement('div');
        this.tabContainer.id = 'menu-tabs-container';
        this.tabContainer.style.cssText = `
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            flex-direction: row;
            gap: 15px;
        `;
        this.menuContainer.appendChild(this.tabContainer);

        // Create character tab buttons
        this.createCharacterTabs();
        
        // Create content panel for selected character
        this.contentPanel = document.createElement('div');
        this.contentPanel.id = 'character-content-panel';
        this.contentPanel.style.cssText = `
            position: absolute;
            top: 120px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            color: #FFF;
            padding: 25px;
            border: 2px solid #4A90E2;
            border-radius: 10px;
            min-width: 500px;
            max-width: 600px;
            box-shadow: 0 0 20px rgba(74, 144, 226, 0.5);
        `;
        this.menuContainer.appendChild(this.contentPanel);

        // Create Save Game panel (only visible when on save point)
        this.saveGamePanel = document.createElement('div');
        this.saveGamePanel.id = 'save-game-panel';
        this.saveGamePanel.style.cssText = `
            position: absolute;
            top: 50%;
            right: 30px;
            transform: translateY(-50%);
            background: rgba(0, 255, 255, 0.15);
            color: #00FFFF;
            padding: 20px;
            border: 3px solid #00FFFF;
            border-radius: 15px;
            min-width: 280px;
            box-shadow: 0 0 30px rgba(0, 255, 255, 0.6);
            display: ${this.isOnSavePoint ? 'block' : 'none'};
        `;
        this.saveGamePanel.innerHTML = `
            <div style="font-size: 22px; font-weight: bold; margin-bottom: 15px; text-align: center; color: #00FFFF;">
                💾 SAVE POINT
            </div>
            <div style="margin-bottom: 15px; color: #FFF; line-height: 1.5; font-size: 14px;">
                You are standing on a <span style="color: #00FFFF; font-weight: bold;">Save Point</span>.<br>
                Your progress will be saved.
            </div>
            <div style="padding: 12px; background: rgba(0, 0, 0, 0.5); border: 1px solid #00FFFF; border-radius: 8px; margin-bottom: 15px;">
                <div style="font-size: 12px; font-weight: bold; color: #00FFFF; margin-bottom: 6px;">Location:</div>
                <div style="font-size: 11px; color: #AAA;">
                    X: ${Math.floor(this.playerPosition?.x || 0)}<br>
                    Y: ${Math.floor(this.playerPosition?.y || 0)}
                </div>
            </div>
            <div style="text-align: center; color: #FFD700; font-size: 16px; font-weight: bold; margin-bottom: 8px;">
                Press <span style="font-size: 20px; color: #00FFFF;">U</span> or <span style="font-size: 20px; color: #00FFFF;">A Button</span> to Save
            </div>
            <div id="save-status" style="text-align: center; margin-top: 10px; font-size: 12px; color: #00ffff; min-height: 18px; font-weight: bold;"></div>
        `;
        this.menuContainer.appendChild(this.saveGamePanel);

        // Create control hints at bottom
        this.controlsHint = document.createElement('div');
        this.controlsHint.style.cssText = `
            position: absolute;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: #AAA;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            text-align: center;
        `;
        this.controlsHint.innerHTML = `
            <span style="color: #FFD700;">A/D</span> or <span style="color: #FFD700;">←/→</span> Switch Character • 
            <span style="color: #FFD700;">/</span> or <span style="color: #FFD700;">ESC</span> Close${this.isOnSavePoint ? ' • <span style="color: #00FFFF;">U/A Button</span> Save' : ''}
        `;
        this.menuContainer.appendChild(this.controlsHint);

        // Update content for first character
        this.updateCharacterSelection();

        console.log('[MenuScene] Menu UI created');
    }
    
    createCharacterTabs() {
        this.partyMembers.forEach((member, index) => {
            const isLeader = (index === 0);
            const isSelected = (index === this.selectedMemberIndex);
            const colorHex = '#' + member.indicatorColor.toString(16).padStart(6, '0');
            
            const tabButton = document.createElement('div');
            tabButton.id = `character-tab-${index}`;
            tabButton.className = 'character-tab-button';
            tabButton.style.cssText = `
                background: rgba(${parseInt(colorHex.substr(1,2), 16)}, ${parseInt(colorHex.substr(3,2), 16)}, ${parseInt(colorHex.substr(5,2), 16)}, ${isSelected ? 0.3 : 0.1});
                color: ${colorHex};
                padding: 15px 20px;
                border: 3px solid ${isSelected ? '#FFD700' : colorHex};
                border-radius: 10px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                pointer-events: auto;
                transition: all 0.3s;
                box-shadow: ${isSelected ? `0 0 20px rgba(255, 215, 0, 0.8)` : `0 0 10px ${colorHex}40`};
                min-width: 150px;
                text-align: center;
            `;
            
            // Add visual indicator for selected tab
            tabButton.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; gap: 5px;">
                    <div style="width: 12px; height: 12px; background: ${colorHex}; border-radius: 3px;"></div>
                    <div>${isLeader ? '👑 ' : ''}${member.name.toUpperCase()}</div>
                    ${isSelected ? '<div style="font-size: 12px; color: #FFD700;">▼ SELECTED ▼</div>' : ''}
                </div>
            `;
            
            this.tabContainer.appendChild(tabButton);
        });
    }

    updateCharacterSelection() {
        // Update tab button styles
        this.partyMembers.forEach((member, index) => {
            const tabButton = document.getElementById(`character-tab-${index}`);
            if (tabButton) {
                const isLeader = (index === 0);
                const isSelected = (index === this.selectedMemberIndex);
                const colorHex = '#' + member.indicatorColor.toString(16).padStart(6, '0');
                
                tabButton.style.background = `rgba(${parseInt(colorHex.substr(1,2), 16)}, ${parseInt(colorHex.substr(3,2), 16)}, ${parseInt(colorHex.substr(5,2), 16)}, ${isSelected ? 0.3 : 0.1})`;
                tabButton.style.border = `3px solid ${isSelected ? '#FFD700' : colorHex}`;
                tabButton.style.boxShadow = isSelected ? `0 0 20px rgba(255, 215, 0, 0.8)` : `0 0 10px ${colorHex}40`;
                
                tabButton.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 5px;">
                        <div style="width: 12px; height: 12px; background: ${colorHex}; border-radius: 3px;"></div>
                        <div>${isLeader ? '👑 ' : ''}${member.name.toUpperCase()}</div>
                        ${isSelected ? '<div style="font-size: 12px; color: #FFD700;">▼ SELECTED ▼</div>' : ''}
                    </div>
                `;
            }
        });
        
        // Update content panel based on selected character
        this.updateCharacterContent();
    }
    
    updateCharacterContent() {
        const selectedMember = this.partyMembers[this.selectedMemberIndex];
        if (!selectedMember) return;
        
        this.showCharacterStats(selectedMember, this.selectedMemberIndex);
    }
    
    showCharacterStats(member, index) {
        const isLeader = (index === 0);
        const colorHex = '#' + member.indicatorColor.toString(16).padStart(6, '0');
        const money = moneyManager.getMoney();
        
        // CRITICAL: Always fetch LATEST stats from PartyLeadershipManager to reflect battle damage
        const freshParty = partyLeadershipManager.getParty();
        const freshMember = freshParty[index];
        
        // Get stats from different sources depending on whether it's the original player or a recruited member
        let stats, currentHP, maxHP;
        if (member.isOriginalPlayer) {
            stats = gameStateManager.getPlayerStats();
            currentHP = stats.health;
            maxHP = stats.maxHealth;
        } else {
            // Use FRESH stats from PartyLeadershipManager (updated after battle)
            stats = freshMember ? freshMember.stats : member.stats;
            currentHP = stats.health;
            maxHP = stats.maxHealth || stats.health;
        }
        
        const hpPercent = (currentHP / maxHP) * 100;
        const xpPercent = (stats.experience / stats.experienceToNextLevel) * 100;
        
        let contentHTML = `
            <div style="font-size: 22px; font-weight: bold; margin-bottom: 15px; color: ${colorHex}; border-bottom: 2px solid ${colorHex}; padding-bottom: 10px;">
                ${isLeader ? '👑 ' : ''}${member.name.toUpperCase()}'S STATS
                ${isLeader ? '<span style="font-size: 14px; color: #FFD700; margin-left: 10px;">(LEADER)</span>' : ''}
            </div>
            
            ${isLeader ? `
            <div style="margin-bottom: 15px; padding: 12px; background: rgba(255, 215, 0, 0.1); border: 2px solid #FFD700; border-radius: 8px; text-align: center;">
                <div style="color: #FFD700; font-weight: bold; font-size: 24px;">
                    💰 ${money} Gold
                </div>
            </div>
            ` : ''}
            
            <div style="margin-bottom: 12px; padding: 15px; background: rgba(${parseInt(colorHex.substr(1,2), 16)}, ${parseInt(colorHex.substr(3,2), 16)}, ${parseInt(colorHex.substr(5,2), 16)}, 0.1); border: 2px solid ${colorHex}; border-radius: 10px;">
                <div style="margin-bottom: 10px;">
                    <div style="color: #FFD700; font-weight: bold; margin-bottom: 5px; font-size: 18px;">
                        Level ${stats.level}
                    </div>
                    <div style="font-size: 12px; color: #AAA; margin-bottom: 3px;">
                        XP: ${stats.experience} / ${stats.experienceToNextLevel}
                    </div>
                    <div style="background: #333; height: 10px; border-radius: 5px; overflow: hidden;">
                        <div style="background: linear-gradient(90deg, ${colorHex}, #00D9FF); height: 100%; width: ${xpPercent}%; transition: width 0.3s;"></div>
                    </div>
                </div>

                <div style="margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                        <span style="color: #AAA; font-weight: bold;">Health:</span>
                        <span style="color: #FF4757; font-weight: bold; font-size: 16px;">${currentHP} / ${maxHP}</span>
                    </div>
                    <div style="background: #333; height: 10px; border-radius: 5px; overflow: hidden;">
                        <div style="background: linear-gradient(90deg, #FF4757, #FF6B81); height: 100%; width: ${hpPercent}%; transition: width 0.3s;"></div>
                    </div>
                </div>

                <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #AAA; font-weight: bold;">Attack:</span>
                    <span style="color: #FFA502; font-weight: bold; font-size: 16px;">${stats.attack}</span>
                </div>

                <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #AAA; font-weight: bold;">Defense:</span>
                    <span style="color: #57E389; font-weight: bold; font-size: 16px;">${stats.defense}</span>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #AAA; font-weight: bold;">Speed:</span>
                    <span style="color: #00D9FF; font-weight: bold; font-size: 16px;">${stats.speed}</span>
                </div>
            </div>
            
            ${member.abilities && member.abilities.length > 0 ? `
            <div style="margin-top: 20px;">
                <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px; color: ${colorHex};">
                    🗡️ Abilities
                </div>
                ${member.abilities.map(ability => `
                    <div style="padding: 8px; margin-bottom: 5px; background: rgba(74, 144, 226, 0.1); border: 1px solid #4A90E2; border-radius: 5px;">
                        <span style="color: #FFF; font-weight: bold;">${ability}</span>
                    </div>
                `).join('')}
            </div>
            ` : ''}
        `;
        
        this.contentPanel.innerHTML = contentHTML;
    }
    
    showPlayerStatsContent() {
        const playerStats = gameStateManager.getPlayerStats();
        const xpPercent = (playerStats.experience / playerStats.experienceToNextLevel) * 100;
        const money = moneyManager.getMoney();
        
        // Get party members from WorldScene's PartyManager
        const partyMembers = this.worldScene && this.worldScene.partyManager 
            ? this.worldScene.partyManager.partyMembers 
            : [];
        
        let contentHTML = `
            <div style="font-size: 20px; font-weight: bold; margin-bottom: 15px; color: #4A90E2; border-bottom: 2px solid #4A90E2; padding-bottom: 10px;">
                PLAYER STATS
            </div>
            
            <div style="margin-bottom: 15px; padding: 12px; background: rgba(255, 215, 0, 0.1); border: 2px solid #FFD700; border-radius: 8px; text-align: center;">
                <div style="color: #FFD700; font-weight: bold; font-size: 24px;">
                    💰 ${money} Gold
                </div>
            </div>
            
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #FFD700;">
                👤 Main Character
            </div>
            
            <div style="margin-bottom: 12px; padding: 10px; background: rgba(255, 0, 0, 0.1); border: 1px solid #ff0000; border-radius: 8px;">
                <div style="margin-bottom: 8px;">
                    <div style="color: #FFD700; font-weight: bold; margin-bottom: 5px;">
                        Level ${playerStats.level}
                    </div>
                    <div style="font-size: 12px; color: #AAA; margin-bottom: 3px;">
                        XP: ${playerStats.experience} / ${playerStats.experienceToNextLevel}
                    </div>
                    <div style="background: #333; height: 8px; border-radius: 4px; overflow: hidden;">
                        <div id="xp-progress-bar" style="background: linear-gradient(90deg, #4A90E2, #00D9FF); height: 100%; width: ${xpPercent}%; transition: width 0.3s;"></div>
                    </div>
                </div>

                <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #AAA;">Health:</span>
                    <span style="color: #FF4757; font-weight: bold;">${playerStats.health} / ${playerStats.maxHealth}</span>
                </div>

                <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #AAA;">Attack:</span>
                    <span style="color: #FFA502; font-weight: bold;">${playerStats.attack}</span>
                </div>

                <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #AAA;">Defense:</span>
                    <span style="color: #57E389; font-weight: bold;">${playerStats.defense}</span>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #AAA;">Speed:</span>
                    <span style="color: #00D9FF; font-weight: bold;">${playerStats.speed}</span>
                </div>
            </div>
        `;
        
        // Add party members if any
        if (partyMembers && partyMembers.length > 0) {
            contentHTML += `
                <div style="font-size: 16px; font-weight: bold; margin: 20px 0 10px 0; color: #00D9FF;">
                    👥 Party Members (${partyMembers.length})
                </div>
            `;
            
            partyMembers.forEach((member, index) => {
                const colorHex = '#' + member.indicatorColor.toString(16).padStart(6, '0');
                const isDowned = member.isDowned || member.stats.health <= 0;
                const healthColor = isDowned ? '#ff4444' : '#00ff00';
                const memberOpacity = isDowned ? 0.5 : 1.0;
                
                contentHTML += `
                    <div style="margin-bottom: 12px; padding: 10px; background: rgba(${parseInt(colorHex.substr(1,2), 16)}, ${parseInt(colorHex.substr(3,2), 16)}, ${parseInt(colorHex.substr(5,2), 16)}, 0.1); border: 1px solid ${colorHex}; border-radius: 8px; opacity: ${memberOpacity};">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <div style="width: 12px; height: 12px; background: ${colorHex}; border-radius: 3px;"></div>
                            <div style="font-size: 16px; font-weight: bold; color: ${colorHex};">${member.name.toUpperCase()}</div>
                            ${isDowned ? '<span style="color: #ff4444; font-size: 12px; margin-left: 8px; font-weight: bold;">⚠️ DOWNED</span>' : ''}
                        </div>
                        
                        <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #AAA;">Level:</span>
                            <span style="color: #FFD700; font-weight: bold;">${member.stats.level}</span>
                        </div>
                        
                        <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #AAA;">Health:</span>
                            <span style="color: ${healthColor}; font-weight: bold;">${member.stats.health}</span>
                        </div>

                        <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #AAA;">Attack:</span>
                            <span style="color: #ff9900; font-weight: bold;">${member.stats.attack}</span>
                        </div>

                        <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #AAA;">Defense:</span>
                            <span style="color: #4A90E2; font-weight: bold;">${member.stats.defense}</span>
                        </div>
                        
                        <div style="margin-top: 8px; padding: 8px; background: rgba(0, 0, 0, 0.2); border-radius: 5px;">
                            <div style="font-size: 11px; color: #888; margin-bottom: 3px;">Abilities</div>
                            <div style="font-size: 13px; color: ${colorHex};">${member.abilities ? member.abilities.join(', ') : 'None'}</div>
                        </div>
                        
                        <div style="text-align: center; margin-top: 8px; font-size: 11px; color: #888;">
                            Battle Control: <kbd>${index + 2}</kbd> select | <kbd>${'UIOP'[index]}</kbd> ability
                        </div>
                    </div>
                `;
            });
        } else {
            contentHTML += `
                <div style="margin-top: 20px; text-align: center; padding: 20px; background: rgba(255, 255, 255, 0.05); border-radius: 8px; color: #888; font-style: italic;">
                    No party members yet. Recruit allies by talking to them in battle!
                </div>
            `;
        }
        
        this.contentPanel.innerHTML = contentHTML;
    }
    
    showSkillsContent() {
        const unlockedSkills = skillsManager.getUnlockedSkills();
        const equippedSkills = skillsManager.getEquippedSkills();
        const playerStats = gameStateManager.getPlayerStats();
        const energy = skillsManager.getEnergy();
        
        let skillsHTML = `
            <div style="font-size: 20px; font-weight: bold; margin-bottom: 15px; color: #FFD700; border-bottom: 2px solid #FFD700; padding-bottom: 10px;">
                SKILLS
            </div>
            
            <div style="margin-bottom: 15px; padding: 12px; background: rgba(255, 215, 0, 0.1); border: 2px solid #FFD700; border-radius: 8px;">
                <div style="color: #AAA; font-size: 12px; margin-bottom: 5px;">Energy</div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <span style="color: #FFD700; font-weight: bold; font-size: 20px;">⚡ ${energy.current} / ${energy.max}</span>
                    <span style="color: #AAA; font-size: 12px;">${Math.floor(energy.percent * 100)}%</span>
                </div>
                <div style="background: #333; height: 8px; border-radius: 4px; overflow: hidden;">
                    <div style="background: linear-gradient(90deg, #FFD700, #FFA502); height: 100%; width: ${energy.percent * 100}%; transition: width 0.3s;"></div>
                </div>
            </div>
            
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #4A90E2;">
                Equipped Skills (${equippedSkills.length}/${skillsManager.playerSkills.maxEquipped})
            </div>
        `;
        
        if (equippedSkills.length === 0) {
            skillsHTML += `
                <div style="text-align: center; padding: 20px; color: #666; font-style: italic; margin-bottom: 20px;">
                    No skills equipped
                </div>
            `;
        } else {
            equippedSkills.forEach(skill => {
                const isOnCooldown = skillsManager.isOnCooldown(skill.id);
                const cooldownProgress = skillsManager.getCooldownProgress(skill.id);
                const canUse = skillsManager.canUseSkill(skill.id);
                
                skillsHTML += `
                    <div style="margin-bottom: 10px; padding: 12px; background: ${canUse ? 'rgba(74, 144, 226, 0.2)' : 'rgba(128, 128, 128, 0.1)'}; border: 2px solid ${canUse ? '#4A90E2' : '#666'}; border-radius: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <div>
                                <span style="font-size: 24px; margin-right: 8px;">${skill.icon}</span>
                                <span style="color: ${canUse ? '#FFF' : '#888'}; font-weight: bold;">${skill.name}</span>
                            </div>
                            <div style="font-size: 12px; color: ${isOnCooldown ? '#FF4757' : '#00FF00'};">
                                ${isOnCooldown ? `CD: ${(skillsManager.getCooldownRemaining(skill.id) / 1000).toFixed(1)}s` : 'Ready'}
                            </div>
                        </div>
                        <div style="font-size: 12px; color: #AAA; margin-bottom: 5px;">${skill.description}</div>
                        <div style="display: flex; justify-content: space-between; font-size: 12px;">
                            <span style="color: #FFA502;">Damage: ${skill.damage || 'N/A'}</span>
                            <span style="color: #FFD700;">Cost: ${skill.cost} energy</span>
                        </div>
                        ${isOnCooldown ? `
                            <div style="background: #333; height: 4px; border-radius: 2px; overflow: hidden; margin-top: 5px;">
                                <div style="background: #4A90E2; height: 100%; width: ${cooldownProgress * 100}%; transition: width 0.1s;"></div>
                            </div>
                        ` : ''}
                    </div>
                `;
            });
        }
        
        skillsHTML += `
            <div style="font-size: 16px; font-weight: bold; margin: 20px 0 10px 0; color: #00D9FF;">
                Available Skills (${unlockedSkills.length})
            </div>
        `;
        
        const availableSkills = unlockedSkills.filter(s => !equippedSkills.find(e => e.id === s.id));
        
        if (availableSkills.length === 0) {
            skillsHTML += `
                <div style="text-align: center; padding: 20px; color: #666; font-style: italic;">
                    All unlocked skills are equipped
                </div>
            `;
        } else {
            skillsHTML += `<div style="max-height: 200px; overflow-y: auto;">`;
            availableSkills.forEach(skill => {
                skillsHTML += `
                    <div style="margin-bottom: 8px; padding: 10px; background: rgba(0, 217, 255, 0.05); border: 1px solid #00D9FF; border-radius: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                            <div>
                                <span style="font-size: 20px; margin-right: 8px;">${skill.icon}</span>
                                <span style="color: #FFF; font-weight: bold;">${skill.name}</span>
                            </div>
                            <div style="font-size: 10px; color: #AAA;">Lvl ${skill.unlockLevel}</div>
                        </div>
                        <div style="font-size: 11px; color: #AAA;">${skill.description}</div>
                    </div>
                `;
            });
            skillsHTML += `</div>`;
        }
        
        skillsHTML += `
            <div style="margin-top: 20px; padding: 12px; background: rgba(255, 255, 255, 0.05); border-radius: 8px; font-size: 12px; color: #AAA;">
                <div style="color: #FFD700; font-weight: bold; margin-bottom: 5px;">💡 Tip:</div>
                New skills unlock as you level up!
            </div>
        `;
        
        this.contentPanel.innerHTML = skillsHTML;
    }
    
    showItemsContent() {
        const inventory = itemsManager.getInventory();
        const money = moneyManager.getMoney();
        const totalValue = itemsManager.getInventoryValue();
        
        let inventoryHTML = `
            <div style="font-size: 20px; font-weight: bold; margin-bottom: 15px; color: #00D9FF; border-bottom: 2px solid #00D9FF; padding-bottom: 10px;">
                ITEMS
            </div>
            
            <div style="margin-bottom: 15px; padding: 12px; background: rgba(255, 215, 0, 0.1); border: 2px solid #FFD700; border-radius: 8px; display: flex; justify-content: space-between;">
                <div>
                    <div style="color: #AAA; font-size: 12px; margin-bottom: 3px;">Gold</div>
                    <div style="color: #FFD700; font-weight: bold; font-size: 20px;">💰 ${money}</div>
                </div>
                <div>
                    <div style="color: #AAA; font-size: 12px; margin-bottom: 3px;">Total Value</div>
                    <div style="color: #00D9FF; font-weight: bold; font-size: 20px;">${totalValue}</div>
                </div>
            </div>
        `;
        
        if (inventory.length === 0) {
            inventoryHTML += `
                <div style="text-align: center; padding: 30px; color: #666; font-style: italic;">
                    <div style="font-size: 48px; margin-bottom: 10px;">📦</div>
                    <div>Your inventory is empty</div>
                </div>
            `;
        } else {
            inventoryHTML += `<div style="max-height: 300px; overflow-y: auto;">`;
            
            inventory.forEach(item => {
                const iconMap = {
                    'consumable': '🧪',
                    'quest': '📜',
                    'valuable': '💎',
                    'equipment': '⚔️'
                };
                const icon = iconMap[item.type] || '📦';
                
                inventoryHTML += `
                    <div style="margin-bottom: 10px; padding: 12px; background: rgba(0, 217, 255, 0.05); border: 1px solid #00D9FF; border-radius: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 5px;">
                            <div>
                                <span style="font-size: 20px; margin-right: 8px;">${icon}</span>
                                <span style="color: #FFF; font-weight: bold;">${item.name}</span>
                            </div>
                            <div style="color: #00D9FF; font-weight: bold;">x${item.quantity}</div>
                        </div>
                        <div style="font-size: 12px; color: #AAA; margin-bottom: 5px;">${item.description}</div>
                        <div style="display: flex; justify-content: space-between; font-size: 12px;">
                            <span style="color: #888;">Type: ${item.type}</span>
                            <span style="color: #FFD700;">Value: ${item.value} each</span>
                        </div>
                    </div>
                `;
            });
            
            inventoryHTML += `</div>`;
        }
        
        this.contentPanel.innerHTML = inventoryHTML;
    }
    
    showSaveGameContent() {
        this.contentPanel.innerHTML = `
            <div style="font-size: 20px; font-weight: bold; margin-bottom: 15px; color: #00FFFF; border-bottom: 2px solid #00FFFF; padding-bottom: 10px;">
                SAVE GAME
            </div>
            
            <div style="margin-bottom: 20px; color: #AAA; line-height: 1.6;">
                <p style="margin-bottom: 12px;">You are standing on a <span style="color: #00FFFF;">Save Point</span>.</p>
                <p style="margin-bottom: 12px;">Your current position and progress will be saved.</p>
                <p style="color: #FFD700;">Press <span style="font-weight: bold; font-size: 16px;">U</span> to save your game.</p>
            </div>
            
            <div style="padding: 15px; background: rgba(0, 255, 255, 0.1); border: 1px solid #00FFFF; border-radius: 8px; margin-bottom: 15px;">
                <div style="font-size: 14px; font-weight: bold; color: #00FFFF; margin-bottom: 8px;">Current Location:</div>
                <div style="font-size: 12px; color: #AAA;">
                    X: ${Math.floor(this.playerPosition?.x || 0)}<br>
                    Y: ${Math.floor(this.playerPosition?.y || 0)}
                </div>
            </div>
            
            <div id="save-status" style="text-align: center; margin-top: 15px; font-size: 14px; color: #00ffff; min-height: 20px; font-weight: bold;"></div>
        `;
    }
    
    activateCurrentTab() {
        const currentTab = this.tabs[this.selectedTabIndex];
        console.log('[MenuScene] Activating tab:', currentTab);
        
        if (currentTab === 'Save Game') {
            this.handleSaveGame();
        }
        // Player Stats tab has no action
    }

    handleSaveGame() {
        console.log('[MenuScene] ========== SAVING GAME ==========');
        console.log('[MenuScene] Player position:', this.playerPosition);
        console.log('[MenuScene] Is on save point:', this.isOnSavePoint);
        
        const statusElement = document.getElementById('save-status');
        
        // Save game with current player position
        const saved = gameStateManager.saveGame(this.playerPosition);
        
        console.log('[MenuScene] Save result:', saved);
        
        // Check localStorage to verify save
        const savedData = localStorage.getItem('gameState');
        console.log('[MenuScene] LocalStorage data:', savedData);
        if (savedData) {
            console.log('[MenuScene] Parsed save data:', JSON.parse(savedData));
        }
        
        if (saved) {
            console.log('[MenuScene] ✅ Game saved successfully to localStorage');
            if (statusElement) {
                statusElement.textContent = '✓ Game Saved!';
                statusElement.style.color = '#00ff00';
                
                // Clear status after 3 seconds
                setTimeout(() => {
                    if (statusElement) {
                        statusElement.textContent = '';
                    }
                }, 3000);
            }
        } else {
            console.error('[MenuScene] ❌ Failed to save game');
            if (statusElement) {
                statusElement.textContent = '✗ Save Failed';
                statusElement.style.color = '#ff0000';
            }
        }
        console.log('[MenuScene] =====================================');
    }

    startTimerUpdate() {
        // Update timer display every second
        this.timerInterval = setInterval(() => {
            const timerValue = document.getElementById('timer-value');
            if (timerValue) {
                timerValue.textContent = gameStateManager.getFormattedPlayTime();
            }
            
            // Also update tab content periodically to reflect any changes
            this.updateCharacterContent();
        }, 100); // Update 10 times per second for smooth display
    }

    closeMenu() {
        // Stop timer interval
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        // Note: Game timer was never paused, so no need to resume it

        // Show the actual player sprite in WorldScene again
        if (this.worldScene && this.worldScene.playerManager && this.worldScene.playerManager.player) {
            this.worldScene.playerManager.player.setVisible(true);
        }

        // Emit event to WorldScene to update HUD
        if (this.worldScene) {
            this.worldScene.events.emit('menu-closed');
        }

        // Clean up player sprite and glow
        if (this.playerSprite) {
            this.playerSprite.destroy();
            this.playerSprite = null;
        }
        if (this.playerGlow) {
            this.playerGlow.destroy();
            this.playerGlow = null;
        }

        // Clean up DOM
        if (this.menuContainer) {
            this.menuContainer.remove();
            this.menuContainer = null;
        }

        // Resume WorldScene
        this.scene.resume('WorldScene');
        
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
    
    toggleGamePause() {
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            console.log('[MenuScene] ⏸️ GAME PAUSED (Enter/Start)');
            
            // Pause the game timer
            gameStateManager.pauseTimer();
            
            // Pause the scene
            this.scene.pause();
            
            // Create pause overlay
            this.createPauseOverlay();
        } else {
            console.log('[MenuScene] ▶️ GAME RESUMED (Enter/Start)');
            
            // Resume the game timer
            gameStateManager.resumeTimer();
            
            // Remove pause overlay
            this.removePauseOverlay();
            
            // Resume the scene
            this.scene.resume();
        }
    }
    
    createPauseOverlay() {
        // Create pause overlay in DOM
        this.pauseOverlay = document.createElement('div');
        this.pauseOverlay.id = 'menu-pause-overlay';
        this.pauseOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.85);
            z-index: 10000;
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
                    Menu and game time paused
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
        console.log('[MenuScene] Shutting down');

        // Clean up timer interval
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Remove pause overlay if exists
        this.removePauseOverlay();

        // Show the actual player sprite in WorldScene again (safety check)
        if (this.worldScene && this.worldScene.playerManager && this.worldScene.playerManager.player) {
            this.worldScene.playerManager.player.setVisible(true);
        }

        // Clean up player sprite and glow
        if (this.playerSprite) {
            this.playerSprite.destroy();
            this.playerSprite = null;
        }
        if (this.playerGlow) {
            this.playerGlow.destroy();
            this.playerGlow = null;
        }

        // Clean up DOM
        if (this.menuContainer) {
            this.menuContainer.remove();
            this.menuContainer = null;
        }

        // Remove keyboard listeners
        this.input.keyboard.removeAllKeys(true);
        this.input.keyboard.removeAllListeners();

        // Note: Game timer was never paused, so no need to resume it

        super.shutdown();
    }
}

