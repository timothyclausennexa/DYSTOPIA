/**
 * DYSTOPIA ETERNAL - Player UI System
 * Displays player name tags, health bars, and faction indicators above players
 */

import { renderManager, type RenderableSystem } from "./renderManager";
import { BaseCanvasUI, type RGBColor } from "./baseUISystem";
import { UI_COLORS, UI_FONTS, UI_ICONS } from "./ui/uiConstants";

export interface PlayerUIData {
    id: number;
    name: string;
    health: number;
    maxHealth: number;
    faction: string | null;
    x: number;
    y: number;
    isTeammate: boolean;
}

export class PlayerUISystem extends BaseCanvasUI implements RenderableSystem {
    private players: Map<number, PlayerUIData> = new Map();

    // RenderableSystem interface
    public enabled = true;
    public updateInterval = 50; // Update every 50ms for smooth rendering
    public nextUpdate = 0;

    // Event handlers for cleanup
    private playerUIUpdateHandler: EventListener;
    private keydownHandler: (e: KeyboardEvent) => void;

    constructor() {
        super({
            canvasId: 'dystopia-player-ui-canvas',
            zIndex: 60,
            pointerEvents: false
        });

        this.setupEventListeners();

        // Register with unified render manager instead of own RAF loop
        renderManager.register('playerUI', this);
    }

    private setupEventListeners() {
        // Listen for player UI data updates from game
        this.playerUIUpdateHandler = ((e: CustomEvent) => {
            const { players } = e.detail;
            this.updatePlayers(players);
        }) as EventListener;
        window.addEventListener('dystopia:playerUIUpdate', this.playerUIUpdateHandler);

        // Toggle visibility with hotkey (H for HUD)
        this.keydownHandler = (e: KeyboardEvent) => {
            if (e.key === 'h' || e.key === 'H') {
                const chatInput = document.getElementById('chat-input');
                if (document.activeElement === chatInput) {
                    return;
                }
                e.preventDefault();
                this.toggleEnabled();
            }
        };
        document.addEventListener('keydown', this.keydownHandler);
    }

    // Render method called by RenderManager
    public render(dt: number) {
        this.clearCanvas();

        // Render each player's UI
        this.players.forEach(player => {
            this.renderPlayerUI(player);
        });
    }

    private renderPlayerUI(player: PlayerUIData) {
        // Convert world coordinates to screen coordinates
        const screenX = this.worldToScreenX(player.x);
        const screenY = this.worldToScreenY(player.y);

        // Skip if off-screen
        if (!this.isOnScreen(screenX, screenY)) {
            return;
        }

        // Offset above player (adjust based on your game's scale)
        const yOffset = -40;
        const uiY = screenY + yOffset;

        // Get faction color
        const factionColor = this.getFactionColor(player.faction);

        // Render health bar
        this.renderHealthBar(screenX, uiY, player.health, player.maxHealth, factionColor, player.isTeammate);

        // Render name tag
        this.renderNameTag(screenX, uiY - 15, player.name, factionColor, player.isTeammate);

        // Render faction icon if applicable
        if (player.faction) {
            this.renderFactionIcon(screenX, uiY - 30, player.faction);
        }
    }

    private renderHealthBar(
        x: number,
        y: number,
        health: number,
        maxHealth: number,
        factionColor: RGBColor,
        isTeammate: boolean
    ) {
        const ctx = this.ctx;
        const barWidth = 60;
        const barHeight = 6;
        const barX = x - barWidth / 2;

        // Background
        ctx.fillStyle = UI_COLORS.backgroundDark;
        ctx.fillRect(barX, y, barWidth, barHeight);

        // Health percentage
        const healthPercent = Math.max(0, Math.min(1, health / maxHealth));
        const healthWidth = barWidth * healthPercent;

        // Color based on health and faction
        let healthColor: string;
        if (isTeammate) {
            healthColor = UI_COLORS.success; // Green for teammates
        } else if (healthPercent > 0.6) {
            healthColor = this.rgbToString(factionColor, 0.8);
        } else if (healthPercent > 0.3) {
            healthColor = UI_COLORS.warning; // Orange for medium health
        } else {
            healthColor = UI_COLORS.error; // Red for low health
        }

        ctx.fillStyle = healthColor;
        ctx.fillRect(barX, y, healthWidth, barHeight);

        // Border
        ctx.strokeStyle = isTeammate ? UI_COLORS.success : 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, y, barWidth, barHeight);

        // Health text (percentage)
        if (healthPercent < 1) {
            ctx.fillStyle = UI_COLORS.text;
            ctx.font = `bold 9px ${UI_FONTS.primary}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${Math.round(healthPercent * 100)}%`, x, y + barHeight / 2);
        }
    }

    private renderNameTag(
        x: number,
        y: number,
        name: string,
        factionColor: RGBColor,
        isTeammate: boolean
    ) {
        const ctx = this.ctx;

        // Background
        const textMetrics = ctx.measureText(name);
        const padding = 4;
        const bgWidth = textMetrics.width + padding * 2;
        const bgHeight = 14;

        ctx.fillStyle = UI_COLORS.backgroundDark;
        ctx.fillRect(x - bgWidth / 2, y - bgHeight / 2, bgWidth, bgHeight);

        // Name text
        const textColor = isTeammate
            ? UI_COLORS.success
            : this.rgbToString(factionColor, 1);

        this.drawTextWithShadow(name, x, y, textColor, `bold 11px ${UI_FONTS.primary}`);

        // Border
        ctx.strokeStyle = isTeammate ? UI_COLORS.success : UI_COLORS.primary;
        ctx.lineWidth = 1;
        ctx.strokeRect(x - bgWidth / 2, y - bgHeight / 2, bgWidth, bgHeight);
    }

    private renderFactionIcon(x: number, y: number, faction: string) {
        const ctx = this.ctx;

        const icon = this.getFactionIcon(faction);
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, x, y);
    }

    private getFactionIcon(faction: string): string {
        return UI_ICONS.factions[faction.toLowerCase() as keyof typeof UI_ICONS.factions] || '⚪';
    }


    public updatePlayers(players: PlayerUIData[]) {
        // Clear old data
        this.players.clear();

        // Add new data
        players.forEach(player => {
            this.players.set(player.id, player);
        });
    }

    public updatePlayer(player: PlayerUIData) {
        this.players.set(player.id, player);
    }

    public removePlayer(playerId: number) {
        this.players.delete(playerId);
    }

    public toggleEnabled() {
        this.enabled = !this.enabled;
        if (!this.enabled) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        console.log(`[DYSTOPIA] Player UI ${this.enabled ? 'enabled' : 'disabled'}`);
    }

    public setEnabled(enabled: boolean) {
        this.enabled = enabled;
        if (!this.enabled) {
            this.clearCanvas();
        }
    }

    /**
     * Override base destroy to add custom cleanup
     */
    protected onDestroy() {
        // Unregister from render manager
        renderManager.unregister('playerUI');

        // Remove custom event listeners
        window.removeEventListener('dystopia:playerUIUpdate', this.playerUIUpdateHandler);
        document.removeEventListener('keydown', this.keydownHandler);

        console.log('[DYSTOPIA] Player UI system destroyed');
    }
}

// Export singleton instance
export let playerUISystem: PlayerUISystem | null = null;

export function initPlayerUISystem() {
    if (!playerUISystem) {
        playerUISystem = new PlayerUISystem();
        console.log('[DYSTOPIA] Player UI system initialized');
    }
    return playerUISystem;
}
