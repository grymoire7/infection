# Streamlined Manual Event Cleanup Testing

**Purpose:** This streamlined checklist focuses on tests that cannot be automated and require human judgment. All automated tests (unit tests + live-testing.html) should be run first.

**Prerequisites:**
- ✅ All 514 unit tests passing (`npm run test:run`)
- ✅ Automated cleanup tests passing in live-testing.html
- ✅ `npm run dev` running at http://localhost:8080
- ✅ live-testing.html open in a separate tab for monitoring

---

## Test 1: Complete Game Flow Integration

**Goal:** Verify cleanup and functionality across the entire game flow with human judgment

**Estimated Time:** 5-7 minutes

### Setup
1. [ ] Open game at http://localhost:8080
2. [ ] Open live-testing.html in another tab
3. [ ] In game tab, open DevTools Console (F12)
4. [ ] Expose game: Run in console:
   ```javascript
   window.game = window.__PHASER_GAME__ || (()=> {
     const app = document.getElementById('app');
     return app?.__vue__?.$refs?.phaserGame?.game;
   })()
   ```
5. [ ] In live-testing.html tab, click "▶️ Start Monitoring"
6. [ ] Verify listener count appears in live-testing.html

### Complete Flow Test

Navigate through this complete game flow while monitoring listener counts:

#### Part 1: Menu Navigation (1 min)
1. [ ] **MainMenu → About**
   - Hover over "About" menu item - verify color change
   - Click "About"
   - Check live-testing.html - listener count updated for About scene
   - Check console - verify MainMenu cleanup logs

2. [ ] **About → MainMenu**
   - Click "Close" button on About scene
   - Check console - verify About cleanup logs
   - Verify MainMenu menu items still responsive

3. [ ] **MainMenu → Tutorial → MainMenu**
   - Click "Tutorial", then "Close"
   - Verify console cleanup logs appear
   - Verify menu items still responsive

4. [ ] **MainMenu → Settings → MainMenu**
   - Click "Settings"
   - Toggle sound effects - verify it works
   - Click "Close"
   - Verify cleanup logs
   - Verify menu items still responsive

#### Part 2: Gameplay & Transitions (3 min)
5. [ ] **MainMenu → Game**
   - Click "Play"
   - Check live-testing.html - verify listener count for Game scene
   - Verify grid cells respond to hover (tint change)

6. [ ] **Make moves and use Undo**
   - Make 3-4 moves on the grid
   - Click "Undo" button - verify it works
   - Make 2 more moves
   - Verify no duplicate actions (undo only triggers once per click)

7. [ ] **Game → Settings → Game (state preservation)**
   - Note current game state (which cells have dots)
   - Click Settings button in game
   - Check console - verify Game scene cleanup/sleep logs
   - In Settings, change player color
   - Click "Close" to return to Game
   - **CRITICAL:** Verify game state preserved (same dots in same cells)
   - Verify grid cells still respond to hover
   - Make another move - verify game continues normally

8. [ ] **Complete Level → LevelOver**
   - Complete the current level (capture all cells)
   - LevelOver scene appears
   - Check console - verify cleanup logs
   - Hover over "Next Level" and "Quit" buttons - verify tint change
   - Check live-testing.html - listener count updated

9. [ ] **LevelOver → Next Level**
   - Click "Next Level"
   - Verify cleanup logs in console
   - New level loads
   - Verify grid is interactive
   - Make 1-2 moves

#### Part 3: Settings Mid-Game (1 min)
10. [ ] **Game → Settings → Game (repeat cycle)**
    - From game, click Settings
    - Toggle sound effects
    - Click "Close"
    - Verify game state preserved again
    - Verify no listener accumulation in live-testing.html
    - Make a move to confirm game works

11. [ ] **Complete Level → LevelOver → Quit**
    - Complete current level
    - On LevelOver, click "Quit"
    - Returns to MainMenu
    - Verify all menu items still responsive

#### Part 4: Fresh Game Start (1 min)
12. [ ] **MainMenu → Game (fresh start)**
    - Click "Play" again
    - Verify grid is fully functional
    - Make several moves
    - Undo some moves
    - Verify Undo/Quit buttons work correctly
    - Click "Quit"

### Validation Checks

During the entire flow, verify:

**Console Logs:**
- [ ] No errors at any point
- [ ] Cleanup logs appear for each scene transition
- [ ] Logs show reasonable listener counts being cleaned up
- [ ] No warnings about missing cleanup

**live-testing.html Monitoring:**
- [ ] Listener count updates as scenes change
- [ ] Listener count chart shows stable pattern (not continuously growing)
- [ ] Peak listener count is reasonable (<100)
- [ ] Trend indicator shows "STABLE" or "DECREASING", not "GROWING"

**Functionality:**
- [ ] All buttons remain responsive throughout
- [ ] Grid cells remain functional throughout
- [ ] No duplicate event handlers (clicks only trigger once)
- [ ] Game state preserves correctly across Settings transitions
- [ ] No "ghost interactions" (clicks on empty space don't trigger old handlers)

**User Experience:**
- [ ] Scene transitions feel smooth (no lag)
- [ ] No visual glitches
- [ ] Hover effects work consistently
- [ ] Game feels responsive throughout

---

## Test 2: Memory Stability (DevTools Analysis)

**Goal:** Use browser DevTools to verify no significant memory leaks

**Estimated Time:** 3-5 minutes

### Setup
1. [ ] Close all other tabs to reduce memory noise
2. [ ] In game tab, open DevTools (F12)
3. [ ] Go to **Memory** tab
4. [ ] Select "Heap snapshot"

### Baseline Snapshot
5. [ ] Click "Take snapshot" (Snapshot 1 - Baseline)
6. [ ] Wait for snapshot to complete
7. [ ] Note the heap size in MB

### Run Complete Flow
8. [ ] Perform the complete game flow from Test 1 above
   - Navigate through all menus
   - Play game, transition to Settings and back
   - Complete levels
   - Return to MainMenu

### Post-Flow Snapshot
9. [ ] In Memory tab, click "Take snapshot" (Snapshot 2 - Post-Flow)
10. [ ] Wait for snapshot to complete

### Analysis
11. [ ] Click on Snapshot 2
12. [ ] In dropdown, select "Comparison"
13. [ ] Compare against Snapshot 1 (Baseline)

14. [ ] **Check for Detached DOM Nodes:**
    - In "Class filter" search box, type: `Detached`
    - Look for "Detached DOM tree" entries
    - Acceptable: <10 detached nodes
    - Concerning: >50 detached nodes
    - **Result:** _____ detached nodes found ☐ PASS  ☐ FAIL

15. [ ] **Check for Event Listener Growth:**
    - In "Class filter", search: `EventEmitter`
    - Look at Size Delta column (should be near zero)
    - **Result:** Size delta = _____ MB ☐ PASS  ☐ FAIL

16. [ ] **Check Overall Memory Growth:**
    - Compare heap sizes: Snapshot 2 vs Snapshot 1
    - Calculate growth: (Snapshot2 - Snapshot1) / Snapshot1 * 100
    - Acceptable: <15% growth
    - Concerning: >30% growth
    - **Result:** Growth = _____% ☐ PASS  ☐ FAIL

### Performance Tab (Optional - if time permits)
17. [ ] Go to **Performance** tab
18. [ ] Click "Record" (circle button)
19. [ ] Perform rapid scene transitions (10x)
20. [ ] Stop recording
21. [ ] Analyze recording:
    - Frame rate should stay ~60fps
    - Event listener cleanup should be <5ms
    - No long tasks during transitions
    - **Result:** FPS avg = _____ , Max cleanup time = _____ ms

---

## Test Summary

**Test 1: Complete Flow Integration**
- ☐ PASS - All functionality works, cleanup logs present, listeners stable
- ☐ FAIL - (describe issues): _________________________________

**Test 2: Memory Stability**
- ☐ PASS - Memory growth <15%, few detached nodes, stable listeners
- ☐ FAIL - (describe issues): _________________________________

**Issues Found:**
| Issue | Severity | Description |
|-------|----------|-------------|
|       |          |             |
|       |          |             |

**Overall Result:** ☐ PASS  ☐ PASS WITH MINOR ISSUES  ☐ FAIL

**Tester:** _________________  **Date:** _________________  **Time Spent:** _____ minutes

---

## Success Criteria

✅ **Must Pass:**
- No errors in console during complete flow
- All interactions remain responsive
- Cleanup logs appear for all scene transitions
- Game state preserves across Settings transitions
- No duplicate event firing
- Listener count stable (not growing) in live-testing.html
- Memory growth <30% in DevTools

✅ **Should Pass:**
- Memory growth <15%
- Detached DOM nodes <10
- Listener trend shows "STABLE"
- Frame rate stays at 60fps

✅ **Nice to Have:**
- Memory growth <5%
- Zero detached DOM nodes
- Cleanup operations <2ms

---

## Notes

- This streamlined checklist assumes all automated tests passed first
- Focus on human judgment: does it *feel* right? Are there glitches?
- The goal is to catch issues that automated tests can't detect
- If you find issues, check console logs and live-testing.html for clues
- Most validation is automated - this is just final verification
