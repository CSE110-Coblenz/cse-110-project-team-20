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
import { DialogueManager } from '../content/dialogue.js';
import { createPosition } from '../engine/ecs/components/position.js';
import { createVelocity } from '../engine/ecs/components/velocity.js';
import { createFuel } from '../engine/ecs/components/fuel.js';
import { createSprite } from '../engine/ecs/components/sprite.js';
import { TriggersSystem } from '../engine/ecs/systems/triggers.js';
import { FuelSystem } from '../engine/ecs/systems/fuelSystem.js';
import { EntitiesLayer } from '../render/layers/entities.js';
import { StarfieldLayer } from '../render/layers/starfield.js';
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
  private dialogueManager: DialogueManager;
  private starfieldLayer: StarfieldLayer;
  private issImage: Konva.Image | null = null;

  private shipId: number | null = null;
  private refuelStationId: number | null = null;
  private speed = 200; // pixels per second
  private quizShown = false;
  private tutorialStep = 0; // Track tutorial progress (will be used in Phase 4)
  private tutorialCompleted = false;

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
    this.dialogueManager = new DialogueManager();
    this.starfieldLayer = new StarfieldLayer(
      this.stage.backgroundLayer,
      this.stage.getWidth(),
      this.stage.getHeight()
    );
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
    // Start with partial fuel (30% = 30 out of 100) to force learning refueling
    this.world.addComponent(this.shipId, createFuel(100, 30)); // max: 100, start: 30
    this.world.addComponent(this.shipId, createSprite('ship'));

    // Create refuel station entity (for ECS tracking)
    this.refuelStationId = this.world.createEntity();
    this.world.addComponent(
      this.refuelStationId,
      createPosition(this.stage.getWidth() / 2 + 200, this.stage.getHeight() / 2)
    );
    this.world.addComponent(this.refuelStationId, createSprite('refuel-station'));

    // Load and display ISS image as the refuel station (replaces orange rectangle)
    this.loadISS();

    // Initialize triggers system
    const fuelSystem = new FuelSystem(this.eventBus);
    this.triggersSystem = new TriggersSystem(fuelSystem);
    // Trigger will be added/updated in loadISS() after image loads with correct dimensions

    // Sync entities for rendering
    this.entitiesLayer.syncEntities();

    // Start tutorial with welcome dialogue
    this.startTutorial();
    
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
    // Note: This will be changed in Phase 5 to show quiz BEFORE refueling
    this.eventBus.on('fuel:refueled', () => {
      if (!this.quizShown) {
        this.showQuiz();
        this.quizShown = true;
      }
    });
  }

  /**
   * Start tutorial sequence
   */
  private startTutorial(): void {
    this.tutorialStep = 0;
    // Show welcome dialogue
    this.dialogueManager.showSequence('iss-tutorial', () => {
      this.tutorialStep = 1; // Tutorial dialogue completed
      // tutorialStep will be used in Phase 4 for progressive tutorial steps
      void this.tutorialStep; // Suppress unused warning - will be used later
      this.onTutorialStepComplete();
    });
  }

  /**
   * Load and display ISS image as the refuel station
   */
  private loadISS(): void {
    const issImg = new Image();
    issImg.onload = () => {
      // Create Konva Image node with fixed dimensions for docking station
      // Position where the orange rectangle was (center-right, where player docks)
      const stationX = this.stage.getWidth() / 2 + 200;
      const stationY = this.stage.getHeight() / 2;
      const stationWidth = 180;
      const stationHeight = 120;
      
      // Calculate aspect ratio to maintain image proportions
      let width = stationWidth;
      let height = stationHeight;
      
      if (issImg.width && issImg.height) {
        const aspectRatio = issImg.width / issImg.height;
        if (aspectRatio > stationWidth / stationHeight) {
          // Image is wider - fit to width
          height = width / aspectRatio;
        } else {
          // Image is taller - fit to height
          width = height * aspectRatio;
        }
      }

      this.issImage = new Konva.Image({
        x: stationX - width / 2, // Center horizontally on station position
        y: stationY - height / 2, // Center vertically on station position
        image: issImg,
        width: width,
        height: height,
        opacity: 0.9,
      });

      // Add ISS label below the image
      const issLabel = new Konva.Text({
        text: 'ISS',
        x: stationX,
        y: stationY + height / 2 + 10,
        fontSize: 24,
        fontFamily: 'Arial',
        fill: '#ffffff',
        fontWeight: 'bold',
        align: 'center',
      });
      issLabel.offsetX(issLabel.width() / 2);

      // Add to background layer
      this.stage.backgroundLayer.add(this.issImage);
      this.stage.backgroundLayer.add(issLabel);
      
      // Update trigger collision box to match ISS image size
      // The trigger system is initialized, so we can add/update the trigger
      // Remove existing trigger if it exists, then add new one with correct dimensions
      try {
        this.triggersSystem.removeTrigger('refuel-1');
      } catch (e) {
        // Trigger might not exist yet, that's okay
      }
      this.triggersSystem.addTrigger({
        id: 'refuel-1',
        x: stationX - width / 2,
        y: stationY - height / 2,
        width: width,
        height: height,
        type: 'refuel',
      });
      
      this.stage.backgroundLayer.batchDraw();
    };
    issImg.onerror = () => {
      console.error('Failed to load ISS image:', '/iss-bg.png');
      // Fallback: draw a placeholder rectangle
      const placeholder = new Konva.Rect({
        x: this.stage.getWidth() / 2 + 200 - 90,
        y: this.stage.getHeight() / 2 - 60,
        width: 180,
        height: 120,
        fill: '#aaaaaa',
        stroke: '#888888',
        strokeWidth: 2,
        opacity: 0.9,
      });
      this.stage.backgroundLayer.add(placeholder);
      this.stage.backgroundLayer.batchDraw();
    };
    issImg.src = '/iss-bg.png';
  }

  /**
   * Handle tutorial step completion
   */
  private onTutorialStepComplete(): void {
    // Tutorial dialogue sequence completed
    // Player can now start moving
    this.tutorialCompleted = true;
  }

  update(dt: number): void {
    // Update keyboard input
    const keys = this.keyboard.getState();

    if (!this.shipId) return;

    const velocity = this.world.getComponent<Velocity>(this.shipId, 'velocity');
    const fuel = this.world.getComponent<Fuel>(this.shipId, 'fuel');
    const position = this.world.getComponent<Position>(this.shipId, 'position');

    if (!velocity || !fuel || !position) return;

    // Only allow movement if fuel > 0 AND tutorial dialogue is complete
    if (fuel.current > 0 && this.tutorialCompleted && !this.dialogueManager.isShowing()) {
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

    // Update starfield animation
    this.starfieldLayer.update(dt);

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
    this.starfieldLayer.render();
    this.entitiesLayer.render();
    this.stage.batchDraw();
  }

  dispose(): void {
    this.keyboard.dispose();
    this.quizUI.dispose();
    this.hud.dispose();
    this.dialogueManager.dispose();
    if (this.shipId) {
      this.world.removeEntity(this.shipId);
    }
    if (this.refuelStationId) {
      this.world.removeEntity(this.refuelStationId);
    }
    this.stage.backgroundLayer.destroyChildren();
    this.stage.entitiesLayer.destroyChildren();
    this.stage.uiLayer.destroyChildren();
    this.issImage = null;
  }
}

