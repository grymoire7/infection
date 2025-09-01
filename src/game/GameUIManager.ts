export class GameUIManager {
    private scene: Phaser.Scene;
    private currentPlayerText: Phaser.GameObjects.Text;
    private levelInfoText: Phaser.GameObjects.Text;
    private undoButton: Phaser.GameObjects.Text;
    private quitButton: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * Create all UI elements for the game
     */
    createUI(): { currentPlayerText: Phaser.GameObjects.Text, levelInfoText: Phaser.GameObjects.Text, undoButton: Phaser.GameObjects.Text, quitButton: Phaser.GameObjects.Text } {
        this.createTitle();
        this.createInstructions();
        this.createPlayerIndicator();
        this.createLevelInfo();
        this.createUndoButton();
        this.createQuitButton();

        return {
            currentPlayerText: this.currentPlayerText,
            levelInfoText: this.levelInfoText,
            undoButton: this.undoButton,
            quitButton: this.quitButton
        };
    }

    private createTitle(): void {
        const titleFontSize = Math.min(32, this.scene.cameras.main.width / 25);
        this.scene.add.text(this.scene.cameras.main.width / 2, 30, 'Dots Infection', {
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

    private createPlayerIndicator(): void {
        const indicatorFontSize = Math.min(24, this.scene.cameras.main.width / 35);
        this.currentPlayerText = this.scene.add.text(this.scene.cameras.main.width / 2, 70, '', {
            fontFamily: 'Arial Black', 
            fontSize: indicatorFontSize, 
            color: '#ffffff'
        }).setOrigin(0.5);
    }

    private createLevelInfo(): void {
        const levelInfoFontSize = Math.min(18, this.scene.cameras.main.width / 45);
        this.levelInfoText = this.scene.add.text(this.scene.cameras.main.width / 2, 100, '', {
            fontFamily: 'Arial', 
            fontSize: levelInfoFontSize, 
            color: '#ffffff'
        }).setOrigin(0.5);
    }

    private createUndoButton(): void {
        const buttonFontSize = Math.min(20, this.scene.cameras.main.width / 40);
        const buttonX = Math.min(50, this.scene.cameras.main.width * 0.05);
        const buttonY = Math.min(50, this.scene.cameras.main.height * 0.08);
        
        this.undoButton = this.scene.add.text(buttonX, buttonY, 'Undo', {
            fontFamily: 'Arial', 
            fontSize: buttonFontSize, 
            color: '#ffffff',
            backgroundColor: '#666666',
            padding: { x: 12, y: 6 }
        }).setOrigin(0);

        this.undoButton.setInteractive();
        
        this.undoButton.on('pointerover', () => {
            this.undoButton.setBackgroundColor('#888888');
        });

        this.undoButton.on('pointerout', () => {
            this.undoButton.setBackgroundColor('#666666');
        });
    }

    private createQuitButton(): void {
        const buttonFontSize = Math.min(20, this.scene.cameras.main.width / 40);
        const buttonX = Math.min(50, this.scene.cameras.main.width * 0.05);
        const buttonY = Math.min(100, this.scene.cameras.main.height * 0.15);
        
        this.quitButton = this.scene.add.text(buttonX, buttonY, 'Quit', {
            fontFamily: 'Arial', 
            fontSize: buttonFontSize, 
            color: '#ffffff',
            backgroundColor: '#aa4444',
            padding: { x: 12, y: 6 }
        }).setOrigin(0);

        this.quitButton.setInteractive();
        
        this.quitButton.on('pointerover', () => {
            this.quitButton.setBackgroundColor('#cc6666');
        });

        this.quitButton.on('pointerout', () => {
            this.quitButton.setBackgroundColor('#aa4444');
        });
    }

    /**
     * Update the player indicator display
     */
    updatePlayerIndicator(currentPlayer: 'red' | 'blue'): void {
        const playerColor = currentPlayer === 'red' ? '#ff0000' : '#0000ff';
        const playerName = currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1);

        this.currentPlayerText.setText(`Current Player: ${playerName}`);
        this.currentPlayerText.setColor(playerColor);
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
    }

    /**
     * Set the quit button click handler
     */
    setQuitButtonHandler(handler: () => void): void {
        this.quitButton.on('pointerdown', handler);
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
     * Disable the quit button (used during game over)
     */
    updateLevelInfo(levelSetName: string, levelName: string): void {
        this.levelInfoText.setText(`Now playing ${levelSetName} on level ${levelName}`);
    }

    disableQuitButton(): void {
        this.quitButton.removeInteractive();
        this.quitButton.setAlpha(0.3);
    }
}
