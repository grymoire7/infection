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
    gameState: { dotCount: number, owner: string | null, capacity: number }[][];
    currentPlayer: 'red' | 'blue' = 'red';
    currentPlayerText: Phaser.GameObjects.Text;

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
        this.createPlayerIndicator();

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
                
                // Calculate capacity based on adjacent cells
                const capacity = this.calculateCellCapacity(row, col);
                
                // Initialize game state for this cell
                this.gameState[row][col] = { dotCount: 0, owner: null, capacity: capacity };
                
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

    createPlayerIndicator()
    {
        // Add current player indicator
        this.currentPlayerText = this.add.text(512, 100, '', {
            fontFamily: 'Arial Black', 
            fontSize: 24, 
            color: '#ffffff'
        }).setOrigin(0.5);
        
        this.updatePlayerIndicator();
    }

    updatePlayerIndicator()
    {
        const playerColor = this.currentPlayer === 'red' ? '#ff0000' : '#0000ff';
        const playerName = this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1);
        
        this.currentPlayerText.setText(`Current Player: ${playerName}`);
        this.currentPlayerText.setColor(playerColor);
    }

    calculateCellCapacity(row: number, col: number): number
    {
        let capacity = 0;
        
        // Check all four orthogonal directions
        const directions = [
            [-1, 0], // up
            [1, 0],  // down
            [0, -1], // left
            [0, 1]   // right
        ];
        
        for (const [deltaRow, deltaCol] of directions) {
            const newRow = row + deltaRow;
            const newCol = col + deltaCol;
            
            // Check if the adjacent cell is within grid bounds
            if (newRow >= 0 && newRow < this.gridSize && 
                newCol >= 0 && newCol < this.gridSize) {
                capacity++;
            }
        }
        
        return capacity;
    }

    placeDot(row: number, col: number)
    {
        // Only allow placing dots in empty cells for now
        if (this.gameState[row][col].dotCount === 0) {
            const x = this.gridStartX + col * this.cellSize;
            const y = this.gridStartY + row * this.cellSize;
            
            // Create dot with current player's color
            const color = this.currentPlayer === 'red' ? 0xff0000 : 0x0000ff;
            const dot = this.add.circle(x, y, 15, color);
            dot.setStrokeStyle(2, 0x000000);
            
            // Update game state
            this.gameState[row][col].dotCount = 1;
            this.gameState[row][col].owner = this.currentPlayer;
            this.dots[row][col] = dot;
            
            console.log(`${this.currentPlayer} placed dot at row ${row}, col ${col} (capacity: ${this.gameState[row][col].capacity})`);
            
            // Switch to the other player
            this.currentPlayer = this.currentPlayer === 'red' ? 'blue' : 'red';
            this.updatePlayerIndicator();
        } else {
            console.log(`Cell at row ${row}, col ${col} already has a dot`);
        }
    }

    changeScene ()
    {
        this.scene.start('GameOver');
    }
}
