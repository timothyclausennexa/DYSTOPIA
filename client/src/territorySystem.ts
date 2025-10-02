/**
 * DYSTOPIA ETERNAL - Territory Visualization System
 * Displays faction territories, capture progress, and control points on the map
 */

import { renderManager, type RenderableSystem } from "./renderManager";
import { BaseCanvasUI, type RGBColor } from "./baseUISystem";
import { UI_COLORS, UI_FONTS } from "./ui/uiConstants";

export interface Territory {
    id: number;
    name: string;
    centerX: number;
    centerY: number;
    radius: number;
    faction: string | null;
    captureProgress: number; // 0-100
}

export class TerritoryVisualizationUI extends BaseCanvasUI implements RenderableSystem {
    private territories: Territory[] = [];
    public enabled = true;
    public updateInterval = 100;
    public nextUpdate = 0;

    // Event handler storage for cleanup
    private territoryUpdateHandler: (e: Event) => void;

    constructor() {
        super({
            canvasId: 'dystopia-territory-canvas',
            zIndex: 50,
            pointerEvents: false
        });

        this.setupEventListeners();
        renderManager.register('territory', this);
    }

    private setupEventListeners() {
        // Listen for territory updates from server
        this.territoryUpdateHandler = ((e: CustomEvent) => {
            const { territories } = e.detail;
            this.territories = territories;
        }) as EventListener;
        window.addEventListener('dystopia:territoryUpdate', this.territoryUpdateHandler);
    }

    public render(dt: number) {
        this.clearCanvas();

        this.territories.forEach(territory => {
            this.renderTerritory(territory);
        });
    }

    private renderTerritory(territory: Territory) {
        // Convert world coordinates to screen coordinates
        const screenX = this.worldToScreenX(territory.centerX);
        const screenY = this.worldToScreenY(territory.centerY);
        const screenRadius = this.worldToScreenScale(territory.radius);

        // Skip if off-screen
        if (!this.isOnScreen(screenX, screenY, screenRadius)) {
            return;
        }

        // Determine faction color
        const factionColor = this.getFactionColor(territory.faction);
        const alpha = territory.faction ? 0.2 : 0.1;

        // Draw territory circle with faction color
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = this.rgbToString(factionColor, alpha);
        this.ctx.fill();

        // Draw border
        this.ctx.strokeStyle = this.rgbToString(factionColor, 0.6);
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Draw capture progress if being contested
        if (territory.captureProgress > 0 && territory.captureProgress < 100) {
            this.renderCaptureProgress(screenX, screenY, screenRadius, territory.captureProgress, factionColor);
        }

        // Draw territory name
        this.renderTerritoryName(screenX, screenY, territory.name, factionColor);
    }

    private renderCaptureProgress(
        x: number,
        y: number,
        radius: number,
        progress: number,
        color: RGBColor
    ) {
        const ctx = this.ctx;
        const barWidth = radius * 1.5;
        const barHeight = 10;
        const barX = x - barWidth / 2;
        const barY = y - radius - 20;

        // Background
        ctx.fillStyle = UI_COLORS.backgroundDark;
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Progress
        const progressWidth = (barWidth * progress) / 100;
        ctx.fillStyle = this.rgbToString(color, 0.8);
        ctx.fillRect(barX, barY, progressWidth, barHeight);

        // Border
        ctx.strokeStyle = UI_COLORS.primary;
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // Progress text
        ctx.fillStyle = UI_COLORS.text;
        ctx.font = `bold 10px ${UI_FONTS.primary}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.round(progress)}%`, x, barY + barHeight / 2);
    }

    private renderTerritoryName(
        x: number,
        y: number,
        name: string,
        color: RGBColor
    ) {
        this.drawTextWithShadow(
            name.toUpperCase(),
            x,
            y,
            this.rgbToString(color, 0.9),
            `bold 14px ${UI_FONTS.primary}`
        );
    }


    public updateTerritories(territories: Territory[]) {
        this.territories = territories;
    }

    public addTerritory(territory: Territory) {
        const existing = this.territories.find(t => t.id === territory.id);
        if (existing) {
            Object.assign(existing, territory);
        } else {
            this.territories.push(territory);
        }
    }

    public removeTerritory(territoryId: number) {
        this.territories = this.territories.filter(t => t.id !== territoryId);
    }

    public setVisible(visible: boolean) {
        this.canvas.style.display = visible ? 'block' : 'none';
    }

    /**
     * Override base destroy to add custom cleanup
     */
    protected onDestroy() {
        renderManager.unregister('territory');

        // Remove custom event listeners
        window.removeEventListener('dystopia:territoryUpdate', this.territoryUpdateHandler);

        console.log('[DYSTOPIA] Territory system destroyed');
    }
}

// Export singleton instance
export let territorySystem: TerritoryVisualizationUI | null = null;

export function initTerritorySystem() {
    if (!territorySystem) {
        territorySystem = new TerritoryVisualizationUI();
        console.log('[DYSTOPIA] Territory visualization system initialized');
    }
    return territorySystem;
}
