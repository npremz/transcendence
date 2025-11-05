# Implementation Guide: 3D Pong Integration

## Summary

This implementation connects your 3D Babylon.js Pong game to the existing 2D Pong game backend. Here's what was done:

## ✅ What's Been Implemented

### 1. **Database Schema Update**
- **File**: `apps/database/src/database/schema.sql`
- **Change**: Added `is_3d BOOLEAN DEFAULT 0` column to `games` table
- **Purpose**: Distinguish between 2D and 3D games in match history

### 2. **Game3dConnector Class** (NEW)
- **File**: `apps/frontend/src/components/Game3d/Game3dConnector.ts`
- **Purpose**: Bridge between game logic and 3D rendering
- **Key Features**:
  - Converts 2D coordinates (0-1920, 0-1080) to 3D positions
  - Updates Babylon.js meshes based on server state
  - Handles coordinate transformation
  - Provides smooth interpolation

### 3. **Updated Game3d Class**
- **File**: `apps/frontend/src/components/Game3d/Game3d.ts`
- **Changes**:
  - Integrated WebSocket client (`WSClient`)
  - Connected to game server
  - Sends keyboard input to server
  - Receives game state updates
  - Removed local physics simulation (now server-authoritative)
  - Added proper cleanup/disposal methods

### 4. **Constants File** (NEW)
- **File**: `apps/frontend/src/components/Game3d/constants.ts`
- **Purpose**: Centralize 3D-specific constants

### 5. **Documentation** (NEW)
- **File**: `apps/frontend/src/components/Game3d/README.md`
- **Contains**: Complete architecture explanation, diagrams, and guides

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    GAME SERVER                          │
│                  (apps/gameback)                        │
│                                                         │
│  • Physics Engine (120Hz tick rate)                    │
│  • Powerups & Skills                                   │
│  • Collision Detection                                 │
│  • Score Management                                    │
│  • Broadcasts PublicState (60Hz)                       │
└─────────────────────┬───────────────────────────────────┘
                      │ WebSocket
                      │ (PublicState updates)
        ┌─────────────┴─────────────┐
        │                           │
┌───────▼────────┐         ┌────────▼────────┐
│   2D CLIENT    │         │   3D CLIENT     │
│                │         │                 │
│ PongRenderer   │         │ Game3dConnector │
│ (Canvas 2D)    │         │ (Babylon.js)    │
└────────────────┘         └─────────────────┘
```

## 🔄 Data Flow

1. **Player presses key** (W/S) → `Game3d.ts` captures it
2. **Input sent to server** → `WSClient.sendInput(up, down)`
3. **Server updates physics** → Calculates new positions
4. **Server broadcasts state** → Sends `PublicState` to all clients
5. **Client receives state** → `Game3dConnector.updateFromGameState()`
6. **3D scene updates** → Paddles/ball positions updated in Babylon.js
7. **Render** → User sees updated 3D scene

## 📝 Next Steps to Complete the Integration

### Step 1: Test the Connection
```bash
# Make sure the game server is running
cd apps/gameback
npm run dev

# In another terminal, start the frontend
cd apps/frontend
npm run dev
```

Navigate to your 3D game route and check the console for:
- "WSClient: connecting to..." message
- "Welcome from server" message
- "3D Game: Assigned to side..." message

### Step 2: Verify Coordinate Mapping
The connector assumes your stadium.gltf uses these dimensions:
- Width (X): 1920 units (matching 2D)
- Depth (Z): 1080 units (matching 2D)

If your model uses different dimensions, update `Game3dConnector.ts`:
```typescript
const STADIUM_3D_WIDTH = YOUR_MODEL_WIDTH;
const STADIUM_3D_HEIGHT = YOUR_MODEL_DEPTH;
```

### Step 3: Update Database Migration
Run the schema update:
```bash
# This depends on your database setup
# You may need to recreate the database or run a migration
```

### Step 4: Add UI Elements
The forfeit button and player names need to be connected:

```typescript
// In Game3d.ts constructor, add:
const forfeitBtn = document.getElementById('forfeit-btn');
forfeitBtn?.addEventListener('click', () => {
  this.net.forfeit();
});

// Update player names when receiving welcome message:
this.net.onWelcome = (side, playerNames) => {
  const leftName = document.getElementById('player-left-name');
  const rightName = document.getElementById('player-right-name');
  if (leftName) leftName.textContent = playerNames?.left || 'Player 1';
  if (rightName) rightName.textContent = playerNames?.right || 'Player 2';
};
```

### Step 5: Add Score Display
Create a score overlay:

```typescript
// In setupNetworkHandlers():
this.net.onState = (state) => {
  if (this.connector) {
    this.connector.updateFromGameState(state);
  }
  
  // Update score UI
  const scoreLeft = document.getElementById('score-left');
  const scoreRight = document.getElementById('score-right');
  if (scoreLeft) scoreLeft.textContent = state.score.left.toString();
  if (scoreRight) scoreRight.textContent = state.score.right.toString();
};
```

And update the HTML in `Game3d()` function:

```typescript
<div class="absolute top-0 left-0 right-0 flex justify-between items-center px-8 py-4">
  <div class="flex items-center gap-4">
    <div id="player-left-name" class="text-xl font-bold text-white">Player 1</div>
    <div id="score-left" class="text-4xl font-bold text-white">0</div>
  </div>
  <button id="forfeit-btn" class="px-4 py-2 bg-red-600 text-white rounded">Surrender</button>
  <div class="flex items-center gap-4">
    <div id="score-right" class="text-4xl font-bold text-white">0</div>
    <div id="player-right-name" class="text-xl font-bold text-white">Player 2</div>
  </div>
</div>
```

### Step 6: Handle Powerups (Optional but Recommended)
Add visual effects for powerups in `Game3dConnector.ts`:

```typescript
updateFromGameState(state: PublicState) {
  // ...existing paddle/ball updates...
  
  // Handle powerups
  if (state.blackholeActive) {
    this.showBlackholeEffect(state.blackholeCenterX, state.blackholeCenterY);
  }
  
  if (state.blackoutLeft || state.blackoutRight) {
    this.applyBlackoutEffect(state.blackoutLeftIntensity, state.blackoutRightIntensity);
  }
  
  // Show powerup pickups on the field
  state.powerUps.forEach(powerUp => {
    this.showPowerUpMesh(powerUp.x, powerUp.y, powerUp.type);
  });
}
```

### Step 7: Connect to Matchmaking
Update your game routing to pass the room ID:

```typescript
// In your routing code (wherever you navigate to game3d):
router.navigate(`/game3d?room=${roomId}`);

// In Game3d.ts:
connectToServer() {
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('room');
  
  if (!roomId) {
    console.error('No room ID provided');
    return;
  }
  
  // Connect with room-specific URL
  const host = import.meta.env.VITE_HOST;
  const endpoint = import.meta.env.VITE_GAME_ENDPOINT;
  const url = `wss://${host}${endpoint}/${roomId}`;
  
  this.net.connect(url);
}
```

## 🐛 Troubleshooting

### Issue: Paddles not moving
**Check**:
1. Console for WebSocket connection errors
2. Server logs for received input messages
3. `updatePaddlePosition()` is being called in render loop

### Issue: Ball position is wrong
**Check**:
1. Coordinate conversion in `convert2DXto3DX()` and `convert2DYto3DZ()`
2. Stadium model dimensions match constants
3. Ball mesh is created correctly

### Issue: Game state not updating
**Check**:
1. WebSocket connection established
2. `onState` callback is registered
3. Server is broadcasting state updates
4. No JavaScript errors in console

## 📊 Testing Checklist

- [ ] WebSocket connects successfully
- [ ] Player is assigned a side (left/right)
- [ ] Keyboard input (W/S) moves paddle
- [ ] Ball moves and bounces correctly
- [ ] Score updates on goals
- [ ] Powerups appear and function
- [ ] Game over is detected
- [ ] Forfeit button works
- [ ] Player names display correctly
- [ ] Multiple balls work (split powerup)
- [ ] Blackout effect works
- [ ] Skills (smash/dash) work

## 🎨 Future Enhancements

1. **Visual Effects**
   - Particle systems for paddle hits
   - Ball trail effect
   - Powerup glow/animation
   - Goal celebration effects

2. **Camera Improvements**
   - Follow ball camera mode
   - Cinematic replays
   - Spectator camera paths

3. **Audio**
   - Spatial audio for ball bounces
   - Powerup sound effects
   - Background music

4. **Performance**
   - LOD (Level of Detail) for models
   - Texture compression
   - Frame rate optimization

5. **Accessibility**
   - Colorblind modes
   - UI scaling options
   - Simplified graphics mode

## 📚 Resources

- [Babylon.js Documentation](https://doc.babylonjs.com/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Original 2D Pong Code](../PongGame/)
- [Game Backend Code](../../../../gameback/game/)

## 🤝 Contributing

When adding features:
1. Update both 2D and 3D clients if visual
2. Update only backend if game logic
3. Document changes in this file
4. Test in both modes
5. Update the README.md

---

**Questions or Issues?** Check the main README.md or consult the codebase documentation.
