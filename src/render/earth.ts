import Konva from 'konva';

export function drawEarth(x: number, y: number, radius: number): Konva.Group {
    const earthGroup = new Konva.Group({
        x: x,
        y: y - 30,
    });

    // Base blue circle for Earth
    const ocean = new Konva.Circle({
        radius,
        fill: '#3a86ff',
});

    earthGroup.add(ocean);

    // Pixel outline for Earth
    const outline = new Konva.Circle({
        radius,
        stroke: '#0448b5ff',
        strokeWidth: 10,
    });
    earthGroup.add(outline);

    // Simple landmass shapes

    return earthGroup;
}