# Infection! Germs vs White Cells

<a href="https://magicbydesign.com/infection" target="_blank"><img src="https://img.shields.io/badge/Play-Live%20Site-blue?logo=firefox" alt="Play Online" /></a>
<img src="https://img.shields.io/badge/tests-514%20passing-brightgreen" alt="514 tests passing" />
<img src="https://img.shields.io/badge/Phaser-3.90.0-blueviolet?logo=phaser" alt="Phaser 3.90.0" />
<img src="https://img.shields.io/badge/Vue.js-3.5.13-4FC08D?logo=vuedotjs&logoColor=white" alt="Vue 3.5.13" />
<img src="https://img.shields.io/badge/TypeScript-5.7.2-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5.7.2" />
<img src="https://img.shields.io/badge/Vite-6.3.1-646CFF?logo=vite&logoColor=white" alt="Vite 6.3.1" />
<img src="https://img.shields.io/badge/Vitest-3.2.4-6E9F18?logo=vitest&logoColor=white" alt="Vitest 3.2.4" />

A 2D turn-based strategy game where players compete to dominate the board
through strategic dot placement and chain reaction explosions. Features four
AI difficulty levels, multiple level sets, comprehensive test coverage, and
zero memory leaks.

**[Read the technical blog post](https://tracyatteberry.com/posts/infection)** about
building this game with Claude AI assistance.

![screenshot](screenshot.png)

## Table of Contents

- [What is this?](#what-is-this)
- [Game Mechanics](#game-mechanics)
- [Quick Start](#quick-start)
- [Testing](#testing)
- [Architecture](#architecture)
- [Development Workflow](#development-workflow)
- [Key Technical Decisions](#key-technical-decisions)

## What is this?

This is a complete game implementation demonstrating:
- **Vue-Phaser integration** using an EventBus architecture
- **Test-driven development** with comprehensive test coverage
- **Separation of concerns** through manager classes (State, Settings, Grid,
  UI, BoardState)
- **AI opponents** with four difficulty levels using strategic heuristics
- **Memory management** with comprehensive event cleanup and live monitoring
  tools
- **Linked list navigation** for level progression

## Game Mechanics

**Core Gameplay:**
- Players take turns placing dots in grid cells
- Each cell has a capacity based on position:
  - Corner cells: 2 dots
  - Edge cells: 3 dots
  - Interior cells: 4 dots
  - Blocked cells: capacity 0 (impassable obstacles)
- When a cell reaches capacity, it **explodes**:
  - Distributes dots to orthogonally adjacent cells
  - Converts opponent cells to the exploding player's color
  - Can trigger chain reactions (300ms delay for visual clarity)
- **Win condition:** Control all non-blocked cells on the board

**Features:**
- Multiple level sets with varying board sizes and layouts
- Undo functionality (tracks last 50 moves)
- Four AI difficulty levels with escalating strategic sophistication
- Settings persistence across sessions
- Responsive design for different screen sizes

## Quick Start

```bash
# Install dependencies
npm install

# Run development server (http://localhost:8080)
npm run dev

# Run test suite
npm test

# Build for production
npm run build

# Launch production version locally
npm run prod
```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install project dependencies |
| `npm run dev` | Launch a development web server |
| `npm run prod` | Launch production version locally (builds if needed, starts server, opens browser) |
| `npm run build` | Create a production build in the `dist` folder |
| `npm run test:live` | Launch interactive memory testing dashboard |
| `npm run dev-nolog` | Launch a development web server without sending anonymous data to Phaser |
| `npm run build-nolog` | Create a production build in the `dist` folder without sending anonymous data to Phaser |

## Testing

The Infection! game includes comprehensive testing to ensure reliability and performance.

### Test Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run tests in watch mode with automatic reloading |
| `npm run test:run` | Run all tests once (CI-ready) |
| `npm run test:ui` | Open Vitest UI for interactive testing |
| `npm run test:coverage` | Generate test coverage report |
| `npm run type-check` | Run TypeScript type checking |

### Test Coverage

**Core Data Structures**
- `Level.test.ts` - Level linked list navigation and properties
- `LevelSet.test.ts` - Level set management and traversal

**Manager Classes**
- `SettingsManager.test.ts` - localStorage/registry sync, defaults, read
  priority
- `GameStateManager.test.ts` - State persistence, undo/redo, move history
- `LevelSetManager.test.ts` - Level set loading and switching
- `BoardStateManager.test.ts` - Game logic, explosions, win conditions

**Game Logic**
- `GridManager.test.ts` - Cell capacity, blocked cells, hover states
- `ComputerPlayer.test.ts` - All four AI difficulty levels

**UI Layer**
- `GameUIManager.test.ts` - UI element creation, updates, positioning

**Scene Event Cleanup**
- Per-scene button, grid, and UI event listener cleanup validation
- Uses Phaser's `listenerCount()` API to verify zero leaks

**Memory Management**
- `EventBus.test.ts` - EventBus memory leak prevention
- `BaseScene.test.ts` - Scene shutdown framework
- `MemoryLeakDetector.test.ts` - Memory leak detection utilities

### Memory Management Testing

This project includes comprehensive memory management with live testing
infrastructure.

**Live Memory Monitoring:**

```bash
npm run test:live
```

Opens an interactive dashboard featuring:
- Real-time memory chart with 500ms sampling intervals
- Event marking to correlate game actions with memory patterns
- Automated trend analysis detecting memory growth and volatility
- Rapid scene transition tests validating event cleanup

**Key Features:**
- **EventBus cleanup** - Prevents listener accumulation across Vue-Phaser
  bridge
- **Scene shutdown framework** - All scenes properly dispose of resources
  during transitions
- **Event listener verification** - Uses Phaser's `listenerCount()` API to
  verify zero leaks
- **95% test automation** - Comprehensive event cleanup validation

**Result:** Zero known memory leaks with stable memory usage across extended
gameplay sessions.

## Architecture

### Manager Classes (Separation of Concerns)

The codebase uses specialized manager classes to isolate responsibilities:

- **GameStateManager** - Handles state persistence in Phaser's registry,
  manages undo history (max 50 moves), tracks level progression
- **SettingsManager** - Synchronizes settings between localStorage and
  registry with explicit read priority (registry → localStorage → defaults)
- **LevelSetManager** - Loads level definitions into linked list structures
  for intuitive navigation
- **GridManager** - Handles grid creation, cell capacity calculations, hover
  states, blocked cells
- **BoardStateManager** - Pure game logic (explosions, chain reactions, win
  conditions) separate from Phaser rendering
- **GameUIManager** - Centralizes UI element creation and updates
- **ComputerPlayer** - AI opponent with four difficulty levels using
  strategic heuristics

### Vue-Phaser Bridge

Uses an **EventBus pattern** for bidirectional communication:

```typescript
// Phaser emits to Vue
EventBus.emit('current-scene-ready', this);
EventBus.emit('level-completed', { winner: 'player' });

// Vue listens and responds
EventBus.on('level-completed', (data) => {
  // Update UI, show victory screen, etc.
});
```

The `PhaserGame.vue` component serves as the bridge, initializing Phaser and
managing the communication channel.

### Scene Lifecycle Management

Proper scene lifecycle handling prevents state loss:
- **create()** - Runs once when scene is instantiated
- **wake()** - Runs when sleeping scene becomes active (preserves state)
- **sleep()** - Pauses scene without destroying it
- **shutdown()** - Cleanup method that removes all event listeners

Uses `scene.sleep()`/`scene.wake()` instead of `scene.start()` to preserve
game state during Settings navigation.

### AI Implementation

Four difficulty levels with escalating sophistication:

- **Easy** - Random valid moves
- **Medium** - Explodes full cells, claims corners/edges strategically
- **Hard** - Prioritizes full cells adjacent to opponents for capture
- **Expert** - Evaluates "ullage" (remaining capacity) to gain positional
  advantage

## Development Workflow

**Hot Reloading:** Vite automatically recompiles and reloads the browser when
you edit files in the `src` folder.

**Local Server:** Development server runs on `http://localhost:8080` by
default. See Vite documentation to change port or add SSL.

**EventBus Communication:**

```typescript
// Emit from Phaser to Vue
EventBus.emit('event-name', data);

// Listen in Vue
EventBus.on('event-name', (data) => { /* handle event */ });
```

**Accessing Phaser from Vue:**

```typescript
const phaserRef = ref();
const game = toRaw(phaserRef.value.game) as Phaser.Game;
const scene = toRaw(phaserRef.value.scene) as Phaser.Scene;
```

**Adding New Scenes:** Emit `'current-scene-ready'` via EventBus when the
scene is ready to expose it to Vue.

## Production Deployment

### Local Testing
```bash
# Launch production version locally for testing
npm run prod
```
This builds (if needed), starts a local server, and opens the production version in your browser at `http://localhost:8081`.

### Building for Deployment
```bash
npm run build
```

Builds the game into a single bundle in the `dist/` folder. Upload all
contents of `dist/` to a web server to deploy.

**Key Differences:**
- **Development** (`npm run dev`): Debug level sets visible, hot reloading, verbose logging
- **Production** (`npm run prod`): Debug level sets hidden, optimized build, minimal logging

## Key Technical Decisions

**Why Phaser's registry instead of localStorage for game state?**
- Single source of truth prevents synchronization bugs
- Faster access during gameplay (no JSON parsing)
- Automatic cleanup when game instance is destroyed

**Why linked lists for level navigation?**
- More intuitive API: `currentLevel.next()` vs array index math
- Explicit progression concept in the data structure
- Easier to insert/remove levels without renumbering

**Why manager classes instead of monolithic Game scene?**
- Reduces cognitive load (each file has single responsibility)
- Enables independent testing without mocking entire game
- Makes refactoring safer (changes isolated to specific managers)

## Credits

Created by [Tracy Atteberry](https://tracyatteberry.com) using:
- [Phaser 3](https://phaser.io) game engine
- [Vue 3](https://vuejs.org/) for UI
- [Claude AI](https://claude.ai) for development assistance

**[Read the full technical blog post](https://tracyatteberry.com/posts/infection)**
about the development process and lessons learned.

---

**Note:** This is my first game project. While comprehensive testing and
systematic debugging have addressed known issues, there may be edge cases or
unconventional patterns in the Phaser usage. Feedback and contributions are
welcome!