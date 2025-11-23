/**
 * Moon Scene - exploration unlocked, shows facts
 */
import type { Scene } from '../engine/sceneManager.js';
import type { RenderStage } from '../render/stage.js';
import type { SaveRepository } from '../persistence/SaveRepository.js';
import type { GameOverUI } from '../ui/gameOver.js';
import Konva from 'konva';
import factsDataJson from '../data/facts.json' with { type: 'json' };
import { drawMoon } from '../render/moonSceneBackground.js';
import { addStars } from '../render/titleSceneBackground.js';
import type { SceneManager } from '../engine/sceneManager.js';
import type { EventBus } from '../engine/events.js'; 
import { EventTopics } from '../engine/events/topics.js'; 
import { QuizUI } from '../ui/quiz.js'; 
import { createButton } from '../ui/buttons.js';
import quizDataJson from '../data/quizzes.json' with { type: 'json' }; 
import type { QuizData } from '../ui/quiz.js'; 

interface Fact {
  title: string;
  content: string;
}

export class MoonScene implements Scene {
  private sceneManager: SceneManager;
  private stage: RenderStage;
  private eventBus: EventBus;
  private saveRepository: SaveRepository;
  private uiContainer: HTMLDivElement | null = null;
  private quizUI: QuizUI;

  constructor(
    sceneManager: SceneManager, 
    stage: RenderStage,
    eventBus: EventBus,
    saveRepository: SaveRepository,
    _gameOverUI: GameOverUI
  ) {
    this.sceneManager = sceneManager;
    this.stage = stage;
    this.eventBus = eventBus;
    this.saveRepository = saveRepository;
    this.quizUI = new QuizUI(eventBus);
  }

  init(): void {
    // Clear layers
    this.stage.backgroundLayer.destroyChildren();
    this.stage.uiLayer.destroyChildren();

    //add star background
    addStars(this.stage.backgroundLayer,100, this.stage.getWidth(), this.stage.getHeight());

    // Draw Moon
    const moon = drawMoon(this.stage.getWidth()/2,200, 200);
    this.stage.backgroundLayer.add(moon)

    // Get player name
    const playerName = this.saveRepository.getPlayerName() || 'Explorer';

    // Welcome message
    const welcome = new Konva.Text({
      text: `Welcome to the Moon, ${playerName}!`,
      x: this.stage.getWidth() / 2,
      y: 320,
      fontSize: 32,
      fontFamily: 'Arial',
      fill: '#ffffff',
      align: 'center',
      fontWeight: 'bold',
    });
    welcome.offsetX(welcome.width() / 2);
    this.stage.backgroundLayer.add(welcome);

    const unlocked = new Konva.Text({
      text: 'Exploration Unlocked!',
      x: this.stage.getWidth() / 2,
      y: 370,
      fontSize: 24,
      fontFamily: 'Arial',
      fill: '#4a9eff',
      align: 'center',
    });
    unlocked.offsetX(unlocked.width() / 2);
    this.stage.backgroundLayer.add(unlocked);
    
    //NOTE: sequence of events starts here
    // Display facts
    const facts = (factsDataJson as { facts: Fact[] }).facts;
    this.displayFacts(facts);

    this.stage.backgroundLayer.batchDraw();
  }

  private displayFacts(facts: Fact[]): void {
    this.uiContainer = document.createElement('div');
    this.uiContainer.style.cssText = `
      position: fixed;
      top: 420px;
      left: 50%;
      transform: translateX(-50%);
      width: 80%;
      max-width: 800px;
      max-height: 400px;
      overflow-y: auto;
      background: rgba(0, 0, 0, 0.7);
      padding: 20px;
      border-radius: 12px;
      z-index: 100;
      color: white;
      font-family: Arial, sans-serif;
    `;

    const title = document.createElement('h2');
    title.textContent = 'Lunar Facts';
    title.style.cssText = `
      margin: 0 0 16px 0;
      color: #4a9eff;
      font-size: 24px;
    `;
    this.uiContainer.appendChild(title);

    facts.forEach((fact) => {
      const factDiv = document.createElement('div');
      factDiv.style.cssText = `
        margin-bottom: 20px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 6px;
      `;

      const factTitle = document.createElement('h3');
      factTitle.textContent = fact.title;
      factTitle.style.cssText = `
        margin: 0 0 8px 0;
        color: #ffffff;
        font-size: 18px;
      `;

      const factContent = document.createElement('p');
      factContent.textContent = fact.content;
      factContent.style.cssText = `
        margin: 0;
        color: #cccccc;
        font-size: 14px;
        line-height: 1.6;
      `;

      factDiv.appendChild(factTitle);
      factDiv.appendChild(factContent);
      if (this.uiContainer) {
        this.uiContainer.appendChild(factDiv);
      }
    });

    //NOTE: added quiz button here, might need to be moved depending on game sequence
    const quizButton = createButton('Take Quiz', () => {
      this.startQuiz();
    });
    quizButton.style.marginTop = '20px';
    quizButton.style.width = '100%';

    if (this.uiContainer) {
      this.uiContainer.appendChild(quizButton);
    }

    if (this.uiContainer) {
      document.body.appendChild(this.uiContainer);
    }
  }

  private startQuiz(): void {
    // hide facts (basically everrthing)
    if (this.uiContainer){
      this.uiContainer.style.display = 'none'; 
    }

    // get quiz data
    const quizData = (quizDataJson as Record<string, QuizData>)['moon-quiz'];
    //handler for passed quiz.
    this.eventBus.on(EventTopics.QUIZ_PASSED, this.handleQuizPassed);
    //display quiz
    if (quizData) {
      this.quizUI.showQuiz(quizData);
    }
  }

  private handleQuizPassed = (event: { quizId: string }) => {
    if (event.quizId === 'moon-quiz') {
      // Now we can transition to new thing if needed
      this.saveRepository.setQuizResult('moon-quiz', true);
    }
  };

  render(): void {
    // Static scene
  }

  dispose(): void {
    this.eventBus.off(EventTopics.QUIZ_PASSED, this.handleQuizPassed);
    this.quizUI.dispose();

    if (this.uiContainer && this.uiContainer.parentNode) {
      this.uiContainer.parentNode.removeChild(this.uiContainer);
    }
    this.uiContainer = null;
    this.stage.backgroundLayer.destroyChildren();
    this.stage.uiLayer.destroyChildren();
  }

  update(_dt: number): void {
    // Static scene
  }
}
