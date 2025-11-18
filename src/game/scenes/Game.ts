import { EventBus } from '../EventBus';
import { ComputerPlayer } from '../ComputerPlayer';
import { GameStateManager } from '../GameStateManager';
import { GameUIManager } from '../GameUIManager';
import { LevelSetManager } from '../LevelSetManager';
import { Level } from '../Level';
import { GridManager } from '../GridManager';
import { SettingsManager } from '../SettingsManager';
import { VisualDotManager } from '../VisualDotManager';
import { BoardStateManager } from '../BoardStateManager';
import { BaseScene } from '../BaseScene';

type PlayerColor = 'red' | 'blue';

export class Game extends BaseScene {
    // Game configuration constants
    private static readonly COMPUTER_MOVE_DELAY = 1000;
    private static readonly EXPLOSION_DELAY = 300;
    private static readonly MAX_GRID_SIZE = 9;
    private static readonly GAME_END_DELAY = 1500;

    // Core game components
    private camera: Phaser.Cameras.Scene2D.Camera;
    private background: Phaser.GameObjects.Image;
    private stateManager: GameStateManager;
    private uiManager: GameUIManager;
    private gridManager: GridManager;
    private visualDotManager: VisualDotManager;
    private boardStateManager: BoardStateManager;
    private settingsManager: SettingsManager;
    private levelSetManager: LevelSetManager;
    private computerPlayer: ComputerPlayer | null = null;
    private currentLevel: Level;

    // Grid and game state
    private gridSize: number = 5;
    private blockedCells: { row: number; col: number }[] = [];

    // Game flow
    private currentPlayer: PlayerColor = 'red';
    private humanPlayer: PlayerColor = 'red';

    constructor() {
        super('Game');
    }

    create(): void {
        console.log('[Game] ===== SCENE CREATE START =====');
        this.initializeCore();
        this.initializeManagers();
        this.initializeUI();
        this.initializeGameSettings();
        this.loadGameStateOrLevel();
        this.updateUI();

        console.log('[Game] ===== SCENE CREATE END =====');
        EventBus.emit('current-scene-ready', this);
    }

    private initializeCore(): void {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x222222);

        this.background = this.add.image(512, 384, 'background');
        this.background.setAlpha(0.3);
    }

    private initializeManagers(): void {
        this.stateManager = new GameStateManager(this.game.registry);
        this.uiManager = new GameUIManager(this);
        this.gridManager = new GridManager(this);
        this.settingsManager = new SettingsManager(this.game.registry);
        this.levelSetManager = new LevelSetManager(this.game.registry);
    }

    private initializeUI(): void {
        this.uiManager.createUI();
        this.setupUIHandlers();
    }

    private setupUIHandlers(): void {
        this.uiManager.setUndoButtonHandler(() => this.undoLastMove());
        this.uiManager.setQuitButtonHandler(() => this.quitGame());
    }

    /**
     * Determine what to load when scene starts:
     * 1. If settings changed (especially level set), handle that first
     * 2. If loadNextLevel flag is set, load the next level
     * 3. If there's a saved game in progress, resume it
     * 4. Otherwise, start a new level
     */
    private loadGameStateOrLevel(): void {
        const settingsDirty = this.game.registry.get('settingsDirty');

        // Priority 1: Handle settings changes (especially level set changes)
        if (settingsDirty) {
            console.log('Settings changed, handling settings update');
            this.handleSettingsChange();
            return;
        }

        const shouldLoadNextLevel = this.game.registry.get('loadNextLevel') === true;

        if (shouldLoadNextLevel) {
            console.log('Loading next level after level completion');
            this.stateManager.clearSavedState(); // Clear old saved state
            this.startNewLevel(); // This will check and consume the loadNextLevel flag
        } else if (this.stateManager.hasSavedState()) {
            console.log('Resuming saved game');
            this.resumeSavedGame();
        } else {
            console.log('Starting new level');
            this.startNewLevel();
        }
    }

    /**
     * Resume a saved game from registry
     */
    private resumeSavedGame(): void {
        console.log('[Game] ===== RESUME SAVED GAME START =====');
        const savedState = this.stateManager.loadFromRegistry();
        console.log('[Game] Loaded saved state:', savedState ? 'SUCCESS' : 'FAILED');
        if (!savedState) {
            console.warn('Failed to load saved state, starting new level');
            this.startNewLevel();
            return;
        }

        console.log('[Game] Restoring level info and board state...');
        console.log('[Game] Saved boardState:', JSON.stringify(savedState.boardState, null, 2));
        console.log('[Game] Saved currentPlayer:', savedState.currentPlayer);
        console.log('[Game] Saved humanPlayer:', savedState.humanPlayer);

        // Restore level info and game properties
        this.currentLevel = savedState.currentLevel;
        this.setLevelProperties(this.currentLevel);
        this.currentPlayer = savedState.currentPlayer;
        this.humanPlayer = savedState.humanPlayer;
        this.restoreAIFromSavedState(savedState);

        console.log('[Game] Creating grid and visuals...');
        // Create grid and visuals FIRST
        this.createGrid();

        console.log('[Game] Restoring board state AFTER grid creation...');
        // THEN restore board state to avoid being reset by createGrid()
        this.boardStateManager.setState(savedState.boardState);

        // FINALLY recreate visuals with the restored state
        this.recreateAllVisualDots();
        this.updateAllCellOwnership();

        console.log('[Game] ===== RESUME SAVED GAME END =====');
        // Check if game was already over when saved
        this.handleGameOverIfNeeded(savedState);
    }

    /**
     * Start a new level (either first level or next level)
     */
    private startNewLevel(): void {
        const level = this.levelSetManager.getLevelToLoad();
        this.loadLevel(level);
    }

    /**
     * Load a specific level and set up the game board
     */
    private loadLevel(level: Level): void {
        console.log(`Loading level: ${level.getName()}`);
        this.currentLevel = level;

        this.setLevelProperties(level);
        this.initializeGameState();
        this.createGameBoard();
        this.setupAI(level);
        this.updateUIForLevel();
        this.saveLevelInfo(level);
    }

    // called by loadGameState() and loadLevel()
    private setLevelProperties(level: Level): void {
        this.gridSize = Math.min(level.getGridSize(), Game.MAX_GRID_SIZE);
        this.blockedCells = level.getBlockedCells();
        
        if (level.getGridSize() > Game.MAX_GRID_SIZE) {
            console.warn(`Level ${level.getId()} grid size ${level.getGridSize()} exceeds maximum of ${Game.MAX_GRID_SIZE}, clamped`);
        }
    }

    private initializeGameState(): void {
        this.stateManager.initializeNewGameState(this.humanPlayer, this.getCurrentLevel());
    }

    private getCurrentLevel(): Level {
        if (!this.currentLevel) {
            const currentLevelSet = this.levelSetManager.getCurrentLevelSet();
            this.currentLevel = currentLevelSet.first();
        }
        return this.currentLevel;
    }

    private createGameBoard(): void {
        this.createGrid();
        this.recreateAllVisualDots();
        this.updateAllCellOwnership();
    }

    private setupAI(level: Level): void {
        this.initializeGameSettings();
        this.setAIForLevel(level);
    }

    private updateUIForLevel(): void {
        this.updateLevelInfo();
        this.updateAIDifficulty();
        this.updateUndoButton();
        this.updatePlayerIndicator();
    }

    private saveLevelInfo(level: Level): void {
        const currentLevelSet = this.levelSetManager.getCurrentLevelSet();
        if (currentLevelSet) {
            this.game.registry.set('currentLevelSet', currentLevelSet);
            this.game.registry.set('currentLevel', level);
        }
    }

    private createGrid(): void {
        this.initializeGridArrays();
        this.createGridCells();
    }

    private initializeGridArrays(): void {
        // Initialize board state manager
        this.boardStateManager = new BoardStateManager(this.gridSize, this.blockedCells);

        // Initialize visual dot manager for this grid size
        this.visualDotManager = new VisualDotManager(this, this.gridSize);
    }

    private createGridCells(): void {
        this.gridManager.createGrid(this.gridSize, this.blockedCells);
        this.setupCellCapacitiesAndInteractivity();
    }

    private setupCellCapacitiesAndInteractivity(): void {
        const boardState = this.boardStateManager.getState();

        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cellState = boardState[row][col];
                if (cellState.isBlocked) continue;

                // Calculate and set capacity
                const capacity = this.gridManager.calculateCellCapacity(row, col, boardState);
                this.boardStateManager.setCellCapacity(row, col, capacity);

                // Make cell interactive
                this.gridManager.makeCellInteractive(
                    row, col,
                    () => this.gridManager.handleCellHover(row, col, cellState),
                    () => this.updateCellOwnership(row, col),
                    () => this.placeDot(row, col)
                );
            }
        }
    }

    private updateUI(): void {
        this.updatePlayerIndicator();
        this.updateLevelInfo();
        this.updateAIDifficulty();
        this.updateUndoButton();
    }

    updateUndoButton(): void {
        this.uiManager.updateUndoButton(this.stateManager.canUndo());
    }

    updatePlayerIndicator(): void {
        this.uiManager.updatePlayerIndicator(this.currentPlayer);
    }

    updateLevelInfo(): void {
        const levelInfo = this.getLevelInfoForUI();
        this.uiManager.updateLevelInfo(levelInfo.setName, levelInfo.levelName);
    }

    private getLevelInfoForUI(): { setName: string; levelName: string } {
        console.log('Updating level info UI');
        const currentLevelSet = this.levelSetManager.getCurrentLevelSet();
        console.log('Current level set:', currentLevelSet);

        const setName = currentLevelSet?.getName() || 'Default Levels';
        
        let levelName = 'Beginner\'s Grid';
        if (this.currentLevel) {
            levelName = this.currentLevel.getName();
        } else if (currentLevelSet) {
            const firstLevel = currentLevelSet.first();
            if (firstLevel) {
                levelName = firstLevel.getName();
            }
        }
        
        return { setName, levelName };
    }

    updateAIDifficulty(): void {
        if (this.computerPlayer) {
            this.uiManager.updateAIDifficulty(this.computerPlayer.getDifficulty());
        }
    }

    async placeDot(row: number, col: number, isComputerMove: boolean = false): Promise<void> {
        if (!this.isValidMove(row, col, isComputerMove)) {
            return;
        }

        this.processMoveAndUpdateState(row, col);
        await this.handleMoveConsequences();
    }

    private isValidMove(row: number, col: number, isComputerMove: boolean): boolean {
        const isPlayerTurn = isComputerMove || this.currentPlayer === this.humanPlayer;

        if (!isPlayerTurn) {
            return false;
        }

        const isValid = this.boardStateManager.isValidMove(row, col, this.currentPlayer);

        if (!isValid) {
            const cellState = this.boardStateManager.getCellState(row, col);
            if (cellState.isBlocked) {
                console.log(`Cannot place dot on blocked cell at ${row},${col}`);
            } else {
                console.log(`Cell at row ${row}, col ${col} is owned by the other player`);
            }
        }

        return isValid;
    }

    private processMoveAndUpdateState(row: number, col: number): void {
        // Save move for undo
        this.stateManager.saveMove(this.boardStateManager.getState(), this.currentPlayer);

        // Place dot through board state manager
        this.boardStateManager.placeDot(row, col, this.currentPlayer);

        // Update visuals
        this.updateVisuals(row, col);
        this.playPlacementSound();

        const cellState = this.boardStateManager.getCellState(row, col);
        console.log(`${this.currentPlayer} placed dot at row ${row}, col ${col} (${cellState.dotCount}/${cellState.capacity})`);
    }

    private updateVisuals(row: number, col: number): void {
        const cellState = this.boardStateManager.getCellState(row, col);
        const cellCenter = this.gridManager.getCellCenter(row, col);

        this.visualDotManager.updateCell(
            row,
            col,
            cellState.owner,
            cellState.dotCount,
            cellCenter.x,
            cellCenter.y
        );
        this.updateCellOwnership(row, col);
    }

    private playPlacementSound(): void {
        if (this.areSoundEffectsEnabled()) {
            this.sound.play('placement');
        }
    }

    private async handleMoveConsequences(): Promise<void> {
        const gameEndedDuringExplosions = await this.checkAndHandleExplosions();

        // If game ended during explosions, don't check again
        if (gameEndedDuringExplosions) {
            return;
        }

        const winner = this.boardStateManager.checkWinCondition();
        if (winner) {
            const winnerName = winner.charAt(0).toUpperCase() + winner.slice(1);
            console.log(`Game Over! ${winnerName} wins!`);
            this.handleGameOver(winnerName);
            return;
        }

        this.switchToNextPlayer();
        this.saveGameState();
        this.scheduleComputerMoveIfNeeded();
    }

    private switchToNextPlayer(): void {
        this.currentPlayer = this.currentPlayer === 'red' ? 'blue' : 'red';
        this.updatePlayerIndicator();
        this.updateUndoButton();
    }

    private saveGameState(): void {
        const savedState = this.stateManager.loadFromRegistry();
        const currentLevel = savedState?.currentLevel || this.getCurrentLevel();
        const levelWinners = savedState?.levelWinners || [];

        this.stateManager.saveToRegistry(
            this.boardStateManager.getState(),
            this.currentPlayer,
            this.humanPlayer,
            this.computerPlayer?.getColor() || 'blue',
            false, // gameOver
            false, // levelOver
            currentLevel,
            levelWinners
        );
    }

    private scheduleComputerMoveIfNeeded(): void {
        if (this.isComputerMove()) {
            this.time.delayedCall(Game.COMPUTER_MOVE_DELAY, () => {
                this.makeComputerMove();
            });
        }
    }

    updateCellOwnership(row: number, col: number): void {
        const cellState = this.boardStateManager.getCellState(row, col);
        this.gridManager.updateCellOwnership(row, col, cellState);
    }

    async checkAndHandleExplosions(): Promise<boolean> {
        let explosionOccurred = true;

        while (explosionOccurred) {
            explosionOccurred = false;

            const cellsToExplode = this.boardStateManager.getCellsToExplode();

            if (cellsToExplode.length > 0) {
                explosionOccurred = true;

                for (const cell of cellsToExplode) {
                    this.explodeCell(cell.row, cell.col);
                }

                this.playExplosionSound();

                const winner = this.boardStateManager.checkWinCondition();
                if (winner) {
                    const winnerName = winner.charAt(0).toUpperCase() + winner.slice(1);
                    console.log(`Game Over during chain reaction! ${winnerName} wins!`);
                    this.handleGameOver(winnerName);
                    return true; // Game ended during explosions
                }

                await this.waitForExplosionDelay();
            }
        }

        return false; // Game did not end during explosions
    }

    private playExplosionSound(): void {
        if (this.areSoundEffectsEnabled()) {
            this.sound.play('propagate');
        }
    }

    private waitForExplosionDelay(): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, Game.EXPLOSION_DELAY));
    }

    explodeCell(row: number, col: number): void {
        const cellState = this.boardStateManager.getCellState(row, col);
        console.log(`Cell at ${row},${col} exploding! (${cellState.dotCount} > ${cellState.capacity})`);

        // Explode through board state manager and get affected cells
        const affectedCells = this.boardStateManager.explodeCell(row, col);

        // Update visual for the exploded cell
        this.updateCellVisualDots(row, col);

        // Update visuals for all affected cells
        for (const cell of affectedCells) {
            this.updateCellVisualDots(cell.row, cell.col);
            this.updateCellOwnership(cell.row, cell.col);

            const adjacentCellState = this.boardStateManager.getCellState(cell.row, cell.col);
            console.log(`  -> Added dot to ${cell.row},${cell.col} (now ${adjacentCellState.dotCount}/${adjacentCellState.capacity})`);
        }
    }

    updateCellVisualDots(row: number, col: number): void {
        const cellState = this.boardStateManager.getCellState(row, col);
        const cellCenter = this.gridManager.getCellCenter(row, col);

        this.visualDotManager.updateCell(
            row,
            col,
            cellState.owner,
            cellState.dotCount,
            cellCenter.x,
            cellCenter.y
        );
    }

    initializeGameSettings(): void {
        const settings = this.settingsManager.getCurrentSettings();
        
        this.humanPlayer = settings.playerColor;
        const computerColor = this.humanPlayer === 'red' ? 'blue' : 'red';
        
        this.computerPlayer = new ComputerPlayer('easy', computerColor);
        this.currentPlayer = this.humanPlayer;

        console.log(`Game initialized: Human is ${this.humanPlayer}, Computer is ${computerColor}`);
    }

    setAIForLevel(level: Level): void {
        if (!this.computerPlayer) return;

        const aiDifficulty = level.getAIDifficulty();
        this.computerPlayer.setDifficulty(aiDifficulty);

        console.log(`AI set for level: Computer AI is ${aiDifficulty}`);
    }

    undoLastMove(): void {
        const lastState = this.stateManager.undoLastMove();
        if (!lastState) return;

        this.restoreGameState(lastState);
        this.updateVisualsAfterUndo();
        this.saveGameState();

        console.log(`Undid move, back to ${this.currentPlayer} player's turn`);
    }

    private restoreGameState(lastState: any): void {
        this.boardStateManager.setState(lastState.boardState);
        this.currentPlayer = lastState.currentPlayer;
    }

    private updateVisualsAfterUndo(): void {
        this.clearAllVisualDots();
        this.recreateAllVisualDots();
        this.updateAllCellOwnership();
        this.updatePlayerIndicator();
        this.updateUndoButton();
    }

    quitGame(): void {
        this.stateManager.clearSavedState();
        this.game.registry.set('gameWinner', 'Abandoned');
        this.scene.start('GameOver');
    }

    clearAllVisualDots(): void {
        this.visualDotManager.clearAll();
    }

    recreateAllVisualDots(): void {
        console.log('[Game] ===== RECREATE ALL VISUAL DOTS START =====');
        const boardState = this.boardStateManager.getState();
        console.log('[Game] Board state for recreation:', JSON.stringify(boardState, null, 2));
        console.log('[Game] VisualDotManager exists:', !!this.visualDotManager);
        console.log('[Game] GridManager exists:', !!this.gridManager);

        this.visualDotManager.recreateAll(
            boardState,
            (row, col) => this.gridManager.getCellCenter(row, col)
        );
        console.log('[Game] ===== RECREATE ALL VISUAL DOTS END =====');
    }

    updateAllCellOwnership(): void {
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                this.updateCellOwnership(row, col);
            }
        }
    }

    /**
     * Restore AI player from saved state
     */
    private restoreAIFromSavedState(savedState: any): void {
        const computerColor = savedState.computerPlayerColor;
        const aiDifficulty = this.currentLevel?.getAIDifficulty() || 'easy';
        this.computerPlayer = new ComputerPlayer(aiDifficulty, computerColor);
    }

    private handleGameOverIfNeeded(savedState: any): void {
        if (savedState.gameOver && savedState.winner) {
            this.time.delayedCall(100, () => {
                if (savedState.winner) {
                    this.handleGameOver(savedState.winner);
                }
            });
        }
    }


    handleGameOver(winner: string): void {
        this.processGameEndResult(winner);
        this.scheduleSceneTransition(winner);
    }

    private processGameEndResult(winner: string): void {
        const isLastLevel = this.currentLevel.isLast();

        this.game.registry.set('gameWinner', winner);
        
        if (isLastLevel) {
            this.stateManager.markGameComplete(winner);
        }
        
        if (winner !== 'Abandoned') {
            this.updateLevelCompletionStatus(winner);
        } else {
            this.stateManager.clearSavedState();
        }
    }

    private updateLevelCompletionStatus(winner: string): void {
        const savedState = this.stateManager.loadFromRegistry();
        const currentLevel = savedState?.currentLevel || this.getCurrentLevel();
        
        if (winner === 'Red' || winner === 'Blue') {
            const winnerColor = winner.toLowerCase() as PlayerColor;
            this.stateManager.updateLevelCompletion(winnerColor, currentLevel);
        }
    }

    private scheduleSceneTransition(winner: string): void {
        const targetScene = this.determineTargetScene(winner);

        this.time.delayedCall(Game.GAME_END_DELAY, () => {
            this.scene.start(targetScene);
        });
    }

    private determineTargetScene(winner: string): string {
        const isLastLevel = this.currentLevel.isLast();
        
        if (isLastLevel || winner === 'Abandoned') {
            return 'GameOver';
        }

        return 'LevelOver';
    }

    async makeComputerMove(): Promise<void> {
        if (!this.isComputerMove()) {
            return;
        }

        try {
            const move = this.computerPlayer!.findMove(this.boardStateManager.getState(), this.gridSize);
            console.log(`Computer (${this.computerPlayer!.getColor()}) choosing move: ${move.row}, ${move.col}`);

            if (this.boardStateManager.isValidMove(move.row, move.col, this.currentPlayer)) {
                await this.placeDot(move.row, move.col, true);
            } else {
                console.error('Computer attempted invalid move, trying random valid move instead');
                await this.makeRandomValidMove();
            }
        } catch (error) {
            console.error('Computer player error:', error);
        }
    }

    private isComputerMove(): boolean {
        return this.computerPlayer !== null && this.currentPlayer !== this.humanPlayer;
    }

    private async makeRandomValidMove(): Promise<void> {
        const validMoves = this.boardStateManager.getValidMoves(this.currentPlayer);
        if (validMoves.length > 0) {
            const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
            await this.placeDot(randomMove.row, randomMove.col, true);
        } else {
            console.error('No valid moves available for computer');
        }
    }

    areSoundEffectsEnabled(): boolean {
        return this.settingsManager.getSetting('soundEffectsEnabled');
    }

    changeScene(): void {
        this.scene.start('GameOver');
    }

    wake(): void {
        console.log('[Game] ===== SCENE WAKE START =====');
        console.log('[Game] Waking up - checking registry state...');

        const settingsDirty = this.game.registry.get('settingsDirty');
        console.log('[Game] Settings dirty:', settingsDirty);

        const hasSavedState = this.stateManager.hasSavedState();
        console.log('[Game] Has saved state:', hasSavedState);

        if (settingsDirty) {
            console.log('[Game] Handling settings change during wake');
            this.handleSettingsChange();
        } else if (hasSavedState) {
            console.log('[Game] Waking with saved state - resuming game');
            this.resumeSavedGame();
        } else {
            console.log('[Game] Waking without saved state - starting new level');
            this.startNewLevel();
        }

        console.log('[Game] ===== SCENE WAKE END =====');
        EventBus.emit('current-scene-ready', this);
    }

    private handleSettingsChange(): void {
        this.game.registry.remove('settingsDirty');
        this.reloadAllSettings();
        this.updateUIAfterSettingsChange();
    }

    private updateUIAfterSettingsChange(): void {
        this.updatePlayerIndicator();
        this.updateLevelInfo();
        this.updateAIDifficulty();
    }

    private reloadAllSettings(): void {
        const settings = this.settingsManager.getCurrentSettings();

        // Check if level set was changed
        const levelSetChanged = this.levelSetManager.hasLevelSetChanged();

        if (levelSetChanged) {
            console.log('Level set changed, loading new level set and starting from first level');
            // Clear saved state since we're switching to a different level set
            this.stateManager.clearSavedState();

            // Load the new level set by ID
            this.levelSetManager.setCurrentLevelSetById(settings.levelSetId);

            // Load the first level of the new level set
            // Note: loadLevel() calls initializeGameSettings() which will apply player color changes
            const firstLevel = this.levelSetManager.getFirstLevelOfCurrentSet();
            this.loadLevel(firstLevel);
        } else {
            // Level set didn't change, just update player colors and AI
            this.humanPlayer = settings.playerColor;
            const computerColor = this.humanPlayer === 'red' ? 'blue' : 'red';

            let aiDifficulty: 'easy' | 'medium' | 'hard' | 'expert' = 'easy';
            if (this.currentLevel) {
                aiDifficulty = this.currentLevel.getAIDifficulty();
            }

            this.computerPlayer = new ComputerPlayer(aiDifficulty, computerColor);
            this.currentPlayer = this.humanPlayer;

            console.log(`Settings reloaded: Human is ${this.humanPlayer}, Computer is ${computerColor} (${aiDifficulty})`);

            // After updating settings, restore the saved game if it exists
            if (this.stateManager.hasSavedState()) {
                console.log('[Game] Restoring saved game after settings change');
                const savedState = this.stateManager.loadFromRegistry();
                if (savedState) {
                    // Restore level info and game properties
                    this.currentLevel = savedState.currentLevel;
                    this.setLevelProperties(this.currentLevel);
                    this.currentPlayer = savedState.currentPlayer;

                    // Create grid and restore board state
                    this.createGrid();
                    this.boardStateManager.setState(savedState.boardState);

                    // Recreate visuals with the restored state
                    this.recreateAllVisualDots();
                    this.updateAllCellOwnership();
                } else {
                    console.warn('[Game] Failed to load saved state, starting new level');
                    this.startNewLevel();
                }
            } else {
                // No saved state, start a new level
                console.log('[Game] No saved state after settings change, starting new level');
                this.startNewLevel();
            }
        }
    }

    /**
     * Override shutdown to handle complex scene-specific cleanup
     */
    public shutdown(): void {
        console.log('Game: Starting shutdown cleanup');

        // Clear any pending timers
        this.time.clearPendingEvents();

        // Clean up game components in reverse order of creation
        if (this.visualDotManager) {
            this.visualDotManager.clearAll();
        }

        if (this.gridManager) {
            // GridManager doesn't have explicit cleanup, but we can remove its references
            this.addCleanupTask(() => {
                // Any grid-specific cleanup would go here
            });
        }

        if (this.uiManager) {
            this.addCleanupTask(() => {
                // Clean up any UI-specific resources
            });
        }

        if (this.stateManager) {
            this.stateManager.clearSavedState();
        }

        // Clean up managers
        this.visualDotManager = null!;
        this.gridManager = null!;
        this.uiManager = null!;
        this.stateManager = null!;
        this.settingsManager = null!;
        this.levelSetManager = null!;
        this.computerPlayer = null;

        // Clean up display objects
        this.safeDestroy(this.background);

        // Clean up any remaining input handlers
        this.input.removeAllListeners();

        // Call parent shutdown for base cleanup
        super.shutdown();

        console.log('Game: Shutdown cleanup completed');
    }
}