/**
 * DYSTOPIA Application State Manager
 * Central state controller to prevent UI overlap and manage screen transitions
 */

import $ from "jquery";

export enum AppState {
    LOGIN = "login",
    MENU = "menu",
    GAME = "game",
}

export class AppStateManager {
    private currentState: AppState = AppState.LOGIN;
    private bodyElement = $("body");

    // UI Elements
    private loginBackdrop = $("#login-backdrop");
    private loginScreen = $("#login-screen");
    private mainMenu = $("#main-menu");
    private newsBlock = $("#news-block");
    private startMenuWrapper = $("#start-menu-wrapper");
    private gameAreaWrapper = $("#game-area-wrapper");

    constructor() {
        this.applyState(AppState.LOGIN, false);
    }

    /**
     * Transition to a new application state
     */
    public setState(newState: AppState, animate: boolean = true): void {
        if (this.currentState === newState) {
            return;
        }

        const oldState = this.currentState;
        this.currentState = newState;

        console.log(`[AppState] Transitioning from ${oldState} to ${newState}`);

        this.applyState(newState, animate);
    }

    /**
     * Get the current application state
     */
    public getState(): AppState {
        return this.currentState;
    }

    /**
     * Apply the state to the UI
     */
    private applyState(state: AppState, animate: boolean): void {
        // Remove all state classes
        this.bodyElement.removeClass("app-state-login app-state-menu app-state-game");

        // Add the current state class
        this.bodyElement.addClass(`app-state-${state}`);

        // Apply state-specific visibility
        switch (state) {
            case AppState.LOGIN:
                this.showLogin(animate);
                break;
            case AppState.MENU:
                this.showMenu(animate);
                break;
            case AppState.GAME:
                this.showGame(animate);
                break;
        }
    }

    /**
     * Show login screen, hide everything else
     */
    private showLogin(animate: boolean): void {
        // Hide all other screens immediately
        this.mainMenu.hide();
        this.newsBlock.hide();
        this.gameAreaWrapper.hide();

        if (animate) {
            this.loginBackdrop.fadeIn(200);
            this.loginScreen.fadeIn(300);
        } else {
            this.loginBackdrop.show();
            this.loginScreen.show();
        }

        this.startMenuWrapper.show();
    }

    /**
     * Show main menu, hide login and game
     */
    private showMenu(animate: boolean): void {
        // Hide login
        this.loginBackdrop.hide();
        this.loginScreen.hide();

        // Hide game
        this.gameAreaWrapper.hide();

        if (animate) {
            this.mainMenu.fadeIn(300);
            this.newsBlock.fadeIn(300);
        } else {
            this.mainMenu.show();
            this.newsBlock.show();
        }

        this.startMenuWrapper.show();
    }

    /**
     * Show game, hide all menus
     */
    private showGame(animate: boolean): void {
        if (animate) {
            this.startMenuWrapper.fadeOut(200, () => {
                this.gameAreaWrapper.fadeIn(200);
            });
        } else {
            this.startMenuWrapper.hide();
            this.gameAreaWrapper.show();
        }
    }

    /**
     * Force a specific screen to be visible (for debugging)
     */
    public forceShow(screen: "login" | "menu" | "game"): void {
        switch (screen) {
            case "login":
                this.setState(AppState.LOGIN, false);
                break;
            case "menu":
                this.setState(AppState.MENU, false);
                break;
            case "game":
                this.setState(AppState.GAME, false);
                break;
        }
    }
}
