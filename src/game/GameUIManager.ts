export class GameUIManager {
    private scene: Phaser.Scene;
    private levelInfoText: Phaser.GameObjects.Text;
    private aiDifficultyText: Phaser.GameObjects.Text;
    private undoButton: Phaser.GameObjects.Text;
    private quitButton: Phaser.GameObjects.Text;
    private currentPlayerSprite: Phaser.GameObjects.Sprite;
    private buttonEventHandlers: Map<Phaser.GameObjects.Text, {
        pointerover?: () => void,
        pointerout?: () => void,
        pointerdown?: () => void
    }> = new Map();

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * Create all UI elements for the game
     */
    createUI(): { levelInfoText: Phaser.GameObjects.Text, aiDifficultyText: Phaser.GameObjects.Text, undoButton: Phaser.GameObjects.Text, quitButton: Phaser.GameObjects.Text, currentPlayerSprite: Phaser.GameObjects.Sprite } {
        this.createTitle();
        this.createInstructions();
        this.createLevelInfo();
        this.createCurrentPlayerSprite();
        this.createAIDifficultyText();
        this.createUndoButton();
        this.createQuitButton();

        return {
            levelInfoText: this.levelInfoText,
            aiDifficultyText: this.aiDifficultyText,
            undoButton: this.undoButton,
            quitButton: this.quitButton,
            currentPlayerSprite: this.currentPlayerSprite
        };
    }

    private createTitle(): void {
        const titleFontSize = Math.min(32, this.scene.cameras.main.width / 25);
        this.scene.add.text(this.scene.cameras.main.width / 2, 30, 'Infection!', {
            fontFamily: 'Arial Black', 
            fontSize: titleFontSize, 
            stroke: '#005500', strokeThickness: 6,
            color: '#44ff44'
        }).setOrigin(0.5);
    }

    private createInstructions(): void {
        const instructionFontSize = Math.min(18, this.scene.cameras.main.width / 45);
        const instructionY = this.scene.cameras.main.height - 40;
        this.scene.add.text(this.scene.cameras.main.width / 2, instructionY, 'Click on a cell to place a dot', {
            fontFamily: 'Arial', 
            fontSize: instructionFontSize, 
            color: '#cccccc'
        }).setOrigin(0.5);
    }

    private createLevelInfo(): void {
        const levelInfoFontSize = Math.min(18, this.scene.cameras.main.width / 45);
        this.levelInfoText = this.scene.add.text(this.scene.cameras.main.width / 2, 70, '', {
            fontFamily: 'Arial', 
            fontSize: levelInfoFontSize, 
            color: '#ffffff'
        }).setOrigin(0.5);
    }

    private createCurrentPlayerSprite(): void {
        const spriteSize = Math.min(3.0, this.scene.cameras.main.width / 200);
        const spriteX = Math.min(80, this.scene.cameras.main.width * 0.08);
        const spriteY = Math.min(80, this.scene.cameras.main.height * 0.12);
        
        // Start with red sprite by default
        this.currentPlayerSprite = this.scene.add.sprite(spriteX, spriteY, 'evil-sprite');
        this.currentPlayerSprite.setScale(spriteSize);
        this.currentPlayerSprite.play('evil-dot-pulse');
    }

    private createAIDifficultyText(): void {
        const difficultyFontSize = Math.min(16, this.scene.cameras.main.width / 50);
        const difficultyX = Math.min(50, this.scene.cameras.main.width * 0.05);
        const difficultyY = Math.min(120, this.scene.cameras.main.height * 0.18);
        
        this.aiDifficultyText = this.scene.add.text(difficultyX, difficultyY, 'AI: easy', {
            fontFamily: 'Arial', 
            fontSize: difficultyFontSize, 
            color: '#cccccc'
        }).setOrigin(0);
    }

    private createUndoButton(): void {
        const buttonFontSize = Math.min(20, this.scene.cameras.main.width / 40);
        const buttonX = Math.min(50, this.scene.cameras.main.width * 0.05);
        const buttonY = Math.min(150, this.scene.cameras.main.height * 0.22);

        this.undoButton = this.scene.add.text(buttonX, buttonY, 'Undo', {
            fontFamily: 'Arial',
            fontSize: buttonFontSize,
            color: '#ffffff',
            backgroundColor: '#666666',
            padding: { x: 12, y: 6 }
        }).setOrigin(0);

        this.undoButton.setInteractive();

        const handlers = {
            pointerover: () => {
                this.undoButton.setBackgroundColor('#888888');
            },
            pointerout: () => {
                this.undoButton.setBackgroundColor('#666666');
            }
        };

        this.undoButton.on('pointerover', handlers.pointerover);
        this.undoButton.on('pointerout', handlers.pointerout);

        this.buttonEventHandlers.set(this.undoButton, handlers);
    }

    private createQuitButton(): void {
        const buttonFontSize = Math.min(20, this.scene.cameras.main.width / 40);
        const buttonX = Math.min(50, this.scene.cameras.main.width * 0.05);
        const buttonY = Math.min(200, this.scene.cameras.main.height * 0.29);

        this.quitButton = this.scene.add.text(buttonX, buttonY, 'Quit', {
            fontFamily: 'Arial',
            fontSize: buttonFontSize,
            color: '#ffffff',
            backgroundColor: '#aa4444',
            padding: { x: 12, y: 6 }
        }).setOrigin(0);

        this.quitButton.setInteractive();

        const handlers = {
            pointerover: () => {
                this.quitButton.setBackgroundColor('#cc6666');
            },
            pointerout: () => {
                this.quitButton.setBackgroundColor('#aa4444');
            }
        };

        this.quitButton.on('pointerover', handlers.pointerover);
        this.quitButton.on('pointerout', handlers.pointerout);

        this.buttonEventHandlers.set(this.quitButton, handlers);
    }

    /**
     * Update the player indicator display
     */
    updatePlayerIndicator(currentPlayer: 'red' | 'blue'): void {
        // Update the sprite to match the current player
        if (currentPlayer === 'red') {
            this.currentPlayerSprite.setTexture('evil-sprite');
            this.currentPlayerSprite.play('evil-dot-pulse');
        } else {
            this.currentPlayerSprite.setTexture('good-sprite');
            this.currentPlayerSprite.play('good-dot-pulse');
        }
    }

    /**
     * Update the undo button state
     */
    updateUndoButton(canUndo: boolean): void {
        if (canUndo) {
            this.undoButton.setAlpha(1);
            this.undoButton.setInteractive();
        } else {
            this.undoButton.setAlpha(0.5);
            this.undoButton.removeInteractive();
        }
    }

    /**
     * Set the undo button click handler
     */
    setUndoButtonHandler(handler: () => void): void {
        this.undoButton.on('pointerdown', handler);

        // Add the pointerdown handler to the existing handlers for this button
        const existingHandlers = this.buttonEventHandlers.get(this.undoButton);
        if (existingHandlers) {
            existingHandlers.pointerdown = handler;
        }
    }

    /**
     * Set the quit button click handler
     */
    setQuitButtonHandler(handler: () => void): void {
        this.quitButton.on('pointerdown', handler);

        // Add the pointerdown handler to the existing handlers for this button
        const existingHandlers = this.buttonEventHandlers.get(this.quitButton);
        if (existingHandlers) {
            existingHandlers.pointerdown = handler;
        }
    }

    /**
     * Display the game over screen
     */
    showGameOverScreen(winner: string, onRestart: () => void): void {
        // Display responsive winner message
        const winnerColor = winner === 'Red' ? '#ff0000' : '#0000ff';
        const winnerFontSize = Math.min(48, this.scene.cameras.main.width / 15);
        this.scene.add.text(this.scene.cameras.main.width / 2, this.scene.cameras.main.height * 0.4, `${winner} Player Wins!`, {
            fontFamily: 'Arial Black', 
            fontSize: winnerFontSize, 
            color: winnerColor
        }).setOrigin(0.5);

        // Add responsive restart button
        const restartFontSize = Math.min(24, this.scene.cameras.main.width / 30);
        const restartButton = this.scene.add.text(this.scene.cameras.main.width / 2, this.scene.cameras.main.height * 0.55, 'Click to Restart', {
            fontFamily: 'Arial', 
            fontSize: restartFontSize, 
            color: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 15, y: 8 }
        }).setOrigin(0.5);

        restartButton.setInteractive();
        restartButton.on('pointerdown', onRestart);

        restartButton.on('pointerover', () => {
            restartButton.setBackgroundColor('#555555');
        });

        restartButton.on('pointerout', () => {
            restartButton.setBackgroundColor('#333333');
        });
    }

    /**
     * Disable the undo button (used during game over)
     */
    disableUndoButton(): void {
        this.undoButton.removeInteractive();
        this.undoButton.setAlpha(0.3);
    }

    /**
     * Update the AI difficulty display
     */
    updateAIDifficulty(difficulty: string): void {
        this.aiDifficultyText.setText(`AI: ${difficulty}`);
    }

    /**
     * Disable the quit button (used during game over)
     */
    updateLevelInfo(levelSetName: string, levelName: string): void {
        this.levelInfoText.setText(`Now playing ${levelSetName} on level ${levelName}`);
    }

    disableQuitButton(): void {
        this.quitButton.removeInteractive();
        this.quitButton.setAlpha(0.3);
    }

    /**
     * Clean up all event listeners from UI buttons
     * Call this during scene shutdown to prevent memory leaks
     */
    cleanup(): void {
        if (!this.buttonEventHandlers || this.buttonEventHandlers.size === 0) {
            console.log('[GameUIManager] No event listeners to clean up');
            return;
        }

        console.log(`[GameUIManager] Cleaning up ${this.buttonEventHandlers.size} button event listeners`);

        // Remove all event listeners that we added
        this.buttonEventHandlers.forEach((handlers, button) => {
            if (button && handlers) {
                if (handlers.pointerover) {
                    button.off('pointerover', handlers.pointerover);
                }
                if (handlers.pointerout) {
                    button.off('pointerout', handlers.pointerout);
                }
                if (handlers.pointerdown) {
                    button.off('pointerdown', handlers.pointerdown);
                }
            }
        });

        this.buttonEventHandlers.clear();

        // Note: We don't destroy buttons here - the scene will handle that
        // We just remove our event listeners to prevent memory leaks
    }
}
