/**
 * Planet Selection UI - allows players to choose which planet to explore
 */
import type { SceneManager } from '../engine/sceneManager.js';

export interface PlanetInfo {
  id: string;
  name: string;
  sceneId: string;
  difficulty: number; // 1-8, where 1 is easiest (Mercury) and 8 is hardest (Neptune)
  description: string;
}

export const PLANETS: PlanetInfo[] = [
  {
    id: 'mercury',
    name: 'Mercury',
    sceneId: 'mercury-exploration',
    difficulty: 1,
    description: 'The closest planet to the Sun. Extreme temperatures and no atmosphere.',
  },
  {
    id: 'venus',
    name: 'Venus',
    sceneId: 'venus-exploration',
    difficulty: 2,
    description: 'Hottest planet in the solar system with a thick, toxic atmosphere.',
  },
  {
    id: 'mars',
    name: 'Mars',
    sceneId: 'mars-exploration',
    difficulty: 3,
    description: 'The Red Planet. Home to the largest volcano in the solar system.',
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    sceneId: 'jupiter-exploration',
    difficulty: 4,
    description: 'The largest planet. A gas giant with a Great Red Spot storm.',
  },
  {
    id: 'saturn',
    name: 'Saturn',
    sceneId: 'saturn-exploration',
    difficulty: 5,
    description: 'Famous for its spectacular ring system made of ice and rock.',
  },
  {
    id: 'uranus',
    name: 'Uranus',
    sceneId: 'uranus-exploration',
    difficulty: 6,
    description: 'An ice giant that rotates on its side. Cold and mysterious.',
  },
  {
    id: 'neptune',
    name: 'Neptune',
    sceneId: 'neptune-exploration',
    difficulty: 7,
    description: 'The farthest planet from the Sun. Windiest planet with supersonic storms.',
  },
];

export interface PlanetSelectionOptions {
  visitedPlanets: Set<string>; // Set of planet IDs that have been visited
  onSelect: (planet: PlanetInfo) => void;
}

export class PlanetSelectionUI {
  private container: HTMLDivElement | null = null;
  private sceneManager: SceneManager;

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
  }

  show(options: PlanetSelectionOptions): void {
    this.hide(); // Clean up any existing UI

    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 3000;
      backdrop-filter: blur(4px);
    `;

    const panel = document.createElement('div');
    panel.style.cssText = `
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 2px solid #4a9eff;
      border-radius: 16px;
      padding: 32px;
      max-width: 900px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7);
    `;

    const title = document.createElement('h2');
    title.textContent = 'Select Your Destination';
    title.style.cssText = `
      margin: 0 0 24px 0;
      color: #7ec9ff;
      font-size: 28px;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 2px;
    `;

    const subtitle = document.createElement('p');
    subtitle.textContent = 'Choose a planet to explore. The further you travel, the more difficult it becomes!';
    subtitle.style.cssText = `
      margin: 0 0 24px 0;
      color: #bfe1ff;
      font-size: 16px;
      text-align: center;
    `;

    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    `;

    PLANETS.forEach((planet) => {
      const isVisited = options.visitedPlanets.has(planet.id);
      const button = document.createElement('button');
      button.style.cssText = `
        padding: 20px;
        background: ${isVisited ? 'linear-gradient(135deg, #2a4a6e 0%, #1a3a5e 100%)' : 'linear-gradient(135deg, #1a3a5e 0%, #0a2a4e 100%)'};
        border: 2px solid ${isVisited ? '#88ffcc' : '#4a9eff'};
        border-radius: 12px;
        color: #f4f8ff;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        text-align: center;
        position: relative;
        min-height: 120px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      `;

      button.innerHTML = `
        <div style="font-size: 24px; margin-bottom: 8px;">${this.getPlanetEmoji(planet.id)}</div>
        <div style="font-size: 20px; margin-bottom: 4px;">${planet.name}</div>
        <div style="font-size: 12px; color: #a0c4e0; margin-bottom: 8px;">Difficulty: ${'★'.repeat(planet.difficulty)}</div>
        ${isVisited ? '<div style="font-size: 11px; color: #88ffcc; font-style: italic;">✓ Visited</div>' : ''}
      `;

      button.onmouseenter = () => {
        button.style.transform = 'scale(1.05)';
        button.style.boxShadow = '0 4px 16px rgba(74, 158, 255, 0.5)';
      };

      button.onmouseleave = () => {
        button.style.transform = 'scale(1)';
        button.style.boxShadow = 'none';
      };

      button.onclick = () => {
        // Check if scene exists before selecting
        // For now, we'll always allow selection - the scene manager will handle missing scenes
        options.onSelect(planet);
      };

      grid.appendChild(button);
    });

    panel.appendChild(title);
    panel.appendChild(subtitle);
    panel.appendChild(grid);

    container.appendChild(panel);
    document.body.appendChild(container);

    this.container = container;
  }

  hide(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
  }

  isShowing(): boolean {
    return this.container !== null;
  }

  dispose(): void {
    this.hide();
  }

  private getPlanetEmoji(planetId: string): string {
    const emojiMap: Record<string, string> = {
      mercury: '☿️',
      venus: '♀️',
      mars: '♂️',
      jupiter: '♃',
      saturn: '♄',
      uranus: '⛢',
      neptune: '♆',
    };
    return emojiMap[planetId] || '🪐';
  }
}

