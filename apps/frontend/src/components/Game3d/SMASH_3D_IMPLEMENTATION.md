# Smash Skill = 3D Pong - Implementation Summary

## What Was Changed

This modification makes the game automatically launch in **3D mode** when a player selects the **Smash skill**, and in **2D mode** when selecting **Dash**.

---

## Changes Made

### 1. **Frontend: WaitingRoomView.ts**
**File**: `apps/frontend/src/views/WaitingRoomView.ts`

**What changed**: When a match is ready, the routing now checks which skill was selected:
- **Smash** → Navigate to `/game3d/${roomId}` (3D Babylon.js version)
- **Dash** → Navigate to `/game/${roomId}` (2D Canvas version)

```typescript
// Before:
window.router.navigate(`/game/${roomId}`);

// After:
const gamePath = skill === 'smash' ? `/game3d/${roomId}` : `/game/${roomId}`;
window.router.navigate(gamePath);
```

**Why**: This ensures players see the correct game interface based on their skill choice.

---

### 2. **Backend: quickplay.ts**
**File**: `apps/quickplayback/quickplay.ts`

**What changed**: When creating a game record in the database, we now check if either player selected "smash" and set the `is_3d` flag:

```typescript
// Determine if this should be a 3D game (if either player selected smash)
const is3d = leftPlayer.selectedSkill === 'smash' || rightPlayer.selectedSkill === 'smash';

await callDatabase('/games', 'POST', {
    id: gameId,
    room_id: room.id,
    game_type: 'quickplay',
    is_3d: is3d,  // 👈 NEW
    player_left_id: room.players[0].id,
    player_right_id: room.players[1].id
});
```

**Why**: This marks the game in the database so we can:
- Separate 2D and 3D games in match history
- Show statistics separately (2D leaderboard vs 3D leaderboard)
- Filter by game mode in analytics

---

### 3. **Database API: games.ts**
**File**: `apps/database/src/routes/games.ts`

**What changed**: 
1. Added `is_3d?: boolean` to the `Game` interface
2. Updated the POST `/games` route to accept and save the `is_3d` parameter
3. Modified the SQL INSERT to include the `is_3d` column

```typescript
// Interface update
interface Game {
    // ...existing fields...
    is_3d?: boolean;  // 👈 NEW
    // ...other fields...
}

// POST route update
fastify.post<{ Body: {
    // ...existing fields...
    is_3d?: boolean;  // 👈 NEW
    // ...other fields...
}}>(/* ... */);

// SQL insert update
INSERT INTO games (
    id, room_id, game_type, is_3d, player_left_id, player_right_id,
    tournament_id, tournament_round, match_position, status
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'waiting')
```

**Why**: Allows the database to store which games were played in 3D vs 2D mode.

---

### 4. **Database Schema: schema.sql**
**File**: `apps/database/src/database/schema.sql`

**What changed**: Added `is_3d BOOLEAN DEFAULT 0` column to the `games` table.

```sql
CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL UNIQUE,
    game_type TEXT NOT NULL CHECK(game_type IN ('quickplay', 'tournament')),
    is_3d BOOLEAN DEFAULT 0,  -- 👈 NEW: 0 = 2D, 1 = 3D
    tournament_id TEXT,
    -- ...other columns...
);
```

**Why**: Stores the game mode in the database for historical tracking.

---

## How It Works (Flow Diagram)

```
Player selects skill in QuickPlay
         ↓
    ┌────────────┐
    │ Smash? 💪  │ → YES → Navigate to /game3d/{roomId}
    └────────────┘           ↓
         ↓ NO               3D Babylon.js Pong
    Navigate to /game/{roomId}
         ↓
    2D Canvas Pong
```

### Database Flow:
```
Game Creation
     ↓
Check: leftPlayer.skill === 'smash' OR rightPlayer.skill === 'smash'
     ↓
    YES → is_3d = true (1)
     ↓
    NO → is_3d = false (0)
     ↓
INSERT INTO games (..., is_3d, ...)
```

---

## Testing

### Test Case 1: Player selects Smash
1. Go to `/play` (QuickPlay view)
2. Click on **Smash** skill card
3. Click **Play Online**
4. Wait for opponent
5. **Expected**: Game launches in 3D (Babylon.js)
6. **Expected**: Database shows `is_3d = 1`

### Test Case 2: Player selects Dash
1. Go to `/play` (QuickPlay view)
2. Click on **Dash** skill card
3. Click **Play Online**
4. Wait for opponent
5. **Expected**: Game launches in 2D (Canvas)
6. **Expected**: Database shows `is_3d = 0`

### Test Case 3: Mixed skills
1. Player 1 selects **Smash**
2. Player 2 selects **Dash**
3. **Expected**: Game launches in 3D for both (since one player chose Smash)
4. **Expected**: Database shows `is_3d = 1`

---

## Database Queries

### Get all 3D games
```sql
SELECT * FROM games WHERE is_3d = 1;
```

### Get all 2D games
```sql
SELECT * FROM games WHERE is_3d = 0;
```

### Player's 3D game history
```sql
SELECT * FROM games 
WHERE is_3d = 1 
AND (player_left_id = ? OR player_right_id = ?);
```

### Count games by mode
```sql
SELECT 
    is_3d,
    COUNT(*) as total_games
FROM games
GROUP BY is_3d;
```

---

## Important Notes

### 🔄 Database Migration
If your database already exists, you need to add the `is_3d` column:

```sql
ALTER TABLE games ADD COLUMN is_3d BOOLEAN DEFAULT 0;
```

Or recreate the database:
```bash
# Backup existing data if needed
cd apps/database
rm -f data/transcendence.db
# Database will be recreated on next server start
```

### 🎮 Game Logic Unchanged
The **game logic remains identical** between 2D and 3D:
- Same physics engine
- Same powerups
- Same skills
- Same hitboxes
- Same server code

Only the **rendering** is different!

### 🔀 Skill Selection Persistence
The skill selection is stored in `sessionStorage`:
```typescript
sessionStorage.setItem('selectedSkill', 'smash');
```

This persists across navigation from `/play` → `/play/waiting` → `/game3d/{roomId}`.

---

## Future Enhancements

### Potential Improvements:
1. **Separate leaderboards** for 2D vs 3D
2. **Statistics filtering** by game mode
3. **Player preferences** - remember last selected mode
4. **Tournament mode** - allow tournaments to specify 2D or 3D
5. **Toggle during match** - switch between 2D/3D view live (advanced)

---

## Rollback Instructions

If you need to revert these changes:

1. **Frontend**: Change back to always use `/game/${roomId}`
   ```typescript
   window.router.navigate(`/game/${roomId}`);
   ```

2. **Backend**: Remove the `is_3d` parameter from game creation
   ```typescript
   await callDatabase('/games', 'POST', {
       id: gameId,
       room_id: room.id,
       game_type: 'quickplay',
       // Remove: is_3d: is3d,
       player_left_id: room.players[0].id,
       player_right_id: room.players[1].id
   });
   ```

3. **Database**: Column will remain but be unused (no harm)

---

## Summary

✅ **Smash skill** → 3D Pong (Babylon.js)
✅ **Dash skill** → 2D Pong (Canvas)
✅ Database tracks which mode was used
✅ No changes to game logic or physics
✅ Easy to extend with future features

**The implementation is complete and ready for testing!** 🎮✨
