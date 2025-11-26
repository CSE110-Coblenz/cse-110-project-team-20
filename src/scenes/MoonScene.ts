/**
 * Moon Scene - interactive exploration experience
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
import { DialogueManager } from '../content/dialogue.js';
import type { DialogueSequence } from '../content/dialogue.js';
import { EventTopics } from '../engine/events/topics.js';
import { QuizUI } from '../ui/quiz.js';
import { createButton } from '../ui/buttons.js';
import quizDataJson from '../data/quizzes.json' with { type: 'json' };
import type { QuizData } from '../ui/quiz.js';

interface Fact {
  title: string;
  content: string;
}

interface MoonHotspot {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  facts: string[];
}

interface FactPanelElements {
  container: HTMLDivElement;
  titleEl: HTMLHeadingElement;
  contentEl: HTMLParagraphElement;
  hintEl: HTMLParagraphElement;
}

export class MoonScene implements Scene {
  private sceneManager: SceneManager;
  private stage: RenderStage;
  private eventBus: EventBus;
  private saveRepository: SaveRepository;
  private factPanel: FactPanelElements | null = null;
  private quizUI: QuizUI;
  private fallbackFacts: Fact[];
  private dialogueManager: DialogueManager;
  private neilGuideNode: Konva.Image | null = null;
  private readonly gameOverUI: GameOverUI;

  constructor(
    sceneManager: SceneManager,
    stage: RenderStage,
    eventBus: EventBus,
    saveRepository: SaveRepository,
    gameOverUI: GameOverUI
  ) {
    this.sceneManager = sceneManager;
    this.stage = stage;
    this.eventBus = eventBus;
    this.saveRepository = saveRepository;
    this.quizUI = new QuizUI(eventBus);
    this.fallbackFacts = (factsDataJson as { facts: Fact[] }).facts;
    this.dialogueManager = new DialogueManager();
    this.gameOverUI = gameOverUI;
  }

  init(): void {
    this.gameOverUI.hide();
    this.stage.backgroundLayer.destroyChildren();
    this.stage.uiLayer.destroyChildren();

    addStars(
      this.stage.backgroundLayer,
      100,
      this.stage.getWidth(),
      this.stage.getHeight()
    );

    const moonCenterX = this.stage.getWidth() / 2;
    const moonCenterY = 200;
    const moonDiameter = 220;
    const moon = drawMoon(moonCenterX, moonCenterY, moonDiameter);
    this.stage.backgroundLayer.add(moon);

    const playerName = this.saveRepository.getPlayerName() || 'Explorer';

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

    this.createFactPanel();
    this.createHotspots(moonCenterX, moonCenterY, moonDiameter / 2);
    this.addNeilGuideSprite();
    this.showNeilIntro(playerName);

    this.stage.backgroundLayer.batchDraw();
  }

  private createFactPanel(): void {
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: 420px;
      left: 50%;
      transform: translateX(-50%);
      width: 80%;
      max-width: 800px;
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
    container.appendChild(title);

    const hint = document.createElement('p');
    hint.textContent = 'Tap highlighted moon regions to uncover intel.';
    hint.style.cssText = `
      margin: 0 0 18px 0;
      color: #cccccc;
      font-size: 16px;
    `;
    container.appendChild(hint);

    const content = document.createElement('p');
    content.textContent = 'Awaiting your first discovery...';
    content.style.cssText = `
      margin: 0;
      color: #ffffff;
      font-size: 18px;
      line-height: 1.6;
    `;
    container.appendChild(content);

    const quizButton = createButton('Take Quiz', () => {
      this.startQuiz();
    });
    quizButton.style.marginTop = '20px';
    quizButton.style.width = '100%';
    container.appendChild(quizButton);

    document.body.appendChild(container);
    this.factPanel = {
      container,
      titleEl: title,
      contentEl: content,
      hintEl: hint,
    };
  }

  private createHotspots(
    moonX: number,
    moonY: number,
    moonRadius: number
  ): void {
    const hotspots: MoonHotspot[] = [
      {
        id: 'sea-of-tranquility',
        label: 'Sea of Tranquility',
        x: moonX + moonRadius * 0.05,
        y: moonY - moonRadius * 0.05,
        width: 65,
        height: 65,
        facts: [
          'Apollo 11 landed in the Sea of Tranquility on July 20, 1969, delivering humanity’s first moonwalk.',
          'The Sea of Tranquility is a basaltic plain formed by ancient volcanic eruptions, not a body of water.',
        ],
      },
      {
        id: 'tycho-crater',
        label: 'Tycho Crater',
        x: moonX + moonRadius * 0.42,
        y: moonY + moonRadius * 0.58,
        width: 56,
        height: 56,
        facts: [
          'Tycho Crater is roughly 108 million years old—geologically young for the Moon.',
          'Its bright rays stretch across the near side, easily spotted from Earth with binoculars.',
        ],
      },
      {
        id: 'copernicus-crater',
        label: 'Copernicus Crater',
        x: moonX - moonRadius * 0.48,
        y: moonY - moonRadius * 0.25,
        width: 78,
        height: 78,
        facts: [
          'Copernicus spans about 93 km and features central peaks rising ~800 meters.',
          'Scientists call Copernicus the textbook example of a complex crater thanks to its terraced walls.',
        ],
      },
    ];

    hotspots.forEach((hotspot) => {
      const region = new Konva.Rect({
        x: hotspot.x - hotspot.width / 2,
        y: hotspot.y - hotspot.height / 2,
        width: hotspot.width,
        height: hotspot.height,
        fill: 'rgba(74, 158, 255, 0.18)',
        stroke: '#4a9eff',
        strokeWidth: 2,
        cornerRadius: hotspot.width / 2,
        listening: true,
      });

      const label = new Konva.Text({
        text: hotspot.label,
        x: region.x(),
        y: region.y() - 24,
        fontSize: 14,
        fontFamily: 'Arial',
        fill: '#ffffff',
        width: hotspot.width,
        align: 'center',
      });

      region.on('mouseenter', () => {
        this.stage.stage.container().style.cursor = 'pointer';
      });
      region.on('mouseleave', () => {
        this.stage.stage.container().style.cursor = 'default';
      });
      region.on('click', () => this.updateFactPanel(hotspot));

      this.stage.backgroundLayer.add(region);
      this.stage.backgroundLayer.add(label);
    });
  }

  private updateFactPanel(hotspot: MoonHotspot): void {
    if (!this.factPanel) {
      return;
    }
    const pool =
      hotspot.facts.length > 0
        ? hotspot.facts
        : this.fallbackFacts.map((fact) => fact.content);
    const fact = pool[Math.floor(Math.random() * pool.length)];
    this.factPanel.titleEl.textContent = hotspot.label;
    this.factPanel.contentEl.textContent = fact;
    this.factPanel.hintEl.textContent =
      'Keep exploring—Neil has more intel waiting.';
  }

  private addNeilGuideSprite(): void {
    const imageObj = new Image();
    imageObj.src = new URL('../../assets/neilPaws.png', import.meta.url).href;
    imageObj.onload = () => {
      const stageHeight = this.stage.getHeight();
      const maxHeight = stageHeight * 0.32;
      const scale = Math.min(0.4, maxHeight / imageObj.height);
      this.neilGuideNode = new Konva.Image({
        x: 20,
        y: stageHeight - imageObj.height * scale - 20,
        image: imageObj,
        scaleX: scale,
        scaleY: scale,
        listening: false,
      });
      this.stage.backgroundLayer.add(this.neilGuideNode);
      this.stage.backgroundLayer.batchDraw();
    };
  }

  private showNeilIntro(playerName: string): void {
    const customSequence: DialogueSequence = {
      'moon-intro': [
        {
          id: 'moon-intro-1',
          character: 'Neil dePaws Tyson',
          text: `${playerName}, the Moon is dotted with hotspots of history. Tap the blue glows to collect their intel.`,
        },
        {
          id: 'moon-intro-2',
          character: 'Neil dePaws Tyson',
          text: 'Once you have each report, we will quiz you before charting our next jump.',
        },
      ],
    };
    this.dialogueManager.showSequence('moon-intro', undefined, customSequence);
  }

  private showNeilOutro(): void {
    const customSequence: DialogueSequence = {
      'moon-outro': [
        {
          id: 'moon-outro-1',
          character: 'Neil dePaws Tyson',
          text: 'Impressive recall, cadet. Those lunar facts fuel our trajectory.',
        },
        {
          id: 'moon-outro-2',
          character: 'Neil dePaws Tyson',
          text: 'Where do you want to go next? The further you travel, the deeper into space you go—the harder it is to get there.',
        },
      ],
    };
    this.dialogueManager.showSequence('moon-outro', undefined, customSequence);
  }

  private startQuiz(): void {
    if (this.factPanel) {
      this.factPanel.container.style.display = 'none';
    }

    const quizData = (quizDataJson as Record<string, QuizData>)['moon-quiz'];
    this.eventBus.on(EventTopics.QUIZ_PASSED, this.handleQuizPassed);
    if (quizData) {
      this.quizUI.showQuiz(quizData);
    }
  }

  private handleQuizPassed = (event: { quizId: string }) => {
    if (event.quizId === 'moon-quiz') {
      this.saveRepository.setQuizResult('moon-quiz', true);
      if (this.factPanel) {
        this.factPanel.container.style.display = 'block';
      }
      this.showNeilOutro();
    }
  };

  render(): void {
    // Static scene
  }

  dispose(): void {
    this.eventBus.off(EventTopics.QUIZ_PASSED, this.handleQuizPassed);
    this.quizUI.dispose();
    this.dialogueManager.dispose();

    if (this.factPanel) {
      this.factPanel.container.remove();
    }
    this.factPanel = null;
    if (this.neilGuideNode) {
      this.neilGuideNode.destroy();
      this.neilGuideNode = null;
    }
    this.stage.stage.container().style.cursor = 'default';
    this.stage.backgroundLayer.destroyChildren();
    this.stage.uiLayer.destroyChildren();
  }

  update(dt: number): void {
    void dt;
    // Static scene
  }
}
