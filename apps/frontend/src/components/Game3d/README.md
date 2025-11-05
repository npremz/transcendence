# Game3d - 3D Pong Integration

## Architecture Overview

The 3D Pong game reuses the **existing 2D Pong game logic** completely. This means:

- ✅ **Same backend** (gameback service)
- ✅ **Same physics engine**
- ✅ **Same powerups, skills, and game rules**
- ✅ **Same WebSocket protocol**

The only difference is **how the game is rendered** on the frontend.

## How It Works

### 1. **Backend (Unchanged)**
```
apps/gameback/
├── game/
│   ├── engine/          # Physics, powerups, skills
│   ├── session/         # Game sessions, matchmaking
│   └── ws/              # WebSocket message types
```

The backend:
- Runs the game simulation at 120 Hz
- Broadcasts game state updates at 60 Hz
- Handles player input (up/down movement, skills)
- Manages powerups, scoring, and game over conditions
- **Doesn't know or care** if the client is 2D or 3D

### 2. **Frontend - 2D Pong**
```
apps/frontend/src/components/PongGame/
├── PongGame.ts          # Main game class
├── PongRenderer.ts      # Canvas 2D rendering
├── PongInput.ts         # Keyboard input handling
├── constants.ts         # Game dimensions (1920x1080)
└── types.ts             # Type definitions
```

Uses HTML5 Canvas to draw the game in 2D.

### 3. **Frontend - 3D Pong (NEW)**
```
apps/frontend/src/components/Game3d/
├── Game3d.ts            # Main 3D game class
├── Game3dConnector.ts   # Bridge between game logic and 3D scene
├── constants.ts         # 3D-specific constants
└── README.md            # This file
```

Uses Babylon.js to render the game in 3D.

## Component Breakdown

### **Game3d.ts**
Main class that:
- Initializes Babylon.js engine and scene
- Loads 3D models (stadium.gltf)
- Sets up camera, lights, and materials
- Creates WebSocket connection to game server
- Handles keyboard input
- Manages the render loop

### **Game3dConnector.ts**
The "translator" that:
- Receives `PublicState` updates from the server (same format as 2D)
- Converts 2D coordinates (x: 0-1920, y: 0-1080) to 3D positions
- Updates Babylon.js meshes (paddles, ball) based on game state
- Translates keyboard input to server commands

**Coordinate Mapping:**
```typescript
// 2D Pong coordinates (Canvas)
X: 0 to 1920 (horizontal)
Y: 0 to 1080 (vertical)

// 3D Stadium coordinates (Babylon.js)
X: -960 to 960 (horizontal, left to right)
Y: 0 (height - ball stays on ground)
Z: -540 to 540 (depth, top to bottom in 2D view)
```

### **PublicState** (Shared Data Structure)
```typescript
{
  leftPaddle: { y: number, speed: number, intention: number },
  rightPaddle: { y: number, speed: number, intention: number },
  balls: [{ x: number, y: number, vx: number, vy: number, radius: number }],
  score: { left: number, right: number },
  powerUps: [...],
  // ... and more
}
```

This is sent from the server 60 times per second to all clients.

## Database Changes

Added `is_3d` flag to the `games` table:

```sql
CREATE TABLE games (
  id TEXT PRIMARY KEY,
  game_type TEXT NOT NULL,  -- 'quickplay' or 'tournament'
  is_3d BOOLEAN DEFAULT 0,  -- NEW: 0 for 2D, 1 for 3D
  player_left_id TEXT NOT NULL,
  player_right_id TEXT NOT NULL,
  score_left INTEGER,
  score_right INTEGER,
  -- ... other fields
);
```

This allows:
- **Separate game history** for 2D vs 3D
- **Statistics filtering** by game mode
- **Leaderboards** for each mode

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         BACKEND                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  GameWorld (Physics Engine)                          │   │
│  │  - Ball movement, collision detection                │   │
│  │  - Paddle movement based on player input             │   │
│  │  - Powerup spawning and effects                      │   │
│  │  - Score tracking                                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  GameSession                                         │   │
│  │  - Manages connected clients                         │   │
│  │  - Broadcasts PublicState via WebSocket (60 Hz)     │   │
│  │  - Receives player input                            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓ WebSocket
        ┌───────────────────┴───────────────────┐
        │                                       │
┌───────▼────────┐                   ┌──────────▼─────────┐
│  2D FRONTEND   │                   │   3D FRONTEND      │
│                │                   │                    │
│  WSClient      │                   │  WSClient          │
│      ↓         │                   │      ↓             │
│  PongRenderer  │                   │  Game3dConnector   │
│  (Canvas 2D)   │                   │      ↓             │
│                │                   │  Babylon.js Scene  │
│                │                   │  (3D Rendering)    │
└────────────────┘                   └────────────────────┘
```

## Key Benefits

### ✅ **No Code Duplication**
- Game logic lives in ONE place (backend)
- Both 2D and 3D clients consume the same state

### ✅ **Easy to Maintain**
- Bug fixes in physics apply to both modes
- New powerups automatically work in 3D

### ✅ **Consistency**
- Same hitboxes, speeds, and game feel
- Fair competition between 2D and 3D players

### ✅ **Flexibility**
- Players can choose their preferred view
- Could even allow switching mid-game (future feature)

## How to Add New Features

### Adding a New Powerup (Example)

1. **Backend** (`apps/gameback/game/engine/powerups.ts`):
   ```typescript
   // Add new powerup type
   activateTeleport(side: Side, state: GameState) {
     // Implement teleport logic
   }
   ```

2. **Frontend 2D** (`apps/frontend/src/components/PongGame/PongRenderer.ts`):
   ```typescript
   // Add visual effect for teleport
   drawTeleportEffect(x, y) {
     // Draw 2D particle effect
   }
   ```

3. **Frontend 3D** (`apps/frontend/src/components/Game3d/Game3dConnector.ts`):
   ```typescript
   // Add 3D visual effect
   showTeleportEffect(x, y, z) {
     // Create 3D particle system or animation
   }
   ```

## Next Steps / TODO

- [ ] Add visual effects for powerups in 3D (blackhole, split, blackout)
- [ ] Implement score display UI overlay
- [ ] Add ball trail effect in 3D
- [ ] Create particle effects for paddle hits
- [ ] Add sound effects
- [ ] Implement camera shake on collisions
- [ ] Add replay/spectator camera modes
- [ ] Mobile controls for 3D version
- [ ] Performance optimizations

## Testing

To test 3D mode:
1. Start the backend services
2. Navigate to `/game3d` route
3. Game connects to the same WebSocket endpoint
4. Use W/S or Arrow keys to control paddle
5. Game state is synced from server just like 2D

## File Structure Reference

```
apps/frontend/src/
├── components/
│   ├── Game3d/
│   │   ├── Game3d.ts              # Main 3D game class
│   │   ├── Game3dConnector.ts     # State-to-3D bridge
│   │   ├── constants.ts           # 3D constants
│   │   └── README.md              # This file
│   │
│   ├── PongGame/                  # 2D version (reference)
│   │   ├── PongGame.ts
│   │   ├── PongRenderer.ts
│   │   ├── PongInput.ts
│   │   └── constants.ts
│   │
├── net/
│   └── wsClient.ts                # Shared WebSocket client
│
apps/gameback/
├── game/
│   ├── engine/                    # Shared game logic
│   └── session/                   # Session management
```

## Questions?

- **Q: Can 2D and 3D players play against each other?**
  - A: Yes! They're playing the exact same game, just with different visuals.

- **Q: Does 3D mode have performance issues?**
  - A: Babylon.js is optimized for 3D rendering. Should run smoothly on modern hardware.

- **Q: Can we add VR support?**
  - A: Yes! Babylon.js has WebXR support. Could be a future enhancement.

- **Q: What about mobile?**
  - A: 3D might be heavy for mobile. Consider offering 2D as default on mobile devices.
