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

        // Add debugging in development mode
        if (process.env.NODE_ENV === 'development') {
            this.gameRegistry.events.on('changedata', (parent, key, value) => {
                if (['soundEffectsEnabled', 'playerColor', 'levelSetId'].includes(key)) {
                    console.log(`[SettingsManager] Setting changed: ${key} = ${value}`);
                    this.validateSetting(key as keyof GameSettings, value);
                }
            });
        }

        // Ensure registry is synced with localStorage on initialization
        this.loadSettings();
    }

    /**
     * Load all settings from localStorage and sync with game registry
     */
    private loadSettings(): GameSettings {
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
            playerColor: this.gameRegistry.get('playerColor') ?? this.loadStringSetting('playerColor', SettingsManager.DEFAULT_SETTINGS.playerColor) as 'red' | 'blue',
            levelSetId: this.gameRegistry.get('levelSetId') ?? this.loadStringSetting('levelSetId', SettingsManager.DEFAULT_SETTINGS.levelSetId)
        };
    }

    /**
     * Update a single setting
     */
    updateSetting<K extends keyof GameSettings>(key: K, value: GameSettings[K]): void {
        // Validate setting before updating
        this.validateSetting(key, value);

        const currentSettings = this.getCurrentSettings();
        currentSettings[key] = value;
        this.saveSettings(currentSettings);
    }

    /**
     * Get a single setting value - follows registry first, then localStorage, then defaults
     */
    getSetting<K extends keyof GameSettings>(key: K): GameSettings[K] {
        // Map setting keys to their storage keys and defaults
        const keyMappings = {
            soundEffectsEnabled: { storageKey: 'soundEffects', default: SettingsManager.DEFAULT_SETTINGS.soundEffectsEnabled },
            playerColor: { storageKey: 'playerColor', default: SettingsManager.DEFAULT_SETTINGS.playerColor },
            levelSetId: { storageKey: 'levelSetId', default: SettingsManager.DEFAULT_SETTINGS.levelSetId }
        };

        const mapping = keyMappings[key];
        if (!mapping) {
            throw new Error(`Unknown setting key: ${key}`);
        }

        // Try registry first, then localStorage, then default
        const registryValue = this.gameRegistry.get(key);
        if (registryValue !== undefined) {
            return registryValue;
        }

        // Fall back to localStorage
        if (key === 'soundEffectsEnabled') {
            return this.loadBooleanSetting(mapping.storageKey, mapping.default as boolean) as GameSettings[K];
        } else {
            return this.loadStringSetting(mapping.storageKey, mapping.default as string) as GameSettings[K];
        }
    }

    /**
     * Sync settings to game registry
     */
    private syncToRegistry(settings: GameSettings): void {
        this.gameRegistry.set('soundEffectsEnabled', settings.soundEffectsEnabled);
        this.gameRegistry.set('playerColor', settings.playerColor);

        // Needed to load first level of a new level set in the game scene
        const currentLevelSet = this.gameRegistry.get('currentLevelSet');
        if (currentLevelSet && currentLevelSet.getId() !== settings.levelSetId) {
            this.gameRegistry.set('levelSetDirty', true);
        }

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

    /**
     * Validate setting value (development only)
     */
    private validateSetting<K extends keyof GameSettings>(key: K, value: GameSettings[K]): void {
        if (process.env.NODE_ENV !== 'development') {
            return;
        }

        let error = '';

        switch (key) {
            case 'playerColor':
                if (value !== 'red' && value !== 'blue') {
                    error = `Invalid playerColor: ${value}`;
                }
                break;
            case 'soundEffectsEnabled':
                if (typeof value !== 'boolean') {
                    error = `Invalid soundEffectsEnabled: ${value}`;
                }
                break;
            case 'levelSetId':
                if (!value || typeof value !== 'string') {
                    error = `Invalid levelSetId: ${value}`;
                }
                break;
        }

        if (error) {
            console.error(`[SettingsManager] Validation failed for ${key}:`, error);
            throw new Error(error);
        }
    }
}