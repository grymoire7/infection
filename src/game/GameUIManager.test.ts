import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameUIManager } from './GameUIManager';

// Mock Phaser's Text GameObject
class MockText {
  x: number;
  y: number;
  text: string;
  style: any;
  originX: number = 0;
  originY: number = 0;
  alpha: number = 1;
  interactive: boolean = false;
  backgroundColor: string = '';
  private eventHandlers: Map<string, Function> = new Map();

  constructor(x: number, y: number, text: string, style: any) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.style = style;
    this.backgroundColor = style?.backgroundColor || '';
  }

  setOrigin(x: number, y?: number): this {
    this.originX = x;
    this.originY = y !== undefined ? y : x;
    return this;
  }

  setAlpha(alpha: number): this {
    this.alpha = alpha;
    return this;
  }

  setInteractive(): this {
    this.interactive = true;
    return this;
  }

  removeInteractive(): this {
    this.interactive = false;
    return this;
  }

  setBackgroundColor(color: string): this {
    this.backgroundColor = color;
    return this;
  }

  setText(text: string): this {
    this.text = text;
    return this;
  }

  on(event: string, handler: Function): this {
    this.eventHandlers.set(event, handler);
    return this;
  }

  emit(event: string): void {
    const handler = this.eventHandlers.get(event);
    if (handler) handler();
  }
}

// Mock Phaser's Sprite GameObject
class MockSprite {
  x: number;
  y: number;
  texture: string;
  scaleX: number = 1;
  scaleY: number = 1;
  currentAnim: string = '';

  constructor(x: number, y: number, texture: string) {
    this.x = x;
    this.y = y;
    this.texture = texture;
  }

  setScale(scale: number): this {
    this.scaleX = scale;
    this.scaleY = scale;
    return this;
  }

  setTexture(texture: string): this {
    this.texture = texture;
    return this;
  }

  play(anim: string): this {
    this.currentAnim = anim;
    return this;
  }
}

// Mock Phaser's Scene
class MockScene {
  cameras = {
    main: {
      width: 800,
      height: 600,
    },
  };

  add = {
    text: vi.fn((x: number, y: number, text: string, style: any) => {
      return new MockText(x, y, text, style);
    }),
    sprite: vi.fn((x: number, y: number, texture: string) => {
      return new MockSprite(x, y, texture);
    }),
  };
}

describe('GameUIManager', () => {
  let mockScene: MockScene;
  let uiManager: GameUIManager;

  beforeEach(() => {
    mockScene = new MockScene();
    uiManager = new GameUIManager(mockScene as any);
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create UI manager with scene reference', () => {
      expect(uiManager).toBeDefined();
    });
  });

  describe('createUI', () => {
    it('should create all UI elements', () => {
      uiManager.createUI();

      // Title, instructions, level info, AI difficulty, undo button, quit button, player sprite
      expect(mockScene.add.text).toHaveBeenCalled();
      expect(mockScene.add.sprite).toHaveBeenCalledTimes(1);
    });

    it('should return UI element references', () => {
      const ui = uiManager.createUI();

      expect(ui.levelInfoText).toBeDefined();
      expect(ui.aiDifficultyText).toBeDefined();
      expect(ui.undoButton).toBeDefined();
      expect(ui.quitButton).toBeDefined();
      expect(ui.currentPlayerSprite).toBeDefined();
    });

    it('should create title with correct text', () => {
      uiManager.createUI();

      const titleCall = (mockScene.add.text as any).mock.calls.find((call: any) =>
        call[2] === 'Infection!'
      );
      expect(titleCall).toBeDefined();
    });

    it('should create title centered at top', () => {
      uiManager.createUI();

      const titleCall = (mockScene.add.text as any).mock.calls.find((call: any) =>
        call[2] === 'Infection!'
      );
      expect(titleCall[0]).toBe(400); // width / 2
      expect(titleCall[1]).toBe(30);
    });

    it('should create instructions at bottom', () => {
      uiManager.createUI();

      const instructionsCall = (mockScene.add.text as any).mock.calls.find((call: any) =>
        call[2] === 'Click on a cell to place a dot'
      );
      expect(instructionsCall).toBeDefined();
      expect(instructionsCall[1]).toBe(560); // height - 40
    });

    it('should create level info text', () => {
      const ui = uiManager.createUI();

      expect(ui.levelInfoText).toBeDefined();
      expect(ui.levelInfoText.text).toBe('');
    });

    it('should create AI difficulty text with default', () => {
      const ui = uiManager.createUI();

      expect(ui.aiDifficultyText).toBeDefined();
      expect(ui.aiDifficultyText.text).toBe('AI: easy');
    });

    it('should create undo button', () => {
      const ui = uiManager.createUI();

      expect(ui.undoButton).toBeDefined();
      expect(ui.undoButton.text).toBe('Undo');
      expect((ui.undoButton as any).backgroundColor).toBe('#666666');
    });

    it('should create quit button', () => {
      const ui = uiManager.createUI();

      expect(ui.quitButton).toBeDefined();
      expect(ui.quitButton.text).toBe('Quit');
      expect((ui.quitButton as any).backgroundColor).toBe('#aa4444');
    });

    it('should create player sprite with red by default', () => {
      const ui = uiManager.createUI();

      expect(ui.currentPlayerSprite).toBeDefined();
      expect(ui.currentPlayerSprite.texture).toBe('evil-sprite');
      expect((ui.currentPlayerSprite as any).currentAnim).toBe('evil-dot-pulse');
    });

    it('should make undo button interactive', () => {
      const ui = uiManager.createUI();

      expect((ui.undoButton as any).interactive).toBe(true);
    });

    it('should make quit button interactive', () => {
      const ui = uiManager.createUI();

      expect((ui.quitButton as any).interactive).toBe(true);
    });
  });

  describe('updatePlayerIndicator', () => {
    it('should update sprite to red', () => {
      const ui = uiManager.createUI();

      uiManager.updatePlayerIndicator('red');

      expect(ui.currentPlayerSprite.texture).toBe('evil-sprite');
      expect((ui.currentPlayerSprite as any).currentAnim).toBe('evil-dot-pulse');
    });

    it('should update sprite to blue', () => {
      const ui = uiManager.createUI();

      uiManager.updatePlayerIndicator('blue');

      expect(ui.currentPlayerSprite.texture).toBe('good-sprite');
      expect((ui.currentPlayerSprite as any).currentAnim).toBe('good-dot-pulse');
    });

    it('should switch between red and blue', () => {
      const ui = uiManager.createUI();

      uiManager.updatePlayerIndicator('blue');
      expect(ui.currentPlayerSprite.texture).toBe('good-sprite');

      uiManager.updatePlayerIndicator('red');
      expect(ui.currentPlayerSprite.texture).toBe('evil-sprite');

      uiManager.updatePlayerIndicator('blue');
      expect(ui.currentPlayerSprite.texture).toBe('good-sprite');
    });
  });

  describe('updateUndoButton', () => {
    it('should enable undo button when can undo', () => {
      const ui = uiManager.createUI();

      uiManager.updateUndoButton(true);

      expect(ui.undoButton.alpha).toBe(1);
      expect((ui.undoButton as any).interactive).toBe(true);
    });

    it('should disable undo button when cannot undo', () => {
      const ui = uiManager.createUI();

      uiManager.updateUndoButton(false);

      expect(ui.undoButton.alpha).toBe(0.5);
      expect((ui.undoButton as any).interactive).toBe(false);
    });

    it('should toggle undo button state', () => {
      const ui = uiManager.createUI();

      uiManager.updateUndoButton(true);
      expect((ui.undoButton as any).interactive).toBe(true);

      uiManager.updateUndoButton(false);
      expect((ui.undoButton as any).interactive).toBe(false);

      uiManager.updateUndoButton(true);
      expect((ui.undoButton as any).interactive).toBe(true);
    });
  });

  describe('setUndoButtonHandler', () => {
    it('should register undo button click handler', () => {
      const ui = uiManager.createUI();
      const handler = vi.fn();

      uiManager.setUndoButtonHandler(handler);
      ui.undoButton.emit('pointerdown');

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('setQuitButtonHandler', () => {
    it('should register quit button click handler', () => {
      const ui = uiManager.createUI();
      const handler = vi.fn();

      uiManager.setQuitButtonHandler(handler);
      ui.quitButton.emit('pointerdown');

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('updateAIDifficulty', () => {
    it('should update AI difficulty text to easy', () => {
      const ui = uiManager.createUI();

      uiManager.updateAIDifficulty('easy');

      expect(ui.aiDifficultyText.text).toBe('AI: easy');
    });

    it('should update AI difficulty text to medium', () => {
      const ui = uiManager.createUI();

      uiManager.updateAIDifficulty('medium');

      expect(ui.aiDifficultyText.text).toBe('AI: medium');
    });

    it('should update AI difficulty text to hard', () => {
      const ui = uiManager.createUI();

      uiManager.updateAIDifficulty('hard');

      expect(ui.aiDifficultyText.text).toBe('AI: hard');
    });

    it('should update AI difficulty text to expert', () => {
      const ui = uiManager.createUI();

      uiManager.updateAIDifficulty('expert');

      expect(ui.aiDifficultyText.text).toBe('AI: expert');
    });
  });

  describe('updateLevelInfo', () => {
    it('should update level info text', () => {
      const ui = uiManager.createUI();

      uiManager.updateLevelInfo('Basic Levels', 'Level 1');

      expect(ui.levelInfoText.text).toBe('Now playing Basic Levels on level Level 1');
    });

    it('should handle different level set names', () => {
      const ui = uiManager.createUI();

      uiManager.updateLevelInfo('Advanced Challenges', 'The Cross');

      expect(ui.levelInfoText.text).toBe('Now playing Advanced Challenges on level The Cross');
    });
  });

  describe('disableUndoButton', () => {
    it('should disable and fade undo button', () => {
      const ui = uiManager.createUI();

      uiManager.disableUndoButton();

      expect((ui.undoButton as any).interactive).toBe(false);
      expect(ui.undoButton.alpha).toBe(0.3);
    });
  });

  describe('disableQuitButton', () => {
    it('should disable and fade quit button', () => {
      const ui = uiManager.createUI();

      uiManager.disableQuitButton();

      expect((ui.quitButton as any).interactive).toBe(false);
      expect(ui.quitButton.alpha).toBe(0.3);
    });
  });

  describe('showGameOverScreen', () => {
    it('should display winner message for Red', () => {
      uiManager.createUI();
      const onRestart = vi.fn();

      uiManager.showGameOverScreen('Red', onRestart);

      const winnerCall = (mockScene.add.text as any).mock.calls.find((call: any) =>
        call[2].includes('Red Player Wins!')
      );
      expect(winnerCall).toBeDefined();
    });

    it('should display winner message for Blue', () => {
      uiManager.createUI();
      const onRestart = vi.fn();

      uiManager.showGameOverScreen('Blue', onRestart);

      const winnerCall = (mockScene.add.text as any).mock.calls.find((call: any) =>
        call[2].includes('Blue Player Wins!')
      );
      expect(winnerCall).toBeDefined();
    });

    it('should use red color for Red winner', () => {
      uiManager.createUI();
      const onRestart = vi.fn();

      uiManager.showGameOverScreen('Red', onRestart);

      const winnerCall = (mockScene.add.text as any).mock.calls.find((call: any) =>
        call[2].includes('Red Player Wins!')
      );
      expect(winnerCall[3].color).toBe('#ff0000');
    });

    it('should use blue color for Blue winner', () => {
      uiManager.createUI();
      const onRestart = vi.fn();

      uiManager.showGameOverScreen('Blue', onRestart);

      const winnerCall = (mockScene.add.text as any).mock.calls.find((call: any) =>
        call[2].includes('Blue Player Wins!')
      );
      expect(winnerCall[3].color).toBe('#0000ff');
    });

    it('should create restart button', () => {
      uiManager.createUI();
      const onRestart = vi.fn();

      uiManager.showGameOverScreen('Red', onRestart);

      const restartCall = (mockScene.add.text as any).mock.calls.find((call: any) =>
        call[2] === 'Click to Restart'
      );
      expect(restartCall).toBeDefined();
    });

    it('should call restart handler when button clicked', () => {
      uiManager.createUI();
      const onRestart = vi.fn();

      uiManager.showGameOverScreen('Red', onRestart);

      const restartButton = (mockScene.add.text as any).mock.results.find((result: any) =>
        result.value.text === 'Click to Restart'
      )?.value as MockText;

      restartButton.emit('pointerdown');

      expect(onRestart).toHaveBeenCalled();
    });
  });

  describe('Button Hover Effects', () => {
    it('should change undo button color on hover', () => {
      const ui = uiManager.createUI();

      ui.undoButton.emit('pointerover');
      expect((ui.undoButton as any).backgroundColor).toBe('#888888');

      ui.undoButton.emit('pointerout');
      expect((ui.undoButton as any).backgroundColor).toBe('#666666');
    });

    it('should change quit button color on hover', () => {
      const ui = uiManager.createUI();

      ui.quitButton.emit('pointerover');
      expect((ui.quitButton as any).backgroundColor).toBe('#cc6666');

      ui.quitButton.emit('pointerout');
      expect((ui.quitButton as any).backgroundColor).toBe('#aa4444');
    });
  });

  describe('Responsive Font Sizing', () => {
    it('should calculate title font size based on screen width', () => {
      uiManager.createUI();

      const titleCall = (mockScene.add.text as any).mock.calls.find((call: any) =>
        call[2] === 'Infection!'
      );
      const fontSize = titleCall[3].fontSize;

      // Should be min(32, 800 / 25) = min(32, 32) = 32
      expect(fontSize).toBe(32);
    });

    it('should limit title font size to maximum', () => {
      mockScene.cameras.main.width = 2000;
      uiManager.createUI();

      const titleCall = (mockScene.add.text as any).mock.calls.find((call: any) =>
        call[2] === 'Infection!'
      );
      const fontSize = titleCall[3].fontSize;

      // Should be capped at 32
      expect(fontSize).toBe(32);
    });

    it('should calculate instruction font size based on screen width', () => {
      uiManager.createUI();

      const instructionsCall = (mockScene.add.text as any).mock.calls.find((call: any) =>
        call[2] === 'Click on a cell to place a dot'
      );
      const fontSize = instructionsCall[3].fontSize;

      // Should be min(18, 800 / 45) = min(18, 17.7) = 17.7
      expect(fontSize).toBeLessThanOrEqual(18);
    });
  });

  describe('Responsive Positioning', () => {
    it('should position player sprite responsively', () => {
      uiManager.createUI();

      const spriteCall = (mockScene.add.sprite as any).mock.calls[0];
      const spriteX = spriteCall[0];
      const spriteY = spriteCall[1];

      // X should be min(80, 800 * 0.08) = min(80, 64) = 64
      // Y should be min(80, 600 * 0.12) = min(80, 72) = 72
      expect(spriteX).toBe(64);
      expect(spriteY).toBe(72);
    });

    it('should scale player sprite based on screen width', () => {
      const ui = uiManager.createUI();

      // Scale should be min(3.0, 800 / 200) = min(3.0, 4.0) = 3.0
      expect(ui.currentPlayerSprite.scaleX).toBe(3.0);
      expect(ui.currentPlayerSprite.scaleY).toBe(3.0);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete UI lifecycle', () => {
      const ui = uiManager.createUI();

      // Update level info
      uiManager.updateLevelInfo('Test Set', 'Test Level');
      expect(ui.levelInfoText.text).toContain('Test Set');

      // Update player
      uiManager.updatePlayerIndicator('blue');
      expect(ui.currentPlayerSprite.texture).toBe('good-sprite');

      // Update AI difficulty
      uiManager.updateAIDifficulty('hard');
      expect(ui.aiDifficultyText.text).toBe('AI: hard');

      // Disable undo
      uiManager.updateUndoButton(false);
      expect(ui.undoButton.alpha).toBe(0.5);

      // Enable undo
      uiManager.updateUndoButton(true);
      expect(ui.undoButton.alpha).toBe(1);
    });

    it('should handle game over flow', () => {
      const ui = uiManager.createUI();
      const onRestart = vi.fn();

      // Disable buttons
      uiManager.disableUndoButton();
      uiManager.disableQuitButton();

      expect((ui.undoButton as any).interactive).toBe(false);
      expect((ui.quitButton as any).interactive).toBe(false);

      // Show game over screen
      uiManager.showGameOverScreen('Red', onRestart);

      const restartButton = (mockScene.add.text as any).mock.results.find((result: any) =>
        result.value.text === 'Click to Restart'
      )?.value as MockText;

      restartButton.emit('pointerdown');
      expect(onRestart).toHaveBeenCalled();
    });

    it('should handle multiple player switches', () => {
      const ui = uiManager.createUI();

      for (let i = 0; i < 5; i++) {
        uiManager.updatePlayerIndicator('red');
        expect(ui.currentPlayerSprite.texture).toBe('evil-sprite');

        uiManager.updatePlayerIndicator('blue');
        expect(ui.currentPlayerSprite.texture).toBe('good-sprite');
      }
    });

    it('should handle button interactions', () => {
      const ui = uiManager.createUI();
      const undoHandler = vi.fn();
      const quitHandler = vi.fn();

      uiManager.setUndoButtonHandler(undoHandler);
      uiManager.setQuitButtonHandler(quitHandler);

      // Test undo button
      ui.undoButton.emit('pointerdown');
      expect(undoHandler).toHaveBeenCalledTimes(1);

      // Test quit button
      ui.quitButton.emit('pointerdown');
      expect(quitHandler).toHaveBeenCalledTimes(1);

      // Test multiple clicks
      ui.undoButton.emit('pointerdown');
      ui.undoButton.emit('pointerdown');
      expect(undoHandler).toHaveBeenCalledTimes(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small screen width', () => {
      mockScene.cameras.main.width = 320;
      mockScene.cameras.main.height = 240;

      uiManager.createUI();

      // Font sizes should be scaled down appropriately
      const titleCall = (mockScene.add.text as any).mock.calls.find((call: any) =>
        call[2] === 'Infection!'
      );
      expect(titleCall[3].fontSize).toBeLessThanOrEqual(32);
    });

    it('should handle very large screen width', () => {
      mockScene.cameras.main.width = 3840;
      mockScene.cameras.main.height = 2160;

      uiManager.createUI();

      // Font sizes should be capped
      const titleCall = (mockScene.add.text as any).mock.calls.find((call: any) =>
        call[2] === 'Infection!'
      );
      expect(titleCall[3].fontSize).toBe(32);
    });

    it('should handle winner names with different cases', () => {
      uiManager.createUI();

      uiManager.showGameOverScreen('RED', vi.fn());
      const call1 = (mockScene.add.text as any).mock.calls.find((call: any) =>
        call[2].includes('RED Player Wins!')
      );
      expect(call1).toBeDefined();

      vi.clearAllMocks();

      uiManager.showGameOverScreen('blue', vi.fn());
      const call2 = (mockScene.add.text as any).mock.calls.find((call: any) =>
        call[2].includes('blue Player Wins!')
      );
      expect(call2).toBeDefined();
    });
  });
});
