import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { ComputerPlayer } from '../ComputerPlayer';
import { GameStateManager, GameState } from '../GameStateManager';
import { GameUIManager } from '../GameUIManager';
import { LEVEL_SETS, getLevelById } from '../LevelDefinitions';

export class Game extends Scene
{
    // Game configuration constants
    private static readonly DEFAULT_GRID_SIZE = 5;
    private static readonly MAX_CELL_SIZE = 80;
    private static readonly MIN_CELL_SIZE = 40;
    private static readonly DOT_RADIUS = 12;
    private static readonly DOT_STROKE_WIDTH = 2;
    private static readonly MAX_VISUAL_DOTS = 6;
    private static readonly COMPUTER_MOVE_DELAY = 1000;
    private static readonly EXPLOSION_DELAY = 300;

    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gridSize: number = Game.DEFAULT_GRID_SIZE;
    cellSize: number = Game.MAX_CELL_SIZE;
    gridStartX: number;
    gridStartY: number;
    grid: Phaser.GameObjects.Rectangle[][];
    dots: any[][][]; // Now 3D array: [row][col][dotIndex]
    gameState: GameState[][];
    currentPlayer: 'red' | 'blue' = 'red';
    humanPlayer: 'red' | 'blue' = 'red';
    currentPlayerText: Phaser.GameObjects.Text;
    levelInfoText: Phaser.GameObjects.Text;
    undoButton: Phaser.GameObjects.Text;
    quitButton: Phaser.GameObjects.Text;
    computerPlayer: ComputerPlayer | null = null;
    stateManager: GameStateManager;
    uiManager: GameUIManager;
    // Level-related properties
    private blockedCells: { row: number; col: number }[] = [];

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

        // Initialize managers
        this.stateManager = new GameStateManager(this.game.registry);
        this.uiManager = new GameUIManager(this);

        // Create UI elements first
        const uiElements = this.uiManager.createUI();
        this.currentPlayerText = uiElements.currentPlayerText;
        this.levelInfoText = uiElements.levelInfoText;
        this.undoButton = uiElements.undoButton;
        this.quitButton = uiElements.quitButton;
        
        // Set up button handlers
        this.uiManager.setUndoButtonHandler(() => this.undoLastMove());
        this.uiManager.setQuitButtonHandler(() => this.quitGame());

        // Initialize player colors and turn order from settings
        this.initializeGameSettings();

        this.createGrid();

        // Load saved game state if it exists, after grid is created
        this.loadGameState();
        // If no saved state, load the next level or default level
        this.loadLevelNoState();

        // Recreate visual elements if game state was loaded
        if (this.stateManager.hasSavedState()) {
            this.recreateAllVisualDots();
            this.updateAllCellOwnership();
        }
        
        // Update UI indicators
        this.updatePlayerIndicator();
        this.updateLevelInfo();
        this.updateUndoButton();

        EventBus.emit('current-scene-ready', this);
    }

    loadLevelNoState()
    {
        if (this.stateManager.hasSavedState()) return;

        // Get the selected level set from settings, default to 'default'
        const selectedLevelSetId = this.game.registry.get('levelSetId') || 'default';
        
        const loadSelectedLevelSet = () => {
            const levelSet = LEVEL_SETS.find(set => set.id === selectedLevelSetId);
            if (levelSet && levelSet.levelIds.length > 0) {
                this.loadLevel(selectedLevelSetId, levelSet.levelIds[0]);
            } else {
                // Fall back to default level set if selected level set is invalid
                this.loadLevel('default', 'level-1');
            }
        };

        // Check if we should load the next level
        if (this.game.registry.get('loadNextLevel')) {
            this.game.registry.remove('loadNextLevel');
            const levelSetId = this.game.registry.get('currentLevelSetId');
            const levelId = this.game.registry.get('currentLevelId');
            if (levelSetId && levelId) {
                // Find the next level
                const levelSet = LEVEL_SETS.find(set => set.id === levelSetId);
                if (levelSet) {
                    const currentIndex = levelSet.levelIds.indexOf(levelId);
                    if (currentIndex !== -1 && currentIndex + 1 < levelSet.levelIds.length) {
                        const nextLevelId = levelSet.levelIds[currentIndex + 1];
                        this.loadLevel(levelSetId, nextLevelId);
                    } else {
                        // Fall back to first level of selected level set if no next level found
                        loadSelectedLevelSet();
                    }
                } else {
                    // Fall back to first level of selected level set if level set not found
                    loadSelectedLevelSet();
                }
            } else {
                // Fall back to first level of selected level set if no level info found
                loadSelectedLevelSet();
            }
        } else {
            // Load the first level of the selected level set if no saved state
            loadSelectedLevelSet();
        }
    }

    createGrid()
    {
        this.calculateGridDimensions();

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

                // Check if cell is blocked
                const isBlocked = this.blockedCells.some((cell: { row: number; col: number }) => cell.row === row && cell.col === col);
                
                // Calculate capacity based on adjacent cells (0 if blocked)
                const capacity = isBlocked ? 0 : this.calculateCellCapacity(row, col);

                // Initialize game state for this cell
                if (!this.gameState[row]) {
                    this.gameState[row] = [];
                }
                if (!this.gameState[row][col]) {
                    this.gameState[row][col] = { 
                        dotCount: 0, 
                        owner: null, 
                        capacity: capacity,
                        isBlocked: isBlocked 
                    };
                }

                // Create cell background
                const cellColor = isBlocked ? 0x222222 : 0x444444;
                const cell = this.add.rectangle(x, y, this.cellSize - 2, this.cellSize - 2, cellColor);
                cell.setStrokeStyle(2, isBlocked ? 0x333333 : 0x666666);
                
                // Only make non-blocked cells interactive
                if (!isBlocked) {
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
                }

                this.grid[row][col] = cell;
                this.dots[row][col] = []; // Empty array of dots initially
            }
        }
    }


    private calculateGridDimensions(): void {
        const screenWidth = this.cameras.main.width;
        const screenHeight = this.cameras.main.height;
        
        // Reserve space for UI elements (title, player indicator, instructions)
        const availableWidth = screenWidth * 0.9;
        const availableHeight = screenHeight * 0.7;
        
        // Calculate cell size that fits within available space
        const maxCellSizeByWidth = Math.floor(availableWidth / this.gridSize);
        const maxCellSizeByHeight = Math.floor(availableHeight / this.gridSize);
        this.cellSize = Math.min(maxCellSizeByWidth, maxCellSizeByHeight, Game.MAX_CELL_SIZE);
        
        // Ensure minimum cell size for playability
        this.cellSize = Math.max(this.cellSize, Game.MIN_CELL_SIZE);
        
        // Calculate centered grid position
        const totalGridWidth = this.gridSize * this.cellSize;
        const totalGridHeight = this.gridSize * this.cellSize;
        this.gridStartX = (screenWidth - totalGridWidth) / 2 + this.cellSize / 2;
        this.gridStartY = (screenHeight - totalGridHeight) / 2 + this.cellSize / 2 + 60;
    }

    updateUndoButton()
    {
        this.uiManager.updateUndoButton(this.stateManager.canUndo());
    }

    updatePlayerIndicator()
    {
        this.uiManager.updatePlayerIndicator(this.currentPlayer);
    }

    updateLevelInfo()
    {
        const levelSetId = this.game.registry.get('currentLevelSetId');
        const levelId = this.game.registry.get('currentLevelId');
        
        if (levelSetId && levelId) {
            // Find level set and level names
            const levelSet = LEVEL_SETS.find(set => set.id === levelSetId);
            const level = getLevelById(levelId);
            
            if (levelSet && level) {
                this.uiManager.updateLevelInfo(levelSet.name, level.name);
                return;
            }
        }
        
        // Default text if level info isn't available
        this.uiManager.updateLevelInfo('Default Levels', 'Beginner\'s Grid');
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
        
        // Check if cell is blocked
        if (cellState.isBlocked) {
            return;
        }

        // Can only place dots in empty cells or cells owned by current player
        // For human moves, check if it's the human player's turn (prevent clicking during computer turn)
        // For computer moves, bypass the human player check
        if ((cellState.dotCount === 0 || cellState.owner === this.currentPlayer) && 
            (isComputerMove || this.currentPlayer === this.humanPlayer)) {
            // Save current state to history before making the move
            this.stateManager.saveMove(this.gameState, this.currentPlayer);
            // Update game state first
            cellState.dotCount++;
            cellState.owner = this.currentPlayer;

            // Create new dot with current player's color
            const color = this.currentPlayer === 'red' ? 0xff0000 : 0x0000ff;
            const dot = this.add.circle(0, 0, Game.DOT_RADIUS, color);
            dot.setStrokeStyle(Game.DOT_STROKE_WIDTH, 0x000000);

            // Add dot to the cell's dot array
            this.dots[row][col].push(dot);

            // Arrange all dots in this cell visually
            this.arrangeDots(row, col);

            // Update cell ownership visual
            this.updateCellOwnership(row, col);

            console.log(`${this.currentPlayer} placed dot at row ${row}, col ${col} (${cellState.dotCount}/${cellState.capacity})`);

            // Play placement sound effect
            if (this.areSoundEffectsEnabled()) {
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
            this.stateManager.saveToRegistry(
                this.gameState,
                this.currentPlayer,
                this.humanPlayer,
                this.computerPlayer?.getColor() || 'blue'
            );

            // If it's now the computer's turn, make a computer move after a short delay
            if (this.currentPlayer !== this.humanPlayer && this.computerPlayer) {
                this.time.delayedCall(Game.COMPUTER_MOVE_DELAY, () => {
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

        // Only render up to max visual dots, even if more exist
        const visualDotCount = Math.min(dotCount, Game.MAX_VISUAL_DOTS);

        const positions = this.calculateDotPositions(visualDotCount, cellCenterX, cellCenterY);
        
        // Apply positions to dots
        for (let i = 0; i < visualDotCount; i++) {
            cellDots[i].setPosition(positions[i].x, positions[i].y);
        }

        // Hide any dots beyond the max visual count
        for (let i = Game.MAX_VISUAL_DOTS; i < cellDots.length; i++) {
            cellDots[i].setVisible(false);
        }
    }

    private calculateDotPositions(count: number, centerX: number, centerY: number): { x: number, y: number }[] {
        const positions: { x: number, y: number }[] = [];

        switch (count) {
            case 1:
                positions.push({ x: centerX, y: centerY });
                break;
            case 2:
                positions.push(
                    { x: centerX - 15, y: centerY },
                    { x: centerX + 15, y: centerY }
                );
                break;
            case 3:
                positions.push(
                    { x: centerX, y: centerY - 12 },
                    { x: centerX - 12, y: centerY + 8 },
                    { x: centerX + 12, y: centerY + 8 }
                );
                break;
            case 4:
                positions.push(
                    { x: centerX - 12, y: centerY - 12 },
                    { x: centerX + 12, y: centerY - 12 },
                    { x: centerX - 12, y: centerY + 12 },
                    { x: centerX + 12, y: centerY + 12 }
                );
                break;
            case 5:
                positions.push(
                    { x: centerX, y: centerY },
                    { x: centerX - 18, y: centerY - 18 },
                    { x: centerX + 18, y: centerY - 18 },
                    { x: centerX - 18, y: centerY + 18 },
                    { x: centerX + 18, y: centerY + 18 }
                );
                break;
            case 6:
                positions.push(
                    { x: centerX - 18, y: centerY - 12 },
                    { x: centerX, y: centerY - 12 },
                    { x: centerX + 18, y: centerY - 12 },
                    { x: centerX - 18, y: centerY + 12 },
                    { x: centerX, y: centerY + 12 },
                    { x: centerX + 18, y: centerY + 12 }
                );
                break;
        }

        return positions;
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
                if (this.areSoundEffectsEnabled()) {
                    this.sound.play('propagate');
                }

                const winner = this.checkWinCondition();
                if (winner) {
                    console.log(`Game Over during chain reaction! ${winner} wins!`);
                    this.handleGameOver(winner);
                    return; // Stop the chain reaction
                }

                // Add delay between explosion waves to show chain reaction
                await new Promise(resolve => setTimeout(resolve, Game.EXPLOSION_DELAY));
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
        const dot = this.add.circle(0, 0, Game.DOT_RADIUS, color);
        dot.setStrokeStyle(Game.DOT_STROKE_WIDTH, 0x000000);

        this.dots[row][col].push(dot);
    }

    initializeGameSettings()
    {
        // Load settings from localStorage first to ensure they're up to date
        this.loadSettingsFromLocalStorage();
        
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

    loadSettingsFromLocalStorage()
    {
        // Load sound effects setting from localStorage
        const savedSoundSetting = localStorage.getItem('dotsGame_soundEffects');
        if (savedSoundSetting !== null) {
            const soundEffectsEnabled = savedSoundSetting === 'true';
            this.game.registry.set('soundEffectsEnabled', soundEffectsEnabled);
        }

        // Load difficulty level setting from localStorage
        const savedDifficulty = localStorage.getItem('dotsGame_difficultyLevel');
        if (savedDifficulty !== null) {
            this.game.registry.set('difficultyLevel', savedDifficulty);
        }

        // Load player color setting from localStorage
        const savedPlayerColor = localStorage.getItem('dotsGame_playerColor');
        if (savedPlayerColor !== null) {
            this.game.registry.set('playerColor', savedPlayerColor);
        }

        // Load who goes first setting from localStorage
        const savedWhoGoesFirst = localStorage.getItem('dotsGame_whoGoesFirst');
        if (savedWhoGoesFirst !== null) {
            this.game.registry.set('whoGoesFirst', savedWhoGoesFirst);
        }
    }

    undoLastMove()
    {
        const lastState = this.stateManager.undoLastMove();
        if (!lastState) return;

        // Restore the game state
        this.gameState = lastState.gameState;
        this.currentPlayer = lastState.currentPlayer;

        // Clear all visual elements and recreate them
        this.clearAllVisualDots();
        this.recreateAllVisualDots();
        this.updateAllCellOwnership();
        this.updatePlayerIndicator();
        this.updateUndoButton();

        // Save updated game state after undo
        this.stateManager.saveToRegistry(
            this.gameState,
            this.currentPlayer,
            this.humanPlayer,
            this.computerPlayer?.getColor() || 'blue'
        );

        console.log(`Undid move, back to ${this.currentPlayer} player's turn`);
    }

    quitGame()
    {
        // Reset the game state
        this.clearSavedGameState();
        
        // Store abandonment information for GameOver scene
        this.game.registry.set('gameWinner', 'Abandoned');
        
        // Transition to GameOver scene immediately
        this.scene.start('GameOver');
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

    loadGameState()
    {
        const savedState = this.stateManager.loadFromRegistry();
        if (!savedState) return;

        this.gameState = savedState.gameState;
        this.currentPlayer = savedState.currentPlayer;
        this.humanPlayer = savedState.humanPlayer;
        const computerColor = savedState.computerPlayerColor;

        const difficulty = this.game.registry.get('difficultyLevel') || 'Easy';
        this.computerPlayer = new ComputerPlayer(difficulty, computerColor);
        
        // Check if the game was over when saved
        if (savedState.gameOver && savedState.winner) {
            // Recreate the game over state after a short delay to ensure all visuals are ready
            this.time.delayedCall(100, () => {
                if (savedState.winner) {
                    this.handleGameOver(savedState.winner);
                }
            });
        }
    }

    clearSavedGameState()
    {
        this.stateManager.clearSavedState();
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
        // Prevent multiple calls to handleGameOver
        if (this.game.registry.get('gameEnding')) {
            return;
        }
        this.game.registry.set('gameEnding', true);
        
        // Reset the game state
        this.clearSavedGameState();
        
        // Store winner information for GameOver scene
        this.game.registry.set('gameWinner', winner);
        
        // Add a short pause before transitioning to GameOver scene
        // This allows the user to see the final resolved game state
        this.time.delayedCall(1500, () => {
            this.game.registry.remove('gameEnding');
            this.scene.start('GameOver');
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

    areSoundEffectsEnabled(): boolean {
        // Check registry first, then fall back to localStorage
        const registryValue = this.game.registry.get('soundEffectsEnabled');
        if (registryValue !== undefined) {
            return registryValue;
        }
        
        // Fall back to localStorage
        const savedSoundSetting = localStorage.getItem('dotsGame_soundEffects');
        if (savedSoundSetting !== null) {
            return savedSoundSetting === 'true';
        }
        
        // Default to true if no setting found
        return true;
    }

    loadLevel(levelSetId: string, levelId: string) {
        // Find the level set
        const levelSet = LEVEL_SETS.find(set => set.id === levelSetId);
        if (!levelSet) return;
        
        // Find the level
        const level = getLevelById(levelId);
        if (!level) return;
        
        // Set level properties
        this.gridSize = level.gridSize;
        this.blockedCells = level.blockedCells;
        
        // Reset game state
        this.clearSavedGameState();
        this.createGrid();
        this.recreateAllVisualDots();
        this.updateAllCellOwnership();
        
        // Reset player turn
        this.initializeGameSettings();
        
        // Update UI only if UI elements exist
        if (this.currentPlayerText) {
            this.updatePlayerIndicator();
        }
        if (this.levelInfoText) {
            this.updateLevelInfo();
        }
        if (this.undoButton) {
            this.updateUndoButton();
        }
        
        // Save level info to registry
        this.game.registry.set('currentLevelSetId', levelSetId);
        this.game.registry.set('currentLevelId', levelId);
    }

    changeScene ()
    {
        this.scene.start('GameOver');
    }
}
