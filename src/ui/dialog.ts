/**
 * Modal dialog helper
 */
export class Dialog {
  private overlay: HTMLDivElement;
  public readonly content: HTMLDivElement;
  private showing : boolean = false

  constructor() {
    this.overlay = document.createElement('div');
    this.content = document.createElement('div');

    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    `;

    this.content.style.cssText = `
      background: #1a1a2e;
      padding: 24px;
      border-radius: 12px;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
      color: white;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    `;

    this.overlay.appendChild(this.content);
  }

  show(htmlContent: string): void {
    this.content.innerHTML = htmlContent;
    document.body.appendChild(this.overlay);
  }

  hide(): void {
    if (this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
  }

  isShowing(): boolean {
    return this.overlay.parentNode !== null;
  }

  dispose(): void {
    this.hide();
  }
}

