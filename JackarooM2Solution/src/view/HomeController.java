package view;

import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.TextField;
import javafx.scene.input.KeyCode;
import javafx.scene.input.KeyEvent;

public class HomeController {
    
    @FXML private TextField playerNameField;
    @FXML private Button startGameButton;
    @FXML private Label errorLabel;
    
    private Main mainApp;
    
    @FXML
    private void initialize() {
        // Set up event handlers
        startGameButton.setOnAction(e -> handleStartGame());
        
        // Add enter key handler to the text field
        playerNameField.setOnKeyPressed(e -> {
            if (e.getCode() == KeyCode.ENTER) {
                handleStartGame();
            }
        });
        
        // Hide error label initially
        errorLabel.setVisible(false);
    }
    
    public void setMainApp(Main mainApp) {
        this.mainApp = mainApp;
    }
    
    @FXML
    private void handleStartGame() {
        String playerName = playerNameField.getText().trim();
        
        if (playerName.isEmpty()) {
            // Show error if name is empty
            errorLabel.setText("Please enter your name");
            errorLabel.setVisible(true);
        } else if (playerName.length() < 2) {
            // Show error if name is too short
            errorLabel.setText("Name must be at least 2 characters");
            errorLabel.setVisible(true);
        } else {
            // Start the game with the player's name
            mainApp.startGame(playerName);
        }
    }
}
