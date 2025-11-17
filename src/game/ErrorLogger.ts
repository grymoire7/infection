/**
 * Centralized error logging system for the game
 * Provides structured error reporting with context preservation
 */

export interface ErrorContext {
    component?: string;
    scene?: string;
    action?: string;
    gameState?: any;
    timestamp: number;
    userAgent?: string;
    stackTrace?: string;
}

export interface GameError {
    message: string;
    error: Error | unknown;
    context: ErrorContext;
    severity: 'low' | 'medium' | 'high' | 'critical';
    recoverable: boolean;
}

export class ErrorLogger {
    private static instance: ErrorLogger;
    private errorHistory: GameError[] = [];
    private maxHistorySize = 50;
    private localStorageKey = 'infection-game-errors';

    private constructor() {}

    static getInstance(): ErrorLogger {
        if (!ErrorLogger.instance) {
            ErrorLogger.instance = new ErrorLogger();
        }
        return ErrorLogger.instance;
    }

    /**
     * Log an error with context
     */
    logError(error: Error | unknown, message: string, context: Partial<ErrorContext> = {}): void {
        const gameError: GameError = {
            message,
            error,
            context: {
                timestamp: Date.now(),
                userAgent: navigator.userAgent,
                stackTrace: error instanceof Error ? error.stack : undefined,
                ...context
            },
            severity: this.determineSeverity(error, context),
            recoverable: this.isRecoverable(error, context)
        };

        this.errorHistory.push(gameError);
        this.trimHistory();
        this.persistError(gameError);
        this.outputToConsole(gameError);
    }

    /**
     * Log a Vue-specific error
     */
    logVueError(error: Error, instance: any, info: string): void {
        this.logError(error, `Vue error: ${info}`, {
            component: instance?.$options?.name || 'Unknown Vue Component',
            action: 'vue-lifecycle'
        });
    }

    /**
     * Log a Phaser-specific error
     */
    logPhaserError(error: Error | unknown, context: Partial<ErrorContext> = {}): void {
        this.logError(error, 'Phaser error', {
            ...context,
            action: context.action || 'phaser-lifecycle'
        });
    }

    /**
     * Log a scene transition error
     */
    logSceneError(error: Error | unknown, fromScene?: string, toScene?: string): void {
        this.logError(error, `Scene transition error: ${fromScene} → ${toScene}`, {
            scene: toScene || 'unknown',
            action: 'scene-transition'
        });
    }

    /**
     * Get recent errors for debugging
     */
    getRecentErrors(count: number = 10): GameError[] {
        return this.errorHistory.slice(-count);
    }

    /**
     * Get errors by severity
     */
    getErrorsBySeverity(severity: GameError['severity']): GameError[] {
        return this.errorHistory.filter(err => err.severity === severity);
    }

    /**
     * Clear error history
     */
    clearHistory(): void {
        this.errorHistory = [];
        localStorage.removeItem(this.localStorageKey);
    }

    /**
     * Export error data for debugging
     */
    exportErrors(): string {
        return JSON.stringify({
            timestamp: Date.now(),
            errorCount: this.errorHistory.length,
            errors: this.errorHistory
        }, null, 2);
    }

    private determineSeverity(error: Error | unknown, context: Partial<ErrorContext>): GameError['severity'] {
        // Critical errors that break the game
        if (context.component === 'PhaserGame' || context.action === 'game-initialization') {
            return 'critical';
        }

        // High severity for scene and state management errors
        if (context.scene || context.action?.includes('state')) {
            return 'high';
        }

        // Medium for recoverable errors
        if (this.isRecoverable(error, context)) {
            return 'medium';
        }

        return 'low';
    }

    private isRecoverable(error: Error | unknown, context: Partial<ErrorContext>): boolean {
        // Scene transition errors are often recoverable
        if (context.action === 'scene-transition') {
            return true;
        }

        // AI move errors are recoverable (fallback to random move)
        if (context.action?.includes('ai') || context.action?.includes('computer')) {
            return true;
        }

        // Network/resource errors might be recoverable
        if (error instanceof Error && (
            error.message.includes('Network') ||
            error.message.includes('fetch') ||
            error.message.includes('load')
        )) {
            return true;
        }

        return false;
    }

    private trimHistory(): void {
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
        }
    }

    private persistError(gameError: GameError): void {
        try {
            const existing = localStorage.getItem(this.localStorageKey);
            const errors = existing ? JSON.parse(existing) : [];
            errors.push(gameError);

            // Keep only last 100 errors in localStorage
            if (errors.length > 100) {
                errors.splice(0, errors.length - 100);
            }

            localStorage.setItem(this.localStorageKey, JSON.stringify(errors));
        } catch (e) {
            // Avoid infinite loops if localStorage is full
            console.warn('[ErrorLogger] Could not persist error to localStorage:', e);
        }
    }

    private outputToConsole(gameError: GameError): void {
        const { message, context, severity, recoverable } = gameError;
        const contextStr = `${context.component || context.scene || 'Unknown'}:${context.action || 'unknown'}`;

        const logMessage = `[${severity.toUpperCase()}] ${message} (${contextStr})`;

        switch (severity) {
            case 'critical':
                console.error(logMessage, gameError.error);
                break;
            case 'high':
                console.error(logMessage, gameError.error);
                break;
            case 'medium':
                console.warn(logMessage, gameError.error);
                break;
            case 'low':
                console.log(logMessage, gameError.error);
                break;
        }

        if (recoverable) {
            console.info(`ℹ️ Error is recoverable - game can continue`);
        }
    }
}

// Export singleton instance
export const errorLogger = ErrorLogger.getInstance();