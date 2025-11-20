# Game Architecture Guide

## Overview

This document explains the high-level architecture of our 2D educational space game. It's designed to help team members understand how the codebase is organized and how the Entity Component System (ECS) works.

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [What is ECS-lite?](#what-is-ecs-lite)
3. [Why Use ECS?](#why-use-ecs)
4. [Core Components of Our ECS](#core-components-of-our-ecs)
5. [How Everything Works Together](#how-everything-works-together)
6. [Codebase Structure](#codebase-structure)
7. [Key Design Patterns](#key-design-patterns)

---

## High-Level Architecture

Our game follows a **modular, component-based architecture** with three main layers:

```
┌─────────────────────────────────────────┐
│         Game Loop (Engine)              │
│  - Fixed timestep updates               │
│  - Scene management                     │
│  - System updates                       │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         ECS Layer                       │
│  - Entities (just IDs)                  │
│  - Components (data)                     │
│  - Systems (behavior)                   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Rendering Layer                 │
│  - Konva Stage & Layers                 │
│  - Entity visualization                 │
│  - UI overlays                          │
└─────────────────────────────────────────┘
```

### Key Principles

1. **Separation of Concerns**: Data (components) is separate from behavior (systems)
2. **Composition over Inheritance**: Entities are built by combining components
3. **Event-Driven**: Systems communicate via events, not direct references
4. **Scene-Based**: Game flow is managed through scenes (Title → Name → ISS → Cutscene → Moon)

---

## What is ECS-lite?

**ECS (Entity Component System)** is a design pattern commonly used in game engines. Our implementation is "ECS-lite" because it's simpler than full ECS engines but follows the same core principles.

### The Three Pillars

#### 1. **Entities** - Just IDs
Entities are **not objects or classes**. They're just unique numbers (1, 2, 3...).

```typescript
// Creating an entity
const shipId = world.createEntity(); // Returns: 1

// That's it! No properties, no methods, just an ID.
```

**Why?** Entities are empty containers. All their data and behavior come from components and systems.

#### 2. **Components** - Pure Data
Components are **data containers only**. They have NO methods, NO logic, just properties.

```typescript
// Example: Position Component
interface Position {
  type: 'position';
  x: number;      // Just data
  y: number;      // Just data
  angle?: number; // Just data
}

// Creating a component
const position = createPosition(100, 200); // { type: 'position', x: 100, y: 200 }
```

**Key Rule**: Components are **immutable in structure** - you update their values, but don't change what they contain.

#### 3. **Systems** - Pure Logic
Systems contain **all the game logic**. They operate on entities that have specific component combinations.

```typescript
// MovementSystem operates on entities with Position + Velocity
class MovementSystem {
  update(dt: number, world: World) {
    // Find all entities with Position AND Velocity
    world.forEachEntity(['position', 'velocity'], (entityId) => {
      const pos = world.getComponent<Position>(entityId, 'position')!;
      const vel = world.getComponent<Velocity>(entityId, 'velocity')!;
      
      // Update position based on velocity (pure logic)
      pos.x += vel.vx * dt;
      pos.y += vel.vy * dt;
    });
  }
}
```

**Key Rule**: Systems don't know about specific entities - they query for entities with the components they need.

---

## Why Use ECS?

### Traditional OOP Approach (What we DON'T use):

```typescript
// ❌ Inheritance-based approach
class Ship {
  position: { x: number; y: number };
  velocity: { vx: number; vy: number };
  fuel: { current: number; max: number };
  
  update(dt: number) {
    this.position.x += this.velocity.vx * dt;
    // ... more logic
  }
  
  render() {
    // ... rendering logic
  }
}

class StationaryShip extends Ship {
  // Can't move, but inherits everything
}

class RefuelStation {
  position: { x: number; y: number };
  // Different class, can't share components easily
}
```

**Problems:**
- Hard to add/remove features (need new classes or modify existing)
- Tightly coupled (ship knows about everything)
- Hard to reuse code between different entity types

### ECS Approach (What we DO use):

```typescript
// ✅ Composition-based approach
const shipId = world.createEntity();
world.addComponent(shipId, createPosition(100, 200));
world.addComponent(shipId, createVelocity(5, 0));
world.addComponent(shipId, createFuel(100, 50));

const stationId = world.createEntity();
world.addComponent(stationId, createPosition(500, 300));
// No velocity = MovementSystem ignores it!
// No fuel = FuelSystem ignores it!

// Systems automatically handle whatever entities match
```

**Benefits:**
- ✅ **Flexible**: Add/remove components to change behavior
- ✅ **Reusable**: Same components work with different entities
- ✅ **Performant**: Systems process entities in batches
- ✅ **Modular**: Easy to add new features without touching existing code

---

## Core Components of Our ECS

### World (`engine/ecs/world.ts`)

The **World** is the central registry. It manages:
- All entities (set of IDs)
- All components (mapped to entities)
- Component indices (for fast queries)

```typescript
const world = new World();

// Create entity
const id = world.createEntity(); // 1

// Add component
world.addComponent(id, createPosition(100, 200));

// Get component
const pos = world.getComponent<Position>(id, 'position');

// Query entities
const movingEntities = world.getEntitiesWith(['position', 'velocity']);
```

### Components (`engine/ecs/components/`)

Our game uses these components:

#### Position
```typescript
interface Position {
  type: 'position';
  x: number;
  y: number;
  angle?: number; // rotation in degrees
}
```
**Used by**: Rendering, collision detection, movement

#### Velocity
```typescript
interface Velocity {
  type: 'velocity';
  vx: number; // pixels per second
  vy: number;
}
```
**Used by**: Movement system

#### Fuel
```typescript
interface Fuel {
  type: 'fuel';
  current: number;
  max: number;
}
```
**Used by**: Fuel system, HUD

#### Sprite
```typescript
interface Sprite {
  type: 'sprite';
  key: string; // 'ship', 'refuel-station', etc.
}
```
**Used by**: Rendering system to know what to draw

### Systems (`engine/ecs/systems/`)

#### MovementSystem
**What it does**: Updates Position based on Velocity

**Which entities**: All with `Position` + `Velocity`

**Logic**:
```typescript
position.x += velocity.vx * dt;
position.y += velocity.vy * dt;
```

#### FuelSystem
**What it does**: Drains fuel when moving, handles refueling

**Which entities**: All with `Fuel` + `Velocity`

**Logic**:
- If entity is moving (velocity > 0), drain fuel
- If fuel reaches 0, emit `fuel:empty` event
- Can refuel entities via `refuel()` method

#### TriggersSystem
**What it does**: Detects collisions for refuel stations

**Which entities**: Queries entities with `Position` + `Fuel` + `Sprite`

**Logic**:
- Checks AABB (axis-aligned bounding box) collision
- If ship collides with refuel trigger → calls FuelSystem.refuel()

---

## How Everything Works Together

### Example: Creating a Ship

```typescript
// 1. Create entity (just an ID)
const shipId = world.createEntity(); // Returns: 1

// 2. Add components (data)
world.addComponent(shipId, createPosition(100, 200));  // Where it is
world.addComponent(shipId, createVelocity(0, 0));      // How fast it moves
world.addComponent(shipId, createFuel(100, 30));       // Fuel level
world.addComponent(shipId, createSprite('ship'));       // What it looks like

// 3. Systems automatically work with it!
// - MovementSystem finds it (has Position + Velocity)
// - FuelSystem finds it (has Fuel + Velocity)
// - RenderSystem finds it (has Position + Sprite)
```

### Example: Game Loop Flow

```
Frame 1 (16.67ms):
  ↓
Game Loop
  ↓
Update Phase:
  ├─ MovementSystem.update()
  │   └─ Finds ship (has Position + Velocity)
  │   └─ Updates: position.x += velocity.vx * dt
  │
  ├─ FuelSystem.update()
  │   └─ Finds ship (has Fuel + Velocity)
  │   └─ If moving: fuel.current -= drainRate * dt
  │
  └─ TriggersSystem.update()
      └─ Finds ship (has Position + Fuel + Sprite)
      └─ Checks collision with refuel station
      └─ If collision: FuelSystem.refuel()
  ↓
Render Phase:
  ├─ EntitiesLayer.render()
  │   └─ Finds ship (has Position + Sprite)
  │   └─ Updates Konva node position
  │
  └─ stage.batchDraw()
      └─ Draws everything to canvas
```

### Example: Adding a New Feature

**Scenario**: We want to add a "shield" system that protects ships.

**Step 1**: Create Shield Component
```typescript
// engine/ecs/components/shield.ts
export interface Shield extends Component {
  type: 'shield';
  current: number;
  max: number;
}

export function createShield(max: number): Shield {
  return { type: 'shield', current: max, max };
}
```

**Step 2**: Create Shield System
```typescript
// engine/ecs/systems/shieldSystem.ts
export class ShieldSystem implements System {
  update(dt: number, world: World) {
    // Find all entities with Shield component
    world.forEachEntity(['shield'], (entityId) => {
      const shield = world.getComponent<Shield>(entityId, 'shield')!;
      // Regenerate shields over time, etc.
    });
  }
}
```

**Step 3**: Register System
```typescript
// main.ts
const shieldSystem = new ShieldSystem();
loop.registerSystem(shieldSystem);
```

**Step 4**: Use it!
```typescript
// Add shield to ship
world.addComponent(shipId, createShield(100));

// That's it! ShieldSystem automatically processes it.
```

**No changes needed to**:
- Existing systems
- Existing components
- Existing entities
- Scene code

This is the power of ECS - **modularity and extensibility**!

---

## Codebase Structure

### Core Engine (`engine/`)

```
engine/
├── loop.ts              # Game loop (fixed timestep)
├── sceneManager.ts      # Scene lifecycle management
├── events.ts            # Event bus (pub/sub)
├── time.ts              # Time utilities
└── ecs/
    ├── world.ts         # Entity/component registry
    ├── types.ts         # Type definitions
    ├── components/      # Data components
    │   ├── position.ts
    │   ├── velocity.ts
    │   ├── fuel.ts
    │   └── sprite.ts
    └── systems/        # Behavior systems
        ├── movement.ts
        ├── fuelSystem.ts
        └── triggers.ts
```

**Key Files**:
- `world.ts`: The heart of ECS - manages all entities and components
- `components/*`: Pure data structures
- `systems/*`: Pure logic that operates on components

### Scenes (`scenes/`)

Scenes manage game states and game flow:

```
scenes/
├── TitleScene.ts        # Title screen
├── NameScene.ts         # Name input
├── ISSScene.ts          # Main tutorial (uses ECS)
├── CutsceneScene.ts     # ISS → Moon transition
└── MoonScene.ts         # Moon exploration
```

**How scenes use ECS**:
- Create entities in `init()`
- Add components to entities
- Systems automatically process them
- Scenes don't need to know about system internals

### Rendering (`render/`)

```
render/
├── stage.ts             # Konva Stage setup
└── layers/
    ├── background.ts    # Static backgrounds
    ├── entities.ts      # Renders ECS entities
    ├── ui.ts            # UI layer
    └── starfield.ts     # Animated starfield
```

**EntitiesLayer**:
- Queries world for entities with `Position` + `Sprite`
- Creates Konva nodes for each entity
- Updates node positions each frame (no new objects created)

### UI (`ui/`)

DOM-based UI (not Konva):
- `buttons.ts`: Styled button factory
- `dialog.ts`: Modal dialogs
- `hud.ts`: Fuel bar overlay
- `quiz.ts`: Quiz interface

### Content (`content/`)

```
content/
└── dialogue.ts          # Dialogue manager (Neil's messages)
```

### Data (`data/`)

JSON files for content:
- `quizzes.json`: Quiz questions
- `facts.json`: Educational facts
- `dialogue.json`: Dialogue sequences

**Why JSON?** Easy to edit without code changes!

---

## Key Design Patterns

### 1. Component Composition

Entities are built by combining components:

```typescript
// Ship: can move and has fuel
shipId = world.createEntity();
world.addComponent(shipId, createPosition(...));
world.addComponent(shipId, createVelocity(...));
world.addComponent(shipId, createFuel(...));
world.addComponent(shipId, createSprite('ship'));

// Station: can't move, no fuel
stationId = world.createEntity();
world.addComponent(stationId, createPosition(...));
world.addComponent(stationId, createSprite('refuel-station'));
// No Velocity = MovementSystem ignores it!
// No Fuel = FuelSystem ignores it!
```

### 2. System Queries

Systems query for entities with specific component combinations:

```typescript
// MovementSystem only processes entities with Position + Velocity
world.forEachEntity(['position', 'velocity'], (entityId) => {
  // Process this entity
});

// FuelSystem only processes entities with Fuel + Velocity
world.forEachEntity(['fuel', 'velocity'], (entityId) => {
  // Process this entity
});
```

### 3. Event-Driven Communication

Systems communicate via events, not direct references:

```typescript
// FuelSystem emits event
eventBus.emit('fuel:empty');

// ISSScene listens for event
eventBus.on('fuel:empty', () => {
  // Stop ship movement
});
```

**Benefits**:
- Systems don't need to know about each other
- Easy to add new listeners
- Decoupled architecture

### 4. Fixed Timestep Game Loop

```typescript
// Accumulator pattern for consistent physics
accumulator += frameTime;

while (accumulator >= 16.67ms) {
  update(16.67ms);  // Fixed step
  accumulator -= 16.67ms;
}

render(); // Variable timestep for smooth visuals
```

**Why?** Ensures physics are consistent regardless of frame rate.

---

## Common ECS Operations

### Creating an Entity with Components

```typescript
const entityId = world.createEntity();
world.addComponent(entityId, createPosition(100, 200));
world.addComponent(entityId, createVelocity(5, 0));
world.addComponent(entityId, createFuel(100, 50));
```

### Querying Entities

```typescript
// Get all entities with specific components
const entities = world.getEntitiesWith(['position', 'velocity']);

// Iterate over matching entities
world.forEachEntity(['position', 'velocity'], (entityId) => {
  const pos = world.getComponent<Position>(entityId, 'position')!;
  // Do something with position
});
```

### Getting/Setting Components

```typescript
// Get component (with type safety)
const position = world.getComponent<Position>(entityId, 'position');

// Check if entity has component
if (world.hasComponent(entityId, 'fuel')) {
  // Entity has fuel
}

// Update component (mutate the data)
if (position) {
  position.x += 10;
}
```

### Removing Components

```typescript
// Remove component from entity
world.removeComponent(entityId, 'velocity');
// Entity no longer has velocity - MovementSystem will ignore it
```

---

## Performance Considerations

### Why ECS is Fast

1. **Batch Processing**: Systems process all matching entities at once
2. **Component Index**: Fast lookups via component type index
3. **No Allocations**: Reuse component objects, don't create new ones
4. **Cache-Friendly**: Components stored together in memory

### Our Optimizations

- **No allocations in hot paths**: Update loops don't create new objects
- **Component reuse**: Update existing components, don't replace them
- **Batch rendering**: Konva nodes created once, updated each frame
- **Efficient queries**: Component index for fast entity lookups

---

## When to Use ECS vs Traditional OOP

### Use ECS When:
- ✅ You have many entities with varying behaviors
- ✅ You need to add/remove features dynamically
- ✅ Performance matters (batch processing)
- ✅ You want modular, extensible code

### Use Traditional OOP When:
- ✅ Simple, small projects
- ✅ Entities have fixed, well-defined behaviors
- ✅ You don't need the flexibility

**Our game uses ECS because**:
- We have ships, stations, and potentially more entity types
- We want to easily add new features (shields, weapons, etc.)
- We need good performance (60 FPS)
- We want team members to add content without touching core systems

---

## Learning Resources

### Understanding ECS Concepts

1. **Entities are just IDs**: Think of them as database row IDs
2. **Components are data**: Think of them as database columns
3. **Systems are queries**: Think of them as SQL queries that operate on data

### Mental Model

```
Entity = Row in a database
Component = Column in a database
System = Query that processes matching rows
```

### Example Analogy

```
Database Table: "Game Objects"
┌─────────┬──────────┬──────────┬──────────┐
│ Entity  │ Position │ Velocity │ Fuel     │
├─────────┼──────────┼──────────┼──────────┤
│ 1       │ (100,200)│ (5, 0)   │ 50/100   │ ← Ship
│ 2       │ (500,300)│ null     │ null     │ ← Station
└─────────┴──────────┴──────────┴──────────┘

MovementSystem = SELECT * WHERE Velocity IS NOT NULL
                  UPDATE Position = Position + Velocity * dt
```

---

## Best Practices

### 1. Components Should Be Pure Data

```typescript
// ✅ Good
interface Position {
  type: 'position';
  x: number;
  y: number;
}

// ❌ Bad (has methods)
class Position {
  x: number;
  y: number;
  update() { ... } // NO! Logic belongs in systems
}
```

### 2. Systems Should Be Pure Logic

```typescript
// ✅ Good
class MovementSystem {
  update(dt: number, world: World) {
    // Logic only, no data storage
  }
}

// ❌ Bad (stores entity references)
class MovementSystem {
  private entities: Entity[]; // NO! Query world instead
}
```

### 3. Use Queries, Not Direct References

```typescript
// ✅ Good
world.forEachEntity(['position', 'velocity'], (id) => {
  // Process entity
});

// ❌ Bad (maintains entity list)
private trackedEntities = [1, 2, 3];
```

### 4. Emit Events for Cross-System Communication

```typescript
// ✅ Good
eventBus.emit('fuel:empty');

// ❌ Bad (direct system reference)
fuelSystem.onFuelEmpty();
```

---

## Summary

- **Entities**: Just IDs (1, 2, 3...)
- **Components**: Pure data (Position, Velocity, Fuel, Sprite)
- **Systems**: Pure logic (Movement, Fuel, Triggers)
- **World**: Registry that manages everything
- **Benefits**: Flexible, modular, performant, extensible

**Key Takeaway**: In ECS, you build entities by combining components, and systems automatically process them. No inheritance needed!

---

## Questions?

If you're confused about:
- **How to add a new component?** → Create in `components/`, add to entities
- **How to add a new system?** → Create in `systems/`, register in `main.ts`
- **How to query entities?** → Use `world.getEntitiesWith(['component1', 'component2'])`
- **How to update a component?** → Get it with `getComponent()`, mutate directly

For more details, see `STRUCTURE.md` for implementation specifics.

