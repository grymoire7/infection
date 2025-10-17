import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { ComputerPlayer } from '../ComputerPlayer';
import { GameStateManager } from '../GameStateManager';
import { GameUIManager } from '../GameUIManager';
import { LevelSetManager } from '../LevelSetManager';
import { Level } from '../Level';
import { GridManager } from '../GridManager';
import { SettingsManager } from '../SettingsManager';
import { VisualDotManager } from '../VisualDotManager';
import { BoardStateManager } from '../BoardStateManager';

type PlayerColor = 'red' | 'blue';

export class Game extends Scene {
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

    // UI elements
    private levelInfoText: Phaser.GameObjects.Text;
    private aiDifficultyText: Phaser.GameObjects.Text;
    private undoButton: Phaser.GameObjects.Text;
    // private quitButton: Phaser.GameObjects.Text;
    // private currentPlayerSprite: Phaser.GameObjects.Sprite;

    constructor() {
        super('Game');
    }

    create(): void {
        this.initializeCore();
        this.initializeManagers();
        this.initializeUI();
        this.initializeGameSettings();
        this.loadGameStateOrLevel();
        this.updateUI();
        
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
        this.levelSetManager = new LevelSetManager(this.game.registry, this.loadLevel.bind(this));
    }

    private initializeUI(): void {
        const uiElements = this.uiManager.createUI();
        this.assignUIElements(uiElements);
        this.setupUIHandlers();
    }

    private assignUIElements(uiElements: any): void {
        this.levelInfoText = uiElements.levelInfoText;
        this.aiDifficultyText = uiElements.aiDifficultyText;
        this.undoButton = uiElements.undoButton;
        // this.quitButton = uiElements.quitButton;
        // this.currentPlayerSprite = uiElements.currentPlayerSprite;
    }

    private setupUIHandlers(): void {
        this.uiManager.setUndoButtonHandler(() => this.undoLastMove());
        this.uiManager.setQuitButtonHandler(() => this.quitGame());
    }

    private loadGameStateOrLevel(): void {
        // This logic is incorrect.
        if (this.stateManager.hasSavedState()) {
            console.log('Loading saved game state');
            this.loadExistingGameState();
        } else {
            console.log('No saved state, loading new level');
            this.levelSetManager.loadNewLevel();
        }
    }

    // called only by loadGameStateOrLevel
    private loadExistingGameState(): void {
        this.loadGameState();
        this.createGrid();
        this.recreateAllVisualDots();
        this.updateAllCellOwnership();
    }

    // used only by loadNewLevel and loadFirstLevelOfSet
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
        if (this.levelInfoText) this.updateLevelInfo();
        if (this.aiDifficultyText) this.updateAIDifficulty();
        if (this.undoButton) this.updateUndoButton();
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
        await this.checkAndHandleExplosions();

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

    async checkAndHandleExplosions(): Promise<void> {
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
                    return;
                }

                await this.waitForExplosionDelay();
            }
        }
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
        this.visualDotManager.recreateAll(
            this.boardStateManager.getState(),
            (row, col) => this.gridManager.getCellCenter(row, col)
        );
    }

    updateAllCellOwnership(): void {
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                this.updateCellOwnership(row, col);
            }
        }
    }

    // called only by loadExistingGameState()
    private loadGameState(): void {
        const savedState = this.stateManager.loadFromRegistry();
        if (!savedState) return;

        this.restoreGameStateFromSave(savedState);
        this.setLevelProperties(this.currentLevel);
        this.handleGameOverIfNeeded(savedState);
    }

    // called only by loadGameState
    private restoreGameStateFromSave(savedState: any): void {
        this.boardStateManager.setState(savedState.boardState);
        this.currentPlayer = savedState.currentPlayer;
        this.humanPlayer = savedState.humanPlayer;
        this.currentLevel = savedState.currentLevel;
        this.restoreAIFromSavedState(savedState);
    }

    // used only by restoreGameStateFromSave
    private restoreAIFromSavedState(savedState: any): void {
        const computerColor = savedState.computerPlayerColor;
        let aiDifficulty: 'easy' | 'medium' | 'hard' | 'expert' = 'easy';
        
        aiDifficulty = this.currentLevel?.getAIDifficulty() || 'easy';
        
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
        // this flag feels like a hack, unsure why it is needed
        if (this.game.registry.get('gameEnding')) {
            return;
        }
        
        this.game.registry.set('gameEnding', true);
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
            this.game.registry.remove('gameEnding');
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
        const settingsDirty = this.game.registry.get('settingsDirty');
        if (settingsDirty) {
            this.handleSettingsChange();
        } else if (!this.stateManager.hasSavedState()) {
            this.levelSetManager.loadNewLevel();
        }
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
        
        this.humanPlayer = settings.playerColor;
        const computerColor = this.humanPlayer === 'red' ? 'blue' : 'red';

        let aiDifficulty: 'easy' | 'medium' | 'hard' | 'expert' = 'easy';
        if (this.currentLevel) {
            aiDifficulty = this.currentLevel.getAIDifficulty();
        }

        this.computerPlayer = new ComputerPlayer(aiDifficulty, computerColor);
        this.currentPlayer = this.humanPlayer;

        this.levelSetManager.handleLevelSetDirty();

        console.log(`Settings reloaded: Human is ${this.humanPlayer}, Computer is ${computerColor} (${aiDifficulty})`);
    }
}