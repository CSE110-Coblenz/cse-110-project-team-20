/**
 * Moon Exploration Scene - free-fly map with destination, refuel station,
 * and collectible data capsules (added in later steps).
 */
import type { Scene, SceneManager } from '../engine/sceneManager.js';
import type { RenderStage } from '../render/stage.js';
import type { World } from '../engine/ecs/world.js';
import type { EventBus } from '../engine/events.js';
import { EventTopics } from '../engine/events/topics.js';
import type { SaveRepository } from '../persistence/SaveRepository.js';
import type { GameOverUI } from '../ui/gameOver.js';
import type { Keyboard } from '../input/keyboard.js';
import type { Fuel } from '../engine/ecs/components/fuel.js';
import Konva from 'konva';
import { CONFIG } from '../config.js';
import { Keyboard as KeyboardClass } from '../input/keyboard.js';
import { HUD } from '../ui/hud.js';
import type { Position } from '../engine/ecs/components/position.js';
import { createPosition } from '../engine/ecs/components/position.js';
import type { Velocity } from '../engine/ecs/components/velocity.js';
import { createVelocity } from '../engine/ecs/components/velocity.js';
import { createFuel } from '../engine/ecs/components/fuel.js';
import { createSprite } from '../engine/ecs/components/sprite.js';
import {
  createDataCapsule,
  type CapsuleFact,
} from '../engine/ecs/components/dataCapsule.js';
import { PlayerInputSystem } from '../engine/ecs/systems/playerInput.js';
import { FuelSystem } from '../engine/ecs/systems/fuelSystem.js';
import { TriggersSystem } from '../engine/ecs/systems/triggers.js';
import { DataCapsulesSystem } from '../engine/ecs/systems/dataCapsules.js';
import { ObstaclesSystem } from '../engine/ecs/systems/obstacles.js';
import { EntitiesLayer } from '../render/layers/entities.js';
import { StarfieldLayer } from '../render/layers/starfield.js';
import { QuizUI, type QuizData } from '../ui/quiz.js';
import { QuizConfirmation } from '../ui/quizConfirmation.js';
import { DialogueManager } from '../content/dialogue.js';
import quizDataJson from '../data/quizzes.json' with { type: 'json' };
import {
  checkAABBCollision,
  createShipBoundingBox,
} from '../engine/utils/collision.js';

interface DestinationArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CapsuleDefinition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  facts: CapsuleFact[];
}

const CAPSULE_DEFINITIONS: CapsuleDefinition[] = [
  {
    id: 'tranquility-capsule',
    x: 260,
    y: 180,
    width: 72,
    height: 72,
    facts: [
      {
        id: 'tranquility-apollo-landing',
        text: 'Apollo 11\'s Eagle module touched down in the Sea of Tranquility on July 20, 1969.',
        questionId: 'moon-landing-site',
      },
      {
        id: 'tranquility-basaltic-sea',
        text: 'The Sea of Tranquility is a basaltic plain; ancient lava flows filled the basin to create its dark hue.',
        questionId: 'moon-landing-site',
      },
    ],
  },
  {
    id: 'tycho-capsule',
    x: 520,
    y: 360,
    width: 72,
    height: 72,
    facts: [
      {
        id: 'tycho-young-crater',
        text: 'Tycho Crater is only ~108 million years old — incredibly young for a lunar feature.',
        questionId: 'tycho-radial-rays',
      },
      {
        id: 'tycho-ray-system',
        text: 'Impact ejecta from Tycho forms brilliant rays that streak across the near side and are visible even with binoculars.',
        questionId: 'tycho-radial-rays',
      },
    ],
  },
  {
    id: 'copernicus-capsule',
    x: 900,
    y: 220,
    width: 72,
    height: 72,
    facts: [
      {
        id: 'copernicus-terra',
        text: 'Copernicus Crater spans roughly 93 km and boasts terraced walls carved by landslides after impact.',
        questionId: 'copernicus-structure',
      },
      {
        id: 'copernicus-peaks',
        text: 'Central peaks in Copernicus soar ~800 meters high, showcasing what makes a "complex crater."',
        questionId: 'copernicus-structure',
      },
    ],
  },
];

const QUIZZES = quizDataJson as Record<string, QuizData>;

export class MoonExplorationScene implements Scene {
  private readonly sceneManager: SceneManager;
  private readonly stage: RenderStage;
  private readonly world: World;
  private readonly eventBus: EventBus;
  private readonly saveRepository: SaveRepository;
  private readonly gameOverUI: GameOverUI;

  private readonly keyboard: Keyboard;
  private readonly hud: HUD;
  private readonly entitiesLayer: EntitiesLayer;
  private starfieldLayer: StarfieldLayer;
  private readonly playerInputSystem: PlayerInputSystem;
  private readonly triggersSystem: TriggersSystem;
  private readonly dataCapsulesSystem: DataCapsulesSystem;
  private readonly obstaclesSystem: ObstaclesSystem;
  private readonly quizUI: QuizUI;
  private readonly quizConfirmation: QuizConfirmation;
  private readonly dialogueManager: DialogueManager;
  private tutorialShown = false;

  private shipId: number | null = null;
  private refuelStationId: number | null = null;
  private refuelNode: Konva.Image | null = null;
  private moonDestinationArea: DestinationArea | null = null;
  private moonDestinationNode: Konva.Image | null = null;
  private asteroidEntities = new Map<string, number>();
  private asteroidNodes = new Map<string, Konva.Circle | Konva.Image>();
  private capsuleEntities = new Map<string, number>();
  private capsuleNodes = new Map<string, Konva.Image>();
  private knockbackDisableUntil = 0;
  private quizActive = false;
  private quizCompleted = false;
  private awaitingQuizDecision = false;
  private destinationCooldownUntil = 0;
  private intelPanel: HTMLDivElement | null = null;
  private intelCountEl: HTMLParagraphElement | null = null;
  private intelFactEl: HTMLParagraphElement | null = null;

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
    this.gameOverUI = gameOverUI;

    this.keyboard = new KeyboardClass();
    this.hud = new HUD();
    this.entitiesLayer = new EntitiesLayer(this.stage.entitiesLayer, this.world);
    // Starfield will be initialized in resetStage() with viewport size
    this.starfieldLayer = new StarfieldLayer(
      this.stage.backgroundLayer,
      CONFIG.STAGE_WIDTH, // Use viewport size, not stage size
      CONFIG.STAGE_HEIGHT
    );

    this.dataCapsulesSystem = new DataCapsulesSystem(this.eventBus);
    this.obstaclesSystem = new ObstaclesSystem();
    this.obstaclesSystem.setStageDimensions(
      this.stage.getWidth(),
      this.stage.getHeight()
    );
    this.obstaclesSystem.setOnKnockbackCallback(() => {
      const KNOCKBACK_DISABLE_MS = 200;
      this.knockbackDisableUntil = Date.now() + KNOCKBACK_DISABLE_MS;
    });
    this.playerInputSystem = new PlayerInputSystem(this.keyboard, 220);
    const fuelSystem = new FuelSystem(this.eventBus);
    this.triggersSystem = new TriggersSystem(fuelSystem);
    this.quizUI = new QuizUI(this.eventBus);
    this.quizConfirmation = new QuizConfirmation();
    this.dialogueManager = new DialogueManager();
  }

  init(): void {
    this.gameOverUI.hide();
    // Clean up any lingering dialogue from previous scenes
    this.cleanupDialogue();
    this.resetStage();
    this.createIntelPanel();

    this.createShip();
    this.createRefuelStation();
    this.createMoonDestination();
    this.createAsteroids();
    this.createDataCapsules();
    this.eventBus.on(
      EventTopics.DATA_CAPSULE_COLLECTED,
      this.handleCapsuleCollected
    );
    this.eventBus.on(
      EventTopics.DATA_CAPSULES_COMPLETE,
      this.handleCapsulesComplete
    );
    this.eventBus.on(EventTopics.QUIZ_PASSED, this.handleQuizPassed);
    this.eventBus.on(EventTopics.FUEL_EMPTY, this.handleFuelEmpty);

    // Show tutorial on first load
    if (!this.tutorialShown) {
      this.showTutorial();
      this.tutorialShown = true;
    }

    // Sync render layer state
    this.entitiesLayer.syncEntities();
    this.stage.batchDraw();
  }

  private resetStage(): void {
    this.stage.backgroundLayer.destroyChildren();
    this.stage.entitiesLayer.destroyChildren();
    this.stage.uiLayer.destroyChildren();

    // Rebuild starfield for the stage size
    this.starfieldLayer = new StarfieldLayer(
      this.stage.backgroundLayer,
      this.stage.getWidth(),
      this.stage.getHeight()
    );
  }


  /**
   * Clean up any lingering dialogue containers from previous scenes
   * Dialogue should only appear in tutorial scenes, not in moon exploration
   */
  private cleanupDialogue(): void {
    // Find dialogue containers by their distinctive styling (z-index 2000, bottom position)
    const allDivs = document.querySelectorAll('div');
    for (const div of allDivs) {
      const style = window.getComputedStyle(div);
      // Dialogue containers have z-index 2000 and are positioned at bottom
      if (
        style.zIndex === '2000' &&
        style.position === 'fixed' &&
        (style.bottom !== 'auto' || div.textContent?.includes('Neil'))
      ) {
        div.remove();
      }
    }
  }

  private createShip(): void {
    this.shipId = this.world.createEntity();
    const startX = 160; // Doubled from 80
    const startY = this.stage.getHeight() - 400; // Doubled from 200

    this.world.addComponent(this.shipId, createPosition(startX, startY));
    this.world.addComponent(this.shipId, createVelocity(0, 0));
    this.world.addComponent(
      this.shipId,
      createFuel(CONFIG.FUEL_MAX, CONFIG.FUEL_INITIAL)
    );
    this.world.addComponent(this.shipId, createSprite('ship'));

    this.playerInputSystem.setPlayerEntity(this.shipId);
    this.playerInputSystem.setCondition(() => {
      if (!this.shipId) return false;
      const fuel = this.world.getComponent<Fuel>(this.shipId, 'fuel');
      const now = Date.now();
      return (
        !!fuel &&
        fuel.current > 0 &&
        !this.gameOverUI.isShowing() &&
        !this.quizUI.isShowing() &&
        !this.quizConfirmation.isShowing() &&
        !this.dialogueManager.isShowing() &&
        now >= this.knockbackDisableUntil
      );
    });
  }

  private createRefuelStation(): void {
    this.refuelStationId = this.world.createEntity();
    const stationWidth = 140;
    const stationHeight = 120;
    const stationX = this.stage.getWidth() / 2 - stationWidth / 2;
    const stationY = this.stage.getHeight() / 2 - stationHeight / 2;

    this.world.addComponent(
      this.refuelStationId,
      createPosition(stationX, stationY)
    );
    this.world.addComponent(
      this.refuelStationId,
      createSprite('refuel-station')
    );

    this.triggersSystem.addTrigger({
      id: 'moon-refuel',
      x: stationX,
      y: stationY,
      width: stationWidth,
      height: stationHeight,
      type: 'refuel',
    });

    this.loadRefuelVisual(stationX, stationY, stationWidth, stationHeight);
  }

  private createMoonDestination(): void {
    const destinationWidth = 180;
    const destinationHeight = 180;
    const padding = 80;
    // Position moon icon to avoid overlap with fuel bar (200px wide + 20px margin = 220px from right)
    // Add extra margin to ensure visibility
    const fuelBarWidth = 220; // 200px bar + 20px margin
    const destinationX = this.stage.getWidth() - destinationWidth - fuelBarWidth;
    const destinationY = padding;

    // Apply hitbox shrink factor similar to asteroids to prevent early triggering
    const hitboxShrink = 0.75; // Same as ASTEROID_HITBOX_SHRINK
    const hitboxWidth = destinationWidth * hitboxShrink;
    const hitboxHeight = destinationHeight * hitboxShrink;
    const hitboxOffsetX = (destinationWidth - hitboxWidth) / 2;
    const hitboxOffsetY = (destinationHeight - hitboxHeight) / 2;
    
    this.moonDestinationArea = {
      x: destinationX + hitboxOffsetX,
      y: destinationY + hitboxOffsetY,
      width: hitboxWidth,
      height: hitboxHeight,
    };

    this.loadMoonDestinationVisual(
      destinationX,
      destinationY,
      destinationWidth,
      destinationHeight
    );
  }

  private loadRefuelVisual(
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const image = new Image();
    image.src = new URL('../../assets/refuel-pod.png', import.meta.url).href;
    image.onload = () => {
      this.refuelNode?.destroy();
      this.refuelNode = new Konva.Image({
        x,
        y,
        width,
        height,
        image,
        opacity: 0.95,
      });
      this.stage.backgroundLayer.add(this.refuelNode);
      this.stage.backgroundLayer.batchDraw();
    };
  }

  private loadMoonDestinationVisual(
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const image = new Image();
    image.src = new URL('../../assets/moon-icon.png', import.meta.url).href;
    image.onload = () => {
      this.moonDestinationNode?.destroy();
      this.moonDestinationNode = new Konva.Image({
        x,
        y,
        width,
        height,
        image,
      });
      this.stage.backgroundLayer.add(this.moonDestinationNode);
      this.stage.backgroundLayer.batchDraw();
    };
  }

  update(dt: number): void {
    this.playerInputSystem.update(dt, this.world);
    this.triggersSystem.update(dt, this.world);
    this.dataCapsulesSystem.update(dt, this.world);
    this.obstaclesSystem.update(dt, this.world);
    this.updateAsteroidNodes();
    this.starfieldLayer.update(dt);
    this.checkDestinationReach();

    this.updateHud();
  }

  private updateHud(): void {
    if (!this.shipId) return;
    const fuel = this.world.getComponent<Fuel>(this.shipId, 'fuel');
    if (fuel) {
      this.hud.updateFuel(fuel.current, fuel.max);
    }
  }

  render(): void {
    this.starfieldLayer.render();
    this.entitiesLayer.render();
    this.stage.batchDraw();
  }

  dispose(): void {
    this.eventBus.off(
      EventTopics.DATA_CAPSULE_COLLECTED,
      this.handleCapsuleCollected
    );
    this.eventBus.off(
      EventTopics.DATA_CAPSULES_COMPLETE,
      this.handleCapsulesComplete
    );
    this.eventBus.off(EventTopics.QUIZ_PASSED, this.handleQuizPassed);
    this.eventBus.off(EventTopics.FUEL_EMPTY, this.handleFuelEmpty);
    this.keyboard.dispose();
    this.hud.dispose();
    this.dialogueManager.dispose();
    this.dataCapsulesSystem.clear();
    this.playerInputSystem.clearPlayerEntity();
    this.destroyIntelPanel();
    this.quizUI.dispose();
    this.quizConfirmation.dispose();

    if (this.refuelNode) {
      this.refuelNode.destroy();
      this.refuelNode = null;
    }
    if (this.moonDestinationNode) {
      this.moonDestinationNode.destroy();
      this.moonDestinationNode = null;
    }

    if (this.shipId) {
      this.world.removeEntity(this.shipId);
      this.shipId = null;
    }
    if (this.refuelStationId) {
      this.world.removeEntity(this.refuelStationId);
      this.refuelStationId = null;
    }
    for (const entityId of this.asteroidEntities.values()) {
      this.world.removeEntity(entityId);
    }
    this.asteroidEntities.clear();
    this.asteroidNodes.forEach((node) => node.destroy());
    this.asteroidNodes.clear();
    for (const entityId of this.capsuleEntities.values()) {
      this.world.removeEntity(entityId);
    }
    this.capsuleEntities.clear();
    this.capsuleNodes.forEach((node) => node.destroy());
    this.capsuleNodes.clear();

    this.stage.backgroundLayer.destroyChildren();
    this.stage.entitiesLayer.destroyChildren();
    this.stage.uiLayer.destroyChildren();
  }

  private createAsteroids(): void {
    const asteroidConfigs = [
      { id: 'asteroid-1', x: 320, y: 280, width: 90, height: 90 },
      { id: 'asteroid-2', x: 540, y: 160, width: 80, height: 80 },
      { id: 'asteroid-3', x: 760, y: 420, width: 70, height: 70 },
      { id: 'asteroid-4', x: 980, y: 260, width: 85, height: 85 },
      { id: 'asteroid-5', x: 640, y: 520, width: 75, height: 75 },
    ];

    asteroidConfigs.forEach((config) => {
      const entityId = this.world.createEntity();
      const velocityMagnitude = 50 + Math.random() * 60;
      const direction = Math.random() * Math.PI * 2;
      const vx = Math.cos(direction) * velocityMagnitude;
      const vy = Math.sin(direction) * velocityMagnitude;

      this.world.addComponent(entityId, createPosition(config.x, config.y));
      this.world.addComponent(entityId, createVelocity(vx, vy));
      this.world.addComponent(entityId, createSprite('asteroid'));

      this.asteroidEntities.set(config.id, entityId);

      const hitboxWidth = config.width * CONFIG.ASTEROID_HITBOX_SHRINK;
      const hitboxHeight = config.height * CONFIG.ASTEROID_HITBOX_SHRINK;
      const offsetX = (config.width - hitboxWidth) / 2;
      const offsetY = (config.height - hitboxHeight) / 2;

      this.obstaclesSystem.addObstacle({
        id: config.id,
        entityId,
        width: hitboxWidth,
        height: hitboxHeight,
        fuelDrain: CONFIG.FUEL_DRAIN_PER_COLLISION,
        offsetX,
        offsetY,
      });

      this.createAsteroidNode(config.id, config.width, config.height);
    });
  }

  private createAsteroidNode(
    asteroidId: string,
    width: number,
    height: number
  ): void {
    const asteroidImg = new Image();
    asteroidImg.src = new URL('../../assets/asteroid-obstacle.png', import.meta.url)
      .href;
    asteroidImg.onload = () => {
      const node = new Konva.Image({
        x: 0,
        y: 0,
        width,
        height,
        image: asteroidImg,
        opacity: 0.9,
      });
      this.asteroidNodes.set(asteroidId, node);
      this.stage.backgroundLayer.add(node);
      this.stage.backgroundLayer.batchDraw();
      this.updateAsteroidNodePosition(asteroidId);
    };
  }

  private updateAsteroidNodes(): void {
    for (const asteroidId of this.asteroidNodes.keys()) {
      this.updateAsteroidNodePosition(asteroidId);
    }
  }

  private updateAsteroidNodePosition(asteroidId: string): void {
    const entityId = this.asteroidEntities.get(asteroidId);
    const asteroidNode = this.asteroidNodes.get(asteroidId);
    if (!entityId || !asteroidNode) return;

    const position = this.world.getComponent<Position>(entityId, 'position');
    const obstacle = this.obstaclesSystem.getObstacle(asteroidId);
    if (!position || !obstacle) return;

    const asteroidInfo = this.obstaclesSystem.calculateAsteroidCenter(
      position,
      obstacle
    );

    asteroidNode.x(asteroidInfo.x - asteroidNode.width() / 2);
    asteroidNode.y(asteroidInfo.y - asteroidNode.height() / 2);
  }

  private createDataCapsules(): void {
    CAPSULE_DEFINITIONS.forEach((definition) => {
      const entityId = this.world.createEntity();
      this.world.addComponent(
        entityId,
        createPosition(definition.x, definition.y)
      );
      this.world.addComponent(
        entityId,
        createDataCapsule(definition.id, definition.facts)
      );

      this.capsuleEntities.set(definition.id, entityId);

      this.dataCapsulesSystem.addCapsule({
        id: definition.id,
        entityId,
        width: definition.width,
        height: definition.height,
        onCollected: () => this.removeCapsuleNode(definition.id),
      });

      this.createCapsuleNode(
        definition.id,
        definition.x,
        definition.y,
        definition.width,
        definition.height
      );
    });

    this.updateIntelProgress(
      this.dataCapsulesSystem.getCollectedCount(),
      this.dataCapsulesSystem.getTotalCapsules()
    );
  }

  private createCapsuleNode(
    capsuleId: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const image = new Image();
    image.src = new URL('../../assets/data-pad.png', import.meta.url).href;
    image.onload = () => {
      const node = new Konva.Image({
        x,
        y,
        width,
        height,
        image,
        opacity: 0.95,
      });
      this.capsuleNodes.set(capsuleId, node);
      this.stage.backgroundLayer.add(node);
      this.stage.backgroundLayer.batchDraw();
    };
  }

  private removeCapsuleNode(capsuleId: string): void {
    const node = this.capsuleNodes.get(capsuleId);
    if (node) {
      node.destroy();
      this.capsuleNodes.delete(capsuleId);
      this.stage.backgroundLayer.batchDraw();
    }
  }

  private createIntelPanel(): void {
    this.destroyIntelPanel();

    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      width: 320px;
      padding: 18px;
      border-radius: 12px;
      background: rgba(8, 17, 37, 0.85);
      border: 1px solid rgba(74, 158, 255, 0.4);
      color: #f4f8ff;
      font-family: 'Arial', sans-serif;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
      z-index: 90;
    `;

    const title = document.createElement('h3');
    title.textContent = 'Lunar Intel Capsule';
    title.style.cssText = `
      margin: 0 0 8px 0;
      font-size: 18px;
      letter-spacing: 0.5px;
      color: #7ec9ff;
      text-transform: uppercase;
    `;

    const countEl = document.createElement('p');
    countEl.style.cssText = `
      margin: 0 0 12px 0;
      font-size: 15px;
      font-weight: bold;
      color: #bfe1ff;
    `;

    const factEl = document.createElement('p');
    factEl.style.cssText = `
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
      color: #e6f1ff;
    `;
    factEl.textContent = 'Collect a data capsule to download Neil’s intel.';

    container.appendChild(title);
    container.appendChild(countEl);
    container.appendChild(factEl);

    document.body.appendChild(container);
    this.intelPanel = container;
    this.intelCountEl = countEl;
    this.intelFactEl = factEl;

    this.updateIntelProgress(
      this.dataCapsulesSystem.getCollectedCount(),
      this.dataCapsulesSystem.getTotalCapsules()
    );
  }

  private updateIntelProgress(collected: number, total: number): void {
    if (this.intelCountEl) {
      const totalDisplay = total === 0 ? '?' : total.toString();
      this.intelCountEl.textContent = `Intel Collected: ${collected}/${totalDisplay}`;
    }
  }

  private destroyIntelPanel(): void {
    this.intelPanel?.remove();
    this.intelPanel = null;
    this.intelCountEl = null;
    this.intelFactEl = null;
  }

  private handleCapsuleCollected = (payload: {
    capsuleId: string;
    fact: CapsuleFact;
    collectedCount: number;
    totalCapsules: number;
  }): void => {
    this.updateIntelProgress(payload.collectedCount, payload.totalCapsules);
    if (this.intelFactEl) {
      this.intelFactEl.textContent = payload.fact.text;
    }
  };

  private handleCapsulesComplete = (_payload: {
    facts: CapsuleFact[];
  }): void => {
    if (this.intelPanel) {
      this.intelPanel.style.borderColor = '#88ffcc';
      this.intelPanel.style.boxShadow = '0 0 18px rgba(136, 255, 204, 0.6)';
    }
  };

  private checkDestinationReach(): void {
    if (
      !this.moonDestinationArea ||
      !this.shipId ||
      this.quizCompleted ||
      this.quizUI.isShowing() ||
      this.quizActive ||
      this.quizConfirmation.isShowing() ||
      this.awaitingQuizDecision
    ) {
      return;
    }

    const now = Date.now();
    if (now < this.destinationCooldownUntil) return;

    const shipPosition = this.world.getComponent<Position>(
      this.shipId,
      'position'
    );
    if (!shipPosition) return;

    const shipBox = createShipBoundingBox(shipPosition.x, shipPosition.y);
    if (checkAABBCollision(shipBox, this.moonDestinationArea)) {
      this.destinationCooldownUntil = Date.now() + 1500;
      this.handleMoonDestinationReached();
    }
  }

  private handleMoonDestinationReached(): void {
    const total = this.dataCapsulesSystem.getTotalCapsules();
    const collected = this.dataCapsulesSystem.getCollectedCount();

    if (total === 0) {
      this.startMoonQuiz();
      return;
    }

    if (collected < total) {
      this.awaitingQuizDecision = true;
      this.quizConfirmation.show({
        title: 'Ready for the quiz?',
        message: `You downloaded ${collected}/${total} intel capsules. Neil recommends collecting the rest, but you can take the quiz now.`,
        confirmText: 'Take Quiz',
        cancelText: 'Collect More Intel',
        onConfirm: () => {
          this.awaitingQuizDecision = false;
          this.startMoonQuiz();
        },
        onCancel: () => {
          this.awaitingQuizDecision = false;
        },
      });
    } else {
      this.startMoonQuiz();
    }
  }

  private startMoonQuiz(): void {
    if (this.quizActive) return;
    this.quizConfirmation.hide();
    const quiz = this.buildMoonQuiz();
    this.quizActive = true;
    this.quizUI.showQuiz(quiz);
  }

  private buildMoonQuiz(): QuizData {
    const baseQuiz = QUIZZES['moon-quiz'];
    const collectedFacts = this.dataCapsulesSystem.getCollectedFacts();
    const questionIds = new Set(collectedFacts.map((fact) => fact.questionId));

    let questions = baseQuiz.questions;
    
    // If capsules were collected, only show questions that match collected facts
    if (questionIds.size > 0) {
      questions = baseQuiz.questions.filter((question) => {
        if (!question.id) return false;
        return questionIds.has(question.id);
      });
      
      // If we filtered out all questions, use fallback: show questions that match ANY collected fact
      // This ensures quiz is always playable
      if (questions.length === 0) {
        // Fallback: use all questions if no matches found (shouldn't happen if IDs are correct)
        questions = baseQuiz.questions;
      }
    } else {
      // No capsules collected - show all questions (harder quiz)
      questions = baseQuiz.questions;
    }

    return {
      id: baseQuiz.id,
      title: baseQuiz.title,
      questions: questions.map((question) => ({ ...question })),
    };
  }

  private handleQuizPassed = (payload: { quizId: string }): void => {
    if (payload.quizId !== 'moon-quiz') {
      return;
    }
    this.quizActive = false;
    this.quizCompleted = true;
    this.saveRepository.setQuizResult('moon-quiz', true);
    this.saveRepository.setExplorationUnlocked(true);
    if (this.intelFactEl) {
      this.intelFactEl.textContent =
        'Stellar work, cadet! You decoded every piece of lunar intel.';
    }
  };

  private handleFuelEmpty = (): void => {
    if (!this.shipId) return;
    const velocity = this.world.getComponent(
      this.shipId,
      'velocity'
    );
    if (velocity) {
      velocity.vx = 0;
      velocity.vy = 0;
    }
    this.showFuelEmptyDialog();
  };

  private showFuelEmptyDialog(): void {
    this.gameOverUI.show({
      title: 'Out of Fuel!',
      message:
        "Your spacecraft has run out of fuel. Don't worry, you can restart and try again!",
      buttonText: 'Restart',
      onRestart: () => {
        this.restartMoonExploration();
      },
    });
  }

  private restartMoonExploration(): void {
    this.gameOverUI.hide();
    // Clean up any lingering dialogue
    this.cleanupDialogue();
    this.dialogueManager.hide();

    // Reset ship position
    if (this.shipId) {
      const position = this.world.getComponent<Position>(
        this.shipId,
        'position'
      );
      if (position) {
        position.x = 160; // Doubled from 80
        position.y = this.stage.getHeight() - 400; // Doubled from 200
      }

      // Reset velocity
      const velocity = this.world.getComponent(
        this.shipId,
        'velocity'
      );
      if (velocity) {
        velocity.vx = 0;
        velocity.vy = 0;
      }

      // Reset fuel
      const fuel = this.world.getComponent<Fuel>(this.shipId, 'fuel');
      if (fuel) {
        fuel.current = CONFIG.FUEL_INITIAL;
      }

      // Reset rotation
      if (position) {
        position.angle = 0;
      }
    }

    // Reset quiz state
    this.quizActive = false;
    this.quizCompleted = false;
    this.awaitingQuizDecision = false;
    this.quizUI.dispose();
    this.quizConfirmation.hide();

    // Reset data capsules
    this.dataCapsulesSystem.clear();
    
    // Clear obstacles and recreate asteroids
    for (const entityId of this.asteroidEntities.values()) {
      this.world.removeEntity(entityId);
    }
    this.asteroidEntities.clear();
    this.asteroidNodes.forEach((node) => node.destroy());
    this.asteroidNodes.clear();
    
    // Recreate asteroids and capsules
    this.createAsteroids();
    this.createDataCapsules();
    
    // Sync entities for rendering
    this.entitiesLayer.syncEntities();

    // Show tutorial again
    this.showTutorial();
  }

  private showTutorial(): void {
    const playerName = this.saveRepository.getPlayerName() || 'Explorer';
    this.dialogueManager.showSequence('moon-exploration-tutorial', () => {
      // Tutorial complete - player can now move
    });
  }
}

