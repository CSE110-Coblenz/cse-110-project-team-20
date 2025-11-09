/**
 * Main entry point - bootstraps game
 */
import { createEventBus } from './engine/events.js';
import { SceneManager } from './engine/sceneManager.js';
import { World } from './engine/ecs/world.js';
import { GameLoop } from './engine/loop.js';
import { RenderStage } from './render/stage.js';
import { SaveRepository } from './persistence/SaveRepository.js';
import { MovementSystem } from './engine/ecs/systems/movement.js';
import { FuelSystem } from './engine/ecs/systems/fuelSystem.js';
import { TitleScene } from './scenes/TitleScene.js';
import { NameScene } from './scenes/NameScene.js';
import { ISSScene } from './scenes/ISSScene.js';
import { CutsceneScene } from './scenes/CutsceneScene.js';
import { MoonScene } from './scenes/MoonScene.js';

function init(): void {
  // Get container
  const container = document.getElementById('game-container');
  if (!container) {
    console.error('Game container not found');
    return;
  }

  // Create core systems
  const eventBus = createEventBus();
  const world = new World();
  const stage = new RenderStage(container);
  const saveRepository = new SaveRepository(eventBus);
  const sceneManager = new SceneManager(eventBus);

  // Register scenes
  sceneManager.register('title', () => new TitleScene(sceneManager, stage));
  sceneManager.register('name', () => new NameScene(sceneManager, stage, saveRepository));
  sceneManager.register('iss', () => new ISSScene(sceneManager, stage, world, eventBus, saveRepository));
  sceneManager.register('cutscene', () => new CutsceneScene(sceneManager, stage, saveRepository));
  sceneManager.register('moon', () => new MoonScene(stage, saveRepository));

  // Create and register systems
  const movementSystem = new MovementSystem();
  const fuelSystem = new FuelSystem(eventBus);

  // Create game loop
  const loop = new GameLoop(sceneManager, world, eventBus);
  loop.registerSystem(movementSystem);
  loop.registerSystem(fuelSystem);

  // Start with title scene
  sceneManager.transitionTo('iss');

  // Start game loop
  loop.start();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

