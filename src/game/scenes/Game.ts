import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gridSize: number = 5;
    cellSize: number = 80;
    gridStartX: number = 200;
    gridStartY: number = 150;
    grid: Phaser.GameObjects.Rectangle[][];

    constructor ()
    {
        super('Game');
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x222222);

        this.background = this.add.image(512, 384, 'background');
        this.background.setAlpha(0.3);

        this.createGrid();

        EventBus.emit('current-scene-ready', this);
    }

    createGrid()
    {
        this.grid = [];
        
        for (let row = 0; row < this.gridSize; row++) {
            this.grid[row] = [];
            for (let col = 0; col < this.gridSize; col++) {
                const x = this.gridStartX + col * this.cellSize;
                const y = this.gridStartY + row * this.cellSize;
                
                // Create cell background
                const cell = this.add.rectangle(x, y, this.cellSize - 2, this.cellSize - 2, 0x444444);
                cell.setStrokeStyle(2, 0x666666);
                cell.setInteractive();
                
                // Add hover effects
                cell.on('pointerover', () => {
                    cell.setFillStyle(0x555555);
                    cell.setStrokeStyle(2, 0x888888);
                });
                
                cell.on('pointerout', () => {
                    cell.setFillStyle(0x444444);
                    cell.setStrokeStyle(2, 0x666666);
                });
                
                // Add click handler for future use
                cell.on('pointerdown', () => {
                    console.log(`Clicked cell at row ${row}, col ${col}`);
                });
                
                this.grid[row][col] = cell;
            }
        }
        
        // Add title
        this.add.text(512, 50, 'Dots Game', {
            fontFamily: 'Arial Black', 
            fontSize: 32, 
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // Add instructions
        this.add.text(512, 600, 'Click on a cell to place a dot', {
            fontFamily: 'Arial', 
            fontSize: 18, 
            color: '#cccccc'
        }).setOrigin(0.5);
    }

    changeScene ()
    {
        this.scene.start('GameOver');
    }
}
