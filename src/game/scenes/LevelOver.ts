import { GameObjects } from 'phaser';
import { EventBus } from '../EventBus';
import { LevelSetManager } from '../LevelSetManager';
import { BaseScene } from '../BaseScene';
import { Logger } from '../ErrorLogger';

export class LevelOver extends BaseScene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: GameObjects.Image;
    levelCompleteText: GameObjects.Text;
    winnerText: GameObjects.Text;
    levelInfoText: GameObjects.Text;
    nextLevelButton: GameObjects.Text;
    restartButton: GameObjects.Text;
    mainMenuButton: GameObjects.Text;

    private levelSetManager: LevelSetManager;
    private buttonEventHandlers: Map<GameObjects.Text, {
        pointerdown?: () => void,
        pointerover?: () => void,
        pointerout?: () => void
    }> = new Map();

    constructor ()
    {
        super('LevelOver');
    }

    create ()
    {
        Logger.debug('this.game.registry in LevelOver constructor:', this.game);
        this.levelSetManager = new LevelSetManager(this.game.registry);
        
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x222222);

        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        this.background = this.add.image(centerX, centerY, 'background');
        this.background.setAlpha(0.3);

        // Get winner and level info from registry
        const winner = this.game.registry.get('gameWinner') || 'Unknown';
        // const levelSetId = this.game.registry.get('currentLevelSetId');
        // const levelId = this.game.registry.get('currentLevelId');
        const currentLevelSet = this.levelSetManager.getCurrentLevelSet();
        const currentLevel = currentLevelSet.getCurrentLevel();

        // Level Complete title
        const titleFontSize = Math.min(48, this.cameras.main.width / 15);
        this.levelCompleteText = this.add.text(centerX, centerY * 0.3, 'Level Complete!', {
            fontFamily: 'Arial Black', 
            fontSize: titleFontSize, 
            color: '#44ff44',
            stroke: '#005500',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Winner announcement
        const winnerFontSize = Math.min(36, this.cameras.main.width / 20);
        const winnerColor = winner === 'Red' ? '#ff0000' : '#0000ff';
        this.winnerText = this.add.text(centerX, centerY * 0.45, `${winner} Player Wins!`, {
            fontFamily: 'Arial Black', 
            fontSize: winnerFontSize, 
            color: winnerColor,
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Level info
        const levelInfoFontSize = Math.min(24, this.cameras.main.width / 35);
        this.levelInfoText = this.add.text(centerX, centerY * 0.55, `Level: ${currentLevel.getName()}`, {
            fontFamily: 'Arial', 
            fontSize: levelInfoFontSize, 
            color: '#cccccc'
        }).setOrigin(0.5);

        // Buttons
        const buttonFontSize = Math.min(24, this.cameras.main.width / 30);
        
        // Next Level button (check if there's a next level)
        let hasNextLevel = currentLevel.next() !== null;

        if (hasNextLevel) {
            this.nextLevelButton = this.add.text(centerX, centerY * 0.7, 'Next Level', {
                fontFamily: 'Arial', 
                fontSize: buttonFontSize, 
                color: '#ffffff',
                backgroundColor: '#228822',
                padding: { x: 20, y: 10 }
            }).setOrigin(0.5);

            this.nextLevelButton.setInteractive();

            const nextLevelHandlers = {
                pointerdown: () => {
                    // Store level progression info to load next level
                    Logger.debug('LevelOver: Next Level button clicked');
                    Logger.debug('LevelOver: Current level info in registry:', {
                        levelSet: currentLevelSet.getId(),
                        level: currentLevel.getId()
                    });
                    this.game.registry.set('loadNextLevel', true);
                    Logger.debug('LevelOver: Set loadNextLevel flag to true, starting Game scene');
                    this.scene.start('Game');
                },
                pointerover: () => {
                    this.nextLevelButton.setBackgroundColor('#44aa44');
                },
                pointerout: () => {
                    this.nextLevelButton.setBackgroundColor('#228822');
                }
            };

            this.nextLevelButton.on('pointerdown', nextLevelHandlers.pointerdown);
            this.nextLevelButton.on('pointerover', nextLevelHandlers.pointerover);
            this.nextLevelButton.on('pointerout', nextLevelHandlers.pointerout);

            this.buttonEventHandlers.set(this.nextLevelButton, nextLevelHandlers);
        }

        // Restart Game button
        this.restartButton = this.add.text(centerX, centerY * (hasNextLevel ? 0.85 : 0.7), 'Restart Game', {
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
        this.mainMenuButton = this.add.text(centerX, centerY * (hasNextLevel ? 1.0 : 0.85), 'Main Menu', {
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
        Logger.debug('LevelOver: Starting shutdown cleanup');

        // Clean up button event listeners
        this.cleanupButtonListeners();

        // Clean up display objects
        this.safeDestroy(this.background);
        this.safeDestroy(this.levelCompleteText);
        this.safeDestroy(this.winnerText);
        this.safeDestroy(this.levelInfoText);
        this.safeDestroy(this.nextLevelButton);
        this.safeDestroy(this.restartButton);
        this.safeDestroy(this.mainMenuButton);

        // Call parent shutdown for base cleanup
        super.shutdown();

        Logger.debug('LevelOver: Shutdown cleanup completed');
    }

    /**
     * Clean up all button event listeners
     * Call this during scene shutdown to prevent memory leaks
     */
    private cleanupButtonListeners(): void {
        if (!this.buttonEventHandlers || this.buttonEventHandlers.size === 0) {
            Logger.debug('[LevelOver] No button event listeners to clean up');
            return;
        }

        Logger.debug(`[LevelOver] Cleaning up ${this.buttonEventHandlers.size} button event listeners`);

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
