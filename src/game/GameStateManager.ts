import { Logger } from './ErrorLogger';
import { Level } from './Level';

export interface LevelDefinition {
    id: string;
    name: string;
    description: string;
    gridSize: number;
    blockedCells: { row: number; col: number }[];
}

export interface LevelSetDefinition {
    id: string;
    name: string;
    description: string;
    levelEntries: { levelId: string; aiDifficulty: 'easy' | 'medium' | 'hard' | 'expert' }[];
}

export interface CellState {
    dotCount: number;
    owner: 'red' | 'blue' | 'default' | 'blocked';
    capacity: number;
    isBlocked: boolean;
}

export interface MoveHistoryEntry {
    boardState: CellState[][];
    currentPlayer: 'red' | 'blue';
}

export interface SavedGameState {
    boardState: CellState[][];
    currentPlayer: 'red' | 'blue';
    humanPlayer: 'red' | 'blue';
    computerPlayerColor: 'red' | 'blue';
    moveHistory: MoveHistoryEntry[];
    gameOver: boolean;
    levelOver: boolean;
    currentLevel: Level;
    levelWinners: ('red' | 'blue')[];
    winner: string | null;
}

export class GameStateManager {
    private static readonly MAX_MOVE_HISTORY = 50;
    private static readonly REGISTRY_KEY = 'gameState';

    private gameRegistry: Phaser.Data.DataManager;
    private moveHistory: MoveHistoryEntry[] = [];

    constructor(gameRegistry: Phaser.Data.DataManager) {
        this.gameRegistry = gameRegistry;

        // Add debugging in development mode
        if (process.env.NODE_ENV === 'development') {
            this.gameRegistry.events.on('changedata', (parent, key, value) => {
                if (key === GameStateManager.REGISTRY_KEY) {
                    Logger.debug(`[GameStateManager] Game state changed`);
                    this.validateGameState(value);
                }
            });
        }
    }

    /**
     * Save a move to the history before it's made
     */
    saveMove(boardState: CellState[][], currentPlayer: 'red' | 'blue'): void {
        // Deep copy the current board state
        const boardStateCopy = boardState.map(row => 
            row.map(cell => ({ ...cell }))
        );

        // Save the state and current player
        this.moveHistory.push({
            boardState: boardStateCopy,
            currentPlayer: currentPlayer
        });

        // Limit history to prevent memory issues
        if (this.moveHistory.length > GameStateManager.MAX_MOVE_HISTORY) {
            this.moveHistory.shift();
        }
    }

    /**
     * Undo the last move and return the previous state
     */
    undoLastMove(): MoveHistoryEntry | null {
        if (this.canUndo() === false) {
            return null;
        }

        const lastState = this.moveHistory.pop();
        if (!lastState) return null;

        // Return deep copy to prevent mutation
        return {
            boardState: lastState.boardState.map(row => 
                row.map(cell => ({ ...cell }))
            ),
            currentPlayer: lastState.currentPlayer
        };
    }

    /**
     * Check if there are moves available to undo
     */
    canUndo(): boolean {
        return this.moveHistory.length > 0;
    }

    /**
     * Save current game state to persistent storage
     */
    saveToRegistry(
        boardState: CellState[][],
        currentPlayer: 'red' | 'blue',
        humanPlayer: 'red' | 'blue',
        computerPlayerColor: 'red' | 'blue',
        gameOver: boolean = false,
        levelOver: boolean = false,
        currentLevel: Level,
        levelWinners: ('red' | 'blue')[] = [],
        winner: string | null = null
    ): void {
        // Validate state before saving
        const savedState: SavedGameState = {
            boardState: boardState.map(row => row.map(cell => ({ ...cell }))),
            currentPlayer,
            humanPlayer,
            computerPlayerColor,
            moveHistory: this.moveHistory.map(move => ({
                boardState: move.boardState.map(row => row.map(cell => ({ ...cell }))),
                currentPlayer: move.currentPlayer
            })),
            gameOver,
            levelOver,
            currentLevel,
            levelWinners: [...levelWinners],
            winner
        };

        this.gameRegistry.set(GameStateManager.REGISTRY_KEY, savedState);
    }

    /**
     * Load game state from persistent storage
     */
    loadFromRegistry(): SavedGameState | null {
        const savedState = this.gameRegistry.get(GameStateManager.REGISTRY_KEY);
        if (!savedState) return null;

        // Restore move history
        this.moveHistory = savedState.moveHistory.map((move: MoveHistoryEntry) => ({
            boardState: move.boardState.map((row: CellState[]) => row.map((cell: CellState) => ({ ...cell }))),
            currentPlayer: move.currentPlayer
        }));

        // Return deep copy to prevent mutation
        return {
            boardState: savedState.boardState.map((row: CellState[]) => row.map((cell: CellState) => ({ ...cell }))),
            currentPlayer: savedState.currentPlayer,
            humanPlayer: savedState.humanPlayer,
            computerPlayerColor: savedState.computerPlayerColor,
            moveHistory: this.moveHistory,
            gameOver: savedState.gameOver,
            levelOver: savedState.levelOver,
            currentLevel: savedState.currentLevel,
            levelWinners: [...savedState.levelWinners],
            winner: savedState.winner
        };
    }

    /**
     * Clear saved game state from persistent storage
     */
    clearSavedState(): void {
        this.gameRegistry.remove(GameStateManager.REGISTRY_KEY);
        this.moveHistory = [];
    }

    /**
     * Check if there's a saved game state available
     */
    hasSavedState(): boolean {
        return this.gameRegistry.get(GameStateManager.REGISTRY_KEY) !== undefined;
    }

    /**
     * Get the current move history length
     */
    getMoveHistoryLength(): number {
        return this.moveHistory.length;
    }

    /**
     * Initialize a new game state with default values
     */
    initializeNewGameState(
        humanPlayerColor: 'red' | 'blue',
        currentLevel: Level
    ): void {
        this.moveHistory = [];
        const emptyBoardState: CellState[][] = [];
        const computerPlayerColor = humanPlayerColor === 'red' ? 'blue' : 'red';
        
        this.saveToRegistry(
            emptyBoardState,
            humanPlayerColor, // Start with human player
            humanPlayerColor,
            computerPlayerColor,
            false, // gameOver
            false, // levelOver
            currentLevel,
            [], // levelWinners
            null // winner
        );
    }

    /**
     * Update level completion status
     */
    updateLevelCompletion(winner: 'red' | 'blue', currentLevel: Level): void {
        const savedState = this.loadFromRegistry();
        if (!savedState) return;

        const updatedLevelWinners = [...savedState.levelWinners];
        updatedLevelWinners[currentLevel.getIndex()] = winner;

        this.saveToRegistry(
            savedState.boardState,
            savedState.currentPlayer,
            savedState.humanPlayer,
            savedState.computerPlayerColor,
            savedState.gameOver,
            true, // levelOver
            currentLevel,
            updatedLevelWinners,
            savedState.winner
        );
    }

    /**
     * Advance to next level
     * UNUSED - kept for potential future use
     */
    advanceToNextLevel(nextLevel: Level): void {
        const savedState = this.loadFromRegistry();
        if (!savedState) return;

        // Clear the move history for the new level
        this.moveHistory = [];

        this.saveToRegistry(
            [], // Empty board state for new level
            savedState.humanPlayer, // Reset to human player's turn
            savedState.humanPlayer,
            savedState.computerPlayerColor,
            false, // gameOver - cleared for new level
            false, // levelOver - cleared for new level
            nextLevel,
            savedState.levelWinners,
            null // winner - cleared for new level
        );
    }

    /**
     * Mark game as complete
     */
    markGameComplete(winner: string): void {
        const savedState = this.loadFromRegistry();
        if (!savedState) return;

        this.saveToRegistry(
            savedState.boardState,
            savedState.currentPlayer,
            savedState.humanPlayer,
            savedState.computerPlayerColor,
            true, // gameOver
            savedState.levelOver,
            savedState.currentLevel,
            savedState.levelWinners,
            winner
        );
    }

    /**
     * Validate game state structure and content (development only)
     * Only checks for truly invalid states, not legitimate game states like blocked cells
     */
    private validateGameState(state: SavedGameState): void {
        if (process.env.NODE_ENV !== 'development') {
            return;
        }

        const errors: string[] = [];

        // Validate board state structure
        if (!state.boardState || !Array.isArray(state.boardState)) {
            errors.push('Invalid boardState: must be an array');
        } else {
            state.boardState.forEach((row, rowIndex) => {
                if (!Array.isArray(row)) {
                    errors.push(`Invalid row ${rowIndex}: must be an array`);
                } else {
                    row.forEach((cell, cellIndex) => {
                        if (!cell || typeof cell !== 'object') {
                            errors.push(`Invalid cell [${rowIndex},${cellIndex}]: must be an object`);
                        } else if (typeof cell.dotCount !== 'number' || cell.dotCount < 0) {
                            errors.push(`Invalid cell [${rowIndex},${cellIndex}]: dotCount must be a non-negative number, got ${cell.dotCount}`);
                        } else if (!['red', 'blue', 'default', 'blocked'].includes(cell.owner)) {
                            errors.push(`Invalid cell [${rowIndex},${cellIndex}]: owner must be 'red', 'blue', 'default', or 'blocked', got ${cell.owner}`);
                        } else if (typeof cell.capacity !== 'number' || cell.capacity < 0) {
                            errors.push(`Invalid cell [${rowIndex},${cellIndex}]: capacity must be a non-negative number, got ${cell.capacity}`);
                        } else if (typeof cell.isBlocked !== 'boolean') {
                            errors.push(`Invalid cell [${rowIndex},${cellIndex}]: isBlocked must be a boolean, got ${cell.isBlocked}`);
                        }
                    });
                }
            });
        }

        // Validate players (allow undefined for some fields during initialization)
        if (state.currentPlayer && state.currentPlayer !== 'red' && state.currentPlayer !== 'blue') {
            errors.push(`Invalid currentPlayer: ${state.currentPlayer}`);
        }

        if (state.humanPlayer && state.humanPlayer !== 'red' && state.humanPlayer !== 'blue') {
            errors.push(`Invalid humanPlayer: ${state.humanPlayer}`);
        }

        if (state.computerPlayerColor && state.computerPlayerColor !== 'red' && state.computerPlayerColor !== 'blue') {
            errors.push(`Invalid computerPlayerColor: ${state.computerPlayerColor}`);
        }

        // Log validation errors (only for truly invalid states)
        if (errors.length > 0) {
            Logger.error('[GameStateManager] State validation failed:', errors);
            throw new Error(`Invalid game state: ${errors.join(', ')}`);
        }
    }
}