/**
 * Moon Exploration Scene - free-fly map with destination, refuel station,
 * and collectible data capsules (added in later steps).
 */
import type { Scene, SceneManager } from '../engine/sceneManager.js';
import type { RenderStage } from '../render/stage.js';
import type { World } from '../engine/ecs/world.js';
import type { EventBus } from '../engine/events.js';
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
import { createVelocity } from '../engine/ecs/components/velocity.js';
import { createFuel } from '../engine/ecs/components/fuel.js';
import { createSprite } from '../engine/ecs/components/sprite.js';
import { PlayerInputSystem } from '../engine/ecs/systems/playerInput.js';
import { FuelSystem } from '../engine/ecs/systems/fuelSystem.js';
import { TriggersSystem } from '../engine/ecs/systems/triggers.js';
import { DataCapsulesSystem } from '../engine/ecs/systems/dataCapsules.js';
import { ObstaclesSystem } from '../engine/ecs/systems/obstacles.js';
import { EntitiesLayer } from '../render/layers/entities.js';
import { StarfieldLayer } from '../render/layers/starfield.js';

interface DestinationArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

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

  private shipId: number | null = null;
  private refuelStationId: number | null = null;
  private refuelNode: Konva.Image | null = null;
  private moonDestinationArea: DestinationArea | null = null;
  private moonDestinationNode: Konva.Image | null = null;
  private asteroidEntities = new Map<string, number>();
  private asteroidNodes = new Map<string, Konva.Circle | Konva.Image>();
  private knockbackDisableUntil = 0;

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
    this.starfieldLayer = new StarfieldLayer(
      this.stage.backgroundLayer,
      this.stage.getWidth(),
      this.stage.getHeight()
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
  }

  init(): void {
    this.gameOverUI.hide();
    this.resetStage();

    this.createShip();
    this.createRefuelStation();
    this.createMoonDestination();
    this.createAsteroids();

    // Sync render layer state
    this.entitiesLayer.syncEntities();
    this.stage.batchDraw();
  }

  private resetStage(): void {
    this.stage.backgroundLayer.destroyChildren();
    this.stage.entitiesLayer.destroyChildren();
    this.stage.uiLayer.destroyChildren();

    // Rebuild starfield for the new scene
    this.starfieldLayer = new StarfieldLayer(
      this.stage.backgroundLayer,
      this.stage.getWidth(),
      this.stage.getHeight()
    );
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
    const destinationX = this.stage.getWidth() - destinationWidth - padding;
    const destinationY = padding;

    this.moonDestinationArea = {
      x: destinationX,
      y: destinationY,
      width: destinationWidth,
      height: destinationHeight,
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
    this.keyboard.dispose();
    this.hud.dispose();
    this.dataCapsulesSystem.clear();
    this.playerInputSystem.clearPlayerEntity();

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
}

