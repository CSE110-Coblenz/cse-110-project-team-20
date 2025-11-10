/**
 * Title Scene - entry point
 */
import type { Scene } from '../engine/sceneManager.js';
import type { SceneManager } from '../engine/sceneManager.js';
import type { RenderStage } from '../render/stage.js';
import Konva from 'konva';
import { createButton } from '../ui/buttons.js';
import { drawEarth } from '../render/earth.js';

export class TitleScene implements Scene {
  private sceneManager: SceneManager;
  private stage: RenderStage;
  private startButton: HTMLButtonElement | null = null;
  private uiContainer: HTMLDivElement | null = null;

  constructor(sceneManager: SceneManager, stage: RenderStage) {
    this.sceneManager = sceneManager;
    this.stage = stage;
  }

  init(): void {
    // Clear layers
    this.stage.backgroundLayer.destroyChildren();
    this.stage.uiLayer.destroyChildren();

    //Draw Earth background
    const earth = drawEarth(
      this.stage.getWidth() / 2,
      this.stage.getHeight() / 2,
      300
    );
    this.stage.backgroundLayer.add(earth);
    this.stage.backgroundLayer.batchDraw();


    // Add title text to background layer
    const title = new Konva.Text({
      text: 'Cat Space Agency',
      x: this.stage.getWidth() / 2,
      y: this.stage.getHeight() / 2 - 100,
      fontSize: 48,
      fontFamily: 'Press Start 2P',
      fontStyle: 'bold',
      fill: '#ff914d',
      align: 'center',
    });
    title.offsetX(title.width() / 2);

    const subtitle = new Konva.Text({
      text: 'Educational Space Adventure',
      x: this.stage.getWidth() / 2,
      y: this.stage.getHeight() / 2 - 20,
      fontSize: 24,
      fontFamily: 'Press Start 2P',
      fill: '#ffffff',
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
      transform: translate(-50%, 80%);
      display: flex;
      flex-direction: column;
      gap: 16px;
      z-index: 200;
    `;

    // Start button
    this.startButton = createButton('Start', () => {
      this.sceneManager.transitionTo('name');
    });

    this.uiContainer.appendChild(this.startButton);
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