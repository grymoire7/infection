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
        this.restartButton.on('pointerdown', () => {
            this.scene.start('Game');
        });

        this.restartButton.on('pointerover', () => {
            this.restartButton.setBackgroundColor('#555555');
        });

        this.restartButton.on('pointerout', () => {
            this.restartButton.setBackgroundColor('#333333');
        });

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
        this.mainMenuButton.on('pointerdown', () => {
            this.scene.start('MainMenu');
        });

        this.mainMenuButton.on('pointerover', () => {
            this.mainMenuButton.setBackgroundColor('#888888');
        });

        this.mainMenuButton.on('pointerout', () => {
            this.mainMenuButton.setBackgroundColor('#666666');
        });

        EventBus.emit('current-scene-ready', this);
    }

    changeScene ()
    {
        this.scene.start('MainMenu');
    }

    public shutdown(): void {
        console.log('GameOver: Starting shutdown cleanup');

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
}
