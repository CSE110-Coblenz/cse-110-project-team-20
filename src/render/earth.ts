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

    // Pixel outline of Earth
    function makePixelatedOutlineRect(
        x: number, 
        y: number, 
        width: number, 
        height: number, 
        color: string = '#0547b2ff'
    ) {
        return new Konva.Rect({x, y, width, height, fill: color});
    }

    // All outline rectangles defined in one config list
    const outlineRects = [
    [-130, -300, 260, 50],
    [-230, -270, 100, 55],
    [-270, -230, 60, 120],
    [130, -270, 100, 55],
    [210, -230, 60, 120],
    [-130, 260, 260, 50],
    [-230, 270, 100, 55],
    [-270, 230, 60, 120],
    [120, 215, 100, 55],
    [210, 130, 60, 120],
    [-300, -130, 50, 260],
    [270, -130, 50, 260],
    ];

    // Convert the entries into Konva.Rect objects and add to group
    outlineRects.forEach(([x, y, w, h]) => {
    earthGroup.add(makePixelatedOutlineRect(x, y, w, h));
    });
    
    // Simple land shapes for Earth


    return earthGroup;
}