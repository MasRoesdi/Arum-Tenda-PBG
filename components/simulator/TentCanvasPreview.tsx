'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Eye, RotateCcw, Download, Sparkles, Sun, Moon } from 'lucide-react';
import { TentTemplateConfig, LayerState, LightingMode } from '@/types/simulator';
import { applyFabricRecolor, ActiveLayerRenderData } from '@/utils/colorMath';

interface TentCanvasPreviewProps {
  template: TentTemplateConfig;
  layerStates: Record<string, LayerState>;
  lightingMode: LightingMode;
  onReset?: () => void;
}

export default function TentCanvasPreview({
  template,
  layerStates,
  lightingMode,
  onReset,
}: TentCanvasPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOriginalShown, setIsOriginalShown] = useState<boolean>(false);

  // Cached raster data for 60fps rendering without re-drawing SVG/polygons
  const cachedBaseImageData = useRef<ImageData | null>(null);
  const cachedMasks = useRef<Map<string, ImageData>>(new Map());
  const canvasDimensions = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  // 1. Prepare base image and offscreen feathered masks on template change
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = template.imageUrl;

    img.onload = () => {
      if (isCancelled) return;

      const naturalW = img.naturalWidth || img.width || 1200;
      const naturalH = img.naturalHeight || img.height || 1200;

      // Restrict max resolution to 1200px for snappy 60fps mobile pixel math
      const MAX_WIDTH = 1200;
      let w = naturalW;
      let h = naturalH;
      if (w > MAX_WIDTH) {
        const ratio = MAX_WIDTH / w;
        w = MAX_WIDTH;
        h = Math.round(naturalH * ratio);
      }

      canvasDimensions.current = { width: w, height: h };

      // Base photo canvas
      const baseCanvas = document.createElement('canvas');
      baseCanvas.width = w;
      baseCanvas.height = h;
      const baseCtx = baseCanvas.getContext('2d', { willReadFrequently: true });
      if (!baseCtx) return;

      baseCtx.drawImage(img, 0, 0, w, h);
      const baseImageData = baseCtx.getImageData(0, 0, w, h);
      cachedBaseImageData.current = baseImageData;

      // Offscreen feathered masks for each layer
      const maskMap = new Map<string, ImageData>();

      for (const layer of template.layers) {
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = w;
        maskCanvas.height = h;
        const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
        if (!maskCtx) continue;

        if (layer.feather && layer.feather > 0) {
          maskCtx.filter = `blur(${layer.feather}px)`;
        }
        maskCtx.fillStyle = '#FFFFFF';

        for (const polygon of layer.polygons) {
          if (polygon.length < 3) continue;
          maskCtx.beginPath();
          polygon.forEach(([rx, ry], idx) => {
            const px = rx * w;
            const py = ry * h;
            if (idx === 0) {
              maskCtx.moveTo(px, py);
            } else {
              maskCtx.lineTo(px, py);
            }
          });
          maskCtx.closePath();
          maskCtx.fill();
        }

        const maskImageData = maskCtx.getImageData(0, 0, w, h);
        maskMap.set(layer.id, maskImageData);
      }

      cachedMasks.current = maskMap;

      if (canvasRef.current) {
        canvasRef.current.width = w;
        canvasRef.current.height = h;
      }

      setIsLoading(false);
    };

    img.onerror = () => {
      console.error(`Gagal memuat gambar tenda: ${template.imageUrl}`);
      if (!isCancelled) {
        setIsLoading(false);
      }
    };

    return () => {
      isCancelled = true;
    };
  }, [template]);

  // 2. Render canvas composition (Original vs HSL Recoloring + Day/Night Lighting)
  const drawComposition = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !cachedBaseImageData.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: w, height: h } = canvasDimensions.current;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    // If user is holding "Lihat Foto Asli"
    if (isOriginalShown) {
      ctx.putImageData(cachedBaseImageData.current, 0, 0);
      return;
    }

    // Collect active layers to recolor
    const activeLayers: ActiveLayerRenderData[] = [];
    for (const layer of template.layers) {
      const state = layerStates[layer.id];
      if (state && state.enabled) {
        const mask = cachedMasks.current.get(layer.id);
        if (mask) {
          activeLayers.push({
            maskData: mask.data,
            color: state.color,
            intensity: state.intensity,
          });
        }
      }
    }

    // Apply HSL Luminance preservation
    const recolored = applyFabricRecolor(cachedBaseImageData.current, activeLayers);
    ctx.putImageData(recolored, 0, 0);

    // Day vs Night Mode Lighting
    if (lightingMode === 'night') {
      // Atmospheric dusk multiply tint
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgba(25, 30, 48, 0.48)';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      // Soft vignette for realistic outdoor/indoor night ambiance
      ctx.save();
      const vignette = ctx.createRadialGradient(
        w / 2,
        h / 2,
        Math.min(w, h) * 0.35,
        w / 2,
        h / 2,
        Math.max(w, h) * 0.75
      );
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vignette.addColorStop(1, 'rgba(10, 15, 25, 0.45)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      // Render Chandelier and Fairy Light warm glow points
      if (template.lightPoints && template.lightPoints.length > 0) {
        for (const lp of template.lightPoints) {
          const cx = lp.x * w;
          const cy = lp.y * h;
          const baseR = lp.radius * Math.min(w, h);

          if (lp.type === 'chandelier') {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';

            // Outer soft warm ambiance
            const outerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 2.2);
            outerGrad.addColorStop(0, 'rgba(255, 220, 140, 0.55)');
            outerGrad.addColorStop(0.35, 'rgba(255, 180, 80, 0.3)');
            outerGrad.addColorStop(0.7, 'rgba(255, 140, 40, 0.1)');
            outerGrad.addColorStop(1, 'rgba(255, 120, 30, 0)');
            ctx.fillStyle = outerGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, baseR * 2.2, 0, Math.PI * 2);
            ctx.fill();

            // Intense glowing core
            const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 0.75);
            innerGrad.addColorStop(0, '#FFFFFF');
            innerGrad.addColorStop(0.25, 'rgba(255, 245, 210, 0.95)');
            innerGrad.addColorStop(0.6, 'rgba(255, 210, 110, 0.7)');
            innerGrad.addColorStop(1, 'rgba(255, 180, 70, 0)');
            ctx.fillStyle = innerGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, baseR * 0.75, 0, Math.PI * 2);
            ctx.fill();

            // Chandelier crystal spark
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(cx, cy, Math.max(2, baseR * 0.09), 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
          } else if (lp.type === 'fairylight') {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';

            const fairyGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 1.8);
            fairyGrad.addColorStop(0, '#FFFFFF');
            fairyGrad.addColorStop(0.3, 'rgba(255, 235, 180, 0.85)');
            fairyGrad.addColorStop(0.65, 'rgba(255, 195, 100, 0.35)');
            fairyGrad.addColorStop(1, 'rgba(255, 160, 60, 0)');
            ctx.fillStyle = fairyGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, baseR * 1.8, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
          }
        }
      }
    }
  }, [template, layerStates, lightingMode, isOriginalShown]);

  // Re-draw whenever relevant state changes
  useEffect(() => {
    if (!isLoading) {
      drawComposition();
    }
  }, [isLoading, drawComposition]);

  // Download simulation result as PNG
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.download = `simulasi-arum-tenda-${template.id}-${lightingMode}-${Date.now()}.png`;
      a.href = dataUrl;
      a.click();
    } catch (err) {
      console.error('Gagal mengunduh gambar:', err);
    }
  };

  return (
    <div className="simulator-canvas-container">
      {/* Visual Canvas Viewport */}
      <div className="simulator-viewport-card">
        {isLoading && (
          <div className="simulator-loading-overlay">
            <Sparkles className="animate-spin" size={24} />
            <span>Menyiapkan Kanvas Multi-Layer...</span>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="simulator-canvas"
          style={{ display: isLoading ? 'none' : 'block' }}
        />

        {/* Status badges */}
        <div className="simulator-badge-overlay">
          <span className="simulator-badge mode-badge">
            {lightingMode === 'day' ? (
              <>
                <Sun size={12} className="text-amber-500" />
                <span>Siang (Natural)</span>
              </>
            ) : (
              <>
                <Moon size={12} className="text-indigo-400" />
                <span>Malam (Warm Glow)</span>
              </>
            )}
          </span>

          {isOriginalShown && (
            <span className="simulator-badge original-badge">
              <Eye size={12} />
              <span>Foto Asli</span>
            </span>
          )}
        </div>
      </div>

      {/* Action buttons below canvas */}
      <div className="simulator-canvas-actions">
        {/* Hold to compare Before / After */}
        <button
          type="button"
          className={`sim-action-btn ${isOriginalShown ? 'is-active' : ''}`}
          onPointerDown={() => setIsOriginalShown(true)}
          onPointerUp={() => setIsOriginalShown(false)}
          onPointerLeave={() => setIsOriginalShown(false)}
          title="Tahan untuk melihat foto asli sebelum diwarnai"
        >
          <Eye size={15} />
          <span>{isOriginalShown ? 'Melihat Asli' : 'Tahan: Foto Asli'}</span>
        </button>

        {/* Reset colors */}
        {onReset && (
          <button
            type="button"
            className="sim-action-btn"
            onClick={onReset}
            title="Kembalikan warna kain ke standar awal"
          >
            <RotateCcw size={15} />
            <span>Reset Warna</span>
          </button>
        )}

        {/* Download PNG */}
        <button
          type="button"
          className="sim-action-btn download-btn"
          onClick={handleDownload}
          disabled={isLoading}
          title="Unduh hasil desain simulasi (.PNG)"
        >
          <Download size={15} />
          <span>Unduh PNG</span>
        </button>
      </div>

      <p className="simulator-canvas-disclaimer">
        * Pratinjau interaktif mempertahankan tekstur lipatan, bayangan kain asli (HSL Luminance),
        serta pendar lampu kristal gantung dan fairy lights.
      </p>
    </div>
  );
}
