import React, { useEffect, useState, useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import { Maximize, Minimize, Move, FlipHorizontal, FlipVertical } from 'lucide-react';

interface CanvasTransformOverlayProps {
  canvas: fabric.Canvas | null;
  zoom: number;
  docWidth: number;
  docHeight: number;
  activeTool: string;
  onModified?: () => void;
}

interface CoordsState {
  tl: { x: number; y: number };
  tr: { x: number; y: number };
  br: { x: number; y: number };
  bl: { x: number; y: number };
  mt: { x: number; y: number };
  mb: { x: number; y: number };
  ml: { x: number; y: number };
  mr: { x: number; y: number };
  rot: { x: number; y: number };
  center: { x: number; y: number };
  width: number;
  height: number;
  angle: number;
  isOutside: boolean;
  imgSrc?: string;
  flipX?: boolean;
  flipY?: boolean;
}

type HandleType = 'tl' | 'tr' | 'br' | 'bl' | 'mt' | 'mb' | 'ml' | 'mr' | 'rot';

export const CanvasTransformOverlay: React.FC<CanvasTransformOverlayProps> = ({
  canvas,
  zoom,
  docWidth,
  docHeight,
  activeTool,
  onModified,
}) => {
  const [coords, setCoords] = useState<CoordsState | null>(null);
  const [activeObj, setActiveObj] = useState<fabric.Object | null>(null);
  const dragRef = useRef<{
    handle: HandleType;
    startX: number;
    startY: number;
    origCenter: { x: number; y: number };
    origWidth: number;
    origHeight: number;
    origScaleX: number;
    origScaleY: number;
    origAngle: number;
    baseW: number;
    baseH: number;
    anchor: { x: number; y: number };
    unitX: { x: number; y: number };
    unitY: { x: number; y: number };
  } | null>(null);

  const updateCoords = useCallback(() => {
    if (!canvas || activeTool === 'crop' || activeTool === 'brush' || activeTool === 'eraser') {
      setCoords(null);
      setActiveObj(null);
      return;
    }

    const obj = canvas.getActiveObject();
    if (!obj) {
      setCoords(null);
      setActiveObj(null);
      return;
    }

    setActiveObj(obj);

    // Suppress fabric's internal controls/borders so our overlay cleanly manages them
    if (obj.hasControls || obj.hasBorders) {
      obj.hasControls = false;
      obj.hasBorders = false;
      canvas.requestRenderAll();
    }

    obj.setCoords();
    const aCoords = obj.aCoords || (obj as any).calcACoords();
    if (!aCoords || !aCoords.tl) {
      setCoords(null);
      return;
    }

    const currentZoom = canvas.getZoom() || zoom || 1;
    const tl = { x: aCoords.tl.x * currentZoom, y: aCoords.tl.y * currentZoom };
    const tr = { x: aCoords.tr.x * currentZoom, y: aCoords.tr.y * currentZoom };
    const br = { x: aCoords.br.x * currentZoom, y: aCoords.br.y * currentZoom };
    const bl = { x: aCoords.bl.x * currentZoom, y: aCoords.bl.y * currentZoom };

    const mt = { x: (tl.x + tr.x) / 2, y: (tl.y + tr.y) / 2 };
    const mb = { x: (bl.x + br.x) / 2, y: (bl.y + br.y) / 2 };
    const ml = { x: (tl.x + bl.x) / 2, y: (tl.y + bl.y) / 2 };
    const mr = { x: (tr.x + br.x) / 2, y: (tr.y + br.y) / 2 };
    const center = { x: (tl.x + br.x) / 2, y: (tl.y + br.y) / 2 };

    const angle = obj.angle || 0;
    const rad = (angle * Math.PI) / 180;
    // Rotation handle 28px outward along top normal
    const rot = {
      x: mt.x - Math.sin(rad) * 28,
      y: mt.y - Math.cos(rad) * 28,
    };

    const canvasW = docWidth * currentZoom;
    const canvasH = docHeight * currentZoom;
    const isOutside =
      tl.x < 0 || tl.y < 0 || tr.x > canvasW || tr.y < 0 ||
      br.x > canvasW || br.y > canvasH || bl.x < 0 || bl.y > canvasH;

    let imgSrc: string | undefined;
    if ((obj as any).type === 'image' || (obj as any)._element) {
      imgSrc = (obj as any)._element?.src || (obj as any).getSrc?.();
    }

    setCoords({
      tl, tr, br, bl,
      mt, mb, ml, mr,
      rot, center,
      width: Math.round(obj.getScaledWidth()),
      height: Math.round(obj.getScaledHeight()),
      angle: Math.round(angle),
      isOutside,
      imgSrc,
      flipX: obj.flipX,
      flipY: obj.flipY,
    });
  }, [canvas, zoom, docWidth, docHeight, activeTool]);

  useEffect(() => {
    if (!canvas) return;

    updateCoords();

    const handler = () => updateCoords();
    canvas.on('selection:created', handler);
    canvas.on('selection:updated', handler);
    canvas.on('selection:cleared', handler);
    canvas.on('object:moving', handler);
    canvas.on('object:scaling', handler);
    canvas.on('object:rotating', handler);
    canvas.on('object:modified', handler);
    canvas.on('after:render', handler);

    return () => {
      canvas.off('selection:created', handler);
      canvas.off('selection:updated', handler);
      canvas.off('selection:cleared', handler);
      canvas.off('object:moving', handler);
      canvas.off('object:scaling', handler);
      canvas.off('object:rotating', handler);
      canvas.off('object:modified', handler);
      canvas.off('after:render', handler);
    };
  }, [canvas, updateCoords]);

  // Handle pointer down on handles
  const handlePointerDown = (handle: HandleType, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!activeObj || !canvas) return;

    const centerPt = activeObj.getCenterPoint();
    const rad = ((activeObj.angle || 0) * Math.PI) / 180;
    const unitX = { x: Math.cos(rad), y: Math.sin(rad) };
    const unitY = { x: -Math.sin(rad), y: Math.cos(rad) };

    const scaledW = activeObj.getScaledWidth();
    const scaledH = activeObj.getScaledHeight();

    // Determine opposite fixed anchor in canvas coordinate space (unzoomed)
    let anchor = { x: centerPt.x, y: centerPt.y };
    if (handle === 'br') {
      anchor = {
        x: centerPt.x - (scaledW / 2) * unitX.x - (scaledH / 2) * unitY.x,
        y: centerPt.y - (scaledW / 2) * unitX.y - (scaledH / 2) * unitY.y,
      };
    } else if (handle === 'tl') {
      anchor = {
        x: centerPt.x + (scaledW / 2) * unitX.x + (scaledH / 2) * unitY.x,
        y: centerPt.y + (scaledW / 2) * unitX.y + (scaledH / 2) * unitY.y,
      };
    } else if (handle === 'tr') {
      anchor = {
        x: centerPt.x - (scaledW / 2) * unitX.x + (scaledH / 2) * unitY.x,
        y: centerPt.y - (scaledW / 2) * unitX.y + (scaledH / 2) * unitY.y,
      };
    } else if (handle === 'bl') {
      anchor = {
        x: centerPt.x + (scaledW / 2) * unitX.x - (scaledH / 2) * unitY.x,
        y: centerPt.y + (scaledW / 2) * unitX.y - (scaledH / 2) * unitY.y,
      };
    } else if (handle === 'mr') {
      anchor = {
        x: centerPt.x - (scaledW / 2) * unitX.x,
        y: centerPt.y - (scaledW / 2) * unitX.y,
      };
    } else if (handle === 'ml') {
      anchor = {
        x: centerPt.x + (scaledW / 2) * unitX.x,
        y: centerPt.y + (scaledW / 2) * unitX.y,
      };
    } else if (handle === 'mb') {
      anchor = {
        x: centerPt.x - (scaledH / 2) * unitY.x,
        y: centerPt.y - (scaledH / 2) * unitY.y,
      };
    } else if (handle === 'mt') {
      anchor = {
        x: centerPt.x + (scaledH / 2) * unitY.x,
        y: centerPt.y + (scaledH / 2) * unitY.y,
      };
    }

    dragRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      origCenter: { x: centerPt.x, y: centerPt.y },
      origWidth: scaledW,
      origHeight: scaledH,
      origScaleX: activeObj.scaleX || 1,
      origScaleY: activeObj.scaleY || 1,
      origAngle: activeObj.angle || 0,
      baseW: activeObj.width || 1,
      baseH: activeObj.height || 1,
      anchor,
      unitX,
      unitY,
    };

    const onPointerMove = (ev: PointerEvent) => {
      if (!dragRef.current || !activeObj || !canvas) return;
      const {
        handle: h,
        anchor: anch,
        origCenter,
        origWidth: W0,
        origHeight: H0,
        baseW,
        baseH,
        unitX: ux,
        unitY: uy,
      } = dragRef.current;

      const z = canvas.getZoom() || zoom || 1;
      const canvasEl = canvas.getElement();
      const rect = canvasEl.getBoundingClientRect();

      // Current pointer in canvas coordinate space
      const px = (ev.clientX - rect.left) / z;
      const py = (ev.clientY - rect.top) / z;

      if (h === 'rot') {
        const radAngle = Math.atan2(py - origCenter.y, px - origCenter.x);
        let deg = (radAngle * 180) / Math.PI + 90;
        if (ev.shiftKey) deg = Math.round(deg / 15) * 15;
        activeObj.set('angle', (deg % 360 + 360) % 360);
        activeObj.setCoords();
        canvas.requestRenderAll();
        updateCoords();
        return;
      }

      // Vector from anchor to current pointer
      const vx = px - anch.x;
      const vy = py - anch.y;

      // Project onto object's axes
      const projX = vx * ux.x + vy * ux.y;
      const projY = vx * uy.x + vy * uy.y;

      let newW = W0;
      let newH = H0;
      let newCenter = { ...origCenter };

      const keepAspect = ev.shiftKey || (activeObj as any).type === 'image';

      if (h === 'br') {
        newW = Math.max(12, projX);
        newH = Math.max(12, projY);
        if (keepAspect) {
          const s = Math.max(newW / W0, newH / H0);
          newW = W0 * s;
          newH = H0 * s;
        }
        newCenter = {
          x: anch.x + (newW / 2) * ux.x + (newH / 2) * uy.x,
          y: anch.y + (newW / 2) * ux.y + (newH / 2) * uy.y,
        };
      } else if (h === 'tl') {
        newW = Math.max(12, -projX);
        newH = Math.max(12, -projY);
        if (keepAspect) {
          const s = Math.max(newW / W0, newH / H0);
          newW = W0 * s;
          newH = H0 * s;
        }
        newCenter = {
          x: anch.x - (newW / 2) * ux.x - (newH / 2) * uy.x,
          y: anch.y - (newW / 2) * ux.y - (newH / 2) * uy.y,
        };
      } else if (h === 'tr') {
        newW = Math.max(12, projX);
        newH = Math.max(12, -projY);
        if (keepAspect) {
          const s = Math.max(newW / W0, newH / H0);
          newW = W0 * s;
          newH = H0 * s;
        }
        newCenter = {
          x: anch.x + (newW / 2) * ux.x - (newH / 2) * uy.x,
          y: anch.y + (newW / 2) * ux.y - (newH / 2) * uy.y,
        };
      } else if (h === 'bl') {
        newW = Math.max(12, -projX);
        newH = Math.max(12, projY);
        if (keepAspect) {
          const s = Math.max(newW / W0, newH / H0);
          newW = W0 * s;
          newH = H0 * s;
        }
        newCenter = {
          x: anch.x - (newW / 2) * ux.x + (newH / 2) * uy.x,
          y: anch.y - (newW / 2) * ux.y + (newH / 2) * uy.y,
        };
      } else if (h === 'mr') {
        newW = Math.max(12, projX);
        newCenter = {
          x: anch.x + (newW / 2) * ux.x,
          y: anch.y + (newW / 2) * ux.y,
        };
      } else if (h === 'ml') {
        newW = Math.max(12, -projX);
        newCenter = {
          x: anch.x - (newW / 2) * ux.x,
          y: anch.y - (newW / 2) * ux.y,
        };
      } else if (h === 'mb') {
        newH = Math.max(12, projY);
        newCenter = {
          x: anch.x + (newH / 2) * uy.x,
          y: anch.y + (newH / 2) * uy.y,
        };
      } else if (h === 'mt') {
        newH = Math.max(12, -projY);
        newCenter = {
          x: anch.x - (newH / 2) * uy.x,
          y: anch.y - (newH / 2) * uy.y,
        };
      }

      activeObj.set({
        scaleX: newW / baseW,
        scaleY: newH / baseH,
      });
      activeObj.setPositionByOrigin(
        new fabric.Point(newCenter.x, newCenter.y),
        'center',
        'center'
      );
      activeObj.setCoords();
      canvas.requestRenderAll();
      updateCoords();
    };

    const onPointerUp = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      if (canvas && activeObj) {
        canvas.fire('object:modified', { target: activeObj });
        onModified?.();
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Quick Action Buttons
  const handleFitToCanvas = () => {
    if (!activeObj || !canvas) return;
    const maxW = docWidth * 0.92;
    const maxH = docHeight * 0.92;
    const s = Math.min(maxW / activeObj.width, maxH / activeObj.height, 1);
    activeObj.scale(s);
    activeObj.setPositionByOrigin(
      new fabric.Point(docWidth / 2, docHeight / 2),
      'center',
      'center'
    );
    activeObj.setCoords();
    canvas.requestRenderAll();
    canvas.fire('object:modified', { target: activeObj });
    onModified?.();
  };

  const handleFillCanvas = () => {
    if (!activeObj || !canvas) return;
    const s = Math.max(docWidth / activeObj.width, docHeight / activeObj.height);
    activeObj.scale(s);
    activeObj.setPositionByOrigin(
      new fabric.Point(docWidth / 2, docHeight / 2),
      'center',
      'center'
    );
    activeObj.setCoords();
    canvas.requestRenderAll();
    canvas.fire('object:modified', { target: activeObj });
    onModified?.();
  };

  const handleCenter = () => {
    if (!activeObj || !canvas) return;
    activeObj.setPositionByOrigin(
      new fabric.Point(docWidth / 2, docHeight / 2),
      'center',
      'center'
    );
    activeObj.setCoords();
    canvas.requestRenderAll();
    canvas.fire('object:modified', { target: activeObj });
    onModified?.();
  };

  const handleFlipH = () => {
    if (!activeObj || !canvas) return;
    activeObj.set('flipX', !activeObj.flipX);
    activeObj.setCoords();
    canvas.requestRenderAll();
    canvas.fire('object:modified', { target: activeObj });
    onModified?.();
  };

  const handleFlipV = () => {
    if (!activeObj || !canvas) return;
    activeObj.set('flipY', !activeObj.flipY);
    activeObj.setCoords();
    canvas.requestRenderAll();
    canvas.fire('object:modified', { target: activeObj });
    onModified?.();
  };

  if (!coords) return null;

  const { tl, tr, br, bl, mt, mb, ml, mr, rot, width, height, angle, isOutside } = coords;

  // Handle cursors based on rotation
  const getCursor = (type: HandleType) => {
    if (type === 'rot') return 'grab';
    const baseCursors: Record<string, string> = {
      tl: 'nwse-resize',
      br: 'nwse-resize',
      tr: 'nesw-resize',
      bl: 'nesw-resize',
      mt: 'ns-resize',
      mb: 'ns-resize',
      ml: 'ew-resize',
      mr: 'ew-resize',
    };
    return baseCursors[type] || 'pointer';
  };

  const handles: { id: HandleType; pt: { x: number; y: number } }[] = [
    { id: 'tl', pt: tl },
    { id: 'tr', pt: tr },
    { id: 'br', pt: br },
    { id: 'bl', pt: bl },
    { id: 'mt', pt: mt },
    { id: 'mb', pt: mb },
    { id: 'ml', pt: ml },
    { id: 'mr', pt: mr },
  ];

  return (
    <div
      className="absolute inset-0 pointer-events-none z-30"
      style={{ overflow: 'visible' }}
    >
      {/* SVG Outline & Rotator Stem */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ overflow: 'visible' }}
      >
        {/* Crisp High-Contrast Outline */}
        <polygon
          points={`${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}`}
          fill="none"
          stroke="#00a8ff"
          strokeWidth="1.5"
          strokeDasharray="5 3"
          style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }}
        />
        {/* Rotator Stem Line */}
        <line
          x1={mt.x}
          y1={mt.y}
          x2={rot.x}
          y2={rot.y}
          stroke="#00a8ff"
          strokeWidth="1.5"
          style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }}
        />
      </svg>

      {/* 8 Resize Handles (Corner & Edge) */}
      {handles.map(({ id, pt }) => (
        <div
          key={id}
          onPointerDown={(e) => handlePointerDown(id, e)}
          className="absolute w-3 h-3 bg-white border-2 border-[#00a8ff] rounded-xs shadow-md pointer-events-auto cursor-pointer transition-transform hover:scale-135"
          style={{
            left: `${pt.x}px`,
            top: `${pt.y}px`,
            transform: 'translate(-50%, -50%)',
            cursor: getCursor(id),
          }}
          title={`Drag to resize (${id.toUpperCase()})`}
        />
      ))}

      {/* Rotation Handle */}
      <div
        onPointerDown={(e) => handlePointerDown('rot', e)}
        className="absolute w-4 h-4 bg-white border-2 border-[#00a8ff] rounded-full shadow-md pointer-events-auto cursor-grab flex items-center justify-center transition-transform hover:scale-125"
        style={{
          left: `${rot.x}px`,
          top: `${rot.y}px`,
          transform: 'translate(-50%, -50%)',
        }}
        title="Drag to rotate (Hold Shift to snap 15°)"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-[#00a8ff]" />
      </div>

      {/* Quick Action Floating Bar & Size Badge */}
      <div
        className="absolute pointer-events-auto flex items-center gap-1.5 bg-[var(--bg-3)] border border-[var(--bg-8)] rounded-md px-2 py-1 shadow-2xl backdrop-blur-md text-xs text-white"
        style={{
          left: `${mb.x}px`,
          top: `${mb.y + 20}px`,
          transform: 'translateX(-50%)',
          zIndex: 40,
        }}
      >
        <span className="font-mono text-[10px] text-[var(--text-3)] font-medium pr-1.5 border-r border-[var(--bg-8)]">
          {width} × {height} px {angle !== 0 && `(${angle}°)`}
        </span>
        <button
          onClick={handleFitToCanvas}
          className="p-1 hover:bg-[var(--bg-8)] rounded text-gray-300 hover:text-white transition-colors cursor-pointer"
          title="Fit inside canvas (90%)"
        >
          <Minimize size={13} />
        </button>
        <button
          onClick={handleFillCanvas}
          className="p-1 hover:bg-[var(--bg-8)] rounded text-gray-300 hover:text-white transition-colors cursor-pointer"
          title="Fill entire canvas"
        >
          <Maximize size={13} />
        </button>
        <button
          onClick={handleCenter}
          className="p-1 hover:bg-[var(--bg-8)] rounded text-gray-300 hover:text-white transition-colors cursor-pointer"
          title="Center on canvas"
        >
          <Move size={13} />
        </button>
        <button
          onClick={handleFlipH}
          className="p-1 hover:bg-[var(--bg-8)] rounded text-gray-300 hover:text-white transition-colors cursor-pointer"
          title="Flip Horizontally"
        >
          <FlipHorizontal size={13} />
        </button>
        <button
          onClick={handleFlipV}
          className="p-1 hover:bg-[var(--bg-8)] rounded text-gray-300 hover:text-white transition-colors cursor-pointer"
          title="Flip Vertically"
        >
          <FlipVertical size={13} />
        </button>
      </div>

      {/* Notice if extending outside canvas */}
      {isOutside && (
        <div
          className="absolute pointer-events-none text-[9px] font-medium bg-[#00a8ff]/20 text-[#00a8ff] border border-[#00a8ff]/40 px-2 py-0.5 rounded-full shadow-sm"
          style={{
            left: `${mt.x}px`,
            top: `${rot.y - 20}px`,
            transform: 'translateX(-50%)',
          }}
        >
          Extending outside canvas (Handles active)
        </div>
      )}
    </div>
  );
};
