import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TitleScene } from '../scenes/TitleScene.js'; 
import type { SceneManager } from '../engine/sceneManager.js';
import type { RenderStage } from '../render/stage.js';

describe('TitleScene', () => {
  let titleScene: TitleScene;
  let mockSceneManager: SceneManager;
  let mockStage: RenderStage;

  beforeEach(() => {
    (HTMLCanvasElement.prototype as any).getContext = vi.fn(() => ({
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      rect: vi.fn(),
      measureText: vi.fn(() => ({ width: 100 })),
    } as unknown as CanvasRenderingContext2D));
    
    // Mock SceneManager
    mockSceneManager = {
      transitionTo: vi.fn(),
    } as unknown as SceneManager;

    // Mock stage with just the required properties
    mockStage = {
      backgroundLayer: { destroyChildren: vi.fn(), add: vi.fn(), batchDraw: vi.fn() },
      uiLayer: { destroyChildren: vi.fn() },
      getWidth: () => 800,
      getHeight: () => 600,
    } as unknown as RenderStage;

    // Clean DOM
    document.body.innerHTML = '';

    // Initialize TitleScene
    titleScene = new TitleScene(mockSceneManager, mockStage);
    titleScene.init();
  });

  it('should call sceneManager.transitionTo("name") when start button is clicked', () => {
    const startButton = titleScene['startButton']; 
    expect(startButton).not.toBeNull();

    // Simulate click
    startButton!.click();

    expect(mockSceneManager.transitionTo).toHaveBeenCalledWith('name');
  });
});
