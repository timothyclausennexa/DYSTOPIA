/**
 * DYSTOPIA ETERNAL - Unified Render Manager
 * Consolidates multiple RAF loops into a single coordinated loop
 * Prevents redundant rendering and improves performance
 */

export interface RenderableSystem {
    render(dt: number): void;
    enabled: boolean;
    updateInterval: number; // milliseconds
    nextUpdate: number; // timestamp
}

export interface SystemPerformanceStats {
    name: string;
    averageRenderTime: number;
    maxRenderTime: number;
    minRenderTime: number;
    renderCount: number;
    errorCount: number;
    lastError?: string;
}

export class RenderManager {
    private static instance: RenderManager | null = null;
    private systems: Map<string, RenderableSystem> = new Map();
    private rafId?: number;
    private lastTimestamp = 0;
    private running = false;

    // Performance monitoring
    private performanceStats: Map<string, SystemPerformanceStats> = new Map();
    private enablePerfMonitoring = false;

    // Error tracking
    private errorCounts: Map<string, number> = new Map();
    private maxErrorsBeforeDisable = 10;

    private constructor() {}

    public static getInstance(): RenderManager {
        if (!RenderManager.instance) {
            RenderManager.instance = new RenderManager();
        }
        return RenderManager.instance;
    }

    /**
     * Register a system for coordinated rendering
     */
    public register(name: string, system: RenderableSystem) {
        this.systems.set(name, system);
        system.nextUpdate = performance.now();

        // Initialize performance stats
        if (this.enablePerfMonitoring) {
            this.performanceStats.set(name, {
                name,
                averageRenderTime: 0,
                maxRenderTime: 0,
                minRenderTime: Infinity,
                renderCount: 0,
                errorCount: 0
            });
        }

        console.log(`[RenderManager] Registered system: ${name}`);

        // Start the loop if not running
        if (!this.running) {
            this.start();
        }
    }

    /**
     * Unregister a system
     */
    public unregister(name: string) {
        this.systems.delete(name);
        this.performanceStats.delete(name);
        this.errorCounts.delete(name);
        console.log(`[RenderManager] Unregistered system: ${name}`);

        // Stop the loop if no systems remain
        if (this.systems.size === 0 && this.running) {
            this.stop();
        }
    }

    /**
     * Start the unified render loop
     */
    private start() {
        if (this.running) return;

        this.running = true;
        this.lastTimestamp = performance.now();
        this.loop(this.lastTimestamp);
        console.log('[RenderManager] Render loop started');
    }

    /**
     * Stop the render loop
     */
    private stop() {
        if (!this.running) return;

        this.running = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = undefined;
        }
        console.log('[RenderManager] Render loop stopped');
    }

    /**
     * Main render loop - updates all registered systems
     */
    private loop = (timestamp: number) => {
        if (!this.running) return;

        const dt = timestamp - this.lastTimestamp;
        this.lastTimestamp = timestamp;

        // Update each system based on its update interval
        for (const [name, system] of this.systems.entries()) {
            if (!system.enabled) continue;

            // Check if it's time to update this system
            if (timestamp >= system.nextUpdate) {
                const startTime = this.enablePerfMonitoring ? performance.now() : 0;

                try {
                    system.render(dt);
                    system.nextUpdate = timestamp + system.updateInterval;

                    // Update performance stats
                    if (this.enablePerfMonitoring) {
                        this.updatePerformanceStats(name, performance.now() - startTime);
                    }
                } catch (error) {
                    this.handleSystemError(name, error);
                }
            }
        }

        this.rafId = requestAnimationFrame(this.loop);
    }

    /**
     * Handle system rendering errors
     */
    private handleSystemError(systemName: string, error: unknown) {
        const errorCount = (this.errorCounts.get(systemName) || 0) + 1;
        this.errorCounts.set(systemName, errorCount);

        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[RenderManager] Error rendering ${systemName} (${errorCount}/${this.maxErrorsBeforeDisable}):`, error);

        // Update performance stats with error
        if (this.enablePerfMonitoring) {
            const stats = this.performanceStats.get(systemName);
            if (stats) {
                stats.errorCount++;
                stats.lastError = errorMessage;
            }
        }

        // Disable system if too many errors
        if (errorCount >= this.maxErrorsBeforeDisable) {
            const system = this.systems.get(systemName);
            if (system) {
                system.enabled = false;
                console.error(`[RenderManager] Disabled ${systemName} due to excessive errors (${errorCount} errors)`);
            }
        }
    }

    /**
     * Update performance statistics for a system
     */
    private updatePerformanceStats(systemName: string, renderTime: number) {
        const stats = this.performanceStats.get(systemName);
        if (!stats) return;

        stats.renderCount++;
        stats.maxRenderTime = Math.max(stats.maxRenderTime, renderTime);
        stats.minRenderTime = Math.min(stats.minRenderTime, renderTime);

        // Calculate running average
        stats.averageRenderTime =
            (stats.averageRenderTime * (stats.renderCount - 1) + renderTime) / stats.renderCount;
    }

    /**
     * Cleanup - stop loop and clear all systems
     */
    public destroy() {
        this.stop();
        this.systems.clear();
        console.log('[RenderManager] Destroyed');
    }

    /**
     * Get statistics about registered systems
     */
    public getStats() {
        return {
            systemCount: this.systems.size,
            running: this.running,
            perfMonitoringEnabled: this.enablePerfMonitoring,
            systems: Array.from(this.systems.entries()).map(([name, sys]) => ({
                name,
                enabled: sys.enabled,
                updateInterval: sys.updateInterval,
                nextUpdate: sys.nextUpdate
            }))
        };
    }

    /**
     * Get performance statistics for all systems
     */
    public getPerformanceStats(): SystemPerformanceStats[] {
        return Array.from(this.performanceStats.values());
    }

    /**
     * Get performance statistics for a specific system
     */
    public getSystemPerformance(systemName: string): SystemPerformanceStats | undefined {
        return this.performanceStats.get(systemName);
    }

    /**
     * Enable or disable performance monitoring
     */
    public setPerformanceMonitoring(enabled: boolean) {
        this.enablePerfMonitoring = enabled;

        if (enabled) {
            // Initialize stats for existing systems
            for (const name of this.systems.keys()) {
                if (!this.performanceStats.has(name)) {
                    this.performanceStats.set(name, {
                        name,
                        averageRenderTime: 0,
                        maxRenderTime: 0,
                        minRenderTime: Infinity,
                        renderCount: 0,
                        errorCount: 0
                    });
                }
            }
            console.log('[RenderManager] Performance monitoring enabled');
        } else {
            console.log('[RenderManager] Performance monitoring disabled');
        }
    }

    /**
     * Reset performance statistics
     */
    public resetPerformanceStats() {
        for (const stats of this.performanceStats.values()) {
            stats.averageRenderTime = 0;
            stats.maxRenderTime = 0;
            stats.minRenderTime = Infinity;
            stats.renderCount = 0;
            stats.errorCount = 0;
            stats.lastError = undefined;
        }
        this.errorCounts.clear();
        console.log('[RenderManager] Performance stats reset');
    }

    /**
     * Print performance report to console
     */
    public printPerformanceReport() {
        if (!this.enablePerfMonitoring) {
            console.warn('[RenderManager] Performance monitoring is not enabled');
            return;
        }

        console.log('\n=== RENDER MANAGER PERFORMANCE REPORT ===');
        console.log(`Systems: ${this.systems.size} registered, ${Array.from(this.systems.values()).filter(s => s.enabled).length} enabled`);
        console.log(`Running: ${this.running}\n`);

        const stats = this.getPerformanceStats();
        if (stats.length === 0) {
            console.log('No performance data available');
            return;
        }

        // Sort by average render time
        stats.sort((a, b) => b.averageRenderTime - a.averageRenderTime);

        console.table(stats.map(s => ({
            System: s.name,
            'Avg (ms)': s.averageRenderTime.toFixed(3),
            'Max (ms)': s.maxRenderTime.toFixed(3),
            'Min (ms)': s.minRenderTime === Infinity ? 'N/A' : s.minRenderTime.toFixed(3),
            'Renders': s.renderCount,
            'Errors': s.errorCount,
            'Last Error': s.lastError || 'None'
        })));

        console.log('=========================================\n');
    }
}

// Export singleton instance
export const renderManager = RenderManager.getInstance();
