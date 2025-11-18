import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Phaser classes
vi.mock('phaser', () => ({
  Scene: class MockScene {
    constructor(public key: string) {}

    children = {
      removeAll: vi.fn()
    };

    input = {
      removeAllListeners: vi.fn()
    };

    time = {
      clearPendingEvents: vi.fn()
    };

    scene = {
      events: {
        removeAllListeners: vi.fn()
      },
      start: vi.fn()
    };
  },
  GameObjects: {},
  Cameras: {
    Scene2D: {
      Camera: class {}
    }
  }
}));

// Mock EventBus
vi.mock('../EventBus', () => ({
  EventBus: {
    emit: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn()
  }
}));

import { About } from './About';

// Enhanced MockText with EventEmitter support
class MockText {
  private eventHandlers: Map<string, Function[]> = new Map();
  private _text: string = '';
  private _backgroundColor: string = '#000000';

  constructor(text: string = '') {
    this._text = text;
  }

  setText(text: string): this {
    this._text = text;
    return this;
  }

  setBackgroundColor(color: string): this {
    this._backgroundColor = color;
    return this;
  }

  getBackgroundColor(): string {
    return this._backgroundColor;
  }

  setOrigin(x: number, y?: number): this {
    return this;
  }

  setInteractive(): this {
    return this;
  }

  removeInteractive(): this {
    return this;
  }

  destroy(): void {
    this.eventHandlers.clear();
  }

  on(event: string, handler: Function): this {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
    return this;
  }

  off(event: string, handler: Function): this {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
    return this;
  }

  listenerCount(event: string): number {
    const handlers = this.eventHandlers.get(event);
    return handlers ? handlers.length : 0;
  }

  emit(event: string): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler());
    }
  }
}

// Mock Image
class MockImage {
  setAlpha(alpha: number): this {
    return this;
  }

  destroy(): void {}
}

// Mock Camera
class MockCamera {
  setBackgroundColor(color: number): this {
    return this;
  }

  width: number = 800;
  height: number = 600;
}

// Mock scene setup
function createMockScene(): any {
  return {
    cameras: {
      main: new MockCamera()
    },
    add: {
      image: vi.fn(() => new MockImage()),
      text: vi.fn((x, y, text) => new MockText(text))
    },
    input: {
      removeAllListeners: vi.fn()
    },
    time: {
      clearPendingEvents: vi.fn()
    },
    scene: {
      events: {
        removeAllListeners: vi.fn(),
        on: vi.fn()
      },
      start: vi.fn()
    },
    events: {
      on: vi.fn()
    }
  };
}

describe('About Scene Event Cleanup', () => {
  let scene: About;
  let mockScene: any;

  beforeEach(() => {
    mockScene = createMockScene();
    scene = new About();
    Object.assign(scene, mockScene);
  });

  describe('button listener removal', () => {
    it('should remove all backButton listeners on shutdown', () => {
      scene.create();

      const backButton = scene.backButton as any;
      expect(backButton.listenerCount('pointerdown')).toBeGreaterThan(0);
      expect(backButton.listenerCount('pointerover')).toBeGreaterThan(0);
      expect(backButton.listenerCount('pointerout')).toBeGreaterThan(0);

      scene.shutdown();

      expect(backButton.listenerCount('pointerdown')).toBe(0);
      expect(backButton.listenerCount('pointerover')).toBe(0);
      expect(backButton.listenerCount('pointerout')).toBe(0);
    });

    it('should handle multiple shutdown calls safely', () => {
      scene.create();

      scene.shutdown();
      expect(() => scene.shutdown()).not.toThrow();
    });
  });

  describe('ghost interaction prevention', () => {
    it('should not trigger hover effect on back button after shutdown', () => {
      scene.create();

      const backButton = scene.backButton as any;
      const initialBgColor = backButton.getBackgroundColor();

      scene.shutdown();

      // Try to trigger hover - should not change background color
      backButton.emit('pointerover');
      expect(backButton.getBackgroundColor()).toBe(initialBgColor);
    });

    it('should not trigger scene transition after shutdown', () => {
      scene.create();

      const backButton = scene.backButton as any;

      scene.shutdown();

      const sceneStartSpy = scene.scene.start as any;
      sceneStartSpy.mockClear();

      // Try to click - should not start scene
      backButton.emit('pointerdown');
      expect(sceneStartSpy).not.toHaveBeenCalled();
    });
  });
});
