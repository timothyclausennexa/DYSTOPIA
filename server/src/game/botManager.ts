/**
 * DYSTOPIA ETERNAL - Bot Manager (Practice Mode)
 * Manages AI bots for practice mode
 * Bots do NOT interact with persistent world (no database writes)
 */

import type { Game } from "./game";
import type { Player } from "./objects/player";
import { v2, type Vec2 } from "../../../shared/utils/v2";
import { math } from "../../../shared/utils/math";
import { util } from "../../../shared/utils/util";
import * as net from "../../../shared/net/net";
import { GameConfig } from "../../../shared/gameConfig";

interface BotConfig {
    difficulty: 'easy' | 'medium' | 'hard';
    count: number;
    enabled: boolean;
}

interface BotBehavior {
    target: Player | null;
    targetPos: Vec2;
    wanderPos: Vec2;
    state: 'idle' | 'wander' | 'chase' | 'attack' | 'flee';
    stateTimer: number;
    shootCooldown: number;
    reactionTime: number;
}

export class BotManager {
    private game: Game;
    private bots: Map<number, BotBehavior> = new Map();
    private config: BotConfig = {
        difficulty: 'medium',
        count: 0,
        enabled: false
    };

    // Difficulty settings
    private difficultySettings = {
        easy: {
            viewDistance: 30,
            shootAccuracy: 0.3,
            reactionTime: 1500,
            shootInterval: 800,
            moveSpeed: 0.7,
            healthMultiplier: 0.8
        },
        medium: {
            viewDistance: 50,
            shootAccuracy: 0.6,
            reactionTime: 800,
            shootInterval: 500,
            moveSpeed: 1.0,
            healthMultiplier: 1.0
        },
        hard: {
            viewDistance: 70,
            shootAccuracy: 0.85,
            reactionTime: 300,
            shootInterval: 300,
            moveSpeed: 1.2,
            healthMultiplier: 1.2
        }
    };

    private botNames = [
        'Bot_Alpha', 'Bot_Beta', 'Bot_Gamma', 'Bot_Delta',
        'Bot_Epsilon', 'Bot_Zeta', 'Bot_Eta', 'Bot_Theta',
        'Bot_Iota', 'Bot_Kappa', 'Bot_Lambda', 'Bot_Mu',
        'Bot_Nu', 'Bot_Xi', 'Bot_Omicron', 'Bot_Pi',
        'Bot_Rho', 'Bot_Sigma', 'Bot_Tau', 'Bot_Upsilon'
    ];

    constructor(game: Game) {
        this.game = game;
    }

    /**
     * Enable practice mode with bots
     */
    public enablePracticeMode(count: number, difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
        this.config.enabled = true;
        this.config.difficulty = difficulty;
        this.config.count = Math.min(count, 20); // Max 20 bots

        console.log(`[DYSTOPIA] Practice mode enabled: ${this.config.count} bots (${difficulty})`);

        // Spawn initial bots
        this.spawnBots(this.config.count);
    }

    /**
     * Disable practice mode and remove all bots
     */
    public disablePracticeMode() {
        this.config.enabled = false;

        // Remove all bots
        for (const [playerId, _] of this.bots) {
            const player = this.game.playerBarn.players.find(p => p.__id === playerId);
            if (player && player.isBot) {
                this.removeBot(player);
            }
        }

        this.bots.clear();
        console.log('[DYSTOPIA] Practice mode disabled');
    }

    /**
     * Spawn bots into the game
     */
    private spawnBots(count: number) {
        for (let i = 0; i < count; i++) {
            this.spawnBot();
        }
    }

    /**
     * Spawn a single bot
     */
    private spawnBot() {
        // Create a fake socket ID for the bot
        const botSocketId = `bot_${util.randomInt(100000, 999999)}`;

        // Create a fake join message
        const joinMsg = new net.JoinMsg();
        joinMsg.protocol = GameConfig.protocolVersion; // MUST set protocol version or addPlayer rejects with invalid protocol
        joinMsg.name = this.getRandomBotName();
        joinMsg.isMobile = false;
        joinMsg.useTouch = false;

        // Create a temporary join token for the bot
        const botToken = util.randomInt(1000000, 9999999).toString();
        this.game.joinTokens.set(botToken, {
            expiresAt: Date.now() + 10000,
            userId: null,
            findGameIp: '127.0.0.1',
            groupData: {
                autoFill: false,
                playerCount: 1,
                groupHashToJoin: ''
            }
        });

        joinMsg.matchPriv = botToken;

        console.log(`[DYSTOPIA] Attempting to spawn bot: ${joinMsg.name} with socketId ${botSocketId}, token: ${botToken}, tokens count: ${this.game.joinTokens.size}`);

        // Add the bot player
        this.game.playerBarn.addPlayer(botSocketId, joinMsg, '127.0.0.1');

        // Find the newly created player
        const botPlayer = this.game.playerBarn.socketIdToPlayer.get(botSocketId);

        if (botPlayer) {
            // Mark as bot
            botPlayer.isBot = true;

            // Initialize bot behavior
            const spawnPos = this.getRandomSpawnPosition();
            this.bots.set(botPlayer.__id, {
                target: null,
                targetPos: spawnPos,
                wanderPos: spawnPos,
                state: 'wander',
                stateTimer: 0,
                shootCooldown: 0,
                reactionTime: this.difficultySettings[this.config.difficulty].reactionTime
            });

            console.log(`[DYSTOPIA] Bot spawned: ${joinMsg.name} (ID: ${botPlayer.__id})`);
        } else {
            console.error(`[DYSTOPIA] FAILED to spawn bot ${joinMsg.name} - botPlayer is null!`);
        }
    }

    /**
     * Update all bots (called every tick)
     */
    public update(dt: number) {
        if (!this.config.enabled) return;

        // Update each bot's behavior
        for (const [playerId, behavior] of this.bots) {
            const bot = this.game.playerBarn.players.find(p => p.__id === playerId);
            if (!bot || bot.dead || !bot.isBot) {
                this.bots.delete(playerId);
                continue;
            }

            this.updateBot(bot, behavior, dt);
        }

        // Respawn bots if needed
        const aliveBots = Array.from(this.bots.keys()).filter(
            (playerId) => {
                const bot = this.game.playerBarn.players.find(p => p.__id === playerId);
                return bot && !bot.dead;
            }
        );

        if (aliveBots.length < this.config.count) {
            const toSpawn = this.config.count - aliveBots.length;
            for (let i = 0; i < toSpawn; i++) {
                this.spawnBot();
            }
        }
    }

    /**
     * Update a single bot's behavior
     */
    private updateBot(bot: Player, behavior: BotBehavior, dt: number) {
        const settings = this.difficultySettings[this.config.difficulty];

        // Update state timer
        behavior.stateTimer -= dt;
        behavior.shootCooldown -= dt;

        // Try to pick up loot if bot has weak weapons
        this.tryPickupLoot(bot);

        // Try to use healing/boost items when appropriate
        this.tryUseHealingItems(bot);

        // Manage ammo and reloading
        this.manageAmmo(bot);

        // Find nearest enemy player
        const nearestEnemy = this.findNearestEnemy(bot, settings.viewDistance);

        // Reset shooting flags when not attacking
        if (behavior.state !== 'attack') {
            bot.shootStart = false;
            bot.shootHold = false;
        }

        // Reset movement when not moving
        if (behavior.state === 'idle') {
            bot.moveUp = false;
            bot.moveDown = false;
            bot.moveLeft = false;
            bot.moveRight = false;
        }

        // State machine
        switch (behavior.state) {
            case 'idle':
                if (behavior.stateTimer <= 0) {
                    behavior.state = 'wander';
                    behavior.wanderPos = this.getRandomNearbyPosition(bot.pos, 20);
                    behavior.stateTimer = util.random(2000, 5000);
                }
                break;

            case 'wander':
                if (nearestEnemy) {
                    behavior.state = 'chase';
                    behavior.target = nearestEnemy;
                    behavior.stateTimer = 5000;
                } else {
                    this.moveTowards(bot, behavior.wanderPos, settings.moveSpeed);

                    if (v2.distance(bot.pos, behavior.wanderPos) < 2) {
                        behavior.state = 'idle';
                        behavior.stateTimer = util.random(1000, 3000);
                    }
                }
                break;

            case 'chase':
                if (!nearestEnemy || behavior.stateTimer <= 0) {
                    behavior.state = 'wander';
                    behavior.target = null;
                    behavior.wanderPos = this.getRandomNearbyPosition(bot.pos, 20);
                } else {
                    behavior.target = nearestEnemy;
                    const distance = v2.distance(bot.pos, nearestEnemy.pos);

                    if (distance < 15) {
                        behavior.state = 'attack';
                        behavior.stateTimer = 3000;
                    } else {
                        this.moveTowards(bot, nearestEnemy.pos, settings.moveSpeed);
                    }
                }
                break;

            case 'attack':
                if (!nearestEnemy || behavior.stateTimer <= 0) {
                    behavior.state = 'wander';
                    behavior.target = null;
                } else {
                    behavior.target = nearestEnemy;
                    const distance = v2.distance(bot.pos, nearestEnemy.pos);

                    // Check if weapon has ammo before engaging
                    const currentWeapon = bot.weapons[bot.curWeapIdx];
                    const hasAmmo = currentWeapon.ammo > 0;

                    // Maintain optimal distance based on weapon and health
                    const optimalDist = bot.health < bot.boost.maxHealth * 0.5 ? 15 : 10;

                    if (distance < optimalDist - 2 && hasAmmo) {
                        // Too close - back up while shooting
                        const awayDir = v2.normalize(v2.sub(bot.pos, nearestEnemy.pos));
                        const backupPos = v2.add(bot.pos, v2.mul(awayDir, 5));
                        this.moveTowards(bot, backupPos, settings.moveSpeed * 0.7);
                    } else if (distance > optimalDist + 2) {
                        // Too far - close in
                        this.moveTowards(bot, nearestEnemy.pos, settings.moveSpeed * 0.8);
                    } else {
                        // Good distance - strafe
                        const strafePos = this.getStrafePosition(bot.pos, nearestEnemy.pos, optimalDist);
                        this.moveTowards(bot, strafePos, settings.moveSpeed * 0.5);
                    }

                    // Aim at target
                    const dirToTarget = v2.normalize(v2.sub(nearestEnemy.pos, bot.pos));
                    bot.dir = dirToTarget;

                    // Shoot if we have ammo
                    if (hasAmmo && behavior.shootCooldown <= 0) {
                        this.shootAtTarget(bot, nearestEnemy, settings.shootAccuracy);
                        behavior.shootCooldown = settings.shootInterval;
                    }

                    // Back to chase if too far
                    if (distance > 20) {
                        behavior.state = 'chase';
                        behavior.stateTimer = 5000;
                    }

                    // Flee if low health
                    if (bot.health < bot.boost.maxHealth * 0.3) {
                        behavior.state = 'flee';
                        behavior.stateTimer = 3000;
                    }
                }
                break;

            case 'flee':
                if (behavior.stateTimer <= 0 || bot.health > bot.boost.maxHealth * 0.6) {
                    behavior.state = 'wander';
                    behavior.wanderPos = this.getRandomNearbyPosition(bot.pos, 20);
                } else if (nearestEnemy) {
                    // Try to find cover position (perpendicular to enemy direction)
                    const coverPos = this.findCoverPosition(bot, nearestEnemy);
                    const fleePos = coverPos || v2.add(bot.pos, v2.mul(v2.normalize(v2.sub(bot.pos, nearestEnemy.pos)), 30));
                    this.moveTowards(bot, fleePos, settings.moveSpeed * 1.5);
                }
                break;
        }
    }

    /**
     * Find nearest enemy player within view distance
     * Prioritizes threats based on distance and health
     */
    private findNearestEnemy(bot: Player, viewDistance: number): Player | null {
        let bestTarget: Player | null = null;
        let bestScore = Infinity;

        for (const player of this.game.playerBarn.livingPlayers) {
            if (player === bot || player.dead || player.isBot) continue;

            const dist = v2.distance(bot.pos, player.pos);
            if (dist > viewDistance) continue;

            // Score based on distance and health (lower is better)
            // Prefer closer enemies and enemies with lower health
            const distScore = dist;
            const healthScore = player.health / player.boost.maxHealth * 20; // 0-20 bonus
            const threatScore = distScore - healthScore; // Closer + weaker = lower score

            if (threatScore < bestScore) {
                bestTarget = player;
                bestScore = threatScore;
            }
        }

        return bestTarget;
    }

    /**
     * Move bot towards a target position
     */
    private moveTowards(bot: Player, targetPos: Vec2, speedMultiplier: number = 1.0) {
        const dir = v2.normalize(v2.sub(targetPos, bot.pos));

        // Calculate movement inputs based on direction
        // The game uses moveUp/moveDown/moveLeft/moveRight flags
        bot.moveUp = dir.y > 0.1;
        bot.moveDown = dir.y < -0.1;
        bot.moveLeft = dir.x < -0.1;
        bot.moveRight = dir.x > 0.1;

        bot.actionDirty = true;
    }

    /**
     * Get a strafe position around a target
     */
    private getStrafePosition(botPos: Vec2, targetPos: Vec2, radius: number): Vec2 {
        const angle = Math.atan2(targetPos.y - botPos.y, targetPos.x - botPos.x);
        const strafeAngle = angle + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);

        return v2.create(
            botPos.x + Math.cos(strafeAngle) * radius,
            botPos.y + Math.sin(strafeAngle) * radius
        );
    }

    /**
     * Make bot shoot at target with accuracy
     */
    private shootAtTarget(bot: Player, target: Player, accuracy: number) {
        // Add inaccuracy based on difficulty
        const inaccuracy = (1 - accuracy) * 5;
        const aimPos = v2.create(
            target.pos.x + util.random(-inaccuracy, inaccuracy),
            target.pos.y + util.random(-inaccuracy, inaccuracy)
        );

        const dir = v2.normalize(v2.sub(aimPos, bot.pos));

        // Set aim direction (used by weaponManager)
        bot.dirNew = dir;
        bot.dir = dir;

        // Trigger shooting - shootStart is checked by weaponManager
        // for single-fire weapons, and shootHold for auto weapons
        bot.shootStart = true;
        bot.shootHold = true;

        bot.actionDirty = true;
    }

    /**
     * Get random spawn position on the map
     */
    private getRandomSpawnPosition(): Vec2 {
        // Use map width/height to get random spawn position
        const margin = 10; // Keep bots away from map edges
        return v2.create(
            util.random(margin, this.game.map.width - margin),
            util.random(margin, this.game.map.height - margin)
        );
    }

    /**
     * Get random position near a point
     */
    private getRandomNearbyPosition(pos: Vec2, radius: number): Vec2 {
        const angle = util.random(0, Math.PI * 2);
        const distance = util.random(5, radius);

        return v2.create(
            pos.x + Math.cos(angle) * distance,
            pos.y + Math.sin(angle) * distance
        );
    }

    /**
     * Get random bot name
     */
    private getRandomBotName(): string {
        return this.botNames[util.randomInt(0, this.botNames.length - 1)];
    }

    /**
     * Try to pick up nearby loot (weapons, ammo, gear)
     */
    private tryPickupLoot(bot: Player) {
        const loot = bot.getClosestLoot();
        if (loot) {
            // Prioritize picking up better weapons if bot has starter gear
            const currentPrimary = bot.weapons[0].type; // GameConfig.WeaponSlot.Primary = 0
            const currentSecondary = bot.weapons[1].type; // GameConfig.WeaponSlot.Secondary = 1

            // If bot has no weapons or starter weapons, pick up any gun
            if (!currentPrimary || !currentSecondary ||
                currentPrimary === '' || currentSecondary === '') {
                bot.interactWith(loot);
            }
            // Pick up ammo, gear, healing items
            else {
                bot.interactWith(loot);
            }
        }

        // Make sure bot has a gun equipped (not melee)
        // GameConfig.WeaponSlot: Melee = 2, Primary = 0, Secondary = 1
        if (bot.curWeapIdx === 2) { // Currently holding melee
            // Try to switch to primary weapon if available
            if (bot.weapons[0].type && bot.weapons[0].type !== '') {
                bot.weaponManager.setCurWeapIndex(0);
            }
            // Otherwise try secondary
            else if (bot.weapons[1].type && bot.weapons[1].type !== '') {
                bot.weaponManager.setCurWeapIndex(1);
            }
        }
    }

    /**
     * Try to use healing items when health is low
     */
    private tryUseHealingItems(bot: Player) {
        // Don't use items while in action or downed
        if (bot.actionType !== 0 || bot.downed) return; // GameConfig.Action.None = 0

        const healthPercent = bot.health / bot.boost.maxHealth;

        // Use healing items based on health percentage
        if (healthPercent < 0.5) { // Below 50% health
            // Try to use best healing item available
            const healingItems = ['medkit', 'bandage', 'healthkit', 'pills'] as const;

            for (const item of healingItems) {
                if (bot.invManager.has(item)) {
                    bot.useHealingItem(item);
                    break;
                }
            }
        }

        // Use boost items when not at max boost
        if (bot.boost < 100 && healthPercent > 0.7) { // Only boost when relatively healthy
            const boostItems = ['soda', 'painkiller'] as const;

            for (const item of boostItems) {
                if (bot.invManager.has(item)) {
                    bot.useBoostItem(item);
                    break;
                }
            }
        }
    }

    /**
     * Check ammo and reload if needed
     */
    private manageAmmo(bot: Player) {
        const currentWeapon = bot.weapons[bot.curWeapIdx];

        // Only manage ammo for guns (not melee or throwables)
        if (bot.curWeapIdx === 2 || bot.curWeapIdx === 3) return;

        // Check if weapon needs reloading (low ammo)
        if (currentWeapon.ammo <= 3) {
            // Try to reload using weaponManager's tryReload method
            bot.weaponManager.tryReload();
        }

        // If weapon is empty and can't reload, try switching weapons
        if (currentWeapon.ammo === 0) {
            // Try switching to other gun slot
            const otherGunSlot = bot.curWeapIdx === 0 ? 1 : 0;
            const otherWeapon = bot.weapons[otherGunSlot];

            if (otherWeapon.type && otherWeapon.type !== '' && otherWeapon.ammo > 0) {
                bot.weaponManager.setCurWeapIndex(otherGunSlot);
            }
        }
    }

    /**
     * Find a cover position near obstacles away from enemy
     */
    private findCoverPosition(bot: Player, enemy: Player): Vec2 | null {
        // Direction away from enemy
        const awayDir = v2.normalize(v2.sub(bot.pos, enemy.pos));

        // Try positions perpendicular to enemy direction
        const perpDir1 = v2.create(-awayDir.y, awayDir.x);
        const perpDir2 = v2.create(awayDir.y, -awayDir.x);

        // Check a few potential cover positions
        const candidates = [
            v2.add(bot.pos, v2.mul(perpDir1, 10)),  // Left
            v2.add(bot.pos, v2.mul(perpDir2, 10)),  // Right
            v2.add(bot.pos, v2.mul(awayDir, 15))    // Back
        ];

        // Return the first valid position (simple heuristic)
        // In a more advanced system, we would check for actual obstacles
        // For now, just return a tactical position
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    /**
     * Remove a bot from the game
     */
    private removeBot(bot: Player) {
        this.bots.delete(bot.__id);

        // Disconnect bot socket
        if (bot.socketId) {
            this.game.closeSocket(bot.socketId);
        }
    }

    /**
     * Check if practice mode is enabled
     */
    public isPracticeModeEnabled(): boolean {
        return this.config.enabled;
    }

    /**
     * Get bot count
     */
    public getBotCount(): number {
        return this.bots.size;
    }
}
