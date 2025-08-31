export interface GameSettings {
    soundEffectsEnabled: boolean;
    difficultyLevel: string;
    playerColor: 'red' | 'blue';
    whoGoesFirst: 'player' | 'computer';
    levelSetId: string;
}

export class SettingsManager {
    private static readonly STORAGE_PREFIX = 'dotsGame_';
    private static readonly DEFAULT_SETTINGS: GameSettings = {
        soundEffectsEnabled: true,
        difficultyLevel: 'Easy',
        playerColor: 'red',
        whoGoesFirst: 'player',
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
            difficultyLevel: this.loadStringSetting('difficultyLevel', SettingsManager.DEFAULT_SETTINGS.difficultyLevel),
            playerColor: this.loadStringSetting('playerColor', SettingsManager.DEFAULT_SETTINGS.playerColor) as 'red' | 'blue',
            whoGoesFirst: this.loadStringSetting('whoGoesFirst', SettingsManager.DEFAULT_SETTINGS.whoGoesFirst) as 'player' | 'computer',
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
        this.saveStringSetting('difficultyLevel', settings.difficultyLevel);
        this.saveStringSetting('playerColor', settings.playerColor);
        this.saveStringSetting('whoGoesFirst', settings.whoGoesFirst);
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
            difficultyLevel: this.gameRegistry.get('difficultyLevel') ?? this.loadStringSetting('difficultyLevel', SettingsManager.DEFAULT_SETTINGS.difficultyLevel),
            playerColor: this.gameRegistry.get('playerColor') ?? this.loadStringSetting('playerColor', SettingsManager.DEFAULT_SETTINGS.playerColor),
            whoGoesFirst: this.gameRegistry.get('whoGoesFirst') ?? this.loadStringSetting('whoGoesFirst', SettingsManager.DEFAULT_SETTINGS.whoGoesFirst),
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
        this.gameRegistry.set('difficultyLevel', settings.difficultyLevel);
        this.gameRegistry.set('playerColor', settings.playerColor);
        this.gameRegistry.set('whoGoesFirst', settings.whoGoesFirst);
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
