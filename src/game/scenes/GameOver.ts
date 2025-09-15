import { GameObjects, Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { LEVEL_SETS } from '../LevelDefinitions';

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

        // Determine the type of game over
        const isAbandoned = winner === 'Abandoned';
        const isLevelSetComplete = !isAbandoned && levelSetId && levelId && this.isLevelSetComplete(levelSetId, levelId);

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
        if (isLevelSetComplete && levelSetId) {
            const levelSet = LEVEL_SETS.find(set => set.id === levelSetId);
            if (levelSet) {
                const levelInfoFontSize = Math.min(24, this.cameras.main.width / 35);
                this.add.text(centerX, centerY * 0.55, `Completed: ${levelSet.name}`, {
                    fontFamily: 'Arial', 
                    fontSize: levelInfoFontSize, 
                    color: '#cccccc'
                }).setOrigin(0.5);
            }
        }

        // Buttons
        const buttonFontSize = Math.min(24, this.cameras.main.width / 30);

        // Play Again button (for abandoned games or level set completion)
        let buttonY = centerY * 0.7;
        this.restartButton = this.add.text(centerX, buttonY, isAbandoned ? 'Try Again' : 'Play Again', {
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
        buttonY += centerY * 0.1;
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

    private isLevelSetComplete(levelSetId: string, currentLevelId: string): boolean {
        const levelSet = LEVEL_SETS.find(set => set.id === levelSetId);
        if (!levelSet) return false;
        
        const currentIndex = levelSet.levelEntries.findIndex(entry => entry.levelId === currentLevelId);
        // Level set is complete if this is the last level
        return currentIndex !== -1 && currentIndex === levelSet.levelEntries.length - 1;
    }

    changeScene ()
    {
        this.scene.start('MainMenu');
    }
}
