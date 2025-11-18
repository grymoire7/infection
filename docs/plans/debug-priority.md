# Debugging & Maintenance Priority Improvements

Based on the Phaser usage review ( @docs/plans/phaser-usage-review.md ), here
are the improvements that would most help with maintenance, debugging, and code
reasoning - specifically targeting your bug tracking challenges:

🎯 Top Priority for Debugging & Maintenance

1. State Management Optimization - HIGHEST IMPACT **✅ COMPLETED**

Week 6: State Management from Phase 3
- Why it helps debugging: Cleaner state patterns make it easier to track down state-related bugs
- Files: Registry usage patterns across all scenes
- Key Benefits:
- State Change Caching: Easier to trace when and why state changed
- State Consistency Validation: Detect corrupted state early
- Reduce Cross-Boundary Overhead: Fewer places for state synchronization bugs

2. Comprehensive Error Boundaries - HIGH IMPACT **✅ COMPLETED**

Complete error boundary implementation across Vue-Phaser bridge
- Why it helps debugging: Clear error messages instead of silent failures
- Files:
  - src/game/ErrorLogger.ts - Centralized error logging service
  - src/components/ErrorBoundary.vue - Vue error boundary component
  - src/components/PhaserGameWrapper.vue - Game-specific error protection
  - src/game/BaseScene.ts - Enhanced scene error handling
  - src/App.vue - Top-level error boundary integration
  - src/game/main.ts - Game initialization error handling
- Key Benefits:
- Graceful Error Handling: Bugs don't crash entire application
- Error Logging: Clear error trails for debugging
- User-Friendly Messages: Better UX when bugs occur
- Scene Transition Protection: Catches transition errors that cause game state resets
- Error Recovery: Retry mechanisms and game state preservation
- Export Functionality: Developers can export complete error logs

3. Input Event Cleanup - MEDIUM-HIGH IMPACT

Week 5: Input & Accessibility from Phase 3
- Why it helps debugging: Eliminates ghost interactions that can cause confusing bugs
- Files: All interactive scenes
- Key Benefits:
- No Ghost Events: Prevents input handlers firing on destroyed objects
- Clear Input Flow: Easier to trace user interaction bugs
- Input Context Management: Reduces input conflict bugs

🔧 Secondary Priority for Code Reasoning

4. Object Pooling Implementation - MEDIUM IMPACT

Week 3: Object Management from Phase 2
- Why it helps reasoning: Predictable object lifecycle reduces state confusion
- Files: src/game/VisualDotManager.ts
- Key Benefits:
- Stable Object References: Fewer null/undefined bugs
- Predictable Lifecycle: Easier to reason about object state
- Reduced GC Pressure: Fewer timing-related bugs

5. Integration Testing Framework - MEDIUM IMPACT

Week 7: Testing & Validation from Phase 4
- Why it helps debugging: Automated detection of integration bugs
- Key Benefits:
- Cross-Component Validation: Catch bugs in component interactions
- Regression Prevention: Known bugs stay fixed
- Reproduction Scenarios: Easier to reproduce reported bugs

🚀 Quick Win Suggestion

I'd recommend starting with State Management optimization because:

1. Direct Bug Impact: Many bugs stem from state synchronization issues
2. Foundation: Better state patterns make all other debugging easier
3. Relatively Low Risk: Optimizing existing patterns vs. major refactoring
4. Immediate Benefits: State validation would catch issues early


## Current priority bug - ✅ RESOLVED

**Summary:** When returning to a game from the settings menu, the game state resets instead of resuming the previous game.

**Root Cause:** In `Game.ts:loadGameStateOrLevel()`, when `settingsDirty` flag was detected, the code called `handleSettingsChange()` and returned early, bypassing the saved game restoration logic. The `reloadAllSettings()` method updated player colors/AI but never created the grid or restored visuals when the level set didn't change.

**Fix:** Added game state restoration in `Game.ts:reloadAllSettings()` (lines 775-800). After applying settings changes (when level set unchanged), the code now:
1. Checks if saved state exists
2. Restores level properties from saved state
3. Creates grid and restores board state
4. Recreates visual dots and cell ownership

**Files Modified:**
- `src/game/scenes/Game.ts` - Added saved game restoration after settings change

**Verification:**
- ✅ All 472 tests pass
- ✅ Manual testing confirms game board displays correctly after settings changes
- ✅ Follows same pattern as existing `resumeSavedGame()` method

### Console Output

```
Phaser v3.90.0 (WebGL | Web Audio)  https://phaser.io/v390
App.vue:71 [App] Scene change event received: Splash
App.vue:47 [App] Debug info: {currentSceneKey: 'Splash', allScenes: Array(10), sceneKeys: undefined, active: null}
App.vue:63 [App] Starting Game scene from Splash
Game.ts:48 [Game] ===== SCENE CREATE START =====
SettingsManager.ts:33 [SettingsManager] First instance - loading settings from localStorage
Game.ts:526 Game initialized: Human is red, Computer is blue
Game.ts:113 Starting new level
LevelSetManager.ts:115 LevelSetManager.getCurrentLevelSet: LevelSet {definition: {…}, levels: Array(3), firstLevel: Level, lastLevel: Level, currentLevel: Level}
Game.ts:172 Loading level: 3x3 Grid
Game.ts:573 [Game] ===== RECREATE ALL VISUAL DOTS START =====
Game.ts:575 [Game] Board state for recreation: [
  [
    {
      "dotCount": 0,
      "owner": "default",
      "capacity": 2,
      "isBlocked": false
    },
    {
      "dotCount": 0,
      "owner": "default",
      "capacity": 3,
      "isBlocked": false
    },
    {
      "dotCount": 0,
      "owner": "default",
      "capacity": 2,
      "isBlocked": false
    }
  ],
  [
    {
      "dotCount": 0,
      "owner": "default",
      "capacity": 3,
      "isBlocked": false
    },
    {
      "dotCount": 0,
      "owner": "default",
      "capacity": 4,
      "isBlocked": false
    },
    {
      "dotCount": 0,
      "owner": "default",
      "capacity": 3,
      "isBlocked": false
    }
  ],
  [
    {
      "dotCount": 0,
      "owner": "default",
      "capacity": 2,
      "isBlocked": false
    },
    {
      "dotCount": 0,
      "owner": "default",
      "capacity": 3,
      "isBlocked": false
    },
    {
      "dotCount": 0,
      "owner": "default",
      "capacity": 2,
      "isBlocked": false
    }
  ]
]
Game.ts:576 [Game] VisualDotManager exists: true
Game.ts:577 [Game] GridManager exists: true
Game.ts:583 [Game] ===== RECREATE ALL VISUAL DOTS END =====
Game.ts:526 Game initialized: Human is red, Computer is blue
Game.ts:535 AI set for level: Computer AI is easy
Game.ts:293 Updating level info UI
LevelSetManager.ts:115 LevelSetManager.getCurrentLevelSet: LevelSet {definition: {…}, levels: Array(3), firstLevel: Level, lastLevel: Level, currentLevel: Level}
Game.ts:295 Current level set: LevelSet {definition: {…}, levels: Array(3), firstLevel: Level, lastLevel: Level, currentLevel: Level}
LevelSetManager.ts:115 LevelSetManager.getCurrentLevelSet: LevelSet {definition: {…}, levels: Array(3), firstLevel: Level, lastLevel: Level, currentLevel: Level}
Game.ts:293 Updating level info UI
LevelSetManager.ts:115 LevelSetManager.getCurrentLevelSet: LevelSet {definition: {…}, levels: Array(3), firstLevel: Level, lastLevel: Level, currentLevel: Level}
Game.ts:295 Current level set: LevelSet {definition: {…}, levels: Array(3), firstLevel: Level, lastLevel: Level, currentLevel: Level}
Game.ts:56 [Game] ===== SCENE CREATE END =====
App.vue:71 [App] Scene change event received: Game
Game.ts:360 red placed dot at row 2, col 2 (1/2)
GameStateManager.ts:57 [GameStateManager] Game state changed
Game.ts:670 Computer (blue) choosing move: 1, 2
Game.ts:360 blue placed dot at row 1, col 2 (1/3)
GameStateManager.ts:57 [GameStateManager] Game state changed
App.vue:26 [App] ARCHITECTURE CHANGE: Use start() but rely on GameStateManager preservation
SettingsManager.ts:37 [SettingsManager] Additional instance detected - skipping localStorage sync
App.vue:71 [App] Scene change event received: Settings
SettingsManager.ts:89 [SettingsManager] Settings comparison: {old: {…}, new: {…}, soundChanged: true, colorChanged: false, levelSetChanged: false}
2SettingsManager.ts:24 [SettingsManager] Setting changed: soundEffectsEnabled = false
2SettingsManager.ts:24 [SettingsManager] Setting changed: playerColor = red
2SettingsManager.ts:24 [SettingsManager] Setting changed: levelSetId = default
SettingsManager.ts:75 [SettingsManager] Settings actually changed, marking as dirty
Settings.ts:159 Sound effects disabled
App.vue:47 [App] Debug info: {currentSceneKey: 'Settings', allScenes: Array(10), sceneKeys: undefined, active: null}active: nullallScenes: (10) ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']currentSceneKey: "Settings"sceneKeys: undefined[[Prototype]]: Object
App.vue:58 [App] ARCHITECTURE CHANGE: Starting Game scene - GameStateManager will restore saved state
Game.ts:48 [Game] ===== SCENE CREATE START =====
SettingsManager.ts:37 [SettingsManager] Additional instance detected - skipping localStorage sync
Game.ts:526 Game initialized: Human is red, Computer is blue
Game.ts:98 Settings changed, handling settings update
Game.ts:773 Settings reloaded: Human is red, Computer is blue (easy)
Game.ts:293 Updating level info UI
LevelSetManager.ts:115 LevelSetManager.getCurrentLevelSet: LevelSet {definition: {…}, levels: Array(3), firstLevel: Level, lastLevel: Level, currentLevel: Level}
Game.ts:295 Current level set: LevelSet {definition: {…}, levels: Array(3), firstLevel: Level, lastLevel: Level, currentLevel: Level}
Game.ts:293 Updating level info UI
LevelSetManager.ts:115 LevelSetManager.getCurrentLevelSet: LevelSet {definition: {…}, levels: Array(3), firstLevel: Level, lastLevel: Level, currentLevel: Level}
Game.ts:295 Current level set: LevelSet {definition: {…}, levels: Array(3), firstLevel: Level, lastLevel: Level, currentLevel: Level}
Game.ts:56 [Game] ===== SCENE CREATE END =====
App.vue:71 [App] Scene change event received: Game
```

