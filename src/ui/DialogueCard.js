/**
 * DialogueCard - Mobile-friendly dialogue card system
 * Features transparent gradient background and dynamic portrait window
 */

class DialogueCard {
    constructor(scene) {
        this.scene = scene;
        this.isActive = false;
        this.currentSpeaker = null;
        this.portraitCanvas = null;
        this.portraitContext = null;
        this.cardElement = null;
        this.portraitElement = null;
        this.textElement = null;
        this.choicesElement = null;
        this.selectedChoiceIndex = 0;
        this.choices = [];
        this.onChoiceSelected = null;
        this.onClose = null;
        
        // Multi-paragraph dialogue support
        this.currentParagraphIndex = 0;
        this.dialogueParagraphs = [];
        this.isMultiParagraph = false;
        this.dialogueType = 'conversation';
        
        // Mobile detection
        this.isMobile = this.detectMobile();
        
        // Responsive dimensions
        this.updateDimensions();
        
        // Load CSS if not already loaded
        this.loadCSS();
        
        // Listen for window resize
        window.addEventListener('resize', () => {
            this.updateDimensions();
            if (this.isActive) {
                this.updateCardLayout();
            }
        });
    }
    
    /**
     * Load CSS styles if not already loaded
     */
    loadCSS() {
        if (document.getElementById('dialogue-card-css')) return;
        
        const link = document.createElement('link');
        link.id = 'dialogue-card-css';
        link.rel = 'stylesheet';
        link.href = './src/ui/dialogue-card.css';
        document.head.appendChild(link);
    }
    
    /**
     * Detect if device is mobile
     */
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }
    
    /**
     * Update responsive dimensions with dynamic sizing
     */
    updateDimensions() {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Dynamic card dimensions based on viewport
        this.cardWidth = Math.min(viewportWidth * 0.9, 900); // Increased max width
        this.cardHeight = this.calculateDynamicHeight();
        this.cardX = (viewportWidth - this.cardWidth) / 2;
        this.cardY = 20; // Display from top instead of bottom
        
        // Portrait dimensions (responsive)
        this.portraitSize = this.isMobile ? 100 : 140; // Increased size
        this.portraitX = this.cardX + this.cardWidth - this.portraitSize - 20;
        this.portraitY = this.cardY + 20;
        
        // Text area dimensions (more space for text)
        this.textAreaWidth = this.cardWidth - this.portraitSize - 60; // More margin
        this.textAreaHeight = this.cardHeight - 80; // More space for text
        this.textAreaX = this.cardX + 20;
        this.textAreaY = this.cardY + 20;
    }
    
    /**
     * Calculate dynamic height based on content
     */
    calculateDynamicHeight() {
        const viewportHeight = window.innerHeight;
        const baseHeight = this.isMobile ? 200 : 180;
        
        // If we have dialogue paragraphs, calculate based on actual content
        if (this.dialogueParagraphs && this.dialogueParagraphs.length > 0) {
            // Calculate text height more accurately
            const textAreaWidth = this.textAreaWidth || 400; // Fallback width
            const fontSize = this.isMobile ? 16 : 18;
            const lineHeight = 1.6;
            const padding = 40; // Text padding
            const availableWidth = textAreaWidth - padding;
            
            let totalTextHeight = 0;
            
            // Calculate height for each paragraph
            this.dialogueParagraphs.forEach(paragraph => {
                // Estimate lines needed for this paragraph
                const words = paragraph.split(' ');
                const wordsPerLine = Math.floor(availableWidth / (fontSize * 0.6)); // Rough estimate
                const lines = Math.ceil(words.length / wordsPerLine);
                const paragraphHeight = lines * fontSize * lineHeight;
                totalTextHeight += paragraphHeight + 20; // Add spacing between paragraphs
            });
            
            // Add space for speaker name and continue prompt
            totalTextHeight += 80;
            
            // Add space for choices if present
            const choicesHeight = this.choices && this.choices.length > 0 ? 120 : 0;
            
            // Add space for portrait and margins
            const portraitSpace = 160; // Space for portrait and margins
            
            const calculatedHeight = totalTextHeight + choicesHeight + portraitSpace;
            
            // Don't exceed 80% of viewport height, but ensure minimum usability
            return Math.max(baseHeight, Math.min(calculatedHeight, viewportHeight * 0.8));
        }
        
        // Default height with choices consideration
        const choicesHeight = this.choices && this.choices.length > 0 ? 120 : 0;
        return baseHeight + choicesHeight;
    }
    
    /**
     * Update card layout when dimensions change
     */
    updateCardLayout() {
        if (!this.cardElement) return;
        
        // Update card dimensions
        this.cardElement.style.width = `${this.cardWidth}px`;
        this.cardElement.style.height = `${this.cardHeight}px`;
        this.cardElement.style.left = `${this.cardX}px`;
        this.cardElement.style.top = `${this.cardY}px`;
        
        // Update text area (no fixed height, let it expand)
        if (this.textElement) {
            this.textElement.style.width = `${this.textAreaWidth}px`;
            // Remove fixed height to let text expand naturally
        }
        
        // Update choices area
        if (this.choicesElement) {
            this.choicesElement.style.width = `${this.textAreaWidth}px`;
        }
        
        // Update help element
        if (this.helpElement) {
            this.helpElement.style.width = `${this.textAreaWidth}px`;
        }
        
        // Redraw portrait with new size
        if (this.portraitCanvas && this.currentSpeaker) {
            this.portraitCanvas.width = this.portraitSize;
            this.portraitCanvas.height = this.portraitSize;
            this.drawPortrait(this.currentSpeaker);
        }
    }
    
    /**
     * Adjust card height to fit actual text content
     */
    adjustCardHeightToContent() {
        if (!this.textElement || !this.cardElement) return;
        
        // Get the actual height of the text content
        const textHeight = this.textElement.scrollHeight;
        const textPadding = 40; // 20px padding on each side
        // Let card auto-size naturally with min/max constraints
        this.cardElement.style.height = 'auto';
        this.cardElement.style.minHeight = '250px';
        this.cardElement.style.maxHeight = '80vh';
        
        console.log('[DialogueCard] Card set to auto-size with natural flow');
    }
    
    /**
     * Show dialogue card with speaker
     */
    show(speakerData, message, choices = [], onChoiceSelected = null, onClose = null) {
        console.log('[DialogueCard] Showing dialogue card:', speakerData);
        
        this.currentSpeaker = speakerData;
        this.choices = choices;
        this.onChoiceSelected = onChoiceSelected;
        this.onClose = onClose;
        this.selectedChoiceIndex = 0;
        this.isActive = true;
        
        console.log('[DialogueCard] currentSpeaker set to:', this.currentSpeaker);
        
        this.createCard();
        this.updatePortrait(speakerData);
        this.updateText(message);
        this.updateChoices(choices);
        this.setupInput();
        
        console.log('[DialogueCard] Setup complete, isActive:', this.isActive);
        
        // Animate in
        this.animateIn();
    }
    
    /**
     * Show player dialogue (for testing or player responses)
     */
    showPlayerDialogue(message, choices = [], onChoiceSelected = null, onClose = null) {
        const playerData = {
            type: 'PLAYER',
            level: this.scene.gameStateManager?.playerStats?.level || 1,
            name: 'You'
        };
        
        this.show(playerData, message, choices, onChoiceSelected, onClose);
    }
    
    /**
     * Show multi-paragraph dialogue from database
     */
    showMultiParagraphDialogue(speakerData, dialogueData, onComplete = null, playerData = null, onClose = null) {
        console.log('[DialogueCard] Showing multi-paragraph dialogue:', dialogueData);
        
        this.currentSpeaker = speakerData;
        this.dialogueParagraphs = dialogueData.paragraphs || [];
        this.isMultiParagraph = true;
        this.dialogueType = dialogueData.type || 'conversation';
        this.currentParagraphIndex = 0;
        this.isActive = true;
        this.hasChoices = dialogueData.hasChoices || false;
        this.choices = dialogueData.choices || [];
        this.selectedChoiceIndex = 0;
        this.isPlayerChoiceMode = false; // Track when player is making choices
        this.playerData = playerData; // Store player data for portrait switching
        
        // Recalculate dimensions based on content
        this.updateDimensions();
        
        // Set up callbacks
        this.onChoiceSelected = onComplete;
        this.onClose = onClose; // Close callback for BattleScene
        
        this.createCard();
        this.updatePortrait(speakerData);
        
        // Ensure elements are created before updating text
        setTimeout(() => {
            console.log('[DialogueCard] Setting up multi-paragraph dialogue:', {
                currentSpeaker: this.currentSpeaker,
                dialogueParagraphs: this.dialogueParagraphs,
                isActive: this.isActive
            });
            
            this.updateMultiParagraphText();
            this.setupMultiParagraphInput();
            console.log('[DialogueCard] Multi-paragraph setup complete, isActive:', this.isActive);
            console.log('[DialogueCard] Elements ready:', {
                cardElement: !!this.cardElement,
                textElement: !!this.textElement,
                choicesElement: !!this.choicesElement,
                helpElement: !!this.helpElement
            });
        }, 10);
        
        // Animate in
        this.animateIn();
    }
    
    /**
     * Create the main card element
     */
    createCard() {
        // Remove existing card if it exists
        if (this.cardElement) {
            this.cardElement.remove();
        }
        
        // Create main card container with gradient fade - auto height
        const hasChoices = this.choices && this.choices.length > 0;
        
        // Create main card container with gradient fade
        this.cardElement = document.createElement('div');
        this.cardElement.id = 'dialogue-card';
        this.cardElement.style.cssText = `
            position: fixed;
            left: ${this.cardX}px;
            top: ${this.cardY}px;
            width: ${this.cardWidth}px;
            height: auto;
            min-height: 250px;
            max-height: 80vh;
            background: linear-gradient(180deg, 
                rgba(20, 20, 40, 0.95) 0%, 
                rgba(40, 20, 60, 0.8) 30%, 
                rgba(60, 20, 80, 0.6) 60%,
                rgba(80, 20, 100, 0.4) 80%,
                rgba(100, 20, 120, 0.2) 90%,
                rgba(120, 20, 140, 0.1) 95%,
                transparent 100%);
            border-radius: ${this.isMobile ? '0 0 15px 15px' : '15px'};
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            z-index: 10000;
            pointer-events: auto;
            transform: translateY(-100%);
            transition: transform 0.3s ease-out;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        `;
        
        // Create portrait container
        this.portraitElement = document.createElement('div');
        this.portraitElement.id = 'dialogue-portrait';
        this.portraitElement.style.cssText = `
            position: absolute;
            right: 20px;
            top: 20px;
            width: ${this.portraitSize}px;
            height: ${this.portraitSize}px;
            border-radius: 10px;
            overflow: hidden;
            border: 2px solid rgba(255, 255, 255, 0.3);
            background: rgba(0, 0, 0, 0.3);
        `;
        
        // Create text container that expands to fit content
        this.textElement = document.createElement('div');
        this.textElement.id = 'dialogue-text';
        this.textElement.style.cssText = `
            position: relative;
            width: 100%;
            color: white;
            font-family: Arial, sans-serif;
            font-size: ${this.isMobile ? '16px' : '18px'};
            line-height: 1.6;
            background: rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            padding: 2px;
            margin: 2px;
            box-sizing: border-box;
            word-wrap: break-word;
            white-space: pre-wrap;
        `;
        
        // Create choices container with dynamic positioning
        this.choicesElement = document.createElement('div');
        this.choicesElement.id = 'dialogue-choices';
        // Calculate initial top position for choices (below text area)
        const initialChoicesTop = this.portraitSize + 160; // Portrait size + text area top + some padding
        this.choicesElement.style.cssText = `
            position: absolute;
            left: 20px;
            top: ${initialChoicesTop}px;
            width: ${this.textAreaWidth}px;
            height: ${hasChoices ? '120px' : '60px'};
            display: ${hasChoices ? 'flex' : 'none'};
            flex-direction: column;
            gap: 8px;
            padding: 15px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            z-index: 10;
            overflow-y: auto;
        `;
        
        // Create help text with better positioning
        this.helpElement = document.createElement('div');
        this.helpElement.id = 'dialogue-help';
        this.helpElement.style.cssText = `
            position: absolute;
            left: 20px;
            bottom: 10px;
            width: ${this.textAreaWidth}px;
            height: 40px;
            color: #AAA;
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            padding-top: 5px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 4px;
            padding: 5px 10px;
        `;
        
        this.helpElement.innerHTML = `
            <div>WASD/Arrows: Navigate | ]: Continue/Select | ESC: Close</div>
            <div>1-9: Quick Select | Tab: Next</div>
        `;
        
        // Assemble card
        this.cardElement.appendChild(this.portraitElement);
        this.cardElement.appendChild(this.textElement);
        this.cardElement.appendChild(this.choicesElement);
        this.cardElement.appendChild(this.helpElement);
        document.body.appendChild(this.cardElement);
        
        console.log('[DialogueCard] Card created with elements:', {
            cardElement: !!this.cardElement,
            textElement: !!this.textElement,
            choicesElement: !!this.choicesElement,
            helpElement: !!this.helpElement,
            textElementStyle: this.textElement ? this.textElement.style.cssText : 'null'
        });
        
        // Ensure isActive is set after card creation
        this.isActive = true;
    }
    
    /**
     * Update portrait for speaker
     */
    updatePortrait(speakerData) {
        // Clear existing portrait
        this.portraitElement.innerHTML = '';
        
        // Create canvas for dynamic portrait
        this.portraitCanvas = document.createElement('canvas');
        this.portraitCanvas.width = this.portraitSize;
        this.portraitCanvas.height = this.portraitSize;
        this.portraitContext = this.portraitCanvas.getContext('2d');
        
        // Draw portrait based on speaker data
        this.drawPortrait(speakerData);
        
        this.portraitElement.appendChild(this.portraitCanvas);
    }
    
    /**
     * Draw dynamic 2D portrait
     */
    drawPortrait(speakerData) {
        const ctx = this.portraitContext;
        const size = this.portraitSize;
        const centerX = size / 2;
        const centerY = size / 2;
        
        // Clear canvas
        ctx.clearRect(0, 0, size, size);
        
        // Determine portrait style based on speaker type
        const isPlayer = speakerData.type === 'PLAYER';
        const isNPC = !isPlayer;
        
        if (isPlayer) {
            this.drawPlayerPortrait(ctx, centerX, centerY, size);
        } else {
            this.drawNPCPortrait(ctx, centerX, centerY, size, speakerData);
        }
    }
    
    /**
     * Draw player portrait
     */
    drawPlayerPortrait(ctx, centerX, centerY, size) {
        const radius = size * 0.4;
        
        // Background circle
        ctx.fillStyle = '#4A90E2';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Border
        ctx.strokeStyle = '#2E5C8A';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Face
        ctx.fillStyle = '#FDBCB4';
        ctx.beginPath();
        ctx.arc(centerX, centerY - 5, radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = '#2C3E50';
        ctx.beginPath();
        ctx.arc(centerX - 8, centerY - 10, 3, 0, Math.PI * 2);
        ctx.arc(centerX + 8, centerY - 10, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Smile
        ctx.strokeStyle = '#2C3E50';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY + 5, 15, 0, Math.PI);
        ctx.stroke();
        
        // Hair
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.arc(centerX, centerY - 20, radius * 0.7, Math.PI, Math.PI * 2);
        ctx.fill();
    }
    
    /**
     * Draw NPC portrait based on type
     */
    drawNPCPortrait(ctx, centerX, centerY, size, speakerData) {
        const radius = size * 0.4;
        const npcType = speakerData.type || 'UNKNOWN';
        
        // Color based on NPC type
        let primaryColor, secondaryColor, accentColor;
        
        switch (npcType) {
            case 'GUARD':
                primaryColor = '#8B4513'; // Brown armor
                secondaryColor = '#2C3E50'; // Dark blue
                accentColor = '#E74C3C'; // Red
                break;
            case 'MERCHANT':
                primaryColor = '#F39C12'; // Gold
                secondaryColor = '#8E44AD'; // Purple
                accentColor = '#27AE60'; // Green
                break;
            case 'VILLAGER':
                primaryColor = '#95A5A6'; // Gray
                secondaryColor = '#34495E'; // Dark gray
                accentColor = '#3498DB'; // Blue
                break;
            default:
                primaryColor = '#7F8C8D';
                secondaryColor = '#2C3E50';
                accentColor = '#E67E22';
        }
        
        // Background circle
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Border
        ctx.strokeStyle = secondaryColor;
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Face
        ctx.fillStyle = '#FDBCB4';
        ctx.beginPath();
        ctx.arc(centerX, centerY - 5, radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = secondaryColor;
        ctx.beginPath();
        ctx.arc(centerX - 8, centerY - 10, 3, 0, Math.PI * 2);
        ctx.arc(centerX + 8, centerY - 10, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Expression based on type
        if (npcType === 'GUARD') {
            // Angry expression
            ctx.strokeStyle = secondaryColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(centerX - 15, centerY + 5);
            ctx.lineTo(centerX - 5, centerY + 10);
            ctx.moveTo(centerX + 5, centerY + 10);
            ctx.lineTo(centerX + 15, centerY + 5);
            ctx.stroke();
        } else {
            // Neutral expression
            ctx.strokeStyle = secondaryColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY + 5, 15, 0, Math.PI);
            ctx.stroke();
        }
        
        // Hat/helmet based on type
        ctx.fillStyle = accentColor;
        if (npcType === 'GUARD') {
            // Helmet
            ctx.beginPath();
            ctx.arc(centerX, centerY - 20, radius * 0.8, Math.PI, Math.PI * 2);
            ctx.fill();
        } else if (npcType === 'MERCHANT') {
            // Hat
            ctx.beginPath();
            ctx.arc(centerX, centerY - 25, radius * 0.6, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Level indicator
        if (speakerData.level) {
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Lv.${speakerData.level}`, centerX, size - 5);
        }
    }
    
    /**
     * Update dialogue text
     */
    updateText(message) {
        if (!this.currentSpeaker) {
            console.warn('[DialogueCard] updateText called but currentSpeaker is null, retrying...');
            // Retry after a short delay
            setTimeout(() => {
                if (this.currentSpeaker && this.textElement) {
                    this.updateText(message);
                }
            }, 10);
            return;
        }
        
        if (!this.textElement) {
            console.warn('[DialogueCard] updateText called but textElement is null');
            return;
        }
        
        this.textElement.innerHTML = `
            <div style="font-weight: bold; color: #FFD700; margin-bottom: 10px;">
                ${this.currentSpeaker.type} ${this.currentSpeaker.level ? `(Level ${this.currentSpeaker.level})` : ''}
            </div>
            <div>${message}</div>
        `;
    }
    
    /**
     * Switch to player portrait and update dialogue for choices
     */
    switchToPlayerChoices() {
        console.log('[DialogueCard] Switching to player portrait for choices');
        console.log('[DialogueCard] Choices available:', this.choices);
        console.log('[DialogueCard] Has choices element:', !!this.choicesElement);
        
        // Set player choice mode
        this.isPlayerChoiceMode = true;
        
        // Use stored player data or create default
        const playerData = this.playerData || {
            id: 'player',
            type: 'Player',
            level: 1,
            health: 100,
            maxHealth: 100
        };
        
        // Update current speaker to player
        this.currentSpeaker = playerData;
        
        // Update portrait
        this.updatePortrait(playerData);
        
        // Check if there are choices available
        if (this.choices.length === 0) {
            console.log('[DialogueCard] No choices available, closing dialogue');
            this.hide();
            return;
        }
        
        console.log('[DialogueCard] About to show', this.choices.length, 'choices');
        
        // Integrate choices as plain text (no fancy cards)
        if (this.textElement) {
            // Build simple plain text choices
            let choicesHTML = '';
            this.choices.forEach((choice, index) => {
                const isSelected = index === this.selectedChoiceIndex;
                const arrow = isSelected ? '▶' : '  ';
                const textColor = isSelected ? '#FFD700' : '#CCCCCC';
                const fontWeight = isSelected ? 'bold' : 'normal';
                
                choicesHTML += `
                    <div class="dialogue-choice" data-choice-index="${index}" style="
                        color: ${textColor};
                        padding: 8px 0;
                        margin: 0;
                        cursor: pointer;
                        font-size: 16px;
                        line-height: 1.4;
                        font-weight: ${fontWeight};
                        ${!choice.available ? 'opacity: 0.5; cursor: not-allowed;' : ''}
                    ">
                        <span style="display: inline-block; width: 25px; color: ${textColor};">${arrow}</span>${choice.text}
                    </div>
                `;
            });
            
            // Set entire content as simple text in ONE card
            this.textElement.style.minHeight = '0px';
            this.textElement.style.padding = '2px';
            this.textElement.style.height = 'auto';
            this.textElement.style.maxHeight = 'none';
            this.textElement.style.overflowY = 'visible';
            
            this.textElement.innerHTML = `
                <div style="color: #FFD700; margin: 0 0 15px 0; font-size: 14px; line-height: 1.2;">
                    ${playerData.type} ${playerData.level ? `(Lv ${playerData.level})` : ''} - What will you do?
                </div>
                ${choicesHTML}
                <div style="display: flex; justify-content: center; margin-top: 15px; padding-top: 10px; border-top: 1px solid rgba(255, 215, 0, 0.3);">
                    <div style="color: #00D9FF; font-size: 14px; font-weight: bold;">
                        W/S - Navigate | U - Confirm | ESC - Cancel
                    </div>
                </div>
            `;
            
            // Hide the separate choices element since we integrated it
            if (this.choicesElement) {
                this.choicesElement.style.display = 'none';
            }
            
            // Add click handlers to integrated choices
            setTimeout(() => {
                const choiceElements = this.textElement.querySelectorAll('.dialogue-choice');
                choiceElements.forEach((element, index) => {
                    const choice = this.choices[index];
                    if (choice && choice.available) {
                        element.style.cursor = 'pointer';
                        element.addEventListener('mouseenter', () => {
                            this.selectedChoiceIndex = index;
                            this.updateChoiceSelection();
                        });
                        element.addEventListener('click', () => {
                            this.selectChoice(choice);
                        });
                    }
                });
            }, 10);
            
            console.log('[DialogueCard] Choices integrated as plain text');
        }
    }

    /**
     * Update multi-paragraph dialogue text
     */
    updateMultiParagraphText() {
        if (!this.currentSpeaker) {
            console.warn('[DialogueCard] updateMultiParagraphText called but currentSpeaker is null, retrying...');
            setTimeout(() => {
                if (this.currentSpeaker) {
                    this.updateMultiParagraphText();
                } else {
                    console.error('[DialogueCard] currentSpeaker still null after retry');
                }
            }, 10);
            return;
        }
        
        if (!this.textElement) {
            console.warn('[DialogueCard] updateMultiParagraphText called but textElement is null, retrying...');
            setTimeout(() => {
                if (this.textElement) {
                    this.updateMultiParagraphText();
                }
            }, 10);
            return;
        }
        
        // Restore text element to normal size for NPC dialogue
        this.textElement.style.minHeight = '100px'; // Restore normal height
        this.textElement.style.padding = '2px'; // Restore minimal padding
        
        const currentParagraph = this.dialogueParagraphs[this.currentParagraphIndex];
        const isLastParagraph = this.currentParagraphIndex >= this.dialogueParagraphs.length - 1;
        
        console.log('[DialogueCard] Rendering text:', {
            currentParagraph,
            currentParagraphIndex: this.currentParagraphIndex,
            totalParagraphs: this.dialogueParagraphs.length,
            isLastParagraph,
            textElement: this.textElement
        });
        
        // Create progress indicator
        const progressText = this.dialogueParagraphs.length > 1 ? 
            `(${this.currentParagraphIndex + 1}/${this.dialogueParagraphs.length})` : '';
        
        // Create navigation hints based on position in dialogue
        const isFirstParagraph = this.currentParagraphIndex === 0;
        const navigationHint = isFirstParagraph ? 
            'ESC - Cancel' : 
            'ESC - Back';
        const continueHint = isLastParagraph ? 
            'U - Continue' : 
            'U - Next';
        
        const htmlContent = `
            <div style="font-weight: bold; color: #FFD700; margin-bottom: 10px;">
                ${this.currentSpeaker.type} ${this.currentSpeaker.level ? `(Level ${this.currentSpeaker.level})` : ''} ${progressText}
            </div>
            <div style="margin-bottom: 15px; line-height: 1.6;">${currentParagraph}</div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255, 215, 0, 0.3);">
                <div style="color: #00D9FF; font-size: 14px; font-weight: bold;">
                    ${navigationHint} | ${continueHint}
                </div>
            </div>
        `;
        
        console.log('[DialogueCard] Setting innerHTML:', htmlContent);
        this.textElement.innerHTML = htmlContent;
        console.log('[DialogueCard] Text element after setting innerHTML:', this.textElement.innerHTML);
        
        // Force visibility
        this.textElement.style.display = 'block';
        this.textElement.style.visibility = 'visible';
        this.textElement.style.opacity = '1';
        this.textElement.style.color = 'white';
        
        // Measure actual text content and adjust card height
        this.adjustCardHeightToContent();
        
        console.log('[DialogueCard] Text element computed style:', {
            display: window.getComputedStyle(this.textElement).display,
            visibility: window.getComputedStyle(this.textElement).visibility,
            opacity: window.getComputedStyle(this.textElement).opacity,
            color: window.getComputedStyle(this.textElement).color,
            position: window.getComputedStyle(this.textElement).position,
            zIndex: window.getComputedStyle(this.textElement).zIndex
        });
        
        // Hide choices during NPC dialogue (they will be shown when switching to player)
        if (this.choicesElement) {
            this.choicesElement.style.display = 'none';
        }
    }
    
    /**
     * Update dialogue choices
     */
    updateChoices(choices) {
        console.log('[DialogueCard] updateChoices called with', choices.length, 'choices');
        this.choicesElement.innerHTML = '';
        
        if (choices.length === 0) {
            console.log('[DialogueCard] No choices, hiding choices element');
            this.choicesElement.style.display = 'none';
            return;
        }
        
        console.log('[DialogueCard] Setting choices element to flex');
        this.choicesElement.style.display = 'flex';
        this.choicesElement.style.visibility = 'visible';
        this.choicesElement.style.opacity = '1';
        
        console.log('[DialogueCard] Choices element styles:', {
            display: this.choicesElement.style.display,
            visibility: this.choicesElement.style.visibility,
            opacity: this.choicesElement.style.opacity,
            top: this.choicesElement.style.top,
            left: this.choicesElement.style.left,
            width: this.choicesElement.style.width,
            height: this.choicesElement.style.height,
            zIndex: this.choicesElement.style.zIndex
        });
        
        choices.forEach((choice, index) => {
            const choiceElement = document.createElement('div');
            choiceElement.className = `dialogue-choice ${index === this.selectedChoiceIndex ? 'selected' : ''}`;
            choiceElement.style.cssText = `
                color: ${index === this.selectedChoiceIndex ? '#FFD700' : 'white'};
                font-size: ${this.isMobile ? '14px' : '16px'};
                cursor: pointer;
                text-align: left;
                display: flex;
                align-items: center;
                ${!choice.available ? 'opacity: 0.5; cursor: not-allowed;' : ''}
            `;
            
            const arrow = index === this.selectedChoiceIndex ? '>' : ' ';
            const numberIndicator = index + 1; // 1-based numbering
            choiceElement.innerHTML = `
                <span style="margin-right: 8px; font-weight: bold; color: ${index === this.selectedChoiceIndex ? '#FFD700' : 'transparent'};">
                    ${arrow}
                </span>
                <span style="margin-right: 8px; font-weight: bold; color: #888; font-size: 12px;">
                    ${numberIndicator}.
                </span>
                <div>
                    <div style="font-weight: bold;">${choice.text}</div>
                    ${choice.description ? `<div style="font-size: 12px; color: #AAA; margin-top: 2px;">${choice.description}</div>` : ''}
                    ${!choice.available ? `<div style="font-size: 11px; color: #FF6B6B; margin-top: 2px;">${choice.reason || 'Not available'}</div>` : ''}
                </div>
            `;
            
            if (choice.available) {
                choiceElement.addEventListener('mouseenter', () => {
                    this.selectedChoiceIndex = index;
                    this.updateChoiceSelection();
                });
                
                choiceElement.addEventListener('click', () => {
                    this.selectChoice(choice);
                });
            }
            
            this.choicesElement.appendChild(choiceElement);
        });
    }
    
    /**
     * Update choice selection visual state (plain text style)
     */
    updateChoiceSelection() {
        // Check both separate choicesElement and integrated textElement
        let choiceElements = null;
        
        if (this.choicesElement && this.choicesElement.style.display !== 'none') {
            // Old system: separate choices element
            choiceElements = this.choicesElement.querySelectorAll('.dialogue-choice');
        } else if (this.textElement) {
            // New system: integrated into text element
            choiceElements = this.textElement.querySelectorAll('.dialogue-choice');
        }
        
        if (!choiceElements || choiceElements.length === 0) {
            console.log('[DialogueCard] No choice elements found to update');
            return;
        }
        
        choiceElements.forEach((element, index) => {
            const arrowSpan = element.querySelector('span');
            
            if (index === this.selectedChoiceIndex) {
                // Selected: gold and bold
                element.classList.add('selected');
                element.style.color = '#FFD700';
                element.style.fontWeight = 'bold';
                if (arrowSpan) {
                    arrowSpan.textContent = '▶';
                    arrowSpan.style.color = '#FFD700';
                }
            } else {
                // Not selected: light gray and normal
                element.classList.remove('selected');
                element.style.color = '#CCCCCC';
                element.style.fontWeight = 'normal';
                if (arrowSpan) {
                    arrowSpan.textContent = '  '; // Two spaces for alignment
                    arrowSpan.style.color = '#CCCCCC';
                }
            }
        });
    }
    
    /**
     * Select a choice
     */
    selectChoice(choice) {
        if (!choice || !choice.available) {
            console.warn('[DialogueCard] Invalid choice selected:', choice);
            return;
        }
        
        console.log('[DialogueCard] Choice selected:', choice.id);
        console.log('[DialogueCard] Cleaning up dialogue card...');
        
        // Reset player choice mode
        this.isPlayerChoiceMode = false;
        
        // Clean up keyboard handler immediately
        if (this.keyboardHandler) {
            document.removeEventListener('keydown', this.keyboardHandler);
            this.keyboardHandler = null;
        }
        
        // Call the choice callback
        if (this.onChoiceSelected) {
            console.log('[DialogueCard] Calling choice callback...');
            this.onChoiceSelected(choice);
        }
        
        // Hide the dialogue card (set isActive to false after calling hide)
        console.log('[DialogueCard] Hiding dialogue card...');
        this.hide();
        this.isActive = false;
    }
    
    /**
     * Setup multi-paragraph input handling
     */
    setupMultiParagraphInput() {
        // Setup gamepad button state tracking
        this.gamepadButtonStates = {};
        
        // Start gamepad polling
        this.startGamepadPolling();
        
        this.keyboardHandler = (event) => {
            console.log('[DialogueCard] Multi-paragraph key pressed:', event.key, 'isActive:', this.isActive);
            
            if (!this.isActive) {
                console.log('[DialogueCard] Input ignored - not active');
                return;
            }
            
            // Prevent interference with BattleScene input
            event.stopPropagation();
            
            const isLastParagraph = this.currentParagraphIndex >= this.dialogueParagraphs.length - 1;
            const showingChoices = this.isPlayerChoiceMode && this.choices.length > 0;
            
            // If in player choice mode but no choices, just close on any key
            if (this.isPlayerChoiceMode && this.choices.length === 0) {
                switch (event.key) {
                    case 'u':
                    case 'U':
                    case 'Enter':
                    case ' ':
                    case 'Escape':
                        event.preventDefault();
                        console.log('[DialogueCard] No choices available, closing dialogue');
                        this.hide();
                        break;
                }
                return;
            }
            
            if (showingChoices) {
                // Handle choice navigation and selection
                switch (event.key) {
                    // Navigation controls
                    case 'ArrowUp':
                    case 'w':
                    case 'W':
                        event.preventDefault();
                        this.navigateChoices(-1);
                        break;
                    case 'ArrowDown':
                    case 's':
                    case 'S':
                        event.preventDefault();
                        this.navigateChoices(1);
                        break;
                    case 'ArrowLeft':
                    case 'a':
                    case 'A':
                        event.preventDefault();
                        this.navigateChoices(-1);
                        break;
                    case 'ArrowRight':
                    case 'd':
                    case 'D':
                        event.preventDefault();
                        this.navigateChoices(1);
                        break;
                    
                    // Selection controls
                    case 'u':
                    case 'U':
                    case 'Enter':
                    case ' ':
                        event.preventDefault();
                        if (this.choices[this.selectedChoiceIndex]) {
                            this.selectChoice(this.choices[this.selectedChoiceIndex]);
                        }
                        break;
                    
                    // Cancel/Close controls
                    case 'Escape':
                        event.preventDefault();
                        this.hide();
                        break;
                }
            } else {
                // Handle text progression
                switch (event.key) {
                    // Continue to next paragraph or finish dialogue
                    case 'u':
                    case 'U':
                    case 'Enter':
                    case ' ':
                        event.preventDefault();
                        this.nextParagraph();
                        break;
                    
                    // Go back to previous paragraph
                    case 'Escape':
                        event.preventDefault();
                        this.previousParagraph();
                        break;
                }
            }
        };
        
        document.addEventListener('keydown', this.keyboardHandler);
    }
    
    /**
     * Start gamepad polling for dialogue input
     */
    startGamepadPolling() {
        this.gamepadPollInterval = setInterval(() => {
            if (!this.isActive) return;
            
            const gamepad = window.getGlobalGamepad?.();
            if (!gamepad || !gamepad.buttons) return;
            
            const showingChoices = this.isPlayerChoiceMode && this.choices.length > 0;
            
            // Check A button (button 0) for confirmation/selection
            const aButtonPressed = gamepad.buttons[0] && gamepad.buttons[0].pressed;
            const aButtonJustPressed = aButtonPressed && !this.gamepadButtonStates.aButton;
            this.gamepadButtonStates.aButton = aButtonPressed;
            
            if (aButtonJustPressed) {
                if (this.isPlayerChoiceMode && this.choices.length === 0) {
                    // No choices, just close
                    this.hide();
                } else if (showingChoices) {
                    // Select current choice
                    if (this.choices[this.selectedChoiceIndex]) {
                        this.selectChoice(this.choices[this.selectedChoiceIndex]);
                    }
                } else {
                    // Continue to next paragraph
                    this.nextParagraph();
                }
            }
            
            // Check B button (button 1) for cancel/back
            const bButtonPressed = gamepad.buttons[1] && gamepad.buttons[1].pressed;
            const bButtonJustPressed = bButtonPressed && !this.gamepadButtonStates.bButton;
            this.gamepadButtonStates.bButton = bButtonPressed;
            
            if (bButtonJustPressed) {
                if (showingChoices) {
                    // Cancel when viewing choices
                    this.hide();
                } else {
                    // Go back to previous paragraph (like ESC key)
                    this.previousParagraph();
                }
            }
            
            // Check left stick for choice navigation (only if showing choices)
            if (showingChoices) {
                const axisX = gamepad.axes[0] || 0;
                const axisY = gamepad.axes[1] || 0;
                const deadzone = 0.5;
                
                const stickLeft = axisX < -deadzone;
                const stickRight = axisX > deadzone;
                const stickUp = axisY < -deadzone;
                const stickDown = axisY > deadzone;
                
                const stickLeftJustPressed = stickLeft && !this.gamepadButtonStates.stickLeft;
                const stickRightJustPressed = stickRight && !this.gamepadButtonStates.stickRight;
                const stickUpJustPressed = stickUp && !this.gamepadButtonStates.stickUp;
                const stickDownJustPressed = stickDown && !this.gamepadButtonStates.stickDown;
                
                this.gamepadButtonStates.stickLeft = stickLeft;
                this.gamepadButtonStates.stickRight = stickRight;
                this.gamepadButtonStates.stickUp = stickUp;
                this.gamepadButtonStates.stickDown = stickDown;
                
                if (stickLeftJustPressed || stickUpJustPressed) {
                    this.navigateChoices(-1);
                }
                if (stickRightJustPressed || stickDownJustPressed) {
                    this.navigateChoices(1);
                }
            }
        }, 50); // Poll every 50ms
    }
    
    /**
     * Stop gamepad polling
     */
    stopGamepadPolling() {
        if (this.gamepadPollInterval) {
            clearInterval(this.gamepadPollInterval);
            this.gamepadPollInterval = null;
        }
    }
    
    /**
     * Move to next paragraph or finish dialogue
     */
    nextParagraph() {
        this.currentParagraphIndex++;
        
        if (this.currentParagraphIndex >= this.dialogueParagraphs.length) {
            // End of dialogue - check if there are choices to show
            if (this.hasChoices && this.choices.length > 0) {
                console.log('[DialogueCard] Showing choices after dialogue');
                this.switchToPlayerChoices(); // Switch to player portrait and show choices
            } else {
                console.log('[DialogueCard] Multi-paragraph dialogue complete');
                this.hide();
            }
        } else {
            // Continue to next paragraph
            this.updateMultiParagraphText();
        }
    }
    
    /**
     * Setup keyboard input
     */
    setupInput() {
        this.keyboardHandler = (event) => {
            if (!this.isActive) {
                console.log('[DialogueCard] Input ignored - not active');
                return;
            }
            
            console.log('[DialogueCard] Key pressed:', event.key);
            
            switch (event.key) {
                // Navigation controls
                case 'ArrowUp':
                case 'w':
                case 'W':
                    event.preventDefault();
                    this.navigateChoices(-1);
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    event.preventDefault();
                    this.navigateChoices(1);
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    event.preventDefault();
                    this.navigateChoices(-1);
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    event.preventDefault();
                    this.navigateChoices(1);
                    break;
                
                // Selection controls
                case 'u':
                case 'U':
                case 'Enter':
                case ' ':
                    event.preventDefault();
                    if (this.choices[this.selectedChoiceIndex] && this.choices[this.selectedChoiceIndex].available) {
                        this.selectChoice(this.choices[this.selectedChoiceIndex]);
                    }
                    break;
                
                // Cancel/Close controls
                case 'Escape':
                    event.preventDefault();
                    this.hide();
                    break;
                
                // Number keys for quick selection (1-9)
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                case '7':
                case '8':
                case '9':
                    event.preventDefault();
                    const choiceIndex = parseInt(event.key) - 1;
                    if (choiceIndex >= 0 && choiceIndex < this.choices.length && this.choices[choiceIndex].available) {
                        this.selectedChoiceIndex = choiceIndex;
                        this.updateChoiceSelection();
                        this.selectChoice(this.choices[choiceIndex]);
                    }
                    break;
                
                // Tab for cycling through choices
                case 'Tab':
                    event.preventDefault();
                    this.navigateChoices(1);
                    break;
            }
        };
        
        document.addEventListener('keydown', this.keyboardHandler);
    }
    
    /**
     * Navigate through choices
     */
    navigateChoices(direction) {
        if (this.choices.length === 0) return;
        
        // Safety check to prevent infinite loop
        let attempts = 0;
        const maxAttempts = this.choices.length;
        
        do {
            this.selectedChoiceIndex += direction;
            if (this.selectedChoiceIndex < 0) {
                this.selectedChoiceIndex = this.choices.length - 1;
            } else if (this.selectedChoiceIndex >= this.choices.length) {
                this.selectedChoiceIndex = 0;
            }
            attempts++;
        } while (!this.choices[this.selectedChoiceIndex].available && attempts < maxAttempts);
        
        // If all choices are unavailable, just select the first one
        if (attempts >= maxAttempts) {
            this.selectedChoiceIndex = 0;
        }
        
        this.updateChoiceSelection();
    }
    
    /**
     * Animate card in
     */
    animateIn() {
        this.cardElement.style.transform = 'translateY(-100%)';
        
        requestAnimationFrame(() => {
            this.cardElement.style.transform = 'translateY(0)';
        });
    }
    
    /**
     * Animate card out
     */
    animateOut() {
        this.cardElement.style.transform = 'translateY(-100%)';
        
        setTimeout(() => {
            this.destroy();
        }, 300);
    }
    
    /**
     * Update card layout (for responsive design)
     */
    updateCardLayout() {
        if (!this.isActive || !this.cardElement) return;
        
        this.updateDimensions();
        
        this.cardElement.style.left = `${this.cardX}px`;
        this.cardElement.style.top = `${this.cardY}px`;
        this.cardElement.style.width = `${this.cardWidth}px`;
        this.cardElement.style.height = `${this.cardHeight}px`;
        
        this.portraitElement.style.width = `${this.portraitSize}px`;
        this.portraitElement.style.height = `${this.portraitSize}px`;
        
        this.textElement.style.width = `${this.textAreaWidth}px`;
        this.textElement.style.height = `${this.textAreaHeight - (this.choices.length > 0 ? 60 : 0)}px`;
        this.textElement.style.fontSize = `${this.isMobile ? '16px' : '18px'}`;
        
        this.choicesElement.style.width = `${this.textAreaWidth}px`;
        
        // Update help element
        if (this.helpElement) {
            this.helpElement.style.width = `${this.textAreaWidth}px`;
        }
        
        // Redraw portrait with new size
        if (this.portraitCanvas && this.currentSpeaker) {
            this.portraitCanvas.width = this.portraitSize;
            this.portraitCanvas.height = this.portraitSize;
            this.drawPortrait(this.currentSpeaker);
        }
    }
    
    /**
     * Hide dialogue card
     */
    hide() {
        if (!this.isActive) return;
        
        console.log('[DialogueCard] Hiding dialogue card');
        
        // Clean up keyboard handler immediately
        if (this.keyboardHandler) {
            document.removeEventListener('keydown', this.keyboardHandler);
            this.keyboardHandler = null;
        }
        
        // Stop gamepad polling
        this.stopGamepadPolling();
        
        // Reset dialogue state
        this.isActive = false;
        this.isPlayerChoiceMode = false;
        
        this.animateOut();
        
        if (this.onClose) {
            console.log('[DialogueCard] Calling onClose callback');
            this.onClose();
        }
    }
    
    /**
     * Destroy dialogue card
     */
    destroy() {
        if (this.keyboardHandler) {
            document.removeEventListener('keydown', this.keyboardHandler);
            this.keyboardHandler = null;
        }
        
        if (this.cardElement) {
            this.cardElement.remove();
            this.cardElement = null;
        }
        
        this.portraitElement = null;
        this.textElement = null;
        this.choicesElement = null;
        this.helpElement = null;
        this.portraitCanvas = null;
        this.portraitContext = null;
        this.isActive = false;
        this.currentSpeaker = null;
        this.choices = [];
        this.onChoiceSelected = null;
        this.onClose = null;
        
        // Reset multi-paragraph state
        this.currentParagraphIndex = 0;
        this.dialogueParagraphs = [];
        this.isMultiParagraph = false;
        this.dialogueType = 'conversation';
    }
}

export default DialogueCard;
