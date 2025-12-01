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
import { PlanetSelectionUI, type PlanetInfo } from '../ui/planetSelection.js';
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

// Scale factor for moon exploration - makes everything smaller to feel like a bigger map
const MOON_SCALE = 0.7; // 70% size

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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Capsule layouts and facts per planet.
// Positions are shared to keep difficulty consistent; facts and questionIds differ.
const MOON_CAPSULE_DEFINITIONS: CapsuleDefinition[] = [
  {
    id: 'tranquility-capsule',
    x: 260,
    y: 180,
    width: 72 * MOON_SCALE,
    height: 72 * MOON_SCALE,
    facts: [
      {
        id: 'tranquility-apollo-landing',
        text: 'The Sea of Tranquility (Mare Tranquillitatis) was the landing site for Apollo 11, where Neil Armstrong and Buzz Aldrin became the first humans to walk on the Moon on July 20, 1969.',
        questionId: 'moon-landing-site',
      },
      {
        id: 'tranquility-landing-site',
        text: 'Apollo 11\'s historic landing occurred in the Sea of Tranquility, chosen for its flat terrain and safe landing conditions.',
        questionId: 'moon-landing-site',
      },
    ],
  },
  {
    id: 'tycho-capsule',
    x: 520,
    y: 360,
    width: 72 * MOON_SCALE,
    height: 72 * MOON_SCALE,
    facts: [
      {
        id: 'tycho-ray-system',
        text: 'Tycho Crater stands out when viewing the Moon from Earth because its bright radial rays streak across the lunar surface, created by impact ejecta that was thrown outward during the crater\'s formation.',
        questionId: 'tycho-radial-rays',
      },
      {
        id: 'tycho-visible-rays',
        text: 'The bright rays extending from Tycho Crater are so prominent and visible from Earth that they make Tycho one of the most recognizable features on the Moon.',
        questionId: 'tycho-radial-rays',
      },
    ],
  },
  {
    id: 'copernicus-capsule',
    x: 900,
    y: 220,
    width: 72 * MOON_SCALE,
    height: 72 * MOON_SCALE,
    facts: [
      {
        id: 'copernicus-complex-structure',
        text: 'Copernicus Crater is a textbook example of a complex crater because it features terraced walls and towering central peaks that rise approximately 800 meters high.',
        questionId: 'copernicus-structure',
      },
      {
        id: 'copernicus-terraced-peaks',
        text: 'What makes Copernicus a complex crater is its distinctive terraced inner walls and prominent central peaks, both formed during the massive impact event that created the crater.',
        questionId: 'copernicus-structure',
      },
    ],
  },
];

const MERCURY_CAPSULE_DEFINITIONS: CapsuleDefinition[] = [
  {
    id: 'mercury-day-night',
    x: 260,
    y: 180,
    width: 72 * MOON_SCALE,
    height: 72 * MOON_SCALE,
    facts: [
      {
        id: 'mercury-slow-rotation',
        text: 'Mercury rotates so slowly that a single day (sunrise to sunrise) lasts about 176 Earth days.',
        questionId: 'mercury-day-length',
      },
    ],
  },
  {
    id: 'mercury-atmosphere',
    x: 520,
    y: 360,
    width: 72 * MOON_SCALE,
    height: 72 * MOON_SCALE,
    facts: [
      {
        id: 'mercury-thin-exosphere',
        text: 'Mercury has an extremely thin exosphere instead of a thick atmosphere, so it cannot trap heat.',
        questionId: 'mercury-atmosphere',
      },
    ],
  },
  {
    id: 'mercury-temperature',
    x: 900,
    y: 220,
    width: 72 * MOON_SCALE,
    height: 72 * MOON_SCALE,
    facts: [
      {
        id: 'mercury-temp-variation',
        text: 'Because Mercury has almost no atmosphere, its surface temperature swings from scorching hot in the day to freezing at night.',
        questionId: 'mercury-temp-variation',
      },
    ],
  },
];

const EARTH_CAPSULE_DEFINITIONS: CapsuleDefinition[] = [
  {
    id: 'earth-water',
    x: 260,
    y: 180,
    width: 72 * MOON_SCALE,
    height: 72 * MOON_SCALE,
    facts: [
      {
        id: 'earth-liquid-water',
        text: 'Earth is the only known planet with stable liquid water on its surface, covering about 71% of the planet.',
        questionId: 'earth-liquid-water',
      },
    ],
  },
  {
    id: 'earth-atmosphere',
    x: 520,
    y: 360,
    width: 72 * MOON_SCALE,
    height: 72 * MOON_SCALE,
    facts: [
      {
        id: 'earth-atmosphere-protection',
        text: 'Earth’s atmosphere shields life from harmful solar radiation and helps keep temperatures stable.',
        questionId: 'earth-atmosphere-role',
      },
    ],
  },
  {
    id: 'earth-moon-tides',
    x: 900,
    y: 220,
    width: 72 * MOON_SCALE,
    height: 72 * MOON_SCALE,
    facts: [
      {
        id: 'earth-moon-tides-fact',
        text: 'The gravitational pull of the Moon causes ocean tides on Earth, helping to shape coastal ecosystems.',
        questionId: 'earth-moon-tides',
      },
    ],
  },
];

const VENUS_CAPSULE_DEFINITIONS: CapsuleDefinition[] = [
  {
    id: 'venus-greenhouse',
    x: 260,
    y: 180,
    width: 72 * MOON_SCALE,
    height: 72 * MOON_SCALE,
    facts: [
      {
        id: 'venus-runaway-greenhouse',
        text: 'Venus experiences a runaway greenhouse effect, making it even hotter than Mercury despite being farther from the Sun.',
        questionId: 'venus-hottest-planet',
      },
    ],
  },
  {
    id: 'venus-atmosphere',
    x: 520,
    y: 360,
    width: 72 * MOON_SCALE,
    height: 72 * MOON_SCALE,
    facts: [
      {
        id: 'venus-thick-atmosphere',
        text: 'Venus has a thick atmosphere made mostly of carbon dioxide with clouds of sulfuric acid.',
        questionId: 'venus-atmosphere',
      },
    ],
  },
  {
    id: 'venus-rotation',
    x: 900,
    y: 220,
    width: 72 * MOON_SCALE,
    height: 72 * MOON_SCALE,
    facts: [
      {
        id: 'venus-retrograde-rotation',
        text: 'Venus rotates in the opposite direction of most planets, so the Sun appears to rise in the west and set in the east.',
        questionId: 'venus-rotation',
      },
    ],
  },
];

const MARS_CAPSULE_DEFINITIONS: CapsuleDefinition[] = [
  {
    id: 'mars-olympus-mons',
    x: 260,
    y: 180,
    width: 72 * MOON_SCALE,
    height: 72 * MOON_SCALE,
    facts: [
      {
        id: 'mars-volcano',
        text: 'Mars is home to Olympus Mons, the largest volcano in the solar system, standing about three times taller than Mount Everest.',
        questionId: 'mars-olympus-mons',
      },
    ],
  },
  {
    id: 'mars-water-ice',
    x: 520,
    y: 360,
    width: 72 * MOON_SCALE,
    height: 72 * MOON_SCALE,
    facts: [
      {
        id: 'mars-polar-ice',
        text: 'Mars has polar ice caps made of water ice and frozen carbon dioxide, suggesting it once had a wetter climate.',
        questionId: 'mars-water-evidence',
      },
    ],
  },
  {
    id: 'mars-thin-atmosphere',
    x: 900,
    y: 220,
    width: 72 * MOON_SCALE,
    height: 72 * MOON_SCALE,
    facts: [
      {
        id: 'mars-atmosphere',
        text: 'Mars has a thin atmosphere that cannot hold much heat, so surface temperatures can change dramatically between day and night.',
        questionId: 'mars-atmosphere',
      },
    ],
  },
];

const JUPITER_CAPSULE_DEFINITIONS: CapsuleDefinition[] = [
  {
    id: 'jupiter-size',
    x: 260,
    y: 180,
    width: 72 * MOON_SCALE,
    height: 72 * MOON_SCALE,
    facts: [
      {
        id: 'jupiter-largest-planet',
        text: 'Jupiter is the largest planet in the solar system and is more than 11 times wider than Earth.',
        questionId: 'jupiter-largest-planet',
      },
    ],
  },
  {
    id: 'jupiter-great-red-spot',
    x: 520,
    y: 360,
    width: 72 * MOON_SCALE,
    height: 72 * MOON_SCALE,
    facts: [
      {
        id: 'jupiter-red-spot',
        text: 'Jupiter’s Great Red Spot is a giant storm that has been raging for at least 300 years.',
        questionId: 'jupiter-great-red-spot',
      },
    ],
  },
  {
    id: 'jupiter-many-moons',
    x: 900,
    y: 220,
    width: 72 * MOON_SCALE,
    height: 72 * MOON_SCALE,
    facts: [
      {
        id: 'jupiter-moons',
        text: 'Jupiter has dozens of moons, including the four large Galilean moons discovered by Galileo.',
        questionId: 'jupiter-moons',
      },
    ],
  },
];

const SATURN_CAPSULE_DEFINITIONS: CapsuleDefinition[] = [
  {
    id: 'saturn-rings',
    x: 260,
    y: 180,
    width: 72 * MOON_SCALE,
    height: 72 * MOON_SCALE,
    facts: [
      {
        id: 'saturn-ring-composition',
        text: 'Saturn’s rings are made mostly of countless chunks of ice and rock, ranging from tiny grains to house-sized boulders.',
        questionId: 'saturn-rings',
      },
    ],
  },
  {
    id: 'saturn-density',
    x: 520,
    y: 360,
    width: 72 * MOON_SCALE,
    height: 72 * MOON_SCALE,
    facts: [
      {
        id: 'saturn-density-fact',
        text: 'Saturn is so light for its size that it would float in a giant bathtub of water, because its average density is less than water’s.',
        questionId: 'saturn-density',
      },
    ],
  },
  {
    id: 'saturn-moon-titan',
    x: 900,
    y: 220,
    width: 72 * MOON_SCALE,
    height: 72 * MOON_SCALE,
    facts: [
      {
        id: 'saturn-titan',
        text: 'Saturn’s moon Titan has a thick atmosphere and lakes of liquid methane and ethane on its surface.',
        questionId: 'saturn-titan',
      },
    ],
  },
];

const URANUS_CAPSULE_DEFINITIONS: CapsuleDefinition[] = [
  {
    id: 'uranus-tilt',
    x: 260,
    y: 180,
    width: 72 * MOON_SCALE,
    height: 72 * MOON_SCALE,
    facts: [
      {
        id: 'uranus-axis-tilt',
        text: 'Uranus rotates on its side with an axial tilt of about 98 degrees, so it essentially rolls around the Sun.',
        questionId: 'uranus-tilt',
      },
    ],
  },
  {
    id: 'uranus-ice-giant',
    x: 520,
    y: 360,
    width: 72 * MOON_SCALE,
    height: 72 * MOON_SCALE,
    facts: [
      {
        id: 'uranus-composition',
        text: 'Uranus is an ice giant, with a composition rich in icy materials like water, ammonia, and methane.',
        questionId: 'uranus-ice-giant',
      },
    ],
  },
  {
    id: 'uranus-cold',
    x: 900,
    y: 220,
    width: 72 * MOON_SCALE,
    height: 72 * MOON_SCALE,
    facts: [
      {
        id: 'uranus-temperature',
        text: 'Despite not being the farthest planet, Uranus is one of the coldest planets due to the way it releases little internal heat.',
        questionId: 'uranus-temperature',
      },
    ],
  },
];

const NEPTUNE_CAPSULE_DEFINITIONS: CapsuleDefinition[] = [
  {
    id: 'neptune-winds',
    x: 260,
    y: 180,
    width: 72 * MOON_SCALE,
    height: 72 * MOON_SCALE,
    facts: [
      {
        id: 'neptune-wind-speed',
        text: 'Neptune has the fastest winds in the solar system, with speeds that can exceed 2,000 kilometers per hour.',
        questionId: 'neptune-winds',
      },
    ],
  },
  {
    id: 'neptune-dark-spot',
    x: 520,
    y: 360,
    width: 72 * MOON_SCALE,
    height: 72 * MOON_SCALE,
    facts: [
      {
        id: 'neptune-storms',
        text: 'Like Jupiter’s Great Red Spot, Neptune has dark storm systems that appear and disappear over time.',
        questionId: 'neptune-storms',
      },
    ],
  },
  {
    id: 'neptune-distance',
    x: 900,
    y: 220,
    width: 72 * MOON_SCALE,
    height: 72 * MOON_SCALE,
    facts: [
      {
        id: 'neptune-farthest',
        text: 'Neptune is the farthest known planet from the Sun, taking about 165 Earth years to complete one orbit.',
        questionId: 'neptune-orbit',
      },
    ],
  },
];

function getCapsuleDefinitionsForPlanet(planetId: PlanetId): CapsuleDefinition[] {
  switch (planetId) {
    case 'mercury':
      return MERCURY_CAPSULE_DEFINITIONS;
    case 'earth':
      return EARTH_CAPSULE_DEFINITIONS;
    case 'venus':
      return VENUS_CAPSULE_DEFINITIONS;
    case 'mars':
      return MARS_CAPSULE_DEFINITIONS;
    case 'jupiter':
      return JUPITER_CAPSULE_DEFINITIONS;
    case 'saturn':
      return SATURN_CAPSULE_DEFINITIONS;
    case 'uranus':
      return URANUS_CAPSULE_DEFINITIONS;
    case 'neptune':
      return NEPTUNE_CAPSULE_DEFINITIONS;
    case 'moon':
    default:
      return MOON_CAPSULE_DEFINITIONS;
  }
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
  private tutorialShown = false;
  // Which planet this exploration scene represents.
  private readonly planetId: PlanetId;

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
  private intelFactsListEl: HTMLUListElement | null = null;
  private refuelUsesRemaining: number;

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
    this.planetSelectionUI = new PlanetSelectionUI(sceneManager);
  }

  init(): void {
    this.gameOverUI.hide();
    // Clean up any lingering dialogue from previous scenes
    this.cleanupDialogue();
    
    // Ensure HUD is visible (reattach if it was disposed)
    this.hud.show();
    
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
    this.eventBus.on(EventTopics.FUEL_REFUELED, this.handleFuelRefueled);

    // Show tutorial on first load, but ONLY for the Moon level.
    if (this.planetId === 'moon' && !this.tutorialShown) {
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
    // Hide dialogue manager first
    this.dialogueManager.hide();
    
    // Find dialogue containers by their distinctive styling (z-index 2000, bottom position)
    const allDivs = document.querySelectorAll('div');
    for (const div of allDivs) {
      const style = window.getComputedStyle(div);
      // Dialogue containers have z-index 2000 and are positioned at bottom
      // Also check for Neil's name in text content
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
        now >= this.knockbackDisableUntil
      );
    });
  }

  private createRefuelStation(): void {
    if (this.refuelUsesRemaining <= 0) {
      return;
    }

    this.refuelStationId = this.world.createEntity();
    const stationWidth = 140 * MOON_SCALE;
    const stationHeight = 120 * MOON_SCALE;
    let stationX = this.stage.getWidth() / 2 - stationWidth / 2;
    let stationY = this.stage.getHeight() / 2 - stationHeight / 2;

    // For non-moon planets, randomize refuel station location for more variety
    if (this.planetId !== 'moon') {
      const stageWidth = this.stage.getWidth();
      const stageHeight = this.stage.getHeight();
      const marginX = 160;
      const marginTop = 180;
      const marginBottom = 140;

      stationX = randomInRange(
        marginX,
        stageWidth - marginX - stationWidth
      );
      stationY = randomInRange(
        marginTop,
        stageHeight - marginBottom - stationHeight
      );
    }

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
    const destinationWidth = 180 * MOON_SCALE;
    const destinationHeight = 180 * MOON_SCALE;
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
    // Choose destination sprite based on planet
    const assetPath =
      this.planetId === 'mercury'
        ? '../../assets/mecury-sprite.png'
        : this.planetId === 'earth'
        ? '../../assets/earth-sprite.png'
        : this.planetId === 'venus'
        ? '../../assets/venus.png'
        : this.planetId === 'mars'
        ? '../../assets/mars.png'
        : this.planetId === 'jupiter'
        ? '../../assets/jupiter.png'
        : this.planetId === 'saturn'
        ? '../../assets/saturn.png'
        : this.planetId === 'uranus'
        ? '../../assets/uranus.png'
        : this.planetId === 'neptune'
        ? '../../assets/neptune.png'
        : '../../assets/moon-icon.png';
    image.src = new URL(assetPath, import.meta.url).href;
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
    
    // Don't check obstacle collisions when dialogue is showing
    if (!this.dialogueManager.isShowing()) {
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
    const config = getPlanetConfig(this.planetId);
    const stageWidth = this.stage.getWidth();
    const stageHeight = this.stage.getHeight();

    // Spawn region with margins so we don't overlap HUD/intel panel too much
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
      const velocityMagnitude = randomInRange(
        config.asteroidSpeedMin,
        config.asteroidSpeedMax
      );
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

      this.obstaclesSystem.addObstacle({
        id,
        entityId,
        width: hitboxWidth,
        height: hitboxHeight,
        fuelDrain: CONFIG.FUEL_DRAIN_PER_COLLISION,
        offsetX,
        offsetY,
      });

      this.createAsteroidNode(id, width, height);
    }
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
    const definitions = getCapsuleDefinitionsForPlanet(this.planetId);
    const stageWidth = this.stage.getWidth();
    const stageHeight = this.stage.getHeight();
    const marginX = 140;
    const marginTop = 160;
    const marginBottom = 140;

    definitions.forEach((definition) => {
      // For the Moon, keep original layout. For all other planets,
      // randomize capsule positions strongly within safe bounds.
      let capsuleX = definition.x;
      let capsuleY = definition.y;

      if (this.planetId !== 'moon') {
        capsuleX = randomInRange(
          marginX,
          stageWidth - marginX - definition.width
        );
        capsuleY = randomInRange(
          marginTop,
          stageHeight - marginBottom - definition.height
        );
      }

      const entityId = this.world.createEntity();
      this.world.addComponent(
        entityId,
        createPosition(capsuleX, capsuleY)
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
        capsuleX,
        capsuleY,
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

    const factsListEl = document.createElement('ul');
    factsListEl.style.cssText = `
      margin: 0;
      padding: 0;
      list-style: none;
      max-height: 400px;
      overflow-y: auto;
      overflow-x: hidden;
    `;
    
    const placeholder = document.createElement('li');
    placeholder.textContent = 'Collect a data capsule to download Neil\'s intel.';
    placeholder.style.cssText = `
      margin: 0;
      padding: 8px 0;
      font-size: 14px;
      line-height: 1.5;
      color: #a0c4e0;
      font-style: italic;
    `;
    factsListEl.appendChild(placeholder);

    container.appendChild(title);
    container.appendChild(countEl);
    container.appendChild(factsListEl);

    document.body.appendChild(container);
    this.intelPanel = container;
    this.intelCountEl = countEl;
    this.intelFactsListEl = factsListEl;

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
    
    // Update the facts list
    if (this.intelFactsListEl) {
      const collectedFacts = this.dataCapsulesSystem.getCollectedFacts();
      
      // Clear existing list items
      this.intelFactsListEl.innerHTML = '';
      
      if (collectedFacts.length === 0) {
        // Show placeholder if no facts collected
        const placeholder = document.createElement('li');
        placeholder.textContent = 'Collect a data capsule to download Neil\'s intel.';
        placeholder.style.cssText = `
          margin: 0;
          padding: 8px 0;
          font-size: 14px;
          line-height: 1.5;
          color: #a0c4e0;
          font-style: italic;
        `;
        this.intelFactsListEl.appendChild(placeholder);
      } else {
        // Show all collected facts as a numbered list
        collectedFacts.forEach((fact, index) => {
          const listItem = document.createElement('li');
          listItem.style.cssText = `
            margin: 0 0 12px 0;
            padding: 10px;
            font-size: 13px;
            line-height: 1.6;
            color: #e6f1ff;
            background: rgba(74, 158, 255, 0.15);
            border-left: 3px solid #4a9eff;
            border-radius: 4px;
          `;
          listItem.textContent = `${index + 1}. ${fact.text}`;
          if (this.intelFactsListEl) {
            this.intelFactsListEl.appendChild(listItem);
          }
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

  private handleCapsuleCollected = (payload: {
    capsuleId: string;
    fact: CapsuleFact;
    collectedCount: number;
    totalCapsules: number;
  }): void => {
    this.updateIntelProgress(payload.collectedCount, payload.totalCapsules);
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

    // Scale ship collision box for moon scene
    const shipBox = {
      x: shipPosition.x,
      y: shipPosition.y,
      width: CONFIG.SHIP_WIDTH * MOON_SCALE,
      height: CONFIG.SHIP_HEIGHT * MOON_SCALE,
    };
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
    const quiz = this.buildPlanetQuiz();
    this.quizActive = true;
    this.quizUI.showQuiz(quiz);
  }

  private getQuizId(): string {
    if (this.planetId === 'moon') {
      return 'moon-quiz';
    }
    if (this.planetId === 'mercury') {
      return 'mercury-quiz';
    }
    if (this.planetId === 'earth') {
      return 'earth-quiz';
    }
    return `${this.planetId}-quiz`;
  }

  private buildPlanetQuiz(): QuizData {
    const quizId = this.getQuizId();
    const baseQuiz = QUIZZES[quizId];

    // Fallback to moon quiz if something is misconfigured
    const safeQuiz = baseQuiz ?? QUIZZES['moon-quiz'];

    // Always show ALL questions regardless of collected capsules.
    const questions = safeQuiz.questions.map((question) => ({ ...question }));

    return {
      id: safeQuiz.id,
      title: safeQuiz.title,
      questions,
    };
  }

  private handleQuizPassed = (payload: { quizId: string }): void => {
    const expectedQuizId = this.getQuizId();
    if (payload.quizId !== expectedQuizId) {
      return;
    }
    this.quizActive = false;
    this.quizCompleted = true;
    this.saveRepository.setQuizResult('moon-quiz', true);
    this.saveRepository.setExplorationUnlocked(true);
    // Mark this planet as visited
    this.saveRepository.addVisitedPlanet(this.planetId);

    if (this.planetId === 'moon') {
      // For the Moon, show Neil's dialogue, then planet selection
      this.dialogueManager.showSequence('moon-quiz-complete', () => {
        this.showPlanetSelection();
      });
      // Safety net: if for some reason the dialogue completion callback
      // is never triggered (e.g. player doesn't click), automatically
      // show the planet selection after a short delay so they don't get
      // stuck flying around the Moon again.
      window.setTimeout(() => {
        if (!this.planetSelectionUI.isShowing()) {
          this.showPlanetSelection();
        }
      }, 6000);
    } else {
      // For Mercury and Earth, skip dialogue and go straight to planet selection
      this.showPlanetSelection();
    }
  };

  private showPlanetSelection(): void {
    const visitedPlanets = new Set(this.saveRepository.getVisitedPlanets());
    // Add current planet to visited planets if not already there
    visitedPlanets.add(this.planetId);
    
    this.planetSelectionUI.show({
      visitedPlanets,
      onSelect: (planet: PlanetInfo) => {
        // Mark planet as visited
        this.saveRepository.addVisitedPlanet(planet.id);
        // Hide planet selection UI before transitioning
        this.planetSelectionUI.hide();
        // Emit cutscene event with source (current planet) and destination planet
        this.eventBus.emit(EventTopics.CUTSCENE_START, {
          cutsceneId: `${this.planetId}-to-${planet.id}`,
          sourcePlanet: this.planetId === 'moon' ? 'Moon' : this.planetId.charAt(0).toUpperCase() + this.planetId.slice(1),
          destinationPlanet: planet.name,
        });
        // Transition to cutscene, which will then transition to the planet scene
        this.sceneManager.transitionTo('cutscene');
      },
    });
  }

  private handleFuelRefueled = (): void => {
    if (!this.refuelStationId || this.refuelUsesRemaining <= 0) {
      return;
    }

    // Consume one refuel use and remove the current station
    this.refuelUsesRemaining -= 1;

    // Remove trigger
    this.triggersSystem.removeTrigger('moon-refuel');

    // Remove visual
    if (this.refuelNode) {
      this.refuelNode.destroy();
      this.refuelNode = null;
      this.stage.backgroundLayer.batchDraw();
    }

    // Remove entity
    this.world.removeEntity(this.refuelStationId);
    this.refuelStationId = null;

    // If we still have refuel uses left, spawn another station at a new location
    if (this.refuelUsesRemaining > 0) {
      this.createRefuelStation();
    }
  };

  private handleFuelEmpty = (): void => {
    if (!this.shipId) return;
    const velocity = this.world.getComponent<Velocity>(
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
    // Reset refuel uses based on planet difficulty
    this.refuelUsesRemaining = getPlanetConfig(this.planetId).refuelUses;
    this.gameOverUI.hide();
    
    // Explicitly hide and clean up any dialogue - do NOT show tutorial again
    this.dialogueManager.hide();
    this.cleanupDialogue();
    
    // Ensure tutorial flag remains true so tutorial never shows again
    this.tutorialShown = true;

    // Reset or recreate ship
    if (!this.shipId) {
      // Ship was removed, recreate it
      this.createShip();
    } else {
      // Reset ship position
      const position = this.world.getComponent<Position>(
        this.shipId,
        'position'
      );
      if (position) {
        position.x = 80;
        position.y = this.stage.getHeight() - 200;
        position.angle = 0;
      }

      // Reset velocity
      const velocity = this.world.getComponent<Velocity>(
        this.shipId,
        'velocity'
      );
      if (velocity) {
        velocity.vx = 0;
        velocity.vy = 0;
      }

      // Reset fuel - ensure it's properly reset to 50%
      const fuel = this.world.getComponent<Fuel>(this.shipId, 'fuel');
      if (fuel) {
        fuel.current = CONFIG.FUEL_INITIAL; // 50%
        fuel.max = CONFIG.FUEL_MAX;
      } else {
        // Re-add fuel component if missing
        this.world.addComponent(
          this.shipId,
          createFuel(CONFIG.FUEL_MAX, CONFIG.FUEL_INITIAL)
        );
      }
    }

    // Reset quiz state
    this.quizActive = false;
    this.quizCompleted = false;
    this.awaitingQuizDecision = false;
    this.quizUI.dispose();
    this.quizConfirmation.hide();

    // Ensure tutorial doesn't show again on restart
    // (tutorialShown flag should remain true)
    
    // Reset data capsules
    this.dataCapsulesSystem.clear();
    // Recreate the Lunar Intel HUD so it always shows after a restart
    this.destroyIntelPanel();
    this.createIntelPanel();
    
    // Clear obstacles and recreate asteroids
    for (const entityId of this.asteroidEntities.values()) {
      this.world.removeEntity(entityId);
    }
    this.asteroidEntities.clear();
    this.asteroidNodes.forEach((node) => node.destroy());
    this.asteroidNodes.clear();
    
    // Recreate refuel station(s)
    this.createRefuelStation();
    
    // Recreate asteroids and capsules
    this.createAsteroids();
    this.createDataCapsules();
    
    // Sync entities for rendering
    this.entitiesLayer.syncEntities();
    
    // Update HUD to show reset fuel
    this.updateHud();
    
    // Ensure HUD is visible
    this.hud.show();
    
    // Don't show tutorial again on restart - tutorialShown flag remains true
  }

  private showTutorial(): void {
    const playerName = this.saveRepository.getPlayerName() || 'Explorer';
    this.dialogueManager.showSequence('moon-exploration-tutorial', () => {
      // Tutorial complete - player can now move
    });
  }
}

