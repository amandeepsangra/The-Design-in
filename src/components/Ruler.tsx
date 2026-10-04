import React, { useEffect, useRef } from 'react';

export type RulerUnit = 'px' | 'in' | 'cm' | 'mm' | '%';

interface RulerProps {
  orientation: 'horizontal' | 'vertical';
  length: number; // document length along this axis, in unscaled document px
  zoom: number;
  thickness?: number;
  unit?: RulerUnit;
  dpi?: number;
  cursorPos?: number | null; // mouse position along this axis (document px)
  onContextMenu?: (e: React.MouseEvent) => void;
  onStartGuideDrag?: (orientation: 'horizontal' | 'vertical', e: React.MouseEvent) => void;
}

export function Ruler({
  orientation,
  length,
  zoom,
  thickness = 18,
  unit = 'px',
  dpi = 300,
  cursorPos = null,
  onContextMenu,
  onStartGuideDrag,
}: RulerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isH = orientation === 'horizontal';
  const pxLength = Math.max(1, Math.round(length * zoom));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = isH ? pxLength : thickness;
      const h = isH ? thickness : pxLength;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);

      // Theme colors
      const rootStyle = getComputedStyle(document.documentElement);
      const bgColor = rootStyle.getPropertyValue('--bg-3').trim() || '#1f1f1f';
      const tickColor = rootStyle.getPropertyValue('--text-7').trim() || '#444444';
      const labelColor = rootStyle.getPropertyValue('--text-4').trim() || '#999999';
      const accentColor = rootStyle.getPropertyValue('--color-accent').trim() || '#00a8ff';

      // Background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);

      // Outer border separating ruler from canvas
      ctx.fillStyle = rootStyle.getPropertyValue('--bg-8').trim() || '#333333';
      if (isH) {
        ctx.fillRect(0, thickness - 1, w, 1);
      } else {
        ctx.fillRect(thickness - 1, 0, 1, h);
      }

      ctx.strokeStyle = tickColor;
      ctx.fillStyle = labelColor;
      ctx.font = '9px system-ui, -apple-system, sans-serif';
      ctx.lineWidth = 1;

      // Conversion factor: document pixels per 1 unit
      let pxPerUnit = 1;
      if (unit === 'in') pxPerUnit = dpi;
      else if (unit === 'cm') pxPerUnit = dpi / 2.54;
      else if (unit === 'mm') pxPerUnit = dpi / 25.4;
      else if (unit === '%') pxPerUnit = length / 100;

      // Screen pixels per 1 unit
      const screenPxPerUnit = pxPerUnit * zoom;

      // Determine major step in unit space so screen labels are spaced >= 50px
      const minScreenGap = 50;
      const rawUnitsPerStep = minScreenGap / Math.max(screenPxPerUnit, 1e-5);

      let stepUnits = 1;
      let subdivisions = 5;

      if (unit === 'in') {
        const niceInchSteps = [0.125, 0.25, 0.5, 1, 2, 5, 10, 20, 50];
        stepUnits = niceInchSteps.find(s => s >= rawUnitsPerStep) || Math.ceil(rawUnitsPerStep);
        subdivisions = stepUnits <= 0.5 ? 4 : 8;
      } else if (unit === '%') {
        const nicePercentSteps = [1, 2, 5, 10, 20, 25, 50, 100];
        stepUnits = nicePercentSteps.find(s => s >= rawUnitsPerStep) || 100;
        subdivisions = 5;
      } else {
        // px, cm, mm: standard decimal stepping (1, 2, 5 * 10^n)
        const magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(rawUnitsPerStep, 1e-5))));
        stepUnits = [1, 2, 5, 10].map(m => m * magnitude).find(c => c >= rawUnitsPerStep) || magnitude * 10;
        subdivisions = stepUnits / magnitude === 2 ? 4 : 5;
      }

      const totalUnits = length / pxPerUnit;
      const minorStepUnits = stepUnits / subdivisions;

      // Draw minor ticks
      ctx.beginPath();
      for (let u = 0; u <= totalUnits + 0.001; u += minorStepUnits) {
        const pos = Math.round(u * screenPxPerUnit) + 0.5;
        if (pos > (isH ? w : h)) break;

        // Is this the mid-tick between major ticks?
        const isSubMid = Math.abs((u % stepUnits) - stepUnits / 2) < minorStepUnits * 0.4;
        const tickLen = isSubMid ? thickness * 0.45 : thickness * 0.25;

        if (isH) {
          ctx.moveTo(pos, thickness - tickLen);
          ctx.lineTo(pos, thickness - 1);
        } else {
          ctx.moveTo(thickness - tickLen, pos);
          ctx.lineTo(thickness - 1, pos);
        }
      }
      ctx.stroke();

      // Draw major ticks & labels
      ctx.beginPath();
      for (let u = 0; u <= totalUnits + 0.001; u += stepUnits) {
        const pos = Math.round(u * screenPxPerUnit) + 0.5;
        if (pos > (isH ? w : h)) break;

        const tickLen = thickness * 0.7;
        if (isH) {
          ctx.moveTo(pos, thickness - tickLen);
          ctx.lineTo(pos, thickness - 1);
        } else {
          ctx.moveTo(thickness - tickLen, pos);
          ctx.lineTo(thickness - 1, pos);
        }

        // Format label
        let label = '';
        if (unit === '%') {
          label = `${Math.round(u)}%`;
        } else if (unit === 'in') {
          label = u % 1 === 0 ? `${u}"` : `${u.toFixed(2).replace(/\.?0+$/, '')}"`;
        } else if (unit === 'cm') {
          label = u % 1 === 0 ? `${u}` : `${u.toFixed(1)}`;
        } else {
          label = Math.round(u).toString();
        }

        // Render label text
        ctx.fillStyle = labelColor;
        if (isH) {
          ctx.fillText(label, pos + 2, 9);
        } else {
          ctx.save();
          ctx.translate(10, pos - 2);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(label, 0, 0);
          ctx.restore();
        }
      }
      ctx.stroke();

      // Photoshop-style Hairline Tracking Indicator
      if (cursorPos !== null && cursorPos >= 0 && cursorPos <= length) {
        const cPos = Math.round(cursorPos * zoom) + 0.5;
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (isH) {
          ctx.moveTo(cPos, 0);
          ctx.lineTo(cPos, thickness);
        } else {
          ctx.moveTo(0, cPos);
          ctx.lineTo(thickness, cPos);
        }
        ctx.stroke();
      }
    };

    draw();
    window.addEventListener('tea-theme-change', draw);
    return () => window.removeEventListener('tea-theme-change', draw);
  }, [length, zoom, isH, thickness, pxLength, unit, dpi, cursorPos]);

  return (
    <canvas
      ref={canvasRef}
      className={`block select-none ${isH ? 'cursor-row-resize' : 'cursor-col-resize'}`}
      onContextMenu={onContextMenu}
      onMouseDown={(e) => {
        if (e.button === 0 && onStartGuideDrag) {
          onStartGuideDrag(orientation, e);
        }
      }}
      title={`${isH ? 'Horizontal' : 'Vertical'} Ruler (${unit}) — Right-click to change unit, drag to create guide`}
    />
  );
}
