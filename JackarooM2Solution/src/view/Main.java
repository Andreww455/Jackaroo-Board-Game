package view;

import java.io.IOException;
import java.util.ArrayList;

import javafx.application.Application;
import javafx.event.ActionEvent;
import javafx.event.EventHandler;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.TextField;
import javafx.scene.image.Image;
import javafx.scene.layout.*;
import javafx.scene.text.Font;
import javafx.stage.Stage;
import engine.Game;


public class Main extends Application {
private Stage primaryStage;
    
    @Override
    public void start(Stage primaryStage) {
        this.primaryStage = primaryStage;
        showHomePage();
    }
    
    public void showHomePage() {
        try {
            // Load the home page FXML
            FXMLLoader loader = new FXMLLoader(getClass().getResource("HomeView.fxml"));
            Parent root = loader.load();
            
            // Get the controller and pass this app instance to it
            HomeController controller = loader.getController();
            controller.setMainApp(this);
            
            // Set up the scene
            Scene scene = new Scene(root, 800, 600);
            scene.getStylesheets().add(getClass().getResource("game-style.css").toExternalForm());
            
            // Configure the stage
            primaryStage.setTitle("Jackaroo Game - Welcome");
            primaryStage.setScene(scene);
            primaryStage.setMinWidth(800);
            primaryStage.setMinHeight(600);
            primaryStage.show();
            
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
    
    public void startGame(String playerName) {
        try {
            // Load the game FXML
            FXMLLoader loader = new FXMLLoader(getClass().getResource("JackarooView.fxml"));
            Parent root = loader.load();
            
            // Get the controller
            JackarooController controller = loader.getController();
            
            // Initialize the game with the player name
            controller.initializeGame(playerName);
            
            // Set up the scene
            Scene scene = new Scene(root, 1200, 800);
            scene.getStylesheets().add(getClass().getResource("game-style.css").toExternalForm());
            
            // Configure the stage
            primaryStage.setTitle("Jackaroo Game - " + playerName);
            primaryStage.setScene(scene);
            primaryStage.setMinWidth(1200);
            primaryStage.setMinHeight(800);
            
            // Start the game
            controller.startGame();
            
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    

    public static void main(String[] args) {
        launch(args);
    }
}
