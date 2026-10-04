import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Download, Upload, Plus, Trash2, RotateCcw,
  Sparkles, Coffee, Shirt, ShoppingBag
} from 'lucide-react';
import { BUILTIN_MOCKUPS } from '../utils/mockupTemplates';
import { exportCompositeMockup, getCleanCanvasSnapshot } from '../utils/exportHelper';

export interface MockupData {
  id: string;
  name?: string;
  url: string;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
  rotation?: number;
  opacity?: number;
  blendMode?: 'multiply' | 'normal' | 'screen' | 'overlay';
}

interface MockupWorkspaceProps {
  canvas: any;
  mockups: MockupData[];
  activeMockupId: string | null;
  onChange: (mockups: MockupData[], activeMockupId: string | null) => void;
  docWidth?: number;
  docHeight?: number;
  docName?: string;
}

const MAX_MOCKUPS = 12;

export function MockupWorkspace({
  canvas,
  mockups,
  activeMockupId,
  onChange,
  docWidth = 1000,
  docHeight = 1000,
  docName = 'Tea-Design',
}: MockupWorkspaceProps) {
  const [livePreviewData, setLivePreviewData] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isDraggingOverlay, setIsDraggingOverlay] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Sync canvas to live preview data URL safely using clean un-zoomed snapshot
  const updatePreview = useCallback(() => {
    if (!canvas) return;
    try {
      const dataUrl = getCleanCanvasSnapshot(canvas, docWidth, docHeight, 1400);
      if (dataUrl) setLivePreviewData(dataUrl);
    } catch (e) {
      console.error('Error generating preview snapshot', e);
    }
  }, [canvas, docWidth, docHeight]);

  useEffect(() => {
    if (!canvas) return;
    updatePreview();

    const onUpdate = () => updatePreview();
    canvas.on('object:modified', onUpdate);
    canvas.on('mouse:up', onUpdate);
    canvas.on('object:added', onUpdate);
    canvas.on('object:removed', onUpdate);

    return () => {
      canvas.off('object:modified', onUpdate);
      canvas.off('mouse:up', onUpdate);
      canvas.off('object:added', onUpdate);
      canvas.off('object:removed', onUpdate);
    };
  }, [canvas, updatePreview]);

  // Load a built-in mockup template
  const loadBuiltin = (builtin: typeof BUILTIN_MOCKUPS[0]) => {
    const existing = mockups.find(m => m.id === builtin.id);
    if (existing) {
      onChange(mockups, existing.id);
      return;
    }
    const newMockup: MockupData = {
      id: builtin.id,
      name: builtin.name,
      url: builtin.url,
      scale: builtin.defaultScale,
      offsetX: builtin.defaultOffsetX,
      offsetY: builtin.defaultOffsetY,
      rotation: 0,
      opacity: 0.95,
      blendMode: builtin.defaultBlendMode,
    };
    const newMockups = [...mockups, newMockup];
    onChange(newMockups, newMockup.id);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    let newMockups = [...mockups];
    let newActiveId = activeMockupId;

    files.forEach((file) => {
      if (newMockups.length >= MAX_MOCKUPS) return;
      const reader = new FileReader();
      reader.onload = (f) => {
        const url = f.target?.result as string;
        const newMockup: MockupData = {
          id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: file.name.replace(/\.[^/.]+$/, ""),
          url,
          scale: 0.55,
          offsetX: 0,
          offsetY: 0,
          rotation: 0,
          opacity: 0.95,
          blendMode: 'multiply',
        };
        newMockups = [...newMockups, newMockup];
        if (!newActiveId || newMockups.length === 1) newActiveId = newMockup.id;
        onChange(newMockups, newActiveId);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeMockup = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newMockups = mockups.filter(m => m.id !== id);
    let newActiveId = activeMockupId;
    if (activeMockupId === id) {
      newActiveId = newMockups.length > 0 ? newMockups[0].id : null;
    }
    onChange(newMockups, newActiveId);
  };

  const activeMockup = mockups.find(m => m.id === activeMockupId);
  const activeIndex = activeMockup ? mockups.findIndex(m => m.id === activeMockupId) : -1;
  const emptySlots = Math.max(0, MAX_MOCKUPS - mockups.length);

  const updateActiveMockupProperty = (key: keyof MockupData, val: any) => {
    if (!activeMockupId) return;
    const updated = mockups.map(m => (m.id === activeMockupId ? { ...m, [key]: val } : m));
    onChange(updated, activeMockupId);
  };

  const resetActivePlacement = () => {
    if (!activeMockup) return;
    const builtin = BUILTIN_MOCKUPS.find(b => b.id === activeMockup.id);
    const updated = mockups.map(m =>
      m.id === activeMockupId
        ? {
            ...m,
            scale: builtin ? builtin.defaultScale : 0.55,
            offsetX: builtin ? builtin.defaultOffsetX : 0,
            offsetY: builtin ? builtin.defaultOffsetY : 0,
            rotation: 0,
            opacity: 0.95,
            blendMode: builtin ? builtin.defaultBlendMode : 'multiply',
          }
        : m
    );
    onChange(updated, activeMockupId);
  };

  // Direct drag to position overlay on mockup
  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingOverlay(true);
    setDragStartPos({ x: e.clientX, y: e.clientY });
  };

  const handleOverlayMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingOverlay || !dragStartPos || !activeMockup || !previewContainerRef.current) return;
    const containerRect = previewContainerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragStartPos.x) / containerRect.width) * 100;
    const dy = ((e.clientY - dragStartPos.y) / containerRect.height) * 100;

    const currentX = activeMockup.offsetX ?? 0;
    const currentY = activeMockup.offsetY ?? 0;

    updateActiveMockupProperty('offsetX', Math.max(-50, Math.min(50, Math.round(currentX + dx))));
    updateActiveMockupProperty('offsetY', Math.max(-50, Math.min(50, Math.round(currentY + dy))));
    setDragStartPos({ x: e.clientX, y: e.clientY });
  };

  const handleOverlayMouseUp = () => {
    setIsDraggingOverlay(false);
    setDragStartPos(null);
  };

  // Export current active mockup with composited design
  const handleExportActiveMockup = async (format: 'png' | 'jpeg' = 'png') => {
    if (!activeMockup || !livePreviewData) {
      alert('Please select a mockup and ensure your design has content to export.');
      return;
    }
    setIsExporting(true);
    try {
      await exportCompositeMockup(activeMockup.url, livePreviewData, {
        fileName: `${docName}-${activeMockup.name || 'mockup'}`,
        scale: activeMockup.scale ?? 0.55,
        offsetX: activeMockup.offsetX ?? 0,
        offsetY: activeMockup.offsetY ?? 0,
        rotation: activeMockup.rotation ?? 0,
        opacity: activeMockup.opacity ?? 0.95,
        blendMode: (activeMockup.blendMode || 'multiply') as GlobalCompositeOperation,
        format,
      });
    } catch (e) {
      console.error('Export failed', e);
      alert('Mockup export failed. Please check console for details.');
    } finally {
      setIsExporting(false);
    }
  };

  // Export all mockups in series
  const handleExportAllMockups = async () => {
    if (!mockups.length || !livePreviewData) {
      alert('No mockups to export.');
      return;
    }
    setIsExporting(true);
    try {
      for (let i = 0; i < mockups.length; i++) {
        const m = mockups[i];
        await exportCompositeMockup(m.url, livePreviewData, {
          fileName: `${docName}-view-${i + 1}-${m.name || 'mockup'}`,
          scale: m.scale ?? 0.55,
          offsetX: m.offsetX ?? 0,
          offsetY: m.offsetY ?? 0,
          rotation: m.rotation ?? 0,
          opacity: m.opacity ?? 0.95,
          blendMode: (m.blendMode || 'multiply') as GlobalCompositeOperation,
          format: 'png',
        });
        // brief pause so browser triggers each download cleanly
        await new Promise(r => setTimeout(r, 200));
      }
    } catch (e) {
      console.error('Export all failed', e);
      alert('Failed during batch export.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-3)] overflow-hidden relative border-l border-[var(--bg-5)] select-none">
      {/* Hidden File Input */}
      <input
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileUpload}
      />

      {/* Header */}
      <div className="h-10 border-b border-[var(--bg-5)] bg-[var(--bg-3)] flex items-center px-3 shrink-0 justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[var(--color-accent)]" />
          <span className="text-xs font-semibold text-white tracking-wide">
            Live Mockup Studio
          </span>
          <span className="text-[10px] bg-[var(--bg-5)] text-[var(--text-4)] px-1.5 py-0.5 rounded font-mono">
            {mockups.length}/{MAX_MOCKUPS}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {activeMockup && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleExportActiveMockup('png')}
                disabled={isExporting}
                title="Download this mockup as high-res PNG"
                className="flex items-center gap-1 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-2.5 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer shadow disabled:opacity-50"
              >
                <Download size={11} />
                {isExporting ? 'Exporting...' : 'Export Mockup'}
              </button>
              {mockups.length > 1 && (
                <button
                  onClick={handleExportAllMockups}
                  disabled={isExporting}
                  title="Download all mockup views"
                  className="flex items-center gap-1 bg-[var(--bg-6)] hover:bg-[var(--bg-8)] border border-[var(--bg-8)] text-white px-2 py-1 rounded text-[10px] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Export All
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Live Adjustment Bar (When a mockup is active) */}
      {activeMockup && (
        <div className="bg-[var(--bg-2)] border-b border-[var(--bg-5)] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px] shrink-0">
          <div className="flex items-center gap-3">
            {/* Scale Slider */}
            <div className="flex items-center gap-1.5" title="Adjust scale of design on mockup">
              <span className="text-[var(--text-5)]">Size:</span>
              <input
                type="range"
                min="0.15"
                max="1.2"
                step="0.02"
                value={activeMockup.scale ?? 0.55}
                onChange={(e) => updateActiveMockupProperty('scale', parseFloat(e.target.value))}
                className="w-16 accent-[var(--color-accent)] h-1 cursor-pointer"
              />
              <span className="font-mono text-[var(--text-3)] text-[9px] w-7">
                {Math.round((activeMockup.scale ?? 0.55) * 100)}%
              </span>
            </div>

            {/* Blend Mode */}
            <div className="flex items-center gap-1.5" title="Blend mode for natural surface blending">
              <span className="text-[var(--text-5)]">Blend:</span>
              <select
                value={activeMockup.blendMode || 'multiply'}
                onChange={(e) => updateActiveMockupProperty('blendMode', e.target.value)}
                className="bg-[var(--bg-5)] text-white text-[10px] rounded px-1.5 py-0.5 border border-[var(--bg-8)] outline-none cursor-pointer"
              >
                <option value="multiply">Multiply (Mug/White)</option>
                <option value="normal">Normal (Opaque)</option>
                <option value="screen">Screen (Dark Base)</option>
                <option value="overlay">Overlay</option>
              </select>
            </div>

            {/* Opacity */}
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--text-5)]">Opacity:</span>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={activeMockup.opacity ?? 0.95}
                onChange={(e) => updateActiveMockupProperty('opacity', parseFloat(e.target.value))}
                className="w-14 accent-[var(--color-accent)] h-1 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={resetActivePlacement}
              className="flex items-center gap-1 px-1.5 py-0.5 text-[var(--text-5)] hover:text-white hover:bg-[var(--bg-6)] rounded transition-colors cursor-pointer"
              title="Reset position and scale to default"
            >
              <RotateCcw size={10} />
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Main Focused Preview Area */}
      <div
        ref={previewContainerRef}
        onMouseMove={handleOverlayMouseMove}
        onMouseUp={handleOverlayMouseUp}
        onMouseLeave={handleOverlayMouseUp}
        className="flex-1 flex items-center justify-center p-3 relative overflow-hidden bg-[var(--bg-1)] select-none"
      >
        {!activeMockup ? (
          <div className="flex flex-col items-center text-center max-w-sm px-4">
            <div className="w-14 h-14 bg-[var(--bg-4)] border border-[var(--bg-7)] rounded-full flex items-center justify-center mb-3 text-[var(--color-accent)] shadow-inner">
              <Coffee size={24} />
            </div>
            <h3 className="text-white font-medium text-sm mb-1">Instant Product Mockups</h3>
            <p className="text-[var(--text-4)] text-[11px] mb-4">
              Select a quick preset template below or upload your own transparent product photo:
            </p>

            {/* Quick Preset Buttons */}
            <div className="grid grid-cols-2 gap-2 w-full mb-4">
              {BUILTIN_MOCKUPS.map(bm => (
                <button
                  key={bm.id}
                  onClick={() => loadBuiltin(bm)}
                  className="flex items-center gap-2 p-2 bg-[var(--bg-3)] hover:bg-[var(--bg-5)] border border-[var(--bg-7)] rounded text-left transition-colors cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded bg-[var(--bg-2)] flex items-center justify-center shrink-0 border border-[var(--bg-8)]">
                    {bm.category === 'mug' ? <Coffee size={15} className="text-amber-400" /> :
                     bm.category === 'apparel' ? <Shirt size={15} className="text-blue-400" /> :
                     <ShoppingBag size={15} className="text-emerald-400" />}
                  </div>
                  <div className="truncate">
                    <div className="text-white text-[11px] font-medium truncate group-hover:text-[var(--color-accent)]">
                      {bm.name}
                    </div>
                    <div className="text-[9px] text-[var(--text-6)] capitalize">{bm.category}</div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-[var(--bg-6)] hover:bg-[var(--bg-7)] border border-[var(--bg-8)] text-white px-4 py-1.5 rounded text-xs transition-colors cursor-pointer"
            >
              <Upload size={13} />
              Upload Custom Mockup
            </button>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center relative rounded-lg border border-[var(--bg-6)] overflow-hidden bg-[var(--bg-2)] shadow-2xl group">
            {/* Sync Badge */}
            <div className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[9px] text-[var(--color-accent)] border border-[var(--color-accent)]/30 z-30 backdrop-blur flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE PREVIEW • DRAG TO POSITION
            </div>

            {/* Quick Export Button floating */}
            <button
              onClick={() => handleExportActiveMockup('png')}
              disabled={isExporting}
              className="absolute top-2 right-2 bg-black/60 hover:bg-[var(--color-accent)] text-white px-2 py-1 rounded text-[10px] font-medium border border-white/10 z-30 backdrop-blur transition-all flex items-center gap-1 cursor-pointer opacity-80 hover:opacity-100"
            >
              <Download size={11} />
              Save PNG
            </button>

            {/* The base mockup image */}
            <img
              src={activeMockup.url}
              alt={activeMockup.name || 'Mockup Base'}
              className="absolute max-w-[92%] max-h-[92%] object-contain z-10 pointer-events-none select-none shadow-md"
            />

            {/* The design overlay with interactive drag */}
            {livePreviewData && (
              <div
                onMouseDown={handleOverlayMouseDown}
                className="absolute z-20 flex items-center justify-center cursor-move transition-transform duration-75"
                style={{
                  width: `${(activeMockup.scale ?? 0.55) * 80}%`,
                  height: `${(activeMockup.scale ?? 0.55) * 80}%`,
                  transform: `translate(${activeMockup.offsetX ?? 0}%, ${activeMockup.offsetY ?? 0}%) rotate(${activeMockup.rotation ?? 0}deg)`,
                  mixBlendMode: activeMockup.blendMode || 'multiply',
                  opacity: activeMockup.opacity ?? 0.95,
                }}
                title="Click and drag to position design on mockup"
              >
                <img
                  src={livePreviewData}
                  alt="Live Design Overlay"
                  className="w-full h-full object-contain pointer-events-none select-none"
                />
              </div>
            )}

            {/* Slider Navigation Controls */}
            {activeIndex > 0 && (
              <button
                onClick={() => onChange(mockups, mockups[activeIndex - 1].id)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-10 flex items-center justify-center bg-black/50 hover:bg-black/90 text-white rounded-r opacity-0 group-hover:opacity-100 transition-opacity z-30 cursor-pointer"
              >
                ‹
              </button>
            )}
            {activeIndex < mockups.length - 1 && (
              <button
                onClick={() => onChange(mockups, mockups[activeIndex + 1].id)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-10 flex items-center justify-center bg-black/50 hover:bg-black/90 text-white rounded-l opacity-0 group-hover:opacity-100 transition-opacity z-30 cursor-pointer"
              >
                ›
              </button>
            )}
          </div>
        )}
      </div>

      {/* Preset bar if few mockups */}
      {mockups.length < 4 && (
        <div className="bg-[var(--bg-2)] border-t border-[var(--bg-5)] px-3 py-1 flex items-center gap-1.5 overflow-x-auto text-[10px]">
          <span className="text-[var(--text-6)] text-[9px] shrink-0">Add Preset:</span>
          {BUILTIN_MOCKUPS.map(bm => (
            <button
              key={bm.id}
              onClick={() => loadBuiltin(bm)}
              className="px-2 py-0.5 bg-[var(--bg-4)] hover:bg-[var(--bg-6)] border border-[var(--bg-7)] text-[var(--text-3)] hover:text-white rounded shrink-0 transition-colors cursor-pointer flex items-center gap-1"
            >
              {bm.category === 'mug' && <Coffee size={10} />}
              {bm.category === 'apparel' && <Shirt size={10} />}
              {bm.category === 'bag' && <ShoppingBag size={10} />}
              {bm.name}
            </button>
          ))}
        </div>
      )}

      {/* Bottom Gallery Strip */}
      <div className="h-24 border-t border-[var(--bg-5)] bg-[var(--bg-3)] p-2 flex gap-2 overflow-x-auto items-center shrink-0">
        {mockups.map((mockup, index) => (
          <div
            key={mockup.id}
            onClick={() => onChange(mockups, mockup.id)}
            className={`w-18 h-18 shrink-0 rounded bg-[var(--bg-1)] border-2 cursor-pointer relative group overflow-hidden transition-all ${
              activeMockupId === mockup.id
                ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20'
                : 'border-[var(--bg-7)] hover:border-[var(--text-5)]'
            }`}
          >
            {/* Small composited thumbnail */}
            <div className="absolute inset-1 flex items-center justify-center pointer-events-none">
              <img src={mockup.url} className="absolute max-w-full max-h-full object-contain" />
              {livePreviewData && (
                <img
                  src={livePreviewData}
                  className="absolute max-w-full max-h-full object-contain pointer-events-none"
                  style={{
                    transform: `scale(${mockup.scale ?? 0.55}) translate(${mockup.offsetX ?? 0}%, ${mockup.offsetY ?? 0}%)`,
                    mixBlendMode: mockup.blendMode || 'multiply',
                    opacity: mockup.opacity ?? 0.95,
                  }}
                />
              )}
            </div>

            <button
              onClick={(e) => removeMockup(mockup.id, e)}
              className="absolute top-1 right-1 bg-black/70 hover:bg-[var(--color-danger)] text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-30 cursor-pointer"
              title="Remove Mockup"
            >
              <Trash2 size={10} />
            </button>
            <div className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] text-center text-white py-0.5 pointer-events-none z-20 truncate px-0.5">
              {mockup.name || `View ${index + 1}`}
            </div>
          </div>
        ))}

        {/* Empty Slots / Add Mockup */}
        {emptySlots > 0 && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-18 h-18 shrink-0 rounded border-2 border-dashed border-[var(--bg-7)] hover:border-[var(--color-accent)] bg-[var(--bg-2)] hover:bg-[var(--bg-4)] cursor-pointer flex flex-col items-center justify-center text-[var(--text-6)] hover:text-white transition-all"
            title="Upload custom mockup image"
          >
            <Plus size={16} className="mb-0.5" />
            <span className="text-[8px] font-medium">Add Custom</span>
          </div>
        )}
      </div>
    </div>
  );
}
