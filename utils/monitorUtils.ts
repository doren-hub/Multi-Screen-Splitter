
import { SetupConfig, MonitorConfig } from '../types';

// Standard aspect ratio 16:9
const ASPECT_RATIO = 16 / 9;

// Calculate physical width and height in inches based on diagonal size and aspect ratio
export const calculatePhysicalDimensions = (diagonalInches: number, orientation: 'landscape' | 'portrait') => {
  const theta = Math.atan(1 / ASPECT_RATIO); // Angle for 16:9
  let width = diagonalInches * Math.cos(theta);
  let height = diagonalInches * Math.sin(theta);

  if (orientation === 'portrait') {
    return { width: height, height: width };
  }
  return { width, height };
};

export const createMonitor = (id: string, label: string, diagonal: number, orientation: 'landscape' | 'portrait', x: number, y: number): MonitorConfig => {
    const isPortrait = orientation === 'portrait';
    return {
        id,
        label,
        diagonalInches: diagonal,
        widthPx: isPortrait ? 1080 : 1920,
        heightPx: isPortrait ? 1920 : 1080,
        orientation,
        x,
        y,
        rotation: 0
    };
};

/**
 * Re-assigns labels (1, 2, 3...) to monitors based on their position.
 * Sort logic: Primary Y (Top to Bottom), Secondary X (Left to Right).
 * Uses the visual Top-Left corner of the monitor (bounding box min X/Y) for sorting.
 */
export const relabelMonitors = (monitors: Record<string, MonitorConfig>): Record<string, MonitorConfig> => {
    const entries = Object.entries(monitors);
    // Tolerance for floating point comparison for "same row"
    const ROW_THRESHOLD = 0.5; 

    // Helper to calculate visual top-left (min X, min Y) considering rotation
    const getVisualTopLeft = (m: MonitorConfig) => {
        const dim = calculatePhysicalDimensions(m.diagonalInches, m.orientation);
        const hw = dim.width / 2;
        const hh = dim.height / 2;
        const rad = (m.rotation || 0) * (Math.PI / 180);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        // Check all 4 corners to find min X and min Y
        const corners = [
            { x: -hw, y: -hh },
            { x: hw, y: -hh },
            { x: hw, y: hh },
            { x: -hw, y: hh }
        ];

        let minX = Infinity;
        let minY = Infinity;

        corners.forEach(p => {
            const gx = (p.x * cos - p.y * sin) + m.x;
            const gy = (p.x * sin + p.y * cos) + m.y;
            if (gx < minX) minX = gx;
            if (gy < minY) minY = gy;
        });
        return { x: minX, y: minY };
    };

    // Map entries to include sortable coordinates
    const sortedEntries = entries.map(([id, config]) => {
        return { id, config, ...getVisualTopLeft(config) };
    }).sort((a, b) => {
        // Sort by Y (Top to Bottom) primarily
        const yDiff = a.y - b.y;
        
        if (Math.abs(yDiff) > ROW_THRESHOLD) {
            return yDiff;
        }
        
        // If roughly same Y, sort by X (Left to Right)
        return a.x - b.x;
    });

    const newMonitors: Record<string, MonitorConfig> = {};
    sortedEntries.forEach((item, index) => {
        newMonitors[item.id] = { ...item.config, label: (index + 1).toString() };
    });
    
    return newMonitors;
};

export const getDefaultConfig = (): SetupConfig => {
  const topDim = calculatePhysicalDimensions(24.5, 'landscape'); // Monitor 2
  const bottomDim = calculatePhysicalDimensions(14, 'landscape'); // Monitor 4
  const leftDim = calculatePhysicalDimensions(24.5, 'portrait'); // Monitor 1
  const rightDim = calculatePhysicalDimensions(24.5, 'portrait'); // Monitor 3

  const bezel = 0.3; 

  // Initial Layout Positions
  // Center is Top Monitor (0,0) - Intended to be "2" (or 1 depending on sort)
  const topX = 0;
  const topY = 0;

  // Left - Intended to be "1" (or 2)
  // Align Top of Left with Top of Center (Monitor 2)
  // Center Top Edge = topY - (topDim.height / 2)
  // Left Top Edge = leftY - (leftDim.height / 2)
  // leftY = TopEdge + (leftDim.height / 2)
  const leftY = (topY - (topDim.height / 2)) + (leftDim.height / 2);
  const leftX = -(topDim.width / 2) - (leftDim.width / 2); // Touching

  // Right - Intended to be "3"
  // Align Bottom of Right with Bottom of Left (Monitor 1)
  // Left Bottom Edge = leftY + (leftDim.height / 2)
  // Right Bottom Edge = rightY + (rightDim.height / 2)
  // rightY = BottomEdge - (rightDim.height / 2)
  const rightY = (leftY + (leftDim.height / 2)) - (rightDim.height / 2);
  const rightX = (topDim.width / 2) + (rightDim.width / 2); // Touching

  // Bottom - Intended to be "4"
  // Align Bottom of Bottom Monitor (4) with Bottom of Left Monitor (1)
  // Monitor 1 Bottom Edge = leftY + (leftDim.height / 2)
  // Monitor 4 Bottom Edge = bottomY + (bottomDim.height / 2)
  // bottomY = LeftBottomEdge - (bottomDim.height / 2)
  const bottomX = 0;
  const bottomY = (leftY + (leftDim.height / 2)) - (bottomDim.height / 2);

  let monitors: Record<string, MonitorConfig> = {};

  // Create initially with temp names, then relabel
  monitors['left'] = createMonitor('left', 'temp', 24.5, 'portrait', leftX, leftY);
  monitors['top'] = createMonitor('top', 'temp', 24.5, 'landscape', topX, topY);
  monitors['right'] = createMonitor('right', 'temp', 24.5, 'portrait', rightX, rightY);
  monitors['bottom'] = createMonitor('bottom', 'temp', 14, 'landscape', bottomX, bottomY);

  // Apply numbering (Prioritize Top, then Left)
  monitors = relabelMonitors(monitors);

  return {
    ppi: 100, 
    bezelInches: bezel,
    monitors,
  };
};
