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
    dots: Phaser.GameObjects.Circle[][];
    gameState: { dotCount: number, owner: string | null }[][];

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
        this.dots = [];
        this.gameState = [];
        
        for (let row = 0; row < this.gridSize; row++) {
            this.grid[row] = [];
            this.dots[row] = [];
            this.gameState[row] = [];
            
            for (let col = 0; col < this.gridSize; col++) {
                const x = this.gridStartX + col * this.cellSize;
                const y = this.gridStartY + row * this.cellSize;
                
                // Initialize game state for this cell
                this.gameState[row][col] = { dotCount: 0, owner: null };
                
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
                
                // Add click handler for dot placement
                cell.on('pointerdown', () => {
                    this.placeDot(row, col);
                });
                
                this.grid[row][col] = cell;
                this.dots[row][col] = null; // No dot initially
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

    placeDot(row: number, col: number)
    {
        // Only allow placing dots in empty cells for now
        if (this.gameState[row][col].dotCount === 0) {
            const x = this.gridStartX + col * this.cellSize;
            const y = this.gridStartY + row * this.cellSize;
            
            // Create a red dot (we'll add player turns later)
            const dot = this.add.circle(x, y, 15, 0xff0000);
            dot.setStrokeStyle(2, 0x000000);
            
            // Update game state
            this.gameState[row][col].dotCount = 1;
            this.gameState[row][col].owner = 'red';
            this.dots[row][col] = dot;
            
            console.log(`Placed dot at row ${row}, col ${col}`);
        } else {
            console.log(`Cell at row ${row}, col ${col} already has a dot`);
        }
    }

    changeScene ()
    {
        this.scene.start('GameOver');
    }
}
