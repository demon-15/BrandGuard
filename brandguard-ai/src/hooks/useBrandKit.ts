import { useEffect, useState } from 'react';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Extended Brand Kit interface supporting both legacy and new format
 * The UI Creator generates extended format, but the system normalizes to legacy for validation
 */
export interface BrandKit {
  name: string;
  allowedColors: string[];
  allowedFonts: string[];
  accessibility: {
    minContrast: number;
  };
  // Extended fields (optional, for UI Creator)
  typography?: {
    title: { font: string };
    body: { font: string };
    caption: { font: string };
  };
  typographyRules?: {
    allowBold: boolean;
    allowItalic: boolean;
    allowUnderline: boolean;
    minFontSize?: number;
    maxFontSize?: number;
  };
  colors?: {
    primary: string[];
    secondary: string[];
  };
  customRules?: {
    noBoldAnywhere?: boolean;
    singleFontPerType?: boolean;
    enforceMinBodySize?: boolean;
    minBodySize?: number;
  };
}

/**
 * Brand Kit Registry Entry - stores metadata about each brand kit
 */
export interface BrandKitRegistryEntry {
  id: string;
  name: string;
  createdAt: number;
  isDefault?: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * List of known available fonts in Adobe Express
 * These fonts are verified to be available and can be used in brand kits
 * Based on Adobe Express SDK documentation and testing
 * EXPORTED for use in BrandKitCreator UI
 */
export const AVAILABLE_FONTS = [
  'Arial',
  'Georgia',
  'Courier',
  'Courier New',
  'Source Sans 3',
  'Lato',
  'Times New Roman',
  'Verdana',
  'Tahoma',
  'Helvetica',
  'Comic Sans MS',
  'Impact',
  'Trebuchet MS',
  'Lucida Sans Unicode',
  'Palatino',
  'Garamond',
  'Bookman',
  'Avant Garde',
  'Century Gothic',
  'Futura'
];

const KNOWN_AVAILABLE_FONTS = new Set(AVAILABLE_FONTS.map(f => f.toLowerCase().trim()));

/**
 * Normalizes a font name for comparison (lowercase, trimmed)
 */
function normalizeFontNameForValidation(fontName: string): string {
  return fontName.toLowerCase().trim();
}

/**
 * Validates a hex color string
 * @param color - The color string to validate
 * @returns true if valid, false otherwise
 */
function isValidHexColor(color: string): boolean {
  if (typeof color !== 'string') {
    return false;
  }
  const trimmed = color.trim();
  // Must start with # and be followed by 3 or 6 hex digits
  if (!trimmed.startsWith('#')) {
    return false;
  }
  const hexPart = trimmed.substring(1);
  // Check for 3-digit or 6-digit hex
  if (hexPart.length !== 3 && hexPart.length !== 6) {
    return false;
  }
  // Check that all characters are valid hex digits
  if (!/^[0-9A-Fa-f]+$/.test(hexPart)) {
    return false;
  }
  // Additional validation: check for invalid hex patterns
  // Reject if hex part contains only zeros (which is valid but might be unintended)
  // This is optional, but we'll allow it
  return true;
}

/**
 * Normalizes a hex color to 6-digit uppercase format for comparison
 * @param color - The hex color string
 * @returns Normalized color or null if invalid
 */
function normalizeHexColor(color: string): string | null {
  if (!isValidHexColor(color)) {
    return null;
  }
  const trimmed = color.trim().toUpperCase();
  const hexPart = trimmed.substring(1);
  
  // Expand 3-digit to 6-digit
  if (hexPart.length === 3) {
    const expanded = hexPart.split('').map(c => c + c).join('');
    return `#${expanded}`;
  }
  
  return trimmed;
}

/**
 * Validates a brand kit against the BrandKit schema
 * @param kit - The brand kit object to validate
 * @returns Validation result with errors if invalid
 */
export function validateBrandKit(kit: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Check if kit is an object
  if (!kit || typeof kit !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'root', message: 'Brand kit must be a valid JSON object' }]
    };
  }

  // Validate name
  if (!kit.name || typeof kit.name !== 'string' || kit.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Brand kit must have a non-empty name' });
  }

  // Validate allowedColors
  if (!Array.isArray(kit.allowedColors)) {
    errors.push({ field: 'allowedColors', message: 'allowedColors must be an array' });
  } else if (kit.allowedColors.length === 0) {
    errors.push({ field: 'allowedColors', message: 'allowedColors must contain at least one color' });
  } else {
    const normalizedColors = new Map<string, number>(); // Track normalized colors for duplicate detection
    
    // Validate each color is a valid hex string
    kit.allowedColors.forEach((color: any, index: number) => {
      // Check for null, undefined, or empty
      if (color === null || color === undefined) {
        errors.push({ field: `allowedColors[${index}]`, message: 'Color cannot be null or undefined' });
        return;
      }
      
      if (typeof color !== 'string') {
        errors.push({ field: `allowedColors[${index}]`, message: `Color must be a string, got ${typeof color}` });
        return;
      }
      
      const trimmedColor = color.trim();
      
      // Check for empty string
      if (trimmedColor.length === 0) {
        errors.push({ field: `allowedColors[${index}]`, message: 'Color cannot be an empty string' });
        return;
      }
      
      // Validate hex format
      if (!isValidHexColor(trimmedColor)) {
        // Provide specific error messages based on the issue
        if (!trimmedColor.startsWith('#')) {
          errors.push({ 
            field: `allowedColors[${index}]`, 
            message: `Color "${color}" is invalid: must start with "#" (e.g., "#FF0000" or "#F00")` 
          });
        } else if (trimmedColor.length < 4 || trimmedColor.length > 7) {
          errors.push({ 
            field: `allowedColors[${index}]`, 
            message: `Color "${color}" is invalid: must be 3 or 6 hex digits after "#" (e.g., "#FF0000" or "#F00")` 
          });
        } else {
          const hexPart = trimmedColor.substring(1);
          if (!/^[0-9A-Fa-f]+$/.test(hexPart)) {
            errors.push({ 
              field: `allowedColors[${index}]`, 
              message: `Color "${color}" is invalid: contains invalid hex characters. Only 0-9 and A-F are allowed` 
            });
          } else {
            errors.push({ 
              field: `allowedColors[${index}]`, 
              message: `Color "${color}" is not a valid hex color (e.g., "#FF0000" or "#F00")` 
            });
          }
        }
        return;
      }
      
      // Check for duplicates (normalize to 6-digit format for comparison)
      const normalized = normalizeHexColor(trimmedColor);
      if (normalized) {
        if (normalizedColors.has(normalized)) {
          const firstIndex = normalizedColors.get(normalized)!;
          errors.push({ 
            field: `allowedColors[${index}]`, 
            message: `Color "${color}" is a duplicate of color at position ${firstIndex} (both normalize to "${normalized}")` 
          });
        } else {
          normalizedColors.set(normalized, index);
        }
      }
    });
  }

  // Validate allowedFonts
  if (!Array.isArray(kit.allowedFonts)) {
    errors.push({ field: 'allowedFonts', message: 'allowedFonts must be an array' });
  } else if (kit.allowedFonts.length === 0) {
    errors.push({ field: 'allowedFonts', message: 'allowedFonts must contain at least one font' });
  } else {
    const seenFonts = new Set<string>();
    
    // Validate each font is a non-empty string and exists in Adobe Express
    kit.allowedFonts.forEach((font: any, index: number) => {
      // Check for null, undefined, or empty
      if (font === null || font === undefined) {
        errors.push({ field: `allowedFonts[${index}]`, message: 'Font cannot be null or undefined' });
        return;
      }
      
      if (typeof font !== 'string') {
        errors.push({ field: `allowedFonts[${index}]`, message: `Font must be a string, got ${typeof font}` });
        return;
      }
      
      const trimmedFont = font.trim();
      
      // Check for empty string
      if (trimmedFont.length === 0) {
        errors.push({ field: `allowedFonts[${index}]`, message: 'Font cannot be an empty string' });
        return;
      }
      
      // Check for duplicates (case-insensitive)
      const normalizedFont = normalizeFontNameForValidation(trimmedFont);
      if (seenFonts.has(normalizedFont)) {
        errors.push({ 
          field: `allowedFonts[${index}]`, 
          message: `Font "${font}" is a duplicate (case-insensitive match with another font in the list)` 
        });
        return;
      }
      seenFonts.add(normalizedFont);
      
      // Check if font is available in Adobe Express
      if (!KNOWN_AVAILABLE_FONTS.has(normalizedFont)) {
        errors.push({ 
          field: `allowedFonts[${index}]`, 
          message: `Font "${font}" is not available in Adobe Express. Available fonts include: Arial, Georgia, Courier, Courier New, Source Sans 3, Lato, Times New Roman, Verdana, Tahoma, Helvetica, Comic Sans MS, Impact, Trebuchet MS, Lucida Sans Unicode, Palatino, Garamond, Bookman, Avant Garde, Century Gothic, Futura` 
        });
      }
    });
  }

  // Validate accessibility
  if (!kit.accessibility || typeof kit.accessibility !== 'object') {
    errors.push({ field: 'accessibility', message: 'accessibility must be an object' });
  } else {
    if (typeof kit.accessibility.minContrast !== 'number') {
      errors.push({ field: 'accessibility.minContrast', message: 'minContrast must be a number' });
    } else if (kit.accessibility.minContrast < 0 || kit.accessibility.minContrast > 21) {
      errors.push({ field: 'accessibility.minContrast', message: 'minContrast must be between 0 and 21' });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// BRAND KIT MANAGER - Singleton with multi-kit registry support
// ============================================================================

class BrandKitManager {
  private static instance: BrandKitManager;
  private brandKit: BrandKit | null = null;
  private listeners: Set<() => void> = new Set();
  
  // Storage keys
  private readonly STORAGE_KEY = 'brandguard_user_brand_kit'; // Legacy: active kit
  private readonly REGISTRY_KEY = 'brandguard_brand_kit_registry'; // Registry of all kits
  private readonly ACTIVE_KIT_ID_KEY = 'brandguard_active_brand_kit_id'; // Currently active kit ID
  private readonly KIT_PREFIX = 'brandguard_kit_'; // Prefix for individual kit storage

  static getInstance(): BrandKitManager {
    if (!BrandKitManager.instance) {
      BrandKitManager.instance = new BrandKitManager();
    }
    return BrandKitManager.instance;
  }

  // --------------------------------------------------------------------------
  // REGISTRY MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Get all brand kits in the registry
   */
  getRegistry(): BrandKitRegistryEntry[] {
    try {
      const stored = localStorage.getItem(this.REGISTRY_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading brand kit registry:', error);
    }
    // Return default entry if no registry exists
    return [{ id: 'default', name: 'Enterprise Pro (Default)', createdAt: 0, isDefault: true }];
  }

  /**
   * Save the registry to localStorage
   */
  private saveRegistry(registry: BrandKitRegistryEntry[]): void {
    try {
      localStorage.setItem(this.REGISTRY_KEY, JSON.stringify(registry));
    } catch (error) {
      console.error('Error saving brand kit registry:', error);
    }
  }

  /**
   * Get the currently active brand kit ID
   */
  getActiveKitId(): string {
    try {
      const activeId = localStorage.getItem(this.ACTIVE_KIT_ID_KEY);
      if (activeId) {
        return activeId;
      }
      // Check for legacy storage (backward compatibility)
      if (localStorage.getItem(this.STORAGE_KEY)) {
        return 'legacy';
      }
    } catch (error) {
      console.error('Error getting active kit ID:', error);
    }
    return 'default';
  }

  /**
   * Set the active brand kit by ID and load it
   * Triggers listeners to refresh UI
   */
  async setActiveKit(kitId: string): Promise<BrandKit> {
    try {
      localStorage.setItem(this.ACTIVE_KIT_ID_KEY, kitId);
      this.brandKit = null; // Clear cache to force reload
      const kit = await this.loadBrandKit();
      this.notifyListeners();
      return kit;
    } catch (error) {
      console.error('Error setting active kit:', error);
      throw error;
    }
  }

  /**
   * Add a new brand kit to the registry and optionally set as active
   * @param kit - The brand kit to add
   * @param setAsActive - Whether to set this kit as the active one
   * @returns The generated kit ID
   */
  addBrandKit(kit: BrandKit, setAsActive: boolean = true): string {
    const kitId = `kit_${Date.now()}`;
    const registry = this.getRegistry();
    
    // Add to registry
    registry.push({
      id: kitId,
      name: kit.name,
      createdAt: Date.now(),
      isDefault: false
    });
    this.saveRegistry(registry);

    // Store the kit data
    try {
      localStorage.setItem(this.KIT_PREFIX + kitId, JSON.stringify(kit));
    } catch (error) {
      console.error('Error storing brand kit:', error);
      throw error;
    }

    if (setAsActive) {
      localStorage.setItem(this.ACTIVE_KIT_ID_KEY, kitId);
      this.brandKit = kit;
      this.notifyListeners();
    }

    return kitId;
  }

  /**
   * Delete a brand kit from the registry
   */
  deleteBrandKit(kitId: string): void {
    if (kitId === 'default') {
      console.warn('Cannot delete the default brand kit');
      return;
    }

    const registry = this.getRegistry().filter(entry => entry.id !== kitId);
    this.saveRegistry(registry);

    // Remove kit data
    try {
      localStorage.removeItem(this.KIT_PREFIX + kitId);
    } catch (error) {
      console.error('Error removing brand kit:', error);
    }

    // If this was the active kit, switch to default
    if (this.getActiveKitId() === kitId) {
      this.setActiveKit('default');
    }
  }

  // --------------------------------------------------------------------------
  // BRAND KIT LOADING
  // --------------------------------------------------------------------------

  async loadBrandKit(): Promise<BrandKit> {
    if (this.brandKit) {
      return this.brandKit;
    }

    const activeKitId = this.getActiveKitId();

    // Try to load from registry
    if (activeKitId !== 'default' && activeKitId !== 'legacy') {
      const kit = this.loadKitById(activeKitId);
      if (kit) {
        this.brandKit = kit;
        return this.brandKit;
      }
    }

    // Legacy support: check old storage key
    if (activeKitId === 'legacy') {
      const storedKit = this.loadStoredBrandKit();
      if (storedKit) {
        this.brandKit = storedKit;
        return this.brandKit;
      }
    }

    // Load from default file
    try {
      const response = await fetch('./brand-kit.json');
      if (!response.ok) {
        throw new Error(`Failed to load brand kit: ${response.statusText}`);
      }
      this.brandKit = await response.json();
      return this.brandKit as BrandKit;
    } catch (error) {
      console.error('Error loading brand kit:', error);
      // Fallback to hardcoded default
      this.brandKit = {
        name: "Enterprise Pro",
        allowedColors: [
          "#232D4B",
          "#E57200",
          "#FFFFFF",
          "#DADADA",
          "#EF3F6B",
          "#62BB46"
        ],
        allowedFonts: ["Arial", "Georgia"],
        accessibility: { minContrast: 4.5 }
      };
      return this.brandKit;
    }
  }

  /**
   * Load a specific brand kit by ID
   */
  private loadKitById(kitId: string): BrandKit | null {
    try {
      const stored = localStorage.getItem(this.KIT_PREFIX + kitId);
      if (stored) {
        const parsed = JSON.parse(stored);
        const validation = validateBrandKit(parsed);
        if (validation.valid) {
          return parsed as BrandKit;
        } else {
          console.warn(`Stored brand kit ${kitId} is invalid:`, validation.errors);
        }
      }
    } catch (error) {
      console.error(`Error loading brand kit ${kitId}:`, error);
    }
    return null;
  }

  /**
   * Loads a user-uploaded brand kit from legacy localStorage
   * (Backward compatibility)
   */
  private loadStoredBrandKit(): BrandKit | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const validation = validateBrandKit(parsed);
        if (validation.valid) {
          return parsed as BrandKit;
        } else {
          console.warn('Stored brand kit is invalid, removing it:', validation.errors);
          localStorage.removeItem(this.STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Error loading stored brand kit:', error);
      localStorage.removeItem(this.STORAGE_KEY);
    }
    return null;
  }

  // --------------------------------------------------------------------------
  // UPLOAD / CREATE BRAND KIT
  // --------------------------------------------------------------------------

  /**
   * Uploads and validates a user-provided brand kit
   * Also adds to registry for multi-kit support
   * @param kit - The brand kit object to upload
   * @returns Validation result with errors if invalid
   */
  uploadBrandKit(kit: any): ValidationResult {
    const validation = validateBrandKit(kit);
    
    if (validation.valid) {
      // Normalize the kit (trim colors, fonts, etc.)
      const normalizedKit: BrandKit = {
        name: String(kit.name).trim(),
        allowedColors: kit.allowedColors.map((c: string) => c.trim().toUpperCase()),
        allowedFonts: kit.allowedFonts.map((f: string) => String(f).trim()),
        accessibility: {
          minContrast: Number(kit.accessibility.minContrast)
        }
      };

      // Preserve extended fields if present
      if (kit.typography) {
        normalizedKit.typography = kit.typography;
      }
      if (kit.typographyRules) {
        normalizedKit.typographyRules = kit.typographyRules;
      }
      if (kit.colors) {
        normalizedKit.colors = kit.colors;
      }
      if (kit.customRules) {
        normalizedKit.customRules = kit.customRules;
      }

      // Add to registry and set as active
      try {
        this.addBrandKit(normalizedKit, true);
      } catch (error) {
        console.error('Error storing brand kit:', error);
        return {
          valid: false,
          errors: [{ field: 'storage', message: 'Failed to save brand kit to storage' }]
        };
      }
    }

    return validation;
  }

  /**
   * Clears the user-uploaded brand kit and reverts to default
   */
  async clearUploadedBrandKit(): Promise<void> {
    // Clear legacy storage
    localStorage.removeItem(this.STORAGE_KEY);
    // Set active kit to default
    await this.setActiveKit('default');
  }

  /**
   * Checks if a user-uploaded brand kit is currently active
   */
  hasUploadedBrandKit(): boolean {
    const activeId = this.getActiveKitId();
    return activeId !== 'default';
  }

  getBrandKit(): BrandKit | null {
    return this.brandKit;
  }

  // For development/testing: reload brand kit from file
  async reloadBrandKit(): Promise<BrandKit> {
    this.brandKit = null;
    const kit = await this.loadBrandKit();
    this.notifyListeners();
    return kit;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

/**
 * Hook to use the brand kit with automatic updates
 * @returns The current brand kit configuration
 */
export function useBrandKit(): BrandKit {
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const manager = BrandKitManager.getInstance();
    
    // Load brand kit if not already loaded
    manager.loadBrandKit().then(kit => {
      setBrandKit(kit);
      setIsLoading(false);
    });

    // Subscribe to changes
    const unsubscribe = manager.subscribe(() => {
      const kit = manager.getBrandKit();
      if (kit) {
        setBrandKit(kit);
      }
    });

    return unsubscribe;
  }, []);

  // Return the brand kit or a default while loading
  return brandKit || {
    name: "Enterprise Pro",
    allowedColors: [
      "#232D4B",
      "#E57200",
      "#FFFFFF",
      "#DADADA",
      "#EF3F6B",
      "#62BB46"
    ],
    allowedFonts: ["Arial", "Georgia"],
    accessibility: { minContrast: 4.5 }
  };
}

/**
 * Synchronous getter for brand kit (use in non-React code or after initial load)
 */
export function getBrandKit(): BrandKit {
  const manager = BrandKitManager.getInstance();
  return manager.getBrandKit() || {
    name: "Enterprise Pro",
    allowedColors: [
      "#232D4B",
      "#E57200",
      "#FFFFFF",
      "#DADADA",
      "#EF3F6B",
      "#62BB46"
    ],
    allowedFonts: ["Arial", "Georgia"],
    accessibility: { minContrast: 4.5 }
  };
}

/**
 * Initialize brand kit (call this once at app startup)
 */
export async function initializeBrandKit(): Promise<BrandKit> {
  const manager = BrandKitManager.getInstance();
  return manager.loadBrandKit();
}

/**
 * Upload a user-provided brand kit
 * @param kit - The brand kit object to upload
 * @returns Validation result with errors if invalid
 */
export function uploadBrandKit(kit: any): ValidationResult {
  const manager = BrandKitManager.getInstance();
  return manager.uploadBrandKit(kit);
}

/**
 * Clear the user-uploaded brand kit and revert to default
 */
export async function clearUploadedBrandKit(): Promise<void> {
  const manager = BrandKitManager.getInstance();
  await manager.clearUploadedBrandKit();
}

/**
 * Check if a user-uploaded brand kit is currently active
 */
export function hasUploadedBrandKit(): boolean {
  const manager = BrandKitManager.getInstance();
  return manager.hasUploadedBrandKit();
}

// ============================================================================
// REGISTRY EXPORTS - For multi-kit management
// ============================================================================

/**
 * Get all brand kits in the registry
 */
export function getBrandKitRegistry(): BrandKitRegistryEntry[] {
  const manager = BrandKitManager.getInstance();
  return manager.getRegistry();
}

/**
 * Get the currently active brand kit ID
 */
export function getActiveKitId(): string {
  const manager = BrandKitManager.getInstance();
  return manager.getActiveKitId();
}

/**
 * Set the active brand kit by ID
 * Triggers listeners to refresh UI and violations
 */
export async function setActiveBrandKit(kitId: string): Promise<BrandKit> {
  const manager = BrandKitManager.getInstance();
  return manager.setActiveKit(kitId);
}

/**
 * Delete a brand kit from the registry
 */
export function deleteBrandKit(kitId: string): void {
  const manager = BrandKitManager.getInstance();
  manager.deleteBrandKit(kitId);
}

/**
 * Hook to use the brand kit registry with automatic updates
 */
export function useBrandKitRegistry(): {
  registry: BrandKitRegistryEntry[];
  activeKitId: string;
  setActiveKit: (kitId: string) => Promise<void>;
  deleteKit: (kitId: string) => void;
} {
  const [registry, setRegistry] = useState<BrandKitRegistryEntry[]>([]);
  const [activeKitId, setActiveKitId] = useState<string>('default');

  useEffect(() => {
    const manager = BrandKitManager.getInstance();
    
    // Load initial state
    setRegistry(manager.getRegistry());
    setActiveKitId(manager.getActiveKitId());

    // Subscribe to changes
    const unsubscribe = manager.subscribe(() => {
      setRegistry(manager.getRegistry());
      setActiveKitId(manager.getActiveKitId());
    });

    return unsubscribe;
  }, []);

  const setActiveKit = async (kitId: string) => {
    const manager = BrandKitManager.getInstance();
    await manager.setActiveKit(kitId);
    setActiveKitId(kitId);
  };

  const deleteKit = (kitId: string) => {
    const manager = BrandKitManager.getInstance();
    manager.deleteBrandKit(kitId);
    setRegistry(manager.getRegistry());
  };

  return { registry, activeKitId, setActiveKit, deleteKit };
}
