/**
 * Cutscene Scene - scripted tween from ISS to Moon
 */
import type { Scene } from '../engine/sceneManager.js';
import type { SceneManager } from '../engine/sceneManager.js';
import type { RenderStage } from '../render/stage.js';
import type { SaveRepository } from '../persistence/SaveRepository.js';
import type { GameOverUI } from '../ui/gameOver.js';
import Konva from 'konva';

export class CutsceneScene implements Scene {
  private sceneManager: SceneManager;
  private stage: RenderStage;
  private saveRepository: SaveRepository;
  private shipSprite: Konva.Rect | null = null;
  private tween: Konva.Tween | null = null;
  private completed = false;
  private arrows: Konva.Arrow[] = [];

  constructor(
    sceneManager: SceneManager,
    stage: RenderStage,
    saveRepository: SaveRepository,
    _gameOverUI: GameOverUI
  ) {
    this.sceneManager = sceneManager;
    this.stage = stage;
    this.saveRepository = saveRepository;
  }

  init(): void {
    // Clear layers
    this.stage.backgroundLayer.destroyChildren();
    this.stage.uiLayer.destroyChildren();

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
    // Positioned relative to the Group's center (0,0)
    const body = new Konva.Rect({
      x: -ROCKET_WIDTH / 2, // Start X at -20 (centered)
      y: -BODY_HEIGHT / 2, // Start Y at -35 (centered)
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
      fontFamily: 'Press Start 2P',
      fill: '#ffffff',
    });
    this.stage.backgroundLayer.add(rocketLabel);

    // Add three arrows pointing from the rocket toward the Moon
    {
      const sw = this.stage.getWidth();
      const centerY = this.stage.getHeight() / 2;
      const startX = 140; // just right of the rocket
      const endX = sw - 240; // point toward the moon area (slightly before moon)
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

    // Draw Moon (right side)
    const moon = new Konva.Rect({
      x: this.stage.getWidth() - 200,
      y: this.stage.getHeight() / 2 - 60,
      width: 120,
      height: 120,
      fill: '#cccccc',
      stroke: '#999999',
      strokeWidth: 2,
      cornerRadius: 60,
    });
    this.stage.backgroundLayer.add(moon);

    const moonLabel = new Konva.Text({
      text: 'Moon',
      x: this.stage.getWidth() - 180,
      y: this.stage.getHeight() / 2 + 70,
      fontSize: 20,
      fontFamily: 'Press Start 2P',
      fill: '#ffffff',
    });
    this.stage.backgroundLayer.add(moonLabel);

    // Create ship sprite that will move
    this.shipSprite = new Konva.Rect({
      x: 200,
      y: this.stage.getHeight() / 2 - 20,
      width: 40,
      height: 40,
      fill: '#4a9eff',
    });
    this.stage.backgroundLayer.add(this.shipSprite);

    // Add narration text
    const narration = new Konva.Text({
      text: 'Traveling from ISS to the Moon...',
      x: this.stage.getWidth() / 2,
      y: 50,
      fontSize: 24,
      fontFamily: 'Press Start 2P',
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

    // Wait a moment then transition
    setTimeout(() => {
      this.sceneManager.transitionTo('moon');
    }, 1000);
  }

  update(_dt: number): void {
    // Tween handles updates automatically
    // Just need to batch draw
  }

  render(): void {
    this.stage.batchDraw();
  }

  dispose(): void {
    if (this.tween) {
      this.tween.destroy();
    }
    if (this.arrows && this.arrows.length) {
      this.arrows.forEach(a => a.destroy());
      this.arrows = [];
    }
    this.shipSprite = null;
    this.tween = null;
    this.stage.backgroundLayer.destroyChildren();
  }
}
