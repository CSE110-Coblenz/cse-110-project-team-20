/**
 * HUD rendering - fuel bar (DOM-based)
 */
export class HUD {
  private container: HTMLDivElement;
  private fuelBar: HTMLDivElement;
  private fuelBarFill: HTMLDivElement;
  private fuelText: HTMLDivElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 100;
      color: white;
      font-family: 'Press Start 2P';
    `;

    this.fuelText = document.createElement('div');
    this.fuelText.textContent = 'Fuel';
    this.fuelText.style.cssText = `
      margin-bottom: 8px;
      font-weight: bold;
      font-size: 14px;
      font-family: 'Press Start 2P';
    `;

    this.fuelBar = document.createElement('div');
    this.fuelBar.style.cssText = `
      width: 200px;
      height: 24px;
      background: #333;
      border: 2px solid #555;
      border-radius: 4px;
      overflow: hidden;
      position: relative;
    `;

    this.fuelBarFill = document.createElement('div');
    this.fuelBarFill.style.cssText = `
      height: 100%;
      background: linear-gradient(90deg, #00ff00 0%, #ffff00 50%, #ff0000 100%);
      width: 100%;
      transition: width 0.1s ease-out;
    `;

    this.fuelBar.appendChild(this.fuelBarFill);
    this.container.appendChild(this.fuelText);
    this.container.appendChild(this.fuelBar);

    document.body.appendChild(this.container);
  }

  updateFuel(current: number, max: number): void {
    const percentage = Math.max(0, Math.min(100, (current / max) * 100));
    this.fuelBarFill.style.width = `${percentage}%`;
    let fuel_text_cap = Math.max(0, Math.min(100, current))
    this.fuelText.textContent = `Fuel: ${fuel_text_cap.toFixed(1)}/${max}`;
  }

  dispose(): void {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}

