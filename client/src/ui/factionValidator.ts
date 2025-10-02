/**
 * DYSTOPIA Faction Validation
 * Manages faction selection validation and deploy button state
 */

import $ from "jquery";

export class FactionValidator {
    private factionSelect: JQuery<HTMLElement>;
    private deployButton: JQuery<HTMLElement>;
    private errorCallback?: (message: string) => void;

    constructor(
        factionSelect: JQuery<HTMLElement>,
        deployButton: JQuery<HTMLElement>,
        errorCallback?: (message: string) => void,
    ) {
        this.factionSelect = factionSelect;
        this.deployButton = deployButton;
        this.errorCallback = errorCallback;

        this.init();
    }

    private init(): void {
        // Initially disable deploy button if no faction selected
        this.updateDeployButtonState();

        // Listen for faction changes
        this.factionSelect.on("change", () => {
            this.updateDeployButtonState();
        });

        // Validate on deploy button click
        this.deployButton.on("click", (e) => {
            if (!this.isValid()) {
                e.preventDefault();
                e.stopImmediatePropagation();
                this.showError();
                return false;
            }
        });
    }

    /**
     * Check if a faction is selected
     */
    public isValid(): boolean {
        const factionValue = this.factionSelect.val() as string;
        return !!factionValue && factionValue.trim() !== "";
    }

    /**
     * Get the selected faction
     */
    public getSelectedFaction(): string | null {
        if (!this.isValid()) {
            return null;
        }
        return this.factionSelect.val() as string;
    }

    /**
     * Update deploy button visual state based on faction selection
     */
    private updateDeployButtonState(): void {
        const isValid = this.isValid();

        if (isValid) {
            // Enable button
            this.deployButton.removeClass("btn-disabled");
            this.deployButton.css("pointer-events", "auto");
            this.factionSelect.removeClass("error");
            this.factionSelect.addClass("has-selection");
        } else {
            // Disable button
            this.deployButton.addClass("btn-disabled");
            this.deployButton.css("pointer-events", "none");
            this.factionSelect.removeClass("has-selection");
        }
    }

    /**
     * Show visual error for missing faction
     */
    private showError(): void {
        // Add error class to faction select
        this.factionSelect.addClass("error");

        // Remove error class after animation
        setTimeout(() => {
            this.factionSelect.removeClass("error");
        }, 500);

        // Call error callback if provided
        if (this.errorCallback) {
            this.errorCallback("Please select a faction before deploying!");
        }
    }

    /**
     * Reset faction selection
     */
    public reset(): void {
        this.factionSelect.val("");
        this.updateDeployButtonState();
    }

    /**
     * Set faction programmatically
     */
    public setFaction(faction: string): void {
        this.factionSelect.val(faction);
        this.updateDeployButtonState();
    }
}
