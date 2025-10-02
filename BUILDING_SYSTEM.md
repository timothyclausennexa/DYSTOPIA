# 🏗️ DYSTOPIA: ETERNAL BATTLEGROUND - Building System

## ✅ **BULLETPROOF BUILDING SYSTEM IMPLEMENTED!**

### 📂 Location
`server/src/game/systems/BuildingSystem.ts`

---

## 🎯 Features

### **13 Building Types:**
1. **WOOD_WALL** - Basic wooden defense (50 wood)
2. **STONE_WALL** - Strong fortification (100 stone)
3. **METAL_WALL** - Advanced barrier (100 metal)
4. **TURRET_BASIC** - Automated defense (200 metal, 20 dmg, 300 range)
5. **TURRET_LASER** - High-tech turret (500 metal, 10 uranium, 50 dmg, 500 range)
6. **RESOURCE_GENERATOR** - Produces wood/stone (200 wood, 200 stone, 100 metal)
7. **URANIUM_EXTRACTOR** - Extracts uranium (500 stone, 1000 metal)
8. **STORAGE_SMALL** - Store 1000 items (100 wood, 50 stone, 20 metal)
9. **CRAFTING_STATION** - 1.5x crafting speed (150 wood, 100 stone, 50 metal)
10. **SPAWN_BEACON** - Clan respawn point (50 wood/stone, 200 metal)
11. **VEHICLE_FACTORY** - Produces vehicles (500 stone, 1000 metal)
12. **NUCLEAR_SILO** - Launch nukes (1000 stone, 2000 metal, 100 uranium)
13. **SHIELD_GENERATOR** - 500 radius shield (200 stone, 500 metal, 20 uranium)
14. **MONUMENT** - Empire symbol (1000 wood, 2000 stone, 1000 metal, 50 uranium)

---

## 🔧 Core Systems

### **1. Building Placement (9-Step Validation)**
```typescript
const result = await buildingSystem.placeBuilding(
  playerId,
  'WOOD_WALL',
  25000, // x position
  25000, // y position
  0      // rotation
);
```

**Validation Checks:**
1. ✅ Building type exists
2. ✅ Player is online
3. ✅ Build cooldown (1 second)
4. ✅ Sufficient resources
5. ✅ Within build distance (500 units)
6. ✅ Valid zone boundaries
7. ✅ No collision with other buildings
8. ✅ Territory permissions (tier 3+ buildings)
9. ✅ Building limit not reached (100 + level * 10)

### **2. Construction Queue**
- Buildings start at 1 HP during construction
- Bull queue processes completion after buildTime
- Notifies zone when complete
- Activates special functions (turrets, generators)

### **3. Damage System**
```typescript
const result = await buildingSystem.damageBuilding(
  buildingId,
  damage,
  attackerId,
  'rocket'
);

if (result.destroyed) {
  // Building destroyed, drops 50% resources
  // Attacker gets +1 buildingsDestroyed stat
}
```

### **4. Repair System**
```typescript
const result = await buildingSystem.repairBuilding(playerId, buildingId);
// Cost: 10% of original per 100 HP missing
// Resets 7-day decay timer
```

### **5. Upgrade System**
```typescript
const result = await buildingSystem.upgradeBuilding(playerId, buildingId);
// Cost: 2x original cost
// Max tier: 5
// Health scales: base * (1 + tier * 0.5)
```

### **6. Decay System**
- Buildings decay after 7 days inactive
- 10% max health damage every 24 hours
- Auto-destroys when health reaches 0
- Repairing resets decay timer

### **7. Turret System**
- Auto-targets enemies in range
- Fires at configurable fire rate
- Tracks kills in building.data
- Reactivates on server restart

### **8. Resource Generation**
- Generates resources at intervals
- Auto-adds to owner's inventory
- Notifies owner when generated
- Persists across restarts

---

## 📊 Building Configuration

```typescript
BUILDING_TYPES = {
  WOOD_WALL: {
    cost: { wood: 50, stone: 0, metal: 0 },
    health: 200,
    size: 2,
    buildTime: 3000,
    tier: 1
  },
  TURRET_LASER: {
    cost: { wood: 0, stone: 100, metal: 500, uranium: 10 },
    health: 500,
    size: 4,
    buildTime: 30000,
    tier: 4,
    damage: 50,
    range: 500,
    fireRate: 500
  },
  // ... 13 total types
}
```

---

## 🗄️ Database Integration

### **Supabase Client:**
```typescript
// server/src/db/supabase.ts
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
```

### **Building Table Columns Used:**
- `id`, `buildingType`, `tier`
- `x`, `y`, `zone`, `rotation`
- `ownerId`, `clanId`
- `health`, `maxHealth`, `armor`
- `isDestroyed`, `isDecaying`, `isActive`
- `data` (JSONB for building-specific data)
- `decayAt`, `createdAt`, `updatedAt`

---

## 🚀 Performance Optimizations

### **1. In-Memory Caching**
```typescript
private buildingCache: Map<number, any> = new Map();
private zoneBuildingIndex: Map<number, Set<number>> = new Map();
```

### **2. Zone-Based Spatial Indexing**
- World divided into 10x10 grid (100 zones)
- Buildings indexed by zone
- Collision detection only checks adjacent zones

### **3. Build Queue (Bull + Redis)**
- Async construction processing
- Non-blocking build completion
- Survives server restarts

### **4. Cooldown System**
```typescript
private buildCooldowns: Map<number, number> = new Map();
// 1 second cooldown prevents spam
```

---

## 🔥 Advanced Features

### **Territory Integration**
```typescript
// Tier 3+ buildings require territory ownership
if (buildingConfig.tier >= 3) {
  const territory = await this.game.territorySystem.getTerritoryAt(x, y);
  if (territory.ownerId !== playerId && territory.clanId !== player.clanId) {
    return { error: 'Cannot build in enemy territory' };
  }
}
```

### **Clan Integration**
- Buildings can be clan-owned
- Clan members can repair clan buildings
- Spawn beacons provide clan respawn points

### **Loot Drops**
```typescript
// Building destruction drops 50% resources
const drops = {
  wood: Math.floor(cost.wood * 0.5),
  stone: Math.floor(cost.stone * 0.5),
  metal: Math.floor(cost.metal * 0.5)
};
await this.game.createLootDrop(x, y, drops);
```

---

## 📡 Real-Time Broadcasting

### **Events Broadcast to Zone:**
1. `buildingPlaced` - New building placed (with construction timer)
2. `buildingCompleted` - Construction finished
3. `buildingDamaged` - Building took damage
4. `buildingDestroyed` - Building destroyed (with destroyer ID)
5. `buildingRepaired` - Building repaired
6. `buildingUpgraded` - Building tier increased
7. `turretFire` - Turret fired at enemy
8. `resourceGenerated` - Resources generated (to owner only)

---

## 🧪 Usage Example

```typescript
import { BuildingSystem } from './game/systems/BuildingSystem';

// Initialize
const buildingSystem = new BuildingSystem(game);

// Place a wall
const result = await buildingSystem.placeBuilding(
  playerId: 123,
  'STONE_WALL',
  x: 25000,
  y: 25000,
  rotation: 0
);

if (result.success) {
  console.log('Building placed!', result.buildingId);
} else {
  console.log('Failed:', result.error);
}

// Damage it
await buildingSystem.damageBuilding(result.buildingId, 100, attackerId);

// Repair it
await buildingSystem.repairBuilding(playerId, result.buildingId);

// Upgrade it
await buildingSystem.upgradeBuilding(playerId, result.buildingId);
```

---

## 🛡️ Security Features

1. **Resource Validation** - Checks before deducting, refunds on failure
2. **Ownership Checks** - Can only modify own buildings (or clan buildings for repair)
3. **Cooldown Prevention** - 1 second cooldown prevents spam
4. **Distance Validation** - Can only build within 500 units
5. **Collision Detection** - Prevents overlapping structures
6. **Building Limits** - Max 100 + (level * 10) buildings per player
7. **Territory Permissions** - Advanced buildings require territory control
8. **Transaction Safety** - Database rollback on failures

---

## 📈 Scalability

### **Load on Startup:**
```typescript
await buildingSystem.loadAllBuildings();
// Loads all buildings from database
// Rebuilds zone indexes
// Reactivates turrets and generators
```

### **Efficient Queries:**
- Uses zone-based indexing for fast spatial lookups
- Caches buildings in memory
- Only queries adjacent zones for collision detection

### **Background Processing:**
- Build queue processes asynchronously
- Decay system runs every 60 seconds
- Turrets fire on intervals (configurable per type)
- Resource generation on intervals (configurable per type)

---

## 🔗 Integration Points

### **Required Game Methods:**
```typescript
interface Game {
  getPlayer(playerId: number): Promise<Player>;
  broadcastToZone(zone: number, data: any): void;
  sendToPlayer(playerId: number, data: any): void;
  createLootDrop(x: number, y: number, resources: any): Promise<void>;
  getPlayersInRadius(x: number, y: number, radius: number, excludeOwner: number, excludeClan: number): Promise<Player[]>;
  dealDamage(targetId: number, damage: number, attackerId: number, weaponType: string): Promise<void>;
  territorySystem?: {
    getTerritoryAt(x: number, y: number): Promise<Territory | null>;
  };
}
```

---

## 🔧 Configuration

### **Environment Variables:**
```env
REDIS_URL=redis://localhost:6379
SUPABASE_URL=https://rplglfwwyavfkpvczkkj.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
```

---

## ✅ Complete Feature List

- [x] 13 building types with unique abilities
- [x] 9-step placement validation
- [x] Construction queue system
- [x] Damage and destruction
- [x] Repair system (10% cost per 100 HP)
- [x] Upgrade system (tier 1-5, 2x cost)
- [x] Decay system (7 days + 24h intervals)
- [x] Auto-targeting turrets
- [x] Resource generation
- [x] Zone-based spatial indexing
- [x] Real-time broadcasting
- [x] Territory integration
- [x] Clan support
- [x] Loot drops (50% refund)
- [x] Build cooldowns
- [x] Building limits
- [x] Collision detection
- [x] Distance validation
- [x] Persistent across restarts
- [x] Analytics logging

---

## 🎯 **SYSTEM STATUS: READY FOR ETERNAL WAR!** 🔥
