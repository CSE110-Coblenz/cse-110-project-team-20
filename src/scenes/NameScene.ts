/**
 * Name Entry Scene
 */
import type { Scene } from '../engine/sceneManager.js';
import type { SceneManager } from '../engine/sceneManager.js';
import type { RenderStage } from '../render/stage.js';
import type { SaveRepository } from '../persistence/SaveRepository.js';
import type { GameOverUI } from '../ui/gameOver.js';
import Konva from 'konva';
import { createButton } from '../ui/buttons.js';

export class NameScene implements Scene {
  private sceneManager: SceneManager;
  private stage: RenderStage;
  private saveRepository: SaveRepository;
  private uiContainer: HTMLDivElement | null = null;
  private input: HTMLInputElement | null = null;
  private submitButton: HTMLButtonElement | null = null;

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

    // Add prompt text
    const prompt = new Konva.Text({
      text: 'Enter Your Name',
      x: this.stage.getWidth() / 2,
      y: this.stage.getHeight() / 2 - 110,
      fontSize: 32,
      fontFamily: 'Press Start 2P',
      fill: '#ff914d',
      align: 'center',
    });
    prompt.offsetX(prompt.width() / 2);
    this.stage.backgroundLayer.add(prompt);
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
      align-items: center;
    `;

    // Input field
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.placeholder = 'Your name here...';
    this.input.style.cssText = `
      padding: 12px 16px;
      font-size: 18px;
      font-family: 'Press Start 2P';
      border: 2px solid #667eea;
      border-radius: 8px;
      background: #2a2a3e;
      color: white;
      min-width: 300px;
    `;

    // Submit button
    this.submitButton = createButton('Continue', () => {
      this.handleSubmit();
    });

    this.uiContainer.appendChild(this.input);
    this.uiContainer.appendChild(this.submitButton);

    // Enter key handler
    this.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleSubmit();
      }
    });

    document.body.appendChild(this.uiContainer);
    this.input.focus();
  }

  private handleSubmit(): void {
    const name = this.input?.value.trim() || '';
    if (name.length === 0) {
      alert('Please enter your name');
      return;
    }

    this.saveRepository.setPlayerName(name);
    this.sceneManager.transitionTo('iss');
  }

  update(_dt: number): void {
    // Static scene
  }

  render(): void {
    // Static scene
  }

  dispose(): void {
    if (this.uiContainer && this.uiContainer.parentNode) {
      this.uiContainer.parentNode.removeChild(this.uiContainer);
    }
    this.input = null;
    this.submitButton = null;
    this.uiContainer = null;
  }
}

