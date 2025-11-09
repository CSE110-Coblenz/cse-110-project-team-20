# Complete Codebase Documentation

This document provides a comprehensive explanation of every file, class, and function in the codebase. It's organized by directory structure to help you understand how everything works together.

---

## Table of Contents

1. [Entry Point & Configuration](#entry-point--configuration)
2. [Engine Core](#engine-core)
3. [ECS (Entity Component System)](#ecs-entity-component-system)
4. [Scenes](#scenes)
5. [Rendering](#rendering)
6. [Input](#input)
7. [UI Components](#ui-components)
8. [Persistence](#persistence)
9. [Content Management](#content-management)
10. [Utilities](#utilities)

---

## Entry Point & Configuration

### `src/main.ts`
**Purpose**: The entry point that bootstraps the entire game.

**Key Functions**:
- `init()`: Initializes all core systems and starts the game
  - Creates EventBus for pub/sub communication
  - Creates World (ECS entity registry)
  - Creates RenderStage (Konva canvas setup)
  - Creates SaveRepository for persistence
  - Creates SceneManager for scene transitions
  - Registers all game scenes (title, name, iss, cutscene, moon)
  - Registers ECS systems (movement, fuel, rotation)
  - Creates GameLoop and starts it

**How it works**:
1. Waits for DOM to be ready
2. Gets the game container element
3. Creates all core systems
4. Registers scenes with factory functions (lazy instantiation)
5. Registers ECS systems with the game loop
6. Transitions to the title scene
7. Starts the game loop

**Design Pattern**: Factory pattern for scenes (scenes created on-demand)

---

### `src/config.ts`
**Purpose**: Centralized configuration constants (DRY principle).

**Constants**:
- `STAGE_WIDTH/HEIGHT`: Canvas dimensions (1280x720)
- `FIXED_TIMESTEP`: 16.67ms (60 FPS target)
- `MAX_FRAME_TIME`: 100ms (prevents spiral of death)
- `SHIP_WIDTH/HEIGHT`: 50x50 pixels
- `SHIP_CENTER_OFFSET`: 25 (for rotation center)
- `FUEL_MAX`: 100 (maximum fuel)
- `FUEL_INITIAL`: 50 (starting fuel - 50%)
- `FUEL_DRAIN_PER_COLLISION`: 15 (fuel lost per obstacle hit)
- `FUEL_REFUEL_AMOUNT`: 100 (full refuel at station)
- `ASTEROID_HITBOX_SHRINK`: 0.75 (75% of image size for hitbox)
- `DEBUG_HITBOX`: true/false (visualize collision boxes)

**Why**: Prevents magic numbers scattered throughout code. Change values in one place.

---

## Engine Core

### `src/engine/loop.ts`
**Purpose**: Fixed timestep game loop using accumulator pattern.

**Class: `GameLoop`**

**Key Methods**:
- `constructor(sceneManager, world)`: Sets up the loop
- `registerSystem(system)`: Adds an ECS system to update each frame
- `start()`: Begins the game loop
- `stop()`: Stops the game loop
- `tick()`: Main loop function (called by requestAnimationFrame)
  - Calculates frame time
  - Caps frame time to prevent spiral of death
  - Accumulates time
  - Runs fixed timestep updates (16.67ms chunks)
  - Renders once per frame
  - Schedules next frame

**How it works**:
1. Uses `requestAnimationFrame` for smooth rendering
2. Accumulator pattern ensures consistent physics regardless of frame rate
3. If frame takes 50ms, it runs 3 fixed updates (50/16.67 ≈ 3)
4. This keeps physics consistent even if browser is slow

**Design Pattern**: Fixed timestep with variable rendering

---

### `src/engine/time.ts`
**Purpose**: Time utility functions.

**Functions**:
- `now()`: Returns `performance.now()` (high-resolution timestamp)
- `elapsed(start, end)`: Calculates time difference

**Why**: Centralizes time access, makes testing easier (can mock)

---

### `src/engine/sceneManager.ts`
**Purpose**: Manages scene lifecycle and transitions.

**Interface: `Scene`**
- `init()`: Called when scene becomes active
- `update(dt)`: Called every frame with delta time
- `render()`: Called every frame to render
- `dispose()`: Called when scene is deactivated (cleanup)

**Class: `SceneManager`**

**Key Methods**:
- `register(name, factory)`: Registers a scene factory function
  - Uses factory pattern (scenes created on-demand)
  - Prevents creating scenes before they're needed
- `transitionTo(name)`: Switches to a different scene
  - Disposes current scene
  - Creates new scene from factory
  - Calls `init()` on new scene
  - Emits `scene:transition` event
- `update(dt)`: Delegates to current scene's update
- `render()`: Delegates to current scene's render

**Scene Flow**: Title → Name → ISS → Cutscene → Moon

---

### `src/engine/events.ts`
**Purpose**: Event bus for pub/sub communication between systems.

**Type: `EventBus`**
- Uses `mitt` library for lightweight event system
- Fully typed with TypeScript

**Function: `createEventBus()`**
- Returns a new event bus instance

**Event Types** (defined in `GameEvents`):
- `quiz:passed` - Quiz completed successfully
- `quiz:failed` - Quiz failed
- `cutscene:start` - Cutscene started
- `cutscene:end` - Cutscene ended
- `fuel:empty` - Ship ran out of fuel
- `fuel:refueled` - Ship was refueled
- `save:updated` - Save data changed
- `scene:transition` - Scene changed

**Usage**:
```typescript
eventBus.on(EventTopics.FUEL_EMPTY, () => { /* handle */ });
eventBus.emit(EventTopics.FUEL_EMPTY);
```

**Why**: Decouples systems - they don't need direct references to each other

---

### `src/engine/events/topics.ts`
**Purpose**: Typed event topic constants (prevents string typos).

**Constants**: `EventTopics`
- All event names as constants
- Type-safe: TypeScript will catch typos
- Better IDE autocomplete

**Why**: Instead of `'fuel:empty'` (typo-prone), use `EventTopics.FUEL_EMPTY`

---

## ECS (Entity Component System)

### `src/engine/ecs/types.ts`
**Purpose**: Core ECS type definitions.

**Types**:
- `EntityId`: `number` - Unique identifier for entities
- `ComponentType`: `string` - Type identifier for components
- `Component`: Base interface all components extend
  - Must have `type: ComponentType`
- `System`: Interface for systems
  - `update(dt, world)`: Called every frame
- `World`: Interface for the ECS world
  - All methods for entity/component management

**Why**: Centralizes types, prevents circular dependencies

---

### `src/engine/ecs/world.ts`
**Purpose**: ECS world - manages entities and components.

**Class: `World`**

**Data Structures**:
- `entities`: Set of all entity IDs
- `components`: Map<EntityId, Map<ComponentType, Component>>
  - Stores components per entity
- `componentIndex`: Map<ComponentType, Set<EntityId>>
  - Fast lookup: "which entities have Position component?"

**Key Methods**:
- `createEntity()`: Creates new entity, returns ID
  - Auto-increments ID
  - Initializes empty component map
- `addComponent(entityId, component)`: Adds component to entity
  - Updates component index for fast queries
  - Replaces existing component of same type
- `removeComponent(entityId, type)`: Removes component
  - Updates index
- `getComponent<T>(entityId, type)`: Gets component (typed)
- `hasComponent(entityId, type)`: Checks if entity has component
- `getEntitiesWith(types[])`: Gets all entities with ALL specified components
  - Uses index for fast lookup
  - Example: `getEntitiesWith(['position', 'velocity'])` finds moving entities
- `forEachEntity(types[], callback)`: Iterates entities with components
- `removeEntity(entityId)`: Removes entity and all its components

**Performance**: Component index makes queries O(1) instead of O(n)

---

### Components

#### `src/engine/ecs/components/position.ts`
**Purpose**: Position component (x, y, angle).

**Interface: `Position`**
- `type: 'position'`
- `x: number` - X coordinate
- `y: number` - Y coordinate
- `angle?: number` - Rotation in degrees (optional)

**Function: `createPosition(x, y, angle?)`**
- Factory function to create Position component

**Used by**: MovementSystem, RotationSystem, rendering

---

#### `src/engine/ecs/components/velocity.ts`
**Purpose**: Velocity component (vx, vy).

**Interface: `Velocity`**
- `type: 'velocity'`
- `vx: number` - Velocity X (pixels per second)
- `vy: number` - Velocity Y (pixels per second)

**Function: `createVelocity(vx, vy)`**
- Factory function to create Velocity component

**Used by**: MovementSystem, PlayerInputSystem, FuelSystem

---

#### `src/engine/ecs/components/fuel.ts`
**Purpose**: Fuel component (current, max).

**Interface: `Fuel`**
- `type: 'fuel'`
- `current: number` - Current fuel amount
- `max: number` - Maximum fuel capacity

**Function: `createFuel(max, current?)`**
- Factory function
- If `current` not provided, defaults to `max` (full tank)

**Used by**: FuelSystem, ObstaclesSystem, HUD

---

#### `src/engine/ecs/components/sprite.ts`
**Purpose**: Sprite component (rendering key).

**Interface: `Sprite`**
- `type: 'sprite'`
- `key: string` - Sprite identifier (e.g., 'ship', 'asteroid')

**Function: `createSprite(key)`**
- Factory function

**Used by**: EntitiesLayer (rendering), collision systems

---

### Systems

#### `src/engine/ecs/systems/movement.ts`
**Purpose**: Updates Position based on Velocity (physics).

**Class: `MovementSystem`**

**Method: `update(dt, world)`**
1. Converts delta time from ms to seconds
2. Finds all entities with `position` AND `velocity` components
3. For each entity:
   - Gets Position and Velocity components
   - Updates position: `x += vx * dtSeconds`, `y += vy * dtSeconds`
   - Mutates in place (no allocations)

**Performance**: Zero allocations in hot path

**Order**: Runs before rendering, after input

---

#### `src/engine/ecs/systems/rotation.ts`
**Purpose**: Rotates entities to face movement direction.

**Class: `RotationSystem`**

**Method: `update(dt, world)`**
1. Finds entities with `position` AND `velocity`
2. Calculates speed: `sqrt(vx² + vy²)`
3. If moving (speed > 0.01):
   - Calculates angle using `atan2(vy, vx)`
   - Adds 90° to convert to game coordinates
   - Normalizes to 0-360° range
   - Updates `position.angle`

**Math**:
- `atan2(vy, vx)` gives: Right=0°, Down=90°, Left=180°, Up=-90°
- Adding 90° converts to: Right=90°, Down=180°, Left=270°, Up=0°
- This matches the ship sprite (faces up by default)

---

#### `src/engine/ecs/systems/playerInput.ts`
**Purpose**: Converts keyboard input to velocity.

**Class: `PlayerInputSystem`**

**Properties**:
- `keyboard`: Keyboard instance
- `speed`: Pixels per second (default 200)
- `playerEntityId`: Which entity to control
- `enabled`: Can disable input
- `conditionCheck`: Optional function - must return true for input to work

**Methods**:
- `setPlayerEntity(id)`: Sets which entity to control
- `setEnabled(enabled)`: Enable/disable input
- `setCondition(fn)`: Sets condition function
  - Example: Only allow input if fuel > 0 and tutorial completed

**Method: `update(dt, world)`**
1. Checks if player entity exists and input is enabled
2. Checks condition function (if set)
3. Gets keyboard state
4. Resets velocity to (0, 0)
5. Sets velocity based on keys:
   - Left: `vx = -speed`
   - Right: `vx = speed`
   - Up: `vy = -speed` (negative because Y increases downward)
   - Down: `vy = speed`

**Why separate system**: Can easily swap input methods, disable input, add conditions

---

#### `src/engine/ecs/systems/fuelSystem.ts`
**Purpose**: Manages fuel consumption and refueling.

**Class: `FuelSystem`**

**Properties**:
- `eventBus`: For emitting fuel events
- `drainRate`: 7 fuel per second when moving
- `fuelEmptyEmitted`: Set of entity IDs that already emitted `fuel:empty`
  - Prevents spam (only emit once per empty event)

**Method: `update(dt, world)`**
1. Finds entities with `fuel` AND `velocity`
2. Calculates speed
3. If moving (speed > 0.01):
   - Drains fuel: `current -= drainRate * dtSeconds`
   - Clamps to 0 (no negative fuel)
4. Checks if fuel is empty:
   - If `current <= 0` and not already emitted:
     - Emits `fuel:empty` event
     - Adds entity to `fuelEmptyEmitted` set
   - If fuel restored (`current > 0`):
     - Removes from `fuelEmptyEmitted` (can emit again if empty)

**Method: `refuel(world, entityId, amount)`**
1. Gets Fuel component
2. Adds fuel: `current = min(current + amount, max)`
3. Removes from `fuelEmptyEmitted` set
4. Emits `fuel:refueled` event with amount

**Events Emitted**:
- `fuel:empty` - When fuel reaches 0
- `fuel:refueled` - When fuel is added

---

#### `src/engine/ecs/systems/triggers.ts`
**Purpose**: Detects collisions with trigger zones (refuel stations).

**Interface: `Trigger`**
- `id: string` - Unique identifier
- `x, y, width, height` - Bounding box
- `type: 'refuel'` - Trigger type

**Class: `TriggersSystem`**

**Properties**:
- `triggers`: Array of trigger zones
- `fuelSystem`: Reference to fuel system (for refueling)

**Methods**:
- `addTrigger(trigger)`: Adds a trigger zone
- `removeTrigger(id)`: Removes a trigger

**Method: `update(dt, world)`**
1. Finds all ships (entities with `position`, `fuel`, `sprite`)
2. For each ship:
   - Creates ship bounding box using collision utility
   - Checks collision with each trigger using AABB
   - If collision detected and trigger type is 'refuel':
     - Calls `fuelSystem.refuel()` with `CONFIG.FUEL_REFUEL_AMOUNT`

**Collision Detection**: Uses `checkAABBCollision()` from collision utility (DRY)

---

#### `src/engine/ecs/systems/obstacles.ts`
**Purpose**: Detects collisions with obstacles and handles boundary wrapping.

**Interface: `Obstacle`**
- `id: string` - Unique identifier
- `entityId: number` - ECS entity ID (obstacle is an entity)
- `width, height` - Hitbox dimensions
- `fuelDrain: number` - Fuel lost per collision
- `offsetX, offsetY` - Hitbox offset (accounts for image borders)

**Class: `ObstaclesSystem`**

**Properties**:
- `obstacles`: Map of obstacles by ID
- `collisionCooldown`: Map<EntityId, timestamp> - Prevents multiple collisions per frame
- `COOLDOWN_MS`: 500ms cooldown between collisions
- `stageWidth, stageHeight`: For boundary wrapping

**Methods**:
- `setStageDimensions(width, height)`: Sets stage size for wrapping
- `addObstacle(obstacle)`: Adds obstacle
- `removeObstacle(id)`: Removes obstacle
- `getObstacle(id)`: Gets obstacle by ID

**Method: `update(dt, world)`**
1. **Boundary Wrapping** (for moving obstacles):
   - For each obstacle with velocity:
     - If off left edge: wrap to right
     - If off right edge: wrap to left
     - Same for top/bottom
2. **Collision Detection**:
   - Finds all ships (entities with `position`, `fuel`, `sprite`)
   - Checks cooldown (prevent spam)
   - For each obstacle:
     - Gets obstacle position from ECS
     - Applies hitbox offset
     - Calculates asteroid center and radius
     - Uses `checkShipAsteroidCollision()` (hybrid box-circle collision)
     - If collision:
       - Drains fuel: `fuel.current = max(0, current - fuelDrain)`
       - Sets cooldown timestamp
       - Breaks (only one collision per frame)

**Collision Detection**: Uses hybrid approach:
- Ship: AABB (axis-aligned bounding box)
- Asteroid: Circle (more accurate for round objects)
- Function: `checkShipAsteroidCollision()` in collision utility

---

### `src/engine/utils/collision.ts`
**Purpose**: Collision detection utilities (DRY principle).

**Interface: `BoundingBox`**
- `x, y, width, height` - Rectangle definition

**Functions**:

1. **`checkAABBCollision(box1, box2)`**
   - Axis-Aligned Bounding Box collision
   - Checks if two rectangles overlap
   - Used for ship vs triggers, ship vs rectangular obstacles
   - Formula: Checks if boxes overlap on both axes

2. **`createShipBoundingBox(x, y)`**
   - Creates ship bounding box from position
   - Uses `CONFIG.SHIP_WIDTH/HEIGHT`
   - DRY: Centralizes ship dimension logic

3. **`checkCircleCollision(x1, y1, r1, x2, y2, r2)`**
   - Circle vs circle collision
   - Calculates distance between centers
   - Collision if `distance < (r1 + r2)`
   - More accurate for round objects than AABB

4. **`checkShipAsteroidCollision(shipBox, asteroidCenterX, asteroidCenterY, asteroidRadius)`**
   - Hybrid collision: Ship (box) vs Asteroid (circle)
   - Finds closest point on ship box to asteroid center
   - Calculates distance from closest point to asteroid center
   - Collision if distance < asteroid radius
   - More accurate than AABB for round asteroids

**Why separate file**: Reusable across multiple systems, easier to test

---

## Scenes

### `src/scenes/TitleScene.ts`
**Purpose**: Title screen (entry point).

**Class: `TitleScene`**

**Methods**:
- `init()`:
  - Clears layers
  - Creates title text ("Space Game MVP")
  - Creates subtitle
  - Creates UI container with buttons:
    - "Start" → transitions to NameScene
    - "Settings" (stub)
    - "Exit" (stub)
- `update(dt)`: Static scene, no updates
- `render()`: Static scene, no rendering
- `dispose()`: Removes UI elements

**UI**: DOM-based (not Konva) for easier styling

---

### `src/scenes/NameScene.ts`
**Purpose**: Player name entry screen.

**Class: `NameScene`**

**Methods**:
- `init()`:
  - Creates prompt text ("Enter Your Name")
  - Creates input field
  - Creates submit button
  - Handles Enter key press
- `handleSubmit()`:
  - Validates name (not empty)
  - Saves name to SaveRepository
  - Transitions to ISSScene
- `update(dt)`: Static
- `render()`: Static
- `dispose()`: Cleans up UI

---

### `src/scenes/ISSScene.ts`
**Purpose**: Main gameplay scene (tutorial level).

**Class: `ISSScene`**

**Properties**:
- Core systems: `world`, `eventBus`, `keyboard`, `quizUI`, `hud`, etc.
- ECS systems: `triggersSystem`, `obstaclesSystem`, `playerInputSystem`
- Entities: `shipId`, `refuelStationId`, `asteroidEntities` (Map)
- Rendering: `entitiesLayer`, `starfieldLayer`, `asteroidNodes` (Map)
- State: `quizShown`, `tutorialStep`, `tutorialCompleted`

**Methods**:

- `init()`:
  1. Creates ship entity with Position, Velocity, Fuel, Sprite
  2. Creates refuel station entity
  3. Loads ISS image (refuel station)
  4. Initializes systems (triggers, obstacles, player input)
  5. Sets player input condition (only if fuel > 0, tutorial done, no dialogs)
  6. Creates obstacles (asteroids)
  7. Syncs entities for rendering
  8. Starts tutorial dialogue
  9. Sets up event listeners:
     - `quiz:passed` → show success dialogue → transition to cutscene
     - `fuel:empty` → stop movement, show dialog
     - `fuel:refueled` → show quiz

- `update(dt)`:
  1. Updates starfield animation
  2. Updates asteroid positions (syncs Konva nodes with ECS positions)
  3. Updates HUD (fuel bar)
  4. Updates entities layer
  5. Batch draws all layers

- `render()`: Handled by layers (no-op)

- `dispose()`:
  1. Cleans up asteroid entities
  2. Removes ship entity
  3. Disposes systems
  4. Removes UI elements

**Helper Methods**:
- `loadISS()`: Loads ISS image, creates Konva node, adds trigger
- `createObstacles()`: Creates asteroid entities and obstacles
  - Loads asteroid images
  - Creates ECS entities
  - Calculates hitbox (shrunk to 75% for visible asteroid)
  - Adds to ObstaclesSystem
  - Creates Konva nodes
  - Optionally shows debug hitbox
- `showQuiz()`: Shows quiz UI
- `showFuelEmptyDialog()`: Shows dialog when fuel empty
- `resetShip()`: Resets ship position and fuel
- `getCustomizedDialogue()`: Customizes dialogue with player name

**Complexity**: Largest scene, handles most game logic

---

### `src/scenes/CutsceneScene.ts`
**Purpose**: Animated transition from ISS to Moon.

**Class: `CutsceneScene`**

**Methods**:
- `init()`:
  - Clears layers
  - Creates ship sprite (rectangle)
  - Creates tween animation (ship moves across screen)
  - Sets up completion callback
- `update(dt)`: Checks if animation complete
- `render()`: Static (tween handles animation)
- `dispose()`: Cleans up tween and nodes

**Animation**: Uses Konva Tween for smooth movement

---

### `src/scenes/MoonScene.ts`
**Purpose**: Moon exploration scene (future content).

**Class: `MoonScene`**

**Methods**:
- `init()`: Creates placeholder UI
- `update(dt)`: Static
- `render()`: Static
- `dispose()`: Cleans up UI

**Status**: Placeholder for future content

---

## Rendering

### `src/render/stage.ts`
**Purpose**: Konva Stage setup and layer management.

**Class: `RenderStage`**

**Properties**:
- `stage`: Konva Stage (main canvas)
- `backgroundLayer`: Konva Layer (stars, ISS, asteroids)
- `entitiesLayer`: Konva Layer (ship, other entities)
- `uiLayer`: Konva Layer (UI elements)

**Methods**:
- `constructor(container)`: Creates stage and layers
- `batchDraw()`: Draws all layers (call once per frame)
- `getWidth()/getHeight()`: Gets canvas dimensions

**Why layers**: Allows z-ordering, separate update cycles

---

### `src/render/layers/entities.ts`
**Purpose**: Renders ECS entities as Konva nodes.

**Class: `EntitiesLayer`**

**Properties**:
- `layer`: Konva Layer to render to
- `world`: ECS World
- `entities`: Map<EntityId, DrawableEntity> - Cached Konva nodes
- `imageCache`: Map<string, HTMLImageElement> - Cached images

**Methods**:
- `preloadImages()`: Preloads ship image
- `syncEntities()`: Initializes entity nodes
  1. Clears existing nodes
  2. Finds all entities with `sprite` AND `position`
  3. Skips 'refuel-station' and 'asteroid' (rendered separately)
  4. Creates Konva nodes:
     - Ship: Konva.Image (if loaded) or Konva.Rect (fallback)
     - Others: Konva.Rect
  5. Caches nodes in `entities` map
- `updateEntities()`: Updates node positions/rotations
  1. Iterates cached entities
  2. Gets Position component
  3. Updates Konva node attributes (x, y, rotation)
  4. No allocations (mutates existing nodes)
- `render()`: Calls `updateEntities()`

**Performance**: Nodes created once, only attributes updated each frame

---

### `src/render/layers/starfield.ts`
**Purpose**: Animated scrolling starfield background.

**Class: `StarfieldLayer`**

**Properties**:
- `stars`: Array of star data (x, y, size, speed, opacity)
- `starNodes`: Array of Konva.Circle nodes

**Methods**:
- `init()`: Creates stars at 3 depths
  - Far stars: 30 stars, small, slow, faint
  - Medium stars: 20 stars, medium, medium speed
  - Near stars: 10 stars, large, fast, bright
- `update(dt)`:
  1. Moves stars left (negative X)
  2. Wraps stars to right when off-screen
  3. Updates Konva node positions
- `render()`: No-op (batch draw handled by stage)

**Effect**: Parallax scrolling (different speeds create depth)

---

### `src/render/layers/background.ts`
**Purpose**: Static background layer (placeholder).

**Class: `BackgroundLayer`**

**Methods**:
- `init()`: Clears layer (background handled by CSS)
- `render()`: No-op (static)

**Status**: Placeholder for future background elements

---

### `src/render/layers/ui.ts`
**Purpose**: UI layer (placeholder).

**Class: `UILayer`**

**Status**: Placeholder for Konva-based UI elements

---

## Input

### `src/input/keyboard.ts`
**Purpose**: Keyboard input handler with normalized state.

**Interface: `KeyboardState`**
- `up, down, left, right`: Boolean flags

**Class: `Keyboard`**

**Properties**:
- `state`: Current keyboard state
- `boundKeyDown/boundKeyUp`: Bound event handlers (for proper cleanup)

**Methods**:
- `constructor()`: Sets up event listeners
- `handleKeyDown(event)`: Updates state on key press
  - Supports WASD and Arrow keys
  - Prevents default (stops scrolling)
- `handleKeyUp(event)`: Updates state on key release
- `getState()`: Returns current state (reused object, no allocation)
- `dispose()`: Removes event listeners

**Why bound handlers**: Need same function reference for `removeEventListener`

**Performance**: `getState()` returns reused object (no allocation per frame)

---

## UI Components

### `src/ui/hud.ts`
**Purpose**: Heads-up display (fuel bar).

**Class: `HUD`**

**Properties**:
- `container`: DOM container
- `fuelBar`: Fuel bar background
- `fuelBarFill`: Fuel bar fill (green → yellow → red gradient)
- `fuelText`: Fuel text display

**Methods**:
- `constructor()`: Creates DOM elements, appends to body
- `updateFuel(current, max)`:
  1. Calculates percentage
  2. Updates fill width
  3. Updates text: "Fuel: 50.0/100"
- `dispose()`: Removes from DOM

**Styling**: DOM-based (not Konva) for easier CSS styling

---

### `src/ui/quiz.ts`
**Purpose**: Quiz UI (multiple choice questions).

**Interfaces**:
- `QuizQuestion`: question, options[], correct index
- `QuizData`: id, title, questions[]

**Class: `QuizUI`**

**Properties**:
- `dialog`: Dialog instance
- `eventBus`: For emitting quiz events
- `quizData`: Current quiz data
- `currentQuestion`: Current question index
- `selectedAnswers`: Array of selected answer indices

**Methods**:
- `showQuiz(quizData)`: Starts quiz
  1. Stores quiz data
  2. Resets state
  3. Renders first question
- `renderQuestion()`: Renders current question
  1. Gets question from quiz data
  2. Creates HTML with question and options
  3. Attaches click handlers
  4. On selection: highlights option, auto-advances after 500ms
- `checkAnswers()`: Validates all answers
  1. Compares selected answers to correct answers
  2. Shows results
  3. If all correct: "Continue" button, emits `quiz:passed`
  4. If wrong: "Retry" button, emits `quiz:failed`, resets quiz
- `isShowing()`: Checks if quiz is visible
- `dispose()`: Cleans up dialog

**Data Source**: Loads from `data/quizzes.json`

---

### `src/ui/dialog.ts`
**Purpose**: Modal dialog helper.

**Class: `Dialog`**

**Properties**:
- `overlay`: Dark overlay (full screen)
- `content`: Dialog content container

**Methods**:
- `show(htmlContent)`: Shows dialog with HTML content
- `hide()`: Hides dialog
- `isShowing()`: Checks if visible
- `dispose()`: Hides and cleans up

**Styling**: Dark overlay with centered content box

---

### `src/ui/buttons.ts`
**Purpose**: Button factory with styling.

**Function: `createButton(text, onClick, className?)`**
1. Creates button element
2. Sets text and class
3. Applies styles (gradient background, hover effects)
4. Attaches click handler
5. Returns button element

**Styling**: Gradient background, hover scale effect, shadow

---

### `src/ui/gameOver.ts`
**Purpose**: Game over UI (placeholder).

**Class: `GameOverUI`**

**Status**: Placeholder for game over screen

---

## Persistence

### `src/persistence/SaveRepository.ts`
**Purpose**: Versioned localStorage persistence.

**Interface: `SaveData`**
- `version`: Save file version
- `playerName?`: Player's name
- `tutorialDone?`: Tutorial completion flag
- `explorationUnlocked?`: Exploration mode flag
- `quizResults?`: Map of quiz ID → passed boolean

**Class: `SaveRepository`**

**Constants**:
- `CURRENT_VERSION`: 'mvp-1' (for version migration)
- `STORAGE_KEY`: 'space-game-save'

**Methods**:
- `get()`: Loads save data from localStorage
  1. Gets JSON from localStorage
  2. Parses JSON
  3. Validates version (resets if mismatch)
  4. Returns default if error
- `set(data)`: Saves data
  1. Merges with current data
  2. Sets version
  3. Saves to localStorage
  4. Emits `save:updated` event
- `merge(data)`: Merges partial data with current
- `clear()`: Removes save data
- `getPlayerName()/setPlayerName(name)`: Player name helpers
- `isTutorialDone()/setTutorialDone(done)`: Tutorial flag helpers
- `isExplorationUnlocked()/setExplorationUnlocked(unlocked)`: Exploration flag helpers
- `setQuizResult(quizId, passed)`: Records quiz result

**Error Handling**: Try-catch around localStorage operations, returns defaults on error

**Version Migration**: Can add migration logic when version changes

---

## Content Management

### `src/content/dialogue.ts`
**Purpose**: Dialogue system with character animations.

**Interfaces**:
- `Dialogue`: id, character, text
- `DialogueSequence`: Map of sequence key → Dialogue[]

**Class: `DialogueManager`**

**Properties**:
- `container`: DOM container for dialogue
- `currentSequence`: Current dialogue sequence
- `currentIndex`: Current dialogue index
- `onCompleteCallback`: Callback when sequence completes
- `neilImageMouthClosed/Open`: Character images
- `currentNeilImage`: Currently displayed image
- `mouthAnimationTimer`: Timer for mouth animation
- `isMouthOpen`: Current mouth state

**Methods**:
- `loadNeilImages()`: Preloads character images
- `showSequence(key, onComplete?, customSequence?)`:
  1. Gets sequence from JSON or custom sequence
  2. Stores sequence and callback
  3. Shows first dialogue
  4. Starts mouth animation
- `showDialogue(dialogue)`:
  1. Creates container if needed
  2. Generates HTML with character image and text
  3. Sets up click/keyboard handlers
- `createDialogueContainer()`: Creates styled DOM container
- `setupKeyboardListener()`: Adds keyboard handler (any key to continue)
- `handleContinue()`: Advances to next dialogue or completes sequence
- `startMouthAnimation()`: Alternates mouth images every 250ms
- `stopMouthAnimation()`: Stops animation
- `hide()`: Hides dialogue
- `isShowing()`: Checks if dialogue visible
- `dispose()`: Cleans up everything

**Animation**: Mouth alternates between open/closed images for "talking" effect

**Data Source**: Loads from `data/dialogue.json`

---

## Utilities

### `src/engine/utils/collision.ts`
**See ECS section above** - Collision detection utilities

---

## Data Files

### `src/data/quizzes.json`
**Purpose**: Quiz questions and answers (JSON).

**Structure**:
```json
{
  "quiz-id": {
    "id": "quiz-id",
    "title": "Quiz Title",
    "questions": [
      {
        "question": "Question text?",
        "options": ["A", "B", "C", "D"],
        "correct": 0
      }
    ]
  }
}
```

**Loaded by**: `QuizUI` via JSON import

---

### `src/data/dialogue.json`
**Purpose**: Dialogue sequences (JSON).

**Structure**:
```json
{
  "sequence-key": [
    {
      "id": "dialogue-id",
      "character": "Character Name",
      "text": "Dialogue text"
    }
  ]
}
```

**Loaded by**: `DialogueManager` via JSON import

---

### `src/data/facts.json`
**Purpose**: Educational facts (JSON).

**Status**: Placeholder for future content

---

## How Everything Works Together

### Game Flow

1. **Startup** (`main.ts`):
   - Creates all core systems
   - Registers scenes
   - Starts game loop
   - Transitions to TitleScene

2. **Title Scene**:
   - User clicks "Start"
   - Transitions to NameScene

3. **Name Scene**:
   - User enters name
   - Saves to SaveRepository
   - Transitions to ISSScene

4. **ISS Scene** (Main Gameplay):
   - Creates ship entity
   - Creates obstacles
   - Shows tutorial dialogue
   - User moves ship (WASD/Arrows)
   - PlayerInputSystem sets velocity
   - MovementSystem updates position
   - RotationSystem rotates ship
   - FuelSystem drains fuel when moving
   - ObstaclesSystem detects collisions
   - TriggersSystem detects refuel station
   - When fuel empty: shows dialog
   - When refueled: shows quiz
   - When quiz passed: transitions to CutsceneScene

5. **Cutscene Scene**:
   - Animated transition
   - Transitions to MoonScene

6. **Moon Scene**:
   - Placeholder for future content

### Update Loop (Every Frame)

1. **GameLoop.tick()**:
   - Calculates frame time
   - Accumulates time
   - Runs fixed timestep updates:
     - MovementSystem.update()
     - FuelSystem.update()
     - RotationSystem.update()
     - PlayerInputSystem.update()
     - TriggersSystem.update()
     - ObstaclesSystem.update()
   - Scene.update()
   - Scene.render()
   - Request next frame

2. **ISS Scene Update**:
   - Updates starfield
   - Updates asteroid positions
   - Updates HUD
   - Updates entities layer
   - Batch draws all layers

### Event Flow

- Systems emit events (e.g., `fuel:empty`)
- Scene listens to events
- Scene reacts (e.g., shows dialog)
- Scene can emit events (e.g., `scene:transition`)

### ECS Flow

1. **Entity Creation**:
   - `world.createEntity()` → returns ID
   - `world.addComponent(id, component)` → adds components

2. **System Processing**:
   - System queries: `world.getEntitiesWith(['position', 'velocity'])`
   - System processes each entity
   - System mutates components

3. **Rendering**:
   - `EntitiesLayer.syncEntities()` → creates Konva nodes
   - `EntitiesLayer.updateEntities()` → updates positions
   - `stage.batchDraw()` → renders to canvas

---

## Design Patterns Used

1. **ECS (Entity Component System)**: Separates data (components) from logic (systems)
2. **Factory Pattern**: Scenes created on-demand via factory functions
3. **Observer Pattern**: Event bus for pub/sub communication
4. **Singleton Pattern**: One World, one EventBus, one SceneManager
5. **Strategy Pattern**: Different collision detection strategies (AABB, circle, hybrid)
6. **Fixed Timestep**: Consistent physics regardless of frame rate

---

## Key Concepts

### Fixed Timestep
- Game logic runs at fixed intervals (16.67ms = 60 FPS)
- Rendering runs at variable rate (matches display refresh)
- Prevents physics bugs from frame rate variations

### ECS Benefits
- **Composition over Inheritance**: Entities are just IDs + components
- **Flexibility**: Easy to add new components/systems
- **Performance**: Systems process entities in batches
- **Separation of Concerns**: Systems don't know about each other

### Event-Driven Architecture
- Systems communicate via events (loose coupling)
- Easy to add new listeners
- No circular dependencies

---

## Performance Optimizations

1. **No Allocations in Hot Path**: Systems mutate components in place
2. **Component Index**: Fast entity queries (O(1) instead of O(n))
3. **Node Reuse**: Konva nodes created once, only attributes updated
4. **Batch Drawing**: All layers drawn once per frame
5. **Image Caching**: Images loaded once, reused
6. **State Reuse**: Keyboard state object reused (not copied)

---

## Testing

Test files in `src/tests/`:
- `fuelSystem.test.ts`: Tests fuel draining and refueling
- `quizLogic.test.ts`: Tests quiz UI logic
- `SaveRepository.test.ts`: Tests save/load functionality

---

## Future Improvements

1. **More Scenes**: Additional levels, boss battles
2. **More Systems**: AI, particle effects, sound
3. **More Components**: Health, inventory, weapons
4. **Save System**: More save data, cloud sync
5. **Settings**: Graphics options, controls customization

---

This documentation covers every file, class, and function in the codebase. Each component is designed with SOLID principles and follows DRY to avoid duplication. The architecture is modular, making it easy to extend and maintain.

