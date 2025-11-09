/**
 * Title Scene - entry point
 */
import type { Scene } from '../engine/sceneManager.js';
import type { SceneManager } from '../engine/sceneManager.js';
import type { RenderStage } from '../render/stage.js';
import type { GameOverUI } from '../ui/gameOver.js';
import Konva from 'konva';
import { createButton } from '../ui/buttons.js';

export class TitleScene implements Scene {
  private sceneManager: SceneManager;
  private stage: RenderStage;
  private startButton: HTMLButtonElement | null = null;
  private uiContainer: HTMLDivElement | null = null;

  constructor(sceneManager: SceneManager, stage: RenderStage, _gameOverUI: GameOverUI) {
    this.sceneManager = sceneManager;
    this.stage = stage;
  }

  init(): void {
    // Clear layers
    this.stage.backgroundLayer.destroyChildren();
    this.stage.uiLayer.destroyChildren();

    // Add title text to background layer
    const title = new Konva.Text({
      text: 'Space Game MVP',
      x: this.stage.getWidth() / 2,
      y: this.stage.getHeight() / 2 - 100,
      fontSize: 48,
      fontFamily: 'Arial',
      fill: '#ffffff',
      align: 'center',
    });
    title.offsetX(title.width() / 2);

    const subtitle = new Konva.Text({
      text: 'Educational Space Adventure',
      x: this.stage.getWidth() / 2,
      y: this.stage.getHeight() / 2 - 40,
      fontSize: 24,
      fontFamily: 'Arial',
      fill: '#aaaaaa',
      align: 'center',
    });
    subtitle.offsetX(subtitle.width() / 2);

    this.stage.backgroundLayer.add(title);
    this.stage.backgroundLayer.add(subtitle);
    this.stage.backgroundLayer.batchDraw();

    // Create UI container
    this.uiContainer = document.createElement('div');
    this.uiContainer.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      gap: 16px;
      z-index: 200;
    `;

    // Start button
    this.startButton = createButton('Start', () => {
      this.sceneManager.transitionTo('name');
    });

    // Settings and Exit stubs
    const settingsButton = createButton('Settings', () => {
      // Settings functionality (stub)
    });

    const exitButton = createButton('Exit', () => {
      // Exit functionality (stub)
    });

    this.uiContainer.appendChild(this.startButton);
    this.uiContainer.appendChild(settingsButton);
    this.uiContainer.appendChild(exitButton);

    document.body.appendChild(this.uiContainer);
  }

  update(_dt: number): void {
    // Title scene is static
  }

  render(): void {
    // Static scene, no per-frame updates needed
  }

  dispose(): void {
    if (this.uiContainer && this.uiContainer.parentNode) {
      this.uiContainer.parentNode.removeChild(this.uiContainer);
    }
    this.startButton = null;
    this.uiContainer = null;
  }
}

