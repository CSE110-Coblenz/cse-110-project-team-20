### Cat Space Agency
Cat Space Agency is a browser game designated for middle schoolers to teach them about the planets in the solar system. They play as an astronaut that is tasked with exploring the solar system and collecting data. They will have to apply strategic thinking regarding having to refuel their rocket ship and avoiding asteroids. 
---
### High-Level Overview
This project is a TypeScript/Konva browser game built around an ECS (Entity-Component-System) engine and a small scene manager that orchestrates educational space missions, quizzes, and exploration across the solar system.

---

### Core Engine (`src/engine`)
- **`sceneManager.ts`** – Owns the scene stack and transitions; each scene implements a simple `Scene` interface (`init`, `update`, `render`, `dispose`) so the rest of the game can swap scenes without knowing their internals.
- **`loop.ts`** – Runs the main game loop with `requestAnimationFrame`, computing `dt` and calling `currentScene.update/render` plus `RenderStage.batchDraw()` once per frame.
- **`events.ts` + `events/topics.ts`** – Lightweight pub/sub event bus with typed `EventTopics` (fuel empty, quiz passed, cutscene start, etc.) so systems and UI can talk without tight coupling.
- **`time.ts`** – Small utilities for tracking elapsed time and frame timing; used by systems that need consistent animations or cooldowns.

#### ECS (`src/engine/ecs`)
- **`world.ts`** – Core ECS registry; stores entities and their components, and gives systems a way to query/add/remove components in a type-safe way.
- **`components/*.ts`** – Atomic data pieces: `position`, `velocity`, `sprite`, `fuel`, and `dataCapsule` describe where something is, how it moves, what it draws, and what gameplay data it carries.
- **`systems/movement.ts`** – Integrates velocity into position over time to move entities each frame.
- **`systems/playerInput.ts`** – Reads keyboard state and converts it into thrust/rotation on the player ship, but only when fuel, UI, and knockback rules allow it.
- **`systems/fuelSystem.ts`** – Manages fuel drain and refuel events, emitting `FUEL_EMPTY` and `FUEL_REFUELED` so scenes can react.
- **`systems/obstacles.ts`** – Tracks asteroid hitboxes, calculates collisions against the ship, applies knockback, and drains fuel using `FuelSystem`.
- **`systems/triggers.ts`** – Rectangular triggers (like refuel zones) that fire when the player overlaps, wiring ECS positions to higher-level events.
- **`systems/dataCapsules.ts`** – Manages collectible capsules, tracks what’s been collected, and emits intel/fact events for the quiz and intel UI.
- **`types.ts`** – Shared ECS type definitions and helpers for components and systems.

---

### Rendering (`src/render`)
- **`stage.ts`** – Wraps Konva’s `Stage` and layers (`backgroundLayer`, `entitiesLayer`, `uiLayer`) and exposes a `batchDraw()` to render all layers efficiently.
- **`layers/background.ts`** – Utilities for drawing static background shapes and decorative elements.
- **`layers/entities.ts`** – Renders ECS entities by reading `position`/`sprite` components and mapping them to Konva nodes (ship sprite, asteroids, capsules), including the scaled ship collision circle.
- **`layers/starfield.ts`** – Animated starfield background used by exploration scenes to give depth and movement.
- **`layers/ui.ts`** – Helpers for UI overlays drawn on the Konva `uiLayer` (e.g., ISS image, planet icons).
- **`titleSceneBackground.ts`** – Renders the title screen Earth + stars visual behind the title UI.
- **`moonSceneBackground.ts`** – Renders the static Moon scene background used for the pre-exploration story scene.

---

### Scenes (`src/scenes`)
- **`TitleScene.ts`** – Landing screen with “Cat Space Agency” branding and a start button that transitions into the player name entry flow.
- **`NameScene.ts`** – Simple form scene to capture the player’s name and save it via `SaveRepository` so dialogue can be personalized.
- **`ISSScene.ts`** – Tutorial level around the ISS that teaches movement, fuel, obstacles, refueling, and the mini password-cracker, then routes into the first cutscene.
- **`MoonScene.ts`** – Narrative cutscene-like scene that introduces the Moon mission and first quiz in a more static, guided context.
- **`PlanetExplorationScene.ts` (impl in `MoonExplorationScene.ts`)** – Main free-fly exploration scene parameterized by `planetId` (Moon, Mercury, Earth, etc.), spawning asteroids, capsules, refuel stations, and a planet destination icon with per-planet difficulty, intel collection, and quizzes.
- **`CutsceneScene.ts`** – Animated travel sequence that shows “Traveling from A to B” with planet sprites and transitions between scenes after spaceflight segments.
- **`PlaceholderPlanetScene.ts`** – Simple “Coming soon” scene for any planet routes that don’t yet have full exploration content, reusing planet selection to send players elsewhere.
- **`ISSScene.ts`** – Handles the ISS docking, movement practice, refueling tutorial, and quiz introduction; cleans up all IK/password UI when disposed so it doesn’t leak into other scenes.

---

### UI & HUD (`src/ui`)
- **`hud.ts`** – Fuel bar UI with `show`, `dispose`, and `updateFuel` so scenes can toggle it while keeping a single visual style.
- **`gameOver.ts`** – Reusable “Game Over / Out of Fuel” dialog that scenes call with callbacks to restart or quit.
- **`quiz.ts`** – Quiz dialog component that renders planet- and topic-specific questions from `quizzes.json`, handles answers, and emits `QUIZ_PASSED` events.
- **`quizConfirmation.ts`** – Small confirmation dialog asking whether to take the quiz early or collect more intel.
- **`planetSelection.ts`** – Planet selection modal listing Mercury→Neptune (plus Moon), marks visited planets, and calls back into scenes to trigger cutscenes and transitions.
- **`dialog.ts`** – Generic dialog shell used by other UI components to provide consistent modals.
- **`buttons.ts`** – Shared button styling and creation helpers for scenes and dialogs.
- **`passwordCracker.ts`** – ISS mini-game UI that simulates cracking a password to unlock progress, cleaned up when the ISS scene disposes so it never leaks to other scenes.

---

### Content & Data (`src/content`, `src/data`)
- **`content/dialogue.ts`** – DialogueManager that plays named dialogue sequences (Neil, DePaws Tyson, etc.) with callbacks on completion for scenes to chain actions.
- **`data/dialogue.json`** – All in-game dialogue text keyed by id (tutorials, quiz completion, hints) consumed by `DialogueManager`.
- **`data/quizzes.json`** – All quiz definitions per planet (question text, choices, correct answers) used by `QuizUI` and `PlanetExplorationScene`.
- **`data/facts.json`** – Supplemental fact data tied to capsules and quizzes to support intel collection.
- **`data/puzzle.json`** – Configuration for the ISS password puzzle and related content.

---

### Input, Persistence, and Misc
- **`input/keyboard.ts`** – Tracks keyboard state and exposes a clean API so `PlayerInputSystem` doesn’t deal with raw DOM events.
- **`persistence/SaveRepository.ts`** – Thin wrapper around `localStorage` to save player name, tutorial flags, quiz results, and visited planets, ensuring tutorials and exploration state persist between runs.
- **`ui/gameOver.ts` + `ui/dialog.ts`** – Shared base for restart flows and modal interactions across all scenes.
- **`index.html` + `main.ts`** – Vite entry point and bootstrap code: mounts Konva stage, creates core engine objects (world, event bus, scene manager), registers all scenes, and kicks off the game loop.
