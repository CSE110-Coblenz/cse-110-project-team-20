import Konva from 'konva';

export function drawEarth(x: number, y: number, radius: number): Konva.Group {
    const earthGroup = new Konva.Group({
        x: x,
        y: y - 30,
    });

    const layer = new Konva.Layer();

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
    [-130, -300, 260, 40],
    [-230, -270, 100, 55],
    [-270, -230, 60, 120],
    [130, -270, 100, 55],
    [210, -230, 60, 120],
    [-130, 260, 260, 40],
    [-230, 215, 100, 55],
    [-270, 120, 60, 120],
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
    function makeLandRect(
        x: number, 
        y: number, 
        width: number, 
        height: number, 
        color: string = '#2e7c32'
    ) {
        return new Konva.Rect({x, y, width, height, fill: color});
    }

    const land = [
        [-150, -260, 170, 80],
        [-210, -220, 120, 140],
        [-250, -110, 60, 60],
        [130, -220, 80, 80],
        [-210, 70, 100, 150],
        [-130, 110, 100, 150],
        [-40, 180, 80, 80],
        [200, -110, 80, 240],
        [130, 100, 80, 115]
    ]

    land.forEach(([x, y, w, h]) => {
    earthGroup.add(makeLandRect(x, y, w, h));
    });

    /*const floatAnimation = new Konva.Animation((frame) => {
        const floatSpeed = 0.4; // pixels per second
        const floatHeight = 5; // maximum float height
        earthGroup.y(y - 30 + Math.sin(frame.time /floatSpeed) * floatHeight);
     }, layer);

     floatAnimation.start();
    */

    return earthGroup;
}