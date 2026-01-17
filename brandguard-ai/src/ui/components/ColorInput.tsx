import React, { useState, useCallback } from 'react';
import './ColorInput.css';

interface ColorInputProps {
  value: string;
  onChange: (value: string) => void;
  onRemove?: () => void;
  showRemove?: boolean;
  placeholder?: string;
}

/**
 * ColorInput - Enhanced color picker with multiple input methods
 * 
 * Features:
 * - Large visual color picker
 * - Hex input with validation
 * - Visual color swatch preview
 * - Format conversion (hex, rgb, hsl)
 */
const ColorInput: React.FC<ColorInputProps> = ({
  value,
  onChange,
  onRemove,
  showRemove = false,
  placeholder = '#000000'
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [isValid, setIsValid] = useState(true);

  // Validate and normalize color value
  const validateAndNormalizeColor = useCallback((color: string): string | null => {
    if (!color || !color.trim()) return null;

    const trimmed = color.trim().toUpperCase();

    // Check if it's a valid hex color
    const hexPattern = /^#?([A-F0-9]{6}|[A-F0-9]{3})$/;
    if (hexPattern.test(trimmed)) {
      // Normalize to #RRGGBB format
      if (trimmed.startsWith('#')) {
        if (trimmed.length === 4) {
          // Convert #RGB to #RRGGBB
          return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
        }
        return trimmed;
      } else {
        if (trimmed.length === 3) {
          return `#${trimmed[0]}${trimmed[0]}${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}`;
        }
        return `#${trimmed}`;
      }
    }

    // Try to parse RGB format: rgb(255, 255, 255) or rgba(255, 255, 255, 1)
    const rgbPattern = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/i;
    const rgbMatch = trimmed.match(rgbPattern);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1], 10);
      const g = parseInt(rgbMatch[2], 10);
      const b = parseInt(rgbMatch[3], 10);
      if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
      }
    }

    // Try to parse HSL format: hsl(360, 100%, 100%)
    const hslPattern = /^hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*[\d.]+)?\)$/i;
    const hslMatch = trimmed.match(hslPattern);
    if (hslMatch) {
      const h = parseInt(hslMatch[1], 10) / 360;
      const s = parseInt(hslMatch[2], 10) / 100;
      const l = parseInt(hslMatch[3], 10) / 100;
      
      // Convert HSL to RGB
      const c = (1 - Math.abs(2 * l - 1)) * s;
      const x = c * (1 - Math.abs((h * 6) % 2 - 1));
      const m = l - c / 2;
      
      let r = 0, g = 0, b = 0;
      if (h < 1/6) { r = c; g = x; b = 0; }
      else if (h < 2/6) { r = x; g = c; b = 0; }
      else if (h < 3/6) { r = 0; g = c; b = x; }
      else if (h < 4/6) { r = 0; g = x; b = c; }
      else if (h < 5/6) { r = x; g = 0; b = c; }
      else { r = c; g = 0; b = x; }
      
      r = Math.round((r + m) * 255);
      g = Math.round((g + m) * 255);
      b = Math.round((b + m) * 255);
      
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
    }

    return null;
  }, []);

  const handleColorPickerChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    setInputValue(newValue);
    setIsValid(true);
    onChange(newValue);
  }, [onChange]);

  const handleTextInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Allow empty input while typing
    if (!newValue.trim()) {
      setIsValid(true);
      return;
    }

    const normalized = validateAndNormalizeColor(newValue);
    if (normalized) {
      setIsValid(true);
      setInputValue(normalized);
      onChange(normalized);
    } else {
      setIsValid(false);
    }
  }, [onChange, validateAndNormalizeColor]);

  const handleTextInputBlur = useCallback(() => {
    // On blur, try to normalize the value
    if (inputValue.trim()) {
      const normalized = validateAndNormalizeColor(inputValue);
      if (normalized) {
        setInputValue(normalized);
        setIsValid(true);
        onChange(normalized);
      } else {
        // Reset to previous valid value
        setInputValue(value);
        setIsValid(true);
      }
    } else {
      setInputValue(value);
      setIsValid(true);
    }
  }, [inputValue, value, onChange, validateAndNormalizeColor]);

  // Sync input value when prop value changes
  React.useEffect(() => {
    setInputValue(value);
    setIsValid(true);
  }, [value]);

  // Get contrast color for text (white or black)
  const getContrastColor = (hex: string): string => {
    if (!hex || !hex.startsWith('#')) return '#000000';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#FFFFFF';
  };

  const displayValue = value || '#000000';
  const textColor = getContrastColor(displayValue);

  return (
    <div className="color-input-container">
      {/* Large Color Picker Button */}
      <div className="color-input-picker-wrapper">
        <label className="color-input-picker-label">
          <input
            type="color"
            className="color-input-picker"
            value={displayValue}
            onChange={handleColorPickerChange}
            aria-label="Color picker"
          />
          <div 
            className="color-input-swatch"
            style={{ backgroundColor: displayValue }}
            title={displayValue}
          >
            <span 
              className="color-input-swatch-text"
              style={{ color: textColor }}
            >
              {displayValue}
            </span>
          </div>
        </label>
      </div>

      {/* Text Input */}
      <div className="color-input-text-wrapper">
        <input
          type="text"
          className={`color-input-text ${!isValid ? 'color-input-invalid' : ''}`}
          value={inputValue}
          onChange={handleTextInputChange}
          onBlur={handleTextInputBlur}
          placeholder={placeholder}
          aria-label="Color hex value"
        />
        {!isValid && (
          <span className="color-input-error-icon" title="Invalid color format">
            ⚠
          </span>
        )}
      </div>

      {/* Remove Button */}
      {showRemove && onRemove && (
        <button
          type="button"
          className="color-input-remove"
          onClick={onRemove}
          aria-label="Remove color"
          title="Remove color"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default ColorInput;
