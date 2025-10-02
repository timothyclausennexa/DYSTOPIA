/**
 * DYSTOPIA ETERNAL - Faction/Clan System
 * Allows players to choose and manage their faction allegiance
 */

import { BaseHTMLUI } from "./baseUISystem";

export interface Faction {
    id: string;
    name: string;
    color: string;
    description: string;
    icon: string;
}

export const FACTIONS: Faction[] = [
    {
        id: 'red',
        name: 'Crimson Legion',
        color: '#ff0000',
        description: 'Aggressive conquerors who thrive on combat and domination',
        icon: '🔴'
    },
    {
        id: 'blue',
        name: 'Azure Coalition',
        color: '#0000ff',
        description: 'Strategic defenders who value cooperation and stability',
        icon: '🔵'
    },
    {
        id: 'green',
        name: 'Emerald Syndicate',
        color: '#00ff00',
        description: 'Resource-focused traders who control supply chains',
        icon: '🟢'
    },
    {
        id: 'yellow',
        name: 'Golden Empire',
        color: '#ffff00',
        description: 'Wealthy opportunists who buy power and influence',
        icon: '🟡'
    },
    {
        id: 'purple',
        name: 'Violet Collective',
        color: '#800080',
        description: 'Tech-savvy innovators who harness advanced technology',
        icon: '🟣'
    }
];

export class FactionSystemUI extends BaseHTMLUI {
    private factionMenuContainer: HTMLElement;
    private currentFaction: string | null = null;
    private isOpen = false;

    // Event handler storage for cleanup
    private keydownHandler: (e: KeyboardEvent) => void;
    private factionUpdateHandler: (e: Event) => void;

    constructor() {
        super({
            containerId: 'dystopia-faction-system-root',
            cssText: 'pointer-events: none;'
        });

        this.createFactionUI();
        this.setupEventListeners();
    }

    private createFactionUI() {
        // Main container
        const container = document.createElement('div');
        container.id = 'dystopia-faction-menu';
        container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 600px;
            max-height: 70vh;
            background: rgba(0, 0, 0, 0.95);
            border: 3px solid #ffa500;
            border-radius: 12px;
            padding: 20px;
            font-family: 'Courier New', monospace;
            z-index: 150;
            display: none;
            overflow-y: auto;
            box-shadow: 0 0 30px rgba(255, 165, 0, 0.8);
        `;

        // Title
        const title = document.createElement('div');
        title.textContent = '⚔️ CHOOSE YOUR FACTION ⚔️';
        title.style.cssText = `
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            color: #ffa500;
            margin-bottom: 10px;
            text-shadow: 0 0 10px rgba(255, 165, 0, 0.8);
        `;

        // Subtitle
        const subtitle = document.createElement('div');
        subtitle.textContent = 'Your choice determines alliances and enemies';
        subtitle.style.cssText = `
            text-align: center;
            font-size: 12px;
            color: #aaa;
            margin-bottom: 20px;
        `;

        // Faction cards container
        const factionsContainer = document.createElement('div');
        factionsContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;

        FACTIONS.forEach(faction => {
            const card = this.createFactionCard(faction);
            factionsContainer.appendChild(card);
        });

        // Current faction display
        const currentFactionDisplay = document.createElement('div');
        currentFactionDisplay.id = 'current-faction-display';
        currentFactionDisplay.style.cssText = `
            margin-top: 15px;
            padding: 10px;
            background: rgba(255, 165, 0, 0.1);
            border: 1px solid #ffa500;
            border-radius: 6px;
            text-align: center;
            color: #fff;
            font-size: 12px;
        `;
        currentFactionDisplay.textContent = 'No faction selected - Press F to open faction menu';

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'CLOSE (ESC)';
        closeBtn.style.cssText = `
            width: 100%;
            margin-top: 15px;
            padding: 10px;
            background: rgba(255, 0, 0, 0.3);
            border: 2px solid #ff0000;
            border-radius: 6px;
            color: #fff;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            font-family: 'Courier New', monospace;
            transition: all 0.2s;
        `;
        closeBtn.onmouseover = () => {
            closeBtn.style.background = 'rgba(255, 0, 0, 0.5)';
        };
        closeBtn.onmouseout = () => {
            closeBtn.style.background = 'rgba(255, 0, 0, 0.3)';
        };
        closeBtn.onclick = () => this.toggleMenu();

        container.appendChild(title);
        container.appendChild(subtitle);
        container.appendChild(factionsContainer);
        container.appendChild(currentFactionDisplay);
        container.appendChild(closeBtn);

        document.body.appendChild(container);
        this.factionMenuContainer = container;
    }

    private createFactionCard(faction: Faction): HTMLElement {
        const card = document.createElement('div');
        card.style.cssText = `
            display: flex;
            align-items: center;
            padding: 15px;
            background: rgba(0, 0, 0, 0.6);
            border: 2px solid ${faction.color};
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
        `;

        card.onmouseover = () => {
            card.style.background = `rgba(${this.hexToRgb(faction.color)}, 0.2)`;
            card.style.transform = 'scale(1.02)';
        };

        card.onmouseout = () => {
            card.style.background = 'rgba(0, 0, 0, 0.6)';
            card.style.transform = 'scale(1)';
        };

        card.onclick = () => this.selectFaction(faction.id);

        // Icon
        const icon = document.createElement('div');
        icon.textContent = faction.icon;
        icon.style.cssText = `
            font-size: 48px;
            margin-right: 15px;
        `;

        // Info container
        const info = document.createElement('div');
        info.style.cssText = `
            flex: 1;
        `;

        // Name
        const name = document.createElement('div');
        name.textContent = faction.name.toUpperCase();
        name.style.cssText = `
            font-size: 18px;
            font-weight: bold;
            color: ${faction.color};
            margin-bottom: 5px;
        `;

        // Description
        const description = document.createElement('div');
        description.textContent = faction.description;
        description.style.cssText = `
            font-size: 11px;
            color: #ccc;
            line-height: 1.4;
        `;

        info.appendChild(name);
        info.appendChild(description);

        card.appendChild(icon);
        card.appendChild(info);

        return card;
    }

    private setupEventListeners() {
        // F key to toggle faction menu
        this.keydownHandler = (e: KeyboardEvent) => {
            if (e.key === 'f' || e.key === 'F') {
                // Don't open if chat is focused or other menus are open
                const chatInput = document.getElementById('chat-input');
                if (document.activeElement === chatInput) {
                    return;
                }
                e.preventDefault();
                this.toggleMenu();
            } else if (e.key === 'Escape' && this.isOpen) {
                this.toggleMenu();
            }
        };
        document.addEventListener('keydown', this.keydownHandler);

        // Listen for faction updates from server
        this.factionUpdateHandler = ((e: CustomEvent) => {
            const { faction } = e.detail;
            this.setFaction(faction);
        }) as EventListener;
        window.addEventListener('dystopia:factionUpdate', this.factionUpdateHandler);
    }

    private toggleMenu() {
        this.isOpen = !this.isOpen;
        this.factionMenuContainer.style.display = this.isOpen ? 'block' : 'none';
    }

    private selectFaction(factionId: string) {
        const faction = FACTIONS.find(f => f.id === factionId);
        if (!faction) return;

        // Update local state
        this.currentFaction = factionId;

        // Update display
        const display = document.getElementById('current-faction-display');
        if (display) {
            display.innerHTML = `
                <span style="color: ${faction.color}; font-weight: bold;">${faction.icon} ${faction.name.toUpperCase()}</span>
                <br>
                <span style="font-size: 10px; color: #aaa;">${faction.description}</span>
            `;
        }

        // Emit event to game to send to server
        window.dispatchEvent(new CustomEvent('dystopia:selectFaction', {
            detail: { factionId }
        }));

        console.log(`[DYSTOPIA] Selected faction: ${faction.name}`);

        // Close menu
        this.toggleMenu();
    }

    private hexToRgb(hex: string): string {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return '0, 0, 0';

        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        return `${r}, ${g}, ${b}`;
    }

    public setFaction(factionId: string | null) {
        if (!factionId) {
            this.currentFaction = null;
            const display = document.getElementById('current-faction-display');
            if (display) {
                display.textContent = 'No faction selected - Press F to open faction menu';
            }
            return;
        }

        const faction = FACTIONS.find(f => f.id === factionId);
        if (!faction) return;

        this.currentFaction = factionId;
        const display = document.getElementById('current-faction-display');
        if (display) {
            display.innerHTML = `
                <span style="color: ${faction.color}; font-weight: bold;">${faction.icon} ${faction.name.toUpperCase()}</span>
                <br>
                <span style="font-size: 10px; color: #aaa;">${faction.description}</span>
            `;
        }
    }

    public getFaction(): string | null {
        return this.currentFaction;
    }

    /**
     * Override base onDestroy to add custom cleanup
     */
    protected onDestroy() {
        // Remove event listeners
        document.removeEventListener('keydown', this.keydownHandler);
        window.removeEventListener('dystopia:factionUpdate', this.factionUpdateHandler);

        // Remove DOM elements
        this.factionMenuContainer?.remove();

        console.log('[DYSTOPIA] Faction system destroyed');
    }
}

// Export singleton instance
export let factionSystem: FactionSystemUI | null = null;

export function initFactionSystem() {
    if (!factionSystem) {
        factionSystem = new FactionSystemUI();
        console.log('[DYSTOPIA] Faction system initialized');
    }
    return factionSystem;
}
