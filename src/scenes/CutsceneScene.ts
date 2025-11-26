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
  private readonly gameOverUI: GameOverUI;

  constructor(
    sceneManager: SceneManager,
    stage: RenderStage,
    saveRepository: SaveRepository,
    gameOverUI: GameOverUI
  ) {
    this.sceneManager = sceneManager;
    this.stage = stage;
    this.saveRepository = saveRepository;
    this.gameOverUI = gameOverUI;
  }

  init(): void {
    this.gameOverUI.hide();
    // Clear layers
    this.stage.backgroundLayer.destroyChildren();
    this.stage.uiLayer.destroyChildren();

    // Draw ISS (left side)
    const iss = new Konva.Rect({
      x: 100,
      y: this.stage.getHeight() / 2 - 40,
      width: 80,
      height: 80,
      fill: '#aaaaaa',
      stroke: '#888888',
      strokeWidth: 2,
    });
    this.stage.backgroundLayer.add(iss);

    const issLabel = new Konva.Text({
      text: 'ISS',
      x: 120,
      y: this.stage.getHeight() / 2 + 50,
      fontSize: 20,
      fontFamily: 'Arial',
      fill: '#ffffff',
    });
    this.stage.backgroundLayer.add(issLabel);

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
      fontFamily: 'Arial',
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

    // Wait a moment then transition
    setTimeout(() => {
      this.sceneManager.transitionTo('moon');
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
    if (this.tween) {
      this.tween.destroy();
    }
    this.shipSprite = null;
    this.tween = null;
    this.stage.backgroundLayer.destroyChildren();
    this.stage.uiLayer.destroyChildren();
  }
}
