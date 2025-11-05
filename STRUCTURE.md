# Space Game Codebase Structure

## Overview

This is a 2D educational space game built with TypeScript and Konva. The game uses an ECS-lite architecture (Entity Component System) for game entities, a scene-based flow for game states, and an event-driven system for communication between systems.

## Architecture Patterns

### 1. **ECS-lite (Entity Component System)**
- **World**: Registry for entities and components
- **Components**: Data containers (Position, Velocity, Fuel, Sprite)
- **Systems**: Logic processors (Movement, FuelSystem, Triggers)

### 2. **Scene-Based Flow**
- Each game state is a Scene (Title → Name → ISS → Cutscene → Moon)
- Scenes implement `init()`, `update(dt)`, `render()`, `dispose()`

### 3. **Event-Driven Communication**
- EventBus (using `mitt`) for pub/sub
- Events: `quiz:passed`, `fuel:empty`, `cutscene:start`, `save:updated`

### 4. **Fixed Timestep Game Loop**
- 60 FPS target (16.67ms per frame)
- Accumulator pattern for consistent physics

---

## Directory Structure

```
src/
├── main.ts                    # Entry point, bootstraps everything
├── config.ts                  # Game configuration constants
├── index.html                 # HTML entry point
│
├── engine/                    # Core game engine
│   ├── loop.ts               # Fixed timestep game loop
│   ├── time.ts               # Time utilities
│   ├── events.ts             # EventBus creation
│   ├── sceneManager.ts       # Scene lifecycle management
│   └── ecs/                  # Entity Component System
│       ├── types.ts          # ECS type definitions
│       ├── world.ts          # Entity/component registry
│       ├── components/       # Data components
│       │   ├── position.ts   # x, y, angle
│       │   ├── velocity.ts   # vx, vy
│       │   ├── fuel.ts       # current, max
│       │   └── sprite.ts     # key (string identifier)
│       └── systems/          # Logic systems
│           ├── movement.ts   # Updates position from velocity
│           ├── fuelSystem.ts # Drains fuel, handles refuel
│           └── triggers.ts  # AABB collision for refuel stations
│
├── scenes/                    # Game scenes (game states)
│   ├── TitleScene.ts         # Title screen with Start button
│   ├── NameScene.ts          # Player name input
│   ├── ISSScene.ts           # ISS tutorial (movement, fuel, quiz)
│   ├── CutsceneScene.ts      # Animated ISS → Moon transition
│   └── MoonScene.ts          # Moon exploration unlocked screen
│
├── render/                    # Konva rendering system
│   ├── stage.ts              # Konva Stage setup & layer management
│   └── layers/
│       ├── background.ts     # Background rendering
│       ├── entities.ts       # Entity rendering from ECS world
│       └── ui.ts             # UI layer (reserved for Konva UI)
│
├── input/                     # Input handling
│   └── keyboard.ts           # WASD/Arrow key state
│
├── ui/                        # DOM-based UI (not Konva)
│   ├── buttons.ts            # Styled button factory
│   ├── dialog.ts             # Modal dialog helper
│   ├── hud.ts                # Fuel bar HUD
│   └── quiz.ts               # Quiz MCQ renderer
│
├── persistence/               # Save system
│   └── SaveRepository.ts     # Versioned localStorage wrapper
│
├── content/                   # Content management (currently empty)
│   └── dialogue.ts           # (placeholder for dialogue system)
│
├── data/                      # JSON data files
│   ├── quizzes.json          # Quiz questions
│   └── facts.json            # Educational facts
│
└── tests/                     # Vitest unit tests
    ├── SaveRepository.test.ts
    ├── fuelSystem.test.ts
    └── quizLogic.test.ts
```

---

## Core Systems

### Game Loop (`engine/loop.ts`)
- **Purpose**: Fixed timestep update loop with render
- **Key Features**:
  - Accumulator pattern: `while(accumulator >= 16.67ms) { update(); }`
  - Registers systems (Movement, FuelSystem)
- **Flow**:**
  1. Calculate frame time
  2. Accumulate time
  3. Run fixed-step updates (physics)
  4. Render once per frame
  5. Request next frame

### Scene Manager (`engine/sceneManager.ts`)
- **Purpose**: Manages scene transitions and lifecycle
- **Methods**:
  - `register(name, factory)`: Register a scene
  - `transitionTo(name)`: Switch scenes (disposes old, inits new)
  - `update(dt)`: Calls active scene's update
  - `render()`: Calls active scene's render

### ECS World (`engine/ecs/world.ts`)
- **Purpose**: Entity and component registry
- **Key Methods**:
  - `createEntity()`: Returns new entity ID
  - `addComponent(entityId, component)`: Attach component
  - `getComponent<T>(entityId, type)`: Retrieve component
  - `getEntitiesWith([types])`: Query entities by components
- **Performance**: Component index for fast queries

### Rendering System (`render/stage.ts`)
- **Purpose**: Konva Stage setup with layered rendering
- **Layers**:
  - `backgroundLayer`: Static backgrounds
  - `entitiesLayer`: Dynamic game entities
  - `uiLayer`: Konva UI (if needed)
- **Optimization**: Batch drawing (`batchDraw()`) once per frame

### Event Bus (`engine/events.ts`)
- **Purpose**: Pub/sub communication
- **Events**:
  - `quiz:passed` / `quiz:failed`
  - `cutscene:start` / `cutscene:end`
  - `fuel:empty` / `fuel:refueled`
  - `save:updated`
  - `scene:transition`

---

## Scenes Explained

### 1. TitleScene (`scenes/TitleScene.ts`)
**Current State**: ✅ Implemented
- Displays game title and subtitle (Konva Text)
- Shows Start, Settings, Exit buttons (DOM)
- On Start → transitions to NameScene

**Key Code**:
```typescript
// Konva for canvas rendering
const title = new Konva.Text({ text: 'Space Game MVP', ... });

// DOM for buttons
const startButton = createButton('Start', () => {
  this.sceneManager.transitionTo('name');
});
```

### 2. NameScene (`scenes/NameScene.ts`)
**Current State**: ✅ Implemented (needs default name handling)
- Shows name input field (DOM)
- Validates non-empty input
- Saves to SaveRepository
- On submit → transitions to ISSScene

**Key Code**:
```typescript
private handleSubmit(): void {
  const name = this.input?.value.trim() || '';
  if (name.length === 0) {
    alert('Please enter your name'); // ⚠️ Should use default name
    return;
  }
  this.saveRepository.setPlayerName(name);
  this.sceneManager.transitionTo('iss');
}
```

### 3. ISSScene (`scenes/ISSScene.ts`)
**Current State**: ✅ Partially implemented
- Creates ship entity (ECS) with Position, Velocity, Fuel, Sprite
- Creates refuel station (orange rectangle)
- Keyboard input controls ship movement (WASD)
- Fuel drains when moving
- Refuel station triggers refuel on collision
- Quiz appears after refuel
- On quiz pass → transitions to CutsceneScene

**Key Code**:
```typescript
// Create ship entity
this.shipId = this.world.createEntity();
this.world.addComponent(this.shipId, createPosition(...));
this.world.addComponent(this.shipId, createVelocity(0, 0));
this.world.addComponent(this.shipId, createFuel(100, 100));
this.world.addComponent(this.shipId, createSprite('ship'));

// Movement input
const keys = this.keyboard.getState();
if (keys.left) velocity.vx = -this.speed;
// ... etc

// Quiz trigger on refuel
this.eventBus.on('fuel:refueled', () => {
  if (!this.quizShown) {
    this.showQuiz();
  }
});
```

### 4. CutsceneScene (`scenes/CutsceneScene.ts`)
**Current State**: ✅ Implemented (basic)
- Shows ISS (left), Moon (right), ship sprite
- Animates ship from ISS to Moon using Konva Tween
- On completion → saves progress, transitions to MoonScene

**Key Code**:
```typescript
this.tween = new Konva.Tween({
  node: this.shipSprite,
  x: this.stage.getWidth() - 240,
  duration: 3,
  onFinish: () => {
    this.saveRepository.setTutorialDone(true);
    this.sceneManager.transitionTo('moon');
  },
});
```

### 5. MoonScene (`scenes/MoonScene.ts`)
**Current State**: ✅ Implemented (basic)
- Shows Moon graphic
- Displays welcome message with player name
- Shows "Exploration Unlocked" text
- Lists facts from `data/facts.json`

**Key Code**:
```typescript
const playerName = this.saveRepository.getPlayerName() || 'Explorer';
const welcome = new Konva.Text({
  text: `Welcome to the Moon, ${playerName}!`,
  ...
});
```

---

## Components Explained

### Position (`engine/ecs/components/position.ts`)
```typescript
interface Position {
  type: 'position';
  x: number;
  y: number;
  angle?: number; // degrees
}
```

### Velocity (`engine/ecs/components/velocity.ts`)
```typescript
interface Velocity {
  type: 'velocity';
  vx: number; // pixels per second
  vy: number;
}
```

### Fuel (`engine/ecs/components/fuel.ts`)
```typescript
interface Fuel {
  type: 'fuel';
  current: number;
  max: number;
}
```

### Sprite (`engine/ecs/components/sprite.ts`)
```typescript
interface Sprite {
  type: 'sprite';
  key: string; // 'ship', 'refuel-station', etc.
}
```

---

## Systems Explained

### MovementSystem (`engine/ecs/systems/movement.ts`)
- **Runs**: Every fixed timestep
- **Logic**: `Position += Velocity * dt`
- **Performance**: No allocations in hot path

### FuelSystem (`engine/ecs/systems/fuelSystem.ts`)
- **Runs**: Every fixed timestep
- **Logic**:
  - Drains fuel when `|Velocity| > 0`
  - Emits `fuel:empty` when fuel reaches 0
  - `refuel()` method for external refueling
- **Events**: `fuel:empty`, `fuel:refueled`

### TriggersSystem (`engine/ecs/systems/triggers.ts`)
- **Purpose**: AABB collision detection
- **Usage**: ISSScene uses it for refuel station detection
- **Method**: `addTrigger({x, y, width, height, type: 'refuel'})`

---

## Data Files

### `data/quizzes.json`
```json
{
  "iss-tutorial": {
    "id": "iss-tutorial",
    "title": "ISS Tutorial Quiz",
    "questions": [
      {
        "question": "What does ISS stand for?",
        "options": ["...", "..."],
        "correct": 0
      }
    ]
  }
}
```

### `data/facts.json`
```json
{
  "facts": [
    {
      "title": "The Moon",
      "content": "The Moon is Earth's only natural satellite..."
    }
  ]
}
```

---

## Persistence System

### SaveRepository (`persistence/SaveRepository.ts`)
**Schema**:
```typescript
interface SaveData {
  version: "mvp-1";
  playerName?: string;
  tutorialDone?: boolean;
  explorationUnlocked?: boolean;
  quizResults?: Record<string, boolean>;
}
```

**Methods**:
- `get()`: Load from localStorage
- `set(data)`: Save to localStorage
- `merge(data)`: Update partial data
- `setPlayerName(name)`, `isTutorialDone()`, etc.

---

## UI System

### Buttons (`ui/buttons.ts`)
- Creates styled DOM buttons
- CSS-in-JS styling
- Hover effects

### Dialog (`ui/dialog.ts`)
- Modal overlay with content
- `show(htmlContent)`, `hide()`

### HUD (`ui/hud.ts`)
- Real-time fuel bar
- DOM-based (not Konva)

### Quiz (`ui/quiz.ts`)
- Renders MCQ from JSON
- Handles answer selection
- Shows results, retry on fail
- Emits `quiz:passed` / `quiz:failed`

---

## Testing

Tests use Vitest with jsdom:
- `SaveRepository.test.ts`: Versioned save/load
- `fuelSystem.test.ts`: Fuel drain/refuel logic
- `quizLogic.test.ts`: Quiz structure validation

---

## User Stories & Implementation Guide

### User Story #1: Title Screen
**Status**: ✅ **MOSTLY COMPLETE** (minor enhancements needed)

**Requirements**:
- Show game's title screen with name and buttons
- Allow user to start the game

**Files to Edit**:
1. **`src/scenes/TitleScene.ts`** (Main implementation)
   - ✅ Title text displayed
   - ✅ Start button works
   - ⚠️ **ENHANCEMENT**: Make title/design more polished
   - ⚠️ **ENHANCEMENT**: Settings button functionality (stub currently)
   - ⚠️ **ENHANCEMENT**: Exit button functionality (stub currently)

**Current Implementation**:
- Lines 27-47: Title/subtitle rendering (Konva)
- Lines 67-69: Start button → transitions to NameScene
- Lines 72-78: Settings/Exit buttons (stubs)

**What to Change**:
- Enhance visual design of title screen
- Implement Settings menu (audio, controls, etc.)
- Implement Exit functionality (confirm dialog)

---

### User Story #2: Name Entry
**Status**: ✅ **COMPLETE** (needs default name)

**Requirements**:
- User is prompted to enter name before game starts
- Name is stored and used in game dialogues
- If name is blank, prompt user or use default name

**Files to Edit**:
1. **`src/scenes/NameScene.ts`** (Main implementation)
   - ✅ Input UI exists
   - ✅ Validation exists
   - ✅ Storage works
   - ⚠️ **FIX**: Default name handling

**Current Implementation**:
- Lines 62-73: Input field creation
- Lines 94-103: Validation and storage
- Line 97: Alert if empty (should use default)

**What to Change**:
```typescript
// In handleSubmit() method (line 94):
private handleSubmit(): void {
  const name = this.input?.value.trim() || '';
  if (name.length === 0) {
    // Instead of alert, use default name
    const defaultName = 'Explorer';
    this.saveRepository.setPlayerName(defaultName);
    this.sceneManager.transitionTo('iss');
    return;
  }
  this.saveRepository.setPlayerName(name);
  this.sceneManager.transitionTo('iss');
}
```

2. **`src/scenes/MoonScene.ts`** (Name usage)
   - ✅ Already uses saved name (line 44)

---

### User Story #3: ISS Tutorial
**Status**: ✅ **PARTIALLY COMPLETE** (needs puzzle integration & dialogue)

**Requirements**:
- Complete short tutorial on ISS
- Understand fuel, refueling, and puzzles
- Dialogue/tutorial guidance (use "Neil" as teacher)

**Files to Edit**:
1. **`src/scenes/ISSScene.ts`** (Main tutorial scene)
   - ✅ Ship movement (WASD)
   - ✅ Fuel system (drains when moving)
   - ✅ Refuel station (orange rectangle)
   - ✅ Quiz after refuel
   - ⚠️ **ADD**: Tutorial dialogue system
   - ⚠️ **ADD**: Step-by-step tutorial prompts
   - ⚠️ **ADD**: "Neil" character as teacher

2. **`src/content/dialogue.ts`** (NEW FILE - Create dialogue system)
   - Create dialogue manager
   - Store tutorial dialogues
   - Character system (Neil as teacher)

**Current Implementation**:
- Lines 58-66: Ship entity creation
- Lines 80-87: Refuel station visual
- Lines 118-124: Instructions text (basic)
- Lines 149-152: Quiz trigger on refuel

**What to Change**:

**A. Create Dialogue System**:
```typescript
// src/content/dialogue.ts (NEW)
export interface Dialogue {
  id: string;
  character: string; // "Neil", "System", etc.
  text: string;
}

export class DialogueManager {
  showDialogue(dialogue: Dialogue): void {
    // Display dialogue with character name
  }
}
```

**B. Add Tutorial Steps to ISSScene**:
```typescript
// In ISSScene.init() or update():
private tutorialStep = 0;

// Step 1: Welcome
// Step 2: Movement instruction
// Step 3: Fuel explanation
// Step 4: Refuel instruction
// Step 5: Puzzle/Quiz instruction
```

**C. Update Instructions**:
- Replace static instruction box with dynamic tutorial steps
- Use DialogueManager to show Neil's messages
- Progressive disclosure (show next step after completing current)

3. **`src/data/quizzes.json`** (Already has ISS quiz)
   - ✅ Quiz exists
   - May need more questions

---

### User Story #4: Moon Travel & Exploration
**Status**: ✅ **PARTIALLY COMPLETE** (needs quiz & dialogue enhancements)

**Requirements**:
- Travel from ISS to Moon (cutscene)
- Unlock exploration mode
- Moon facts display
- Quiz questions about Moon facts
- Dialogue system (Neil as teacher)

**Files to Edit**:
1. **`src/scenes/CutsceneScene.ts`** (Cutscene animation)
   - ✅ Basic cutscene exists
   - ⚠️ **ENHANCEMENT**: Add dialogue during cutscene (Neil narrates)
   - ⚠️ **ENHANCEMENT**: More polished visuals

**Current Implementation**:
- Lines 34-76: ISS and Moon visuals
- Lines 112-121: Ship tween animation

**What to Change**:
- Add dialogue overlay during cutscene
- Neil narrates the journey
- Add background visuals (stars, Earth, etc.)

2. **`src/scenes/MoonScene.ts`** (Moon landing scene)
   - ✅ Welcome message
   - ✅ Facts display
   - ⚠️ **ADD**: Quiz about Moon facts
   - ⚠️ **ADD**: Neil's dialogue introducing Moon

**Current Implementation**:
- Lines 31-41: Moon visual
- Lines 47-58: Welcome message
- Lines 107-142: Facts display

**What to Change**:
- Add Moon quiz after facts are shown
- Add Neil's introduction dialogue
- Quiz questions should test knowledge of displayed facts

3. **`src/data/quizzes.json`** (ADD Moon quiz)
```json
{
  "iss-tutorial": { ... },
  "moon-facts": {
    "id": "moon-facts",
    "title": "Moon Facts Quiz",
    "questions": [
      {
        "question": "What is the Moon's average distance from Earth?",
        "options": [
          "384,400 kilometers",
          "500,000 kilometers",
          "250,000 kilometers",
          "1,000,000 kilometers"
        ],
        "correct": 0
      },
      // More questions based on facts.json
    ]
  }
}
```

4. **`src/data/facts.json`** (Verify/update facts)
   - ✅ Facts exist
   - Ensure facts match quiz questions

5. **`src/content/dialogue.ts`** (If creating dialogue system)
   - Moon introduction dialogue
   - Post-quiz dialogue
   - Exploration unlocked message

---

## Implementation Priority

### High Priority (Core Functionality)
1. ✅ Title Screen (mostly done, polish needed)
2. ✅ Name Entry (done, add default name)
3. ⚠️ ISS Tutorial (add dialogue/tutorial steps)
4. ⚠️ Moon Quiz (add quiz for Moon facts)

### Medium Priority (Polish)
1. Dialogue system with Neil character
2. Enhanced cutscene visuals
3. Settings menu
4. Better tutorial guidance

### Low Priority (Nice-to-Have)
1. Sound effects
2. More visual polish
3. Animation improvements

---

## Code Flow Summary

```
main.ts
  ├─> Creates EventBus, World, Stage, SaveRepository, SceneManager
  ├─> Registers all scenes
  ├─> Creates GameLoop with systems (Movement, FuelSystem)
  └─> Starts with TitleScene

TitleScene
  └─> Start button → NameScene

NameScene
  └─> Name input → SaveRepository → ISSScene

ISSScene
  ├─> Creates ship entity (ECS)
  ├─> Keyboard input → updates Velocity
  ├─> MovementSystem → updates Position
  ├─> FuelSystem → drains fuel
  ├─> TriggersSystem → detects refuel station collision
  ├─> Quiz appears after refuel
  └─> Quiz pass → CutsceneScene

CutsceneScene
  ├─> Konva Tween animates ship ISS → Moon
  ├─> Updates SaveRepository (tutorialDone, explorationUnlocked)
  └─> MoonScene

MoonScene
  ├─> Shows welcome with player name
  ├─> Displays Moon facts
  └─> "Exploration Unlocked" message
```

---

## Key Design Patterns

1. **Separation of Concerns**:
   - Rendering (Konva) separate from logic (ECS)
   - UI (DOM) separate from game entities (Konva)
   - Data (JSON) separate from code

2. **Event-Driven**:
   - Scenes communicate via EventBus
   - Systems emit events (fuel:empty, quiz:passed)

3. **Data-Driven**:
   - Quizzes and facts in JSON files
   - Easy to add content without code changes

4. **Performance**:
   - No allocations in hot paths (update loop)
   - Konva nodes created once, reused
   - Batch drawing once per frame

---

## Testing Strategy

- Unit tests for SaveRepository (persistence logic)
- Unit tests for FuelSystem (fuel drain/refuel logic)
- Integration tests for quiz logic
- Manual testing for scene transitions and UI

---

## Next Steps for User Stories

1. **User Story #2**: Fix default name handling (5 min fix)
2. **User Story #3**: Add dialogue system and tutorial steps (2-3 hours)
3. **User Story #4**: Add Moon quiz and dialogue (2-3 hours)

See individual user story sections above for specific file changes.

