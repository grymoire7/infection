import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SettingsManager, GameSettings } from './SettingsManager';

// Mock Phaser's DataManager
class MockDataManager {
  private data: Map<string, any> = new Map();

  get(key: string): any {
    return this.data.get(key);
  }

  set(key: string, value: any): void {
    this.data.set(key, value);
  }

  has(key: string): boolean {
    return this.data.has(key);
  }

  reset(): void {
    this.data.clear();
  }

  getAll(): Map<string, any> {
    return new Map(this.data);
  }
}

describe('SettingsManager', () => {
  let mockRegistry: MockDataManager;
  let settingsManager: SettingsManager;
  const STORAGE_PREFIX = 'dotsGame_';

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    // Create fresh mock registry
    mockRegistry = new MockDataManager();

    // Create settings manager (will load from localStorage on construction)
    settingsManager = new SettingsManager(mockRegistry as any);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with default settings when localStorage is empty', () => {
      const settings = settingsManager.getCurrentSettings();

      expect(settings.soundEffectsEnabled).toBe(true);
      expect(settings.playerColor).toBe('red');
      expect(settings.levelSetId).toBe('default');
    });

    it('should sync default settings to registry on initialization', () => {
      expect(mockRegistry.get('soundEffectsEnabled')).toBe(true);
      expect(mockRegistry.get('playerColor')).toBe('red');
      expect(mockRegistry.get('levelSetId')).toBe('default');
    });

    it('should load existing settings from localStorage on initialization', () => {
      localStorage.setItem(STORAGE_PREFIX + 'soundEffects', 'false');
      localStorage.setItem(STORAGE_PREFIX + 'playerColor', 'blue');
      localStorage.setItem(STORAGE_PREFIX + 'levelSetId', 'advanced');

      const newRegistry = new MockDataManager();
      const newManager = new SettingsManager(newRegistry as any);

      const settings = newManager.getCurrentSettings();
      expect(settings.soundEffectsEnabled).toBe(false);
      expect(settings.playerColor).toBe('blue');
      expect(settings.levelSetId).toBe('advanced');
    });

    it('should sync loaded settings to registry on initialization', () => {
      localStorage.setItem(STORAGE_PREFIX + 'soundEffects', 'false');
      localStorage.setItem(STORAGE_PREFIX + 'playerColor', 'blue');

      const newRegistry = new MockDataManager();
      new SettingsManager(newRegistry as any);

      expect(newRegistry.get('soundEffectsEnabled')).toBe(false);
      expect(newRegistry.get('playerColor')).toBe('blue');
    });
  });

  describe('saveSettings', () => {
    it('should save all settings to localStorage', () => {
      const newSettings: GameSettings = {
        soundEffectsEnabled: false,
        playerColor: 'blue',
        levelSetId: 'advanced',
      };

      settingsManager.saveSettings(newSettings);

      expect(localStorage.getItem(STORAGE_PREFIX + 'soundEffects')).toBe('false');
      expect(localStorage.getItem(STORAGE_PREFIX + 'playerColor')).toBe('blue');
      expect(localStorage.getItem(STORAGE_PREFIX + 'levelSetId')).toBe('advanced');
    });

    it('should sync settings to game registry', () => {
      const newSettings: GameSettings = {
        soundEffectsEnabled: false,
        playerColor: 'blue',
        levelSetId: 'advanced',
      };

      settingsManager.saveSettings(newSettings);

      expect(mockRegistry.get('soundEffectsEnabled')).toBe(false);
      expect(mockRegistry.get('playerColor')).toBe('blue');
      expect(mockRegistry.get('levelSetId')).toBe('advanced');
    });

    it('should set settingsDirty flag when saving', () => {
      const newSettings: GameSettings = {
        soundEffectsEnabled: false,
        playerColor: 'blue',
        levelSetId: 'default',
      };

      settingsManager.saveSettings(newSettings);

      expect(mockRegistry.get('settingsDirty')).toBe(true);
    });

    it('should set levelSetDirty flag when level set changes', () => {
      // Set up initial level set
      mockRegistry.set('currentLevelSet', { getId: () => 'default' });

      const newSettings: GameSettings = {
        soundEffectsEnabled: true,
        playerColor: 'red',
        levelSetId: 'advanced', // Different from current
      };

      settingsManager.saveSettings(newSettings);

      expect(mockRegistry.get('levelSetDirty')).toBe(true);
    });

    it('should not set levelSetDirty when level set stays the same', () => {
      mockRegistry.set('currentLevelSet', { getId: () => 'default' });

      const newSettings: GameSettings = {
        soundEffectsEnabled: false,
        playerColor: 'blue',
        levelSetId: 'default', // Same as current
      };

      settingsManager.saveSettings(newSettings);

      expect(mockRegistry.get('levelSetDirty')).toBeUndefined();
    });
  });

  describe('getCurrentSettings', () => {
    it('should return current settings from registry', () => {
      mockRegistry.set('soundEffectsEnabled', false);
      mockRegistry.set('playerColor', 'blue');
      mockRegistry.set('levelSetId', 'advanced');

      const settings = settingsManager.getCurrentSettings();

      expect(settings.soundEffectsEnabled).toBe(false);
      expect(settings.playerColor).toBe('blue');
      expect(settings.levelSetId).toBe('advanced');
    });

    it('should fall back to localStorage when registry value is undefined', () => {
      localStorage.setItem(STORAGE_PREFIX + 'soundEffects', 'false');
      localStorage.setItem(STORAGE_PREFIX + 'playerColor', 'blue');

      mockRegistry.reset();

      const settings = settingsManager.getCurrentSettings();

      expect(settings.soundEffectsEnabled).toBe(false);
      expect(settings.playerColor).toBe('blue');
    });

    it('should fall back to defaults when both registry and localStorage are empty', () => {
      localStorage.clear();
      mockRegistry.reset();

      const settings = settingsManager.getCurrentSettings();

      expect(settings.soundEffectsEnabled).toBe(true);
      expect(settings.playerColor).toBe('red');
      expect(settings.levelSetId).toBe('default');
    });
  });

  describe('updateSetting', () => {
    it('should update soundEffectsEnabled setting', () => {
      settingsManager.updateSetting('soundEffectsEnabled', false);

      expect(localStorage.getItem(STORAGE_PREFIX + 'soundEffects')).toBe('false');
      expect(mockRegistry.get('soundEffectsEnabled')).toBe(false);
    });

    it('should update playerColor setting', () => {
      settingsManager.updateSetting('playerColor', 'blue');

      expect(localStorage.getItem(STORAGE_PREFIX + 'playerColor')).toBe('blue');
      expect(mockRegistry.get('playerColor')).toBe('blue');
    });

    it('should update levelSetId setting', () => {
      settingsManager.updateSetting('levelSetId', 'advanced');

      expect(localStorage.getItem(STORAGE_PREFIX + 'levelSetId')).toBe('advanced');
      expect(mockRegistry.get('levelSetId')).toBe('advanced');
    });

    it('should preserve other settings when updating one', () => {
      settingsManager.saveSettings({
        soundEffectsEnabled: false,
        playerColor: 'blue',
        levelSetId: 'advanced',
      });

      settingsManager.updateSetting('soundEffectsEnabled', true);

      const settings = settingsManager.getCurrentSettings();
      expect(settings.soundEffectsEnabled).toBe(true);
      expect(settings.playerColor).toBe('blue');
      expect(settings.levelSetId).toBe('advanced');
    });

    it('should set settingsDirty flag when updating', () => {
      mockRegistry.set('settingsDirty', false);

      settingsManager.updateSetting('soundEffectsEnabled', false);

      expect(mockRegistry.get('settingsDirty')).toBe(true);
    });
  });

  describe('getSetting', () => {
    it('should get soundEffectsEnabled from registry first', () => {
      mockRegistry.set('soundEffectsEnabled', false);
      localStorage.setItem(STORAGE_PREFIX + 'soundEffects', 'true');

      const value = settingsManager.getSetting('soundEffectsEnabled');

      expect(value).toBe(false);
    });

    it('should fall back to localStorage when registry is empty', () => {
      mockRegistry.reset();
      localStorage.setItem(STORAGE_PREFIX + 'soundEffects', 'false');

      const value = settingsManager.getSetting('soundEffectsEnabled');

      expect(value).toBe(false);
    });

    it('should fall back to default when both registry and localStorage are empty', () => {
      mockRegistry.reset();
      localStorage.clear();

      const value = settingsManager.getSetting('soundEffectsEnabled');

      expect(value).toBe(true);
    });

    it('should get playerColor from registry first', () => {
      mockRegistry.set('playerColor', 'blue');
      localStorage.setItem(STORAGE_PREFIX + 'playerColor', 'red');

      const value = settingsManager.getSetting('playerColor');

      expect(value).toBe('blue');
    });

    it('should get levelSetId from registry first', () => {
      mockRegistry.set('levelSetId', 'advanced');
      localStorage.setItem(STORAGE_PREFIX + 'levelSetId', 'default');

      const value = settingsManager.getSetting('levelSetId');

      expect(value).toBe('advanced');
    });

    it('should throw error for unknown setting key', () => {
      expect(() => {
        settingsManager.getSetting('unknownKey' as any);
      }).toThrow('Unknown setting key: unknownKey');
    });
  });

  describe('Boolean Setting Storage', () => {
    it('should store true as string "true"', () => {
      settingsManager.updateSetting('soundEffectsEnabled', true);

      expect(localStorage.getItem(STORAGE_PREFIX + 'soundEffects')).toBe('true');
    });

    it('should store false as string "false"', () => {
      settingsManager.updateSetting('soundEffectsEnabled', false);

      expect(localStorage.getItem(STORAGE_PREFIX + 'soundEffects')).toBe('false');
    });

    it('should parse "true" string to boolean true', () => {
      localStorage.setItem(STORAGE_PREFIX + 'soundEffects', 'true');
      mockRegistry.reset();

      const value = settingsManager.getSetting('soundEffectsEnabled');

      expect(value).toBe(true);
      expect(typeof value).toBe('boolean');
    });

    it('should parse "false" string to boolean false', () => {
      localStorage.setItem(STORAGE_PREFIX + 'soundEffects', 'false');
      mockRegistry.reset();

      const value = settingsManager.getSetting('soundEffectsEnabled');

      expect(value).toBe(false);
      expect(typeof value).toBe('boolean');
    });
  });

  describe('String Setting Storage', () => {
    it('should store string values as-is', () => {
      settingsManager.updateSetting('playerColor', 'blue');

      expect(localStorage.getItem(STORAGE_PREFIX + 'playerColor')).toBe('blue');
    });

    it('should retrieve string values as-is', () => {
      localStorage.setItem(STORAGE_PREFIX + 'playerColor', 'blue');
      mockRegistry.reset();

      const value = settingsManager.getSetting('playerColor');

      expect(value).toBe('blue');
      expect(typeof value).toBe('string');
    });
  });

  describe('Storage Key Prefix', () => {
    it('should use correct prefix for soundEffects key', () => {
      settingsManager.updateSetting('soundEffectsEnabled', false);

      expect(localStorage.getItem('dotsGame_soundEffects')).toBe('false');
    });

    it('should use correct prefix for playerColor key', () => {
      settingsManager.updateSetting('playerColor', 'blue');

      expect(localStorage.getItem('dotsGame_playerColor')).toBe('blue');
    });

    it('should use correct prefix for levelSetId key', () => {
      settingsManager.updateSetting('levelSetId', 'advanced');

      expect(localStorage.getItem('dotsGame_levelSetId')).toBe('advanced');
    });
  });

  describe('getDefaultSettings (static)', () => {
    it('should return default settings object', () => {
      const defaults = SettingsManager.getDefaultSettings();

      expect(defaults.soundEffectsEnabled).toBe(true);
      expect(defaults.playerColor).toBe('red');
      expect(defaults.levelSetId).toBe('default');
    });

    it('should return a new object each time (not a reference)', () => {
      const defaults1 = SettingsManager.getDefaultSettings();
      const defaults2 = SettingsManager.getDefaultSettings();

      expect(defaults1).not.toBe(defaults2);
      expect(defaults1).toEqual(defaults2);
    });

    it('should not allow mutation of internal defaults', () => {
      const defaults = SettingsManager.getDefaultSettings();
      defaults.soundEffectsEnabled = false;

      const newDefaults = SettingsManager.getDefaultSettings();
      expect(newDefaults.soundEffectsEnabled).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should persist settings across manager instances', () => {
      const settings: GameSettings = {
        soundEffectsEnabled: false,
        playerColor: 'blue',
        levelSetId: 'advanced',
      };

      settingsManager.saveSettings(settings);

      // Create new manager instance
      const newRegistry = new MockDataManager();
      const newManager = new SettingsManager(newRegistry as any);

      const loadedSettings = newManager.getCurrentSettings();
      expect(loadedSettings).toEqual(settings);
    });

    it('should handle multiple setting updates in sequence', () => {
      settingsManager.updateSetting('soundEffectsEnabled', false);
      settingsManager.updateSetting('playerColor', 'blue');
      settingsManager.updateSetting('levelSetId', 'advanced');

      const settings = settingsManager.getCurrentSettings();
      expect(settings.soundEffectsEnabled).toBe(false);
      expect(settings.playerColor).toBe('blue');
      expect(settings.levelSetId).toBe('advanced');
    });

    it('should maintain registry-localStorage consistency', () => {
      const testSettings: GameSettings = {
        soundEffectsEnabled: false,
        playerColor: 'blue',
        levelSetId: 'advanced',
      };

      settingsManager.saveSettings(testSettings);

      // Check registry
      expect(mockRegistry.get('soundEffectsEnabled')).toBe(false);
      expect(mockRegistry.get('playerColor')).toBe('blue');
      expect(mockRegistry.get('levelSetId')).toBe('advanced');

      // Check localStorage
      expect(localStorage.getItem(STORAGE_PREFIX + 'soundEffects')).toBe('false');
      expect(localStorage.getItem(STORAGE_PREFIX + 'playerColor')).toBe('blue');
      expect(localStorage.getItem(STORAGE_PREFIX + 'levelSetId')).toBe('advanced');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string as level set ID', () => {
      settingsManager.updateSetting('levelSetId', '');

      expect(localStorage.getItem(STORAGE_PREFIX + 'levelSetId')).toBe('');
      expect(mockRegistry.get('levelSetId')).toBe('');
    });

    it('should handle reading when localStorage has invalid boolean value', () => {
      localStorage.setItem(STORAGE_PREFIX + 'soundEffects', 'invalid');
      mockRegistry.reset();

      const value = settingsManager.getSetting('soundEffectsEnabled');

      // Should be false because 'invalid' !== 'true'
      expect(value).toBe(false);
    });

    it('should not interfere with other localStorage keys', () => {
      localStorage.setItem('otherApp_setting', 'value');

      settingsManager.saveSettings({
        soundEffectsEnabled: false,
        playerColor: 'blue',
        levelSetId: 'advanced',
      });

      expect(localStorage.getItem('otherApp_setting')).toBe('value');
    });

    it('should handle registry without currentLevelSet when saving', () => {
      // Registry has no currentLevelSet
      const newSettings: GameSettings = {
        soundEffectsEnabled: false,
        playerColor: 'blue',
        levelSetId: 'advanced',
      };

      // Should not throw
      expect(() => {
        settingsManager.saveSettings(newSettings);
      }).not.toThrow();
    });
  });
});
