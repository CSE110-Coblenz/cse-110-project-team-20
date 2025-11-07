/**
 * Quiz UI - renders MCQ from JSON, emits events
 */
import { Dialog } from './dialog.js';
import { createButton } from './buttons.js';
import type { EventBus } from '../engine/events.js';

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
}

export interface QuizData {
  id: string;
  title: string;
  questions: QuizQuestion[];
}

export class QuizUI {
  private dialog: Dialog;
  private eventBus: EventBus;
  private quizData: QuizData | null = null;
  private currentQuestion = 0;
  private selectedAnswers: number[] = [];

  constructor(eventBus: EventBus) {
    this.dialog = new Dialog();
    this.eventBus = eventBus;
  }

  showQuiz(quizData: QuizData): void {
    this.quizData = quizData;
    this.currentQuestion = 0;
    this.selectedAnswers = [];
    this.renderQuestion();
  }

  private renderQuestion(): void {
    if (!this.quizData) return;

    const question = this.quizData.questions[this.currentQuestion];
    if (!question) {
      this.checkAnswers();
      return;
    }

    let html = `
      <h2 style="margin-bottom: 16px; color: #4a9eff;">${this.quizData.title}</h2>
      <p style="margin-bottom: 8px; color: #888;">Question ${this.currentQuestion + 1} of ${this.quizData.questions.length}</p>
      <h3 style="margin-bottom: 16px;">${question.question}</h3>
      <div style="display: flex; flex-direction: column; gap: 8px;">
    `;

    question.options.forEach((option, index) => {
      html += `
        <button 
          class="quiz-option" 
          data-index="${index}"
          style="
            padding: 12px;
            text-align: left;
            background: #2a2a3e;
            border: 2px solid #444;
            border-radius: 6px;
            color: white;
            cursor: pointer;
            transition: all 0.2s;
          "
        >
          ${option}
        </button>
      `;
    });

    html += '</div>';

    this.dialog.show(html);

    // Attach event listeners
    const options = this.dialog.content.querySelectorAll('.quiz-option');
    options.forEach((button) => {
      button.addEventListener('click', () => {
        const index = parseInt(button.getAttribute('data-index') || '0');
        this.selectedAnswers[this.currentQuestion] = index;

        // Highlight selected
        options.forEach((opt) => {
          (opt as HTMLElement).style.border = '2px solid #444';
          (opt as HTMLElement).style.background = '#2a2a3e';
        });
        (button as HTMLElement).style.border = '2px solid #4a9eff';
        (button as HTMLElement).style.background = '#3a3a4e';

        // Auto-advance or show next
        setTimeout(() => {
          this.currentQuestion++;
          this.renderQuestion();
        }, 500);
      });
    });
  }

  private checkAnswers(): void {
    if (!this.quizData) return;

    let correctCount = 0;
    for (let i = 0; i < this.quizData.questions.length; i++) {
      if (this.selectedAnswers[i] === this.quizData.questions[i].correct) {
        correctCount++;
      }
    }

    const allCorrect = correctCount === this.quizData.questions.length;

    let html = `
      <h2 style="margin-bottom: 16px;">Quiz Results</h2>
      <p style="margin-bottom: 16px;">
        You got ${correctCount} out of ${this.quizData.questions.length} correct.
      </p>
    `;

    if (allCorrect) {
      html += '<p style="color: #00ff00; margin-bottom: 16px;">Congratulations! You passed!</p>';
      const closeBtn = createButton('Continue', () => {
        this.dialog.hide();
        this.eventBus.emit('quiz:passed', { quizId: this.quizData!.id });
      });
      html = `<div>${html}</div>`;
      this.dialog.show(html);
      this.dialog.content.appendChild(closeBtn);
    } else {
      html += '<p style="color: #ff0000; margin-bottom: 16px;">Try again!</p>';
      const retryBtn = createButton('Retry', () => {
        this.currentQuestion = 0;
        this.selectedAnswers = [];
        this.renderQuestion();
      });
      html = `<div>${html}</div>`;
      this.dialog.show(html);
      this.dialog.content.appendChild(retryBtn);
      this.eventBus.emit('quiz:failed', { quizId: this.quizData.id });
    }
  }

  isShowing(): boolean {
    return this.dialog.isShowing();
  }

  dispose(): void {
    this.dialog.dispose();
  }
}

