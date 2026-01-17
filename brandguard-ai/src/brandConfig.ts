// @ts-nocheck
import { getBrandKit as _getBrandKit, BrandKit } from './hooks/useBrandKit';

// Export getBrandKit for external use
export const getBrandKit = _getBrandKit;

// This getter allows synchronous access after initialization
export function getBrandKIT(): BrandKit {
  return _getBrandKit();
}

// For backward compatibility - will be populated at runtime
export let BRAND_KIT = _getBrandKit();
/**
 * Normalize font name for consistent comparison.
 * @param name - Font name to normalize
 * @returns Normalized font name (lowercase, trimmed)
 */
export function normalizeFontName(name: string | null | undefined): string | null {
  if (!name) return null;
  return (name as string).trim().toLowerCase();
}

/**
 * Check if a font name matches the allowed fonts list.
 * Handles style variants by checking if the font name starts with an allowed font family.
 * For example: "Arial Bold" or "Arial-Bold" will match "Arial"
 * @param fontName - Font name to check (can include style variants)
 * @param allowedFonts - Array of allowed font family names
 * @returns true if the font matches any allowed font (exact or prefix match)
 */
export function isFontAllowed(fontName: string | null | undefined, allowedFonts?: string[]): boolean {
  const kit = getBrandKit();
  const fontsToCheck = allowedFonts || kit.allowedFonts;
  if (!fontName) return true; // No font specified = no violation
  
  const normalized = normalizeFontName(fontName);
  if (!normalized) return true;
  
  // Check each allowed font
  for (const allowedFont of fontsToCheck) {
    const allowedNormalized = normalizeFontName(allowedFont);
    if (!allowedNormalized) continue;
    
    // Exact match
    if (normalized === allowedNormalized) {
      return true;
    }
    
    // Prefix match for style variants (e.g., "arial bold" starts with "arial")
    // Check with space, hyphen, or underscore as separators
    if (normalized.startsWith(allowedNormalized + ' ') ||
        normalized.startsWith(allowedNormalized + '-') ||
        normalized.startsWith(allowedNormalized + '_')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Find the nearest color from the BRAND_KIT.allowedColors to the given hex color.
 * Uses Euclidean distance in RGB space (squared distance comparison).
 * @param inputHex - Hex color string to match (e.g., "#FF0000" or null)
 * @returns The matching hex string from `allowedColors`, or null if input is invalid or none available
 */
export function findNearestBrandColor(inputHex) {
  const kit = getBrandKit();
  if (!inputHex || !kit || !Array.isArray(kit.allowedColors) || kit.allowedColors.length === 0) {
    return null;
  }

  function normalize(hex) {
    if (!hex) return null;
    let s = hex.trim().replace(/^#/, "");
    if (s.length === 3) {
      s = s.split("").map((c) => c + c).join("");
    }
    if (s.length === 6 || s.length === 8) return s.slice(0, 6).toUpperCase();
    return null;
  }

  function hexToRgb(hex6) {
    const n = normalize(hex6);
    if (!n) return null;
    const r = parseInt(n.slice(0, 2), 16);
    const g = parseInt(n.slice(2, 4), 16);
    const b = parseInt(n.slice(4, 6), 16);
    return { r, g, b };
  }

  const target = hexToRgb(inputHex);
  if (!target) return null;

  let best = null;
  let bestDist = Number.POSITIVE_INFINITY;
  
  for (const candidate of kit.allowedColors) {
    const c = hexToRgb(candidate);
    if (!c) continue;
    const dr = c.r - target.r;
    const dg = c.g - target.g;
    const db = c.b - target.b;
    const dist2 = dr * dr + dg * dg + db * db;
    if (dist2 < bestDist) {
      bestDist = dist2;
      best = candidate;
    }
  }

  return best;
}