import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { ComputerPlayer } from '../ComputerPlayer';

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gridSize: number = 5;
    cellSize: number = 80;
    gridStartX: number;
    gridStartY: number;
    grid: Phaser.GameObjects.Rectangle[][];
    dots: Phaser.GameObjects.Circle[][][]; // Now 3D array: [row][col][dotIndex]
    gameState: { dotCount: number, owner: string | null, capacity: number }[][];
    currentPlayer: 'red' | 'blue' = 'red';
    humanPlayer: 'red' | 'blue' = 'red';
    currentPlayerText: Phaser.GameObjects.Text;
    moveHistory: { gameState: any[][], currentPlayer: 'red' | 'blue' }[] = [];
    undoButton: Phaser.GameObjects.Text;
    computerPlayer: ComputerPlayer | null = null;

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

        // Initialize player colors and turn order from settings
        this.initializeGameSettings();

        this.createGrid();

        // Load saved game state if it exists, after grid is created
        this.loadGameState();
        
        // Recreate visual elements if game state was loaded
        if (this.game.registry.get('gameState')) {
            this.recreateAllVisualDots();
            this.updateAllCellOwnership();
        }
        
        this.createPlayerIndicator();
        this.createUndoButton();

        EventBus.emit('current-scene-ready', this);
    }

    createGrid()
    {
        // Calculate responsive cell size based on screen dimensions
        const screenWidth = this.cameras.main.width;
        const screenHeight = this.cameras.main.height;
        
        // Reserve space for UI elements (title, player indicator, instructions)
        const availableWidth = screenWidth * 0.9; // 90% of screen width
        const availableHeight = screenHeight * 0.7; // 70% of screen height (leaving room for UI)
        
        // Calculate cell size that fits within available space
        const maxCellSizeByWidth = Math.floor(availableWidth / this.gridSize);
        const maxCellSizeByHeight = Math.floor(availableHeight / this.gridSize);
        this.cellSize = Math.min(maxCellSizeByWidth, maxCellSizeByHeight, 80); // Cap at 80px max
        
        // Ensure minimum cell size for playability
        this.cellSize = Math.max(this.cellSize, 40);
        
        // Calculate centered grid position
        const totalGridWidth = this.gridSize * this.cellSize;
        const totalGridHeight = this.gridSize * this.cellSize;
        this.gridStartX = (screenWidth - totalGridWidth) / 2 + this.cellSize / 2;
        this.gridStartY = (screenHeight - totalGridHeight) / 2 + this.cellSize / 2 + 60; // Offset for title

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

                // Initialize game state for this cell (only if not already loaded)
                if (!this.gameState[row]) {
                    this.gameState[row] = [];
                }
                if (!this.gameState[row][col]) {
                    this.gameState[row][col] = { dotCount: 0, owner: null, capacity: capacity };
                }

                // Create cell background
                const cell = this.add.rectangle(x, y, this.cellSize - 2, this.cellSize - 2, 0x444444);
                cell.setStrokeStyle(2, 0x666666);
                cell.setInteractive();

                // Add hover effects
                cell.on('pointerover', () => {
                    const cellState = this.gameState[row][col];
                    if (cellState.owner === 'red') {
                        cell.setFillStyle(0x885555);
                    } else if (cellState.owner === 'blue') {
                        cell.setFillStyle(0x555588);
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

        // Add responsive title
        const titleFontSize = Math.min(32, this.cameras.main.width / 25);
        this.add.text(this.cameras.main.width / 2, 30, 'Dots Game', {
            fontFamily: 'Arial Black', 
            fontSize: titleFontSize, 
            color: '#ffffff'
        }).setOrigin(0.5);

        // Add responsive instructions
        const instructionFontSize = Math.min(18, this.cameras.main.width / 45);
        const instructionY = this.cameras.main.height - 40;
        this.add.text(this.cameras.main.width / 2, instructionY, 'Click on a cell to place a dot', {
            fontFamily: 'Arial', 
            fontSize: instructionFontSize, 
            color: '#cccccc'
        }).setOrigin(0.5);
    }

    createPlayerIndicator()
    {
        // Add responsive current player indicator
        const indicatorFontSize = Math.min(24, this.cameras.main.width / 35);
        this.currentPlayerText = this.add.text(this.cameras.main.width / 2, 70, '', {
            fontFamily: 'Arial Black', 
            fontSize: indicatorFontSize, 
            color: '#ffffff'
        }).setOrigin(0.5);

        this.updatePlayerIndicator();
    }

    createUndoButton()
    {
        // Position undo button responsively
        const buttonFontSize = Math.min(20, this.cameras.main.width / 40);
        const buttonX = Math.min(50, this.cameras.main.width * 0.05);
        const buttonY = Math.min(50, this.cameras.main.height * 0.08);
        
        this.undoButton = this.add.text(buttonX, buttonY, 'Undo', {
            fontFamily: 'Arial', 
            fontSize: buttonFontSize, 
            color: '#ffffff',
            backgroundColor: '#666666',
            padding: { x: 12, y: 6 }
        }).setOrigin(0);

        this.undoButton.setInteractive();
        this.undoButton.on('pointerdown', () => {
            this.undoLastMove();
        });

        this.undoButton.on('pointerover', () => {
            this.undoButton.setBackgroundColor('#888888');
        });

        this.undoButton.on('pointerout', () => {
            this.undoButton.setBackgroundColor('#666666');
        });

        this.updateUndoButton();
    }

    updateUndoButton()
    {
        if (this.moveHistory.length > 0) {
            this.undoButton.setAlpha(1);
            this.undoButton.setInteractive();
        } else {
            this.undoButton.setAlpha(0.5);
            this.undoButton.removeInteractive();
        }
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

    async placeDot(row: number, col: number, isComputerMove: boolean = false)
    {
        const cellState = this.gameState[row][col];

        // Can only place dots in empty cells or cells owned by current player
        // For human moves, check if it's the human player's turn (prevent clicking during computer turn)
        // For computer moves, bypass the human player check
        if ((cellState.dotCount === 0 || cellState.owner === this.currentPlayer) && 
            (isComputerMove || this.currentPlayer === this.humanPlayer)) {
            // Save current state to history before making the move
            this.saveGameState();
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

            // Play placement sound effect
            if (this.game.registry.get('soundEffectsEnabled') !== false) {
                this.sound.play('placement');
            }

            // Check for explosions after placing the dot
            await this.checkAndHandleExplosions();

            // Check for win condition
            const winner = this.checkWinCondition();
            if (winner) {
                console.log(`Game Over! ${winner} wins!`);
                this.handleGameOver(winner);
                return;
            }

            // Switch to the other player
            this.currentPlayer = this.currentPlayer === 'red' ? 'blue' : 'red';
            this.updatePlayerIndicator();
            this.updateUndoButton();

            // Save game state after each move
            this.saveGameStateToRegistry();

            // If it's now the computer's turn, make a computer move after a short delay
            if (this.currentPlayer !== this.humanPlayer && this.computerPlayer) {
                this.time.delayedCall(1000, () => {
                    this.makeComputerMove();
                });
            }
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

    async checkAndHandleExplosions()
    {
        let explosionOccurred = true;

        // Keep checking for explosions until no more occur (handle chain reactions)
        while (explosionOccurred) {
            explosionOccurred = false;

            for (let row = 0; row < this.gridSize; row++) {
                for (let col = 0; col < this.gridSize; col++) {
                    const cellState = this.gameState[row][col];

                    // Check if this cell should explode
                    if (cellState.dotCount > cellState.capacity) {
                        this.explodeCell(row, col);
                        explosionOccurred = true;
                    }
                }
            }

            // Check for win condition after each explosion wave
            if (explosionOccurred) {
                // Play explosion propagation sound effect
                if (this.game.registry.get('soundEffectsEnabled') !== false) {
                    this.sound.play('propagate');
                }

                const winner = this.checkWinCondition();
                if (winner) {
                    console.log(`Game Over during chain reaction! ${winner} wins!`);
                    this.handleGameOver(winner);
                    return; // Stop the chain reaction
                }

                // Add delay between explosion waves to show chain reaction
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
    }

    explodeCell(row: number, col: number)
    {
        const cellState = this.gameState[row][col];
        const explodingPlayer = cellState.owner;

        console.log(`Cell at ${row},${col} exploding! (${cellState.dotCount} > ${cellState.capacity})`);

        // Remove dots equal to capacity from the exploding cell
        const dotsToDistribute = cellState.capacity;
        cellState.dotCount -= dotsToDistribute;

        // Remove visual dots from the exploding cell
        this.updateCellVisualDots(row, col);

        // Distribute dots to adjacent cells
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

                const adjacentCell = this.gameState[newRow][newCol];

                // Add one dot to the adjacent cell
                adjacentCell.dotCount++;

                // Change ownership to the exploding player
                adjacentCell.owner = explodingPlayer;

                // Update visual representation (this will recreate all dots with correct colors)
                this.updateCellVisualDots(newRow, newCol);
                this.updateCellOwnership(newRow, newCol);

                console.log(`  -> Added dot to ${newRow},${newCol} (now ${adjacentCell.dotCount}/${adjacentCell.capacity})`);
            }
        }
    }

    updateCellVisualDots(row: number, col: number)
    {
        const cellState = this.gameState[row][col];
        const currentDots = this.dots[row][col];

        // Remove all existing visual dots
        while (currentDots.length > 0) {
            const dotToRemove = currentDots.pop();
            if (dotToRemove) {
                dotToRemove.destroy();
            }
        }

        // Recreate all dots with the correct owner's color
        if (cellState.owner && cellState.dotCount > 0) {
            for (let i = 0; i < cellState.dotCount; i++) {
                this.addVisualDot(row, col, cellState.owner);
            }
        }

        // Rearrange all dots
        this.arrangeDots(row, col);
    }

    addVisualDot(row: number, col: number, owner: string)
    {
        const color = owner === 'red' ? 0xff0000 : 0x0000ff;
        const dot = this.add.circle(0, 0, 12, color);
        dot.setStrokeStyle(2, 0x000000);

        this.dots[row][col].push(dot);
    }

    initializeGameSettings()
    {
        // Get player color preference from settings (default to red)
        const playerColor = this.game.registry.get('playerColor') || 'red';
        this.humanPlayer = playerColor as 'red' | 'blue';
        const computerColor = this.humanPlayer === 'red' ? 'blue' : 'red';

        // Get difficulty level from settings (default to Easy)
        const difficulty = this.game.registry.get('difficultyLevel') || 'Easy';

        // Create computer player instance
        this.computerPlayer = new ComputerPlayer(difficulty, computerColor);

        // Get who goes first preference from settings (default to player)
        const whoGoesFirst = this.game.registry.get('whoGoesFirst') || 'player';
        
        if (whoGoesFirst === 'player') {
            this.currentPlayer = this.humanPlayer;
        } else {
            this.currentPlayer = computerColor;
        }

        console.log(`Game initialized: Human is ${this.humanPlayer}, Computer is ${computerColor}, ${whoGoesFirst} goes first`);
    }

    saveGameState()
    {
        // Deep copy the current game state
        const gameStateCopy = this.gameState.map(row => 
            row.map(cell => ({ ...cell }))
        );

        // Save the state and current player
        this.moveHistory.push({
            gameState: gameStateCopy,
            currentPlayer: this.currentPlayer
        });

        // Limit history to prevent memory issues (keep last 50 moves)
        if (this.moveHistory.length > 50) {
            this.moveHistory.shift();
        }
    }

    undoLastMove()
    {
        if (this.moveHistory.length === 0) {
            console.log('No moves to undo');
            return;
        }

        // Get the last saved state
        const lastState = this.moveHistory.pop();
        if (!lastState) return;

        // Restore the game state
        this.gameState = lastState.gameState.map(row => 
            row.map(cell => ({ ...cell }))
        );
        this.currentPlayer = lastState.currentPlayer;

        // Clear all visual elements and recreate them
        this.clearAllVisualDots();
        this.recreateAllVisualDots();
        this.updateAllCellOwnership();
        this.updatePlayerIndicator();
        this.updateUndoButton();

        // Save updated game state after undo
        this.saveGameStateToRegistry();

        console.log(`Undid move, back to ${this.currentPlayer} player's turn`);
    }

    clearAllVisualDots()
    {
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cellDots = this.dots[row][col];
                while (cellDots.length > 0) {
                    const dot = cellDots.pop();
                    if (dot) {
                        dot.destroy();
                    }
                }
            }
        }
    }

    recreateAllVisualDots()
    {
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cellState = this.gameState[row][col];
                if (cellState.owner && cellState.dotCount > 0) {
                    for (let i = 0; i < cellState.dotCount; i++) {
                        this.addVisualDot(row, col, cellState.owner);
                    }
                }
                this.arrangeDots(row, col);
            }
        }
    }

    updateAllCellOwnership()
    {
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                this.updateCellOwnership(row, col);
            }
        }
    }

    saveGameStateToRegistry()
    {
        // Save current game state to global registry
        this.game.registry.set('gameState', {
            gameState: this.gameState.map(row => row.map(cell => ({ ...cell }))),
            currentPlayer: this.currentPlayer,
            humanPlayer: this.humanPlayer,
            computerPlayerColor: this.computerPlayer?.getColor() || 'blue',
            moveHistory: this.moveHistory.map(move => ({
                gameState: move.gameState.map(row => row.map(cell => ({ ...cell }))),
                currentPlayer: move.currentPlayer
            })),
            gameOver: false,
            winner: null
        });
    }

    loadGameState()
    {
        // Load game state from global registry
        const savedState = this.game.registry.get('gameState');
        if (savedState) {
            this.gameState = savedState.gameState.map(row => row.map(cell => ({ ...cell })));
            this.currentPlayer = savedState.currentPlayer;
            this.humanPlayer = savedState.humanPlayer || 'red';
            const computerColor = savedState.computerPlayerColor || 'blue';
            const difficulty = this.game.registry.get('difficultyLevel') || 'Easy';
            this.computerPlayer = new ComputerPlayer(difficulty, computerColor);
            this.moveHistory = savedState.moveHistory.map(move => ({
                gameState: move.gameState.map(row => row.map(cell => ({ ...cell }))),
                currentPlayer: move.currentPlayer
            }));
            
            // Check if the game was over when saved
            if (savedState.gameOver && savedState.winner) {
                // Recreate the game over state after a short delay to ensure all visuals are ready
                this.time.delayedCall(100, () => {
                    this.handleGameOver(savedState.winner);
                });
            }
        }
    }

    clearSavedGameState()
    {
        // Clear saved game state from registry
        this.game.registry.remove('gameState');
    }

    checkWinCondition(): string | null
    {
        let redCells = 0;
        let blueCells = 0;
        let emptyCells = 0;

        // Count cells owned by each player
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cellState = this.gameState[row][col];
                
                if (cellState.owner === 'red') {
                    redCells++;
                } else if (cellState.owner === 'blue') {
                    blueCells++;
                } else {
                    emptyCells++;
                }
            }
        }

        // Win condition: one player owns all cells (no empty cells and opponent has 0 cells)
        if (emptyCells === 0) {
            if (redCells > 0 && blueCells === 0) {
                return 'Red';
            } else if (blueCells > 0 && redCells === 0) {
                return 'Blue';
            }
        }

        return null; // No winner yet
    }

    handleGameOver(winner: string)
    {
        // Disable all cell interactions and undo button
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                this.grid[row][col].removeInteractive();
            }
        }
        this.undoButton.removeInteractive();
        this.undoButton.setAlpha(0.3);

        // Display responsive winner message
        const winnerColor = winner === 'Red' ? '#ff0000' : '#0000ff';
        const winnerFontSize = Math.min(48, this.cameras.main.width / 15);
        this.add.text(this.cameras.main.width / 2, this.cameras.main.height * 0.4, `${winner} Player Wins!`, {
            fontFamily: 'Arial Black', 
            fontSize: winnerFontSize, 
            color: winnerColor
        }).setOrigin(0.5);

        // Add responsive restart button
        const restartFontSize = Math.min(24, this.cameras.main.width / 30);
        const restartButton = this.add.text(this.cameras.main.width / 2, this.cameras.main.height * 0.55, 'Click to Restart', {
            fontFamily: 'Arial', 
            fontSize: restartFontSize, 
            color: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 15, y: 8 }
        }).setOrigin(0.5);

        restartButton.setInteractive();
        restartButton.on('pointerdown', () => {
            this.clearSavedGameState();
            this.scene.restart();
        });

        restartButton.on('pointerover', () => {
            restartButton.setBackgroundColor('#555555');
        });

        restartButton.on('pointerout', () => {
            restartButton.setBackgroundColor('#333333');
        });

        // Save the game over state to registry
        this.game.registry.set('gameState', {
            gameState: this.gameState.map(row => row.map(cell => ({ ...cell }))),
            currentPlayer: this.currentPlayer,
            humanPlayer: this.humanPlayer,
            computerPlayerColor: this.computerPlayer?.getColor() || 'blue',
            moveHistory: this.moveHistory.map(move => ({
                gameState: move.gameState.map(row => row.map(cell => ({ ...cell }))),
                currentPlayer: move.currentPlayer
            })),
            gameOver: true,
            winner: winner
        });
    }

    async makeComputerMove()
    {
        if (!this.computerPlayer || this.currentPlayer === this.humanPlayer) {
            return;
        }

        try {
            // Get the computer's move
            const move = this.computerPlayer.findMove(this.gameState, this.gridSize);
            console.log(`Computer (${this.computerPlayer.getColor()}) choosing move: ${move.row}, ${move.col}`);

            // Make the move (pass true to indicate this is a computer move)
            await this.placeDot(move.row, move.col, true);
        } catch (error) {
            console.error('Computer player error:', error);
            // If computer can't find a move, the game might be over
        }
    }

    changeScene ()
    {
        this.scene.start('GameOver');
    }
}
