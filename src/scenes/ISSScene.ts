/**
 * ISS Tutorial Scene - ship movement, fuel, refuel station, quiz
 */
import type { Scene } from '../engine/sceneManager.js';
import type { SceneManager } from '../engine/sceneManager.js';
import type { RenderStage } from '../render/stage.js';
import type { World } from '../engine/ecs/world.js';
import type { EventBus } from '../engine/events.js';
import type { Keyboard } from '../input/keyboard.js';
import type { QuizUI } from '../ui/quiz.js';
import { Keyboard as KeyboardClass } from '../input/keyboard.js';
import { QuizUI as QuizUIClass } from '../ui/quiz.js';
import { HUD } from '../ui/hud.js';
import { createPosition } from '../engine/ecs/components/position.js';
import { createVelocity } from '../engine/ecs/components/velocity.js';
import { createFuel } from '../engine/ecs/components/fuel.js';
import { createSprite } from '../engine/ecs/components/sprite.js';
import { TriggersSystem } from '../engine/ecs/systems/triggers.js';
import { FuelSystem } from '../engine/ecs/systems/fuelSystem.js';
import { EntitiesLayer } from '../render/layers/entities.js';
import Konva from 'konva';
import quizDataJson from '../data/quizzes.json' with { type: 'json' };
import type { QuizData } from '../ui/quiz.js';
import type { Velocity } from '../engine/ecs/components/velocity.js';
import type { Fuel } from '../engine/ecs/components/fuel.js';
import type { Position } from '../engine/ecs/components/position.js';

export class ISSScene implements Scene {
  private sceneManager: SceneManager;
  private stage: RenderStage;
  private world: World;
  private eventBus: EventBus;
  private keyboard: Keyboard;
  private quizUI: QuizUI;
  private hud: HUD;
  private entitiesLayer: EntitiesLayer;
  private triggersSystem!: TriggersSystem;

  private shipId: number | null = null;
  private refuelStationId: number | null = null;
  private speed = 200; // pixels per second
  private quizShown = false;

  constructor(
    sceneManager: SceneManager,
    stage: RenderStage,
    world: World,
    eventBus: EventBus
  ) {
    this.sceneManager = sceneManager;
    this.stage = stage;
    this.world = world;
    this.eventBus = eventBus;
    this.keyboard = new KeyboardClass();
    this.quizUI = new QuizUIClass(eventBus);
    this.hud = new HUD();
    this.entitiesLayer = new EntitiesLayer(this.stage.entitiesLayer, world);
    // Triggers system will be initialized after fuel system is passed
  }

  init(): void {
    // Clear world
    // Create ship entity
    this.shipId = this.world.createEntity();
    this.world.addComponent(
      this.shipId,
      createPosition(this.stage.getWidth() / 2 - 200, this.stage.getHeight() / 2)
    );
    this.world.addComponent(this.shipId, createVelocity(0, 0));
    this.world.addComponent(this.shipId, createFuel(100, 100)); // max: 100, start: 100
    this.world.addComponent(this.shipId, createSprite('ship'));

    // Create refuel station
    this.refuelStationId = this.world.createEntity();
    this.world.addComponent(
      this.refuelStationId,
      createPosition(this.stage.getWidth() / 2 + 200, this.stage.getHeight() / 2)
    );
    this.world.addComponent(this.refuelStationId, createSprite('refuel-station'));

    // Draw refuel station as a rectangle
    const station = new Konva.Rect({
      x: this.stage.getWidth() / 2 + 200 - 30,
      y: this.stage.getHeight() / 2 - 30,
      width: 60,
      height: 60,
      fill: '#ffaa00',
      stroke: '#ff8800',
      strokeWidth: 2,
    });
    this.stage.backgroundLayer.add(station);

    // Initialize triggers system
    const fuelSystem = new FuelSystem(this.eventBus);
    this.triggersSystem = new TriggersSystem(fuelSystem);
    this.triggersSystem.addTrigger({
      id: 'refuel-1',
      x: this.stage.getWidth() / 2 + 200 - 30,
      y: this.stage.getHeight() / 2 - 30,
      width: 60,
      height: 60,
      type: 'refuel',
    });

    // Sync entities for rendering
    this.entitiesLayer.syncEntities();

    // Add instructions text
    const instructions = new Konva.Rect({
      x: 20,
      y: 20,
      width: 300,
      height: 120,
      fill: 'rgba(0, 0, 0, 0.7)',
      cornerRadius: 8,
    });
    this.stage.uiLayer.add(instructions);

    const instructionsText = new Konva.Text({
      text: 'WASD/Arrows to move\nDock at orange station to refuel\nPass the quiz to continue',
      x: 30,
      y: 30,
      fontSize: 16,
      fontFamily: 'Arial',
      fill: '#ffffff',
    });
    this.stage.uiLayer.add(instructionsText);
    this.stage.backgroundLayer.batchDraw();
    this.stage.uiLayer.batchDraw();

    // Listen for quiz completion
    this.eventBus.on('quiz:passed', () => {
      this.eventBus.emit('cutscene:start', { cutsceneId: 'iss-to-moon' });
      this.sceneManager.transitionTo('cutscene');
    });

    // Listen for fuel empty
    this.eventBus.on('fuel:empty', () => {
      // Stop movement when fuel is empty
      if (this.shipId) {
        const velocity = this.world.getComponent<Velocity>(this.shipId, 'velocity');
        if (velocity) {
          velocity.vx = 0;
          velocity.vy = 0;
        }
      }
    });

    // Listen for refuel - show quiz after successful refuel (the puzzle)
    this.eventBus.on('fuel:refueled', () => {
      if (!this.quizShown) {
        this.showQuiz();
        this.quizShown = true;
      }
    });
  }

  update(dt: number): void {
    // Update keyboard input
    const keys = this.keyboard.getState();

    if (!this.shipId) return;

    const velocity = this.world.getComponent<Velocity>(this.shipId, 'velocity');
    const fuel = this.world.getComponent<Fuel>(this.shipId, 'fuel');
    const position = this.world.getComponent<Position>(this.shipId, 'position');

    if (!velocity || !fuel || !position) return;

    // Only allow movement if fuel > 0
    if (fuel.current > 0) {
      velocity.vx = 0;
      velocity.vy = 0;

      if (keys.left) velocity.vx = -this.speed;
      if (keys.right) velocity.vx = this.speed;
      if (keys.up) velocity.vy = -this.speed;
      if (keys.down) velocity.vy = this.speed;
    } else {
      velocity.vx = 0;
      velocity.vy = 0;
    }

    // Update triggers
    this.triggersSystem.update(dt, this.world);

    // Update HUD
    this.hud.updateFuel(fuel.current, fuel.max);
  }

  private showQuiz(): void {
    const quiz = (quizDataJson as Record<string, QuizData>)['iss-tutorial'];
    if (quiz) {
      this.quizUI.showQuiz(quiz);
    }
  }

  render(): void {
    this.entitiesLayer.render();
    this.stage.batchDraw();
  }

  dispose(): void {
    this.keyboard.dispose();
    this.quizUI.dispose();
    this.hud.dispose();
    if (this.shipId) {
      this.world.removeEntity(this.shipId);
    }
    if (this.refuelStationId) {
      this.world.removeEntity(this.refuelStationId);
    }
    this.stage.backgroundLayer.destroyChildren();
    this.stage.entitiesLayer.destroyChildren();
    this.stage.uiLayer.destroyChildren();
  }
}

