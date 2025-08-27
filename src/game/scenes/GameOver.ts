import { GameObjects, Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class GameOver extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: GameObjects.Image;
    gameOverText: GameObjects.Text;
    winnerText: GameObjects.Text;
    restartButton: GameObjects.Text;
    mainMenuButton: GameObjects.Text;

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

        // Game Over title
        const titleFontSize = Math.min(48, this.cameras.main.width / 15);
        this.gameOverText = this.add.text(centerX, centerY * 0.4, 'Game Over', {
            fontFamily: 'Arial Black', 
            fontSize: titleFontSize, 
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Winner announcement
        const winnerFontSize = Math.min(36, this.cameras.main.width / 20);
        const winnerColor = winner === 'Red' ? '#ff0000' : '#0000ff';
        this.winnerText = this.add.text(centerX, centerY * 0.6, `${winner} Player Wins!`, {
            fontFamily: 'Arial Black', 
            fontSize: winnerFontSize, 
            color: winnerColor,
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Restart button
        const buttonFontSize = Math.min(24, this.cameras.main.width / 30);
        this.restartButton = this.add.text(centerX, centerY * 0.8, 'Play Again', {
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
        this.mainMenuButton = this.add.text(centerX, centerY * 0.95, 'Main Menu', {
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
