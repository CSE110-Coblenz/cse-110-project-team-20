/**
 * Cutscene Scene - scripted tween between planets
 */
import type { Scene } from '../engine/sceneManager.js';
import type { SceneManager } from '../engine/sceneManager.js';
import type { RenderStage } from '../render/stage.js';
import type { SaveRepository } from '../persistence/SaveRepository.js';
import type { GameOverUI } from '../ui/gameOver.js';
import type { EventBus } from '../engine/events.js';
import { EventTopics } from '../engine/events/topics.js';
import { PLANETS } from '../ui/planetSelection.js';
import Konva from 'konva';

export class CutsceneScene implements Scene {
  private sceneManager: SceneManager;
  private stage: RenderStage;
  private saveRepository: SaveRepository;
  private eventBus: EventBus;
  private shipSprite: Konva.Rect | null = null;
  private tween: Konva.Tween | null = null;
  private completed = false;
  private readonly gameOverUI: GameOverUI;
  private sourcePlanet: string = 'ISS';
  private destinationPlanet: string = 'Moon';
  private destinationSceneId: string = 'moon-exploration';
  private cutsceneDataReceived: boolean = false;
  private arrows: Konva.Arrow[] = [];

  constructor(
    sceneManager: SceneManager,
    stage: RenderStage,
    saveRepository: SaveRepository,
    gameOverUI: GameOverUI,
    eventBus: EventBus
  ) {
    this.sceneManager = sceneManager;
    this.stage = stage;
    this.saveRepository = saveRepository;
    this.gameOverUI = gameOverUI;
    this.eventBus = eventBus;
  }

  init(): void {
    this.gameOverUI.hide();
    this.cutsceneDataReceived = false;
    // Reset to defaults
    this.sourcePlanet = 'ISS';
    this.destinationPlanet = 'Moon';
    this.destinationSceneId = 'moon-exploration';
    
    // Listen for cutscene start event to get source/destination info
    this.eventBus.on(EventTopics.CUTSCENE_START, this.handleCutsceneStart);
    
    // Setup with default values (ISS to Moon) - will be updated if event is received
    // Use a small delay to allow event to be processed if it was emitted before init
    setTimeout(() => {
      if (!this.cutsceneDataReceived) {
        // No event received, use defaults (ISS to Moon)
        this.setupCutscene();
      }
    }, 50);
  }

  private handleCutsceneStart = (payload: {
    cutsceneId: string;
    sourcePlanet?: string;
    destinationPlanet?: string;
  }): void => {
    this.cutsceneDataReceived = true;
    if (payload.sourcePlanet) {
      this.sourcePlanet = payload.sourcePlanet;
    }
    if (payload.destinationPlanet) {
      this.destinationPlanet = payload.destinationPlanet;
      // Find the scene ID for the destination planet
      const planet = PLANETS.find(p => 
        p.name === payload.destinationPlanet || 
        p.id === payload.destinationPlanet?.toLowerCase() ||
        p.sceneId === payload.destinationPlanet
      );
      if (planet) {
        this.destinationSceneId = planet.sceneId;
      } else if (payload.destinationPlanet.toLowerCase() === 'moon') {
        this.destinationSceneId = 'moon-exploration';
      }
    }
    // Setup cutscene with the new data
    this.setupCutscene();
  };

  private setupCutscene(): void {
    // Clear layers
    this.stage.backgroundLayer.destroyChildren();
    this.stage.uiLayer.destroyChildren();

    // --- ADDED ROCKET SCENE LOGIC START ---
    const ROCKET_WIDTH = 40;
    const BODY_HEIGHT = 70;
    const NOSE_HEIGHT = 30;
    const FIN_EXTENSION = 20;

    // Create a Konva.Group to treat the rocket as a single entity.
    // It is positioned to be vertically centered on the stage's Y axis.
    const rocket = new Konva.Group({
      x: 100,
      y: this.stage.getHeight() / 2, // Center Y of the stage
      rotation: 90, // Set rotation to 90 degrees clockwise (to the right)
    });

    // 1. Main Body (White)
    const body = new Konva.Rect({
      x: -ROCKET_WIDTH / 2, 
      y: -BODY_HEIGHT / 2, 
      width: ROCKET_WIDTH,
      height: BODY_HEIGHT,
      fill: 'white',
      stroke: '#cccccc',
      strokeWidth: 2,
      cornerRadius: 4,
    });

    // 2. Nose Cone (Red) - using a custom Konva.Shape for a triangle
    const nose = new Konva.Shape({
      sceneFunc: function (context, shape) {
        context.beginPath();
        const topY = -BODY_HEIGHT / 2;
        const tipY = topY - NOSE_HEIGHT; // Tip is 30 units above the body top

        context.moveTo(-ROCKET_WIDTH / 2, topY); // Top left of body
        context.lineTo(ROCKET_WIDTH / 2, topY); // Top right of body
        context.lineTo(0, tipY); // Tip of the cone (X=0 for center)
        context.closePath();
        context.fillStrokeShape(shape);
      },
      fill: 'red',
      stroke: '#aa0000',
      strokeWidth: 2,
    });

    // 3. Right Fin (Red)
    const rightFin = new Konva.Shape({
      sceneFunc: function (context, shape) {
        context.beginPath();
        const baseBottomY = BODY_HEIGHT / 2;
        const baseTopY = baseBottomY - FIN_EXTENSION; // 20 units up from the bottom

        context.moveTo(ROCKET_WIDTH / 2, baseTopY); // Upper point attachment
        context.lineTo(ROCKET_WIDTH / 2 + FIN_EXTENSION, baseBottomY); // Tip point
        context.lineTo(ROCKET_WIDTH / 2, baseBottomY); // Lower point attachment
        context.closePath();
        context.fillStrokeShape(shape);
      },
      fill: 'red',
      stroke: '#aa0000',
      strokeWidth: 2,
    });

    // 4. Left Fin (Red)
    const leftFin = new Konva.Shape({
      sceneFunc: function (context, shape) {
        context.beginPath();
        const baseBottomY = BODY_HEIGHT / 2;
        const baseTopY = baseBottomY - FIN_EXTENSION;

        context.moveTo(-ROCKET_WIDTH / 2, baseTopY); // Upper point attachment
        context.lineTo(-ROCKET_WIDTH / 2 - FIN_EXTENSION, baseBottomY); // Tip point
        context.lineTo(-ROCKET_WIDTH / 2, baseBottomY); // Lower point attachment
        context.closePath();
        context.fillStrokeShape(shape);
      },
      fill: 'red',
      stroke: '#aa0000',
      strokeWidth: 2,
    });

    // Add all parts to the group
    rocket.add(body, nose, rightFin, leftFin);

    // Add the rocket group to the background layer
    this.stage.backgroundLayer.add(rocket);

    // Add the label for the rocket
    const rocketLabel = new Konva.Text({
      text: 'ROCKET',
      x: 110,
      y: this.stage.getHeight() / 2 + 50,
      fontSize: 20,
      fontFamily: 'Arial',
      fill: '#ffffff',
    });
    this.stage.backgroundLayer.add(rocketLabel);

    // Add three arrows pointing from the rocket toward the destination
    {
      const sw = this.stage.getWidth();
      const centerY = this.stage.getHeight() / 2;
      const startX = 140; // just right of the rocket
      const endX = sw - 240; // point toward the destination area
      const spacing = 18;
      const color = '#ffffff';

      for (let i = -1; i <= 1; i++) {
        const y = centerY + i * spacing;
        const arrow = new Konva.Arrow({
          points: [startX, y, endX, y],
          pointerLength: 14,
          pointerWidth: 10,
          fill: color,
          stroke: color,
          strokeWidth: 2,
        });
        this.arrows.push(arrow);
        this.stage.backgroundLayer.add(arrow);
      }
    }
    // --- ADDED ROCKET SCENE LOGIC END ---

    // Draw source planet label (Optional: You can keep this if you want the planet name too)
    const sourceLabel = new Konva.Text({
      text: this.sourcePlanet,
      x: 120,
      y: this.stage.getHeight() / 2 + 75, // Moved down slightly to avoid rocket label
      fontSize: 20,
      fontFamily: 'Arial',
      fill: '#ffffff',
    });
    sourceLabel.x(120 - (sourceLabel.width() / 2));
    this.stage.backgroundLayer.add(sourceLabel);

    // Draw destination planet (right side)
    const destSize = this.destinationPlanet === 'Moon' ? 120 : 100;
    const destY = this.stage.getHeight() / 2 - (destSize / 2);
    const destX = this.stage.getWidth() - 200;

    const destinationRect = new Konva.Rect({
      x: destX,
      y: destY,
      width: destSize,
      height: destSize,
      fill: '#000000', // base background so PNG stands out
      stroke: '#999999',
      strokeWidth: 2,
      cornerRadius: this.destinationPlanet === 'Moon' ? destSize / 2 : 0,
    });
    this.stage.backgroundLayer.add(destinationRect);

    // If we have a sprite for the destination planet, draw it centered on the rect.
    if (this.destinationPlanet === 'Moon') {
      const img = new Image();
      img.src = new URL('../../assets/moon-icon.png', import.meta.url).href;
      img.onload = () => {
        const sprite = new Konva.Image({
          x: destX,
          y: destY,
          width: destSize,
          height: destSize,
          image: img,
        });
        this.stage.backgroundLayer.add(sprite);
        this.stage.backgroundLayer.batchDraw();
      };
    }

    const destLabel = new Konva.Text({
      text: this.destinationPlanet,
      x: this.stage.getWidth() - 180,
      y: this.stage.getHeight() / 2 + 70,
      fontSize: 20,
      fontFamily: 'Arial',
      fill: '#ffffff',
    });
    destLabel.x(this.stage.getWidth() - 180 - (destLabel.width() / 2));
    this.stage.backgroundLayer.add(destLabel);

    // Create ship sprite that will move
    this.shipSprite = new Konva.Rect({
      x: 200,
      y: this.stage.getHeight() / 2 - 20,
      width: 40,
      height: 40,
      fill: '#4a9eff',
    });
    this.stage.backgroundLayer.add(this.shipSprite);

    // Add dynamic narration text
    const narration = new Konva.Text({
      text: `Traveling from ${this.sourcePlanet} to ${this.destinationPlanet}...`,
      x: this.stage.getWidth() / 2,
      y: 50,
      fontSize: 24,
      fontFamily: 'Arial',
      fill: '#ffffff',
      align: 'center',
    });
    narration.offsetX(narration.width() / 2);
    this.stage.uiLayer.add(narration);

    this.stage.backgroundLayer.batchDraw();
    this.stage.uiLayer.batchDraw();

    // Start tween animation
    this.startTween();
  }

  private startTween(): void {
    if (!this.shipSprite) return;

    // Animate ship from ISS to Moon
    this.tween = new Konva.Tween({
      node: this.shipSprite,
      x: this.stage.getWidth() - 240,
      duration: 3, // 3 seconds
      easing: (t: number) => t, // linear
      onFinish: () => {
        this.complete();
      },
    });

    this.tween.play();
  }

  private complete(): void {
    if (this.completed) return;
    this.completed = true;

    // Update save data
    this.saveRepository.setTutorialDone(true);
    this.saveRepository.setExplorationUnlocked(true);

    // Wait a moment then transition to destination
    setTimeout(() => {
      this.sceneManager.transitionTo(this.destinationSceneId);
    }, 1000);
  }

  update(dt: number): void {
    void dt;
    // Tween handles updates automatically
    // Just need to batch draw
  }

  render(): void {
    this.stage.batchDraw();
  }

  dispose(): void {
    this.eventBus.off(EventTopics.CUTSCENE_START, this.handleCutsceneStart);
    if (this.tween) {
      this.tween.destroy();
    }
    if (this.arrows.length) {
      this.arrows.forEach(a => a.destroy());
      this.arrows = [];
    }
    this.shipSprite = null;
    this.tween = null;
    this.stage.backgroundLayer.destroyChildren();
    this.stage.uiLayer.destroyChildren();
  }
}