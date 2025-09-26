import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { ComputerPlayer } from '../ComputerPlayer';
import { GameStateManager, CellState } from '../GameStateManager';
import { GameUIManager } from '../GameUIManager';
import { LEVEL_SETS, getLevelById, getAIDifficultyForLevel } from '../LevelDefinitions';
import { DotPositioner } from '../utils/DotPositioner';
import { GridManager } from '../GridManager';
import { SettingsManager } from '../SettingsManager';

type PlayerColor = 'red' | 'blue';
type CellOwner = PlayerColor | 'default' | 'blocked';

interface GameMove {
    row: number;
    col: number;
}

interface LevelInfo {
    levelSetId: string;
    levelId: string;
    levelIndex?: number;
}

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
    private settingsManager: SettingsManager;
    private computerPlayer: ComputerPlayer | null = null;

    // Grid and game state
    private gridSize: number = 5;
    private cellSize: number;
    private gridStartX: number;
    private gridStartY: number;
    // private grid: Phaser.GameObjects.Rectangle[][];
    private dots: any[][][]; // 3D array: [row][col][dotIndex]
    private boardState: CellState[][];
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
        if (this.stateManager.hasSavedState()) {
            console.log('Loading saved game state');
            this.loadExistingGameState();
        } else {
            console.log('No saved state, loading new level');
            this.loadNewLevel();
        }
    }

    private loadExistingGameState(): void {
        this.loadGameState();
        this.createGrid();
        this.recreateAllVisualDots();
        this.updateAllCellOwnership();
    }

    private loadNewLevel(): void {
        const selectedLevelSetId = this.settingsManager.getSetting('levelSetId');
        
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
        console.log('Loading next level for level set:', selectedLevelSetId);
        
        this.game.registry.remove('loadNextLevel');
        
        const currentLevelInfo = this.getCurrentLevelInfo(selectedLevelSetId);
        if (currentLevelInfo.isValid) {
            console.log('No valid current level info, loading first level of set');
            this.loadFirstLevelOfSet(selectedLevelSetId);
            return;
        }

        const nextLevelIndex = currentLevelInfo.levelIndex! + 1;
        const levelSet = LEVEL_SETS.find(set => set.id === currentLevelInfo.levelSetId);
        
        if (this.hasNextLevel(levelSet!, nextLevelIndex)) {
            this.loadLevelByIndex(currentLevelInfo.levelSetId, nextLevelIndex);
        } else {
            console.log(`Completed all levels in ${currentLevelInfo.levelSetId}, restarting from first level`);
            this.loadFirstLevelOfSet(selectedLevelSetId);
        }
    }

    private getCurrentLevelInfo(fallbackLevelSetId: string): { 
        levelSetId: string; 
        levelId: string; 
        levelIndex: number; 
        isValid: boolean 
    } {
        const currentLevelSetId = this.game.registry.get('currentLevelSetId') || fallbackLevelSetId;
        const currentLevelId = this.game.registry.get('currentLevelId');
        
        const levelSet = LEVEL_SETS.find(set => set.id === currentLevelSetId);
        if (!levelSet || !currentLevelId) {
            return { levelSetId: '', levelId: '', levelIndex: -1, isValid: false };
        }

        const levelIndex = levelSet.levelEntries.findIndex(entry => entry.levelId === currentLevelId);
        return {
            levelSetId: currentLevelSetId,
            levelId: currentLevelId,
            levelIndex,
            isValid: levelIndex !== -1
        };
    }

    private hasNextLevel(levelSet: any, nextLevelIndex: number): boolean {
        return nextLevelIndex < levelSet.levelEntries.length;
    }

    private loadLevelByIndex(levelSetId: string, levelIndex: number): void {
        const levelSet = LEVEL_SETS.find(set => set.id === levelSetId);
        if (!levelSet || levelIndex >= levelSet.levelEntries.length) {
            console.error('Invalid level index:', levelIndex);
            return;
        }

        const levelId = levelSet.levelEntries[levelIndex].levelId;
        console.log(`Loading level: ${levelId} from set: ${levelSetId} (index ${levelIndex})`);
        this.loadLevel(levelSetId, levelId, levelIndex);
    }

    private loadFirstLevelOfSet(levelSetId: string): void {
        const levelSet = LEVEL_SETS.find(set => set.id === levelSetId);
        if (levelSet && levelSet.levelEntries.length > 0) {
            this.loadLevel(levelSetId, levelSet.levelEntries[0].levelId, 0);
        } else {
            this.loadLevel('default', 'level-1', 0);
        }
    }
    
    private loadLevel(levelSetId: string, levelId: string, levelIndex: number = -1): void {
        const levelSet = LEVEL_SETS.find(set => set.id === levelSetId);
        if (!levelSet) {
            console.error('Level set not found:', levelSetId);
            return;
        }

        if (levelIndex === -1) {
            levelIndex = levelSet.levelEntries.findIndex(entry => entry.levelId === levelId);
            if (levelIndex === -1) return;
        }
        
        const level = getLevelById(levelId);
        if (!level) {
            console.error('Level not found:', levelId);
            return;
        }
        
        this.setupLevel(level, levelSetId, levelId, levelIndex);
    }

    private setupLevel(level: any, levelSetId: string, levelId: string, levelIndex: number): void {
        console.log(`Setting up level: ${level.name}`);
        
        this.setLevelProperties(level, levelId);
        this.initializeGameState(levelIndex);
        this.createGameBoard();
        this.setupAI(levelSetId, levelId);
        this.updateUIForLevel();
        this.saveLevelInfo(levelSetId, levelId);
    }

    private setLevelProperties(level: any, levelId: string): void {
        this.gridSize = Math.min(level.gridSize, Game.MAX_GRID_SIZE);
        this.blockedCells = level.blockedCells;
        
        if (level.gridSize > Game.MAX_GRID_SIZE) {
            console.warn(`Level ${levelId} grid size ${level.gridSize} exceeds maximum of ${Game.MAX_GRID_SIZE}, clamped`);
        }
    }

    private initializeGameState(levelIndex: number): void {
        this.stateManager.initializeNewGameState(this.humanPlayer, levelIndex);
    }

    private createGameBoard(): void {
        this.createGrid();
        this.recreateAllVisualDots();
        this.updateAllCellOwnership();
    }

    private setupAI(levelSetId: string, levelId: string): void {
        this.initializeGameSettings();
        this.setAIForLevel(levelSetId, levelId);
    }

    private updateUIForLevel(): void {
        if (this.levelInfoText) this.updateLevelInfo();
        if (this.aiDifficultyText) this.updateAIDifficulty();
        if (this.undoButton) this.updateUndoButton();
        this.updatePlayerIndicator();
    }

    private saveLevelInfo(levelSetId: string, levelId: string): void {
        this.game.registry.set('currentLevelSetId', levelSetId);
        this.game.registry.set('currentLevelId', levelId);
    }

    private createGrid(): void {
        this.initializeGridArrays();
        this.createGridCells();
    }

    private initializeGridArrays(): void {
        this.dots = Array(this.gridSize).fill(null).map(() => []);
        this.boardState = Array(this.gridSize);
        for (let i = 0; i < this.gridSize; i++) {
            this.boardState[i] = Array(this.gridSize);
        }
    }

    private createGridCells(): void {
        const gridResult = this.gridManager.createGrid(this.gridSize, this.blockedCells);
        this.assignGridProperties(gridResult);
        this.initializeCells();
        this.setupCellCapacitiesAndInteractivity();
    }

    private assignGridProperties(gridResult: any): void {
        // this.grid = gridResult.grid;
        this.gridStartX = gridResult.gridStartX;
        this.gridStartY = gridResult.gridStartY;
        this.cellSize = gridResult.cellSize;
    }

    private initializeCells(): void {
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                this.dots[row][col] = [];
                this.initializeCellState(row, col, 0);
            }
        }
    }

    private setupCellCapacitiesAndInteractivity(): void {
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cellState = this.boardState[row][col];
                if (!cellState.isBlocked) {
                    this.setupNonBlockedCell(row, col, cellState);
                }
            }
        }
    }

    private setupNonBlockedCell(row: number, col: number, cellState: CellState): void {
        cellState.capacity = this.gridManager.calculateCellCapacity(row, col, this.boardState);
        this.gridManager.makeCellInteractive(
            row, col,
            () => this.gridManager.handleCellHover(row, col, cellState),
            () => this.updateCellOwnership(row, col),
            () => this.placeDot(row, col)
        );
    }

    private isCellBlocked(row: number, col: number): boolean {
        return this.blockedCells.some(cell => cell.row === row && cell.col === col);
    }

    private initializeCellState(row: number, col: number, capacity: number): void {
        const initialOwner: CellOwner = this.isCellBlocked(row, col) ? 'blocked' : 'default';

        this.boardState[row][col] = { 
            dotCount: 0, 
            owner: initialOwner, 
            capacity,
            isBlocked: initialOwner === 'blocked'
        };
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
        const levelSetId = this.settingsManager.getSetting('levelSetId');
        const levelSet = LEVEL_SETS.find(set => set.id === levelSetId);
        const levelId = this.game.registry.get('currentLevelId');
        
        let level;
        if (levelId) {
            level = getLevelById(levelId);
        } else if (levelSet && levelSet.levelEntries.length > 0) {
            level = getLevelById(levelSet.levelEntries[0].levelId);
        }
        
        return {
            setName: levelSet?.name || 'Default Levels',
            levelName: level?.name || 'Beginner\'s Grid'
        };
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
        const cellState = this.boardState[row][col];
        
        if (cellState.isBlocked) {
            console.log(`Cannot place dot on blocked cell at ${row},${col}`);
            return false;
        }

        const canPlaceDot = cellState.dotCount === 0 || cellState.owner === this.currentPlayer;
        const isPlayerTurn = isComputerMove || this.currentPlayer === this.humanPlayer;
        
        if (!canPlaceDot) {
            console.log(`Cell at row ${row}, col ${col} is owned by the other player`);
        }

        return canPlaceDot && isPlayerTurn;
    }

    private processMoveAndUpdateState(row: number, col: number): void {
        const cellState = this.boardState[row][col];
        
        this.stateManager.saveMove(this.boardState, this.currentPlayer);
        
        cellState.dotCount++;
        cellState.owner = this.currentPlayer;

        this.updateVisuals(row, col);
        this.playPlacementSound();
        
        console.log(`${this.currentPlayer} placed dot at row ${row}, col ${col} (${cellState.dotCount}/${cellState.capacity})`);
    }

    private updateVisuals(row: number, col: number): void {
        this.addVisualDot(row, col, this.currentPlayer);
        this.arrangeDots(row, col);
        this.updateCellOwnership(row, col);
    }

    private playPlacementSound(): void {
        if (this.areSoundEffectsEnabled()) {
            this.sound.play('placement');
        }
    }

    private async handleMoveConsequences(): Promise<void> {
        await this.checkAndHandleExplosions();

        const winner = this.checkWinCondition();
        if (winner) {
            console.log(`Game Over! ${winner} wins!`);
            this.handleGameOver(winner);
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
        const currentLevelIndex = savedState?.currentLevelIndex || 0;
        const levelWinners = savedState?.levelWinners || [];
    
        this.stateManager.saveToRegistry(
            this.boardState,
            this.currentPlayer,
            this.humanPlayer,
            this.computerPlayer?.getColor() || 'blue',
            false, // gameOver
            false, // levelOver
            currentLevelIndex,
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

    arrangeDots(row: number, col: number): void {
        const cellDots = this.dots[row][col];
        if (cellDots.length === 0) return;

        const cellCenterX = this.gridStartX + col * this.cellSize;
        const cellCenterY = this.gridStartY + row * this.cellSize;

        const positions = DotPositioner.calculateDotPositions(cellDots.length, cellCenterX, cellCenterY);
        
        for (let i = 0; i < positions.length; i++) {
            cellDots[i].setPosition(positions[i].x, positions[i].y);
        }
    }

    updateCellOwnership(row: number, col: number): void {
        const cellState = this.boardState[row][col];
        this.gridManager.updateCellOwnership(row, col, cellState);
    }

    async checkAndHandleExplosions(): Promise<void> {
        let explosionOccurred = true;

        while (explosionOccurred) {
            explosionOccurred = false;

            for (let row = 0; row < this.gridSize; row++) {
                for (let col = 0; col < this.gridSize; col++) {
                    if (this.shouldExplode(row, col)) {
                        this.explodeCell(row, col);
                        explosionOccurred = true;
                    }
                }
            }

            if (explosionOccurred) {
                this.playExplosionSound();

                const winner = this.checkWinCondition();
                if (winner) {
                    console.log(`Game Over during chain reaction! ${winner} wins!`);
                    this.handleGameOver(winner);
                    return;
                }

                await this.waitForExplosionDelay();
            }
        }
    }

    private shouldExplode(row: number, col: number): boolean {
        const cellState = this.boardState[row][col];
        return cellState.dotCount > cellState.capacity;
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
        const cellState = this.boardState[row][col];
        const explodingPlayer = cellState.owner as PlayerColor;

        console.log(`Cell at ${row},${col} exploding! (${cellState.dotCount} > ${cellState.capacity})`);

        this.removeDotsDuringExplosion(row, col, cellState);
        this.distributeDotsToAdjacentCells(row, col, explodingPlayer);
    }

    private removeDotsDuringExplosion(row: number, col: number, cellState: CellState): void {
        const dotsToDistribute = cellState.capacity;
        cellState.dotCount -= dotsToDistribute;
        this.updateCellVisualDots(row, col);
    }

    private distributeDotsToAdjacentCells(row: number, col: number, explodingPlayer: PlayerColor): void {
        const adjacentDirections = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        for (const [deltaRow, deltaCol] of adjacentDirections) {
            const targetCell = { row: row + deltaRow, col: col + deltaCol };
            
            if (this.isValidAdjacentCell(targetCell)) {
                this.addDotToAdjacentCell(targetCell, explodingPlayer);
            }
        }
    }

    private isValidAdjacentCell(cell: GameMove): boolean {
        return cell.row >= 0 && cell.row < this.gridSize && 
               cell.col >= 0 && cell.col < this.gridSize &&
               !this.boardState[cell.row][cell.col].isBlocked;
    }

    private addDotToAdjacentCell(cell: GameMove, explodingPlayer: PlayerColor): void {
        const adjacentCell = this.boardState[cell.row][cell.col];
        
        adjacentCell.dotCount++;
        adjacentCell.owner = explodingPlayer;

        this.updateCellVisualDots(cell.row, cell.col);
        this.updateCellOwnership(cell.row, cell.col);

        console.log(`  -> Added dot to ${cell.row},${cell.col} (now ${adjacentCell.dotCount}/${adjacentCell.capacity})`);
    }

    updateCellVisualDots(row: number, col: number): void {
        this.clearCellDots(row, col);
        this.recreateCellDots(row, col);
        this.arrangeDots(row, col);
    }

    private clearCellDots(row: number, col: number): void {
        const currentDots = this.dots[row][col];
        while (currentDots.length > 0) {
            const dotToRemove = currentDots.pop();
            if (dotToRemove) {
                dotToRemove.destroy();
            }
        }
    }

    private recreateCellDots(row: number, col: number): void {
        const cellState = this.boardState[row][col];
        if (cellState.owner && cellState.dotCount > 0) {
            for (let i = 0; i < cellState.dotCount; i++) {
                this.addVisualDot(row, col, cellState.owner);
            }
        }
    }

    addVisualDot(row: number, col: number, owner: string): void {
        const spriteKey = owner === 'red' ? 'evil-sprite' : 'good-sprite';
        const animationKey = owner === 'red' ? 'evil-dot-pulse' : 'good-dot-pulse';
        
        const dot = this.add.sprite(0, 0, spriteKey);                                                                                 
        dot.setScale(1.5);
        
        if (Math.random() < 0.5) {
            dot.toggleFlipX();
        }
        
        dot.play(animationKey);
        this.dots[row][col].push(dot);
    }

    initializeGameSettings(): void {
        const settings = this.settingsManager.getCurrentSettings();
        
        this.humanPlayer = settings.playerColor;
        const computerColor = this.humanPlayer === 'red' ? 'blue' : 'red';
        
        this.computerPlayer = new ComputerPlayer('easy', computerColor);
        this.currentPlayer = this.humanPlayer;

        console.log(`Game initialized: Human is ${this.humanPlayer}, Computer is ${computerColor}`);
    }

    setAIForLevel(levelSetId: string, levelId: string): void {
        if (!this.computerPlayer) return;

        const aiDifficulty = getAIDifficultyForLevel(levelSetId, levelId);
        this.computerPlayer.setDifficulty(aiDifficulty);

        console.log(`AI set for level: Computer AI is ${aiDifficulty}`);
    }

    undoLastMove(): void {
        const lastState = this.stateManager.undoLastMove();
        if (!lastState) return;

        this.restoreGameState(lastState);
        this.updateVisualsAfterUndo();
        this.saveStateAfterUndo();

        console.log(`Undid move, back to ${this.currentPlayer} player's turn`);
    }

    private restoreGameState(lastState: any): void {
        this.boardState = lastState.boardState;
        this.currentPlayer = lastState.currentPlayer;
    }

    private updateVisualsAfterUndo(): void {
        this.clearAllVisualDots();
        this.recreateAllVisualDots();
        this.updateAllCellOwnership();
        this.updatePlayerIndicator();
        this.updateUndoButton();
    }

    private saveStateAfterUndo(): void {
        this.stateManager.saveToRegistry(
            this.boardState,
            this.currentPlayer,
            this.humanPlayer,
            this.computerPlayer?.getColor() || 'blue'
        );
    }

    quitGame(): void {
        this.clearSavedGameState();
        this.game.registry.set('gameWinner', 'Abandoned');
        this.scene.start('GameOver');
    }

    clearAllVisualDots(): void {
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                this.clearCellDots(row, col);
            }
        }
    }

    recreateAllVisualDots(): void {
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

    updateAllCellOwnership(): void {
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                this.updateCellOwnership(row, col);
            }
        }
    }

    loadGameState(): void {
        const savedState = this.stateManager.loadFromRegistry();
        if (!savedState) return;

        this.setupFromSavedState(savedState);
        this.handleGameOverIfNeeded(savedState);
    }

    private setupFromSavedState(savedState: any): void {
        const levelSetId = this.game.registry.get('currentLevelSetId') || 'default';
        const levelId = this.game.registry.get('currentLevelId') || 'level-1';

        this.setLevelPropertiesFromSavedState(levelId);
        this.restoreGameStateFromSave(savedState);
        this.setupAIFromSavedState(levelSetId, levelId, savedState);
    }

    private setLevelPropertiesFromSavedState(levelId: string): void {
        const level = getLevelById(levelId);
        if (level) {
            this.gridSize = Math.min(level.gridSize, Game.MAX_GRID_SIZE);
            this.blockedCells = level.blockedCells;
            
            if (level.gridSize > Game.MAX_GRID_SIZE) {
                console.warn(`Level ${levelId} grid size ${level.gridSize} exceeds maximum, clamped`);
            }
        }
    }

    private restoreGameStateFromSave(savedState: any): void {
        this.boardState = savedState.boardState;
        this.currentPlayer = savedState.currentPlayer;
        this.humanPlayer = savedState.humanPlayer;
    }

    private setupAIFromSavedState(levelSetId: string, levelId: string, savedState: any): void {
        const computerColor = savedState.computerPlayerColor;
        const aiDifficulty = getAIDifficultyForLevel(levelSetId, levelId);
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

    clearSavedGameState(): void {
        this.stateManager.clearSavedState();
    }

    checkWinCondition(): string | null {
        const cellCounts = this.countCellsByOwner();
        
        if (cellCounts.empty === 0) {
            if (cellCounts.red > 0 && cellCounts.blue === 0) {
                return 'Red';
            } else if (cellCounts.blue > 0 && cellCounts.red === 0) {
                return 'Blue';
            }
        }

        return null;
    }

    private countCellsByOwner(): { red: number; blue: number; empty: number } {
        let redCells = 0;
        let blueCells = 0;
        let emptyCells = 0;

        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cellState = this.boardState[row][col];
                
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

        return { red: redCells, blue: blueCells, empty: emptyCells };
    }

    handleGameOver(winner: string): void {
        if (this.game.registry.get('gameEnding')) {
            return;
        }
        
        this.game.registry.set('gameEnding', true);
        this.processGameEndResult(winner);
        this.scheduleSceneTransition(winner);
    }

    private processGameEndResult(winner: string): void {
        this.game.registry.set('gameWinner', winner);
        this.preserveLevelInfoForGameOver();
        
        if (winner !== 'Abandoned') {
            this.updateLevelCompletionStatus(winner);
        } else {
            this.clearSavedGameState();
        }
    }

    private preserveLevelInfoForGameOver(): void {
        const currentLevelSetId = this.game.registry.get('currentLevelSetId');
        const currentLevelId = this.game.registry.get('currentLevelId');
        
        if (!currentLevelSetId || !currentLevelId) {
            this.reconstructLevelInfo();
        }
    }

    private reconstructLevelInfo(): void {
        const savedState = this.stateManager.loadFromRegistry();
        const currentLevelIndex = savedState?.currentLevelIndex || 0;
        const levelSetId = this.settingsManager.getSetting('levelSetId');
        const levelSet = LEVEL_SETS.find(set => set.id === levelSetId);
        
        if (levelSet && currentLevelIndex < levelSet.levelEntries.length) {
            const levelId = levelSet.levelEntries[currentLevelIndex].levelId;
            this.game.registry.set('currentLevelSetId', levelSetId);
            this.game.registry.set('currentLevelId', levelId);
            console.log(`Reconstructed level info: ${levelSetId}/${levelId} (index ${currentLevelIndex})`);
        }
    }

    private updateLevelCompletionStatus(winner: string): void {
        const savedState = this.stateManager.loadFromRegistry();
        const currentLevelIndex = savedState?.currentLevelIndex || 0;
        
        if (winner === 'Red' || winner === 'Blue') {
            const winnerColor = winner.toLowerCase() as PlayerColor;
            this.stateManager.updateLevelCompletion(winnerColor, currentLevelIndex);
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
        if (winner === 'Abandoned') {
            return 'GameOver';
        }

        const savedState = this.stateManager.loadFromRegistry();
        const currentLevelIndex = savedState?.currentLevelIndex || 0;
        const levelSetId = this.settingsManager.getSetting('levelSetId');
        const levelSet = LEVEL_SETS.find(set => set.id === levelSetId);
        
        if (levelSet) {
            const isLastLevel = currentLevelIndex >= levelSet.levelEntries.length - 1;
            
            if (isLastLevel) {
                this.stateManager.markGameComplete(winner);
                return 'GameOver';
            } else {
                this.clearSavedGameState();
                return 'LevelOver';
            }
        }
        
        return 'GameOver';
    }

    async makeComputerMove(): Promise<void> {
        if (!this.isComputerMove()) {
            return;
        }

        try {
            const move = this.computerPlayer!.findMove(this.boardState, this.gridSize);
            console.log(`Computer (${this.computerPlayer!.getColor()}) choosing move: ${move.row}, ${move.col}`);

            if (this.isMoveValid(move)) {
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

    private isMoveValid(move: GameMove): boolean {
        const cellState = this.boardState[move.row][move.col];
        return cellState && 
               !cellState.isBlocked && 
               (cellState.dotCount === 0 || cellState.owner === this.currentPlayer);
    }

    private async makeRandomValidMove(): Promise<void> {
        const validMoves = this.getValidMoves();
        if (validMoves.length > 0) {
            const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
            await this.placeDot(randomMove.row, randomMove.col, true);
        } else {
            console.error('No valid moves available for computer');
        }
    }

    private getValidMoves(): GameMove[] {
        const validMoves: GameMove[] = [];

        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                if (this.isMoveValid({row, col})) {
                    validMoves.push({ row, col });
                }
            }
        }

        return validMoves;
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
            this.loadNewLevel();
        }
    }

    private handleSettingsChange(): void {
        this.game.registry.remove('settingsDirty');
        
        const currentLevelSetId = this.game.registry.get('currentLevelSetId');
        const newLevelSetId = this.settingsManager.getSetting('levelSetId');
        
        this.reloadAllSettings();
        
        if (this.hasLevelSetChanged(currentLevelSetId, newLevelSetId)) {
            this.loadFirstLevelOfSet(newLevelSetId);
        } else {
            this.updateUIAfterSettingsChange();
        }
    }

    private hasLevelSetChanged(currentLevelSetId: string, newLevelSetId: string): boolean {
        return currentLevelSetId !== newLevelSetId;
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

        const levelSetId = this.game.registry.get('currentLevelSetId') || 'default';
        const levelId = this.game.registry.get('currentLevelId') || 'level-1';
        const aiDifficulty = getAIDifficultyForLevel(levelSetId, levelId);

        this.computerPlayer = new ComputerPlayer(aiDifficulty, computerColor);
        this.currentPlayer = this.humanPlayer;

        console.log(`Settings reloaded: Human is ${this.humanPlayer}, Computer is ${computerColor} (${aiDifficulty})`);
    }
}