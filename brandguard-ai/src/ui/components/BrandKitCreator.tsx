import React, { useState, useCallback } from 'react';
import { 
  BrandKit, 
  AVAILABLE_FONTS, 
  uploadBrandKit, 
  ValidationResult 
} from '../../hooks/useBrandKit';
import ColorInput from './ColorInput';
import './BrandKitCreator.css';

// ============================================================================
// INTERFACES
// ============================================================================

interface BrandKitCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Form state interface - maps directly to UI inputs
 * Each field here corresponds to a UI control
 */
interface BrandKitFormState {
  // Brand name (required)
  name: string;
  
  // Typography: one font per text type (required)
  titleFont: string;
  bodyFont: string;
  captionFont: string;
  
  // Typography rules (optional)
  allowBold: boolean;
  allowItalic: boolean;
  allowUnderline: boolean;
  minFontSize: string; // String for input, convert to number
  maxFontSize: string;
  
  // Color rules (optional)
  primaryColors: string[];
  secondaryColors: string[];
  
  // Custom rules (checkbox presets only)
  noBoldAnywhere: boolean;
  singleFontPerType: boolean;
  enforceMinBodySize: boolean;
  minBodySize: string;
  
  // Accessibility
  minContrast: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * BrandKitCreator - Modal UI for creating brand kits without writing JSON
 * 
 * This component provides a designer-friendly form that generates valid
 * Brand Kit JSON compatible with the existing validation system.
 * 
 * UI → JSON Mapping:
 * - titleFont, bodyFont, captionFont → typography.title.font, typography.body.font, typography.caption.font
 * - Typography fonts also populate → allowedFonts (deduplicated array)
 * - primaryColors + secondaryColors → colors.primary, colors.secondary AND allowedColors (merged)
 * - allowBold, allowItalic, allowUnderline → typographyRules.*
 * - Custom rule checkboxes → customRules.*
 */
const BrandKitCreator: React.FC<BrandKitCreatorProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  // --------------------------------------------------------------------------
  // STATE
  // --------------------------------------------------------------------------
  
  const [formState, setFormState] = useState<BrandKitFormState>({
    name: '',
    titleFont: 'Georgia',
    bodyFont: 'Arial',
    captionFont: 'Arial',
    allowBold: true,
    allowItalic: true,
    allowUnderline: false,
    minFontSize: '',
    maxFontSize: '',
    primaryColors: ['#232D4B'],
    secondaryColors: ['#FFFFFF'],
    noBoldAnywhere: false,
    singleFontPerType: false,
    enforceMinBodySize: false,
    minBodySize: '12',
    minContrast: '4.5'
  });
  
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --------------------------------------------------------------------------
  // HANDLERS
  // --------------------------------------------------------------------------

  const handleInputChange = useCallback((
    field: keyof BrandKitFormState, 
    value: string | boolean
  ) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleColorChange = useCallback((
    type: 'primaryColors' | 'secondaryColors',
    index: number,
    value: string
  ) => {
    setFormState(prev => {
      const colors = [...prev[type]];
      colors[index] = value;
      return { ...prev, [type]: colors };
    });
  }, []);

  const handleAddColor = useCallback((type: 'primaryColors' | 'secondaryColors') => {
    setFormState(prev => ({
      ...prev,
      [type]: [...prev[type], '#000000']
    }));
  }, []);

  const handleRemoveColor = useCallback((
    type: 'primaryColors' | 'secondaryColors',
    index: number
  ) => {
    setFormState(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  }, []);

  /**
   * Serialize form state to Brand Kit JSON
   * This is the core mapping from UI state to the validated schema
   */
  const serializeToJson = useCallback((): BrandKit => {
    // Collect unique fonts from typography selections
    // Maps: titleFont, bodyFont, captionFont → allowedFonts array (deduplicated)
    const uniqueFonts = [...new Set([
      formState.titleFont,
      formState.bodyFont,
      formState.captionFont
    ])];

    // Merge primary and secondary colors into allowedColors
    // Maps: primaryColors + secondaryColors → allowedColors (deduplicated, uppercase)
    const allColors = [...formState.primaryColors, ...formState.secondaryColors]
      .filter(c => c && c.trim())
      .map(c => c.toUpperCase());
    const uniqueColors = [...new Set(allColors)];

    // Build the brand kit object
    const kit: BrandKit = {
      name: formState.name.trim(),
      allowedColors: uniqueColors,
      allowedFonts: uniqueFonts,
      accessibility: {
        minContrast: parseFloat(formState.minContrast) || 4.5
      },
      // Extended fields for richer brand management
      typography: {
        title: { font: formState.titleFont },
        body: { font: formState.bodyFont },
        caption: { font: formState.captionFont }
      },
      typographyRules: {
        allowBold: formState.noBoldAnywhere ? false : formState.allowBold,
        allowItalic: formState.allowItalic,
        allowUnderline: formState.allowUnderline,
        ...(formState.minFontSize && { minFontSize: parseInt(formState.minFontSize, 10) }),
        ...(formState.maxFontSize && { maxFontSize: parseInt(formState.maxFontSize, 10) })
      },
      colors: {
        primary: formState.primaryColors.filter(c => c && c.trim()),
        secondary: formState.secondaryColors.filter(c => c && c.trim())
      },
      customRules: {
        noBoldAnywhere: formState.noBoldAnywhere,
        singleFontPerType: formState.singleFontPerType,
        enforceMinBodySize: formState.enforceMinBodySize,
        ...(formState.enforceMinBodySize && { minBodySize: parseInt(formState.minBodySize, 10) })
      }
    };

    return kit;
  }, [formState]);

  /**
   * Handle create button click
   * Validates and saves the brand kit using existing infrastructure
   * NOTE: We use a button click handler instead of form submission because
   * Adobe Express Add-ons run in a sandboxed iframe that blocks form submissions
   */
  const handleCreate = useCallback(async () => {
    setErrors([]);
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formState.name.trim()) {
        setErrors(['Brand Kit Name is required']);
        setIsSubmitting(false);
        return;
      }

      // Serialize form to JSON
      const kit = serializeToJson();

      // Validate using existing validation function
      const result: ValidationResult = uploadBrandKit(kit);

      if (result.valid) {
        // Success! Close modal and notify parent
        onSuccess();
        onClose();
        // Reset form
        setFormState({
          name: '',
          titleFont: 'Georgia',
          bodyFont: 'Arial',
          captionFont: 'Arial',
          allowBold: true,
          allowItalic: true,
          allowUnderline: false,
          minFontSize: '',
          maxFontSize: '',
          primaryColors: ['#232D4B'],
          secondaryColors: ['#FFFFFF'],
          noBoldAnywhere: false,
          singleFontPerType: false,
          enforceMinBodySize: false,
          minBodySize: '12',
          minContrast: '4.5'
        });
      } else {
        // Show validation errors
        const errorMessages = result.errors.map(e => `${e.field}: ${e.message}`);
        setErrors(errorMessages);
      }
    } catch (error) {
      setErrors([`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setIsSubmitting(false);
    }
  }, [serializeToJson, onSuccess, onClose, formState.name]);

  // Don't render if not open
  if (!isOpen) return null;

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------

  return (
    <div className="brand-kit-creator-overlay" onClick={onClose}>
      <div className="brand-kit-creator-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bkc-header">
          <h2>Create Brand Kit</h2>
          <button className="bkc-close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {/* Form - Using div instead of form to avoid sandbox iframe restrictions */}
        <div className="bkc-form">
          {/* Brand Name */}
          <div className="bkc-section">
            <label className="bkc-label">Brand Kit Name *</label>
            <input
              type="text"
              className="bkc-input"
              value={formState.name}
              onChange={e => handleInputChange('name', e.target.value)}
              placeholder="e.g., Corporate Brand 2024"
            />
          </div>

          {/* Typography Section - Required */}
          <div className="bkc-section">
            <h3 className="bkc-section-title">Typography *</h3>
            <p className="bkc-section-desc">Select one font for each text type</p>
            
            <div className="bkc-font-grid">
              {/* Title Font */}
              <div className="bkc-field">
                <label className="bkc-label">Title Font</label>
                <select
                  className="bkc-select"
                  value={formState.titleFont}
                  onChange={e => handleInputChange('titleFont', e.target.value)}
                >
                  {AVAILABLE_FONTS.map(font => (
                    <option key={font} value={font}>{font}</option>
                  ))}
                </select>
              </div>

              {/* Body Font */}
              <div className="bkc-field">
                <label className="bkc-label">Body Font</label>
                <select
                  className="bkc-select"
                  value={formState.bodyFont}
                  onChange={e => handleInputChange('bodyFont', e.target.value)}
                >
                  {AVAILABLE_FONTS.map(font => (
                    <option key={font} value={font}>{font}</option>
                  ))}
                </select>
              </div>

              {/* Caption Font */}
              <div className="bkc-field">
                <label className="bkc-label">Caption Font</label>
                <select
                  className="bkc-select"
                  value={formState.captionFont}
                  onChange={e => handleInputChange('captionFont', e.target.value)}
                >
                  {AVAILABLE_FONTS.map(font => (
                    <option key={font} value={font}>{font}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Typography Rules Section - Optional */}
          <div className="bkc-section">
            <h3 className="bkc-section-title">Typography Rules</h3>
            <p className="bkc-section-desc">Configure text formatting options</p>
            
            <div className="bkc-toggle-grid">
              <label className="bkc-toggle">
                <input
                  type="checkbox"
                  checked={formState.allowBold}
                  onChange={e => handleInputChange('allowBold', e.target.checked)}
                  disabled={formState.noBoldAnywhere}
                />
                <span>Allow Bold Text</span>
              </label>

              <label className="bkc-toggle">
                <input
                  type="checkbox"
                  checked={formState.allowItalic}
                  onChange={e => handleInputChange('allowItalic', e.target.checked)}
                />
                <span>Allow Italic Text</span>
              </label>

              <label className="bkc-toggle">
                <input
                  type="checkbox"
                  checked={formState.allowUnderline}
                  onChange={e => handleInputChange('allowUnderline', e.target.checked)}
                />
                <span>Allow Underline</span>
              </label>
            </div>

            <div className="bkc-size-grid">
              <div className="bkc-field">
                <label className="bkc-label">Min Font Size (px)</label>
                <input
                  type="number"
                  className="bkc-input bkc-input-small"
                  value={formState.minFontSize}
                  onChange={e => handleInputChange('minFontSize', e.target.value)}
                  placeholder="e.g., 12"
                  min="1"
                  max="200"
                />
              </div>
              <div className="bkc-field">
                <label className="bkc-label">Max Font Size (px)</label>
                <input
                  type="number"
                  className="bkc-input bkc-input-small"
                  value={formState.maxFontSize}
                  onChange={e => handleInputChange('maxFontSize', e.target.value)}
                  placeholder="e.g., 72"
                  min="1"
                  max="500"
                />
              </div>
            </div>
          </div>

          {/* Color Rules Section - Optional */}
          <div className="bkc-section">
            <h3 className="bkc-section-title">Color Palette</h3>
            <p className="bkc-section-desc">Define your brand colors</p>
            
            {/* Primary Colors */}
            <div className="bkc-color-group">
              <label className="bkc-label">Primary Colors</label>
              <div className="bkc-color-list">
                {formState.primaryColors.map((color, index) => (
                  <ColorInput
                    key={index}
                    value={color}
                    onChange={(newColor) => handleColorChange('primaryColors', index, newColor)}
                    onRemove={formState.primaryColors.length > 1 ? () => handleRemoveColor('primaryColors', index) : undefined}
                    showRemove={formState.primaryColors.length > 1}
                    placeholder="#000000"
                  />
                ))}
                <button
                  type="button"
                  className="bkc-add-btn"
                  onClick={() => handleAddColor('primaryColors')}
                >
                  + Add Primary Color
                </button>
              </div>
            </div>

            {/* Secondary Colors */}
            <div className="bkc-color-group">
              <label className="bkc-label">Secondary Colors</label>
              <div className="bkc-color-list">
                {formState.secondaryColors.map((color, index) => (
                  <ColorInput
                    key={index}
                    value={color}
                    onChange={(newColor) => handleColorChange('secondaryColors', index, newColor)}
                    onRemove={formState.secondaryColors.length > 1 ? () => handleRemoveColor('secondaryColors', index) : undefined}
                    showRemove={formState.secondaryColors.length > 1}
                    placeholder="#FFFFFF"
                  />
                ))}
                <button
                  type="button"
                  className="bkc-add-btn"
                  onClick={() => handleAddColor('secondaryColors')}
                >
                  + Add Secondary Color
                </button>
              </div>
            </div>
          </div>

          {/* Custom Rules Section - Checkbox Presets Only */}
          <div className="bkc-section">
            <h3 className="bkc-section-title">Custom Rules</h3>
            <p className="bkc-section-desc">Select rule presets to enforce</p>
            
            <div className="bkc-rules-list">
              <label className="bkc-rule">
                <input
                  type="checkbox"
                  checked={formState.noBoldAnywhere}
                  onChange={e => handleInputChange('noBoldAnywhere', e.target.checked)}
                />
                <span>No bold text anywhere</span>
              </label>

              <label className="bkc-rule">
                <input
                  type="checkbox"
                  checked={formState.singleFontPerType}
                  onChange={e => handleInputChange('singleFontPerType', e.target.checked)}
                />
                <span>Only one font per text type</span>
              </label>

              <div className="bkc-rule-with-input">
                <label className="bkc-rule">
                  <input
                    type="checkbox"
                    checked={formState.enforceMinBodySize}
                    onChange={e => handleInputChange('enforceMinBodySize', e.target.checked)}
                  />
                  <span>Body text must be at least</span>
                </label>
                <input
                  type="number"
                  className="bkc-input bkc-input-tiny"
                  value={formState.minBodySize}
                  onChange={e => handleInputChange('minBodySize', e.target.value)}
                  disabled={!formState.enforceMinBodySize}
                  min="1"
                  max="100"
                />
                <span className="bkc-unit">px</span>
              </div>
            </div>
          </div>

          {/* Accessibility Section */}
          <div className="bkc-section">
            <h3 className="bkc-section-title">Accessibility</h3>
            <div className="bkc-field">
              <label className="bkc-label">Minimum Contrast Ratio</label>
              <select
                className="bkc-select"
                value={formState.minContrast}
                onChange={e => handleInputChange('minContrast', e.target.value)}
              >
                <option value="3">3:1 (WCAG AA Large Text)</option>
                <option value="4.5">4.5:1 (WCAG AA Normal Text)</option>
                <option value="7">7:1 (WCAG AAA)</option>
              </select>
            </div>
          </div>

          {/* Error Display */}
          {errors.length > 0 && (
            <div className="bkc-errors">
              <strong>Please fix the following errors:</strong>
              <ul>
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="bkc-actions">
            <button
              type="button"
              className="bkc-btn bkc-btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="bkc-btn bkc-btn-primary"
              disabled={isSubmitting}
              onClick={handleCreate}
            >
              {isSubmitting ? 'Creating...' : 'Create Brand Kit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandKitCreator;
