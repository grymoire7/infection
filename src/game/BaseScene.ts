import { Scene } from 'phaser';
import { EventBusManager } from './EventBus';
import { errorLogger, Logger } from './ErrorLogger';

/**
 * Base scene class that provides common cleanup and shutdown functionality
 * for all scenes in the game to prevent memory leaks.
 */
export abstract class BaseScene extends Scene {
    // Track cleanup tasks for this scene
    protected cleanupTasks: (() => void)[] = [];
    protected eventListeners: Array<{ event: string; callback: Function }> = [];
    protected timers: Phaser.Time.TimerEvent[] = [];
    protected trackedTweens: Phaser.Tweens.Tween[] = [];

    /**
     * Register a cleanup task to be executed during shutdown
     */
    protected addCleanupTask(task: () => void): void {
        this.cleanupTasks.push(task);
    }

    /**
     * Register an event listener that will be cleaned up during shutdown
     */
    protected registerEventListener(event: string, callback: Function, context?: any): void {
        // Store the event for cleanup
        this.eventListeners.push({ event, callback });

        // Register with EventBusManager for tracking
        EventBusManager.on(event, callback, context);
    }

    /**
     * Register a timer that will be stopped during shutdown
     */
    protected addTimer(timer: Phaser.Time.TimerEvent): void {
        this.timers.push(timer);
    }

    /**
     * Register a tween that will be stopped during shutdown
     */
    protected addTween(tween: Phaser.Tweens.Tween): void {
        this.trackedTweens.push(tween);
    }

    /**
     * Called when the scene is shutting down
     * Override this method to add scene-specific cleanup
     */
    public shutdown(): void {
        Logger.debug(`${this.constructor.name}: Starting shutdown cleanup`);

        // Stop all timers
        this.timers.forEach(timer => {
            if (timer && !timer.hasDispatched) {
                timer.remove();
            }
        });
        this.timers = [];

        // Stop all tweens
        this.trackedTweens.forEach(tween => {
            if (tween && tween.isActive()) {
                tween.stop();
            }
        });
        this.trackedTweens = [];

        // Remove event listeners from EventBusManager
        this.eventListeners.forEach(({ event, callback }) => {
            EventBusManager.removeListener(event, callback);
        });
        this.eventListeners = [];

        // Execute custom cleanup tasks
        this.cleanupTasks.forEach(task => {
            try {
                task();
            } catch (error) {
                Logger.error(`${this.constructor.name}: Error during cleanup task`, error);
            }
        });
        this.cleanupTasks = [];

        // Remove event listeners from Phaser objects
        this.input.removeAllListeners();

        // Clear timers
        this.time.clearPendingEvents();

        // Clean up display objects
        this.children.removeAll(true);

        Logger.debug(`${this.constructor.name}: Shutdown cleanup completed`);
    }

    /**
     * Helper method to safely destroy a game object
     */
    protected safeDestroy(object: Phaser.GameObjects.GameObject | null): void {
        if (object && object.active) {
            object.destroy();
        }
    }

    /**
     * Helper method to safely remove interactive behavior
     */
    protected safeRemoveInteractive(object: Phaser.GameObjects.GameObject & { setInteractive?: Function; removeInteractive?: Function }): void {
        if (object && object.removeInteractive) {
            object.removeInteractive();
        }
    }

    /**
     * Helper method to clean up an array of objects
     */
    protected cleanupArray<T extends Phaser.GameObjects.GameObject>(array: T[]): void {
        array.forEach(item => this.safeDestroy(item));
        array.length = 0;
    }

    /**
     * Safely transition to another scene with error handling
     */
    protected safeSceneTransition(targetScene: string, data?: any): void {
        try {
            const currentSceneName = this.constructor.name;
            Logger.debug(`[BaseScene] Transitioning from ${currentSceneName} to ${targetScene}`);

            this.scene.start(targetScene, data);
        } catch (error) {
            errorLogger.logSceneError(error, this.constructor.name, targetScene);
            Logger.error(`[BaseScene] Scene transition failed:`, error);

            // Fallback: try to go to MainMenu
            if (targetScene !== 'MainMenu') {
                try {
                    Logger.debug('[BaseScene] Falling back to MainMenu');
                    this.scene.start('MainMenu');
                } catch (fallbackError) {
                    Logger.error('[BaseScene] Fallback to MainMenu also failed:', fallbackError);
                    errorLogger.logSceneError(fallbackError, this.constructor.name, 'MainMenu');
                }
            }
        }
    }

    /**
     * Wrap a scene method with error handling
     */
    protected wrapWithErrorHandling(methodName: string, method: Function): Function {
        return (...args: any[]) => {
            try {
                return method.apply(this, args);
            } catch (error) {
                errorLogger.logPhaserError(error, {
                    component: 'Scene',
                    scene: this.constructor.name,
                    action: `scene-${methodName}`
                });
                Logger.error(`[${this.constructor.name}] Error in ${methodName}:`, error);

                // For critical scene methods, try to transition to safe state
                if (['create', 'init'].includes(methodName)) {
                    setTimeout(() => {
                        this.safeSceneTransition('MainMenu');
                    }, 100);
                }

                throw error;
            }
        };
    }
}