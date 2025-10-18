# Infection! Germs vs White Cells - Game Design Document

## Overview
Infection is a two-plyer game (one human, one computer) played on grids of varying
sizes and designs. Players take turns adding one dot to an available cell in the grid.
Play continues until one player owns all the cells on the board.

An available cell is one that does not already contain a dot or one that is
alrady owned by the player. Let's say that player one is red and player two is
blue.

- If player one adds a dot to an empty cell, that cell becomes red.
- A cell has a "capacity" equal to the number of orthogonally adjacent cells.
  - A cell in the middle of the board has a capacity of 4.
  - A cell on an edge (but not a corner) has a capacity of 3.
  - A cell in a corner has a capacity of 2.
- If a player adds a dot to a cell they already own, the number of dots in that
  cell increases by one.
- If the number of dots in a cell exceeds its capacity, that cell "explodes".
  - The cell loses a number of dots equal to its capacity.
  - Each orthogonally adjacent cell gains one dot from the exploding cell.
  - If an adjacent cell is owned by the opposing player, it becomes owned by
    the player who caused the explosion.
  - If an adjacent cell now exceeds its capacity, it also explodes. This can
    cause a chain reaction of explosions.
- The game ends when one player owns all the cells on the board.


## Board design
The default board is a 5x5 grid:


```text
|-------|-------|-------|-------|-------|
|       |       |       |       |       |
|       |       |       |       |       |
|       |       |       |       |       |
|-------|-------|-------|-------|-------|
|       |       |     * |     * |       |
|       |   *   |       |   *   |       |
|       |       | *     | *     |       |
|-------|-------|-------|-------|-------|
|       | *   * | *   * | *   * |       |
|       |       |   *   | *   * |       |
|       | *   * | *   * | *   * |       |
|-------|-------|-------|-------|-------|
|       |       |       |       |       |
|       |       |       |       |       |
|       |       |       |       |       |
|-------|-------|-------|-------|-------|
|       |       |       |       |       |
|       |       |       |       |       |
|       |       |       |       |       |
|-------|-------|-------|-------|-------|

```


The board size is configuralbe (up to 9x9) and the design can be changed to
create different gameplay experiences. For example, the following board has
some cells that act as solid blocks. These cells cannot be played in or
owned by either player.


```text
|-------|-------|-------|-------|-------|
|XXXXXXX|       |       |       |XXXXXXX|
|XXXXXXX|       |       |       |XXXXXXX|
|XXXXXXX|       |       |       |XXXXXXX|
|-------|-------|-------|-------|-------|
|       |       |       |       |       |
|       |       |       |       |       |
|       |       |       |       |       |
|-------|-------|-------|-------|-------|
|       |       |XXXXXXX|       |       |
|       |       |XXXXXXX|       |       |
|       |       |XXXXXXX|       |       |
|-------|-------|-------|-------|-------|
|       |       |       |       |       |
|       |       |       |       |       |
|       |       |       |       |       |
|-------|-------|-------|-------|-------|
|XXXXXXX|       |       |       |XXXXXXX|
|XXXXXXX|       |       |       |XXXXXXX|
|XXXXXXX|       |       |       |XXXXXXX|
|-------|-------|-------|-------|-------|
 
```


## User interface

This game is a Phaser 3 project that uses the Vue framework, TypeScript and
Vite for bundling. It includes a bridge for Vue to Phaser game communication,
hot-reloading for quick development workflow and scripts to generate
production-ready builds.

The game is played in a browser. The user interface includes:

- A main menu with options:
    - About
    - Tutorial
    - Splash
    - Settings
    - Start Game
    - High Scores (future)
- A game board that displays the grid, dots, and player turns.
- A sidebar or overlay that shows the current player's turn, scores, and game status.
- A settings menu to adjust game options such as board size and design.
- Level over and game over scenes that announce the winner and offers options.
- Sound effects and possibly background music to enhance the gaming experience.
- Responsive design to ensure the game is playable on various screen sizes and devices.
- Accessibility features such as keyboard controls and screen reader support.
- See more in the "Game plan" section below.

## Settings management

- SettingsManager.ts
  - solely responsible for reading/writing settings to/from localStorage and game.registry
  - its primary job is to keep localStorage and game.registry in sync and define/use default settings when needed
  - we store settings in localStorage so that they persist between game sessions
  - we sync settings to game.registry so that they are easily accessible to all game scenes in an in-memory store
  - reading is always attempted from the game.registry first, then localStorage, then defaults
  - used by the Settings scene to get/set settings
  - used by the Game scene to read settings, read only
- Settings.ts scene
  - displays current settings using SettingsManager to read them
  - allows user to change settings using SettingsManager to write them
- Game.ts scene
  - Game scene never changes settings, only reads them using SettingsManager
  - Game scene applies settings to game behavior (e.g. sound on/off, player alignment, levelSet)
  - Game scene only applies the LevelSet setting when the game is started/restarted
  - Game scene only applies the player alignment setting when the game is started/restarted
  - Game scene always checks the SettingsManager for the sound setting before playing any sound
    in case this setting was changed in the Settings scene during the course of a game


I would like a code review to ensure that we are handling game state in accordance with our design requirements:

## State management

- GameStateManager.ts
  - helper class for managing game state in the game.registry
  - solely responsible for reading/writing game state to/from the game.registry
  - defines/uses default state when needed
  - game state does not need to persist between game sessions
  - game state does need to persist between game scene changes within a game session in the registry
  - the game state should include:
    - boardState: CellState[][];           // 2D array representing the board state
    - currentPlayer: 'red' | 'blue';       // whose turn it is
    - humanPlayer: 'red' | 'blue';         // which color the human player is
    - computerPlayerColor: 'red' | 'blue'; // which color the computer player is
    - moveHistory: MoveHistoryEntry[];     // history of moves for undo functionality
    - gameOver: boolean;                   // whether the game is over, if we are between levels this is false. cleared when the first move of a game is made
    - levelOver: boolean;                  // whether the current level is over, if we are between levels this is true. cleared when the first move of a level is made
    - currentLevelIndex: number;           // index of the current level in the level set. current LevelSet is in settings
    - levelWinners: ('red' | 'blue')[];    // array of winners for each completed level in the level set
    - winner: string | null;               // 'red' or 'blue' when gameOver is true, otherwise null
- Game.ts scene
  - used by the Game scene to get/set state
  - the game state is reset/initialized when a new game is started/restarted
  - the game state loaded when switching to the game scene (`wake`) and game scene initialized if we are between games
  - Game scene reads state using GameStateManager when the scene is created or woken
  - Game scene writes state using GameStateManager whenever the state changes


## Difficulty levels

### Definitions
Fully loaded cell (or full cell): A cell that has a number of dots equal to its
    capacity and will explode if another dot is added.

Low capacity cell: A cell with a low capacity, such as a corner cell (capacity
    of 2) or an edge cell (capacity of 3).

Cell ullage: The difference between a cell's capacity and the number of dots it
    currently contains. For example, a corner cell with 1 dot has an ullage of 1
    (capacity 2 - 1 dot = 1 ullage).

Advantage cell: A cell that has ullage equal to or less than all adjacent
    opponent cells. For example, if a player has a corner cell with 1 dot (ullage
    1) next to an opponent's edge cell with 2 dots (ullage 1) and an empty cell
    (ullage 3), the corner cell is an advantage cell because its ullage (1) is
    equal to or less than the adjacent opponent cells' ullages (1 and 3).


### Strategy levels
The computer opponent can be set to different difficulty levels:

- Easy: The computer make a random valid move. (This is the default level.)
- Medium: The computer searches for a cell in the following order:
    - a fully loaded cell
    - a low capacity free cell (like a corner cell)
    - a random valid move
- Hard: The computer searches for a cell in the following order:
    - a full cell next to an opponent's full cell
    - a fully loaded cell next to an opponent's cell
    - any fully loaded cell
    - a low capacity free cell (like a corner cell)
    - a random valid move
- Expert: The computer searches for a cell in the following order:
    - a full cell next to an opponent's full cell
    - a fully loaded cell next to an opponent's cell
    - any fully loaded cell
    - an advantage cell
    - a low capacity free cell (like a corner cell)
    - a random valid move

## Game levels and level sets
- Each game will be comprised of multiple levels, called a level set.
- Each level will have a different board design and/or size.
- Each level will have a name and a brief description.
- Each level set will have a name and a brief description.
- Levels and level sets will be defined in JSON files to facilitate easy creation and modification.
- Players can unlock new levels by completing, though not necessarily winning, previous ones.
- A player's progress will be saved, allowing them to resume from the last completed level and board state.
- We will now have the idea winning/losing a level and winning/losing a game.
- A player's final score for the game will be based on their performance across all levels in the level set.
- In the settings menu players can choose a different level set (from a list) to play for the next game.


## Game plan
This section outlines an incremental development process for building the Dots game:

### Phase 1: Basic Grid and Interaction
- [x] Create a 5x5 grid display with clickable cells
- [x] Add visual feedback for cell hover states
- [x] Implement basic dot placement (single dot per cell)
- [x] Add player turn system (red vs blue)
- [x] Display current player indicator

### Phase 2: Core Game Mechanics
- [x] Implement cell capacity calculation based on adjacent cells
- [x] Add multiple dots per cell (visual representation)
- [x] Implement cell ownership (red/blue coloring)
- [x] Add dot explosion logic when capacity is exceeded
- [x] Handle chain reactions from explosions
- [x] Implement win condition detection

### Phase 3: Game Flow and UI
- [x] Add game over screen with winner announcement
- [x] Implement restart functionality
- [x] Add move history/undo capability
- [x] Add sound effects for dot placement and explosion propagation
- [x] Create a settings scene for turning sound effects on/off with room for future settings
- [x] Implement responsive design for different screen sizes

### Phase 4: AI Opponent
- [x] Add 'Difficulty level' selection in settings (see "Difficulty levels" section above)
- [x] Add settings option for player to choose color (red or blue) and who goes first
- [x] Create 'ComputerPlayer' class
    - Initialize with difficulty level and color
    - A 'findMove' method to determine the next move based on difficulty
    - Initially, the method can return a random valid move
- [x] Implement Easy AI (see "Difficulty levels" section above)
- [x] Use the 'ComputerPlayer' class in the game flow to make moves for the computer player
- [x] Add Medium AI (see "Difficulty levels" section above)
- [x] Develop Hard AI (see "Difficulty levels" section above)
- [x] Create Expert AI (see "Difficulty levels" section above)

### Phase 5: Fixups
- [x] We have a GameOver scene and we should use it. When the game ends:
    - [x] Reset the game state
    - [x] Display the GameOver scene with the winner announcement (and later the score and/or stats)
- [x] In the game scene, add a "Quit" button:
    - [x] Reset the game state
    - [x] Display the GameOver scene with "Game Abandoned" instead of a winner announcement

### Phase 6: Levels and Level Sets
- [x] Create level set and level data structures and level definitions (see "Game levels and level sets" section above)
- [x] Implement level progression system through a level set for gameplay (see "Game levels and level sets" section above)
- [x] Display current LevelSet and Level name in the game scene
    - Show below the current player indicator
    - Format as "Now playing ${LevelSet name} on level ${Level name}"
    - Text should be white
- [x] Add LevelSet selection menu in Settings scene
    - This should be labeled "Level Set:" and be a dropdown list of available level sets by name.

### Phase 7: Advanced Features
- [x] Implement game flow with blocked cells
    - currently blocked cells do not work correctly as part of the game flow
    - blocked cells cannot accept dots from an explosion or be owned by either player
    - blocked cells have a capacity of 0
    - blocked cells are never counted when determining another cell's capacity
    - bloacked cells should be visually distinct (e.g., a bright gray color)
- [x] Add board size options (3x3 to 9x9)
- [x] Implement save/load game functionality -- state is tracked in local storage

### Phase 8: Use sprites and animations
- [x] Add sprite animations for dot placement instead of simple circles
- [x] Use sprite animations for main menu instead of simple circles
- [x] Improve dot pulse animation

### Phase 9: Scene Creation and Management
- [x] Move current MainMenu code to a Splash scene
- [x] Create a MainMenu scene with options
    - About
    - Tutorial
    - Splash
    - Settings
    - Play Game
    - High Scores (future)
- [x] Create About scene with game information and credits
- [x] Create Tutorial scene with game instructions
- [x] Create seperate LevelOver and GameOver scenes

### Phase 10: Finish Rebranding
- [x] Change game name from "Dots" to "Infection! Germs vs White Cells"
- [x] Change spash screen logo
- [x] Rename repository
- [x] Update screenshot.png
- [x] Update README.md: Dots -> Infection! Germs vs White Cells

### Phase 11: Scene content
- [x] Add content to About scene
- [x] Add content to Tutorial scene
- [ ] Rearrange Game scene
    - [x] Move turn indicator to top left as tile with appropriate sprite
    - [ ] Move level set and level name to top left ?
    - [ ] Add level description top center above the board
- [x] Improve Settings scene
    - [x] Remove "Who goes first" option. The player should always go first.
    - [x] Remove "AI Difficulty" option. This should be part of the level definition.
    - [x] Change "Player color" option to "Player" with sprite options
- [ ] Improve design of LevelOver and GameOver scenes
    - [x] Replace 'Restart Level' with 'Restart Game' on the LevelOver scene ?
    - [x] Add vertical spacing between buttons on both scenes
    - [ ] Change "Blue/Red Player Wins!" to "White Cells/Germs Win!" and add
          appropriate sprite, adjust text color
    - [ ] On GameOver scene, change "Congratulations!" to show how many levels
          were won out of total levels in the level set with overall winner

### Phase 12: Refactor Level Management
Level management is increasinly complex and difficult to debug and maintain. So it's time to refactor.
The `GameStateManager` currently defines interfaces for `Level` and `LevelSet`.
The existing interfaces could be renamed to `LevelDefinition` and `LevelSetDefinition`.
We wish to create separate `Level` and `LevelSet` classes to better manage levels and level sets.

- [x] Create LevelSetManager.ts
    - [x] responsible for loading level sets from JSON files into LevelSet linked list
    - [x] #getCurrentLevelSet(): LevelSet -- returns the current level set based on registry setting
- [x] Create LevelSet.ts
    - [x] represents a level set, contains metadata and linked list of levels
    - [x] initialized with LevelSetDefinition data from `LevelDefinitions.ts`
    - [x] #first(): Level -- returns the first level in the set
    - [x] #last(): Level -- returns the last level in the set
    - [x] #getLevel(index: number): Level -- returns the level at the given index
- [x] Create Level.ts
    - [x] represents a single level
    - [x] initialized with LevelDefinition data from `LevelDefinitions.ts`
    - [x] #next(): Level | null -- returns the next level in the set or null if last

### Phase 13: Ship it!
- [ ] Add more chohesive level sets and levels
- [ ] Final testing and bug fixing
- [ ] Deploy to production environment
- [ ] Announce release on social media, Phaser, and gaming forums

### Phase 14: Polish and Accessibility
- [ ] Improve computer AI
    - [ ] The expert level AI could be improved further.
    - [x] The level definition has a 'difficulty' field that is not currently used. Possibly use it to adjust the computer AI strategy.
    - [x] If we do this, we could remove the 'difficulty' selection from the settings menu.
- [ ] Create multiple level sets with different themes
- [ ] Add keyboard controls for accessibility
- [ ] Performance optimization and testing

### Deferred Features
- [ ] Add scoring system based on performance across levels
- [ ] Add game statistics tracking
- [ ] Add explosion animations ?
- [ ] Add background music and enhanced sound effects
- [ ] Create level editor for custom level creation - JSON format is easy enough to edit
- [ ] Add visual themes and customization options
- [ ] Implement achievements and badges system

Each phase builds upon the previous one, allowing for incremental testing and refinement of game mechanics.