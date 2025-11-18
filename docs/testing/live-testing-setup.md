# Live Testing Setup Guide

## ✅ Quick Start (3 steps, 30 seconds!)

### Step 1: Open the testing dashboard

**Option A:** Run this command to start servers and open dashboard automatically:
```bash
npm run test:live
```

**Option B:** Or manually navigate to:
```
http://localhost:8080/live-testing.html
```
(Make sure `npm run dev` is running first)

### Step 2: Load the game

**Click the "Show Game" button** at the top of the dashboard page.

This loads the game in an embedded iframe so the testing tools can access it.

### Step 3: Wait for connection

**Wait ~5 seconds** for:
1. The game to load in the iframe
2. The orange "⚠️ Game not detected" banner to turn **green "✅ Game connected!"**
3. The "Active Scene" metric to show the current scene (e.g., "MainMenu")

**That's it!** You're now ready to run tests.

---

## Why embed the game?

**The Problem:** If the game and dashboard are in separate tabs, they can't access each other's `window` objects due to browser security.

**The Solution:** By loading the game in an iframe within the same page as the dashboard, the testing tools can access `iframe.contentWindow.gameInstance` to control and monitor the game.

**Benefits:**
- ✅ No manual console commands needed
- ✅ Automatic game detection
- ✅ Watch metrics update in real-time while playing
- ✅ All in one page - no tab switching

---

## Alternative: Manual Setup (Advanced)

If `npm run test:live` doesn't work:

### Step 1: Start the dev server manually
```bash
npm run dev
```

This starts the server at **http://localhost:8080**

### Step 2: Open TWO tabs from the same server

**Tab 1 - Game:**
- Navigate to: http://localhost:8080

**Tab 2 - Live Testing Dashboard:**
- Navigate to: http://localhost:8080/live-testing.html

### Step 3: Wait for auto-detection

The dashboard will automatically try to find the game. Wait ~5-10 seconds.

### Step 4: If auto-detection fails

Use the manual detection code from the "If Auto-Detection Fails" section above.

### Step 5: Verify connection

**In Tab 2 (Live Testing Dashboard):**

- The orange "⚠️ Game not detected" warning should turn **green**
- It should say "✅ Game connected!"
- You'll see the number of scenes loaded

### Step 6: Run tests!

Now you can:
- Click **"▶️ Start Monitoring"** to track listeners in real-time
- Click **"🔄 Test Rapid Transitions (20x)"** to run automated stress test
- Click **"⚙️ Test Game ↔ Settings (5x)"** to test state preservation
- Click **"📊 Count Listeners Now"** to see current listener breakdown

---

## Troubleshooting

### ❌ "Game not detected" stays orange

**Problem:** The dashboard can't find the Phaser game instance

**Step-by-step debugging:**

**1. Is the game actually running?**
- Open the game tab (http://localhost:8080)
- Look for the Phaser splash screen
- Check console for: `Phaser v3.90.0 (WebGL | Web Audio)`
- Make sure you're past the loading screen and on MainMenu

**2. Try the manual detection code:**
- Copy the entire detection code block from the "If Auto-Detection Fails" section
- Paste it into the **GAME tab's console** (not the testing tab!)
- Watch the console logs to see where detection is failing

**3. Check what the logs show:**

If you see `null` at these steps:
- `Vue root: null` → Vue app not found. Refresh the game tab.
- `Context: null` → Context not accessible. Try again after game fully loads.
- `phaserRef: null` → Component ref not found. This is the most common issue.
- `Wrapper: null` → Wrapper component not instantiated yet. Wait a few seconds.
- `Found game: undefined` or `null` → Game instance not created yet. Wait for splash screen.

**4. Manual inspection (advanced):**

If detection is still failing, inspect the component structure:

```javascript
// Inspect the Vue app structure
const app = document.getElementById('app');
console.log('App element:', app);
console.log('Vue root:', app.__vueParentComponent || app.__vue_app);

// List all properties
const root = app.__vueParentComponent || app.__vue_app?._instance;
console.log('Root keys:', Object.keys(root || {}));
console.log('Context keys:', Object.keys(root?.ctx || root?.proxy || {}));
```

This will show you the actual structure so you can navigate manually.

### ❌ Getting `undefined` when running the detection code

**Most common causes:**

1. **Game not fully loaded** - Wait until you see the MainMenu scene
2. **Wrong tab** - Make sure you're running code in the GAME tab, not testing tab
3. **Different ports** - Both tabs must be on port 8080 (or same port from `npm run test:live`)
4. **Browser cached old version** - Try hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

**Quick fix - Simple detection:**

If the verbose code isn't working, try this simpler version:

```javascript
// Simpler detection that searches globally
window.game = (() => {
  // Check if it's already exposed
  if (window.game) return window.game;

  // Search all Phaser game instances
  const app = document.getElementById('app');
  if (!app) return null;

  // Recursively search for game object
  function searchForGame(obj, depth = 0) {
    if (depth > 5) return null;
    if (!obj || typeof obj !== 'object') return null;

    // Check if this IS a Phaser game
    if (obj.scene && obj.config && obj.events) return obj;

    // Search properties
    for (let key in obj) {
      if (key.startsWith('_') || key === 'parent') continue;
      try {
        const result = searchForGame(obj[key], depth + 1);
        if (result) return result;
      } catch (e) {
        // Skip properties that throw errors
      }
    }
    return null;
  }

  return searchForGame(app);
})();

console.log('Found:', window.game);
```

### ❌ Tests fail with "Phaser game not found"

**Problem:** Tests can't access the game even though connection shows green

**Solution:**
1. Refresh the testing dashboard tab
2. Run the connection code again in the game tab
3. Make sure the game tab is still open and hasn't been closed

### ❌ Listener counts show "N/A"

**Problem:** Dashboard can't detect the active scene

**Solution:**
1. Make sure the game is actually running (not stuck on a loading screen)
2. Try navigating to a scene in the game (like MainMenu)
3. Check the game tab console for any errors
4. Refresh both tabs and reconnect

---

## Architecture Notes

### Why do both tabs need to be on the same port?

**Security:** Browsers enforce the "Same-Origin Policy" which prevents JavaScript from one origin (port 8080) from accessing another origin (port 8081). By serving both the game and the testing dashboard from the same dev server (port 8080), they can communicate freely.

### How does the dashboard access the game?

1. In the game tab, we expose the Phaser game instance to `window.game`
2. Since both tabs share the same `window` object (same origin), the dashboard can access `window.game`
3. The dashboard uses Phaser's built-in `listenerCount()` API to count event listeners
4. Tests can directly call `game.scene.start()` to transition scenes

### Why not use an iframe?

We could embed the game in an iframe within the testing dashboard, but:
- It changes the user experience (game is smaller, in a frame)
- You can't interact with the game and dashboard simultaneously
- Side-by-side tabs give better visibility

---

## Usage Tips

### Best Practice: Arrange Windows Side-by-Side

1. **Left half of screen:** Game tab (http://localhost:8080)
2. **Right half of screen:** Testing dashboard (http://localhost:8080/live-testing.html)

This lets you:
- Play the game on the left
- Watch listener counts update in real-time on the right
- See console logs from both tabs
- Quickly switch focus between tabs

### Enable Chrome DevTools on Both Tabs

**Game tab (left):**
- F12 → Console
- Watch for cleanup logs as you play

**Testing tab (right):**
- F12 → Console
- Watch test results and monitoring logs

### Workflow for Manual Testing

1. Start monitoring in testing dashboard
2. Play the game normally in game tab
3. Watch listener count chart - should stay stable
4. Transition between scenes
5. Verify listener count returns to baseline
6. Run automated tests periodically
7. Check console logs for cleanup messages

---

## What the Tests Do

### 🔄 Rapid Transition Test (20x)
- Transitions between Game and MainMenu 20 times
- Counts listeners after each transition
- **Pass criteria:** Listener counts remain stable (not growing)

### ⚙️ Game ↔ Settings Test (5x)
- Starts a game
- Transitions to Settings and back 5 times
- Verifies listener counts don't accumulate
- **Pass criteria:** Listeners stable, state preserved

### 📊 Count Listeners Now
- Instantly counts all listeners in the current scene
- Breaks down by type: Scene events, Input events, GameObject events
- Useful for debugging specific scenes

---

## Success Indicators

✅ **Everything is working correctly when:**
- Connection status shows green "✅ Game connected!"
- Listener count updates as you change scenes
- Listener chart shows stable pattern (not growing)
- Trend indicator shows "STABLE" or "DECREASING"
- Automated tests show "✅ PASSED"
- Console shows cleanup logs during scene transitions

❌ **There's a problem if:**
- Connection stays orange after running code
- Listener count keeps growing during gameplay
- Trend shows "GROWING (+X%)"
- Tests show "❌ FAILED"
- Console shows errors or warnings
- No cleanup logs appear during transitions
