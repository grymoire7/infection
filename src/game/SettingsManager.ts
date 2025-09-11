export interface GameSettings {
    soundEffectsEnabled: boolean;
    playerColor: 'red' | 'blue';
    levelSetId: string;
}

export class SettingsManager {
    private static readonly STORAGE_PREFIX = 'dotsGame_';
    private static readonly DEFAULT_SETTINGS: GameSettings = {
        soundEffectsEnabled: true,
        playerColor: 'red',
        levelSetId: 'default'
    };

    private gameRegistry: Phaser.Data.DataManager;

    constructor(gameRegistry: Phaser.Data.DataManager) {
        this.gameRegistry = gameRegistry;
    }

    /**
     * Load all settings from localStorage and sync with game registry
     */
    loadSettings(): GameSettings {
        const settings: GameSettings = {
            soundEffectsEnabled: this.loadBooleanSetting('soundEffects', SettingsManager.DEFAULT_SETTINGS.soundEffectsEnabled),
            playerColor: this.loadStringSetting('playerColor', SettingsManager.DEFAULT_SETTINGS.playerColor) as 'red' | 'blue',
            levelSetId: this.loadStringSetting('levelSetId', SettingsManager.DEFAULT_SETTINGS.levelSetId)
        };

        // Sync with game registry
        this.syncToRegistry(settings);

        return settings;
    }

    /**
     * Save all settings to localStorage and sync with game registry
     */
    saveSettings(settings: GameSettings): void {
        this.saveBooleanSetting('soundEffects', settings.soundEffectsEnabled);
        this.saveStringSetting('playerColor', settings.playerColor);
        this.saveStringSetting('levelSetId', settings.levelSetId);

        // Sync with game registry
        this.syncToRegistry(settings);

        // Mark settings as changed
        this.gameRegistry.set('settingsDirty', true);
    }

    /**
     * Get current settings from game registry, falling back to localStorage if needed
     */
    getCurrentSettings(): GameSettings {
        return {
            soundEffectsEnabled: this.gameRegistry.get('soundEffectsEnabled') ?? this.loadBooleanSetting('soundEffects', SettingsManager.DEFAULT_SETTINGS.soundEffectsEnabled),
            playerColor: this.gameRegistry.get('playerColor') ?? this.loadStringSetting('playerColor', SettingsManager.DEFAULT_SETTINGS.playerColor),
            levelSetId: this.gameRegistry.get('levelSetId') ?? this.loadStringSetting('levelSetId', SettingsManager.DEFAULT_SETTINGS.levelSetId)
        };
    }

    /**
     * Update a single setting
     */
    updateSetting<K extends keyof GameSettings>(key: K, value: GameSettings[K]): void {
        const currentSettings = this.getCurrentSettings();
        currentSettings[key] = value;
        this.saveSettings(currentSettings);
    }

    /**
     * Get a single setting value
     */
    getSetting<K extends keyof GameSettings>(key: K): GameSettings[K] {
        const currentSettings = this.getCurrentSettings();
        return currentSettings[key];
    }

    /**
     * Sync settings to game registry
     */
    private syncToRegistry(settings: GameSettings): void {
        this.gameRegistry.set('soundEffectsEnabled', settings.soundEffectsEnabled);
        this.gameRegistry.set('playerColor', settings.playerColor);
        this.gameRegistry.set('levelSetId', settings.levelSetId);
    }

    /**
     * Load a boolean setting from localStorage
     */
    private loadBooleanSetting(key: string, defaultValue: boolean): boolean {
        const saved = localStorage.getItem(SettingsManager.STORAGE_PREFIX + key);
        return saved !== null ? saved === 'true' : defaultValue;
    }

    /**
     * Load a string setting from localStorage
     */
    private loadStringSetting(key: string, defaultValue: string): string {
        const saved = localStorage.getItem(SettingsManager.STORAGE_PREFIX + key);
        return saved !== null ? saved : defaultValue;
    }

    /**
     * Save a boolean setting to localStorage
     */
    private saveBooleanSetting(key: string, value: boolean): void {
        localStorage.setItem(SettingsManager.STORAGE_PREFIX + key, value.toString());
    }

    /**
     * Save a string setting to localStorage
     */
    private saveStringSetting(key: string, value: string): void {
        localStorage.setItem(SettingsManager.STORAGE_PREFIX + key, value);
    }

    /**
     * Get default settings
     */
    static getDefaultSettings(): GameSettings {
        return { ...SettingsManager.DEFAULT_SETTINGS };
    }
}