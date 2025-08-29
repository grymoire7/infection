export interface Level {
    id: string;
    name: string;
    description: string;
    gridSize: number;
    blockedCells: { row: number; col: number }[];
    difficulty: number;
}

export interface LevelSet {
    id: string;
    name: string;
    description: string;
    levelIds: string[];
}

export interface GameState {
    dotCount: number;
    owner: 'red' | 'blue' | null;
    capacity: number;
    isBlocked: boolean;
}

export interface MoveHistoryEntry {
    boardState: GameState[][];
    currentPlayer: 'red' | 'blue';
}

export interface SavedGameState {
    boardState: GameState[][];
    currentPlayer: 'red' | 'blue';
    humanPlayer: 'red' | 'blue';
    computerPlayerColor: 'red' | 'blue';
    moveHistory: MoveHistoryEntry[];
    gameOver: boolean;
    winner: string | null;
}

export class GameStateManager {
    private static readonly MAX_MOVE_HISTORY = 50;
    private static readonly REGISTRY_KEY = 'gameState';

    private gameRegistry: Phaser.Data.DataManager;
    private moveHistory: MoveHistoryEntry[] = [];

    constructor(gameRegistry: Phaser.Data.DataManager) {
        this.gameRegistry = gameRegistry;
    }

    /**
     * Save a move to the history before it's made
     */
    saveMove(boardState: GameState[][], currentPlayer: 'red' | 'blue'): void {
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
        if (this.moveHistory.length === 0) {
            console.log('No moves to undo');
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
        boardState: GameState[][],
        currentPlayer: 'red' | 'blue',
        humanPlayer: 'red' | 'blue',
        computerPlayerColor: 'red' | 'blue',
        gameOver: boolean = false,
        winner: string | null = null
    ): void {
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
            boardState: move.boardState.map((row: GameState[]) => row.map((cell: GameState) => ({ ...cell }))),
            currentPlayer: move.currentPlayer
        }));

        // Return deep copy to prevent mutation
        return {
            boardState: savedState.boardState.map((row: GameState[]) => row.map((cell: GameState) => ({ ...cell }))),
            currentPlayer: savedState.currentPlayer,
            humanPlayer: savedState.humanPlayer,
            computerPlayerColor: savedState.computerPlayerColor,
            moveHistory: this.moveHistory,
            gameOver: savedState.gameOver,
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
}
