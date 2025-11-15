import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Phaser classes
vi.mock('phaser', () => ({
    Scene: class MockScene {
        constructor(public key: string) {}

        // Mock required properties
        children = {
            removeAll: vi.fn()
        };

        input = {
            removeAllListeners: vi.fn()
        };

        time = {
            clearPendingEvents: vi.fn()
        };

        tweens = {
            addCounter: vi.fn(() => ({ stop: vi.fn(), isActive: () => true }))
        };
    },
    GameObjects: {
        GameObject: class MockGameObject {
            active = true;
            destroy = vi.fn();
        }
    }
}));

// Mock EventBusManager
vi.mock('./EventBus', () => ({
    EventBusManager: {
        removeListener: vi.fn(),
        on: vi.fn()
    }
}));

import { BaseScene } from './BaseScene';

// Create a concrete test scene that extends BaseScene and exposes protected methods
class TestScene extends BaseScene {
    public testCleanupExecuted = false;
    public testListenerCount = 0;

    constructor() {
        super('TestScene');
    }

    public addTestCleanup(): void {
        this.addCleanupTask(() => {
            this.testCleanupExecuted = true;
        });
    }

    public getProtectedProperties() {
        return {
            cleanupTasks: this.cleanupTasks,
            eventListeners: this.eventListeners,
            timers: this.timers,
            trackedTweens: this.trackedTweens
        };
    }

    public testProtectedMethods(): void {
        // Test protected methods through the public interface
        const callback = () => {};
        this.registerEventListener('test-event', callback);

        const mockTimer = { hasDispatched: false, remove: vi.fn() } as any;
        this.addTimer(mockTimer);

        const mockTween = { stop: vi.fn(), isActive: () => true } as any;
        this.addTween(mockTween);

        const mockObject = { active: true, destroy: vi.fn() } as any;
        this.safeDestroy(mockObject);

        const mockInteractive = { removeInteractive: vi.fn() } as any;
        this.safeRemoveInteractive(mockInteractive);

        const mockArray = [mockObject] as any;
        this.cleanupArray(mockArray);
    }

    // Public wrapper methods for testing protected methods
    public testAddCleanupTask(task: () => void): void {
        this.addCleanupTask(task);
    }

    public testRegisterEventListener(event: string, callback: Function): void {
        this.registerEventListener(event, callback);
    }

    public testAddTimer(timer: any): void {
        this.addTimer(timer);
    }

    public testAddTween(tween: any): void {
        this.addTween(tween);
    }

    public testSafeDestroy(obj: any): void {
        this.safeDestroy(obj);
    }

    public testSafeRemoveInteractive(obj: any): void {
        this.safeRemoveInteractive(obj);
    }

    public testCleanupArray(array: any[]): void {
        this.cleanupArray(array);
    }
}

describe('BaseScene', () => {
    let scene: TestScene;

    beforeEach(() => {
        scene = new TestScene();
    });

    describe('cleanup tasks', () => {
        it('should execute cleanup tasks during shutdown', () => {
            scene.addTestCleanup();
            expect(scene.testCleanupExecuted).toBe(false);

            scene.shutdown();

            expect(scene.testCleanupExecuted).toBe(true);
        });

        it('should handle multiple cleanup tasks', () => {
            let task1Executed = false;
            let task2Executed = false;

            scene.testAddCleanupTask(() => { task1Executed = true; });
            scene.testAddCleanupTask(() => { task2Executed = true; });

            scene.shutdown();

            expect(task1Executed).toBe(true);
            expect(task2Executed).toBe(true);
        });

        it('should handle cleanup task errors gracefully', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            scene.testAddCleanupTask(() => {
                throw new Error('Test error');
            });

            // Should not throw during shutdown
            expect(() => scene.shutdown()).not.toThrow();

            // Should log the error
            expect(consoleSpy).toHaveBeenCalledWith(
                'TestScene: Error during cleanup task',
                expect.any(Error)
            );

            consoleSpy.mockRestore();
        });
    });

    describe('event listener management', () => {
        it('should track event listeners for cleanup', () => {
            const callback = vi.fn();

            scene.testRegisterEventListener('test-event', callback);

            const protectedProps = scene.getProtectedProperties();
            expect(protectedProps.eventListeners).toHaveLength(1);
            expect(protectedProps.eventListeners[0]).toEqual({
                event: 'test-event',
                callback
            });
        });

        it('should register multiple listeners for the same event', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            scene.testRegisterEventListener('test-event', callback1);
            scene.testRegisterEventListener('test-event', callback2);

            const protectedProps = scene.getProtectedProperties();
            expect(protectedProps.eventListeners).toHaveLength(2);
        });
    });

    describe('timer management', () => {
        it('should track timers for cleanup', () => {
            const mockTimer = { hasDispatched: false, remove: vi.fn() } as any;

            scene.testAddTimer(mockTimer);

            const protectedProps = scene.getProtectedProperties();
            expect(protectedProps.timers).toContain(mockTimer);
        });
    });

    describe('tween management', () => {
        it('should track tweens for cleanup', () => {
            const mockTween = { stop: vi.fn(), isActive: () => true } as any;

            scene.testAddTween(mockTween);

            const protectedProps = scene.getProtectedProperties();
            expect(protectedProps.trackedTweens).toContain(mockTween);
        });
    });

    describe('shutdown process', () => {
        it('should call Phaser cleanup methods', () => {
            scene.shutdown();

            expect(scene.time.clearPendingEvents).toHaveBeenCalled();
            expect(scene.input.removeAllListeners).toHaveBeenCalled();
            expect(scene.children.removeAll).toHaveBeenCalledWith(true);
        });

        it('should reset all tracking arrays', () => {
            scene.testAddCleanupTask(() => {});
            scene.testRegisterEventListener('test', () => {});
            scene.testAddTimer({ hasDispatched: false, remove: vi.fn() } as any);
            scene.testAddTween({ stop: vi.fn(), isActive: () => true } as any);

            let protectedProps = scene.getProtectedProperties();
            expect(protectedProps.cleanupTasks).toHaveLength(1);
            expect(protectedProps.eventListeners).toHaveLength(1);
            expect(protectedProps.timers).toHaveLength(1);
            expect(protectedProps.trackedTweens).toHaveLength(1);

            scene.shutdown();

            protectedProps = scene.getProtectedProperties();
            expect(protectedProps.cleanupTasks).toHaveLength(0);
            expect(protectedProps.eventListeners).toHaveLength(0);
            expect(protectedProps.timers).toHaveLength(0);
            expect(protectedProps.trackedTweens).toHaveLength(0);
        });
    });

    describe('helper methods', () => {
        it('should safely destroy active game objects', () => {
            const mockObject = { active: true, destroy: vi.fn() } as any;

            scene.testSafeDestroy(mockObject);

            expect(mockObject.destroy).toHaveBeenCalled();
        });

        it('should not destroy inactive game objects', () => {
            const mockObject = { active: false, destroy: vi.fn() } as any;

            scene.testSafeDestroy(mockObject);

            expect(mockObject.destroy).not.toHaveBeenCalled();
        });

        it('should handle null objects safely', () => {
            expect(() => scene.testSafeDestroy(null)).not.toThrow();
            expect(() => scene.testSafeDestroy(undefined)).not.toThrow();
        });

        it('should safely remove interactive behavior', () => {
            const mockObject = {
                removeInteractive: vi.fn(),
                setInteractive: vi.fn()
            } as any;

            scene.testSafeRemoveInteractive(mockObject);

            expect(mockObject.removeInteractive).toHaveBeenCalled();
        });

        it('should handle objects without interactive methods safely', () => {
            const mockObject = {} as any;

            expect(() => scene.testSafeRemoveInteractive(mockObject)).not.toThrow();
        });

        it('should cleanup arrays of game objects', () => {
            const mockObject1 = { active: true, destroy: vi.fn() } as any;
            const mockObject2 = { active: true, destroy: vi.fn() } as any;
            const array = [mockObject1, mockObject2];

            scene.testCleanupArray(array);

            expect(mockObject1.destroy).toHaveBeenCalled();
            expect(mockObject2.destroy).toHaveBeenCalled();
            expect(array).toHaveLength(0);
        });
    });
});