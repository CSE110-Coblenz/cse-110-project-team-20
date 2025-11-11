import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TitleScene } from '../scenes/TitleScene.js'; 
import type { SceneManager } from '../engine/sceneManager.js';
import type { RenderStage } from '../render/stage.js';

describe('TitleScene', () => {
  let titleScene: TitleScene;
  let mockSceneManager: SceneManager;
  let mockStage: RenderStage;

  beforeEach(() => {
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
