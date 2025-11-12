# Code Journal - 3D Game Refactoring

## Date: November 12, 2025

### 🎯 Goal
Refactor the 3D game architecture to have clean separation of concerns and better maintainability.

---

## ✅ Progress Made Today

### 1. **Architecture Design** ✓
Established a clean layered architecture:
```
Game3dView (Entry Point)
    ↓
Game3D (Orchestrator)
    ↓
Game3DEngine (Game Loop Manager)
    ├── SceneManager (Environment)
    ├── Renderer3D (Render Loop + Entities)
    ├── NetworkManager (Server Communication)
    └── InputSystem (Keyboard Input)
```

### 2. **SceneManager** ✓
**Location:** `apps/frontend/src/components/Game3d/core/sceneManager.ts`

**Completed:**
- ✅ Scene creation and configuration
- ✅ Camera setup (ArcRotateCamera with controls)
- ✅ Lighting system (Hemispheric + Directional)
- ✅ Skybox creation with texture
- ✅ Stadium loading from GLTF file (async)
- ✅ Material assignment for ground and borders
- ✅ Camera intro animation method (`playCameraIntro()`)
- ✅ Axis helper for debugging

**Responsibilities:**
- Manages static environment (skybox, stadium, lights, camera)
- Provides getters for scene and camera access
- Handles resource disposal

### 3. **Renderer3D** ✓
**Location:** `apps/frontend/src/components/Game3d/core/renderer3D.ts`

**Completed:**
- ✅ Render loop management
- ✅ Entity creation (Paddles, Balls)
- ✅ State synchronization from server
- ✅ Window resize handling
- ✅ Dev mode with initial positions for testing

**Responsibilities:**
- Manages game entities (paddles, balls)
- Updates entity positions from game state
- Runs the render loop
- Handles entity lifecycle (create/destroy)

### 4. **Entity System** ✓
**Location:** `apps/frontend/src/components/Game3d/entities/`

#### **Paddle.ts**
- ✅ Box mesh creation with material
- ✅ Position conversion from 2D (Y) to 3D (Z) coordinates
- ✅ Fixed X positions: `-45` (left), `+45` (right)
- ✅ `updateFromState()` method for server sync
- ✅ Static method for paddle intention calculation

#### **Ball.ts**
- ✅ Sphere mesh creation
- ✅ Position updates from game state
- ✅ Multiple ball support (for split powerup)

### 5. **NetworkManager** ✓
**Location:** `apps/frontend/src/components/Game3d/network/NetworkManager.ts`

**Completed:**
- ✅ Wraps existing `WSClient` for reusability
- ✅ Callback system for events:
  - `onStateUpdate` - Game state updates (60fps)
  - `onWelcome` - Initial connection
  - `onGameOver` - Match end
  - `onDisconnect` - Connection lost
- ✅ Input sending with side-aware controls
- ✅ Skill activation
- ✅ Forfeit functionality

**Key Learning:** 
- Callbacks allow separation of concerns
- NetworkManager receives data, Game3DEngine decides what to do with it
- Reuses battle-tested `WSClient` instead of reimplementing WebSocket logic

### 6. **InputSystem** ✓
**Location:** `apps/frontend/src/components/Game3d/systems/InputSystem.ts`

**Completed:**
- ✅ Keyboard event listeners (keydown/keyup)
- ✅ Key state tracking with Map
- ✅ WASD input detection
- ✅ Skill key detection (Space)
- ✅ Camera toggle key (V)
- ✅ Proper cleanup on disposal

**Design Decision:**
- InputSystem stays side-agnostic (just tracks keys)
- NetworkManager handles side-specific input conversion

### 7. **Game3DEngine** ✓
**Location:** `apps/frontend/src/components/Game3d/core/game3DEngine.ts`

**Completed:**
- ✅ Babylon.js Engine initialization
- ✅ System initialization (Input, Network, Scene, Renderer)
- ✅ Network callback setup
- ✅ Render loop with update/render cycle
- ✅ Start/pause/resume/dispose lifecycle methods
- ✅ Window resize handling
- ✅ Room ID extraction from URL

**Current Structure:**
```typescript
constructor() {
    - Initialize Engine
    - Create SceneManager
    - Create Renderer3D
    - Initialize Systems (Input, Network)
    - Setup Network Callbacks
}

start() {
    - Start render loop
    - Connect to server
    - Add resize listener
}

update() {
    - Get input from InputSystem
    - Send to NetworkManager
}

render() {
    - Renderer3D renders the scene
}
```

---

## 🎮 Current State

### **What's Working:**
- ✅ 3D stadium renders with skybox
- ✅ Paddles are visible at correct positions
- ✅ Camera can be controlled (arc rotate)
- ✅ Proper lighting and materials
- ✅ Architecture is clean and modular
- ✅ Ready for network integration

### **Dev Mode:**
- Stadium, lights, and paddles visible without server connection
- Paddles positioned at center (Y=540 → Z=0)
- Test ball can be added for visual verification

---

## 🔄 Network Integration (Ready)

### **Data Flow:**
```
Server sends state
    ↓
WSClient receives & parses
    ↓
NetworkManager.onState callback
    ↓
Game3DEngine.onStateUpdate callback
    ↓
Renderer3D.updateFromState()
    ↓
Paddle.updateFromState() / Ball.updateFromState()
    ↓
Mesh positions updated
    ↓
Render loop displays changes
```

### **Callback Chain Explanation:**
- **NetworkManager** has callback properties (like `onStateUpdate`)
- **Game3DEngine** sets these callbacks with its own functions
- When data arrives, NetworkManager calls Game3DEngine's functions
- Game3DEngine decides what to do (update renderer, UI, etc.)
- This keeps NetworkManager reusable and Game3DEngine in control

---

## 📝 Important Design Decisions

### 1. **Separation of Concerns**
- **SceneManager** = Environment (static)
- **Renderer3D** = Entities (dynamic)
- **NetworkManager** = Communication
- **InputSystem** = User input
- **Game3DEngine** = Orchestration

### 2. **Callback Pattern**
- Used for loose coupling between NetworkManager and Game3DEngine
- NetworkManager doesn't depend on game-specific code
- Game3DEngine controls game logic

### 3. **Coordinate Conversion**
- Happens in entity classes (Paddle, Ball)
- Keeps 2D/3D mapping logic centralized
- Easy to adjust scaling factors

### 4. **Async Stadium Loading**
- Stadium loads asynchronously to prevent blocking
- Scene initializes immediately with null stadium
- Stadium pops in when loaded

### 5. **Reusing WSClient**
- NetworkManager wraps existing WSClient instead of reimplementing
- Less code duplication
- Consistent network behavior across 2D and 3D games

---

## 🐛 Issues Resolved Today

1. ✅ **Paddles not visible** - Fixed by adding `updateFromState()` that actually updates mesh position
2. ✅ **Paddles too far away** - Changed from ±1010 to ±45 units
3. ✅ **TypeScript import errors** - Changed `import type` to regular `import` for classes being instantiated
4. ✅ **Definite assignment errors** - Used `!` assertion for properties initialized in helper methods
5. ✅ **Callback confusion** - Clarified the callback chain and separation of concerns

---

## 📋 Next Steps

### **High Priority:**
1. ⏳ **Connect to actual game server** - Uncomment network connection code
2. ⏳ **Test with live game state** - Verify paddle/ball movement sync
3. ⏳ **Implement input sending** - Uncomment input system in `update()`
4. ⏳ **Add UI elements** - Player names, score, skill cooldowns
5. ⏳ **Test game over flow** - Victory/defeat screens

### **Medium Priority:**
6. ⏳ **Camera intro animation** - Trigger `playCameraIntro()` on game start
7. ⏳ **Power-ups** - Create PowerUp entity class
8. ⏳ **Visual effects** - Blackout, blackhole, split ball
9. ⏳ **Sound integration** - Hit sounds, goal sounds, background music
10. ⏳ **Performance optimization** - Object pooling for balls

### **Low Priority:**
11. ⏳ **Shadows** - Enable shadow casting/receiving
12. ⏳ **Stadium gates** - Add gate meshes and materials
13. ⏳ **Camera modes** - Multiple camera angles (V key toggle)
14. ⏳ **Particle effects** - Goal explosions, paddle hits
15. ⏳ **Post-processing** - Bloom, glow effects

---

## 💡 Key Learnings

1. **Callbacks are instructions:** You give a function to someone, they call it later when something happens
2. **Separation enables reusability:** NetworkManager can be reused because it doesn't know about game logic
3. **TypeScript types matter:** `import type` vs regular `import`, definite assignment `!`
4. **Async loading is non-blocking:** Stadium loads in background while game initializes
5. **Coordinate systems need careful mapping:** 2D pixels → 3D units requires scaling

---

## 📁 File Structure

```
apps/frontend/src/components/Game3d/
├── core/
│   ├── game3DEngine.ts       ✅ Game loop orchestrator
│   ├── sceneManager.ts        ✅ Environment setup
│   └── renderer3D.ts          ✅ Render loop + entities
├── entities/
│   ├── Entity.ts              ✅ Base class
│   ├── Paddle.ts              ✅ Paddle entity
│   └── Ball.ts                ✅ Ball entity
├── network/
│   └── NetworkManager.ts      ✅ Server communication
├── systems/
│   └── InputSystem.ts         ✅ Keyboard input
├── constants.ts               ✅ Game constants
├── types.ts                   ✅ TypeScript interfaces
├── Game3d.ts                  ✅ Main orchestrator
└── Game3dConnector.ts         ⏳ Legacy (to be deprecated)
```

---

## 🎯 Current Focus
**Testing the render pipeline without server connection, ensuring all entities are visible and positioned correctly.**

**Status:** ✅ COMPLETE - Ready to connect to live game server!

---

## 📊 Statistics
- **Files created/modified:** 10+
- **Lines of code:** ~800+
- **Architecture layers:** 5 (View → Orchestrator → Engine → Systems → Entities)
- **Time invested:** Full day
- **Bugs fixed:** 5
- **Design patterns used:** Observer (callbacks), Component (entities), Facade (managers)

---

## 🔗 Related Documentation
- [SMASH_3D_COMPLETE.md](SMASH_3D_COMPLETE.md) - Complete 3D game documentation
- [SMASH_3D_IMPLEMENTATION.md](SMASH_3D_IMPLEMENTATION.md) - Implementation guide
- [SMASH_DEBUG_GUIDE.md](SMASH_DEBUG_GUIDE.md) - Debugging guide

---

**Last Updated:** November 12, 2025
**Next Session:** Test with live server connection
