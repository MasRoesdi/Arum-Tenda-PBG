/**
 * Utility functions for HSL color math and realistic fabric recoloring
 * Preserves shadows, folds, and natural luminance of the base fabric photo.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number; // 0..360
  s: number; // 0..1
  l: number; // 0..1
}

export function hexToRgb(hex: string): RGB {
  let cleaned = hex.replace(/^#/, '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) {
    return { r: 255, g: 255, b: 255 };
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHsl(r: number, g: number, b: number): HSL {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const d = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm:
        h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) * 60;
        break;
      case gNorm:
        h = ((bNorm - rNorm) / d + 2) * 60;
        break;
      case bNorm:
        h = ((rNorm - gNorm) / d + 4) * 60;
        break;
    }
  }

  return { h, s, l };
}

export function hexToHsl(hex: string): HSL {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rPrime = 0, gPrime = 0, bPrime = 0;

  if (h >= 0 && h < 60) {
    rPrime = c; gPrime = x; bPrime = 0;
  } else if (h >= 60 && h < 120) {
    rPrime = x; gPrime = c; bPrime = 0;
  } else if (h >= 120 && h < 180) {
    rPrime = 0; gPrime = c; bPrime = x;
  } else if (h >= 180 && h < 240) {
    rPrime = 0; gPrime = x; bPrime = c;
  } else if (h >= 240 && h < 300) {
    rPrime = x; gPrime = 0; bPrime = c;
  } else {
    rPrime = c; gPrime = 0; bPrime = x;
  }

  return {
    r: Math.round((rPrime + m) * 255),
    g: Math.round((gPrime + m) * 255),
    b: Math.round((bPrime + m) * 255),
  };
}

export interface ActiveLayerRenderData {
  maskData: Uint8ClampedArray;
  color: string;
  intensity: number; // 10..100
}

/**
 * Recolor base photo pixels using HSL Luminance Preservation algorithm.
 * Mutates or returns output ImageData.
 */
export function applyFabricRecolor(
  baseImageData: ImageData,
  layers: ActiveLayerRenderData[]
): ImageData {
  const width = baseImageData.width;
  const height = baseImageData.height;
  const output = new ImageData(new Uint8ClampedArray(baseImageData.data), width, height);
  const outData = output.data;
  const baseData = baseImageData.data;
  const totalPixels = width * height;

  for (const layer of layers) {
    const { maskData, color, intensity } = layer;
    const { h: targetH, s: targetS, l: targetL } = hexToHsl(color);
    const effectiveS = Math.min(1, Math.max(0, targetS * (intensity / 100)));

    // Precalculate sector & factor for fast HSL conversion
    const normH = ((targetH % 360) + 360) % 360;
    const hSector = Math.floor(normH / 60) % 6;
    const hFactor = 1 - Math.abs(((normH / 60) % 2) - 1);

    for (let p = 0; p < totalPixels; p++) {
      const idx = p * 4;
      const maskAlpha = maskData[idx + 3] / 255;
      if (maskAlpha <= 0.002) continue;

      const origR = baseData[idx];
      const origG = baseData[idx + 1];
      const origB = baseData[idx + 2];

      // 1. Perceived luminance of the original fabric
      const origLum = (0.299 * origR + 0.587 * origG + 0.114 * origB) / 255;

      // 2. Adjusted luminance: preserves white/bright fabric folds when colored
      const adjustedLum = Math.min(1, Math.max(0, origLum * (0.45 + targetL * 0.85)));

      // 3. Fast HSL to RGB with targetH, effectiveS, adjustedLum
      const c = (1 - Math.abs(2 * adjustedLum - 1)) * effectiveS;
      const x = c * hFactor;
      const m = adjustedLum - c / 2;

      let rP = 0, gP = 0, bP = 0;
      switch (hSector) {
        case 0: rP = c; gP = x; bP = 0; break;
        case 1: rP = x; gP = c; bP = 0; break;
        case 2: rP = 0; gP = c; bP = x; break;
        case 3: rP = 0; gP = x; bP = c; break;
        case 4: rP = x; gP = 0; bP = c; break;
        default: rP = c; gP = 0; bP = x; break;
      }

      const newR = (rP + m) * 255;
      const newG = (gP + m) * 255;
      const newB = (bP + m) * 255;

      // 4. Alpha blend based on feathered mask
      outData[idx] = Math.round(outData[idx] * (1 - maskAlpha) + newR * maskAlpha);
      outData[idx + 1] = Math.round(outData[idx + 1] * (1 - maskAlpha) + newG * maskAlpha);
      outData[idx + 2] = Math.round(outData[idx + 2] * (1 - maskAlpha) + newB * maskAlpha);
    }
  }

  return output;
}
