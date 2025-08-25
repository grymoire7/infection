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
    dots: Phaser.GameObjects.Circle[][][]; // Now 3D array: [row][col][dotIndex]
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
                    const cellState = this.gameState[row][col];
                    if (cellState.owner === 'red') {
                        cell.setFillStyle(0x775555);
                    } else if (cellState.owner === 'blue') {
                        cell.setFillStyle(0x555577);
                    } else {
                        cell.setFillStyle(0x555555);
                    }
                    cell.setStrokeStyle(2, 0x888888);
                });
                
                cell.on('pointerout', () => {
                    this.updateCellOwnership(row, col);
                });
                
                // Add click handler for dot placement
                cell.on('pointerdown', () => {
                    this.placeDot(row, col);
                });
                
                this.grid[row][col] = cell;
                this.dots[row][col] = []; // Empty array of dots initially
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
        const cellState = this.gameState[row][col];
        
        // Can only place dots in empty cells or cells owned by current player
        if (cellState.dotCount === 0 || cellState.owner === this.currentPlayer) {
            // Update game state first
            cellState.dotCount++;
            cellState.owner = this.currentPlayer;
            
            // Create new dot with current player's color
            const color = this.currentPlayer === 'red' ? 0xff0000 : 0x0000ff;
            const dot = this.add.circle(0, 0, 12, color); // Position will be set by arrangeDots
            dot.setStrokeStyle(2, 0x000000);
            
            // Add dot to the cell's dot array
            this.dots[row][col].push(dot);
            
            // Arrange all dots in this cell visually
            this.arrangeDots(row, col);
            
            // Update cell ownership visual
            this.updateCellOwnership(row, col);
            
            console.log(`${this.currentPlayer} placed dot at row ${row}, col ${col} (${cellState.dotCount}/${cellState.capacity})`);
            
            // Switch to the other player
            this.currentPlayer = this.currentPlayer === 'red' ? 'blue' : 'red';
            this.updatePlayerIndicator();
        } else {
            console.log(`Cell at row ${row}, col ${col} is owned by the other player`);
        }
    }

    arrangeDots(row: number, col: number)
    {
        const cellDots = this.dots[row][col];
        const dotCount = cellDots.length;
        
        if (dotCount === 0) return;
        
        const cellCenterX = this.gridStartX + col * this.cellSize;
        const cellCenterY = this.gridStartY + row * this.cellSize;
        
        // Only render up to 6 dots visually, even if more exist
        const visualDotCount = Math.min(dotCount, 6);
        
        if (visualDotCount === 1) {
            // Single dot in center
            cellDots[0].setPosition(cellCenterX, cellCenterY);
        } else if (visualDotCount === 2) {
            // Two dots side by side
            cellDots[0].setPosition(cellCenterX - 15, cellCenterY);
            cellDots[1].setPosition(cellCenterX + 15, cellCenterY);
        } else if (visualDotCount === 3) {
            // Three dots in triangle formation
            cellDots[0].setPosition(cellCenterX, cellCenterY - 12);
            cellDots[1].setPosition(cellCenterX - 12, cellCenterY + 8);
            cellDots[2].setPosition(cellCenterX + 12, cellCenterY + 8);
        } else if (visualDotCount === 4) {
            // Four dots in square formation
            cellDots[0].setPosition(cellCenterX - 12, cellCenterY - 12);
            cellDots[1].setPosition(cellCenterX + 12, cellCenterY - 12);
            cellDots[2].setPosition(cellCenterX - 12, cellCenterY + 12);
            cellDots[3].setPosition(cellCenterX + 12, cellCenterY + 12);
        } else if (visualDotCount === 5) {
            // Five dots: one in center, four around it
            cellDots[0].setPosition(cellCenterX, cellCenterY);
            cellDots[1].setPosition(cellCenterX - 18, cellCenterY - 18);
            cellDots[2].setPosition(cellCenterX + 18, cellCenterY - 18);
            cellDots[3].setPosition(cellCenterX - 18, cellCenterY + 18);
            cellDots[4].setPosition(cellCenterX + 18, cellCenterY + 18);
        } else if (visualDotCount === 6) {
            // Six dots: two rows of three
            cellDots[0].setPosition(cellCenterX - 18, cellCenterY - 12);
            cellDots[1].setPosition(cellCenterX, cellCenterY - 12);
            cellDots[2].setPosition(cellCenterX + 18, cellCenterY - 12);
            cellDots[3].setPosition(cellCenterX - 18, cellCenterY + 12);
            cellDots[4].setPosition(cellCenterX, cellCenterY + 12);
            cellDots[5].setPosition(cellCenterX + 18, cellCenterY + 12);
        }
        
        // Hide any dots beyond the 6th one (they still exist in the array for game logic)
        for (let i = 6; i < cellDots.length; i++) {
            cellDots[i].setVisible(false);
        }
    }

    updateCellOwnership(row: number, col: number)
    {
        const cellState = this.gameState[row][col];
        const cell = this.grid[row][col];
        
        if (cellState.owner === 'red') {
            // Light red background for red-owned cells
            cell.setFillStyle(0x664444);
            cell.setStrokeStyle(2, 0x888888);
        } else if (cellState.owner === 'blue') {
            // Light blue background for blue-owned cells
            cell.setFillStyle(0x444466);
            cell.setStrokeStyle(2, 0x888888);
        } else {
            // Default gray for unowned cells
            cell.setFillStyle(0x444444);
            cell.setStrokeStyle(2, 0x666666);
        }
    }

    changeScene ()
    {
        this.scene.start('GameOver');
    }
}
