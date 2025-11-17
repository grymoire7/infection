import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorLogger } from './ErrorLogger';

describe('ErrorLogger', () => {
    let errorLogger: ErrorLogger;

    beforeEach(() => {
        errorLogger = ErrorLogger.getInstance();
        errorLogger.clearHistory();
        // Mock localStorage
        const localStorageMock = {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn(),
            length: 0,
            key: vi.fn()
        };
        Object.defineProperty(window, 'localStorage', {
            value: localStorageMock,
            writable: true
        });
    });

    afterEach(() => {
        errorLogger.clearHistory();
        vi.restoreAllMocks();
    });

    describe('logError', () => {
        it('should log an error with basic context', () => {
            const error = new Error('Test error');
            const message = 'Test message';

            errorLogger.logError(error, message);

            const errors = errorLogger.getRecentErrors();
            expect(errors).toHaveLength(1);
            expect(errors[0].message).toBe(message);
            expect(errors[0].error).toBe(error);
            expect(errors[0].context.timestamp).toBeTypeOf('number');
        });

        it('should include custom context', () => {
            const error = new Error('Test error');
            const context = {
                component: 'TestComponent',
                scene: 'TestScene',
                action: 'test-action'
            };

            errorLogger.logError(error, 'Test message', context);

            const errors = errorLogger.getRecentErrors();
            expect(errors[0].context.component).toBe('TestComponent');
            expect(errors[0].context.scene).toBe('TestScene');
            expect(errors[0].context.action).toBe('test-action');
        });

        it('should determine severity correctly', () => {
            const criticalError = new Error('Phaser initialization failed');
            errorLogger.logError(criticalError, 'Critical error', {
                component: 'PhaserGame',
                action: 'game-initialization'
            });

            const criticalErrors = errorLogger.getErrorsBySeverity('critical');
            expect(criticalErrors).toHaveLength(1);
            expect(criticalErrors[0].severity).toBe('critical');
        });

        it('should detect recoverable errors', () => {
            const networkError = new Error('Network request failed');
            errorLogger.logError(networkError, 'Network error');

            const errors = errorLogger.getRecentErrors();
            expect(errors[0].recoverable).toBe(true);
        });
    });

    describe('logVueError', () => {
        it('should log Vue-specific errors with proper context', () => {
            const error = new Error('Vue rendering error');
            const instance = { $options: { name: 'TestComponent' } };
            const info = 'render function';

            errorLogger.logVueError(error, instance, info);

            const errors = errorLogger.getRecentErrors();
            expect(errors[0].message).toBe('Vue error: render function');
            expect(errors[0].context.component).toBe('TestComponent');
            expect(errors[0].context.action).toBe('vue-lifecycle');
        });

        it('should handle unknown component names', () => {
            const error = new Error('Vue error');
            const instance = {};
            const info = 'mounted hook';

            errorLogger.logVueError(error, instance, info);

            const errors = errorLogger.getRecentErrors();
            expect(errors[0].context.component).toBe('Unknown Vue Component');
        });
    });

    describe('logPhaserError', () => {
        it('should log Phaser-specific errors', () => {
            const error = new Error('Scene transition failed');

            errorLogger.logPhaserError(error, {
                scene: 'Game',
                action: 'scene-transition'
            });

            const errors = errorLogger.getRecentErrors();
            expect(errors[0].message).toBe('Phaser error');
            expect(errors[0].context.scene).toBe('Game');
            expect(errors[0].context.action).toBe('scene-transition');
        });
    });

    describe('logSceneError', () => {
        it('should log scene transition errors', () => {
            const error = new Error('Could not load scene assets');

            errorLogger.logSceneError(error, 'MainMenu', 'Game');

            const errors = errorLogger.getRecentErrors();
            expect(errors[0].message).toBe('Scene transition error: MainMenu → Game');
            expect(errors[0].context.scene).toBe('Game');
            expect(errors[0].context.action).toBe('scene-transition');
        });
    });

    describe('getRecentErrors', () => {
        it('should return limited number of recent errors', () => {
            // Log 5 errors
            for (let i = 0; i < 5; i++) {
                errorLogger.logError(new Error(`Error ${i}`), `Message ${i}`);
            }

            const recent = errorLogger.getRecentErrors(3);
            expect(recent).toHaveLength(3);
            expect(recent[0].message).toBe('Message 2'); // Should get last 3
            expect(recent[2].message).toBe('Message 4');
        });
    });

    describe('getErrorsBySeverity', () => {
        it('should filter errors by severity', () => {
            // Log errors with different severities
            errorLogger.logError(new Error('Low error'), 'Low', { component: 'Other' });
            errorLogger.logError(new Error('High error'), 'High', { scene: 'Game' });
            errorLogger.logError(new Error('Another high error'), 'High', { scene: 'Menu' });

            const highErrors = errorLogger.getErrorsBySeverity('high');
            expect(highErrors).toHaveLength(2);
            highErrors.forEach(err => {
                expect(err.severity).toBe('high');
            });
        });
    });

    describe('clearHistory', () => {
        it('should clear all errors and localStorage', () => {
            errorLogger.logError(new Error('Test'), 'Test message');
            expect(errorLogger.getRecentErrors()).toHaveLength(1);

            errorLogger.clearHistory();
            expect(errorLogger.getRecentErrors()).toHaveLength(0);
            expect(localStorage.removeItem).toHaveBeenCalledWith('infection-game-errors');
        });
    });

    describe('exportErrors', () => {
        it('should export errors as JSON', () => {
            errorLogger.logError(new Error('Test error'), 'Test message');

            const exported = errorLogger.exportErrors();
            const parsed = JSON.parse(exported);

            expect(parsed.timestamp).toBeTypeOf('number');
            expect(parsed.errorCount).toBe(1);
            expect(parsed.errors).toHaveLength(1);
            expect(parsed.errors[0].message).toBe('Test message');
        });
    });

    describe('console output', () => {
        it('should output critical errors with console.error', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const error = new Error('Critical game error');

            errorLogger.logError(error, 'Critical', {
                component: 'PhaserGame',
                action: 'game-initialization'
            });

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('[CRITICAL] Critical (PhaserGame:game-initialization)'),
                error
            );

            consoleSpy.mockRestore();
        });

        it('should output medium errors with console.warn', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const error = new Error('Network error');

            errorLogger.logError(error, 'Network issue');

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('[MEDIUM] Network issue (Unknown:unknown)'),
                error
            );

            consoleSpy.mockRestore();
        });
    });

    describe('localStorage persistence', () => {
        it('should persist errors to localStorage', () => {
            const error = new Error('Persistent error');
            errorLogger.logError(error, 'Test message');

            expect(localStorage.setItem).toHaveBeenCalledWith(
                'infection-game-errors',
                expect.stringContaining('Test message')
            );
        });

        it('should handle localStorage errors gracefully', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            localStorage.setItem = vi.fn(() => {
                throw new Error('Storage full');
            });

            errorLogger.logError(new Error('Test'), 'Test message');

            expect(consoleSpy).toHaveBeenCalledWith(
                '[ErrorLogger] Could not persist error to localStorage:',
                expect.any(Error)
            );

            consoleSpy.mockRestore();
        });
    });
});