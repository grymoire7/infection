import { GameObjects, Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { LEVEL_SETS } from '../LevelDefinitions';
import { SettingsManager, GameSettings } from '../SettingsManager';

export class Settings extends Scene
{
    background: GameObjects.Image;
    title: GameObjects.Text;
    soundToggleButton: GameObjects.Text;
    playerColorButton: GameObjects.Text;
    whoGoesFirstButton: GameObjects.Text;
    levelSetButton: GameObjects.Text;
    
    private settingsManager: SettingsManager;
    private currentSettings: GameSettings;

    constructor ()
    {
        super('Settings');
    }

    create ()
    {
        // Initialize settings manager
        this.settingsManager = new SettingsManager(this.game.registry);
        this.currentSettings = this.settingsManager.loadSettings();
        
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        
        this.background = this.add.image(centerX, centerY, 'background');
        this.background.setAlpha(0.3);

        const titleFontSize = Math.min(48, this.cameras.main.width / 15);
        this.title = this.add.text(centerX, centerY * 0.25, 'Settings', {
            fontFamily: 'Arial Black', 
            fontSize: titleFontSize, 
            color: '#ffffff',
            stroke: '#000000', 
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5);


        // Responsive Sound Effects Toggle
        const labelFontSize = Math.min(24, this.cameras.main.width / 30);
        const labelX = centerX - 100;
        const labelY = centerY * 0.65;
        
        this.add.text(labelX, labelY, 'Sound Effects:', {
            fontFamily: 'Arial', 
            fontSize: labelFontSize, 
            color: '#ffffff'
        }).setOrigin(0, 0.5);

        this.soundToggleButton = this.add.text(labelX + 170, labelY, '', {
            fontFamily: 'Arial', 
            fontSize: labelFontSize, 
            color: '#ffffff',
            backgroundColor: '#666666',
            padding: { x: 15, y: 8 }
        }).setOrigin(0, 0.5);

        this.soundToggleButton.setInteractive();
        this.soundToggleButton.on('pointerdown', () => {
            this.toggleSoundEffects();
        });

        this.soundToggleButton.on('pointerover', () => {
            this.soundToggleButton.setBackgroundColor('#888888');
        });

        this.soundToggleButton.on('pointerout', () => {
            this.soundToggleButton.setBackgroundColor('#666666');
        });

        // Player Color Selection
        const playerColorLabelY = centerY * 0.8;
        this.add.text(labelX, playerColorLabelY, 'Player Color:', {
            fontFamily: 'Arial', 
            fontSize: labelFontSize, 
            color: '#ffffff'
        }).setOrigin(0, 0.5);

        this.playerColorButton = this.add.text(labelX + 170, playerColorLabelY, '', {
            fontFamily: 'Arial', 
            fontSize: labelFontSize, 
            color: '#ffffff',
            backgroundColor: '#666666',
            padding: { x: 15, y: 8 }
        }).setOrigin(0, 0.5);

        this.playerColorButton.setInteractive();
        this.playerColorButton.on('pointerdown', () => {
            this.togglePlayerColor();
        });

        this.playerColorButton.on('pointerover', () => {
            this.playerColorButton.setBackgroundColor('#888888');
        });

        this.playerColorButton.on('pointerout', () => {
            this.playerColorButton.setBackgroundColor('#666666');
        });

        // Level Set Selection
        const levelSetLabelY = centerY * 0.95;
        this.add.text(labelX, levelSetLabelY, 'Level Set:', {
            fontFamily: 'Arial', 
            fontSize: labelFontSize, 
            color: '#ffffff'
        }).setOrigin(0, 0.5);

        this.levelSetButton = this.add.text(labelX + 170, levelSetLabelY, '', {
            fontFamily: 'Arial', 
            fontSize: labelFontSize, 
            color: '#ffffff',
            backgroundColor: '#666666',
            padding: { x: 15, y: 8 }
        }).setOrigin(0, 0.5);

        this.levelSetButton.setInteractive();
        this.levelSetButton.on('pointerdown', () => {
            this.cycleLevelSet();
        });

        this.levelSetButton.on('pointerover', () => {
            this.levelSetButton.setBackgroundColor('#888888');
        });

        this.levelSetButton.on('pointerout', () => {
            this.levelSetButton.setBackgroundColor('#666666');
        });

        // Who Goes First Selection
        const whoGoesFirstLabelY = centerY * 1.1;
        this.add.text(labelX, whoGoesFirstLabelY, 'Who Goes First:', {
            fontFamily: 'Arial', 
            fontSize: labelFontSize, 
            color: '#ffffff'
        }).setOrigin(0, 0.5);

        this.whoGoesFirstButton = this.add.text(labelX + 180, whoGoesFirstLabelY, '', {
            fontFamily: 'Arial', 
            fontSize: labelFontSize, 
            color: '#ffffff',
            backgroundColor: '#666666',
            padding: { x: 15, y: 8 }
        }).setOrigin(0, 0.5);

        this.whoGoesFirstButton.setInteractive();
        this.whoGoesFirstButton.on('pointerdown', () => {
            this.toggleWhoGoesFirst();
        });

        this.whoGoesFirstButton.on('pointerover', () => {
            this.whoGoesFirstButton.setBackgroundColor('#888888');
        });

        this.whoGoesFirstButton.on('pointerout', () => {
            this.whoGoesFirstButton.setBackgroundColor('#666666');
        });

        this.updateSoundToggleButton();
        this.updatePlayerColorButton();
        this.updateLevelSetButton();
        this.updateWhoGoesFirstButton();

        EventBus.emit('current-scene-ready', this);
    }

    toggleSoundEffects()
    {
        this.currentSettings.soundEffectsEnabled = !this.currentSettings.soundEffectsEnabled;
        this.settingsManager.updateSetting('soundEffectsEnabled', this.currentSettings.soundEffectsEnabled);
        this.updateSoundToggleButton();
        
        console.log(`Sound effects ${this.currentSettings.soundEffectsEnabled ? 'enabled' : 'disabled'}`);
    }

    updateSoundToggleButton()
    {
        this.soundToggleButton.setText(this.currentSettings.soundEffectsEnabled ? 'ON' : 'OFF');
        this.soundToggleButton.setColor(this.currentSettings.soundEffectsEnabled ? '#00ff00' : '#ff0000');
    }


    togglePlayerColor()
    {
        this.currentSettings.playerColor = this.currentSettings.playerColor === 'red' ? 'blue' : 'red';
        this.settingsManager.updateSetting('playerColor', this.currentSettings.playerColor);
        this.updatePlayerColorButton();
        
        console.log(`Player color set to: ${this.currentSettings.playerColor}`);
    }

    updatePlayerColorButton()
    {
        this.playerColorButton.setText(this.currentSettings.playerColor.charAt(0).toUpperCase() + this.currentSettings.playerColor.slice(1));
        this.playerColorButton.setColor(this.currentSettings.playerColor === 'red' ? '#ff0000' : '#0000ff');
    }

    toggleWhoGoesFirst()
    {
        this.currentSettings.whoGoesFirst = this.currentSettings.whoGoesFirst === 'player' ? 'computer' : 'player';
        this.settingsManager.updateSetting('whoGoesFirst', this.currentSettings.whoGoesFirst);
        this.updateWhoGoesFirstButton();
        
        console.log(`Who goes first set to: ${this.currentSettings.whoGoesFirst}`);
    }

    cycleLevelSet()
    {
        const levelSets = LEVEL_SETS;
        const currentIndex = levelSets.findIndex(set => set.id === this.currentSettings.levelSetId);
        const nextIndex = (currentIndex + 1) % levelSets.length;
        this.currentSettings.levelSetId = levelSets[nextIndex].id;
        
        this.settingsManager.updateSetting('levelSetId', this.currentSettings.levelSetId);
        this.updateLevelSetButton();
        
        console.log(`Level Set changed to: ${this.currentSettings.levelSetId}`);
    }

    updateLevelSetButton()
    {
        const levelSet = LEVEL_SETS.find(set => set.id === this.currentSettings.levelSetId);
        const displayText = levelSet ? levelSet.name : 'Default Levels';
        this.levelSetButton.setText(displayText);
        this.levelSetButton.setColor('#ffffff');
    }

    updateWhoGoesFirstButton()
    {
        const displayText = this.currentSettings.whoGoesFirst === 'player' ? 'Player' : 'Computer';
        this.whoGoesFirstButton.setText(displayText);
        this.whoGoesFirstButton.setColor(this.currentSettings.whoGoesFirst === 'player' ? '#00ff00' : '#ffaa00');
    }
}
