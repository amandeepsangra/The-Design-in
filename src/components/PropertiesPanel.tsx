import React, { useEffect, useState } from 'react';
import * as fabric from 'fabric';
import {
  AlignHorizontalJustifyStart, AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
  AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter,
  Link, Unlink, Maximize, Minimize, Move, RotateCw, RefreshCw
} from 'lucide-react';

interface PropertiesPanelProps {
  canvas: fabric.Canvas | null;
}

const getObjType = (obj: fabric.Object | null): string => {
  if (!obj) return '';
  const t = (obj as any).type || obj.constructor?.name || '';
  return t.toLowerCase();
};

const isImage = (obj: fabric.Object | null) => {
  const t = getObjType(obj);
  return t === 'image' || t === 'fabricimage';
};

const SectionLabel = ({ label }: { label: string }) => (
  <div className="text-[9px] font-bold text-[var(--text-6)] uppercase tracking-widest py-1 border-b border-[var(--bg-4)] mb-2">{label}</div>
);

const PropRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex justify-between items-center py-1">
    <span className="text-[11px] text-[var(--text-4)]">{label}</span>
    <div className="flex items-center">{children}</div>
  </div>
);

export function PropertiesPanel({ canvas }: PropertiesPanelProps) {
  const [activeObj, setActiveObj] = useState<fabric.Object | null>(null);

  // Transform / Dimensions
  const [objW, setObjW] = useState(0);
  const [objH, setObjH] = useState(0);
  const [objX, setObjX] = useState(0);
  const [objY, setObjY] = useState(0);
  const [objAngle, setObjAngle] = useState(0);
  const [lockAspect, setLockAspect] = useState(true);

  // Stroke
  const [stroke, setStroke] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(0);

  // Canvas bg
  const [canvasBg, setCanvasBg] = useState('#ffffff');

  // Shadow / Glow — both are the same underlying fabric `shadow` primitive (fabric only
  // supports one shadow per object), so they're presented as mutually-exclusive modes
  // rather than two independent toggles that would silently overwrite each other.
  const [effectMode, setEffectMode] = useState<'none' | 'shadow' | 'glow'>('none');
  const [shadowColor, setShadowColor] = useState('#000000');
  const [shadowBlur, setShadowBlur] = useState(10);
  const [shadowOffsetX, setShadowOffsetX] = useState(5);
  const [shadowOffsetY, setShadowOffsetY] = useState(5);

  // Image Adjustments
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [blur, setBlur] = useState(0);

  useEffect(() => {
    if (!canvas) return;

    const updateProps = () => {
      const obj = canvas.getActiveObject();
      setActiveObj(obj || null);

      if (obj) {
        setObjW(Math.round(obj.getScaledWidth()));
        setObjH(Math.round(obj.getScaledHeight()));
        setObjX(Math.round(obj.left || 0));
        setObjY(Math.round(obj.top || 0));
        setObjAngle(Math.round(obj.angle || 0));

        setStroke(obj.stroke && typeof obj.stroke === 'string' ? obj.stroke : '#000000');
        setStrokeWidth(obj.strokeWidth || 0);

        if (obj.shadow) {
          const s = obj.shadow as fabric.Shadow;
          // Zero offset reads as a glow; anything else reads as a drop shadow. (A drop
          // shadow deliberately set to 0,0 offset would also read as "glow" here — a
          // harmless label ambiguity since the two are the same primitive anyway.)
          setEffectMode(!s.offsetX && !s.offsetY ? 'glow' : 'shadow');
          setShadowColor(s.color || '#000000');
          setShadowBlur(s.blur || 10);
          setShadowOffsetX(s.offsetX || 5);
          setShadowOffsetY(s.offsetY || 5);
        } else {
          setEffectMode('none');
        }

        // Read existing filters for image
        if (isImage(obj)) {
          const img = obj as fabric.Image;
          const filters = img.filters || [];
          const getF = (type: string, prop: string) => {
            const f = filters.find((f: any) => f && f.type === type) as any;
            return f ? f[prop] : 0;
          };
          setBrightness(getF('Brightness', 'brightness'));
          setContrast(getF('Contrast', 'contrast'));
          setSaturation(getF('Saturation', 'saturation'));
          setBlur(getF('Blur', 'blur'));
        }
      } else {
        if (canvas.backgroundColor && typeof canvas.backgroundColor === 'string') {
          setCanvasBg(canvas.backgroundColor);
        } else {
          setCanvasBg('#ffffff');
        }
      }
    };

    updateProps();
    canvas.on('selection:created', updateProps);
    canvas.on('selection:updated', updateProps);
    canvas.on('selection:cleared', updateProps);
    canvas.on('object:modified', updateProps);
    canvas.on('object:moving', updateProps);
    canvas.on('object:scaling', updateProps);
    canvas.on('object:rotating', updateProps);

    return () => {
      canvas.off('selection:created', updateProps);
      canvas.off('selection:updated', updateProps);
      canvas.off('selection:cleared', updateProps);
      canvas.off('object:modified', updateProps);
      canvas.off('object:moving', updateProps);
      canvas.off('object:scaling', updateProps);
      canvas.off('object:rotating', updateProps);
    };
  }, [canvas]);

  const handleWidthChange = (newW: number) => {
    if (!canvas || !activeObj || newW <= 0) return;
    const baseW = activeObj.width || 1;
    const newScaleX = newW / baseW;
    if (lockAspect) {
      const curAspect = activeObj.getScaledHeight() / (activeObj.getScaledWidth() || 1);
      const newH = Math.round(newW * curAspect);
      const baseH = activeObj.height || 1;
      activeObj.set({ scaleX: newScaleX, scaleY: newH / baseH });
      setObjH(newH);
    } else {
      activeObj.set({ scaleX: newScaleX });
    }
    setObjW(newW);
    activeObj.setCoords();
    canvas.requestRenderAll();
    canvas.fire('object:modified', { target: activeObj });
  };

  const handleHeightChange = (newH: number) => {
    if (!canvas || !activeObj || newH <= 0) return;
    const baseH = activeObj.height || 1;
    const newScaleY = newH / baseH;
    if (lockAspect) {
      const curAspect = activeObj.getScaledWidth() / (activeObj.getScaledHeight() || 1);
      const newW = Math.round(newH * curAspect);
      const baseW = activeObj.width || 1;
      activeObj.set({ scaleX: newW / baseW, scaleY: newScaleY });
      setObjW(newW);
    } else {
      activeObj.set({ scaleY: newScaleY });
    }
    setObjH(newH);
    activeObj.setCoords();
    canvas.requestRenderAll();
    canvas.fire('object:modified', { target: activeObj });
  };

  const handleXChange = (newX: number) => {
    if (!canvas || !activeObj) return;
    activeObj.set('left', newX);
    setObjX(newX);
    activeObj.setCoords();
    canvas.requestRenderAll();
    canvas.fire('object:modified', { target: activeObj });
  };

  const handleYChange = (newY: number) => {
    if (!canvas || !activeObj) return;
    activeObj.set('top', newY);
    setObjY(newY);
    activeObj.setCoords();
    canvas.requestRenderAll();
    canvas.fire('object:modified', { target: activeObj });
  };

  const handleAngleChange = (newAngle: number) => {
    if (!canvas || !activeObj) return;
    activeObj.set('angle', newAngle);
    setObjAngle(newAngle);
    activeObj.setCoords();
    canvas.requestRenderAll();
    canvas.fire('object:modified', { target: activeObj });
  };

  const handleFitToCanvas = () => {
    if (!canvas || !activeObj) return;
    const cW = canvas.getWidth();
    const cH = canvas.getHeight();
    const maxW = cW * 0.9;
    const maxH = cH * 0.9;
    const s = Math.min(maxW / activeObj.width, maxH / activeObj.height, 1);
    activeObj.scale(s);
    activeObj.setPositionByOrigin(new fabric.Point(cW / 2, cH / 2), 'center', 'center');
    activeObj.setCoords();
    canvas.requestRenderAll();
    canvas.fire('object:modified', { target: activeObj });
    setObjW(Math.round(activeObj.getScaledWidth()));
    setObjH(Math.round(activeObj.getScaledHeight()));
    setObjX(Math.round(activeObj.left || 0));
    setObjY(Math.round(activeObj.top || 0));
  };

  const handleFillCanvas = () => {
    if (!canvas || !activeObj) return;
    const cW = canvas.getWidth();
    const cH = canvas.getHeight();
    const s = Math.max(cW / activeObj.width, cH / activeObj.height);
    activeObj.scale(s);
    activeObj.setPositionByOrigin(new fabric.Point(cW / 2, cH / 2), 'center', 'center');
    activeObj.setCoords();
    canvas.requestRenderAll();
    canvas.fire('object:modified', { target: activeObj });
    setObjW(Math.round(activeObj.getScaledWidth()));
    setObjH(Math.round(activeObj.getScaledHeight()));
    setObjX(Math.round(activeObj.left || 0));
    setObjY(Math.round(activeObj.top || 0));
  };

  const handleCenter = () => {
    if (!canvas || !activeObj) return;
    const cW = canvas.getWidth();
    const cH = canvas.getHeight();
    activeObj.setPositionByOrigin(new fabric.Point(cW / 2, cH / 2), 'center', 'center');
    activeObj.setCoords();
    canvas.requestRenderAll();
    canvas.fire('object:modified', { target: activeObj });
    setObjX(Math.round(activeObj.left || 0));
    setObjY(Math.round(activeObj.top || 0));
  };

  const handleResetScale = () => {
    if (!canvas || !activeObj) return;
    activeObj.set({ scaleX: 1, scaleY: 1 });
    activeObj.setCoords();
    canvas.requestRenderAll();
    canvas.fire('object:modified', { target: activeObj });
    setObjW(Math.round(activeObj.getScaledWidth()));
    setObjH(Math.round(activeObj.getScaledHeight()));
  };

  const set = (key: string, value: any) => {
    if (!canvas || !activeObj) return;
    activeObj.set(key as any, value);
    canvas.requestRenderAll();
  };

  const applyFilter = (filterType: string, prop: string, value: number) => {
    if (!canvas || !activeObj) return;
    const img = activeObj as fabric.Image;
    if (!img.filters) img.filters = [];
    const idx = img.filters.findIndex((f: any) => f && f.type === filterType);
    const FilterClass = (fabric.filters as any)[filterType];
    if (idx >= 0) {
      (img.filters[idx] as any)[prop] = value;
    } else {
      img.filters.push(new FilterClass({ [prop]: value }));
    }
    img.applyFilters();
    canvas.requestRenderAll();
  };

  const updateShadow = (field: string, value: any) => {
    if (!canvas || !activeObj) return;
    let s = activeObj.shadow as fabric.Shadow;
    if (!s) s = new fabric.Shadow({ color: shadowColor, blur: shadowBlur, offsetX: shadowOffsetX, offsetY: shadowOffsetY });
    (s as any)[field] = value;
    if (effectMode === 'glow') { (s as any).offsetX = 0; (s as any).offsetY = 0; }
    activeObj.set('shadow', s);
    canvas.requestRenderAll();
  };

  const applyEffect = (mode: 'none' | 'shadow' | 'glow') => {
    if (!canvas || !activeObj) return;
    setEffectMode(mode);
    if (mode === 'none') {
      activeObj.set('shadow', null);
    } else if (mode === 'shadow') {
      activeObj.set('shadow', new fabric.Shadow({ color: shadowColor, blur: shadowBlur, offsetX: shadowOffsetX, offsetY: shadowOffsetY }));
    } else {
      // A glow is just a shadow with no offset — bigger blur reads better as a glow.
      activeObj.set('shadow', new fabric.Shadow({ color: shadowColor, blur: Math.max(shadowBlur, 15), offsetX: 0, offsetY: 0 }));
    }
    canvas.requestRenderAll();
  };

  const updateCanvasBg = (color: string) => {
    if (!canvas) return;
    setCanvasBg(color);
    canvas.backgroundColor = color;
    canvas.requestRenderAll();
  };

  // ─── Align & Distribute (multi-select) ───
  // Runs against each object's absolute bounding box rather than the ActiveSelection's
  // own (group-relative) coordinates — simpler and avoids the selection's internal
  // offset math entirely. The selection is torn down, objects repositioned in absolute
  // canvas space, then regrouped so the result still reads as one selection afterward.
  const isMultiSelect = !!activeObj && getObjType(activeObj) === 'activeselection' && (activeObj as any)._objects?.length > 1;

  const withMultiSelection = (fn: (objs: fabric.Object[], bounds: { left: number; top: number; right: number; bottom: number; width: number; height: number }) => void) => {
    if (!canvas) return;
    const objs = [...canvas.getActiveObjects()];
    if (objs.length < 2) return;
    canvas.discardActiveObject();

    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
    objs.forEach(o => {
      o.setCoords();
      const r = o.getBoundingRect();
      left = Math.min(left, r.left); top = Math.min(top, r.top);
      right = Math.max(right, r.left + r.width); bottom = Math.max(bottom, r.top + r.height);
    });
    fn(objs, { left, top, right, bottom, width: right - left, height: bottom - top });

    objs.forEach(o => o.setCoords());
    canvas.setActiveObject(new fabric.ActiveSelection(objs, { canvas }));
    canvas.requestRenderAll();
  };

  const alignSingleObject = (type: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom') => {
    if (!canvas || !activeObj) return;
    const cw = canvas.getWidth();
    const ch = canvas.getHeight();
    const zoom = canvas.getZoom() || 1;
    const docW = Math.round(cw / zoom);
    const docH = Math.round(ch / zoom);

    activeObj.setCoords();
    const r = activeObj.getBoundingRect();
    const currentLeft = activeObj.left || 0;
    const currentTop = activeObj.top || 0;

    switch (type) {
      case 'left':
        activeObj.set('left', currentLeft - r.left);
        break;
      case 'hcenter':
        activeObj.set('left', currentLeft + (docW / 2 - (r.left + r.width / 2)));
        break;
      case 'right':
        activeObj.set('left', currentLeft + (docW - (r.left + r.width)));
        break;
      case 'top':
        activeObj.set('top', currentTop - r.top);
        break;
      case 'vcenter':
        activeObj.set('top', currentTop + (docH / 2 - (r.top + r.height / 2)));
        break;
      case 'bottom':
        activeObj.set('top', currentTop + (docH - (r.top + r.height)));
        break;
    }
    activeObj.setCoords();
    canvas.requestRenderAll();
  };

  const handleAlignLeft = () => isMultiSelect ? alignLeft() : alignSingleObject('left');
  const handleAlignHCenter = () => isMultiSelect ? alignHCenter() : alignSingleObject('hcenter');
  const handleAlignRight = () => isMultiSelect ? alignRight() : alignSingleObject('right');
  const handleAlignTop = () => isMultiSelect ? alignTop() : alignSingleObject('top');
  const handleAlignVCenter = () => isMultiSelect ? alignVCenter() : alignSingleObject('vcenter');
  const handleAlignBottom = () => isMultiSelect ? alignBottom() : alignSingleObject('bottom');

  const alignLeft = () => withMultiSelection((objs, b) => objs.forEach(o => {
    const r = o.getBoundingRect(); o.set('left', (o.left || 0) + (b.left - r.left));
  }));
  const alignHCenter = () => withMultiSelection((objs, b) => objs.forEach(o => {
    const r = o.getBoundingRect(); o.set('left', (o.left || 0) + (b.left + b.width / 2 - (r.left + r.width / 2)));
  }));
  const alignRight = () => withMultiSelection((objs, b) => objs.forEach(o => {
    const r = o.getBoundingRect(); o.set('left', (o.left || 0) + (b.right - (r.left + r.width)));
  }));
  const alignTop = () => withMultiSelection((objs, b) => objs.forEach(o => {
    const r = o.getBoundingRect(); o.set('top', (o.top || 0) + (b.top - r.top));
  }));
  const alignVCenter = () => withMultiSelection((objs, b) => objs.forEach(o => {
    const r = o.getBoundingRect(); o.set('top', (o.top || 0) + (b.top + b.height / 2 - (r.top + r.height / 2)));
  }));
  const alignBottom = () => withMultiSelection((objs, b) => objs.forEach(o => {
    const r = o.getBoundingRect(); o.set('top', (o.top || 0) + (b.bottom - (r.top + r.height)));
  }));
  const distributeHorizontal = () => withMultiSelection((objs, b) => {
    if (objs.length < 3) return;
    const items = objs.map(o => ({ o, r: o.getBoundingRect() })).sort((a, c) => a.r.left - c.r.left);
    const totalWidth = items.reduce((s, x) => s + x.r.width, 0);
    const gap = (b.width - totalWidth) / (items.length - 1);
    let cursor = b.left;
    items.forEach(({ o, r }) => { o.set('left', (o.left || 0) + (cursor - r.left)); cursor += r.width + gap; });
  });
  const distributeVertical = () => withMultiSelection((objs, b) => {
    if (objs.length < 3) return;
    const items = objs.map(o => ({ o, r: o.getBoundingRect() })).sort((a, c) => a.r.top - c.r.top);
    const totalHeight = items.reduce((s, x) => s + x.r.height, 0);
    const gap = (b.height - totalHeight) / (items.length - 1);
    let cursor = b.top;
    items.forEach(({ o, r }) => { o.set('top', (o.top || 0) + (cursor - r.top)); cursor += r.height + gap; });
  });

  const alignBtnCls = "p-1.5 rounded border border-[var(--bg-7)] bg-[var(--bg-1)] text-[var(--text-3)] hover:text-white hover:border-[var(--color-accent)] cursor-pointer transition-colors";

  const colorCls = "w-7 h-7 rounded border border-[var(--bg-7)] cursor-pointer bg-transparent";
  const inputCls = "bg-[var(--bg-1)] border border-[var(--bg-7)] rounded px-2 py-0.5 text-[11px] text-white outline-none focus:border-[var(--color-accent)] w-16 text-center";

  return (
    <div className="h-1/2 border-b border-[var(--bg-1)] flex flex-col bg-[var(--bg-3)]">
      {/* Header */}
      <div className="h-7 bg-[var(--bg-3)] border-b border-[var(--bg-1)] flex items-center px-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-3.5 rounded-full bg-[var(--color-accent)]" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-6)]">
            {activeObj ? `${getObjType(activeObj).replace('i-', '').replace('fabric','').toUpperCase()}` : 'Properties'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0 text-sm">
        {!activeObj ? (
          <div>
            <div className="text-center my-5 flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-[var(--bg-1)] border border-[var(--bg-4)] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--bg-8)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/></svg>
              </div>
              <span className="text-[10px] text-[var(--bg-9)]">Select a layer to edit</span>
            </div>
            <SectionLabel label="Canvas" />
            <PropRow label="Background">
              <input type="color" value={canvasBg} onChange={e => updateCanvasBg(e.target.value)} className={colorCls} />
            </PropRow>
          </div>
        ) : (
          <>
            {/* Transform & Dimensions */}
            <SectionLabel label="Transform & Size" />
            <div className="grid grid-cols-2 gap-2 pb-2">
              <div className="flex items-center gap-1.5 bg-[var(--bg-1)] border border-[var(--bg-7)] rounded px-2 py-1">
                <span className="text-[10px] font-bold text-[var(--text-4)] w-3">W</span>
                <input
                  type="number"
                  value={objW}
                  onChange={e => handleWidthChange(Number(e.target.value))}
                  className="w-full bg-transparent text-[11px] text-white outline-none"
                  title="Width (px)"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-[var(--bg-1)] border border-[var(--bg-7)] rounded px-2 py-1">
                <span className="text-[10px] font-bold text-[var(--text-4)] w-3">H</span>
                <input
                  type="number"
                  value={objH}
                  onChange={e => handleHeightChange(Number(e.target.value))}
                  className="w-full bg-transparent text-[11px] text-white outline-none"
                  title="Height (px)"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-[var(--bg-1)] border border-[var(--bg-7)] rounded px-2 py-1">
                <span className="text-[10px] font-bold text-[var(--text-4)] w-3">X</span>
                <input
                  type="number"
                  value={objX}
                  onChange={e => handleXChange(Number(e.target.value))}
                  className="w-full bg-transparent text-[11px] text-white outline-none"
                  title="X Position"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-[var(--bg-1)] border border-[var(--bg-7)] rounded px-2 py-1">
                <span className="text-[10px] font-bold text-[var(--text-4)] w-3">Y</span>
                <input
                  type="number"
                  value={objY}
                  onChange={e => handleYChange(Number(e.target.value))}
                  className="w-full bg-transparent text-[11px] text-white outline-none"
                  title="Y Position"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pb-2">
              <button
                onClick={() => setLockAspect(!lockAspect)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] cursor-pointer transition-colors border ${lockAspect ? 'bg-[var(--color-accent)]/20 border-[var(--color-accent)] text-white' : 'bg-[var(--bg-1)] border-[var(--bg-7)] text-[var(--text-4)]'}`}
                title="Lock aspect ratio"
              >
                {lockAspect ? <Link size={11} className="text-[var(--color-accent)]" /> : <Unlink size={11} />}
                <span>{lockAspect ? 'Aspect Ratio Locked' : 'Free Aspect'}</span>
              </button>
              <div className="flex items-center gap-1 bg-[var(--bg-1)] border border-[var(--bg-7)] rounded px-2 py-1">
                <RotateCw size={11} className="text-[var(--text-5)]" />
                <input
                  type="number"
                  value={objAngle}
                  onChange={e => handleAngleChange(Number(e.target.value))}
                  className="w-8 bg-transparent text-[10px] text-white text-center outline-none"
                  title="Rotation angle (degrees)"
                />
                <span className="text-[10px] text-[var(--text-5)]">°</span>
              </div>
            </div>

            {/* Quick Sizing Presets */}
            <div className="grid grid-cols-4 gap-1 pb-3">
              <button
                onClick={handleFitToCanvas}
                className="px-1.5 py-1 rounded bg-[var(--bg-1)] border border-[var(--bg-7)] hover:border-[var(--color-accent)] text-[10px] text-[var(--text-3)] hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-colors"
                title="Fit inside Canvas (90%)"
              >
                <Minimize size={11} />
                <span>Fit</span>
              </button>
              <button
                onClick={handleFillCanvas}
                className="px-1.5 py-1 rounded bg-[var(--bg-1)] border border-[var(--bg-7)] hover:border-[var(--color-accent)] text-[10px] text-[var(--text-3)] hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-colors"
                title="Fill Canvas completely"
              >
                <Maximize size={11} />
                <span>Fill</span>
              </button>
              <button
                onClick={handleCenter}
                className="px-1.5 py-1 rounded bg-[var(--bg-1)] border border-[var(--bg-7)] hover:border-[var(--color-accent)] text-[10px] text-[var(--text-3)] hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-colors"
                title="Center on Canvas"
              >
                <Move size={11} />
                <span>Center</span>
              </button>
              <button
                onClick={handleResetScale}
                className="px-1.5 py-1 rounded bg-[var(--bg-1)] border border-[var(--bg-7)] hover:border-[var(--color-accent)] text-[10px] text-[var(--text-3)] hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-colors"
                title="Reset scale to original 100%"
              >
                <RefreshCw size={11} />
                <span>100%</span>
              </button>
            </div>

            {/* Align & Distribute */}
            <SectionLabel label={isMultiSelect ? "Align & Distribute (Selection)" : "Align to Canvas"} />
            <div className="grid grid-cols-6 gap-1 pb-2">
              <button title={isMultiSelect ? "Align Left (Selection)" : "Align to Canvas Left"} onClick={handleAlignLeft} className={alignBtnCls}><AlignHorizontalJustifyStart size={13} /></button>
              <button title={isMultiSelect ? "Align Center Horizontal" : "Center Horizontally on Canvas"} onClick={handleAlignHCenter} className={alignBtnCls}><AlignHorizontalJustifyCenter size={13} /></button>
              <button title={isMultiSelect ? "Align Right (Selection)" : "Align to Canvas Right"} onClick={handleAlignRight} className={alignBtnCls}><AlignHorizontalJustifyEnd size={13} /></button>
              <button title={isMultiSelect ? "Align Top (Selection)" : "Align to Canvas Top"} onClick={handleAlignTop} className={alignBtnCls}><AlignVerticalJustifyStart size={13} /></button>
              <button title={isMultiSelect ? "Align Center Vertical" : "Center Vertically on Canvas"} onClick={handleAlignVCenter} className={alignBtnCls}><AlignVerticalJustifyCenter size={13} /></button>
              <button title={isMultiSelect ? "Align Bottom (Selection)" : "Align to Canvas Bottom"} onClick={handleAlignBottom} className={alignBtnCls}><AlignVerticalJustifyEnd size={13} /></button>
              {isMultiSelect && (
                <>
                  <button title="Distribute Horizontally (3+ objects)" onClick={distributeHorizontal} className={alignBtnCls}><AlignHorizontalDistributeCenter size={13} /></button>
                  <button title="Distribute Vertically (3+ objects)" onClick={distributeVertical} className={alignBtnCls}><AlignVerticalDistributeCenter size={13} /></button>
                </>
              )}
            </div>

            {/* Stroke */}
            <SectionLabel label="Stroke" />
            <PropRow label="Color">
              <input type="color" value={stroke} onChange={e => { setStroke(e.target.value); set('stroke', e.target.value); }} className={colorCls} />
            </PropRow>
            <PropRow label="Width">
              <input type="number" min="0" value={strokeWidth}
                onChange={e => { const v = Number(e.target.value); setStrokeWidth(v); set('strokeWidth', v); }}
                className={inputCls} />
            </PropRow>

            {/* Shadow / Glow — one shared "Effect" primitive, see applyEffect() note above */}
            <SectionLabel label="Effect" />
            <div className="flex gap-1 pb-2">
              {(['none', 'shadow', 'glow'] as const).map(m => (
                <button key={m} onClick={() => applyEffect(m)}
                  className={`flex-1 px-1.5 py-1 rounded border text-[10px] capitalize cursor-pointer transition-colors ${effectMode === m ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white' : 'bg-[var(--bg-1)] border-[var(--bg-7)] text-[var(--text-3)] hover:text-white'}`}>
                  {m === 'none' ? 'None' : m === 'shadow' ? 'Drop Shadow' : 'Outer Glow'}
                </button>
              ))}
            </div>
            {effectMode !== 'none' && <>
              <PropRow label="Color">
                <input type="color" value={shadowColor} onChange={e => { setShadowColor(e.target.value); updateShadow('color', e.target.value); }} className={colorCls} />
              </PropRow>
              <PropRow label="Blur">
                <div className="flex items-center gap-1">
                  <input type="range" min="0" max="60" value={shadowBlur}
                    onChange={e => { const v = Number(e.target.value); setShadowBlur(v); updateShadow('blur', v); }}
                    className="w-20 accent-[var(--color-accent)]" />
                  <span className="text-[10px] text-[var(--text-6)] w-6">{shadowBlur}</span>
                </div>
              </PropRow>
              {effectMode === 'shadow' && <>
                <PropRow label="Offset X">
                  <input type="number" value={shadowOffsetX}
                    onChange={e => { const v = Number(e.target.value); setShadowOffsetX(v); updateShadow('offsetX', v); }}
                    className="w-12 bg-[var(--bg-1)] border border-[var(--bg-7)] rounded px-1.5 py-0.5 text-[10px] text-white outline-none text-center" />
                </PropRow>
                <PropRow label="Offset Y">
                  <input type="number" value={shadowOffsetY}
                    onChange={e => { const v = Number(e.target.value); setShadowOffsetY(v); updateShadow('offsetY', v); }}
                    className="w-12 bg-[var(--bg-1)] border border-[var(--bg-7)] rounded px-1.5 py-0.5 text-[10px] text-white outline-none text-center" />
                </PropRow>
              </>}
            </>}

            {/* Image Adjustments */}
            {isImage(activeObj) && <>
              <SectionLabel label="Image Adjustments" />
              {[
                { label: 'Brightness', type: 'Brightness', prop: 'brightness', val: brightness, set: setBrightness, min: -1, max: 1 },
                { label: 'Contrast',   type: 'Contrast',   prop: 'contrast',   val: contrast,   set: setContrast,   min: -1, max: 1 },
                { label: 'Saturation', type: 'Saturation', prop: 'saturation', val: saturation, set: setSaturation, min: -1, max: 1 },
                { label: 'Blur',       type: 'Blur',       prop: 'blur',       val: blur,       set: setBlur,       min: 0,  max: 1 },
              ].map(f => (
                <PropRow key={f.label} label={f.label}>
                  <div className="flex items-center gap-1">
                    <input type="range" min={f.min} max={f.max} step="0.05" value={f.val}
                      onChange={e => { const v = Number(e.target.value); f.set(v); applyFilter(f.type, f.prop, v); }}
                      className="w-20 accent-[var(--color-accent)]" />
                    <span className="text-[9px] text-[var(--text-6)] w-8 text-right">{Math.round(f.val * 100)}</span>
                  </div>
                </PropRow>
              ))}

              <SectionLabel label="Clipping Mask" />
              <button
                onClick={() => {
                  if (!canvas) return;
                  const objs = canvas.getObjects();
                  const idx = objs.indexOf(activeObj);
                  if (idx > 0) {
                    const shape = objs[idx - 1];
                    shape.set('absolutePositioned', true);
                    activeObj.set('clipPath', shape);
                    shape.set('visible', false);
                    canvas.requestRenderAll();
                  } else alert('Place a shape layer directly below this image.');
                }}
                className="w-full py-2 mt-1 bg-[var(--bg-1)] border border-[var(--bg-7)] rounded text-[11px] text-white hover:border-[var(--color-accent)] transition-all cursor-pointer">
                ✂ Clip to Shape Below
              </button>
              <button
                onClick={() => {
                  if (!canvas) return;
                  const mask = activeObj.clipPath;
                  if (mask) { (mask as fabric.Object).set('visible', true); activeObj.set('clipPath', undefined); canvas.requestRenderAll(); }
                }}
                className="w-full py-1.5 mt-1 text-[11px] text-[var(--text-6)] hover:text-white cursor-pointer text-center transition-colors">
                Release Mask
              </button>
            </>}
          </>
        )}
      </div>
    </div>
  );
}
