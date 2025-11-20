/**
 * Game Over UI - Reusable component for fuel empty and other game over states
 */
import { Dialog } from './dialog.js';

export interface GameOverOptions {
  title: string;
  message: string;
  buttonText?: string;
  onRestart?: () => void;
}

export class GameOverUI {
  private dialog: Dialog | null = null;

  /**
   * Show game over dialog
   */
  show(options: GameOverOptions): void {
    // Prevent showing multiple dialogs
    if (this.dialog) return;

    this.dialog = new Dialog();
    const buttonText = options.buttonText || 'Start Over';
    
    const dialogHTML = `
      <div style="text-align: center; padding: 20px;">
        <h2 style="color: #ff4444; margin: 0 0 16px 0; font-size: 28px;">${options.title}</h2>
        <p style="color: #ffffff; margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">
          ${options.message}
        </p>
        <button id="game-over-button" style="
          background: #4a9eff;
          color: white;
          border: none;
          padding: 12px 32px;
          font-size: 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
          transition: background 0.2s;
        " onmouseover="this.style.background='#3a8eef'" onmouseout="this.style.background='#4a9eff'">
          ${buttonText}
        </button>
      </div>
    `;

    this.dialog.show(dialogHTML);

    // Add button handler
    const button = this.dialog.content.querySelector('#game-over-button');
    if (button && options.onRestart) {
      button.addEventListener('click', () => {
        options.onRestart!();
        this.hide();
      });
    }
  }

  /**
   * Hide game over dialog
   */
  hide(): void {
    if (this.dialog) {
      this.dialog.hide();
      this.dialog = null;
    }
  }

  /**
   * Check if game over dialog is showing
   */
  isShowing(): boolean {
    return this.dialog !== null;
  }

  /**
   * Dispose of game over UI
   */
  dispose(): void {
    this.hide();
  }
}

