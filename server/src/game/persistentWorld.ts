/**
 * DYSTOPIA ETERNAL - Persistent World Manager
 *
 * This manager handles all persistent world features:
 * - Building placement, damage, and destruction
 * - Territory control and capture
 * - Resource gathering and storage
 * - Cross-server data synchronization
 */

import { Buildings, Players, Territories, Chat } from "../api/db/supabase";
import type { Game } from "./game";
import type { Player } from "./objects/player";
import { v2 } from "../../../shared/utils/v2";
import type { Vec2 } from "../../../shared/utils/v2";

export interface PersistentBuilding {
    id: number;
    buildingType: string;
    tier: number;
    pos: Vec2;
    zone: number;
    rotation: number;
    ownerId: number;
    clanId: number | null;
    health: number;
    maxHealth: number;
    armor: number;
    isDestroyed: boolean;
    data: any;
}

export interface PersistentTerritory {
    id: number;
    name: string;
    zone: number;
    centerPos: Vec2;
    radius: number;
    controlledBy: string | null;
    ownerId: number | null;
    clanId: number | null;
    captureProgress: number;
    underAttack: boolean;
}

export class PersistentWorldManager {
    game: Game;

    // In-memory cache of buildings (synced with DB)
    buildings: Map<number, PersistentBuilding> = new Map();

    // In-memory cache of territories
    territories: Map<number, PersistentTerritory> = new Map();

    // Pending database updates (batched for performance)
    pendingBuildingUpdates: Set<number> = new Set();
    pendingPlayerUpdates: Set<number> = new Set();

    // Sync intervals
    buildingSyncInterval = 5000; // 5 seconds
    playerSyncInterval = 10000; // 10 seconds

    constructor(game: Game) {
        this.game = game;
    }

    /**
     * Initialize - Load persistent data from database
     */
    async init() {
        console.log('[PersistentWorld] Initializing for game', this.game.id);

        // Load buildings for this zone
        // Note: In production, you'd determine zone from map/region
        const zoneId = this.getZoneId();

        try {
            const buildingsData = await Buildings.getByZone(zoneId);

            for (const b of buildingsData) {
                this.buildings.set(b.id, {
                    id: b.id,
                    buildingType: b.building_type,
                    tier: b.tier,
                    pos: v2.create(b.x, b.y),
                    zone: b.zone,
                    rotation: b.rotation,
                    ownerId: b.owner_id,
                    clanId: b.clan_id,
                    health: b.health,
                    maxHealth: b.max_health,
                    armor: b.armor,
                    isDestroyed: b.is_destroyed,
                    data: b.data || {}
                });
            }

            console.log(`[PersistentWorld] Loaded ${buildingsData.length} buildings for zone ${zoneId}`);

            // Load territories
            const territoriesData = await Territories.getByZone(zoneId);

            for (const t of territoriesData) {
                this.territories.set(t.id, {
                    id: t.id,
                    name: t.name,
                    zone: t.zone,
                    centerPos: v2.create(t.center_x, t.center_y),
                    radius: t.radius,
                    controlledBy: t.controlled_by,
                    ownerId: t.owner_id,
                    clanId: t.clan_id,
                    captureProgress: t.capture_progress,
                    underAttack: t.under_attack
                });
            }

            console.log(`[PersistentWorld] Loaded ${territoriesData.length} territories for zone ${zoneId}`);

        } catch (error) {
            console.error('[PersistentWorld] Failed to load data:', error);
        }

        // Start sync loops
        this.startSyncLoops();
    }

    /**
     * Get zone ID for this game instance
     * In production, this would be based on map regions
     */
    getZoneId(): number {
        // For now, use a hash of the map name
        // In production, implement proper zone/shard system
        return Math.abs(this.game.mapName.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0)) % 100;
    }

    /**
     * Place a new building
     */
    async placeBuilding(player: Player, buildingType: string, pos: Vec2, ori: number): Promise<boolean> {
        // Check if player has resources
        // TODO: Implement resource checking

        // Check if position is valid (not too close to other buildings)
        const tooClose = Array.from(this.buildings.values()).some(b => {
            if (b.isDestroyed) return false;
            const dist = v2.distance(b.pos, pos);
            return dist < 10; // Minimum 10 unit spacing
        });

        if (tooClose) {
            return false;
        }

        try {
            // Create in database
            const newBuilding = await Buildings.create({
                buildingType,
                tier: 1,
                x: pos.x,
                y: pos.y,
                zone: this.getZoneId(),
                rotation: ori,
                ownerId: player.dbPlayerId || 0,
                clanId: undefined, // TODO: Get player's clan ID
                isPublic: false
            });

            // Add to cache
            this.buildings.set(newBuilding.id, {
                id: newBuilding.id,
                buildingType: newBuilding.building_type,
                tier: newBuilding.tier,
                pos: v2.create(newBuilding.x, newBuilding.y),
                zone: newBuilding.zone,
                rotation: newBuilding.rotation,
                ownerId: newBuilding.owner_id,
                clanId: newBuilding.clan_id,
                health: newBuilding.health,
                maxHealth: newBuilding.max_health,
                armor: newBuilding.armor,
                isDestroyed: newBuilding.is_destroyed,
                data: newBuilding.data || {}
            });

            console.log(`[PersistentWorld] Player ${player.name} placed ${buildingType} at ${pos.x},${pos.y}`);

            // Spawn building object in game world
            const buildingObj = new this.game.objectRegister.classes.Building(
                this.game,
                buildingType,
                v2.create(pos.x, pos.y),
                ori,
                player.layer || 0
            );
            this.game.objectRegister.register(buildingObj);
            this.game.grid.addObject(buildingObj);

            return true;
        } catch (error) {
            console.error('[PersistentWorld] Failed to place building:', error);
            return false;
        }
    }

    /**
     * Damage a building
     */
    async damageBuilding(buildingId: number, damage: number) {
        const building = this.buildings.get(buildingId);
        if (!building || building.isDestroyed) return;

        // Apply armor reduction
        const actualDamage = Math.max(1, damage - building.armor);
        building.health -= actualDamage;

        if (building.health <= 0) {
            building.health = 0;
            building.isDestroyed = true;
            console.log(`[PersistentWorld] Building ${buildingId} destroyed!`);
        }

        // Mark for sync
        this.pendingBuildingUpdates.add(buildingId);
    }

    /**
     * Repair a building
     */
    async repairBuilding(buildingId: number, amount: number) {
        const building = this.buildings.get(buildingId);
        if (!building || building.isDestroyed) return;

        building.health = Math.min(building.maxHealth, building.health + amount);

        // Mark for sync
        this.pendingBuildingUpdates.add(buildingId);
    }

    /**
     * Capture territory progress
     */
    async captureTerritoryProgress(territoryId: number, player: Player, amount: number) {
        const territory = this.territories.get(territoryId);
        if (!territory) return;

        // Check if player's faction matches current controller
        const playerFaction = player.dbPlayerId ? await this.getPlayerFaction(player.dbPlayerId) : null;

        if (!playerFaction) return;

        if (territory.controlledBy === playerFaction) {
            // Already controlled by this faction, no capture needed
            return;
        }

        // Increase capture progress
        territory.captureProgress += amount;
        territory.underAttack = true;

        // Check if fully captured (100% progress)
        if (territory.captureProgress >= 100) {
            territory.controlledBy = playerFaction;
            territory.ownerId = player.dbPlayerId;
            territory.captureProgress = 0;
            territory.underAttack = false;

            console.log(`[PersistentWorld] Territory ${territory.name} captured by ${playerFaction}!`);

            // Broadcast to all players
            await this.broadcastTerritoryCapture(territory, playerFaction);

            // Update in database
            await Territories.updateControl(territoryId, {
                controlledBy: playerFaction,
                ownerId: player.dbPlayerId,
                captureProgress: 0,
                underAttack: false
            });
        } else {
            // Update capture progress in database
            await Territories.updateControl(territoryId, {
                captureProgress: territory.captureProgress,
                underAttack: true
            });
        }
    }

    /**
     * Save player data to database
     */
    async savePlayerData(player: Player) {
        if (!player.dbPlayerId) return;

        try {
            // Update position
            await Players.updatePosition(
                player.dbPlayerId,
                player.pos.x,
                player.pos.y,
                this.getZoneId(),
                player.health,
                player.boost
            );

            // Update resources if dirty
            if (player.resourcesDirty) {
                await Players.updateResources(player.dbPlayerId, {
                    wood: player.resources.wood,
                    stone: player.resources.stone,
                    metal: player.resources.metal,
                    uranium: player.resources.uranium,
                    food: player.resources.food,
                    water: player.resources.water,
                    fuel: player.resources.fuel,
                    dystopia_tokens: player.resources.dystopia_tokens
                });
                player.resourcesDirty = false;
            }

            console.log(`[PersistentWorld] Saved player ${player.name} data`);
        } catch (error) {
            console.error('[PersistentWorld] Failed to save player data:', error);
        }
    }

    /**
     * Update player faction
     */
    async updatePlayerFaction(userId: string, faction: string | null) {
        try {
            await Players.updateFaction(userId, faction);
            console.log(`[PersistentWorld] Updated faction for user ${userId} to ${faction || 'None'}`);
        } catch (error) {
            console.error('[PersistentWorld] Failed to update player faction:', error);
            throw error;
        }
    }

    /**
     * Send chat message
     */
    async sendChatMessage(player: Player, channel: string, message: string, targetId?: number) {
        if (!player.dbPlayerId) return;

        try {
            await Chat.create({
                senderId: player.dbPlayerId,
                senderName: player.name,
                channel,
                message,
                zone: channel === 'zone' ? this.getZoneId() : undefined,
                clanId: undefined, // TODO: Get player's clan ID
                recipientId: targetId
            });

            // TODO: Broadcast to appropriate players
            console.log(`[Chat] ${player.name} (${channel}): ${message}`);
        } catch (error) {
            console.error('[PersistentWorld] Failed to send chat:', error);
        }
    }

    /**
     * Get player's faction from database
     */
    private async getPlayerFaction(playerId: number): Promise<string | null> {
        try {
            const player = await Players.findById(playerId);
            return player?.faction || null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Broadcast territory capture to all players
     */
    private async broadcastTerritoryCapture(territory: PersistentTerritory, faction: string) {
        // TODO: Send network message to all players
        // For now, just log
        console.log(`[Broadcast] Territory ${territory.name} captured by ${faction}!`);
    }

    /**
     * Start periodic sync loops
     */
    private startSyncLoops() {
        // Sync buildings every 5 seconds
        setInterval(() => {
            this.syncBuildings();
        }, this.buildingSyncInterval);

        // Sync players every 10 seconds
        setInterval(() => {
            this.syncPlayers();
        }, this.playerSyncInterval);
    }

    /**
     * Sync pending building updates to database
     */
    private async syncBuildings() {
        if (this.pendingBuildingUpdates.size === 0) return;

        const updates = Array.from(this.pendingBuildingUpdates);
        this.pendingBuildingUpdates.clear();

        for (const buildingId of updates) {
            const building = this.buildings.get(buildingId);
            if (!building) continue;

            try {
                await Buildings.updateHealth(buildingId, building.health, building.isDestroyed);
            } catch (error) {
                console.error(`[PersistentWorld] Failed to sync building ${buildingId}:`, error);
            }
        }

        if (updates.length > 0) {
            console.log(`[PersistentWorld] Synced ${updates.length} building updates`);
        }
    }

    /**
     * Sync all online players to database
     */
    private async syncPlayers() {
        // Get all living players
        const players = this.game.playerBarn.livingPlayers.filter(p => !p.disconnected);

        for (const player of players) {
            if (player.dbPlayerId) {
                await this.savePlayerData(player);
            }
        }

        if (players.length > 0) {
            console.log(`[PersistentWorld] Synced ${players.length} players`);
        }
    }

    /**
     * Shutdown - Final save before server shutdown
     */
    async shutdown() {
        console.log('[PersistentWorld] Shutting down, performing final save...');

        // Sync all buildings
        await this.syncBuildings();

        // Sync all players
        await this.syncPlayers();

        console.log('[PersistentWorld] Shutdown complete');
    }
}
