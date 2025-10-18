# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Infection! Germs vs White Cells" is a 2D turn-based grid game built with:
- **Phaser 3.90.0** - Game engine
- **Vue 3.5.13** - UI framework
- **TypeScript 5.7.2** - Type system
- **Vite 6.3.1** - Build tool

The game features a human player competing against an AI opponent on grids with
varying sizes and layouts. Players place dots in cells, and cells explode when
they exceed capacity, creating chain reactions that can capture opponent cells.

## Development Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server at http://localhost:8080 |
| `npm run build` | Create production build in `dist/` |
| `npm run type-check` | Run TypeScript type checking |
| `npm run dev-nolog` | Dev server without Phaser analytics |
| `npm run build-nolog` | Production build without Phaser analytics |
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run all tests once (CI-ready) |
| `npm run test:ui` | Open Vitest UI for debugging tests |
| `npm run test:coverage` | Generate test coverage report |

## Architecture

### Vue-Phaser Bridge

The architecture separates Vue UI components from Phaser game logic:

- **PhaserGame.vue** - Bridge component that initializes Phaser and manages communication
- **EventBus.ts** - Event bus for bi-directional Vue ↔ Phaser communication
- Phaser scenes emit `'current-scene-ready'` event via EventBus to expose themselves to Vue
- Vue can access game instance via `toRaw(phaserRef.value.game)` and scene via `toRaw(phaserRef.value.scene)`

### Game State Management

State is managed through specialized manager classes that interact with Phaser's `game.registry`:

**GameStateManager** (`src/game/GameStateManager.ts`):
- Handles game state persistence in `game.registry` (not localStorage)
- Manages move history for undo functionality (max 50 moves)
- Tracks board state, current player, level progress, and winners
- Key methods: `saveMove()`, `undoLastMove()`, `saveToRegistry()`, `loadFromRegistry()`

**SettingsManager** (`src/game/SettingsManager.ts`):
- Synchronizes settings between localStorage and `game.registry`
- Reading priority: registry → localStorage → defaults
- Settings: soundEffectsEnabled, playerColor, levelSetId
- Always use `getCurrentSettings()` or `getSetting(key)` to read settings
- The Settings scene writes settings; the Game scene only reads them

**LevelSetManager** (`src/game/LevelSetManager.ts`):
- Loads level sets from `LevelDefinitions.ts` into linked list structures
- Manages level progression within a level set
- Handles level set changes when user selects a new one in settings

### Core Game Classes

**Level** (`src/game/Level.ts`):
- Represents a single level with linked list navigation
- Properties: gridSize, blockedCells, name, description, AI difficulty
- Methods: `next()`, `isLast()`, `getAIDifficulty()`

**LevelSet** (`src/game/LevelSet.ts`):
- Container for a collection of levels
- Methods: `first()`, `last()`, `getLevel(index)`

**GridManager** (`src/game/GridManager.ts`):
- Creates and manages the visual grid (Phaser rectangles)
- Calculates cell capacities based on non-blocked adjacent cells
- Handles cell styling, hover states, and interactivity
- Blocked cells have capacity 0 and don't contribute to adjacent cells' capacities

**ComputerPlayer** (`src/game/ComputerPlayer.ts`):
- AI opponent with four difficulty levels: easy, medium, hard, expert
- Each level set defines AI difficulty per level (see `LevelDefinitions.ts`)
- Strategies range from random moves (easy) to analyzing advantage cells (expert)

**GameUIManager** (`src/game/GameUIManager.ts`):
- Creates and updates all UI elements (player indicator, level info, buttons)
- Centralizes UI code separate from game logic

### Scene Flow

The game follows this scene progression:

1. **Boot** → **Preloader** → **Splash** → **MainMenu**
2. From MainMenu: **About** | **Tutorial** | **Settings** | **Game**
3. During Game: **Game** → **LevelOver** → (next level or **GameOver**)

The Game scene:
- Initializes on `create()` and restores state on `wake()`
- Checks `settingsDirty` flag in registry when waking to handle settings changes
- Loads saved game state from registry if available, otherwise loads first level
- Never modifies settings (read-only), only applies them

### Game Mechanics

**Cell Capacity**:
- Corner cells: capacity 2
- Edge cells: capacity 3
- Interior cells: capacity 4
- Blocked cells: capacity 0 (don't accept dots, don't contribute to neighbors)

**Explosions**:
- When dots > capacity, cell explodes
- Distributes dots to orthogonally adjacent non-blocked cells
- Converts opponent cells to exploding player's color
- Chain reactions can occur with `EXPLOSION_DELAY = 300ms`

**Win Condition**:
- One player owns all non-blocked cells (no empty cells remain)
- Tracked per level, with overall game winner determined by level set completion

## Important Patterns

### Reading Game State
```typescript
// Always load from registry through manager
const savedState = this.stateManager.loadFromRegistry();
if (savedState) {
  this.boardState = savedState.boardState;
  this.currentPlayer = savedState.currentPlayer;
}
```

### Reading Settings
```typescript
// Always use SettingsManager, never read localStorage directly
const settings = this.settingsManager.getCurrentSettings();
const isEnabled = this.settingsManager.getSetting('soundEffectsEnabled');
```

### Level Navigation
```typescript
// Levels are linked lists
const currentLevel = this.getCurrentLevel();
const nextLevel = currentLevel.next();
if (nextLevel) {
  this.loadLevel(nextLevel);
} else {
  // Last level completed
  this.handleGameOver(winner);
}
```

### Scene Communication
```typescript
// In Phaser scene
EventBus.emit('current-scene-ready', this);
EventBus.emit('event-name', data);

// In Vue
EventBus.on('event-name', (data) => { /* handle */ });
```

## File Organization

```
src/
├── main.ts                    # Vue entry point
├── App.vue                    # Main Vue component
├── PhaserGame.vue             # Vue-Phaser bridge
└── game/
    ├── main.ts                # Phaser game config
    ├── EventBus.ts            # Vue-Phaser communication
    ├── GameStateManager.ts    # Game state persistence
    ├── SettingsManager.ts     # Settings persistence
    ├── LevelSetManager.ts     # Level set loader
    ├── Level.ts               # Level class
    ├── LevelSet.ts            # Level set class
    ├── LevelDefinitions.ts    # Level/set definitions
    ├── GridManager.ts         # Grid creation and management
    ├── GameUIManager.ts       # UI creation and updates
    ├── ComputerPlayer.ts      # AI opponent
    └── scenes/
        ├── Boot.ts            # Initial scene
        ├── Preloader.ts       # Asset loading
        ├── Splash.ts          # Splash screen
        ├── MainMenu.ts        # Main menu
        ├── About.ts           # About/credits
        ├── Tutorial.ts        # Game instructions
        ├── Settings.ts        # Settings menu
        ├── Game.ts            # Main gameplay
        ├── LevelOver.ts       # Between levels
        └── GameOver.ts        # Game complete
```

## Testing

The project has comprehensive test coverage using **Vitest 3.2.4**.

### Test Coverage Statistics

**401 tests across 9 test files** covering all core game classes:

- **Phase 1: Core Data Structures (69 tests)**
  - `Level.test.ts` - 28 tests for level data and linked list navigation
  - `LevelSet.test.ts` - 41 tests for level set management

- **Phase 2: Manager Classes (196 tests)**
  - `SettingsManager.test.ts` - 42 tests for settings persistence
  - `GameStateManager.test.ts` - 56 tests for state management and undo
  - `LevelSetManager.test.ts` - 48 tests for level set loading
  - `BoardStateManager.test.ts` - 49 tests for board state and game logic

- **Phase 3: Game Logic (88 tests)**
  - `GridManager.test.ts` - 48 tests for grid creation and cell capacity
  - `ComputerPlayer.test.ts` - 40 tests for AI strategies

- **Phase 4: UI Layer (49 tests)**
  - `GameUIManager.test.ts` - 49 tests for UI element management

### Running Tests

```bash
# Watch mode - auto-runs on file changes (recommended for development)
npm test

# Single run - all tests once (use for CI/CD)
npm run test:run

# Visual UI - interactive test browser
npm run test:ui

# Coverage report - generates HTML coverage report
npm run test:coverage
```

### Test File Locations

All test files are co-located with their source files in `src/game/`:
- `Level.test.ts` (28 tests) - Tests for `Level.ts`
- `LevelSet.test.ts` (41 tests) - Tests for `LevelSet.ts`
- `SettingsManager.test.ts` (42 tests) - Tests for `SettingsManager.ts`
- `GameStateManager.test.ts` (56 tests) - Tests for `GameStateManager.ts`
- `LevelSetManager.test.ts` (48 tests) - Tests for `LevelSetManager.ts`
- `GridManager.test.ts` (48 tests) - Tests for `GridManager.ts`
- `ComputerPlayer.test.ts` (40 tests) - Tests for `ComputerPlayer.ts`
- `GameUIManager.test.ts` (49 tests) - Tests for `GameUIManager.ts`
- `BoardStateManager.test.ts` (49 tests) - Tests for `BoardStateManager.ts`

**Total: 401 tests across 9 test files**

### Writing New Tests

When adding new functionality:
1. Create a corresponding `.test.ts` file next to the source file
2. Use Vitest's `describe`, `it`, `expect`, `beforeEach` patterns
3. Mock Phaser dependencies (Scene, DataManager, GameObjects) as needed
4. Follow existing test structure for consistency
5. Run tests to ensure all pass before committing

Example test structure:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MyClass } from './MyClass';

describe('MyClass', () => {
  let instance: MyClass;

  beforeEach(() => {
    instance = new MyClass();
  });

  describe('methodName', () => {
    it('should do something specific', () => {
      const result = instance.methodName();
      expect(result).toBe(expectedValue);
    });
  });
});
```

### Test Configuration

Tests are configured in `vitest.config.ts`:
- Uses `happy-dom` for lightweight DOM simulation
- Supports TypeScript out of the box
- Configured for parallel test execution
- Coverage reporting with v8 provider

## Common Tasks

### Adding a New Level
1. Add level definition to `LevelDefinitions.ts` in appropriate level set
2. Define gridSize, blockedCells, name, description, and aiDifficulty
3. Level will automatically be included in the linked list
4. Run `npm test` to ensure no regressions

### Modifying Game Rules
- Cell capacity calculation: `GridManager.calculateCellCapacity()`
- Explosion logic: `Game.explodeCell()` and `Game.distributeDotsToAdjacentCells()`
- Win condition: `Game.checkWinCondition()`
- **Important:** Update corresponding tests after rule changes

### Adding UI Elements
- Create elements in `GameUIManager.createUI()`
- Update methods should be in GameUIManager (e.g., `updatePlayerIndicator()`)
- Game scene calls UI manager methods, never manipulates UI directly
- Add tests in `GameUIManager.test.ts` for new UI elements

## Design Document

The comprehensive design document at `DESIGN.md` contains:
- Detailed game mechanics and rules
- AI difficulty level definitions
- Development phases and progress tracking
- State management requirements
- Future features and deferred items

Reference `DESIGN.md` for understanding the full scope and planned features.