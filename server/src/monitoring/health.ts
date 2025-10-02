import { supabase } from '../db/supabase';
import axios from 'axios';

interface HealthStatus {
  status: string;
  uptime: number;
  players: number;
  buildings: number;
  zones: Record<number, ZoneStatus>;
  database: boolean;
  redis: boolean;
  memory: NodeJS.MemoryUsage;
  timestamp: string;
}

interface ZoneStatus {
  players: number;
  buildings: number;
  load: number;
}

export class HealthMonitor {
  private game: any;
  private isHealthy = true;
  private lastCheck = Date.now();
  private healthCheckInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(game: any) {
    this.game = game;
  }

  async checkHealth(): Promise<HealthStatus> {
    const uptime = process.uptime();

    // Check database
    let dbHealthy = false;
    let playerCount = 0;
    let buildingCount = 0;

    try {
      const { count: players } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('isOnline', true);

      const { count: buildings } = await supabase
        .from('buildings')
        .select('*', { count: 'exact', head: true })
        .eq('isDestroyed', false);

      playerCount = players || 0;
      buildingCount = buildings || 0;
      dbHealthy = true;

      return {
        status: 'healthy',
        uptime,
        players: playerCount,
        buildings: buildingCount,
        zones: this.getZoneStatus(),
        database: dbHealthy,
        redis: await this.checkRedis(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[HEALTH] Health check failed:', error);

      // Alert admins
      await this.alertAdmins('Server health check failed!', error);

      return {
        status: 'unhealthy',
        uptime,
        players: 0,
        buildings: 0,
        zones: {},
        database: false,
        redis: false,
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      };
    }
  }

  async checkRedis(): Promise<boolean> {
    try {
      if (!this.game.redis) {
        return false;
      }
      await this.game.redis.ping();
      return true;
    } catch (error) {
      console.error('[HEALTH] Redis check failed:', error);
      return false;
    }
  }

  getZoneStatus(): Record<number, ZoneStatus> {
    const zones: Record<number, ZoneStatus> = {};

    try {
      for (let i = 0; i < 100; i++) {
        zones[i] = {
          players: this.game.getZonePlayerCount?.(i) || 0,
          buildings: this.game.getZoneBuildingCount?.(i) || 0,
          load: this.game.getZoneLoad?.(i) || 0
        };
      }
    } catch (error) {
      console.error('[HEALTH] Zone status check failed:', error);
    }

    return zones;
  }

  async alertAdmins(message: string, error?: any) {
    const alertMessage = `⚠️ **DYSTOPIA: ETERNAL BATTLEGROUND - ALERT** ⚠️\n\n${message}\n\nTime: ${new Date().toISOString()}\nServer: ${process.env.HOSTNAME || 'unknown'}\nEnvironment: ${process.env.NODE_ENV || 'development'}`;

    // Send Discord webhook
    if (process.env.DISCORD_WEBHOOK) {
      try {
        await axios.post(process.env.DISCORD_WEBHOOK, {
          content: alertMessage,
          embeds: error ? [{
            title: 'Error Details',
            description: `\`\`\`\n${error.message || JSON.stringify(error, null, 2)}\n\`\`\``,
            color: 16711680 // Red
          }] : []
        });
      } catch (webhookError) {
        console.error('[HEALTH] Failed to send Discord webhook:', webhookError);
      }
    }

    // Log to console
    console.error(`[ALERT] ${message}`, error);

    // Log to database
    try {
      await supabase
        .from('server_alerts')
        .insert({
          message,
          error: error ? JSON.stringify(error) : null,
          timestamp: new Date().toISOString(),
          serverName: process.env.HOSTNAME || 'unknown'
        });
    } catch (dbError) {
      console.error('[HEALTH] Failed to log alert to database:', dbError);
    }
  }

  startMonitoring() {
    console.log('[HEALTH] Starting health monitoring system...');

    // Health check every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      const health = await this.checkHealth();

      if (health.status === 'unhealthy') {
        await this.alertAdmins('Server is unhealthy!');
      }

      // Log critical conditions
      if (health.memory.heapUsed > 1.5 * 1024 * 1024 * 1024) { // 1.5GB
        console.warn('[HEALTH] High memory usage:', Math.round(health.memory.heapUsed / 1024 / 1024), 'MB');
      }

      if (!health.database) {
        console.error('[HEALTH] Database connection lost!');
        await this.alertAdmins('Database connection lost!');
      }

      if (!health.redis) {
        console.error('[HEALTH] Redis connection lost!');
        await this.alertAdmins('Redis connection lost!');
      }
    }, 30000);

    // Detailed metrics every 5 minutes
    this.metricsInterval = setInterval(() => this.logDetailedMetrics(), 300000);

    // Cleanup every hour
    this.cleanupInterval = setInterval(() => this.cleanup(), 3600000);

    console.log('[HEALTH] Health monitoring system started');
  }

  stopMonitoring() {
    console.log('[HEALTH] Stopping health monitoring system...');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    console.log('[HEALTH] Health monitoring system stopped');
  }

  async logDetailedMetrics() {
    try {
      const metrics = await this.checkHealth();

      console.log('[METRICS] Server metrics:', {
        status: metrics.status,
        uptime: Math.round(metrics.uptime / 60) + 'm',
        players: metrics.players,
        buildings: metrics.buildings,
        memoryMB: Math.round(metrics.memory.heapUsed / 1024 / 1024),
        database: metrics.database,
        redis: metrics.redis
      });

      // Log to database
      await supabase
        .from('server_metrics')
        .insert({
          metrics,
          timestamp: new Date().toISOString(),
          serverName: process.env.HOSTNAME || 'unknown'
        });
    } catch (error) {
      console.error('[METRICS] Failed to log detailed metrics:', error);
    }
  }

  async cleanup() {
    console.log('[CLEANUP] Starting scheduled cleanup...');

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
      // Clean up old chat messages (older than 7 days)
      const { count: chatDeleted } = await supabase
        .from('chat_messages')
        .delete({ count: 'exact' })
        .lt('createdAt', oneWeekAgo.toISOString());

      console.log(`[CLEANUP] Deleted ${chatDeleted || 0} old chat messages`);

      // Clean up destroyed buildings (older than 7 days)
      const { count: buildingsDeleted } = await supabase
        .from('buildings')
        .delete({ count: 'exact' })
        .eq('isDestroyed', true)
        .lt('updatedAt', oneWeekAgo.toISOString());

      console.log(`[CLEANUP] Deleted ${buildingsDeleted || 0} destroyed buildings`);

      // Clean up abandoned vehicles (older than 7 days)
      const { count: vehiclesDeleted } = await supabase
        .from('vehicles')
        .delete({ count: 'exact' })
        .eq('isAbandoned', true)
        .lt('lastUsed', oneWeekAgo.toISOString());

      console.log(`[CLEANUP] Deleted ${vehiclesDeleted || 0} abandoned vehicles`);

      // Clean up offline players (older than 1 day)
      const { count: playersUpdated } = await supabase
        .from('players')
        .update({ isOnline: false }, { count: 'exact' })
        .eq('isOnline', true)
        .lt('lastSeen', oneDayAgo.toISOString());

      console.log(`[CLEANUP] Marked ${playersUpdated || 0} players as offline`);

      // Clean up old world events (older than 7 days)
      const { count: eventsDeleted } = await supabase
        .from('world_events')
        .delete({ count: 'exact' })
        .lt('createdAt', oneWeekAgo.toISOString());

      console.log(`[CLEANUP] Deleted ${eventsDeleted || 0} old world events`);

      console.log('[CLEANUP] Completed scheduled cleanup');
    } catch (error) {
      console.error('[CLEANUP] Cleanup failed:', error);
      await this.alertAdmins('Scheduled cleanup failed', error);
    }
  }

  async getHealthReport(): Promise<string> {
    const health = await this.checkHealth();

    const report = `
🔥 DYSTOPIA: ETERNAL BATTLEGROUND - Health Report 🔥

Status: ${health.status === 'healthy' ? '✅ HEALTHY' : '❌ UNHEALTHY'}
Uptime: ${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m
Timestamp: ${health.timestamp}

📊 Game Stats:
  Players Online: ${health.players}
  Active Buildings: ${health.buildings}
  Active Zones: ${Object.values(health.zones).filter(z => z.players > 0).length}/100

🔌 Services:
  Database: ${health.database ? '✅' : '❌'}
  Redis: ${health.redis ? '✅' : '❌'}

💾 Memory Usage:
  Heap Used: ${Math.round(health.memory.heapUsed / 1024 / 1024)} MB
  Heap Total: ${Math.round(health.memory.heapTotal / 1024 / 1024)} MB
  RSS: ${Math.round(health.memory.rss / 1024 / 1024)} MB
  External: ${Math.round(health.memory.external / 1024 / 1024)} MB

⚔️  The eternal war continues...
`;

    return report;
  }
}
