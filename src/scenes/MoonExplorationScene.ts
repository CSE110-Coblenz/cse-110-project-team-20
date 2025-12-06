/**
 * Moon Exploration Scene - free-fly map with destination, refuel station,
 * and collectible data capsules (added in later steps).
 */
import { type DialogueSequence } from '../content/dialogue.js';
import { PasswordCracker } from '../ui/passwordCracker.js';
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
import { PlanetSelectionUI, type PlanetInfo } from '../ui/planetSelection.js';
import quizDataJson from '../data/quizzes.json' with { type: 'json' };
import capsuleDataJson from '../data/capsules.json' with { type: 'json' };
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

type PlanetId =
  | 'moon'
  | 'mercury'
  | 'earth'
  | 'venus'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune';

interface PlanetConfig {
  asteroidCount: number;
  asteroidSpeedMin: number;
  asteroidSpeedMax: number;
  refuelUses: number;
}

// Scale factor for exploration scenes - makes everything smaller to feel like a bigger map
const MOON_SCALE = 0.7; // 70% size for ship, asteroids, capsules
const PLANET_DESTINATION_SCALE = 0.7; // 70% size for planet destination icons & hitboxes

function getPlanetConfig(planetId: PlanetId): PlanetConfig {
  // Difficulty: Moon is baseline; planets get harder the farther they are,
  // but nothing is easier than Moon/ISS.
  switch (planetId) {
    case 'mercury':
      return { asteroidCount: 6, asteroidSpeedMin: 60, asteroidSpeedMax: 120, refuelUses: 2 };
    case 'earth':
      return { asteroidCount: 7, asteroidSpeedMin: 70, asteroidSpeedMax: 130, refuelUses: 2 };
    case 'venus':
      return { asteroidCount: 8, asteroidSpeedMin: 75, asteroidSpeedMax: 135, refuelUses: 2 };
    case 'mars':
      return { asteroidCount: 9, asteroidSpeedMin: 80, asteroidSpeedMax: 140, refuelUses: 2 };
    case 'jupiter':
      return { asteroidCount: 10, asteroidSpeedMin: 90, asteroidSpeedMax: 150, refuelUses: 2 };
    case 'saturn':
      return { asteroidCount: 11, asteroidSpeedMin: 95, asteroidSpeedMax: 160, refuelUses: 2 };
    case 'uranus':
      return { asteroidCount: 12, asteroidSpeedMin: 100, asteroidSpeedMax: 170, refuelUses: 2 };
    case 'neptune':
      return { asteroidCount: 13, asteroidSpeedMin: 110, asteroidSpeedMax: 180, refuelUses: 2 };
    case 'moon':
    default:
      // Original moon behavior: 5 asteroids, moderate speed, 1 refuel use
      return { asteroidCount: 5, asteroidSpeedMin: 50, asteroidSpeedMax: 110, refuelUses: 1 };
  }
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}




function getCapsuleDefinitionsForPlanet(planetId: PlanetId): CapsuleDefinition[] {
  // Cast JSON to the expected record type
  const allCapsules = capsuleDataJson as Record<string, CapsuleDefinition[]>;
  
  // Get raw definitions for the requested planet (default to moon if not found)
  const definitions = allCapsules[planetId] || allCapsules['moon'];

  // Map over them to apply the MOON_SCALE
  return definitions.map(def => ({
    ...def,
    width: def.width * MOON_SCALE,
    height: def.height * MOON_SCALE
  }));
}

const QUIZZES = quizDataJson as Record<string, QuizData>;

export class PlanetExplorationScene implements Scene {
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
  private readonly planetSelectionUI: PlanetSelectionUI;
  private readonly passwordCracker: PasswordCracker;
  private tutorialShown = false;
  // Which planet this exploration scene represents.
  private readonly planetId: PlanetId;

  private shipId: number | null = null;
  private refuelStationId: number | null = null;
  private refuelNode: Konva.Image | null = null;
  private planetDestinationArea: DestinationArea | null = null;
  private planetDestinationNode: Konva.Image | null = null;
  private planetDestinationLabel: Konva.Text | null = null;
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
  private intelFactsListEl: HTMLUListElement | null = null;
  private refuelUsesRemaining: number;
  private planetSelectionShown = false; // --- FIX: Add flag to track if selection UI is already active ---

  constructor(
    sceneManager: SceneManager,
    stage: RenderStage,
    world: World,
    eventBus: EventBus,
    saveRepository: SaveRepository,
    gameOverUI: GameOverUI,
    planetId: PlanetId = 'moon'
  ) {
    this.sceneManager = sceneManager;
    this.stage = stage;
    this.world = world;
    this.eventBus = eventBus;
    this.saveRepository = saveRepository;
    this.gameOverUI = gameOverUI;
    this.planetId = planetId;
    this.refuelUsesRemaining = getPlanetConfig(planetId).refuelUses;

    this.keyboard = new KeyboardClass();
    this.hud = new HUD();
    this.entitiesLayer = new EntitiesLayer(this.stage.entitiesLayer, this.world);
    this.starfieldLayer = new StarfieldLayer(
      this.stage.backgroundLayer,
      CONFIG.STAGE_WIDTH,
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
    this.planetSelectionUI = new PlanetSelectionUI(sceneManager);
    this.passwordCracker = new PasswordCracker(this.eventBus);
  }

  init(): void {
    this.gameOverUI.hide();
    this.cleanupDialogue();
    this.hud.show();
    this.planetSelectionShown = false; // --- FIX: Reset flag on init ---
    
    this.resetStage();
    this.createIntelPanel();

    this.createShip();
    this.createRefuelStation();
    this.createPlanetDestination();
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
    this.eventBus.on(EventTopics.FUEL_REFUELED, this.handleFuelRefueled);

    if (this.planetId === 'moon' && !this.tutorialShown) {
      this.showTutorial();
      this.tutorialShown = true;
    }

    this.entitiesLayer.syncEntities();
    this.stage.batchDraw();
  }

  private resetStage(): void {
    this.stage.backgroundLayer.destroyChildren();
    this.stage.entitiesLayer.destroyChildren();
    this.stage.uiLayer.destroyChildren();

    this.starfieldLayer = new StarfieldLayer(
      this.stage.backgroundLayer,
      this.stage.getWidth(),
      this.stage.getHeight()
    );
  }

  private cleanupDialogue(): void {
    this.dialogueManager.hide();
    const allDivs = document.querySelectorAll('div');
    for (const div of allDivs) {
      const style = window.getComputedStyle(div);
      if (
        style.zIndex === '2000' ||
        (style.position === 'fixed' && style.bottom !== 'auto') ||
        div.textContent?.includes('Neil') ||
        div.textContent?.includes('DePaws Tyson')
      ) {
        div.remove();
      }
    }
  }

  private createShip(): void {
    this.shipId = this.world.createEntity();
    const startX = 80;
    const startY = this.stage.getHeight() - 200;

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
        !this.passwordCracker.isShowing() &&
        now >= this.knockbackDisableUntil
      );
    });
  }

  // ... (createRefuelStation, createPlanetDestination, loadRefuelVisual, loadPlanetDestinationVisual logic is unchanged)
  private createRefuelStation(): void {
    if (this.refuelUsesRemaining <= 0) return;
    this.refuelStationId = this.world.createEntity();
    const stationWidth = 140 * MOON_SCALE;
    const stationHeight = 120 * MOON_SCALE;
    let stationX = this.stage.getWidth() / 2 - stationWidth / 2;
    let stationY = this.stage.getHeight() / 2 - stationHeight / 2;
    if (this.planetId !== 'moon') {
      const stageWidth = this.stage.getWidth();
      const stageHeight = this.stage.getHeight();
      const marginX = 160;
      const marginTop = 180;
      const marginBottom = 140;
      stationX = randomInRange(marginX, stageWidth - marginX - stationWidth);
      stationY = randomInRange(marginTop, stageHeight - marginBottom - stationHeight);
    }
    this.world.addComponent(this.refuelStationId, createPosition(stationX, stationY));
    this.world.addComponent(this.refuelStationId, createSprite('refuel-station'));
    this.triggersSystem.addTrigger({ id: 'moon-refuel', x: stationX, y: stationY, width: stationWidth, height: stationHeight, type: 'refuel' });
    this.loadRefuelVisual(stationX, stationY, stationWidth, stationHeight);
  }

  private createPlanetDestination(): void {
    const baseSize = 180;
    const destinationWidth = baseSize * PLANET_DESTINATION_SCALE;
    const destinationHeight = baseSize * PLANET_DESTINATION_SCALE;
    const padding = 80;
    const fuelBarWidth = 220; 
    const destinationX = this.stage.getWidth() - destinationWidth - fuelBarWidth;
    const destinationY = padding;
    const hitboxShrink = 0.75;
    const hitboxWidth = destinationWidth * hitboxShrink;
    const hitboxHeight = destinationHeight * hitboxShrink;
    const hitboxOffsetX = (destinationWidth - hitboxWidth) / 2;
    const hitboxOffsetY = (destinationHeight - hitboxHeight) / 2;
    this.planetDestinationArea = { x: destinationX + hitboxOffsetX, y: destinationY + hitboxOffsetY, width: hitboxWidth, height: hitboxHeight };
    this.loadPlanetDestinationVisual(destinationX, destinationY, destinationWidth, destinationHeight);
  }

  private loadRefuelVisual(x: number, y: number, width: number, height: number): void {
    const image = new Image();
    image.src = new URL('../../assets/refuel-pod.png', import.meta.url).href;
    image.onload = () => {
      this.refuelNode?.destroy();
      this.refuelNode = new Konva.Image({ x, y, width, height, image, opacity: 0.95 });
      this.stage.backgroundLayer.add(this.refuelNode);
      this.stage.backgroundLayer.batchDraw();
    };
  }

  private loadPlanetDestinationVisual(x: number, y: number, width: number, height: number): void {
    const image = new Image();
    const assetPath = this.planetId === 'mercury' ? '/mecury-sprite.png' : this.planetId === 'earth' ? '/earth-sprite.png' : this.planetId === 'venus' ? '/venus.png' : this.planetId === 'mars' ? '/mars.png' : this.planetId === 'jupiter' ? '/jupiter.png' : this.planetId === 'saturn' ? '/saturn.png' : this.planetId === 'uranus' ? '/uranus.png' : this.planetId === 'neptune' ? '/neptune.png' : '/moon-icon.png';
    image.onerror = () => {
      console.error(`Failed to load destination image: ${assetPath}`);
      this.planetDestinationNode?.destroy();
      this.planetDestinationLabel?.destroy();
      this.planetDestinationNode = new Konva.Rect({ x, y, width, height, fill: '#8888ff', stroke: '#ffffff', strokeWidth: 2 }) as unknown as Konva.Image;
      this.stage.uiLayer.add(this.planetDestinationNode);
      this.stage.uiLayer.batchDraw();
    };
    image.onload = () => {
      this.planetDestinationNode?.destroy();
      this.planetDestinationLabel?.destroy();
      this.planetDestinationNode = new Konva.Image({ x, y, width, height, image, opacity: 1, listening: false });
      this.stage.uiLayer.add(this.planetDestinationNode);
      const prettyPlanetName = this.planetId === 'moon' ? 'Moon' : this.planetId.charAt(0).toUpperCase() + this.planetId.slice(1);
      this.planetDestinationLabel = new Konva.Text({ text: prettyPlanetName, x: x + width / 2, y: y + height + 10, fontSize: 20, fontFamily: 'Arial', fill: '#ffffff', listening: false });
      this.planetDestinationLabel.offsetX(this.planetDestinationLabel.width() / 2);
      this.stage.uiLayer.add(this.planetDestinationLabel);
      this.stage.uiLayer.batchDraw();
    };
    image.src = assetPath;
  }

  update(dt: number): void {
    const quizShowing = this.quizUI.isShowing() || this.quizConfirmation.isShowing();
    const dialogueShowing = this.dialogueManager.isShowing();
    // Add password cracker check to pause logic
    const passwordShowing = this.passwordCracker.isShowing();

    if (quizShowing || passwordShowing) { // Pause if quiz OR password game is showing
      if (this.shipId) {
        const velocity = this.world.getComponent<Velocity>(
          this.shipId,
          'velocity'
        );
        if (velocity) {
          velocity.vx = 0;
          velocity.vy = 0;
        }
      }
      this.updateHud();
      return;
    }

    this.playerInputSystem.update(dt, this.world);
    this.triggersSystem.update(dt, this.world);
    this.dataCapsulesSystem.update(dt, this.world);
    
    if (!dialogueShowing) {
      this.obstaclesSystem.update(dt, this.world);
    }
    
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
    this.eventBus.off(EventTopics.DATA_CAPSULE_COLLECTED, this.handleCapsuleCollected);
    this.eventBus.off(EventTopics.DATA_CAPSULES_COMPLETE, this.handleCapsulesComplete);
    this.eventBus.off(EventTopics.QUIZ_PASSED, this.handleQuizPassed);
    this.eventBus.off(EventTopics.FUEL_EMPTY, this.handleFuelEmpty);
    this.eventBus.off(EventTopics.FUEL_REFUELED, this.handleFuelRefueled);
    this.keyboard.dispose();
    this.hud.dispose();
    this.dialogueManager.dispose();
    this.dataCapsulesSystem.clear();
    this.playerInputSystem.clearPlayerEntity();
    this.destroyIntelPanel();
    this.quizUI.dispose();
    this.quizConfirmation.dispose();
    this.planetSelectionUI.dispose();
    this.passwordCracker.dispose();

    if (this.refuelNode) this.refuelNode.destroy();
    if (this.planetDestinationNode) this.planetDestinationNode.destroy();
    if (this.planetDestinationLabel) this.planetDestinationLabel.destroy();

    if (this.shipId) this.world.removeEntity(this.shipId);
    if (this.refuelStationId) this.world.removeEntity(this.refuelStationId);
    
    for (const entityId of this.asteroidEntities.values()) this.world.removeEntity(entityId);
    this.asteroidEntities.clear();
    this.asteroidNodes.forEach((node) => node.destroy());
    this.asteroidNodes.clear();
    
    for (const entityId of this.capsuleEntities.values()) this.world.removeEntity(entityId);
    this.capsuleEntities.clear();
    this.capsuleNodes.forEach((node) => node.destroy());
    this.capsuleNodes.clear();

    this.stage.backgroundLayer.destroyChildren();
    this.stage.entitiesLayer.destroyChildren();
    this.stage.uiLayer.destroyChildren();
  }

  // ... (createAsteroids, createAsteroidNode, updateAsteroidNodes, updateAsteroidNodePosition, createDataCapsules, createCapsuleNode, removeCapsuleNode logic unchanged)
  private createAsteroids(): void {
    const config = getPlanetConfig(this.planetId);
    const stageWidth = this.stage.getWidth();
    const stageHeight = this.stage.getHeight();
    const marginX = 120;
    const marginTop = 140;
    const marginBottom = 120;
    for (let i = 0; i < config.asteroidCount; i++) {
      const id = `asteroid-${i + 1}`;
      const width = (80 + Math.random() * 20) * MOON_SCALE;
      const height = width;
      const x = randomInRange(marginX, stageWidth - marginX);
      const y = randomInRange(marginTop, stageHeight - marginBottom);
      const entityId = this.world.createEntity();
      const velocityMagnitude = randomInRange(config.asteroidSpeedMin, config.asteroidSpeedMax);
      const direction = Math.random() * Math.PI * 2;
      const vx = Math.cos(direction) * velocityMagnitude;
      const vy = Math.sin(direction) * velocityMagnitude;
      this.world.addComponent(entityId, createPosition(x, y));
      this.world.addComponent(entityId, createVelocity(vx, vy));
      this.world.addComponent(entityId, createSprite('asteroid'));
      this.asteroidEntities.set(id, entityId);
      const hitboxWidth = width * CONFIG.ASTEROID_HITBOX_SHRINK;
      const hitboxHeight = height * CONFIG.ASTEROID_HITBOX_SHRINK;
      const offsetX = (width - hitboxWidth) / 2;
      const offsetY = (height - hitboxHeight) / 2;
      this.obstaclesSystem.addObstacle({ id, entityId, width: hitboxWidth, height: hitboxHeight, fuelDrain: CONFIG.FUEL_DRAIN_PER_COLLISION, offsetX, offsetY });
      this.createAsteroidNode(id, width, height);
    }
  }

  private createAsteroidNode(asteroidId: string, width: number, height: number): void {
    const asteroidImg = new Image();
    asteroidImg.src = new URL('../../assets/asteroid-obstacle.png', import.meta.url).href;
    asteroidImg.onload = () => {
      const node = new Konva.Image({ x: 0, y: 0, width, height, image: asteroidImg, opacity: 0.9 });
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
    const asteroidInfo = this.obstaclesSystem.calculateAsteroidCenter(position, obstacle);
    asteroidNode.x(asteroidInfo.x - asteroidNode.width() / 2);
    asteroidNode.y(asteroidInfo.y - asteroidNode.height() / 2);
  }

  private createDataCapsules(): void {
    const definitions = getCapsuleDefinitionsForPlanet(this.planetId);
    const stageWidth = this.stage.getWidth();
    const stageHeight = this.stage.getHeight();
    const marginX = 140;
    const marginTop = 160;
    const marginBottom = 140;
    definitions.forEach((definition) => {
      let capsuleX = definition.x;
      let capsuleY = definition.y;
      if (this.planetId !== 'moon') {
        capsuleX = randomInRange(marginX, stageWidth - marginX - definition.width);
        capsuleY = randomInRange(marginTop, stageHeight - marginBottom - definition.height);
      }
      const entityId = this.world.createEntity();
      this.world.addComponent(entityId, createPosition(capsuleX, capsuleY));
      this.world.addComponent(entityId, createDataCapsule(definition.id, definition.facts));
      this.capsuleEntities.set(definition.id, entityId);
      this.dataCapsulesSystem.addCapsule({ id: definition.id, entityId, width: definition.width, height: definition.height, onCollected: () => this.removeCapsuleNode(definition.id) });
      this.createCapsuleNode(definition.id, capsuleX, capsuleY, definition.width, definition.height);
    });
    this.updateIntelProgress(this.dataCapsulesSystem.getCollectedCount(), this.dataCapsulesSystem.getTotalCapsules());
  }

  private createCapsuleNode(capsuleId: string, x: number, y: number, width: number, height: number): void {
    const image = new Image();
    image.src = new URL('../../assets/data-pad.png', import.meta.url).href;
    image.onload = () => {
      const node = new Konva.Image({ x, y, width, height, image, opacity: 0.95 });
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

  // ... (createIntelPanel, updateIntelProgress, destroyIntelPanel, handlers unchanged)
  private createIntelPanel(): void {
    this.destroyIntelPanel();
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed; top: 20px; left: 20px; width: 320px; padding: 18px; border-radius: 12px;
      background: rgba(8, 17, 37, 0.85); border: 1px solid rgba(74, 158, 255, 0.4);
      color: #f4f8ff; font-family: 'Arial', sans-serif; box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35); z-index: 90;
    `;
    const title = document.createElement('h3');
    const prettyPlanetName = this.planetId === 'moon' ? 'Moon' : this.planetId.charAt(0).toUpperCase() + this.planetId.slice(1);
    title.textContent = `${prettyPlanetName} Facts`;
    title.style.cssText = `margin: 0 0 8px 0; font-size: 18px; letter-spacing: 0.5px; color: #7ec9ff; text-transform: uppercase;`;
    const countEl = document.createElement('p');
    countEl.style.cssText = `margin: 0 0 12px 0; font-size: 15px; font-weight: bold; color: #bfe1ff;`;
    const factsListEl = document.createElement('ul');
    factsListEl.style.cssText = `margin: 0; padding: 0; list-style: none; max-height: 400px; overflow-y: auto; overflow-x: hidden;`;
    const placeholder = document.createElement('li');
    placeholder.textContent = `Collect a data capsule to learn facts about ${prettyPlanetName}.`;
    placeholder.style.cssText = `margin: 0; padding: 8px 0; font-size: 14px; line-height: 1.5; color: #a0c4e0; font-style: italic;`;
    factsListEl.appendChild(placeholder);
    container.appendChild(title);
    container.appendChild(countEl);
    container.appendChild(factsListEl);
    document.body.appendChild(container);
    this.intelPanel = container;
    this.intelCountEl = countEl;
    this.intelFactsListEl = factsListEl;
    this.updateIntelProgress(this.dataCapsulesSystem.getCollectedCount(), this.dataCapsulesSystem.getTotalCapsules());
  }

  private updateIntelProgress(collected: number, total: number): void {
    if (this.intelCountEl) {
      const totalDisplay = total === 0 ? '?' : total.toString();
      this.intelCountEl.textContent = `Intel Collected: ${collected}/${totalDisplay}`;
    }
    if (this.intelFactsListEl) {
      const collectedFacts = this.dataCapsulesSystem.getCollectedFacts();
      this.intelFactsListEl.innerHTML = '';
      if (collectedFacts.length === 0) {
        const placeholder = document.createElement('li');
        const prettyPlanetName = this.planetId === 'moon' ? 'Moon' : this.planetId.charAt(0).toUpperCase() + this.planetId.slice(1);
        placeholder.textContent = `Collect a data capsule to learn facts about ${prettyPlanetName}.`;
        placeholder.style.cssText = `margin: 0; padding: 8px 0; font-size: 14px; line-height: 1.5; color: #a0c4e0; font-style: italic;`;
        this.intelFactsListEl.appendChild(placeholder);
      } else {
        collectedFacts.forEach((fact, index) => {
          const listItem = document.createElement('li');
          listItem.style.cssText = `margin: 0 0 12px 0; padding: 10px; font-size: 13px; line-height: 1.6; color: #e6f1ff; background: rgba(74, 158, 255, 0.15); border-left: 3px solid #4a9eff; border-radius: 4px;`;
          listItem.textContent = `${index + 1}. ${fact.text}`;
          if (this.intelFactsListEl) this.intelFactsListEl.appendChild(listItem);
        });
      }
    }
  }

  private destroyIntelPanel(): void {
    this.intelPanel?.remove();
    this.intelPanel = null;
    this.intelCountEl = null;
    this.intelFactsListEl = null;
  }

  private handleCapsuleCollected = (payload: { capsuleId: string; fact: CapsuleFact; collectedCount: number; totalCapsules: number; }): void => {
    this.updateIntelProgress(payload.collectedCount, payload.totalCapsules);
  };

  private handleCapsulesComplete = (_payload: { facts: CapsuleFact[]; }): void => {
    if (this.intelPanel) {
      this.intelPanel.style.borderColor = '#88ffcc';
      this.intelPanel.style.boxShadow = '0 0 18px rgba(136, 255, 204, 0.6)';
    }
  };

  private checkDestinationReach(): void {
    if (!this.planetDestinationArea || !this.shipId || this.quizCompleted || this.quizUI.isShowing() || this.quizActive || this.quizConfirmation.isShowing() || this.awaitingQuizDecision) return;
    const now = Date.now();
    if (now < this.destinationCooldownUntil) return;
    const shipPosition = this.world.getComponent<Position>(this.shipId, 'position');
    if (!shipPosition) return;
    const shipBox = { x: shipPosition.x, y: shipPosition.y, width: CONFIG.SHIP_WIDTH * MOON_SCALE, height: CONFIG.SHIP_HEIGHT * MOON_SCALE };
    if (checkAABBCollision(shipBox, this.planetDestinationArea)) {
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
        onConfirm: () => { this.awaitingQuizDecision = false; this.startMoonQuiz(); },
        onCancel: () => { this.awaitingQuizDecision = false; },
      });
    } else {
      this.startMoonQuiz();
    }
  }

  private startMoonQuiz(): void {
    if (this.quizActive) return;
    this.quizConfirmation.hide();
    const quiz = this.buildPlanetQuiz();
    this.quizActive = true;
    this.quizUI.showQuiz(quiz);
  }

  private getQuizId(): string {
    if (this.planetId === 'moon') return 'moon-quiz';
    if (this.planetId === 'mercury') return 'mercury-quiz';
    if (this.planetId === 'earth') return 'earth-quiz';
    return `${this.planetId}-quiz`;
  }

  private buildPlanetQuiz(): QuizData {
    const quizId = this.getQuizId();
    const baseQuiz = QUIZZES[quizId];
    const safeQuiz = baseQuiz ?? QUIZZES['moon-quiz'];
    const questions = safeQuiz.questions.map((question) => ({ ...question }));
    return { id: safeQuiz.id, title: safeQuiz.title, questions };
  }

  private handleQuizPassed = (payload: { quizId: string }): void => {
    const expectedQuizId = this.getQuizId();
    if (payload.quizId !== expectedQuizId) return;
    this.quizActive = false;
    this.quizCompleted = true;
    this.saveRepository.setQuizResult('moon-quiz', true);
    this.saveRepository.setExplorationUnlocked(true);
    this.saveRepository.addVisitedPlanet(this.planetId);

    if (this.planetId === 'moon') {
      this.dialogueManager.showSequence('moon-quiz-complete', () => {
        this.showPlanetSelection();
      });
      //Use flag to prevent double trigger 
      window.setTimeout(() => {
        if (!this.planetSelectionShown && !this.planetSelectionUI.isShowing()) {
          this.showPlanetSelection();
        }
      }, 6000);
    } else {
      this.showPlanetSelection();
    }
  };

  // Add flag logic to showPlanetSelection 
  private showPlanetSelection(): void {
    if (this.planetSelectionShown) return; // Prevent showing again if already in progress
    this.planetSelectionShown = true;

    const visitedPlanets = new Set(this.saveRepository.getVisitedPlanets());
    visitedPlanets.add(this.planetId);
    
    this.planetSelectionUI.show({
      visitedPlanets,
      onSelect: (planet: PlanetInfo) => {
        this.planetSelectionUI.hide();
        const travelSequence: DialogueSequence = {
          'travel-auth': [{
            id: 'auth-1',
            character: 'Neil',
            text: `Excellent choice! To travel to ${planet.name}, we need to engage the warp drive. Please enter the security authorization code.`
          }]
        };

        this.dialogueManager.showSequence('travel-auth', () => {
          this.passwordCracker.show({
            id: 'planet-travel-auth',
            title: `Destination: ${planet.name}`,
            puzzleSetKey: 'iss'
          });

          const handleAuthSuccess = (event: { minigameId: string }) => {
            if (event.minigameId === 'planet-travel-auth') {
              this.eventBus.off('minigame:passed', handleAuthSuccess);
              this.saveRepository.addVisitedPlanet(planet.id);
              this.sceneManager.transitionTo('cutscene');
              setTimeout(() => {
                this.eventBus.emit(EventTopics.CUTSCENE_START, {
                  cutsceneId: `${this.planetId}-to-${planet.id}`,
                  sourcePlanet: this.planetId === 'moon' ? 'Moon' : this.planetId.charAt(0).toUpperCase() + this.planetId.slice(1),
                  destinationPlanet: planet.name,
                });
              }, 0);
            }
          };
          this.eventBus.on('minigame:passed', handleAuthSuccess);
        }, travelSequence);
      },
    });
  }

  private handleFuelRefueled = (): void => {
    if (!this.refuelStationId || this.refuelUsesRemaining <= 0) return;
    this.refuelUsesRemaining -= 1;
    this.triggersSystem.removeTrigger('moon-refuel');
    if (this.refuelNode) {
      this.refuelNode.destroy();
      this.refuelNode = null;
      this.stage.backgroundLayer.batchDraw();
    }
    this.world.removeEntity(this.refuelStationId);
    this.refuelStationId = null;
    if (this.refuelUsesRemaining > 0) this.createRefuelStation();
  };

  private handleFuelEmpty = (): void => {
    if (!this.shipId) return;
    const velocity = this.world.getComponent<Velocity>(this.shipId, 'velocity');
    if (velocity) {
      velocity.vx = 0;
      velocity.vy = 0;
    }
    this.showFuelEmptyDialog();
  };

  private showFuelEmptyDialog(): void {
    this.gameOverUI.show({
      title: 'Out of Fuel!',
      message: "Your spacecraft has run out of fuel. Don't worry, you can restart and try again!",
      buttonText: 'Restart',
      onRestart: () => { this.restartMoonExploration(); },
    });
  }

  private restartMoonExploration(): void {
    this.refuelUsesRemaining = getPlanetConfig(this.planetId).refuelUses;
    this.planetSelectionShown = false; // --- FIX: Reset flag on restart ---
    this.gameOverUI.hide();
    this.dialogueManager.hide();
    this.cleanupDialogue();
    this.tutorialShown = true;

    if (!this.shipId) {
      this.createShip();
    } else {
      const position = this.world.getComponent<Position>(this.shipId, 'position');
      if (position) { position.x = 80; position.y = this.stage.getHeight() - 200; position.angle = 0; }
      const velocity = this.world.getComponent<Velocity>(this.shipId, 'velocity');
      if (velocity) { velocity.vx = 0; velocity.vy = 0; }
      const fuel = this.world.getComponent<Fuel>(this.shipId, 'fuel');
      if (fuel) { fuel.current = CONFIG.FUEL_INITIAL; fuel.max = CONFIG.FUEL_MAX; }
      else { this.world.addComponent(this.shipId, createFuel(CONFIG.FUEL_MAX, CONFIG.FUEL_INITIAL)); }
    }

    this.quizActive = false;
    this.quizCompleted = false;
    this.awaitingQuizDecision = false;
    this.quizUI.dispose();
    this.quizConfirmation.hide();
    this.dataCapsulesSystem.clear();
    this.destroyIntelPanel();
    this.createIntelPanel();
    
    for (const entityId of this.asteroidEntities.values()) this.world.removeEntity(entityId);
    this.asteroidEntities.clear();
    this.asteroidNodes.forEach((node) => node.destroy());
    this.asteroidNodes.clear();
    
    this.createRefuelStation();
    this.createAsteroids();
    this.createDataCapsules();
    
    this.entitiesLayer.syncEntities();
    this.updateHud();
    this.hud.show();
  }

  private showTutorial(): void {
    const playerName = this.saveRepository.getPlayerName() || 'Explorer';
    this.dialogueManager.showSequence('moon-exploration-tutorial', () => { });
  }
}