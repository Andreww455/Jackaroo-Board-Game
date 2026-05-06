package view;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import engine.Game;
import engine.board.Cell;
import engine.board.CellType;
import engine.board.SafeZone;
import exception.GameException;
import exception.InvalidCardException;
import exception.InvalidMarbleException;
import exception.SplitOutOfRangeException;
import model.Colour;
import model.card.Card;
import model.card.Deck;
import model.player.Marble;
import model.player.Player;

import javafx.animation.PauseTransition;
import javafx.fxml.FXML;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.Button;
import javafx.scene.control.ComboBox;
import javafx.scene.control.Label;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.scene.layout.ColumnConstraints;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.RowConstraints;
import javafx.scene.layout.StackPane;
import javafx.scene.layout.VBox;
import javafx.scene.paint.Color;
import javafx.scene.shape.Circle;
import javafx.scene.shape.Rectangle;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;
import javafx.scene.text.TextAlignment;
import javafx.util.Duration;

/**
 * JavaFX controller for the Jackaroo game board.
 *
 * ┌─────────────────────────────────────────────────────┐
 * │  BOARD GEOMETRY  (BOARD_SIZE=29 grid, 22px/cell)    │
 * │                                                     │
 * │  Track — 25 cells per side, ZERO position collisions│
 * │   Bottom (cells  0-24): row=27, col= 2..26  →      │
 * │   Right  (cells 25-49): col=27, row=26..2   ↑      │
 * │   Top    (cells 50-74): row= 1, col=26..2   ←      │
 * │   Left   (cells 75-99): col= 1, row= 2..26  ↓      │
 * │                                                     │
 * │  Safe zones (4 cells each, inward from entry):      │
 * │   sz[0] entry=(col1,row25)  → RIGHT cols 2-5,row25 │
 * │   sz[1] entry=(col25,row27) → UP    col25,rows26-23│
 * │   sz[2] entry=(col27,row3)  → LEFT  cols26-23,row3 │
 * │   sz[3] entry=(col3,row1)   → DOWN  col3,rows 2-5  │
 * │                                                     │
 * │  Home zones — 2×2 corner blocks, outside track ring │
 * │   sz[0]: cols0-1, rows27-28 (bottom-left)           │
 * │   sz[1]: cols27-28,rows27-28 (bottom-right)         │
 * │   sz[2]: cols27-28,rows0-1  (top-right)             │
 * │   sz[3]: cols0-1, rows0-1   (top-left)              │
 * └─────────────────────────────────────────────────────┘
 */
public class JackarooController {

    // ── FXML ──────────────────────────────────────────────────────────────────
    @FXML private GridPane  boardGrid;
    @FXML private HBox      playerInfoPanel;
    @FXML private VBox      gameControlPanel;
    @FXML private TextArea  gameMessageArea;
    @FXML private Label     currentActionLabel;
    @FXML private Button    playCardButton;
    @FXML private Button    skipTurnButton;
    @FXML private ComboBox<String> marbleSelector;
    @FXML private TextField splitDistanceField;
    @FXML private HBox      cardHandContainer;
    @FXML private Label     deckSizeLabel;
    @FXML private Label     firePitSizeLabel;

    // ── Engine ────────────────────────────────────────────────────────────────
    private Game gameEngine;

    // ── Action state ──────────────────────────────────────────────────────────
    private Card   selectedCard;
    private String currentAction   = "NONE";
    private int    marblesNeeded   = 0;
    private int    marblesSelected = 0;

    // ── Board UI ──────────────────────────────────────────────────────────────
    /** Views for all 100 track cells, indexed by track position. */
    private List<StackPane>                  trackCells;
    /** Views for each safe zone's 4 cells, keyed by Colour. */
    private HashMap<Colour, List<StackPane>> safeCells;
    /** Home-zone VBoxes, keyed by Colour. */
    private HashMap<Colour, VBox>            homeZones;
    /** Player info HBoxes in the top panel, keyed by Colour. */
    private HashMap<Colour, HBox>            playerInfos;
    /** Card tile VBoxes in the card hand, same order as player.getHand(). */
    private List<VBox>                       cardTiles;
    /** The two-choice action button row inserted in gameControlPanel. */
    private HBox                             choiceRow;
    /** Track cells that are currently gold-highlighted (selected marbles). */
    private final List<StackPane>            highlighted = new ArrayList<>();

    // ── Grid constants ────────────────────────────────────────────────────────
    /** Grid is BOARD_SIZE × BOARD_SIZE cells (indices 0 .. BOARD_SIZE-1). */
    private static final int BOARD_SIZE  = 29;
    /** Pixel size of every grid row and column. Inline style overrides CSS. */
    private static final int CELL_SIZE   = 22;
    /** Radius of marble circles on the track. Diameter = 16 px in a 22 px cell. */
    private static final int MARBLE_R    = 8;

    // ═════════════════════════════════════════════════════════════════════════
    //  FXML initialise — called automatically before any user code
    // ═════════════════════════════════════════════════════════════════════════

    @FXML
    private void initialize() {
        splitDistanceField.setText("1");
        playCardButton.setDisable(true);
        skipTurnButton.setDisable(true);
        marbleSelector.setVisible(false);
        marbleSelector.setDisable(true);
        splitDistanceField.setDisable(true);
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  Public entry points called from Main / HomeController
    // ═════════════════════════════════════════════════════════════════════════

    /** Called by Main after FXML is loaded. Creates the Game engine and board UI. */
    public void initializeGame(String playerName) {
        try {
            gameEngine = new Game(playerName);
            cardTiles  = new ArrayList<>();
            buildBoard();
            buildPlayerInfoPanel();
            msg("Welcome to Jackaroo, " + playerName + "!");
            msg("Your colour: " + gameEngine.getPlayers().get(0).getColour());
            msg("Move all 4 marbles to your Safe Zone to win.");
        } catch (java.io.IOException e) {
            e.printStackTrace();
        }
    }

    /** Called by Main to begin the game loop after the UI is ready. */
    public void startGame() {
        playCardButton.setOnAction(e  -> playCard());
        skipTurnButton.setOnAction(e  -> skipTurn());
        splitDistanceField.setOnAction(e -> applySplit());
        refreshView();
        nextTurn();
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  Board construction — called once during initializeGame
    // ═════════════════════════════════════════════════════════════════════════

    private void buildBoard() {
        boardGrid.getChildren().clear();
        boardGrid.getRowConstraints().clear();
        boardGrid.getColumnConstraints().clear();

        // Fix every row and column to CELL_SIZE so interior cells don't collapse.
        for (int i = 0; i < BOARD_SIZE; i++) {
            RowConstraints    rc = new RowConstraints(CELL_SIZE, CELL_SIZE, CELL_SIZE);
            ColumnConstraints cc = new ColumnConstraints(CELL_SIZE, CELL_SIZE, CELL_SIZE);
            boardGrid.getRowConstraints().add(rc);
            boardGrid.getColumnConstraints().add(cc);
        }

        // ── Centre fire-pit placeholder ───────────────────────────────────────
        VBox firePitCenter = new VBox(4);
        firePitCenter.setAlignment(Pos.CENTER);
        firePitCenter.setStyle(
            "-fx-background-color:#5d3a1a; -fx-background-radius:10;"
          + "-fx-border-color:#8b5e3c; -fx-border-width:2; -fx-border-radius:10;"
        );
        Label fpLbl = new Label("🔥 Fire Pit");
        fpLbl.setFont(Font.font("System", FontWeight.BOLD, 12));
        fpLbl.setTextFill(Color.ORANGE);
        firePitCenter.getChildren().add(fpLbl);
        // Occupies columns 8-20, rows 8-20 (well inside the track ring)
        boardGrid.add(firePitCenter, 8, 8, 13, 13);

        // ── 100 track cells ───────────────────────────────────────────────────
        trackCells = new ArrayList<>(100);
        for (int i = 0; i < 100; i++)
            trackCells.add(makeTrackCell(i));
        placeTrackCells();

        // ── Safe zones & home zones ───────────────────────────────────────────
        safeCells = new HashMap<>();
        homeZones = new HashMap<>();
        buildZones();

        // ── Corner position labels (debug / orientation) ──────────────────────
        cornerLabel("0",  2, 28);   // below cell 0  (col 2, row 27)
        cornerLabel("25", 28, 26);  // right of cell 25 (col 27, row 26)
        cornerLabel("50", 26, 0);   // above cell 50 (col 26, row 1)
        cornerLabel("75", 0, 2);    // left  of cell 75 (col 1,  row 2)
    }

    // ── Track cell factory ────────────────────────────────────────────────────

    private StackPane makeTrackCell(int index) {
        StackPane sp = new StackPane();
        sp.setStyle(inlineSize(CELL_SIZE));   // overrides CSS .cell min/max
        sp.getStyleClass().add("cell");

        CellType ct = gameEngine.getBoard().getTrack().get(index).getCellType();
        if      (ct == CellType.BASE)  sp.getStyleClass().add("base-cell");
        else if (ct == CellType.ENTRY) sp.getStyleClass().add("entry-cell");

        if (gameEngine.getBoard().getTrack().get(index).isTrap())
            sp.getStyleClass().add("trap-cell");

        Circle marble = new Circle(MARBLE_R);
        marble.getStyleClass().add("marble");
        marble.setVisible(false);
        sp.getChildren().add(marble);

        sp.setUserData(index);
        sp.setOnMouseClicked(e -> onTrackCellClicked(sp));
        return sp;
    }

    /**
     * Places 100 track StackPanes in the GridPane.
     *
     * Layout verified by exhaustive position check — no two cells share a grid slot.
     *
     *   Bottom (0-24):  row=27, col = 2 + i          (i in 0..24)
     *   Right  (25-49): col=27, row = 26 - (i-25)    = 51 - i
     *   Top    (50-74): row=1,  col = 26 - (i-50)    = 76 - i
     *   Left   (75-99): col=1,  row = 2  + (i-75)    = i - 73
     */
    private void placeTrackCells() {
        for (int i = 0; i <  25; i++) boardGrid.add(trackCells.get(i),       2 + i,  27);
        for (int i = 25; i <  50; i++) boardGrid.add(trackCells.get(i),      27, 51 - i);
        for (int i = 50; i <  75; i++) boardGrid.add(trackCells.get(i),  76 - i,      1);
        for (int i = 75; i < 100; i++) boardGrid.add(trackCells.get(i),       1, i - 73);
    }

    // ── Safe & home zone construction ─────────────────────────────────────────

    /**
     * Builds safe zones and home zones for all four safe-zone slots.
     *
     * Safe-zone slot index is fixed (not colour-dependent) because the engine
     * always creates safeZones[idx] with base at track[idx*25].
     *
     * Safe-zone entry positions:
     *   sz[0] entry = track[98]  → col=1,  row=25  → safe cells go RIGHT
     *   sz[1] entry = track[23]  → col=25, row=27  → safe cells go UP
     *   sz[2] entry = track[48]  → col=27, row=3   → safe cells go LEFT
     *   sz[3] entry = track[73]  → col=3,  row=1   → safe cells go DOWN
     *
     * Home-zone corners (2×2 grid blocks outside the track ring):
     *   sz[0]: cols 0-1, rows 27-28   (bottom-left)
     *   sz[1]: cols 27-28, rows 27-28 (bottom-right)
     *   sz[2]: cols 27-28, rows 0-1   (top-right)
     *   sz[3]: cols 0-1,  rows 0-1    (top-left)
     */
    private void buildZones() {
        List<SafeZone> szList = gameEngine.getBoard().getSafeZones();

        // [idx][cell][0=col,1=row]  — 4 safe cells per safe zone
        int[][][] safePos = {
            { {2,25}, {3,25}, {4,25}, {5,25}   },   // sz[0] → RIGHT
            { {25,26},{25,25},{25,24},{25,23}   },   // sz[1] → UP
            { {26,3}, {25,3}, {24,3}, {23,3}   },   // sz[2] → LEFT
            { {3,2},  {3,3},  {3,4},  {3,5}    }    // sz[3] → DOWN
        };

        // [idx] = { startCol, startRow, colSpan, rowSpan }
        int[][] homePos = {
            {0,  27, 2, 2},   // sz[0]: bottom-left
            {27, 27, 2, 2},   // sz[1]: bottom-right
            {27, 0,  2, 2},   // sz[2]: top-right
            {0,  0,  2, 2}    // sz[3]: top-left
        };

        for (int idx = 0; idx < 4; idx++) {
            Colour col = szList.get(idx).getColour();

            // Safe cells
            List<StackPane> cells = new ArrayList<>(4);
            for (int[] p : safePos[idx]) {
                StackPane sc = makeSafeCell(col);
                boardGrid.add(sc, p[0], p[1]);
                cells.add(sc);
            }
            safeCells.put(col, cells);

            // Home zone
            int[] h = homePos[idx];
            VBox hz = makeHomeZone(col);
            boardGrid.add(hz, h[0], h[1], h[2], h[3]);
            homeZones.put(col, hz);
        }
    }

    private StackPane makeSafeCell(Colour colour) {
        StackPane sp = new StackPane();
        sp.setStyle(inlineSize(CELL_SIZE) + colourBg(colour, 0.45));
        sp.getStyleClass().add("safe-cell");

        Circle m = new Circle(MARBLE_R);
        m.getStyleClass().add("marble");
        m.setVisible(false);
        sp.getChildren().add(m);
        return sp;
    }

    private VBox makeHomeZone(Colour colour) {
        VBox zone = new VBox(3);
        zone.setAlignment(Pos.CENTER);
        zone.setStyle(colourBg(colour, 1.0)
            + "-fx-background-radius:8; -fx-border-radius:8;"
            + "-fx-border-color:rgba(255,255,255,0.4); -fx-border-width:1;");
        zone.setPadding(new Insets(2));

        Label lbl = new Label(colour.name().charAt(0) + "");
        lbl.setFont(Font.font("System", FontWeight.BOLD, 10));
        lbl.setTextFill(Color.WHITE);

        HBox row1 = new HBox(2); row1.setAlignment(Pos.CENTER);
        HBox row2 = new HBox(2); row2.setAlignment(Pos.CENTER);
        for (int i = 0; i < 4; i++) {
            Circle c = new Circle(7);
            c.setFill(toFxColor(colour));
            c.setStroke(Color.WHITE);
            c.setStrokeWidth(1.0);
            c.getStyleClass().add("marble");
            (i < 2 ? row1 : row2).getChildren().add(c);
        }
        zone.getChildren().addAll(lbl, row1, row2);
        zone.setOnMouseClicked(e -> onHomeZoneClicked(colour));
        return zone;
    }

    // ── Helper builders ───────────────────────────────────────────────────────

    /** Inline size style — overrides any CSS min/pref/max rules. */
    private static String inlineSize(int s) {
        return String.format(
            "-fx-min-width:%dpx;-fx-pref-width:%dpx;-fx-max-width:%dpx;"
          + "-fx-min-height:%dpx;-fx-pref-height:%dpx;-fx-max-height:%dpx;",
            s, s, s, s, s, s);
    }

    /** CSS-style background-color string for a Colour at given alpha. */
    private String colourBg(Colour col, double alpha) {
        String hex;
        switch (col) {
            case RED:    hex = "180,30,30";   break;
            case GREEN:  hex = "30,130,30";   break;
            case BLUE:   hex = "30,60,180";   break;
            case YELLOW: hex = "180,140,0";   break;
            default:     hex = "80,80,80";    break;
        }
        return String.format("-fx-background-color:rgba(%s,%.2f);", hex, alpha);
    }

    private Color toFxColor(Colour col) {
        switch (col) {
            case RED:    return Color.CRIMSON;
            case GREEN:  return Color.LIMEGREEN;
            case BLUE:   return Color.ROYALBLUE;
            case YELLOW: return Color.GOLD;
            default:     return Color.GRAY;
        }
    }

    private void cornerLabel(String text, int col, int row) {
        Label l = new Label(text);
        l.setFont(Font.font("System", FontWeight.BOLD, 9));
        l.setTextFill(Color.web("#bdbdbd"));
        boardGrid.add(l, col, row);
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  Player info panel
    // ═════════════════════════════════════════════════════════════════════════

    private void buildPlayerInfoPanel() {
        playerInfos = new HashMap<>();
        playerInfoPanel.getChildren().clear();
        for (Player p : gameEngine.getPlayers()) {
            HBox box = makePlayerInfo(p);
            playerInfos.put(p.getColour(), box);
            playerInfoPanel.getChildren().add(box);
        }
    }

    private HBox makePlayerInfo(Player player) {
        HBox row = new HBox(8);
        row.setAlignment(Pos.CENTER);
        row.setPadding(new Insets(5));
        row.getStyleClass().add("player-info");

        Circle dot = new Circle(10, toFxColor(player.getColour()));
        dot.setStroke(Color.WHITE);
        dot.setStrokeWidth(1.5);

        Label nameLbl   = new Label(player.getName());
        nameLbl.setTextFill(toFxColor(player.getColour()));
        nameLbl.setFont(Font.font("System", FontWeight.BOLD, 13));

        Label cardsLbl  = new Label("Cards: " + player.getHand().size());
        Label statusLbl = new Label("Waiting");

        VBox data = new VBox(2, nameLbl, cardsLbl, statusLbl);
        data.setAlignment(Pos.CENTER_LEFT);

        row.getChildren().addAll(dot, data);
        // Store labels for fast update
        row.setUserData(new Label[]{cardsLbl, statusLbl});
        return row;
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  Game flow
    // ═════════════════════════════════════════════════════════════════════════

    private void nextTurn() {
        Colour active = gameEngine.getActivePlayerColour();
        Player p      = playerByColour(active);
        if (p == null) return;

        msg("─── " + p.getName() + "'s turn ───");
        currentActionLabel.setText(p.getName() + "'s turn");
        refreshPlayerInfo();

        boolean human = (active == gameEngine.getPlayers().get(0).getColour());
        if (human) {
            rebuildCardHand(p.getHand());
            skipTurnButton.setDisable(false);
        } else {
            rebuildCardHand(new ArrayList<>());
            PauseTransition pt = new PauseTransition(Duration.seconds(1.0));
            pt.setOnFinished(ev -> doCPUTurn());
            pt.play();
        }
    }

    private void doCPUTurn() {
        Player cpu = playerByColour(gameEngine.getActivePlayerColour());
        try {
            gameEngine.playPlayerTurn();
            msg(cpu.getName() + " played a card.");
        } catch (GameException ex) {
            // CPU had no valid move — select first card so endPlayerTurn can discard it
            if (!cpu.getHand().isEmpty()) {
                try { gameEngine.selectCard(cpu.getHand().get(0)); }
                catch (InvalidCardException ignored) {}
            }
            msg(cpu.getName() + " had no valid move — skipping.");
        }
        endTurn();
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  Card selection
    // ═════════════════════════════════════════════════════════════════════════

    private void onCardTileClicked(VBox tile) {
        int idx = cardTiles.indexOf(tile);
        if (idx < 0) return;
        Card card = gameEngine.getPlayers().get(0).getHand().get(idx);

        // Deselect engine state, then re-select chosen card
        gameEngine.deselectAll();
        try { gameEngine.selectCard(card); }
        catch (InvalidCardException ex) { err("Card", ex.getMessage()); return; }
        selectedCard = card;

        // Visual: highlight selected tile
        cardTiles.forEach(t -> t.getStyleClass().remove("card-selected"));
        tile.getStyleClass().add("card-selected");

        clearSelectionState();
        presentCardChoices(card);
    }

    private void clearSelectionState() {
        currentAction = "NONE";
        marblesNeeded = marblesSelected = 0;
        playCardButton.setDisable(true);
        splitDistanceField.setDisable(true);
        clearHighlights();
        removeChoiceRow();
    }

    /** Shows action-choice buttons for cards that can act in multiple ways. */
    private void presentCardChoices(Card card) {
        switch (card.getName()) {
            case "Ace":
                twoChoice("Field a Marble (home → base)", "FIELD",
                          "Move Forward 1",               "MOVE"); break;
            case "King":
                twoChoice("Field a Marble (home → base)", "FIELD",
                          "Move Forward 13",              "MOVE"); break;
            case "Queen":
                twoChoice("Discard Random Player's Card", "DISCARD_RANDOM",
                          "Move Forward 12",              "MOVE"); break;
            case "Ten":
                twoChoice("Discard Next Player's Card",   "DISCARD_NEXT",
                          "Move Forward 10",              "MOVE"); break;
            case "Jack":
                twoChoice("Swap Two Marbles",             "JACK_SWAP",
                          "Move Forward 11",              "MOVE"); break;
            case "Seven":
                twoChoice("Split Move (7 total, 2 marbles)", "SEVEN_SPLIT",
                          "Move Forward 7",                  "MOVE"); break;
            case "Four":         setActionMode("MOVE_BACK");  break;
            case "Five":         setActionMode("MOVE_ANY");   break;
            case "MarbleBurner": setActionMode("BURN");       break;
            case "MarbleSaver":  setActionMode("SAVE");       break;
            default:             setActionMode("MOVE");       break;
        }
    }

    private void twoChoice(String labelA, String actionA, String labelB, String actionB) {
        removeChoiceRow();
        choiceRow = new HBox(8);
        choiceRow.setAlignment(Pos.CENTER);
        choiceRow.setPadding(new Insets(4));
        Button bA = makeChoiceBtn(labelA, actionA);
        Button bB = makeChoiceBtn(labelB, actionB);
        choiceRow.getChildren().addAll(bA, bB);
        // Insert near top of control panel (below the action label)
        int at = Math.min(1, gameControlPanel.getChildren().size());
        gameControlPanel.getChildren().add(at, choiceRow);
    }

    private Button makeChoiceBtn(String label, String action) {
        Button b = new Button(label);
        b.getStyleClass().add("action-choice-btn");
        b.setWrapText(true);
        b.setMaxWidth(140);
        b.setOnAction(e -> setActionMode(action));
        return b;
    }

    private void removeChoiceRow() {
        if (choiceRow != null) {
            gameControlPanel.getChildren().remove(choiceRow);
            choiceRow = null;
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  Action-mode state machine
    // ═════════════════════════════════════════════════════════════════════════

    private void setActionMode(String action) {
        currentAction = action;
        marblesSelected = 0;
        clearHighlights();

        // Reset engine marble selection (keep card selected)
        gameEngine.deselectAll();
        if (selectedCard != null) {
            try { gameEngine.selectCard(selectedCard); }
            catch (InvalidCardException ignored) {}
        }

        switch (action) {
            case "FIELD":
            case "DISCARD_RANDOM":
            case "DISCARD_NEXT":
                marblesNeeded = 0;
                playCardButton.setDisable(false);
                splitDistanceField.setDisable(true);
                break;
            case "JACK_SWAP":
                marblesNeeded = 2;
                playCardButton.setDisable(true);
                splitDistanceField.setDisable(true);
                break;
            case "SEVEN_SPLIT":
                marblesNeeded = 2;
                playCardButton.setDisable(true);
                splitDistanceField.setDisable(false);
                splitDistanceField.setText("1");
                break;
            default:
                // MOVE, MOVE_BACK, MOVE_ANY, BURN, SAVE
                marblesNeeded = 1;
                playCardButton.setDisable(true);
                splitDistanceField.setDisable(true);
                break;
        }
        currentActionLabel.setText(hint(action));
    }

    private String hint(String action) {
        switch (action) {
            case "FIELD":          return "Click Play — a marble will be fielded.";
            case "DISCARD_RANDOM": return "Click Play — discard a random opponent's card.";
            case "DISCARD_NEXT":   return "Click Play — discard the next player's card.";
            case "MOVE":           return "Click YOUR marble on the board.";
            case "MOVE_BACK":      return "Click YOUR marble to move it 4 steps back.";
            case "MOVE_ANY":       return "Click ANY marble (moves 5 forward).";
            case "BURN":           return "Click an OPPONENT marble to burn it.";
            case "SAVE":           return "Click YOUR marble to save it to Safe Zone.";
            case "JACK_SWAP":      return "Click YOUR marble, then an OPPONENT's.";
            case "SEVEN_SPLIT":    return "Set distance, click 2 of YOUR marbles.";
            default:               return "Click a marble.";
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  Marble selection
    // ═════════════════════════════════════════════════════════════════════════

    private void onTrackCellClicked(StackPane cell) {
        if (selectedCard == null || marblesNeeded == 0) return;
        if (marblesSelected >= marblesNeeded) {
            msg("Already selected enough marbles. Click Play Card.");
            return;
        }
        int trackIdx = (int) cell.getUserData();
        Marble m = gameEngine.getBoard().getTrack().get(trackIdx).getMarble();
        if (m == null) { msg("No marble at cell " + trackIdx); return; }
        if (!isValidForAction(m)) { msg("Cannot select that marble for this action."); return; }

        try {
            gameEngine.selectMarble(m);
            marblesSelected++;
            cell.getStyleClass().add("cell-selected");
            highlighted.add(cell);
            afterMarbleSelect();
        } catch (InvalidMarbleException ex) {
            err("Marble", ex.getMessage());
        }
    }

    private void onHomeZoneClicked(Colour colour) {
        if (!"FIELD".equals(currentAction)) return;
        if (colour != gameEngine.getPlayers().get(0).getColour()) {
            msg("You can only field YOUR OWN marbles."); return;
        }
        msg("Click 'Play Card' to send a marble to your base.");
    }

    private boolean isValidForAction(Marble m) {
        Colour active = gameEngine.getActivePlayerColour();
        switch (currentAction) {
            case "MOVE":
            case "MOVE_BACK":
            case "SAVE":
                return m.getColour() == active;
            case "MOVE_ANY":
                return true;
            case "BURN":
                return m.getColour() != active;
            case "JACK_SWAP":
                // first marble must be own, second must be opponent's
                return marblesSelected == 0
                    ? m.getColour() == active
                    : m.getColour() != active;
            case "SEVEN_SPLIT":
                return m.getColour() == active;
            default:
                return m.getColour() == active;
        }
    }

    private void afterMarbleSelect() {
        if (marblesSelected >= marblesNeeded) {
            playCardButton.setDisable(false);
            currentActionLabel.setText("Ready! Click 'Play Card'.");
        } else {
            if ("JACK_SWAP".equals(currentAction))
                currentActionLabel.setText("Now click an OPPONENT marble.");
            else if ("SEVEN_SPLIT".equals(currentAction))
                currentActionLabel.setText("Now click your second marble.");
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  Play / Skip / End turn
    // ═════════════════════════════════════════════════════════════════════════

    private void playCard() {
        if (selectedCard == null) { msg("Select a card first."); return; }
        // For split, commit the distance first
        if ("SEVEN_SPLIT".equals(currentAction) && !applySplit()) return;
        try {
            gameEngine.playPlayerTurn();
            msg("Played " + selectedCard.getName() + " — " + moveSummary());
            endTurn();
        } catch (GameException ex) {
            err("Invalid Move", ex.getMessage());
            // Reset marble selection but keep card + mode
            marblesSelected = 0;
            clearHighlights();
            gameEngine.deselectAll();
            if (selectedCard != null) {
                try { gameEngine.selectCard(selectedCard); }
                catch (InvalidCardException ignored) {}
            }
            playCardButton.setDisable(marblesNeeded > 0);
            currentActionLabel.setText(hint(currentAction));
        }
    }

    private void skipTurn() {
        Player human = gameEngine.getPlayers().get(0);
        if (human.getHand().isEmpty()) return;
        try {
            gameEngine.deselectAll();
            Card first = human.getHand().get(0);
            gameEngine.selectCard(first);
            selectedCard = first;
            msg("Skipped — discarded: " + first.getName());
            endTurn();
        } catch (InvalidCardException ex) {
            err("Skip", ex.getMessage());
        }
    }

    /**
     * Reads the split-distance field and tells the engine.
     * @return true on success, false (with error message) on bad input.
     */
    private boolean applySplit() {
        try {
            int d = Integer.parseInt(splitDistanceField.getText().trim());
            gameEngine.editSplitDistance(d);
            return true;
        } catch (NumberFormatException ex) {
            err("Split Distance", "Enter a number 1-6.");
            splitDistanceField.setText("1");
            return false;
        } catch (SplitOutOfRangeException ex) {
            err("Split Distance", ex.getMessage());
            splitDistanceField.setText("1");
            return false;
        }
    }

    private void endTurn() {
        gameEngine.endPlayerTurn();

        // Reset all selection state
        selectedCard    = null;
        currentAction   = "NONE";
        marblesNeeded   = marblesSelected = 0;
        clearHighlights();
        removeChoiceRow();
        cardTiles.forEach(t -> t.getStyleClass().remove("card-selected"));
        playCardButton.setDisable(true);
        skipTurnButton.setDisable(true);
        splitDistanceField.setDisable(true);

        refreshView();

        Colour winner = gameEngine.checkWin();
        if (winner != null) showGameOver(winner);
        else                nextTurn();
    }

    private String moveSummary() {
        switch (currentAction) {
            case "FIELD":          return "fielded a marble from Home.";
            case "DISCARD_RANDOM": return "discarded a random opponent's card.";
            case "DISCARD_NEXT":   return "discarded the next player's card.";
            case "BURN":           return "burned an opponent's marble!";
            case "SAVE":           return "saved a marble to the Safe Zone!";
            case "JACK_SWAP":      return "swapped two marbles.";
            case "SEVEN_SPLIT":    return "split-moved 7 steps across 2 marbles.";
            case "MOVE_BACK":      return "moved backward 4 steps.";
            case "MOVE_ANY":       return "moved a marble 5 forward.";
            default:               return "moved forward.";
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  View refresh — single source of truth: the engine's board state
    // ═════════════════════════════════════════════════════════════════════════

    private void refreshView() {
        refreshPlayerInfo();
        refreshHomeZones();
        refreshBoard();
        refreshDeckAndFP();
    }

    private void refreshPlayerInfo() {
        Colour active = gameEngine.getActivePlayerColour();
        for (Player p : gameEngine.getPlayers()) {
            HBox box = playerInfos.get(p.getColour());
            if (box == null) continue;
            Label[] lbls = (Label[]) box.getUserData();  // [cardsLbl, statusLbl]
            lbls[0].setText("Cards: " + p.getHand().size());
            boolean cur = p.getColour() == active;
            lbls[1].setText(cur ? "▶ Active" : "Waiting");
            lbls[1].setTextFill(cur ? Color.LIMEGREEN : Color.GRAY);
            if (cur) box.getStyleClass().add("player-info-active");
            else     box.getStyleClass().remove("player-info-active");
        }
    }

    /**
     * Updates home-zone marble circles: visible only for marbles still at home.
     * player.getMarbles() returns only marbles in the Home Zone.
     */
    private void refreshHomeZones() {
        for (Player p : gameEngine.getPlayers()) {
            VBox zone = homeZones.get(p.getColour());
            if (zone == null || zone.getChildren().size() < 3) continue;
            int atHome = p.getMarbles().size();
            HBox row1  = (HBox) zone.getChildren().get(1);
            HBox row2  = (HBox) zone.getChildren().get(2);
            int r1size = row1.getChildren().size();
            for (int i = 0; i < r1size; i++)
                row1.getChildren().get(i).setVisible(i < atHome);
            for (int i = 0; i < row2.getChildren().size(); i++)
                row2.getChildren().get(i).setVisible((r1size + i) < atHome);
        }
    }

    /**
     * Clears every marble circle in every track/safe cell, then re-draws from
     * the engine. This is the ONLY method that renders marble positions.
     */
    private void refreshBoard() {
        // Hide all track marble circles
        for (StackPane sp : trackCells) {
            Circle c = findMarbleCircle(sp);
            if (c != null) c.setVisible(false);
        }
        // Hide all safe-zone marble circles
        for (List<StackPane> cells : safeCells.values())
            for (StackPane sp : cells) {
                Circle c = findMarbleCircle(sp);
                if (c != null) c.setVisible(false);
            }

        // Draw track marbles
        List<Cell> track = gameEngine.getBoard().getTrack();
        for (int i = 0; i < track.size(); i++) {
            Marble m = track.get(i).getMarble();
            if (m == null) continue;
            Circle c = getOrCreateMarbleCircle(trackCells.get(i), MARBLE_R);
            styleMarble(c, m.getColour());
            c.setVisible(true);
        }

        // Draw safe-zone marbles
        for (SafeZone sz : gameEngine.getBoard().getSafeZones()) {
            List<StackPane> views = safeCells.get(sz.getColour());
            if (views == null) continue;
            List<Cell> cells = sz.getCells();
            for (int i = 0; i < cells.size() && i < views.size(); i++) {
                Marble m = cells.get(i).getMarble();
                if (m == null) continue;
                Circle c = getOrCreateMarbleCircle(views.get(i), MARBLE_R);
                styleMarble(c, m.getColour());
                c.setVisible(true);
            }
        }
    }

    private Circle findMarbleCircle(StackPane pane) {
        for (javafx.scene.Node n : pane.getChildren())
            if (n instanceof Circle && n.getStyleClass().contains("marble"))
                return (Circle) n;
        return null;
    }

    private Circle getOrCreateMarbleCircle(StackPane pane, double r) {
        Circle c = findMarbleCircle(pane);
        if (c == null) {
            c = new Circle(r);
            c.getStyleClass().add("marble");
            pane.getChildren().add(c);
        }
        return c;
    }

    private void styleMarble(Circle c, Colour colour) {
        c.getStyleClass().removeIf(s -> s.startsWith("marble-"));
        c.getStyleClass().add("marble-" + colour.name().toLowerCase());
        c.setFill(toFxColor(colour));
        c.setStroke(Color.WHITE);
        c.setStrokeWidth(1.5);
    }

    private void refreshDeckAndFP() {
        deckSizeLabel.setText(String.valueOf(Deck.getPoolSize()));
        firePitSizeLabel.setText(String.valueOf(gameEngine.getFirePit().size()));
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  Card hand rendering
    // ═════════════════════════════════════════════════════════════════════════

    private void rebuildCardHand(List<Card> cards) {
        cardHandContainer.getChildren().clear();
        cardTiles.clear();
        for (Card card : cards) {
            VBox tile = makeCardTile(card);
            cardTiles.add(tile);
            cardHandContainer.getChildren().add(tile);
        }
    }

    private VBox makeCardTile(Card card) {
        VBox tile = new VBox(4);
        tile.setAlignment(Pos.CENTER);
        tile.setPadding(new Insets(4));
        tile.getStyleClass().add("card");
        tile.setPrefSize(95, 140);
        tile.setMaxSize(95, 140);

        Rectangle bg = new Rectangle(85, 125);
        bg.setFill(Color.WHITE);
        bg.setStroke(Color.DARKGRAY);
        bg.setStrokeWidth(1.5);
        bg.setArcWidth(10); bg.setArcHeight(10);

        Label nameLbl = new Label(card.getName());
        nameLbl.setFont(Font.font("System", FontWeight.BOLD, 11));
        nameLbl.setWrapText(true);
        nameLbl.setMaxWidth(78);
        nameLbl.setTextAlignment(TextAlignment.CENTER);
        nameLbl.setAlignment(Pos.CENTER);

        Label descLbl = new Label(card.getDescription());
        descLbl.setFont(Font.font("System", 8));
        descLbl.setWrapText(true);
        descLbl.setMaxWidth(78);
        descLbl.setTextAlignment(TextAlignment.CENTER);
        descLbl.setAlignment(Pos.CENTER);

        VBox face = new VBox(4, nameLbl, descLbl);
        face.setAlignment(Pos.CENTER);
        face.setPadding(new Insets(4));

        StackPane card3d = new StackPane(bg, face);
        tile.getChildren().add(card3d);
        tile.setOnMouseClicked(e -> onCardTileClicked(tile));
        return tile;
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  Game Over overlay
    // ═════════════════════════════════════════════════════════════════════════

    private void showGameOver(Colour winnerColour) {
        Player w    = playerByColour(winnerColour);
        String name = (w != null) ? w.getName() : winnerColour.name();
        msg("🏆 GAME OVER — " + name + " wins!");

        VBox box = new VBox(20);
        box.setAlignment(Pos.CENTER);
        box.setPadding(new Insets(30));
        box.setStyle("-fx-background-color:rgba(0,0,0,0.82);"
                   + "-fx-background-radius:20;");

        Label title = new Label("GAME OVER");
        title.setFont(Font.font("System", FontWeight.BOLD, 44));
        title.setTextFill(Color.GOLD);

        Label sub = new Label(name + " wins! 🎉");
        sub.setFont(Font.font("System", FontWeight.BOLD, 28));
        sub.setTextFill(Color.WHITE);

        Button close = new Button("Close");
        close.setStyle("-fx-background-color:#b71c1c; -fx-text-fill:white;"
                     + "-fx-font-size:14px; -fx-padding:8 20 8 20;"
                     + "-fx-background-radius:8; -fx-cursor:hand;");

        StackPane overlay = new StackPane(box);
        overlay.setStyle("-fx-background-color:transparent;");
        overlay.getStyleClass().add("game-over-pane");
        close.setOnAction(e -> boardGrid.getChildren().remove(overlay));

        box.getChildren().addAll(title, sub, close);
        boardGrid.add(overlay, 0, 0, BOARD_SIZE, BOARD_SIZE);
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  Utilities
    // ═════════════════════════════════════════════════════════════════════════

    private void clearHighlights() {
        highlighted.forEach(c -> c.getStyleClass().remove("cell-selected"));
        highlighted.clear();
    }

    private Player playerByColour(Colour col) {
        for (Player p : gameEngine.getPlayers())
            if (p.getColour() == col) return p;
        return null;
    }

    private void msg(String text) {
        gameMessageArea.appendText(text + "\n");
        gameMessageArea.setScrollTop(Double.MAX_VALUE);
    }

    private void err(String title, String detail) {
        String txt = "[✗] " + title + ": " + detail;
        gameMessageArea.appendText(txt + "\n");
        gameMessageArea.setScrollTop(Double.MAX_VALUE);
        // Flash red border for 2 s
        String orig = gameMessageArea.getStyle();
        gameMessageArea.setStyle(orig + "-fx-border-color:#e53935;-fx-border-width:2;");
        PauseTransition pt = new PauseTransition(Duration.seconds(2));
        pt.setOnFinished(e -> gameMessageArea.setStyle(orig));
        pt.play();
    }
}
