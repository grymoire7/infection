import { GameObjects } from 'phaser';
import { EventBus } from '../EventBus';
import { LevelSetManager } from '../LevelSetManager';
import { BaseScene } from '../BaseScene';

export class GameOver extends BaseScene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: GameObjects.Image;
    gameOverText: GameObjects.Text;
    winnerText: GameObjects.Text;
    restartButton: GameObjects.Text;
    mainMenuButton: GameObjects.Text;
    nextLevelButton: GameObjects.Text;

    private levelSetManager: LevelSetManager;
    private buttonEventHandlers: Map<GameObjects.Text, {
        pointerdown?: () => void,
        pointerover?: () => void,
        pointerout?: () => void
    }> = new Map();

    constructor ()
    {
        super('GameOver');
    }

    create ()
    {
        this.levelSetManager = new LevelSetManager(this.game.registry);
        
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x222222);

        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        this.background = this.add.image(centerX, centerY, 'background');
        this.background.setAlpha(0.3);

        // Get winner from registry
        const winner = this.game.registry.get('gameWinner') || 'Unknown';
        const currentLevelSet = this.levelSetManager.getCurrentLevelSet();
        const currentLevel = currentLevelSet.getCurrentLevel();

        // Determine the type of game over
        const isAbandoned = winner === 'Abandoned';
        const isLastLevel = currentLevelSet && currentLevel && currentLevelSet.last() === currentLevel;
        const isLevelSetComplete = !isAbandoned && isLastLevel;
        
        // Game Over title
        const titleFontSize = Math.min(48, this.cameras.main.width / 15);
        let titleText = 'Game Over';
        let titleColor = '#ffffff';
        
        if (isLevelSetComplete) {
            titleText = 'Level Set Complete!';
            titleColor = '#44ff44';
        } else if (isAbandoned) {
            titleText = 'Game Abandoned';
            titleColor = '#ffaa00';
        }

        this.gameOverText = this.add.text(centerX, centerY * 0.3, titleText, {
            fontFamily: 'Arial Black', 
            fontSize: titleFontSize, 
            color: titleColor,
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Winner announcement or status message
        const winnerFontSize = Math.min(36, this.cameras.main.width / 20);
        let winnerColor = '#ffffff';
        let winnerMessage = '';

        if (isAbandoned) {
            winnerColor = '#ffaa00';
            winnerMessage = 'Better luck next time!';
        } else if (isLevelSetComplete) {
            winnerColor = '#44ff44';
            winnerMessage = 'Congratulations!';
        } else {
            winnerColor = winner === 'Red' ? '#ff0000' : '#0000ff';
            winnerMessage = `${winner} Player Wins!`;
        }

        this.winnerText = this.add.text(centerX, centerY * 0.45, winnerMessage, {
            fontFamily: 'Arial Black', 
            fontSize: winnerFontSize, 
            color: winnerColor,
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Level set completion status
        if (isLevelSetComplete) {
            const levelInfoFontSize = Math.min(24, this.cameras.main.width / 35);
            this.add.text(centerX, centerY * 0.55, `Completed: ${currentLevelSet.getName()}`, {
                fontFamily: 'Arial', 
                fontSize: levelInfoFontSize, 
                color: '#cccccc'
            }).setOrigin(0.5);
        }

        // Buttons
        const buttonFontSize = Math.min(24, this.cameras.main.width / 30);

        // Play Again button (for abandoned games or level set completion)
        let buttonY = centerY * 0.7;
        this.restartButton = this.add.text(centerX, buttonY, 'Restart Game', {
            fontFamily: 'Arial', 
            fontSize: buttonFontSize, 
            color: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5);

        this.restartButton.setInteractive();

        const restartHandlers = {
            pointerdown: () => {
                this.scene.start('Game');
            },
            pointerover: () => {
                this.restartButton.setBackgroundColor('#555555');
            },
            pointerout: () => {
                this.restartButton.setBackgroundColor('#333333');
            }
        };

        this.restartButton.on('pointerdown', restartHandlers.pointerdown);
        this.restartButton.on('pointerover', restartHandlers.pointerover);
        this.restartButton.on('pointerout', restartHandlers.pointerout);

        this.buttonEventHandlers.set(this.restartButton, restartHandlers);

        // Main Menu button
        buttonY += centerY * 0.15;
        this.mainMenuButton = this.add.text(centerX, buttonY, 'Main Menu', {
            fontFamily: 'Arial', 
            fontSize: buttonFontSize, 
            color: '#ffffff',
            backgroundColor: '#666666',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5);

        this.mainMenuButton.setInteractive();

        const mainMenuHandlers = {
            pointerdown: () => {
                this.scene.start('MainMenu');
            },
            pointerover: () => {
                this.mainMenuButton.setBackgroundColor('#888888');
            },
            pointerout: () => {
                this.mainMenuButton.setBackgroundColor('#666666');
            }
        };

        this.mainMenuButton.on('pointerdown', mainMenuHandlers.pointerdown);
        this.mainMenuButton.on('pointerover', mainMenuHandlers.pointerover);
        this.mainMenuButton.on('pointerout', mainMenuHandlers.pointerout);

        this.buttonEventHandlers.set(this.mainMenuButton, mainMenuHandlers);

        EventBus.emit('current-scene-ready', this);
    }

    changeScene ()
    {
        this.scene.start('MainMenu');
    }

    public shutdown(): void {
        console.log('GameOver: Starting shutdown cleanup');

        // Clean up button event listeners
        this.cleanupButtonListeners();

        // Clean up display objects
        this.safeDestroy(this.background);
        this.safeDestroy(this.gameOverText);
        this.safeDestroy(this.winnerText);
        this.safeDestroy(this.restartButton);
        this.safeDestroy(this.mainMenuButton);
        this.safeDestroy(this.nextLevelButton);

        // Call parent shutdown for base cleanup
        super.shutdown();

        console.log('GameOver: Shutdown cleanup completed');
    }

    /**
     * Clean up all button event listeners
     * Call this during scene shutdown to prevent memory leaks
     */
    private cleanupButtonListeners(): void {
        if (!this.buttonEventHandlers || this.buttonEventHandlers.size === 0) {
            console.log('[GameOver] No button event listeners to clean up');
            return;
        }

        console.log(`[GameOver] Cleaning up ${this.buttonEventHandlers.size} button event listeners`);

        // Remove all event listeners that we added
        this.buttonEventHandlers.forEach((handlers, button) => {
            if (button && handlers) {
                if (handlers.pointerdown) {
                    button.off('pointerdown', handlers.pointerdown);
                }
                if (handlers.pointerover) {
                    button.off('pointerover', handlers.pointerover);
                }
                if (handlers.pointerout) {
                    button.off('pointerout', handlers.pointerout);
                }
            }
        });

        this.buttonEventHandlers.clear();

        // Note: We don't destroy buttons here - that's handled by safeDestroy() calls
        // We just remove our event listeners to prevent memory leaks and ghost interactions
    }
}
