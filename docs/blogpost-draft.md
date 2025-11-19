---
title: Building a Phaser 2D grid game with Claude
date: 2025-11-18
draft: true
hideLastModified: true
showInMenu: false
summaryImage: "infection_top.png"
featuredImage: "infection_top.png"
featuredImagePreview: ""
tags: ["AI", "Portfolio", "JS", "Code"]
summary: "Building a simple 2D grid-based game using Phaser and Claude AI."
claude: >
  This post should be in the style of casual expertise -- like a friendly
  and talented teacher explaining complex topics with simple language and examples.
  It is not so casual that it feels unprofessional. We do not use words like "stuff", "cool", or "yeah".
  Use simple language. Not "flowery" or overly dramatic, but sill compelling and easy to read.
  My writing is more like an entertaining conference talk and less like a business whitepaper.
  I use sentence case for headings and subheadings rather than title case.
  Please wrap paragraphs at around 80 characters for readability.
---

# Building a Phaser 2D grid game with Claude

## The experiment

This project started with a simple question: How well could an AI coding
assistant help me build a game using a framework I'd never touched before?

I've spent years writing JavaScript - the language was familiar territory. I
had a passing acquaintance with game development concepts. But TypeScript? I
was a novice. Phaser? Absolutely zero experience. I expected Claude to excel
with TypeScript (plenty of training data), but suspected Phaser knowledge
would be sparse.

The central questions:
- Can Claude navigate a less-common API well enough to build something real?
- Will I understand the generated code well enough to modify and extend it?
- What does it take to give an AI assistant enough context to be genuinely
  useful rather than just generating plausible-looking code that doesn't
  work?

I decided to find out. This is the story of building "Infection: Germs vs
White Cells" - a turn-based grid game where players compete to dominate the
board through strategic dot placement and chain reaction explosions. More
importantly, it's about what I learned collaborating with AI on unfamiliar
territory.

## The foundation: Getting started

I chose a tech stack that mixed familiar and new territory: Phaser 3 for the
game engine, Vue 3 for UI, TypeScript for type safety, and Vite for fast
development builds. Vue would handle menus and overlays while Phaser managed
gameplay.

The first challenge was connecting Vue and Phaser - they're designed for
different purposes and don't naturally integrate. After researching
examples, we settled on an EventBus pattern. PhaserGame.vue became the
bridge component that initializes the Phaser game and sets up bidirectional
communication through events.

```typescript
// Phaser scene emits events to Vue
EventBus.emit('current-scene-ready', this);
EventBus.emit('level-completed', { winner: 'player' });

// Vue listens and responds
EventBus.on('level-completed', (data) => {
  // Update UI, show victory screen, etc.
});
```

This pattern worked well throughout the project. Phaser handled game
logic, Vue handled UI chrome, and they stayed cleanly separated.

The initial gameplay came together surprisingly fast. Within the first
session, we had a working grid where players could click cells, place dots,
and see them explode when cells reached capacity. The turn system worked.
Player indicators updated correctly. The win condition detected when one
player controlled the entire board.

Claude was excellent at generating boilerplate and structure for familiar
patterns. The Vue-Phaser bridge? That exists in lots of projects. Basic game
loops? Common pattern. TypeScript interfaces for game state? Standard stuff.

## Core mechanics: Making it feel like a game

Once the foundation worked, we focused on game feel. The core mechanic is
simple: click a cell to add a dot. When dots exceed a cell's capacity, the
cell explodes and distributes dots to adjacent cells. This can trigger chain
reactions that flip opponent cells to your color.

Cell capacity depends on position:
- Corner cells hold 2 dots (2 neighbors)
- Edge cells hold 3 dots (3 neighbors)
- Interior cells hold 4 dots (4 neighbors)
- Blocked cells hold nothing and don't contribute to neighbor capacity

The explosion logic needed timing. If chain reactions happened instantly,
players couldn't follow what was happening. We added a 300ms delay between
explosions, just enough to watch the cascade unfold without feeling sluggish.

Next we needed variety, different board sizes, obstacles that blocked certain
cells, and increasing difficulty. We needed levels. Rather than storing levels
in a database, we defined them in code as a linked list structure. Each level
points to the next, making navigation intuitive:

```typescript
const currentLevel = this.getCurrentLevel();
const nextLevel = currentLevel.next();
if (nextLevel) {
  this.loadLevel(nextLevel);
} else {
  this.handleGameOver(winner);
}
```

We also added undo functionality, because clicking the wrong cell feels
terrible in a strategy game. The game tracks the last 50 moves and can roll
back the board state. This feature can also be quite useful for testing and
debugging.

## Making it polished: UI and UX

A working game isn't the same as a game that feels good to play. We spent
time on visual polish - dots that pulse when placed, smooth animations,
satisfying sound effects for placement and chain reactions.

The Settings scene let players configure their experience: sound effects
on/off, player colors, which level set to play. The responsive design
ensured the grid centered properly on different screen sizes.

The tricky part was state preservation. When players navigated from the game
to settings and back, they expected their game to still be there. This
required careful management of Phaser's scene lifecycle - sleep and wake
rather than destroy and recreate. We'll come back to this because it caused
one of our biggest bugs.

## Building AI opponents: From random to strategic

A game against yourself gets boring quickly. We needed a computer opponent,
but I didn't want to build a perfect player - that's no fun either. Instead,
we implemented four difficulty levels with escalating sophistication.

**Easy AI** picks random valid moves. No strategy, just valid placement.

**Medium AI** looks for tactical opportunities:
- Explode fully loaded cells (capacity reached)
- Claim corner and edge cells (harder for opponent to capture)
- Otherwise pick randomly

**Hard AI** adds offensive tactics:
- Prioritize full cells adjacent to opponent cells (capture on explosion)
- Explode full cells next to opponent's full cells (trigger counter-chains)
- Fall back to medium strategy

**Expert AI** evaluates positional advantage using "ullage" (remaining
capacity). It seeks cells where adding a dot gives advantage over all
adjacent opponent cells, forcing the opponent into difficult positions.

Each level specifies its AI difficulty, so players face escalating challenge
as they progress through a level set.

The development approach: start simple, iterate to complexity. We built the
dumbest thing that could work (random moves), then made it smarter
incrementally based on playtesting feedback.

## Architecture evolution: When code gets messy

Here's where I made my first major mistake: I put too much in Game.ts.
In self-defense, I didn't know yes what the architecture _should_ look like yet.
So I deferred those decisions until later by putting everything in one place.

At first, this seemed fine. The game logic lived in the game scene. Makes
sense, right? But as features accumulated, Game.ts grew to over 1000 lines.
It handled grid creation, cell capacity calculations, explosion logic, AI
moves, UI updates, state persistence, settings management, and level
progression. Reading it required holding too many concepts in your head at
once.

The pain became obvious when bugs appeared. Tracking down a state persistence
bug meant wading through explosion logic and UI code. Fixing the play order
required understanding grid creation. Everything touched everything.

We needed a separation of concerns. Not for "clean code" aesthetics, but
because the cognitive complexity made changes risky and debugging slow.

The refactoring happened incrementally, driven by specific pain points:

**GameStateManager** emerged when state bugs appeared. We needed one clear
place responsible for saving and loading game state to Phaser's registry,
handling undo history, and tracking level progression.

**GridManager** split out when grid logic got complex. Cell capacity
calculations, blocked cell handling, hover states, and visual styling didn't
belong mixed with game logic.

**GameUIManager** formed when UI updates scattered throughout the code. One
change to the player indicator required hunting through multiple methods.
Now UI creation and updates live in one place.

**SettingsManager** centralized the synchronization between localStorage and
Phaser's registry. Settings read priority became explicit: registry first,
then localStorage, then defaults.

**BoardStateManager** extracted the core game logic - explosion mechanics,
chain reactions, win condition detection. This became the pure game engine,
separate from Phaser rendering concerns.

Each refactoring happened when the pain became clear, not as a planned
"rewrite day." We didn't wait for the perfect time to refactor. We
refactored when the current structure made the next feature difficult.

The linked list structure for levels proved elegant. Rather than tracking
level indices and bounds-checking arrays, levels just know their next level.
The code reads naturally: `if (currentLevel.isLast())` instead of `if
(currentLevelIndex >= levels.length - 1)`.

After refactoring, most manager classes stayed under 500 lines with single,
clear responsibilities. The Game scene itself still exceeds 800 lines (it
orchestrates all the managers and handles complex scene lifecycle), but the
cognitive load dropped dramatically. You can now understand GridManager
without knowing anything about state persistence or AI strategy.

## The testing awakening

I need to confess something: I allowed a lot of code to be written before writing
tests.

My rationale seemed sound at the time. I was learning Phaser's architecture
and didn't want to constantly rewrite tests as I figured out the right
patterns. Better to get something working first, then add tests once the
architecture stabilized.

This was expensive.

Without tests, every refactoring risked breaking something. I'd extract
GameStateManager and then manually click through the entire game to verify
level progression still worked. I'd modify explosion logic and hand-test
edge cases by setting up specific board states. Bugs appeared, got fixed,
then reappeared weeks later because nothing prevented regression.

The wake-up call came during a refactoring that broke the undo system in a
subtle way. The game worked for new games, but loading a saved game with
undo history crashed. I'd fixed this bug before. Now it was back.

We needed comprehensive test coverage.

Working with Claude, we built a four-phase testing plan:

**Phase 1: Core data structures** (69 tests)
- Level class: linked list navigation, property access, last level detection
- LevelSet class: level management, traversal, bounds checking

**Phase 2: Manager classes** (196 tests)
- SettingsManager: localStorage/registry sync, defaults, read priority
- GameStateManager: save/load, undo/redo, move history limits
- LevelSetManager: loading definitions, level set switching
- BoardStateManager: game logic, explosions, win conditions

**Phase 3: Game logic** (88 tests)
- GridManager: cell capacity, blocked cells, hover states
- ComputerPlayer: all four difficulty levels, move validation

**Phase 4: UI layer** (49 tests)
- GameUIManager: element creation, updates, positioning

We used Vitest because it's fast, has excellent TypeScript support, and
provides a clean testing API. Tests lived next to their source files:
`GridManager.ts` and `GridManager.test.ts` in the same directory.

The test suite currently has **514 tests across 20 test files**, and they
run in about 1.2 seconds. Fast enough to run on every save during
development.

Writing tests after the fact taught me something: test-driven development
exists for good reasons. The tests we wrote exposed edge cases we'd never
considered. They caught bugs that would have appeared weeks later. They made
refactoring safe instead of terrifying.

If I started this project over, I'd write tests earlier. Not because
tests are "best practice," but because they would have saved me days of
debugging time.

## 🪲 Key challenges and debugging victories

*The real learning happened when things broke. Here are four bugs that
taught me the most about Phaser, systematic debugging, and AI collaboration.*

### Challenge 1: The settings scene reset bug

**Symptom:** Navigate to Settings, change nothing, click Back. The game
resets to the first level. Your in-progress game vanishes.

**First instinct:** The state isn't being saved. We added logging to
GameStateManager. The state was saving perfectly. The state was loading
correctly too. What?

**Root cause:** We were using `scene.start()` to transition between Game and
Settings scenes. This method destroys the current scene and creates a fresh
instance of the target scene. When returning to Game, we got a brand new
Game scene that ran its `create()` method, which loaded the first level by
default.

**The fix:** Phaser scenes have a lifecycle: `create()` runs once when the
scene is first instantiated. `wake()` runs when a sleeping scene becomes
active again. We needed:

```typescript
// In Game scene
navigateToSettings() {
  this.scene.sleep();  // Not scene.start()
  this.scene.launch('Settings');
}

// In Settings scene
goBack() {
  this.scene.stop();
  this.scene.wake('Game');  // Wake the sleeping scene
}
```

We also added a `settingsDirty` flag. If settings actually changed, the Game
scene's `wake()` method reloads them. Otherwise, it just resumes.

**Lesson:** Understanding framework lifecycles matters. Claude knew the
general pattern but didn't initially suggest wake/sleep because the Phaser
API wasn't in its training data as heavily. Providing links to current
Phaser 3.90 documentation helped tremendously. Without docs, Claude would
continue to guess based on older API versions, wasting time.

### Challenge 2: Level progression bug

**Symptom:** Complete the first level, click "Next Level." You see the first
level again instead of level 2.

**The investigation:** We added logging to track what level was being loaded:

```typescript
console.log(`[GameStateManager] Saved state:
  ${JSON.stringify(boardState)}`);
console.log(`[BoardStateManager] Setting state:
  ${JSON.stringify(boardState)}`);
```

The logs revealed the issue: we were saving an empty `boardState` to the
registry, which triggered the "new game" code path that loaded level 1.

**Root cause:** The level completion logic set a `loadNextLevel` flag, but the
state persistence logic also saw an empty board and saved it. This was a race
condition where both actions happened simultaneously, and the empty state won.

**The fix:** Prioritize the `loadNextLevel` flag. Check it before looking at
board state:

```typescript
wake() {
  const savedState = this.stateManager.loadFromRegistry();

  if (savedState?.loadNextLevel) {
    const nextLevel = this.currentLevel.next();
    if (nextLevel) {
      this.loadLevel(nextLevel);
      return;  // Exit early
    }
  }

  // Otherwise restore board state
  if (savedState?.boardState) {
    this.restoreBoardState(savedState.boardState);
  }
}
```

**Lesson:** The linked list structure actually helped here. The code `if
(nextLevel)` makes it obvious we're checking if a next level exists. With
array indices, we'd have `if (currentLevelIndex + 1 < levels.length)`, which
is more error-prone.

### Challenge 3: Level set changes not taking effect

**Symptom:** User selects a different level set in Settings, clicks "Play
Game." They see the old level set instead.

**Root cause:** The Game scene wasn't checking if settings changed while it
was sleeping. It would wake up and continue with the old LevelSetManager.

**The fix:** The `settingsDirty` flag from Challenge 1 solved this too. When
settings change, the flag gets set. On wake, if the flag is set, reload all
settings:

```typescript
wake() {
  const settingsDirty = this.game.registry.get('settingsDirty');

  if (settingsDirty) {
    this.reloadAllSettings();
    this.game.registry.set('settingsDirty', false);
  }

  // ... rest of wake logic
}
```

We also needed defensive logic. What if the user changed both player color
AND level set? Both changes needed to take effect together, not sequentially
with potential state corruption between them.

**Lesson:** State synchronization across scene transitions requires explicit
change detection. Don't assume data hasn't changed while your scene slept.

### Challenge 4: Memory leaks from event listeners

**Symptom:** During manual testing, I noticed the browser memory footprint
growing as I transitioned between scenes repeatedly. Something was leaking.

**The investigation:** We added event listener counting to each scene:

```typescript
shutdown() {
  console.log(`[${this.constructor.name}] Listeners before cleanup:
    ${this.events.listenerCount('pointerdown')}`);
  this.cleanupEventListeners();
  console.log(`[${this.constructor.name}] Listeners after cleanup:
    ${this.events.listenerCount('pointerdown')}`);
}
```

The counts kept growing. Event listeners weren't being cleaned up on scene
transitions.

**The fix:** We added explicit cleanup methods to every scene using TDD.
First, write a test that verifies listeners are removed:

```typescript
it('should clean up all button event listeners on shutdown', () => {
  scene.create();
  const beforeCount = scene.events.listenerCount('pointerdown');
  expect(beforeCount).toBeGreaterThan(0);

  scene.cleanupButtonListeners();

  const afterCount = scene.events.listenerCount('pointerdown');
  expect(afterCount).toBe(0);
});
```

Then implement cleanup:

```typescript
shutdown() {
  this.cleanupButtonListeners();
  this.cleanupGridListeners();
  this.cleanupUIListeners();
}
```

We built a live testing dashboard (`npm run test:live`) that shows real-time
event listener counts during rapid scene transitions. You can watch the
numbers and verify they don't accumulate.

*[Screenshot: Live testing dashboard showing event listener metrics would go
here]*

**Lesson:** Building testing infrastructure surfaced issues we didn't know
existed. The process of creating the dashboard forced us to think about how
to measure cleanup, which led us to Phaser's `listenerCount()` API and
revealed leaks throughout the codebase. We now have 95% test automation for
event cleanup validation and zero known memory leaks.

**Common thread:** Each bug revealed itself through evidence gathering
(logging, instrumentation) rather than guessing. This pattern became the
foundation for our systematic debugging approach.

## The debugging discipline

These four challenges revealed something important: guessing doesn't scale,
even for AI.

Early in the project, Claude would hit a bug and immediately suggest a fix.
Didn't work? Try another. Still broken? Try a third. This guess-and-check
thrashing wasted hours and often made problems worse.

I had access to Jesse Vincent's systematic debugging "superpowers" (think of
them as process discipline plugins for Claude). They just weren't being
enforced. After enough frustration, I made the systematic debugging
superpower mandatory in CLAUDE.md - the project documentation file that
guides Claude's behavior. The protocol is straightforward:

1. **Gather evidence first** - Add logging to understand what's actually
   happening, not what you think is happening
2. **Analyze patterns** - Compare working vs broken implementations
3. **Test single hypotheses** - Make one targeted change to test a theory
4. **Fix root causes** - Address the actual problem, not symptoms

It also includes this note: "Systematic debugging is 5x faster than
guess-and-check thrashing."

Before adding this additional directive, Claude would often suggest fixes immediately:
"Try changing this API call" or "Maybe add this flag." After adding it,
Claude would first suggest adding instrumentation: "Let's add logging to see
what values we're actually getting."

The difference was dramatic. Bugs that previously took hours to solve took
30 minutes. We stopped creating bugs while fixing bugs.

Full disclosure: I'm a senior developer and I knew better. But curiosity got
the best of me. One of my goals was understanding AI behavior patterns to
collaborate more effectively on future projects. I wanted to see if Claude
could guess its way to solutions.

The answer: Sometimes, but unreliably. With sufficient context, guessing
(or pattern recognition that looks like guessing) often worked. On
unfamiliar frameworks like Phaser, it usually failed.

**Key insights:**
- For Claude: Evidence before action. Always.
- For me: Enforce systematic approaches through CLAUDE.md, don't rely on AI
  self-discipline.

For scene lifecycle bugs, we added comprehensive logging:

```typescript
create() {
  console.log(`[${this.constructor.name}] ===== SCENE CREATE START =====`);
  // ... scene creation code ...
  console.log(`[${this.constructor.name}] ===== SCENE CREATE END =====`);
}

wake() {
  console.log(`[${this.constructor.name}] ===== SCENE WAKE START =====`);
  const settings = this.game.registry.get('settingsDirty');
  console.log(`[${this.constructor.name}] Settings dirty: ${settings}`);
  // ... wake logic ...
}
```

This logging made scene transitions visible. We could see exactly when
`create()` ran vs `wake()`, what data each method received, and what order
operations occurred in. Bugs became obvious instead of mysterious.

## Working with Claude: What worked, what didn't

*Hiring managers care about productivity and code quality. Here's an honest
assessment of where AI helped, where it struggled, and what that means for
development teams.*

### What worked well

**Boilerplate and structure:** Claude excels at generating TypeScript
interfaces, class structures, and common patterns. Need a manager class with
standard CRUD operations? Claude writes it in seconds.

**Pattern recognition:** "This looks like the command pattern" or "This is
similar to the observer pattern we used for events" - Claude connects new
problems to solved problems effectively.

**Architectural improvements:** When I recognized Game.ts had grown too
large at 1000+ lines, Claude suggested extraction patterns that made sense.
The refactoring strategies were sound once the problem was identified.

**Test writing:** Once we established a pattern for one test file, Claude
could generate similar tests for other classes. The 514 tests would have
taken weeks to write manually.

**Systematic debugging:** Once convinced to use the systematic debugging superpower,
Claude followed it reliably. This helped enormously and saved a ton of time.

### What required guidance

**Phaser API specifics:** This was the biggest challenge. Claude's training
data apparently has much less Phaser content than TypeScript or Vue. It
would suggest API calls that sounded plausible but didn't exist, or use
patterns from older Phaser versions.

The solution: Provide links to current Phaser 3.90 documentation. When I
sent Claude snippets from official docs, suggestions became more accurate.
Without docs, Claude would guess, and guessing wasted time.

**Project-specific architecture decisions:** Claude couldn't decide whether
to use localStorage vs Phaser's registry, or when to extract a manager class
vs keep code together. These decisions required human judgment based on
project context. Clearer instructions in CLAUDE.md helped, but some decisions
still needed human guidance.

**Refactoring timing:** Claude would sometimes suggest refactoring when we
needed to ship, or suggest shipping when the code really needed cleanup. The
"when" required human intuition.

**Testing discipline:** Without explicit guidance, Claude would tend to
neglect testing. It would happily write feature after feature without
suggesting tests. The comprehensive test suite only happened because I
explicitly requested it and then added requirements to CLAUDE.md.

**Claiming victory too early:** Claude would repeatedly declare a bug fixed
after a potential fix. Before any verification it was ready to mark the item
as complete and move on. It needed reminders to verify that changes actually worked.

### The CLAUDE.md evolution

CLAUDE.md started as a basic README: project structure, how to run tests,
basic architecture notes.

It evolved into the project brain - a comprehensive guide that overrides
Claude's default behavior:

```markdown
## 🚨 MANDATORY DEBUGGING PROTOCOL

**FOR ANY TECHNICAL ISSUE - ALWAYS use systematic debugging**

**FORBIDDEN PATTERNS (cause more bugs than they fix):**
- "Quick fixes" and guesswork - **STRICTLY PROHIBITED**
- Trying random API calls without understanding root cause
- Making multiple changes at once
```

Before this protocol existed, Claude would get caught in guessing loops. Try
a fix, doesn't work, try another, still broken, try a third. The mandatory
protocol broke this pattern.

We documented every resolved bug: symptoms, root causes, fixes. When similar
issues appeared later, the documentation provided patterns to recognize.

The key realization: Documentation is bidirectional. I taught Claude about
the project, and the process of explaining things to Claude clarified my own
understanding. Writing clear instructions forced me to think clearly about
solutions. Some of the lessons learned here will be added to the global
`~/.claude/CLAUDE.md` file for future projects.

**Bottom line:** AI assistance works best as a partnership. The human brings
judgment, context, and architectural vision. The AI brings speed,
consistency, and tireless execution of well-defined tasks. Neither replaces
the other.

## Lessons learned

*Here's what I'd tell my past self, or anyone starting a similar project.*

### Technical lessons

**1. Test early, test often**

Writing tests after code cost significant rework time. Tests exposed edge
cases we'd never considered. They caught regressions before they shipped.
They made refactoring safe.

If I restarted this project, tests would come first. Not as "best practice"
dogma, but as a practical time-saving tool.

**2. Scene lifecycle matters**

Understanding `create()` vs `wake()` vs `sleep()` vs `shutdown()` is
critical in Phaser. The wrong method causes subtle bugs. The right method
makes everything work.

**3. Registry over localStorage**

We used Phaser's registry as the single source of truth for runtime state,
with localStorage only for persistent settings. This prevented
synchronization bugs between storage systems.

**4. Separation of concerns reduces cognitive load**

This isn't about "clean code" aesthetics. When Game.ts exceeded 1000 lines,
making changes became risky because every change could affect multiple
unrelated features. After extracting manager classes, each file became
understandable in isolation.

**5. Linked lists for sequential navigation**

The linked list structure for levels made code readable: `currentLevel.
next()` instead of array index math. It also made the progression concept
explicit in the data structure.

**6. Event cleanup is not optional**

Memory leaks accumulate silently. Without explicit cleanup and testing, the
browser's memory footprint grows. Players might not notice on first play,
but the leak still exists.

### AI collaboration lessons

**1. Documentation is bidirectional**

Teaching Claude about the project clarified my own thinking. Writing
instructions forced clear problem statements. The CLAUDE.md file became as
valuable for me as for the AI.

**2. Systematic approaches scale**

Ad-hoc debugging doesn't work on complex projects. The mandatory debugging
protocol saved enormous amounts of time by preventing guess-and-check
thrashing.

**3. Start simple, iterate to complexity**

We didn't architect everything perfectly from day one. We built the
simplest thing that could work (random AI, basic grid) then made it more
sophisticated incrementally. This approach worked much better than trying to
design the perfect system upfront.

**4. Context files matter**

CLAUDE.md became the project brain. It captured architectural decisions,
debugging patterns, resolved bugs, and mandatory workflows. Without it,
every conversation started from zero.

**5. AI is better with constraints**

Claude works best with clear protocols and explicit constraints. "Debug this
bug" leads to guessing. "Follow the systematic debugging protocol to
investigate this bug" leads to instrumentation and evidence gathering.

### Process lessons

**1. Git commit messages tell the story**

Using conventional commits (feat:, fix:, refactor:, test:) made history
searchable. When debugging the level progression bug, searching for "fix:
level" immediately found commit `0eb8769`. When preparing this blog post,
running `git log --oneline --reverse` showed the project evolution clearly.

**2. Refactoring is continuous**

We didn't schedule "refactoring week." We refactored when current structure
made the next feature difficult:

- Game.ts hit 1000+ lines → extracted GameStateManager
- State bugs appeared → extracted BoardStateManager
- Grid logic got complex → extracted GridManager
- UI updates scattered → extracted GameUIManager

Each refactoring addressed immediate pain, not theoretical future problems.

**3. Build testing infrastructure**

The live testing dashboard (`npm run test:live`) seemed like overkill for a
simple game. But building it forced us to think about how to measure event
cleanup, which revealed the `listenerCount()` API, which exposed leaks we
didn't know existed. The infrastructure paid for itself.

**4. Document gotchas immediately**

Every resolved bug went into CLAUDE.md immediately. The documentation
prevented the same bug from reappearing and provided patterns for similar
issues. Future me thanked past me repeatedly.

## The final numbers

*What AI-assisted development produced:*

**Code quality metrics:**
- **514 tests** across 20 test files (started with 0, grew through 4-phase
  testing plan)
- **95% test automation** for event cleanup validation
- **~1.2 second** test suite execution time (fast enough to run on every
  save)
- **Zero known memory leaks** after systematic cleanup and monitoring

**Architecture:**
- **9 core manager classes** handling distinct concerns (extracted from
  monolithic Game.ts)
- **10 Phaser scenes** managing game flow (Boot → Preloader → Splash →
  MainMenu → Game/About/Tutorial/Settings → LevelOver → GameOver)
- **4 AI difficulty levels** implementing escalating strategic sophistication

**Content:**
- **Multiple level sets** with 5-7 levels each
- **Variable board sizes** and blocked cell patterns for strategic variety
- **100+ commits** documenting the evolution with conventional commit format

The game is playable, maintainable, and well-tested. More importantly, the
codebase is understandable. A developer new to the project could read
GridManager without knowing anything about AI strategy, or modify explosion
logic without understanding state persistence. That's what separation of
concerns actually buys you.

## Was it worth it?

Absolutely.

I built a working game using a framework I'd never used, and the code is
maintainable enough that I'd be comfortable handing it to another developer.
That's the real test.

Claude bridged knowledge gaps effectively where it had training data
(TypeScript, design patterns). Where it lacked context (Phaser specifics,
project architecture), providing documentation and clear constraints made it
productive.

The discipline of testing and documentation paid dividends. The 514-test
suite catches regressions before they reach production. The CLAUDE.md file
captures institutional knowledge that would otherwise live only in my head.
The systematic debugging protocol prevents guess-and-check thrashing that
wastes hours.

**Key insight:** AI works best with clear constraints and feedback. Without
the debugging protocol, Claude would guess. With it, Claude would gather
evidence. Without test requirements, Claude would skip tests. With
requirements, it wrote comprehensive coverage.

The game is playable and reasonably fun. The AI provides genuine challenge.
The animations feel responsive. Is the architecture perfect? Honestly, I
don't know. But it's good enough to ship, iterate on, and extend - which is
the point.

Would I do it again? Absolutely, but I'd establish testing discipline
earlier and encode systematic approaches in CLAUDE.md from day one.

## Try it yourself

Want to see the results or dig into the implementation?

- **[Play the game](https://magicbydesign.com/infection)** - Try it in your
  browser (no installation required)
- **[View the source](https://github.com/grymoire7/infection)** - Explore
  the code with full commit history
- **[Read CLAUDE.md](https://github.com/grymoire7/infection/blob/main/CLAUDE.md)**
  - See the "project brain" that guided development decisions

If you're considering AI-assisted development, especially with unfamiliar
frameworks, here's what I learned works:

- Provide current documentation when the AI lacks training data (links to
  official docs beat guessing every time)
- Establish systematic approaches early (debugging protocols, testing
  requirements)
- Write tests as you go, not retrospectively
- Use a context file (CLAUDE.md) to capture architecture decisions and
  patterns
- Expect to teach the AI your project specifics - documentation is
  bidirectional

**The partnership model:** You bring judgment, architectural vision, and
domain knowledge. AI brings speed, consistency, and tireless execution of
well-defined tasks. Neither replaces the other, but together they can tackle
unfamiliar territory effectively.

Now go build something.

