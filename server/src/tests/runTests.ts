#!/usr/bin/env tsx
import { runCompleteTests } from './fullTest';
import { supabase } from '../db/supabase';
import Redis from 'ioredis';

/**
 * Test Runner for DYSTOPIA: ETERNAL BATTLEGROUND
 *
 * This script initializes the test environment and runs the complete test suite
 */

interface GameMock {
  redis: Redis;
  buildingSystem: any;
  getZoneFromCoords: (x: number, y: number) => number;
  chatSystem?: any;
  territorySystem?: any;
  createPlayer?: (username: string, password: string) => Promise<any>;
  simulatePlayer?: (name: string) => Promise<any>;
  createTemporaryObject?: () => Promise<any>;
  destroyObject?: (obj: any) => Promise<void>;
  buildingCache?: Map<number, any>;
  loadPersistentWorld?: () => Promise<void>;
}

async function main() {
  console.log('🔥 DYSTOPIA: ETERNAL BATTLEGROUND - Test Runner 🔥\n');

  // Load environment
  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

  // Initialize Redis
  let redis: Redis;
  try {
    console.log('Connecting to Redis...');
    redis = new Redis(REDIS_URL);
    await redis.ping();
    console.log('✅ Redis connected\n');
  } catch (error) {
    console.warn('⚠️  Redis not available, some tests will be skipped');
    redis = null as any;
  }

  // Initialize Building System
  let buildingSystem;
  try {
    const { BuildingSystem } = await import('../game/systems/BuildingSystem');

    // Mock game instance with minimal required methods
    const mockGameForBuilding = {
      getPlayer: async (playerId: number) => null,
      broadcastToZone: (zone: number, data: any) => {},
      sendToPlayer: (playerId: number, data: any) => {},
      createLootDrop: async (x: number, y: number, resources: any) => {},
      getPlayersInRadius: async (x: number, y: number, radius: number, excludeOwner: number, excludeClan: number) => [],
      dealDamage: async (targetId: number, damage: number, attackerId: number, weaponType: string) => {},
      territorySystem: {
        getTerritoryAt: async (x: number, y: number) => null
      },
      redis
    };

    buildingSystem = new BuildingSystem(mockGameForBuilding as any);
    console.log('✅ Building system initialized\n');
  } catch (error) {
    console.error('❌ Failed to initialize building system:', error);
    buildingSystem = null;
  }

  // Create mock game object
  const game: GameMock = {
    redis,
    buildingSystem,

    // Zone calculation function
    getZoneFromCoords: (x: number, y: number): number => {
      // World is 50000x50000, divided into 10x10 grid (100 zones)
      const zoneSize = 5000;
      const zoneX = Math.floor(x / zoneSize);
      const zoneY = Math.floor(y / zoneSize);
      return zoneY * 10 + zoneX;
    },

    // Mock player creation (optional - will skip if not implemented)
    createPlayer: async (username: string, password: string) => {
      const { data, error } = await supabase
        .from('players')
        .insert({
          username,
          passwordHash: 'test_hash', // Don't store real passwords in tests
          x: 25000,
          y: 25000,
          health: 100,
          maxHealth: 100,
          level: 1,
          xp: 0,
          kills: 0,
          deaths: 0,
          isOnline: true,
          lastSeen: new Date().toISOString(),
          createdAt: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    // Mock building cache
    buildingCache: new Map(),

    // Mock persistence loader
    loadPersistentWorld: async () => {
      if (!buildingSystem) return;

      const { data: buildings } = await supabase
        .from('buildings')
        .select('*')
        .eq('isDestroyed', false);

      if (buildings) {
        buildings.forEach(building => {
          game.buildingCache?.set(building.id, building);
        });
      }
    }
  };

  // Run test suite
  try {
    const results = await runCompleteTests(game);

    // Cleanup
    if (redis) {
      await redis.quit();
    }

    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Fatal error running tests:', error);

    // Cleanup
    if (redis) {
      await redis.quit();
    }

    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

// Run tests
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
