import Konva from 'konva';

export function drawMoon(x: number, y: number, radius: number): Konva.Group {
  const moonGroup = new Konva.Group({
    x: x,
    y: y,
  });

  // Base gray circle
  const surface = new Konva.Circle({
    radius,
    fill: '#d3d3d3',
  });
  moonGroup.add(surface);

  //Same style as Earth
  function makePixelatedOutlineRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string = '#808080'
  ) {
    return new Konva.Rect({ x, y, width, height, fill: color });
  }

  // Reuse the same outline rects as Earth for consistent shape
  const outlineRects = [
    [-130, -300, 130, 30],
    [-200, -270, 90, 30],
    [-230, -240, 50, 30],
    [-260, -210, 50, 30],
    [-280, -180, 40, 30],
    [-290, -160, 30, 30],
    [-300, -130, 30, 130],
  ];

  // Scale factor to fit the radius provided
  const scale = radius / 300;

  function addMirroredRects(group: Konva.Group, rects: number[][]) {
    rects.forEach(([rx, ry, rw, rh]) => {
      // Scale positions
      const sx = rx * scale;
      const sy = ry * scale;
      const sw = rw * scale;
      const sh = rh * scale;

      const positions = [
        [sx, sy],
        [-sx - sw, sy],
        [sx, -sy - sh],
        [-sx - sw, -sy - sh],
      ];

      positions.forEach(([mx, my]) => {
        group.add(makePixelatedOutlineRect(mx, my, sw, sh));
      });
    });
  }

  addMirroredRects(moonGroup, outlineRects);

  function makeCraterRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string = '#a9a9a9'
  ) {
    return new Konva.Rect({ x, y, width, height, fill: color });
  }

  //craters
  // Coordinates for  center
  const craters = [
    [-0.4 * radius, -0.3 * radius, 0.3 * radius, 0.3 * radius],
    [0.2 * radius, 0.4 * radius, 0.25 * radius, 0.25 * radius],
    [-0.2 * radius, 0.5 * radius, 0.15 * radius, 0.15 * radius],
    [0.5 * radius, -0.2 * radius, 0.1 * radius, 0.1 * radius],
    [0.1 * radius, -0.5 * radius, 0.2 * radius, 0.15 * radius],
  ];

  craters.forEach(([cx, cy, cw, ch]) => {
    moonGroup.add(makeCraterRect(cx, cy, cw, ch));
  });

  //floating mechanic just like title screen on earth
  const floatSpeed = 600;
  const floatHeight = 8;

  const floatAnimation = new Konva.Animation((frame) => {
    const t = frame.time / floatSpeed;
    moonGroup.y(y + Math.sin(t) * floatHeight);
  }, moonGroup.getLayer());

  floatAnimation.start();

  return moonGroup;
}
