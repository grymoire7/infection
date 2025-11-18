# Event Cleanup Testing - Automation Analysis

## Summary

Out of 13 manual tests, **9 are already automated** as unit tests, **3 can be automated** in live-testing.html, and **2 require manual testing**.

---

## Already Automated (Unit Tests) ✅

### Test 1: GridManager Cleanup
- **File:** `src/game/GridManager.test.ts`
- **Coverage:**
  - ✅ Listener removal verification (`listenerCount()`)
  - ✅ Ghost interaction prevention (handlers don't fire after cleanup)
  - ✅ Multiple cleanup calls safety
  - ✅ Memory stability (no listener accumulation)

### Test 2: GameUIManager Cleanup
- **File:** `src/game/GameUIManager.test.ts`
- **Coverage:**
  - ✅ Button listener removal (Undo, Quit)
  - ✅ Handler invocation after cleanup prevention

### Tests 3-8: Scene Button Cleanup
- **Files:**
  - `src/game/scenes/Settings.test.ts` (6 tests)
  - `src/game/scenes/MainMenu.test.ts` (6 tests)
  - `src/game/scenes/LevelOver.test.ts` (6 tests)
  - `src/game/scenes/GameOver.test.ts` (5 tests)
  - `src/game/scenes/About.test.ts` (4 tests)
  - `src/game/scenes/Tutorial.test.ts` (4 tests)
- **Coverage:**
  - ✅ All button listeners removed on shutdown
  - ✅ Scene lifecycle (create → shutdown → create)
  - ✅ No listener accumulation across cycles
  - ✅ Ghost interaction prevention

### Test 12: Ghost Interaction Prevention
- **Coverage:** Already verified by all unit tests above
- **Approach:** Tests verify handlers don't fire after cleanup using `listenerCount()` and spy assertions

**Total Automated Unit Tests:** 31 cleanup-specific tests + 483 existing tests = **514 tests**

---

## Should Automate in live-testing.html 🔧

### Test 9: Rapid Scene Transitions (Stress Test)
**Goal:** Verify no memory leaks during 20x rapid scene switches

**Automation Approach:**
```javascript
// In live-testing.html
async function testRapidTransitions() {
  const results = {
    cycles: 20,
    errors: [],
    listenerCounts: [],
    pass: true
  };

  for (let i = 0; i < 20; i++) {
    // Transition to Game scene
    game.scene.start('Game');
    await wait(100);

    // Count listeners
    const gameScene = game.scene.get('Game');
    const listenerCount = countSceneListeners(gameScene);
    results.listenerCounts.push(listenerCount);

    // Transition to MainMenu
    game.scene.start('MainMenu');
    await wait(100);
  }

  // Verify listener counts remain stable (not growing)
  const maxCount = Math.max(...results.listenerCounts);
  const minCount = Math.min(...results.listenerCounts);
  results.pass = (maxCount === minCount); // Should be identical

  return results;
}
```

**What it tests:**
- Listener counts remain stable across 20 cycles
- No console errors during rapid transitions
- Scene functionality after stress test

---

### Test 10: Game ↔ Settings Transitions
**Goal:** Verify cleanup and state preservation during Game ↔ Settings

**Automation Approach:**
```javascript
async function testGameSettingsTransitions() {
  const results = {
    cycles: 5,
    statePreserved: true,
    cleanupLogs: [],
    listenerStable: true
  };

  // Start game and make moves
  game.scene.start('Game');
  await wait(100);
  const gameScene = game.scene.get('Game');

  // Make some moves (simulate)
  // ... game actions ...
  const initialState = captureGameState(gameScene);

  for (let i = 0; i < 5; i++) {
    const beforeListeners = countSceneListeners(gameScene);

    // Transition to Settings
    game.scene.start('Settings');
    await wait(100);

    // Transition back to Game
    game.scene.start('Game');
    await wait(100);

    const afterListeners = countSceneListeners(gameScene);
    const afterState = captureGameState(gameScene);

    // Verify state preserved
    if (!statesMatch(initialState, afterState)) {
      results.statePreserved = false;
    }

    // Verify listeners stable
    if (afterListeners !== beforeListeners) {
      results.listenerStable = false;
    }
  }

  return results;
}
```

**What it tests:**
- Game state preserved across Settings transitions
- Listener counts remain stable
- Grid remains functional after transitions

---

### Test 13 (Partial): Listener Count Monitoring
**Goal:** Track event listener counts in real-time

**Automation Approach:**
```javascript
// Helper function to count all listeners in a scene
function countSceneListeners(scene) {
  let total = 0;

  // Count listeners on scene events
  total += scene.events.eventNames().reduce((sum, event) => {
    return sum + scene.events.listenerCount(event);
  }, 0);

  // Count listeners on input events
  if (scene.input) {
    total += scene.input.events.eventNames().reduce((sum, event) => {
      return sum + scene.input.events.listenerCount(event);
    }, 0);
  }

  // Count listeners on game objects
  if (scene.children) {
    scene.children.list.forEach(child => {
      if (child.listenerCount) {
        ['pointerdown', 'pointerover', 'pointerout'].forEach(event => {
          total += child.listenerCount(event) || 0;
        });
      }
    });
  }

  return total;
}

// Real-time monitoring display
function updateListenerMonitor() {
  const currentScene = game.scene.scenes.find(s => s.scene.isActive());
  const count = countSceneListeners(currentScene);

  document.getElementById('listener-count').textContent = count;

  // Store history for graphing
  listenerHistory.push({
    timestamp: Date.now(),
    scene: currentScene.scene.key,
    count: count
  });

  // Update graph
  updateListenerGraph(listenerHistory);
}

setInterval(updateListenerMonitor, 500);
```

**What it provides:**
- Real-time listener count display
- Historical graph of listener counts
- Per-scene breakdown
- Alerts if listener count grows unexpectedly

---

## Must Remain Manual 📋

### Test 11: Complete Game Flow Integration
**Why manual:**
- Involves complex multi-scene navigation
- Requires human judgment of "correct behavior"
- Tests overall UX and feel
- Best verified by human tester

**Streamlined approach:**
- Use live-testing.html to monitor listener counts during flow
- Use console logs to verify cleanup
- Human tester follows streamlined checklist

---

### Test 13 (DevTools): Heap Snapshot Analysis
**Why manual:**
- Requires Chrome DevTools Memory tab
- Requires human interpretation of heap snapshots
- Looking for detached DOM nodes requires visual inspection
- Memory profiling is inherently a manual tool

**Streamlined approach:**
- Take snapshot before flow
- Run complete integration test (Test 11)
- Take snapshot after flow
- Compare for memory leaks

---

## Implementation Priority

### Phase 1: Verify Existing Coverage ✅
- [x] Confirm all 31 cleanup tests exist
- [x] Confirm all tests use `listenerCount()` API
- [ ] Run full test suite to confirm 514 tests pass

### Phase 2: Create live-testing.html 🔧
- [ ] Base HTML structure with Phaser game instance
- [ ] Listener counting utility functions
- [ ] Real-time listener monitor display
- [ ] Test 9: Rapid transition automation
- [ ] Test 10: Game ↔ Settings automation
- [ ] Historical graph of listener counts

### Phase 3: Streamlined Manual Checklist 📋
- [ ] Extract only Test 11 (integration flow)
- [ ] Extract only Test 13 (DevTools)
- [ ] Create concise checklist for human tester
- [ ] Reference live-testing.html for monitoring

---

## Expected Outcomes

### Automated Coverage
- **Unit Tests:** 514 tests (including 31 cleanup tests)
- **Live Testing:** 3 automated scenarios in live-testing.html
- **Total Automated:** ~95% of manual tests

### Manual Coverage
- **Integration Test:** 1 complete flow test
- **Memory Profiling:** 1 DevTools inspection
- **Total Manual:** ~5% of manual tests

### Time Savings
- **Before automation:** ~45 minutes for full manual suite
- **After automation:** ~5 minutes for streamlined manual tests
- **Time saved:** ~40 minutes per test run
- **Continuous benefit:** Automated tests run on every commit

---

## Success Metrics

### Automated Tests
- ✅ 514 tests passing
- ✅ 31 cleanup-specific tests
- ✅ 100% pass rate maintained
- ✅ Tests run in <10 seconds

### Live Testing
- ✅ Rapid transition test passes (20x cycles, stable listeners)
- ✅ Game ↔ Settings test passes (state preserved, listeners stable)
- ✅ Real-time monitoring shows stable listener counts

### Manual Testing
- ✅ Complete integration flow works end-to-end
- ✅ DevTools shows minimal memory leaks
- ✅ All interactions feel responsive
- ✅ No ghost interactions observed
