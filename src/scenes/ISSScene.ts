/**
 * ISS Tutorial Scene - ship movement, fuel, refuel station, quiz
 */
import type { Scene } from '../engine/sceneManager.js';
import type { SceneManager } from '../engine/sceneManager.js';
import type { RenderStage } from '../render/stage.js';
import type { World } from '../engine/ecs/world.js';
import type { EventBus } from '../engine/events.js';
import { EventTopics } from '../engine/events/topics.js';
import type { SaveRepository } from '../persistence/SaveRepository.js';
import type { Keyboard } from '../input/keyboard.js';
import type { QuizUI } from '../ui/quiz.js';
import { Keyboard as KeyboardClass } from '../input/keyboard.js';
import { QuizUI as QuizUIClass } from '../ui/quiz.js';
import { HUD } from '../ui/hud.js';
import { DialogueManager } from '../content/dialogue.js';
import type { GameOverUI } from '../ui/gameOver.js';
import { createPosition } from '../engine/ecs/components/position.js';
import { createVelocity } from '../engine/ecs/components/velocity.js';
import { createFuel } from '../engine/ecs/components/fuel.js';
import { createSprite } from '../engine/ecs/components/sprite.js';
import { TriggersSystem } from '../engine/ecs/systems/triggers.js';
import { FuelSystem } from '../engine/ecs/systems/fuelSystem.js';
import { ObstaclesSystem } from '../engine/ecs/systems/obstacles.js';
import { PlayerInputSystem } from '../engine/ecs/systems/playerInput.js';
import { EntitiesLayer } from '../render/layers/entities.js';
import { StarfieldLayer } from '../render/layers/starfield.js';
import Konva from 'konva';
import quizDataJson from '../data/quizzes.json' with { type: 'json' };
import dialogueDataJson from '../data/dialogue.json' with { type: 'json' };
import type { DialogueSequence } from '../content/dialogue.js';
import type { QuizData } from '../ui/quiz.js';
import type { Velocity } from '../engine/ecs/components/velocity.js';
import type { Fuel } from '../engine/ecs/components/fuel.js';
import type { Position } from '../engine/ecs/components/position.js';
import { CONFIG } from '../config.js';
import { PasswordCracker } from '../ui/passwordCracker.js';

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
  private obstaclesSystem!: ObstaclesSystem;
  private playerInputSystem!: PlayerInputSystem;
  private dialogueManager: DialogueManager;
  private starfieldLayer: StarfieldLayer;
  private issImage: Konva.Image | null = null;
  private saveRepository: SaveRepository;

  private shipId: number | null = null;
  private refuelStationId: number | null = null;
  private asteroidEntities: Map<string, number> = new Map(); // obstacle id -> entity id
  private asteroidNodes: Map<string, Konva.Circle | Konva.Image> = new Map(); // obstacle id -> Konva node (circle for testing, image later)
  private speed = 200; // pixels per second
  private asteroidSpeed = 50; // pixels per second for asteroids (for future levels with moving asteroids)
  // Hitbox shrink factor is now in CONFIG for easy adjustment
  private quizShown = false;
  private tutorialStep = 0; // Track tutorial progress (will be used in Phase 4)
  private tutorialCompleted = false;
  private gameOverUI: GameOverUI;
  private knockbackDisableUntil = 0; // Timestamp when knockback movement disable ends
  private passwordCracker: PasswordCracker;
  constructor(
    sceneManager: SceneManager,
    stage: RenderStage,
    world: World,
    eventBus: EventBus,
    saveRepository: SaveRepository,
    gameOverUI: GameOverUI
  ) {
    this.sceneManager = sceneManager;
    this.stage = stage;
    this.world = world;
    this.eventBus = eventBus;
    this.saveRepository = saveRepository;
    this.keyboard = new KeyboardClass();
    this.quizUI = new QuizUIClass(eventBus);
    this.hud = new HUD();
    this.entitiesLayer = new EntitiesLayer(this.stage.entitiesLayer, world);
    this.dialogueManager = new DialogueManager();
    this.gameOverUI = gameOverUI;

    this.starfieldLayer = new StarfieldLayer(
      this.stage.backgroundLayer,
      this.stage.getWidth(),
      this.stage.getHeight()
    );
    this.passwordCracker = new PasswordCracker(this.eventBus);
    // Triggers system will be initialized after fuel system is passed
  }

  init(): void {
    // Clear world
    // Create ship entity - start at bottom left
    this.shipId = this.world.createEntity();
    this.world.addComponent(
      this.shipId,
      createPosition(100, this.stage.getHeight() - 150) // Bottom left
    );
    this.world.addComponent(this.shipId, createVelocity(0, 0));
    // Use config constants instead of magic numbers (DRY principle)
    // Start with partial fuel to force learning refueling
    this.world.addComponent(
      this.shipId,
      createFuel(CONFIG.FUEL_MAX, CONFIG.FUEL_INITIAL)
    );
    this.world.addComponent(this.shipId, createSprite('ship'));

    // Create refuel station entity (for ECS tracking) - top right
    this.refuelStationId = this.world.createEntity();
    this.world.addComponent(
      this.refuelStationId,
      createPosition(this.stage.getWidth() - 200, 100)
    );
    this.world.addComponent(this.refuelStationId, createSprite('refuel-station'));

    // Load and display ISS image as the refuel station (replaces orange rectangle)
    this.loadISS();

    // Initialize triggers system
    const fuelSystem = new FuelSystem(this.eventBus);
    this.triggersSystem = new TriggersSystem(fuelSystem);
    this.obstaclesSystem = new ObstaclesSystem();
    this.obstaclesSystem.setStageDimensions(this.stage.getWidth(), this.stage.getHeight());
    // Set callback for when knockback occurs to disable movement temporarily
    this.obstaclesSystem.setOnKnockbackCallback(() => {
      const KNOCKBACK_DISABLE_MS = 200; // Disable movement for 200ms (0.2 seconds)
      this.knockbackDisableUntil = Date.now() + KNOCKBACK_DISABLE_MS;
    });
    this.playerInputSystem = new PlayerInputSystem(this.keyboard, this.speed);
    this.playerInputSystem.setPlayerEntity(this.shipId);
    // Set condition for when input should be processed
    this.playerInputSystem.setCondition(() => {
      if (!this.shipId) return false;
      const fuel = this.world.getComponent<Fuel>(this.shipId, 'fuel');
      const now = Date.now();
      return fuel !== null && 
             fuel !== undefined &&
             fuel.current > 0 && 
             this.tutorialCompleted && 
             !this.dialogueManager.isShowing() && 
             !this.gameOverUI.isShowing() && 
             !this.quizUI.isShowing() &&
             !this.passwordCracker.isShowing()
             now >= this.knockbackDisableUntil; // Allow movement only after knockback disable period ends
    });
    // Trigger will be added/updated in loadISS() after image loads with correct dimensions
    
    // Create obstacles
    this.createObstacles();

    // Sync entities for rendering
    this.entitiesLayer.syncEntities();

    // Start tutorial with welcome dialogue
    this.startTutorial();
    
    this.stage.backgroundLayer.batchDraw();
    this.stage.uiLayer.batchDraw();

    // Listen for quiz completion
    this.eventBus.on(EventTopics.QUIZ_PASSED, () => {
      // Show success message after refueling and passing quiz
      this.dialogueManager.showSequence('refuel-success', () => {
        this.eventBus.emit(EventTopics.CUTSCENE_START, { cutsceneId: 'iss-to-moon' });
        this.sceneManager.transitionTo('cutscene');
      });
    });


    // Listen for fuel empty
    this.eventBus.on(EventTopics.FUEL_EMPTY, () => {
      // Stop movement when fuel is empty
      if (this.shipId) {
        const velocity = this.world.getComponent<Velocity>(this.shipId, 'velocity');
        if (velocity) {
          velocity.vx = 0;
          velocity.vy = 0;
        }
      }
      // Show fuel empty dialog
      this.showFuelEmptyDialog();
    });

    // Listen for refuel - show quiz after successful refuel (the puzzle)
    // Note: This will be changed in Phase 5 to show quiz BEFORE refueling
    this.eventBus.on('minigame:passed', (e) => {
      if(e.minigameId === 'iss-refuel-puzzle'){
        this.showQuiz()
      }
    });


    this.eventBus.on(EventTopics.FUEL_REFUELED, () => {
      if (!this.quizShown) {
        this.dialogueManager.showSequence('password-hint', () => {
          this.showPasswordGame();
        });
        this.quizShown = true;
      }
    });
  }

  /**
   * Start tutorial sequence
   */
  private startTutorial(): void {
    this.tutorialStep = 0;
    // Get player name and customize first dialogue
    const playerName = this.saveRepository.getPlayerName() || 'Explorer';
    const customizedDialogue = this.getCustomizedDialogue(playerName);
    
    // Show welcome dialogue
    this.dialogueManager.showSequence('iss-tutorial', () => {
      this.tutorialStep = 1; // Tutorial dialogue completed
      // tutorialStep will be used in Phase 4 for progressive tutorial steps
      void this.tutorialStep; // Suppress unused warning - will be used later
      this.onTutorialStepComplete();
    }, customizedDialogue);
  }

  /**
   * Get customized dialogue with player name
   */
  private getCustomizedDialogue(playerName: string): DialogueSequence {
    const sequences = dialogueDataJson as DialogueSequence;
    const tutorialSequence = sequences['iss-tutorial'];
    
    if (!tutorialSequence) {
      return { 'iss-tutorial': [] };
    }
    
    // Clone the sequence and customize the first dialogue
    const customized = [...tutorialSequence];
    const firstDialogue = customized[0];
    if (firstDialogue) {
      customized[0] = {
        ...firstDialogue,
        text: `Hello ${playerName}! My name is Neil DePaws Tyson, and I'll be your guide on this journey. Welcome to the International Space Station tutorial!`
      };
    }
    
    return {
      'iss-tutorial': customized
    };
  }

  /**
   * Load and display ISS image as the refuel station
   */
  private loadISS(): void {
    const issImg = new Image();
    issImg.onload = () => {
      // Create Konva Image node with fixed dimensions for docking station
      // Position in top right corner
      const stationX = this.stage.getWidth() - 200;
      const stationY = 100;
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
      // Fallback: draw a placeholder rectangle in top right
      const placeholder = new Konva.Rect({
        x: this.stage.getWidth() - 200 - 90,
        y: 100 - 60,
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
   * Create obstacles that drain fuel when hit
   * Asteroids move in random directions
   */
  private createObstacles(): void {
    // Create 3-4 obstacles between bottom left (start) and top right (ISS)
    const obstacles = [
      { x: 300, y: this.stage.getHeight() - 200, width: 60, height: 60 },
      { x: 500, y: 400, width: 70, height: 70 },
      { x: 700, y: 200, width: 65, height: 65 },
      { x: 900, y: 300, width: 60, height: 60 },
    ];

    obstacles.forEach((obstacle, index) => {
      const obstacleId = `obstacle-${index}`;
      
      // Create ECS entity for asteroid
      const asteroidEntityId = this.world.createEntity();
      this.asteroidEntities.set(obstacleId, asteroidEntityId);
      
      // Add components to entity (no velocity = stationary)
      this.world.addComponent(asteroidEntityId, createPosition(obstacle.x, obstacle.y));
      this.world.addComponent(asteroidEntityId, createSprite('asteroid'));
      
      // Calculate hitbox - use obstacle size with shrink factor
      // For circles, we'll use the smaller dimension as diameter
      const hitboxSize = Math.min(obstacle.width, obstacle.height);
      const hitboxWidth = hitboxSize * CONFIG.ASTEROID_HITBOX_SHRINK;
      const hitboxHeight = hitboxSize * CONFIG.ASTEROID_HITBOX_SHRINK;
      
      // Center the hitbox within the obstacle area
      const hitboxOffsetX = (obstacle.width - hitboxWidth) / 2;
      const hitboxOffsetY = (obstacle.height - hitboxHeight) / 2;
      
      // Add obstacle to system
      this.obstaclesSystem.addObstacle({
        id: obstacleId,
        entityId: asteroidEntityId,
        width: hitboxWidth,
        height: hitboxHeight,
        fuelDrain: CONFIG.FUEL_DRAIN_PER_COLLISION,
        offsetX: hitboxOffsetX,
        offsetY: hitboxOffsetY,
      });
      
      // Calculate collision center (what collision detection uses)
      const asteroidInfo = this.obstaclesSystem.calculateAsteroidCenter(
        { x: obstacle.x, y: obstacle.y },
        this.obstaclesSystem.getObstacle(obstacleId)!
      );
      
      // Load asteroid image
      const asteroidImg = new Image();
      asteroidImg.onload = () => {
        // Calculate image dimensions maintaining aspect ratio
        let imageWidth = obstacle.width;
        let imageHeight = obstacle.height;
        
        if (asteroidImg.width && asteroidImg.height) {
          const aspectRatio = asteroidImg.width / asteroidImg.height;
          if (aspectRatio > 1) {
            // Image is wider - fit to width
            imageHeight = imageWidth / aspectRatio;
          } else {
            // Image is taller - fit to height
            imageWidth = imageHeight * aspectRatio;
          }
        }
        
        // Position image so its center matches collision center
        // Image top-left = collision center - imageSize/2
        const asteroidNode = new Konva.Image({
          x: asteroidInfo.x - imageWidth / 2,
          y: asteroidInfo.y - imageHeight / 2,
          image: asteroidImg,
          width: imageWidth,
          height: imageHeight,
          opacity: 0.9,
        });
        
        this.asteroidNodes.set(obstacleId, asteroidNode);
        this.stage.backgroundLayer.add(asteroidNode);
        this.stage.backgroundLayer.batchDraw();
      };
      
      asteroidImg.onerror = () => {
        console.error('Failed to load asteroid image:', '/asteroid-obstacle.png');
        // Fallback to circle
        const asteroidCircle = new Konva.Circle({
          x: asteroidInfo.x,
          y: asteroidInfo.y,
          radius: asteroidInfo.radius,
          fill: '#ff6b6b',
          stroke: '#ff4444',
          strokeWidth: 2,
          opacity: 0.8,
        });
        this.asteroidNodes.set(obstacleId, asteroidCircle);
        this.stage.backgroundLayer.add(asteroidCircle);
      };
      
      asteroidImg.src = '/asteroid-obstacle.png';
    });
    
    this.stage.backgroundLayer.batchDraw();
  }

  /**
   * Handle tutorial step completion
   */
  private onTutorialStepComplete(): void {
    // Tutorial dialogue sequence completed
    // Player can now start moving
    this.tutorialCompleted = true;
  }

  /**
   * Show fuel empty dialog with restart option
   */
  private showFuelEmptyDialog(): void {
    this.gameOverUI.show({
      title: 'Oh no! Out of fuel',
      message: 'Your spacecraft has run out of fuel. Don\'t worry, you can restart and try again!',
      buttonText: 'Restart',
      onRestart: () => {
        this.restartTutorial();
      },
    });
  }

  /**
   * Restart the tutorial - reset fuel, position, and state
   */
  private restartTutorial(): void {
    // Hide game over dialog
    this.gameOverUI.hide();

    // Reset ship position to start
    if (this.shipId) {
      const position = this.world.getComponent<Position>(this.shipId, 'position');
      if (position) {
        position.x = 100;
        position.y = this.stage.getHeight() - 150;
      }

      // Reset velocity
      const velocity = this.world.getComponent<Velocity>(this.shipId, 'velocity');
      if (velocity) {
        velocity.vx = 0;
        velocity.vy = 0;
      }

      // Reset fuel to initial amount (use config constant - DRY principle)
      const fuel = this.world.getComponent<Fuel>(this.shipId, 'fuel');
      if (fuel) {
        fuel.current = CONFIG.FUEL_INITIAL;
      }

      // Reset rotation
      if (position) {
        position.angle = 0;
      }
    }

    // Clear any fuel empty flags (handled by FuelSystem reset on refuel)

    // Reset tutorial state
    this.tutorialCompleted = false;
    this.quizShown = false;
    this.tutorialStep = 0;

    // Restart tutorial dialogue
    this.startTutorial();
  }

  update(dt: number): void {
    // Update obstacles system (check collisions)
    this.obstaclesSystem.update(dt, this.world);
    
    // Update triggers system (check refuel station)
    this.triggersSystem.update(dt, this.world);


    // Update player input (RotationSystem is handled by the game loop automatically)
    if (this.playerInputSystem) {
      this.playerInputSystem.update(dt, this.world);
    }

    // Update starfield animation
    this.starfieldLayer.update(dt);

    // Update asteroid positions (sync Konva nodes with entity positions)
    // Note: Circles are centered at the hitbox center
    for (const [obstacleId, entityId] of this.asteroidEntities.entries()) {
      const position = this.world.getComponent<Position>(entityId, 'position');
      const asteroidNode = this.asteroidNodes.get(obstacleId);
      
      if (position && asteroidNode) {
        const obstacle = this.obstaclesSystem.getObstacle(obstacleId);
        if (obstacle) {
          // Calculate collision center (same as collision detection)
          const asteroidInfo = this.obstaclesSystem.calculateAsteroidCenter(position, obstacle);
          
          if (asteroidNode instanceof Konva.Circle) {
            // Fallback circle - center matches collision center
            asteroidNode.x(asteroidInfo.x);
            asteroidNode.y(asteroidInfo.y);
            asteroidNode.radius(asteroidInfo.radius);
          } else if (asteroidNode instanceof Konva.Image) {
            // Position image so its center matches collision center
            // Image top-left = collision center - imageSize/2
            const imageWidth = asteroidNode.width();
            const imageHeight = asteroidNode.height();
            asteroidNode.x(asteroidInfo.x - imageWidth / 2);
            asteroidNode.y(asteroidInfo.y - imageHeight / 2);
          }
        }
      }
    }

    // Update HUD
    if (this.shipId) {
      const fuel = this.world.getComponent<Fuel>(this.shipId, 'fuel');
      if (fuel) {
        this.hud.updateFuel(fuel.current, fuel.max);
      }
    }
  }



  private showPasswordGame(): void {
    this.passwordCracker.show({
      id: 'iss-refuel-puzzle',
      title: 'ISS Refuel System',
      puzzleSetKey:'iss'
    });
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
    // Hide gameOverUI if showing (don't dispose - it's shared across scenes)
    if (this.gameOverUI.isShowing()) {
      this.gameOverUI.hide();
    }
    // Clean up asteroid entities
    for (const entityId of this.asteroidEntities.values()) {
      this.world.removeEntity(entityId);
    }
    this.asteroidEntities.clear();
    this.asteroidNodes.clear();
    
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

