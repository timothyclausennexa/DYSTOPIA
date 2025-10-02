/**
 * DYSTOPIA ETERNAL - UI Constants
 * Centralized UI styling, colors, and configuration
 */

/**
 * Color scheme for the entire UI
 */
export const UI_COLORS = {
    // Primary colors
    primary: '#ffa500',           // Orange
    primaryDark: '#ff8c00',      // Dark orange
    primaryLight: '#ffb732',     // Light orange

    // Status colors
    success: '#00ff00',          // Green
    error: '#ff0000',            // Red
    warning: '#ffff00',          // Yellow
    info: '#00bfff',             // Blue

    // Neutral colors
    background: 'rgba(0, 0, 0, 0.85)',
    backgroundDark: 'rgba(0, 0, 0, 0.95)',
    backgroundLight: 'rgba(0, 0, 0, 0.6)',

    text: '#ffffff',
    textMuted: '#aaaaaa',
    textDim: '#666666',

    // Border colors
    border: '#ffa500',
    borderDark: '#333333',
    borderLight: '#555555',

    // Faction colors (matching FACTION_COLORS in baseUISystem)
    factionRed: '#ff0000',
    factionBlue: '#0064ff',
    factionGreen: '#00ff00',
    factionYellow: '#ffff00',
    factionPurple: '#c800ff',

    // Resource colors
    wood: '#8B4513',
    stone: '#808080',
    metal: '#C0C0C0',
    uranium: '#00FF00',
    food: '#FF6B6B',
    water: '#4A90E2',
    fuel: '#FFA500',
    tokens: '#FFD700'
} as const;

/**
 * Font configuration
 */
export const UI_FONTS = {
    primary: "'Courier New', monospace",
    heading: "'Courier New', monospace",
    body: "'Courier New', monospace",

    sizes: {
        tiny: '10px',
        small: '11px',
        normal: '12px',
        medium: '14px',
        large: '18px',
        xlarge: '24px',
        huge: '32px'
    },

    weights: {
        normal: '400',
        bold: '700'
    }
} as const;

/**
 * Spacing constants
 */
export const UI_SPACING = {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '15px',
    xl: '20px',
    xxl: '30px'
} as const;

/**
 * Border radius constants
 */
export const UI_RADIUS = {
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px'
} as const;

/**
 * Z-index layering system
 */
export const UI_Z_INDEX = {
    canvas: {
        territory: 50,
        playerUI: 60,
        effects: 70
    },

    hud: {
        resources: 100,
        minimap: 100,
        healthbar: 100
    },

    menu: {
        chat: 100,
        faction: 150,
        building: 200
    },

    modal: 300,
    tooltip: 400,
    notification: 500,
    preview: 9999
} as const;

/**
 * Animation durations (milliseconds)
 */
export const UI_ANIMATION = {
    fast: 100,
    normal: 200,
    slow: 300,
    verySlow: 500
} as const;

/**
 * Box shadow presets
 */
export const UI_SHADOWS = {
    glow: (color: string = UI_COLORS.primary, intensity: number = 0.5) =>
        `0 0 15px rgba(255, 165, 0, ${intensity})`,

    glowStrong: (color: string = UI_COLORS.primary, intensity: number = 0.7) =>
        `0 0 30px rgba(255, 165, 0, ${intensity})`,

    drop: '0 2px 4px rgba(0, 0, 0, 0.3)',
    dropStrong: '0 4px 8px rgba(0, 0, 0, 0.5)'
} as const;

/**
 * Common CSS mixins as strings
 */
export const UI_MIXINS = {
    /**
     * Default container styling
     */
    container: `
        background: ${UI_COLORS.background};
        border: 2px solid ${UI_COLORS.border};
        border-radius: ${UI_RADIUS.lg};
        font-family: ${UI_FONTS.primary};
        color: ${UI_COLORS.text};
    `,

    /**
     * Default button styling
     */
    button: `
        padding: ${UI_SPACING.sm} ${UI_SPACING.lg};
        background: rgba(255, 165, 0, 0.2);
        border: 2px solid ${UI_COLORS.border};
        border-radius: ${UI_RADIUS.md};
        color: ${UI_COLORS.text};
        font-family: ${UI_FONTS.primary};
        font-size: ${UI_FONTS.sizes.normal};
        cursor: pointer;
        transition: all ${UI_ANIMATION.normal}ms;
    `,

    /**
     * Button hover effect
     */
    buttonHover: `
        background: rgba(255, 165, 0, 0.5);
        transform: scale(1.05);
    `,

    /**
     * Disabled state
     */
    disabled: `
        opacity: 0.5;
        cursor: not-allowed;
        pointer-events: none;
    `,

    /**
     * Flex center
     */
    flexCenter: `
        display: flex;
        align-items: center;
        justify-content: center;
    `,

    /**
     * Absolute fill
     */
    absoluteFill: `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
    `,

    /**
     * Fixed fill
     */
    fixedFill: `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    `
} as const;

/**
 * Icon/emoji sets for various UI elements
 */
export const UI_ICONS = {
    resources: {
        wood: '🪵',
        stone: '🪨',
        metal: '⚙️',
        uranium: '☢️',
        food: '🍎',
        water: '💧',
        fuel: '⛽',
        tokens: '💰'
    },

    buildings: {
        wall: '🧱',
        tower: '🗼',
        turret: '🔫',
        storage: '📦',
        chest: '🎁',
        vault: '🏦',
        barracks: '🏠',
        factory: '🏭',
        mine: '⛏️',
        farm: '🌾',
        trap: '🔺'
    },

    factions: {
        red: '🔴',
        blue: '🔵',
        green: '🟢',
        yellow: '🟡',
        purple: '🟣'
    },

    ui: {
        close: '×',
        menu: '☰',
        settings: '⚙️',
        help: '❓',
        warning: '⚠️',
        check: '✓',
        cross: '✗'
    }
} as const;

/**
 * Helper function to create CSS from object
 */
export function cssFromObject(styles: Record<string, string | number>): string {
    return Object.entries(styles)
        .map(([key, value]) => {
            const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            return `${cssKey}: ${value};`;
        })
        .join('\n            ');
}

/**
 * Helper function to create rgba color from hex
 */
export function hexToRgba(hex: string, alpha: number = 1): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(0, 0, 0, ${alpha})`;

    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Helper function to lighten/darken a hex color
 */
export function adjustColor(hex: string, percent: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return hex;

    let r = parseInt(result[1], 16);
    let g = parseInt(result[2], 16);
    let b = parseInt(result[3], 16);

    r = Math.min(255, Math.max(0, r + (r * percent / 100)));
    g = Math.min(255, Math.max(0, g + (g * percent / 100)));
    b = Math.min(255, Math.max(0, b + (b * percent / 100)));

    return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
}
