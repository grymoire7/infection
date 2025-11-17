# Simple State Debugging Guide

This guide shows the minimal enhancements made to help with state debugging without adding unnecessary complexity.

## What Was Added

### 1. SimpleStateManager (Optional Helper)
A lightweight helper for tracking state changes with source information:

```typescript
import { SimpleStateManager } from './SimpleStateManager';

// Create instance (optional - use only when debugging specific issues)
const stateTracker = new SimpleStateManager(this.registry);

// Set values with source tracking
stateTracker.set('currentPlayer', 'red', 'Game.startTurn');
stateTracker.set('score', 100, 'Game.addPoints');

// Debug recent changes
stateTracker.dumpRecentChanges(); // Shows all recent changes
stateTracker.dumpRecentChanges('currentPlayer'); // Shows changes for specific key
```

### 2. Enhanced Debugging in Existing Managers
Both `GameStateManager` and `SettingsManager` now have built-in debugging:

```typescript
// Development mode automatically adds debugging
if (process.env.NODE_ENV === 'development') {
    // Logs state changes and validates values
    // Throws errors for invalid state
}
```

## How to Debug State Issues

### **Scenario 1: Tracking Down State Corruption**

```typescript
// Enable SimpleStateManager to track changes
const stateTracker = new SimpleStateManager(this.registry);

// When you hit the bug, dump recent changes
stateTracker.dumpRecentChanges();

// Example output:
// Recent state changes:
//   2:30:15 PM: currentPlayer = blue (from red) [Game.endTurn]
//   2:30:14 PM: score = 150 (from 100) [Game.addPoints]
//   2:30:13 PM: gameState = [object] (from undefined) [Game.initialize]
```

### **Scenario 2: Invalid State Detection**

The enhanced managers automatically validate state in development:

```typescript
// This will throw an error with details
this.settingsManager.updateSetting('playerColor', 'green'); // Invalid color

// Console output:
// [SettingsManager] Validation failed for playerColor: Invalid playerColor: green
// Error: Invalid playerColor: green
```

### **Scenario 3: Using Phaser's Built-in Events**

You can also use Phaser's events directly:

```typescript
// Listen to all registry changes
this.registry.events.on('changedata', (parent, key, value) => {
    console.log(`Registry changed: ${key} = ${value}`, new Error().stack);
});
```

## Key Improvements

### ✅ **Built-in Validation**
- Automatic validation in development mode
- Clear error messages for invalid state
- Prevents corrupted state from being saved

### ✅ **Better Debugging**
- Console logging of state changes
- Stack traces for debugging (when enabled)
- Source tracking with SimpleStateManager

### ✅ **Performance**
- No overhead in production
- Uses Phaser's optimized Data Manager
- Minimal additional code

## When to Use Each Tool

### **Use SimpleStateManager When:**
- You're debugging a specific state-related bug
- You need to track the source of state changes
- You want a quick audit trail of recent changes

### **Use Built-in Debugging When:**
- You want general state validation
- You're developing and want automatic error detection
- You want to prevent invalid state from being saved

### **Use Phaser Events Directly When:**
- You need fine-grained control over event handling
- You want to build custom debugging tools
- You need to react to specific state changes

## Best Practices

1. **Keep it Simple**: Use the built-in debugging first, only reach for SimpleStateManager when needed
2. **Development Only**: These tools are automatically disabled in production
3. **Descriptive Sources**: When using SimpleStateManager, use clear source names like `'Game.handlePlayerMove'`
4. **Monitor Console**: Watch for validation errors and change logs during development

## Migration

No migration needed! The enhanced managers work exactly like before, just with additional debugging in development mode.

If you want to use SimpleStateManager, create an instance where you need it:

```typescript
// Optional: Only when debugging specific issues
const stateTracker = new SimpleStateManager(this.registry);

// Use instead of direct registry.set() when you need source tracking
stateTracker.set('key', value, 'source');
```

That's it! No complex architecture changes, no performance overhead, just better debugging when you need it.