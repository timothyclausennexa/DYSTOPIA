import { supabase } from '../../db/supabase';
import Bull from 'bull';
import Redis from 'ioredis';

// ===== BUILDING CONFIGURATION =====
const BUILDING_TYPES = {
  // === BASIC STRUCTURES ===
  WOOD_WALL: {
    cost: { wood: 50, stone: 0, metal: 0 },
    health: 200,
    size: 2,
    buildTime: 3000,
    tier: 1,
    description: 'Basic wooden defense'
  },
  STONE_WALL: {
    cost: { wood: 20, stone: 100, metal: 0 },
    health: 500,
    size: 2,
    buildTime: 5000,
    tier: 2,
    description: 'Strong stone fortification'
  },
  METAL_WALL: {
    cost: { wood: 0, stone: 50, metal: 100 },
    health: 1000,
    size: 2,
    buildTime: 10000,
    tier: 3,
    description: 'Advanced metal barrier'
  },

  // === DEFENSIVE STRUCTURES ===
  TURRET_BASIC: {
    cost: { wood: 100, stone: 50, metal: 200 },
    health: 300,
    size: 3,
    buildTime: 15000,
    tier: 2,
    damage: 20,
    range: 300,
    fireRate: 1000,
    description: 'Automated defense turret'
  },
  TURRET_LASER: {
    cost: { wood: 0, stone: 100, metal: 500, uranium: 10 },
    health: 500,
    size: 4,
    buildTime: 30000,
    tier: 4,
    damage: 50,
    range: 500,
    fireRate: 500,
    description: 'High-tech laser turret'
  },

  // === PRODUCTION BUILDINGS ===
  RESOURCE_GENERATOR: {
    cost: { wood: 200, stone: 200, metal: 100 },
    health: 400,
    size: 5,
    buildTime: 20000,
    tier: 2,
    production: { wood: 10, stone: 5 },
    interval: 60000,
    description: 'Generates resources over time'
  },
  URANIUM_EXTRACTOR: {
    cost: { wood: 0, stone: 500, metal: 1000 },
    health: 600,
    size: 6,
    buildTime: 60000,
    tier: 4,
    production: { uranium: 1 },
    interval: 300000,
    description: 'Extracts uranium from ground'
  },

  // === UTILITY BUILDINGS ===
  STORAGE_SMALL: {
    cost: { wood: 100, stone: 50, metal: 20 },
    health: 200,
    size: 4,
    buildTime: 5000,
    tier: 1,
    capacity: 1000,
    description: 'Store items safely'
  },
  CRAFTING_STATION: {
    cost: { wood: 150, stone: 100, metal: 50 },
    health: 300,
    size: 4,
    buildTime: 10000,
    tier: 2,
    craftingSpeed: 1.5,
    description: 'Craft advanced items'
  },
  SPAWN_BEACON: {
    cost: { wood: 50, stone: 50, metal: 200 },
    health: 150,
    size: 3,
    buildTime: 8000,
    tier: 2,
    respawnTime: 30000,
    description: 'Respawn point for clan'
  },

  // === ADVANCED STRUCTURES ===
  VEHICLE_FACTORY: {
    cost: { wood: 0, stone: 500, metal: 1000 },
    health: 800,
    size: 8,
    buildTime: 45000,
    tier: 3,
    description: 'Produces vehicles'
  },
  NUCLEAR_SILO: {
    cost: { wood: 0, stone: 1000, metal: 2000, uranium: 100 },
    health: 2000,
    size: 10,
    buildTime: 300000, // 5 minutes
    tier: 5,
    description: 'Launch nuclear weapons'
  },
  SHIELD_GENERATOR: {
    cost: { wood: 0, stone: 200, metal: 500, uranium: 20 },
    health: 400,
    size: 5,
    buildTime: 60000,
    tier: 4,
    shieldRadius: 500,
    shieldHealth: 1000,
    description: 'Protects area with energy shield'
  },
  MONUMENT: {
    cost: { wood: 1000, stone: 2000, metal: 1000, uranium: 50 },
    health: 5000,
    size: 12,
    buildTime: 600000, // 10 minutes
    tier: 5,
    description: 'Symbol of empire dominance'
  }
} as const;

type BuildingType = keyof typeof BUILDING_TYPES;

interface BuildingPlacementResult {
  success: boolean;
  error?: string;
  buildingId?: number;
}

interface DamageResult {
  destroyed: boolean;
  remainingHealth: number;
}

interface RepairResult {
  success: boolean;
  error?: string;
}

export class BuildingSystem {
  private redis: Redis;
  private buildQueue: Bull.Queue;
  private buildingCache: Map<number, any> = new Map();
  private zoneBuildingIndex: Map<number, Set<number>> = new Map();
  private buildCooldowns: Map<number, number> = new Map();

  constructor(private game: any) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.buildQueue = new Bull('building-queue', process.env.REDIS_URL || 'redis://localhost:6379');

    // Process build queue
    this.buildQueue.process(async (job) => {
      return await this.processBuildJob(job.data);
    });

    // Load all buildings on startup
    this.loadAllBuildings();

    // Start decay timer
    setInterval(() => this.processDecay(), 60000); // Every minute
  }

  // ===== PLACE BUILDING WITH FULL VALIDATION =====
  async placeBuilding(
    playerId: number,
    buildingType: BuildingType,
    x: number,
    y: number,
    rotation: number = 0
  ): Promise<BuildingPlacementResult> {

    console.log(`[BUILD] Player ${playerId} attempting to place ${buildingType} at ${x},${y}`);

    try {
      // === VALIDATION PHASE ===

      // 1. Check if building type exists
      const buildingConfig = BUILDING_TYPES[buildingType];
      if (!buildingConfig) {
        return { success: false, error: 'Invalid building type' };
      }

      // 2. Get player data
      const player = await this.game.getPlayer(playerId);
      if (!player) {
        return { success: false, error: 'Player not found' };
      }

      if (!player.isOnline) {
        return { success: false, error: 'Player not online' };
      }

      // 3. Check cooldown
      const lastBuildTime = this.buildCooldowns.get(playerId) || 0;
      const now = Date.now();
      const cooldownRemaining = lastBuildTime + 1000 - now; // 1 second cooldown

      if (cooldownRemaining > 0) {
        return {
          success: false,
          error: `Build cooldown: ${Math.ceil(cooldownRemaining / 1000)}s`
        };
      }

      // 4. Check resources
      const cost = buildingConfig.cost;
      if (player.wood < cost.wood ||
          player.stone < cost.stone ||
          player.metal < cost.metal ||
          (cost.uranium && player.uranium < (cost.uranium || 0))) {
        return {
          success: false,
          error: `Insufficient resources. Need: Wood ${cost.wood}, Stone ${cost.stone}, Metal ${cost.metal}${cost.uranium ? `, Uranium ${cost.uranium}` : ''}`
        };
      }

      // 5. Check build distance
      const distance = Math.sqrt(Math.pow(x - player.currentX, 2) + Math.pow(y - player.currentY, 2));
      const maxBuildDistance = 500;

      if (distance > maxBuildDistance) {
        return {
          success: false,
          error: `Too far away. Max distance: ${maxBuildDistance}`
        };
      }

      // 6. Check zone boundaries
      const zone = Math.floor(x / 5000) + Math.floor(y / 5000) * 10;
      if (zone < 0 || zone >= 100) {
        return { success: false, error: 'Invalid position' };
      }

      // 7. Check for collisions
      const nearbyBuildings = await this.getBuildingsInRadius(x, y, buildingConfig.size * 20);
      for (const building of nearbyBuildings) {
        if (!building.isDestroyed) {
          const buildingType = building.buildingType as BuildingType;
          const otherSize = BUILDING_TYPES[buildingType]?.size || 2;
          const minDistance = (buildingConfig.size + otherSize) * 10;

          const dist = Math.sqrt(
            Math.pow(building.x - x, 2) +
            Math.pow(building.y - y, 2)
          );

          if (dist < minDistance) {
            return {
              success: false,
              error: 'Too close to another building'
            };
          }
        }
      }

      // 8. Check territory permissions for advanced buildings
      if (buildingConfig.tier >= 3 && this.game.territorySystem) {
        const territory = await this.game.territorySystem.getTerritoryAt(x, y);
        if (territory) {
          if (territory.ownerId !== playerId && territory.clanId !== player.clanId) {
            return {
              success: false,
              error: 'Cannot build advanced structures in enemy territory'
            };
          }
        }
      }

      // 9. Check building limits
      const { count: playerBuildingCount } = await supabase
        .from('buildings')
        .select('id', { count: 'exact', head: true })
        .eq('ownerId', playerId)
        .eq('isDestroyed', false);

      const maxBuildings = 100 + (player.level * 10);
      if ((playerBuildingCount || 0) >= maxBuildings) {
        return {
          success: false,
          error: `Building limit reached (${maxBuildings})`
        };
      }

      // === RESOURCE DEDUCTION ===
      const { error: resourceError } = await supabase
        .from('players')
        .update({
          wood: player.wood - cost.wood,
          stone: player.stone - cost.stone,
          metal: player.metal - cost.metal,
          uranium: player.uranium - (cost.uranium || 0)
        })
        .eq('id', playerId);

      if (resourceError) {
        console.error('Failed to deduct resources:', resourceError);
        return { success: false, error: 'Failed to deduct resources' };
      }

      // === CREATE BUILDING ===
      const buildingData = {
        buildingType,
        tier: buildingConfig.tier,
        x,
        y,
        zone,
        rotation,
        ownerId: playerId,
        clanId: player.clanId,
        health: 1, // Starts at 1 HP during construction
        maxHealth: buildingConfig.health,
        isActive: false, // Inactive during construction
        data: this.getInitialBuildingData(buildingType),
        decayAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      };

      const { data: newBuilding, error: insertError } = await supabase
        .from('buildings')
        .insert(buildingData)
        .select()
        .single();

      if (insertError) {
        // Refund resources on failure
        await supabase
          .from('players')
          .update({
            wood: player.wood,
            stone: player.stone,
            metal: player.metal,
            uranium: player.uranium
          })
          .eq('id', playerId);

        console.error('Failed to create building:', insertError);
        return { success: false, error: 'Failed to create building' };
      }

      // === ADD TO CACHE ===
      this.buildingCache.set(newBuilding.id, newBuilding);

      if (!this.zoneBuildingIndex.has(zone)) {
        this.zoneBuildingIndex.set(zone, new Set());
      }
      this.zoneBuildingIndex.get(zone)!.add(newBuilding.id);

      // === START CONSTRUCTION ===
      await this.buildQueue.add({
        buildingId: newBuilding.id,
        completionTime: Date.now() + buildingConfig.buildTime
      }, {
        delay: buildingConfig.buildTime
      });

      // === UPDATE COOLDOWN ===
      this.buildCooldowns.set(playerId, now);

      // === NOTIFY PLAYERS ===
      if (this.game.broadcastToZone) {
        this.game.broadcastToZone(zone, {
          type: 'buildingPlaced',
          building: {
            ...newBuilding,
            isConstructing: true,
            constructionTime: buildingConfig.buildTime
          }
        });
      }

      // === LOG FOR ANALYTICS ===
      await this.logBuildingEvent(playerId, 'placed', buildingType, { x, y, zone });

      console.log(`[BUILD] Success! Building ${newBuilding.id} placed by player ${playerId}`);

      return {
        success: true,
        buildingId: newBuilding.id
      };

    } catch (error) {
      console.error('[BUILD] Critical error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  // ===== PROCESS BUILD COMPLETION =====
  async processBuildJob(data: any) {
    const { buildingId } = data;

    const building = this.buildingCache.get(buildingId);
    if (!building || building.isDestroyed) return;

    const buildingConfig = BUILDING_TYPES[building.buildingType as BuildingType];

    // Complete construction
    await supabase
      .from('buildings')
      .update({
        health: buildingConfig.health,
        isActive: true
      })
      .eq('id', buildingId);

    // Update cache
    building.health = buildingConfig.health;
    building.isActive = true;

    // Notify zone
    if (this.game.broadcastToZone) {
      this.game.broadcastToZone(building.zone, {
        type: 'buildingCompleted',
        buildingId
      });
    }

    // Activate special functions
    if (building.buildingType === 'TURRET_BASIC' || building.buildingType === 'TURRET_LASER') {
      this.activateTurret(buildingId);
    }

    if (building.buildingType === 'RESOURCE_GENERATOR' || building.buildingType === 'URANIUM_EXTRACTOR') {
      this.startResourceGeneration(buildingId);
    }

    console.log(`[BUILD] Construction completed for building ${buildingId}`);
  }

  // ===== DAMAGE BUILDING =====
  async damageBuilding(
    buildingId: number,
    damage: number,
    attackerId?: number,
    weaponType?: string
  ): Promise<DamageResult> {

    const building = this.buildingCache.get(buildingId);
    if (!building || building.isDestroyed) {
      return { destroyed: false, remainingHealth: 0 };
    }

    // Apply damage
    building.health = Math.max(0, building.health - damage);

    // Update database
    if (building.health <= 0) {
      // Building destroyed
      building.isDestroyed = true;

      await supabase
        .from('buildings')
        .update({
          health: 0,
          isDestroyed: true,
          isActive: false
        })
        .eq('id', buildingId);

      // Remove from zone index
      const zoneSet = this.zoneBuildingIndex.get(building.zone);
      if (zoneSet) {
        zoneSet.delete(buildingId);
      }

      // Notify
      if (this.game.broadcastToZone) {
        this.game.broadcastToZone(building.zone, {
          type: 'buildingDestroyed',
          buildingId,
          destroyedBy: attackerId
        });
      }

      // Drop resources (50% of cost)
      const buildingConfig = BUILDING_TYPES[building.buildingType as BuildingType];
      if (buildingConfig && this.game.createLootDrop) {
        const drops = {
          wood: Math.floor(buildingConfig.cost.wood * 0.5),
          stone: Math.floor(buildingConfig.cost.stone * 0.5),
          metal: Math.floor(buildingConfig.cost.metal * 0.5)
        };

        await this.game.createLootDrop(building.x, building.y, drops);
      }

      // Update attacker stats
      if (attackerId) {
        const { data: attacker } = await supabase
          .from('players')
          .select('buildingsDestroyed')
          .eq('id', attackerId)
          .single();

        if (attacker) {
          await supabase
            .from('players')
            .update({
              buildingsDestroyed: (attacker.buildingsDestroyed || 0) + 1
            })
            .eq('id', attackerId);
        }
      }

      console.log(`[BUILD] Building ${buildingId} destroyed by player ${attackerId}`);

      return { destroyed: true, remainingHealth: 0 };

    } else {
      // Building damaged but not destroyed
      await supabase
        .from('buildings')
        .update({ health: building.health })
        .eq('id', buildingId);

      // Notify
      if (this.game.broadcastToZone) {
        this.game.broadcastToZone(building.zone, {
          type: 'buildingDamaged',
          buildingId,
          remainingHealth: building.health,
          maxHealth: building.maxHealth
        });
      }

      return { destroyed: false, remainingHealth: building.health };
    }
  }

  // ===== REPAIR BUILDING =====
  async repairBuilding(playerId: number, buildingId: number): Promise<RepairResult> {
    const building = this.buildingCache.get(buildingId);
    if (!building) {
      return { success: false, error: 'Building not found' };
    }

    if (building.ownerId !== playerId) {
      const { data: player } = await supabase
        .from('players')
        .select('clanId')
        .eq('id', playerId)
        .single();

      if (!player || building.clanId !== player.clanId) {
        return { success: false, error: 'Not your building' };
      }
    }

    if (building.isDestroyed) {
      return { success: false, error: 'Building is destroyed' };
    }

    const buildingConfig = BUILDING_TYPES[building.buildingType as BuildingType];
    const healthMissing = buildingConfig.health - building.health;

    if (healthMissing <= 0) {
      return { success: false, error: 'Building at full health' };
    }

    // Calculate repair cost (10% of original cost per 100 HP)
    const repairCost = {
      wood: Math.ceil(buildingConfig.cost.wood * 0.1 * (healthMissing / 100)),
      stone: Math.ceil(buildingConfig.cost.stone * 0.1 * (healthMissing / 100)),
      metal: Math.ceil(buildingConfig.cost.metal * 0.1 * (healthMissing / 100))
    };

    // Check and deduct resources
    const player = await this.game.getPlayer(playerId);
    if (player.wood < repairCost.wood || player.stone < repairCost.stone || player.metal < repairCost.metal) {
      return { success: false, error: 'Insufficient resources for repair' };
    }

    await supabase
      .from('players')
      .update({
        wood: player.wood - repairCost.wood,
        stone: player.stone - repairCost.stone,
        metal: player.metal - repairCost.metal
      })
      .eq('id', playerId);

    // Repair building
    building.health = buildingConfig.health;
    await supabase
      .from('buildings')
      .update({
        health: building.health,
        decayAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // Reset decay timer
      })
      .eq('id', buildingId);

    // Notify
    if (this.game.broadcastToZone) {
      this.game.broadcastToZone(building.zone, {
        type: 'buildingRepaired',
        buildingId,
        health: building.health
      });
    }

    return { success: true };
  }

  // ===== UPGRADE BUILDING =====
  async upgradeBuilding(playerId: number, buildingId: number): Promise<RepairResult> {
    const building = this.buildingCache.get(buildingId);
    if (!building) {
      return { success: false, error: 'Building not found' };
    }

    if (building.ownerId !== playerId) {
      return { success: false, error: 'Not your building' };
    }

    if (building.tier >= 5) {
      return { success: false, error: 'Building at max tier' };
    }

    // Upgrade cost is 2x original cost
    const buildingConfig = BUILDING_TYPES[building.buildingType as BuildingType];
    const upgradeCost = {
      wood: buildingConfig.cost.wood * 2,
      stone: buildingConfig.cost.stone * 2,
      metal: buildingConfig.cost.metal * 2,
      uranium: (buildingConfig.cost.uranium || 0) * 2
    };

    // Check and deduct resources
    const player = await this.game.getPlayer(playerId);
    if (player.wood < upgradeCost.wood ||
        player.stone < upgradeCost.stone ||
        player.metal < upgradeCost.metal ||
        player.uranium < upgradeCost.uranium) {
      return { success: false, error: 'Insufficient resources for upgrade' };
    }

    await supabase
      .from('players')
      .update({
        wood: player.wood - upgradeCost.wood,
        stone: player.stone - upgradeCost.stone,
        metal: player.metal - upgradeCost.metal,
        uranium: player.uranium - upgradeCost.uranium
      })
      .eq('id', playerId);

    // Upgrade building
    building.tier += 1;
    building.maxHealth = buildingConfig.health * (1 + building.tier * 0.5);
    building.health = building.maxHealth;

    await supabase
      .from('buildings')
      .update({
        tier: building.tier,
        health: building.health,
        maxHealth: building.maxHealth
      })
      .eq('id', buildingId);

    // Notify
    if (this.game.broadcastToZone) {
      this.game.broadcastToZone(building.zone, {
        type: 'buildingUpgraded',
        buildingId,
        tier: building.tier
      });
    }

    return { success: true };
  }

  // ===== BUILDING DECAY SYSTEM =====
  async processDecay() {
    const now = new Date();

    // Find buildings that should decay
    const { data: decayingBuildings } = await supabase
      .from('buildings')
      .select('*')
      .lt('decayAt', now.toISOString())
      .eq('isDestroyed', false);

    if (!decayingBuildings || decayingBuildings.length === 0) return;

    for (const building of decayingBuildings) {
      // Apply decay damage (10% of max health)
      const damage = Math.ceil(building.maxHealth * 0.1);
      await this.damageBuilding(building.id, damage);

      // Schedule next decay
      if (!building.isDestroyed) {
        await supabase
          .from('buildings')
          .update({
            isDecaying: true,
            decayAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString() // Next decay in 24h
          })
          .eq('id', building.id);
      }
    }

    console.log(`[DECAY] Processed decay for ${decayingBuildings.length} buildings`);
  }

  // ===== TURRET SYSTEM =====
  async activateTurret(buildingId: number) {
    const turretLoop = setInterval(async () => {
      const building = this.buildingCache.get(buildingId);
      if (!building || building.isDestroyed || !building.isActive) {
        clearInterval(turretLoop);
        return;
      }

      const buildingConfig = BUILDING_TYPES[building.buildingType as BuildingType];
      const range = (buildingConfig as any).range || 300;
      const damage = (buildingConfig as any).damage || 20;

      // Find enemies in range (placeholder - implement getPlayersInRadius in game)
      if (this.game.getPlayersInRadius) {
        const enemies = await this.game.getPlayersInRadius(
          building.x,
          building.y,
          range,
          building.ownerId,
          building.clanId
        );

        if (enemies.length > 0) {
          const target = enemies[0]; // Target closest enemy

          // Fire at target
          if (this.game.dealDamage) {
            await this.game.dealDamage(target.id, damage, building.ownerId, 'turret');
          }

          // Notify zone
          if (this.game.broadcastToZone) {
            this.game.broadcastToZone(building.zone, {
              type: 'turretFire',
              buildingId,
              targetId: target.id,
              damage
            });
          }

          // Update turret stats
          building.data.turretKills = (building.data.turretKills || 0) + (target.health <= 0 ? 1 : 0);
          await supabase
            .from('buildings')
            .update({ data: building.data })
            .eq('id', buildingId);
        }
      }
    }, (buildingConfig as any).fireRate || 1000);
  }

  // ===== RESOURCE GENERATION =====
  async startResourceGeneration(buildingId: number) {
    const generatorLoop = setInterval(async () => {
      const building = this.buildingCache.get(buildingId);
      if (!building || building.isDestroyed || !building.isActive) {
        clearInterval(generatorLoop);
        return;
      }

      const buildingConfig = BUILDING_TYPES[building.buildingType as BuildingType];
      const production = (buildingConfig as any).production;

      if (production) {
        // Add resources to owner
        const { data: owner } = await supabase
          .from('players')
          .select('*')
          .eq('id', building.ownerId)
          .single();

        if (owner) {
          await supabase
            .from('players')
            .update({
              wood: owner.wood + (production.wood || 0),
              stone: owner.stone + (production.stone || 0),
              metal: owner.metal + (production.metal || 0),
              uranium: owner.uranium + (production.uranium || 0)
            })
            .eq('id', building.ownerId);

          // Notify owner
          if (this.game.sendToPlayer) {
            this.game.sendToPlayer(building.ownerId, {
              type: 'resourceGenerated',
              resources: production,
              buildingId
            });
          }
        }
      }
    }, (buildingConfig as any).interval || 60000);
  }

  // ===== HELPER FUNCTIONS =====
  async getBuildingsInRadius(x: number, y: number, radius: number): Promise<any[]> {
    const zone = Math.floor(x / 5000) + Math.floor(y / 5000) * 10;
    const nearbyZones = this.getAdjacentZones(zone);

    const buildings = [];
    for (const z of nearbyZones) {
      const zoneBuildings = this.zoneBuildingIndex.get(z);
      if (zoneBuildings) {
        for (const buildingId of zoneBuildings) {
          const building = this.buildingCache.get(buildingId);
          if (building) {
            const dist = Math.sqrt(
              Math.pow(building.x - x, 2) +
              Math.pow(building.y - y, 2)
            );
            if (dist <= radius) {
              buildings.push(building);
            }
          }
        }
      }
    }

    return buildings;
  }

  getAdjacentZones(zone: number): number[] {
    const zones = [zone];
    const x = zone % 10;
    const y = Math.floor(zone / 10);

    if (x > 0) zones.push(zone - 1);
    if (x < 9) zones.push(zone + 1);
    if (y > 0) zones.push(zone - 10);
    if (y < 9) zones.push(zone + 10);
    if (x > 0 && y > 0) zones.push(zone - 11);
    if (x < 9 && y > 0) zones.push(zone - 9);
    if (x > 0 && y < 9) zones.push(zone + 9);
    if (x < 9 && y < 9) zones.push(zone + 11);

    return zones;
  }

  getInitialBuildingData(buildingType: BuildingType): any {
    switch (buildingType) {
      case 'STORAGE_SMALL':
        return { inventory: [], maxStorage: 1000 };
      case 'TURRET_BASIC':
      case 'TURRET_LASER':
        return { turretKills: 0, ammo: 1000 };
      case 'RESOURCE_GENERATOR':
      case 'URANIUM_EXTRACTOR':
        return { lastHarvest: Date.now() };
      case 'VEHICLE_FACTORY':
        return { vehicleQueue: [] };
      case 'NUCLEAR_SILO':
        return { nukesReady: 0, nukeCooldown: 0 };
      default:
        return {};
    }
  }

  async loadAllBuildings() {
    const { data: buildings } = await supabase
      .from('buildings')
      .select('*')
      .eq('isDestroyed', false);

    if (buildings) {
      for (const building of buildings) {
        this.buildingCache.set(building.id, building);

        if (!this.zoneBuildingIndex.has(building.zone)) {
          this.zoneBuildingIndex.set(building.zone, new Set());
        }
        this.zoneBuildingIndex.get(building.zone)!.add(building.id);

        // Reactivate turrets
        if (building.isActive && (building.buildingType === 'TURRET_BASIC' || building.buildingType === 'TURRET_LASER')) {
          this.activateTurret(building.id);
        }

        // Reactivate generators
        if (building.isActive && (building.buildingType === 'RESOURCE_GENERATOR' || building.buildingType === 'URANIUM_EXTRACTOR')) {
          this.startResourceGeneration(building.id);
        }
      }

      console.log(`[BUILD] Loaded ${buildings.length} buildings from database`);
    }
  }

  async logBuildingEvent(playerId: number, event: string, buildingType: string, data: any) {
    // Log for analytics (placeholder - create analytics table if needed)
    console.log(`[ANALYTICS] Player ${playerId} ${event} ${buildingType}:`, data);
  }
}

// Export building types for use in other modules
export { BUILDING_TYPES };
export type { BuildingType, BuildingPlacementResult, DamageResult, RepairResult };
