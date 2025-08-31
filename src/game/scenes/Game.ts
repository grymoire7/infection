import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { ComputerPlayer } from '../ComputerPlayer';
import { GameStateManager, CellState } from '../GameStateManager';
import { GameUIManager } from '../GameUIManager';
import { LEVEL_SETS, getLevelById } from '../LevelDefinitions';
import { DotPositioner } from '../utils/DotPositioner';
import { GridManager } from '../GridManager';
import { SettingsManager } from '../SettingsManager';

export class Game extends Scene
{
    // Game configuration constants
    private static readonly DEFAULT_GRID_SIZE = 5;
    private static readonly COMPUTER_MOVE_DELAY = 1000;
    private static readonly EXPLOSION_DELAY = 300;

    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gridSize: number = Game.DEFAULT_GRID_SIZE;
    cellSize: number;
    gridStartX: number;
    gridStartY: number;
    grid: Phaser.GameObjects.Rectangle[][];
    dots: any[][][]; // Now 3D array: [row][col][dotIndex]
    boardState: CellState[][];
    currentPlayer: 'red' | 'blue' = 'red';
    humanPlayer: 'red' | 'blue' = 'red';
    currentPlayerText: Phaser.GameObjects.Text;
    levelInfoText: Phaser.GameObjects.Text;
    undoButton: Phaser.GameObjects.Text;
    quitButton: Phaser.GameObjects.Text;
    computerPlayer: ComputerPlayer | null = null;
    stateManager: GameStateManager;
    uiManager: GameUIManager;
    gridManager: GridManager;
    settingsManager: SettingsManager;
    // Level-related properties
    private blockedCells: { row: number; col: number }[] = [];

    constructor ()
    {
        super('Game');
    }

    create() {
        this.initializeCamera();
        this.initializeBackground();
        this.createAnimations();
        this.initializeManagers();
        this.initializeUI();
        this.initializeGameSettings();
        this.createGrid();
        this.loadGameStateOrLevel();
        this.updateUI();
        
        EventBus.emit('current-scene-ready', this);
    }

    private initializeCamera(): void {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x222222);
    }

    private initializeBackground(): void {
        this.background = this.add.image(512, 384, 'background');
        this.background.setAlpha(0.3);
    }

    private createAnimations(): void {                                                                                                                                                      
        this.anims.create({                                                                                                                                                                 
            key: 'good-dot-pulse',                                                                                                                                                          
            frames: this.anims.generateFrameNumbers('good-sprite', { frames: [0, 1, 2] }),                                                                                                  
            frameRate: 8,                                                                                                                                                                   
            repeat: -1,                                                                                                                                                                     
            repeatDelay: 2000                                                                                                                                                               
        });                                                                                                                                                                                 
        this.anims.create({                                                                                                                                                                 
            key: 'evil-dot-pulse',                                                                                                                                                          
            frames: this.anims.generateFrameNumbers('evil-sprite', { frames: [0, 1, 2] }),                                                                                                  
            frameRate: 8,                                                                                                                                                                   
            repeat: -1,                                                                                                                                                                     
            repeatDelay: 2000                                                                                                                                                               
        });                                                                                                                                                                                 
    }     

    private initializeManagers(): void {
        this.stateManager = new GameStateManager(this.game.registry);
        this.uiManager = new GameUIManager(this);
        this.gridManager = new GridManager(this);
        this.settingsManager = new SettingsManager(this.game.registry);
    }

    private initializeUI(): void {
        const uiElements = this.uiManager.createUI();
        this.currentPlayerText = uiElements.currentPlayerText;
        this.levelInfoText = uiElements.levelInfoText;
        this.undoButton = uiElements.undoButton;
        this.quitButton = uiElements.quitButton;
        
        this.uiManager.setUndoButtonHandler(() => this.undoLastMove());
        this.uiManager.setQuitButtonHandler(() => this.quitGame());
    }

    private loadGameStateOrLevel(): void {
        // If we have a saved state, load it
        if (this.stateManager.hasSavedState()) {
            this.loadGameState();
            this.recreateAllVisualDots();
            this.updateAllCellOwnership();
        } else {
            // Always load the level based on the current level set in the settings
            const levelSetId = this.settingsManager.getSetting('levelSetId');
            const levelSet = LEVEL_SETS.find(set => set.id === levelSetId);
            
            // Load the first level of the current level set
            if (levelSet && levelSet.levelIds.length > 0) {
                this.loadLevel(levelSetId, levelSet.levelIds[0]);
            } else {
                // Fallback to default level
                this.loadLevel('default', 'level-1');
            }
        }
    }

    private updateUI(): void {
        this.updatePlayerIndicator();
        this.updateLevelInfo();
        this.updateUndoButton();
    }

    private loadLevelNoState(): void {
        if (this.stateManager.hasSavedState()) return;

        // Always use the level set from the registry
        const selectedLevelSetId = this.game.registry.get('levelSetId') || 'default';
        
        if (this.shouldLoadNextLevel()) {
            this.loadNextLevelOrFallback(selectedLevelSetId);
        } else {
            this.loadFirstLevelOfSet(selectedLevelSetId);
        }
    }

    private shouldLoadNextLevel(): boolean {
        return this.game.registry.get('loadNextLevel') === true;
    }

    private loadNextLevelOrFallback(selectedLevelSetId: string): void {
        this.game.registry.remove('loadNextLevel');
        const levelSetId = this.game.registry.get('currentLevelSetId');
        const levelId = this.game.registry.get('currentLevelId');
        
        if (!levelSetId || !levelId) {
            this.loadFirstLevelOfSet(selectedLevelSetId);
            return;
        }

        const levelSet = LEVEL_SETS.find(set => set.id === levelSetId);
        if (!levelSet) {
            this.loadFirstLevelOfSet(selectedLevelSetId);
            return;
        }

        const currentIndex = levelSet.levelIds.indexOf(levelId);
        if (currentIndex !== -1 && currentIndex + 1 < levelSet.levelIds.length) {
            const nextLevelId = levelSet.levelIds[currentIndex + 1];
            this.loadLevel(levelSetId, nextLevelId);
        } else {
            this.loadFirstLevelOfSet(selectedLevelSetId);
        }
    }

    private loadFirstLevelOfSet(levelSetId: string): void {
        const levelSet = LEVEL_SETS.find(set => set.id === levelSetId);
        if (levelSet && levelSet.levelIds.length > 0) {
            this.loadLevel(levelSetId, levelSet.levelIds[0]);
        } else {
            this.loadLevel('default', 'level-1');
        }
    }

    private createGrid(): void {
        this.initializeGridArrays();
        this.createGridCells();
    }

    private initializeGridArrays(): void {
        this.dots = Array(this.gridSize).fill(null).map(() => []);
        // Initialize boardState with empty arrays for each row
        this.boardState = Array(this.gridSize);
        for (let i = 0; i < this.gridSize; i++) {
            this.boardState[i] = Array(this.gridSize);
        }
    }

    private createGridCells(): void {
        // Create the visual grid using GridManager
        const gridResult = this.gridManager.createGrid(this.gridSize, this.blockedCells);
        this.grid = gridResult.grid;
        this.gridStartX = gridResult.gridStartX;
        this.gridStartY = gridResult.gridStartY;
        this.cellSize = gridResult.cellSize;

        // Initialize dots array for each cell
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                this.dots[row][col] = [];
            }
        }

        // First pass: initialize all cell states with temporary capacities
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                this.initializeCellState(row, col, 0);
            }
        }
        
        // Second pass: calculate actual capacities and set up interactivity
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cellState = this.boardState[row][col];
                if (!cellState.isBlocked) {
                    cellState.capacity = this.gridManager.calculateCellCapacity(row, col, this.boardState);
                    // Make cell interactive only if not blocked
                    this.gridManager.makeCellInteractive(
                        row, col,
                        () => this.gridManager.handleCellHover(row, col, cellState),
                        () => this.updateCellOwnership(row, col),
                        () => this.placeDot(row, col)
                    );
                }
            }
        }
    }

    private isCellBlocked(row: number, col: number): boolean {
        return this.blockedCells.some(cell => cell.row === row && cell.col === col);
    }

    private initializeCellState(row: number, col: number, capacity: number): void {
        const initialOwner = this.isCellBlocked(row, col) ? 'blocked' : 'default';

        this.boardState[row][col] = { 
            dotCount: 0, 
            owner: initialOwner, 
            capacity,
            isBlocked: initialOwner === 'blocked'
        };
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
        // Always use the current level set from the settings
        const levelSetId = this.settingsManager.getSetting('levelSetId');
        const levelSet = LEVEL_SETS.find(set => set.id === levelSetId);
        
        // Get the current level ID from the registry
        const levelId = this.game.registry.get('currentLevelId');
        let level;
        
        if (levelId) {
            level = getLevelById(levelId);
        }
        
        // If level is not found, use the first level of the current level set
        if (!level && levelSet && levelSet.levelIds.length > 0) {
            level = getLevelById(levelSet.levelIds[0]);
        }
        
        if (levelSet && level) {
            this.uiManager.updateLevelInfo(levelSet.name, level.name);
        } else {
            // Default text if level info isn't available
            this.uiManager.updateLevelInfo('Default Levels', 'Beginner\'s Grid');
        }
    }


    async placeDot(row: number, col: number, isComputerMove: boolean = false)
    {
        const cellState = this.boardState[row][col];
        
        // Check if cell is blocked - can't place dots on blocked cells
        if (cellState.isBlocked) {
            console.log(`Cannot place dot on blocked cell at ${row},${col}`);
            return;
        }

        // Can only place dots in empty cells or cells owned by current player
        // For human moves, check if it's the human player's turn (prevent clicking during computer turn)
        // For computer moves, bypass the human player check
        if ((cellState.dotCount === 0 || cellState.owner === this.currentPlayer) && 
            (isComputerMove || this.currentPlayer === this.humanPlayer)) {
            // Save current state to history before making the move
            this.stateManager.saveMove(this.boardState, this.currentPlayer);
            // Update game state first
            cellState.dotCount++;
            cellState.owner = this.currentPlayer;

            this.addVisualDot(row, col, this.currentPlayer);

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

            // Save board state after each move
            this.stateManager.saveToRegistry(
                this.boardState,
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

        const positions = DotPositioner.calculateDotPositions(dotCount, cellCenterX, cellCenterY);
        
        // Apply positions to dots
        for (let i = 0; i < positions.length; i++) {
            cellDots[i].setPosition(positions[i].x, positions[i].y);
        }
    }

    updateCellOwnership(row: number, col: number)
    {
        const cellState = this.boardState[row][col];
        this.gridManager.updateCellOwnership(row, col, cellState);
    }

    async checkAndHandleExplosions()
    {
        let explosionOccurred = true;

        // Keep checking for explosions until no more occur (handle chain reactions)
        while (explosionOccurred) {
            explosionOccurred = false;

            for (let row = 0; row < this.gridSize; row++) {
                for (let col = 0; col < this.gridSize; col++) {
                    const cellState = this.boardState[row][col];

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
        const cellState = this.boardState[row][col];
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

            // Check if the adjacent cell is within grid bounds and not blocked
            if (newRow >= 0 && newRow < this.gridSize && 
                newCol >= 0 && newCol < this.gridSize) {

                const adjacentCell = this.boardState[newRow][newCol];
                
                // Skip blocked cells
                if (adjacentCell.isBlocked) {
                    continue;
                }

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
        const cellState = this.boardState[row][col];
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
        const dot = this.add.sprite(0, 0, owner === 'red' ? 'evil-sprite' : 'good-sprite');                                                                                 
        dot.setScale(1.5);
        dot.play(owner === 'red' ? 'evil-dot-pulse' : 'good-dot-pulse');

        this.dots[row][col].push(dot);
    }

    initializeGameSettings()
    {
        // Load all settings using SettingsManager
        const settings = this.settingsManager.loadSettings();
        
        // Set up game based on loaded settings
        this.humanPlayer = settings.playerColor;
        const computerColor = this.humanPlayer === 'red' ? 'blue' : 'red';

        // Create computer player instance
        this.computerPlayer = new ComputerPlayer(settings.difficultyLevel, computerColor);

        // Set starting player
        if (settings.whoGoesFirst === 'player') {
            this.currentPlayer = this.humanPlayer;
        } else {
            this.currentPlayer = computerColor;
        }

        console.log(`Game initialized: Human is ${this.humanPlayer}, Computer is ${computerColor}, ${settings.whoGoesFirst} goes first`);
    }

    undoLastMove()
    {
        const lastState = this.stateManager.undoLastMove();
        if (!lastState) return;

        // Restore the board state
        this.boardState = lastState.boardState;
        this.currentPlayer = lastState.currentPlayer;

        // Clear all visual elements and recreate them
        this.clearAllVisualDots();
        this.recreateAllVisualDots();
        this.updateAllCellOwnership();
        this.updatePlayerIndicator();
        this.updateUndoButton();

        // Save updated board state after undo
        this.stateManager.saveToRegistry(
            this.boardState,
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
                const cellState = this.boardState[row][col];
                const playerOwned = (cellState.owner === 'red' || cellState.owner === 'blue');
                if (playerOwned && cellState.dotCount > 0) {
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

        this.boardState = savedState.boardState;
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

        // Count cells owned by each player, ignoring blocked cells
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cellState = this.boardState[row][col];
                
                // Skip blocked cells in win condition calculation
                if (cellState.isBlocked) {
                    continue;
                }
                
                if (cellState.owner === 'red') {
                    redCells++;
                } else if (cellState.owner === 'blue') {
                    blueCells++;
                } else {
                    emptyCells++;
                }
            }
        }

        // Win condition: one player owns all non-blocked cells (no empty cells and opponent has 0 cells)
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
            const move = this.computerPlayer.findMove(this.boardState, this.gridSize);
            console.log(`Computer (${this.computerPlayer.getColor()}) choosing move: ${move.row}, ${move.col}`);

            // Validate the move before attempting to place the dot
            const cellState = this.boardState[move.row][move.col];
            if (cellState && !cellState.isBlocked && (cellState.dotCount === 0 || cellState.owner === this.currentPlayer)) {
                // Make the move (pass true to indicate this is a computer move)
                await this.placeDot(move.row, move.col, true);
            } else {
                console.error('Computer attempted invalid move, trying random valid move instead');
                // Fall back to a random valid move
                const validMoves = this.getValidMoves();
                if (validMoves.length > 0) {
                    const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
                    await this.placeDot(randomMove.row, randomMove.col, true);
                } else {
                    console.error('No valid moves available for computer');
                }
            }
        } catch (error) {
            console.error('Computer player error:', error);
            // If computer can't find a move, the game might be over
        }
    }

    /**
     * Get all valid moves for the current player
     */
    private getValidMoves(): { row: number, col: number }[] {
        const validMoves: { row: number, col: number }[] = [];

        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cellState = this.boardState[row][col];
                
                // A move is valid if the cell is not blocked and (empty or owned by current player)
                if (cellState && !cellState.isBlocked && (cellState.dotCount === 0 || cellState.owner === this.currentPlayer)) {
                    validMoves.push({ row, col });
                }
            }
        }

        return validMoves;
    }

    areSoundEffectsEnabled(): boolean {
        return this.settingsManager.getSetting('soundEffectsEnabled');
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

    // This method is called when the scene becomes active again
    wake() {
        // Check if settings have been changed while we were away
        const settingsDirty = this.game.registry.get('settingsDirty');
        if (settingsDirty) {
            // Clear the flag
            this.game.registry.remove('settingsDirty');
            
            // Check if level set has changed
            const currentLevelSetId = this.game.registry.get('currentLevelSetId');
            const newLevelSetId = this.settingsManager.getSetting('levelSetId');
            
            // Reload all settings from the registry
            this.reloadAllSettings();
            
            // If level set has changed, load the first level of the new level set
            if (currentLevelSetId !== newLevelSetId) {
                const levelSet = LEVEL_SETS.find(set => set.id === newLevelSetId);
                if (levelSet && levelSet.levelIds.length > 0) {
                    this.loadLevel(newLevelSetId, levelSet.levelIds[0]);
                }
            } else {
                // For other setting changes, just update the UI
                this.updatePlayerIndicator();
                this.updateLevelInfo();
            }
        }
        // If settings haven't changed but we're not in a game state, reload
        else if (!this.stateManager.hasSavedState()) {
            this.loadLevelNoState();
        }
    }

    /**
     * Reload all settings from the settings manager
     */
    private reloadAllSettings(): void {
        const settings = this.settingsManager.getCurrentSettings();
        
        // Reload player color
        this.humanPlayer = settings.playerColor;
        const computerColor = this.humanPlayer === 'red' ? 'blue' : 'red';

        // Reload difficulty level
        this.computerPlayer = new ComputerPlayer(settings.difficultyLevel, computerColor);

        // Reload who goes first
        if (settings.whoGoesFirst === 'player') {
            this.currentPlayer = this.humanPlayer;
        } else {
            this.currentPlayer = computerColor;
        }

        console.log(`Settings reloaded: Human is ${this.humanPlayer}, Computer is ${computerColor}, ${settings.whoGoesFirst} goes first`);
    }
}
