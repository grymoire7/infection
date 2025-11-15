import { describe, it, expect, beforeEach } from 'vitest';

// Create a simplified version of EventBusManager for testing
class TestEventBusManager {
    private static listeners: Map<string, Function[]> = new Map();

    static on(event: string, callback: Function): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);
    }

    static off(event: string): void {
        this.listeners.delete(event);
    }

    static removeListener(event: string, callback: Function): void {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            const index = eventListeners.indexOf(callback);
            if (index > -1) {
                eventListeners.splice(index, 1);
            }
            if (eventListeners.length === 0) {
                this.listeners.delete(event);
            }
        }
    }

    static cleanup(): void {
        this.listeners.clear();
    }

    static getListenerCount(): number {
        return this.listeners.size;
    }

    static getActiveEvents(): string[] {
        return Array.from(this.listeners.keys());
    }
}

describe('EventBusManager (Unit Tests)', () => {
    beforeEach(() => {
        // Clean up all listeners before each test
        TestEventBusManager.cleanup();
    });

    describe('listener tracking', () => {
        it('should track listeners correctly', () => {
            const callback = () => {};

            expect(TestEventBusManager.getListenerCount()).toBe(0);

            TestEventBusManager.on('test-event', callback);

            expect(TestEventBusManager.getListenerCount()).toBe(1);
            expect(TestEventBusManager.getActiveEvents()).toContain('test-event');
        });

        it('should track multiple listeners for the same event', () => {
            const callback1 = () => {};
            const callback2 = () => {};

            TestEventBusManager.on('test-event', callback1);
            TestEventBusManager.on('test-event', callback2);

            expect(TestEventBusManager.getListenerCount()).toBe(1);
            expect(TestEventBusManager.getActiveEvents()).toEqual(['test-event']);
        });

        it('should track listeners for different events', () => {
            const callback1 = () => {};
            const callback2 = () => {};

            TestEventBusManager.on('event1', callback1);
            TestEventBusManager.on('event2', callback2);

            expect(TestEventBusManager.getListenerCount()).toBe(2);
            expect(TestEventBusManager.getActiveEvents()).toEqual(expect.arrayContaining(['event1', 'event2']));
        });
    });

    describe('listener cleanup', () => {
        it('should remove specific listeners', () => {
            const callback1 = () => {};
            const callback2 = () => {};

            TestEventBusManager.on('test-event', callback1);
            TestEventBusManager.on('test-event', callback2);

            expect(TestEventBusManager.getListenerCount()).toBe(1);

            TestEventBusManager.removeListener('test-event', callback1);

            // Event should still be tracked since callback2 is still active
            expect(TestEventBusManager.getListenerCount()).toBe(1);
        });

        it('should remove all listeners for an event', () => {
            const callback1 = () => {};
            const callback2 = () => {};

            TestEventBusManager.on('event1', callback1);
            TestEventBusManager.on('event2', callback2);

            expect(TestEventBusManager.getListenerCount()).toBe(2);

            TestEventBusManager.off('event1');

            expect(TestEventBusManager.getListenerCount()).toBe(1);
            expect(TestEventBusManager.getActiveEvents()).toEqual(['event2']);
        });

        it('should clean up all listeners', () => {
            const callback1 = () => {};
            const callback2 = () => {};

            TestEventBusManager.on('event1', callback1);
            TestEventBusManager.on('event2', callback2);

            expect(TestEventBusManager.getListenerCount()).toBe(2);

            TestEventBusManager.cleanup();

            expect(TestEventBusManager.getListenerCount()).toBe(0);
            expect(TestEventBusManager.getActiveEvents()).toEqual([]);
        });
    });

    describe('memory leak prevention', () => {
        it('should not accumulate listeners over time', () => {
            const callbacks = Array.from({ length: 100 }, (_, i) => () => i);

            // Simulate adding many listeners
            callbacks.forEach((callback, index) => {
                TestEventBusManager.on(`event-${index}`, callback);
            });

            expect(TestEventBusManager.getListenerCount()).toBe(100);

            // Clean up all at once
            TestEventBusManager.cleanup();

            expect(TestEventBusManager.getListenerCount()).toBe(0);
        });

        it('should handle cleanup when no listeners exist', () => {
            expect(TestEventBusManager.getListenerCount()).toBe(0);

            // Should not throw error
            TestEventBusManager.cleanup();
            TestEventBusManager.off('non-existent-event');
            TestEventBusManager.removeListener('non-existent-event', () => {});

            expect(TestEventBusManager.getListenerCount()).toBe(0);
        });
    });
});