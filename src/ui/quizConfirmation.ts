/**
 * Quiz confirmation dialog - lightweight modal to confirm quiz start.
 */
import { Dialog } from './dialog.js';
import { createButton } from './buttons.js';

export interface QuizConfirmationOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export class QuizConfirmation {
  private dialog: Dialog;

  constructor() {
    this.dialog = new Dialog();
  }

  show(options: QuizConfirmationOptions): void {
    const title = options.title ?? 'Proceed to quiz?';
    const confirmText = options.confirmText ?? 'Take Quiz';
    const cancelText = options.cancelText ?? 'Keep Exploring';

    const html = `
      <div>
        <h2 style="margin-bottom: 12px;">${title}</h2>
        <p style="margin-bottom: 18px;">${options.message}</p>
      </div>
    `;

    this.dialog.show(html);

    const buttonRow = document.createElement('div');
    buttonRow.style.cssText = `
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    `;

    const confirmButton = createButton(confirmText, () => {
      this.hide();
      options.onConfirm();
    });
    const cancelButton = createButton(cancelText, () => {
      this.hide();
      options.onCancel?.();
    });

    buttonRow.appendChild(cancelButton);
    buttonRow.appendChild(confirmButton);
    this.dialog.content.appendChild(buttonRow);
  }

  hide(): void {
    this.dialog.hide();
  }

  isShowing(): boolean {
    return this.dialog.isShowing();
  }

  dispose(): void {
    this.dialog.dispose();
  }
}

