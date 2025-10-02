/**
 * DYSTOPIA ETERNAL - Base UI System
 * Provides common functionality for all UI systems to reduce code duplication
 */

import type Camera from "./camera";
import { v2, type Vec2 } from "../shared/utils/v2";

/**
 * RGB color type for consistent color handling
 */
export interface RGBColor {
    r: number;
    g: number;
    b: number;
}

/**
 * Faction color constants shared across all UI systems
 */
export const FACTION_COLORS: Record<string, RGBColor> = {
    red: { r: 255, g: 0, b: 0 },
    blue: { r: 0, g: 100, b: 255 },
    green: { r: 0, g: 255, b: 0 },
    yellow: { r: 255, g: 255, b: 0 },
    purple: { r: 200, g: 0, b: 255 },
    neutral: { r: 128, g: 128, b: 128 },
    default: { r: 200, g: 200, b: 200 }
};

/**
 * Base configuration for canvas-based UI systems
 */
export interface CanvasUIConfig {
    canvasId: string;
    zIndex: number;
    pointerEvents?: boolean;
}

/**
 * Abstract base class for canvas-based UI systems
 * Handles common patterns like canvas creation, resize handling, camera integration, etc.
 */
export abstract class BaseCanvasUI {
    protected canvas: HTMLCanvasElement;
    protected ctx: CanvasRenderingContext2D;
    protected camera: Camera | null = null;

    // Event handlers for cleanup
    private resizeHandler: () => void;
    private cameraUpdateHandler: EventListener;

    constructor(config: CanvasUIConfig) {
        this.canvas = this.createCanvas(config);
        this.ctx = this.canvas.getContext('2d')!;

        this.resizeHandler = () => this.handleResize();
        this.cameraUpdateHandler = ((e: CustomEvent) => {
            this.camera = e.detail.camera;
        }) as EventListener;

        this.setupBaseEventListeners();
    }

    /**
     * Create and configure canvas element
     */
    private createCanvas(config: CanvasUIConfig): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        canvas.id = config.canvasId;
        canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: ${config.pointerEvents ? 'auto' : 'none'};
            z-index: ${config.zIndex};
        `;

        document.body.appendChild(canvas);

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        return canvas;
    }

    /**
     * Setup base event listeners (resize, camera updates)
     */
    private setupBaseEventListeners() {
        window.addEventListener('resize', this.resizeHandler);
        window.addEventListener('dystopia:cameraUpdate', this.cameraUpdateHandler);
    }

    /**
     * Handle window resize
     */
    private handleResize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.onResize();
    }

    /**
     * Override this to handle custom resize logic
     */
    protected onResize(): void {
        // Default: do nothing
    }

    /**
     * Convert world coordinates to screen coordinates using camera
     */
    protected worldToScreen(worldPos: Vec2): Vec2 {
        if (!this.camera) {
            // Fallback to placeholder if camera not yet initialized
            return v2.create(
                this.canvas.width / 2 + worldPos.x,
                this.canvas.height / 2 - worldPos.y
            );
        }

        const screenPos = this.camera.m_pointToScreen(worldPos);
        return v2.create(screenPos.x, screenPos.y);
    }

    /**
     * Convert world X coordinate to screen X coordinate
     */
    protected worldToScreenX(worldX: number): number {
        return this.worldToScreen(v2.create(worldX, 0)).x;
    }

    /**
     * Convert world Y coordinate to screen Y coordinate
     */
    protected worldToScreenY(worldY: number): number {
        return this.worldToScreen(v2.create(0, worldY)).y;
    }

    /**
     * Scale world size to screen size using camera zoom
     */
    protected worldToScreenScale(worldSize: number): number {
        if (!this.camera) {
            return worldSize;
        }
        return this.camera.m_scaleToScreen(worldSize);
    }

    /**
     * Check if a screen position is within viewport bounds (with margin)
     */
    protected isOnScreen(screenX: number, screenY: number, margin: number = 100): boolean {
        return !(
            screenX < -margin ||
            screenX > this.canvas.width + margin ||
            screenY < -margin ||
            screenY > this.canvas.height + margin
        );
    }

    /**
     * Get faction color from faction string
     */
    protected getFactionColor(faction: string | null): RGBColor {
        if (!faction) {
            return FACTION_COLORS.default;
        }
        const color = FACTION_COLORS[faction.toLowerCase()];
        return color || FACTION_COLORS.default;
    }

    /**
     * Convert RGB color to CSS rgba string
     */
    protected rgbToString(color: RGBColor, alpha: number = 1): string {
        return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
    }

    /**
     * Clear the entire canvas
     */
    protected clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Draw text with shadow for readability
     */
    protected drawTextWithShadow(
        text: string,
        x: number,
        y: number,
        color: string,
        font: string,
        align: CanvasTextAlign = 'center',
        baseline: CanvasTextBaseline = 'middle'
    ) {
        this.ctx.font = font;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = baseline;

        // Shadow
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        this.ctx.shadowBlur = 3;
        this.ctx.shadowOffsetX = 1;
        this.ctx.shadowOffsetY = 1;

        // Text
        this.ctx.fillStyle = color;
        this.ctx.fillText(text, x, y);

        // Reset shadow
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
    }

    /**
     * Cleanup method - removes event listeners and DOM elements
     */
    public destroy() {
        window.removeEventListener('resize', this.resizeHandler);
        window.removeEventListener('dystopia:cameraUpdate', this.cameraUpdateHandler);
        this.canvas?.remove();
        this.onDestroy();
    }

    /**
     * Override this for custom cleanup logic
     */
    protected onDestroy(): void {
        // Default: do nothing
    }
}

/**
 * Base configuration for HTML-based UI systems
 */
export interface HTMLUIConfig {
    containerId: string;
    cssText?: string;
}

/**
 * Abstract base class for HTML-based UI systems
 * Handles common patterns for DOM-based UIs
 */
export abstract class BaseHTMLUI {
    protected container: HTMLElement;

    constructor(config: HTMLUIConfig) {
        this.container = this.createContainer(config);
    }

    /**
     * Create and configure container element
     */
    private createContainer(config: HTMLUIConfig): HTMLElement {
        const container = document.createElement('div');
        container.id = config.containerId;
        if (config.cssText) {
            container.style.cssText = config.cssText;
        }
        document.body.appendChild(container);
        return container;
    }

    /**
     * Get faction color as CSS hex string
     */
    protected getFactionColorCSS(faction: string | null): string {
        const rgb = FACTION_COLORS[faction?.toLowerCase() || 'default'] || FACTION_COLORS.default;
        return `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`;
    }

    /**
     * Escape HTML to prevent XSS
     */
    protected escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Cleanup method - removes DOM elements
     */
    public destroy() {
        this.container?.remove();
        this.onDestroy();
    }

    /**
     * Override this for custom cleanup logic
     */
    protected onDestroy(): void {
        // Default: do nothing
    }
}
