import { GameObjects, Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { LEVEL_SETS, getLevelById } from '../LevelDefinitions';

export class GameOver extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: GameObjects.Image;
    gameOverText: GameObjects.Text;
    winnerText: GameObjects.Text;
    restartButton: GameObjects.Text;
    mainMenuButton: GameObjects.Text;
    nextLevelButton: GameObjects.Text;

    constructor ()
    {
        super('GameOver');
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x222222);

        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        this.background = this.add.image(centerX, centerY, 'background');
        this.background.setAlpha(0.3);

        // Get winner from registry
        const winner = this.game.registry.get('gameWinner') || 'Unknown';
        const levelSetId = this.game.registry.get('currentLevelSetId');
        const levelId = this.game.registry.get('currentLevelId');

        // Game Over title
        const titleFontSize = Math.min(48, this.cameras.main.width / 15);
        this.gameOverText = this.add.text(centerX, centerY * 0.3, 'Game Over', {
            fontFamily: 'Arial Black', 
            fontSize: titleFontSize, 
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Winner announcement or abandonment message
        const winnerFontSize = Math.min(36, this.cameras.main.width / 20);
        let winnerColor = '#ffffff';
        let winnerMessage = '';

        if (winner === 'Abandoned') {
            winnerColor = '#ffaa00';
            winnerMessage = 'Game Abandoned';
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

        // Level completion status
        if (winner !== 'Abandoned' && levelSetId && levelId) {
            const level = getLevelById(levelId);
            if (level) {
                const levelInfoFontSize = Math.min(24, this.cameras.main.width / 35);
                this.add.text(centerX, centerY * 0.55, `Level: ${level.name}`, {
                    fontFamily: 'Arial', 
                    fontSize: levelInfoFontSize, 
                    color: '#cccccc'
                }).setOrigin(0.5);
            }
        }

        // Buttons
        const buttonFontSize = Math.min(24, this.cameras.main.width / 30);
        
        // Next Level button (only show if not abandoned and there's a next level)
        if (winner !== 'Abandoned' && levelSetId && levelId) {
            const levelSet = LEVEL_SETS.find(set => set.id === levelSetId);
            if (levelSet) {
                const currentIndex = levelSet.levelEntries.findIndex(entry => entry.levelId === levelId);
                if (currentIndex !== -1 && currentIndex + 1 < levelSet.levelEntries.length) {
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

        // Restart button
        this.restartButton = this.add.text(centerX, centerY * (this.nextLevelButton ? 0.8 : 0.7), 'Play Again', {
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
        this.mainMenuButton = this.add.text(centerX, centerY * (this.nextLevelButton ? 0.9 : 0.8), 'Main Menu', {
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
