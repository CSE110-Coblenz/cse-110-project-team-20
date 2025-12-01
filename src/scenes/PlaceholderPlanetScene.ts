/**
 * Placeholder Planet Scene - shows a message for planets that aren't fully implemented yet
 */
import type { Scene, SceneManager } from '../engine/sceneManager.js';
import type { RenderStage } from '../render/stage.js';
import type { GameOverUI } from '../ui/gameOver.js';
import type { SaveRepository } from '../persistence/SaveRepository.js';
import type { EventBus } from '../engine/events.js';
import { EventTopics } from '../engine/events/topics.js';
import { PlanetSelectionUI } from '../ui/planetSelection.js';
import type { PlanetInfo } from '../ui/planetSelection.js';

export class PlaceholderPlanetScene implements Scene {
  private sceneManager: SceneManager;
  private stage: RenderStage;
  private gameOverUI: GameOverUI;
  private saveRepository: SaveRepository;
  private eventBus: EventBus;
  private planetSelectionUI: PlanetSelectionUI;
  private container: HTMLDivElement | null = null;
  private planetName: string;

  constructor(
    sceneManager: SceneManager,
    stage: RenderStage,
    gameOverUI: GameOverUI,
    saveRepository: SaveRepository,
    eventBus: EventBus,
    planetName: string
  ) {
    this.sceneManager = sceneManager;
    this.stage = stage;
    this.gameOverUI = gameOverUI;
    this.saveRepository = saveRepository;
    this.eventBus = eventBus;
    this.planetSelectionUI = new PlanetSelectionUI(sceneManager);
    this.planetName = planetName;
  }

  init(): void {
    this.gameOverUI.hide();
    this.showPlaceholder();
  }

  private showPlaceholder(): void {
    if (this.container) {
      this.container.remove();
    }

    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    `;

    const panel = document.createElement('div');
    panel.style.cssText = `
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 2px solid #4a9eff;
      border-radius: 16px;
      padding: 48px;
      max-width: 600px;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7);
    `;

    const title = document.createElement('h1');
    title.textContent = `${this.planetName} Exploration`;
    title.style.cssText = `
      margin: 0 0 24px 0;
      color: #7ec9ff;
      font-size: 32px;
      text-transform: uppercase;
      letter-spacing: 2px;
    `;

    const message = document.createElement('p');
    message.textContent = `The ${this.planetName} exploration scene is coming soon! This planet will feature unique challenges and collectibles.`;
    message.style.cssText = `
      margin: 0 0 32px 0;
      color: #bfe1ff;
      font-size: 18px;
      line-height: 1.6;
    `;

    const backButton = document.createElement('button');
    backButton.textContent = 'Back to Planet Selection';
    backButton.style.cssText = `
      padding: 14px 28px;
      background: linear-gradient(135deg, #4a9eff 0%, #3a8eef 100%);
      border: none;
      border-radius: 8px;
      color: #ffffff;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    backButton.onmouseenter = () => {
      backButton.style.transform = 'scale(1.05)';
      backButton.style.boxShadow = '0 4px 16px rgba(74, 158, 255, 0.5)';
    };
    backButton.onmouseleave = () => {
      backButton.style.transform = 'scale(1)';
      backButton.style.boxShadow = 'none';
    };
    backButton.onclick = () => {
      // Show planet selection instead of going directly to moon-exploration
      // This prevents the moon level from replaying
      const visitedPlanets = new Set(this.saveRepository.getVisitedPlanets());
      this.planetSelectionUI.show({
        visitedPlanets,
        onSelect: (planet: PlanetInfo) => {
          this.saveRepository.addVisitedPlanet(planet.id);
          this.planetSelectionUI.hide();
          // First transition to cutscene so it can subscribe to CUTSCENE_START
          this.sceneManager.transitionTo('cutscene');
          // Then emit cutscene event with source (current planet) and destination
          setTimeout(() => {
            this.eventBus.emit(EventTopics.CUTSCENE_START, {
              cutsceneId: `${this.planetName.toLowerCase()}-to-${planet.id}`,
              sourcePlanet: this.planetName,
              destinationPlanet: planet.name,
            });
          }, 0);
        },
      });
    };

    panel.appendChild(title);
    panel.appendChild(message);
    panel.appendChild(backButton);
    container.appendChild(panel);
    document.body.appendChild(container);

    this.container = container;
  }

  update(_dt: number): void {
    // Static scene
  }

  render(): void {
    // Static scene
  }

  dispose(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.planetSelectionUI.dispose();
  }
}

