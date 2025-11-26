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
import { RotationSystem } from './engine/ecs/systems/rotation.js';
import { TitleScene } from './scenes/TitleScene.js';
import { NameScene } from './scenes/NameScene.js';
import { ISSScene } from './scenes/ISSScene.js';
import { CutsceneScene } from './scenes/CutsceneScene.js';
import { MoonScene } from './scenes/MoonScene.js';
import { GameOverUI } from './ui/gameOver.js';

function init(): void {
  // Get container
  const container = document.getElementById('game-container');
  if (!container) {
    return;
  }

  // Create core systems
  const eventBus = createEventBus();
  const world = new World();
  const stage = new RenderStage(container);
  const saveRepository = new SaveRepository(eventBus);
  const sceneManager = new SceneManager(eventBus);
  const gameOverUI = new GameOverUI(); // Shared GameOverUI for all scenes

  // Register scenes
  sceneManager.register(
    'title',
    () => new TitleScene(sceneManager, stage, gameOverUI)
  );
  sceneManager.register(
    'name',
    () => new NameScene(sceneManager, stage, saveRepository, gameOverUI)
  );
  sceneManager.register(
    'iss',
    () =>
      new ISSScene(
        sceneManager,
        stage,
        world,
        eventBus,
        saveRepository,
        gameOverUI
      )
  );
  sceneManager.register(
    'cutscene',
    () => new CutsceneScene(sceneManager, stage, saveRepository, gameOverUI)
  );
  sceneManager.register(
    'moon',
    () =>
      new MoonScene(sceneManager, stage, eventBus, saveRepository, gameOverUI)
  );

  // Create and register systems
  const movementSystem = new MovementSystem();
  const fuelSystem = new FuelSystem(eventBus);
  const rotationSystem = new RotationSystem();

  // Create game loop
  const loop = new GameLoop(sceneManager, world);
  loop.registerSystem(movementSystem);
  loop.registerSystem(fuelSystem);
  loop.registerSystem(rotationSystem);

  // Start with title scene
  sceneManager.transitionTo('title');

  // Start game loop
  loop.start();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
