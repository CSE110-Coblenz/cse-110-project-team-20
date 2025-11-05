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

    // Simple landmass shapes

    earthGroup.add(ocean);

    return earthGroup;
}