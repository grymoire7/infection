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
      }
    };
  },
  GameObjects: {}
}));

// Mock EventBus
vi.mock('../EventBus', () => ({
  EventBus: {
    emit: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn()
  }
}));

// Mock LevelDefinitions
vi.mock('../LevelDefinitions', () => ({
  LEVEL_SETS: [
    { id: 'default', name: 'Default Levels' },
    { id: 'advanced', name: 'Advanced Levels' }
  ]
}));

// Mock SettingsManager
vi.mock('../SettingsManager', () => ({
  SettingsManager: class MockSettingsManager {
    getCurrentSettings() {
      return {
        soundEffectsEnabled: true,
        playerColor: 'red',
        levelSetId: 'default'
      };
    }
    updateSetting(key: string, value: any) {}
  }
}));

import { Settings } from './Settings';

// Enhanced MockText with EventEmitter support
class MockText {
  private eventHandlers: Map<string, Function[]> = new Map();
  private _text: string = '';
  private _color: string = '#ffffff';
  private _backgroundColor: string = '#000000';
  private _visible: boolean = true;
  private _tint: number | undefined;

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

  setBackgroundColor(color: string): this {
    this._backgroundColor = color;
    return this;
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

// Enhanced MockSprite with tint support
class MockSprite {
  private eventHandlers: Map<string, Function[]> = new Map();
  private _texture: string = '';
  private _tint: number | undefined;

  setScale(scale: number): this {
    return this;
  }

  setOrigin(x: number, y?: number): this {
    return this;
  }

  setTexture(texture: string): this {
    this._texture = texture;
    return this;
  }

  play(animKey: string): this {
    return this;
  }

  setTint(tint: number): this {
    this._tint = tint;
    return this;
  }

  clearTint(): this {
    this._tint = undefined;
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
}

// Mock Image
class MockImage {
  setAlpha(alpha: number): this {
    return this;
  }

  destroy(): void {}
}

// Mock scene setup
function createMockScene(): any {
  const mockRegistry = {
    get: vi.fn((key: string) => {
      if (key === 'soundEffectsEnabled') return 'true';
      if (key === 'playerColor') return 'red';
      if (key === 'levelSetId') return 'default';
      if (key === 'currentLevelSet') return null;
      return undefined;
    }),
    set: vi.fn()
  };

  const mockGame = {
    registry: mockRegistry
  };

  return {
    cameras: {
      main: {
        width: 800,
        height: 600
      }
    },
    game: mockGame,
    add: {
      image: vi.fn(() => new MockImage()),
      text: vi.fn(() => new MockText()),
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
      }
    }
  };
}

describe('Settings Scene Event Cleanup', () => {
  let scene: Settings;
  let mockScene: any;

  beforeEach(() => {
    mockScene = createMockScene();
    scene = new Settings();
    Object.assign(scene, mockScene);
  });

  describe('button listener removal', () => {
    it('should remove all soundToggleButton listeners on shutdown', () => {
      scene.create();

      const soundButton = scene.soundToggleButton;
      expect(soundButton.listenerCount('pointerdown')).toBeGreaterThan(0);
      expect(soundButton.listenerCount('pointerover')).toBeGreaterThan(0);
      expect(soundButton.listenerCount('pointerout')).toBeGreaterThan(0);

      scene.shutdown();

      expect(soundButton.listenerCount('pointerdown')).toBe(0);
      expect(soundButton.listenerCount('pointerover')).toBe(0);
      expect(soundButton.listenerCount('pointerout')).toBe(0);
    });

    it('should remove all playerColorButton listeners on shutdown', () => {
      scene.create();

      const playerButton = scene.playerColorButton;
      expect(playerButton.listenerCount('pointerdown')).toBeGreaterThan(0);
      expect(playerButton.listenerCount('pointerover')).toBeGreaterThan(0);
      expect(playerButton.listenerCount('pointerout')).toBeGreaterThan(0);

      scene.shutdown();

      expect(playerButton.listenerCount('pointerdown')).toBe(0);
      expect(playerButton.listenerCount('pointerover')).toBe(0);
      expect(playerButton.listenerCount('pointerout')).toBe(0);
    });

    it('should remove all levelSetButton listeners on shutdown', () => {
      scene.create();

      const levelSetButton = scene.levelSetButton;
      expect(levelSetButton.listenerCount('pointerdown')).toBeGreaterThan(0);
      expect(levelSetButton.listenerCount('pointerover')).toBeGreaterThan(0);
      expect(levelSetButton.listenerCount('pointerout')).toBeGreaterThan(0);

      scene.shutdown();

      expect(levelSetButton.listenerCount('pointerdown')).toBe(0);
      expect(levelSetButton.listenerCount('pointerover')).toBe(0);
      expect(levelSetButton.listenerCount('pointerout')).toBe(0);
    });

    it('should handle multiple shutdown calls safely', () => {
      scene.create();

      scene.shutdown();
      expect(() => scene.shutdown()).not.toThrow();
    });
  });

  describe('ghost interaction prevention', () => {
    it('should not call sound toggle handler after shutdown', () => {
      scene.create();

      const soundButton = scene.soundToggleButton;
      const initialSoundSetting = scene.currentSettings.soundEffectsEnabled;

      scene.shutdown();

      soundButton.emit('pointerdown');

      // Setting should not have changed
      expect(scene.currentSettings.soundEffectsEnabled).toBe(initialSoundSetting);
    });

    it('should not change player sprite tint after shutdown', () => {
      scene.create();

      const playerButton = scene.playerColorButton;
      const playerSprite = scene.playerSprite;

      scene.shutdown();

      // Should not throw and tint should remain undefined
      playerButton.emit('pointerover');
      expect(playerSprite._tint).toBeUndefined();
    });
  });
});
