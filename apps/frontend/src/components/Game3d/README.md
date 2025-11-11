# Game3D Modular Architecture

This directory contains the refactored 3D Pong game using Babylon.js with a clean, modular architecture.

## 📁 Directory Structure

```
Game3d/
├── core/                    # Core engine systems
│   ├── SceneManager.ts      # Scene setup and rendering
│   ├── CameraSystem.ts      # Camera controls and animations
│   ├── LightingSystem.ts    # Lights and shadows
│   └── index.ts             # Core exports
│
├── entities/                # Game entities (visual objects)
│   ├── Ball.ts              # Ball entity
│   ├── Paddle.ts            # Paddle entity
│   ├── Stadium.ts           # Stadium GLTF loader
│   ├── Scoreboard.ts        # Holographic scoreboard
│   ├── PowerUp.ts           # PowerUp entities
│   ├── BackgroundSphere.ts  # Space background & effects
│   └── index.ts             # Entity exports
│
├── systems/                 # Game systems (logic)
│   ├── InputSystem.ts       # Keyboard input handling
│   └── index.ts             # System exports
│
├── Game3d.ts                # Main game component
├── Game3dConnector.ts       # 2D-to-3D coordinate conversion
├── constants.ts             # Game constants
├── types.ts                 # TypeScript types
├── EXAMPLE_USAGE.ts         # Usage examples
└── README.md                # This file
```

## 🎯 Design Principles

1. **Single Responsibility**: Each class has one clear purpose
2. **Dependency Injection**: Dependencies passed through constructors
3. **Clear Interfaces**: TypeScript types define contracts
4. **Resource Management**: Every class has a `dispose()` method
5. **Modularity**: Easy to test, replace, or extend components

## 🚀 Quick Start

### Basic Usage

```typescript
import { Engine } from '@babylonjs/core';
import { SceneManager, CameraSystem, LightingSystem } from './core';
import { Ball, Stadium, Scoreboard, BackgroundSphere } from './entities';
import { InputSystem } from './systems';

// 1. Initialize engine and core systems
const canvas = document.getElementById('game3d-canvas') as HTMLCanvasElement;
const engine = new Engine(canvas, true);
const sceneManager = new SceneManager(engine);
const scene = sceneManager.getScene();

// 2. Setup camera and lighting
const cameraSystem = new CameraSystem(scene, canvas);
const lightingSystem = new LightingSystem(scene);

// 3. Load entities
const stadium = new Stadium(scene);
await stadium.load();

const ball = new Ball(scene, lightingSystem.getShadowGenerator());
const scoreboard = new Scoreboard(scene);
scoreboard.create();

// 4. Setup input
const inputSystem = new InputSystem();
inputSystem.onKey('v', () => cameraSystem.toggleView());

// 5. Start render loop
sceneManager.startRenderLoop(() => {
    // Update logic here
    ball.update(x, y, z);
});

// 6. Cleanup when done
ball.dispose();
scoreboard.dispose();
stadium.dispose();
lightingSystem.dispose();
cameraSystem.dispose();
sceneManager.dispose();
engine.dispose();
```

## 📦 Entity Reference

### Ball
Creates and manages ball meshes with physics.

```typescript
const ball = new Ball(scene, shadowGenerator, 'ball-1');
ball.update(x, y, z);
ball.setPosition(0, 0, 0);
ball.dispose();
```

### Stadium
Loads the stadium GLTF model with materials.

```typescript
const stadium = new Stadium(scene);
const meshes = await stadium.load(); // Returns ground, borders, paddles
const ground = stadium.getGround();
stadium.dispose();
```

### Scoreboard
Creates a holographic scoreboard with 4 panels.

```typescript
const scoreboard = new Scoreboard(scene);
scoreboard.create();
scoreboard.updateScore(3, 2);
scoreboard.dispose();
```

### PowerUp
Creates floating powerup orbs with animations.

```typescript
const powerUp = new PowerUp(scene, 'split', 0.5, shadowGenerator);
powerUp.update(x, y, z, animationOffset);
powerUp.dispose();
```

### BackgroundSphere
Manages space background and celebration effects.

```typescript
const background = new BackgroundSphere(scene);
background.triggerGoalCelebration('left');
background.dispose();
```

## 🎮 System Reference

### SceneManager
Manages the Babylon.js scene and render loop.

```typescript
const sceneManager = new SceneManager(engine);
const scene = sceneManager.getScene();
sceneManager.startRenderLoop(() => { /* update */ });
sceneManager.stopRenderLoop();
sceneManager.dispose();
```

### CameraSystem
Handles camera positioning and view modes.

```typescript
const cameraSystem = new CameraSystem(scene, canvas);
cameraSystem.playIntroAnimation();
cameraSystem.toggleView(); // Switch between overhead/first-person
cameraSystem.updateFirstPersonView('left');
cameraSystem.dispose();
```

### LightingSystem
Manages lights and shadows.

```typescript
const lightingSystem = new LightingSystem(scene);
const shadowGen = lightingSystem.getShadowGenerator();
shadowGen.addShadowCaster(mesh);
lightingSystem.dispose();
```

### InputSystem
Handles keyboard input.

```typescript
const inputSystem = new InputSystem();
inputSystem.onKey('v', () => console.log('V pressed'));
const { up, down } = inputSystem.getMovementInput();
const intention = inputSystem.getPaddleIntention('left');
inputSystem.dispose();
```

## 🔧 Coordinate Conversion

The game uses 2D coordinates from the server. Use these helpers:

```typescript
import { SCALE_X, SCALE_Z, WORLD_WIDTH, WORLD_HEIGHT } from './constants';

function convert2DXto3DX(x2d: number): number {
    return (x2d - WORLD_WIDTH / 2) * SCALE_X;
}

function convert2DYto3DZ(y2d: number): number {
    return (y2d - WORLD_HEIGHT / 2) * SCALE_Z;
}
```

## 📊 Constants

All magic numbers are centralized in `constants.ts`:

- `WORLD_WIDTH`, `WORLD_HEIGHT` - 2D game dimensions
- `STADIUM_3D_WIDTH`, `STADIUM_3D_HEIGHT` - 3D world size
- `SCALE_X`, `SCALE_Z` - Conversion factors
- `PADDLE_3D` - Paddle dimensions
- `BALL_3D` - Ball properties
- `CAMERA` - Camera settings
- `MATERIALS` - Color hex codes
- `SCOREBOARD` - Scoreboard layout
- `BACKGROUND` - Background sphere settings

## 🎨 Adding New Entities

Follow this pattern:

```typescript
// entities/MyEntity.ts
import { Scene, Mesh, MeshBuilder } from '@babylonjs/core';

export class MyEntity {
    private mesh: Mesh;
    private scene: Scene;

    constructor(scene: Scene) {
        this.scene = scene;
        this.mesh = MeshBuilder.CreateSphere('myEntity', {}, scene);
    }

    update(x: number, y: number, z: number): void {
        this.mesh.position.set(x, y, z);
    }

    getMesh(): Mesh {
        return this.mesh;
    }

    dispose(): void {
        if (this.mesh.material) {
            this.mesh.material.dispose();
        }
        this.mesh.dispose();
    }
}
```

Then export it in `entities/index.ts`:

```typescript
export { MyEntity } from './MyEntity';
```

## 🐛 Debugging Tips

1. **Visual debugging**: Use `AxesViewer` to see XYZ axes
2. **Check coordinates**: Log 2D-to-3D conversions
3. **Mesh inspection**: Use `scene.getMeshByName()` 
4. **Material issues**: Check if materials are disposed prematurely
5. **Shadow problems**: Ensure meshes are added to shadow generator

## 📝 Best Practices

✅ **DO:**
- Use constants instead of magic numbers
- Dispose all resources in `dispose()` methods
- Use TypeScript types for all public APIs
- Keep entities focused on visual representation
- Keep systems focused on logic and behavior

❌ **DON'T:**
- Mix 2D and 3D coordinates without conversion
- Create meshes without cleaning them up
- Hard-code dimensions or colors
- Put game logic in entity classes
- Forget to call `dispose()` when cleaning up

## 🔗 Related Files

- `Game3dConnector.ts` - Manages coordinate conversion and state updates
- `AssetLoader.ts` - Legacy asset loading (being phased out)
- `EXAMPLE_USAGE.ts` - Complete usage examples

## 📚 Further Reading

- [Babylon.js Documentation](https://doc.babylonjs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Clean Code Principles](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)

---

Made with ❤️ for a cleaner, more maintainable 3D game!
