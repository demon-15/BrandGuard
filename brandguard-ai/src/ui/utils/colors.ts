/**
 * Color utility functions for brand compliance checking
 */

/**
 * Normalize hex color to standard 6-digit RGB format.
 * Handles both RGBA (6-digit RGB + 2-digit alpha) and ARGB (2-digit alpha + 6-digit RGB) formats.
 * 
 * For 8-digit hex:
 * - Assumes RGBA format by default (#RRGGBBAA from Express SDK)
 * - If first 6 chars are #000000 (all black), tries ARGB interpretation
 * 
 * @param hex - The hex color string (6 or 8 digits), or null
 * @returns Standard 6-digit hex color (#RRGGBB) or null if invalid
 */
export const toHex6 = (hex: string | null): string | null => {
    if (!hex || typeof hex !== 'string') return null;
    
    const clean = hex.trim().replace(/^#/, '');
    
    // Validate hex characters
    if (!/^[0-9A-Fa-f]+$/.test(clean)) return null;
    
    if (clean.length === 6) {
        // Standard RGB format
        return `#${clean.toUpperCase()}`;
    }
    
    if (clean.length === 8) {
        // 8-digit format: detect ARGB vs RGBA
        const firstSix = clean.slice(0, 6);
        const middleSix = clean.slice(2, 8);
        
        // If first 6 chars are #000000 (all black), likely ARGB format
        if (firstSix.toUpperCase() === '000000') {
            // ARGB: alpha-red-green-blue
            return `#${middleSix.toUpperCase()}`;
        }
        
        // Otherwise assume RGBA: red-green-blue-alpha (Express SDK format)
        return `#${firstSix.toUpperCase()}`;
    }
    
    // Invalid length or format
    return null;
};

/**
 * Calculate contrast ratio between two colors based on WCAG 2.1 standards
 * @param hex1 - First color in hex format
 * @param hex2 - Second color in hex format
 * @returns Object with ratio and WCAG AA compliance status
 */
export const calculateContrastRatio = (
    hex1: string,
    hex2: string,
    options?: {
        /** Treat as large text (≥18px regular or ≥14px bold) */
        largeText?: boolean;
        /** Non-text UI components/graphics (AA requires 3:1) */
        nonText?: boolean;
        /** Report AAA as well (normal: 7:1, large: 4.5:1) */
        reportAAA?: boolean;
    }
): { ratio: number; passesAA: boolean; passesAAA?: boolean; requiredAA: number; requiredAAA?: number } => {
    // Helper function to convert hex to RGB
    const hexToRgb = (hex: string) => {
        const bigint = parseInt(hex.replace('#', ''), 16);
        return {
            r: (bigint >> 16) & 255,
            g: (bigint >> 8) & 255,
            b: bigint & 255,
        };
    };

    // Helper function to calculate relative luminance
    const getLuminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
        const toLinear = (value: number) => {
            const sRGB = value / 255;
            return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    };

    const rgb1 = hexToRgb(hex1);
    const rgb2 = hexToRgb(hex2);

    const luminance1 = getLuminance(rgb1);
    const luminance2 = getLuminance(rgb2);

    const contrastRatio =
        (Math.max(luminance1, luminance2) + 0.05) / (Math.min(luminance1, luminance2) + 0.05);

    // WCAG 2.1 thresholds
    const isLarge = !!options?.largeText;
    const isNonText = !!options?.nonText;

    // AA requirements
    const requiredAA = (isLarge || isNonText) ? 3.0 : 4.5;
    const passesAA = contrastRatio >= requiredAA;

    // Optionally report AAA as well
    if (options?.reportAAA) {
        const requiredAAA = isLarge ? 4.5 : 7.0;
        const passesAAA = contrastRatio >= requiredAAA;
        return {
            ratio: contrastRatio,
            passesAA,
            passesAAA,
            requiredAA,
            requiredAAA,
        };
    }

    return {
        ratio: contrastRatio,
        passesAA,
        requiredAA,
    };
};

/** Convert a hex color (#RRGGBB) to its RGB components */
export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const bigint = parseInt(hex.replace('#', ''), 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255,
    };
};

/** Euclidean distance between two hex colors in RGB space */
export const colorDistance = (hex1: string, hex2: string): number => {
    const a = hexToRgb(hex1);
    const b = hexToRgb(hex2);
    const dr = a.r - b.r;
    const dg = a.g - b.g;
    const db = a.b - b.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
};

    /**
     * Calculate relative luminance of a color according to WCAG 2.1
     * @param hex - Color in hex format (#RRGGBB)
     * @returns Relative luminance (0 to 1)
     */
    export const getRelativeLuminance = (hex: string): number => {
        const toLinear = (value: number) => {
            const sRGB = value / 255;
            return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
        };

        const { r, g, b } = hexToRgb(hex);
        return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    };
