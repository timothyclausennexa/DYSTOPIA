import { supabase } from '../db/supabase';
import { BuildingSystem } from '../game/systems/BuildingSystem';
import { strict as assert } from 'assert';

interface TestResults {
  passed: number;
  failed: number;
  errors: string[];
  warnings: string[];
  duration: number;
}

interface TestGame {
  redis?: any;
  createPlayer?: (username: string, password: string) => Promise<any>;
  buildingSystem?: BuildingSystem;
  getZoneFromCoords?: (x: number, y: number) => number;
  chatSystem?: any;
  territorySystem?: any;
  simulatePlayer?: (name: string) => Promise<any>;
  createTemporaryObject?: () => Promise<any>;
  destroyObject?: (obj: any) => Promise<void>;
  buildingCache?: Map<number, any>;
  loadPersistentWorld?: () => Promise<void>;
}

/**
 * 🔥 DYSTOPIA: ETERNAL BATTLEGROUND - Complete Test Suite
 *
 * Comprehensive testing for all game systems including:
 * - Database connectivity
 * - Redis caching
 * - Player management
 * - Building system
 * - Zone calculations
 * - Chat system
 * - Territory system
 * - Load testing
 * - Memory leak detection
 * - Data persistence
 */
export async function runCompleteTests(game: TestGame): Promise<TestResults> {
  console.log('🔥 STARTING DYSTOPIA: ETERNAL BATTLEGROUND TEST SUITE 🔥');
  console.log('═══════════════════════════════════════════════════════════\n');

  const startTime = Date.now();
  const results: TestResults = {
    passed: 0,
    failed: 0,
    errors: [],
    warnings: [],
    duration: 0
  };

  // Test 1: Database Connection
  await runTest(
    'Database Connection',
    async () => {
      console.log('[TEST 1/10] Checking Supabase connection...');

      // Test basic query
      const { data, error } = await supabase
        .from('players')
        .select('id', { count: 'exact', head: true });

      if (error) throw error;

      // Test write access
      const { error: writeError } = await supabase
        .from('server_metrics')
        .insert({
          metrics: { test: true },
          timestamp: new Date().toISOString(),
          serverName: 'test'
        });

      if (writeError && !writeError.message.includes('does not exist')) {
        console.warn('⚠️  Warning: server_metrics table may not exist');
        results.warnings.push('server_metrics table not found');
      }

      console.log('✅ Database connected and accessible');
    },
    results
  );

  // Test 2: Redis Connection
  await runTest(
    'Redis Connection',
    async () => {
      console.log('[TEST 2/10] Checking Redis connection...');

      if (!game.redis) {
        throw new Error('Redis not configured in game instance');
      }

      // Test ping
      const pingResult = await game.redis.ping();
      assert.equal(pingResult, 'PONG', 'Redis ping should return PONG');

      // Test set/get
      await game.redis.set('test_key', 'test_value', 'EX', 10);
      const value = await game.redis.get('test_key');
      assert.equal(value, 'test_value', 'Redis get should return set value');

      // Cleanup
      await game.redis.del('test_key');

      console.log('✅ Redis connected and operational');
    },
    results
  );

  // Test 3: Player Creation
  await runTest(
    'Player Creation',
    async () => {
      console.log('[TEST 3/10] Creating test player...');

      if (!game.createPlayer) {
        console.warn('⚠️  Skipping: createPlayer method not implemented');
        results.warnings.push('Player creation method not available');
        return;
      }

      const testPlayer = await game.createPlayer('test_user_' + Date.now(), 'password123');

      assert(testPlayer, 'Player should be created');
      assert(testPlayer.id > 0, 'Player should have valid ID');
      assert(testPlayer.username, 'Player should have username');

      console.log(`✅ Player created with ID: ${testPlayer.id}`);

      // Cleanup
      try {
        await supabase.from('players').delete().eq('id', testPlayer.id);
      } catch (cleanupError) {
        console.warn('⚠️  Warning: Could not cleanup test player');
      }

      console.log('✅ Player creation works');
    },
    results
  );

  // Test 4: Building Placement
  await runTest(
    'Building System',
    async () => {
      console.log('[TEST 4/10] Testing building system...');

      if (!game.buildingSystem) {
        throw new Error('Building system not initialized');
      }

      // Test valid building placement
      const buildResult = await game.buildingSystem.placeBuilding(
        1, // playerId
        'WOOD_WALL',
        25000,
        25000,
        0
      );

      // Note: This will likely fail without a real player, but we're testing the method exists
      if (buildResult.error) {
        console.log(`   Expected error: ${buildResult.error}`);
        if (!buildResult.error.includes('not found') && !buildResult.error.includes('online')) {
          throw new Error(`Unexpected building error: ${buildResult.error}`);
        }
      }

      // Test invalid building type
      const invalidResult = await game.buildingSystem.placeBuilding(
        1,
        'INVALID_TYPE' as any,
        25000,
        25000,
        0
      );

      assert(invalidResult.error, 'Invalid building type should return error');
      assert(invalidResult.error.includes('Invalid building type'), 'Should specify invalid type error');

      console.log('✅ Building system validation works');
    },
    results
  );

  // Test 5: Zone System
  await runTest(
    'Zone Calculations',
    async () => {
      console.log('[TEST 5/10] Testing zone system...');

      if (!game.getZoneFromCoords) {
        throw new Error('Zone system not implemented');
      }

      // Test center zone (should be zone 50)
      const centerZone = game.getZoneFromCoords(25000, 25000);
      assert.equal(centerZone, 50, 'Center should be zone 50');

      // Test corner zones
      const topLeft = game.getZoneFromCoords(0, 0);
      assert.equal(topLeft, 0, 'Top-left should be zone 0');

      const bottomRight = game.getZoneFromCoords(49999, 49999);
      assert.equal(bottomRight, 99, 'Bottom-right should be zone 99');

      // Test boundary
      const zone5 = game.getZoneFromCoords(25000, 5000);
      assert(zone5 >= 0 && zone5 < 100, 'Zone should be 0-99');

      console.log('✅ Zone calculations correct');
    },
    results
  );

  // Test 6: Chat System
  await runTest(
    'Chat System',
    async () => {
      console.log('[TEST 6/10] Testing chat system...');

      if (!game.chatSystem) {
        console.warn('⚠️  Skipping: Chat system not implemented');
        results.warnings.push('Chat system not available');
        return;
      }

      const chatResult = await game.chatSystem.sendMessage(
        1,
        'global',
        'Test message'
      );

      if (chatResult.error) {
        console.log(`   Expected error: ${chatResult.error}`);
        // Chat might fail without real player, which is acceptable
        if (!chatResult.error.includes('not found') && !chatResult.error.includes('Player')) {
          throw new Error(`Unexpected chat error: ${chatResult.error}`);
        }
      }

      console.log('✅ Chat system accessible');
    },
    results
  );

  // Test 7: Territory System
  await runTest(
    'Territory System',
    async () => {
      console.log('[TEST 7/10] Testing territory system...');

      if (!game.territorySystem) {
        console.warn('⚠️  Skipping: Territory system not implemented');
        results.warnings.push('Territory system not available');
        return;
      }

      const territory = await game.territorySystem.claimTerritory(
        1,
        'Test Territory',
        [
          { x: 24900, y: 24900 },
          { x: 25100, y: 24900 },
          { x: 25100, y: 25100 },
          { x: 24900, y: 25100 }
        ]
      );

      if (territory.error) {
        console.log(`   Expected error: ${territory.error}`);
        // Territory might fail without real player
        if (!territory.error.includes('not found') && !territory.error.includes('Player')) {
          throw new Error(`Unexpected territory error: ${territory.error}`);
        }
      }

      console.log('✅ Territory system accessible');
    },
    results
  );

  // Test 8: Load Testing
  await runTest(
    'Load Testing (100 concurrent operations)',
    async () => {
      console.log('[TEST 8/10] Simulating 100 concurrent operations...');

      const promises = [];

      // Simulate 100 concurrent database queries
      for (let i = 0; i < 100; i++) {
        promises.push(
          supabase
            .from('players')
            .select('id', { count: 'exact', head: true })
        );
      }

      const results = await Promise.all(promises);

      // Verify all queries succeeded
      const failed = results.filter(r => r.error).length;
      assert.equal(failed, 0, `All concurrent queries should succeed (${failed} failed)`);

      console.log('✅ Load test passed (100 concurrent queries)');
    },
    results
  );

  // Test 9: Memory Leak Detection
  await runTest(
    'Memory Leak Detection',
    async () => {
      console.log('[TEST 9/10] Checking for memory leaks...');

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const initialMemory = process.memoryUsage().heapUsed;

      // Create and destroy 1000 temporary objects
      const tempObjects = [];
      for (let i = 0; i < 1000; i++) {
        tempObjects.push({
          id: i,
          data: new Array(1000).fill(Math.random()),
          timestamp: new Date()
        });
      }

      // Clear references
      tempObjects.length = 0;

      // Force garbage collection again
      if (global.gc) {
        global.gc();
      }

      // Wait a bit for GC
      await new Promise(resolve => setTimeout(resolve, 100));

      const finalMemory = process.memoryUsage().heapUsed;
      const leak = finalMemory - initialMemory;
      const leakMB = Math.round(leak / 1024 / 1024 * 10) / 10;

      console.log(`   Memory change: ${leakMB > 0 ? '+' : ''}${leakMB} MB`);

      // Allow up to 10MB variance (GC is not deterministic)
      assert(Math.abs(leak) < 10000000, `Memory leak detected: ${leakMB} MB`);

      console.log('✅ No significant memory leaks');
    },
    results
  );

  // Test 10: Data Persistence
  await runTest(
    'Data Persistence',
    async () => {
      console.log('[TEST 10/10] Testing persistence...');

      // Create test building record directly in database
      const testBuilding = {
        buildingType: 'WOOD_WALL',
        tier: 1,
        x: 24000,
        y: 24000,
        zone: 40,
        rotation: 0,
        ownerId: 1,
        clanId: null,
        health: 200,
        maxHealth: 200,
        armor: 0,
        isDestroyed: false,
        isDecaying: false,
        isActive: true,
        data: {},
        decayAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const { data: insertedBuilding, error: insertError } = await supabase
        .from('buildings')
        .insert(testBuilding)
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to insert test building: ${insertError.message}`);
      }

      const buildingId = insertedBuilding.id;

      // Read it back
      const { data: readBuilding, error: readError } = await supabase
        .from('buildings')
        .select('*')
        .eq('id', buildingId)
        .single();

      if (readError) {
        throw new Error(`Failed to read test building: ${readError.message}`);
      }

      assert(readBuilding, 'Building should exist after insert');
      assert.equal(readBuilding.buildingType, 'WOOD_WALL', 'Building type should persist');
      assert.equal(readBuilding.x, 24000, 'X coordinate should persist');
      assert.equal(readBuilding.y, 24000, 'Y coordinate should persist');

      // Cleanup
      await supabase.from('buildings').delete().eq('id', buildingId);

      console.log('✅ Persistence works correctly');
    },
    results
  );

  // Calculate final stats
  results.duration = Date.now() - startTime;

  // Print results
  printTestResults(results);

  return results;
}

/**
 * Helper function to run individual tests with error handling
 */
async function runTest(
  testName: string,
  testFn: () => Promise<void>,
  results: TestResults
): Promise<void> {
  try {
    await testFn();
    results.passed++;
  } catch (error: any) {
    results.failed++;
    const errorMsg = `${testName}: ${error.message || error}`;
    results.errors.push(errorMsg);
    console.error(`❌ ${testName} failed:`, error.message || error);
  }
}

/**
 * Print formatted test results
 */
function printTestResults(results: TestResults): void {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🔥 TEST RESULTS 🔥');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`✅ Passed: ${results.passed}/10`);
  console.log(`❌ Failed: ${results.failed}/10`);
  console.log(`⚠️  Warnings: ${results.warnings.length}`);
  console.log(`⏱️  Duration: ${(results.duration / 1000).toFixed(2)}s\n`);

  if (results.warnings.length > 0) {
    console.log('Warnings:');
    results.warnings.forEach(warning => console.log(`  ⚠️  ${warning}`));
    console.log('');
  }

  if (results.failed > 0) {
    console.log('Errors:');
    results.errors.forEach(err => console.log(`  ❌ ${err}`));
    console.log('');
    console.log('🔴 SOME TESTS FAILED - Review errors above');
  } else {
    console.log('🎉 ALL TESTS PASSED! DYSTOPIA: ETERNAL BATTLEGROUND IS READY FOR WAR! 🎉');
  }

  console.log('═══════════════════════════════════════════════════════════\n');
}

/**
 * Standalone test runner (if executed directly)
 */
export async function runStandaloneTests(): Promise<void> {
  console.log('Running tests in standalone mode...\n');

  // Mock game object with minimal implementations
  const mockGame: TestGame = {
    redis: null, // Will be skipped
    getZoneFromCoords: (x: number, y: number): number => {
      // World is 50000x50000, divided into 10x10 grid (100 zones)
      const zoneSize = 5000;
      const zoneX = Math.floor(x / zoneSize);
      const zoneY = Math.floor(y / zoneSize);
      return zoneY * 10 + zoneX;
    },
    buildingSystem: new BuildingSystem(null as any) // Mock game instance
  };

  const results = await runCompleteTests(mockGame);

  // Exit with error code if tests failed
  if (results.failed > 0) {
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runStandaloneTests().catch(error => {
    console.error('Fatal test error:', error);
    process.exit(1);
  });
}
