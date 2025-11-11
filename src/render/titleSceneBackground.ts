import Konva from 'konva';

// Function to draw Earth at given position with pixel art style
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

    // Outline rectangles in one quadrant to be mirrored
    const outlineRects = [
        [-130, -300, 130, 30],
        [-200, -270, 90, 30],
        [-230, -240, 50, 30],
        [-260, -210, 50, 30],
        [-280, -180, 40, 30],
        [-290, -160, 30, 30],
        [-300, -130, 30, 130]
    ];

    // Mirror the rectangles to create full outline
    function addMirroredRects(group: Konva.Group, rects: number[][]) {
        rects.forEach(([x, y, width, height]) => {
            const positions = [
                [x, y],
                [-x - width, y],
                [x, -y - height],
                [-x - width, -y - height]
            ];

            positions.forEach(([mx, my]) => {
                group.add(makePixelatedOutlineRect(mx, my, width, height));
            });
        });
    };

    addMirroredRects(earthGroup, outlineRects);
    
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
        [-120, -270, 100, 100],
        [-180, -250, 120, 130],
        [-220, -210, 80, 100],
        [-260, -180, 80, 50],
        [-230, 160, 50, 50],
        [-190, 150, 130, 90],
        [-115, 180, 130, 90],
        [-170, 80, 100, 90],
        [50, -200, 80, 100],
        [80, -150, 100, 80],
        [120, -100, 80, 50],
        [150, 110, 100, 80],
        [130, 180, 80, 50],
        [110, 230, 80, 20],
    ]

    land.forEach(([x, y, w, h]) => {
    earthGroup.add(makeLandRect(x, y, w, h));
    });

    // Floating animation
    const floatSpeed = 500;
    const floatHeight = 10;

    const floatAnimation = new Konva.Animation((frame) => {
        const t = frame.time / floatSpeed;
        earthGroup.y(y - 30 + Math.sin(t) * floatHeight);
     });

    floatAnimation.start();

    return earthGroup;
}

// Function to add stars to a given layer
export function addStars(layer: Konva.Layer, count: number, width: number, height: number) {
    for (let i = 0; i < count; i++) {
        const star = new Konva.Circle({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 1.5 + 0.5,
            fill: 'white',
            opacity: Math.random() * 0.8 + 0.2
        });
        layer.add(star);
    }
}
