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

    // Draw source planet (left side)
    const sourceRect = new Konva.Rect({
      x: 100,
      y: this.stage.getHeight() / 2 - 40,
      width: 80,
      height: 80,
      fill: '#aaaaaa',
      stroke: '#888888',
      strokeWidth: 2,
      cornerRadius: this.sourcePlanet === 'Moon' ? 40 : 0,
    });
    this.stage.backgroundLayer.add(sourceRect);

    const sourceLabel = new Konva.Text({
      text: this.sourcePlanet,
      x: 120,
      y: this.stage.getHeight() / 2 + 50,
      fontSize: 20,
      fontFamily: 'Arial',
      fill: '#ffffff',
    });
    sourceLabel.x(120 - (sourceLabel.width() / 2));
    this.stage.backgroundLayer.add(sourceLabel);

    // Draw destination planet (right side)
    const destSize = this.destinationPlanet === 'Moon' ? 120 : 100;
    const destY = this.stage.getHeight() / 2 - (destSize / 2);
    const destinationRect = new Konva.Rect({
      x: this.stage.getWidth() - 200,
      y: destY,
      width: destSize,
      height: destSize,
      fill: this.destinationPlanet === 'Moon' ? '#cccccc' : '#ffaa44',
      stroke: '#999999',
      strokeWidth: 2,
      cornerRadius: this.destinationPlanet === 'Moon' ? destSize / 2 : 0,
    });
    this.stage.backgroundLayer.add(destinationRect);

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
    this.shipSprite = null;
    this.tween = null;
    this.stage.backgroundLayer.destroyChildren();
    this.stage.uiLayer.destroyChildren();
  }
}
