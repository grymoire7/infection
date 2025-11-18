import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Phaser as a global
(global as any).Phaser = {
  Math: {
    Between: (min: number, max: number) => (min + max) / 2,
    DegToRad: (deg: number) => (deg * Math.PI) / 180
  }
};

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

    tweens = {
      addCounter: vi.fn(() => ({ stop: vi.fn(), isActive: () => true }))
    };
  },
  GameObjects: {},
  Math: {
    Between: (min: number, max: number) => (min + max) / 2,
    DegToRad: (deg: number) => (deg * Math.PI) / 180
  },
  Tweens: {
    TweenManager: class {}
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

import { MainMenu } from './MainMenu';

// Enhanced MockText with EventEmitter support
class MockText {
  private eventHandlers: Map<string, Function[]> = new Map();
  private _text: string = '';
  private _color: string = '#ffffff';
  private _scale: number = 1.0;
  private _visible: boolean = true;

  constructor(text: string = '') {
    this._text = text;
  }

  setText(text: string): this {
    this._text = text;
    return this;
  }

  getText(): string {
    return this._text;
  }

  setColor(color: string): this {
    this._color = color;
    return this;
  }

  getColor(): string {
    return this._color;
  }

  setScale(scale: number): this {
    this._scale = scale;
    return this;
  }

  getScale(): number {
    return this._scale;
  }

  setOrigin(x: number, y?: number): this {
    return this;
  }

  setDepth(depth: number): this {
    return this;
  }

  setInteractive(): this {
    return this;
  }

  removeInteractive(): this {
    return this;
  }

  setVisible(visible: boolean): this {
    this._visible = visible;
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
  destroy(): void {}
}

// Mock Sprite
class MockSprite {
  setScale(scale: number): this {
    return this;
  }

  toggleFlipX(): this {
    return this;
  }

  play(animKey: string): this {
    return this;
  }

  setDepth(depth: number): this {
    return this;
  }

  setData(key: string, value: any): this {
    return this;
  }

  getData(key: string): any {
    return 0;
  }

  destroy(): void {}

  x: number = 0;
  y: number = 0;
}

// Mock scene setup
function createMockScene(): any {
  return {
    cameras: {
      main: {
        width: 800,
        height: 600
      }
    },
    add: {
      image: vi.fn(() => new MockImage()),
      text: vi.fn((x, y, text) => new MockText(text)),
      sprite: vi.fn(() => new MockSprite())
    },
    input: {
      removeAllListeners: vi.fn()
    },
    time: {
      clearPendingEvents: vi.fn()
    },
    scene: {
      events: {
        removeAllListeners: vi.fn()
      },
      start: vi.fn()
    },
    tweens: {
      addCounter: vi.fn(() => ({ stop: vi.fn(), isActive: () => true }))
    }
  };
}

describe('MainMenu Scene Event Cleanup', () => {
  let scene: MainMenu;
  let mockScene: any;

  beforeEach(() => {
    mockScene = createMockScene();
    scene = new MainMenu();
    Object.assign(scene, mockScene);
  });

  describe('menu item listener removal', () => {
    it('should remove all listeners from all menu items on shutdown', () => {
      scene.create();

      // Check that all 5 menu items have listeners
      expect(scene.menuItems).toHaveLength(5);
      scene.menuItems.forEach((item: any) => {
        expect(item.listenerCount('pointerdown')).toBeGreaterThan(0);
        expect(item.listenerCount('pointerover')).toBeGreaterThan(0);
        expect(item.listenerCount('pointerout')).toBeGreaterThan(0);
      });

      scene.shutdown();

      // All listeners should be removed
      scene.menuItems.forEach((item: any) => {
        expect(item.listenerCount('pointerdown')).toBe(0);
        expect(item.listenerCount('pointerover')).toBe(0);
        expect(item.listenerCount('pointerout')).toBe(0);
      });
    });

    it('should remove pointerover listeners from Play Game menu item', () => {
      scene.create();

      const playGameItem = scene.menuItems[0] as any;
      expect(playGameItem.listenerCount('pointerover')).toBe(1);

      scene.shutdown();

      expect(playGameItem.listenerCount('pointerover')).toBe(0);
    });

    it('should remove pointerout listeners from Tutorial menu item', () => {
      scene.create();

      const tutorialItem = scene.menuItems[1] as any;
      expect(tutorialItem.listenerCount('pointerout')).toBe(1);

      scene.shutdown();

      expect(tutorialItem.listenerCount('pointerout')).toBe(0);
    });

    it('should handle multiple shutdown calls safely', () => {
      scene.create();

      scene.shutdown();
      expect(() => scene.shutdown()).not.toThrow();
    });
  });

  describe('ghost interaction prevention', () => {
    it('should not trigger hover effect after shutdown', () => {
      scene.create();

      const menuItem = scene.menuItems[0] as any;
      const initialColor = menuItem.getColor();

      scene.shutdown();

      // Try to trigger hover - should not change color
      menuItem.emit('pointerover');
      expect(menuItem.getColor()).toBe(initialColor);
    });

    it('should not trigger scene transition after shutdown', () => {
      scene.create();

      const menuItem = scene.menuItems[0] as any;

      scene.shutdown();

      const sceneStartSpy = scene.scene.start as any;
      sceneStartSpy.mockClear();

      // Try to click - should not start scene
      menuItem.emit('pointerdown');
      expect(sceneStartSpy).not.toHaveBeenCalled();
    });
  });
});
