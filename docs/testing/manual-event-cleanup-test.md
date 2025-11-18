# Manual Event Cleanup Testing Checklist

**Testing Date:** _________________
**Tester:** _________________
**Build Version/Commit:** _________________

## Purpose

This checklist verifies that all input event listeners are properly cleaned up during scene transitions, preventing ghost interactions and memory leaks.

---

## Pre-Test Setup

- [ ] Start dev server: `npm run dev`
- [ ] Open browser to http://localhost:8080
- [ ] Open DevTools Console (F12 → Console tab)
- [ ] Clear console and verify no errors on load

---

## Test 1: GridManager Cleanup

**Goal:** Verify grid cell listeners are cleaned up when leaving Game scene

### Steps:
1. [ ] From MainMenu, click "Play"
2. [ ] Observe console logs showing grid creation
3. [ ] Hover over grid cells - verify they highlight (tint change)
4. [ ] Click a grid cell - verify dot is placed
5. [ ] Click "Quit" button to return to MainMenu
6. [ ] Check console for cleanup log: `[GridManager] Cleaning up cell event listeners`
7. [ ] Verify console log: `[GridManager] Cleaned up N cell event listeners`

**Expected Result:**
- ✅ Console shows cleanup logs
- ✅ No errors during transition
- ✅ Clean transition to MainMenu

### Repeat Test:
8. [ ] Click "Play" again to return to Game scene
9. [ ] Grid cells still respond to hover
10. [ ] Grid cells still respond to click
11. [ ] Click "Quit" again
12. [ ] Verify cleanup logs appear again

**Expected Result:**
- ✅ Grid remains fully functional after scene re-creation
- ✅ No duplicate event handlers (clicks only trigger once)

---

## Test 2: GameUIManager Cleanup

**Goal:** Verify UI button listeners (Undo, Quit) are cleaned up

### Steps:
1. [ ] From MainMenu, click "Play"
2. [ ] Make 2-3 moves on the grid
3. [ ] Click "Undo" button - verify last move is undone
4. [ ] Hover over "Undo" button - verify tint changes
5. [ ] Hover over "Quit" button - verify tint changes
6. [ ] Click "Quit" to return to MainMenu
7. [ ] Check console for cleanup log: `[GameUIManager] Cleaning up UI button listeners`

**Expected Result:**
- ✅ Console shows GameUIManager cleanup logs
- ✅ No errors during cleanup

### Repeat Test:
8. [ ] Click "Play" again
9. [ ] Make 2-3 moves
10. [ ] Click "Undo" - verify it works
11. [ ] Buttons still respond to hover

**Expected Result:**
- ✅ UI buttons fully functional after re-creation
- ✅ No duplicate handlers (undo doesn't trigger twice)

---

## Test 3: Settings Scene Button Cleanup

**Goal:** Verify Settings scene buttons clean up properly

### Steps:
1. [ ] From MainMenu, click "Settings"
2. [ ] Hover over "Sound Effects" toggle - verify tint change
3. [ ] Click "Sound Effects" toggle - verify it toggles
4. [ ] Hover over "Color" buttons - verify tint changes
5. [ ] Hover over "Level Set" buttons - verify tint changes
6. [ ] Hover over "Close" button - verify tint change
7. [ ] Click "Close" to return to MainMenu
8. [ ] Check console for cleanup log: `[Settings] Cleaning up button listeners`
9. [ ] Verify console shows: `[Settings] Cleaned up N button event listeners`

**Expected Result:**
- ✅ Console shows Settings cleanup logs
- ✅ No errors during cleanup

### Repeat Test:
10. [ ] Click "Settings" again
11. [ ] All buttons still respond to hover
12. [ ] Toggle still works correctly
13. [ ] Click "Close"
14. [ ] Verify cleanup logs appear again

**Expected Result:**
- ✅ Settings scene fully functional after re-creation
- ✅ No duplicate handlers (toggle doesn't fire twice)

---

## Test 4: MainMenu Scene Cleanup

**Goal:** Verify MainMenu items clean up properly

### Steps:
1. [ ] On MainMenu, hover over each menu item - verify color changes
2. [ ] Click "About" menu item
3. [ ] Check console for cleanup log: `[MainMenu] Cleaning up menu item listeners`
4. [ ] On About scene, click "Close" button
5. [ ] Back on MainMenu, verify menu items still respond to hover
6. [ ] Click "Tutorial" menu item
7. [ ] Verify MainMenu cleanup logs appear again
8. [ ] On Tutorial scene, click "Close" button
9. [ ] Verify menu items still respond to hover

**Expected Result:**
- ✅ Console shows MainMenu cleanup logs each time
- ✅ Menu items remain responsive after each transition
- ✅ No duplicate handlers (clicking menu item only fires once)

---

## Test 5: LevelOver Scene Cleanup

**Goal:** Verify LevelOver button cleanup

### Steps:
1. [ ] From MainMenu, click "Play"
2. [ ] Complete the first level (capture all cells)
3. [ ] LevelOver scene appears
4. [ ] Hover over "Next Level" button - verify tint change
5. [ ] Hover over "Quit" button - verify tint change
6. [ ] Click "Next Level"
7. [ ] Check console for cleanup log: `[LevelOver] Cleaning up button listeners`
8. [ ] Play next level and complete it
9. [ ] On LevelOver scene again, verify buttons still respond to hover
10. [ ] Click "Quit" to return to MainMenu

**Expected Result:**
- ✅ Console shows LevelOver cleanup logs
- ✅ Buttons remain responsive after scene re-creation
- ✅ No duplicate handlers

---

## Test 6: GameOver Scene Cleanup

**Goal:** Verify GameOver button cleanup

### Steps:
1. [ ] From MainMenu, click "Play"
2. [ ] Complete all levels in the current level set (or modify code to trigger GameOver quickly)
3. [ ] GameOver scene appears with winner announcement
4. [ ] Hover over "Play Again" button - verify tint change
5. [ ] Hover over "Main Menu" button - verify tint change
6. [ ] Click "Play Again"
7. [ ] Check console for cleanup log: `[GameOver] Cleaning up button listeners`
8. [ ] Game restarts, complete all levels again
9. [ ] On GameOver scene, verify buttons still respond
10. [ ] Click "Main Menu"

**Expected Result:**
- ✅ Console shows GameOver cleanup logs
- ✅ Buttons remain responsive
- ✅ No duplicate handlers

---

## Test 7: About Scene Cleanup

**Goal:** Verify About scene button cleanup

### Steps:
1. [ ] From MainMenu, click "About"
2. [ ] Hover over "Close" button - verify tint change
3. [ ] Click "Close" button
4. [ ] Check console for cleanup log: `[About] Cleaning up button listeners`
5. [ ] Click "About" again
6. [ ] Hover over "Close" - verify still responsive
7. [ ] Click "Close"
8. [ ] Verify cleanup logs appear again

**Expected Result:**
- ✅ Console shows About cleanup logs
- ✅ Button remains responsive
- ✅ No duplicate handlers

---

## Test 8: Tutorial Scene Cleanup

**Goal:** Verify Tutorial scene button cleanup

### Steps:
1. [ ] From MainMenu, click "Tutorial"
2. [ ] Hover over "Close" button - verify tint change
3. [ ] Click "Close" button
4. [ ] Check console for cleanup log: `[Tutorial] Cleaning up button listeners`
5. [ ] Click "Tutorial" again
6. [ ] Hover over "Close" - verify still responsive
7. [ ] Click "Close"
8. [ ] Verify cleanup logs appear again

**Expected Result:**
- ✅ Console shows Tutorial cleanup logs
- ✅ Button remains responsive
- ✅ No duplicate handlers

---

## Test 9: Rapid Scene Transitions (Stress Test)

**Goal:** Verify no memory leaks or errors during rapid scene switching

### Steps:
1. [ ] From MainMenu, click "Play"
2. [ ] Immediately click "Quit" (don't make moves)
3. [ ] Immediately click "Play" again
4. [ ] Repeat Play → Quit cycle **20 times** rapidly
5. [ ] Check console for any errors
6. [ ] Verify cleanup logs appear consistently
7. [ ] On the 21st time, verify game still works normally:
   - [ ] Grid cells respond to hover
   - [ ] Grid cells respond to click
   - [ ] Undo/Quit buttons work

**Expected Result:**
- ✅ No console errors during rapid transitions
- ✅ Cleanup logs appear consistently
- ✅ Game remains fully functional after stress test

### Settings Transition Stress Test:
8. [ ] From MainMenu, click "Settings"
9. [ ] Immediately click "Close"
10. [ ] Repeat Settings → Close cycle **20 times** rapidly
11. [ ] Verify no errors in console
12. [ ] On 21st time, verify Settings scene still works normally

**Expected Result:**
- ✅ No errors during rapid Settings transitions
- ✅ All Settings buttons still responsive

---

## Test 10: Game ↔ Settings Transitions

**Goal:** Verify Game scene state and cleanup when transitioning to/from Settings

### Steps:
1. [ ] From MainMenu, click "Play"
2. [ ] Make 3-4 moves on the grid
3. [ ] Note the current game state (which cells have dots)
4. [ ] Click "Settings" button in game (gear icon or menu)
5. [ ] Check console for cleanup logs from Game scene
6. [ ] In Settings, toggle sound effects
7. [ ] Click "Close" to return to Game
8. [ ] Verify game state is preserved (same dots in same cells)
9. [ ] Verify grid cells still respond to hover
10. [ ] Make another move - verify game continues normally
11. [ ] Repeat steps 4-10 **five times**
12. [ ] Verify no accumulation of listeners (clicks only fire once)

**Expected Result:**
- ✅ Game state preserved across Settings transitions
- ✅ Cleanup logs appear each time Game scene is left
- ✅ Grid remains fully functional after multiple transitions
- ✅ No duplicate handlers accumulate

---

## Test 11: Complete Game Flow Integration

**Goal:** Verify cleanup across entire game flow

### Steps:
1. [ ] Start at MainMenu
2. [ ] Navigate: MainMenu → About → MainMenu
3. [ ] Navigate: MainMenu → Tutorial → MainMenu
4. [ ] Navigate: MainMenu → Settings → MainMenu
5. [ ] Navigate: MainMenu → Play (Game scene)
6. [ ] In Game: Make 2 moves → Undo → Make 3 more moves
7. [ ] Navigate: Game → Settings → Game
8. [ ] Complete level → LevelOver
9. [ ] Navigate: LevelOver → Next Level → Game
10. [ ] Navigate: Game → Settings → Game
11. [ ] Complete level → LevelOver
12. [ ] Navigate: LevelOver → Quit → MainMenu
13. [ ] Navigate: MainMenu → Play → Game
14. [ ] Navigate: Game → Quit → MainMenu

**During this flow, verify:**
- [ ] No errors in console at any point
- [ ] Cleanup logs appear for each scene transition
- [ ] All buttons remain responsive throughout
- [ ] Grid cells remain functional throughout
- [ ] No double-firing of events (clicks only trigger once)

**Expected Result:**
- ✅ Clean console throughout entire flow
- ✅ Consistent cleanup logging
- ✅ All interactions work correctly
- ✅ No memory-related issues

---

## Test 12: Ghost Interaction Prevention

**Goal:** Verify no ghost interactions from destroyed scene elements

### Steps:
1. [ ] From MainMenu, click "Play"
2. [ ] Note the position of a grid cell (e.g., top-left corner)
3. [ ] Click "Quit" to return to MainMenu
4. [ ] Without moving mouse, click where the grid cell was
5. [ ] Verify no game actions occur
6. [ ] Verify no errors in console
7. [ ] From MainMenu, click "Settings"
8. [ ] Click "Close"
9. [ ] Without moving mouse, click where a Settings button was
10. [ ] Verify no Settings actions occur
11. [ ] Verify no errors in console

**Expected Result:**
- ✅ No ghost interactions (clicks on destroyed elements do nothing)
- ✅ No errors from attempting to interact with destroyed elements

---

## Test 13: Memory Stability (Browser DevTools)

**Goal:** Verify event listener counts remain stable

### Steps:
1. [ ] Open Chrome DevTools → Memory tab
2. [ ] Click "Take heap snapshot" (Snapshot 1)
3. [ ] Complete the full integration flow from Test 11
4. [ ] Click "Take heap snapshot" (Snapshot 2)
5. [ ] Compare snapshots:
   - [ ] Look for "Detached DOM nodes" - should be minimal
   - [ ] Check event listener counts - should be stable
   - [ ] Look for memory growth - should be reasonable

**Expected Result:**
- ✅ Minimal detached DOM nodes
- ✅ Event listener count stable (not continuously growing)
- ✅ No significant memory leaks

### Optional Performance Tab Test:
6. [ ] Open DevTools → Performance tab
7. [ ] Click "Record"
8. [ ] Perform rapid scene transitions (20x)
9. [ ] Stop recording
10. [ ] Analyze:
    - [ ] Frame rate should stay ~60fps
    - [ ] No long tasks or jank during transitions
    - [ ] Event listener cleanup should be fast (<5ms)

**Expected Result:**
- ✅ Smooth 60fps performance
- ✅ Fast cleanup operations
- ✅ No performance degradation

---

## Post-Test Verification

### Console Log Review:
- [ ] Review all console logs
- [ ] Verify cleanup logs appeared for each scene transition
- [ ] Verify no errors or warnings
- [ ] Verify listener counts in cleanup logs are consistent

### Functionality Review:
- [ ] All scenes still navigable
- [ ] All buttons still responsive
- [ ] All game mechanics still work
- [ ] No duplicate event handlers
- [ ] No ghost interactions

### Performance Review:
- [ ] Game feels responsive
- [ ] Scene transitions are smooth
- [ ] No noticeable memory issues
- [ ] No frame rate drops

---

## Issues Found

**Document any issues discovered during testing:**

| Test # | Issue Description | Severity | Steps to Reproduce | Notes |
|--------|------------------|----------|-------------------|-------|
| | | | | |
| | | | | |
| | | | | |

---

## Test Summary

**Total Tests:** 13
**Passed:** _____ / 13
**Failed:** _____ / 13
**Blocked:** _____ / 13

**Overall Result:** ☐ PASS  ☐ FAIL  ☐ PASS WITH ISSUES

**Tester Notes:**
_____________________________________________________________________________
_____________________________________________________________________________
_____________________________________________________________________________

**Sign-off:** _________________  **Date:** _________________
