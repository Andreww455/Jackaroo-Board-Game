# Jackaroo – A New Game Spin

A single-player JavaFX reimagination of the Middle-Eastern board/card game **Jackaroo**,
developed as a GUC Computer-Programming Lab project (Spring 2025).

## Game Overview

You control **four marbles** against **three CPU opponents**.  
Be the first to move all four marbles from your **Home Zone** → **track** → **Safe Zone** to win.

### Key Rules
| Zone | Description |
|------|-------------|
| **Home Zone** | Starting area – marbles are inactive until fielded |
| **Base Cell** | Entry point onto the 100-cell circular track (play **Ace** or **King**) |
| **Track** | Clockwise movement; collision destroys opponent's marble |
| **Safe Zone** | Final destination – immune to attacks; entry requires exact count |
| **Trap Cells** | 8 hidden cells that destroy a landing marble |

### Card Actions

| Card | Primary Action | Alternative |
|------|---------------|-------------|
| Ace | Field a marble | Move forward 1 |
| 2–3, 6, 8–9 | Move forward N steps | – |
| Four | Move backward 4 | – |
| Five | Move **any** marble forward 5 | – |
| Seven | Split 7 steps across 2 marbles | Move forward 7 |
| Ten | Discard next player's card | Move forward 10 |
| Jack | Swap own ↔ opponent marble | Move forward 11 |
| Queen | Discard random player's card | Move forward 12 |
| King | Field a marble | Move forward 13 (destroys path) |
| MarbleBurner *(wild)* | Send any opponent marble home | – |
| MarbleSaver *(wild)* | Teleport own marble to Safe Zone | – |

## Project Structure

```
JackarooM2Solution/
├── Cards.csv                  # Card definitions (102 cards, 15 types)
├── src/
│   ├── engine/
│   │   ├── Game.java          # Main game orchestrator
│   │   ├── GameManager.java   # Interface: field/burn/discard/sendHome
│   │   └── board/
│   │       ├── Board.java     # 100-cell track + safe zones + movement logic
│   │       ├── BoardManager.java
│   │       ├── Cell.java
│   │       ├── CellType.java
│   │       └── SafeZone.java
│   ├── exception/             # Typed game exceptions
│   ├── model/
│   │   ├── Colour.java        # RED, GREEN, BLUE, YELLOW
│   │   ├── card/              # Card hierarchy (Standard, Ace, King, …, Wild)
│   │   └── player/
│   │       ├── Player.java    # Human player
│   │       ├── CPU.java       # CPU with random-valid-move AI
│   │       └── Marble.java
│   └── view/
│       ├── Main.java          # JavaFX Application entry point
│       ├── HomeController.java
│       ├── HomeView.fxml
│       ├── JackarooController.java   # ← main GUI controller
│       ├── JackarooView.fxml
│       ├── game-style.css
│       └── home.css
└── bin/                       # Eclipse-compiled output (git-ignored)
```

## How to Run (Eclipse)

1. **Import** the project: `File → Import → Existing Projects into Workspace` → select `JackarooM2Solution/`
2. Ensure **JavaFX SDK** is on the build path (Eclipse plug-in or manual library).
3. Add the following **VM arguments** to the run configuration:

   ```
   --module-path /path/to/javafx-sdk/lib --add-modules javafx.controls,javafx.fxml
   ```

4. Run `view.Main` as a Java Application.
5. `Cards.csv` must be in the **working directory** (project root by default in Eclipse).

## How to Play

1. Enter your name on the welcome screen and click **Start Game**.
2. Your hand of 4 cards appears on the right panel.
3. **Click a card** → choose an action (e.g. *Field Marble* or *Move Forward*).
4. **Click a marble** on the board to select it (highlighted in gold).
   - For *Seven Split*: set the split distance field first, then click 2 marbles.
   - For *Jack Swap*: click **your** marble first, then an **opponent's** marble.
5. Click **Play Card** to execute, or **Skip Turn** to discard without playing.
6. CPU players act automatically after a short delay.
7. Win by placing all 4 of your marbles in your Safe Zone!

## Dependencies

- Java 11+
- JavaFX 17+ (`javafx.controls`, `javafx.fxml`)

## Authors

GUC Media Engineering & Technology – Computer Programming Lab, Spring 2025
