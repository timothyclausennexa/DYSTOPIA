# 🔥 DYSTOPIA: PERSISTENT WORLD IMPLEMENTATION PLAN

## Current Status
✅ Home screen updated with faction selector and "DEPLOY NOW" button
✅ Removed Solo/Duo/Squad modes
✅ UI shows "The world never resets. Your faction never sleeps."

---

## PHASE 1: Frontend Changes (Ready to implement)

### 1. Wire Up Deploy Now Button
**File:** `client/src/main.ts`
- Replace `btn-start-mode-0/1/2` event listeners with `btn-deploy-now`
- Store selected faction in player data
- Send faction info to server on connection

### 2. Faction System UI
**File:** `client/src/ui/ui.ts`
- Add faction indicator in HUD (top-right corner)
- Show faction color on player nameplate
- Display faction members on minimap with friendly indicators

---

## PHASE 2: Backend - Faction System

### 1. Database Schema Addition
**File:** `server/src/api/db/schema.ts`
```typescript
export const factions = pgTable('factions', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull(),
  playerCount: integer('player_count').default(0),
  createdAt: timestamp('created_at').defaultNow()
});

// Add to players table
faction: text('faction'), // 'red', 'blue', 'green', 'yellow', 'purple'
```

### 2. No Friendly Fire Logic
**File:** `server/src/game/game.ts`
- Modify damage calculation to check faction
- If attacker.faction === victim.faction, skip damage
- Add visual feedback for friendly fire attempts

---

## PHASE 3: Persistent World

### 1. Remove Game Reset Logic
**Files:**
- `server/src/game/game.ts` - Remove match end conditions
- `server/src/game/playerBarn.ts` - Players respawn in same world

### 2. Continuous Gameplay
- No win conditions
- No match timer
- World persists 24/7
- Players can leave and rejoin anytime

### 3. Rejoin Functionality
**File:** `server/src/game/playerBarn.ts`
```typescript
// Store player position in database on disconnect
// On reconnect, spawn at last position (if safe) or faction base
```

---

## PHASE 4: Bot Mode

### 1. AI Player System
**File:** `server/src/game/ai/botPlayer.ts` (NEW)
```typescript
class BotPlayer {
  - Random movement patterns
  - Basic combat AI (shoot at enemies)
  - Loot collection behavior
  - Avoid buildings/obstacles
  - Respect faction allegiance
}
```

### 2. Bot Spawning
**File:** `server/src/game/game.ts`
- Spawn bots when player count < target (e.g., 50 players)
- Remove bots when real players join
- Bots join factions to balance teams

---

## PHASE 5: Seamless World

### 1. Remove Match Barriers
**File:** `server/src/game/game.ts`
- All players join THE SAME persistent world
- No separate game instances
- Single shared map state

### 2. Persistent Buildings & Territory
**File:** `server/src/game/systems/buildingSystem.ts`
- Buildings persist across sessions
- Load buildings from database on server start
- Save building state continuously

---

## PHASE 6: In-Game UI Updates

### 1. Remove Match HUD Elements
**File:** `client/src/ui/ui.ts`
- Remove "Match Time" display
- Remove "Players Alive" counter
- Add "World Status" panel showing:
  - Total players online
  - Faction territories controlled
  - Your faction members online

### 2. Death Screen Changes
**File:** `client/src/ui/ui.ts`
- No "Back to Menu" button
- Only "RESPAWN" button
- Respawn in faction territory
- Show death stats (killer, faction, etc.)

---

## Implementation Order

1. ✅ **UI Update** - Deploy Now button (DONE)
2. **Wire Button** - Connect Deploy Now to game start
3. **Faction DB** - Add faction tables
4. **Faction Logic** - No friendly fire
5. **Persistent World** - Remove resets
6. **Bot System** - AI players
7. **Rejoin** - Save/load position
8. **In-Game UI** - Update HUD

---

## Quick Implementation Script

### Step 1: Wire Deploy Now Button
```javascript
// In client/src/main.ts, replace:
$("#btn-start-mode-0").click(() => this.tryQuickPlay(0));

// With:
$("#btn-deploy-now").click(() => {
  const faction = $("#faction-select").val();
  if (!faction) {
    alert("Please select a faction!");
    return;
  }
  this.tryQuickPlay(0, { faction });
});
```

### Step 2: Add Faction to Player
```typescript
// In server/src/game/player.ts
export class Player {
  faction: string; // 'red', 'blue', 'green', 'yellow', 'purple'

  // In damage calculation:
  if (attacker.faction === this.faction) {
    return; // No friendly fire
  }
}
```

### Step 3: Make World Persistent
```typescript
// In server/src/game/game.ts
// REMOVE:
checkGameEnd() { /* ... */ }
resetMatch() { /* ... */ }

// KEEP:
- Continuous tick loop
- Player spawn/respawn
- Building persistence
```

---

## Testing Checklist

- [ ] Click "Deploy Now" with no faction → Shows error
- [ ] Click "Deploy Now" with faction → Joins game
- [ ] Faction shown in HUD
- [ ] No damage to faction members
- [ ] World persists after server restart
- [ ] Player can rejoin same world
- [ ] Bots spawn when needed
- [ ] Death → Respawn (no menu)

---

## Files to Modify

### Client
1. `client/src/main.ts` - Deploy Now button logic
2. `client/src/ui/ui.ts` - HUD updates, respawn logic
3. `client/src/game/player.ts` - Store faction

### Server
1. `server/src/game/player.ts` - Faction field, friendly fire check
2. `server/src/game/game.ts` - Remove match end, persistent world
3. `server/src/game/playerBarn.ts` - Rejoin logic
4. `server/src/api/db/schema.ts` - Faction tables
5. `server/src/game/ai/botPlayer.ts` - NEW: Bot AI

---

## Next Steps

Run this to start implementation:

```bash
# 1. Wire up Deploy Now button
# Edit: client/src/main.ts

# 2. Add faction to database
cd server && pnpm db:push

# 3. Test in browser
# Should see faction selector working
```

🔥 **THE ETERNAL BATTLEGROUND AWAITS** 🔥
