
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { SetupConfig, MonitorConfig } from '../types';
import { calculatePhysicalDimensions, relabelMonitors } from '../utils/monitorUtils';

interface PreviewAndDownloadProps {
  config: SetupConfig;
  sourceImage: string | null;
  onConfigChange: (newConfig: SetupConfig) => void;
  onAddMonitor: () => string;
  onRemoveMonitor: (id: string) => void;
}

interface SnapGuides {
  x: number[];
  y: number[];
}

const PreviewAndDownload: React.FC<PreviewAndDownloadProps> = ({ config, sourceImage, onConfigChange, onAddMonitor, onRemoveMonitor }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});
  const [scale, setScale] = useState(0.15); 
  
  // Dragging / Interaction State
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isResizing, setIsResizing] = useState(false); 
  const [isPlacingNew, setIsPlacingNew] = useState(false);
  
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);
  
  // For Move
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [dragOffsetInch, setDragOffsetInch] = useState({ x: 0, y: 0 });
  
  // For Rotation
  const [rotationStartAngle, setRotationStartAngle] = useState(0);
  const [baseRotation, setBaseRotation] = useState(0);
  const [dragRotation, setDragRotation] = useState(0);

  // For Resizing
  const [resizeHandle, setResizeHandle] = useState<string | null>(null); // 'TL', 'TR', 'BL', 'BR'
  const [resizeAnchor, setResizeAnchor] = useState({ x: 0, y: 0 }); // Fixed point in global inch space
  const [resizeOffset, setResizeOffset] = useState({ x: 0, y: 0 }); // Center shift
  const [dragDiagonal, setDragDiagonal] = useState<number | null>(null);

  const [snapGuides, setSnapGuides] = useState<SnapGuides>({ x: [], y: [] });
  
  // View options
  const [showLabels, setShowLabels] = useState(true);

  // Z-Order State (Monitor IDs)
  const [zOrder, setZOrder] = useState<string[]>(() => Object.keys(config.monitors));

  const monitorList = useMemo(() => Object.values(config.monitors) as MonitorConfig[], [config.monitors]);

  // Sync Z-Order with monitor list additions/removals
  useEffect(() => {
    setZOrder(prev => {
        const currentIds = new Set(monitorList.map(m => m.id));
        // Filter out removed IDs
        const next = prev.filter(id => currentIds.has(id));
        // Append new IDs
        monitorList.forEach(m => {
            if (!next.includes(m.id)) {
                next.push(m.id);
            }
        });
        
        // Compare arrays to avoid unnecessary updates
        if (next.length === prev.length && next.every((val, index) => val === prev[index])) {
            return prev;
        }
        return next;
    });
  }, [monitorList]);

  const bringToFront = (id: string) => {
    setZOrder(prev => {
        if (prev.length > 0 && prev[prev.length - 1] === id) return prev;
        const next = prev.filter(pid => pid !== id);
        next.push(id);
        return next;
    });
  };

  // Calculate corners relative to monitor center, then translated
  const getMonitorCorners = (m: MonitorConfig) => {
      const dim = calculatePhysicalDimensions(m.diagonalInches, m.orientation);
      const hw = dim.width / 2;
      const hh = dim.height / 2;
      const rad = (m.rotation || 0) * (Math.PI / 180);
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      const corners = [
          { x: -hw, y: -hh }, // TL (0)
          { x: hw, y: -hh },  // TR (1)
          { x: hw, y: hh },   // BR (2)
          { x: -hw, y: hh }   // BL (3)
      ];

      return corners.map(p => ({
          x: (p.x * cos - p.y * sin) + m.x,
          y: (p.x * sin + p.y * cos) + m.y
      }));
  };

  const getBoundingBox = () => {
    if (monitorList.length === 0) return { minX: -10, maxX: 10, minY: -10, maxY: 10, width: 20, height: 20 };

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    monitorList.forEach(m => {
      const corners = getMonitorCorners(m);
      corners.forEach(p => {
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y);
          maxY = Math.max(maxY, p.y);
      });
    });

    const padding = 2; // Extra padding
    return { 
        minX: minX - padding, 
        maxX: maxX + padding, 
        minY: minY - padding, 
        maxY: maxY + padding, 
        width: (maxX - minX) + padding * 2, 
        height: (maxY - minY) + padding * 2 
    };
  };

  const bounds = useMemo(() => getBoundingBox(), [monitorList]);

  // Auto-Scale Logic
  useEffect(() => {
    if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        const scaleX = clientWidth / (bounds.width * config.ppi);
        const scaleY = clientHeight / (bounds.height * config.ppi);
        const newScale = Math.min(scaleX, scaleY) * 0.9; // 90% fit
        
        if (Math.abs(newScale - scale) > 0.001) {
            setScale(newScale);
        }
    }
  }, [monitorList, bounds, config.ppi]); 

  useEffect(() => {
    processImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, sourceImage]);

  const processImage = () => {
    if (!sourceImage || !hiddenCanvasRef.current) return;
    
    const canvas = hiddenCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = sourceImage;
    img.onload = () => {
      const ppi = config.ppi; 
      
      canvas.width = bounds.width * ppi;
      canvas.height = bounds.height * ppi;
      
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const scaleW = canvas.width / img.width;
      const scaleH = canvas.height / img.height;
      const imageScale = Math.max(scaleW, scaleH);
      
      const drawnW = img.width * imageScale;
      const drawnH = img.height * imageScale;
      const offsetX = (canvas.width - drawnW) / 2;
      const offsetY = (canvas.height - drawnH) / 2;

      ctx.drawImage(img, offsetX, offsetY, drawnW, drawnH);

      const newImages: Record<string, string> = {};

      monitorList.forEach((m) => {
        const mDim = calculatePhysicalDimensions(m.diagonalInches, m.orientation);
        
        const cx = (m.x - bounds.minX) * ppi;
        const cy = (m.y - bounds.minY) * ppi;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = m.widthPx;
        tempCanvas.height = m.heightPx;
        const tempCtx = tempCanvas.getContext('2d');
        
        if (tempCtx) {
          tempCtx.translate(m.widthPx / 2, m.heightPx / 2);
          tempCtx.rotate(-(m.rotation || 0) * Math.PI / 180);
          
          const destPPI = m.widthPx / mDim.width; 
          tempCtx.scale(destPPI / ppi, destPPI / ppi); 
          
          tempCtx.drawImage(canvas, -cx, -cy);

          newImages[m.id] = tempCanvas.toDataURL('image/png');
        }
      });

      setGeneratedImages(newImages);
    };
  };

  const downloadImage = (id: string, label: string) => {
    const link = document.createElement('a');
    link.download = `Monitor ${label}.png`;
    link.href = generatedImages[id];
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllImages = async () => {
    const sortedMonitors = [...monitorList].sort((a,b) => (parseInt(a.label) || 0) - (parseInt(b.label) || 0));
    
    for (const m of sortedMonitors) {
        if (generatedImages[m.id]) {
            downloadImage(m.id, m.label);
            // Small delay to avoid browser blocking multiple downloads
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
  };

  // --- Handling Add & Immediate Drag ---
  const handleAddClick = (e: React.MouseEvent) => {
      // Logic for placing new monitor relies on coordinate calculation within contentRef
      // But we need to ensure containerRef is valid
      if (!containerRef.current) return;

      const { clientWidth, clientHeight } = containerRef.current;
      const { clientX, clientY } = e;
      const newId = onAddMonitor();
      
      setIsPlacingNew(true);
      setDragTargetId(newId);
      setIsDragging(true);

      if (contentRef.current) {
         const rect = contentRef.current.getBoundingClientRect();
         const pxPerInch = config.ppi * scale;
         
         const mouseRelX = clientX - rect.left;
         const mouseRelY = clientY - rect.top;
         
         const mouseInchX = (mouseRelX / pxPerInch) + bounds.minX;
         const mouseInchY = (mouseRelY / pxPerInch) + bounds.minY;
         
         setDragOffsetInch({
             x: mouseInchX, 
             y: mouseInchY 
         });
         
         setDragStartPos({ x: clientX, y: clientY });
      } else {
        setDragStartPos({ x: -9999, y: -9999 }); 
      }
  };

  const handleDragStart = (e: React.MouseEvent, id: string) => {
    if (isPlacingNew) return;
    if (e.button !== 0) return; // Only left click
    e.preventDefault();
    e.stopPropagation();
    
    bringToFront(id); // Bring to front on click

    setIsDragging(true);
    setDragTargetId(id);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDragOffsetInch({ x: 0, y: 0 });
    setSnapGuides({ x: [], y: [] });
  };
  
  // Rotation Start
  const handleRotateStart = (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      const m = config.monitors[id];
      if (!m || !contentRef.current) return;

      bringToFront(id); 

      setIsRotating(true);
      setDragTargetId(id);
      
      // Calculate Center of monitor in Screen Pixels
      const pxPerInch = config.ppi * scale;
      const rect = contentRef.current.getBoundingClientRect();
      const centerX = rect.left + (m.x - bounds.minX) * pxPerInch;
      const centerY = rect.top + (m.y - bounds.minY) * pxPerInch;

      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      
      setRotationStartAngle(angle);
      setBaseRotation(m.rotation || 0);
      setDragRotation(m.rotation || 0);
  };

  // Resize Start
  const handleResizeStart = (e: React.MouseEvent, id: string, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    const m = config.monitors[id];
    if (!m || !contentRef.current) return;

    bringToFront(id);
    setIsResizing(true);
    setDragTargetId(id);
    setResizeHandle(handle);

    // Calculate anchor point (opposite corner)
    const corners = getMonitorCorners(m); // [TL, TR, BR, BL]
    let anchor = { x: 0, y: 0 };
    // Opposite pairs: TL(0)<->BR(2), TR(1)<->BL(3)
    if (handle === 'TL') anchor = corners[2]; 
    else if (handle === 'TR') anchor = corners[3];
    else if (handle === 'BR') anchor = corners[0];
    else if (handle === 'BL') anchor = corners[1];

    setResizeAnchor(anchor);
    setResizeOffset({ x: 0, y: 0 });
    setDragDiagonal(m.diagonalInches);
    setSnapGuides({ x: [], y: [] });
  };

  // Handle click to place (finalize add)
  const handleContainerMouseDown = (e: React.MouseEvent) => {
      if (isPlacingNew && isDragging) {
          e.stopPropagation();
          handleMouseUp(); // Commit placement
      }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if ((!isDragging && !isRotating && !isResizing) || !dragTargetId) return;
      
      const pxPerInch = config.ppi * scale;

      // --- RESIZE LOGIC ---
      if (isResizing && contentRef.current && resizeHandle) {
         const m = config.monitors[dragTargetId];
         
         const rect = contentRef.current.getBoundingClientRect();
         const mouseRelX = e.clientX - rect.left;
         const mouseRelY = e.clientY - rect.top;
         const mouseInchX = (mouseRelX / pxPerInch) + bounds.minX;
         const mouseInchY = (mouseRelY / pxPerInch) + bounds.minY;

         // Vector from anchor to mouse
         const vx = mouseInchX - resizeAnchor.x;
         const vy = mouseInchY - resizeAnchor.y;

         // Determine Diagonal Unit Vector of the resizing direction
         // Local aspect dimensions (size 1 diagonal)
         const dim = calculatePhysicalDimensions(1, m.orientation);
         const w = dim.width;
         const h = dim.height;

         // Direction in local unrotated space relative to the specific handle
         // e.g. TL relative to BR is (-w, -h) direction
         let localDx = 0, localDy = 0;
         if (resizeHandle === 'TL') { localDx = -w; localDy = -h; }
         else if (resizeHandle === 'TR') { localDx = w; localDy = -h; }
         else if (resizeHandle === 'BR') { localDx = w; localDy = h; }
         else if (resizeHandle === 'BL') { localDx = -w; localDy = h; }

         // Rotate direction
         const rad = (m.rotation || 0) * (Math.PI / 180);
         const cos = Math.cos(rad);
         const sin = Math.sin(rad);
         const globalDx = localDx * cos - localDy * sin;
         const globalDy = localDx * sin + localDy * cos;

         // Normalize
         const len = Math.hypot(globalDx, globalDy);
         const ux = globalDx / len;
         const uy = globalDy / len;

         // Project mouse vector onto diagonal unit vector
         const projection = vx * ux + vy * uy;

         // --- RESIZE SNAPPING LOGIC ---
         const SNAP_PX = 15;
         const snapThreshold = SNAP_PX / pxPerInch;
         let snappedProjection = projection;
         let activeGuidesX: number[] = [];
         let activeGuidesY: number[] = [];
         let minSnapDist = snapThreshold;

         // Find snap lines from other monitors
         const otherMonitors = monitorList.filter(o => o.id !== dragTargetId);
         const snapLinesX: number[] = [];
         const snapLinesY: number[] = [];
         
         otherMonitors.forEach(o => {
            const oCorners = getMonitorCorners(o);
            oCorners.forEach(c => {
                snapLinesX.push(c.x);
                snapLinesY.push(c.y);
            });
            // Also center lines
            snapLinesX.push(o.x);
            snapLinesY.push(o.y);
         });

         // Check intersection with X snap lines
         // Line equation: P = Anchor + t * U
         // Anchor.x + t * ux = LineX  => t = (LineX - Anchor.x) / ux
         if (Math.abs(ux) > 0.01) {
             snapLinesX.forEach(lineX => {
                 const t = (lineX - resizeAnchor.x) / ux;
                 if (t > 2) { // Minimum size constraint check
                     // Resulting point
                     const py = resizeAnchor.y + t * uy;
                     // Distance from mouse to this intersection point
                     // (Approximation: Use distance along the diagonal)
                     if (Math.abs(t - projection) < minSnapDist) {
                         minSnapDist = Math.abs(t - projection);
                         snappedProjection = t;
                         activeGuidesX = [lineX];
                         activeGuidesY = []; // Clear Y if X is stronger/closer
                     }
                 }
             });
         }

         // Check intersection with Y snap lines
         // Anchor.y + t * uy = LineY => t = (LineY - Anchor.y) / uy
         if (Math.abs(uy) > 0.01) {
             snapLinesY.forEach(lineY => {
                 const t = (lineY - resizeAnchor.y) / uy;
                 if (t > 2) {
                     if (Math.abs(t - projection) < minSnapDist) {
                         minSnapDist = Math.abs(t - projection);
                         snappedProjection = t;
                         activeGuidesY = [lineY];
                         activeGuidesX = []; // Prefer Y if stronger
                     }
                 }
             });
         }

         setSnapGuides({ x: activeGuidesX, y: activeGuidesY });

         // Limit min size
         const newDiagonal = Math.max(2, snappedProjection);
         setDragDiagonal(newDiagonal);

         // Calculate new center
         // New Corner Position = Anchor + (newDiagonal * UnitVector)
         const newCornerX = resizeAnchor.x + newDiagonal * ux;
         const newCornerY = resizeAnchor.y + newDiagonal * uy;
         const newCenterX = (resizeAnchor.x + newCornerX) / 2;
         const newCenterY = (resizeAnchor.y + newCornerY) / 2;

         setResizeOffset({
            x: newCenterX - m.x,
            y: newCenterY - m.y
         });

         return;
      }

      // --- ROTATION LOGIC ---
      if (isRotating && contentRef.current) {
         const m = config.monitors[dragTargetId];
         if (m) {
            const rect = contentRef.current.getBoundingClientRect();
            // Since we are just rotating, m.x/m.y doesn't change
            const centerX = rect.left + (m.x - bounds.minX) * pxPerInch;
            const centerY = rect.top + (m.y - bounds.minY) * pxPerInch;
            
            const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
            const angleDiffRad = currentAngle - rotationStartAngle;
            const angleDiffDeg = angleDiffRad * (180 / Math.PI);
            
            let newRot = baseRotation + angleDiffDeg;

            // Snapping Logic (Snap to 0, 90, 180, 270, etc. within 5 degrees)
            const snapThreshold = 5;
            const normalizedRot = ((newRot % 90) + 90) % 90; // 0 to 90
            
            if (normalizedRot < snapThreshold) {
                newRot = newRot - normalizedRot;
            } else if (normalizedRot > 90 - snapThreshold) {
                newRot = newRot + (90 - normalizedRot);
            }
            
            setDragRotation(newRot);
         }
         return;
      }

      // --- DRAG LOGIC ---
      let rawDxInch = 0;
      let rawDyInch = 0;

      if (isPlacingNew && contentRef.current) {
          const rect = contentRef.current.getBoundingClientRect();
          const mouseRelX = e.clientX - rect.left;
          const mouseRelY = e.clientY - rect.top;
          
          const mouseInchX = (mouseRelX / pxPerInch) + bounds.minX;
          const mouseInchY = (mouseRelY / pxPerInch) + bounds.minY;
          
          const targetM = config.monitors[dragTargetId];
          const baseX = targetM ? targetM.x : 0;
          const baseY = targetM ? targetM.y : 0;

          rawDxInch = mouseInchX - baseX;
          rawDyInch = mouseInchY - baseY;
      } else {
        if (dragStartPos.x === -9999) {
            setDragStartPos({ x: e.clientX, y: e.clientY });
            return;
        }
        const dxPx = e.clientX - dragStartPos.x;
        const dyPx = e.clientY - dragStartPos.y;
        rawDxInch = dxPx / pxPerInch;
        rawDyInch = dyPx / pxPerInch;
      }

      const targetM = config.monitors[dragTargetId];
      if (!targetM) {
          setDragOffsetInch({ x: rawDxInch, y: rawDyInch });
          return; 
      }

      const SNAP_PX = 15;
      const snapInch = SNAP_PX / pxPerInch;
      let snapDx = 0;
      let snapDy = 0;
      let minXDist = snapInch;
      let minYDist = snapInch;
      let activeGuidesX: number[] = [];
      let activeGuidesY: number[] = [];

      // Helper to get AABB lines (min, center, max) to enable robust snapping for rotated monitors
      const getSnapLines = (m: MonitorConfig, cx: number, cy: number) => {
        const corners = getMonitorCorners({ ...m, x: cx, y: cy });
        const xs = corners.map(c => c.x);
        const ys = corners.map(c => c.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        return {
            x: [minX, (minX + maxX) / 2, maxX],
            y: [minY, (minY + maxY) / 2, maxY]
        };
      };

      const candidateX = targetM.x + rawDxInch;
      const candidateY = targetM.y + rawDyInch;
      const tLines = getSnapLines(targetM, candidateX, candidateY);
      
      const otherMonitors = monitorList.filter(m => m.id !== dragTargetId);

      otherMonitors.forEach(other => {
          const oLines = getSnapLines(other, other.x, other.y);

          // X Snapping
          tLines.x.forEach(tx => {
              oLines.x.forEach(ox => {
                  const dist = ox - tx;
                  if (Math.abs(dist) < minXDist) {
                      minXDist = Math.abs(dist);
                      snapDx = dist;
                      activeGuidesX = [ox];
                  } else if (Math.abs(dist - snapDx) < 0.001 && minXDist < snapInch) {
                      // Same snap distance found (e.g. alignment on both left and right edges simultaneously)
                      if (!activeGuidesX.includes(ox)) activeGuidesX.push(ox);
                  }
              });
          });

          // Y Snapping
          tLines.y.forEach(ty => {
              oLines.y.forEach(oy => {
                  const dist = oy - ty;
                  if (Math.abs(dist) < minYDist) {
                      minYDist = Math.abs(dist);
                      snapDy = dist;
                      activeGuidesY = [oy];
                  } else if (Math.abs(dist - snapDy) < 0.001 && minYDist < snapInch) {
                       if (!activeGuidesY.includes(oy)) activeGuidesY.push(oy);
                  }
              });
          });
      });

      setDragOffsetInch({
        x: rawDxInch + snapDx,
        y: rawDyInch + snapDy
      });

      setSnapGuides({
        x: activeGuidesX,
        y: activeGuidesY
      });
    };

    const handleMouseUp = () => {
      if (isPlacingNew) return;
      if (!isDragging && !isRotating && !isResizing) return;
      commitDrag();
    };

    if (isDragging || isRotating || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isRotating, isResizing, dragTargetId, dragStartPos, dragOffsetInch, rotationStartAngle, baseRotation, config, onConfigChange, scale, isPlacingNew, monitorList, bounds, dragRotation, dragDiagonal, resizeHandle, resizeAnchor]);

  const commitDrag = () => {
      if (!dragTargetId) return;
      const targetMonitor = config.monitors[dragTargetId];
      if (targetMonitor) {
          let newMonitors = { ...config.monitors };

          if (isRotating) {
             newMonitors[dragTargetId] = {
                 ...targetMonitor,
                 rotation: dragRotation
             };
          } else if (isResizing && dragDiagonal !== null) {
             newMonitors[dragTargetId] = {
                 ...targetMonitor,
                 diagonalInches: parseFloat(dragDiagonal.toFixed(1)),
                 x: targetMonitor.x + resizeOffset.x,
                 y: targetMonitor.y + resizeOffset.y
             };
          } else {
             const finalX = targetMonitor.x + dragOffsetInch.x;
             const finalY = targetMonitor.y + dragOffsetInch.y;
             newMonitors[dragTargetId] = {
                ...targetMonitor,
                x: finalX,
                y: finalY,
             };
             // Relabel only on move
             newMonitors = relabelMonitors(newMonitors);
          }
          
          onConfigChange({ ...config, monitors: newMonitors });
      }

      setIsDragging(false);
      setIsRotating(false);
      setIsResizing(false);
      setIsPlacingNew(false);
      setDragTargetId(null);
      setDragOffsetInch({ x: 0, y: 0 });
      setDragRotation(0);
      setDragDiagonal(null);
      setResizeHandle(null);
      setResizeOffset({ x: 0, y: 0 });
      setSnapGuides({ x: [], y: [] });
  };

  // Exposed for the container click handler
  const handleMouseUp = () => commitDrag();

  const toPxX = (inchX: number) => (inchX - bounds.minX) * config.ppi * scale;
  const toPxY = (inchY: number) => (inchY - bounds.minY) * config.ppi * scale;

  // Helper to determine control positions based on rotation
  const getControlStyles = (rot: number) => {
    const r = ((rot % 360) + 360) % 360;
    
    // Q1: Upright (-45 to 45 or 315-360)
    // Visual Bottom Center -> Local Bottom Center
    if (r >= 315 || r < 45) {
        return {
            remove: "-bottom-9 left-1/2 -translate-x-1/2",
            rotate: "-top-8 left-1/2 -translate-x-1/2",
            rotateLine: "top-full left-1/2 -translate-x-1/2 w-0.5 h-2"
        };
    } 
    // Q2: 90 deg (45 to 135)
    // Visual Bottom Center -> Local Right Center
    else if (r >= 45 && r < 135) {
        return {
            remove: "-right-9 top-1/2 -translate-y-1/2",
            rotate: "-left-8 top-1/2 -translate-y-1/2",
            rotateLine: "left-full top-1/2 -translate-y-1/2 w-2 h-0.5"
        };
    } 
    // Q3: 180 deg (135 to 225)
    // Visual Bottom Center -> Local Top Center
    else if (r >= 135 && r < 225) {
        return {
            remove: "-top-9 left-1/2 -translate-x-1/2",
            rotate: "-bottom-8 left-1/2 -translate-x-1/2",
            rotateLine: "bottom-full left-1/2 -translate-x-1/2 w-0.5 h-2"
        };
    } 
    // Q4: 270 deg (225 to 315)
    // Visual Bottom Center -> Local Left Center
    else {
        return {
            remove: "-left-9 top-1/2 -translate-y-1/2",
            rotate: "-right-8 top-1/2 -translate-y-1/2",
            rotateLine: "right-full top-1/2 -translate-y-1/2 w-2 h-0.5"
        };
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      <canvas ref={hiddenCanvasRef} className="hidden" />

      {/* Main Preview Container - Flex Column */}
      <div className="flex-1 bg-gray-900 rounded-xl border border-gray-800 flex flex-col min-h-[400px]">
        
        {/* Toolbar - Separate row at the top inside the container */}
        <div className="flex justify-end gap-3 p-4 border-b border-gray-800/50 bg-gray-900/50 z-50">
            {/* Toggle Labels Button */}
            <button
                onClick={() => setShowLabels(!showLabels)}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-full shadow-lg border border-gray-700 transition-all active:scale-95"
                title={showLabels ? "Hide Labels" : "Show Labels"}
            >
                {showLabels ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.742L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                )}
                <span className="hidden sm:inline">{showLabels ? 'Hide Labels' : 'Show Labels'}</span>
            </button>

            {/* Add Monitor Button */}
            <button
                onClick={handleAddClick}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                <span className="hidden sm:inline">Add Monitor</span>
            </button>
        </div>

        {/* Canvas Area */}
        <div 
            ref={containerRef}
            onMouseDown={handleContainerMouseDown}
            className={`flex-1 relative w-full overflow-hidden flex items-center justify-center p-8 ${isPlacingNew ? 'cursor-crosshair' : ''}`}
        >
            {!sourceImage && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                    <div className="text-gray-500 text-center">
                        <p className="text-xl font-bold mb-2">プレビュー</p>
                        <p>画像をアップロードまたは生成してください</p>
                    </div>
                </div>
            )}

            <div 
            ref={contentRef}
            style={{ 
                position: 'relative',
                width: bounds.width * config.ppi * scale, 
                height: bounds.height * config.ppi * scale,
                transition: 'none', 
            }}
            >
                {/* Snap Guides */}
                {snapGuides.x.map((gx, i) => (
                <div 
                    key={`gx-${i}`}
                    className="absolute top-0 bottom-0 border-l border-cyan-400 border-dashed z-40 pointer-events-none"
                    style={{ left: toPxX(gx), width: '1px' }}
                />
                ))}
                {snapGuides.y.map((gy, i) => (
                <div 
                    key={`gy-${i}`}
                    className="absolute left-0 right-0 border-t border-cyan-400 border-dashed z-40 pointer-events-none"
                    style={{ top: toPxY(gy), height: '1px' }}
                />
                ))}

                {zOrder.map(id => {
                    const m = config.monitors[id];
                    if (!m) return null;

                    let displayDiagonal = m.diagonalInches;
                    if (isResizing && dragTargetId === m.id && dragDiagonal !== null) {
                        displayDiagonal = dragDiagonal;
                    }

                    const mDim = calculatePhysicalDimensions(displayDiagonal, m.orientation);
                    
                    let currentX = m.x;
                    let currentY = m.y;
                    let currentRot = m.rotation || 0;

                    if (dragTargetId === m.id) {
                        if (isDragging) {
                            currentX += dragOffsetInch.x;
                            currentY += dragOffsetInch.y;
                        } else if (isRotating) {
                            currentRot = dragRotation;
                        } else if (isResizing) {
                            currentX += resizeOffset.x;
                            currentY += resizeOffset.y;
                        }
                    }
                    
                    const controlStyles = getControlStyles(currentRot);

                    const physLeft = (currentX - mDim.width / 2) - bounds.minX;
                    const physTop = (currentY - mDim.height / 2) - bounds.minY;
                    
                    return (
                        <div
                        key={m.id}
                        onMouseDown={(e) => handleDragStart(e, m.id)}
                        style={{
                            position: 'absolute',
                            left: physLeft * config.ppi * scale,
                            top: physTop * config.ppi * scale,
                            width: mDim.width * config.ppi * scale,
                            height: mDim.height * config.ppi * scale,
                            transform: `rotate(${currentRot}deg)`,
                            backgroundImage: generatedImages[m.id] ? `url(${generatedImages[m.id]})` : undefined,
                            backgroundColor: generatedImages[m.id] ? 'black' : '#1f2937', 
                            backgroundSize: 'cover',
                        }}
                        className={`
                            border-2 shadow-[0_0_15px_rgba(59,130,246,0.3)] 
                            z-10 select-none flex items-center justify-center
                            ${(isDragging || isRotating || isResizing) && dragTargetId === m.id ? 'border-yellow-400 z-50' : 'border-blue-500 hover:scale-[1.02]'}
                            ${isPlacingNew ? 'pointer-events-none' : 'cursor-move group'}
                            transition-transform duration-75
                        `}
                        title={`Drag to adjust ${m.label}`}
                        >
                        {/* Label (Number) - Centered & Counter Rotated */}
                        {showLabels && (
                            <div 
                            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                            style={{ transform: `rotate(${-currentRot}deg)` }}
                            >
                                <span className="text-white font-bold text-4xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] opacity-80 leading-none">
                                    {m.label}
                                </span>
                            </div>
                        )}

                        {/* Rotation Handle (Visual Top Center) */}
                        {!isDragging && !isPlacingNew && !isResizing && (
                            <div 
                            className={`absolute ${controlStyles.rotate} w-6 h-6 bg-white text-gray-800 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-50 hover:bg-yellow-400 cursor-crosshair shadow-md border border-gray-300`}
                            onMouseDown={(e) => handleRotateStart(e, m.id)}
                            title="Rotate Monitor"
                            >
                            <div style={{ transform: `rotate(${-currentRot}deg)` }}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                </svg>
                            </div>
                            {/* Connecting Line */}
                            <div className={`absolute ${controlStyles.rotateLine} bg-white`}></div>
                            </div>
                        )}

                        {/* Resize Handles (4 Corners) */}
                        {!isDragging && !isRotating && !isPlacingNew && !isResizing && (
                            <>
                                {/* TL */}
                                <div
                                    className={`absolute -top-3 -left-3 w-6 h-6 bg-white text-gray-800 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-50 hover:bg-blue-100 cursor-nwse-resize shadow-md border border-gray-300`}
                                    onMouseDown={(e) => handleResizeStart(e, m.id, 'TL')}
                                    title="Resize (TL)"
                                >
                                    {/* NW-SE Arrows (Rotated 90deg -> 45) */}
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                </div>
                                {/* TR */}
                                <div
                                    className={`absolute -top-3 -right-3 w-6 h-6 bg-white text-gray-800 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-50 hover:bg-blue-100 cursor-nesw-resize shadow-md border border-gray-300`}
                                    onMouseDown={(e) => handleResizeStart(e, m.id, 'TR')}
                                    title="Resize (TR)"
                                >
                                    {/* NE-SW Arrows (Rotated 90deg -> 135) */}
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform rotate-[135deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                </div>
                                {/* BR */}
                                <div
                                    className={`absolute -bottom-3 -right-3 w-6 h-6 bg-white text-gray-800 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-50 hover:bg-blue-100 cursor-nwse-resize shadow-md border border-gray-300`}
                                    onMouseDown={(e) => handleResizeStart(e, m.id, 'BR')}
                                    title="Resize (BR)"
                                >
                                    {/* NW-SE Arrows (Rotated 90deg -> 45) */}
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                </div>
                                {/* BL */}
                                <div
                                    className={`absolute -bottom-3 -left-3 w-6 h-6 bg-white text-gray-800 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-50 hover:bg-blue-100 cursor-nesw-resize shadow-md border border-gray-300`}
                                    onMouseDown={(e) => handleResizeStart(e, m.id, 'BL')}
                                    title="Resize (BL)"
                                >
                                    {/* NE-SW Arrows (Rotated 90deg -> 135) */}
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform rotate-[135deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                </div>
                            </>
                        )}

                        {/* Controls Overlay (Remove only) */}
                        {!isDragging && !isRotating && !isPlacingNew && !isResizing && (
                            <>
                                {/* Remove Button (Visual Bottom Center) */}
                                <button
                                    className={`absolute ${controlStyles.remove} w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-50 hover:bg-red-600 shadow-md`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveMonitor(m.id);
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    title="Remove Monitor"
                                >
                                    <div style={{ transform: `rotate(${-currentRot}deg)` }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </button>
                            </>
                        )}
                        </div>
                    );
                })}
            </div>
        </div>
      </div>

      {/* Footer Download Actions */}
      {sourceImage && (
        <div className="mt-6 flex flex-col gap-6 items-center">
          {/* Download All Button */}
          <button
            onClick={downloadAllImages}
            className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl border border-blue-400/50 shadow-lg hover:shadow-blue-500/25 transition-all w-full max-w-md group"
          >
             <span className="text-xl font-bold text-white mb-1 group-hover:scale-105 transition-transform flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download All Images
             </span>
             <span className="text-sm text-blue-100 opacity-80">一括ダウンロード</span>
          </button>

          {/* Individual Download Buttons */}
          <div className="flex flex-wrap justify-center gap-4 w-full">
            {monitorList.sort((a,b) => (parseInt(a.label) || 0) - (parseInt(b.label) || 0)).map(m => (
                <button
                key={m.id}
                onClick={() => downloadImage(m.id, m.label)}
                className="flex flex-col items-center justify-center p-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors min-w-[120px] flex-1 max-w-[200px]"
                >
                <span className="text-xl font-bold text-white mb-1">{m.label}</span>
                <span className="text-xs text-gray-500">{m.widthPx}x{m.heightPx}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400 mt-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PreviewAndDownload;
