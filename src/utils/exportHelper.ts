import * as fabric from 'fabric';

export interface ExportOptions {
  format: 'png' | 'jpeg' | 'webp' | 'svg';
  multiplier?: number;
  quality?: number;
  fileName?: string;
  fillBackground?: string | null;
}

/**
 * Safely exports a Fabric.js canvas at 1:1 true document size (or scaled by multiplier),
 * completely immune to current zoom level, pan coordinates, or active object selections.
 */
export function exportCanvasSafely(
  canvas: fabric.Canvas,
  docWidth: number,
  docHeight: number,
  options: ExportOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const {
        format = 'png',
        multiplier = 1,
        quality = 0.95,
        fileName = 'export',
        fillBackground = null,
      } = options;

      // Handle vector SVG export
      if (format === 'svg') {
        const svgContent = canvas.toSVG({
          width: `${docWidth}px`,
          height: `${docHeight}px`,
          viewBox: { x: 0, y: 0, width: docWidth, height: docHeight },
        });
        const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        triggerDownload(url, `${fileName}.svg`);
        URL.revokeObjectURL(url);
        resolve(url);
        return;
      }

      // 1. Temporarily save active selection and deselect so handles aren't drawn
      const activeObj = canvas.getActiveObject();
      canvas.discardActiveObject();

      // 2. Temporarily save canvas viewport state and dimensions
      const originalVpt: fabric.TMat2D = canvas.viewportTransform ? ([...canvas.viewportTransform] as fabric.TMat2D) : [1, 0, 0, 1, 0, 0];
      const originalWidth = canvas.getWidth();
      const originalHeight = canvas.getHeight();
      const originalZoom = canvas.getZoom();
      const originalBg = canvas.backgroundColor;

      // 3. Reset viewport and dimensions to 100% 1:1 true document coordinates
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      canvas.setDimensions({ width: docWidth, height: docHeight });

      // Handle background fill (especially vital for JPEG so transparent docs don't render black)
      if (fillBackground) {
        canvas.backgroundColor = fillBackground;
      } else if (format === 'jpeg' && (!originalBg || originalBg === 'transparent')) {
        canvas.backgroundColor = '#ffffff';
      }

      canvas.renderAll();

      // 4. Generate high-resolution pixel-perfect export data URL
      const fabricFormat = format === 'jpeg' ? 'jpeg' : format === 'webp' ? 'webp' : 'png';
      const dataUrl = canvas.toDataURL({
        format: fabricFormat,
        quality: quality,
        multiplier: multiplier,
        left: 0,
        top: 0,
        width: docWidth,
        height: docHeight,
      });

      // 5. Restore original dimensions, viewport, zoom, background and selection
      canvas.setDimensions({ width: originalWidth, height: originalHeight });
      canvas.setViewportTransform(originalVpt);
      canvas.setZoom(originalZoom);
      canvas.backgroundColor = originalBg;

      if (activeObj) {
        canvas.setActiveObject(activeObj);
      }
      canvas.renderAll();

      // 6. Trigger client download
      const ext = format === 'jpeg' ? 'jpg' : format;
      triggerDownload(dataUrl, `${fileName}.${ext}`);

      resolve(dataUrl);
    } catch (err) {
      console.error('Export canvas error:', err);
      reject(err);
    }
  });
}

/**
 * Grabs a clean, uncropped live snapshot of the canvas at full document resolution
 * for mockups or thumbnails without affecting the user's ongoing interaction.
 */
export function getCleanCanvasSnapshot(
  canvas: fabric.Canvas,
  docWidth: number,
  docHeight: number,
  maxDimension: number = 1600
): string | null {
  try {
    const activeObj = canvas.getActiveObject();
    canvas.discardActiveObject();

    const originalVpt: fabric.TMat2D = canvas.viewportTransform ? ([...canvas.viewportTransform] as fabric.TMat2D) : [1, 0, 0, 1, 0, 0];
    const originalWidth = canvas.getWidth();
    const originalHeight = canvas.getHeight();
    const originalZoom = canvas.getZoom();

    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.setDimensions({ width: docWidth, height: docHeight });
    canvas.renderAll();

    const maxSide = Math.max(docWidth, docHeight);
    const multiplier = maxSide > maxDimension ? maxDimension / maxSide : 1;

    const dataUrl = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier,
      left: 0,
      top: 0,
      width: docWidth,
      height: docHeight,
    });

    canvas.setDimensions({ width: originalWidth, height: originalHeight });
    canvas.setViewportTransform(originalVpt);
    canvas.setZoom(originalZoom);
    if (activeObj) canvas.setActiveObject(activeObj);
    canvas.renderAll();

    return dataUrl;
  } catch (e) {
    console.error('Failed to get clean snapshot', e);
    return null;
  }
}

/**
 * Composites the base mockup image and the design overlay onto an offscreen canvas
 * at the full resolution of the mockup and triggers download.
 */
export async function exportCompositeMockup(
  mockupUrl: string,
  designUrl: string,
  options: {
    fileName?: string;
    scale?: number;
    offsetX?: number; // percentage (-50 to 50)
    offsetY?: number; // percentage (-50 to 50)
    rotation?: number; // degrees
    opacity?: number;
    blendMode?: GlobalCompositeOperation;
    format?: 'png' | 'jpeg';
  }
): Promise<string> {
  const {
    fileName = 'mockup-preview',
    scale = 0.55,
    offsetX = 0,
    offsetY = 8,
    rotation = 0,
    opacity = 0.95,
    blendMode = 'multiply',
    format = 'png',
  } = options;

  const [mockupImg, designImg] = await Promise.all([
    loadImage(mockupUrl),
    loadImage(designUrl),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = mockupImg.naturalWidth || mockupImg.width || 1200;
  canvas.height = mockupImg.naturalHeight || mockupImg.height || 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d context');

  // Fill white for jpeg
  if (format === 'jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Draw base mockup
  ctx.drawImage(mockupImg, 0, 0, canvas.width, canvas.height);

  // Compute design dimensions and position
  const designBaseScale = Math.min(canvas.width / designImg.width, canvas.height / designImg.height);
  const finalScale = designBaseScale * scale;
  const drawW = designImg.width * finalScale;
  const drawH = designImg.height * finalScale;

  const centerX = canvas.width / 2 + (offsetX / 100) * canvas.width;
  const centerY = canvas.height / 2 + (offsetY / 100) * canvas.height;

  ctx.save();
  ctx.translate(centerX, centerY);
  if (rotation !== 0) {
    ctx.rotate((rotation * Math.PI) / 180);
  }
  ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
  ctx.globalCompositeOperation = blendMode;

  ctx.drawImage(designImg, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  const dataUrl = canvas.toDataURL(format === 'jpeg' ? 'image/jpeg' : 'image/png', 0.95);
  triggerDownload(dataUrl, `${fileName}.${format === 'jpeg' ? 'jpg' : 'png'}`);
  return dataUrl;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

function triggerDownload(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
