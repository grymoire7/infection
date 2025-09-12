import { GameObjects, Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { LEVEL_SETS, getLevelById } from '../LevelDefinitions';

export class LevelOver extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: GameObjects.Image;
    levelCompleteText: GameObjects.Text;
    winnerText: GameObjects.Text;
    levelInfoText: GameObjects.Text;
    nextLevelButton: GameObjects.Text;
    restartButton: GameObjects.Text;
    mainMenuButton: GameObjects.Text;

    constructor ()
    {
        super('LevelOver');
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x222222);

        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        this.background = this.add.image(centerX, centerY, 'background');
        this.background.setAlpha(0.3);

        // Get winner and level info from registry
        const winner = this.game.registry.get('gameWinner') || 'Unknown';
        const levelSetId = this.game.registry.get('currentLevelSetId');
        const levelId = this.game.registry.get('currentLevelId');

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
        if (levelSetId && levelId) {
            const level = getLevelById(levelId);
            if (level) {
                const levelInfoFontSize = Math.min(24, this.cameras.main.width / 35);
                this.levelInfoText = this.add.text(centerX, centerY * 0.55, `Level: ${level.name}`, {
                    fontFamily: 'Arial', 
                    fontSize: levelInfoFontSize, 
                    color: '#cccccc'
                }).setOrigin(0.5);
            }
        }

        // Buttons
        const buttonFontSize = Math.min(24, this.cameras.main.width / 30);
        
        // Next Level button (check if there's a next level)
        let hasNextLevel = false;
        if (levelSetId && levelId) {
            const levelSet = LEVEL_SETS.find(set => set.id === levelSetId);
            if (levelSet) {
                const currentIndex = levelSet.levelEntries.findIndex(entry => entry.levelId === levelId);
                if (currentIndex !== -1 && currentIndex + 1 < levelSet.levelEntries.length) {
                    hasNextLevel = true;
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
                        this.game.registry.set('loadNextLevel', true);
                        this.scene.start('Game');
                    });

                    this.nextLevelButton.on('pointerover', () => {
                        this.nextLevelButton.setBackgroundColor('#44aa44');
                    });

                    this.nextLevelButton.on('pointerout', () => {
                        this.nextLevelButton.setBackgroundColor('#228822');
                    });
                }
            }
        }

        // Restart Level button
        this.restartButton = this.add.text(centerX, centerY * (hasNextLevel ? 0.8 : 0.7), 'Restart Level', {
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
        this.mainMenuButton = this.add.text(centerX, centerY * (hasNextLevel ? 0.9 : 0.8), 'Main Menu', {
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
}
