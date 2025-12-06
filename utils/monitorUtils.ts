
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
 * Sort logic: Primary X (Left to Right), Secondary Y (Top to Bottom).
 */
export const relabelMonitors = (monitors: Record<string, MonitorConfig>): Record<string, MonitorConfig> => {
    const entries = Object.entries(monitors);
    // Tolerance for floating point comparison for "same X"
    const COL_THRESHOLD = 0.1; 

    entries.sort(([, a], [, b]) => {
        // Sort by X (Left to Right) primarily
        const xDiff = a.x - b.x;
        
        if (Math.abs(xDiff) > COL_THRESHOLD) {
            return xDiff;
        }
        
        // If roughly same X, sort by Y (Top to Bottom)
        return a.y - b.y;
    });

    const newMonitors: Record<string, MonitorConfig> = {};
    entries.forEach(([id, config], index) => {
        newMonitors[id] = { ...config, label: (index + 1).toString() };
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
  // Center is Top Monitor (0,0) - Intended to be "2"
  const topX = 0;
  const topY = 0;

  // Left - Intended to be "1"
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

  // Apply numbering (Left->1, Top->2, Bottom->3, Right->4 based on X then Y)
  monitors = relabelMonitors(monitors);

  return {
    ppi: 100, 
    bezelInches: bezel,
    monitors,
  };
};
