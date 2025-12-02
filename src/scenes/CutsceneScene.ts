/**
 * Cutscene Scene - show an image (cut_scene.jpeg) with a simple fade / pan / zoom
 * Replaces the previous ship-sprite tween. After the cutscene finishes it
 * transitions to the ISS scene.
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
  private gameOverUI?: GameOverUI;

  private imageNode: Konva.Image | null = null;
  private tween: Konva.Tween | null = null;
  private caption: Konva.Text | null = null;
  private completed = false;

  constructor(
    sceneManager: SceneManager,
    stage: RenderStage,
    saveRepository: SaveRepository,
    _gameOverUI?: GameOverUI
  ) {
    this.sceneManager = sceneManager;
    this.stage = stage;
    this.saveRepository = saveRepository;
    this.gameOverUI = _gameOverUI;
  }

  init(): void {
    // Clear previous visuals
    this.stage.backgroundLayer.destroyChildren();
    if (this.stage.uiLayer) this.stage.uiLayer.destroyChildren();

    // Load the cutscene image (replace path if you keep assets elsewhere)
    const img = new Image();
    img.src = '/assets/cut_scene.jpeg'; // <-- changed jpeg line: put your file at public/assets/cut_scene.jpeg

    img.onload = () => {
      const sw = this.stage.getWidth();
      const sh = this.stage.getHeight();

      const imgW = img.width;
      const imgH = img.height;
      const scale = Math.max(sw / imgW, sh / imgH);

      this.imageNode = new Konva.Image({
        image: img,
        x: (sw - imgW * scale) / 2,
        y: (sh - imgH * scale) / 2,
        width: imgW * scale,
        height: imgH * scale,
        opacity: 0,
      });

      this.stage.backgroundLayer.add(this.imageNode);
      this.stage.backgroundLayer.batchDraw();

      // Fade in then gentle zoom/pan, then transition to ISS
      this.tween = new Konva.Tween({
        node: this.imageNode,
        duration: 3.0, // seconds
        opacity: 1,
        scaleX: 1.03,
        scaleY: 1.03,
        x: this.imageNode.x() - 15,
        y: this.imageNode.y() - 8,
        easing: Konva.Easings.EaseInOut,
        onFinish: () => {
          // hold final frame briefly then transition
          setTimeout(() => {
            this.complete();
          }, 800);
        },
      });

      this.tween.play();

      // optional caption on UI layer
      this.caption = new Konva.Text({
        text: 'Traveling to the ISS...',
        x: sw / 2,
        y: sh - 72,
        fontSize: 18,
        fontFamily: 'Arial',
        fill: '#ffffff',
        opacity: 0.9,
        align: 'center',
      });
      this.caption.offsetX(this.caption.width() / 2);
      if (this.stage.uiLayer) {
        this.stage.uiLayer.add(this.caption);
        this.stage.uiLayer.batchDraw();
      }
    };

    img.onerror = () => {
      console.error('Failed to load cutscene image:', img.src);
      // fallback: short delay then go to ISS
      setTimeout(() => this.sceneManager.transitionTo('iss'), 800);
    };
  }

  private complete(): void {
    if (this.completed) return;
    this.completed = true;

    // Update save/progress if needed (keep behavior consistent with prior cutscene)
    try {
      this.saveRepository.setTutorialDone?.(true);
      this.saveRepository.setExplorationUnlocked?.(true);
    } catch {
      // ignore if methods absent; SaveRepository may expose different helpers
    }

    // Transition to ISS
    this.sceneManager.transitionTo('iss');
  }

  update(_dt: number): void {
    // Animation handled by Konva.Tween
  }

  render(): void {
    // Static visuals; Konva handles rendering
  }

  dispose(): void {
    if (this.tween) {
      this.tween.pause();
      this.tween = null;
    }
    if (this.imageNode) {
      this.imageNode.destroy();
      this.imageNode = null;
    }
    if (this.caption) {
      this.caption.destroy();
      this.caption = null;
    }
    // ensure layers are clean
    this.stage.backgroundLayer.destroyChildren();
    if (this.stage.uiLayer) this.stage.uiLayer.destroyChildren();
  }
}