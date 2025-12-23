/**
 * HUDManager - Manages all DOM-based HUD elements
 * Uses HTML/CSS for better styling and performance
 */
import { gameStateManager } from '../managers/GameStateManager.js';
import { moneyManager } from '../managers/MoneyManager.js';

export default class HUDManager {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.elements = {};
        this._isVisible = true; // Private property to track visibility state
        this.lastInputMethod = 'keyboard'; // 'keyboard' or 'gamepad'
        this.inputCheckInterval = null;
    }

    /**
     * Create the HUD container and all UI elements
     */
    create() {
        console.log('[HUDManager] Creating HUD');
        
        // Get scene key for unique container
        const sceneKey = this.scene.scene.key;
        
        // Create main HUD container with scene-specific ID
        this.container = document.createElement('div');
        this.container.id = `game-hud-${sceneKey.toLowerCase()}`;
        this.container.className = 'hud-container';
        document.body.appendChild(this.container);

        // Create HUD sections based on scene
        if (sceneKey === 'WorldScene') {
            this.createWorldHUD();
        } else if (sceneKey === 'BattleScene') {
            this.createBattleHUD();
        }

        // Start monitoring input method for dynamic control display
        this.startInputMonitoring();

        console.log('[HUDManager] HUD created for scene:', sceneKey);
    }

    /**
     * Create HUD elements for WorldScene
     */
    createWorldHUD() {
        // Party Stats Panel (top-left) - Shows player + party members
        this.elements.partyPanel = this.createPanel('party-panel', 'top-left');
        this.elements.partyPanel.style.cssText += `
            display: flex;
            flex-direction: row;
            gap: 10px;
            max-width: 80vw;
            flex-wrap: wrap;
        `;
        
        // Will be populated by updateWorldPartyStats
        this.updateWorldPartyStats();

        // Controls Help Panel
        this.elements.controlsPanel = this.createPanel('controls-panel', 'bottom-left');
        this.updateControlsDisplay('keyboard'); // Initial display

        // Mini Status Display (top-right)
        this.elements.statusPanel = this.createPanel('status-panel', 'top-right');
        this.elements.statusPanel.innerHTML = `
            <div class="status-item">
                <span class="status-label">NPCs Defeated:</span>
                <span class="status-value" id="npcs-defeated">0</span>
            </div>
            <div class="status-item">
                <span class="status-label">NPCs Remaining:</span>
                <span class="status-value" id="npcs-remaining">15</span>
            </div>
        `;
    }
    
    /**
     * Update party stats in WorldScene HUD
     * Shows player + all party members horizontally
     */
    updateWorldPartyStats() {
        if (!this.elements.partyPanel) return;
        
        const money = moneyManager.getMoney();
        
        // Get party in LEADERSHIP ORDER from PartyLeadershipManager
        const worldScene = this.scene;
        const partyLeadershipManager = worldScene.partyLeadershipManager || window.partyLeadershipManager;
        
        if (!partyLeadershipManager) {
            console.warn('[HUDManager] PartyLeadershipManager not available');
            return;
        }
        
        const party = partyLeadershipManager.getParty(); // Array with leader at index 0
        
        // Build HTML for all party members in leadership order
        let partyHTML = '';
        
        party.forEach((member, index) => {
            if (!member) return;
            
            const isLeader = (index === 0);
            const colorHex = '#' + member.indicatorColor.toString(16).padStart(6, '0');
            
            // Get health from stats or fallback to gameStateManager for original player
            let currentHealth, maxHealth;
            if (member.isOriginalPlayer) {
                const playerStats = gameStateManager.getPlayerStats();
                currentHealth = playerStats.health;
                maxHealth = playerStats.maxHealth;
            } else {
                currentHealth = member.stats.health;
                maxHealth = member.stats.maxHealth || member.stats.health;
            }
            
            const hpPercent = (currentHealth / maxHealth) * 100;
            
            // Leader gets crown emoji
            const leaderIndicator = isLeader ? '👑 ' : '';
            
            partyHTML += `
                <div class="character-panel" style="background: rgba(${parseInt(colorHex.substr(1,2), 16)}, ${parseInt(colorHex.substr(3,2), 16)}, ${parseInt(colorHex.substr(5,2), 16)}, 0.1); border: 2px solid ${colorHex}; ${isLeader ? 'box-shadow: 0 0 10px ' + colorHex + ';' : ''} border-radius: 10px; padding: 10px; min-width: 140px;">
                    <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 5px;">
                        <div style="width: 10px; height: 10px; background: ${colorHex}; border-radius: 2px;"></div>
                        <div class="hud-title" style="margin: 0; font-size: 13px;">${leaderIndicator}${member.name.toUpperCase()}</div>
                    </div>
                    <div class="stat-row" style="font-size: 11px;">
                        <span class="stat-label">HP:</span>
                        <div class="stat-bar-container" style="flex: 1; height: 6px;">
                            <div class="stat-bar health-bar" id="world-party-${index}-health-bar" style="width: ${hpPercent}%; background: ${colorHex};"></div>
                        </div>
                        <span class="stat-value" id="world-party-${index}-health" style="font-size: 10px;">${currentHealth}/${maxHealth}</span>
                    </div>
                    <div class="stat-row" style="font-size: 10px;">
                        <span class="stat-label">Lvl:</span>
                        <span class="stat-value">${member.stats.level}</span>
                        ${isLeader ? `<span class="stat-label" style="margin-left: 8px;">💰</span>
                        <span class="stat-value" id="world-player-money" style="color: #FFD700;">${money}</span>` : `<span class="stat-label" style="margin-left: 8px;">Atk:</span>
                        <span class="stat-value">${member.stats.attack}</span>`}
                    </div>
                </div>
            `;
        });
        
        this.elements.partyPanel.innerHTML = partyHTML;
    }

    /**
     * Create HUD elements for BattleScene
     */
    createBattleHUD() {
        // Create Party Stats Panel (top-left) - Shows player + party members horizontally
        this.elements.partyPanel = this.createPanel('party-panel', 'top-left');
        this.elements.partyPanel.style.cssText += `
            display: flex;
            flex-direction: row;
            gap: 15px;
            max-width: 80vw;
            flex-wrap: wrap;
        `;
        
        // Will be populated by updateBattlePartyStats
        this.updateBattlePartyStats();

        // Enemy Stats (right side) - will be populated dynamically
        this.elements.enemiesPanel = this.createPanel('enemies-panel', 'top-right');
        this.elements.enemiesPanel.innerHTML = `
            <div class="hud-title">Enemies</div>
            <div id="enemy-list"></div>
        `;

        // Battle Controls (bottom-left to match WorldScene)
        this.elements.controlsPanel = this.createPanel('battle-controls-panel', 'bottom-left');
        this.updateControlsDisplay('keyboard'); // Initial display
    }
    
    /**
     * Update party stats in BattleScene HUD
     * Shows player + all party members horizontally
     */
    updateBattlePartyStats() {
        console.log('[HUDManager] ========== UPDATING BATTLE PARTY STATS ==========');
        
        if (!this.elements.partyPanel) {
            console.log('[HUDManager] ⚠️ No party panel element found!');
            return;
        }
        
        const battleScene = this.scene;
        const money = moneyManager.getMoney();
        
        // Build party array in LEADERSHIP ORDER (leader first, then followers)
        // BattleScene receives party in leadership order from init(data)
        const party = [];
        
        // Leader (playerData)
        if (battleScene.playerData) {
            const playerStats = gameStateManager.getPlayerStats();
            party.push({
                name: battleScene.playerData.name || 'Player',
                color: battleScene.playerData.color || 0x808080,
                indicatorColor: battleScene.playerData.indicatorColor || 0xff0000,
                currentHP: battleScene.currentHP !== undefined ? battleScene.currentHP : playerStats.health,
                maxHP: battleScene.maxHP || playerStats.maxHealth,
                level: playerStats.level,
                isDowned: battleScene.isPlayerDowned || false,
                isLeader: true,
                isOriginalPlayer: battleScene.playerData.isOriginalPlayer
            });
        }
        
        // Followers (partyCharacters - LIVE data from game objects)
        if (battleScene.partyCharacters && battleScene.partyCharacters.length > 0) {
            battleScene.partyCharacters.forEach((character, index) => {
                if (!character || !character.active || !character.memberData) return;
                
                const memberData = character.memberData;
                party.push({
                    name: memberData.name,
                    color: memberData.color,
                    indicatorColor: memberData.indicatorColor,
                    currentHP: memberData.currentHP || memberData.maxHP, // LIVE HP from game object
                    maxHP: memberData.maxHP,
                    level: memberData.stats?.level || 1,
                    attack: memberData.stats?.attack || 10,
                    isDowned: memberData.isDowned || false,
                    isLeader: false
                });
            });
        }
        
        console.log(`[HUDManager] Battle party:`, party.map(p => p.name).join(', '));
        console.log(`[HUDManager] Party HP states:`);
        party.forEach(p => {
            console.log(`  ${p.name}: ${p.currentHP}/${p.maxHP} ${p.isDowned ? '(DOWNED)' : ''}`);
        });
        
        // Build HTML for all party members in leadership order
        let partyHTML = '';
        
        party.forEach((member, index) => {
            const isLeader = member.isLeader;
            const colorHex = '#' + member.indicatorColor.toString(16).padStart(6, '0');
            const hpPercent = (member.currentHP / member.maxHP) * 100;
            const isDowned = member.isDowned || member.currentHP <= 0;
            const panelOpacity = isDowned ? 0.5 : 1.0;
            const hpColor = isDowned ? '#ff4444' : colorHex;
            
            // Leader gets crown emoji
            const leaderIndicator = isLeader ? '👑 ' : '';
            const downedIndicator = isDowned ? ' <span style="color: #ff4444; font-size: 10px;">⚠️ DOWNED</span>' : '';
            
            partyHTML += `
                <div class="character-panel" style="opacity: ${panelOpacity}; background: rgba(${parseInt(colorHex.substr(1,2), 16)}, ${parseInt(colorHex.substr(3,2), 16)}, ${parseInt(colorHex.substr(5,2), 16)}, 0.1); border: 2px solid ${colorHex}; ${isLeader ? 'box-shadow: 0 0 10px ' + colorHex + ';' : ''} border-radius: 10px; padding: 10px; min-width: 150px;">
                    <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 5px;">
                        <div style="width: 10px; height: 10px; background: ${colorHex}; border-radius: 2px;"></div>
                        <div class="hud-title" style="margin: 0; font-size: 14px;">${leaderIndicator}${member.name.toUpperCase()}${downedIndicator}</div>
                    </div>
                    <div class="stat-row" style="font-size: 12px;">
                        <span class="stat-label">HP:</span>
                        <div class="stat-bar-container" style="flex: 1; height: 8px;">
                            <div class="stat-bar health-bar" id="battle-party-${index}-health-bar" style="width: ${hpPercent}%; background: ${hpColor};"></div>
                        </div>
                        <span class="stat-value" id="battle-party-${index}-health" style="font-size: 11px; color: ${hpColor};">${member.currentHP}/${member.maxHP}</span>
                    </div>
                    <div class="stat-row" style="font-size: 11px;">
                        <span class="stat-label">Lvl:</span>
                        <span class="stat-value">${member.level}</span>
                        ${isLeader ? `<span class="stat-label" style="margin-left: 10px;">💰</span>
                        <span class="stat-value" id="battle-player-money" style="color: #FFD700;">${money}</span>` : `<span class="stat-label" style="margin-left: 10px;">Atk:</span>
                        <span class="stat-value">${member.attack}</span>`}
                    </div>
                </div>
            `;
        });
        
        this.elements.partyPanel.innerHTML = partyHTML;
        
        console.log(`[HUDManager] ✅ Battle party HUD updated with ${party.length} members`);
        console.log('[HUDManager] ===================================================');
    }

    /**
     * Create a panel with specific positioning
     * @param {string} id - Panel ID
     * @param {string} position - Position class (top-left, top-right, bottom-left, etc.)
     * @returns {HTMLElement}
     */
    createPanel(id, position) {
        const panel = document.createElement('div');
        panel.id = id;
        panel.className = `hud-panel ${position}`;
        this.container.appendChild(panel);
        return panel;
    }

    /**
     * Update player health display
     * @param {number} current - Current health
     * @param {number} max - Maximum health
     */
    updatePlayerHealth(current, max) {
        const percentage = (current / max) * 100;
        
        // Update world scene health
        const worldHealthBar = document.getElementById('player-health-bar');
        const worldHealthText = document.getElementById('player-health-text');
        if (worldHealthBar) {
            worldHealthBar.style.width = `${percentage}%`;
        }
        if (worldHealthText) {
            worldHealthText.textContent = `${current}/${max}`;
        }

        // Update battle scene health
        const battleHealthBar = document.getElementById('battle-player-health-bar');
        const battleHealthText = document.getElementById('battle-player-health');
        if (battleHealthBar) {
            battleHealthBar.style.width = `${percentage}%`;
        }
        if (battleHealthText) {
            battleHealthText.textContent = `${current}/${max}`;
        }
    }

    /**
     * Update player level display
     * @param {number} level - Player level
     */
    updatePlayerLevel(level) {
        const levelElement = document.getElementById('player-level');
        const battleLevelElement = document.getElementById('battle-player-level');
        
        if (levelElement) {
            levelElement.textContent = level;
        }
        if (battleLevelElement) {
            battleLevelElement.textContent = level;
        }
    }

    /**
     * Update all player stats from GameStateManager
     * Only updates HP and Level for WorldScene/BattleScene HUDs
     */
    updatePlayerStats() {
        const sceneKey = this.scene.scene.key;
        const playerStats = gameStateManager.getPlayerStats();
        
        if (sceneKey === 'BattleScene') {
            // In BattleScene, update the entire party panel
            this.updateBattlePartyStats();
        } else if (sceneKey === 'WorldScene') {
            // In WorldScene, update the entire party panel (includes player + recruited members)
            this.updateWorldPartyStats();
        }
    }
    
    /**
     * Update player money display
     * @param {number} money - Current money amount
     */
    updatePlayerMoney(money) {
        const sceneKey = this.scene.scene.key;
        
        if (sceneKey === 'WorldScene') {
            const moneyElement = document.getElementById('player-money');
            if (moneyElement) {
                moneyElement.textContent = money;
            }
        } else if (sceneKey === 'BattleScene') {
            const moneyElement = document.getElementById('battle-player-money');
            if (moneyElement) {
                moneyElement.textContent = money;
            }
        }
    }

    /**
     * Update NPC counter
     * @param {number} defeated - Number of defeated NPCs
     * @param {number} remaining - Number of remaining NPCs
     */
    updateNPCCount(defeated, remaining) {
        console.log(`[HUDManager] Updating NPC count: ${defeated} defeated, ${remaining} remaining`);
        
        const defeatedElement = document.getElementById('npcs-defeated');
        const remainingElement = document.getElementById('npcs-remaining');
        
        if (defeatedElement) {
            defeatedElement.textContent = defeated;
            console.log(`[HUDManager] Updated defeated element to: ${defeated}`);
        } else {
            console.warn('[HUDManager] Could not find defeated element');
        }
        
        if (remainingElement) {
            remainingElement.textContent = remaining;
            console.log(`[HUDManager] Updated remaining element to: ${remaining}`);
        } else {
            console.warn('[HUDManager] Could not find remaining element');
        }
    }

    /**
     * Update enemy list in battle
     * @param {Array} enemies - Array of enemy data objects
     */
    updateEnemyList(enemies) {
        const enemyList = document.getElementById('enemy-list');
        if (!enemyList) return;

        enemyList.innerHTML = '';
        
        enemies.forEach((enemy, index) => {
            const enemyElement = document.createElement('div');
            enemyElement.className = 'enemy-item';
            enemyElement.innerHTML = `
                <div class="enemy-name">${enemy.type || 'Enemy'} ${index + 1}</div>
                <div class="stat-row-small">
                    <span class="stat-label-small">HP:</span>
                    <div class="stat-bar-container-small">
                        <div class="stat-bar health-bar" style="width: ${(enemy.health / enemy.maxHealth) * 100}%"></div>
                    </div>
                    <span class="stat-value-small">${enemy.health}/${enemy.maxHealth}</span>
                </div>
                <div class="stat-row-small">
                    <span class="stat-label-small">Lvl:</span>
                    <span class="stat-value-small">${enemy.level || 1}</span>
                </div>
            `;
            enemyList.appendChild(enemyElement);
        });
    }

    /**
     * Show a message notification
     * @param {string} message - Message to display
     * @param {string} type - Message type (info, success, warning, error)
     * @param {number} duration - Duration in ms (0 = permanent)
     */
    showMessage(message, type = 'info', duration = 3000) {
        const messageElement = document.createElement('div');
        messageElement.className = `hud-message message-${type}`;
        messageElement.textContent = message;
        
        this.container.appendChild(messageElement);
        
        // Fade in
        setTimeout(() => messageElement.classList.add('show'), 10);
        
        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                messageElement.classList.remove('show');
                setTimeout(() => messageElement.remove(), 300);
            }, duration);
        }
        
        return messageElement;
    }

    /**
     * Show victory message
     */
    showVictory() {
        const victoryElement = document.createElement('div');
        victoryElement.className = 'victory-overlay';
        victoryElement.innerHTML = `
            <div class="victory-content">
                <h1 class="victory-title">VICTORY!</h1>
                <p class="victory-subtitle">All enemies defeated</p>
            </div>
        `;
        this.container.appendChild(victoryElement);
        
        setTimeout(() => victoryElement.classList.add('show'), 10);
        
        return victoryElement;
    }

    /**
     * Show/hide the entire HUD
     * @param {boolean} visible - Whether to show the HUD
     */
    setVisible(visible) {
        this._isVisible = visible;
        if (this.container) {
            this.container.style.display = visible ? 'block' : 'none';
        }
    }

    /**
     * Update controls display based on input method
     * @param {string} inputMethod - 'keyboard' or 'gamepad'
     */
    updateControlsDisplay(inputMethod) {
        if (!this.elements.controlsPanel) return;
        
        this.lastInputMethod = inputMethod;
        const sceneKey = this.scene.scene.key;
        
        if (sceneKey === 'WorldScene') {
            if (inputMethod === 'keyboard') {
                this.elements.controlsPanel.innerHTML = `
                    <div class="hud-title">Controls (Keyboard)</div>
                    <div class="control-row"><kbd>WASD</kbd> Move</div>
                    <div class="control-row"><kbd>Shift</kbd> Sprint (Hold & Release)</div>
                    <div class="control-row"><kbd>Q</kbd>/<kbd>E</kbd> Rotate Leader</div>
                    <div class="control-row"><kbd>/</kbd> Menu</div>
                    <div class="control-row"><kbd>M</kbd> Map</div>
                    <div class="control-row"><kbd>Enter</kbd> Pause</div>
                `;
            } else {
                this.elements.controlsPanel.innerHTML = `
                    <div class="hud-title">Controls (Gamepad)</div>
                    <div class="control-row">🕹️ <span>Left Stick</span> Move</div>
                    <div class="control-row">🎮 <span>L1</span> Sprint</div>
                    <div class="control-row">🎮 <span>D-pad L/R</span> Rotate Leader</div>
                    <div class="control-row">🎮 <span>Select</span> Menu</div>
                    <div class="control-row">🎮 <span>R2</span> Map</div>
                    <div class="control-row">🎮 <span>Start</span> Pause</div>
                `;
            }
        } else if (sceneKey === 'BattleScene') {
            if (inputMethod === 'keyboard') {
                this.elements.controlsPanel.innerHTML = `
                    <div class="hud-title">Battle Controls (Keyboard)</div>
                    <div class="control-row"><kbd>WASD</kbd> Move</div>
                    <div class="control-row"><kbd>Shift</kbd> Dash</div>
                    <div class="control-row"><kbd>U/I/O/P</kbd> Attack/Abilities</div>
                    <div class="control-row"><kbd>Q</kbd>/<kbd>E</kbd> Rotate Character</div>
                    <div class="control-row"><kbd>0</kbd> Group Mode</div>
                    <div class="control-row"><kbd>=</kbd> Charge AP</div>
                    <div class="control-row"><kbd>/</kbd> Battle Menu</div>
                    <div class="control-row"><kbd>ESC</kbd> Retreat</div>
                    <div class="control-row"><kbd>Enter</kbd> Pause</div>
                `;
            } else {
                this.elements.controlsPanel.innerHTML = `
                    <div class="hud-title">Battle Controls (Gamepad)</div>
                    <div class="control-row">🕹️ <span>Left Stick</span> Move</div>
                    <div class="control-row">🎮 <span>L1</span> Dash</div>
                    <div class="control-row">🎮 <span>A/B/X/Y</span> Attack/Abilities</div>
                    <div class="control-row">🎮 <span>D-pad L/R</span> Rotate Character</div>
                    <div class="control-row">🎮 <span>D-pad Up</span> Group Mode</div>
                    <div class="control-row">🎮 <span>L3 (Click Stick)</span> Charge AP</div>
                    <div class="control-row">🎮 <span>Select</span> Battle Menu</div>
                    <div class="control-row">🎮 <span>L2</span> Retreat</div>
                    <div class="control-row">🎮 <span>Start</span> Pause</div>
                `;
            }
        }
    }
    
    /**
     * Start monitoring input method
     */
    startInputMonitoring() {
        // Check for input method changes every second
        this.inputCheckInterval = setInterval(() => {
            const gamepad = window.getGlobalGamepad ? window.getGlobalGamepad() : null;
            
            // If gamepad has recent input, switch to gamepad display
            if (gamepad && gamepad.buttons) {
                const anyButtonPressed = gamepad.buttons.some(btn => btn && (btn.pressed || btn.value > 0.1));
                const anyAxisMoved = gamepad.axes && gamepad.axes.some(axis => Math.abs(axis) > 0.3);
                
                if ((anyButtonPressed || anyAxisMoved) && this.lastInputMethod !== 'gamepad') {
                    this.updateControlsDisplay('gamepad');
                }
            }
            
            // Check for keyboard input (if scene has input manager)
            if (this.scene.input && this.scene.input.keyboard) {
                const keys = this.scene.input.keyboard.keys;
                if (keys && Object.keys(keys).length > 0) {
                    const anyKeyDown = Object.values(keys).some(key => key && key.isDown);
                    if (anyKeyDown && this.lastInputMethod !== 'keyboard') {
                        this.updateControlsDisplay('keyboard');
                    }
                }
            }
        }, 1000);
    }
    
    /**
     * Stop monitoring input method
     */
    stopInputMonitoring() {
        if (this.inputCheckInterval) {
            clearInterval(this.inputCheckInterval);
            this.inputCheckInterval = null;
        }
    }

    /**
     * Hide the HUD
     */
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
            this._isVisible = false;
            console.log('[HUDManager] HUD hidden');
        }
    }

    /**
     * Show the HUD
     */
    show() {
        if (this.container) {
            this.container.style.display = 'block';
            this._isVisible = true;
            console.log('[HUDManager] HUD shown');
        }
    }

    /**
     * Check if HUD is visible
     * @returns {boolean} True if visible, false if hidden
     */
    isVisible() {
        return this._isVisible;
    }

    /**
     * Clean up and remove all HUD elements
     */
    destroy() {
        console.log('[HUDManager] Destroying HUD');
        
        this.stopInputMonitoring();
        
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        
        this.elements = {};
    }
}

