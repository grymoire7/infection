# Dots - a grid game

## Overview
Dots is a two-plyer game (one human, one computer) played on grids of varying
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

- A main menu with options to start a new game, view instructions, and adjust settings.
- A game board that displays the grid, dots, and player turns.
- A sidebar or overlay that shows the current player's turn, scores, and game status.
- A settings menu to adjust game options such as board size and design.
- A game over screen that announces the winner and offers options to restart or return to the main menu.
- Sound effects and background music to enhance the gaming experience.
- Responsive design to ensure the game is playable on various screen sizes and devices.
- Accessibility features such as keyboard controls and screen reader support.


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
- Each level will increase in difficulty.
- Each level will have a name and a brief description.
- Each level set will have a name and a brief description.
- Levels and level sets will be defined in JSON files to facilitate easy creation and modification.
- Players can unlock new levels by completing, though not necessarily winning, previous ones.
- A player's progress will be saved, allowing them to resume from the last completed level.
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
- [ ] Add 'Difficulty level' selection in settings (see "Difficulty levels" section above)
- [ ] Add settings option for player to choose color (red or blue) and who goes first
- [ ] Create 'ComputerPlayer' class
    - Initialize with difficulty level and color
    - A 'findMove' method to determine the next move based on difficulty
    - Initially, the method can return a random valid move
- [ ] Implement Easy AI (see "Difficulty levels" section above)
- [ ] Add Medium AI (see "Difficulty levels" section above)
- [ ] Develop Hard AI (see "Difficulty levels" section above)
- [ ] Create Expert AI (see "Difficulty levels" section above)

### Phase 5: Levels and Level Sets
- [ ] Create level set and level data structures and level definitions (see "Game levels and level sets" section above)
- [ ] Implement level progression system through a level set for gameplay (see "Game levels and level sets" section above)
- [ ] Add level set selection menu in settings (see "Game levels and level sets" section above)

### Phase 6: Advanced Features
- [ ] Implement custom board designs with blocked cells
- [ ] Add board size options (3x3 to 9x9)
- [ ] Create board template system
- [ ] Add game statistics tracking
- [ ] Implement save/load game functionality
- [ ] Add animations for explosions and dot placement
- [ ] Create multiple level sets with different themes
- [ ] Add level completion tracking and unlocking system
- [ ] Implement player progress saving and loading
- [ ] Add scoring system based on performance across levels

### Phase 7: Polish and Accessibility
- [ ] Create tutorial/help system
- [ ] Add keyboard controls for accessibility
- [ ] Implement screen reader support
- [ ] Add background music and enhanced sound effects
- [ ] Add visual themes and customization options
- [ ] Performance optimization and testing
- [ ] Create level editor for custom level creation
- [ ] Implement achievements and badges system
- [ ] Add social features for sharing progress

Each phase builds upon the previous one, allowing for incremental testing and refinement of game mechanics.

