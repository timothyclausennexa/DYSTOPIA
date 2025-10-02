/**
 * DYSTOPIA ETERNAL - Building System UI
 * Handles building placement, resource display, and crafting
 */

import { BaseHTMLUI } from "./baseUISystem";

export interface PlayerResources {
    wood: number;
    stone: number;
    metal: number;
    uranium: number;
    food: number;
    water: number;
    fuel: number;
    dystopia_tokens: number;
}

export interface BuildingType {
    id: string;
    name: string;
    description: string;
    cost: Partial<PlayerResources>;
    icon: string;
    category: 'defense' | 'storage' | 'resource' | 'utility';
}

export const BUILDING_TYPES: BuildingType[] = [
    {
        id: 'wall',
        name: 'Wall',
        description: 'Basic defensive structure',
        cost: { wood: 10, stone: 5 },
        icon: '🧱',
        category: 'defense'
    },
    {
        id: 'tower',
        name: 'Tower',
        description: 'Elevated defensive position',
        cost: { wood: 20, stone: 15, metal: 5 },
        icon: '🗼',
        category: 'defense'
    },
    {
        id: 'turret',
        name: 'Turret',
        description: 'Automated defense turret',
        cost: { metal: 50, uranium: 10 },
        icon: '🔫',
        category: 'defense'
    },
    {
        id: 'storage',
        name: 'Storage',
        description: 'Store resources safely',
        cost: { wood: 30, stone: 10 },
        icon: '📦',
        category: 'storage'
    },
    {
        id: 'chest',
        name: 'Chest',
        description: 'Small storage container',
        cost: { wood: 15 },
        icon: '🎁',
        category: 'storage'
    },
    {
        id: 'vault',
        name: 'Vault',
        description: 'Secure storage vault',
        cost: { metal: 40, stone: 30 },
        icon: '🏦',
        category: 'storage'
    },
    {
        id: 'barracks',
        name: 'Barracks',
        description: 'Spawn point for faction',
        cost: { wood: 50, stone: 30, metal: 10 },
        icon: '🏠',
        category: 'utility'
    },
    {
        id: 'factory',
        name: 'Factory',
        description: 'Craft advanced items',
        cost: { wood: 40, stone: 40, metal: 30 },
        icon: '🏭',
        category: 'utility'
    },
    {
        id: 'mine',
        name: 'Mine',
        description: 'Extract stone resources',
        cost: { wood: 25, stone: 50 },
        icon: '⛏️',
        category: 'resource'
    },
    {
        id: 'farm',
        name: 'Farm',
        description: 'Grow food resources',
        cost: { wood: 30, stone: 15 },
        icon: '🌾',
        category: 'resource'
    },
    {
        id: 'trap',
        name: 'Spike Trap',
        description: 'Damages enemies',
        cost: { wood: 5, metal: 3 },
        icon: '🔺',
        category: 'defense'
    }
];

export class BuildingSystemUI extends BaseHTMLUI {
    private resources: PlayerResources = {
        wood: 100,
        stone: 100,
        metal: 50,
        uranium: 0,
        food: 100,
        water: 100,
        fuel: 0,
        dystopia_tokens: 0
    };

    private buildingMenuOpen = false;
    private selectedBuilding: BuildingType | null = null;
    private placementMode = false;

    private resourcesContainer: HTMLElement;
    private buildingMenuContainer: HTMLElement;
    private buildingGridContainer: HTMLElement;
    private buildingPreview: HTMLElement | null = null;

    // Event handler storage for cleanup
    private keydownHandler: (e: KeyboardEvent) => void;
    private mousemoveHandler: (e: MouseEvent) => void;
    private clickHandler: (e: MouseEvent) => void;

    constructor() {
        super({
            containerId: 'dystopia-building-system-root',
            cssText: 'pointer-events: none;'
        });

        this.createResourcesHUD();
        this.createBuildingMenu();
        this.setupEventListeners();
    }

    private createResourcesHUD() {
        // Create resources HUD container
        const container = document.createElement('div');
        container.id = 'dystopia-resources-hud';
        container.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            border: 2px solid #ffa500;
            border-radius: 8px;
            padding: 10px 15px;
            z-index: 100;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            color: #fff;
            min-width: 200px;
            box-shadow: 0 0 15px rgba(255, 165, 0, 0.5);
        `;

        // Add title
        const title = document.createElement('div');
        title.textContent = 'RESOURCES';
        title.style.cssText = `
            text-align: center;
            font-weight: bold;
            color: #ffa500;
            margin-bottom: 8px;
            border-bottom: 1px solid #ffa500;
            padding-bottom: 4px;
        `;
        container.appendChild(title);

        // Create resource rows
        const resources: Array<{ key: keyof PlayerResources; icon: string; color: string }> = [
            { key: 'wood', icon: '🪵', color: '#8B4513' },
            { key: 'stone', icon: '🪨', color: '#808080' },
            { key: 'metal', icon: '⚙️', color: '#C0C0C0' },
            { key: 'uranium', icon: '☢️', color: '#00FF00' },
            { key: 'food', icon: '🍎', color: '#FF6B6B' },
            { key: 'water', icon: '💧', color: '#4A90E2' },
            { key: 'fuel', icon: '⛽', color: '#FFA500' },
            { key: 'dystopia_tokens', icon: '💰', color: '#FFD700' }
        ];

        resources.forEach(res => {
            const row = document.createElement('div');
            row.style.cssText = `
                display: flex;
                justify-content: space-between;
                padding: 3px 0;
                color: ${res.color};
            `;
            row.innerHTML = `
                <span>${res.icon} ${res.key.replace('_', ' ').toUpperCase()}:</span>
                <span id="resource-${res.key}" style="font-weight: bold;">0</span>
            `;
            container.appendChild(row);
        });

        document.body.appendChild(container);
        this.resourcesContainer = container;
        this.updateResourcesDisplay();
    }

    private createBuildingMenu() {
        // Create building menu container
        const container = document.createElement('div');
        container.id = 'dystopia-building-menu';
        container.style.cssText = `
            position: fixed;
            left: 50%;
            bottom: 100px;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            border: 3px solid #ffa500;
            border-radius: 12px;
            padding: 20px;
            z-index: 200;
            display: none;
            max-width: 800px;
            box-shadow: 0 0 30px rgba(255, 165, 0, 0.7);
        `;

        // Title
        const title = document.createElement('div');
        title.textContent = '🏗️ BUILDING MENU - Press B to Toggle';
        title.style.cssText = `
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            color: #ffa500;
            margin-bottom: 15px;
            font-family: 'Courier New', monospace;
        `;
        container.appendChild(title);

        // Category tabs
        const tabsContainer = document.createElement('div');
        tabsContainer.style.cssText = `
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
            justify-content: center;
        `;

        ['ALL', 'DEFENSE', 'STORAGE', 'RESOURCE', 'UTILITY'].forEach(cat => {
            const tab = document.createElement('button');
            tab.textContent = cat;
            tab.style.cssText = `
                padding: 8px 15px;
                background: rgba(255, 165, 0, 0.2);
                border: 2px solid #ffa500;
                border-radius: 5px;
                color: #fff;
                font-family: 'Courier New', monospace;
                cursor: pointer;
                transition: all 0.2s;
            `;
            tab.onmouseover = () => {
                tab.style.background = 'rgba(255, 165, 0, 0.5)';
            };
            tab.onmouseout = () => {
                tab.style.background = 'rgba(255, 165, 0, 0.2)';
            };
            tab.onclick = () => this.filterBuildings(cat.toLowerCase());
            tabsContainer.appendChild(tab);
        });
        container.appendChild(tabsContainer);

        // Building grid
        const grid = document.createElement('div');
        grid.id = 'dystopia-building-grid';
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 10px;
            max-height: 400px;
            overflow-y: auto;
        `;
        container.appendChild(grid);
        this.buildingGridContainer = grid;

        // Instructions
        const instructions = document.createElement('div');
        instructions.style.cssText = `
            margin-top: 15px;
            padding: 10px;
            background: rgba(255, 165, 0, 0.1);
            border-radius: 5px;
            font-size: 12px;
            color: #aaa;
            font-family: 'Courier New', monospace;
            text-align: center;
        `;
        instructions.innerHTML = `
            Click building to select • Click on map to place • ESC to cancel
        `;
        container.appendChild(instructions);

        document.body.appendChild(container);
        this.buildingMenuContainer = container;

        this.populateBuildingGrid();
    }

    private populateBuildingGrid(filter: string = 'all') {
        this.buildingGridContainer.innerHTML = '';

        const buildings = filter === 'all'
            ? BUILDING_TYPES
            : BUILDING_TYPES.filter(b => b.category === filter);

        buildings.forEach(building => {
            const card = document.createElement('div');
            const canAfford = this.canAfford(building.cost);

            card.style.cssText = `
                background: ${canAfford ? 'rgba(0, 100, 0, 0.3)' : 'rgba(100, 0, 0, 0.3)'};
                border: 2px solid ${canAfford ? '#00ff00' : '#ff0000'};
                border-radius: 8px;
                padding: 12px;
                cursor: ${canAfford ? 'pointer' : 'not-allowed'};
                transition: all 0.2s;
                font-family: 'Courier New', monospace;
                color: #fff;
            `;

            if (canAfford) {
                card.onmouseover = () => {
                    card.style.background = 'rgba(0, 150, 0, 0.5)';
                    card.style.transform = 'scale(1.05)';
                };
                card.onmouseout = () => {
                    card.style.background = 'rgba(0, 100, 0, 0.3)';
                    card.style.transform = 'scale(1)';
                };
                card.onclick = () => this.selectBuilding(building);
            }

            card.innerHTML = `
                <div style="font-size: 32px; text-align: center; margin-bottom: 8px;">${building.icon}</div>
                <div style="font-weight: bold; text-align: center; margin-bottom: 5px;">${building.name}</div>
                <div style="font-size: 10px; color: #aaa; margin-bottom: 8px; text-align: center;">${building.description}</div>
                <div style="font-size: 11px; border-top: 1px solid #555; padding-top: 5px;">
                    ${Object.entries(building.cost).map(([resource, amount]) =>
                        `<div style="display: flex; justify-content: space-between;">
                            <span>${resource}:</span>
                            <span style="color: ${this.resources[resource as keyof PlayerResources] >= amount! ? '#0f0' : '#f00'}">${amount}</span>
                        </div>`
                    ).join('')}
                </div>
            `;

            this.buildingGridContainer.appendChild(card);
        });
    }

    private setupEventListeners() {
        // B key to toggle building menu
        this.keydownHandler = (e: KeyboardEvent) => {
            if (e.key === 'b' || e.key === 'B') {
                if (!this.placementMode) {
                    this.toggleBuildingMenu();
                }
            } else if (e.key === 'Escape') {
                if (this.placementMode) {
                    this.cancelPlacement();
                } else if (this.buildingMenuOpen) {
                    this.toggleBuildingMenu();
                }
            }
        };
        document.addEventListener('keydown', this.keydownHandler);

        // Mouse move for building preview
        this.mousemoveHandler = (e: MouseEvent) => {
            if (this.placementMode && this.buildingPreview) {
                this.buildingPreview.style.left = `${e.clientX}px`;
                this.buildingPreview.style.top = `${e.clientY}px`;
            }
        };
        document.addEventListener('mousemove', this.mousemoveHandler);

        // Click to place building
        this.clickHandler = (e: MouseEvent) => {
            if (this.placementMode && this.selectedBuilding) {
                // Don't place if clicking on UI
                const target = e.target as HTMLElement;
                if (target.closest('#dystopia-building-menu') || target.closest('#dystopia-resources-hud')) {
                    return;
                }

                this.placeBuilding();
            }
        };
        document.addEventListener('click', this.clickHandler);
    }

    private toggleBuildingMenu() {
        this.buildingMenuOpen = !this.buildingMenuOpen;
        this.buildingMenuContainer.style.display = this.buildingMenuOpen ? 'block' : 'none';

        if (this.buildingMenuOpen) {
            this.populateBuildingGrid();
        }
    }

    private selectBuilding(building: BuildingType) {
        if (!this.canAfford(building.cost)) {
            return;
        }

        this.selectedBuilding = building;
        this.placementMode = true;
        this.buildingMenuOpen = false;
        this.buildingMenuContainer.style.display = 'none';

        // Create building preview
        this.buildingPreview = document.createElement('div');
        this.buildingPreview.style.cssText = `
            position: fixed;
            pointer-events: none;
            font-size: 48px;
            z-index: 9999;
            transform: translate(-50%, -50%);
            filter: drop-shadow(0 0 10px rgba(0, 255, 0, 0.8));
        `;
        this.buildingPreview.textContent = building.icon;
        document.body.appendChild(this.buildingPreview);

        console.log(`[DYSTOPIA] Selected ${building.name} for placement`);
    }

    private placeBuilding() {
        if (!this.selectedBuilding) return;

        console.log(`[DYSTOPIA] Placing ${this.selectedBuilding.name}`);

        // Send emote message to server with building type
        this.sendBuildingCommand(this.selectedBuilding.id);

        // Deduct resources (optimistically - server will validate)
        Object.entries(this.selectedBuilding.cost).forEach(([resource, amount]) => {
            this.resources[resource as keyof PlayerResources] -= amount!;
        });

        this.updateResourcesDisplay();
        this.cancelPlacement();
    }

    private cancelPlacement() {
        this.placementMode = false;
        this.selectedBuilding = null;

        if (this.buildingPreview) {
            this.buildingPreview.remove();
            this.buildingPreview = null;
        }
    }

    private filterBuildings(category: string) {
        this.populateBuildingGrid(category);
    }

    private canAfford(cost: Partial<PlayerResources>): boolean {
        return Object.entries(cost).every(([resource, amount]) => {
            return this.resources[resource as keyof PlayerResources] >= (amount || 0);
        });
    }

    private sendBuildingCommand(buildingId: string) {
        // This will be called by the game client to send the emote message
        // The game.ts file will need to hook this up
        const event = new CustomEvent('dystopia:placeBuilding', {
            detail: { buildingId }
        });
        window.dispatchEvent(event);
    }

    public updateResources(resources: Partial<PlayerResources>) {
        Object.assign(this.resources, resources);
        this.updateResourcesDisplay();
    }

    private updateResourcesDisplay() {
        Object.entries(this.resources).forEach(([key, value]) => {
            const element = document.getElementById(`resource-${key}`);
            if (element) {
                element.textContent = value.toString();
            }
        });
    }

    public setResources(resources: PlayerResources) {
        this.resources = { ...resources };
        this.updateResourcesDisplay();
    }

    public getResources(): PlayerResources {
        return { ...this.resources };
    }

    /**
     * Override base onDestroy to add custom cleanup
     */
    protected onDestroy() {
        // Remove event listeners
        document.removeEventListener('keydown', this.keydownHandler);
        document.removeEventListener('mousemove', this.mousemoveHandler);
        document.removeEventListener('click', this.clickHandler);

        // Remove DOM elements
        this.resourcesContainer?.remove();
        this.buildingMenuContainer?.remove();
        this.buildingPreview?.remove();

        console.log('[DYSTOPIA] Building system destroyed');
    }
}

// Export singleton instance
export let buildingSystem: BuildingSystemUI | null = null;

export function initBuildingSystem() {
    if (!buildingSystem) {
        buildingSystem = new BuildingSystemUI();
        console.log('[DYSTOPIA] Building system initialized');
    }
    return buildingSystem;
}
