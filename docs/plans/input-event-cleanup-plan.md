# Input Event Cleanup Implementation Plan

## Overview

**Goal:** Implement comprehensive input event cleanup to eliminate ghost interactions, prevent memory leaks from accumulated event listeners, and ensure clean input flow across scene transitions.

**Priority:** MEDIUM-HIGH IMPACT for debugging and maintenance
**Effort:** MEDIUM
**Phase:** Phase 3, Week 5 (Input & Accessibility)

**Testing Philosophy:** Test-Driven Development (TDD) with automated tests that verify real Phaser EventEmitter behavior. We write tests that catch actual bugs (ghost interactions, memory leaks) and provide continuous regression protection using Phaser's `listenerCount()` API.

**Expected Outcomes:**
- 🎯 **500+ automated tests** (up from 472)
- 🎯 **~30 new cleanup tests** with real Phaser API verification
- 🎯 **Zero ghost interactions** (verified by tests)
- 🎯 **Stable listener counts** (verified by lifecycle tests)
- 🎯 **100% pass rate** maintained throughout

## Background

From Phaser Events documentation (`@docs/phaser/Events.html`):
- Event listeners persist until explicitly removed
- GameObjects that are destroyed still need manual event cleanup for custom listeners
- Scene transitions (shutdown/destroy) require explicit listener removal
- Ghost interactions occur when listeners fire on destroyed objects
- Memory leaks accumulate from undestroyed listeners across scene transitions

## Current State Analysis

### Files with Pointer Events

Based on phaser-usage-review.md findings:

1. **GridManager** (`src/game/GridManager.ts`)
   - Sets up `pointerdown`, `pointerover`, `pointerout` on grid cells
   - No cleanup implementation currently

2. **Scenes with Interactive Elements:**
   - `MainMenu.ts` - Button interactions
   - `Settings.ts` - Button and toggle interactions
   - `LevelOver.ts` - Button interactions
   - `GameOver.ts` - Button interactions
   - `About.ts` - Button interactions
   - `Tutorial.ts` - Button interactions

3. **EventBus** (`src/game/EventBus.ts`)
   - Already has cleanup methods (added in earlier fix)
   - Cleanup integrated in PhaserGameWrapper.vue

### Risk Assessment

**High Risk Areas:**
- GridManager: Grid cells recreated on each level, listeners accumulate
- Game scene: Multiple transitions to/from Settings, each accumulates listeners
- Button-heavy scenes: Settings, LevelOver with frequent transitions

**Impact:**
- Memory leaks: ~10-50 listeners per scene transition
- Ghost interactions: Clicks on destroyed cells may trigger old handlers
- Debugging confusion: Events firing from invisible/destroyed objects

## Implementation Strategy

### Phase 1: GridManager Cleanup (Highest Risk)

**File:** `src/game/GridManager.ts`

**Current Pattern:**
```typescript
// In createGrid()
cell.setInteractive();
cell.on('pointerdown', callback);
cell.on('pointerover', callback);
cell.on('pointerout', callback);
```

**Implementation:**
```typescript
class GridManager {
    private cellEventHandlers: Map<Phaser.GameObjects.Rectangle, {
        pointerdown: Function,
        pointerover: Function,
        pointerout: Function
    }> = new Map();

    createGrid(gridSize: number, blockedCells: { row: number; col: number }[]) {
        // ... existing grid creation ...

        // Track handlers for cleanup
        const handlers = {
            pointerdown: (pointer) => this.handlePointerDown(cell, pointer),
            pointerover: () => this.handlePointerOver(cell),
            pointerout: () => this.handlePointerOut(cell)
        };

        cell.on('pointerdown', handlers.pointerdown);
        cell.on('pointerover', handlers.pointerover);
        cell.on('pointerout', handlers.pointerout);

        this.cellEventHandlers.set(cell, handlers);
    }

    cleanup(): void {
        console.log('[GridManager] Cleaning up cell event listeners');

        // Remove all event listeners before destroying cells
        this.cellEventHandlers.forEach((handlers, cell) => {
            cell.off('pointerdown', handlers.pointerdown);
            cell.off('pointerover', handlers.pointerover);
            cell.off('pointerout', handlers.pointerout);
            cell.destroy(); // Now safe to destroy
        });

        this.cellEventHandlers.clear();
        this.gridCells = [];
    }
}
```

**Integration in Game Scene:**
```typescript
// In Game.ts shutdown()
shutdown() {
    console.log('[Game] ===== SCENE SHUTDOWN START =====');

    // Clean up grid BEFORE base shutdown
    if (this.gridManager) {
        this.gridManager.cleanup();
    }

    // Call base shutdown (from BaseScene)
    super.shutdown();

    console.log('[Game] ===== SCENE SHUTDOWN END =====');
}
```

**Benefits:**
- No ghost interactions on destroyed cells
- Clean memory on every scene transition
- Predictable cell lifecycle

**Testing:**
1. Create grid → Navigate to Settings → Return to Game
2. Check memory: Should see cell listeners removed
3. Verify no clicks registered on "old" cells

---

### Phase 2: Button Cleanup Pattern

**Affected Scenes:**
- MainMenu.ts
- Settings.ts
- LevelOver.ts
- GameOver.ts
- About.ts
- Tutorial.ts

**Common Pattern Observed:**
```typescript
// Current (no cleanup)
button.setInteractive();
button.on('pointerdown', () => { /* ... */ });
button.on('pointerover', () => { button.setTint(0xcccccc); });
button.on('pointerout', () => { button.clearTint(); });
```

**Standardized Cleanup Pattern:**

```typescript
class ButtonManager {
    private buttons: Map<Phaser.GameObjects.Text, {
        click: Function,
        over: Function,
        out: Function
    }> = new Map();

    createButton(scene: Phaser.Scene, x: number, y: number, text: string, onClick: Function) {
        const button = scene.add.text(x, y, text, { /* ... */ });
        button.setInteractive();

        const handlers = {
            click: () => onClick(),
            over: () => button.setTint(0xcccccc),
            out: () => button.clearTint()
        };

        button.on('pointerdown', handlers.click);
        button.on('pointerover', handlers.over);
        button.on('pointerout', handlers.out);

        this.buttons.set(button, handlers);
        return button;
    }

    cleanup(): void {
        console.log('[ButtonManager] Cleaning up button listeners');

        this.buttons.forEach((handlers, button) => {
            button.off('pointerdown', handlers.click);
            button.off('pointerover', handlers.over);
            button.off('pointerout', handlers.out);
            button.destroy();
        });

        this.buttons.clear();
    }
}
```

**Alternative: Simpler Per-Scene Approach**

For scenes with few buttons, inline cleanup:

```typescript
// In Settings.ts
class Settings extends BaseScene {
    private soundButton: Phaser.GameObjects.Text;
    private soundButtonHandlers: {
        down: Function,
        over: Function,
        out: Function
    };

    create() {
        // ... existing code ...

        // Store handlers for cleanup
        this.soundButtonHandlers = {
            down: () => this.toggleSound(),
            over: () => this.soundButton.setTint(0xcccccc),
            out: () => this.soundButton.clearTint()
        };

        this.soundButton.on('pointerdown', this.soundButtonHandlers.down);
        this.soundButton.on('pointerover', this.soundButtonHandlers.over);
        this.soundButton.on('pointerout', this.soundButtonHandlers.out);
    }

    shutdown() {
        console.log('[Settings] ===== SCENE SHUTDOWN START =====');

        // Clean up button listeners
        if (this.soundButton && this.soundButtonHandlers) {
            this.soundButton.off('pointerdown', this.soundButtonHandlers.down);
            this.soundButton.off('pointerover', this.soundButtonHandlers.over);
            this.soundButton.off('pointerout', this.soundButtonHandlers.out);
        }

        super.shutdown();
        console.log('[Settings] ===== SCENE SHUTDOWN END =====');
    }
}
```

**Recommendation:** Use inline approach first (simpler, fewer files changed). Create ButtonManager only if pattern becomes very repetitive.

---

### Phase 3: Scene Event Cleanup

**Already Implemented in BaseScene:**
```typescript
// src/game/BaseScene.ts
shutdown() {
    this.cleanupInputEvents();
    this.cleanupTimers();
    // ...
}
```

**Verify Coverage:**
- Check all scenes extend BaseScene ✅
- Check shutdown() calls super.shutdown() ✅
- Verify cleanupInputEvents() exists ✅

**Additional Scene-Specific Events:**

Some scenes may have custom scene event listeners:

```typescript
// Example: If a scene listens to wake event
create() {
    this.scene.events.on('wake', this.handleWake, this);
}

shutdown() {
    // Remove custom scene listeners
    this.scene.events.off('wake', this.handleWake, this);

    super.shutdown();
}
```

**Action:** Audit all scenes for `.scene.events.on()` or `.events.on()` calls

---

### Phase 4: GameUIManager Integration

**File:** `src/game/GameUIManager.ts`

GameUIManager creates interactive buttons (Undo, Quit). Need to add cleanup.

**Current:**
```typescript
class GameUIManager {
    createUI() {
        this.createUndoButton();
        this.createQuitButton();
        // ...
    }
}
```

**Enhanced:**
```typescript
class GameUIManager {
    private undoButton: Phaser.GameObjects.Text;
    private quitButton: Phaser.GameObjects.Text;
    private undoButtonHandlers: { down: Function, over: Function, out: Function };
    private quitButtonHandlers: { down: Function, over: Function, out: Function };

    createUI() {
        this.createUndoButton();
        this.createQuitButton();
        // ...
    }

    private createUndoButton() {
        // ... existing code ...

        this.undoButtonHandlers = {
            down: () => this.undoButtonCallback?.(),
            over: () => this.undoButton.setTint(0xcccccc),
            out: () => this.undoButton.clearTint()
        };

        this.undoButton.on('pointerdown', this.undoButtonHandlers.down);
        this.undoButton.on('pointerover', this.undoButtonHandlers.over);
        this.undoButton.on('pointerout', this.undoButtonHandlers.out);
    }

    cleanup(): void {
        console.log('[GameUIManager] Cleaning up UI button listeners');

        if (this.undoButton && this.undoButtonHandlers) {
            this.undoButton.off('pointerdown', this.undoButtonHandlers.down);
            this.undoButton.off('pointerover', this.undoButtonHandlers.over);
            this.undoButton.off('pointerout', this.undoButtonHandlers.out);
        }

        if (this.quitButton && this.quitButtonHandlers) {
            this.quitButton.off('pointerdown', this.quitButtonHandlers.down);
            this.quitButton.off('pointerover', this.quitButtonHandlers.over);
            this.quitButton.off('pointerout', this.quitButtonHandlers.out);
        }
    }
}
```

**Integration:**
```typescript
// In Game.ts shutdown()
if (this.uiManager) {
    this.uiManager.cleanup();
}
```

---

## Implementation Phases

### Week 1: Core Infrastructure (2-3 days) - TDD Approach

**Day 1-2: GridManager Cleanup**

**Step 1: Write Tests (RED)**
- [ ] Write `GridManager.test.ts` cleanup tests (see Testing Strategy section)
- [ ] Run tests - should FAIL (cleanup method doesn't exist)
- [ ] Verify test output shows expected failures

**Step 2: Implement (GREEN)**
- [ ] Add `cellEventHandlers` Map to GridManager
- [ ] Store handlers during grid creation in `createGrid()`
- [ ] Implement `cleanup()` method
- [ ] Run tests - should PASS
- [ ] Verify `listenerCount()` tests pass

**Step 3: Integrate (GREEN)**
- [ ] Add cleanup call in `Game.ts` `shutdown()`
- [ ] Write integration test for cleanup order
- [ ] Run all tests - should PASS

**Step 4: Refactor**
- [ ] Add logging to cleanup method
- [ ] Add safety checks (null guards)
- [ ] Run tests - should still PASS

**Validation:**
- ✅ All GridManager cleanup tests pass (5+ new tests)
- ✅ Existing GridManager tests still pass (48 tests)
- ✅ Integration test passes
- ✅ Manual: No ghost interactions, clean memory

---

**Day 3: GameUIManager Cleanup**

**Step 1: Write Tests (RED)**
- [ ] Write `GameUIManager.test.ts` cleanup tests
- [ ] Run tests - should FAIL
- [ ] Verify expected failures

**Step 2: Implement (GREEN)**
- [ ] Add handler tracking to GameUIManager
- [ ] Store handlers in `createUndoButton()` and `createQuitButton()`
- [ ] Implement `cleanup()` method
- [ ] Run tests - should PASS

**Step 3: Integrate (GREEN)**
- [ ] Add cleanup call in `Game.ts` `shutdown()`
- [ ] Update integration test
- [ ] Run all tests - should PASS

**Validation:**
- ✅ All GameUIManager cleanup tests pass (3+ new tests)
- ✅ Existing GameUIManager tests still pass (49 tests)
- ✅ Total test count: ~480+ tests

### Week 2: Scene Button Cleanup (3-4 days) - TDD per Scene

**Scenes to Update:**
- [ ] Settings.ts (Day 1)
- [ ] MainMenu.ts (Day 1)
- [ ] LevelOver.ts (Day 2)
- [ ] GameOver.ts (Day 2)
- [ ] About.ts (Day 3)
- [ ] Tutorial.ts (Day 3)

**TDD Pattern Per Scene:**

**1. RED - Write Failing Tests**
```typescript
// Example: src/game/scenes/Settings.test.ts
describe('Settings Scene Event Cleanup', () => {
  it('should remove all button listeners on shutdown', () => {
    scene.create();
    scene.shutdown(); // No cleanup implemented yet
    expect(scene.soundButton.listenerCount('pointerdown')).toBe(0); // FAILS
  });
});
```
- [ ] Write scene-specific cleanup tests
- [ ] Run tests - verify FAIL
- [ ] Commit failing tests

**2. GREEN - Implement Cleanup**
```typescript
// In Settings.ts
shutdown() {
  // Clean up button listeners
  if (this.soundButton && this.soundButtonHandlers) {
    this.soundButton.off('pointerdown', this.soundButtonHandlers.down);
    this.soundButton.off('pointerover', this.soundButtonHandlers.over);
    this.soundButton.off('pointerout', this.soundButtonHandlers.out);
  }

  super.shutdown();
}
```
- [ ] Identify all interactive elements in scene
- [ ] Add handler storage in create()
- [ ] Implement shutdown() with cleanup
- [ ] Run tests - verify PASS
- [ ] Commit working implementation

**3. REFACTOR - Clean Code**
- [ ] Add logging for debugging
- [ ] Extract common patterns if found
- [ ] Run tests - verify still PASS
- [ ] Commit refactored code

**Per Scene Checklist:**
- [ ] 3+ automated tests written and passing
- [ ] All button listeners cleaned up
- [ ] Scene lifecycle test passing (create → shutdown → create)
- [ ] No listener accumulation test passing
- [ ] Manual verification: buttons still responsive

**Daily Progress Tracking:**
```bash
# End of each day
npm run test:run | grep "Test Files"
# Should see test count increase by ~3-5 per scene
```

### Week 3: Testing & Validation (2 days)

**Memory Leak Tests:**
- [ ] Extend live-testing.html with event listener counting
- [ ] Add test: Rapid scene transitions (Game ↔ Settings x20)
- [ ] Monitor listener count stays stable

**Functional Tests:**
- [ ] All buttons responsive after scene transitions
- [ ] Grid cells interactive after returning from Settings
- [ ] No double-firing of events

**Integration Tests:**
- [ ] Complete game flow: Menu → Game → Settings → Game → LevelOver → NextLevel → Settings → Game
- [ ] Memory stable throughout
- [ ] No console errors

---

## Testing Strategy

**Philosophy:** Write automated tests that verify real Phaser EventEmitter behavior, not implementation details. Tests should catch actual bugs (ghost interactions, memory leaks) and provide continuous regression protection.

### Automated Tests (Primary Validation)

**Test Categories:**
1. **Listener Removal Verification** - Use Phaser's `listenerCount()` API
2. **Ghost Interaction Prevention** - Verify handlers don't fire after cleanup
3. **Cleanup Safety** - Multiple cleanup calls, null checks
4. **Scene Lifecycle** - Create → Shutdown → Create cycles
5. **Memory Stability** - Listener count stability across recreations

---

#### 1. GridManager Event Cleanup Tests

**File:** `src/game/GridManager.test.ts` (add new describe block)

```typescript
describe('GridManager Event Cleanup', () => {
  let scene: Phaser.Scene;
  let manager: GridManager;

  beforeEach(() => {
    scene = createMockScene();
    manager = new GridManager(scene);
  });

  describe('listener removal', () => {
    it('should remove all pointerdown listeners on cleanup', () => {
      manager.createGrid(3, []);
      const cell = manager.gridCells[0][0];

      // Verify listeners were added
      expect(cell.listenerCount('pointerdown')).toBeGreaterThan(0);
      expect(cell.listenerCount('pointerover')).toBeGreaterThan(0);
      expect(cell.listenerCount('pointerout')).toBeGreaterThan(0);

      // Cleanup
      manager.cleanup();

      // Verify listeners were removed
      expect(cell.listenerCount('pointerdown')).toBe(0);
      expect(cell.listenerCount('pointerover')).toBe(0);
      expect(cell.listenerCount('pointerout')).toBe(0);
    });

    it('should remove listeners from all cells in grid', () => {
      manager.createGrid(3, []);

      manager.cleanup();

      // Check every cell
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const cell = manager.gridCells[row][col];
          expect(cell.listenerCount('pointerdown')).toBe(0);
          expect(cell.listenerCount('pointerover')).toBe(0);
          expect(cell.listenerCount('pointerout')).toBe(0);
        }
      }
    });

    it('should handle multiple cleanup calls safely', () => {
      manager.createGrid(3, []);

      // Should not throw or cause issues
      expect(() => {
        manager.cleanup();
        manager.cleanup(); // Second call
        manager.cleanup(); // Third call
      }).not.toThrow();
    });
  });

  describe('ghost interaction prevention', () => {
    it('should not invoke handlers after cleanup', () => {
      manager.createGrid(3, []);
      const cell = manager.gridCells[0][0];

      const clickSpy = vi.fn();
      cell.on('pointerdown', clickSpy);

      // Emit event before cleanup
      cell.emit('pointerdown');
      expect(clickSpy).toHaveBeenCalledTimes(1);

      // Cleanup
      manager.cleanup();

      // Try to emit event after cleanup
      cell.emit('pointerdown');

      // Handler should NOT have been called again
      expect(clickSpy).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it('should not respond to hover events on destroyed cells', () => {
      manager.createGrid(3, []);
      const cell = manager.gridCells[1][1];

      const hoverSpy = vi.fn();
      const outSpy = vi.fn();
      cell.on('pointerover', hoverSpy);
      cell.on('pointerout', outSpy);

      // Before cleanup
      cell.emit('pointerover');
      cell.emit('pointerout');
      expect(hoverSpy).toHaveBeenCalledTimes(1);
      expect(outSpy).toHaveBeenCalledTimes(1);

      // After cleanup
      manager.cleanup();
      cell.emit('pointerover');
      cell.emit('pointerout');

      // Should not have incremented
      expect(hoverSpy).toHaveBeenCalledTimes(1);
      expect(outSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('memory stability', () => {
    it('should not accumulate listeners across grid recreations', () => {
      // Create and cleanup grid multiple times
      for (let i = 0; i < 5; i++) {
        manager.createGrid(3, []);
        manager.cleanup();
      }

      // Create one final time
      manager.createGrid(3, []);

      // Should have exactly 3 listeners per cell (not 3 * 6 = 18)
      const cell = manager.gridCells[0][0];
      expect(cell.listenerCount('pointerdown')).toBe(1);
      expect(cell.listenerCount('pointerover')).toBe(1);
      expect(cell.listenerCount('pointerout')).toBe(1);
    });
  });
});
```

**Value:**
- ✅ Uses real Phaser `listenerCount()` API
- ✅ Catches ghost interaction bugs
- ✅ Verifies cleanup actually works
- ✅ Prevents memory leaks from listener accumulation

---

#### 2. GameUIManager Event Cleanup Tests

**File:** `src/game/GameUIManager.test.ts` (add new describe block)

```typescript
describe('GameUIManager Event Cleanup', () => {
  let scene: Phaser.Scene;
  let manager: GameUIManager;

  beforeEach(() => {
    scene = createMockScene();
    manager = new GameUIManager(scene);
    manager.createUI();
  });

  describe('button listener removal', () => {
    it('should remove all undo button listeners on cleanup', () => {
      const undoButton = manager.undoButton;

      expect(undoButton.listenerCount('pointerdown')).toBeGreaterThan(0);
      expect(undoButton.listenerCount('pointerover')).toBeGreaterThan(0);
      expect(undoButton.listenerCount('pointerout')).toBeGreaterThan(0);

      manager.cleanup();

      expect(undoButton.listenerCount('pointerdown')).toBe(0);
      expect(undoButton.listenerCount('pointerover')).toBe(0);
      expect(undoButton.listenerCount('pointerout')).toBe(0);
    });

    it('should remove all quit button listeners on cleanup', () => {
      const quitButton = manager.quitButton;

      expect(quitButton.listenerCount('pointerdown')).toBeGreaterThan(0);

      manager.cleanup();

      expect(quitButton.listenerCount('pointerdown')).toBe(0);
    });
  });

  describe('handler invocation after cleanup', () => {
    it('should not call undo callback after cleanup', () => {
      const undoSpy = vi.fn();
      manager.setUndoButtonHandler(undoSpy);

      // Before cleanup
      manager.undoButton.emit('pointerdown');
      expect(undoSpy).toHaveBeenCalledTimes(1);

      // After cleanup
      manager.cleanup();
      manager.undoButton.emit('pointerdown');

      // Should not have been called again
      expect(undoSpy).toHaveBeenCalledTimes(1);
    });
  });
});
```

---

#### 3. Scene Event Cleanup Tests

**File:** `src/game/scenes/Settings.test.ts` (NEW FILE)

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Settings } from './Settings';

describe('Settings Scene Event Cleanup', () => {
  let scene: Settings;

  beforeEach(() => {
    scene = new Settings();
    // Mock scene initialization
  });

  describe('button cleanup', () => {
    it('should remove all button listeners on shutdown', () => {
      scene.create();

      const soundButton = scene.soundButton;
      const initialCount = soundButton.listenerCount('pointerdown') +
                          soundButton.listenerCount('pointerover') +
                          soundButton.listenerCount('pointerout');

      expect(initialCount).toBeGreaterThan(0);

      scene.shutdown();

      const afterCount = soundButton.listenerCount('pointerdown') +
                        soundButton.listenerCount('pointerover') +
                        soundButton.listenerCount('pointerout');

      expect(afterCount).toBe(0);
    });

    it('should not fire toggle handlers after shutdown (regression test)', () => {
      scene.create();

      let toggleCount = 0;
      const originalToggle = scene.toggleSound;
      scene.toggleSound = () => {
        originalToggle.call(scene);
        toggleCount++;
      };

      // Before shutdown
      scene.soundButton.emit('pointerdown');
      expect(toggleCount).toBe(1);

      // After shutdown
      scene.shutdown();
      scene.soundButton.emit('pointerdown');

      // Should still be 1, not 2 (ghost interaction prevented)
      expect(toggleCount).toBe(1);
    });
  });

  describe('scene lifecycle', () => {
    it('should handle create -> shutdown -> create cycle', () => {
      // First cycle
      scene.create();
      scene.shutdown();

      // Second cycle
      scene.create();

      // Buttons should work correctly
      const soundButton = scene.soundButton;
      expect(soundButton.listenerCount('pointerdown')).toBe(1);
      expect(soundButton.listenerCount('pointerover')).toBe(1);
      expect(soundButton.listenerCount('pointerout')).toBe(1);
    });

    it('should not accumulate listeners across multiple create/shutdown cycles', () => {
      for (let i = 0; i < 5; i++) {
        scene.create();
        scene.shutdown();
      }

      scene.create();

      // Should have exactly 1 listener per event type, not 5
      expect(scene.soundButton.listenerCount('pointerdown')).toBe(1);
      expect(scene.soundButton.listenerCount('pointerover')).toBe(1);
      expect(scene.soundButton.listenerCount('pointerout')).toBe(1);
    });
  });
});
```

**Replicate for all scenes:**
- `src/game/scenes/MainMenu.test.ts`
- `src/game/scenes/LevelOver.test.ts`
- `src/game/scenes/GameOver.test.ts`
- `src/game/scenes/About.test.ts`
- `src/game/scenes/Tutorial.test.ts`

---

#### 4. Game Scene Integration Test

**File:** `src/game/scenes/Game.test.ts` (add new describe block)

```typescript
describe('Game Scene Cleanup Integration', () => {
  let scene: Game;

  beforeEach(() => {
    scene = new Game();
  });

  describe('shutdown cleanup order', () => {
    it('should cleanup GridManager before base shutdown', () => {
      scene.create();

      const cleanupOrder: string[] = [];

      const originalGridCleanup = scene.gridManager.cleanup;
      scene.gridManager.cleanup = () => {
        cleanupOrder.push('gridManager');
        originalGridCleanup.call(scene.gridManager);
      };

      const originalShutdown = scene.shutdown;
      scene.shutdown = function() {
        cleanupOrder.push('baseShutdown');
        originalShutdown.call(this);
      };

      scene.shutdown();

      // GridManager cleanup should come before base shutdown
      expect(cleanupOrder.indexOf('gridManager'))
        .toBeLessThan(cleanupOrder.indexOf('baseShutdown'));
    });

    it('should cleanup GameUIManager before base shutdown', () => {
      scene.create();

      const cleanupOrder: string[] = [];

      const originalUICleanup = scene.uiManager.cleanup;
      scene.uiManager.cleanup = () => {
        cleanupOrder.push('uiManager');
        originalUICleanup.call(scene.uiManager);
      };

      scene.shutdown();

      expect(cleanupOrder).toContain('uiManager');
    });
  });

  describe('Settings transition cleanup', () => {
    it('should cleanup and restore correctly after Settings change', () => {
      scene.create();

      const initialCellListenerCount =
        scene.gridManager.gridCells[0][0].listenerCount('pointerdown');

      expect(initialCellListenerCount).toBeGreaterThan(0);

      // Simulate transition to Settings
      scene.shutdown();

      // Cells should have no listeners after shutdown
      expect(scene.gridManager.gridCells[0][0].listenerCount('pointerdown'))
        .toBe(0);
    });
  });
});
```

---

#### 5. Real Phaser Object Lifecycle Test

**File:** `src/game/event-cleanup.integration.test.ts` (NEW FILE)

```typescript
import { describe, it, expect } from 'vitest';
import Phaser from 'phaser';

describe('Real Phaser GameObject Event Cleanup', () => {
  it('should cleanup button listeners when destroyed', () => {
    const config = {
      type: Phaser.HEADLESS,
      scene: {
        create: function() {}
      }
    };

    const game = new Phaser.Game(config);
    const scene = game.scene.scenes[0];
    const button = scene.add.text(100, 100, 'Click Me');

    const clickHandler = vi.fn();
    const hoverHandler = vi.fn();

    button.setInteractive();
    button.on('pointerdown', clickHandler);
    button.on('pointerover', hoverHandler);

    // Verify listeners attached
    expect(button.listenerCount('pointerdown')).toBe(1);
    expect(button.listenerCount('pointerover')).toBe(1);

    // Remove listeners before destroy (our pattern)
    button.off('pointerdown', clickHandler);
    button.off('pointerover', hoverHandler);

    // Verify removed
    expect(button.listenerCount('pointerdown')).toBe(0);
    expect(button.listenerCount('pointerover')).toBe(0);

    // Now safe to destroy
    button.destroy();

    game.destroy(true);
  });
});
```

**Value:** Tests with real Phaser objects, not mocks. Validates cleanup pattern works with actual Phaser EventEmitter.

---

### Test-Driven Development (TDD) Approach

**For Each Component:**

1. **RED:** Write failing test first
```typescript
it('should remove all cell event listeners on cleanup', () => {
  manager.cleanup(); // Method doesn't exist yet
  expect(cell.listenerCount('pointerdown')).toBe(0); // FAILS
});
```

2. **GREEN:** Implement minimal code to pass
```typescript
cleanup(): void {
  this.cellEventHandlers.forEach((handlers, cell) => {
    cell.off('pointerdown', handlers.pointerdown);
    // ...
  });
}
```

3. **REFACTOR:** Clean up implementation
```typescript
cleanup(): void {
  console.log('[GridManager] Cleaning up cell event listeners');
  // ... clean implementation ...
}
```

---

### Continuous Testing During Implementation

**After Each Change:**
```bash
# Run related tests
npm test GridManager.test.ts

# Run all event cleanup tests
npm test -- --grep "cleanup"

# Full test suite
npm run test:run
```

**Acceptance Criteria:**
- ✅ All existing 472+ tests still pass
- ✅ All new cleanup tests pass
- ✅ `listenerCount()` verifications pass
- ✅ Ghost interaction tests pass

### Manual Testing

**Test Checklist:**
```markdown
## Input Event Cleanup Manual Test

### GridManager
- [ ] Start game, make 2 moves
- [ ] Navigate to Settings and back
- [ ] Grid cells still respond to hover (tint change)
- [ ] Grid cells still respond to click
- [ ] No duplicate events (click logs once, not twice)

### Scenes with Buttons
- [ ] MainMenu: All buttons respond correctly
- [ ] Settings: Toggle buttons work, no duplicate toggles
- [ ] LevelOver: Next/Quit buttons work
- [ ] Navigate back and forth between scenes 5x
- [ ] All buttons still responsive
- [ ] No duplicate button handlers

### Memory Stability
- [ ] Open Chrome DevTools → Memory tab
- [ ] Take heap snapshot
- [ ] Navigate through all scenes 2x complete cycles
- [ ] Take second heap snapshot
- [ ] Compare: Event listener count should be stable
- [ ] Check for detached DOM nodes (should be minimal)

### Ghost Interactions
- [ ] Start game, don't make moves
- [ ] Navigate to Settings and back
- [ ] Click where grid was - should not trigger old handlers
- [ ] Verify only current game state responds to input
```

---

## Success Metrics

**Automated Test Metrics:**
- ✅ **Test count increase**: From 472 tests to 500+ tests (~30 new cleanup tests)
- ✅ **All existing tests pass**: 100% pass rate maintained
- ✅ **Cleanup test coverage**:
  - GridManager: 5+ tests
  - GameUIManager: 3+ tests
  - Each scene: 3+ tests × 6 scenes = 18+ tests
  - Integration tests: 3+ tests
  - Real Phaser object tests: 1+ test
- ✅ **`listenerCount()` assertions**: All pass (verifies real cleanup)
- ✅ **Ghost interaction tests**: All pass (handlers don't fire after cleanup)

**Runtime Metrics (Verified by Tests):**
- Event listener count stable across create/shutdown cycles
- No listener accumulation in scene lifecycle tests
- Cleanup safety tests pass (multiple cleanup calls safe)

**Manual Validation (Secondary):**
- No ghost interactions during gameplay
- Clean console (no event-related errors)
- Buttons responsive after scene transitions

---

## Risk Mitigation

### Risk: Breaking Existing Functionality

**Mitigation:**
- Comprehensive testing after each scene update
- Maintain all existing tests passing
- Manual testing of all interactive elements

### Risk: Over-cleaning Events

**Mitigation:**
- Never use `off()` without specific event name + handler + context
- Never remove listeners from shared emitters (game.events, scene.events) without being specific
- Test that Phaser's internal events still work

### Risk: Performance Regression

**Mitigation:**
- Cleanup is O(n) where n = number of interactive elements (small)
- Happens during scene transition (user not interacting)
- Test frame rate stays at 60fps during transitions

---

## Documentation Updates

After implementation:

1. **Update CLAUDE.md:**
   - Add input event cleanup patterns section
   - Document handler storage pattern
   - Example cleanup in scene shutdown

2. **Create cleanup-patterns.md:**
   - Comprehensive guide for future development
   - When to add cleanup
   - How to track handlers
   - Common pitfalls

3. **Update code comments:**
   - Document why handlers are stored
   - Link to Phaser Events documentation
   - Note memory leak prevention

---

## Future Enhancements

**Beyond Initial Implementation:**

1. **Keyboard Event Support** (Accessibility)
   - Add keyboard handlers for buttons
   - Cleanup keyboard events in shutdown
   - Tab navigation for grid cells

2. **Touch Gesture Support** (Mobile)
   - Swipe gestures for navigation
   - Long-press for undo
   - Proper cleanup of gesture listeners

3. **Input Context Management**
   - Prioritize input between UI and game
   - Prevent input conflicts
   - Modal dialog input blocking

---

## Rollout Plan

**Phase 1 (Week 1):** Core infrastructure
- GridManager cleanup (highest risk)
- GameUIManager cleanup
- Memory testing framework

**Phase 2 (Week 2):** Scene cleanup
- All menu scenes
- Incremental rollout (one scene per day)
- Test each scene before moving to next

**Phase 3 (Week 3):** Testing & validation
- Comprehensive memory leak tests
- Integration tests
- Documentation updates

**Rollback Plan:**
- Each scene update is independent
- Can revert individual scene changes
- Core infrastructure (GridManager) tested first before scene changes

---

## Conclusion

This comprehensive input event cleanup will:
- ✅ Eliminate ghost interactions (verified by automated tests)
- ✅ Prevent memory leaks from event listeners (verified by `listenerCount()` tests)
- ✅ Improve debugging experience (cleaner input flow)
- ✅ Provide foundation for future input enhancements
- ✅ **Add 30+ automated tests** that keep on testing

**Key Differentiators:**
- **TDD Approach:** Write failing tests first, implement to pass, refactor with confidence
- **Real API Testing:** Use Phaser's `listenerCount()` API, not mocks
- **Continuous Validation:** Every change verified by automated tests
- **Regression Protection:** Tests prevent bugs from coming back

**Estimated Total Effort:** 8-10 days
**Priority:** MEDIUM-HIGH (significant debugging improvement)
**Risk:** LOW-MEDIUM (incremental, well-tested approach with TDD safety net)

**The Tests Keep Testing:** Once implemented, these 30+ automated tests will run on every commit, catching memory leaks and ghost interactions immediately, forever.
