import { GameObjects } from 'phaser';
import { EventBus } from '../EventBus';
import { LevelSetManager } from '../LevelSetManager';
import { BaseScene } from '../BaseScene';

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

    constructor ()
    {
        super('LevelOver');
    }

    create ()
    {
        console.log('this.game.registry in LevelOver constructor:', this.game);
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
            this.nextLevelButton.on('pointerdown', () => {
                // Store level progression info to load next level
                console.log('LevelOver: Next Level button clicked');
                console.log('LevelOver: Current level info in registry:', {
                    levelSet: currentLevelSet.getId(),
                    level: currentLevel.getId()
                });
                this.game.registry.set('loadNextLevel', true);
                console.log('LevelOver: Set loadNextLevel flag to true, starting Game scene');
                this.scene.start('Game');
            });

            this.nextLevelButton.on('pointerover', () => {
                this.nextLevelButton.setBackgroundColor('#44aa44');
            });

            this.nextLevelButton.on('pointerout', () => {
                this.nextLevelButton.setBackgroundColor('#228822');
            });
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
        this.mainMenuButton = this.add.text(centerX, centerY * (hasNextLevel ? 1.0 : 0.85), 'Main Menu', {
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
        console.log('LevelOver: Starting shutdown cleanup');

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

        console.log('LevelOver: Shutdown cleanup completed');
    }
}
