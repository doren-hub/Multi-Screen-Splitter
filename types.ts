
export interface MonitorConfig {
  id: string;
  label: string;
  diagonalInches: number;
  widthPx: number;
  heightPx: number;
  orientation: 'landscape' | 'portrait';
  // Position in inches relative to the center of the canvas
  x: number; 
  y: number;
  // Rotation in degrees
  rotation: number;
}

export interface SetupConfig {
  ppi: number; // Pixels per inch calculation base
  monitors: Record<string, MonitorConfig>;
  bezelInches: number;
}

export type GeneratedImage = {
  id: string;
  dataUrl: string;
};
